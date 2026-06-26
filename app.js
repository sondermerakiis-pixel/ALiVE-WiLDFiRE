// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1Ijoic29uZ' + 'GVybWVyYWtpIiwiYSI6ImNtbno1cGU2aDA5amUydHBvbTl3czQ2OGUifQ.l-TQKkpmOibOzyyyd1DhzQ';

// ─── Client-side circle polygon generator (mirrors db.js for browser use) ───
// Generates a GeoJSON-compatible polygon ring from a center point and radius.
function getCirclePolygon(center, radiusMeters, pointsCount = 12) {
  const coordinates = [];
  const R = 6371e3; // Earth radius in meters
  const lat = center[1] * Math.PI / 180;
  const lon = center[0] * Math.PI / 180;
  const d = radiusMeters / R;

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 360 / pointsCount) * Math.PI / 180;
    const latPoint = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(angle));
    const lonPoint = lon + Math.atan2(
      Math.sin(angle) * Math.sin(d) * Math.cos(lat),
      Math.cos(d) - Math.sin(lat) * Math.sin(latPoint)
    );
    coordinates.push([lonPoint * 180 / Math.PI, latPoint * 180 / Math.PI]);
  }
  coordinates.push(coordinates[0]); // Close ring
  return coordinates; // Returns flat ring array (for use in GeoJSON coordinates: [ring])
}

// Mock Southern California Wildfire Data
let wildfiresData = [
  {
    id: 'canyon-fire',
    name: 'Canyon Fire (San Bernardino)',
    latitude: 34.1842,
    longitude: -117.3156,
    acresBurned: 14250,
    containment: 35,
    flameHeight: 8.5,
    heatReleaseRate: 85000, // kW
    evacuationStatus: 'MANDATORY',
    windSpeed: 25, // mph
    windDirection: 'NE', // Santa Ana winds pushing Southwest
    humidity: 12, // %
    ladderFuelRisk: 'EXTREME', // Heavy Chaparral
    description: 'Rapidly spreading fire fueled by dry Santa Ana wind gusts. Threatening foothill communities in San Bernardino and Devore.',
    perimeter: [
      [-117.34, 34.20],
      [-117.31, 34.22],
      [-117.28, 34.20],
      [-117.29, 34.17],
      [-117.33, 34.16],
      [-117.35, 34.18],
      [-117.34, 34.20]
    ]
  },
  {
    id: 'malibu-ridge-fire',
    name: 'Malibu Ridge Fire',
    latitude: 34.0583,
    longitude: -118.7214,
    acresBurned: 4890,
    containment: 65,
    flameHeight: 4.2,
    heatReleaseRate: 32000, // kW
    evacuationStatus: 'ADVISORY',
    windSpeed: 14, // mph
    windDirection: 'W', // Coastal breeze
    humidity: 28, // %
    ladderFuelRisk: 'MODERATE', // Mixed Coastal Sage Scrub
    description: 'Active brush fire burning in steep terrain above Malibu. Structures threatened along Latigo Canyon Road.',
    perimeter: [
      [-118.74, 34.07],
      [-118.71, 34.08],
      [-118.70, 34.06],
      [-118.72, 34.04],
      [-118.75, 34.05],
      [-118.74, 34.07]
    ]
  },
  {
    id: 'cleveland-complex',
    name: 'Cleveland Forest Complex',
    latitude: 33.7258,
    longitude: -117.5189,
    acresBurned: 22800,
    containment: 12,
    flameHeight: 14.8,
    heatReleaseRate: 165000, // kW
    evacuationStatus: 'MANDATORY',
    windSpeed: 32, // mph
    windDirection: 'ENE',
    humidity: 8, // %
    ladderFuelRisk: 'CRITICAL', // Old Growth Pine with heavy understory
    description: 'Conflagration moving quickly through timber fuels in Cleveland National Forest. Extreme behavior reported with spotting up to 1 mile.',
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(), // 12 mins ago
    perimeter: [
      [-117.56, 33.74],
      [-117.51, 33.76],
      [-117.48, 33.73],
      [-117.49, 33.70],
      [-117.53, 33.68],
      [-117.57, 33.71],
      [-117.56, 33.74]
    ]
  }
];

// Helper for data freshness
function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hrs ago";
  interval = seconds / 60;
  if (interval >= 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
}

// Mock Safe Zones and Assembly Points
const safeZones = [
  { name: 'San Bernardino Valley College (Shelter)', type: 'SHELTER', latitude: 34.0903, longitude: -117.3082, radius: 300 },
  { name: 'Malibu High School (Assembly Area)', type: 'ASSEMBLY', latitude: 34.0259, longitude: -118.8267, radius: 250 },
  { name: 'Orange County Fairgrounds (Large Animal Shelter)', type: 'SHELTER', latitude: 33.6656, longitude: -117.8967, radius: 500 },
  { name: 'Incident Command Post - ICP East', type: 'COMMAND', latitude: 33.8055, longitude: -117.5855, radius: 150 }
];

// Mock Evacuation Routes with Volumes (Bottlenecks)
const evacuationRoutes = [
  {
    id: 'i15-south',
    name: 'I-15 South (Devore Pass)',
    priority: 'Primary',
    status: 'CONGESTED',
    coordinates: [[-117.315, 34.22], [-117.318, 34.18], [-117.323, 34.14], [-117.325, 34.10]]
  },
  {
    id: 'sr138-west',
    name: 'SR-138 West (Cajon Route)',
    priority: 'Secondary',
    status: 'CLEAR',
    coordinates: [[-117.315, 34.22], [-117.35, 34.25], [-117.40, 34.27], [-117.48, 34.29]]
  },
  {
    id: 'summit-rd',
    name: 'Summit Road (Backcountry)',
    priority: 'Tertiary',
    status: 'CLEAR',
    coordinates: [[-117.315, 34.22], [-117.28, 34.24], [-117.25, 34.25], [-117.20, 34.25]]
  },
  {
    id: 'pch-north',
    name: 'Pacific Coast Hwy (PCH North)',
    priority: 'Primary',
    status: 'CLEAR',
    coordinates: [[-118.72, 34.05], [-118.78, 34.03], [-118.84, 34.02], [-118.90, 34.02]]
  },
  {
    id: 'latigo-canyon',
    name: 'Latigo Canyon Road',
    priority: 'Secondary',
    status: 'BLOCKED',
    coordinates: [[-118.72, 34.05], [-118.70, 34.09], [-118.71, 34.12]]
  },
  {
    id: 'i15-north',
    name: 'I-15 North (High Desert)',
    priority: 'Primary',
    status: 'CONGESTED',
    coordinates: [[-117.518, 33.72], [-117.50, 33.78], [-117.48, 33.85]]
  },
  {
    id: 'maple-springs',
    name: 'Maple Springs Trail',
    priority: 'Tertiary',
    status: 'CLEAR',
    coordinates: [[-117.518, 33.72], [-117.54, 33.68], [-117.56, 33.64]]
  }
];

// Bottleneck points (warning icons)
const bottlenecks = [
  { name: 'Devore Junction Bottleneck', status: 'CONGESTED', latitude: 34.18, longitude: -117.318 },
  { name: 'Cajon Highway Junction', status: 'CLEAR', latitude: 34.25, longitude: -117.35 },
  { name: 'Latigo Canyon Landslide Blockage', status: 'BLOCKED', latitude: 34.09, longitude: -118.70 }
];

let map;
let selectedIncidentId = 'canyon-fire';

// Production WebPush configuration parameters
const VAPID_PUBLIC_KEY = 'BO_-CM1gVpA9JLNvpAOoQ048XXB_PglOpPVFMQ14M8wcog4SB9ditLrRVEqh206bbn_io0cS0pmt2nWFFFyeg4w';
let swRegistration = null;
let isPushSubscribed = false;

// Authenticated user state
let currentUser = null;
let isPickingCoordinates = false;

// 1. Initialize Mapbox Map
function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-117.8, 34.0],
    zoom: 8.5,
    pitch: 45,
    bearing: -10,
    antialias: true
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-left');

  // Add Geolocate Control
  map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  }), 'top-left');

  let isLowBandwidth = false;
  if (navigator.connection) {
    const conn = navigator.connection;
    if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g') {
      isLowBandwidth = true;
      document.getElementById('low-bw-banner').style.display = 'block';
    }
  }

  map.on('load', () => {
    // Add Sources
    map.addSource('fire-perimeters', { type: 'geojson', data: getPerimetersGeoJSON() });
    map.addSource('fire-hotspots', { type: 'geojson', data: getHotspotsGeoJSON() });
    map.addSource('safe-zones', { type: 'geojson', data: getSafeZonesGeoJSON() });
    map.addSource('radiant-heat-buffers', { type: 'geojson', data: getRadiantHeatGeoJSON() });
    
    if (!isLowBandwidth) {
      map.addSource('forecast-cones', { type: 'geojson', data: getForecastConeGeoJSON() });
    }
    
    map.addSource('evac-routes', { type: 'geojson', data: getEvacuationRoutesGeoJSON() });
    map.addSource('bottlenecks', { type: 'geojson', data: getBottlenecksGeoJSON() });

    // Add 3D Terrain safely if bandwidth permits
    if (!isLowBandwidth) {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
      }
      map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
    }

    // A. Render Wind Propagation Cones (Forecasting) - Skip if low bandwidth
    if (!isLowBandwidth) {
      map.addLayer({
        id: 'forecast-cones-layer',
        type: 'fill',
        source: 'forecast-cones',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': [
            'interpolate', ['linear'], ['get', 'timeHour'],
            0, 0.4,
            6, 0.05
          ]
        }
      });

      map.addLayer({
        id: 'forecast-cones-outline',
        type: 'line',
        source: 'forecast-cones',
        paint: {
          'line-color': '#ef4444',
          'line-width': 1,
          'line-dasharray': [2, 4],
          'line-opacity': 0.8
        }
      });
    }

    // B. Render Evacuation Routes (Color-coded by traffic volume/bottlenecks)
    map.addLayer({
      id: 'evac-routes-layer',
      type: 'line',
      source: 'evac-routes',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-width': 4.5,
        'line-color': [
          'match',
          ['get', 'status'],
          'CLEAR', '#10b981',
          'CONGESTED', '#ff6b00',
          'BLOCKED', '#ef4444',
          '#9ca3af'
        ],
        'line-opacity': 0.85
      }
    });

    // C. Render Radiant Heat Risk Zones
    map.addLayer({
      id: 'radiant-heat-layer',
      type: 'fill',
      source: 'radiant-heat-buffers',
      paint: {
        'fill-color': '#ff6b00',
        'fill-opacity': 0.15,
        'fill-outline-color': '#ff3300'
      }
    });

    // D. Render Fire Perimeters
    map.addLayer({
      id: 'perimeters-fill',
      type: 'fill',
      source: 'fire-perimeters',
      paint: {
        'fill-color': '#ef4444',
        'fill-opacity': 0.2
      }
    });

    map.addLayer({
      id: 'perimeters-outline',
      type: 'line',
      source: 'fire-perimeters',
      paint: {
        'line-color': '#ff3300',
        'line-width': 2,
        'line-dasharray': [2, 1]
      }
    });

    // Highlight Layer for selected perimeter
    map.addLayer({
      id: 'perimeter-highlight',
      type: 'line',
      source: 'fire-perimeters',
      paint: {
        'line-color': '#00ffff',
        'line-width': 4.5,
        'line-opacity': 0.95
      },
      filter: ['==', 'id', '']
    });

    // E. Render Safe Zones / Shelters
    map.addLayer({
      id: 'safe-zones-layer',
      type: 'circle',
      source: 'safe-zones',
      paint: {
        'circle-radius': [
          'match',
          ['get', 'type'],
          'COMMAND', 8,
          10
        ],
        'circle-color': [
          'match',
          ['get', 'type'],
          'COMMAND', '#3b82f6',
          '#10b981'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.85
      }
    });

    // F. Render Bottleneck Points (Pulsating Warnings)
    map.addLayer({
      id: 'bottlenecks-glow',
      type: 'circle',
      source: 'bottlenecks',
      paint: {
        'circle-radius': 12,
        'circle-color': '#ef4444',
        'circle-opacity': 0.4,
        'circle-blur': 0.8
      },
      filter: ['==', ['get', 'status'], 'BLOCKED']
    });

    map.addLayer({
      id: 'bottlenecks-core',
      type: 'circle',
      source: 'bottlenecks',
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'match',
          ['get', 'status'],
          'BLOCKED', '#ef4444',
          'CONGESTED', '#ff6b00',
          '#10b981'
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff'
      }
    });

    // G. Render Active Fire Hotspot Points
    map.addLayer({
      id: 'hotspots-glow',
      type: 'circle',
      source: 'fire-hotspots',
      paint: {
        'circle-radius': 14,
        'circle-color': '#ef4444',
        'circle-opacity': 0.4,
        'circle-blur': 1
      }
    });

    map.addLayer({
      id: 'hotspots-core',
      type: 'circle',
      source: 'fire-hotspots',
      paint: {
        'circle-radius': 6,
        'circle-color': '#ffcf40',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ef4444'
      }
    });

    // Hover tooltips for Safe Zones & Bottlenecks
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'safe-zone-popup'
    });

    map.on('mouseenter', 'safe-zones-layer', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      popup.setLngLat(coordinates)
        .setHTML(`
          <div style="font-family: var(--font-family); color: #080c14; padding: 4px;">
            <strong style="color: ${props.type === 'COMMAND' ? '#1d4ed8' : '#047857'}">${props.type}</strong><br/>
            <span>${props.name}</span>
          </div>
        `)
        .addTo(map);
    });

    map.on('mouseleave', 'safe-zones-layer', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('mouseenter', 'bottlenecks-core', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      popup.setLngLat(coordinates)
        .setHTML(`
          <div style="font-family: var(--font-family); color: #080c14; padding: 4px;">
            <strong style="color: #b91c1c;">TRAFFIC BOTTLENECK</strong><br/>
            <span>${props.name} (${props.status})</span>
          </div>
        `)
        .addTo(map);
    });

    map.on('mouseleave', 'bottlenecks-core', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Hover tooltip for Perimeters
    map.on('mouseenter', 'perimeters-fill', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      popup.setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family: var(--font-family); color: #080c14; padding: 4px;">
            <strong style="color: #ef4444;">${props.name}</strong><br/>
            <span>Contained: ${props.containment}% | Acres: ${props.acresBurned}</span>
          </div>
        `)
        .addTo(map);
    });
    
    map.on('mousemove', 'perimeters-fill', (e) => {
      popup.setLngLat(e.lngLat);
    });

    map.on('mouseleave', 'perimeters-fill', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Hover tooltip for Evac Routes
    map.on('mouseenter', 'evac-routes-layer', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      popup.setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family: var(--font-family); color: #080c14; padding: 4px;">
            <strong>Evacuation Route</strong><br/>
            <span>${props.name} (${props.status})</span>
          </div>
        `)
        .addTo(map);
    });

    map.on('mousemove', 'evac-routes-layer', (e) => {
      popup.setLngLat(e.lngLat);
    });

    map.on('mouseleave', 'evac-routes-layer', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Map click listeners for selection and coordinate picking
    map.on('click', (e) => {
      if (isPickingCoordinates) {
        document.getElementById('report-lat').value = e.lngLat.lat.toFixed(4);
        document.getElementById('report-lng').value = e.lngLat.lng.toFixed(4);
        toggleCoordinatePicker(); // disable picker
        return;
      }
    });

    map.on('click', 'hotspots-glow', (e) => {
      if (isPickingCoordinates) return;
      const id = e.features[0].properties.id;
      selectIncident(id);
    });

    map.on('click', 'perimeters-fill', (e) => {
      if (isPickingCoordinates) return;
      const id = e.features[0].properties.id;
      selectIncident(id);
    });

    map.on('click', 'radiant-heat-layer', (e) => {
      if (isPickingCoordinates) return;
      const id = e.features[0].properties.id;
      selectIncident(id);
    });

    selectIncident(selectedIncidentId);
  });
}

// 2. GeoJSON builders
function getPerimetersGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: wildfiresData.map(w => ({
      type: 'Feature',
      properties: { id: w.id, name: w.name },
      geometry: {
        type: 'Polygon',
        coordinates: [w.perimeter]
      }
    }))
  };
}

function getHotspotsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: wildfiresData.map(w => ({
      type: 'Feature',
      properties: { id: w.id, name: w.name },
      geometry: {
        type: 'Point',
        coordinates: [w.longitude, w.latitude]
      }
    }))
  };
}

function getSafeZonesGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: safeZones.map((sz, idx) => ({
      type: 'Feature',
      properties: { id: idx, name: sz.name, type: sz.type },
      geometry: {
        type: 'Point',
        coordinates: [sz.longitude, sz.latitude]
      }
    }))
  };
}

function getRadiantHeatGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: wildfiresData.map(w => {
      const chi = 0.3;
      const q_crit = 10.0;
      const radiusMeters = Math.sqrt((chi * w.heatReleaseRate) / (4 * Math.PI * q_crit));

      return {
        type: 'Feature',
        properties: { id: w.id, name: w.name + ' Radiant Hazard', radius: radiusMeters },
        geometry: {
          type: 'Polygon',
          coordinates: [getCirclePolygon([w.longitude, w.latitude], radiusMeters)]
        }
      };
    })
  };
}

function getEvacuationRoutesGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: evacuationRoutes.map(r => ({
      type: 'Feature',
      properties: { id: r.id, name: r.name, status: r.status },
      geometry: {
        type: 'LineString',
        coordinates: r.coordinates
      }
    }))
  };
}

function getBottlenecksGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: bottlenecks.map(b => ({
      type: 'Feature',
      properties: { name: b.name, status: b.status },
      geometry: {
        type: 'Point',
        coordinates: [b.longitude, b.latitude]
      }
    }))
  };
}

// Draw wind propagation forecasting cone
function getForecastConeGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: wildfiresData.map(w => {
      const center = [w.longitude, w.latitude];
      const windDir = w.windDirection;
      let angle = 0;
      switch (windDir) {
        case 'E': angle = 0; break;
        case 'ENE': angle = 22.5; break;
        case 'NE': angle = 45; break;
        case 'NNE': angle = 67.5; break;
        case 'N': angle = 90; break;
        case 'NNW': angle = 112.5; break;
        case 'NW': angle = 135; break;
        case 'WNW': angle = 157.5; break;
        case 'W': angle = 180; break;
        case 'WSW': angle = -157.5; break;
        case 'SW': angle = -135; break;
        case 'SSW': angle = -112.5; break;
        case 'S': angle = -90; break;
        case 'SSE': angle = -67.5; break;
        case 'SE': angle = -45; break;
        case 'ESE': angle = -22.5; break;
        default: angle = 45;
      }
      
      // Calculate wind push direction (180 degrees from source)
      const pushAngleRad = (angle + 180) * Math.PI / 180;
      
      // Distance based on wind speed (forecasting bounds)
      const maxDistanceMeters = w.windSpeed * 800; // e.g. 20km distance
      const km = maxDistanceMeters / 1000;
      const latCos = Math.cos(w.latitude * Math.PI / 180);
      const distLng = km / (111.32 * latCos);
      const distLat = km / 110.574;
      
      const endPoint = [
        w.longitude + distLng * Math.cos(pushAngleRad),
        w.latitude + distLat * Math.sin(pushAngleRad)
      ];
      
      // 25 degree lateral dispersion spread
      const spreadLeft = pushAngleRad - (25 * Math.PI / 180);
      const spreadRight = pushAngleRad + (25 * Math.PI / 180);
      
      const leftPoint = [
        w.longitude + (distLng * 0.8) * Math.cos(spreadLeft),
        w.latitude + (distLat * 0.8) * Math.sin(spreadLeft)
      ];
      const rightPoint = [
        w.longitude + (distLng * 0.8) * Math.cos(spreadRight),
        w.latitude + (distLat * 0.8) * Math.sin(spreadRight)
      ];
      
      return {
        type: 'Feature',
        properties: { id: w.id },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            center,
            leftPoint,
            endPoint,
            rightPoint,
            center
          ]]
        }
      };
    })
  };
}

// 3. Spatial Calculations (GIS Modeling)
function calculatePerimeterLengthMiles(coords) {
  let lengthMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i+1];
    lengthMeters += getDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
  }
  return lengthMeters * 0.000621371;
}

function calculatePolygonAreaAcres(coords, centerLat) {
  let area = 0;
  const numPoints = coords.length;
  if (numPoints < 3) return 0;
  
  const x = [];
  const y = [];
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  
  for (let i = 0; i < numPoints; i++) {
    x.push(coords[i][0] * 111320 * cosLat);
    y.push(coords[i][1] * 110574);
  }
  
  for (let i = 0; i < numPoints - 1; i++) {
    area += (x[i] * y[i+1]) - (x[i+1] * y[i]);
  }
  area += (x[numPoints-1] * y[0]) - (x[0] * y[numPoints-1]);
  
  const areaSqMeters = Math.abs(area) / 2;
  return areaSqMeters / 4046.86;
}

// UI Incident Selector
function selectIncident(id) {
  selectedIncidentId = id;
  const data = wildfiresData.find(w => w.id === id);
  if (!data) return;

  document.querySelectorAll('.incident-card').forEach(card => {
    card.classList.remove('selected');
    if (card.dataset.id === id) {
      card.classList.add('selected');
    }
  });

  if (map && map.getLayer('perimeter-highlight')) {
    map.setFilter('perimeter-highlight', ['==', 'id', id]);
  }

  document.getElementById('fire-name-title').textContent = data.name;
  document.getElementById('fire-desc').textContent = data.description;
  
  document.getElementById('stat-acres').textContent = data.acresBurned.toLocaleString() + ' ac';
  document.getElementById('stat-containment').textContent = data.containment + '%';
  document.getElementById('stat-flame-height').textContent = data.flameHeight + ' m';
  
  const hrRate = data.heatReleaseRate;
  const chi = 0.3;
  
  const dCritLadder = Math.sqrt((chi * hrRate) / (4 * Math.PI * 15.0));
  
  document.getElementById('stat-hrr').textContent = (hrRate / 1000).toFixed(1) + ' MW';
  document.getElementById('stat-danger-radius').textContent = dCritLadder.toFixed(1) + ' m';
  
  document.getElementById('eq-hrr').innerHTML = `Q = ${hrRate.toLocaleString()} kW`;
  document.getElementById('eq-radius').innerHTML = `d_crit = √((0.3 * Q) / (4 * π * 15.0)) = <strong>${dCritLadder.toFixed(2)} meters</strong>`;

  const indicator = document.getElementById('ladder-indicator');
  const threatScore = (hrRate / 170000) * 100;
  indicator.style.left = Math.min(100, Math.max(0, threatScore)) + '%';

  document.getElementById('weather-wind').textContent = `${data.windDirection} @ ${data.windSpeed} mph`;
  document.getElementById('weather-humidity').textContent = `${data.humidity}%`;
  document.getElementById('ladder-fuel-level').textContent = data.ladderFuelRisk;

  // GIS Data
  const calcAreaAcres = calculatePolygonAreaAcres(data.perimeter, data.latitude);
  const calcPerimeterMiles = calculatePerimeterLengthMiles(data.perimeter);

  document.getElementById('gis-area').textContent = calcAreaAcres.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' ac';
  document.getElementById('gis-perimeter').textContent = calcPerimeterMiles.toFixed(2) + ' mi';

  if (map) {
    map.flyTo({
      center: [data.longitude, data.latitude],
      zoom: 11.5,
      pitch: 45,
      bearing: data.windDirection === 'NE' ? -35 : -15,
      speed: 1.2,
      curve: 1.42
    });
  }
}

// 4. Tab Switcher
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.getElementById(`tab-btn-${tabName}`).classList.add('active');
  document.getElementById(`tab-content-${tabName}`).classList.add('active');
}

// 5. User Login state
let isAuthRegisterMode = false;

function toggleLogin() {
  const btn = document.getElementById('btn-login');
  if (!currentUser) {
    openAuthModal();
  } else {
    // Log user out
    currentUser = null;
    btn.textContent = '👤 Community Login';
    btn.classList.remove('logged-in');
    
    // Hide report incident tab
    const reportTabBtn = document.getElementById('tab-btn-report');
    reportTabBtn.style.display = 'none';
    switchTab('monitor');
    
    if (isPickingCoordinates) {
      toggleCoordinatePicker();
    }
    
    // Clear credentials stored in localStorage
    localStorage.removeItem('news_monitor_user');
    alert('Logged out successfully.');
  }
}

function openAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-phone').value = '';
  
  const authModal = document.getElementById('auth-modal');
  if (!authModal.hasAttribute('data-keydown-wired')) {
    authModal.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        submitAuth();
      }
    });
    authModal.setAttribute('data-keydown-wired', 'true');
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function toggleAuthMode() {
  const title = document.getElementById('auth-modal-title');
  const phoneGroup = document.getElementById('auth-phone-group');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleMsg = document.getElementById('auth-toggle-msg');
  
  if (!isAuthRegisterMode) {
    isAuthRegisterMode = true;
    title.textContent = 'Community Register';
    phoneGroup.style.display = 'flex';
    submitBtn.textContent = 'Register';
    toggleMsg.textContent = 'Already have an account? Login here.';
  } else {
    isAuthRegisterMode = false;
    title.textContent = 'Community Login';
    phoneGroup.style.display = 'none';
    submitBtn.textContent = 'Login';
    toggleMsg.textContent = "Don't have an account? Register here.";
  }
}

function submitAuth() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const phone = document.getElementById('auth-phone').value.trim();
  const errorDiv = document.getElementById('auth-error');
  
  if (!username || !password) {
    errorDiv.textContent = 'Username and password are required.';
    errorDiv.style.display = 'block';
    return;
  }
  
  const url = isAuthRegisterMode ? '/api/auth/register' : '/api/auth/login';
  const body = { username, password };
  if (isAuthRegisterMode && phone) {
    body.phone = phone;
  }
  
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('news_monitor_user', JSON.stringify(currentUser));
      
      // Update UI
      const btn = document.getElementById('btn-login');
      btn.textContent = `👤 ${currentUser.username} (Logout)`;
      btn.classList.add('logged-in');
      
      // Show report tab
      const reportTabBtn = document.getElementById('tab-btn-report');
      reportTabBtn.style.display = 'block';
      switchTab('report');
      
      closeAuthModal();
      alert(`Welcome, ${currentUser.username}! Operational reporting is now unlocked.`);
    } else {
      errorDiv.textContent = data.error || 'Authentication failed.';
      errorDiv.style.display = 'block';
    }
  })
  .catch(err => {
    console.error('Auth error:', err);
    errorDiv.textContent = 'Connection error. Is the backend server running?';
    errorDiv.style.display = 'block';
  });
}

// Check local storage for existing session on page load
function checkUserSession() {
  const storedUser = localStorage.getItem('news_monitor_user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      const btn = document.getElementById('btn-login');
      btn.textContent = `👤 ${currentUser.username} (Logout)`;
      btn.classList.add('logged-in');
      
      const reportTabBtn = document.getElementById('tab-btn-report');
      reportTabBtn.style.display = 'block';
    } catch (e) {
      localStorage.removeItem('news_monitor_user');
    }
  }
}

function toggleCoordinatePicker() {
  const pickerBtn = document.getElementById('btn-toggle-picker');
  if (!isPickingCoordinates) {
    isPickingCoordinates = true;
    map.getCanvas().style.cursor = 'crosshair';
    pickerBtn.textContent = '❌ Cancel Click';
    pickerBtn.style.color = '#ef4444';
    pickerBtn.style.borderColor = '#ef4444';
  } else {
    isPickingCoordinates = false;
    map.getCanvas().style.cursor = '';
    pickerBtn.textContent = '🖱️ Enable Map Click';
    pickerBtn.style.color = 'var(--color-orange)';
    pickerBtn.style.borderColor = 'var(--color-orange)';
  }
}

// Submit community report dynamically
function fetchIncidents() {
  return fetch('/api/incidents')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.incidents && data.incidents.length > 0) {
        wildfiresData = data.incidents;
        console.log(`✅ Loaded ${wildfiresData.length} incidents from persistent database.`);

        // Update header outbreak count dynamically
        const activeCount = wildfiresData.filter(w => w.evacuationStatus === 'MANDATORY' || w.evacuationStatus === 'ADVISORY').length;
        const countEl = document.querySelector('.stat-pill strong');
        if (countEl) countEl.textContent = activeCount;

        // Update sidebar incident list
        renderIncidentList();

        // Update Mapbox sources if map and sources are ready
        if (map && map.isStyleLoaded()) {
          if (map.getSource('fire-hotspots')) map.getSource('fire-hotspots').setData(getHotspotsGeoJSON());
          if (map.getSource('fire-perimeters')) map.getSource('fire-perimeters').setData(getPerimetersGeoJSON());
          if (map.getSource('radiant-heat-buffers')) map.getSource('radiant-heat-buffers').setData(getRadiantHeatGeoJSON());
          if (map.getSource('forecast-cones')) map.getSource('forecast-cones').setData(getForecastConeGeoJSON());
        }

        // Re-populate alert incident select dropdown
        populateAlertSelect();

        // Auto-select the first incident (or keep current if still valid)
        const stillValid = wildfiresData.some(w => w.id === selectedIncidentId);
        if (!stillValid && wildfiresData.length > 0) {
          selectIncident(wildfiresData[0].id);
        } else if (stillValid) {
          selectIncident(selectedIncidentId);
        }
      }
    })
    .catch(err => {
      console.warn('⚠️ Could not load incidents from server. Falling back to local data.', err);
      // Fallback: render with hardcoded wildfiresData and select first
      renderIncidentList();
      populateAlertSelect();
      if (wildfiresData.length > 0) selectIncident(wildfiresData[0].id);
    });
}

function renderIncidentList() {
  const listContainer = document.getElementById('incident-list-container');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  wildfiresData.forEach(w => {
    const card = document.createElement('div');
    card.className = `incident-card ${w.evacuationStatus === 'MANDATORY' ? 'danger' : 'warning'}`;
    card.dataset.id = w.id;
    card.onclick = () => selectIncident(w.id);

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${w.name}</div>
        <div class="card-badge ${w.evacuationStatus === 'MANDATORY' ? 'danger' : 'warning'}">
          ${w.evacuationStatus}
        </div>
      </div>
      <div class="card-details">
        <span>Acreage: <strong>${w.acresBurned.toLocaleString()}</strong></span>
        <span>Containment: <strong>${w.containment}%</strong></span>
        <span>Wind: <strong>${w.windDirection} @ ${w.windSpeed} mph</strong></span>
        <span>Fuel Risk: <strong>${w.ladderFuelRisk}</strong></span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px; font-style: italic;">
        Last Updated: ${timeAgo(w.updatedAt)}
      </div>
    `;

    listContainer.appendChild(card);
  });
  
  // Make sure the selected incident is highlighted
  if (selectedIncidentId) {
    const activeCard = document.querySelector(`.incident-card[data-id="${selectedIncidentId}"]`);
    if (activeCard) activeCard.classList.add('selected');
  }
}

function populateAlertSelect() {
  const alertIncidentSelect = document.getElementById('alert-incident');
  if (!alertIncidentSelect) return;
  alertIncidentSelect.innerHTML = '';
  
  wildfiresData.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.name;
    alertIncidentSelect.appendChild(opt);
  });
  
  // Select the currently selected incident if it exists in the list
  if (selectedIncidentId && wildfiresData.some(w => w.id === selectedIncidentId)) {
    alertIncidentSelect.value = selectedIncidentId;
  }
}

function submitCommunityReport() {
  if (!currentUser) {
    alert('You must be logged in to submit a report.');
    return;
  }

  const name = document.getElementById('report-name').value.trim();
  const latVal = parseFloat(document.getElementById('report-lat').value);
  const lngVal = parseFloat(document.getElementById('report-lng').value);
  const sizeVal = parseFloat(document.getElementById('report-size').value) || 10;
  const fuel = document.getElementById('report-fuel').value;
  const desc = document.getElementById('report-desc').value.trim();

  if (!name || isNaN(latVal) || isNaN(lngVal)) {
    alert('Please fill out Name, Latitude, and Longitude. TIP: Use map click mode to grab coordinates.');
    return;
  }

  // Generate dynamic fire perimeter polygon based on size input
  const perimeterRadiusMeters = Math.sqrt(sizeVal * 4046.86 / Math.PI);
  const perimeterPoints = getCirclePolygon([lngVal, latVal], perimeterRadiusMeters, 8);

  const calculatedHRR = sizeVal * 800; // kW
  const flameHt = parseFloat((Math.sqrt(calculatedHRR) / 100).toFixed(1)) || 2.0;

  const newFireReport = {
    name,
    latitude: latVal,
    longitude: lngVal,
    acresBurned: sizeVal,
    containment: 0,
    flameHeight: flameHt,
    heatReleaseRate: calculatedHRR,
    evacuationStatus: 'ADVISORY',
    windSpeed: 10,
    windDirection: 'SW',
    humidity: 20,
    ladderFuelRisk: fuel,
    description: desc || 'Citizen reported outbreak. Verification by first responders in progress.',
    perimeter: perimeterPoints
  };

  // POST report to persistent server database
  fetch('/api/incidents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newFireReport)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Reload incidents list from database
      fetchIncidents().then(() => {
        // Switch to monitor and select the new incident
        switchTab('monitor');
        selectIncident(data.incident.id);
        
        // Clear inputs
        document.getElementById('report-name').value = '';
        document.getElementById('report-lat').value = '';
        document.getElementById('report-lng').value = '';
        document.getElementById('report-size').value = '';
        document.getElementById('report-desc').value = '';

        alert(`🔥 Report for "${name}" submitted and saved to persistent database! Coordinates mapped and radiant hazard buffer calculated in real-time.`);
      });
    } else {
      alert(`Error submitting report: ${data.error || 'Unknown error'}`);
    }
  })
  .catch(err => {
    console.error('Error submitting report:', err);
    alert('Connection error. Is the backend server running?');
  });
}

// 6. GIS Export utilities for Stakeholders
function generateGeoJSONExport() {
  const data = wildfiresData.find(w => w.id === selectedIncidentId);
  if (!data) return '';

  const chi = 0.3;
  const q_crit = 10.0;
  const radiusMeters = Math.sqrt((chi * data.heatReleaseRate) / (4 * Math.PI * q_crit));

  const exportObj = {
    type: 'FeatureCollection',
    metadata: {
      platform: 'News Monitor AI Spatial Feed',
      timestamp: new Date().toISOString(),
      incidentId: data.id,
      incidentName: data.name
    },
    features: [
      {
        type: 'Feature',
        properties: {
          layer: 'Fire Perimeter',
          name: data.name,
          reportedAcres: data.acresBurned,
          gisCalculatedAcres: calculatePolygonAreaAcres(data.perimeter, data.latitude),
          containment: data.containment,
          flameHeightMeters: data.flameHeight,
          heatReleaseRateKw: data.heatReleaseRate,
          evacuationStatus: data.evacuationStatus,
          windSpeedMph: data.windSpeed,
          windDirection: data.windDirection
        },
        geometry: {
          type: 'Polygon',
          coordinates: [data.perimeter]
        }
      },
      {
        type: 'Feature',
        properties: {
          layer: 'Radiant Heat Hazard Zone',
          incidentName: data.name,
          radiusMeters: radiusMeters,
          criticalHeatFluxThreshold: '10.0 kW/m^2 (Dry Wood Ignition)'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [getCirclePolygon([data.longitude, data.latitude], radiusMeters)]
        }
      },
      {
        type: 'Feature',
        properties: {
          layer: 'Wind Propagation Forecast Cone',
          incidentName: data.name
        },
        geometry: getForecastConeGeoJSON().features.find(f => f.properties.id === data.id).geometry
      }
    ]
  };

  return JSON.stringify(exportObj, null, 2);
}

function copyGeoJSON() {
  const geojsonStr = generateGeoJSONExport();
  if (!geojsonStr) return;

  navigator.clipboard.writeText(geojsonStr)
    .then(() => {
      const btn = document.querySelector('button[onclick="copyGeoJSON()"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Copied!';
      setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    })
    .catch(err => {
      console.error('Clipboard copy error:', err);
      alert('Failed to copy to clipboard.');
    });
}

function downloadGeoJSON() {
  const geojsonStr = generateGeoJSONExport();
  if (!geojsonStr) return;

  const blob = new Blob([geojsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${selectedIncidentId}-spatial-intel.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 7. Service Worker Alerting Integration
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('sw.js')
    .then((swReg) => {
      console.log('✅ Service Worker registered successfully.', swReg);
      swRegistration = swReg;
      checkPushSubscription();
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });
} else {
  console.warn('⚠️ Push notifications are not supported in this browser.');
  const pushBtn = document.getElementById('btn-subscribe-push');
  if (pushBtn) {
    pushBtn.disabled = true;
    pushBtn.textContent = 'Push Unsupported';
  }
}

function checkPushSubscription() {
  if (!swRegistration) return;
  swRegistration.pushManager.getSubscription()
    .then((subscription) => {
      isPushSubscribed = !(subscription === null);
      updatePushBtn();
    });
}

function updatePushBtn() {
  const btn = document.getElementById('btn-subscribe-push');
  if (!btn) return;
  if (isPushSubscribed) {
    btn.textContent = '✅ Push Registered';
    btn.style.background = 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)';
  } else {
    btn.textContent = '🔔 Register Push';
    btn.style.background = '';
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function subscribeToPush() {
  if (!swRegistration) {
    alert('Service Worker is not ready. Please refresh.');
    return;
  }
  
  if (Notification.permission === 'denied') {
    alert('Push notifications are blocked. Please enable them in your browser settings.');
    return;
  }

  const doSubscribe = () => {
    fetch('/api/vapid-public-key')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.publicKey && data.publicKey !== 'your_vapid_public_key') {
          const applicationServerKey = urlBase64ToUint8Array(data.publicKey);
          return swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
        } else {
          alert('Push notifications require VAPID keys configured on the server. See .env.example for setup.');
          throw new Error('VAPID key not configured on server.');
        }
      })
      .then((subscription) => {
        if (subscription) {
          isPushSubscribed = true;
          updatePushBtn();
          saveSubscription(subscription, null);
        }
      })
      .catch((err) => {
        console.error('Failed to subscribe user to WebPush: ', err);
        if (err.message !== 'VAPID key not configured on server.') {
          alert('Permission denied or WebPush config error: ' + err.message);
        }
      });
  };

  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        doSubscribe();
      }
    });
  } else {
    doSubscribe();
  }
}

function submitSubscription() {
  const phoneInput = document.getElementById('sub-phone');
  const phone = phoneInput.value.trim();
  
  if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
    alert('Please enter a valid phone number in E.164 format (e.g. +15551234567)');
    return;
  }
  
  saveSubscription(null, phone);
}

function saveSubscription(subscription, phone) {
  const status = document.getElementById('sub-status');
  status.textContent = 'Registering subscription...';
  
  const center = map ? map.getCenter() : { lat: 34.0, lng: -117.8 };
  
  fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subscription: subscription,
      phone: phone,
      latitude: center.lat,
      longitude: center.lng,
      radiusMeters: 25000,
      isFirstResponder: false
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      status.textContent = '✅ Subscribed successfully!';
      status.style.color = '#10b981';
      if (phone) {
        document.getElementById('sub-phone').value = '';
      }
    } else {
      status.textContent = '❌ Subscription registration failed.';
      status.style.color = '#ef4444';
    }
  })
  .catch(err => {
    console.error('Error saving subscription:', err);
    status.textContent = '❌ Network connection error.';
    status.style.color = '#ef4444';
  });
}

function dispatchAlert() {
  const incidentSelect = document.getElementById('alert-incident');
  const alertLevel = document.getElementById('alert-level').value;
  const alertMsg = document.getElementById('alert-message').value;

  const incident = wildfiresData.find(w => w.id === incidentSelect.value);
  if (!incident) return;

  const overlay = document.getElementById('alerts-overlay');
  const toast = document.createElement('div');
  toast.className = `emergency-toast ${alertLevel === 'MANDATORY' ? 'danger' : 'warning'}`;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-tag ${alertLevel === 'MANDATORY' ? 'danger' : 'warning'}">
        ⚠️ ${alertLevel} ALERT
      </span>
      <span class="toast-time">${timeStr}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="toast-title">${incident.name} Outbreak</div>
    <div class="toast-body">Broadcasting operational alerts...</div>
  `;

  playAlertSound(alertLevel === 'MANDATORY' ? 2 : 1);
  overlay.appendChild(toast);

  fetch('/api/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      incidentName: incident.name,
      latitude: incident.latitude,
      longitude: incident.longitude,
      messageBody: alertMsg,
      severity: alertLevel
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      toast.querySelector('.toast-body').innerHTML = `
        ${alertMsg}
        <div style="color: #10b981; font-weight: 500; font-size: 11px; margin-top: 6px;">
          ✓ Alert successfully dispatched to ${data.pushAlertsSent} browser subscriptions and ${data.smsAlertsSent} phone numbers.
        </div>
      `;
    } else {
      toast.querySelector('.toast-body').innerHTML = `
        ${alertMsg}
        <div style="color: #ef4444; font-weight: 500; font-size: 11px; margin-top: 6px;">
          ✗ Failed to complete broadcast: ${data.error || 'Server error'}
        </div>
      `;
    }
  })
  .catch(err => {
    console.error('Error dispatching alert:', err);
    toast.querySelector('.toast-body').innerHTML = `
      ${alertMsg}
      <div style="color: #ef4444; font-weight: 500; font-size: 11px; margin-top: 6px;">
        ✗ Network connection error during dispatch.
      </div>
    `;
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%) scale(0.9)';
    toast.style.transition = 'all 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 8000);
}

// Distance helper
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Chime synthesizers
function playAlertSound(type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    if (type === 2) {
      beep(audioCtx, 660, 0.15, () => {
        setTimeout(() => beep(audioCtx, 660, 0.25), 100);
      });
    } else {
      beep(audioCtx, 440, 0.3);
    }
  } catch (e) {
    console.log('AudioContext not allowed or supported yet');
  }
}

function beep(ctx, freq, duration, callback) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
  
  if (callback) {
    setTimeout(callback, duration * 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize map first (registers its own map.on('load') which adds sources+layers)
  initMap();

  // After map loads, fetch live incidents from the persistent database.
  // NOTE: initMap's internal map.on('load') also fires — both are safe as they
  // run sequentially. fetchIncidents will call selectIncident after data arrives,
  // overriding the provisional selectIncident call inside initMap.
  map.on('load', () => {
    fetchIncidents();
  });

  checkUserSession();
});

// Light Mode Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  // Check local storage for preference
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'light') {
    document.documentElement.classList.add('light-mode');
    if (themeToggleBtn) themeToggleBtn.innerText = '🌙';
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('light-mode');
      const isLight = document.documentElement.classList.contains('light-mode');
      
      themeToggleBtn.innerText = isLight ? '🌙' : '☀️';
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }
});
