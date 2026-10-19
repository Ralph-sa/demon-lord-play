/** 从 pixi/assets/gen 加载角色素材；dusk1 场景包；进度回调 0–100 */
import { Texture, Rectangle, Graphics, RenderTexture } from '../vendor/pixi.min.mjs';
import { DISPLAY_H } from './config.js';
import { loadSceneAssets } from './assets/sceneAssets.js';
import { loadDusk1Pack } from './assets/dusk1Assets.js';

const GEN_MANIFEST = './assets/gen/manifest.json';
const ENEMY_SPRITE_TASKS = 12;

function loadImage(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function assetUrl(rel) {
  if (!rel) return null;
  if (rel.startsWith('http') || rel.startsWith('/')) return rel;
  const path = rel.startsWith('assets/') ? rel : `assets/gen/${rel}`;
  return `./${path}`;
}

function createLoadProgress(onProgress) {
  let total = 0;
  let done = 0;
  return {
    add(n = 1) {
      total += n;
    },
    tick() {
      done++;
      if (total > 0 && onProgress) onProgress(Math.min(99, Math.round((done / total) * 100)));
    },
    finish() {
      onProgress?.(100);
    },
  };
}

/** 条带精灵图 → 帧纹理数组（底部锚点 0.92 高度，与 Canvas 原型一致） */
function sliceStrip(im, meta, displayH) {
  if (!im || !meta) return null;
  const bh = meta.bodyH || meta.h;
  const s = displayH / bh;
  const frames = [];
  for (let f = 0; f < meta.frames; f++) {
    const drawW = meta.w * s;
    const drawH = meta.h * s;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(Math.ceil(drawW), 96);
    canvas.height = Math.max(Math.ceil(drawH), 10);
    const ctx = canvas.getContext('2d');
    const ay = meta.ay ?? 0.92;
    ctx.drawImage(im, f * meta.w, 0, meta.w, meta.h, (canvas.width - drawW) / 2, canvas.height * 0.92 - drawH * ay, drawW, drawH);
    frames.push(Texture.from(canvas));
  }
  return frames;
}

function vfxFrames(im, meta) {
  if (!im || !meta) return null;
  const base = Texture.from(im);
  const out = [];
  for (let f = 0; f < meta.frames; f++) {
    out.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(f * meta.w, 0, meta.w, meta.h),
      })
    );
  }
  return out;
}

/** 硬边占位：水塔 / 空调 / 杂物箱 */
function makePropTexture(kind, renderer) {
  const g = new Graphics();
  if (kind === 'tower') {
    g.roundRect(-28, -70, 56, 70, 6).fill({ color: 0x9aa8b8 });
    g.roundRect(-22, -62, 44, 50, 4).fill({ color: 0xb8c8d8 });
    g.circle(0, -78, 18).fill({ color: 0x8899aa });
    g.stroke({ width: 4, color: 0x0b0b0b });
  } else if (kind === 'ac') {
    g.roundRect(-36, -22, 72, 44, 4).fill({ color: 0xd8dce8 });
    g.rect(-30, -16, 60, 8).fill({ color: 0x8899aa });
    g.circle(28, 0, 14).fill({ color: 0x666666 });
    g.stroke({ width: 4, color: 0x0b0b0b });
  } else {
    g.roundRect(-40, -32, 80, 64, 3).fill({ color: 0xc49a6c });
    g.rect(-36, -28, 72, 8).fill({ color: 0x8a6038 });
    g.rect(-36, 8, 72, 8).fill({ color: 0x8a6038 });
    g.stroke({ width: 4, color: 0x0b0b0b });
  }
  const rt = RenderTexture.create({ width: 120, height: 120 });
  renderer.render({ container: g, target: rt });
  g.destroy();
  return rt;
}

function makeDecalTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.translate(32, 32);
  if (kind === 'crack') {
    ctx.strokeStyle = 'rgba(30,25,20,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
      ctx.stroke();
    }
  } else if (kind === 'oil') {
    ctx.fillStyle = 'rgba(20,18,15,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(50,50,55,0.7)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  return Texture.from(c);
}

export const Assets = {
  manifest: null,
  sprites: {},
  vfx: {},
  ground: null,
  edges: null,
  items: {},
  props: {},
  decals: {},
  dusk1: null,
};

export async function loadAll(renderer, onProgress) {
  const prog = createLoadProgress(onProgress);
  const M = await fetch(GEN_MANIFEST).then((r) => r.json());
  Assets.manifest = M;

  const heroMap = {
    idle: 'hero_idle',
    run: 'hero_run',
    attack: 'hero_combo',
    sweep: 'hero_sweep',
    dodge: 'hero_dodge',
    hit: 'hero_hit',
  };
  prog.add(Object.keys(heroMap).length);
  prog.add(ENEMY_SPRITE_TASKS);
  prog.add(2); // vfx punch/sweep
  prog.add(Object.keys(M._items || {}).length);
  prog.add(3); // scene ground/edges

  let dusk1KeyCount = 0;
  try {
    const duskIndex = await fetch('./assets/dusk1/index.json').then((r) => r.json());
    dusk1KeyCount = Object.keys(duskIndex).filter((k) => !k.startsWith('_') && !duskIndex[k].frameOf).length;
    prog.add(dusk1KeyCount);
  } catch (_) {
    prog.add(1);
  }

  const imgCache = {};
  const img = async (rel) => {
    if (!rel) return null;
    const url = assetUrl(rel);
    if (!imgCache[url]) {
      imgCache[url] = loadImage(url);
    }
    const im = await imgCache[url];
    prog.tick();
    return im;
  };

  for (const [anim, key] of Object.entries(heroMap)) {
    const meta = M[key];
    if (meta) Assets.sprites[`hero_${anim}`] = sliceStrip(await img(meta.src), meta, DISPLAY_H.hero);
    else prog.tick();
  }

  for (const t of ['cultivator', 'taoist', 'monk', 'paladin']) {
    const H = DISPLAY_H[t];
    Assets.sprites[`${t}_run`] = sliceStrip(await img(M[`${t}_move`].src), M[`${t}_move`], H);
    Assets.sprites[`${t}_attack`] = sliceStrip(await img(M[`${t}_attack`].src), M[`${t}_attack`], H);
    Assets.sprites[`${t}_death`] = sliceStrip(await img(M[`${t}_death`].src), M[`${t}_death`], H);
  }

  for (const v of ['punch', 'sweep']) {
    const key = `vfx_${v}`;
    if (M[key]) Assets.vfx[v] = vfxFrames(await img(M[key].src), M[key]);
    else prog.tick();
  }

  const scenePack = await loadSceneAssets((d, t) => {
    onProgress?.(Math.min(98, Math.round((d / Math.max(1, t)) * 15)));
  });
  if (scenePack.ground) Assets.ground = scenePack.ground;
  else if (M._ground) Assets.ground = await img(M._ground);

  if (scenePack.edges) {
    Assets.edges = scenePack.edges;
  } else if (M._edges) {
    const E = M._edges;
    Assets.edges = {
      topH: E.topH || 320,
      bottomH: E.bottomH || 260,
      sideW: E.sideW || 340,
      top: E.top ? await img(E.top) : null,
      bottom: E.bottom ? await img(E.bottom) : null,
      side: E.side ? await img(E.side) : null,
    };
  }

  for (const [k, p] of Object.entries(M._items || {})) {
    Assets.items[k] = await img(p);
  }

  try {
    Assets.dusk1 = await loadDusk1Pack((loaded, total) => {
      if (total > 0) {
        const base = 20;
        const span = 75;
        onProgress?.(Math.min(99, base + Math.round((loaded / total) * span)));
      }
    });
    if (Assets.dusk1.fx.punch_spark) {
      Assets.vfx.punch = Assets.dusk1.fx.punch_spark;
      Assets.vfx.punch_spark = Assets.dusk1.fx.punch_spark;
    }
    if (Assets.dusk1.fx.dust) Assets.vfx.dust = Assets.dusk1.fx.dust;
    if (Assets.dusk1.fx.pipe_sweep) Assets.vfx.pipe_sweep = Assets.dusk1.fx.pipe_sweep;
    if (Assets.dusk1.fx.gas_explode) Assets.vfx.gas_explode = Assets.dusk1.fx.gas_explode;
    Object.assign(Assets.decals, Assets.dusk1.decals);
    for (const [k, v] of Object.entries(Assets.dusk1.props)) {
      if (v.intact) Assets.props[k] = v.intact;
    }
  } catch (e) {
    console.warn('[pixi] dusk1 pack load failed', e);
    prog.tick();
  }

  if (!Assets.dusk1) {
    Assets.props.tower = makePropTexture('tower', renderer);
    Assets.props.ac = makePropTexture('ac', renderer);
    Assets.props.crate = makePropTexture('crate', renderer);
    Assets.decals.crack = makeDecalTexture('crack');
    Assets.decals.oil = makeDecalTexture('oil');
    Assets.decals.manhole = makeDecalTexture('manhole');
  }

  prog.finish();
}
