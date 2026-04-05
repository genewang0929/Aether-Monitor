/* ═══════════════════════════════════════════════
   AETHER MONITOR — Data / API Layer
   Falls back to realistic mock data when no API
   keys are configured.
   ═══════════════════════════════════════════════ */

// ── MOCK AQI DATA ─────────────────────────────────────────────────────────────
// 7-day trend arrays (oldest → newest). Values designed for visual drama.
const MOCK_AQI = {
  'Los Angeles': { aqi: 142, pollutant: 'PM2.5', trend: [148, 151, 145, 150, 147, 140, 142] },
  'San Francisco': { aqi: 38, pollutant: 'O3', trend: [42, 39, 35, 38, 41, 37, 38] },
  'Phoenix': { aqi: 118, pollutant: 'PM10', trend: [105, 112, 120, 118, 115, 119, 118] },
  'Las Vegas': { aqi: 87, pollutant: 'PM2.5', trend: [82, 85, 90, 88, 85, 88, 87] },
  'Seattle': { aqi: 28, pollutant: 'O3', trend: [31, 29, 25, 27, 30, 28, 28] },
  'Portland': { aqi: 55, pollutant: 'PM2.5', trend: [48, 52, 58, 56, 53, 56, 55] },
  'Denver': { aqi: 74, pollutant: 'O3', trend: [70, 72, 78, 76, 74, 73, 74] },
  'Salt Lake City': { aqi: 131, pollutant: 'PM2.5', trend: [120, 125, 135, 132, 129, 132, 131] },
  'Dallas': { aqi: 68, pollutant: 'O3', trend: [65, 68, 72, 70, 67, 69, 68] },
  'Houston': { aqi: 95, pollutant: 'PM2.5', trend: [90, 93, 99, 96, 93, 96, 95] },
  'Austin': { aqi: 62, pollutant: 'O3', trend: [58, 61, 66, 63, 60, 63, 62] },
  'New Orleans': { aqi: 51, pollutant: 'PM2.5', trend: [48, 50, 54, 52, 50, 52, 51] },
  'Chicago': { aqi: 73, pollutant: 'O3', trend: [69, 71, 77, 74, 72, 74, 73] },
  'Detroit': { aqi: 89, pollutant: 'PM2.5', trend: [84, 87, 93, 90, 87, 90, 89] },
  'Cleveland': { aqi: 82, pollutant: 'PM2.5', trend: [78, 80, 86, 83, 80, 83, 82] },
  'Pittsburgh': { aqi: 108, pollutant: 'PM2.5', trend: [100, 104, 113, 110, 107, 109, 108] },
  'New York': { aqi: 91, pollutant: 'PM2.5', trend: [86, 89, 96, 92, 89, 92, 91] },
  'Philadelphia': { aqi: 79, pollutant: 'O3', trend: [74, 77, 83, 80, 77, 80, 79] },
  'Boston': { aqi: 44, pollutant: 'O3', trend: [41, 43, 47, 45, 43, 44, 44] },
  'Miami': { aqi: 35, pollutant: 'O3', trend: [33, 34, 37, 36, 34, 35, 35] },
  'Atlanta': { aqi: 67, pollutant: 'O3', trend: [63, 65, 71, 68, 65, 68, 67] },
  'Charlotte': { aqi: 56, pollutant: 'O3', trend: [52, 54, 59, 57, 54, 56, 56] },
  'Washington DC': { aqi: 83, pollutant: 'PM2.5', trend: [78, 81, 88, 84, 81, 84, 83] },
  'Baltimore': { aqi: 97, pollutant: 'PM2.5', trend: [92, 95, 101, 98, 95, 98, 97] },
};

// ── MOCK WEATHER DATA ─────────────────────────────────────────────────────────
const MOCK_WEATHER = {
  'Los Angeles': { temp: 82, humidity: 32, wind: { speed: 5, dir: 'NW' }, condition: 'Sunny' },
  'San Francisco': { temp: 62, humidity: 71, wind: { speed: 12, dir: 'W' }, condition: 'Partly Cloudy' },
  'Phoenix': { temp: 98, humidity: 18, wind: { speed: 18, dir: 'SW' }, condition: 'Sunny' },
  'Las Vegas': { temp: 91, humidity: 22, wind: { speed: 8, dir: 'S' }, condition: 'Sunny' },
  'Seattle': { temp: 58, humidity: 78, wind: { speed: 7, dir: 'SW' }, condition: 'Cloudy' },
  'Portland': { temp: 61, humidity: 68, wind: { speed: 6, dir: 'W' }, condition: 'Partly Cloudy' },
  'Denver': { temp: 72, humidity: 35, wind: { speed: 10, dir: 'W' }, condition: 'Sunny' },
  'Salt Lake City': { temp: 68, humidity: 28, wind: { speed: 4, dir: 'NE' }, condition: 'Sunny' },
  'Dallas': { temp: 88, humidity: 55, wind: { speed: 9, dir: 'S' }, condition: 'Partly Cloudy' },
  'Houston': { temp: 90, humidity: 72, wind: { speed: 8, dir: 'SE' }, condition: 'Humid' },
  'Austin': { temp: 86, humidity: 52, wind: { speed: 7, dir: 'S' }, condition: 'Sunny' },
  'New Orleans': { temp: 84, humidity: 78, wind: { speed: 6, dir: 'SE' }, condition: 'Partly Cloudy' },
  'Chicago': { temp: 71, humidity: 58, wind: { speed: 14, dir: 'NE' }, condition: 'Partly Cloudy' },
  'Detroit': { temp: 68, humidity: 62, wind: { speed: 8, dir: 'SW' }, condition: 'Cloudy' },
  'Cleveland': { temp: 65, humidity: 65, wind: { speed: 10, dir: 'NW' }, condition: 'Cloudy' },
  'Pittsburgh': { temp: 67, humidity: 60, wind: { speed: 5, dir: 'SW' }, condition: 'Overcast' },
  'New York': { temp: 72, humidity: 62, wind: { speed: 9, dir: 'SW' }, condition: 'Partly Cloudy' },
  'Philadelphia': { temp: 74, humidity: 60, wind: { speed: 7, dir: 'SW' }, condition: 'Partly Cloudy' },
  'Boston': { temp: 65, humidity: 68, wind: { speed: 12, dir: 'NE' }, condition: 'Partly Cloudy' },
  'Miami': { temp: 84, humidity: 80, wind: { speed: 11, dir: 'SE' }, condition: 'Partly Cloudy' },
  'Atlanta': { temp: 79, humidity: 58, wind: { speed: 6, dir: 'SW' }, condition: 'Partly Cloudy' },
  'Charlotte': { temp: 77, humidity: 55, wind: { speed: 5, dir: 'SW' }, condition: 'Partly Cloudy' },
  'Washington DC': { temp: 76, humidity: 62, wind: { speed: 8, dir: 'SW' }, condition: 'Partly Cloudy' },
  'Baltimore': { temp: 74, humidity: 63, wind: { speed: 7, dir: 'SW' }, condition: 'Partly Cloudy' },
};

// ── MOCK GEMINI ANALYSIS TEXT ─────────────────────────────────────────────────
const MOCK_ANALYSIS = {
  'Los Angeles': 'A persistent nocturnal temperature inversion is trapping vehicle exhaust and secondary PM2.5 in the Los Angeles Basin, holding AQI at 142 — above the USG threshold. Santa Ana wind patterns are forecast to reverse within 48 hours, which should flush the basin and drive AQI to Moderate levels.',
  'Phoenix': 'Southwest winds at 18 mph are advecting coarse PM10 dust from Sonoran Desert soils and active construction zones northwest of the city, pushing AQI to 118. Ongoing drought conditions (soil moisture at 8% of normal) limit natural dust suppression; expect gradual improvement after an approaching Pacific low brings moisture.',
  'Salt Lake City': 'A three-day blocking high has established a strong temperature inversion over the Salt Lake Valley, trapping vehicle and industrial PM2.5 below 5,000 ft elevation — AQI has risen to 131 on consecutive windless nights. A frontal passage is forecast in 2–3 days; until then, populations with respiratory conditions should minimize outdoor activity.',
  'Pittsburgh': 'Stable southwest flow at 5 mph is allowing PM2.5 from the Mon Valley industrial corridor to accumulate over the urban core, driving AQI to 108. Overnight boundary layer stabilization typically pushes AQI 15–20 points higher before morning mixing improves conditions after 10 AM.',
  'Houston': 'Secondary PM2.5 and photochemical ozone from the Ship Channel petrochemical complex are being recycled over the urban core by onshore sea-breeze circulation, holding AQI at 95. High pressure will maintain these conditions through the weekend; a cold front passage is needed to flush the air mass.',
  'New York': 'A stagnant high-pressure system over the Northeast, combined with heavy vehicle and building emissions across the metro area, has elevated PM2.5 to an AQI of 91. Southwest transport is also delivering background ozone from the Ohio Valley. Conditions should improve as a cold front arrives in 24–36 hours.',
  'Detroit': 'Stable southwest flow is transporting industrial PM2.5 from the Great Lakes steel and auto manufacturing corridor into Detroit, holding AQI at 89. Overnight cooling will allow ground-level concentrations to rise slightly before daytime mixing improves dispersion.',
  'Baltimore': 'Regional background PM2.5 from Mid-Atlantic industrial sources, combined with local vehicle emissions under high-pressure stagnation, is pushing Baltimore\'s AQI to 97. A coastal low developing to the south may bring onshore flow that temporarily worsens conditions before a cold front clears the air.',
  'Chicago': 'Lake Michigan\'s daytime sea breeze is channeling ozone precursors from the southwest industrial belt into the urban core, holding AQI at 73. Afternoon vertical mixing should reduce surface concentrations, though the nocturnal boundary layer may allow a modest AQI rise after sunset.',
};

function getMockAnalysis(city, aqi, pollutant) {
  if (MOCK_ANALYSIS[city.name]) return MOCK_ANALYSIS[city.name];
  const weather = MOCK_WEATHER[city.name] || { wind: { speed: 8, dir: 'SW' } };
  return `${pollutant} is the dominant pollutant driving ${city.name}'s AQI to ${aqi} under current high-pressure conditions. Wind at ${weather.wind.speed} mph from the ${weather.wind.dir} is providing limited mixing. Conditions are expected to remain stable over the next 24 hours; consult local air quality advisories for health guidance.`;
}

// ── US AQI CALCULATION FROM RAW CONCENTRATIONS ───────────────────────────────
// EPA breakpoints: [C_lo, C_hi, AQI_lo, AQI_hi]

const AQI_BREAKPOINTS = {
  pm2_5: [
    [0.0,   12.0,  0,   50],
    [12.1,  35.4,  51,  100],
    [35.5,  55.4,  101, 150],
    [55.5,  150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ],
  pm10: [
    [0,   54,   0,   50],
    [55,  154,  51,  100],
    [155, 254,  101, 150],
    [255, 354,  151, 200],
    [355, 424,  201, 300],
    [425, 504,  301, 400],
    [505, 604,  401, 500],
  ],
  o3_ppb: [  // OWM gives µg/m³ → divide by 1.96 for ppb
    [0,   54,   0,   50],
    [55,  70,   51,  100],
    [71,  85,   101, 150],
    [86,  105,  151, 200],
    [106, 200,  201, 300],
  ],
  no2_ppb: [ // OWM gives µg/m³ → divide by 1.88 for ppb
    [0,    53,   0,   50],
    [54,   100,  51,  100],
    [101,  360,  101, 150],
    [361,  649,  151, 200],
    [650,  1249, 201, 300],
    [1250, 1649, 301, 400],
    [1650, 2049, 401, 500],
  ],
  so2_ppb: [ // OWM gives µg/m³ → divide by 2.62 for ppb
    [0,   35,   0,   50],
    [36,  75,   51,  100],
    [76,  185,  101, 150],
    [186, 304,  151, 200],
    [305, 604,  201, 300],
    [605, 804,  301, 400],
    [805, 1004, 401, 500],
  ],
  co_ppm: [  // OWM gives µg/m³ → divide by 1145 for ppm
    [0.0,  4.4,  0,   50],
    [4.5,  9.4,  51,  100],
    [9.5,  12.4, 101, 150],
    [12.5, 15.4, 151, 200],
    [15.5, 30.4, 201, 300],
    [30.5, 40.4, 301, 400],
    [40.5, 50.4, 401, 500],
  ],
};

function calcSubIndex(C, breakpoints) {
  for (const [Clo, Chi, Ilo, Ihi] of breakpoints) {
    if (C >= Clo && C <= Chi) {
      return Math.round(((Ihi - Ilo) / (Chi - Clo)) * (C - Clo) + Ilo);
    }
  }
  return C > breakpoints.at(-1)[1] ? 500 : 0;
}

// Returns { aqi, name } for the dominant pollutant
function componentsToUSAQI(comp) {
  const candidates = [
    { name: 'PM2.5', aqi: calcSubIndex(Math.trunc(comp.pm2_5 * 10) / 10,        AQI_BREAKPOINTS.pm2_5) },
    { name: 'PM10',  aqi: calcSubIndex(Math.trunc(comp.pm10),                    AQI_BREAKPOINTS.pm10) },
    { name: 'O3',    aqi: calcSubIndex(Math.trunc(comp.o3 / 1.96),               AQI_BREAKPOINTS.o3_ppb) },
    { name: 'NO2',   aqi: calcSubIndex(Math.trunc(comp.no2 / 1.88),              AQI_BREAKPOINTS.no2_ppb) },
    { name: 'SO2',   aqi: calcSubIndex(Math.trunc(comp.so2 / 2.62),              AQI_BREAKPOINTS.so2_ppb) },
    { name: 'CO',    aqi: calcSubIndex(Math.trunc((comp.co / 1145) * 10) / 10,   AQI_BREAKPOINTS.co_ppm) },
  ];
  return candidates.reduce((best, c) => (c.aqi > best.aqi ? c : best));
}

// ── LIVE API FUNCTIONS (OpenWeatherMap Air Pollution) ─────────────────────────

async function fetchCityAQI(city) {
  if (!CONFIG.OPENWEATHER_KEY) {
    const mock = MOCK_AQI[city.name] || { aqi: 55, pollutant: 'PM2.5', trend: [55, 55, 55, 55, 55, 55, 55] };
    return { ...mock, timestamp: new Date() };
  }

  try {
    const now          = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - 7 * 24 * 3600;
    const base         = `lat=${city.lat}&lon=${city.lon}&appid=${CONFIG.OPENWEATHER_KEY}`;

    const [currentResp, histResp] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution?${base}`),
      fetch(`https://api.openweathermap.org/data/2.5/air_pollution/history?${base}&start=${sevenDaysAgo}&end=${now}`),
    ]);

    if (!currentResp.ok) throw new Error(`HTTP ${currentResp.status}`);
    const currentData = await currentResp.json();
    const { name: pollutant, aqi } = componentsToUSAQI(currentData.list[0].components);

    // Build 7-day daily-average trend from historical data
    let trend = [];
    if (histResp.ok) {
      const histData = await histResp.json();
      const byDay = {};
      histData.list.forEach(entry => {
        const day = new Date(entry.dt * 1000).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(componentsToUSAQI(entry.components).aqi);
      });
      trend = Object.values(byDay)
        .slice(-7)
        .map(dayAqis => Math.round(dayAqis.reduce((a, b) => a + b, 0) / dayAqis.length));
    }

    return { aqi, pollutant, trend, timestamp: new Date() };
  } catch (err) {
    console.warn(`[OWM] Failed for ${city.name}:`, err.message);
    const mock = MOCK_AQI[city.name] || { aqi: 55, pollutant: 'PM2.5', trend: [] };
    return { ...mock, timestamp: new Date() };
  }
}

async function fetchWeather(city) {
  if (!CONFIG.OPENWEATHER_KEY) {
    return MOCK_WEATHER[city.name] || { temp: 70, humidity: 50, wind: { speed: 8, dir: 'SW' }, condition: 'Clear' };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${CONFIG.OPENWEATHER_KEY}&units=imperial`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      wind: {
        speed: Math.round(data.wind.speed),
        dir: windDegToDir(data.wind.deg || 0),
      },
      condition: data.weather[0]?.main || 'Unknown',
    };
  } catch (err) {
    console.warn(`[Weather] Failed for ${city.name}:`, err.message);
    return MOCK_WEATHER[city.name] || { temp: 70, humidity: 50, wind: { speed: 8, dir: 'SW' }, condition: 'Clear' };
  }
}

// Fetch AQI for an arbitrary lat/lon (click-anywhere feature)
async function fetchLocationAQI(lat, lon) {
  if (!CONFIG.OPENWEATHER_KEY) {
    return { aqi: 50, pollutant: 'PM2.5', trend: [], timestamp: new Date() };
  }

  try {
    // 1. Fetch Air Pollution
    const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_KEY}`;
    
    // 2. Fetch Location Name (Reverse Geocoding)
    const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.OPENWEATHER_KEY}`;

    const [pollRes, geoRes] = await Promise.all([
      fetch(pollutionUrl),
      fetch(geoUrl)
    ]);

    if (!pollRes.ok) throw new Error(`Pollution API Error: ${pollRes.status}`);
    
    const pollData = await pollRes.json();
    const { name: pollutant, aqi } = componentsToUSAQI(pollData.list[0].components);

    let reportingArea = null;
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        reportingArea = geoData[0].name;
        if (geoData[0].state) reportingArea += `, ${geoData[0].state}`;
      }
    }

    return { aqi, pollutant, trend: [], reportingArea, timestamp: new Date() };
  } catch (err) {
    console.warn(`[OWM] Failed for (${lat}, ${lon}):`, err.message);
    return { aqi: null, pollutant: '--', trend: [], timestamp: new Date() };
  }
}

// Fetch all cities in parallel — OWM has no restrictive rate limit on free tier
async function fetchAllAQI() {
  const entries = await Promise.all(
    CONFIG.CITIES.map(async city => [city.name, await fetchCityAQI(city)])
  );
  return Object.fromEntries(entries);
}

// ── GEMINI AI API ─────────────────────────────────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `You are Aether Monitor's atmospheric intelligence system. You analyze US air quality data and explain pollution events in clear, human-readable terms.

When given data, you:
1. Identify the PRIMARY cause of the pollution level (wildfire smoke, industrial emissions, vehicle traffic, weather inversions, agricultural burning, dust storms)
2. Explain the meteorological context (wind patterns, temperature inversions, humidity)
3. Note any relevant recent events (wildfires, industrial incidents, seasonal patterns)
4. State the health implications concisely

Response format:
- 3 sentences maximum
- Start with the cause directly, no preamble
- Use specific numbers when available
- End with one health or trend implication
- Tone: precise, like a scientist briefing a journalist`;

async function fetchGeminiAnalysis(city, aqiData, weatherData) {
  if (!CONFIG.GEMINI_KEY) {
    // Simulate a brief delay for realism
    await sleep(800 + Math.random() * 600);
    return getMockAnalysis(city, aqiData.aqi, aqiData.pollutant);
  }

  const userMessage = `City: ${city.name}, ${city.state}
Current AQI: ${aqiData.aqi} (${getAQICategory(aqiData.aqi)})
Primary pollutant: ${aqiData.pollutant}
7-day AQI trend: ${(aqiData.trend || []).join(', ') || 'unavailable'}
Temperature: ${weatherData.temp}°F
Humidity: ${weatherData.humidity}%
Wind: ${weatherData.wind.speed} mph from ${weatherData.wind.dir}
Conditions: ${weatherData.condition}
Season: ${getSeason()}
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Explain why the AQI is at this level and what to expect.`;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GEMINI_SYSTEM_PROMPT }]
        },
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: {
          maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS,
        }
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'Analysis unavailable.';
  } catch (err) {
    console.error('[Gemini]', err.message);
    return getMockAnalysis(city, aqiData.aqi, aqiData.pollutant);
  }
}

async function fetchGeminiQuery(question, aqiSnapshot) {
  if (!CONFIG.GEMINI_KEY) {
    await sleep(900 + Math.random() * 500);
    return `[MOCK] Real-time Gemini analysis is available once you add your API key in js/config.js. The question "${question}" would be answered using current AQI data across all 24 monitored US cities.`;
  }

  const nationAvg = Math.round(
    Object.values(aqiSnapshot).reduce((s, d) => s + d.aqi, 0) / Object.values(aqiSnapshot).length
  );

  const context = Object.entries(aqiSnapshot)
    .sort((a, b) => b[1].aqi - a[1].aqi)
    .slice(0, 8)
    .map(([name, d]) => `${name}: AQI ${d.aqi} (${d.pollutant})`)
    .join(', ');

  const userMessage = `User query: "${question}"

Current national context — Average AQI: ${nationAvg}
Most polluted cities: ${context}
Date: ${new Date().toLocaleDateString()}`;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GEMINI_SYSTEM_PROMPT }]
        },
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: {
          maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS,
        }
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'Analysis unavailable.';
  } catch (err) {
    console.error('[Gemini Query]', err.message);
    return getMockAnalysis({ name: 'the requested area' }, nationAvg, 'PM2.5');
  }
}

// ── GEMINI SOLUTION QUERY ─────────────────────────────────────────────────────

const SOLUTION_SYSTEM_PROMPT = `You are an environmental policy advisor. Given a city's air quality data, provide 3 concise, actionable solutions to reduce the primary pollutant. Each solution should be 1 sentence. Focus on what residents, local government, or industry can realistically do. Be specific to the city and pollutant.`;

async function fetchGeminiSolution(city, aqiData) {
  if (!CONFIG.GEMINI_KEY) {
    await sleep(700 + Math.random() * 400);
    const pollutant = aqiData.pollutant || 'PM2.5';
    return `1. Reduce vehicle idling and promote public transit to cut ${pollutant} emissions from transportation.\n2. Enforce stricter industrial emission controls on facilities upwind of ${city.name}.\n3. Expand urban tree canopy coverage to naturally filter particulates and improve local air quality.`;
  }

  const userMessage = `City: ${city.name}, ${city.state}
AQI: ${aqiData.aqi} (${getAQICategory(aqiData.aqi)})
Primary pollutant: ${aqiData.pollutant}
Give 3 brief, actionable solutions to reduce this pollution.`;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SOLUTION_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 400 },
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'Solutions unavailable.';
  } catch (err) {
    console.error('[Gemini Solution]', err.message);
    return `1. Reduce vehicle emissions through expanded public transit in ${city.name}.\n2. Implement stricter controls on local industrial sources of ${aqiData.pollutant}.\n3. Increase green infrastructure and urban tree planting to filter airborne particulates.`;
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function windDegToDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'Spring';
  if (m >= 5 && m <= 7) return 'Summer';
  if (m >= 8 && m <= 10) return 'Fall';
  return 'Winter';
}
