/** 视口 cover 裁剪后 HUD 安全区（游戏坐标 1280×720） */
import { VIEW_W, VIEW_H } from '../config.js';

const SAFE = { left: 14, top: 12, right: 14, bottom: 16 };

export function getViewInset() {
  const v = globalThis.__pixiViewInset;
  if (!v) return { left: 0, top: 0, right: 0, bottom: 0, cover: false };
  return v;
}

export function hudMetrics() {
  const ins = getViewInset();
  const cover = !!ins.cover;
  const topPad = ins.top + SAFE.top + (cover ? 38 : 8);
  const bottomPad = ins.bottom + SAFE.bottom + (cover ? 56 : 22);
  const left = ins.left + SAFE.left;
  const right = VIEW_W - ins.right - SAFE.right;
  const bottom = VIEW_H - bottomPad;
  const orbR = 34;
  return {
    hpX: left + orbR,
    hpY: topPad + orbR,
    furyX: right - orbR,
    furyY: topPad + orbR,
    barY: bottom - 8,
    bossY: topPad - 4,
  };
}
