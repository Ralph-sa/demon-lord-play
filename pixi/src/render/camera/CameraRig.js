/**
 * 镜头：0.85 总览缩放 + 以竞技场中心为主的小幅跟随
 */
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, clamp, CAMERA_ZOOM, CAMERA_PAN_MAX } from '../../config.js';
import { camClamp } from '../../arena/ArenaRoom.js';

export class CameraRig {
  constructor(sceneData) {
    this.x = 0;
    this.y = 0;
    this.worldZoom = sceneData?.camera?.zoom ?? CAMERA_ZOOM;
    this.panMaxX = sceneData?.camera?.panMaxX ?? CAMERA_PAN_MAX.x;
    this.panMaxY = sceneData?.camera?.panMaxY ?? CAMERA_PAN_MAX.y;
    this.arenaCx = WORLD_W / 2;
    this.arenaCy = WORLD_H / 2;
    this.trauma = 0;
    this.traumaDecay = 1.2;
    this.maxShake = 8;
    this.lookX = 0;
    this.lookY = 0;
    this.slowMo = 1;
    this.slowMoTimer = 0;
    this._noiseT = 0;
    this.punchScale = 1;
    this._punchT = 0;
    const vw = VIEW_W / this.worldZoom;
    const vh = VIEW_H / this.worldZoom;
    this.x = this.arenaCx - vw / 2;
    this.y = this.arenaCy - vh / 2;
  }

  snapTo(x, y) {
    const ox = clamp(x - this.arenaCx, -this.panMaxX, this.panMaxX);
    const oy = clamp(y - this.arenaCy, -this.panMaxY, this.panMaxY);
    const vw = VIEW_W / this.worldZoom;
    const vh = VIEW_H / this.worldZoom;
    const c = camClamp(this.arenaCx + ox - vw / 2, this.arenaCy + oy - vh / 2, this.worldZoom);
    this.x = c.x;
    this.y = c.y;
  }

  snapOverview() {
    const vw = VIEW_W / this.worldZoom;
    const vh = VIEW_H / this.worldZoom;
    const c = camClamp(this.arenaCx - vw / 2, this.arenaCy - vh / 2 + 12, this.worldZoom);
    this.x = c.x;
    this.y = c.y;
  }

  addTrauma(amount) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  punchZoom(amount = 0.03, duration = 0.12) {
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
    const z = this.worldZoom;

    this.trauma = Math.max(0, this.trauma - this.traumaDecay * tdt);
    this._noiseT += tdt * 28;
    const shake = this.trauma * this.trauma;
    const sx = (Math.sin(this._noiseT * 1.7) + Math.sin(this._noiseT * 2.3)) * 0.5 * shake * this.maxShake;
    const sy = (Math.cos(this._noiseT * 1.9) + Math.cos(this._noiseT * 2.7)) * 0.5 * shake * this.maxShake;

    const lookAhead = 14;
    this.lookX += (vel.x * lookAhead * 0.25 - this.lookX) * (1 - Math.pow(0.001, tdt));
    this.lookY += (vel.y * lookAhead * 0.25 - this.lookY) * (1 - Math.pow(0.001, tdt));

    const ox = clamp(focus.x - this.arenaCx + this.lookX, -this.panMaxX, this.panMaxX);
    const oy = clamp(focus.y - this.arenaCy + this.lookY, -this.panMaxY, this.panMaxY);
    const vw = VIEW_W / z;
    const vh = VIEW_H / z;
    const target = camClamp(this.arenaCx + ox - vw / 2, this.arenaCy + oy - vh / 2, z);
    const lerp = 1 - Math.pow(0.0002, tdt);
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
      zoom: z * this.punchScale,
    };
  }

  applyTo(container, zoom = this.worldZoom) {
    const z = zoom * this.punchScale;
    container.pivot.set(0, 0);
    container.scale.set(z);
    container.x = -this.x * z;
    container.y = -this.y * z;
  }
}
