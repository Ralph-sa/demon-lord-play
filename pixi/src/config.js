/** 古惑仔成魔 · PixiJS 样板房常量 */
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_W = 1400;
export const WORLD_H = 860;

/** 世界外楼房留白（与 Canvas 原型一致思路，略缩小以适配 1400×860） */
/** 与 Canvas 原型 EDGE_M 一致，镜头可看到外围楼房 */
export const EDGE = { marginX: 300, top: 340, bottom: 240 };

export const DISPLAY_H = {
  hero: 130,
  cultivator: 143,
  taoist: 125,
  monk: 109,
  paladin: 130,
};

export const ENEMY_TYPES = ['cultivator', 'taoist', 'monk', 'paladin'];

export const SKILLS = {
  fist: {
    wind: 0.07,
    rec: 0.16,
    dmg: [14, 16, 34],
    range: 78,
    arc: 1.6,
    kb: [30, 30, 260],
    gain: 7,
  },
  sweep: {
    cost: 30,
    wind: 0.22,
    rec: 0.3,
    dmg: 70,
    range: 160,
    arc: 2.6,
    kb: 160,
  },
};

export const ENEMY_DEF = {
  cultivator: { hp: 40, speed: 95, dmg: 10, ai: 'rush', r: 14, reach: 46, wind: 0.5 },
  taoist: { hp: 34, speed: 60, dmg: 7, ai: 'ranged', r: 14, range: 280, cd: 2.6, wind: 0.6 },
  monk: { hp: 50, speed: 55, dmg: 5, ai: 'healer', r: 15, cd: 3, wind: 0.8 },
  paladin: { hp: 150, speed: 45, dmg: 18, ai: 'shield', r: 18, reach: 56, wind: 0.8 },
};

import { RENDER_QUALITY } from './render/qualityPresets.js';

/** 画质档位（与 render/qualityPresets 同步） */
export const QUALITY = RENDER_QUALITY;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
