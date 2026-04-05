/* ═══════════════════════════════════════════════
   AETHER MONITOR — MapLibre GL Map + 3D Bars
   Replaces the D3/SVG map with a WebGL map engine
   that supports fill-extrusion (3D bars).
   ═══════════════════════════════════════════════ */

const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const CITIES_SOURCE = 'cities-source';
const CITIES_CIRCLE = 'cities-circle';
const CITIES_GLOW   = 'cities-glow';
const CITIES_LABEL  = 'cities-label';

let glMap = null;       // MapLibre map instance (global for other modules)
let particleSystem = null;
let selectedCity = null;
let adHocMarker = null;

// ── INIT ─────────────────────────────────────────────────────────────────────

async function initMap() {
  glMap = new maplibregl.Map({
    container: 'map-gl',
    style: DARK_STYLE,
    center: [-97, 39],
    zoom: 3.6,
    pitch: 50,
    bearing: -15,
    minZoom: 2,
    maxZoom: 14,
    antialias: true,
  });

  // Wait for map style to load
  await new Promise((resolve, reject) => {
    glMap.on('load', resolve);
    glMap.on('error', (e) => { console.error('[Map]', e); reject(e); });
  });

  // Lighting for 3D extrusion shading
  glMap.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35 });

  // Add empty cities source
  glMap.addSource(CITIES_SOURCE, {
    type: 'geojson',
    data: emptyFC(),
  });

  // Glow halo layer (hidden — geodomes replace the visual)
  glMap.addLayer({
    id: CITIES_GLOW,
    type: 'circle',
    source: CITIES_SOURCE,
    paint: {
      'circle-radius': ['*', ['get', 'radius'], 1.6],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0,
    },
  });

  // City circles (invisible but large — generous click/hover hit area)
  glMap.addLayer({
    id: CITIES_CIRCLE,
    type: 'circle',
    source: CITIES_SOURCE,
    paint: {
      'circle-radius': ['*', ['get', 'radius'], 2.5],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0,
    },
  });

  // Node ID labels
  glMap.addLayer({
    id: CITIES_LABEL,
    type: 'symbol',
    source: CITIES_SOURCE,
    layout: {
      'text-field': ['upcase', ['get', 'name']],
      'text-size': 11,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
      'text-allow-overlap': true,
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': ['get', 'color'],
      'text-opacity': 0.9,
      'text-halo-color': 'rgba(6,9,26,0.95)',
      'text-halo-width': 2.5,
    },
  });

  // ── EVENT HANDLERS ──────────────────────────────────────────────────────

  // Hover → cursor + tooltip
  glMap.on('mouseenter', CITIES_CIRCLE, (e) => {
    glMap.getCanvas().style.cursor = 'pointer';
    if (e.features?.length) {
      const p = e.features[0].properties;
      showTooltip(
        { id: p.id, name: p.name },
        { aqi: p.aqi, pollutant: p.pollutant, timestamp: p.timestamp },
        e.originalEvent
      );
    }
  });

  glMap.on('mousemove', CITIES_CIRCLE, (e) => {
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip.classList.contains('hidden')) {
      const container = document.getElementById('map-container');
      positionTooltip(tooltip, e.originalEvent.clientX, e.originalEvent.clientY, container);
    }
  });

  glMap.on('mouseleave', CITIES_CIRCLE, () => {
    glMap.getCanvas().style.cursor = '';
    hideTooltip();
  });

  // Click city circle → select
  glMap.on('click', CITIES_CIRCLE, (e) => {
    e.preventDefault();
    if (!e.features?.length) return;
    const p = e.features[0].properties;
    const city = CONFIG.CITIES.find(c => c.name === p.name);
    if (city) {
      const data = APP_STATE.aqiData[city.name] || { aqi: 0, pollutant: 'PM2.5', trend: [] };
      selectCity(city, data);
    }
  });

  // Click-anywhere (background)
  glMap.on('click', (e) => {
    const features = glMap.queryRenderedFeatures(e.point, { layers: [CITIES_CIRCLE] });
    if (features.length > 0) return;
    handleMapClick(e);
  });

  // ── PARTICLE SYSTEM ──────────────────────────────────────────────────────
  const canvas = document.getElementById('particle-canvas');
  const container = document.getElementById('map-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  particleSystem = new ParticleSystem(canvas);
  particleSystem.start();

  // Resize handling
  const ro = new ResizeObserver(() => {
    glMap.resize();
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  });
  ro.observe(container);
}

// ── RENDER CITY NODES ────────────────────────────────────────────────────────

function renderCityNodes(aqiData) {
  if (!glMap || !glMap.getSource(CITIES_SOURCE)) return;

  const geojson = citiesToGeoJSON(aqiData);
  glMap.getSource(CITIES_SOURCE).setData(geojson);

  // Update particle emitters
  if (particleSystem) {
    CONFIG.CITIES.forEach(city => {
      const d = aqiData[city.name] || { aqi: 0 };
      const color = getAQIColor(d.aqi);
      particleSystem.updateCity(city.name, d.aqi, color, [city.lon, city.lat]);
    });
  }
}

// Render only cities present in the data (used by historical mode)
function renderCityNodesFiltered(aqiData) {
  if (!glMap || !glMap.getSource(CITIES_SOURCE)) return;

  const cities = CONFIG.CITIES.filter(c => aqiData[c.name]);
  const geojson = {
    type: 'FeatureCollection',
    features: cities.map(city => {
      const d = aqiData[city.name];
      return {
        type: 'Feature',
        properties: {
          name:      city.name,
          id:        city.id,
          state:     city.state,
          aqi:       d.aqi,
          pollutant: d.pollutant || 'PM2.5',
          color:     getAQIColor(d.aqi),
          radius:    getCityRadius(city.pop),
          timestamp: d.timestamp ? new Date(d.timestamp).toISOString() : '',
        },
        geometry: { type: 'Point', coordinates: [city.lon, city.lat] },
      };
    }),
  };

  glMap.getSource(CITIES_SOURCE).setData(geojson);

  // Only update particle emitters for included cities, clear the rest
  if (particleSystem) {
    particleSystem.clearAll();
    cities.forEach(city => {
      const d = aqiData[city.name];
      particleSystem.updateCity(city.name, d.aqi, getAQIColor(d.aqi), [city.lon, city.lat]);
    });
  }
}

function citiesToGeoJSON(aqiData) {
  return {
    type: 'FeatureCollection',
    features: CONFIG.CITIES.map(city => {
      const d = aqiData[city.name] || { aqi: 0, pollutant: 'PM2.5' };
      return {
        type: 'Feature',
        properties: {
          name:      city.name,
          id:        city.id,
          state:     city.state,
          aqi:       d.aqi,
          pollutant: d.pollutant || 'PM2.5',
          color:     getAQIColor(d.aqi),
          radius:    getCityRadius(city.pop),
          timestamp: d.timestamp ? new Date(d.timestamp).toISOString() : '',
        },
        geometry: {
          type: 'Point',
          coordinates: [city.lon, city.lat],
        },
      };
    }),
  };
}

function emptyFC() {
  return { type: 'FeatureCollection', features: [] };
}

// ── CLICK-ANYWHERE ───────────────────────────────────────────────────────────

async function handleMapClick(e) {
  // Disable click-anywhere in historical/sources mode
  if (historicalActive || plantsLayerActive) return;

  const { lng, lat } = e.lngLat;

  if (lat < 24 || lat > 50 || lng < -125 || lng > -66) return;

  const roundLat = Math.round(lat * 100) / 100;
  const roundLon = Math.round(lng * 100) / 100;

  const location = {
    id: 'AD_HOC',
    name: `${roundLat}°N, ${Math.abs(roundLon)}°W`,
    state: '--',
    lat: roundLat,
    lon: roundLon,
  };

  if (adHocMarker) { adHocMarker.remove(); adHocMarker = null; }

  const el = document.createElement('div');
  el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#22d3ee;border:2px solid #22d3ee;box-shadow:0 0 10px #22d3ee;';
  adHocMarker = new maplibregl.Marker({ element: el })
    .setLngLat([roundLon, roundLat])
    .addTo(glMap);

  document.getElementById('sb-selected').textContent = `SELECTED: ${roundLat}°N, ${Math.abs(roundLon)}°W`;

  try {
    const [aqiData, weatherData] = await Promise.all([
      fetchLocationAQI(roundLat, roundLon),
      fetchWeather(location),
    ]);

    if (aqiData.aqi === null) {
      if (adHocMarker) { adHocMarker.remove(); adHocMarker = null; }
      return;
    }

    const color = getAQIColor(aqiData.aqi);
    el.style.background  = color;
    el.style.borderColor = color;
    el.style.boxShadow   = `0 0 10px ${color}`;

    // Spawn smoke for ad-hoc point
    if (particleSystem) {
      particleSystem.updateCity('AD_HOC', aqiData.aqi, color, [roundLon, roundLat]);
    }

    // Update name with reporting area if available
    if (aqiData.reportingArea) {
      location.name = aqiData.reportingArea;
      document.getElementById('sb-selected').textContent = `SELECTED: ${location.name.toUpperCase()}`;
    }

    flyToPoint(location.lon, location.lat);
    showCityDetail(location, aqiData);
  } catch (err) {
    console.error('[Map] Ad-hoc click failed:', err);
    if (adHocMarker) { adHocMarker.remove(); adHocMarker = null; }
  }
}

// ── TOOLTIP ──────────────────────────────────────────────────────────────────

function showTooltip(city, data, mouseEvent) {
  const tooltip   = document.getElementById('map-tooltip');
  const container = document.getElementById('map-container');

  document.getElementById('tt-id').textContent        = city.id;
  document.getElementById('tt-city').textContent      = city.name.toUpperCase();
  document.getElementById('tt-aqi').textContent       = data.aqi || '--';
  document.getElementById('tt-aqi').style.color       = getAQIColor(data.aqi || 0);
  document.getElementById('tt-cat').textContent       = getAQICategory(data.aqi || 0);
  document.getElementById('tt-cat').style.color       = getAQIColor(data.aqi || 0);
  document.getElementById('tt-pollutant').textContent = data.pollutant || '--';
  document.getElementById('tt-time').textContent      = data.timestamp
    ? formatTime(new Date(data.timestamp))
    : '--:--';

  tooltip.classList.remove('hidden');
  positionTooltip(tooltip, mouseEvent.clientX, mouseEvent.clientY, container);
}

function hideTooltip() {
  document.getElementById('map-tooltip').classList.add('hidden');
}

function positionTooltip(tooltip, clientX, clientY, container) {
  const rect   = container.getBoundingClientRect();
  const ttW    = tooltip.offsetWidth  || 170;
  const ttH    = tooltip.offsetHeight || 140;
  const margin = 14;

  let left = clientX - rect.left + margin;
  let top  = clientY - rect.top - ttH / 2;

  if (left + ttW > rect.width) left = clientX - rect.left - ttW - margin;
  if (top < 0) top = margin;
  if (top + ttH > rect.height) top = rect.height - ttH - margin;

  tooltip.style.left = `${left}px`;
  tooltip.style.top  = `${top}px`;
}

// ── CITY SELECTION ───────────────────────────────────────────────────────────

function selectCity(city, data) {
  selectedCity = city;
  if (window.APP_STATE) {
    window.APP_STATE.selectedCity = city;
    window.APP_STATE.selectedCityData = data;
  }

  // Visual feedback: enlarge selected geodome
  if (particleSystem) particleSystem.setSelected(city.name);

  document.getElementById('sb-selected').textContent = `SELECTED: ${city.name.toUpperCase()}`;

  document.querySelectorAll('.node-card').forEach(el => el.classList.remove('selected'));
  const card = document.querySelector(`.node-card[data-city="${city.name}"]`);
  if (card) card.classList.add('selected');

  flyToPoint(city.lon, city.lat);
  showCityDetail(city, data);
}

function deselectAllCities() {
  selectedCity = null;
  if (particleSystem) particleSystem.setSelected(null);
  document.querySelectorAll('.node-card').forEach(el => el.classList.remove('selected'));
  document.getElementById('sb-selected').textContent = 'NONE SELECTED';
}

// ── FLY TO ───────────────────────────────────────────────────────────────────

function flyToPoint(lon, lat) {
  if (!glMap) return;
  glMap.flyTo({
    center: [lon, lat],
    zoom: 6,
    pitch: 50,
    bearing: -15,
    duration: 1200,
    essential: true,
  });
}

// ── RESET VIEW ───────────────────────────────────────────────────────────────

function resetMapView() {
  if (!glMap) return;
  glMap.flyTo({
    center: [-97, 39],
    zoom: 3.6,
    pitch: 50,
    bearing: -15,
    duration: 800,
  });
}
