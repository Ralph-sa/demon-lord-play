/** 占位音频：Web Audio API，首次用户手势解锁，支持 BGM 循环与 SFX。 */
const BASE = 'assets/audio/';
const BGM_LOOP = new Set(['bgm_menu', 'bgm_battle']);
const BGM_BY_STATE = {
  title: 'bgm_menu',
  shop: 'bgm_menu',
  levelup: 'bgm_menu',
  evolve: 'bgm_menu',
  play: 'bgm_battle',
  win: 'bgm_win',
  over: 'bgm_lose',
};

let ctx = null;
let master = null;
let bgmGain = null;
let sfxGain = null;
let buffers = new Map();
let currentBgm = null;
let bgmSource = null;
let unlocked = false;
let muted = false;
let loadPromise = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    bgmGain = ctx.createGain();
    sfxGain = ctx.createGain();
    bgmGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    applyMute();
  }
  return ctx;
}

function applyMute() {
  if (!master) return;
  const v = muted ? 0 : 1;
  master.gain.setValueAtTime(v, ctx.currentTime);
}

async function loadAll() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    ensureCtx();
    if (!ctx) return;
    const names = [
      'bgm_menu', 'bgm_battle', 'bgm_win', 'bgm_lose',
      'attack', 'sweep', 'dodge', 'hurt', 'die',
      'enemy_hurt', 'enemy_die', 'ui_click', 'ui_start', 'ui_levelup',
    ];
    await Promise.all(names.map(async (name) => {
      try {
        const res = await fetch(`${BASE}${name}.ogg`);
        if (!res.ok) throw new Error(res.statusText);
        const ab = await res.arrayBuffer();
        buffers.set(name, await ctx.decodeAudioData(ab));
      } catch (e) {
        console.warn('[audio] 加载失败', name, e);
      }
    }));
  })();
  return loadPromise;
}

async function unlock() {
  ensureCtx();
  if (!ctx || unlocked) return;
  if (ctx.state === 'suspended') await ctx.resume();
  unlocked = true;
  await loadAll();
}

function stopBgm() {
  if (bgmSource) {
    try { bgmSource.stop(); } catch (_) { /* already stopped */ }
    bgmSource.disconnect();
    bgmSource = null;
  }
}

function playBgm(name) {
  if (!unlocked || !ctx || muted) {
    currentBgm = name;
    return;
  }
  if (currentBgm === name && bgmSource) return;
  currentBgm = name;
  const buf = buffers.get(name);
  if (!buf) return;
  stopBgm();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = BGM_LOOP.has(name);
  src.connect(bgmGain);
  bgmGain.gain.setValueAtTime(name.startsWith('bgm_') && !BGM_LOOP.has(name) ? 0.55 : 0.42, ctx.currentTime);
  src.start(0);
  bgmSource = src;
  if (!BGM_LOOP.has(name)) {
    src.onended = () => {
      if (currentBgm === name) {
        currentBgm = null;
        bgmSource = null;
      }
    };
  }
}

function playSfx(name, opts = {}) {
  if (!unlocked || !ctx || muted) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const vol = opts.vol ?? 1;
  const pitch = opts.pitch ?? (0.95 + Math.random() * 0.1);
  src.playbackRate.value = pitch;
  g.gain.value = vol;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

function syncBgm(state) {
  const want = BGM_BY_STATE[state];
  if (want) playBgm(want);
}

function setMuted(m) {
  muted = m;
  applyMute();
  if (!muted && unlocked && currentBgm) playBgm(currentBgm);
}

function toggleMute() {
  setMuted(!muted);
  return muted;
}

function isMuted() {
  return muted;
}

/** 在首次点击/按键/触摸时调用 */
function bindUnlock(el) {
  const once = async () => {
    try {
      await unlock();
    } catch (e) {
      console.warn('[audio] 解锁失败', e);
    }
    document.removeEventListener('pointerdown', once, true);
    document.removeEventListener('keydown', once, true);
    document.removeEventListener('touchend', once, true);
  };
  document.addEventListener('pointerdown', once, true);
  document.addEventListener('keydown', once, true);
  document.addEventListener('touchend', once, true);
  loadAll().catch(() => {});
}

export const Audio = {
  unlock,
  bindUnlock,
  loadAll,
  playSfx,
  playBgm,
  syncBgm,
  setMuted,
  toggleMute,
  isMuted,
};
