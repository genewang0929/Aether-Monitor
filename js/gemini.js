/* ═══════════════════════════════════════════════
   AETHER MONITOR — Gemini AI Analysis Panel
   ═══════════════════════════════════════════════ */

let geminiPanelOpen = false;

// ── PANEL TOGGLE ─────────────────────────────────────────────────────────────

function initGeminiPanel() {
  const panel = document.getElementById('gemini-panel');
  const toggleBtn = document.getElementById('cp-collapse-btn');
  const header = document.querySelector('.cp-header');
  const askBtn = document.getElementById('gemini-ask-btn');
  const input = document.getElementById('gemini-input');

  // Toggle on header click
  header.addEventListener('click', (e) => {
    // Don't collapse when clicking input or button
    if (e.target.closest('#gemini-input') || e.target.closest('#gemini-ask-btn')) return;
    togglePanel();
  });

  // Query button
  askBtn.addEventListener('click', () => handleQuery());

  // Enter key in input
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleQuery();
  });
}

function togglePanel(forceOpen) {
  const panel = document.getElementById('gemini-panel');
  const layout = document.querySelector('.main-layout');

  if (forceOpen !== undefined) {
    geminiPanelOpen = forceOpen;
  } else {
    geminiPanelOpen = !geminiPanelOpen;
  }

  if (geminiPanelOpen) {
    panel.classList.add('open');
    layout.classList.add('gemini-open');
  } else {
    panel.classList.remove('open');
    layout.classList.remove('gemini-open');
  }
}

// ── ANALYSIS TRIGGER ─────────────────────────────────────────────────────────

async function triggerAnalysis(city, aqiData) {
  // Open panel if collapsed
  if (!geminiPanelOpen) togglePanel(true);

  // Show city bar
  const cityBar = document.getElementById('cp-city-bar');
  cityBar.style.display = 'flex';
  document.getElementById('ccb-name').textContent = city.name.toUpperCase();
  document.getElementById('ccb-aqi').textContent = `AQI ${aqiData.aqi}`;
  document.getElementById('ccb-aqi').style.color = getAQIColor(aqiData.aqi);
  document.getElementById('ccb-cat').textContent = getAQICategory(aqiData.aqi);

  // Show loading (weather info will update after fetch)
  document.getElementById('ccb-weather').textContent = 'LOADING...';
  showLoading();

  try {
    // Fetch weather (works for both predefined cities and ad-hoc locations via lat/lon)
    const weatherData = await fetchWeather(city);

    // Update weather in city bar with fetched data
    if (weatherData.wind) {
      document.getElementById('ccb-weather').textContent =
        `${weatherData.temp}°F · ${weatherData.wind.speed}mph ${weatherData.wind.dir} · ${weatherData.humidity}% RH`;
    }

    // Fetch Gemini analysis
    const analysis = await fetchGeminiAnalysis(city, aqiData, weatherData);

    showResponse(analysis);
  } catch (err) {
    showResponse('Analysis temporarily unavailable. Please try again.');
    console.error('[Gemini Panel]', err);
  }
}

async function handleQuery() {
  const input = document.getElementById('gemini-input');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';

  if (!geminiPanelOpen) togglePanel(true);

  // Clear city bar for free-form query
  const cityBar = document.getElementById('cp-city-bar');
  cityBar.style.display = 'none';

  showLoading();

  try {
    const response = await fetchGeminiQuery(question, window.APP_STATE?.aqiData || {});
    showResponse(response);
  } catch (err) {
    showResponse('Query failed. Please check your API key or try again.');
  }
}

// ── RESPONSE DISPLAY ─────────────────────────────────────────────────────────

function showLoading() {
  document.getElementById('cp-loading').style.display = 'flex';
  document.getElementById('cp-response').innerHTML = '';
}

function showResponse(text) {
  document.getElementById('cp-loading').style.display = 'none';

  const responseEl = document.getElementById('cp-response');
  responseEl.innerHTML = '';

  // Typewriter effect
  typewrite(responseEl, text, 18);
}

function typewrite(el, text, delay = 15) {
  let i = 0;
  el.textContent = '';

  const cursor = document.createElement('span');
  cursor.textContent = '█';
  cursor.style.cssText = 'opacity:1;animation:blink 1s infinite;color:var(--cyan-light);font-size:0.85em;';
  el.appendChild(cursor);

  const interval = setInterval(() => {
    if (i < text.length) {
      cursor.before(text.charAt(i));
      i++;
    } else {
      clearInterval(interval);
      // Remove cursor after done
      setTimeout(() => cursor.remove(), 800);
    }
  }, delay);
}

// ── NATIONAL SUMMARY (on load) ────────────────────────────────────────────────

async function showNationalSummary(aqiData) {
  if (!geminiPanelOpen) return;  // Only show if panel is open

  const cities = CONFIG.CITIES;
  const values = cities.map(c => (aqiData[c.name]?.aqi || 50));
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const worst = cities.reduce((best, c) =>
    (aqiData[c.name]?.aqi || 0) > (aqiData[best.name]?.aqi || 0) ? c : best
  );

  const document_id = document.getElementById('cp-city-bar');
  document_id.style.display = 'none';

  showLoading();

  await sleep(600);

  const summary = CONFIG.GEMINI_KEY
    ? await fetchGeminiQuery(
      `Give me a brief national air quality summary. National average AQI today is ${avg}.`,
      aqiData
    )
    : `National average AQI is currently ${avg} (${getAQICategory(avg)}), with ${worst.name} recording the highest reading at ${aqiData[worst.name]?.aqi || '--'}. ${avg > 100 ? 'Multiple cities are exceeding healthy thresholds — sensitive populations should reduce prolonged outdoor activity.' : 'Most US cities are within acceptable air quality ranges today.'} Select any city node on the map for a detailed atmospheric analysis.`;

  showResponse(summary);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
