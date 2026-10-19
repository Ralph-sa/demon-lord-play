/** 视口 cover 裁剪后 HUD 安全区（游戏坐标 1280×720） */
import { VIEW_W, VIEW_H } from '../config.js';

const SAFE = { left: 14, top: 12, right: 14, bottom: 16 };

export function getViewInset() {
  const v = globalThis.__pixiViewInset;
  if (!v) return { left: 0, top: 0, right: 0, bottom: 0, cover: false };
  return v;
}

export function isTouchHudLayout() {
  const ins = getViewInset();
  return !!(ins.cover || globalThis.__pixiForceTouchHud);
}

/** 触屏摇杆与按钮：贴可见区底边，避开 cover 裁切 */
export function touchControlLayout() {
  const ins = getViewInset();
  const left = ins.left + SAFE.left;
  const right = ins.right + SAFE.right;
  const bottom = ins.bottom + SAFE.bottom + 10;
  const joyX = left + 96;
  const joyY = VIEW_H - bottom - 72;
  const baseY = VIEW_H - bottom - 8;
  const rightX = VIEW_W - right - 64;
  const buttons = [
    { id: 'fist', label: '攻', x: rightX, y: baseY - 44, r: 46 },
    { id: 'dodge', label: '闪', x: rightX - 108, y: baseY - 28, r: 38 },
    { id: 'sweep', label: '技', x: rightX - 56, y: baseY - 118, r: 40 },
  ];
  return { joyX, joyY, buttons };
}

export function hudMetrics(opts = {}) {
  const ins = getViewInset();
  const cover = !!ins.cover;
  const touchLayout = opts.touchLayout ?? isTouchHudLayout();
  const topPad = ins.top + SAFE.top + (cover ? 38 : 8);
  const bottomPad = ins.bottom + SAFE.bottom + (touchLayout ? 12 : cover ? 56 : 22);
  const left = ins.left + SAFE.left;
  const right = VIEW_W - ins.right - SAFE.right;
  const bottom = VIEW_H - bottomPad;
  const orbR = 34;
  const hpX = left + orbR;
  const hpY = topPad + orbR;
  const metrics = {
    hpX,
    hpY,
    furyX: right - orbR,
    furyY: topPad + orbR,
    barY: bottom - 8,
    bossY: topPad - 4,
    touchLayout,
    compactSkills: touchLayout,
  };
  if (touchLayout) {
    metrics.skillSlots = [
      { x: hpX - 18, y: hpY + 52, w: 36, h: 28 },
      { x: hpX + 22, y: hpY + 52, w: 36, h: 28 },
      { x: hpX + 62, y: hpY + 52, w: 36, h: 28 },
    ];
  }
  return metrics;
}
