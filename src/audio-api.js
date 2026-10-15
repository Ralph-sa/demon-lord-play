/** 音频门面：默认 no-op，audio.js 动态加载成功后挂接，避免模块失败阻断游戏。 */
export const Audio = {
  ready: false,
  playSfx() {},
  syncBgm() {},
  playBgm() {},
  toggleMute() {
    return true;
  },
  isMuted() {
    return true;
  },
  setMuted() {},
  bindUnlock() {},
  unlock() {},
  loadAll() {
    return Promise.resolve();
  },
};

export function attachAudio(real) {
  if (!real) return;
  for (const k of Object.keys(real)) {
    const v = real[k];
    Audio[k] = typeof v === 'function' ? v.bind(real) : v;
  }
  Audio.ready = true;
}
