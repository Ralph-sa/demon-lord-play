/** PixiJS 样板房入口：渲染管线 + 主循环 */
import { Application, Graphics } from '../vendor/pixi.min.mjs';
import { VIEW_W, VIEW_H } from './config.js';
import { loadAll } from './assets.js';
import { createInput } from './input.js';
import { Game } from './game.js';
import { RenderPipeline, loadSceneData } from './render/index.js';

const GW = VIEW_W;
const GH = VIEW_H;

function viewSize() {
  const vv = window.visualViewport;
  let w = vv && vv.width > 0 ? vv.width : innerWidth;
  let h = vv && vv.height > 0 ? vv.height : innerHeight;
  if (w < 50) w = innerWidth || document.documentElement.clientWidth || GW;
  if (h < 50) h = innerHeight || document.documentElement.clientHeight || GH;
  return { w: Math.round(w) || 1, h: Math.round(h) || 1 };
}

function fitCanvas(canvas) {
  const { w, h } = viewSize();
  if (!canvas || w < 1 || h < 1) return;
  const s = Math.min(w / GW, h / GH);
  canvas.style.width = `${GW * s}px`;
  canvas.style.height = `${GH * s}px`;
  document.documentElement.style.setProperty('--app-h', `${h}px`);
  syncOrientHint();
}

function syncOrientHint() {
  const hint = document.getElementById('orient-hint');
  if (!hint || document.documentElement.classList.contains('hint-dismissed')) {
    hint?.classList.remove('show');
    return;
  }
  const coarse = matchMedia('(pointer: coarse)').matches || matchMedia('(hover: none)').matches || 'ontouchstart' in window;
  const portrait = innerHeight > innerWidth;
  hint.classList.toggle('show', coarse && portrait);
}

const HINT_KEY = 'orient-hint-dismiss';
if (sessionStorage.getItem(HINT_KEY) === '1') document.documentElement.classList.add('hint-dismissed');
document.getElementById('orient-hint-close')?.addEventListener('pointerup', (e) => {
  e.preventDefault();
  try {
    sessionStorage.setItem(HINT_KEY, '1');
  } catch (_) {}
  document.documentElement.classList.add('hint-dismissed');
  fitCanvas(document.querySelector('canvas'));
});

const app = new Application();
await app.init({
  width: GW,
  height: GH,
  background: '#8a8078',
  antialias: true,
  resolution: Math.min(devicePixelRatio || 1, 2),
  autoDensity: true,
  preserveDrawingBuffer: true,
});
document.getElementById('game-host').appendChild(app.canvas);
app.canvas.id = 'c';

const input = createInput(app.canvas);
await loadAll(app.renderer);
const sceneData = await loadSceneData('./data/scene.json');
const render = new RenderPipeline(app, sceneData, 'high');
render.mountStage(app.stage);
render.registerInput(app.canvas);

const game = new Game(app, input, render, sceneData);
const flashGfx = new Graphics();
flashGfx.label = 'flash';
app.stage.addChild(flashGfx);

let last = performance.now();
app.ticker.add(() => {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  flashGfx.clear();
  if (game.vfx.flash > 0) {
    flashGfx.rect(0, 0, GW, GH).fill({ color: 0xfff0c8, alpha: game.vfx.flash * 0.42 });
  }
});

addEventListener('resize', () => fitCanvas(app.canvas));
addEventListener('orientationchange', () => fitCanvas(app.canvas));
window.visualViewport?.addEventListener('resize', () => fitCanvas(app.canvas));
addEventListener('keydown', (e) => {
  if (e.key === 'q') game.cycleQuality();
});
fitCanvas(app.canvas);

window.__pixi = {
  game,
  render,
  stageScreenshot: (mode) => game.stageScreenshot(mode),
  getFps: () => game.fps,
  getPerfSnapshot: () => game.getPerfSnapshot(),
  benchmarkFrames: (ms = 2000) =>
    new Promise((resolve) => {
      const wall = [];
      let last = performance.now();
      const t0 = last;
      const poll = () => {
        const now = performance.now();
        wall.push(now - last);
        last = now;
        if (now - t0 < ms) setTimeout(poll, 32);
        else {
          const avg = wall.reduce((a, b) => a + b, 0) / Math.max(1, wall.length);
          resolve({
            samples: wall.length,
            frameMsAvg: Math.round(avg * 100) / 100,
            fps: Math.round(1000 / avg),
            perf: game.getPerfSnapshot(),
          });
        }
      };
      poll();
    }),
  setQuality: (q) => game.setQuality(q),
  setTier: (t) => render.setTier(t),
};

console.info('[pixi] 样板房就绪 — ` 调试面板 | WASD/摇杆 | 左键/E 横扫 | Q 画质');
