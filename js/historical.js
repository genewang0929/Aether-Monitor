/* ═══════════════════════════════════════════════
   AETHER MONITOR — Historical View Controller
   Displays cached Phoenix data with 30-day slider.
   ═══════════════════════════════════════════════ */

let historicalActive = false;
let historicalIndex = 0;

// ── VIEW ACTIVATION ──────────────────────────────────────────────────────────

function enterHistoricalView() {
  if (historicalActive) return;
  historicalActive = true;

  document.body.classList.add('view-historical');

  // Show historical panel, hide nodes panel
  document.getElementById('historical-panel').style.display = 'flex';
  document.querySelector('.nodes-panel').style.display = 'none';

  // Show timeline bar
  document.querySelector('.timeline-bar').style.display = 'flex';

  // Setup slider
  const slider = document.getElementById('timeline-slider');
  const maxIdx = HISTORICAL_PHOENIX.length - 1;
  slider.min = 0;
  slider.max = maxIdx;
  slider.value = maxIdx;
  historicalIndex = maxIdx;

  // Update edge labels
  const first = new Date(HISTORICAL_PHOENIX[0].timestamp);
  const last = new Date(HISTORICAL_PHOENIX[maxIdx].timestamp);
  document.getElementById('tl-left').textContent = formatShortDate(first);
  document.getElementById('tl-right').textContent = 'NOW';

  // Render chart
  renderHistoricalChart();

  // Show current data point
  updateHistoricalDisplay(maxIdx);

  // Zoom map to Phoenix
  const phoenix = CONFIG.CITIES.find(c => c.name === 'Phoenix');
  if (phoenix) flyToPoint(phoenix.lon, phoenix.lat);

  // Update status bar
  document.getElementById('sb-mode').textContent = 'MODE: HISTORICAL';

  // Render Phoenix-only node on map
  renderHistoricalMapState(maxIdx);
}

function exitHistoricalView() {
  if (!historicalActive) return;
  historicalActive = false;

  document.body.classList.remove('view-historical');

  // Hide historical panel, show nodes panel
  document.getElementById('historical-panel').style.display = 'none';
  document.querySelector('.nodes-panel').style.display = 'flex';

  // Hide timeline bar
  document.querySelector('.timeline-bar').style.display = 'none';

  // Stop drums
  drumStop();

  // Reset map: zoom out and re-render all city nodes
  if (mapSvg) {
    mapSvg.transition()
      .duration(800)
      .call(mapZoom.transform, d3.zoomIdentity);
  }

  if (window.APP_STATE?.aqiData) {
    renderCityNodes(window.APP_STATE.aqiData);
  }

  // Update status bar
  document.getElementById('sb-mode').textContent = 'MODE: LIVE';
}

// ── SLIDER HANDLER ───────────────────────────────────────────────────────────

function initHistoricalSlider() {
  const slider = document.getElementById('timeline-slider');
  let dragging = false;

  // 'input' fires on every tick while dragging — start drums here too
  // (more reliable than mousedown on range inputs across browsers)
  slider.addEventListener('input', () => {
    if (!historicalActive) return;
    const idx = parseInt(slider.value, 10);
    historicalIndex = idx;
    updateHistoricalDisplay(idx);
    updateChartMarker(idx);
    renderHistoricalMapState(idx);

    const aqi = HISTORICAL_PHOENIX[idx]?.aqi || 0;

    if (!dragging) {
      dragging = true;
      drumStart(aqi);
    } else {
      drumUpdateAQI(aqi);
    }
  });

  // 'change' fires once when the user releases the slider
  slider.addEventListener('change', () => {
    dragging = false;
    drumStop();
  });

  // Safety: also stop on pointer/mouse/touch up on window
  // (covers edge cases like dragging off the slider)
  const stopDrag = () => {
    if (dragging) {
      dragging = false;
      drumStop();
    }
  };
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
}

// ── DATA DISPLAY ─────────────────────────────────────────────────────────────

function updateHistoricalDisplay(idx) {
  const d = HISTORICAL_PHOENIX[idx];
  if (!d) return;

  const date = new Date(d.timestamp);
  const color = getAQIColor(d.aqi);
  const category = getAQICategory(d.aqi);

  // Date/time in timeline bar
  document.getElementById('tl-datetime').textContent = formatDateTime(date);

  // Historical panel fields
  document.getElementById('hist-date').textContent = formatDateTime(date);
  document.getElementById('hist-date').style.color = 'var(--cyan-light)';

  const aqiEl = document.getElementById('hist-aqi');
  aqiEl.textContent = d.aqi;
  aqiEl.style.color = color;

  const catEl = document.getElementById('hist-cat');
  catEl.textContent = category;
  catEl.style.color = color;

  document.getElementById('hist-pollutant').textContent = d.pollutant;
  document.getElementById('hist-pollutant').style.color = color;
  document.getElementById('hist-temp').textContent = `${d.temp}°F`;
  document.getElementById('hist-humidity').textContent = `${d.humidity}%`;
  document.getElementById('hist-wind').textContent = `${d.wind.speed} MPH ${d.wind.dir}`;
  document.getElementById('hist-condition').textContent = d.condition.toUpperCase();

  // Condition color
  const condEl = document.getElementById('hist-condition');
  if (d.condition === 'Dust Storm') condEl.style.color = 'var(--orange)';
  else if (d.condition === 'Hazy') condEl.style.color = 'var(--amber)';
  else condEl.style.color = 'var(--cyan-light)';
}

// ── MAP STATE ────────────────────────────────────────────────────────────────

function renderHistoricalMapState(idx) {
  const d = HISTORICAL_PHOENIX[idx];
  if (!d || !cityGroup) return;

  const phoenix = CONFIG.CITIES.find(c => c.name === 'Phoenix');
  if (!phoenix) return;

  const color = getAQIColor(d.aqi);
  const fakeAqiData = {};
  CONFIG.CITIES.forEach(c => {
    if (c.name === 'Phoenix') {
      fakeAqiData[c.name] = { aqi: d.aqi, pollutant: d.pollutant, trend: [], timestamp: new Date(d.timestamp) };
    } else {
      // Dim other cities in historical mode
      fakeAqiData[c.name] = { aqi: 0, pollutant: '--', trend: [], timestamp: null };
    }
  });
  renderCityNodes(fakeAqiData);
}

// ── 30-DAY AQI CHART ────────────────────────────────────────────────────────

function renderHistoricalChart() {
  const container = document.getElementById('hist-chart');
  container.innerHTML = '';

  const data = HISTORICAL_PHOENIX;
  const w = 230, h = 80;
  const padL = 0, padR = 0, padT = 4, padB = 14;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const minAQI = Math.min(...data.map(d => d.aqi));
  const maxAQI = Math.max(...data.map(d => d.aqi));
  const range = maxAQI - minAQI || 1;

  // Build SVG path
  const pts = data.map((d, i) => {
    const x = padL + (i / (data.length - 1)) * plotW;
    const y = padT + plotH - ((d.aqi - minAQI) / range) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Area fill path
  const areaPath = `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(' ') +
    ` L${(padL + plotW).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL},${(padT + plotH).toFixed(1)} Z`;

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;width:100%;">
    <defs>
      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--amber)" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="var(--amber)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#chart-grad)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round" opacity="0.8"/>
    <line id="chart-marker" x1="${padL + plotW}" y1="${padT}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="var(--cyan-light)" stroke-width="1" opacity="0.7" stroke-dasharray="2,2"/>
    <circle id="chart-dot" cx="${padL + plotW}" cy="${padT}" r="3" fill="var(--cyan-light)" opacity="0.9"/>
    <!-- Axis labels -->
    <text x="${padL}" y="${h}" fill="var(--text-secondary)" font-family="'Space Mono', monospace" font-size="7" letter-spacing="0.5">${formatShortDate(new Date(data[0].timestamp))}</text>
    <text x="${w}" y="${h}" fill="var(--text-secondary)" font-family="'Space Mono', monospace" font-size="7" letter-spacing="0.5" text-anchor="end">NOW</text>
  </svg>`;

  container.innerHTML = svg;
}

function updateChartMarker(idx) {
  const data = HISTORICAL_PHOENIX;
  const container = document.getElementById('hist-chart');
  const svg = container.querySelector('svg');
  if (!svg) return;

  const w = 230, padL = 0, padR = 0, padT = 4, padB = 14;
  const plotW = w - padL - padR;
  const plotH = (80 - padT - padB);

  const minAQI = Math.min(...data.map(d => d.aqi));
  const maxAQI = Math.max(...data.map(d => d.aqi));
  const range = maxAQI - minAQI || 1;

  const x = padL + (idx / (data.length - 1)) * plotW;
  const y = padT + plotH - ((data[idx].aqi - minAQI) / range) * plotH;

  const marker = svg.getElementById('chart-marker');
  const dot = svg.getElementById('chart-dot');
  if (marker) { marker.setAttribute('x1', x); marker.setAttribute('x2', x); }
  if (dot) { dot.setAttribute('cx', x); dot.setAttribute('cy', y); }
}

// ── SUMMARY STATS ────────────────────────────────────────────────────────────

function renderHistoricalStats() {
  const data = HISTORICAL_PHOENIX;
  const aqis = data.map(d => d.aqi);
  const avg = Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length);
  const min = Math.min(...aqis);
  const max = Math.max(...aqis);
  const dustDays = new Set(
    data.filter(d => d.condition === 'Dust Storm').map(d => new Date(d.timestamp).toDateString())
  ).size;

  document.getElementById('hist-avg').textContent = avg;
  document.getElementById('hist-avg').style.color = getAQIColor(avg);
  document.getElementById('hist-min').textContent = min;
  document.getElementById('hist-min').style.color = getAQIColor(min);
  document.getElementById('hist-max').textContent = max;
  document.getElementById('hist-max').style.color = getAQIColor(max);
  document.getElementById('hist-dust-days').textContent = dustDays;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

// ── INIT (called once on page load) ──────────────────────────────────────────

function initHistorical() {
  initHistoricalSlider();
}
