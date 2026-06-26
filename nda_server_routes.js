// ============================================================
// ALiVE-WiLDFiRE — NDA TOKEN GATE
// Server-side patches for Anti to integrate into server.js
// ============================================================
//
// INTEGRATION FOR ANTI:
// 1. Add these routes to server.js (after the existing auth routes)
// 2. Add the NDA middleware wrapper (optional — for hard-gating API access)
// 3. The db.json will auto-extend with an "ndaAcceptances" array
//
// The flow:
//   - User arrives at dashboard → full-screen NDA overlay appears
//   - User enters their name, email, and checks the agreement box
//   - Frontend sends POST /api/nda/accept with a unique access token
//   - Server records acceptance with timestamp, IP, user agent
//   - Frontend stores the signed token in localStorage
//   - On subsequent visits, frontend checks localStorage for valid token
//   - Server can verify any token via GET /api/nda/verify/:token
// ============================================================


// ──────────────────────────────────────────────
// ADD TO server.js — NDA Token Gate Routes
// ──────────────────────────────────────────────

// Paste these route handlers into server.js after the existing
// app.post('/api/auth/login', ...) block.

/*

// ─── NDA TOKEN GATE ─────────────────────────────────────────

// Accept NDA — records the acceptance and returns a signed access token
app.post('/api/nda/accept', (req, res) => {
  const { fullName, email, organization, agreedToTerms } = req.body;

  if (!fullName || !email || !agreedToTerms) {
    return res.status(400).json({
      error: 'Full name, email, and agreement confirmation are required.'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const currentData = db.readDB();

  // Initialize ndaAcceptances array if it doesn't exist
  if (!currentData.ndaAcceptances) {
    currentData.ndaAcceptances = [];
  }

  // Check if this email already has a valid NDA token
  const existingAcceptance = currentData.ndaAcceptances.find(
    a => a.email.toLowerCase() === email.toLowerCase() && a.status === 'active'
  );

  if (existingAcceptance) {
    console.log(`📋 NDA already accepted by ${email}. Returning existing token.`);
    return res.json({
      success: true,
      token: existingAcceptance.token,
      acceptedAt: existingAcceptance.acceptedAt,
      message: 'NDA previously accepted. Access granted.'
    });
  }

  // Generate a unique NDA access token
  const crypto = require('crypto');
  const token = 'nda_' + crypto.randomBytes(24).toString('hex');

  const acceptance = {
    token,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    organization: (organization || '').trim(),
    agreedToTerms: true,
    acceptedAt: new Date().toISOString(),
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    status: 'active'  // can be 'active' or 'revoked'
  };

  currentData.ndaAcceptances.push(acceptance);
  db.writeDB(currentData);

  console.log(`📋 NDA accepted: ${fullName} (${email}) — Token: ${token.substring(0, 12)}...`);

  res.status(201).json({
    success: true,
    token: acceptance.token,
    acceptedAt: acceptance.acceptedAt,
    message: 'NDA accepted. Access granted to ALiVE-WiLDFiRE platform.'
  });
});


// Verify NDA token — checks if a token is valid and active
app.get('/api/nda/verify/:token', (req, res) => {
  const { token } = req.params;

  if (!token || !token.startsWith('nda_')) {
    return res.status(400).json({ valid: false, error: 'Invalid token format.' });
  }

  const currentData = db.readDB();
  if (!currentData.ndaAcceptances) {
    return res.json({ valid: false });
  }

  const acceptance = currentData.ndaAcceptances.find(
    a => a.token === token && a.status === 'active'
  );

  if (acceptance) {
    res.json({
      valid: true,
      fullName: acceptance.fullName,
      email: acceptance.email,
      acceptedAt: acceptance.acceptedAt
    });
  } else {
    res.json({ valid: false });
  }
});


// Admin: List all NDA acceptances (for audit trail)
app.get('/api/nda/list', (req, res) => {
  const currentData = db.readDB();
  const acceptances = (currentData.ndaAcceptances || []).map(a => ({
    fullName: a.fullName,
    email: a.email,
    organization: a.organization,
    acceptedAt: a.acceptedAt,
    status: a.status,
    tokenPrefix: a.token.substring(0, 12) + '...'
  }));

  res.json({ success: true, count: acceptances.length, acceptances });
});


// Admin: Revoke an NDA token (by email)
app.post('/api/nda/revoke', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const currentData = db.readDB();
  if (!currentData.ndaAcceptances) {
    return res.status(404).json({ error: 'No NDA records found.' });
  }

  let revoked = 0;
  currentData.ndaAcceptances.forEach(a => {
    if (a.email.toLowerCase() === email.toLowerCase() && a.status === 'active') {
      a.status = 'revoked';
      a.revokedAt = new Date().toISOString();
      revoked++;
    }
  });

  if (revoked > 0) {
    db.writeDB(currentData);
    console.log(`🚫 NDA revoked for ${email} (${revoked} token(s))`);
    res.json({ success: true, message: `Revoked ${revoked} token(s) for ${email}.` });
  } else {
    res.status(404).json({ error: 'No active NDA found for this email.' });
  }
});

*/
