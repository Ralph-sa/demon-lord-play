/**
 * 镜头：平滑跟随、前瞻、trauma 震屏（不在世界容器上使用 pivot 缩放）
 */
import { VIEW_W, VIEW_H, clamp } from '../../config.js';
import { camClamp } from '../../arena/ArenaRoom.js';

export class CameraRig {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.trauma = 0;
    this.traumaDecay = 1.2;
    this.maxShake = 10;
    this.lookX = 0;
    this.lookY = 0;
    this.slowMo = 1;
    this.slowMoTimer = 0;
    this._noiseT = 0;
    this.punchScale = 1;
    this._punchT = 0;
  }

  snapTo(x, y) {
    const c = camClamp(x - VIEW_W / 2, y - VIEW_H / 2);
    this.x = c.x;
    this.y = c.y;
  }

  addTrauma(amount) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  punchZoom(amount = 0.04, duration = 0.12) {
    this.punchScale = 1 + amount;
    this._punchT = duration;
  }

  setSlowMo(scale, duration) {
    this.slowMo = scale;
    this.slowMoTimer = duration;
  }

  update(dt, focus, vel = { x: 0, y: 0 }) {
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) this.slowMo = 1;
    }
    const tdt = dt * this.slowMo;

    this.trauma = Math.max(0, this.trauma - this.traumaDecay * tdt);
    this._noiseT += tdt * 28;
    const shake = this.trauma * this.trauma;
    const sx = (Math.sin(this._noiseT * 1.7) + Math.sin(this._noiseT * 2.3)) * 0.5 * shake * this.maxShake;
    const sy = (Math.cos(this._noiseT * 1.9) + Math.cos(this._noiseT * 2.7)) * 0.5 * shake * this.maxShake;

    const lookAhead = 42;
    this.lookX += (vel.x * lookAhead - this.lookX) * (1 - Math.pow(0.001, tdt));
    this.lookY += (vel.y * lookAhead - this.lookY) * (1 - Math.pow(0.001, tdt));

    const target = camClamp(focus.x + this.lookX - VIEW_W / 2, focus.y + this.lookY - VIEW_H / 2);
    const lerp = 1 - Math.pow(0.001, tdt);
    this.x += (target.x - this.x) * lerp;
    this.y += (target.y - this.y) * lerp;

    if (this._punchT > 0) {
      this._punchT -= tdt;
      if (this._punchT <= 0) this.punchScale = 1;
    } else {
      this.punchScale += (1 - this.punchScale) * (1 - Math.pow(0.001, tdt));
    }

    return {
      x: this.x + sx,
      y: this.y + sy,
      timeScale: this.slowMo,
      punchScale: this.punchScale,
    };
  }

  applyTo(container) {
    container.pivot.set(0, 0);
    container.scale.set(1);
    container.x = -this.x;
    container.y = -this.y;
  }
}
