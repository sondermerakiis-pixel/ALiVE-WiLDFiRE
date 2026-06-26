const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const https = require('https');
const webpush = require('web-push');
const twilio = require('twilio');
const crypto = require('crypto');
const db = require('./db');

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database on startup
db.readDB();

// Enable CORS and parsing requests
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static assets from the current directory (frontend dashboard)
app.use(express.static(path.join(__dirname)));

// Configure WebPush VAPID details
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT_MAILTO || 'mailto:admin@worldmonitor.app';

const isWebPushConfigured = !!(vapidPublicKey && vapidPrivateKey && 
  vapidPublicKey !== 'your_vapid_public_key' && 
  vapidPrivateKey !== 'your_vapid_private_key');

if (isWebPushConfigured) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('✅ WebPush VAPID keys configured successfully.');
} else {
  console.error('❌ WebPush VAPID keys are missing or invalid in configuration (.env). Browser notifications will run in DRY-RUN mode.');
}

// Configure Twilio SMS Client
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
const isTwilioConfigured = !!(
  twilioSid && 
  twilioSid.startsWith('AC') && 
  twilioSid !== 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' &&
  twilioAuthToken && 
  twilioAuthToken !== 'your_twilio_auth_token_here' && 
  twilioAuthToken.trim() !== '' &&
  twilioFrom &&
  twilioFrom !== '+18559999999'
);

if (isTwilioConfigured) {
  try {
    twilioClient = twilio(twilioSid, twilioAuthToken);
    console.log('✅ Twilio SMS client configured successfully.');
  } catch (err) {
    console.error('❌ Twilio client initialization failed:', err.message);
  }
} else {
  console.warn('⚠️ Twilio credentials missing or placeholders detected. SMS dispatch will run in DRY-RUN logging mode.');
}

// API Endpoint: Get active incidents (persisted in db.json)
app.get('/api/incidents', (req, res) => {
  const data = db.readDB();
  res.json({ success: true, incidents: data.incidents });
});

// API Endpoint: Get WebPush VAPID Public Key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ success: true, publicKey: vapidPublicKey });
});

// API Endpoint: Create new incident (reported by community member)
app.post('/api/incidents', (req, res) => {
  const { name, latitude, longitude, acresBurned, containment, flameHeight, heatReleaseRate, evacuationStatus, windSpeed, windDirection, humidity, ladderFuelRisk, description, perimeter } = req.body;
  
  if (!name || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Name, Latitude, and Longitude are required.' });
  }

  const currentData = db.readDB();
  
  const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const existingIncident = currentData.incidents.find(i => i.id === newId);
  const finalId = existingIncident ? `${newId}-${Date.now().toString().substring(8)}` : newId;

  const newIncident = {
    id: finalId,
    name: `${name} (Community Report)`,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    acresBurned: parseFloat(acresBurned) || 10,
    containment: parseFloat(containment) || 0,
    flameHeight: parseFloat(flameHeight) || 2.0,
    heatReleaseRate: parseFloat(heatReleaseRate) || 8000,
    evacuationStatus: evacuationStatus || 'ADVISORY',
    windSpeed: parseFloat(windSpeed) || 10,
    windDirection: windDirection || 'SW',
    humidity: parseFloat(humidity) || 20,
    ladderFuelRisk: ladderFuelRisk || 'MODERATE',
    description: description || 'Citizen reported outbreak. Verification by first responders in progress.',
    updatedAt: new Date().toISOString(),
    perimeter: perimeter || [
      [longitude - 0.01, latitude - 0.01],
      [longitude + 0.01, latitude - 0.01],
      [longitude + 0.01, latitude + 0.01],
      [longitude - 0.01, latitude + 0.01],
      [longitude - 0.01, latitude - 0.01]
    ]
  };

  currentData.incidents.push(newIncident);
  db.writeDB(currentData);

  console.log(`🔥 Persistent incident added: ${newIncident.name} (${newIncident.id})`);
  res.status(201).json({ success: true, incident: newIncident });
});

// API Endpoint: Register user
app.post('/api/auth/register', (req, res) => {
  const { username, password, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const currentData = db.readDB();
  const existingUser = currentData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  const newUser = {
    username,
    passwordHash: db.hashPassword(password),
    phone: phone || null
  };

  currentData.users.push(newUser);
  db.writeDB(currentData);

  console.log(`👤 User registered successfully: ${username}`);
  res.status(201).json({ success: true, user: { username, phone: newUser.phone } });
});

// API Endpoint: Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const currentData = db.readDB();
  const user = currentData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !db.verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  console.log(`👤 User logged in: ${username}`);
  res.json({ success: true, user: { username: user.username, phone: user.phone } });
});

// API Endpoint: Register subscriber
app.post('/api/subscribe', (req, res) => {
  const { subscription, phone, latitude, longitude, radiusMeters, isFirstResponder } = req.body;

  if (!subscription && !phone) {
    return res.status(400).json({ error: 'Subscription object or phone number is required.' });
  }

  const subscriberId = Math.random().toString(36).substring(2, 9);
  const newSubscriber = {
    id: subscriberId,
    subscription: subscription || null,
    phone: phone || null,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    radiusMeters: radiusMeters ? parseFloat(radiusMeters) : 25000,
    isFirstResponder: !!isFirstResponder
  };

  const currentData = db.readDB();
  currentData.subscribers.push(newSubscriber);
  db.writeDB(currentData);

  console.log(`👤 New subscriber registered: ID=${subscriberId}, Phone=${phone || 'none'}, PushEnabled=${!!subscription}`);

  res.status(201).json({ success: true, subscriberId });
});

// Helper: Calculate geodesic distance (Haversine formula) in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
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

// API Endpoint: Broadcast emergency alerts
app.post('/api/broadcast', async (req, res) => {
  const { incidentName, latitude, longitude, messageBody, severity } = req.body;

  if (!incidentName || !messageBody) {
    return res.status(400).json({ error: 'incidentName and messageBody are required fields.' });
  }

  console.log(`🚨 BROADCAST REQUEST: Fire="${incidentName}", Severity=${severity}`);

  const fireLat = parseFloat(latitude);
  const fireLng = parseFloat(longitude);

  let pushSentCount = 0;
  let smsSentCount = 0;

  // Compile notification payload
  const payload = JSON.stringify({
    title: `🚨 EMERGENCY ALERT: ${severity}`,
    body: `${incidentName} Outbreak: ${messageBody}`,
    severity: severity
  });

  const currentData = db.readDB();
  const promises = currentData.subscribers.map(async (sub) => {
    // Determine if subscriber is within 25 kilometers of the incident center
    let isWithinRange = true;
    if (!isNaN(fireLat) && !isNaN(fireLng) && sub.latitude && sub.longitude) {
      const distance = getDistanceMeters(fireLat, fireLng, sub.latitude, sub.longitude);
      // 25km buffer range for community alert broadcasts
      isWithinRange = distance <= 25000;
    }

    if (!isWithinRange) return;

    // Send WebPush notification
    if (sub.subscription) {
      if (isWebPushConfigured) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          pushSentCount++;
        } catch (err) {
          console.error(`Error sending WebPush to subscriber ${sub.id}:`, err.message);
          // If subscription is expired/invalid, remove from database
          if (err.statusCode === 410 || err.statusCode === 404) {
            const dbData = db.readDB();
            const idx = dbData.subscribers.findIndex(s => s.id === sub.id);
            if (idx !== -1) {
              dbData.subscribers.splice(idx, 1);
              db.writeDB(dbData);
            }
          }
        }
      } else {
        console.log(`[DRY-RUN WEBPUSH DISPATCH] To subscriber ${sub.id} | Payload: ${payload}`);
        pushSentCount++;
      }
    }

    // Send Twilio SMS
    if (sub.phone) {
      if (isTwilioConfigured) {
        try {
          await twilioClient.messages.create({
            body: `[News Monitor AI - ${severity}] ${incidentName} Outbreak: ${messageBody}`,
            from: twilioFrom,
            to: sub.phone
          });
          smsSentCount++;
        } catch (err) {
          console.error(`Error sending Twilio SMS to ${sub.phone}:`, err.message);
        }
      } else {
        // Dry-run log simulation if credentials are placeholders
        console.log(`[DRY-RUN SMS DISPATCH] To: ${sub.phone} | Body: [${severity}] ${incidentName} Outbreak: ${messageBody}`);
        smsSentCount++;
      }
    }
  });

  await Promise.all(promises);

  console.log(`📢 Broadcast complete. Dispatched ${pushSentCount} WebPush alerts and ${smsSentCount} SMS notifications.`);

  const mode = (isWebPushConfigured || isTwilioConfigured) ? 'LIVE' : 'DRY_RUN';

  res.json({
    success: true,
    mode: mode,
    totalSubscribers: currentData.subscribers.length,
    pushAlertsSent: pushSentCount,
    smsAlertsSent: smsSentCount
  });
});

// WFIGS Data Synchronization
const WFIGS_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0/query?where=1%3D1&outFields=*&f=json';

function fetchWFIGS() {
  https.get(WFIGS_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.features) {
          if (typeof db.syncIncidents === 'function') {
            db.syncIncidents(parsed.features);
            console.log(`✅ Synced live incidents from WFIGS.`);
          }
        }
      } catch (err) {
        console.error('❌ Failed to parse WFIGS data:', err);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Failed to fetch WFIGS data:', err);
  });
}

fetchWFIGS();
setInterval(fetchWFIGS, 10 * 60 * 1000);

// Start Server
app.listen(PORT, () => {
  console.log(`🔥 Operational Wildfire Dispatch Server running on http://localhost:${PORT}`);
});
