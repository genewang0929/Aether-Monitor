# Aether Monitor

A real-time air quality telemetry dashboard for the United States. Built as a pure frontend application — no build step, no server required.

![Aether Monitor — Air Quality Telemetry](https://img.shields.io/badge/status-active-22d3ee?style=flat-square) ![Tech](https://img.shields.io/badge/stack-vanilla_JS_·_D3_·_Claude_AI-7c3aed?style=flat-square)

---

## Features

- **Interactive US Map** — 24 monitored city nodes rendered with D3.js + TopoJSON, sized by population and colored by AQI level
- **Live Particle System** — Ambient particle density and speed scale with the local AQI, providing an immediate visual sense of air quality
- **AQI Telemetry** — Real-time (or mock) Air Quality Index data per city via EPA AirNow API, with 7-day trend history
- **Weather Context** — Temperature, humidity, and wind data per node via OpenWeatherMap API
- **Aether Intelligence** — Claude AI panel that explains pollution causes, meteorological context, and health implications for any selected city or free-form query
- **Timeline Controls** — Historical / Live / Forecast mode switcher with a scrubber bar
- **City Search** — Search by city name or ZIP code to jump to a node
- **Mock Mode** — Fully functional offline with realistic mock data — no API keys needed to run

---

## Tech Stack

| Layer | Library |
|---|---|
| Map rendering | D3.js v7 + TopoJSON |
| Animation | GSAP 3 |
| AI analysis | Anthropic Claude API (claude-sonnet) |
| AQI data | EPA AirNow API |
| Weather data | OpenWeatherMap API |
| Fonts | Bebas Neue, Space Mono, Lato |

---

## Project Structure

```
Aether-Monitor/
├── index.html          # Single-page app shell, layout, and script loading order
├── css/
│   └── style.css       # All styles — dark terminal aesthetic, animations, responsive layout
├── js/
│   ├── config.js       # API keys, city list, AQI utilities (color, category, particle config)
│   ├── api.js          # Data layer — AirNow, OpenWeather, and Claude API calls with mock fallbacks
│   ├── map.js          # D3 map rendering, city nodes, hover tooltips, click handlers
│   ├── particles.js    # Canvas particle system, AQI-driven density and speed
│   ├── claude.js       # Claude AI panel — toggle, analysis trigger, typewriter response display
│   └── app.js          # App bootstrap, state management, polling loop, UI wiring
└── data/               # (reserved for local GeoJSON / static datasets)
```

---

## Quick Start

### Option 1 — Open directly

```bash
open index.html
```

### Option 2 — Local server (recommended, avoids browser CORS restrictions)

```bash
# Python 3
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

The app runs in **mock mode** by default — no API keys required.

---

## Enabling Live Data (Optional)

Open `js/config.js` and fill in your API keys:

```js
const CONFIG = {
  AIRNOW_KEY:      'your_key_here',   // https://www.airnowapi.org/account/request/
  OPENWEATHER_KEY: 'your_key_here',   // https://openweathermap.org/api
  CLAUDE_KEY:      'your_key_here',   // https://console.anthropic.com/
};
```

All three keys are optional and independent. Any key left blank falls back to mock data for that service.

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
