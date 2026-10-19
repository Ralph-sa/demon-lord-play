/**
 * Hades 式 2D 渲染管线：光照 + 阴影 + 后期 + 镜头
 */
import { Container, ColorMatrixFilter } from '../../vendor/pixi.min.mjs';
import { RENDER_QUALITY } from './qualityPresets.js';
import { LightingSystem } from './lighting/LightingSystem.js';
import { ShadowSystem } from './shadows/ShadowSystem.js';
import { PostPipeline } from './post/PostPipeline.js';
import { CameraRig } from './camera/CameraRig.js';
import { DebugPanel } from './debug/DebugPanel.js';

export class RenderPipeline {
  constructor(app, sceneData, tier = 'high') {
    this.app = app;
    this.sceneData = sceneData;
    this.tierName = tier;
    this.quality = { ...RENDER_QUALITY[tier] };

    this.post = new PostPipeline(app);
    this.camera = new CameraRig();
    this.lighting = new LightingSystem(app.renderer, sceneData, this.quality);
    this.shadows = new ShadowSystem(sceneData, this.quality);

    this.camWrap = new Container();
    this.camWrap.label = 'camWrap';
    this.world = new Container();
    this.world.label = 'world';
    this.camWrap.addChild(this.world);

    this.actorBoost = new ColorMatrixFilter();
    const minB = sceneData.ambient?.minCharacter ?? 0.9;
    this.actorBoost.brightness(Math.max(1, minB / 0.92), false);
    this.actorBoost.contrast(1.04, false);

    this.post.root.addChild(this.camWrap);
    this.lighting.attachScreenOverlays(this.post.root, this.camWrap);

    this.debug = new DebugPanel(this, (t) => this.setTier(t));
    this._vel = { x: 0, y: 0 };
    this._actorLayer = null;
    this._envLayer = null;
  }

  mountStage(stage) {
    stage.addChild(this.post.root);
  }

  getWorld() {
    return this.world;
  }

  getShadowLayers() {
    return this.shadows.layers;
  }

  setEnvTarget(container) {
    this._envLayer = container;
  }

  setActorTarget(container) {
    this._actorLayer = container;
    container.filters = [this.actorBoost, this.lighting.hitFlashFilter];
  }

  bindCharacter(id, sprite, opts) {
    this.shadows.bindEntity(id, sprite, opts);
  }

  updateCharacterShadow(id, x, y, face) {
    this.shadows.updateEntity(id, x, y, face);
  }

  setTier(name) {
    this.tierName = name;
    this.quality = { ...RENDER_QUALITY[name] };
    this.lighting.setQuality(this.quality);
    this.shadows.setQuality(this.quality);
    this.post.setQuality(this.quality);
  }

  applyQualityOverride(partial) {
    this.quality = { ...this.quality, ...partial };
    this.lighting.setQuality(this.quality);
    this.shadows.setQuality(this.quality);
    this.post.setToggles({
      bloom: this.quality.bloom,
      colorGrade: this.quality.colorGrade,
      vignette: this.quality.vignette,
      chromatic: this.quality.chromatic,
      radialDistort: this.quality.radialDistort,
      damageVignette: this.quality.damageVignette,
    });
  }

  spawnLight(opts) {
    return this.lighting.spawnDynamic(opts);
  }

  onHeavyHit(wx, wy, screenX, screenY) {
    this.camera.addTrauma(0.35);
    this.camera.punchZoom(0.05, 0.14);
    this.camera.setSlowMo(0.55, 0.1);
    this.post.triggerChromatic(1, [1, 0.15]);
    this.post.triggerRadial(screenX / 1280, screenY / 720, 1.4);
    this.lighting.spawnDynamic({ x: wx, y: wy, radius: 140, intensity: 1.2, life: 0.2, color: 0xfff8e0 });
    this.lighting.flashCharacter(0.85);
  }

  onSweep(wx, wy) {
    this.lighting.spawnDynamic({ x: wx, y: wy, radius: 160, intensity: 0.9, life: 0.28, color: 0xffe0a0 });
    this.camera.addTrauma(0.22);
  }

  onGemBurst(wx, wy) {
    this.lighting.spawnDynamic({ x: wx, y: wy, radius: 90, intensity: 0.8, life: 0.5, color: 0x88ccff });
    this.lighting.spawnDynamic({ x: wx, y: wy, radius: 70, intensity: 0.6, life: 0.45, color: 0xc080ff });
  }

  onPlayerHurt() {
    this.post.triggerDamageEdge(0.75);
    this.post.triggerChromatic(0.6, [-0.5, 0.2]);
    this.camera.addTrauma(0.18);
  }

  setVelocity(vx, vy) {
    this._vel.x = vx;
    this._vel.y = vy;
  }

  update(dt, focus) {
    const camState = this.camera.update(dt, focus, this._vel);
    this.camera.applyTo(this.camWrap);
    const darken = this.shadows.darkenAt(focus.x, focus.y);
    this.lighting.update(dt, { x: camState.x, y: camState.y }, darken);
    this.lighting.decayFlash(dt);
    this.post.update(dt);
    return { cam: { x: camState.x, y: camState.y }, timeScale: camState.timeScale };
  }

  registerInput(canvas) {
    addEventListener('keydown', (e) => {
      if (e.key === '`') this.debug.toggle();
    });
    let taps = 0;
    let tapT = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) this.debug.toggle();
      if (e.touches.length === 1) {
        const now = performance.now();
        if (now - tapT > 400) taps = 0;
        tapT = now;
        taps++;
        if (taps >= 3) this.debug.toggle();
      }
    });
  }

  reportFps(fps) {
    this.debug.setFps(fps);
  }
}
