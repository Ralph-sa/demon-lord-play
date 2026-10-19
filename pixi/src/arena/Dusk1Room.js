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

function tileTopRow(parent, catalog, y, x0, x1, sequence) {
  let x = x0;
  let i = 0;
  while (x < x1) {
    const piece = sequence[i % sequence.length];
    const key = `walls/wall_top_${piece}.png`;
    const meta = catalog.index[key];
    const tex = catalog.textures[key];
    if (!tex || !meta) break;
    const w = meta.w * (meta.displayScale ?? 1);
    const h = meta.h * (meta.displayScale ?? 1);
    const s = new Sprite(tex);
    s.anchor.set(0, 1);
    s.x = x;
    s.y = y;
    s.scale.set(meta.displayScale ?? 1);
    parent.addChild(s);
    x += w - 2;
    i++;
  }
}

function tileSideColumn(parent, catalog, side, x, y0, y1) {
  const seq = side === 'left' ? ['a', 'b'] : ['a', 'b'];
  let y = y0;
  let i = 0;
  while (y < y1) {
    const piece = seq[i % seq.length];
    const key = `walls/wall_side_${side}_${piece}.png`;
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
    parent.addChild(s);
    y += h - 4;
    i++;
  }
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
  const edgesFront = new Container();
  edgesFront.sortableChildren = true;
  const fgRails = [];
  const railY = scene.foregroundRail?.y ?? WORLD_H - 6;
  const railScale = scene.foregroundRail?.scale ?? 0.6;

  const topY = scene.walls?.topBaselineY ?? 62;
  const topSeq = scene.walls?.topSequence || ['a', 'b', 'c'];
  tileTopRow(edgesBack, catalog, topY, -padL, WORLD_W + padL, topSeq);

  const sideTop = -padT + 40;
  const sideBot = WORLD_H + padB - 40;
  tileSideColumn(edgesBack, catalog, 'left', -padL + 20, sideTop, sideBot);
  tileSideColumn(edgesBack, catalog, 'right', WORLD_W - 20, sideTop, sideBot);

  const lowY = scene.walls?.lowBaselineY ?? WORLD_H - 58;
  tileRepeatX(edgesBack, catalog, 'walls/wall_low.png', lowY, -padL, WORLD_W + padL);

  for (const st of scene.structures || []) {
    const layer = st.layer === 'foreground' ? edgesFront : edgesBack;
    if (st.kind === 'platform') {
      addSprite(layer, catalog, 'walls/platform.png', st.x, st.y);
    } else if (st.kind === 'stair_door') {
      const key = st.open ? 'walls/stair_door_open.png' : 'walls/stair_door_closed.png';
      addSprite(layer, catalog, key, st.x, st.y, { state: st.open ? 'open' : 'closed' });
    } else if (st.kind === 'fg_rail') {
      fgRails.push(
        ...tileRepeatX(layer, catalog, 'walls/fg_rail.png', st.y ?? railY, st.x0 ?? -padL, st.x1 ?? WORLD_W + padL, {
          alpha: st.alpha ?? 0.95,
          scaleMul: st.scale ?? railScale,
        })
      );
    }
  }

  if (!scene.structures?.some((s) => s.kind === 'fg_rail')) {
    fgRails.push(
      ...tileRepeatX(edgesFront, catalog, 'walls/fg_rail.png', railY, -padL, WORLD_W + padL, {
        alpha: 0.95,
        scaleMul: railScale,
      })
    );
  }

  return { root, edgesBack, edgesFront, floorRoot, fgRails, railBaselineY: railY };
}

export { camClamp };
