/** 屏幕 HUD：每个控件独立 Graphics，避免 Pixi 子路径斜线 */
import { Container, Graphics } from '../../vendor/pixi.min.mjs';
import { VIEW_W } from '../config.js';
import { hudMetrics } from './hudLayout.js';

function drawOrb(gfx, cx, cy, r, track, trackColor, rimColor) {
  gfx.clear();
  gfx.circle(cx, cy, r + 6).fill({ color: 0x1a1010, alpha: 0.55 });
  gfx.circle(cx, cy, r).fill({ color: rimColor, alpha: 0.9 });
  if (track > 0.001) {
    const a0 = -Math.PI / 2;
    const a1 = a0 + track * Math.PI * 2;
    gfx.moveTo(cx, cy);
    gfx.lineTo(cx + Math.cos(a0) * (r - 2), cy + Math.sin(a0) * (r - 2));
    gfx.arc(cx, cy, r - 2, a0, a1);
    gfx.lineTo(cx, cy);
    gfx.fill({ color: trackColor });
  }
  gfx.circle(cx, cy, r).stroke({ width: 4, color: 0x111111 });
}

export class PlayHud extends Container {
  constructor() {
    super();
    this.label = 'playHud';
    this.hpGfx = new Graphics();
    this.furyGfx = new Graphics();
    this.bossGfx = new Graphics();
    this.skillsGfx = new Graphics();
    this.addChild(this.hpGfx, this.furyGfx, this.bossGfx, this.skillsGfx);
  }

  redraw({ hp, fury, bossActive, comboHighlight = 2 }) {
    const m = hudMetrics();
    drawOrb(this.hpGfx, m.hpX, m.hpY, 28, hp, 0xff4444, 0x882222);
    drawOrb(this.furyGfx, m.furyX, m.furyY, 24, fury, 0xbb66ff, 0x5533aa);

    this.bossGfx.clear();
    if (bossActive) {
      const bx = VIEW_W / 2 - 200;
      this.bossGfx.roundRect(bx, m.bossY, 400, 14, 6).fill({ color: 0x1a0a20, alpha: 0.75 });
      this.bossGfx.roundRect(bx + 2, m.bossY + 2, 396 * 0.65, 10, 4).fill({ color: 0xbb66ff, alpha: 0.95 });
      this.bossGfx.roundRect(bx, m.bossY, 400, 14, 6).stroke({ width: 2, color: 0x221133, alpha: 0.9 });
    }

    const g = this.skillsGfx;
    g.clear();
    const barY = m.barY;
    const panelW = Math.min(VIEW_W - 32, 520);
    const panelX = (VIEW_W - panelW) / 2;
    g.roundRect(panelX, barY - 28, panelW, 52, 10).fill({ color: 0x0a080c, alpha: 0.52 });
    g.roundRect(panelX, barY - 28, panelW, 52, 10).stroke({ width: 2, color: 0x332a22, alpha: 0.65 });
    for (let i = 0; i < 3; i++) {
      const x = VIEW_W / 2 - 90 + i * 90;
      g.roundRect(x, barY - 12, 72, 24, 6).fill({
        color: i === comboHighlight ? 0xffd400 : 0x444444,
        alpha: i === comboHighlight ? 0.85 : 0.55,
      });
      g.roundRect(x, barY - 12, 72, 24, 6).stroke({ width: 2, color: 0x111111, alpha: 0.8 });
    }
  }
}
