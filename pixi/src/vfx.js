/** 粒子、傍晚加色光、震屏、伤害飘字、刀光拖尾（人物层不受环境压暗） */
import { Container, Graphics, Sprite, Text, AnimatedSprite } from '../vendor/pixi.min.mjs';
import { Pool } from './pool.js';
import { clamp, rnd } from './config.js';

export class VfxSystem {
  constructor(app, quality) {
    this.app = app;
    this.quality = quality;
    this.shake = 0;
    this.hitstop = 0;
    this.flash = 0;
    this.particleCount = 0;
    this.debrisCount = 0;

    this.root = new Container();
    this.particles = new Container();
    this.nums = new Container();
    this.trails = new Container();
    this.fxTop = new Container();
    this.root.addChild(this.particles, this.trails, this.fxTop, this.nums);

    /** 战斗动态加色光（傍晚基准图中拳风/技能闪光） */
    this.lightLayer = new Container();
    this.dynamicLights = [];
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.circle(0, 0, 120).fill({ color: 0xffe8a8, alpha: 0.18 });
      g.blendMode = 'add';
      this.dynamicLights.push(g);
      this.lightLayer.addChild(g);
    }

    this.particlePool = new Pool(
      () => ({ g: new Graphics(), life: 0, vx: 0, vy: 0, active: false }),
      (p) => {
        p.active = false;
        p.g.visible = false;
        p.g.clear();
      },
      32
    );

    this.numPool = new Pool(
      () => {
        const t = new Text({
          text: '',
          style: {
            fontFamily: 'Impact, sans-serif',
            fontSize: 26,
            fontWeight: '900',
            fill: '#ffd400',
            stroke: { color: '#3a2010', width: 5 },
          },
        });
        t.anchor.set(0.5, 0.5);
        return { t, life: 0, vy: 0 };
      },
      (n) => {
        n.t.visible = false;
        n.life = 0;
      },
      12
    );
  }

  setDynamicLights(points) {
    const max = this.quality.lights;
    for (let i = 0; i < this.dynamicLights.length; i++) {
      const L = this.dynamicLights[i];
      if (i < max && points[i]) {
        L.visible = true;
        L.x = points[i].x;
        L.y = points[i].y;
        L.alpha = points[i].a ?? 0.22;
        if (points[i].col) L.tint = points[i].col;
      } else L.visible = false;
    }
  }

  spawnParticle(x, y, opts = {}) {
    if (this.particleCount >= this.quality.particles) return;
    const p = this.particlePool.acquire();
    p.active = true;
    p.life = opts.life ?? rnd(0.25, 0.55);
    p.vx = opts.vx ?? rnd(-120, 120);
    p.vy = opts.vy ?? rnd(-180, -40);
    p.grav = opts.grav ?? 420;
    p.friction = opts.friction ?? 0.98;
    p.col = opts.col ?? 0xffaa44;
    p.size = opts.size ?? rnd(3, 7);
    p.g.clear();
    if (opts.shape === 'dust') {
      p.g.ellipse(0, 0, p.size * 2.2, p.size).fill({ color: p.col, alpha: 0.75 });
    } else {
      p.g.circle(0, 0, p.size).fill({ color: p.col, alpha: 0.9 });
    }
    p.g.x = x;
    p.g.y = y;
    p.g.visible = true;
    if (!p.g.parent) this.particles.addChild(p.g);
    this.particleCount++;
  }

  burst(x, y, n = 8, col = 0xffcc66) {
    const cap = Math.min(n, this.quality.particles - this.particleCount);
    for (let i = 0; i < cap; i++) {
      const a = rnd(0, Math.PI * 2);
      const sp = rnd(80, 220);
      this.spawnParticle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: rnd(0.15, 0.4) });
    }
  }

  dustPuff(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      this.spawnParticle(x + rnd(-12, 12), y + rnd(-6, 6), {
        vx: rnd(-40, 40),
        vy: rnd(-80, -20),
        col: 0xc8a878,
        size: rnd(5, 11),
        shape: 'dust',
        grav: 180,
        life: rnd(0.35, 0.65),
      });
    }
  }

  /** 参考图：白黄星芒命中闪 */
  hitStarburst(x, y, ang = 0, big = false) {
    const g = new Graphics();
    const spikes = big ? 10 : 7;
    const r1 = big ? 52 : 36;
    const r2 = big ? 18 : 12;
    for (let i = 0; i < spikes; i++) {
      const a = ang + (i / spikes) * Math.PI * 2;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
    g.stroke({ width: big ? 5 : 4, color: 0xffffff, alpha: 0.95 });
    g.circle(x, y, r2).fill({ color: 0xfff8c0, alpha: 0.9 });
    g.circle(x, y, r2 * 1.8).fill({ color: 0xffd040, alpha: 0.35 });
    g.blendMode = 'add';
    g.rotation = 0;
    this.fxTop.addChild(g);
    const life = 0.14;
    const tick = { g, t: life };
    const fade = () => {
      tick.t -= 0.016;
      g.alpha = clamp(tick.t / life, 0, 1);
      if (tick.t <= 0) {
        g.destroy();
        this.app.ticker.remove(fade);
      }
    };
    this.app.ticker.add(fade);
    this.flash = Math.max(this.flash, big ? 0.14 : 0.08);
  }

  spawnDebris(x, y, tex, kind = 'wood') {
    if (this.debrisCount >= this.quality.debris) return null;
    const s = new Sprite(tex);
    s.anchor.set(0.5, 0.5);
    const sc = kind === 'crate' || kind === 'mahjong_table' ? rnd(0.55, 0.85) : rnd(0.45, 0.75);
    s.scale.set(kind === 'wood' ? rnd(0.18, 0.32) : sc);
    s.x = x;
    s.y = y;
    s.rotation = rnd(0, 6.28);
    if (kind === 'wood') s.tint = 0xd4a574;
    const d = {
      s,
      vx: rnd(-160, 160),
      vy: rnd(-220, -80),
      life: rnd(0.8, 1.4),
      rot: rnd(-8, 8),
      bounce: 0.35,
    };
    this.particles.addChild(s);
    this.debrisCount++;
    return d;
  }

  gemBurst(x, y) {
    this.burst(x, y, 10, 0x88ccff);
    this.burst(x, y, 6, 0xc080ff);
    this.spawnParticle(x, y - 10, { col: 0xa0e8ff, size: 12, life: 0.6, vy: -60, grav: 0 });
  }

  damageNum(x, y, txt, tier = 0) {
    const n = this.numPool.acquire();
    n.t.text = String(txt);
    n.t.style.fill = ['#ffe8a0', '#ffd400', '#ff5530'][tier] ?? '#ffd400';
    n.t.style.fontSize = tier === 2 ? 34 : tier === 1 ? 30 : 26;
    n.t.x = x;
    n.t.y = y;
    n.t.visible = true;
    n.life = tier === 2 ? 1.1 : 0.8;
    n.vy = -72;
    if (!n.t.parent) this.nums.addChild(n.t);
  }

  playVfx(frames, x, y, scale = 1, rot = 0) {
    if (!frames?.length) return;
    const anim = new AnimatedSprite(frames);
    anim.anchor.set(0.5, 0.5);
    anim.x = x;
    anim.y = y;
    anim.scale.set(scale);
    anim.rotation = rot;
    anim.animationSpeed = 0.35;
    anim.loop = false;
    anim.blendMode = 'add';
    anim.onComplete = () => anim.destroy();
    this.trails.addChild(anim);
    anim.play();
  }

  update(dt, cam, zoom = 1) {
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.15;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

    this.particleCount = 0;
    for (const p of [...this.particlePool.active]) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.particlePool.release(p);
        continue;
      }
      p.vy += p.grav * dt;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = clamp(p.life * 2, 0, 1);
      this.particleCount++;
    }

    for (const n of [...this.numPool.active]) {
      n.life -= dt;
      if (n.life <= 0) {
        this.numPool.release(n);
        continue;
      }
      n.t.y += n.vy * dt;
      n.t.alpha = clamp(n.life, 0, 1);
    }

    const z = cam.zoom ?? zoom ?? 1;
    const ox = -cam.x * z;
    const oy = -cam.y * z;
    for (const layer of [this.trails, this.particles, this.fxTop, this.nums, this.lightLayer]) {
      layer.position.set(ox, oy);
      layer.scale.set(z);
    }
  }

  applyCameraOffset(cam, targetX, targetY) {
    const sx = (Math.random() - 0.5) * this.shake * 2;
    const sy = (Math.random() - 0.5) * this.shake * 2;
    cam.x = targetX + sx;
    cam.y = targetY + sy;
  }
}
