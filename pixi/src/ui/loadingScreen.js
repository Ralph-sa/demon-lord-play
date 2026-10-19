/** 全屏加载进度（百分比） */
export function createLoadingScreen() {
  const root = document.createElement('div');
  root.id = 'pixi-load';
  root.innerHTML = `
<style>
#pixi-load{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;
 background:radial-gradient(ellipse at 50% 40%,#3a3540 0%,#1a1520 55%,#0a080c 100%);color:#f5e6c8;font-family:system-ui,sans-serif;
 transition:opacity .35s ease}
#pixi-load.hide{opacity:0;pointer-events:none}
#pixi-load h1{margin:0 0 1.25rem;font-size:clamp(1.1rem,4vw,1.45rem);font-weight:700;letter-spacing:.08em;color:#ffd400}
#pixi-load .bar-wrap{width:min(320px,72vw);height:10px;border-radius:6px;background:rgba(0,0,0,.45);overflow:hidden;border:1px solid #554}
#pixi-load .bar{height:100%;width:0%;background:linear-gradient(90deg,#c9a227,#ffd400);transition:width .12s ease}
#pixi-load .pct{margin-top:.65rem;font-size:15px;font-weight:600;color:#ccc}
#pixi-load .hint{margin-top:1.5rem;font-size:13px;color:#888;max-width:280px;text-align:center;line-height:1.45}
</style>
<h1>古惑仔成魔</h1>
<div class="bar-wrap"><div class="bar"></div></div>
<div class="pct">0%</div>
<p class="hint">加载场景与角色素材…</p>`;
  document.body.appendChild(root);
  const bar = root.querySelector('.bar');
  const pct = root.querySelector('.pct');
  let shown = 0;

  return {
    setProgress(p) {
      const v = Math.max(0, Math.min(100, Math.round(p)));
      if (v < shown) return;
      shown = v;
      bar.style.width = `${v}%`;
      pct.textContent = `${v}%`;
    },
    hide() {
      this.setProgress(100);
      root.classList.add('hide');
      setTimeout(() => root.remove(), 400);
    },
    setHint(text) {
      const h = root.querySelector('.hint');
      if (h) h.textContent = text;
    },
  };
}
