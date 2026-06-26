// ============================================================
// ALiVE-WiLDFiRE — DATA FRESHNESS INDICATORS
// Integration patch for Anti (Antigravity)
// ============================================================
// PURPOSE: Add "Last Updated" timestamps to every fire incident
// so commanders know exactly how old the telemetry is.
//
// INTEGRATION NOTES FOR ANTI:
// 1. Add `lastUpdated` field to each incident in your fires data array
// 2. Paste the DataFreshness module into your main JS (or import it)
// 3. Call DataFreshness.init() after DOM ready
// 4. Call DataFreshness.renderTimestamp(incidentElement, fire)
//    when rendering each incident card in the sidebar
// 5. Call DataFreshness.renderDetailTimestamp(detailPanel, fire)
//    when loading the detail/analytics panel for a selected fire
// 6. Add the CSS from 01_data_freshness_indicators.css
// ============================================================

const DataFreshness = (() => {

  // --- Staleness thresholds (in minutes) ---
  const THRESHOLDS = {
    FRESH: 5,       // green  — under 5 min
    RECENT: 15,     // amber  — 5–15 min
    STALE: 30,      // red    — 15–30 min
                    // critical — over 30 min
  };

  // --- Color tokens (match your existing theme) ---
  const COLORS = {
    FRESH:    { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e', border: '#22c55e' },
    RECENT:   { bg: 'rgba(234,179,8,0.15)',  text: '#eab308', border: '#eab308' },
    STALE:    { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444', border: '#ef4444' },
    CRITICAL: { bg: 'rgba(239,68,68,0.25)',  text: '#ff2d2d', border: '#ff2d2d' },
  };

  function getAgeMinutes(isoTimestamp) {
    return (Date.now() - new Date(isoTimestamp).getTime()) / 60000;
  }

  function getStaleness(isoTimestamp) {
    const age = getAgeMinutes(isoTimestamp);
    if (age < THRESHOLDS.FRESH)  return 'FRESH';
    if (age < THRESHOLDS.RECENT) return 'RECENT';
    if (age < THRESHOLDS.STALE)  return 'STALE';
    return 'CRITICAL';
  }

  function formatAge(isoTimestamp) {
    const age = getAgeMinutes(isoTimestamp);
    if (age < 1) return 'Just now';
    if (age < 60) return `${Math.floor(age)}m ago`;
    if (age < 1440) return `${Math.floor(age / 60)}h ${Math.floor(age % 60)}m ago`;
    return `${Math.floor(age / 1440)}d ago`;
  }

  function formatAbsoluteTime(isoTimestamp) {
    const d = new Date(isoTimestamp);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  // --- Render a compact timestamp badge on the sidebar incident card ---
  // Call this when building each fire card in the sidebar list.
  //
  // @param {HTMLElement} cardEl  — the incident card container
  // @param {Object}      fire   — the fire data object (must have `lastUpdated`)
  function renderTimestamp(cardEl, fire) {
    if (!fire.lastUpdated) return;

    const existing = cardEl.querySelector('.freshness-badge');
    if (existing) existing.remove();

    const staleness = getStaleness(fire.lastUpdated);
    const colors = COLORS[staleness];

    const badge = document.createElement('div');
    badge.className = 'freshness-badge';
    badge.setAttribute('data-staleness', staleness);
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
      background: ${colors.bg};
      color: ${colors.text};
      border: 1px solid ${colors.border};
      margin-top: 6px;
    `;

    const dot = document.createElement('span');
    dot.className = 'freshness-dot';
    dot.style.cssText = `
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${colors.text};
      display: inline-block;
    `;
    if (staleness === 'FRESH') {
      dot.style.animation = 'freshness-pulse 2s ease-in-out infinite';
    }
    if (staleness === 'CRITICAL') {
      dot.style.animation = 'freshness-blink 0.8s step-end infinite';
    }

    const label = document.createElement('span');
    label.textContent = formatAge(fire.lastUpdated);

    badge.appendChild(dot);
    badge.appendChild(label);
    cardEl.appendChild(badge);
  }

  // --- Render a detailed timestamp row in the analytics detail panel ---
  // Call this when a fire is selected and the detail panel populates.
  //
  // @param {HTMLElement} detailPanel — the detail/analytics container
  // @param {Object}      fire        — the fire data object
  function renderDetailTimestamp(detailPanel, fire) {
    if (!fire.lastUpdated) return;

    const existing = detailPanel.querySelector('.freshness-detail');
    if (existing) existing.remove();

    const staleness = getStaleness(fire.lastUpdated);
    const colors = COLORS[staleness];

    const row = document.createElement('div');
    row.className = 'freshness-detail';
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 6px;
      background: ${colors.bg};
      border-left: 3px solid ${colors.border};
      font-size: 12px;
    `;

    const leftSide = document.createElement('div');
    leftSide.style.cssText = 'display:flex; align-items:center; gap:8px;';

    const dot = document.createElement('span');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${colors.text};
      display: inline-block;
      flex-shrink: 0;
    `;
    if (staleness === 'FRESH') {
      dot.style.animation = 'freshness-pulse 2s ease-in-out infinite';
    }

    const statusLabel = document.createElement('span');
    statusLabel.style.cssText = `font-weight:700; color:${colors.text}; text-transform:uppercase; letter-spacing:0.5px;`;
    const statusMap = {
      FRESH: 'LIVE',
      RECENT: 'RECENT',
      STALE: 'STALE',
      CRITICAL: 'STALE — VERIFY',
    };
    statusLabel.textContent = statusMap[staleness];

    leftSide.appendChild(dot);
    leftSide.appendChild(statusLabel);

    const rightSide = document.createElement('div');
    rightSide.style.cssText = 'text-align:right; line-height:1.4;';

    const absTime = document.createElement('div');
    absTime.style.cssText = 'color: var(--text-primary, #e0e0e0); font-weight:600;';
    absTime.textContent = `Last Updated: ${formatAbsoluteTime(fire.lastUpdated)}`;

    const relTime = document.createElement('div');
    relTime.style.cssText = `color: ${colors.text}; font-size:11px;`;
    relTime.textContent = formatAge(fire.lastUpdated);

    rightSide.appendChild(absTime);
    rightSide.appendChild(relTime);

    row.appendChild(leftSide);
    row.appendChild(rightSide);

    const firstChild = detailPanel.firstChild;
    detailPanel.insertBefore(row, firstChild);
  }

  // --- Auto-refresh loop: updates all visible timestamps every 30s ---
  let _refreshInterval = null;
  let _activeFires = [];

  function init(firesArray) {
    _activeFires = firesArray || [];
    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(() => {
      document.querySelectorAll('.freshness-badge').forEach(badge => {
        const card = badge.closest('[data-fire-id]');
        if (!card) return;
        const fireId = card.getAttribute('data-fire-id');
        const fire = _activeFires.find(f => f.id === fireId);
        if (fire && fire.lastUpdated) {
          const staleness = getStaleness(fire.lastUpdated);
          const colors = COLORS[staleness];
          badge.setAttribute('data-staleness', staleness);
          badge.style.background = colors.bg;
          badge.style.color = colors.text;
          badge.style.borderColor = colors.border;
          const label = badge.querySelector('span:last-child');
          if (label) label.textContent = formatAge(fire.lastUpdated);
          const dot = badge.querySelector('.freshness-dot');
          if (dot) {
            dot.style.background = colors.text;
            dot.style.animation = staleness === 'FRESH'
              ? 'freshness-pulse 2s ease-in-out infinite'
              : staleness === 'CRITICAL'
                ? 'freshness-blink 0.8s step-end infinite'
                : 'none';
          }
        }
      });
    }, 30000);
  }

  return { init, renderTimestamp, renderDetailTimestamp, getStaleness, formatAge, THRESHOLDS, COLORS };
})();

// ============================================================
// EXAMPLE: How to add `lastUpdated` to your fires data
// ============================================================
//
// const fires = [
//   {
//     id: 'canyon-fire',
//     name: 'Canyon Fire (San Bernardino)',
//     status: 'MANDATORY',
//     acreage: 14250,
//     containment: 35,
//     wind: 'NE @ 25 mph',
//     fuelRisk: 'EXTREME',
//     lastUpdated: new Date().toISOString(),  // <-- ADD THIS
//     // ... rest of fields
//   },
//   // ...
// ];
//
// DataFreshness.init(fires);
//
// // When rendering sidebar cards:
// fires.forEach(fire => {
//   const card = document.querySelector(`[data-fire-id="${fire.id}"]`);
//   DataFreshness.renderTimestamp(card, fire);
// });
//
// // When user selects a fire and detail panel loads:
// function onFireSelected(fire) {
//   const detailPanel = document.getElementById('fire-detail-panel');
//   DataFreshness.renderDetailTimestamp(detailPanel, fire);
// }
