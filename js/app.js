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
