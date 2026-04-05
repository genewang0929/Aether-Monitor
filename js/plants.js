/* ═══════════════════════════════════════════════
   AETHER MONITOR — Power Plant Pollution Layer
   Visualizes coal/gas plant emissions and their
   connection to city AQI nodes.
   ═══════════════════════════════════════════════ */

const PLANT_SOURCE = 'plants-source';
const PLANT_CIRCLE = 'plants-circle';
const PLANT_GLOW = 'plants-glow';
const PLANT_LABEL = 'plants-label';
const SPREAD_SOURCE = 'spread-source';
const SPREAD_FILL = 'spread-fill';
const SPREAD_BORDER = 'spread-border';
const LINES_SOURCE = 'lines-source';
const LINES_LAYER = 'lines-layer';

function fuelColor(fuel) {
  if (fuel === 'COAL') return '#cc2200';
  if (fuel === 'GAS') return '#ff8c00';
  if (fuel === 'DATA_CTR') return '#7c3aed';
  return '#888';
}

let plantsLayerActive = false;
let selectedPlant = null;
let currentPeriodIdx = 2; // default: 2022
let plantFilters = { fuels: ['COAL', 'GAS', 'DATA_CTR'], count: 'ALL', sortBy: 'total' };

// ── ENTER / EXIT ─────────────────────────────────────────────────────────────

function enterPlantsView() {
  plantsLayerActive = true;
  document.getElementById('plants-filter-bar').style.display = 'flex';
  document.getElementById('plants-leaderboard').style.display = 'block';
  document.getElementById('city-detail').style.display = 'none';

  // Hide AQI city layers
  if (glMap) {
    if (glMap.getLayer(CITIES_CIRCLE)) glMap.setLayoutProperty(CITIES_CIRCLE, 'visibility', 'none');
    if (glMap.getLayer(CITIES_GLOW)) glMap.setLayoutProperty(CITIES_GLOW, 'visibility', 'none');
    if (glMap.getLayer(CITIES_LABEL)) glMap.setLayoutProperty(CITIES_LABEL, 'visibility', 'none');
  }

  // Clear city smoke, show plant smoke instead
  if (particleSystem) particleSystem.clearAll();
  document.getElementById('particle-canvas').style.display = 'block';

  addPlantLayers();
  renderPlantMarkers();
  renderPlantSmoke();
  renderLeaderboard();

  // Reset map to US view
  if (glMap) glMap.flyTo({ center: [-97, 39], zoom: 3.6, pitch: 30, bearing: 0, duration: 1000 });
}

function exitPlantsView() {
  plantsLayerActive = false;
  selectedPlant = null;
  document.getElementById('plants-filter-bar').style.display = 'none';
  document.getElementById('plants-leaderboard').style.display = 'none';
  document.getElementById('plant-detail').style.display = 'none';

  removePlantLayers();
  clearSpread();

  // Clear plant smoke, restore AQI city layers
  if (particleSystem) particleSystem.clearAll();
  if (glMap) {
    if (glMap.getLayer(CITIES_CIRCLE)) glMap.setLayoutProperty(CITIES_CIRCLE, 'visibility', 'visible');
    if (glMap.getLayer(CITIES_GLOW)) glMap.setLayoutProperty(CITIES_GLOW, 'visibility', 'visible');
    if (glMap.getLayer(CITIES_LABEL)) glMap.setLayoutProperty(CITIES_LABEL, 'visibility', 'visible');
  }

  // Restore pitch
  if (glMap) glMap.easeTo({ pitch: 50, bearing: -15, duration: 500 });
}

// ── MAP LAYERS ───────────────────────────────────────────────────────────────

function addPlantLayers() {
  if (!glMap || glMap.getSource(PLANT_SOURCE)) return;

  glMap.addSource(PLANT_SOURCE, { type: 'geojson', data: emptyFC() });
  glMap.addSource(SPREAD_SOURCE, { type: 'geojson', data: emptyFC() });
  glMap.addSource(LINES_SOURCE, { type: 'geojson', data: emptyFC() });

  // Spread fill
  glMap.addLayer({
    id: SPREAD_FILL, type: 'fill', source: SPREAD_SOURCE,
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.12,
    },
  });

  // Spread border
  glMap.addLayer({
    id: SPREAD_BORDER, type: 'line', source: SPREAD_SOURCE,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 1.5,
      'line-dasharray': [4, 4],
      'line-opacity': 0.6,
    },
  });

  // Connection lines
  glMap.addLayer({
    id: LINES_LAYER, type: 'line', source: LINES_SOURCE,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 1.5,
      'line-dasharray': [6, 4],
      'line-opacity': 0.7,
    },
  });

  // Plant glow (invisible — geodomes replace the visual)
  glMap.addLayer({
    id: PLANT_GLOW, type: 'circle', source: PLANT_SOURCE,
    paint: {
      'circle-radius': ['*', ['get', 'radius'], 1.8],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0,
    },
  });

  // Plant circles (invisible but LARGE — generous click/hover hit area)
  glMap.addLayer({
    id: PLANT_CIRCLE, type: 'circle', source: PLANT_SOURCE,
    paint: {
      'circle-radius': ['*', ['get', 'radius'], 2.5],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0,
    },
  });

  // Plant labels
  glMap.addLayer({
    id: PLANT_LABEL, type: 'symbol', source: PLANT_SOURCE,
    layout: {
      'text-field': ['get', 'shortName'],
      'text-size': 9,
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': ['get', 'color'],
      'text-opacity': 0.7,
      'text-halo-color': 'rgba(6,9,26,0.9)',
      'text-halo-width': 1.5,
    },
  });

  // Click handler
  glMap.on('click', PLANT_CIRCLE, (e) => {
    if (!e.features?.length) return;
    e.preventDefault();
    const name = e.features[0].properties.name;
    const plant = POWER_PLANTS.find(p => p.name === name);
    if (plant) selectPlant(plant);
  });

  glMap.on('mouseenter', PLANT_CIRCLE, () => { glMap.getCanvas().style.cursor = 'pointer'; });
  glMap.on('mouseleave', PLANT_CIRCLE, () => { glMap.getCanvas().style.cursor = ''; });
}

function removePlantLayers() {
  if (!glMap) return;
  [PLANT_LABEL, PLANT_CIRCLE, PLANT_GLOW, LINES_LAYER, SPREAD_BORDER, SPREAD_FILL].forEach(id => {
    if (glMap.getLayer(id)) glMap.removeLayer(id);
  });
  [PLANT_SOURCE, SPREAD_SOURCE, LINES_SOURCE].forEach(id => {
    if (glMap.getSource(id)) glMap.removeSource(id);
  });
}

// ── RENDER MARKERS ───────────────────────────────────────────────────────────

function getPlantPeriodData(plant) {
  const hist = PLANT_HISTORY[plant.name];
  if (!hist || !hist[currentPeriodIdx]) return null;
  return hist[currentPeriodIdx];
}

function renderPlantMarkers() {
  if (!glMap || !glMap.getSource(PLANT_SOURCE)) return;

  let plants = POWER_PLANTS.filter(p => plantFilters.fuels.includes(p.fuel));

  // Get period data for each plant
  const withData = plants.map(p => {
    const d = getPlantPeriodData(p);
    return { plant: p, data: d || { so2: p.so2/2, nox: p.nox/2, pm25: p.pm25/2, co2: p.co2/2, totalPollution: p.totalPollution/2, prevChange: 0 } };
  });

  // Sort by current period data
  const sortKey = plantFilters.sortBy;
  if (sortKey === 'so2') withData.sort((a, b) => b.data.so2 - a.data.so2);
  else if (sortKey === 'nox') withData.sort((a, b) => b.data.nox - a.data.nox);
  else if (sortKey === 'pm25') withData.sort((a, b) => b.data.pm25 - a.data.pm25);
  else if (sortKey === 'co2') withData.sort((a, b) => b.data.co2 - a.data.co2);
  else withData.sort((a, b) => b.data.totalPollution - a.data.totalPollution);

  // Count filter
  let filtered = withData;
  if (plantFilters.count === 'TOP10') filtered = withData.slice(0, 10);
  else if (plantFilters.count === 'TOP50') filtered = withData.slice(0, 50);

  const maxEmit = Math.max(...filtered.map(e => {
    return e.plant.fuel === 'DATA_CTR' ? (e.data.powerMW || e.plant.powerMW) : (e.data.so2 + e.data.nox);
  })) || 1;

  const geojson = {
    type: 'FeatureCollection',
    features: filtered.map(({ plant, data }) => {
      const sizeMetric = plant.fuel === 'DATA_CTR' ? (data.powerMW || plant.powerMW) : (data.so2 + data.nox);
      const baseRadius = 6 + (sizeMetric / maxEmit) * 18;

      // Grow bigger if pollution increased vs previous year
      const change = data.prevChange;
      let sizeBoost = 1.0;
      if (change > 0.15) sizeBoost = 2.0;        // >15% increase → 2x bigger
      else if (change > 0.05) sizeBoost = 1.5;   // >5% increase → 1.5x bigger
      else if (change > 0) sizeBoost = 1.2;      // any increase → 1.2x
      else if (change < -0.15) sizeBoost = 0.4;  // >15% decrease → 60% smaller
      else if (change < -0.05) sizeBoost = 0.6;  // >5% decrease → 40% smaller
      else if (change < 0) sizeBoost = 0.8;      // any decrease → 20% smaller

      // Color: bright red for increase, teal for decrease
      let color = fuelColor(plant.fuel);
      if (change > 0.1) color = '#ff0022';        // big increase → bright red
      else if (change > 0.03) color = '#ff4400';   // moderate increase → red-orange
      else if (change < -0.1) color = '#00ffaa';   // big decrease → bright teal
      else if (change < -0.03) color = '#22ccaa';  // moderate decrease → teal

      return {
        type: 'Feature',
        properties: {
          name: plant.name,
          shortName: plant.name.length > 14 ? plant.name.slice(0, 13) + '.' : plant.name,
          color,
          radius: Math.round(baseRadius * sizeBoost),
          fuel: plant.fuel,
          change: Math.round(change * 100),
        },
        geometry: { type: 'Point', coordinates: [plant.lon, plant.lat] },
      };
    }),
  };

  glMap.getSource(PLANT_SOURCE).setData(geojson);
}

// ── RED SMOKE ON PLANTS ───────────────────────────────────────────���──────────

function renderPlantSmoke() {
  if (!particleSystem) return;
  particleSystem.clearAll();

  const plants = POWER_PLANTS.filter(p => plantFilters.fuels.includes(p.fuel));

  plants.forEach(p => {
    const d = getPlantPeriodData(p);
    if (!d) return;

    // Scale smoke dramatically so year differences are impossible to miss
    const isdc = p.fuel === 'DATA_CTR';
    let smokeAQI;
    if (isdc) {
      const basePower = p.powerMW || 100;
      smokeAQI = Math.min(600, Math.round((d.powerMW / basePower) * 350));
    } else if (p.fuel === 'GAS') {
      // Gas burns cleaner — much less visible smoke
      const baseEmit = (p.so2 + p.nox) || 1;
      smokeAQI = Math.min(300, Math.round(((d.so2 + d.nox) / baseEmit) * 120));
    } else {
      // Coal — heavy smoke
      const baseEmit = (p.so2 + p.nox) || 1;
      smokeAQI = Math.min(600, Math.round(((d.so2 + d.nox) / baseEmit) * 450));
    }

    const smokeColor = fuelColor(p.fuel);
    particleSystem.updateCity(p.name, smokeAQI, smokeColor, [p.lon, p.lat]);
  });

  // Trigger burst animation
  particleSystem.burstAll();
}

// ── SELECT PLANT ─────────────────────────────────────────────────────────────

function selectPlant(plant) {
  selectedPlant = plant;

  // Visual feedback: enlarge selected geodome
  if (particleSystem) particleSystem.setSelected(plant.name);

  // Fly to plant
  glMap.flyTo({ center: [plant.lon, plant.lat], zoom: 6, duration: 1000 });

  // Show spread circle + connection lines
  showSpread(plant);

  // Show detail panel
  showPlantDetail(plant);
}

// ── SPREAD CIRCLE + CONNECTION LINES ─────────────────────────────────────────

function showSpread(plant) {
  if (!glMap) return;
  const color = fuelColor(plant.fuel);
  const radiusKm = plant.impactRadiusKm;

  // Generate circle polygon
  const circle = createCircleGeo([plant.lon, plant.lat], radiusKm);
  circle.properties = { color };

  glMap.getSource(SPREAD_SOURCE).setData({
    type: 'FeatureCollection',
    features: [circle],
  });

  // Find affected cities
  const affected = CONFIG.CITIES.filter(c => {
    const dist = haversineKm(plant.lat, plant.lon, c.lat, c.lon);
    return dist <= radiusKm;
  });

  // Draw connection lines
  const lines = {
    type: 'FeatureCollection',
    features: affected.map(c => {
      const dist = haversineKm(plant.lat, plant.lon, c.lat, c.lon);
      const t = dist / radiusKm;
      const lineColor = t < 0.4 ? '#cc2200' : t < 0.7 ? '#ff6600' : '#ffaa00';
      return {
        type: 'Feature',
        properties: { color: lineColor, distance: Math.round(dist), city: c.name },
        geometry: {
          type: 'LineString',
          coordinates: [[plant.lon, plant.lat], [c.lon, c.lat]],
        },
      };
    }),
  };

  glMap.getSource(LINES_SOURCE).setData(lines);

  return affected;
}

function clearSpread() {
  if (!glMap) return;
  if (glMap.getSource(SPREAD_SOURCE)) glMap.getSource(SPREAD_SOURCE).setData(emptyFC());
  if (glMap.getSource(LINES_SOURCE)) glMap.getSource(LINES_SOURCE).setData(emptyFC());
}

// ── DETAIL PANEL ─────────────────────────────────────────────────────────────

function showPlantDetail(plant) {
  const panel = document.getElementById('plant-detail');
  const color = fuelColor(plant.fuel);
  const periodData = getPlantPeriodData(plant);
  const periodLabel = PLANT_PERIODS[currentPeriodIdx];
  const affected = CONFIG.CITIES.filter(c =>
    haversineKm(plant.lat, plant.lon, c.lat, c.lon) <= plant.impactRadiusKm
  );

  // Use period data if available, else annual / 2
  const so2 = periodData ? periodData.so2 : plant.so2 / 2;
  const nox = periodData ? periodData.nox : plant.nox / 2;
  const pm25 = periodData ? periodData.pm25 : plant.pm25 / 2;
  const co2 = periodData ? periodData.co2 : plant.co2 / 2;
  const gen = periodData ? periodData.genTWh : plant.genTWh / 2;
  const change = periodData ? periodData.prevChange : 0;

  // Estimate health impact
  const exposedPop = affected.reduce((s, c) => s + (c.pop || 0), 0);
  const asthmaER = Math.round(so2 * 2 * 0.8 * exposedPop / 100000);
  const carEquiv = Math.round((co2 * 2) / 4.6);

  // Emission bars (relative to dataset max, annualized)
  const barSO2 = Math.round(((so2 * 2) / POWER_PLANTS._maxSO2) * 100);
  const barNOx = Math.round(((nox * 2) / POWER_PLANTS._maxNOx) * 100);
  const barPM25 = Math.round(((pm25 * 2) / POWER_PLANTS._maxPM25) * 100);
  const barCO2 = Math.round(((co2 * 2) / POWER_PLANTS._maxCO2) * 100);

  const changeStr = change > 0.01 ? `<span style="color:#ff0000">▲${Math.round(change*100)}% vs prev</span>`
                  : change < -0.01 ? `<span style="color:#22ccaa">▼${Math.round(Math.abs(change)*100)}% vs prev</span>`
                  : '';

  function bar(pct, c) {
    return `<div class="pl-bar"><div class="pl-bar-fill" style="width:${pct}%;background:${c}"></div></div>`;
  }

  const isDataCtr = plant.fuel === 'DATA_CTR';
  const typeLabel = isDataCtr ? 'AI_DATA_CENTER' : 'POLLUTION_SOURCE';
  const waterMGal = periodData ? periodData.waterMGal : (plant.waterMGal || 0) / 2;
  const pwrMW = periodData ? periodData.powerMW : plant.powerMW || 0;

  // Convert water to relatable units
  const olympicPools = Math.round(waterMGal / 0.66); // 1 Olympic pool ≈ 0.66M gal
  const homesEquiv = Math.round((pwrMW * 8760 * 0.5) / 10.5); // avg US home ≈ 10.5 MWh/yr, 50% capacity factor

  let bodyHTML;

  if (isDataCtr) {
    bodyHTML = `
    <div class="pl-rows">
      <div class="pl-row"><span class="tw-k">FACILITY</span><span class="tw-v">${plant.name.toUpperCase()}</span></div>
      <div class="pl-row"><span class="tw-k">STATE</span><span class="tw-v">${plant.state}</span></div>
      <div class="pl-row"><span class="tw-k">TYPE</span><span class="tw-v" style="color:${color}">AI / DATA CENTER</span></div>
      <div class="pl-row"><span class="tw-k">OPERATOR</span><span class="tw-v">${plant.operator}</span></div>
    </div>
    <div class="pl-section-label">RESOURCE CONSUMPTION // ${periodLabel} ${changeStr}</div>
    <div class="pl-emission">
      <div class="pl-row"><span class="tw-k">ELECTRICITY</span><span class="tw-v">${pwrMW.toLocaleString()} MW</span></div>
      ${bar(Math.min(100, Math.round(pwrMW / 3)), '#7c3aed')}
      <div class="pl-row"><span class="tw-k">WATER</span><span class="tw-v">${waterMGal.toLocaleString()} M gal</span></div>
      ${bar(Math.min(100, Math.round(waterMGal / 10)), '#3b82f6')}
      <div class="pl-row"><span class="tw-k">CO₂ (INDIRECT)</span><span class="tw-v">${(co2 / 1000000).toFixed(2)}M t</span></div>
      ${bar(barCO2, '#888')}
    </div>
    <div class="pl-section-label">SCALE EQUIVALENTS (EST.)</div>
    <div class="pl-rows">
      <div class="pl-row"><span class="tw-k">POWERS</span><span class="tw-v">~${homesEquiv.toLocaleString()} homes</span></div>
      <div class="pl-row"><span class="tw-k">WATER =</span><span class="tw-v">~${olympicPools.toLocaleString()} Olympic pools/yr</span></div>
      <div class="pl-row"><span class="tw-k">CAR EQUIV</span><span class="tw-v">~${carEquiv.toLocaleString()} cars</span></div>
    </div>
    <div class="pl-disclaimer">Data estimated · AI workload consumption varies significantly by model and task</div>`;
  } else {
    bodyHTML = `
    <div class="pl-rows">
      <div class="pl-row"><span class="tw-k">PLANT</span><span class="tw-v">${plant.name.toUpperCase()}</span></div>
      <div class="pl-row"><span class="tw-k">STATE</span><span class="tw-v">${plant.state}</span></div>
      <div class="pl-row"><span class="tw-k">FUEL</span><span class="tw-v" style="color:${color}">${plant.fuel}</span></div>
      <div class="pl-row"><span class="tw-k">OPERATOR</span><span class="tw-v">${plant.operator}</span></div>
      <div class="pl-row"><span class="tw-k">CAPACITY</span><span class="tw-v">${plant.capMW.toLocaleString()} MW</span></div>
    </div>
    <div class="pl-section-label">EMISSIONS // ${periodLabel} ${changeStr}</div>
    <div class="pl-emission">
      <div class="pl-row"><span class="tw-k">SO₂</span><span class="tw-v">${so2.toLocaleString()} t</span></div>
      ${bar(barSO2, '#cc2200')}
      <div class="pl-row"><span class="tw-k">NOx</span><span class="tw-v">${nox.toLocaleString()} t</span></div>
      ${bar(barNOx, '#ff6600')}
      <div class="pl-row"><span class="tw-k">PM2.5</span><span class="tw-v">${pm25.toLocaleString()} t</span></div>
      ${bar(barPM25, '#ff8c00')}
      <div class="pl-row"><span class="tw-k">CO₂</span><span class="tw-v">${(co2 / 1000000).toFixed(1)}M t</span></div>
      ${bar(barCO2, '#888')}
    </div>
    <div class="pl-section-label">HEALTH IMPACT (EST.)</div>
    <div class="pl-rows">
      <div class="pl-row"><span class="tw-k">IMPACT RADIUS</span><span class="tw-v">${Math.round(plant.impactRadiusKm)} km</span></div>
      <div class="pl-row"><span class="tw-k">EXPOSED POP</span><span class="tw-v">${exposedPop.toLocaleString()}</span></div>
      <div class="pl-row"><span class="tw-k">ASTHMA ER/YR</span><span class="tw-v">~${asthmaER.toLocaleString()} (est.)</span></div>
      <div class="pl-row"><span class="tw-k">CAR EQUIV</span><span class="tw-v">~${carEquiv.toLocaleString()} cars</span></div>
      <div class="pl-row"><span class="tw-k">CITIES HIT</span><span class="tw-v">${affected.map(c => c.name).join(', ') || 'None in range'}</span></div>
    </div>
    <div class="pl-disclaimer">Data: EPA eGRID 2022 · Health estimates are approximate</div>`;
  }

  panel.innerHTML = `
    <div class="cd-header">
      <span class="cd-label" style="color:${color}">${typeLabel}</span>
      <button class="cd-close" onclick="document.getElementById('plant-detail').style.display='none';clearSpread();if(particleSystem)particleSystem.setSelected(null);">&times;</button>
    </div>
    ${bodyHTML}
  `;

  panel.style.display = 'block';
}

// ── LEADERBOARD ──────────────────────────────────────────────────────────────

function renderLeaderboard() {
  const list = document.getElementById('plants-lb-list');

  // Build separate top-5 sections for each active fuel type
  let html = '';

  const fuelLabels = { COAL: 'TOP 5 COAL', GAS: 'TOP 5 GAS', DATA_CTR: 'TOP 5 AI DATA CENTERS' };
  const fuelOrder = ['COAL', 'GAS', 'DATA_CTR'];

  fuelOrder.forEach(fuel => {
    if (!plantFilters.fuels.includes(fuel)) return;

    const ranked = POWER_PLANTS
      .filter(p => p.fuel === fuel)
      .map(p => {
        const d = getPlantPeriodData(p) || { so2: p.so2/2, nox: p.nox/2, pm25: p.pm25/2, totalPollution: p.totalPollution/2, prevChange: 0, powerMW: p.powerMW, waterMGal: 0 };
        return { plant: p, data: d };
      })
      .sort((a, b) => b.data.totalPollution - a.data.totalPollution)
      .slice(0, 5);

    if (ranked.length === 0) return;

    const maxTotal = ranked[0]?.data.totalPollution || 1;
    const color = fuelColor(fuel);

    html += `<div class="lb-section-label" style="color:${color}">${fuelLabels[fuel]}</div>`;

    html += ranked.map(({ plant: p, data: d }, i) => {
      const pct = Math.round((d.totalPollution / maxTotal) * 100);
      const ch = d.prevChange;
      const changeStr = ch > 0.01 ? `<span style="color:#ff0000">▲${Math.round(ch*100)}%</span>`
                      : ch < -0.01 ? `<span style="color:#22ccaa">▼${Math.round(Math.abs(ch)*100)}%</span>`
                      : '<span style="color:#888">—</span>';
      const isdc = p.fuel === 'DATA_CTR';
      const metaStr = isdc
        ? `<span>${p.state}</span><span>${d.powerMW||p.powerMW}MW</span><span>${d.waterMGal||'--'}Mgal</span>`
        : `<span>${p.state}</span><span>SO₂:${(d.so2/1000).toFixed(1)}k</span><span>NOx:${(d.nox/1000).toFixed(1)}k</span>`;
      return `
        <div class="lb-row" data-plant="${p.name}">
          <div class="lb-rank" style="color:${color}">#${i + 1}</div>
          <div class="lb-info">
            <div class="lb-name">${p.name} ${changeStr}</div>
            <div class="lb-meta">${metaStr}</div>
          <div class="pl-bar"><div class="pl-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
      </div>`;
    }).join('');
  });

  list.innerHTML = html;

  // Click to select
  list.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', () => {
      const plant = POWER_PLANTS.find(p => p.name === row.dataset.plant);
      if (plant) selectPlant(plant);
    });
  });
}

// ── FILTER BAR HANDLERS ──────────────────────────────────────────────────────

function initPlantsFilters() {
  // Fuel toggles
  document.querySelectorAll('.pf-fuel').forEach(btn => {
    btn.addEventListener('click', () => {
      const fuel = btn.dataset.fuel;
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) {
        if (!plantFilters.fuels.includes(fuel)) plantFilters.fuels.push(fuel);
      } else {
        plantFilters.fuels = plantFilters.fuels.filter(f => f !== fuel);
      }
      if (plantsLayerActive) { renderPlantMarkers(); renderPlantSmoke(); }
    });
  });

  // Count buttons
  document.querySelectorAll('.pf-count').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pf-count').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      plantFilters.count = btn.dataset.count;
      if (plantsLayerActive) { renderPlantMarkers(); renderPlantSmoke(); }
    });
  });

  // Sort buttons
  document.querySelectorAll('.pf-sort').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pf-sort').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      plantFilters.sortBy = btn.dataset.sort;
      if (plantsLayerActive) { renderPlantMarkers(); renderLeaderboard(); }
    });
  });

  // VIEW AGAIN button
  document.getElementById('pf-replay').addEventListener('click', () => {
    if (plantsLayerActive) renderPlantSmoke();
  });

  // Period slider
  const periodSlider = document.getElementById('pf-period-slider');
  const periodLabel = document.getElementById('pf-period-label');

  periodSlider.addEventListener('input', () => {
    currentPeriodIdx = parseInt(periodSlider.value, 10);
    periodLabel.textContent = PLANT_PERIODS[currentPeriodIdx];
    if (plantsLayerActive) {
      renderPlantMarkers();
      renderPlantSmoke();
      renderLeaderboard();
      // Refresh detail panel if a plant is selected
      if (selectedPlant) showPlantDetail(selectedPlant);
    }
  });
}

// ── GEO HELPERS ──────────────────────────────────────────────────────────────

function createCircleGeo(center, radiusKm, steps) {
  steps = steps || 64;
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dy = radiusKm * Math.cos(angle);
    const dx = radiusKm * Math.sin(angle);
    const lat = center[1] + (dy / 111.32);
    const lng = center[0] + (dx / (111.32 * Math.cos(center[1] * Math.PI / 180)));
    coords.push([lng, lat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
