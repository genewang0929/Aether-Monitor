/* ═══════════════════════════════════════════════
   AETHER MONITOR — 3D Extrusion Bar Module
   Adds fill-extrusion bars to a MapLibre GL map.
   Bar height = AQI severity, color = getAQIColor().

   Usage:
     initBars(map);                          // once after map loads
     render3DBars(map, data, getAQIColor);   // on each data update
     removeBars(map);                        // to tear down

   Data format: [ { lng, lat, value }, ... ]
   ═══════════════════════════════════════════════ */

const BARS_SOURCE = 'pollution-bars-source';
const BARS_LAYER  = 'pollution-bars-layer';

const BAR_CONFIG = {
  squareSize:   1.0,       // degrees — footprint width of each bar
  maxHeight:    120000,    // meters — bar height at maxValue
  maxValue:     200,       // AQI value that maps to maxHeight
  opacity:      0.82,
  transitionMs: 500,
};

// ── Convert points to square GeoJSON polygons ────────────────────────────────

function pointsToBarGeoJSON(data, getColor) {
  const h = BAR_CONFIG.squareSize / 2;

  return {
    type: 'FeatureCollection',
    features: data.map((d, i) => ({
      type: 'Feature',
      id: i,
      properties: {
        value:  d.value,
        color:  getColor(d.value),
        height: Math.max(1, (d.value / BAR_CONFIG.maxValue) * BAR_CONFIG.maxHeight),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [d.lng - h, d.lat - h],
          [d.lng + h, d.lat - h],
          [d.lng + h, d.lat + h],
          [d.lng - h, d.lat + h],
          [d.lng - h, d.lat - h],
        ]],
      },
    })),
  };
}

// ── One-time camera + lighting ───────────────────────────────────────────────

function initBars(map) {
  map.easeTo({ pitch: 50, bearing: -15, duration: 1000 });
  map.setLight({ anchor: 'viewport', color: 'white', intensity: 0.4 });
}

// ── Create or update the extrusion layer ─────────────────────────────────────

function render3DBars(map, data, getColor) {
  const geojson = pointsToBarGeoJSON(data, getColor);

  // Source already exists → just swap the data
  if (map.getSource(BARS_SOURCE)) {
    map.getSource(BARS_SOURCE).setData(geojson);
    return;
  }

  // First render → create source + layer
  map.addSource(BARS_SOURCE, {
    type: 'geojson',
    data: geojson,
  });

  map.addLayer({
    id: BARS_LAYER,
    type: 'fill-extrusion',
    source: BARS_SOURCE,
    paint: {
      'fill-extrusion-color':   ['get', 'color'],
      'fill-extrusion-height':  ['get', 'height'],
      'fill-extrusion-base':    0,
      'fill-extrusion-opacity': BAR_CONFIG.opacity,
      'fill-extrusion-color-transition':  { duration: BAR_CONFIG.transitionMs, delay: 0 },
      'fill-extrusion-height-transition': { duration: BAR_CONFIG.transitionMs, delay: 0 },
    },
  });
}

// ── Remove the layer (e.g. when switching views) ─────────────────────────────

function removeBars(map) {
  if (map.getLayer(BARS_LAYER))  map.removeLayer(BARS_LAYER);
  if (map.getSource(BARS_SOURCE)) map.removeSource(BARS_SOURCE);
}
