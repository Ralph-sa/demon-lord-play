/**
 * 屏幕后期：调色、暗角、泛光、色差、径向模糊、受伤红边
 */
import { Container, ColorMatrixFilter, BlurFilter } from '../../../vendor/pixi.min.mjs';
import { createGlFilter } from '../filters/createFilter.js';
import {
  VIGNETTE_FRAG,
  CHROMATIC_FRAG,
  RADIAL_BLUR_FRAG,
  DAMAGE_EDGE_FRAG,
} from '../filters/glsl.js';

export class PostPipeline {
  constructor(app) {
    this.app = app;
    this.shell = new Container();
    this.shell.label = 'postShell';

    this.grade = new ColorMatrixFilter();
    this._applyDuskGrade();

    this.vignette = createGlFilter(VIGNETTE_FRAG, 'vignette', {
      vigUniforms: {
        uStrength: { value: 0.35, type: 'f32' },
        uTint: { value: [0.15, 0.08, 0.02], type: 'vec3<f32>' },
      },
    });
    this.chromatic = createGlFilter(CHROMATIC_FRAG, 'chromatic', {
      chromaUniforms: {
        uAmount: { value: 0, type: 'f32' },
        uDir: { value: [1, 0], type: 'vec2<f32>' },
      },
    });
    this.radial = createGlFilter(RADIAL_BLUR_FRAG, 'radial', {
      radialUniforms: {
        uCenter: { value: [0.5, 0.5], type: 'vec2<f32>' },
        uStrength: { value: 0, type: 'f32' },
      },
    });
    this.damageEdge = createGlFilter(DAMAGE_EDGE_FRAG, 'damage-edge', {
      dmgUniforms: { uAmount: { value: 0, type: 'f32' } },
    });

    // 全屏 BlurFilter 会把整幅画面糊掉；真正 bloom 需亮部提取 RT，暂不在全屏链路上启用
    this.blur = new BlurFilter({ strength: 2, quality: 1 });

    this.toggles = {
      bloom: true,
      colorGrade: true,
      vignette: true,
      chromatic: true,
      radialDistort: true,
      damageVignette: true,
    };
    this.quality = null;
    this._rebuildFilterChain();
  }

  _applyDuskGrade() {
    this.grade.reset();
    this.grade.brightness(1.01, false);
    this.grade.contrast(1.03, false);
    this.grade.saturate(1.05, false);
    this.grade.hue(6, false);
    this.grade.tint(0xffe8d8, false);
  }

  setQuality(q) {
    this.quality = q;
    this.toggles.bloom = q.bloom;
    this.toggles.colorGrade = q.colorGrade;
    this.toggles.vignette = q.vignette;
    this.toggles.chromatic = q.chromatic;
    this.toggles.radialDistort = q.radialDistort;
    this.toggles.damageVignette = q.damageVignette;
    this._rebuildFilterChain();
  }

  setToggles(t) {
    Object.assign(this.toggles, t);
    this._rebuildFilterChain();
  }

  _rebuildFilterChain() {
    const chain = [];
    // bloom 占位：勿把 blur 挂在 shell 全屏 filters 上
    if (this.toggles.colorGrade) chain.push(this.grade);
    if (this.toggles.vignette) chain.push(this.vignette);
    if (this.toggles.chromatic) chain.push(this.chromatic);
    if (this.toggles.radialDistort) chain.push(this.radial);
    if (this.toggles.damageVignette) chain.push(this.damageEdge);
    this.shell.filters = chain.length ? chain : null;
  }

  triggerChromatic(amount = 1, dir = [1, 0.2]) {
    const u = this.chromatic.resources.chromaUniforms.uniforms;
    u.uAmount = amount;
    u.uDir = dir;
  }

  triggerRadial(cx = 0.5, cy = 0.5, strength = 1.2) {
    const u = this.radial.resources.radialUniforms.uniforms;
    u.uCenter = [cx, cy];
    u.uStrength = strength;
  }

  triggerDamageEdge(amount = 0.8) {
    this.damageEdge.resources.dmgUniforms.uniforms.uAmount = amount;
  }

  update(dt) {
    const cu = this.chromatic.resources.chromaUniforms.uniforms;
    if (cu.uAmount > 0) cu.uAmount = Math.max(0, cu.uAmount - dt * 4);
    const ru = this.radial.resources.radialUniforms.uniforms;
    if (ru.uStrength > 0) ru.uStrength = Math.max(0, ru.uStrength - dt * 3.5);
    const du = this.damageEdge.resources.dmgUniforms.uniforms;
    if (du.uAmount > 0) du.uAmount = Math.max(0, du.uAmount - dt * 1.8);
  }

  get root() {
    return this.shell;
  }
}
