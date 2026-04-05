/* ═══════════════════════════════════════════════
   AETHER MONITOR — Smoke Particle System
   Canvas 2D overlay synced with MapLibre GL map.
   Particles scale with zoom so they stick to the map.
   ═══════════════════════════════════════════════ */

const BASE_ZOOM = 3.6; // default zoom — particles are tuned for this level

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.emitters = new Map();
    this.running = false;
    this.frameId = null;
    this.frameCount = 0;
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
  }

  updateCity(name, aqi, color, lngLat) {
    if (!this.emitters.has(name)) {
      this.emitters.set(name, new CityEmitter(name, aqi, color, lngLat));
    } else {
      const e = this.emitters.get(name);
      e.lngLat = lngLat;
      e.setAQI(aqi, color);
    }
  }

  clearAll() {
    this.emitters.clear();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _loop() {
    if (!this.running) return;
    this.frameCount++;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!glMap) {
      this.frameId = requestAnimationFrame(() => this._loop());
      return;
    }

    // Zoom-dependent scale: particles grow/shrink with the map
    const zoom = glMap.getZoom();
    const zoomScale = Math.pow(2, zoom - BASE_ZOOM);

    // Project emitter centers to screen
    this.emitters.forEach(emitter => {
      const pt = glMap.project(emitter.lngLat);
      emitter.screenX = pt.x;
      emitter.screenY = pt.y;
    });

    // Tick geodome shared rotation
    geodomeTick();

    // Draw geodomes first (under smoke)
    this.emitters.forEach(emitter => {
      if (emitter.aqi > 0) {
        const domeSize = Math.max(10, emitter._cfg().size * 3) * zoomScale;
        drawGeodome(this.ctx, emitter.screenX, emitter.screenY, domeSize, emitter.color);
      }
    });

    // Draw smoke particles on top
    this.emitters.forEach(emitter => {
      emitter.update(this.frameCount);
      emitter.render(this.ctx, zoomScale);
    });

    this.frameId = requestAnimationFrame(() => this._loop());
  }
}

// ── PER-CITY EMITTER ─────────────────────────────────────────────────────────

class CityEmitter {
  constructor(name, aqi, color, lngLat) {
    this.name = name;
    this.aqi = aqi;
    this.color = color;
    this.lngLat = lngLat;
    this.screenX = 0;
    this.screenY = 0;
    this.particles = [];
    this._parsedColor = null;
    this._updateParsedColor(color);
  }

  setAQI(aqi, color) {
    if (aqi !== this.aqi || color !== this.color) {
      this.aqi = aqi;
      this.color = color;
      this._updateParsedColor(color);
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

    const emitPerFrame = Math.max(1, Math.ceil(cfg.maxCount / 90));
    for (let i = 0; i < emitPerFrame; i++) {
      if (this.particles.length < cfg.maxCount) {
        this.particles.push(this._spawn(cfg));
      }
    }

    const t = frame * 0.012;
    this.particles = this.particles.filter(p => {
      p.ox += p.vx + Math.sin(t + p.phase) * 0.2;
      p.oy += p.vy;
      p.vy += 0.005;
      p.size += 0.05;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  _spawn(cfg) {
    const spread = 14 + (this.aqi / 10);
    return {
      ox:    (Math.random() - 0.5) * spread,
      oy:    -Math.random() * 4,
      vx:    (Math.random() - 0.5) * 0.7,
      vy:    -(cfg.speed * (0.6 + Math.random() * 0.5)),
      size:  cfg.size * (0.8 + Math.random() * 1.4),
      life:  0.8 + Math.random() * 0.4,
      decay: 0.005 + Math.random() * 0.005,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: cfg.opacity,
    };
  }

  render(ctx, zoomScale) {
    if (this.particles.length === 0 || this.aqi <= 0) return;
    const { r, g, b } = this._parsedColor;
    const sx = this.screenX;
    const sy = this.screenY;

    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life * p.baseOpacity);
      if (alpha < 0.008) return;

      // Scale offsets + size by zoom so smoke sticks to the map
      const px = sx + p.ox * zoomScale;
      const py = sy + p.oy * zoomScale;
      const ps = p.size * zoomScale;

      const grad = ctx.createRadialGradient(px, py, 0, px, py, ps);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, ps, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
