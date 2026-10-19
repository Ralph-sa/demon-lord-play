import { Container, Graphics } from '../../vendor/pixi.min.mjs';
import { VIEW_W, VIEW_H } from '../config.js';

export class TouchHud extends Container {
  constructor(input) {
    super();
    this.label = 'touchHud';
    this.input = input;
    this.joyGfx = new Graphics();
    this.btnGfx = new Graphics();
    this.addChild(this.joyGfx, this.btnGfx);
  }

  redraw(show) {
    this.joyGfx.clear();
    this.btnGfx.clear();
    if (!show) return;
    const T = this.input.touch;
    const joyX = T.joy?.ox ?? 148;
    const joyY = T.joy?.oy ?? VIEW_H - 132;
    const j = this.joyGfx;
    if (T.joy) {
      j.circle(joyX, joyY, 75).stroke({ width: 3, color: 0xffffff, alpha: 0.35 });
      j.circle(joyX + T.jx * 70, joyY + T.jy * 70, 32).fill({ color: 0xffd400, alpha: 0.55 });
    } else {
      j.circle(joyX, joyY, 75).stroke({ width: 2, color: 0xffffff, alpha: 0.28 });
    }
    const b = this.btnGfx;
    for (const btn of this.input.TB) {
      b.circle(btn.x, btn.y, btn.r).fill({ color: 0x000000, alpha: 0.45 });
      b.circle(btn.x, btn.y, btn.r).stroke({ width: 3, color: 0xffd400, alpha: 0.85 });
    }
  }
}
