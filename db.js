const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'db.json');

// Helper to hash passwords using native crypto (no dependencies)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Helper to generate circle coordinates for perimeter mapping
function getCirclePolygon(center, radiusMeters, pointsCount = 8) {
  const coordinates = [];
  const R = 6371e3; // Earth radius in meters
  const lat = center[1] * Math.PI / 180;
  const lon = center[0] * Math.PI / 180;
  const d = radiusMeters / R;

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i * 360 / pointsCount) * Math.PI / 180;
    const latPoint = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(angle));
    const lonPoint = lon + Math.atan2(Math.sin(angle) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(latPoint));
    coordinates.push([lonPoint * 180 / Math.PI, latPoint * 180 / Math.PI]);
  }
  coordinates.push(coordinates[0]); // Close polygon
  return [coordinates]; // Return array of rings as required by GeoJSON Polygon spec
}

// Initial mock wildfires
const initialWildfires = [
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
    windDirection: 'NE',
    humidity: 12, // %
    ladderFuelRisk: 'EXTREME',
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
    windDirection: 'W',
    humidity: 28, // %
    ladderFuelRisk: 'MODERATE',
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
    ladderFuelRisk: 'CRITICAL',
    description: 'Conflagration moving quickly through timber fuels in Cleveland National Forest. Extreme behavior reported with spotting up to 1 mile.',
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

function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = {
      users: [
        {
          username: 'Abdur Rahman',
          passwordHash: hashPassword('password123'),
          phone: '+15551234567'
        }
      ],
      subscribers: [],
      incidents: initialWildfires
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
    console.log('✅ Created persistent database db.json with initial seed data.');
  }
}

function readDB() {
  initDB();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { users: [], subscribers: [], incidents: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

function syncIncidents(wfigsIncidents) {
  const currentData = readDB();
  
  // Separate community incidents (manually reported) from automatically fetched WFIGS incidents
  // Preserves reported fires from being overwritten by WFIGS sync
  const communityIncidents = currentData.incidents.filter(i => i.id.endsWith('-community') || !i.id.startsWith('wfigs-'));
  
  const parsedWfigs = wfigsIncidents.map(w => {
    const attrs = w.attributes;
    const geom = w.geometry || {};
    const lat = parseFloat(attrs.InitialLatitude || geom.y);
    const lng = parseFloat(attrs.InitialLongitude || geom.x);
    
    if (isNaN(lat) || isNaN(lng)) return null;
    
    const name = attrs.IncidentName || 'Unnamed Wildfire';
    const acres = parseFloat(attrs.IncidentSize) || 10;
    const containment = parseFloat(attrs.PercentContained) || 0;
    const id = `wfigs-${attrs.UniqueFireIdentifier ? attrs.UniqueFireIdentifier.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    
    // Calculate heat dynamics
    const calculatedHRR = acres * 800; // kW
    const flameHt = parseFloat((Math.sqrt(calculatedHRR) / 100).toFixed(1)) || 2.0;
    
    // Generate circular perimeter polygon
    const perimeterRadiusMeters = Math.sqrt(acres * 4046.86 / Math.PI);
    const perimeterRing = getCirclePolygon([lng, lat], perimeterRadiusMeters, 8);
    
    return {
      id,
      name,
      latitude: lat,
      longitude: lng,
      acresBurned: acres,
      containment,
      flameHeight: flameHt,
      heatReleaseRate: calculatedHRR,
      evacuationStatus: containment < 50 ? 'MANDATORY' : 'ADVISORY',
      windSpeed: 12,
      windDirection: 'SW',
      humidity: 22,
      ladderFuelRisk: acres > 1000 ? 'CRITICAL' : 'MODERATE',
      description: `WFIGS Interagency Active Incident Feed. Ingested: ${new Date().toLocaleDateString()}. Discovery Date: ${attrs.FireDiscoveryDateTime ? new Date(attrs.FireDiscoveryDateTime).toLocaleDateString() : 'Recent'}.`,
      updatedAt: new Date().toISOString(),
      perimeter: perimeterRing[0] // Extract coordinates array
    };
  }).filter(Boolean);
  
  // Merge: keep community reports and append unique parsed WFIGS incidents
  const merged = [...communityIncidents];
  parsedWfigs.forEach(pf => {
    if (!merged.some(m => m.id === pf.id)) {
      merged.push(pf);
    }
  });
  
  currentData.incidents = merged;
  writeDB(currentData);
  console.log(`🔄 Wildfire Data Synced: ${communityIncidents.length} community reports, ${parsedWfigs.length} points ingested from WFIGS API.`);
}

module.exports = {
  readDB,
  writeDB,
  hashPassword,
  verifyPassword,
  syncIncidents
};
