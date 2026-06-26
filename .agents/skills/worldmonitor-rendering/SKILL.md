---
name: worldmonitor-rendering
description: Visualizing high-velocity geo-data using the dual map engine (globe.gl, deck.gl, maplibre-gl) and modular panel layout of World Monitor.
---
# World Monitor Rendering and Visual Engine

Use this skill when designing or extending visual interfaces, mapping layers, or panel layouts that follow the design philosophy of the World Monitor platform.

## Dual Map Engine

World Monitor employs a dual-engine architecture to visualize geographic intelligence efficiently:

1.  **3D Globe (globe.gl & Three.js)**:
    *   Used for global spatial context, depicting flight trajectories, shipping lanes, country risk ratings, and global weather patterns.
    *   Builds on `Three.js` for WebGL canvas setup, managing rotation, lighting, and camera positioning.
2.  **Flat Map (deck.gl & MapLibre GL)**:
    *   Utilizes MapLibre GL as the base map provider and `deck.gl` to render heavy data visualization layers on top of it.
    *   Supports high-density layers such as real-time flight tracking (ADS-B), vessel identification (AIS), wildfire maps (from satellite infrared sensors), and undersea telecom networks.
3.  **Mobile Fallback (D3.js & TopoJSON)**:
    *   When the user's browser lacks WebGL capability or runs on low-power mobile devices, the system falls back to a 2D SVG-based rendering using D3.js and TopoJSON, prioritizing client-side performance over immersive 3D.

## Panel Layout System

*   **Zero Framework UI**: Hand-crafted DOM manipulation with Vanilla TypeScript/CSS to avoid bundle size bloat (under 250KB gzipped).
*   **Base `Panel` Class**: All dashboard elements (e.g. RSS News feed list, CII risk summary, system telemetry) extend a base `Panel` class.
*   **Resizable & Persistent**: Grid systems allow panels to have dynamic column/row spans. Changes in size or layout are instantly saved to `localStorage` to ensure a persistent dashboard configuration across reloads.
