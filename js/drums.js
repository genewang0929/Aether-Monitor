/* ═══════════════════════════════════════════════
   AETHER MONITOR — AQI Drum Sonification
   Plays drum patterns whose density reflects AQI
   severity. Active only while dragging the
   historical timeline slider.
   ═══════════════════════════════════════════════ */

let _drumCtx = null;
let _drumTimer = null;
let _drumStep = 0;
let _drumPattern = [];

const STEP_COUNT = 8;
const LOOP_MS = 1000;        // 1-second loop
const STEP_MS = LOOP_MS / STEP_COUNT;  // 125 ms per step

// ── PATTERN TABLE ────────────────────────────────────────────────────────────
// Each pattern is 8 slots per second.  K = kick, H = hi-hat, S = snare
// Multiple letters in one slot = layered hits.

const DRUM_PATTERNS = [
  { max:  10, steps: ['K','.','.','.','.','.','.','.' ] },
  { max:  20, steps: ['K','.','.','.','H','.','.','.'] },
  { max:  30, steps: ['K','.','.','.','K','.','.','.'] },
  { max:  50, steps: ['K','.','.','H','K','.','.','H'] },
  { max:  75, steps: ['K','H','.','H','K','H','.','H'] },
  { max: 100, steps: ['K','H','K','H','K','H','K','H'] },
  { max: 130, steps: ['K','H','S','H','K','H','S','H'] },
  { max: 160, steps: ['KH','S','KH','H','KS','H','KH','S'] },
  { max: Infinity, steps: ['KS','H','S','KH','KS','H','S','KH'] },
];

// ── AUDIO CONTEXT ────────────────────────────────────────────────────────────

function ensureDrumCtx() {
  if (!_drumCtx) {
    _drumCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_drumCtx.state === 'suspended') _drumCtx.resume();
}

// ── SYNTH: KICK ──────────────────────────────────────────────────────────────

function synthKick() {
  const ctx = _drumCtx;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
  oscGain.gain.setValueAtTime(0.8, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);

  // Click transient
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = 'sine';
  click.frequency.setValueAtTime(1000, t);
  click.frequency.exponentialRampToValueAtTime(50, t + 0.02);
  clickGain.gain.setValueAtTime(0.4, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  click.connect(clickGain).connect(ctx.destination);
  click.start(t);
  click.stop(t + 0.04);
}

// ── SYNTH: HI-HAT ───────────────────────────────────────────────────────────

function synthHiHat() {
  const ctx = _drumCtx;
  const t = ctx.currentTime;
  const dur = 0.06;

  const bufLen = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(hp).connect(gain).connect(ctx.destination);
  src.start(t);
}

// ── SYNTH: SNARE ─────────────────────────────────────────────────────────────

function synthSnare() {
  const ctx = _drumCtx;
  const t = ctx.currentTime;

  // Noise burst
  const dur = 0.12;
  const bufLen = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.45, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3000;
  bp.Q.value = 0.8;

  noise.connect(bp).connect(noiseGain).connect(ctx.destination);
  noise.start(t);

  // Body tone
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

// ── PATTERN LOOKUP ───────────────────────────────────────────────────────────

function patternForAQI(aqi) {
  for (const entry of DRUM_PATTERNS) {
    if (aqi <= entry.max) return entry.steps;
  }
  return DRUM_PATTERNS[DRUM_PATTERNS.length - 1].steps;
}

// ── SEQUENCER ────────────────────────────────────────────────────────────────

function playStep() {
  if (!_drumPattern.length) return;

  const slot = _drumPattern[_drumStep % STEP_COUNT];

  if (slot.includes('K')) synthKick();
  if (slot.includes('H')) synthHiHat();
  if (slot.includes('S')) synthSnare();

  _drumStep++;
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────

function drumStart(aqi) {
  ensureDrumCtx();
  _drumPattern = patternForAQI(aqi);
  _drumStep = 0;

  // Prevent double-start
  if (_drumTimer) clearInterval(_drumTimer);
  _drumTimer = setInterval(playStep, STEP_MS);

  // Play the first beat immediately
  playStep();
}

function drumUpdateAQI(aqi) {
  _drumPattern = patternForAQI(aqi);
}

function drumStop() {
  if (_drumTimer) {
    clearInterval(_drumTimer);
    _drumTimer = null;
  }
  _drumStep = 0;
}
