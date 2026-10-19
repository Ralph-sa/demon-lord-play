/** 傍晚1 正式素材包：prototype/pixi/assets/dusk1/index.json */
import { Texture, Rectangle } from '../../vendor/pixi.min.mjs';

const BASE = './assets/dusk1/';

function loadImage(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function sliceStrip(tex, meta) {
  if (!tex || !meta?.frames) return null;
  const frames = [];
  for (let i = 0; i < meta.frames; i++) {
    frames.push(
      new Texture({
        source: tex.source,
        frame: new Rectangle(i * meta.frameW, 0, meta.frameW, meta.frameH),
      })
    );
  }
  return frames;
}

function fragmentTextures(catalog, prefix) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const k = `${prefix}_fragments_${i}.png`;
    if (catalog.textures[k]) out.push(catalog.textures[k]);
  }
  return out;
}

export async function loadDusk1Pack() {
  const index = await fetch(`${BASE}index.json`).then((r) => r.json());
  const textures = {};
  const keys = Object.keys(index).filter((k) => !k.startsWith('_'));

  for (const key of keys) {
    const entry = index[key];
    if (entry.frameOf) continue;
    const im = await loadImage(`${BASE}${key}`);
    if (im) textures[key] = Texture.from(im);
  }

  const catalog = { base: BASE, index, textures, props: {}, decals: {}, fx: {} };

  const propKinds = [
    'crate',
    'aircon',
    'gas_canister',
    'clay_jar',
    'bucket',
    'mahjong_table',
    'water_tower',
  ];
  for (const kind of propKinds) {
    const intact = `props/${kind}_intact.png`;
    const broken = `props/${kind}_broken.png`;
    const meta = index[intact] || index[`props/${kind}.png`];
    catalog.props[kind] = {
      intact: textures[intact] || textures[`props/${kind}.png`],
      broken: textures[broken] || null,
      fragments: fragmentTextures(catalog, `props/${kind}`),
      meta: meta || index[`props/${kind}.png`],
      breakable: meta?.breakable !== false && kind !== 'water_tower',
    };
  }

  for (const key of keys) {
    if (key.startsWith('decals/') && key.endsWith('.png') && !/_\d/.test(key)) {
      catalog.decals[key.slice(7, -4)] = textures[key];
    }
  }

  const fxStrips = ['fx/pipe_sweep.png', 'fx/punch_spark.png', 'fx/dust.png', 'fx/gas_explode.png'];
  for (const sk of fxStrips) {
    const name = sk.split('/')[1].replace('.png', '');
    catalog.fx[name] = sliceStrip(textures[sk], index[sk]);
  }

  catalog.makeSprite = (assetKey, state = 'intact') => {
    let texKey = assetKey;
    if (assetKey.startsWith('props/')) {
      if (state === 'broken' && textures[assetKey.replace('_intact', '_broken')]) {
        texKey = assetKey.replace('_intact', '_broken');
      }
    }
    const tex = textures[texKey] || textures[assetKey];
    const meta = index[texKey] || index[assetKey];
    if (!tex) return null;
    const ax = meta?.anchor?.[0] ?? 0.5;
    const ay = meta?.anchor?.[1] ?? 1;
    const sc = meta?.displayScale ?? 1;
    return { texture: tex, anchor: [ax, ay], scale: sc, meta };
  };

  catalog.tileTexture = (tileKey) => textures[`tiles/${tileKey}.jpg`] || textures[tileKey];

  return catalog;
}
