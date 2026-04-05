/* ═══════════════════════════════════════════════
   AETHER MONITOR — Historical Data Loader (Phoenix, AZ)
   Loads 5+ years of real data from phoenix-5yr.json.
   ═══════════════════════════════════════════════ */

let HISTORICAL_PHOENIX = [];
let HISTORICAL_LOADED = false;

async function loadHistoricalData() {
  if (HISTORICAL_LOADED) return;
  try {
    const resp = await fetch('data/phoenix-5yr.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();

    // Convert to the format the historical view expects
    HISTORICAL_PHOENIX = raw
      .filter(d => d.aqi !== null)  // skip rows with no AQI
      .map(d => {
        const tempF = d.temp_mean !== null ? Math.round(d.temp_mean * 9/5 + 32) : null;
        return {
          timestamp: new Date(d.date).getTime(),
          date:      d.date,
          aqi:       d.aqi,
          pollutant: (d.pm25_mean && d.pm25_mean > 15) ? 'PM2.5' : 'PM10',
          pm25_mean: d.pm25_mean,
          pm25_max:  d.pm25_max,
          temp:      tempF,
          humidity:  d.humidity,
          wind:      d.wind_max_kmh !== null
            ? { speed: Math.round(d.wind_max_kmh * 0.621371), dir: 'SW' }
            : { speed: null, dir: '--' },
          precip_mm: d.precip_mm,
          pressure:  d.pressure_hpa,
          condition: guessCondition(d),
        };
      });

    HISTORICAL_LOADED = true;
    console.log(`[Historical] Loaded ${HISTORICAL_PHOENIX.length} days of Phoenix data`);
  } catch (err) {
    console.error('[Historical] Failed to load data:', err);
  }
}

function guessCondition(d) {
  if (d.precip_mm !== null && d.precip_mm > 5) return 'Rain';
  if (d.pm25_mean !== null && d.pm25_mean > 50) return 'Hazy';
  if (d.wind_max_kmh !== null && d.wind_max_kmh > 40) return 'Dust Storm';
  if (d.humidity !== null && d.humidity < 15) return 'Dry';
  if (d.temp_mean !== null && d.temp_mean > 38) return 'Hot';
  return 'Clear';
}
