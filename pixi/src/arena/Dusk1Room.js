/**
 * 傍晚1 围合竞技场：分区地面 + 顶/侧/矮墙/前景栏杆（对齐 room_mock）
 */
import { Container, Graphics, Sprite, TilingSprite, Texture } from '../../vendor/pixi.min.mjs';
import { WORLD_W, WORLD_H, EDGE, VIEW_W, VIEW_H } from '../config.js';
import { camClamp } from './ArenaRoom.js';

function addSprite(parent, catalog, key, x, y, opts = {}) {
  const built = catalog.makeSprite(key, opts.state);
  if (!built) return null;
  const s = new Sprite(built.texture);
  s.anchor.set(built.anchor[0], built.anchor[1]);
  s.scale.set(built.scale * (opts.scaleMul ?? 1));
  s.x = x;
  s.y = y;
  if (opts.alpha != null) s.alpha = opts.alpha;
  if (opts.zIndex != null) s.zIndex = opts.zIndex;
  parent.addChild(s);
  return s;
}

/** 可走区上沿矮墙：wall_top 贴图平铺（约 40–60px 高）+ 两端收口柱 + 薄阴影 */
function addPlayFrontierWall(edgesFront, edgesBack, catalog, playTop, topSeq) {
  const py = playTop.y ?? 198;
  const px0 = playTop.x0 ?? 72;
  const px1 = playTop.x1 ?? 1328;
  const displayH = playTop.displayH ?? 52;
  const pScale = displayH / 303;
  const pSeq = playTop.sequence || topSeq;
  const span = px1 - px0;

  const shadow = new Graphics();
  shadow.ellipse((px0 + px1) * 0.5, py + 4, span * 0.48, 7).fill({ color: 0x000000, alpha: 0.26 });
  shadow.zIndex = py - 4;
  edgesBack.addChild(shadow);

  const pillar = (x) => {
    addSprite(edgesFront, catalog, 'walls/wall_top_c.webp', x, py, {
      scaleMul: pScale * 1.12,
      zIndex: py + 2,
    });
  };
  pillar(px0 + 6);
  pillar(px1 - 6);

  tileTopRow(edgesFront, catalog, py, px0 + 34, px1 - 34, pSeq, pScale);
}

function tileTopRow(parent, catalog, y, x0, x1, sequence, scaleMul = 1) {
  const sprites = [];
  let x = x0;
  let i = 0;
  let guard = 0;
  while (x < x1 && guard++ < 48) {
    const piece = sequence[i % sequence.length];
    const key = `walls/wall_top_${piece}.webp`;
    const meta = catalog.index[key];
    const tex = catalog.textures[key];
    if (!tex || !meta) break;
    const sc = (meta.displayScale ?? 1) * scaleMul;
    const w = meta.w * sc;
    const s = new Sprite(tex);
    s.anchor.set(0, 1);
    s.x = x;
    s.y = y;
    s.scale.set(sc);
    s.cullable = false;
    parent.addChild(s);
    sprites.push(s);
    x += w - 2;
    i++;
  }
  return sprites;
}

function tileSideColumn(parent, catalog, side, x, y0, y1) {
  const seq = ['a', 'b'];
  const sprites = [];
  let y = y0;
  let i = 0;
  let guard = 0;
  while (y < y1 && guard++ < 24) {
    const piece = seq[i % seq.length];
    const key = `walls/wall_side_${side}_${piece}.webp`;
    const meta = catalog.index[key];
    const tex = catalog.textures[key];
    if (!tex || !meta) break;
    const h = meta.h * (meta.displayScale ?? 1);
    const s = new Sprite(tex);
    if (side === 'left') {
      s.anchor.set(0, 0);
      s.x = x;
    } else {
      s.anchor.set(1, 0);
      s.x = x;
    }
    s.y = y;
    s.scale.set(meta.displayScale ?? 1);
    s.cullable = false;
    parent.addChild(s);
    sprites.push(s);
    y += h - 4;
    i++;
  }
  return sprites;
}

function tileRepeatX(parent, catalog, key, y, x0, x1, opts = {}) {
  const meta = catalog.index[key];
  const tex = catalog.textures[key];
  if (!tex || !meta) return [];
  const scaleMul = opts.scaleMul ?? 1;
  const alpha = opts.alpha ?? 1;
  const sprites = [];
  const w = meta.w * (meta.displayScale ?? 1) * scaleMul;
  let x = x0;
  while (x < x1) {
    const s = new Sprite(tex);
    s.anchor.set(0, 1);
    s.x = x;
    s.y = y;
    s.scale.set((meta.displayScale ?? 1) * scaleMul);
    s.alpha = alpha;
    s.cullable = false;
    parent.addChild(s);
    sprites.push(s);
    x += w - 3;
  }
  return sprites;
}

export function buildDusk1Room(scene, catalog) {
  const root = new Container();
  const M = EDGE;
  const padL = M.marginX;
  const padT = M.top;
  const padB = M.bottom;
  const totalW = WORLD_W + padL * 2;
  const totalH = WORLD_H + padT + padB;

  const skirtTex = catalog.tileTexture('tile_concrete_a');
  if (skirtTex) {
    const outer = new TilingSprite({ texture: skirtTex, width: totalW + 600, height: totalH + 400 });
    outer.x = -padL - 300;
    outer.y = -padT - 200;
    outer.alpha = 0.92;
    root.addChild(outer);
  }

  const floorRoot = new Container();
  for (const z of scene.floorZones || []) {
    const tex = catalog.tileTexture(z.tile);
    if (!tex) continue;
    const g = new TilingSprite({ texture: tex, width: z.w, height: z.h });
    g.x = z.x;
    g.y = z.y;
    g.alpha = z.alpha ?? 1;
    floorRoot.addChild(g);
  }
  for (const curb of scene.curbs || []) {
    const tex = catalog.tileTexture(curb.tile || 'tile_iron');
    if (!tex) continue;
    const g = new TilingSprite({ texture: tex, width: curb.w, height: curb.h });
    g.x = curb.x;
    g.y = curb.y;
    g.alpha = curb.alpha ?? 0.85;
    floorRoot.addChild(g);
  }
  root.addChild(floorRoot);

  const edgesBack = new Container();
  edgesBack.cullableChildren = false;
  const edgesFront = new Container();
  edgesFront.sortableChildren = true;
  edgesFront.cullableChildren = false;
  edgesFront.sortableChildren = true;
  const fgRails = [];
  const railY = scene.foregroundRail?.y ?? WORLD_H - 6;
  const railScale = scene.foregroundRail?.scale ?? 0.6;

  const topY = scene.walls?.topBaselineY ?? 78;
  const topSeq = scene.walls?.topSequence || ['a', 'b', 'c'];
  // 顶墙/侧墙坐标落在世界内侧，避免负坐标被视锥剔除（对照 room_mock）
  tileTopRow(edgesBack, catalog, topY, -48, WORLD_W + 48, topSeq);
  const sideTop = topY - 24;
  const sideBot = WORLD_H - 36;
  tileSideColumn(edgesBack, catalog, 'left', 6, sideTop, sideBot);
  tileSideColumn(edgesBack, catalog, 'right', WORLD_W - 6, sideTop, sideBot);

  const lowY = scene.walls?.lowBaselineY ?? WORLD_H - 58;
  tileRepeatX(edgesBack, catalog, 'walls/wall_low.webp', lowY, -48, WORLD_W + 48);

  const playTop = scene.walls?.playTopWall;
  if (playTop) {
    addPlayFrontierWall(edgesFront, edgesBack, catalog, playTop, topSeq);
  }

  for (const st of scene.structures || []) {
    const layer = st.layer === 'foreground' ? edgesFront : edgesBack;
    if (st.kind === 'platform') {
      addSprite(layer, catalog, 'walls/platform.webp', st.x, st.y);
    } else if (st.kind === 'stair_door') {
      const key = st.open ? 'walls/stair_door_open.webp' : 'walls/stair_door_closed.webp';
      addSprite(layer, catalog, key, st.x, st.y, { state: st.open ? 'open' : 'closed' });
    } else if (st.kind === 'fg_rail') {
      fgRails.push(
        ...tileRepeatX(layer, catalog, 'walls/fg_rail.webp', st.y ?? railY, st.x0 ?? -padL, st.x1 ?? WORLD_W + padL, {
          alpha: st.alpha ?? 0.95,
          scaleMul: st.scale ?? railScale,
        })
      );
    }
  }

  if (!scene.structures?.some((s) => s.kind === 'fg_rail')) {
    fgRails.push(
      ...tileRepeatX(edgesFront, catalog, 'walls/fg_rail.webp', railY, -padL, WORLD_W + padL, {
        alpha: 0.95,
        scaleMul: railScale,
      })
    );
  }

  return { root, edgesBack, edgesFront, floorRoot, fgRails, railBaselineY: railY };
}

export { camClamp };
