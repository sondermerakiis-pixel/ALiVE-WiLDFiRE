---
name: worldmonitor-wildfire-response
description: Implements real‑time wildfire tracking, heat‑radius modeling, incident reporting, and alert dispatch (SMS/Web‑Push) for the World Monitor platform.
---
# World Monitor Wildfire Response Skill

Use this skill when you need to:
- Ingest wildfire incident data (polygon, thermal anomaly, wind, humidity).
- Compute radiant‑heat radius and ladder‑fuel risk indexes.
- Store incidents in the backend DB and expose CRUD APIs.
- Send real‑time alerts to authenticated community members and first‑responders via Twilio SMS and Web‑Push.
- Visualize fires on a Mapbox map with selectable polygons, heat overlay, and evacuation‑route overlays.
- Provide a login/registration flow for community reporting.

## Core Concepts
1. **Incident Model** – geometry (GeoJSON Polygon), `heatRadiusMeters`, `ladderFuelIndex`, timestamps, reporter ID.
2. **Heat Model** – simple exponential decay based on fire size and wind speed; outputs radius and risk index.
3. **Alert Service** – wrapper around Twilio (`twilio` npm) and `web-push` library.
4. **Map Integration** – Mapbox GL layers for fire polygons, heat circles, and routing (Mapbox Directions API).
5. **Authentication** – JWT‑based roles: `reporter`, `responder`, `admin`.

## Re‑usability
- Exported backend modules (`services/heatModel`, `services/alertService`).
- Front‑end React hooks (`useAlert`, `useFireData`).
- UI components (`FireAlertPanel`, `ReportFireModal`, `EvacuationRoutes`).
- Skill can be referenced by other agents to quickly scaffold a wildfire‑alert subsystem in any project.

## Dependencies
Add the following npm packages to the project:
```json
{
  "express": "^4.19.2",
  "cors": "^2.8.5",
  "body-parser": "^1.20.2",
  "dotenv": "^16.4.5",
  "twilio": "^5.0.4",
  "web-push": "^3.6.7",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "sqlite3": "^5.1.6",
  "mapbox-gl": "^2.15.0"
}
```
