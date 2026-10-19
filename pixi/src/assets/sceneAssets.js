/** 场景素材：优先 pixi_assets/index.json，回退 manifest 边缘与地面 */
import { Assets as PixiAssets } from '../../vendor/pixi.min.mjs';

const PIXI_ASSETS_INDEX = '/pixi_assets/index.json';
const FALLBACK_MANIFEST = './assets/gen/manifest.json';

function loadImage(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

export async function loadSceneAssets() {
  let index = null;
  try {
    index = await fetch(PIXI_ASSETS_INDEX).then((r) => (r.ok ? r.json() : null));
  } catch (_) {}

  const manifest = await fetch(FALLBACK_MANIFEST).then((r) => r.json());
  const img = async (rel) => loadImage(rel.startsWith('http') || rel.startsWith('/') ? rel : `./${rel}`);

  const out = { index, manifest, ground: null, edges: null, textures: {} };

  if (index?.ground) {
    out.ground = await img(`/pixi_assets/${index.ground}`);
  } else if (manifest._ground) {
    out.ground = await img(manifest._ground);
  }

  const E = index?.edges || manifest._edges;
  if (E) {
    const resolveEdge = async (key) => {
      const rel = index?.edges?.[key] || E[key];
      if (!rel) return null;
      if (typeof rel === 'string' && rel.includes('pixi_assets')) return img(rel.startsWith('/') ? rel : `/pixi_assets/${rel}`);
      return img(typeof rel === 'string' ? rel : E[key]);
    };
    out.edges = {
      topH: E.topH || 360,
      bottomH: E.bottomH || 280,
      sideW: E.sideW || 360,
      top: await resolveEdge('top'),
      bottom: await resolveEdge('bottom'),
      side: await resolveEdge('side'),
    };
  }

  if (index?.textures) {
    for (const [k, v] of Object.entries(index.textures)) {
      out.textures[k] = await img(v.startsWith('/') ? v : `/pixi_assets/${v}`);
    }
  }

  return out;
}
