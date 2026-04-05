/* ═══════════════════════════════════════════════
   AETHER MONITOR — Historical View Controller
   Displays cached Phoenix data with 30-day slider.
   ═══════════════════════════════════════════════ */

let historicalActive = false;
let historicalDashboard = false;
let historicalIndex = 0;
let autoplayTimer = null;
let autoplayPlaying = false;

// ── VIEW ACTIVATION ──────────────────────────────────────────────────────────

// Step 1: Show dashboard landing screen
function enterHistoricalView() {
  historicalDashboard = true;

  document.getElementById('city-detail').style.display = 'none';
  document.getElementById('city-detail').style.display = 'none';
  document.getElementById('hist-dashboard').style.display = 'flex';

  document.getElementById('sb-mode').textContent = 'MODE: HISTORICAL';
}

// Step 2: Launch a specific city demo (called from dashboard card click)
function launchPhoenixDemo() {
  if (historicalActive) return;
  historicalActive = true;
  historicalDashboard = false;

  // Hide dashboard, show historical panel
  document.getElementById('hist-dashboard').style.display = 'none';
  document.getElementById('historical-panel').style.display = 'flex';
  document.body.classList.add('view-historical');

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
  document.getElementById('tl-left').textContent = formatShortDate(first);
  document.getElementById('tl-right').textContent = 'NOW';

  // Render chart
  renderHistoricalChart();

  // Show current data point
  updateHistoricalDisplay(maxIdx);

  // Zoom map to Phoenix
  const phoenix = CONFIG.CITIES.find(c => c.name === 'Phoenix');
  if (phoenix) flyToPoint(phoenix.lon, phoenix.lat);

  // Render Phoenix-only node on map
  renderHistoricalMapState(maxIdx);
}

function exitHistoricalView() {
  historicalActive = false;
  historicalDashboard = false;

  document.body.classList.remove('view-historical');

  // Hide everything historical
  document.getElementById('hist-dashboard').style.display = 'none';
  document.getElementById('historical-panel').style.display = 'none';
  document.getElementById('hist-bubble').style.display = 'none';
  document.getElementById('hist-bubble').style.display = 'none';

  // Hide timeline bar
  document.querySelector('.timeline-bar').style.display = 'none';

  // Stop autoplay + drums
  autoplayPause();

  // Reset map: zoom out and re-render all city nodes
  resetMapView();

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
    // Hide bubble when scrubbing
    document.getElementById('hist-bubble').style.display = 'none';

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

  // Play/Pause button
  document.getElementById('tl-play-btn').addEventListener('click', () => {
    if (autoplayPlaying) {
      autoplayPause();
    } else {
      autoplayStart();
    }
  });
}

// ── AUTOPLAY ─────────────────────────────────────────────────────────────────

function updateDancer(aqi) {
  const dancer = document.getElementById('dancer');
  const face = document.getElementById('dancer-face');

  if (aqi <= 50) {
    dancer.style.setProperty('--dance-speed', '1.2s');
    face.textContent = '😄';
  } else if (aqi <= 80) {
    dancer.style.setProperty('--dance-speed', '0.9s');
    face.textContent = '🙂';
  } else if (aqi <= 110) {
    dancer.style.setProperty('--dance-speed', '0.6s');
    face.textContent = '😐';
  } else if (aqi <= 140) {
    dancer.style.setProperty('--dance-speed', '0.4s');
    face.textContent = '😰';
  } else {
    dancer.style.setProperty('--dance-speed', '0.25s');
    face.textContent = '😵';
  }
}

function autoplayStart() {
  if (!historicalActive) return;
  autoplayPlaying = true;
  document.getElementById('tl-play-btn').textContent = '⏸';
  document.getElementById('dancer').style.display = 'block';

  const slider = document.getElementById('timeline-slider');
  const maxIdx = HISTORICAL_PHOENIX.length - 1;

  // If at the end, restart from beginning
  if (historicalIndex >= maxIdx) {
    historicalIndex = 0;
    slider.value = 0;
  }

  // Start drums + dancer
  const aqi = HISTORICAL_PHOENIX[historicalIndex]?.aqi || 0;
  drumStart(aqi);
  updateDancer(aqi);

  // Advance one step every 150ms
  autoplayTimer = setInterval(() => {
    if (historicalIndex >= maxIdx) {
      autoplayPause();
      return;
    }

    historicalIndex++;
    slider.value = historicalIndex;

    updateHistoricalDisplay(historicalIndex);
    updateChartMarker(historicalIndex);
    renderHistoricalMapState(historicalIndex);

    const aqi = HISTORICAL_PHOENIX[historicalIndex]?.aqi || 0;
    drumUpdateAQI(aqi);
    updateDancer(aqi);
  }, 150);
}

function autoplayPause() {
  autoplayPlaying = false;
  document.getElementById('tl-play-btn').textContent = '▶';
  document.getElementById('dancer').style.display = 'none';
  drumStop();
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
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
  if (!d) return;

  const phoenix = CONFIG.CITIES.find(c => c.name === 'Phoenix');
  if (!phoenix) return;

  // Only show Phoenix — hide all other cities
  const phoenixOnly = {};
  phoenixOnly['Phoenix'] = { aqi: d.aqi, pollutant: d.pollutant, trend: [], timestamp: new Date(d.timestamp) };
  renderCityNodesFiltered(phoenixOnly);
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

  // Dashboard card click → launch Phoenix demo
  document.getElementById('hd-phoenix').addEventListener('click', () => {
    launchPhoenixDemo();
  });

  // Close bubble
  document.getElementById('hist-bubble-close').addEventListener('click', () => {
    document.getElementById('hist-bubble').style.display = 'none';
  });

  // "What happened?" button → speech bubble on map
  document.getElementById('hist-why-btn').addEventListener('click', async () => {
    const d = HISTORICAL_PHOENIX[historicalIndex];
    if (!d) return;

    const bubble = document.getElementById('hist-bubble');
    const textEl = document.getElementById('hist-bubble-text');
    bubble.style.display = 'block';
    textEl.textContent = 'Analyzing...';

    const phoenix = CONFIG.CITIES.find(c => c.name === 'Phoenix');
    const aqiData = { aqi: d.aqi, pollutant: d.pollutant, trend: [] };
    const weatherData = { temp: d.temp, humidity: d.humidity, wind: d.wind, condition: d.condition };

    const analysis = await fetchGeminiAnalysis(phoenix, aqiData, weatherData);

    // Trim to 4 sentences max
    const sentences = analysis.match(/[^.!?]+[.!?]+/g) || [analysis];
    const short = sentences.slice(0, 4).join(' ').trim();

    textEl.textContent = '';
    typewriteInto(textEl, short);
  });
}
