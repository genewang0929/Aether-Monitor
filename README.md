# Aether Monitor
### See the Air. Hear the Science. Trace the Source.

A high-performance air quality telemetry dashboard for the United States. Built as a pure WebGL frontend application — no build step, no server required.

![Aether Monitor — Air Quality Telemetry](https://img.shields.io/badge/status-active-22d3ee?style=flat-square) ![Tech](https://img.shields.io/badge/stack-vanilla_JS_·_MapLibre_·_Gemini_AI-7c3aed?style=flat-square)

---

## Features

- **3D Geospatial Interface** — Powered by MapLibre GL JS with fill-extrusion for volumetric AQI data and 3D terrain context.
- **Pollution Sources (New)** — Specialized "Sources" view tracking US power plants (Coal, Gas, and AI/Data centers) with localized pollution impact analysis.
- **5-Year Deep History** — Long-term trend exploration with daily telemetry from 2020 through 2025.
- **Sonified Science** — Real-time Web Audio synthesis that maps AQI density to procedural drum patterns, allowing you to "hear" the air.
- **Aether Intelligence** — Integrated Gemini AI for sophisticated meteorological analysis and solution modeling for every monitored node.
- **Live Particle System** — Ambient Canvas-based particles that scale density and speed based on real-time local air quality.
- **Timeline Scrubber** — Seamlessly traverse historical and live datasets with real-time UI reflow.
- **Mock Mode** — Fully functional offline with realistic mock data — no API keys required to run.

---

## Tech Stack

| Layer | Library / Engine |
|---|---|
| Map Rendering | MapLibre GL JS (WebGL) + TopoJSON |
| Animation | GSAP 3 |
| AI Analysis | Google Gemini AI |
| Audio Engine | Web Audio API |
| Particle System | HTML5 Canvas |
| AQI & Weather Data | OpenWeatherMap API |
| Fonts | Bebas Neue, Space Mono, Lato |

---

## Project Structure

```
Aether-Monitor/
├── index.html          # Single-page app shell and module loading order
├── css/
│   └── style.css       # Dark terminal aesthetic, animations, and responsive layouts
├── js/
│   ├── app.js          # App bootstrap, state management, and UI coordination
│   ├── config.js       # Global configuration, city definitions, and API utility
│   ├── api.js          # Data layer: OWM, AirNow, and Gemini AI integration
│   ├── env.js          # Local API key overrides (gitignored)
│   ├── env.example.js  # Template for creating local env.js
│   ├── map.js          # MapLibre GL engine setup and 3D layer administration
│   ├── geodome.js      # Helper for rendering geodesic dome markers on the map
│   ├── render3DBars.js # Custom WebGL logic for dynamic 3D bar extrusion
│   ├── particles.js    # Hardware-accelerated canvas particle physics system
│   ├── drums.js        # Web Audio engine for AQI-driven drum sonification
│   ├── gemini.js       # Aether Intelligence AI panel and query processing
│   ├── plants.js       # Core logic for the "Sources" view and plant tracking
│   ├── plants-data.js  # Geospatial dataset of US power plants and data centers
│   ├── plants-history.js # Historical emission datasets for polluter nodes
│   ├── historical.js   # Timeline management and historical scrubber logic
│   └── historical-data.js # Static AQI datasets for historical exploration
└── data/               # Local GeoJSON and static datasets
```

---

## Quick Start

### Option 1 — Open directly

```bash
open index.html
```

### Option 2 — Local server (Recommended)

```bash
# Python 3
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

The app runs in **mock mode** by default — no API keys required.

---

## Enabling Live Data (Optional)

Open `js/config.js` to configure your keys:

```js
const CONFIG = {
  AIRNOW_KEY:      'your_key_here',   // https://www.airnowapi.org/account/request/
  OPENWEATHER_KEY: 'your_key_here',   // https://openweathermap.org/api
  GEMINI_KEY:      'your_key_here',   // https://aistudio.google.com/
};
```

---

## AQI Scale

| AQI | Category | Color |
|---|---|---|
| 0–50 | Good | Cyan |
| 51–100 | Moderate | Amber |
| 101–150 | Unhealthy for Sensitive Groups | Orange |
| 151–200 | Unhealthy | Red |
| 201–300 | Very Unhealthy | Purple |
| 301+ | Hazardous | Deep Purple |
