/** WebAudio：读取 assets/audio/manifest.json，BGM 循环用 loopStart/loopEnd */
const MANIFEST_URL = './assets/audio/manifest.json';
const AUDIO_BASE = './assets/audio/';

let ctx = null;
let master = null;
let bgmGain = null;
let sfxGain = null;
let manifest = null;
const buffers = new Map();
let bgmSource = null;
let currentBgmKey = null;
let unlocked = false;
let muted = false;
let preferOgg = true;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    bgmGain = ctx.createGain();
    sfxGain = ctx.createGain();
    bgmGain.gain.value = 1;
    sfxGain.gain.value = 1;
    bgmGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    applyMute();
  }
  return ctx;
}

function applyMute() {
  if (!master || !ctx) return;
  master.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
}

function pickFormat(entry) {
  if (preferOgg && entry.ogg) return entry.ogg;
  return entry.mp3 || entry.ogg;
}

async function decodeUrl(url) {
  const c = ensureCtx();
  if (!c) return null;
  if (buffers.has(url)) return buffers.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const ab = await res.arrayBuffer();
  const buf = await c.decodeAudioData(ab);
  buffers.set(url, buf);
  return buf;
}

async function loadManifest() {
  if (manifest) return manifest;
  manifest = await fetch(MANIFEST_URL).then((r) => r.json());
  const test = document.createElement('audio');
  preferOgg = test.canPlayType('audio/ogg; codecs=vorbis') !== '';
  return manifest;
}

function stopBgm() {
  if (bgmSource) {
    try {
      bgmSource.stop();
    } catch (_) {}
    bgmSource.disconnect();
    bgmSource = null;
  }
}

function playBgm(key) {
  currentBgmKey = key;
  if (!unlocked || muted || !ctx || !manifest?.bgm?.[key]) return;
  const def = manifest.bgm[key];
  const rel = pickFormat(def);
  if (!rel) return;

  const url = `${AUDIO_BASE}${rel}`;
  decodeUrl(url)
    .then((buf) => {
      if (!buf || currentBgmKey !== key) return;
      stopBgm();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(bgmGain);
      const vol = def.volume ?? 0.6;
      bgmGain.gain.setValueAtTime(vol, ctx.currentTime);

      if (def.loop && Array.isArray(def.loop_src_range_s) && def.loop_src_range_s.length >= 2) {
        src.loop = true;
        src.loopStart = def.loop_src_range_s[0];
        src.loopEnd = def.loop_src_range_s[1];
      } else {
        src.loop = !!def.loop;
      }
      src.start(0);
      bgmSource = src;
    })
    .catch((e) => console.warn('[audio] BGM', key, e));
}

function randomVariant(def) {
  const vars = def.variants;
  if (!vars?.length) return null;
  return vars[Math.floor(Math.random() * vars.length)];
}

function playSfx(key, opts = {}) {
  if (!unlocked || muted || !ctx || !manifest?.sfx?.[key]) return;
  const def = manifest.sfx[key];
  const variant = randomVariant(def);
  if (!variant) return;
  const rel = pickFormat(variant);
  if (!rel) return;
  const url = `${AUDIO_BASE}${rel}`;
  decodeUrl(url)
    .then((buf) => {
      if (!buf || muted) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const vol = (opts.vol ?? 1) * (def.volume ?? 1);
      g.gain.value = vol;
      if (opts.pitch) src.playbackRate.value = opts.pitch;
      src.connect(g);
      g.connect(sfxGain);
      src.start(0);
    })
    .catch((e) => console.warn('[audio] SFX', key, e));
}

async function unlock() {
  ensureCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') await ctx.resume();
  unlocked = true;
  await loadManifest();
  if (currentBgmKey && !muted) playBgm(currentBgmKey);
}

function bindUnlock() {
  const once = async (e) => {
    try {
      await unlock();
    } catch (err) {
      console.warn('[audio] unlock', err);
    }
    if (e?.type === 'pointerdown' || e?.type === 'touchend') {
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('touchend', once, true);
    }
    document.removeEventListener('keydown', once, true);
  };
  document.addEventListener('pointerdown', once, true);
  document.addEventListener('touchend', once, true);
  document.addEventListener('keydown', once, true);
  loadManifest().catch(() => {});
}

function setMuted(m) {
  muted = m;
  applyMute();
  if (!muted && unlocked && currentBgmKey) playBgm(currentBgmKey);
  if (muted) stopBgm();
}

function toggleMute() {
  setMuted(!muted);
  return muted;
}

function isMuted() {
  return muted;
}

/** 预解码标题与战斗 BGM（ogg） */
async function preloadCoreBgm(onProgress) {
  await loadManifest();
  ensureCtx();
  if (!ctx) return;
  const keys = ['bgm_title', 'bgm_kowloon'];
  let i = 0;
  for (const key of keys) {
    const def = manifest.bgm[key];
    if (!def) continue;
    const rel = pickFormat(def);
    try {
      await decodeUrl(`${AUDIO_BASE}${rel}`);
    } catch (e) {
      console.warn('[audio] preload', key, e);
    }
    i++;
    onProgress?.(i, keys.length);
  }
}

export const GameAudio = {
  bindUnlock,
  unlock,
  preloadCoreBgm,
  playBgm,
  playSfx,
  setMuted,
  toggleMute,
  isMuted,
};
