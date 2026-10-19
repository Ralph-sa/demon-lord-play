/** 调试面板：` 键或三指点击 */
export class DebugPanel {
  constructor(pipeline, onQuality) {
    this.pipeline = pipeline;
    this.onQuality = onQuality;
    this.audio = null;
    this.visible = false;
    this.el = document.createElement('div');
    this.el.id = 'pixi-debug';
    this.el.innerHTML = `
<style>
#pixi-debug{position:fixed;right:8px;top:8px;z-index:99;max-width:280px;background:rgba(10,8,12,.88);
 color:#eee;font:12px/1.4 sans-serif;padding:10px 12px;border:1px solid #554;border-radius:8px;display:none}
#pixi-debug.show{display:block}
#pixi-debug label{display:block;margin:4px 0;cursor:pointer}
#pixi-debug h4{margin:0 0 6px;color:#ffd400;font-size:13px}
#pixi-debug select{margin-top:6px;width:100%}
</style>
<h4>渲染调试</h4>
<div id="pixi-debug-fps">FPS: --</div>
<label><input type="checkbox" data-k="lighting"> 2D 光照</label>
<label><input type="checkbox" data-k="projectedShadows"> 方向投影</label>
<label><input type="checkbox" data-k="bloom"> 泛光</label>
<label><input type="checkbox" data-k="colorGrade"> 调色</label>
<label><input type="checkbox" data-k="vignette"> 暗角</label>
<label><input type="checkbox" data-k="chromatic"> 色差</label>
<label><input type="checkbox" data-k="radialDistort"> 径向模糊</label>
<label><input type="checkbox" data-k="damageVignette"> 受伤红边</label>
<label><input type="checkbox" id="pixi-debug-mute"> 静音</label>
<select id="pixi-debug-quality">
<option value="high">画质：高</option>
<option value="mid">画质：中</option>
<option value="low">画质：低</option>
</select>`;
    document.body.appendChild(this.el);
    this.fpsEl = this.el.querySelector('#pixi-debug-fps');
    this.el.querySelectorAll('input[type=checkbox]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const k = inp.dataset.k;
        if (k === 'lighting') {
          this.pipeline.lighting.enabled = inp.checked;
          return;
        }
        const q = { ...this.pipeline.quality };
        q[k] = inp.checked;
        this.pipeline.applyQualityOverride(q);
      });
    });
    this.el.querySelector('#pixi-debug-quality').addEventListener('change', (e) => {
      this.onQuality?.(e.target.value);
    });
    this.muteEl = this.el.querySelector('#pixi-debug-mute');
    this.muteEl?.addEventListener('change', () => {
      this.audio?.setMuted(this.muteEl.checked);
    });
    this._syncFromPipeline();
  }

  setAudio(audioApi) {
    this.audio = audioApi;
    if (this.muteEl) this.muteEl.checked = audioApi?.isMuted?.() ?? false;
  }

  _syncFromPipeline() {
    const q = this.pipeline.quality || {};
    this.el.querySelectorAll('input[type=checkbox]').forEach((inp) => {
      const k = inp.dataset.k;
      inp.checked = q[k] !== false;
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.el.classList.toggle('show', this.visible);
    if (this.visible) this._syncFromPipeline();
  }

  setFps(n) {
    if (this.fpsEl) this.fpsEl.textContent = `FPS: ${n}`;
  }
}
