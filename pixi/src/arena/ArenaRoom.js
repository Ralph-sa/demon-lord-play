/**
 * Hades 式单屏围合竞技场：中央可走地面 + 四周边界切片（对齐 Canvas 原型 drawEdges）
 */
import { Container, Graphics, Sprite, TilingSprite, Texture } from '../../vendor/pixi.min.mjs';
import { WORLD_W, WORLD_H, EDGE, VIEW_W, VIEW_H } from '../config.js';

function tileX(parent, image, y0, displayH, x0, x1) {
  if (!image) return;
  const tex = Texture.from(image);
  const sliceW = tex.width * (displayH / tex.height);
  let i = 0;
  for (let x = x0; x < x1; x += sliceW - 1, i++) {
    const s = new Sprite(tex);
    s.height = displayH;
    s.width = sliceW;
    s.y = y0;
    if (i % 2) {
      s.scale.x = -1;
      s.x = x + sliceW;
    } else {
      s.x = x;
    }
    parent.addChild(s);
  }
}

function tileY(parent, image, x0, displayW, y0, y1, flip) {
  if (!image) return;
  const tex = Texture.from(image);
  const sliceH = tex.height * (displayW / tex.width);
  for (let y = y0; y < y1; y += sliceH - 2) {
    const s = new Sprite(tex);
    s.width = displayW;
    s.height = sliceH;
    s.x = x0;
    s.y = y;
    if (flip) {
      s.scale.x = -1;
      s.x = x0 + displayW;
    }
    parent.addChild(s);
  }
}

export function buildArenaRoom(groundImage, edges) {
  const root = new Container();
  const M = EDGE;

  const floorTex = groundImage ? Texture.from(groundImage) : null;
  const padL = M.marginX;
  const padT = M.top;
  const padB = M.bottom;
  const totalW = WORLD_W + padL * 2;
  const totalH = WORLD_H + padT + padB;

  if (floorTex) {
    const tile = new TilingSprite({ texture: floorTex, width: totalW, height: totalH });
    tile.x = -padL;
    tile.y = -padT;
    root.addChild(tile);
  } else {
    const g = new Graphics();
    g.rect(-padL, -padT, totalW, totalH).fill(0x8a8078);
    root.addChild(g);
  }

  // 战斗区内轻微材质变化（不超过 8% 暗化）
  const playTint = new Graphics();
  playTint.rect(0, 0, WORLD_W, WORLD_H).fill({ color: 0x000000, alpha: 0.04 });
  root.addChild(playTint);

  const edgesBack = new Container();
  const edgesFront = new Container();
  edgesFront.sortableChildren = true;

  if (edges) {
    const sw = edges.sideW;
    const th = edges.topH;
    const bh = edges.bottomH;
    if (edges.side) {
      tileY(edgesBack, edges.side, -padL - sw + padL + 60, sw, -padT, WORLD_H + padB, false);
      tileY(edgesBack, edges.side, WORLD_W - 60, sw, -padT, WORLD_H + padB, true);
    }
    if (edges.top) {
      tileX(edgesBack, edges.top, 60 - th, th, -padL, WORLD_W + padL);
    }
    if (edges.bottom) {
      tileX(edgesFront, edges.bottom, WORLD_H - 70, bh, -padL, WORLD_W + padL);
    }
  }

  // 外延填充：防止镜头看到空白
  const skirt = new Graphics();
  skirt.rect(-padL - 400, -padT - 200, totalW + 800, totalH + 400).fill(0x7a7068);
  if (floorTex) {
    const outer = new TilingSprite({ texture: floorTex, width: totalW + 800, height: totalH + 400 });
    outer.x = -padL - 400;
    outer.y = -padT - 200;
    outer.alpha = 0.85;
    root.addChildAt(outer, 0);
  } else {
    root.addChildAt(skirt, 0);
  }

  return { root, edgesBack, edgesFront };
}

export function camClamp(camX, camY, zoom = 1, scene = null) {
  const M = EDGE;
  const vw = VIEW_W / zoom;
  const vh = VIEW_H / zoom;
  const minX = -M.marginX * 0.5;
  const maxX = WORLD_W + M.marginX * 0.5 - vw;
  const topBase = scene?.walls?.topBaselineY ?? 78;
  const topH = scene?.walls?.topDisplayH ?? 303;
  const playTopY = scene?.walls?.playTopWall?.y ?? scene?.play?.y ?? 198;
  const playTopScale = scene?.walls?.playTopWall?.scale ?? 0.62;
  const playTopH = topH * playTopScale;
  const ins = globalThis.__pixiViewInset || {};
  const cropTop = ins.cover ? ins.top || 0 : 0;
  const cropBottom = ins.cover ? ins.bottom || 0 : 0;
  let minY = Math.min(topBase - topH - 56, playTopY - playTopH - 80);
  let maxY = WORLD_H - vh + 48;
  if (cropTop > 0) {
    maxY = Math.min(maxY, playTopY - playTopH - cropTop - 8);
  }
  if (cropBottom > 0) {
    minY = Math.max(minY, playTopY - playTopH - 40);
  }
  return {
    x: Math.max(minX, Math.min(maxX, camX)),
    y: Math.max(minY, Math.min(maxY, camY)),
  };
}

/** 总览镜头：完整顶墙入画（约 28%–36% 画面高度） */
export function overviewCamY(scene) {
  const topBase = scene?.walls?.topBaselineY ?? 78;
  const topH = scene?.walls?.topDisplayH ?? 303;
  return topBase - topH - 28;
}
