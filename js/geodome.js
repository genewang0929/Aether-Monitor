/* ═══════════════════════════════════════════════
   AETHER MONITOR — Geodome City Marker
   Draws a rotating 3D geodome at each city.
   Color tinted by AQI. Rendered on overlay canvas.
   ═══════════════════════════════════════════════ */

const GEO = (() => {
  const NLON = 12;
  const LAT_DEG = [90, 60, 30, 0];
  const OFFSETS = [0, 0, Math.PI / NLON, 0];
  const FOV = 5;

  // Build vertices
  const V = [];
  const RS = [];
  RS.push(V.length);
  V.push([0, 1, 0]); // apex
  for (let r = 1; r < LAT_DEG.length; r++) {
    RS.push(V.length);
    const phi = LAT_DEG[r] * Math.PI / 180;
    const off = OFFSETS[r];
    for (let i = 0; i < NLON; i++) {
      const th = off + (i / NLON) * 2 * Math.PI;
      V.push([Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th)]);
    }
  }

  // Build edges
  const E = [];
  for (let i = 0; i < NLON; i++) E.push([0, RS[1] + i]); // apex to first ring
  for (let r = 1; r < LAT_DEG.length; r++) {
    const s = RS[r];
    for (let i = 0; i < NLON; i++) E.push([s + i, s + (i + 1) % NLON]); // ring edges
  }
  // Cross edges between rings
  [[1, 0], [2, 1]].forEach(([r, fwd]) => {
    const s1 = RS[r], s2 = RS[r + 1];
    for (let i = 0; i < NLON; i++) {
      E.push([s1 + i, s2 + i]);
      E.push([s1 + i, s2 + (fwd ? (i + 1) % NLON : (i - 1 + NLON) % NLON)]);
    }
  });

  return { V, E, FOV };
})();

// Shared rotation state
let _geoRot = 0;
let _geoPulse = 0;

function geodomeTick() {
  _geoRot += 0.004;
  _geoPulse += 0.025;
}

// Parse hex color to {r,g,b}
function _parseHex(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * Draw a geodome at (cx, cy) on the given canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  - screen X center
 * @param {number} cy  - screen Y center
 * @param {number} scale - radius in pixels (e.g. 16)
 * @param {string} hexColor - AQI color like '#f59e0b'
 */
function drawGeodome(ctx, cx, cy, scale, hexColor) {
  const { V, E, FOV } = GEO;
  const { r: cr, g: cg, b: cb } = _parseHex(hexColor);
  const S = scale;
  const cr2 = Math.cos(_geoRot), sr2 = Math.sin(_geoRot);
  const gp = 0.8 + Math.sin(_geoPulse) * 0.2;

  // Project vertex
  function proj(v) {
    const x = v[0] * cr2 - v[2] * sr2;
    const z = v[0] * sr2 + v[2] * cr2;
    const y = v[1];
    const d = FOV + z;
    return { px: cx + (x * S * FOV) / d, py: cy - (y * S * FOV) / d, z };
  }

  const pts = V.map(v => proj(v));

  // Ground glow ellipse
  const grd = ctx.createRadialGradient(cx, cy + 2, 0, cx, cy + 2, S * 0.8);
  grd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.35 * gp})`);
  grd.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.1 * gp})`);
  grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.save();
  ctx.scale(1, 0.27);
  ctx.beginPath();
  ctx.arc(cx, (cy + 2) / 0.27, S * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.restore();

  // Sort edges back-to-front
  const sorted = E.map(([a, b]) => ({ a, b, mz: (pts[a].z + pts[b].z) * 0.5 }))
    .sort((x, y) => y.mz - x.mz);

  // Draw edges
  sorted.forEach(({ a, b, mz }) => {
    const pa = pts[a], pb = pts[b];
    const t = Math.max(0, Math.min(1, (-mz + 1.2) / 2.2));
    const alpha = mz < 0 ? 0.3 + t * 0.55 : Math.max(0.04, 0.3 - mz * 0.28);
    const lw = mz < -0.35 ? 1.2 : mz < 0.3 ? 0.7 : 0.35;
    // Tint edges with AQI color
    const er = Math.round(cr * 0.4 + cr * 0.6 * t);
    const eg = Math.round(cg * 0.4 + cg * 0.6 * t);
    const eb = Math.round(cb * 0.4 + cb * 0.6 * t);
    ctx.beginPath();
    ctx.moveTo(pa.px, pa.py);
    ctx.lineTo(pb.px, pb.py);
    ctx.strokeStyle = `rgba(${er},${eg},${eb},${alpha})`;
    ctx.lineWidth = lw;
    ctx.stroke();
  });

  // Apex glow
  const apex = pts[0];
  const ag = ctx.createRadialGradient(apex.px, apex.py, 0, apex.px, apex.py, S * 0.12);
  ag.addColorStop(0, `rgba(${Math.min(255, cr + 80)},${Math.min(255, cg + 80)},${Math.min(255, cb + 80)},${0.5 * gp})`);
  ag.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.beginPath();
  ctx.arc(apex.px, apex.py, S * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = ag;
  ctx.fill();

  // Apex dot
  ctx.beginPath();
  ctx.arc(apex.px, apex.py, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${Math.min(255, cr + 120)},${Math.min(255, cg + 120)},${Math.min(255, cb + 120)},${0.8 * gp})`;
  ctx.fill();
}
