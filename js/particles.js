/* ═══════════════════════════════════════════════
   AETHER MONITOR — Smoke Particle System
   Canvas 2D API with per-city emitters.
   ═══════════════════════════════════════════════ */

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.emitters = new Map();  // cityName → CityEmitter
    this.running = false;
    this.frameId = null;
    this.frameCount = 0;
    this.transform = { k: 1, x: 0, y: 0 };
    
    this.textureCache = {};
    
    // Auto-detect resolution for Retina screens
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${canvas.width}px`;
    this.canvas.style.height = `${canvas.height}px`;
    this.canvas.width *= this.dpr;
    this.canvas.height *= this.dpr;
  }

  start() {
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  resize(w, h) {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
  }

  // Called by map.js when city data updates
  updateCity(name, x, y, aqi, color) {
    if (!this.emitters.has(name)) {
      this.emitters.set(name, new CityEmitter(name, x, y, aqi, color));
    } else {
      const e = this.emitters.get(name);
      e.x = x;
      e.y = y;
      e.setAQI(aqi, color);
    }
  }

  removeCity(name) {
    this.emitters.delete(name);
  }

  clearAll() {
    this.emitters.clear();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setTransform(transform) {
    this.transform = transform;
  }

  getTexture(color) {
    if (this.textureCache[color]) return this.textureCache[color];

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    
    // Parse color to rgba
    const dummy = document.createElement('div');
    dummy.style.color = color;
    document.body.appendChild(dummy);
    const rgb = getComputedStyle(dummy).color; // e.g. "rgb(255, 0, 0)"
    document.body.removeChild(dummy);
    
    const rgba = rgb.replace('rgb', 'rgba').replace(')', ', 0.8)');
    const rgbaFade = rgba.replace('0.8)', '0)');

    grad.addColorStop(0, rgba);
    grad.addColorStop(0.4, rgba.replace('0.8)', '0.3)'));
    grad.addColorStop(1, rgbaFade);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    this.textureCache[color] = canvas;
    return canvas;
  }

  _loop() {
    if (!this.running) return;
    this.frameCount++;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { x, y, k } = this.transform;
    const dpr = this.dpr;

    this.emitters.forEach(emitter => {
      emitter.update(this.frameCount);
      const texture = this.getTexture(emitter.color);
      // Final screen coordinates in logical pixels, then multiplied by DPR
      emitter.render(this.ctx, x, y, k, texture, dpr);
    });

    this.frameId = requestAnimationFrame(() => this._loop());
  }
}

// ── PER-CITY EMITTER ──────────────────────────────────────────────────────────

class CityEmitter {
  constructor(name, x, y, aqi, color) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.aqi = aqi;
    this.color = color;
    this.particles = [];
    this._parsedColor = null;
    this._updateParsedColor(color);
  }

  setAQI(aqi, color) {
    if (aqi !== this.aqi || color !== this.color) {
      this.aqi = aqi;
      this.color = color;
      this._updateParsedColor(color);
      // Drain excess particles when AQI drops
      const cfg = this._cfg();
      if (this.particles.length > cfg.maxCount) {
        this.particles = this.particles.slice(-cfg.maxCount);
      }
    }
  }

  _updateParsedColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this._parsedColor = { r, g, b };
  }

  _cfg() {
    return getAQIParticleConfig(this.aqi);
  }

  update(frame) {
    const cfg = this._cfg();

    // Emit new particles each frame (rate-limited)
    const emitPerFrame = Math.max(1, Math.ceil(cfg.maxCount / 90));
    for (let i = 0; i < emitPerFrame; i++) {
      if (this.particles.length < cfg.maxCount) {
        this.particles.push(this._spawn(cfg, frame));
      }
    }

    // Update + filter dead particles
    const t = frame * 0.012;
    this.particles = this.particles.filter(p => {
      // Slightly increasingly rapid deceleration or lateral drift
      p.x += p.vx + Math.sin(t + p.phase) * 0.2;
      p.y += p.vy;
      p.vy += 0.005; // Stronger gravity drag to prevent it from flying too high
      // Particles expand dramatically as they rise
      p.size += 0.05;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  _spawn(cfg, frame) {
    // Tighter spread around city center
    const spread = 8 + (this.aqi / 15);
    return {
      x:     this.x + (Math.random() - 0.5) * spread,
      y:     this.y - Math.random() * 2,
      vx:    (Math.random() - 0.5) * 0.35, // much slower lateral drift
      vy:    -(cfg.speed * (0.3 + Math.random() * 0.3)), // much slower initial jump
      size:  cfg.size * (0.5 + Math.random() * 1.0), // slightly smaller base size
      life:  0.8 + Math.random() * 0.5,
      decay: 0.004 + Math.random() * 0.005,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: cfg.opacity,
    };
  }

  render(ctx, tx, ty, tk, texture, dpr) {
    if (this.aqi <= 0 || !texture) return;
    
    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life * p.baseOpacity);
      if (alpha < 0.01) return;

      // Logical screen coordinates
      const logicalSX = tx + p.x * tk;
      const logicalSY = ty + p.y * tk;
      const logicalSS = p.size * tk * 2;

      // Final physical pixel coordinates for the canvas buffer
      const sx = logicalSX * dpr;
      const sy = logicalSY * dpr;
      const ss = logicalSS * dpr;

      ctx.globalAlpha = alpha;
      ctx.drawImage(texture, sx - ss / 2, sy - ss / 2, ss, ss);
    });
    
    ctx.globalAlpha = 1.0;
  }
}
