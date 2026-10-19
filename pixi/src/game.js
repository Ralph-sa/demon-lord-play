/** PixiJS 样板房：围合竞技场、四类杂兵、打击感与 Hades 式光照 */
import {
  Container,
  Sprite,
  AnimatedSprite,
  Graphics,
  TilingSprite,
  Texture,
  Text,
} from '../vendor/pixi.min.mjs';
import {
  VIEW_W,
  VIEW_H,
  WORLD_W,
  WORLD_H,
  EDGE,
  DISPLAY_H,
  SKILLS,
  ENEMY_DEF,
  ENEMY_TYPES,
  QUALITY,
  clamp,
  dist,
  rnd,
  pick,
} from './config.js';
import { Assets } from './assets.js';
import { VfxSystem } from './vfx.js';
import { tierFromFps } from './render/qualityPresets.js';
import { buildArenaRoom, camForFocus, coverInsets } from './arena/ArenaRoom.js';
import { buildDusk1Room } from './arena/Dusk1Room.js';
import { PlayHud } from './ui/PlayHud.js';
import { TouchHud } from './ui/TouchHud.js';
import { touchControlLayout } from './ui/hudLayout.js';

const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= 6.2832;
  while (d < -Math.PI) d += 6.2832;
  return Math.abs(d);
};

function inArc(ex, ey, x, y, ang, range, arc) {
  const d = Math.hypot(ex - x, ey - y);
  return d < range + 14 && (arc > 6 || angDiff(Math.atan2(ey - y, ex - x), ang) < arc / 2);
}

export class Game {
  constructor(app, input, render, sceneData) {
    this.app = app;
    this.input = input;
    this.render = render;
    this.sceneData = sceneData;
    this.qualityName = 'high';
    this.quality = { ...QUALITY.high };
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsN = 0;
    this._frameMsAcc = 0;
    this._frameMsN = 0;
    this.lastFrameMs = 16.7;
    this._lowTimer = 0;
    this._prevX = WORLD_W / 2;
    this._prevY = WORLD_H / 2;

    this.cam = { x: 0, y: 0 };
    this.vfx = new VfxSystem(app, this.quality);

    this.world = render.getWorld();
    this.groundLayer = new Container();
    this.decalsLayer = new Container();
    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.heroLayer = new Container();
    this.heroLayer.sortableChildren = true;
    this.propLayer = new Container();
    this.propLayer.sortableChildren = true;
    this.actorLayer = new Container();
    this.envLayer = new Container();
    this.edgesBack = new Container();
    this.edgesFront = new Container();
    this.props = [];
    this.debris = [];
    this.gems = [];

    const [bldSh, zoneSh, groundSh, projSh] = render.getShadowLayers();
    this.envLayer.addChild(this.groundLayer, bldSh, zoneSh);
    this.envLayer.addChild(this.decalsLayer, this.propLayer, this.edgesBack);
    this.world.addChild(this.envLayer, groundSh, projSh, this.actorLayer, this.edgesFront);
    this.actorLayer.addChild(this.entityLayer, this.heroLayer);
    const ef = render.lighting.getEnvFilter();
    if (ef) this.envLayer.filters = [ef];
    render.setEnvTarget(this.envLayer);
    render.setActorTarget(this.actorLayer);

    app.stage.addChild(this.vfx.root);

    this.hud = new Container();
    this.fpsText = new Text({ text: 'FPS: --', style: { fill: '#7fff7f', fontSize: 18, fontWeight: '700' } });
    this.fpsText.x = 12;
    this.fpsText.y = 8;
    this.qualText = new Text({ text: '画质: 高', style: { fill: '#aaaaff', fontSize: 14 } });
    this.qualText.x = 12;
    this.qualText.y = 30;
    this.hud.addChild(this.fpsText, this.qualText);
    this.fpsText.visible = false;
    this.qualText.visible = false;
    this.bossActive = false;
    this.audio = null;
    this.onCombatStart = null;
    app.stage.addChild(this.hud);

    this.screenUi = new Container();
    this.screenUi.label = 'screenUi';
    this.playHud = new PlayHud();
    this.touchHud = new TouchHud(input);
    this.screenUi.eventMode = 'passive';
    this.screenUi.interactiveChildren = true;
    this.playHud.eventMode = 'none';
    this.touchHud.eventMode = 'none';
    this.screenUi.addChild(this.playHud, this.touchHud);
    this.fgRails = [];
    this.railBaselineY = WORLD_H - 6;

    this.p = this.mkPlayer();
    this.enemies = [];
    this.combo = 0;
    this.comboT = 0;
    this.cds = {};
    this.fury = 40;
    this._shotMode = null;
    this._shotTimer = 0;

    this.buildRoom();
    this.spawnEnemies();
    this.placeDecals();
    const sp = this.sceneData.spawn?.hero || { x: WORLD_W / 2, y: WORLD_H * 0.6 };
    this.p.x = sp.x;
    this.p.y = sp.y;
    this.p.sprite.x = sp.x;
    this.p.sprite.y = sp.y;
    this.render.camera.snapTo(sp.x, sp.y, 0.58);
    this._prevX = sp.x;
    this._prevY = sp.y;
  }

  mkPlayer() {
    const sp = this.sceneData.spawn?.hero || { x: WORLD_W / 2, y: WORLD_H * 0.6 };
    return {
      x: sp.x,
      y: sp.y,
      face: 1,
      speed: 220,
      hp: 120,
      anim: 'idle',
      cast: null,
      hitT: 0,
      shadow: null,
      sprite: null,
      t: 0,
      dashT: 0,
      dashCd: 0,
      dashVx: 0,
      dashVy: 0,
    };
  }

  buildRoom() {
    const arena =
      this.sceneData.assetPack === 'dusk1' && Assets.dusk1
        ? buildDusk1Room(this.sceneData, Assets.dusk1)
        : buildArenaRoom(Assets.ground, Assets.edges);
    this.groundLayer.addChild(arena.root);
    this.edgesBack.removeChildren();
    this.edgesBack.cullableChildren = false;
    while (arena.edgesBack.children.length > 0) {
      this.edgesBack.addChild(arena.edgesBack.children[0]);
    }
    this.edgesFront.removeChildren();
    while (arena.edgesFront.children.length > 0) {
      this.edgesFront.addChild(arena.edgesFront.children[0]);
    }
    this.fgRails = arena.fgRails || [];
    this.railBaselineY = arena.railBaselineY ?? WORLD_H - 6;
    for (const pr of this.sceneData.props || []) {
      this.mkProp(pr);
    }

    const heroFrames = Assets.sprites.hero_idle;
    const spr = new AnimatedSprite(heroFrames || [Texture.EMPTY]);
    spr.anchor.set(0.5, 0.92);
    spr.animationSpeed = 0.12;
    spr.play();
    spr.label = 'hero';
    spr.eventMode = 'none';
    this.p.sprite = spr;
    this.heroLayer.addChild(spr);
    this.render.bindCharacter('hero', spr, { rx: 28, ry: 10 });
  }

  snapCameraHeroScreenY(fraction = 0.6) {
    const p = this.p;
    this.render.camera.applyViewportZoom?.();
    const c = camForFocus(p.x, p.y, this.render.camera._baseZoom, this.sceneData, fraction);
    this.render.camera.worldZoom = c.zoom ?? this.render.camera.worldZoom;
    this.render.camera.x = c.x;
    this.render.camera.y = c.y;
    this.cam.x = c.x;
    this.cam.y = c.y;
  }

  heroDebugInfo() {
    const p = this.p;
    const z = this.render.camera.worldZoom ?? 1;
    const gameX = (p.x - this.cam.x) * z;
    const gameY = (p.y - this.cam.y) * z;
    const rect = this.app.canvas.getBoundingClientRect();
    const screenX = rect.left + (gameX / VIEW_W) * rect.width;
    const screenY = rect.top + (gameY / VIEW_H) * rect.height;
    const { cropTop, cropBottom } = coverInsets();
    const visH = VIEW_H - cropTop - cropBottom;
    const tex = p.sprite?.texture;
    return {
      role: 'hero',
      label: p.sprite?.label,
      visible: !!p.sprite?.visible,
      x: Math.round(p.x),
      y: Math.round(p.y),
      screenXCss: Math.round(screenX),
      screenYCss: Math.round(screenY),
      canvasCss: { w: Math.round(rect.width), h: Math.round(rect.height) },
      gameScreenY: Math.round(gameY),
      screenFraction: Math.round(((gameY - cropTop) / Math.max(1, visH)) * 100) / 100,
      coverZoom: this.render.camera.worldZoom,
      hasHeroFrames: !!(Assets.sprites.hero_idle?.length),
      textureLabel: tex?.label || tex?.textureCacheIds?.[0] || null,
      zIndex: p.sprite?.zIndex,
    };
  }

  mkProp(def) {
    const { kind, x, y } = def;
    const pack = Assets.dusk1?.props?.[kind];
    const meta = pack?.meta;
    const intactKey = kind === 'water_tower' ? `props/${kind}.webp` : `props/${kind}_intact.webp`;
    const built = Assets.dusk1?.makeSprite(intactKey);
    let tex = pack?.intact || Assets.props[kind];
    let ax = 0.5;
    let ay = 0.92;
    let sc = 1;
    if (built) {
      tex = built.texture;
      ax = built.anchor[0];
      ay = built.anchor[1];
      sc = built.scale;
    }
    const s = new Sprite(tex || Texture.EMPTY);
    s.anchor.set(ax, ay);
    s.scale.set(sc);
    s.x = x;
    s.y = y;
    s.zIndex = y;
    this.propLayer.addChild(s);
    const col = meta?.collision;
    const w = col?.w ?? def.w ?? 44;
    const h = col?.h ?? def.h ?? 36;
    const breakable = def.breakable !== false && (pack?.breakable ?? kind !== 'water_tower');
    this.props.push({ kind, x, y, w, h, breakable, sprite: s, hp: breakable ? 30 : 1e9, dead: false, meta });
  }

  placeDecals() {
    const list = this.sceneData.decals;
    if (Array.isArray(list)) {
      for (const dc of list) this.addDecal(dc.kind, dc.x, dc.y, dc.rot ?? 0, dc.scale ?? 1);
      return;
    }
    const cfg = list || { count: 12, kinds: ['crack_long', 'oil_stain', 'manhole'] };
    const kinds = cfg.kinds;
    const P = this.sceneData.play || { x: 48, y: 72, w: 1304, h: 748 };
    for (let i = 0; i < (cfg.count || 12); i++) {
      this.addDecal(pick(kinds), rnd(P.x + 40, P.x + P.w - 40), rnd(P.y + 40, P.y + P.h - 40), rnd(0, 6.28), rnd(0.85, 1.1));
    }
  }

  addDecal(kind, x, y, rot = 0, scale = 1) {
    const tex = Assets.decals[kind] || Assets.dusk1?.decals?.[kind];
    if (!tex) return;
    const spr = new Sprite(tex);
    spr.anchor.set(0.5, 0.5);
    spr.alpha = 0.72;
    spr.rotation = rot;
    spr.scale.set(scale);
    spr.x = x;
    spr.y = y;
    this.decalsLayer.addChild(spr);
  }

  addBattleDecal(x, y) {
    const tex = Assets.decals.crack_long || Assets.decals.crack;
    const spr = new Sprite(tex);
    spr.anchor.set(0.5, 0.5);
    spr.alpha = 0.7;
    spr.rotation = rnd(0, 6.28);
    spr.x = x + rnd(-20, 20);
    spr.y = y + rnd(-10, 10);
    this.decalsLayer.addChild(spr);
  }

  playBounds() {
    return this.sceneData.play || { x: 72, y: 198, w: 1256, h: 588 };
  }

  spawnEnemies() {
    const P = this.playBounds();
    const slots = [
      [P.x + 110, P.y + 100, 'cultivator'],
      [P.x + P.w - 110, P.y + 100, 'cultivator'],
      [P.x + 180, P.y + P.h * 0.52, 'taoist'],
      [P.x + P.w - 180, P.y + P.h * 0.52, 'taoist'],
      [P.x + P.w * 0.32, P.y + 145, 'monk'],
      [P.x + 200, P.y + P.h - 110, 'monk'],
      [P.x + P.w - 200, P.y + P.h - 110, 'paladin'],
      [P.x + P.w * 0.68, P.y + P.h - 120, 'paladin'],
    ];
    for (const [x, y, type] of slots) this.spawnEnemy(type, x, y);
  }

  spawnEnemy(type, x, y) {
    const d = ENEMY_DEF[type];
    const frames = Assets.sprites[`${type}_run`];
    const spr = new AnimatedSprite(frames || [Texture.EMPTY]);
    spr.anchor.set(0.5, 0.92);
    spr.animationSpeed = 0.14;
    spr.play();
    const e = {
      type,
      ...d,
      x,
      y,
      hp: d.hp,
      maxhp: d.hp,
      dead: false,
      t: rnd(0, 2),
      cd: rnd(0.5, 1.5),
      st: 'move',
      stT: 0,
      stun: 0,
      hit: 0,
      kvx: 0,
      kvy: 0,
      face: 1,
      faceAng: 0,
      sprite: spr,
      shadowId: `enemy_${this.enemies.length}`,
    };
    spr.x = x;
    spr.y = y;
    spr.zIndex = y;
    this.entityLayer.addChild(spr);
    this.render.bindCharacter(e.shadowId, spr, { rx: 22, ry: 8 });
    this.enemies.push(e);
    return e;
  }

  sfx(key, opts) {
    this.audio?.playSfx(key, opts);
  }

  bumpCombat() {
    this.onCombatStart?.();
  }

  aimWorld() {
    const p = this.p;
    const z = this.cam.zoom ?? this.render.camera.worldZoom;
    const mx = this.input.mouse.x / z + this.cam.x;
    const my = this.input.mouse.y / z + this.cam.y;
    return { x: mx, y: my, ang: Math.atan2(my - (p.y - 20), mx - p.x) };
  }

  tryDash() {
    const p = this.p;
    if (p.dashCd > 0 || p.dashT > 0 || p.cast) return;
    const { mx, my } = this.input.moveVec();
    const l = Math.hypot(mx, my) || 1;
    const dx = mx || p.face;
    const dy = my;
    p.dashT = 0.22;
    p.dashCd = 0.55;
    p.dashVx = (dx / l) * 420;
    p.dashVy = (dy / l) * 420;
    this.vfx.dustPuff(p.x, p.y, 6);
    this.sfx('hero_dodge');
    this.bumpCombat();
  }

  showTouchUi() {
    return this.input.touch.on || this.input.touch.forceUi;
  }

  updateFgRails() {
    const behind = this.p.y > this.railBaselineY - 48;
    const a = behind ? 0.4 : 0.95;
    for (const s of this.fgRails) s.alpha = a;
  }

  tryFist() {
    const p = this.p;
    if (p.cast || p.hitT > 0) return;
    this.combo = this.comboT > 0 ? (this.combo + 1) % 3 : 0;
    this.comboT = 0.9;
    const a = this.aimWorld();
    p.face = Math.cos(a.ang) < 0 ? -1 : 1;
    const st = this.combo;
    p.cast = { id: 'fist', t: 0, step: st, ang: a.ang, wind: SKILLS.fist.wind, rec: SKILLS.fist.rec * (st === 2 ? 1.5 : 1) };
    const punchKeys = ['hero_punch_light_1', 'hero_punch_light_2', 'hero_punch_heavy'];
    this.sfx(punchKeys[st] || 'hero_punch_light_1', { vol: 0.9 });
    this.bumpCombat();
  }

  trySweep() {
    const p = this.p;
    if (p.cast || this.fury < SKILLS.sweep.cost) return;
    this.fury -= SKILLS.sweep.cost;
    const a = this.aimWorld();
    p.face = Math.cos(a.ang) < 0 ? -1 : 1;
    p.cast = { id: 'sweep', t: 0, ang: a.ang, wind: SKILLS.sweep.wind, rec: SKILLS.sweep.rec };
    this.bumpCombat();
  }

  damageEnemy(e, amt, o = {}) {
    if (e.dead) return;
    let tier = 0;
    if (Math.random() < 0.12) {
      tier = 1;
      amt *= 2;
      if (Math.random() < 0.2) {
        tier = 2;
        amt *= 1.5;
      }
    }
    e.hp -= amt;
    e.hit = 0.12;
    e.sprite.tint = 0xffffff;
    this.vfx.hitStarburst(e.x, e.y - 28, o.dir ?? 0, tier >= 1);
    this.vfx.dustPuff(e.x, e.y, tier >= 1 ? 7 : 4);
    this.render.lighting.spawnDynamic({
      x: e.x,
      y: e.y - 20,
      radius: tier >= 2 ? 100 : 70,
      intensity: 0.7,
      life: 0.18,
      color: 0xfff0c0,
    });
    if (tier >= 2) {
      const z = this.cam.zoom ?? this.render.camera.worldZoom ?? 1;
      const sx = (e.x - this.cam.x) * z;
      const sy = (e.y - 60 - this.cam.y) * z;
      this.render.onHeavyHit(e.x, e.y - 30, sx, sy, { strong: true });
    }
    this.vfx.damageNum(e.x + rnd(-10, 10), e.y - 55, Math.round(amt), tier);
    const hs = Math.min(0.1, 0.012 + amt / 800) * (tier ? 1.3 : 1);
    this.vfx.hitstop = Math.max(this.vfx.hitstop, hs);
    if (o.kb) {
      const ang = o.dir ?? Math.atan2(e.y - this.p.y, e.x - this.p.x);
      e.kvx = Math.cos(ang) * o.kb * 2.5;
      e.kvy = Math.sin(ang) * o.kb * 2.5;
    }
    if (o.stun) e.stun = Math.max(e.stun, o.stun);
    this.vfx.burst(e.x, e.y - 30, 6, 0xffaa55);
    if (tier >= 2) {
      this.sfx('hit_crit');
      this.sfx('hit_boom', { vol: 0.75 });
    } else if (tier >= 1) this.sfx('hit_heavy');
    else this.sfx('hit_light');
    if (e.hp <= 0) this.killEnemy(e);
    else {
      this.sfx('enemy_hit');
      e.sprite.tint = 0xffffff;
      setTimeout(() => {
        if (!e.dead) e.sprite.tint = 0xffffff;
      }, 50);
    }
    this.addBattleDecal(e.x, e.y);
  }

  killEnemy(e) {
    e.dead = true;
    e.sprite.visible = false;
    this.sfx('enemy_death');
    this.vfx.burst(e.x, e.y - 20, 14);
    this.vfx.spawnParticle(e.x, e.y - 30, { col: 0x88ccff, life: 0.5, vy: -100 });
    this.gems.push({ x: e.x, y: e.y, t: 0, sprite: null });
    const im = Assets.items.item_gem_small;
    if (im) {
      const s = new Sprite(Texture.from(im));
      s.anchor.set(0.5, 0.5);
      s.x = e.x;
      s.y = e.y - 20;
      s.zIndex = e.y;
      this.entityLayer.addChild(s);
      this.gems[this.gems.length - 1].sprite = s;
    }
  }

  breakCrate(prop, hitX, hitY) {
    if (prop.dead || !prop.breakable) return;
    prop.dead = true;
    const propSfx = {
      crate: 'prop_crate_break',
      clay_jar: 'prop_jar_break',
      aircon: 'prop_ac_metal',
      gas_canister: 'prop_gas_explode',
      bucket: 'prop_jar_break',
      mahjong_table: 'prop_crate_break',
      water_tower: 'prop_ac_metal',
    };
    this.sfx(propSfx[prop.kind] || 'prop_glass_break');
    const broken = Assets.dusk1?.props?.[prop.kind]?.broken;
    if (broken) {
      prop.sprite.texture = broken;
      prop.sprite.visible = true;
      prop.sprite.alpha = 0.95;
    } else {
      prop.sprite.visible = false;
    }
    this.vfx.shake = Math.max(this.vfx.shake, 8);
    this.vfx.hitStarburst(hitX, hitY - 10, 0, true);
    if (Assets.vfx.dust) this.vfx.playVfx(Assets.vfx.dust, hitX, hitY, 0.45, 0);
    else this.vfx.dustPuff(hitX, hitY, 10);
    if (prop.kind === 'gas_canister' && Assets.vfx.gas_explode) {
      this.vfx.playVfx(Assets.vfx.gas_explode, hitX, hitY - 20, 0.55, 0);
    } else {
      this.vfx.burst(hitX, hitY, 16, 0xdeb887);
    }
    const frags = Assets.dusk1?.props?.[prop.kind]?.fragments || [];
    const n = frags.length ? frags.length : 8;
    for (let i = 0; i < n; i++) {
      const tex = frags[i % Math.max(1, frags.length)] || Assets.props.crate;
      const d = this.vfx.spawnDebris(hitX, hitY, tex, prop.kind);
      if (d) this.debris.push(d);
    }
    this.vfx.gemBurst(prop.x, prop.y - 20);
    this.render.onGemBurst(prop.x, prop.y - 15);
    this.addDecal('crack_web', prop.x, prop.y, rnd(0, 1), 0.9);
    const im = Assets.items.item_gem_small;
    if (im) {
      const s = new Sprite(Texture.from(im));
      s.anchor.set(0.5, 0.5);
      s.x = prop.x;
      s.y = prop.y - 15;
      s.zIndex = prop.y;
      this.entityLayer.addChild(s);
      this.gems.push({ x: prop.x, y: prop.y, t: 0, sprite: s });
    }
  }

  hitProps(x, y, range) {
    for (const pr of this.props) {
      if (pr.dead) continue;
      if (Math.hypot(pr.x - x, pr.y - y) < range + pr.w * 0.5) {
        if (pr.breakable) {
          pr.hp -= 20;
          if (pr.hp <= 0) this.breakCrate(pr, pr.x, pr.y);
        }
      }
    }
  }

  resolveCast() {
    const p = this.p;
    const c = p.cast;
    if (!c || c.t < c.wind) return;
    if (c.done) return;
    c.done = true;
    if (c.id === 'fist') {
      const st = c.step;
      const P = SKILLS.fist;
      this.sfx(['hero_punch_light_1', 'hero_punch_light_2', 'hero_punch_light_3'][st] || 'hero_punch_light_1');
      if (st === 2) this.sfx('hero_punch_heavy', { vol: 0.85 });
      const frames = Assets.vfx.punch_spark || Assets.vfx.punch;
      const hx = p.x + Math.cos(c.ang) * 45;
      const hy = p.y - 25;
      this.vfx.playVfx(frames, hx, hy, 0.55, c.ang);
      this.vfx.hitStarburst(hx, hy, c.ang, st === 2);
      this.vfx.dustPuff(p.x, p.y, 3);
      for (const e of this.enemies) {
        if (!e.dead && inArc(e.x, e.y, p.x, p.y, c.ang, P.range + (st === 2 ? 20 : 0), P.arc)) {
          this.damageEnemy(e, P.dmg[st], { dir: c.ang, kb: P.kb[st], stun: st === 2 ? 0.8 : 0.12 });
        }
      }
      this.hitProps(p.x + Math.cos(c.ang) * 50, p.y + Math.sin(c.ang) * 30, 50);
      this.render.lighting.spawnDynamic({
        x: hx,
        y: hy,
        radius: st === 2 ? 120 : 80,
        intensity: 0.85,
        life: 0.16,
        color: 0xfff8e8,
      });
      if (st === 2 && !this._lightHitFx) {
        this.vfx.shake = Math.max(this.vfx.shake, 6);
        const z = this.cam.zoom ?? this.render.camera.worldZoom ?? 1;
        this.render.onHeavyHit(hx, hy, (hx - this.cam.x) * z, (hy - this.cam.y) * z, { strong: true });
      }
    } else if (c.id === 'sweep') {
      const P = SKILLS.sweep;
      this.sfx('hero_pipe_swing');
      this.vfx.playVfx(Assets.vfx.sweep, p.x, p.y - 20, 0.75, c.ang);
      this.vfx.hitStarburst(p.x + Math.cos(c.ang) * 70, p.y - 30, c.ang, true);
      this.vfx.dustPuff(p.x, p.y, 8);
      this.vfx.shake = Math.max(this.vfx.shake, 10);
      this.render.onSweep(p.x, p.y - 25);
      let pipeHit = false;
      for (const e of this.enemies) {
        if (!e.dead && inArc(e.x, e.y, p.x, p.y, c.ang, P.range, P.arc)) {
          pipeHit = true;
          this.damageEnemy(e, P.dmg, { dir: Math.atan2(e.y - p.y, e.x - p.x), kb: P.kb, stun: 0.5 });
        }
      }
      if (pipeHit) this.sfx('hero_pipe_hit');
      this.hitProps(p.x, p.y, P.range * 0.6);
    }
  }

  enemyAI(e, dt) {
    const p = this.p;
    e.kvx *= Math.pow(0.002, dt);
    e.kvy *= Math.pow(0.002, dt);
    e.x += e.kvx * dt;
    e.y += e.kvy * dt;
    e.hit -= dt;
    e.cd -= dt;
    if (e.stun > 0) {
      e.stun -= dt;
      return;
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.faceAng = Math.atan2(dy, dx);
    e.face = dx < 0 ? -1 : 1;
    let mvx = dx / d;
    let mvy = dy / d;
    if (e.ai === 'ranged' && d < 220) {
      mvx = -mvx;
      mvy = -mvy;
    } else if (e.ai === 'healer' && d < 180) {
      mvx = -mvx;
      mvy = -mvy;
    }
    if (e.st === 'wind') {
      e.stT -= dt;
      if (e.stT <= 0) {
        e.st = 'rec';
        e.stT = 0.5;
        if (d < (e.reach || 120) + 30) {
          this.p.hitT = 0.2;
          this.vfx.shake = 4;
          this.sfx('hero_hurt');
        }
      }
      return;
    }
    if (e.st === 'rec') {
      e.stT -= dt;
      if (e.stT <= 0) e.st = 'move';
      return;
    }
    if (e.cd <= 0 && d < (e.reach || e.range || 100) + 40) {
      e.st = 'wind';
      e.stT = e.wind || 0.5;
      e.cd = e.cd0 || 2;
      const atkSfx = {
        cultivator: 'enemy_xiuxian_sword',
        taoist: 'enemy_daoshi_talisman',
        monk: 'enemy_monk_staff',
        paladin: 'enemy_paladin_shield',
      };
      this.sfx(atkSfx[e.type]);
      return;
    }
    e.x += mvx * e.speed * dt;
    e.y += mvy * e.speed * dt;
    const P = this.playBounds();
    e.x = clamp(e.x, P.x + 28, P.x + P.w - 28);
    e.y = clamp(e.y, P.y + 28, P.y + P.h - 28);
  }

  collideProps(ent, r = 14) {
    for (const pr of this.props) {
      if (pr.dead) continue;
      const dx = ent.x - pr.x;
      const dy = ent.y - pr.y;
      const m = r + pr.w * 0.45;
      const d = Math.hypot(dx, dy);
      if (d < m && d > 0) {
        const k = (m - d) / d;
        ent.x += dx * k * 0.5;
        ent.y += dy * k * 0.5;
      }
    }
  }

  update(dt) {
    if (this._shotMode) this._shotTimer += dt;

    const frameMs = dt * 1000;
    this.lastFrameMs = frameMs;
    this._frameMsAcc += frameMs;
    this._frameMsN++;

    // FPS / 自动降档（用帧耗时推算，避免 headless rAF 节流导致恒 20）
    this._fpsAcc += dt;
    this._fpsN++;
    if (this._fpsAcc >= 0.5) {
      this.fps =
        this._frameMsN > 0 ? Math.round(1000 / (this._frameMsAcc / this._frameMsN)) : Math.round(this._fpsN / this._fpsAcc);
      this._frameMsAcc = 0;
      this._frameMsN = 0;
      this._fpsAcc = 0;
      this._fpsN = 0;
      this.fpsText.text = `FPS: ${this.fps}`;
      const dbg = this.render.debug?.visible;
      this.fpsText.visible = !!dbg;
      this.qualText.visible = !!dbg;
      if (this.fps < 48) this._lowTimer += 0.5;
      else this._lowTimer = Math.max(0, this._lowTimer - 0.5);
      const tier = tierFromFps(this.fps, this.qualityName, this._lowTimer);
      this._lowTimer = tier.lowTimer;
      if (tier.tier !== this.qualityName) this.setQuality(tier.tier);
      this.render.reportFps(this.fps);
    }

    const p = this.p;
    const { mx, my } = this.input.moveVec();
    let realDt = this.vfx.hitstop > 0 ? dt * 0.12 : dt;

    if (p.dashCd > 0) p.dashCd -= realDt;
    if (p.dashT > 0) {
      p.dashT -= realDt;
      p.x += p.dashVx * realDt;
      p.y += p.dashVy * realDt;
    } else if (!this._shotMode) {
      if (mx || my) {
        p.x += mx * p.speed * realDt;
        p.y += my * p.speed * realDt;
        p.face = mx < 0 ? -1 : mx > 0 ? 1 : p.face;
      }
      if (this.input.wantDodge()) this.tryDash();
      if (this.input.wantFist()) this.tryFist();
      if (this.input.wantSweep()) this.trySweep();
    }

    const P = this.playBounds();
    p.x = clamp(p.x, P.x + 20, P.x + P.w - 20);
    p.y = clamp(p.y, P.y + 20, P.y + P.h - 20);
    this.collideProps(p);

    if (p.cast) {
      p.cast.t += realDt;
      if (!p.cast.done && p.cast.t >= p.cast.wind) this.resolveCast();
      if (p.cast.t >= p.cast.wind + p.cast.rec) p.cast = null;
    }

    this.comboT -= realDt;
    p.hitT -= realDt;
    p.t += realDt;

    let anim = 'idle';
    if (p.cast?.id === 'sweep') anim = 'sweep';
    else if (p.cast?.id === 'fist') anim = 'attack';
    else if (mx || my) anim = 'run';
    if (p.anim !== anim) {
      p.anim = anim;
      const fr = Assets.sprites[`hero_${anim}`];
      if (fr?.length) {
        p.sprite.textures = fr;
        p.sprite.animationSpeed = anim === 'attack' ? 0.28 : 0.14;
        p.sprite.play();
      }
    }
    p.sprite.scale.x = p.face;
    p.sprite.x = p.x;
    p.sprite.y = p.y;
    p.sprite.zIndex = p.y + 1_000_000;
    if (p.hitT > 0) p.sprite.tint = 0xffffff;
    this.render.updateCharacterShadow('hero', p.x, p.y, p.face);

    for (const e of this.enemies) {
      if (!e.dead) {
        this.enemyAI(e, realDt);
        this.collideProps(e, e.r);
        const fr = Assets.sprites[`${e.type}_${e.st === 'wind' ? 'attack' : 'run'}`];
        if (fr?.length && e.sprite.textures !== fr) {
          e.sprite.textures = fr;
          e.sprite.play();
        }
        e.sprite.scale.x = e.face;
        e.sprite.x = e.x;
        e.sprite.y = e.y;
        e.sprite.zIndex = e.y;
        if (e.hit > 0) e.sprite.tint = 0xffffff;
        else e.sprite.tint = 0xffffff;
        this.render.updateCharacterShadow(e.shadowId, e.x, e.y, e.face);
      }
    }

    for (const d of this.debris) {
      d.life -= realDt;
      d.vy += 520 * realDt;
      d.s.x += d.vx * realDt;
      d.s.y += d.vy * realDt;
      d.s.rotation += d.rot * realDt;
      if (d.s.y > WORLD_H - 40 && d.vy > 0) {
        d.vy *= -d.bounce;
        d.vx *= 0.7;
      }
      d.s.alpha = clamp(d.life, 0, 1);
      if (d.life <= 0) {
        d.s.destroy();
        this.vfx.debrisCount--;
      }
    }
    this.debris = this.debris.filter((d) => d.life > 0);

    const vx = (p.x - this._prevX) / Math.max(realDt, 0.001);
    const vy = (p.y - this._prevY) / Math.max(realDt, 0.001);
    this._prevX = p.x;
    this._prevY = p.y;
    this.render.setVelocity(vx, vy);
    const camState = this.render.update(realDt, { x: p.x, y: p.y - 20 });
    realDt *= camState.timeScale;
    this.cam.x = camState.cam.x;
    this.cam.y = camState.cam.y;
    this.cam.zoom = camState.cam.zoom ?? this.render.camera.worldZoom;
    this.vfx.applyCameraOffset(this.cam, this.cam.x, this.cam.y);
    this.vfx.update(realDt, this.cam, this.cam.zoom);
    this.updateFgRails();

    this.drawPlayHud();
    this.drawTouchHud();
  }

  drawPlayHud() {
    const p = this.p;
    this.playHud.redraw({
      hp: clamp(p.hp / 120, 0, 1),
      fury: clamp(this.fury / 100, 0, 1),
      bossActive: this.bossActive,
      comboHighlight: this.combo,
      touchLayout: this.showTouchUi(),
    });
  }

  drawTouchHud() {
    this.touchHud.redraw(this.showTouchUi());
  }

  setQuality(name) {
    this.qualityName = name;
    this.quality = { ...QUALITY[name] };
    this.vfx.quality = this.quality;
    this.render.setTier(name);
    const labels = { high: '高', mid: '中', low: '低' };
    this.qualText.text = `画质: ${labels[name]}`;
  }

  cycleQuality() {
    const order = ['high', 'mid', 'low'];
    const i = (order.indexOf(this.qualityName) + 1) % 3;
    this.setQuality(order[i]);
  }

  /** Playwright 验收：切入指定镜头 */
  _snapCameraToPlayer() {
    const p = this.p;
    this.render.camera.snapTo(p.x, p.y);
    this.cam.x = this.render.camera.x;
    this.cam.y = this.render.camera.y;
    p.sprite.x = p.x;
    p.sprite.y = p.y;
  }

  stageScreenshot(mode) {
    this._shotMode = mode;
    this._shotTimer = 0;
    const p = this.p;
    const sp = this.sceneData.spawn?.hero || { x: WORLD_W / 2, y: WORLD_H * 0.6 };
    p.x = sp.x;
    p.y = sp.y;
    this.fury = 80;
    if (mode === 'attack') {
      p.cast = { id: 'fist', t: 0.18, step: 2, ang: 0.2, wind: 0.1, rec: 0.2, done: false };
      p.anim = 'attack';
      const fr = Assets.sprites.hero_attack;
      if (fr) {
        p.sprite.textures = fr;
        p.sprite.play();
      }
      this.resolveCast();
    } else if (mode === 'crate') {
      const crate = this.props.find((pr) => pr.breakable && !pr.dead);
      if (crate) {
        p.x = crate.x - 30;
        p.y = crate.y + 10;
        this.breakCrate(crate, crate.x, crate.y);
        this.vfx.burst(crate.x, crate.y, 20, 0xffcc88);
      }
    } else if (mode === 'lights' || mode === 'lights_night') {
      this.render.camera.snapOverview();
      for (const L of this.sceneData.staticLights || []) {
        this.render.lighting.spawnDynamic({
          x: L.poolX ?? L.x,
          y: L.poolY ?? L.y,
          radius: (L.radius ?? 70) * 1.35,
          intensity: 1.05,
          life: 2.5,
          color: parseInt(String(L.color).replace('#', ''), 16) || 0xffc860,
        });
      }
    } else if (mode === 'room_compare') {
      this.render.camera.snapOverview();
      p.x = this.sceneData.spawn?.hero?.x ?? 700;
      p.y = this.sceneData.spawn?.hero?.y ?? 520;
    } else if (mode === 'mobile_landscape_attack') {
      this.input.touch.forceUi = true;
      const { joyX, joyY } = touchControlLayout();
      this.input.touch.joy = { id: -1, ox: joyX, oy: joyY, x: joyX, y: joyY };
      this.input.touch.jx = 0.35;
      this.input.touch.jy = -0.1;
      p.cast = { id: 'fist', t: 0.16, step: 1, ang: 0.35, wind: 0.1, rec: 0.2, done: false };
      this.resolveCast();
    } else if (mode === 'post_off') {
      this.setQuality('high');
      this.render.post.setToggles({
        bloom: false,
        colorGrade: false,
        vignette: false,
        chromatic: false,
        radialDistort: false,
        damageVignette: false,
      });
      this.render.lighting.enabled = true;
      const ef = this.render.lighting.getEnvFilter();
      this.envLayer.filters = ef ? [ef] : null;
      this.actorLayer.filters = [this.render.actorBoost, this.render.lighting.hitFlashFilter];
    } else if (mode === 'post_on') {
      this.setQuality('high');
      this.render.lighting.enabled = true;
      const ef = this.render.lighting.getEnvFilter();
      this.envLayer.filters = ef ? [ef] : null;
      this.actorLayer.filters = [this.render.actorBoost, this.render.lighting.hitFlashFilter];
      this.render.post.setQuality(this.quality);
    } else if (mode === 'heavy_hit' || mode === 'combat_hit' || mode === 'desktop_attack') {
      this._lightHitFx = mode === 'desktop_attack';
      const enemy = this.enemies.find((e) => !e.dead && e.x > p.x + 40) || this.enemies.find((e) => !e.dead);
      if (enemy) {
        p.x = enemy.x - 72;
        p.y = enemy.y + 6;
        p.face = 1;
        enemy.sprite.visible = true;
      }
      p.cast = { id: 'fist', t: 0.2, step: 2, ang: 0, wind: 0.1, rec: 0.2, done: false };
      p.anim = 'attack';
      const fr = Assets.sprites.hero_attack;
      if (fr) {
        p.sprite.textures = fr;
        p.sprite.play();
      }
      this.resolveCast();
      if (enemy) {
        enemy.hit = 0.2;
        enemy.sprite.tint = 0xffffff;
        this.vfx.hitStarburst(enemy.x, enemy.y - 28, 0, true);
        this.vfx.flash = 0.1;
        const z = this.render.camera.worldZoom;
        const hx = enemy.x - 8;
        const hy = enemy.y - 26;
        this.render.onHeavyHit(hx, hy, (hx - this.cam.x) * z, (hy - this.cam.y) * z, { strong: true });
      }
      this._lightHitFx = false;
    } else if (mode === 'opening' || mode === 'desktop_opening') {
      for (const e of this.enemies) {
        e.sprite.visible = false;
      }
      p.sprite.visible = true;
      p.sprite.zIndex = 900000;
      p.sprite.tint = 0xffffff;
      const fr = Assets.sprites.hero_idle;
      if (fr?.length) {
        p.sprite.textures = fr;
        p.sprite.play();
      }
      this.snapCameraHeroScreenY(0.6);
    } else if (mode === 'room_compare' || mode === 'lights_night') {
      this.render.camera.snapOverview();
    } else {
      this._snapCameraToPlayer();
    }
    this.cam.x = this.render.camera.x;
    this.cam.y = this.render.camera.y;
    p.sprite.x = p.x;
    p.sprite.y = p.y;
    this.updateFgRails();
    this.drawPlayHud();
    this.drawTouchHud();
    if (mode === 'opening' || mode === 'desktop_opening') {
      for (const e of this.enemies) {
        if (e.sprite) e.sprite.visible = true;
      }
    }
    p.sprite.zIndex = p.y + 1_000_000;
    this._shotMode = null;
    return {
      mode,
      fps: this.fps,
      quality: this.qualityName,
      tier: this.qualityName,
      frameMs: Math.round(this.lastFrameMs * 100) / 100,
      hero: this.heroDebugInfo(),
    };
  }

  getPerfSnapshot() {
    const r = this.app.renderer;
    let renderables = 0;
    const walk = (c) => {
      if (!c?.children) return;
      for (const ch of c.children) {
        renderables++;
        walk(ch);
      }
    };
    walk(this.world);
    return {
      fps: this.fps,
      frameMs: Math.round(this.lastFrameMs * 100) / 100,
      tier: this.qualityName,
      drawCalls: r.renderPipes?.batch?.renderableCount ?? renderables,
    };
  }

  renderFlash() {
    if (this.vfx.flash <= 0) return;
    const overlay = this.app.stage.children.find((c) => c.label === 'flash');
    // 用 ticker 里画 flash 在 main 处理
  }
}
