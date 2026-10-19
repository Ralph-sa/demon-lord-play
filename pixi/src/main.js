/** PixiJS 样板房入口：渲染管线 + 主循环 */
import { Application, Graphics } from '../vendor/pixi.min.mjs';
import { VIEW_W, VIEW_H } from './config.js';
import { loadAll } from './assets.js';
import { createInput } from './input.js';
import { Game } from './game.js';
import { RenderPipeline, loadSceneData } from './render/index.js';
import { createLoadingScreen } from './ui/loadingScreen.js';
import { GameAudio } from './audio/GameAudio.js';

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
  const gameAspect = GW / GH;
  const viewAspect = w / h;
  const useCover = viewAspect > gameAspect + 0.02;
  const s = useCover ? Math.max(w / GW, h / GH) : Math.min(w / GW, h / GH);
  const dispW = GW * s;
  const dispH = GH * s;
  canvas.style.width = `${dispW}px`;
  canvas.style.height = `${dispH}px`;
  canvas.style.marginLeft = `${(w - dispW) / 2}px`;
  canvas.style.marginTop = `${(h - dispH) / 2}px`;
  const cropX = Math.max(0, (dispW - w) / 2);
  const cropY = Math.max(0, (dispH - h) / 2);
  globalThis.__pixiViewInset = {
    left: cropX / s,
    top: cropY / s,
    right: cropX / s,
    bottom: cropY / s,
    scale: s,
    cover: useCover,
  };
  globalThis.__pixiCoverZoomMul = useCover ? 0.88 : 1;
  window.__pixi?.render?.camera?.applyViewportZoom?.();
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

GameAudio.bindUnlock();

const loading = createLoadingScreen();
loading.setProgress(2);

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
app.canvas.style.visibility = 'hidden';

const input = createInput(app.canvas);

const loadImages = loadAll(app.renderer, (p) => loading.setProgress(p));
const loadBgm = GameAudio.preloadCoreBgm();
await Promise.all([loadImages, loadBgm]);
loading.setProgress(100);

const sceneData = await loadSceneData('./data/scene.json');
const render = new RenderPipeline(app, sceneData, 'high');
render.mountStage(app.stage);
render.registerInput(app.canvas);
render.debug?.setAudio?.(GameAudio);

const game = new Game(app, input, render, sceneData);
game.audio = GameAudio;
GameAudio.playBgm('bgm_title');

const flashGfx = new Graphics();
flashGfx.label = 'flash';
app.stage.addChild(flashGfx);
app.stage.addChild(game.screenUi);

let combatBgm = false;
const startCombatBgm = () => {
  if (combatBgm) return;
  combatBgm = true;
  GameAudio.playBgm('bgm_kowloon');
};
game.onCombatStart = startCombatBgm;

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
app.canvas.style.visibility = 'visible';
loading.hide();

window.__pixiDebug = () => game.heroDebugInfo();

window.__pixiInputTest = {
  tapAttack() {
    input.simulateTapButton('fist');
    game.update(1 / 60);
    return game.p.cast?.id === 'fist';
  },
};

window.__pixi = {
  game,
  render,
  audio: GameAudio,
  debug: window.__pixiDebug,
  input,
  inputTest: window.__pixiInputTest,
  setTier: (t) => render.setTier(t),
  setQuality: (t) => game.setQuality(t),
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
};
