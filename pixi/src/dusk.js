/**
 * 「傍晚 1」质感基准（docs/art/quality_ref_dusk_1.png）
 * 环境暖色轻微压暗，地面彩色光斑；角色层不加压暗滤镜。
 */
import { Container, Graphics, ColorMatrixFilter, Sprite, Texture } from '../vendor/pixi.min.mjs';
import { WORLD_W, WORLD_H } from './config.js';

/** 楼房灯箱 / 路灯 — 世界坐标，y 为灯源，光斑落在脚下方 */
export const DUSK_LAMPS = [
  { x: 180, y: 120, poolX: 200, poolY: 380, r: 95, ry: 42, col: 0xffc860, core: 0xfff0b0 },
  { x: WORLD_W - 160, y: 100, poolX: WORLD_W - 220, poolY: 420, r: 110, ry: 48, col: 0xffa848, core: 0xffe090 },
  { x: 520, y: 80, poolX: 480, poolY: 350, r: 75, ry: 34, col: 0xffd070, core: 0xfff4c8 },
  { x: 920, y: 90, poolX: 960, poolY: 520, r: 88, ry: 40, col: 0x88c8ff, core: 0xc8e8ff },
  { x: WORLD_W - 400, y: 70, poolX: WORLD_W - 360, poolY: 300, r: 70, ry: 32, col: 0xff9060, core: 0xffc8a0 },
];

function makeHaloTexture(renderer, radius, innerColor, outerAlpha) {
  const g = new Graphics();
  const steps = 8;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    g.circle(0, 0, radius * t).fill({ color: innerColor, alpha: outerAlpha * t * t });
  }
  const canvas = document.createElement('canvas');
  const size = radius * 2 + 4;
  canvas.width = canvas.height = size;
  // 用 Graphics 直接导出较麻烦，改用径向渐变 canvas
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, radius);
  grd.addColorStop(0, `rgba(255, 240, 180, ${outerAlpha})`);
  grd.addColorStop(0.45, `rgba(255, 200, 100, ${outerAlpha * 0.35})`);
  grd.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  g.destroy();
  return Texture.from(canvas);
}

/** 构建分层的傍晚场景容器 */
export function buildDuskLayers(renderer) {
  const graded = new Container();
  graded.label = 'envGraded';

  const cm = new ColorMatrixFilter();
  // 轻微压暗 + 暖色偏黄（仍保持明亮可读）
  cm.brightness(0.9, false);
  cm.contrast(1.06, false);
  cm.saturate(1.12, false);
  cm.hue(12, false);
  graded.filters = [cm];

  const groundGlow = new Container();
  groundGlow.label = 'groundGlow';
  const haloTex = makeHaloTexture(renderer, 64, 0xfff0c0, 0.55);

  for (const L of DUSK_LAMPS) {
    const pool = new Sprite(haloTex);
    pool.anchor.set(0.5, 0.5);
    pool.x = L.poolX;
    pool.y = L.poolY;
    pool.scale.set(L.r / 64, L.ry / 64);
    pool.tint = L.col;
    pool.alpha = 0.72;
    pool.blendMode = 'add';
    groundGlow.addChild(pool);

    const lamp = new Graphics();
    lamp.circle(L.x, L.y, 6).fill({ color: L.core, alpha: 0.95 });
    lamp.circle(L.x, L.y, 18).fill({ color: L.col, alpha: 0.35 });
    lamp.blendMode = 'add';
    groundGlow.addChild(lamp);
  }

  // 地面远景暖雾（仅环境）
  const haze = new Graphics();
  haze.ellipse(WORLD_W * 0.5, WORLD_H * 0.55, WORLD_W * 0.55, WORLD_H * 0.35).fill({
    color: 0xffa858,
    alpha: 0.06,
  });
  haze.blendMode = 'screen';

  const actors = new Container();
  actors.label = 'actorsBright';

  const rimLights = new Container();
  rimLights.label = 'rimAdd';
  const rimTex = makeHaloTexture(renderer, 48, 0xffe8c0, 0.4);

  return { graded, groundGlow, haze, actors, rimLights, rimTex, envFilter: cm };
}

/** 角色边缘暖光（加色，不压暗本体） */
export function attachRimLight(rimLights, rimTex, x, y, behind) {
  const s = new Sprite(rimTex);
  s.anchor.set(0.5, 0.85);
  s.x = x;
  s.y = y - 8;
  s.alpha = 0.35;
  s.blendMode = 'add';
  s.scale.set(1.1, 0.9);
  behind.addChild(s);
  return s;
}

/** 傍晚地面分区：暖色块 + 冷色霓虹区 */
export function paintGroundZones(layer) {
  const zones = new Graphics();
  zones.rect(60, 120, WORLD_W * 0.45, WORLD_H - 180).fill({ color: 0xffc878, alpha: 0.035 });
  zones.rect(WORLD_W * 0.5, 200, WORLD_W * 0.42, WORLD_H - 220).fill({ color: 0xff9858, alpha: 0.028 });
  zones.ellipse(WORLD_W * 0.78, WORLD_H * 0.55, 220, 140).fill({ color: 0x88b8ff, alpha: 0.025 });
  zones.blendMode = 'screen';
  layer.addChild(zones);
}
