/* ═══════════════════════════════════════════════
   AETHER MONITOR — D3 Map + City Nodes
   ═══════════════════════════════════════════════ */

const US_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

let mapSvg, mapContentGroup, mapZoom, mapProjection, mapPath, cityGroup;
let particleSystem;
let selectedCity = null;

// ── INIT ──────────────────────────────────────────────────────────────────────

async function initMap() {
  const container = document.getElementById('map-container');
  const svgEl = document.getElementById('map-svg');
  const canvas = document.getElementById('particle-canvas');

  const { w, h } = getContainerSize(container);

  // Init SVG and Zoom
  mapZoom = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', (event) => {
      if (mapContentGroup) mapContentGroup.attr('transform', event.transform);
      if (particleSystem) particleSystem.setTransform(event.transform);
    });

  mapSvg = d3.select(svgEl)
    .attr('width', w)
    .attr('height', h)
    .call(mapZoom);

  // Init particle canvas
  canvas.width = w;
  canvas.height = h;
  particleSystem = new ParticleSystem(canvas);

  // Build projection
  mapProjection = buildProjection(w, h);
  mapPath = d3.geoPath().projection(mapProjection);

  // Load TopoJSON and render
  try {
    const us = await d3.json(US_TOPO_URL);
    renderBaseMap(us, w, h);
    addFilters();
  } catch (err) {
    console.error('[Map] Failed to load TopoJSON:', err);
  }

  // Start particle system
  particleSystem.start();

  // Resize handler (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => onResize(container, svgEl, canvas), 200);
  });

  // Tooltip mouse tracking
  svgEl.addEventListener('mousemove', (e) => {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip.classList.contains('hidden')) return;
    positionTooltip(tooltip, e.clientX, e.clientY, container);
  });

  // Click-anywhere on map background
  svgEl.addEventListener('click', (e) => {
    // Ignore clicks on city nodes (they have their own handler)
    if (e.target.closest('.city-node')) return;
    handleMapClick(e, container);
  });
}

// ── CLICK-ANYWHERE ────────────────────────────────────────────────────────────

let adHocMarker = null;

async function handleMapClick(event, container) {
  const rect = container.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;

  // Invert pixel → local group xy → [lon, lat]
  const transform = d3.zoomTransform(mapSvg.node());
  const [localX, localY] = transform.invert([px, py]);
  const coords = mapProjection.invert([localX, localY]);
  if (!coords) return; // Outside US bounds

  const [lon, lat] = coords;

  // Sanity check: rough US bounding box
  if (lat < 24 || lat > 50 || lon < -125 || lon > -66) return;

  const roundLat = Math.round(lat * 100) / 100;
  const roundLon = Math.round(lon * 100) / 100;

  // Build ad-hoc location object
  const location = {
    id: 'AD_HOC',
    name: `${roundLat}°N, ${Math.abs(roundLon)}°W`,
    state: '--',
    lat: roundLat,
    lon: roundLon,
  };

  // Remove previous ad-hoc marker
  if (adHocMarker) adHocMarker.remove();

  // Render temporary marker at click position
  adHocMarker = renderAdHocMarker(px, py, '#22d3ee');

  // Clear previous city selection
  cityGroup?.selectAll('.city-node .city-circle').attr('stroke-width', 1.5);
  selectedCity = null;
  document.querySelectorAll('.node-card').forEach(el => el.classList.remove('selected'));
  document.getElementById('sb-selected').textContent = `SELECTED: AD_HOC_${roundLat}_${Math.abs(roundLon)}`;

  // Show tooltip with loading state
  showAdHocTooltip(location, { aqi: '...', pollutant: '...' }, event);

  // Fetch AQI + Weather in parallel
  try {
    const [aqiData, weatherData] = await Promise.all([
      fetchLocationAQI(roundLat, roundLon),
      fetchWeather(location),
    ]);

    if (aqiData.aqi === null) {
      // No data for this location
      hideTooltip();
      if (adHocMarker) adHocMarker.remove();
      return;
    }

    // Update marker color based on AQI
    const color = getAQIColor(aqiData.aqi);
    if (adHocMarker) {
      adHocMarker.select('.adhoc-circle').attr('fill', color).attr('stroke', color);
      adHocMarker.select('.adhoc-glow').attr('fill', color);
    }

    // Update name with reporting area if available
    if (aqiData.reportingArea) {
      location.name = aqiData.reportingArea;
    }

    // Update tooltip with real data
    showAdHocTooltip(location, aqiData, event);

    // Trigger Gemini analysis
    triggerAnalysis(location, aqiData);

    // Zoom to ad-hoc location
    flyToPoint(location.lon, location.lat);

  } catch (err) {
    console.error('[Map] Ad-hoc click failed:', err);
    if (adHocMarker) adHocMarker.remove();
  }
}

function renderAdHocMarker(cx, cy, color) {
  if (!cityGroup) return null;

  const g = cityGroup.append('g')
    .attr('class', 'adhoc-marker')
    .attr('transform', `translate(${cx},${cy})`);

  // Glow halo
  g.append('circle')
    .attr('class', 'adhoc-glow')
    .attr('r', 12)
    .attr('fill', color)
    .attr('opacity', 0.1)
    .attr('filter', 'url(#city-glow)');

  // Main dot
  g.append('circle')
    .attr('class', 'adhoc-circle')
    .attr('r', 6)
    .attr('fill', color)
    .attr('fill-opacity', 0.9)
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('filter', 'url(#city-glow)');

  // Inner white dot
  g.append('circle')
    .attr('r', 2)
    .attr('fill', '#fff')
    .attr('opacity', 0.9);

  // Label
  g.append('text')
    .attr('x', 0)
    .attr('y', -14)
    .attr('text-anchor', 'middle')
    .attr('fill', color)
    .attr('font-family', "'Space Mono', monospace")
    .attr('font-size', '7px')
    .attr('letter-spacing', '1px')
    .attr('opacity', 0.8)
    .text('AD_HOC');

  // Ping animation
  const ping = g.append('circle')
    .attr('r', 6)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 1)
    .attr('opacity', 0)
    .node();

  if (window.gsap) {
    gsap.to(ping, {
      attr: { r: 20, opacity: 0 },
      duration: 1.5,
      repeat: 2,
      ease: 'power1.out',
      onStart: () => gsap.set(ping, { attr: { r: 6, opacity: 0.6 } }),
    });
  }

  return g;
}

function showAdHocTooltip(location, data, event) {
  const tooltip = document.getElementById('map-tooltip');
  const container = document.getElementById('map-container');

  document.getElementById('tt-id').textContent = 'AD_HOC';
  document.getElementById('tt-city').textContent = location.name.toUpperCase();
  document.getElementById('tt-aqi').textContent = data.aqi || '--';
  document.getElementById('tt-aqi').style.color = data.aqi && data.aqi !== '...' ? getAQIColor(data.aqi) : 'var(--text-secondary)';
  document.getElementById('tt-cat').textContent = data.aqi && data.aqi !== '...' ? getAQICategory(data.aqi) : 'LOADING';
  document.getElementById('tt-cat').style.color = data.aqi && data.aqi !== '...' ? getAQIColor(data.aqi) : 'var(--text-secondary)';
  document.getElementById('tt-pollutant').textContent = data.pollutant || '--';
  document.getElementById('tt-time').textContent = data.timestamp ? formatTime(new Date(data.timestamp)) : '--:--';

  tooltip.classList.remove('hidden');
  positionTooltip(tooltip, event.clientX, event.clientY, container);
}

function buildProjection(w, h) {
  return d3.geoAlbersUsa()
    .scale(w * 1.25)
    .translate([w / 2, h / 2]);
}

function getContainerSize(container) {
  return { w: container.clientWidth, h: container.clientHeight };
}

// ── BASE MAP ──────────────────────────────────────────────────────────────────

function renderBaseMap(us, w, h) {
  // Gradient background
  const defs = mapSvg.append('defs');

  // Radial glow for map center
  const radGrad = defs.append('radialGradient')
    .attr('id', 'map-bg-gradient')
    .attr('cx', '50%').attr('cy', '50%').attr('r', '60%');
  radGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0a1628').attr('stop-opacity', 1);
  radGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06091a').attr('stop-opacity', 1);

  mapSvg.append('rect')
    .attr('width', w).attr('height', h)
    .attr('fill', 'url(#map-bg-gradient)');

  // Group for zoomable elements
  mapContentGroup = mapSvg.append('g').attr('class', 'map-content');

  // State fills
  mapContentGroup.append('g').attr('class', 'states-group')
    .selectAll('path')
    .data(topojson.feature(us, us.objects.states).features)
    .join('path')
    .attr('class', 'state-path')
    .attr('d', mapPath)
    .attr('fill', '#0b1a30')
    .attr('stroke', '#1a3558')
    .attr('stroke-width', 0.6);

  // State borders (mesh)
  mapContentGroup.append('path')
    .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
    .attr('fill', 'none')
    .attr('stroke', '#1e3a5f')
    .attr('stroke-width', 0.4)
    .attr('d', mapPath);

  // Nation outline
  mapContentGroup.append('path')
    .datum(topojson.feature(us, us.objects.states))
    .attr('fill', 'none')
    .attr('stroke', '#1e3a5f')
    .attr('stroke-width', 0.8)
    .attr('d', mapPath);

  // City nodes group (rendered on top)
  cityGroup = mapContentGroup.append('g').attr('class', 'cities');
}

// ── SVG FILTERS ───────────────────────────────────────────────────────────────

function addFilters() {
  const defs = mapSvg.select('defs').empty()
    ? mapSvg.append('defs')
    : mapSvg.select('defs');

  // Glow filter for city nodes
  const glow = defs.append('filter').attr('id', 'city-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  const merge = glow.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Stronger glow for high-AQI cities
  const strongGlow = defs.append('filter').attr('id', 'city-glow-strong').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
  strongGlow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
  const merge2 = strongGlow.append('feMerge');
  merge2.append('feMergeNode').attr('in', 'blur');
  merge2.append('feMergeNode').attr('in', 'SourceGraphic');
}

// ── CITY NODES ────────────────────────────────────────────────────────────────

function renderCityNodes(aqiData) {
  if (!cityGroup) return;
  cityGroup.selectAll('*').remove();

  CONFIG.CITIES.forEach((city, idx) => {
    const projected = mapProjection([city.lon, city.lat]);
    if (!projected) return;

    const [cx, cy] = projected;
    city.x = cx;
    city.y = cy;

    const data = aqiData[city.name] || { aqi: 0, pollutant: 'PM2.5' };
    const aqi = data.aqi;
    const color = getAQIColor(aqi);
    const radius = getCityRadius(city.pop);
    const isHigh = aqi > 150;

    const g = cityGroup.append('g')
      .attr('class', 'city-node')
      .attr('data-name', city.name)
      .attr('transform', `translate(${cx},${cy})`)
      .style('cursor', 'pointer');

    // Pulse ring (for high-AQI cities)
    if (isHigh) {
      g.append('circle')
        .attr('class', 'ping-ring')
        .attr('r', radius + 2)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('opacity', 0);

      // Animate ping via GSAP if available, else CSS
      animatePing(g.select('.ping-ring').node(), radius);
    }

    // Glow halo
    g.append('circle')
      .attr('r', radius + 4)
      .attr('fill', color)
      .attr('opacity', 0.08)
      .attr('filter', 'url(#city-glow)');

    // Main city dot
    g.append('circle')
      .attr('class', 'city-circle')
      .attr('r', radius)
      .attr('fill', color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('filter', isHigh ? 'url(#city-glow-strong)' : 'url(#city-glow)');

    // Inner white dot
    g.append('circle')
      .attr('r', 2)
      .attr('fill', '#ffffff')
      .attr('opacity', 0.9);

    // NODE_XX label above city
    g.append('text')
      .attr('class', 'city-label')
      .attr('x', 0)
      .attr('y', -(radius + 8))
      .attr('text-anchor', 'middle')
      .attr('fill', color)
      .attr('font-family', "'Space Mono', monospace")
      .attr('font-size', '8px')
      .attr('letter-spacing', '1px')
      .attr('opacity', 0.7)
      .text(city.id);

    // Event handlers
    g.on('mouseenter', function (event) {
      d3.select(this).select('.city-circle')
        .attr('fill-opacity', 1)
        .attr('r', radius * 1.2);
      showTooltip(city, data, event);
    });

    g.on('mouseleave', function () {
      d3.select(this).select('.city-circle')
        .attr('fill-opacity', 0.85)
        .attr('r', radius);
      hideTooltip();
    });

    g.on('click', function (event) {
      event.stopPropagation(); // prevent ad-hoc map click
      selectCity(city, data);
    });

    // Update particle emitter
    particleSystem.updateCity(city.name, cx, cy, aqi, color);
  });
}

function updateCityNode(cityName, aqi, color) {
  const g = cityGroup?.select(`[data-name="${cityName}"]`);
  if (g?.empty()) return;

  const city = CONFIG.CITIES.find(c => c.name === cityName);
  if (!city) return;

  const radius = getCityRadius(city.pop);

  g.select('.city-circle')
    .attr('fill', color)
    .attr('stroke', color);

  g.select('text')
    .attr('fill', color);

  if (city.x && city.y) {
    particleSystem.updateCity(cityName, city.x, city.y, aqi, color);
  }
}

// ── PING ANIMATION ────────────────────────────────────────────────────────────

function animatePing(node, radius) {
  if (!node) return;

  if (window.gsap) {
    gsap.to(node, {
      attr: { r: radius * 3, opacity: 0 },
      duration: 2.5,
      repeat: -1,
      ease: 'power1.out',
      onStart: () => gsap.set(node, { attr: { r: radius, opacity: 0.7 } }),
    });
  } else {
    // CSS fallback — add class
    node.classList.add('city-ping');
  }
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────

function showTooltip(city, data, event) {
  const tooltip = document.getElementById('map-tooltip');
  const container = document.getElementById('map-container');

  document.getElementById('tt-id').textContent = city.id;
  document.getElementById('tt-city').textContent = city.name.toUpperCase();
  document.getElementById('tt-aqi').textContent = data.aqi || '--';
  document.getElementById('tt-aqi').style.color = getAQIColor(data.aqi || 0);
  document.getElementById('tt-cat').textContent = getAQICategory(data.aqi || 0);
  document.getElementById('tt-cat').style.color = getAQIColor(data.aqi || 0);
  document.getElementById('tt-pollutant').textContent = data.pollutant || '--';
  document.getElementById('tt-time').textContent = data.timestamp
    ? formatTime(new Date(data.timestamp))
    : '--:-- UTC';

  tooltip.classList.remove('hidden');
  positionTooltip(tooltip, event.clientX, event.clientY, container);
}

function hideTooltip() {
  document.getElementById('map-tooltip').classList.add('hidden');
}

function positionTooltip(tooltip, clientX, clientY, container) {
  const rect = container.getBoundingClientRect();
  const ttW = tooltip.offsetWidth || 170;
  const ttH = tooltip.offsetHeight || 140;
  const margin = 14;

  let left = clientX - rect.left + margin;
  let top = clientY - rect.top - ttH / 2;

  // Clamp within container
  if (left + ttW > rect.width) left = clientX - rect.left - ttW - margin;
  if (top < 0) top = margin;
  if (top + ttH > rect.height) top = rect.height - ttH - margin;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// ── CITY SELECTION ────────────────────────────────────────────────────────────

function selectCity(city, data) {
  // Clear previous selection
  cityGroup?.selectAll('.city-node .city-circle')
    .attr('stroke-width', 1.5);

  // Highlight selected
  cityGroup?.select(`[data-name="${city.name}"] .city-circle`)
    .attr('stroke-width', 3);

  selectedCity = city;
  if (window.APP_STATE) window.APP_STATE.selectedCity = city;

  // Update status bar
  document.getElementById('sb-selected').textContent = `SELECTED: ${city.id}_${city.name.toUpperCase().replace(/ /g, '_')}`;

  // Update nodes panel selection
  document.querySelectorAll('.node-card').forEach(el => el.classList.remove('selected'));
  const nodeCard = document.querySelector(`.node-card[data-city="${city.name}"]`);
  if (nodeCard) nodeCard.classList.add('selected');

  // Map Zoom
  flyToPoint(city.lon, city.lat);

  // Trigger Gemini analysis
  triggerAnalysis(city, data);
}

// ── MAP ZOOMING Helpers ───────────────────────────────────────────────────────

function flyToPoint(lon, lat) {
  const container = document.getElementById('map-container');
  const { w, h } = getContainerSize(container);
  
  const projected = mapProjection([lon, lat]);
  if (!projected) return;
  const [px, py] = projected;

  const scale = 4.5;
  const tx = w / 2 - px * scale;
  const ty = h / 2 - py * scale;

  mapSvg.transition()
    .duration(1200)
    .ease(d3.easeCubicOut)
    .call(
      mapZoom.transform, 
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
}

// ── RESIZE ────────────────────────────────────────────────────────────────────

function onResize(container, svgEl, canvas) {
  const { w, h } = getContainerSize(container);

  d3.select(svgEl).attr('width', w).attr('height', h);
  particleSystem.resize(w, h);

  mapProjection = buildProjection(w, h);
  mapPath = d3.geoPath().projection(mapProjection);

  // Re-render states
  mapSvg.selectAll('.state-path').attr('d', mapPath);
  mapSvg.selectAll('path').attr('d', mapPath);

  // Re-project city positions and update emitters
  CONFIG.CITIES.forEach(city => {
    const projected = mapProjection([city.lon, city.lat]);
    if (!projected) return;
    city.x = projected[0];
    city.y = projected[1];
    particleSystem.updateCity(city.name, city.x, city.y, city._aqi || 0, city._color || '#22d3ee');
  });

  // Re-render city nodes
  if (window.APP_STATE?.aqiData) {
    renderCityNodes(window.APP_STATE.aqiData);
  }
}
