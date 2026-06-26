// ============================================================
// ALiVE-WiLDFiRE — MOBILE & LOW-BANDWIDTH OPTIMIZATION — JS
// ============================================================
// PURPOSE: Handle mobile interactions (pull-up sheet, touch),
// connection-aware data loading, and offline caching of
// critical evacuation data.
//
// INTEGRATION FOR ANTI:
// 1. Include this script after your main app JS
// 2. Call MobileOptimization.init() on DOMContentLoaded
// 3. Add the CSS from 02_mobile_optimization.css
// 4. Register the service worker (see section at bottom)
// ============================================================

const MobileOptimization = (() => {

  // -------------------------------------------------------
  // A. PULL-UP SHEET (mobile sidebar as a bottom drawer)
  // -------------------------------------------------------
  function initPullUpSheet() {
    const sidebar = document.querySelector('.sidebar, [class*="sidebar"]');
    if (!sidebar || window.innerWidth > 768) return;

    let startY = 0;
    let startHeight = 0;
    const minHeight = 72;
    const maxHeight = window.innerHeight * 0.85;

    sidebar.addEventListener('touchstart', (e) => {
      if (e.target.closest('input, select, textarea, button, a')) return;
      startY = e.touches[0].clientY;
      startHeight = sidebar.offsetHeight;
      sidebar.style.transition = 'none';
    }, { passive: true });

    sidebar.addEventListener('touchmove', (e) => {
      if (e.target.closest('input, select, textarea, button, a')) return;
      const deltaY = startY - e.touches[0].clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
      sidebar.style.maxHeight = newHeight + 'px';
    }, { passive: true });

    sidebar.addEventListener('touchend', () => {
      sidebar.style.transition = 'max-height 0.3s ease';
      const currentHeight = sidebar.offsetHeight;
      const midpoint = (maxHeight + minHeight) / 2;
      if (currentHeight > midpoint) {
        sidebar.style.maxHeight = '45vh';
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.style.maxHeight = minHeight + 'px';
        sidebar.classList.add('collapsed');
      }
    }, { passive: true });
  }

  // -------------------------------------------------------
  // B. CONNECTION-AWARE DATA LOADING
  // -------------------------------------------------------
  // Detects connection quality and adjusts map tile quality,
  // data refresh intervals, and UI complexity accordingly.

  function getConnectionProfile() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return 'unknown';

    const effectiveType = conn.effectiveType; // '4g', '3g', '2g', 'slow-2g'
    const downlink = conn.downlink;           // Mbps estimate
    const saveData = conn.saveData;           // user toggled "save data"

    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') return 'critical';
    if (effectiveType === '3g' || (downlink && downlink < 1.5)) return 'low';
    return 'normal';
  }

  function applyConnectionProfile() {
    const profile = getConnectionProfile();

    // Store for other modules to reference
    document.documentElement.setAttribute('data-connection', profile);

    if (profile === 'critical') {
      // Reduce map to static raster, hide non-essential layers
      if (window.map && window.map.getStyle) {
        try {
          // Lower tile quality
          window.map.setMaxZoom(14);
          // Disable 3D terrain
          if (window.map.getTerrain && window.map.getTerrain()) {
            window.map.setTerrain(null);
          }
        } catch(e) { /* fail silently */ }
      }

      // Hide non-critical UI sections
      const nonCritical = document.querySelectorAll(
        '.geojson-section, .gis-contract, .community-report, .report-form'
      );
      nonCritical.forEach(el => el.style.display = 'none');

      // Show low-bandwidth banner
      showConnectionBanner('critical');
    }

    if (profile === 'low') {
      if (window.map && window.map.getTerrain && window.map.getTerrain()) {
        try { window.map.setTerrain(null); } catch(e) {}
      }
      showConnectionBanner('low');
    }
  }

  function showConnectionBanner(level) {
    const existing = document.getElementById('connection-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'connection-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      padding: 8px 16px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    `;

    if (level === 'critical') {
      banner.style.background = 'linear-gradient(90deg, #dc2626, #b91c1c)';
      banner.style.color = '#fff';
      banner.innerHTML = '⚠️ Very low signal — showing cached evacuation data. Routes may be delayed.';
    } else {
      banner.style.background = 'linear-gradient(90deg, #d97706, #b45309)';
      banner.style.color = '#fff';
      banner.innerHTML = '📶 Low signal detected — reduced map detail for faster loading.';
    }

    banner.addEventListener('click', () => banner.remove());
    document.body.prepend(banner);

    // Auto-dismiss after 8s
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.transition = 'opacity 0.5s';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
      }
    }, 8000);
  }

  // Listen for connection changes
  function watchConnection() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', applyConnectionProfile);
    }
    window.addEventListener('online', () => {
      const offBanner = document.getElementById('offline-banner');
      if (offBanner) offBanner.remove();
      applyConnectionProfile();
    });
    window.addEventListener('offline', () => {
      showOfflineBanner();
    });
  }

  function showOfflineBanner() {
    const existing = document.getElementById('offline-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10001;
      padding: 10px 16px;
      background: linear-gradient(90deg, #7f1d1d, #991b1b);
      color: #fff;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    `;
    banner.innerHTML = '🔴 NO CONNECTION — Showing last known evacuation data. Seek official guidance.';
    document.body.prepend(banner);
  }

  // -------------------------------------------------------
  // C. CRITICAL DATA CACHING (LocalStorage fallback)
  // -------------------------------------------------------
  // Caches fire and evacuation data so it's available offline.
  // For a full PWA, use the Service Worker below instead.

  const CACHE_KEY = 'alive_wildfire_cache';

  function cacheEvacData(data) {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        fires: data.fires || [],
        evacRoutes: data.evacRoutes || [],
        shelters: data.shelters || [],
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) { /* storage full or unavailable */ }
  }

  function getCachedEvacData() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // -------------------------------------------------------
  // D. VIEWPORT META — prevent pinch zoom issues
  // -------------------------------------------------------
  function ensureViewportMeta() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
  }

  // -------------------------------------------------------
  // E. EMERGENCY QUICK-ACTION BAR (mobile only)
  // -------------------------------------------------------
  // Adds a fixed bottom bar with three large buttons:
  // EVAC ROUTES | CALL 911 | MY LOCATION
  function initQuickActionBar() {
    if (window.innerWidth > 768) return;

    const bar = document.createElement('div');
    bar.id = 'quick-action-bar';
    bar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 10002;
      display: flex;
      gap: 1px;
      background: #111;
      padding: 0;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.6);
    `;

    const buttons = [
      {
        label: '🗺️ Evac Routes',
        color: '#1d4ed8',
        action: () => {
          const evacSection = document.querySelector(
            '[class*="evac"], [id*="evac"], h3'
          );
          // Find the evac section by text content
          document.querySelectorAll('h3').forEach(h3 => {
            if (h3.textContent.includes('Evacuation')) {
              h3.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Expand sidebar if collapsed
              const sidebar = document.querySelector('.sidebar, [class*="sidebar"]');
              if (sidebar) {
                sidebar.classList.remove('collapsed');
                sidebar.style.maxHeight = '85vh';
              }
            }
          });
        }
      },
      {
        label: '📞 Call 911',
        color: '#dc2626',
        action: () => { window.location.href = 'tel:911'; }
      },
      {
        label: '📍 My Location',
        color: '#059669',
        action: () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (window.map) {
                  window.map.flyTo({
                    center: [pos.coords.longitude, pos.coords.latitude],
                    zoom: 15,
                    speed: 2,
                  });
                }
              },
              () => { alert('Location unavailable. Check your settings.'); },
              { enableHighAccuracy: true, timeout: 5000 }
            );
          }
        }
      }
    ];

    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.textContent = btn.label;
      el.style.cssText = `
        flex: 1;
        background: ${btn.color};
        color: #fff;
        border: none;
        padding: 14px 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        min-height: 52px;
      `;
      el.addEventListener('click', btn.action);
      bar.appendChild(el);
    });

    document.body.appendChild(bar);

    // Push sidebar up so it doesn't overlap the bar
    const sidebar = document.querySelector('.sidebar, [class*="sidebar"]');
    if (sidebar) {
      sidebar.style.bottom = '52px';
    }
  }

  // -------------------------------------------------------
  // INIT
  // -------------------------------------------------------
  function init() {
    ensureViewportMeta();
    applyConnectionProfile();
    watchConnection();

    if (window.innerWidth <= 768) {
      initPullUpSheet();
      initQuickActionBar();
    }

    window.addEventListener('resize', () => {
      const bar = document.getElementById('quick-action-bar');
      if (window.innerWidth > 768 && bar) bar.remove();
      if (window.innerWidth <= 768 && !bar) {
        initPullUpSheet();
        initQuickActionBar();
      }
    });
  }

  return {
    init,
    getConnectionProfile,
    cacheEvacData,
    getCachedEvacData,
  };
})();


// ============================================================
// SERVICE WORKER REGISTRATION (add to your main HTML or app.js)
// ============================================================
//
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js').then(reg => {
//     console.log('[ALiVE] Service Worker registered:', reg.scope);
//   }).catch(err => {
//     console.warn('[ALiVE] SW registration failed:', err);
//   });
// }
