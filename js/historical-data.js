/* ═══════════════════════════════════════════════
   AETHER MONITOR — Cached Historical Data (Phoenix, AZ)
   30 days of weather + AQI data at 3-hour intervals.
   Pre-generated for demo — no API calls needed.
   ═══════════════════════════════════════════════ */

const HISTORICAL_PHOENIX = (() => {
  const data = [];
  const now = new Date();
  // Round "now" down to nearest 3-hour mark for clean alignment
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() - (now.getHours() % 3));

  const startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // Deterministic pseudo-random (Lehmer LCG)
  let seed = 20260304;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  for (let t = startTime; t <= now.getTime(); t += 3 * 60 * 60 * 1000) {
    const date = new Date(t);
    const hour = date.getHours();
    const dayIndex = Math.floor((t - startTime) / (24 * 60 * 60 * 1000));

    // ── Temperature: daily cycle, Phoenix spring 65–98°F ──
    const dailyCycle = -14 * Math.cos(((hour - 3) / 24) * 2 * Math.PI);
    const dayDrift = Math.sin(dayIndex * 0.22) * 5;
    const temp = Math.round(80 + dailyCycle + dayDrift + (rand() * 4 - 2));

    // ── Humidity: desert-low 8–32% ──
    const nightBoost = (hour >= 20 || hour < 6) ? 6 : 0;
    const humidity = Math.round(14 + nightBoost + rand() * 12);

    // ── Wind ──
    const windSpeed = Math.round(4 + rand() * 18);
    const windDir = dirs[Math.floor(rand() * 8)];

    // ── AQI: base ~80, dust events spike it ──
    const isDustEvent = (dayIndex % 7 === 3 || dayIndex % 10 === 6) && hour >= 10 && hour <= 20;
    const isHeatEvent = dayIndex >= 12 && dayIndex <= 14;
    const baseAQI = 78 + Math.sin(dayIndex * 0.28) * 18 + Math.cos(hour * 0.26) * 8;
    const dustBoost = isDustEvent ? 35 + rand() * 45 : 0;
    const heatBoost = isHeatEvent ? 15 + rand() * 10 : 0;
    const aqi = Math.round(Math.max(28, Math.min(185, baseAQI + dustBoost + heatBoost + (rand() * 12 - 6))));

    // ── Pollutant ──
    let pollutant = 'PM10';
    if (!isDustEvent && aqi < 80) pollutant = rand() > 0.4 ? 'O3' : 'PM10';

    // ── Condition ──
    let condition = 'Sunny';
    if (isDustEvent && windSpeed > 14) condition = 'Dust Storm';
    else if (isDustEvent) condition = 'Hazy';
    else if (hour < 6 || hour >= 21) condition = 'Clear';
    else if (rand() < 0.12) condition = 'Partly Cloudy';

    data.push({
      timestamp: t,
      aqi,
      pollutant,
      temp,
      humidity,
      wind: { speed: windSpeed, dir: windDir },
      condition,
    });
  }

  return data;
})();
