/** 键盘 + 鼠标 + 触屏：动作在按下瞬间入队，避免同帧 touchstart/touchend 吞点击 */
import { VIEW_W, VIEW_H } from './config.js';
import { touchControlLayout } from './ui/hudLayout.js';

export function createInput(canvas) {
  const keys = {};
  const mouse = { x: VIEW_W / 2, y: VIEW_H / 2, l: false, r: false };
  const touch = {
    on: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
    forceUi: false,
    jx: 0,
    jy: 0,
    atk: false,
    sweep: false,
    dodge: false,
    joy: null,
  };
  const pulse = { fist: 0, sweep: 0, dodge: 0 };
  const btnTouchIds = new Set();

  const queue = (kind) => {
    pulse[kind] += 1;
  };

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (e.repeat) return;
    if (k === 'j' || k === 'k') queue('fist');
    if (k === 'e') queue('sweep');
    if (k === ' ') queue('dodge');
  });
  addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  const toCanvas = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    const rw = r.width || 1;
    const rh = r.height || 1;
    return { x: (clientX - r.left) * (VIEW_W / rw), y: (clientY - r.top) * (VIEW_H / rh) };
  };

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousemove', (e) => {
    const q = toCanvas(e.clientX, e.clientY);
    mouse.x = q.x;
    mouse.y = q.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      mouse.r = true;
      queue('sweep');
    } else {
      mouse.l = true;
      queue('fist');
    }
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 2) mouse.r = false;
    else mouse.l = false;
  });

  const hitBtn = (q) => {
    const { buttons } = touchControlLayout();
    return buttons.find((b) => Math.hypot(q.x - b.x, q.y - b.y) < b.r + 14);
  };

  const syncTouchBtnHeld = () => {
    touch.atk = false;
    touch.sweep = false;
    touch.dodge = false;
    for (const id of btnTouchIds) {
      const role = touch._btnByTouch?.[id];
      if (role === 'fist') touch.atk = true;
      if (role === 'sweep') touch.sweep = true;
      if (role === 'dodge') touch.dodge = true;
    }
  };
  touch._btnByTouch = {};

  const onTouch = (ev) => {
    touch.on = true;
    ev.preventDefault();
    const { joyX, joyY } = touchControlLayout();
    for (const t of ev.changedTouches) {
      const q = toCanvas(t.clientX, t.clientY);
      const id = t.identifier;
      if (ev.type === 'touchstart') {
        const btn = hitBtn(q);
        if (btn) {
          btnTouchIds.add(id);
          touch._btnByTouch[id] = btn.id;
          if (btn.id === 'fist') queue('fist');
          if (btn.id === 'sweep') queue('sweep');
          if (btn.id === 'dodge') queue('dodge');
          syncTouchBtnHeld();
          continue;
        }
        if (q.x < VIEW_W * 0.48 && !touch.joy) {
          touch.joy = { id, ox: joyX, oy: joyY, x: q.x, y: q.y };
        }
      } else if (ev.type === 'touchmove') {
        if (touch.joy?.id === id) {
          touch.joy.x = q.x;
          touch.joy.y = q.y;
          let dx = q.x - touch.joy.ox;
          let dy = q.y - touch.joy.oy;
          const l = Math.hypot(dx, dy);
          if (l > 70) {
            touch.joy.ox = q.x - (dx / l) * 70;
            touch.joy.oy = q.y - (dy / l) * 70;
            dx = (dx / l) * 70;
            dy = (dy / l) * 70;
          }
          touch.jx = l > 8 ? dx / 70 : 0;
          touch.jy = l > 8 ? dy / 70 : 0;
        }
      } else {
        if (touch.joy?.id === id) {
          touch.joy = null;
          touch.jx = touch.jy = 0;
        }
        if (btnTouchIds.delete(id)) {
          delete touch._btnByTouch[id];
          syncTouchBtnHeld();
        }
      }
    }
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    canvas.addEventListener(type, onTouch, { passive: false });
  }

  const api = {
    keys,
    mouse,
    touch,
    get TB() {
      return touchControlLayout().buttons;
    },
    moveVec() {
      let mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + touch.jx;
      let my = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + touch.jy;
      const l = Math.hypot(mx, my);
      if (l > 1) {
        mx /= l;
        my /= l;
      }
      return { mx, my };
    },
    consumeFist() {
      if (pulse.fist > 0) {
        pulse.fist -= 1;
        return true;
      }
      return false;
    },
    consumeSweep() {
      if (pulse.sweep > 0) {
        pulse.sweep -= 1;
        return true;
      }
      return false;
    },
    consumeDodge() {
      if (pulse.dodge > 0) {
        pulse.dodge -= 1;
        return true;
      }
      return false;
    },
    /** Playwright：模拟瞬时点击 */
    simulateTapButton(id) {
      if (id === 'fist') queue('fist');
      if (id === 'sweep') queue('sweep');
      if (id === 'dodge') queue('dodge');
    },
    wantFist() {
      return api.consumeFist();
    },
    wantSweep() {
      return api.consumeSweep();
    },
    wantDodge() {
      return api.consumeDodge();
    },
  };
  return api;
}
