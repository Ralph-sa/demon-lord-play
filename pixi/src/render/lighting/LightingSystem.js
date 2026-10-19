/**
 * 2D 光照：环境轻微暖色（≤15% 压暗）+ 加色光 RT；角色层保持 ≥0.9 亮度
 */
import { Container, Graphics, RenderTexture, Sprite, Texture, ColorMatrixFilter } from '../../../vendor/pixi.min.mjs';
import { VIEW_W, VIEW_H } from '../../config.js';
import { createGlFilter } from '../filters/createFilter.js';
import { HIT_FLASH_FRAG } from '../filters/glsl.js';

function hexRgb(hex) {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export class LightingSystem {
  constructor(renderer, sceneData, quality) {
    this.renderer = renderer;
    this.scene = sceneData;
    this.quality = quality;
    this.enabled = true;
    this.t = 0;
    this._lastDarken = 1;

    this.addRT = RenderTexture.create({ width: VIEW_W, height: VIEW_H });
    this.addStage = new Container();

    this.haloTex = this._makeHaloTex();
    this.staticSprites = [];
    this._buildStaticLights(sceneData.staticLights || []);

    this.dynamic = [];
    this.ambient = sceneData.ambient || {
      multiply: [0.94, 0.91, 0.88],
      add: [0.03, 0.02, 0.01],
      minCharacter: 0.9,
      envDarkenMax: 0.15,
    };

    this.envGrade = new ColorMatrixFilter();
    this._applyAmbientGrade(1);

    this.addOverlay = new Sprite(this.addRT);
    this.addOverlay.label = 'lightAdd';
    this.addOverlay.width = VIEW_W;
    this.addOverlay.height = VIEW_H;
    this.addOverlay.blendMode = 'add';

    this.hitFlashFilter = createGlFilter(HIT_FLASH_FRAG, 'hit-flash', {
      flashUniforms: { uFlash: { value: 0, type: 'f32' } },
    });
  }

  _applyAmbientGrade(shadowDarken = 1) {
    const maxDrop = this.ambient.envDarkenMax ?? 0.15;
    const floor = 1 - maxDrop;
    const d = Math.max(floor, shadowDarken);
    if (Math.abs(d - this._lastDarken) < 0.01) return;
    this._lastDarken = d;
    this.envGrade.reset();
    this.envGrade.brightness(0.98 * d, false);
    this.envGrade.contrast(1.02, false);
    this.envGrade.saturate(1.05, false);
    this.envGrade.hue(6, false);
  }

  attachScreenOverlays(postRoot, camWrap) {
    const idx = postRoot.getChildIndex(camWrap);
    postRoot.addChildAt(this.addOverlay, idx + 1);
  }

  _makeHaloTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return Texture.from(c);
  }

  _buildStaticLights(list) {
    for (const L of list) {
      const pool = new Sprite(this.haloTex);
      pool.anchor.set(0.5);
      pool.blendMode = 'add';
      const lamp = new Graphics();
      this.staticSprites.push({ def: L, pool, lamp });
      this.addStage.addChild(pool, lamp);
    }
  }

  setQuality(q) {
    this.quality = q;
    this.enabled = q.lighting !== false;
    this.addOverlay.visible = this.enabled;
  }

  getEnvFilter() {
    return this.enabled ? this.envGrade : null;
  }

  spawnDynamic(opts) {
    if (!this.enabled) return null;
    const max = this.quality.maxDynamicLights || 8;
    if (this.dynamic.length >= max) this.dynamic.shift();
    const light = {
      x: opts.x,
      y: opts.y,
      color: opts.color ?? 0xfff0c0,
      radius: opts.radius ?? 120,
      intensity: opts.intensity ?? 1,
      life: opts.life ?? 0.25,
      maxLife: opts.life ?? 0.25,
      pool: new Sprite(this.haloTex),
    };
    light.pool.anchor.set(0.5);
    light.pool.blendMode = 'add';
    this.addStage.addChild(light.pool);
    this.dynamic.push(light);
    return light;
  }

  flashCharacter(amount = 1) {
    this.hitFlashFilter.resources.flashUniforms.uniforms.uFlash = amount;
  }

  update(dt, cam, shadowDarken = 1) {
    this.t += dt;
    this._applyAmbientGrade(shadowDarken);
    if (!this.enabled) {
      this.addOverlay.visible = false;
      return;
    }
    this.addOverlay.visible = true;

    for (const { def: L, pool, lamp } of this.staticSprites) {
      const flick = 1 + Math.sin(this.t * 5 + L.x * 0.1) * (L.flicker || 0);
      const px = L.poolX ?? L.x;
      const py = L.poolY ?? L.y + 40;
      pool.position.set(px - cam.x, py - cam.y);
      pool.scale.set((L.radius / 64) * flick, ((L.ry || L.radius) / 64) * flick);
      const rgb = hexRgb(L.color);
      pool.tint = (Math.floor(rgb.r * 255) << 16) | (Math.floor(rgb.g * 255) << 8) | Math.floor(rgb.b * 255);
      pool.alpha = (L.intensity ?? 0.5) * flick;
      lamp.clear();
      const sx = L.x - cam.x;
      const sy = L.y - cam.y;
      if (sx > -20 && sx < VIEW_W + 20 && sy > -20 && sy < VIEW_H * 0.32) {
        lamp.roundRect(sx - 6, sy - 10, 12, 18, 2).fill({ color: 0x2a2520, alpha: 0.85 });
        lamp.circle(sx, sy - 2, 6).fill({ color: 0xfff8e0, alpha: 0.95 });
        lamp.blendMode = 'normal';
      }
    }

    for (let i = this.dynamic.length - 1; i >= 0; i--) {
      const d = this.dynamic[i];
      d.life -= dt;
      if (d.life <= 0) {
        d.pool.destroy();
        this.dynamic.splice(i, 1);
        continue;
      }
      const k = d.life / d.maxLife;
      d.pool.position.set(d.x - cam.x, d.y - cam.y);
      d.pool.scale.set((d.radius / 64) * k, (d.radius / 64) * k);
      d.pool.tint = d.color;
      d.pool.alpha = d.intensity * k;
    }

    this.renderer.render({ container: this.addStage, target: this.addRT, clear: true });
    this.addOverlay.texture = this.addRT;
  }

  decayFlash(dt) {
    const u = this.hitFlashFilter.resources.flashUniforms.uniforms;
    if (u.uFlash > 0) u.uFlash = Math.max(0, u.uFlash - dt * 6);
  }
}
