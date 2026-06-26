---
name: worldmonitor-architecture
description: Understanding the high-level codebase layout, multi-variant builds, and deployment stack of the World Monitor open-source intelligence platform.
---
# World Monitor Codebase Architecture

Use this skill when analyzing the directory structure, build pipeline, and deployment configurations for the World Monitor project (based on `koala73/worldmonitor`).

## Codebase Directory Layout

*   **`src/components/`**: UI components, such as custom resizable panels, globe canvas controls, and overlay dashboards.
*   **`src/services/`**: Client-side data fetching service wrappers, API integration helpers, and client state managers.
*   **`src/feeds/`**: Curated lists and parsing configurations for 500+ RSS feeds, news websites, and real-time APIs.
*   **`src/layers/`**: Geo-spatial visualization layers (e.g. aviation tracking, shipping AIS, satellite fire markers) parsed and managed for map rendering.
*   **`src/ai/`**: Web-worker-based local NLP models and integrations with external inference APIs.
*   **`src/signals/`**: Cross-feed intelligence correlation engine.
*   **`src/variants/`**: Configuration mappings that define specialized site builds:
    *   **World Monitor**: Default geopolitical and security event tracker.
    *   **Tech Monitor**: Technology news and AI trends.
    *   **Finance Monitor**: Global markets and micro-economic risk.
    *   **Commodity Monitor**: Energy, resources, and supply-chain logistics.
    *   **Happy Monitor**: Sentiment-filtered positive and constructive news.
    *   **Energy Monitor**: Power grids, utility threats, and green tech.
*   **`src/protos/`**: Protobuf schemas for the client-server communications.
*   **`api/`**: 60+ serverless edge function routes deployable on Vercel Edge.
*   **`src-tauri/`**: Tauri 2.0 configuration, Rust integration code, and build files for native desktop distribution (Windows, macOS, Linux).

## Build & Deployment Strategy

1.  **Multi-Variant Builds**: The Vite bundler compiles variant-specific packages by swapping the entrypoint configuration (`src/variants/`) during build-time. This allows a single codebase to support multiple distinct client portals.
2.  **Edge Execution**: The backend runs as lightweight Vercel Edge functions, reducing cold start times and server overhead.
3.  **Tauri 2 Desktop Shell**: Cross-compiles the Vite SPA into native binaries with a Rust shell, incorporating Node.js sidecars for local system utilities when run locally.
