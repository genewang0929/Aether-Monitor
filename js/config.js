/* ═══════════════════════════════════════════════
   AETHER MONITOR — Configuration
   API keys are loaded from js/env.js (gitignored).
   Copy js/env.example.js → js/env.js and fill in your keys.
   ═══════════════════════════════════════════════ */

const _ENV = window.ENV || {};

const CONFIG = {
  // ── API KEYS (loaded from env.js) ──────────────
  OPENWEATHER_KEY: _ENV.OPENWEATHER_KEY || '',
  GEMINI_KEY: _ENV.GEMINI_KEY || '',

  // ── SETTINGS ─────────────────────────────────
  POLL_INTERVAL_MS: 5 * 60 * 1000,   // 5-minute live refresh
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_MAX_TOKENS: 800,

  // ── CITIES ───────────────────────────────────
  CITIES: [
    {
      id: "NODE_01",
      name: "Los Angeles",
      state: "CA",
      lat: 34.0522,
      lon: -118.2437,
      zip: "90001",
      pop: 3898747,
    },
    {
      id: "NODE_02",
      name: "San Francisco",
      state: "CA",
      lat: 37.7749,
      lon: -122.4194,
      zip: "94102",
      pop: 873965,
    },
    {
      id: "NODE_03",
      name: "Phoenix",
      state: "AZ",
      lat: 33.4484,
      lon: -112.074,
      zip: "85001",
      pop: 1608139,
    },
    {
      id: "NODE_04",
      name: "Las Vegas",
      state: "NV",
      lat: 36.1699,
      lon: -115.1398,
      zip: "89101",
      pop: 641903,
    },
    {
      id: "NODE_05",
      name: "Seattle",
      state: "WA",
      lat: 47.6062,
      lon: -122.3321,
      zip: "98101",
      pop: 737255,
    },
    {
      id: "NODE_06",
      name: "Portland",
      state: "OR",
      lat: 45.5051,
      lon: -122.675,
      zip: "97201",
      pop: 652503,
    },
    {
      id: "NODE_07",
      name: "Denver",
      state: "CO",
      lat: 39.7392,
      lon: -104.9903,
      zip: "80201",
      pop: 715522,
    },
    {
      id: "NODE_08",
      name: "Salt Lake City",
      state: "UT",
      lat: 40.7608,
      lon: -111.891,
      zip: "84101",
      pop: 199723,
    },
    {
      id: "NODE_09",
      name: "Dallas",
      state: "TX",
      lat: 32.7767,
      lon: -96.797,
      zip: "75201",
      pop: 1304379,
    },
    {
      id: "NODE_10",
      name: "Houston",
      state: "TX",
      lat: 29.7604,
      lon: -95.3698,
      zip: "77001",
      pop: 2304580,
    },
    {
      id: "NODE_11",
      name: "Austin",
      state: "TX",
      lat: 30.2672,
      lon: -97.7431,
      zip: "78701",
      pop: 961855,
    },
    {
      id: "NODE_12",
      name: "New Orleans",
      state: "LA",
      lat: 29.9511,
      lon: -90.0715,
      zip: "70112",
      pop: 383997,
    },
    {
      id: "NODE_13",
      name: "Chicago",
      state: "IL",
      lat: 41.8781,
      lon: -87.6298,
      zip: "60601",
      pop: 2693976,
    },
    {
      id: "NODE_14",
      name: "Detroit",
      state: "MI",
      lat: 42.3314,
      lon: -83.0458,
      zip: "48201",
      pop: 639111,
    },
    {
      id: "NODE_15",
      name: "Cleveland",
      state: "OH",
      lat: 41.4993,
      lon: -81.6944,
      zip: "44101",
      pop: 361655,
    },
    {
      id: "NODE_16",
      name: "Pittsburgh",
      state: "PA",
      lat: 40.4406,
      lon: -79.9959,
      zip: "15201",
      pop: 302971,
    },
    {
      id: "NODE_17",
      name: "New York",
      state: "NY",
      lat: 40.7128,
      lon: -74.006,
      zip: "10001",
      pop: 8335897,
    },
    {
      id: "NODE_18",
      name: "Philadelphia",
      state: "PA",
      lat: 39.9526,
      lon: -75.1652,
      zip: "19101",
      pop: 1584064,
    },
    {
      id: "NODE_19",
      name: "Boston",
      state: "MA",
      lat: 42.3601,
      lon: -71.0589,
      zip: "02101",
      pop: 675647,
    },
    {
      id: "NODE_20",
      name: "Miami",
      state: "FL",
      lat: 25.7617,
      lon: -80.1918,
      zip: "33101",
      pop: 454279,
    },
    {
      id: "NODE_21",
      name: "Atlanta",
      state: "GA",
      lat: 33.749,
      lon: -84.388,
      zip: "30301",
      pop: 498715,
    },
    {
      id: "NODE_22",
      name: "Charlotte",
      state: "NC",
      lat: 35.2271,
      lon: -80.8431,
      zip: "28201",
      pop: 874579,
    },
    {
      id: "NODE_23",
      name: "Washington DC",
      state: "DC",
      lat: 38.9072,
      lon: -77.0369,
      zip: "20001",
      pop: 689545,
    },
    {
      id: "NODE_24",
      name: "Baltimore",
      state: "MD",
      lat: 39.2904,
      lon: -76.6122,
      zip: "21201",
      pop: 585708,
    },
  ],
};

// ── AQI UTILITIES ─────────────────────────────────────────────────────────────

function getAQIColor(aqi) {
  if (aqi <= 50) return "#22d3ee";
  if (aqi <= 100) return "#f59e0b";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#dc2626";
  if (aqi <= 300) return "#9333ea";
  return "#7c3aed";
}

function getAQICategory(aqi) {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY*";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}

function getAQIParticleConfig(aqi) {
  if (aqi <= 50) return { maxCount: 60, size: 3.5, opacity: 0.35, speed: 0.45 };
  if (aqi <= 100) return { maxCount: 180, size: 4.5, opacity: 0.50, speed: 0.75 };
  if (aqi <= 150) return { maxCount: 350, size: 6.0, opacity: 0.70, speed: 1.1 };
  if (aqi <= 200) return { maxCount: 600, size: 8.0, opacity: 0.85, speed: 1.4 };
  return { maxCount: 1000, size: 10.0, opacity: 0.95, speed: 1.8 };
}

// City radius for map nodes (scaled by population)
function getCityRadius(pop) {
  return Math.sqrt(pop / 1_000_000) * 9 + 4;
}

// Convert hex color to rgba string
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Format time for display
function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(date) {
  return date
    .toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase();
}
