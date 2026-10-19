/** 视口 cover 裁剪后 HUD 安全区（游戏坐标 1280×720） */
import { VIEW_W, VIEW_H } from '../config.js';

const SAFE = { left: 12, top: 10, right: 12, bottom: 14 };

export function getViewInset() {
  const v = globalThis.__pixiViewInset;
  if (!v) return { left: 0, top: 0, right: 0, bottom: 0 };
  return v;
}

export function hudMetrics() {
  const ins = getViewInset();
  const left = ins.left + SAFE.left;
  const top = ins.top + SAFE.top;
  const right = VIEW_W - ins.right - SAFE.right;
  const bottom = VIEW_H - ins.bottom - SAFE.bottom;
  return {
    hpX: left + 46,
    hpY: top + 42,
    furyX: right - 46,
    furyY: top + 42,
    barY: bottom - 10,
    bossY: top + 8,
  };
}
