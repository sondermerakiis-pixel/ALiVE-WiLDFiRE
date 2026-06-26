# ALiVE-WiLDFiRE — NDA Token Gate Integration Guide

## For Anti (Antigravity) — Drop-in Integration

All patch files are in this directory. Here's the exact integration order:

---

## Step 1: Add Server Routes → `server.js`

Open `server.js` and paste the routes from `nda_server_routes.js` **after** the existing `app.post('/api/auth/login', ...)` block.

The routes to add:
- `POST /api/nda/accept` — Records NDA acceptance, returns access token
- `GET /api/nda/verify/:token` — Validates a stored token
- `GET /api/nda/list` — Admin audit trail of all acceptances
- `POST /api/nda/revoke` — Admin revocation by email

The `db.json` will auto-extend with an `ndaAcceptances` array.

**Note:** The `crypto` module is already required in `db.js` — you can use `require('crypto')` inline in the route or import it at the top of `server.js`.

---

## Step 2: Add CSS → `style.css`

Append the contents of `nda_gate.css` to the end of `style.css`.

This adds:
- Full-screen NDA overlay with glassmorphism
- Form fields, terms scroll box, checkbox row
- Submit button with orange gradient (matches existing brand)
- Light mode + mobile responsive variants

---

## Step 3: Add HTML → `index.html`

Insert the contents of `nda_gate.html` as the **first child of `<body>`**, before `<header>`.

```html
<body>
  <!-- NDA GATE (paste nda_gate.html contents here) -->
  <div id="nda-gate" class="nda-gate">
    ...
  </div>

  <!-- Existing dashboard -->
  <header>
    ...
  </header>
  ...
</body>
```

---

## Step 4: Add Frontend JS → `index.html` or `app.js`

**Option A (recommended):** Add a `<script src="nda_gate.js"></script>` tag in `index.html` **before** the `app.js` script tag. Copy `nda_gate.js` to the project root.

**Option B:** Paste the contents of `nda_gate.js` at the **top** of `app.js`, before the existing code.

---

## How It Works

1. User visits `localhost:3000` → full-screen NDA overlay appears
2. User enters name, email, optional organization
3. User checks the agreement checkbox
4. Clicks "Accept NDA & Enter Platform"
5. Server records acceptance in `db.json` with timestamp, IP, user agent
6. Server returns a unique `nda_XXXX...` token
7. Frontend stores token in `localStorage`
8. NDA gate fades away, dashboard loads
9. On subsequent visits, frontend checks `localStorage` for token
10. Token is verified against server (graceful offline fallback)

## Admin Endpoints

- **View all acceptances:** `GET /api/nda/list`
- **Revoke access:** `POST /api/nda/revoke` with `{ "email": "user@example.com" }`

## File Manifest

```
nda_server_routes.js  — Server-side Express routes (paste into server.js)
nda_gate.css          — Styles (append to style.css)
nda_gate.html         — HTML overlay (insert as first child of <body>)
nda_gate.js           — Frontend logic (include before app.js)
```
