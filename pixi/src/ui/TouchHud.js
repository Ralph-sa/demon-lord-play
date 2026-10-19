import { Container, Graphics, Sprite, Texture } from '../../vendor/pixi.min.mjs';
import { uiIconTexture } from '../assets.js';
import { touchControlLayout } from './hudLayout.js';

const BTN_ICONS = { fist: 'icon_fist', dodge: 'icon_dash', sweep: 'icon_pipe' };

export class TouchHud extends Container {
  constructor(input) {
    super();
    this.label = 'touchHud';
    this.input = input;
    this.joyGfx = new Graphics();
    this.btnGfx = new Graphics();
    this.iconLayer = new Container();
    this._icons = {};
    for (const id of ['fist', 'dodge', 'sweep']) {
      const spr = new Sprite(Texture.EMPTY);
      spr.anchor.set(0.5);
      spr.eventMode = 'none';
      this._icons[id] = spr;
      this.iconLayer.addChild(spr);
    }
    this.addChild(this.joyGfx, this.btnGfx, this.iconLayer);
  }

  _ensureIcons() {
    for (const [id, key] of Object.entries(BTN_ICONS)) {
      const tex = uiIconTexture(key);
      if (tex && tex !== Texture.EMPTY) this._icons[id].texture = tex;
    }
  }

  redraw(show) {
    this.joyGfx.clear();
    this.btnGfx.clear();
    if (!show) {
      for (const spr of Object.values(this._icons)) spr.visible = false;
      return;
    }
    this._ensureIcons();
    const T = this.input.touch;
    const { joyX, joyY, buttons } = touchControlLayout();
    const j = this.joyGfx;
    j.circle(joyX, joyY, 78).fill({ color: 0x0a0c14, alpha: 0.42 });
    j.circle(joyX, joyY, 78).stroke({ width: 3, color: 0xffffff, alpha: 0.45 });
    j.circle(joyX, joyY, 52).stroke({ width: 1.5, color: 0xffffff, alpha: 0.22 });
    const kx = joyX + (T.joy ? T.jx * 70 : 0);
    const ky = joyY + (T.joy ? T.jy * 70 : 0);
    j.circle(kx, ky, 34).fill({ color: 0xffd400, alpha: 0.62 });
    j.circle(kx, ky, 34).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });

    const b = this.btnGfx;
    for (const btn of buttons) {
      b.circle(btn.x, btn.y, btn.r).fill({ color: 0x000000, alpha: 0.5 });
      b.circle(btn.x, btn.y, btn.r).stroke({ width: 3, color: 0xffd400, alpha: 0.9 });
      const icon = this._icons[btn.id];
      if (icon?.texture && icon.texture !== Texture.EMPTY) {
        icon.visible = true;
        icon.x = btn.x;
        icon.y = btn.y;
        const sc = (btn.r * 1.15) / Math.max(icon.texture.width, icon.texture.height);
        icon.scale.set(sc);
        icon.alpha = 0.95;
      }
    }
  }
}
