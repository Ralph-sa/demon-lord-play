/** 回退场景贴图：仅使用 pixi 目录内 assets/gen */
const GEN_MANIFEST = './assets/gen/manifest.json';

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

/** @param {(done:number,total:number)=>void} [onProgress] */
export async function loadSceneAssets(onProgress) {
  const manifest = await fetch(GEN_MANIFEST).then((r) => r.json());
  const out = { manifest, ground: null, edges: null, textures: {} };

  const tasks = [];
  if (manifest._ground) tasks.push(['ground', manifest._ground]);
  const E = manifest._edges;
  if (E) {
    if (E.top) tasks.push(['edge_top', E.top]);
    if (E.bottom) tasks.push(['edge_bottom', E.bottom]);
    if (E.side) tasks.push(['edge_side', E.side]);
  }

  let done = 0;
  const total = tasks.length;
  const tick = () => {
    done++;
    onProgress?.(done, total);
  };

  const loaded = {};
  for (const [key, rel] of tasks) {
    loaded[key] = await loadImage(assetUrl(rel));
    tick();
  }

  if (loaded.ground) out.ground = loaded.ground;
  if (E) {
    out.edges = {
      topH: E.topH || 360,
      bottomH: E.bottomH || 280,
      sideW: E.sideW || 360,
      top: loaded.edge_top,
      bottom: loaded.edge_bottom,
      side: loaded.edge_side,
    };
  }

  return out;
}
