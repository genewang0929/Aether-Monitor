/* ═══════════════════════════════════════════════
   AETHER MONITOR — Power Plant Historical Data
   Yearly averages 2020 → 2026 (7 years)
   Generated from EPA eGRID 2022 baseline.
   ═══════════════════════════════════════════════ */

const PLANT_PERIODS = ['2020','2021','2022','2023','2024','2025','2026'];

const PLANT_HISTORY = {};

(function generateHistory() {
  let seed = 777;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Coal: declining, Gas: growing, AI data centers: exploding
  const yearMultipliers = {
    COAL:     { 2020:1.50, 2021:1.28, 2022:1.00, 2023:0.75, 2024:0.50, 2025:0.30, 2026:0.15 },
    GAS:      { 2020:0.78, 2021:0.88, 2022:1.00, 2023:1.12, 2024:1.25, 2025:1.40, 2026:1.55 },
    DATA_CTR: { 2020:0.30, 2021:0.45, 2022:1.00, 2023:1.80, 2024:2.80, 2025:4.00, 2026:5.50 },
  };

  POWER_PLANTS.forEach(plant => {
    const fuel = plant.fuel;
    const mults = yearMultipliers[fuel] || yearMultipliers.GAS;
    const history = [];

    PLANT_PERIODS.forEach((year, idx) => {
      const yr = parseInt(year);
      const ym = mults[yr] || 1.0;
      const noise = () => 0.94 + rand() * 0.12;

      const entry = {
        period: year,
        so2:      Math.round(plant.so2 * ym * noise()),
        nox:      Math.round(plant.nox * ym * noise()),
        pm25:     Math.round(plant.pm25 * ym * noise()),
        co2:      Math.round(plant.co2 * ym * noise()),
        genTWh:   parseFloat((plant.genTWh * ym * noise()).toFixed(2)),
        waterMGal: Math.round((plant.waterMGal || 0) * ym * noise()),
        powerMW:   Math.round((plant.powerMW || 0) * ym * noise()),
      };

      entry.totalPollution = (fuel === 'DATA_CTR')
        ? entry.powerMW * 10
        : entry.so2 + entry.nox + entry.pm25;

      entry.prevChange = 0;
      history.push(entry);
    });

    // Compute year-over-year change
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].totalPollution;
      const curr = history[i].totalPollution;
      history[i].prevChange = prev > 0 ? ((curr - prev) / prev) : 0;
    }

    PLANT_HISTORY[plant.name] = history;
  });
})();
