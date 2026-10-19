/**
 * 接地椭圆影 + 方向投影剪影 + 楼房阴影区
 */
import { Container, Graphics, Sprite } from '../../../vendor/pixi.min.mjs';

export class ShadowSystem {
  constructor(sceneData, quality) {
    this.scene = sceneData;
    this.quality = quality;
    this.sun = sceneData.sun || { angle: 2.35, length: 0.52, alpha: 0.38, skewX: -0.55, scaleY: 0.28 };

    this.groundLayer = new Container();
    this.projectLayer = new Container();
    this.zoneLayer = new Container();
    this.buildingLayer = new Container();

    this.groundShadows = new Map();
    this.projected = new Map();

    this._buildBuildingShadows(sceneData.buildingShadows || []);
    this._buildZones(sceneData.shadowZones || []);
    this._buildCasters(sceneData.shadowCasters || []);
  }

  _buildCasters(list) {
    const g = new Graphics();
    const ang = this.sun.angle ?? 2.35;
    for (const c of list) {
      const len = c.len ?? 120;
      const dx = Math.cos(ang) * len;
      const dy = Math.sin(ang) * len * 0.55;
      g.roundRect(c.x + dx * 0.38, c.y + dy * 0.38, (c.w ?? 80) + len * 0.28, (c.h ?? 40) + 16, 8).fill({
        color: 0x000000,
        alpha: c.alpha ?? 0.28,
      });
    }
    g.blendMode = 'multiply';
    g.alpha = 0.85;
    g.label = 'casterShadows';
    this.buildingLayer.addChild(g);
  }

  _buildBuildingShadows(list) {
    const g = new Graphics();
    for (const b of list) {
      g.rect(b.x, b.y, b.w, b.h).fill({ color: 0x000000, alpha: b.alpha ?? 0.25 });
    }
    g.label = 'buildingShadows';
    this.buildingLayer.addChild(g);
  }

  _buildZones(list) {
    this.zones = list;
    const g = new Graphics();
    for (const z of list) {
      g.rect(z.x, z.y, z.w, z.h).fill({ color: 0x000000, alpha: 0.15 });
    }
    g.alpha = 0.6;
    this.zoneLayer.addChild(g);
  }

  setQuality(q) {
    this.quality = q;
    this.projectLayer.visible = q.projectedShadows !== false;
    this.buildingLayer.visible = q.buildingShadows !== false;
  }

  /** 注册可投影实体 */
  bindEntity(id, sprite, opts = {}) {
    const gs = new Graphics();
    gs.ellipse(0, 0, opts.rx ?? 28, opts.ry ?? 11).fill({ color: 0x000000, alpha: 0.42 });
    this.groundLayer.addChild(gs);
    this.groundShadows.set(id, gs);

    if (this.quality.projectedShadows !== false) {
      const proj = new Sprite(sprite.texture);
      proj.anchor.copyFrom(sprite.anchor);
      proj.tint = 0x000000;
      proj.alpha = this.sun.alpha ?? 0.38;
      proj.blendMode = 'multiply';
      this.projectLayer.addChild(proj);
      this.projected.set(id, { spr: proj, source: sprite });
    }
  }

  updateEntity(id, x, y, face = 1) {
    const g = this.groundShadows.get(id);
    if (g) {
      g.x = x;
      g.y = y + 6;
    }
    const p = this.projected.get(id);
    if (p) {
      const { spr, source } = p;
      spr.texture = source.texture;
      spr.scale.x = face * Math.abs(source.scale.x);
      spr.scale.y = source.scale.y * (this.sun.scaleY ?? 0.28);
      const len = (this.sun.length ?? 0.55) * 95;
      const ang = this.sun.angle ?? 2.3;
      spr.x = x + Math.cos(ang) * len;
      spr.y = y + Math.sin(ang) * len * 0.58 + 10;
      spr.alpha = Math.min(0.5, (this.sun.alpha ?? 0.38) + 0.08);
      spr.skew.x = this.sun.skewX ?? -0.55;
      spr.rotation = 0;
    }
  }

  removeEntity(id) {
    this.groundShadows.get(id)?.destroy();
    this.groundShadows.delete(id);
    const p = this.projected.get(id);
    p?.spr.destroy();
    this.projected.delete(id);
  }

  /** 角色在阴影区内返回变暗系数 0..1 */
  darkenAt(x, y) {
    if (!this.zones?.length) return 1;
    for (const z of this.zones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
        return z.darken ?? 0.75;
      }
    }
    return 1;
  }

  get layers() {
    return [this.buildingLayer, this.zoneLayer, this.groundLayer, this.projectLayer];
  }
}
