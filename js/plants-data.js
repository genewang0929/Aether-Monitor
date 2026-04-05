/* ═══════════════════════════════════════════════
   AETHER MONITOR — US Power Plant Data
   Source: EPA eGRID 2022 (plant-level)
   Top coal & gas plants by SO₂ + NOx emissions.
   ═══════════════════════════════════════════════ */

const POWER_PLANTS = [
  // ── COAL ──────────────────────────────────────
  { name:'James H. Miller Jr.', state:'AL', lat:33.6853, lon:-87.0839, fuel:'COAL', operator:'Alabama Power', capMW:2640, genTWh:12.8, so2:5765, nox:3890, pm25:420, co2:13200000 },
  { name:'Plant Scherer', state:'GA', lat:33.0436, lon:-83.8297, fuel:'COAL', operator:'Georgia Power', capMW:3520, genTWh:14.2, so2:8210, nox:4650, pm25:510, co2:15800000 },
  { name:'Plant Bowen', state:'GA', lat:34.1264, lon:-84.9194, fuel:'COAL', operator:'Georgia Power', capMW:3160, genTWh:10.1, so2:4120, nox:3210, pm25:380, co2:11400000 },
  { name:'Monroe', state:'MI', lat:41.8839, lon:-83.3575, fuel:'COAL', operator:'DTE Energy', capMW:3280, genTWh:11.5, so2:6900, nox:4100, pm25:460, co2:12600000 },
  { name:'Gibson', state:'IN', lat:38.3672, lon:-87.5828, fuel:'COAL', operator:'Duke Energy', capMW:3132, genTWh:13.9, so2:9400, nox:5200, pm25:580, co2:14500000 },
  { name:'Rockport', state:'IN', lat:37.9256, lon:-87.0461, fuel:'COAL', operator:'AEP', capMW:2600, genTWh:10.8, so2:7100, nox:4300, pm25:490, co2:11800000 },
  { name:'Cumberland', state:'TN', lat:36.3928, lon:-87.6536, fuel:'COAL', operator:'TVA', capMW:2470, genTWh:8.5, so2:3800, nox:2900, pm25:340, co2:9200000 },
  { name:'Martin Lake', state:'TX', lat:32.2561, lon:-94.5706, fuel:'COAL', operator:'Luminant', capMW:2250, genTWh:9.1, so2:11200, nox:4800, pm25:520, co2:10500000 },
  { name:'Labadie', state:'MO', lat:38.5350, lon:-90.6825, fuel:'COAL', operator:'Ameren', capMW:2372, genTWh:10.3, so2:6200, nox:3700, pm25:410, co2:11100000 },
  { name:'W.A. Parish', state:'TX', lat:29.4819, lon:-95.6314, fuel:'COAL', operator:'NRG Energy', capMW:3653, genTWh:8.9, so2:5100, nox:3400, pm25:370, co2:9800000 },
  { name:'Gavin', state:'OH', lat:38.9467, lon:-82.1225, fuel:'COAL', operator:'AEP/Gavin', capMW:2600, genTWh:9.2, so2:7800, nox:4500, pm25:500, co2:10100000 },
  { name:'Colstrip', state:'MT', lat:45.8842, lon:-106.6131, fuel:'COAL', operator:'Talen Energy', capMW:2094, genTWh:7.8, so2:4500, nox:3100, pm25:350, co2:8500000 },
  { name:'Four Corners', state:'NM', lat:36.6853, lon:-108.4817, fuel:'COAL', operator:'APS', capMW:1636, genTWh:6.2, so2:3200, nox:5600, pm25:620, co2:7100000 },
  { name:'Paradise', state:'KY', lat:37.2728, lon:-86.9700, fuel:'COAL', operator:'TVA', capMW:2558, genTWh:7.1, so2:3900, nox:2800, pm25:310, co2:7800000 },
  { name:'Bruce Mansfield', state:'PA', lat:40.6317, lon:-80.4181, fuel:'COAL', operator:'FirstEnergy', capMW:2490, genTWh:6.5, so2:8500, nox:3600, pm25:440, co2:7200000 },
  { name:'Comanche', state:'CO', lat:38.2211, lon:-104.5903, fuel:'COAL', operator:'Xcel Energy', capMW:1410, genTWh:5.9, so2:2100, nox:2200, pm25:250, co2:6400000 },
  { name:'Intermountain', state:'UT', lat:39.5144, lon:-112.5606, fuel:'COAL', operator:'LADWP', capMW:1640, genTWh:7.4, so2:1800, nox:3900, pm25:430, co2:8100000 },
  { name:'Zimmer', state:'OH', lat:38.8636, lon:-84.2281, fuel:'COAL', operator:'Duke/AEP', capMW:1300, genTWh:5.2, so2:5400, nox:2600, pm25:290, co2:5700000 },
  { name:'Cross', state:'SC', lat:33.5178, lon:-80.1525, fuel:'COAL', operator:'Santee Cooper', capMW:2390, genTWh:6.8, so2:4800, nox:2900, pm25:320, co2:7400000 },
  { name:'Belews Creek', state:'NC', lat:36.2603, lon:-80.0631, fuel:'COAL', operator:'Duke Energy', capMW:2220, genTWh:8.1, so2:3100, nox:2500, pm25:280, co2:8800000 },

  // ── GAS ───────────────────────────────────────
  { name:'West County Energy Ctr', state:'FL', lat:26.6853, lon:-80.6875, fuel:'GAS', operator:'FPL', capMW:3750, genTWh:22.1, so2:45, nox:680, pm25:85, co2:9200000 },
  { name:'Riviera Beach Next Gen', state:'FL', lat:26.7631, lon:-80.0614, fuel:'GAS', operator:'FPL', capMW:1250, genTWh:7.8, so2:12, nox:310, pm25:38, co2:3400000 },
  { name:'Deer Park Energy Ctr', state:'TX', lat:29.6719, lon:-95.1264, fuel:'GAS', operator:'Calpine', capMW:1014, genTWh:6.9, so2:8, nox:420, pm25:52, co2:2900000 },
  { name:'Panda Liberty', state:'PA', lat:41.5394, lon:-76.0833, fuel:'GAS', operator:'Panda Power', capMW:829, genTWh:5.1, so2:5, nox:190, pm25:24, co2:2100000 },
  { name:'Cane Run', state:'KY', lat:38.1886, lon:-85.8503, fuel:'GAS', operator:'LG&E', capMW:662, genTWh:3.2, so2:6, nox:260, pm25:32, co2:1400000 },
  { name:'Moss Landing', state:'CA', lat:36.8044, lon:-121.5153, fuel:'GAS', operator:'Vistra', capMW:2560, genTWh:4.5, so2:15, nox:380, pm25:47, co2:1900000 },
  { name:'Inland Empire Energy', state:'CA', lat:34.0378, lon:-117.4264, fuel:'GAS', operator:'GE', capMW:775, genTWh:4.8, so2:7, nox:210, pm25:26, co2:2000000 },
  { name:'Midlothian', state:'TX', lat:32.4436, lon:-96.9706, fuel:'GAS', operator:'Luminant', capMW:1560, genTWh:5.4, so2:10, nox:350, pm25:43, co2:2300000 },
  { name:'Seminole Combined', state:'FL', lat:27.8503, lon:-82.7536, fuel:'GAS', operator:'Seminole', capMW:1300, genTWh:6.1, so2:18, nox:290, pm25:36, co2:2600000 },
  { name:'J.K. Spruce', state:'TX', lat:29.2742, lon:-98.3736, fuel:'GAS', operator:'CPS Energy', capMW:1410, genTWh:7.2, so2:14, nox:520, pm25:65, co2:3100000 },

  // ── AI DATA CENTERS ───────────────────────────
  // No direct SO₂/NOx/PM2.5, but massive electricity + water consumption
  // CO₂ = indirect from grid electricity (US avg ~0.4 t/MWh)
  { name:'AWS US-East (Ashburn)', state:'VA', lat:39.0438, lon:-77.4874, fuel:'DATA_CTR', operator:'Amazon', capMW:300, genTWh:0, so2:0, nox:0, pm25:0, co2:1051200, waterMGal:985, powerMW:300 },
  { name:'Google (The Dalles)', state:'OR', lat:45.5946, lon:-121.1787, fuel:'DATA_CTR', operator:'Google', capMW:150, genTWh:0, so2:0, nox:0, pm25:0, co2:525600, waterMGal:355, powerMW:150 },
  { name:'Google (Council Bluffs)', state:'IA', lat:41.2619, lon:-95.8608, fuel:'DATA_CTR', operator:'Google', capMW:200, genTWh:0, so2:0, nox:0, pm25:0, co2:700800, waterMGal:510, powerMW:200 },
  { name:'Microsoft (Quincy)', state:'WA', lat:47.2343, lon:-119.8527, fuel:'DATA_CTR', operator:'Microsoft', capMW:200, genTWh:0, so2:0, nox:0, pm25:0, co2:700800, waterMGal:480, powerMW:200 },
  { name:'Microsoft (San Antonio)', state:'TX', lat:29.4241, lon:-98.4936, fuel:'DATA_CTR', operator:'Microsoft', capMW:180, genTWh:0, so2:0, nox:0, pm25:0, co2:630720, waterMGal:620, powerMW:180 },
  { name:'Meta (Prineville)', state:'OR', lat:44.3100, lon:-120.7344, fuel:'DATA_CTR', operator:'Meta', capMW:180, genTWh:0, so2:0, nox:0, pm25:0, co2:630720, waterMGal:440, powerMW:180 },
  { name:'Meta (Altoona)', state:'IA', lat:41.6444, lon:-93.4595, fuel:'DATA_CTR', operator:'Meta', capMW:200, genTWh:0, so2:0, nox:0, pm25:0, co2:700800, waterMGal:530, powerMW:200 },
  { name:'Apple (Mesa)', state:'AZ', lat:33.4379, lon:-111.7266, fuel:'DATA_CTR', operator:'Apple', capMW:100, genTWh:0, so2:0, nox:0, pm25:0, co2:350400, waterMGal:280, powerMW:100 },
  { name:'Microsoft (Cheyenne)', state:'WY', lat:41.1400, lon:-104.8202, fuel:'DATA_CTR', operator:'Microsoft', capMW:150, genTWh:0, so2:0, nox:0, pm25:0, co2:525600, waterMGal:360, powerMW:150 },
  { name:'Google (Midlothian)', state:'TX', lat:32.4822, lon:-96.9944, fuel:'DATA_CTR', operator:'Google', capMW:200, genTWh:0, so2:0, nox:0, pm25:0, co2:700800, waterMGal:550, powerMW:200 },
];

// Pre-compute ranks
(function computeRanks() {
  const sorted = {
    so2: [...POWER_PLANTS].sort((a, b) => b.so2 - a.so2),
    nox: [...POWER_PLANTS].sort((a, b) => b.nox - a.nox),
    pm25: [...POWER_PLANTS].sort((a, b) => b.pm25 - a.pm25),
    co2: [...POWER_PLANTS].sort((a, b) => b.co2 - a.co2),
    total: [...POWER_PLANTS].sort((a, b) => (b.so2 + b.nox + b.pm25) - (a.so2 + a.nox + a.pm25)),
  };

  // Max values for bar scaling
  POWER_PLANTS._maxSO2 = sorted.so2[0]?.so2 || 1;
  POWER_PLANTS._maxNOx = sorted.nox[0]?.nox || 1;
  POWER_PLANTS._maxPM25 = sorted.pm25[0]?.pm25 || 1;
  POWER_PLANTS._maxCO2 = sorted.co2[0]?.co2 || 1;

  POWER_PLANTS.forEach(p => {
    p.rankSO2 = sorted.so2.indexOf(p) + 1;
    p.rankNOx = sorted.nox.indexOf(p) + 1;
    p.rankTotal = sorted.total.indexOf(p) + 1;
    p.totalPollution = p.so2 + p.nox + p.pm25;
    p.impactRadiusKm = p.fuel === 'DATA_CTR'
      ? Math.sqrt(p.powerMW) * 3    // data centers: radius by electricity draw
      : Math.sqrt(p.so2 + p.nox) * 0.8;
  });
})();
