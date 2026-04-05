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
    this.frameId = null;
    this.frameCount = 0;
    this.transform = { k: 1, x: 0, y: 0 };
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
    this.canvas.width = w;
    this.canvas.height = h;
    // Update emitter positions after resize (called from map.js)
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

  _loop() {
    if (!this.running) return;
    this.frameCount++;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.k, this.transform.k);

    this.emitters.forEach(emitter => {
      emitter.update(this.frameCount);
      emitter.render(this.ctx);
    });

    this.ctx.restore();

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
      // Lateral drift via sine wave (simulates air currents)
      p.x += p.vx + Math.sin(t + p.phase) * 0.12;
      p.y += p.vy;
      // Slight deceleration as particle rises (buoyancy effect)
      p.vy += 0.004;
      // Particles expand slightly as they cool
      p.size += 0.012;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  _spawn(cfg, frame) {
    // Emit from a small spread around city center
    const spread = 5 + (this.aqi / 50);
    return {
      x:     this.x + (Math.random() - 0.5) * spread,
      y:     this.y - Math.random() * 4,
      vx:    (Math.random() - 0.5) * 0.25,
      vy:    -(cfg.speed * (0.4 + Math.random() * 0.8)),
      size:  cfg.size * (0.4 + Math.random() * 0.8),
      life:  0.7 + Math.random() * 0.3,
      decay: 0.004 + Math.random() * 0.007,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: cfg.opacity,
    };
  }

  render(ctx) {
    if (this.particles.length === 0) return;
    const { r, g, b } = this._parsedColor;

    ctx.save();

    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life * p.baseOpacity);
      if (alpha < 0.008) return;

      // Soft radial gradient per particle for smoky look
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
