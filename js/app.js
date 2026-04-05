/* ═══════════════════════════════════════════════
   AETHER MONITOR — Main Application
   ═══════════════════════════════════════════════ */

// Global app state (accessible to map.js, gemini.js)
window.APP_STATE = {
  aqiData: {},
  mode: 'live',       // 'live' or 'historical'
  currentView: 'network',
  selectedCity: null,
  lastSync: null,
  errorCount: 0,
};

// ── BOOT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  updateStatus('INITIALIZING...', 'amber');

  // Init UI modules
  initGeminiPanel();
  initViewSwitching();
  initHistorical();
  initCityDetail();
  initSearch();

  // Init map (async, loads TopoJSON from CDN)
  try {
    await initMap();
    updateStatus('LOADING DATA...', 'amber');
  } catch (err) {
    console.error('[App] Map init failed:', err);
    updateStatus('MAP_ERROR', 'red');
    APP_STATE.errorCount++;
    updateStatusBar();
    return;
  }

  // Initial data load
  await loadAndRender();

  // Start live polling
  setInterval(loadAndRender, CONFIG.POLL_INTERVAL_MS);

  updateStatus('LIVE_SYNC_ACTIVE', 'green');
  updateStatusBar();
});

// ── CORE DATA LOOP ────────────────────────────────────────────────────────────

async function loadAndRender() {
  // Skip live data updates while viewing historical data
  if (APP_STATE.currentView === 'historical') return;

  try {
    const aqiData = await fetchAllAQI();
    APP_STATE.aqiData   = aqiData;
    APP_STATE.lastSync  = new Date();

    // Render map nodes
    renderCityNodes(aqiData);

    // Render active nodes panel
    renderNodesPanel(aqiData);

    // Update telemetry widget
    updateTelemetry(aqiData);

    // Update status bar
    APP_STATE.errorCount = 0;
    updateStatusBar();

    // Update data source indicator
    document.getElementById('tw-src').textContent = CONFIG.AIRNOW_KEY ? 'EPA_AIRNOW' : 'EPA_MOCK';
    document.getElementById('tw-api').textContent = CONFIG.AIRNOW_KEY ? 'LIVE' : 'MOCK_MODE';
    document.getElementById('tw-api').className   = `tw-v ${CONFIG.AIRNOW_KEY ? 'green' : 'amber'}`;

  } catch (err) {
    console.error('[App] Data load failed:', err);
    APP_STATE.errorCount++;
    updateStatus('DATA_ERROR', 'red');
    updateStatusBar();
  }
}

// ── NODES PANEL ───────────────────────────────────────────────────────────────

function renderNodesPanel(aqiData) {
  const list = document.getElementById('nodes-list');

  // Sort cities by AQI descending
  const sorted = [...CONFIG.CITIES]
    .map(city => ({ city, data: aqiData[city.name] || { aqi: 0, pollutant: 'PM2.5', trend: [] } }))
    .sort((a, b) => b.data.aqi - a.data.aqi);

  list.innerHTML = '';

  sorted.forEach(({ city, data }, idx) => {
    const color    = getAQIColor(data.aqi);
    const category = getAQICategory(data.aqi);
    const isHigh   = data.aqi > 150;

    const card = document.createElement('div');
    card.className = 'node-card';
    card.dataset.city = city.name;
    card.style.setProperty('--node-color', color);

    // If this is the selected city, mark it
    if (APP_STATE.selectedCity?.name === city.name) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <div class="nc-header">
        <span class="nc-id">${city.id}</span>
        <span class="nc-dot ${isHigh ? 'pulsing' : ''}"></span>
      </div>
      <div class="nc-name">${city.name.toUpperCase()}</div>
      <div class="nc-bottom">
        <div class="nc-aqi-block">
          <span class="nc-aqi">${data.aqi}</span>
          <span class="nc-cat">${category}</span>
        </div>
        <div class="nc-sparkline">
          ${renderSparkline(data.trend, color)}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectCity(city, data);
    });

    list.appendChild(card);
  });

  // Update node count badge
  document.getElementById('node-count').textContent = CONFIG.CITIES.length;
}

function renderSparkline(trend, color) {
  if (!trend || trend.length < 2) return '';
  const w = 68, h = 22;
  const min = Math.min(...trend) - 5;
  const max = Math.max(...trend) + 5;
  const range = max - min || 1;

  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  </svg>`;
}

// ── TELEMETRY WIDGET ──────────────────────────────────────────────────────────

function updateTelemetry(aqiData) {
  // National average
  const values = Object.values(aqiData).map(d => d.aqi).filter(Boolean);
  const avg    = values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  document.getElementById('tw-national').textContent = `${avg} (${getAQICategory(avg)})`;
  document.getElementById('tw-national').style.color = getAQIColor(avg);

  // Last sync time
  if (APP_STATE.lastSync) {
    document.getElementById('tw-sync').textContent = formatTime(APP_STATE.lastSync);
  }

  // Node count
  document.getElementById('tw-nodes').textContent = `${CONFIG.CITIES.length} / ${CONFIG.CITIES.length}`;
}

// ── STATUS + UI UPDATES ───────────────────────────────────────────────────────

function updateStatus(label, dotClass) {
  const dot        = document.getElementById('live-dot');
  const statusLabel = document.getElementById('status-label');

  statusLabel.textContent = label;
  dot.className = `status-dot ${dotClass || ''}`;
}

function updateStatusBar() {
  document.getElementById('sb-errors').textContent = `${APP_STATE.errorCount} ERRORS`;
  document.getElementById('sb-mode').textContent   = `MODE: ${APP_STATE.mode.toUpperCase()}`;

  // Pulse dot color
  const dot = document.getElementById('sb-pulse-dot');
  dot.className = `status-dot pulsing`;
}

// ── VIEW SWITCHING ───────────────────────────────────────────────────────────

function initViewSwitching() {
  const navBtns = document.querySelectorAll('.header-nav .nav-btn');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === APP_STATE.currentView) return;

      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      APP_STATE.currentView = view;

      if (view === 'historical') {
        APP_STATE.mode = 'historical';
        enterHistoricalView();
        renderHistoricalStats();
      } else {
        APP_STATE.mode = 'live';
        exitHistoricalView();
      }
    });
  });
}

// ── CITY DETAIL PANEL ────────────────────────────────────────────────────────

async function showCityDetail(city, aqiData) {
  const panel = document.getElementById('city-detail');
  const color = getAQIColor(aqiData.aqi);
  const category = getAQICategory(aqiData.aqi);

  // Fetch weather for this city
  const weather = await fetchWeather(city);

  // Populate fields
  document.getElementById('cd-location').textContent = `${city.name.toUpperCase()}, ${city.state}`;
  const aqiEl = document.getElementById('cd-aqi');
  aqiEl.textContent = `${aqiData.aqi} (${category})`;
  aqiEl.style.color = color;
  document.getElementById('cd-temp').textContent = `${weather.temp}°F · ${weather.condition}`;
  document.getElementById('cd-wind').textContent = `${weather.wind.speed} MPH ${weather.wind.dir}`;
  document.getElementById('cd-humidity').textContent = `${weather.humidity}%`;

  // Clear previous response
  document.getElementById('cd-response').style.display = 'none';
  document.getElementById('cd-response-text').textContent = '';

  // Store weather for button handlers
  APP_STATE.selectedWeather = weather;

  // Show the panel
  panel.style.display = 'flex';
}

function initCityDetail() {
  // Close button
  document.getElementById('cd-close').addEventListener('click', () => {
    document.getElementById('city-detail').style.display = 'none';
    APP_STATE.selectedCity = null;
    APP_STATE.selectedCityData = null;

    // Deselect on map
    cityGroup?.selectAll('.city-node .city-circle').attr('stroke-width', 1.5);
    document.querySelectorAll('.node-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('sb-selected').textContent = 'NO_NODE_SELECTED';
  });

  // "WHY.." button — asks Gemini to briefly explain the AQI level
  document.getElementById('cd-btn-why').addEventListener('click', async () => {
    const city = APP_STATE.selectedCity;
    const data = APP_STATE.selectedCityData;
    const weather = APP_STATE.selectedWeather;
    if (!city || !data) return;

    const responseEl = document.getElementById('cd-response');
    const textEl = document.getElementById('cd-response-text');
    const labelEl = document.getElementById('cd-response-label');

    labelEl.textContent = 'WHY..';
    responseEl.style.display = 'block';
    textEl.textContent = 'ANALYZING...';

    const analysis = await fetchGeminiAnalysis(city, data, weather);
    textEl.textContent = '';
    typewriteInto(textEl, analysis);
  });

  // "SOLUTION" button — asks Gemini for pollution reduction solutions
  document.getElementById('cd-btn-solution').addEventListener('click', async () => {
    const city = APP_STATE.selectedCity;
    const data = APP_STATE.selectedCityData;
    if (!city || !data) return;

    const responseEl = document.getElementById('cd-response');
    const textEl = document.getElementById('cd-response-text');
    const labelEl = document.getElementById('cd-response-label');

    labelEl.textContent = 'SOLUTION';
    responseEl.style.display = 'block';
    textEl.textContent = 'ANALYZING...';

    const answer = await fetchGeminiSolution(city, data);
    textEl.textContent = '';
    typewriteInto(textEl, answer);
  });

  // "LEARN MORE CITY" toggle
  const learnBtn = document.getElementById('learn-more-btn');
  const nodesList = document.getElementById('nodes-list');

  learnBtn.addEventListener('click', () => {
    const isOpen = nodesList.style.display !== 'none';
    nodesList.style.display = isOpen ? 'none' : 'flex';
    learnBtn.textContent = isOpen ? 'LEARN MORE CITY' : 'HIDE CITY LIST';
  });
}

function typewriteInto(el, text, delay = 15) {
  let i = 0;
  el.textContent = '';
  const cursor = document.createElement('span');
  cursor.textContent = '\u2588';
  cursor.style.cssText = 'opacity:1;animation:blink 1s infinite;color:var(--cyan-light);font-size:0.85em;';
  el.appendChild(cursor);

  const interval = setInterval(() => {
    if (i < text.length) {
      cursor.before(text.charAt(i));
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => cursor.remove(), 800);
    }
  }, delay);
}

// ── SEARCH ────────────────────────────────────────────────────────────────────

function initSearch() {
  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-btn');

  const doSearch = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    const match = CONFIG.CITIES.find(c =>
      c.name.toLowerCase().includes(query) ||
      c.state.toLowerCase() === query ||
      c.zip.startsWith(query)
    );

    if (match) {
      const data = APP_STATE.aqiData[match.name] || { aqi: 0, pollutant: 'PM2.5', trend: [] };
      selectCity(match, data);
      input.value = '';
    } else {
      input.style.borderColor = 'var(--red)';
      setTimeout(() => (input.style.borderColor = ''), 1200);
    }
  };

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}
