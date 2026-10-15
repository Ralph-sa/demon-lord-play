import {Art,RARITY} from './art.js';
import {BEHAVIOR} from './skills.js';
import {Audio} from './audio.js';
const C=document.getElementById('c'),g=C.getContext('2d'),W=1280,H=720,WORLD={w:2200,h:1500};
const J=u=>fetch(u).then(r=>r.json());
const [WEAPONS,ENEMIES,WAVES,ITEMS,SK,LOOT]=await Promise.all(['weapons','enemies','waves','items','skills','loot'].map(n=>J(`data/${n}.json`)));
await Art.load();
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return Math.abs(d)};
// ---------- 输入 ----------
const keys={},mouse={x:W/2,y:H/2,l:false,r:false};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' ')e.preventDefault();if(!keys[k])onKey(k);keys[k]=true});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
C.addEventListener('contextmenu',e=>e.preventDefault());
C.addEventListener('mousemove',e=>{const r=C.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height});
C.addEventListener('mousedown',e=>{if(e.button===2)mouse.r=true;else{mouse.l=true;if(onClick())mouse.l=false}});
addEventListener('mouseup',e=>{if(e.button===2)mouse.r=false;else mouse.l=false});
let S;
function newRun(){audioState='';S={state:'title',t:0,wave:0,waveT:0,spawnT:0,cam:{x:0,y:0},shake:0,hitstop:0,flash:0,impactT:0,clickMove:false,
 p:{x:WORLD.w/2,y:WORLD.h/2,z:0,hp:120,maxhp:120,fury:0,base:{dmg:1,speed:220,crit:0.08,fury:1,cdr:0,regen:0.5},lv:1,xp:0,xpNext:10,form:'punk',face:1,inv:0,dashT:0,hitT:0,deathT:0,slowT:0,cast:null,moveTo:null},
 enemies:[],projs:[],eproj:[],gems:[],fx:[],decals:[],zones:[],timers:[],flasks:[],nums:[],loot:[],helpers:[mkW('dart')],
 gear:{glove:null,coat:null,chain:null},items:[],soul:0,cds:{},runes:{},buffs:{},combo:0,comboT:0,
 choices:null,shop:null,locked:[],stats:{kills:0,dmg:0,soulTotal:0,time:0,elites:0,maxHit:0},evolved:false,boss:null}}
function mkW(id){const b=WEAPONS.find(w=>w.id===id);return{...b,dmg:Math.round(b.dmg*0.6),t:0}} // 小弟助攻：副层自动武器
newRun();
// ---------- 属性 ----------
function stat(k){const p=S.p;let v=p.base[k]??0;for(const it of Object.values(S.gear))if(it)v+=(it.stats[k]||0)*(k==='speed'?p.base.speed:1);
 if(k==='dmg'&&S.buffs.roar>0)v+=SK.roar.buff;if(k==='dmg'&&S.evolved)v+=0.25;return v}
const leg=id=>Object.values(S.gear).some(it=>it?.leg?.id===id);
function maxhp(){return S.p.maxhp+Object.values(S.gear).reduce((s,it)=>s+(it?.stats.hp||0),0)}
// ---------- 战斗核心 ----------
function damage(e,amt,o={}){if(e.dead||e.invuln>0)return;const p=S.p;let tier=0;amt*=stat('dmg');
 if(Math.random()<stat('crit')){tier=1;amt*=2;if(Math.random()<0.25){tier=2;amt*=1.6}}
 const fromAng=Math.atan2(p.y-e.y,p.x-e.x);
 if(e.type==='paladin'&&e.stun<=0&&!o.dot&&angDiff(fromAng,e.faceAng)<1.0){amt*=0.15;o={...o,kb:(o.kb||0)*0.2,stun:o.stun>=1?o.stun:0};num(e.x,e.y-70,'格挡',0,'#aac');S.fx.push({type:'spark',x:e.x+Math.cos(e.faceAng)*20,y:e.y-30,t:0.15})}
 if(e.bubble>0){e.bubble-=amt;num(e.x,e.y-70,'护盾',0,'#d0d0ff');return}
 e.hp-=amt;e.hit=0.1;S.stats.dmg+=amt;S.stats.maxHit=Math.max(S.stats.maxHit,amt);
 if(!o.dot){num(e.x+rnd(-12,12),e.y-60-e.z,Math.round(amt),tier);
  const hs=Math.min(0.13,0.015+amt/700)*(tier?1.4:1);if(e.ai!=='boss'||amt>60)S.hitstop=Math.max(S.hitstop,hs);
  if(o.kb&&e.ai!=='boss'){const m=e.type==='paladin'?0.5:1;const a=o.dir??Math.atan2(e.y-p.y,e.x-p.x);e.kvx=Math.cos(a)*o.kb*m*3;e.kvy=Math.sin(a)*o.kb*m*3}
  if(o.stun&&e.ai!=='boss'){e.stun=Math.max(e.stun,o.stun);if(e.st==='wind'){e.st='idle';num(e.x,e.y-90,'打断',0,'#6bf')}}
  if(o.knockup&&e.ai!=='boss'&&e.z<=0){e.vz=o.knockup;e.z=1}
  if(tier===2)impact()}
 if(o.slow){e.slowT=2;e.slowF=o.slow}
 if(e.hp<=0)kill(e);else Audio.playSfx('enemy_hurt',{vol:0.7})}
function kill(e){Audio.playSfx('enemy_die',{vol:0.75});e.dead=true;S.stats.kills++;S.decals.push({x:e.x,y:e.y,r:e.r*1.6,t:8,seed:Math.random()*99});if(Art.sprites[e.type+'_death'])S.fx.push({type:'corpse',key:e.type+'_death',x:e.x,y:e.y,face:e.face||1,t:1.6,t0:1.6});S.fx.push({type:'splash',x:e.x,y:e.y-20,t:0.35,r:e.r*2});
 S.gems.push({x:e.x,y:e.y,xp:e.xp*(e.elite?3:1),soul:e.soul*(e.elite?3:1)});
 const ch=e.elite?0.8:e.ai==='boss'?1:0.05;if(Math.random()<ch)dropLoot(e.x,e.y,e.ai==='boss'?3:e.elite?(Math.random()<0.35?3:2):undefined);
 if(e.elite){S.stats.elites++;impact()}if(e.ai==='boss'){S.flash=0.8;S.hitstop=0.5;for(let i=0;i<3;i++)dropLoot(e.x+rnd(-80,80),e.y+rnd(-40,40))}}
function num(x,y,txt,tier,c){S.nums.push({x,y,txt:''+txt,t:tier===2?1.1:0.75,tier,c:c||['#fff','#ffd400','#ff3b2f'][tier]})}
function impact(){S.impactT=0.07;S.shake=Math.max(S.shake,10)}
function hurt(d,src){const p=S.p;if(p.inv>0||p.dashT>0||p.deathT>0)return;if(S.buffs.guard>0)d*=0.6;p.hp=Math.max(0,p.hp-d);p.inv=0.45;p.hitT=0.35;S.shake=Math.max(S.shake,8);S.hitstop=Math.max(S.hitstop,0.05);num(p.x,p.y-80,'-'+Math.round(d),0,'#f44');
 if(src?.affix==='冰冻')p.slowT=1.5;Audio.playSfx('hurt',{vol:0.85});if(p.hp<=0&&!p.deathT){Audio.playSfx('die');p.deathT=1.2;p.anim='death';p.cast=null;p.dashT=0;p.hitT=0}}
const inArc=(e,x,y,ang,range,arc)=>{const d=Math.hypot(e.x-x,e.y-y);return d<range+e.r&&(arc>6||angDiff(Math.atan2(e.y-y,e.x-x),ang)<arc/2)};
const ctx={get S(){return S},P:SK,rune:id=>S.runes[id],leg,damage,impact,
 arc:(x,y,a,r,arc)=>S.enemies.filter(e=>!e.dead&&inArc(e,x,y,a,r,arc)),circle:(x,y,r)=>S.enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,(e.y-y)*1.3)<r+e.r),
 fx:f=>S.fx.push(f),zone:z=>S.zones.push(z),shake:n=>S.shake=Math.max(S.shake,n),gain:n=>S.p.fury=Math.min(100,S.p.fury+n*stat('fury')),
 later:(t,fn)=>S.timers.push({t,fn}),proj:o=>S.projs.push({...o,vx:Math.cos(o.ang)*o.speed,vy:Math.sin(o.ang)*o.speed,hitset:new Set()}),
 flask:(x,y,tx,ty,fn)=>S.flasks.push({sx:x,sy:y,tx,ty,t:0,T:0.45,fn})};
const ORDER=['fist','sweep','leap','molotov','roar','domain'];
function aim(){const p=S.p;if(T.aim){const q=T.aim;return{x:q.x,y:q.y,ang:Math.atan2(q.y-(p.y-20),q.x-p.x),d:Math.hypot(q.x-p.x,q.y-p.y)}}const x=mouse.x+S.cam.x,y=mouse.y+S.cam.y;return{x,y,ang:Math.atan2(y-(p.y-20),x-p.x),d:Math.hypot(x-p.x,y-p.y)}}
function tryCast(id){const p=S.p,P=SK[id];if(p.deathT>0||p.cast||p.dashT>0||p.z>0)return false;if(P.demon&&!S.evolved)return false;if((S.cds[id]||0)>0)return false;
 if(p.fury<P.cost){if(!S.noFuryT||S.noFuryT<0){num(p.x,p.y-100,'气势不足',0,'#f9a');S.noFuryT=0.8}return false}
 p.fury-=P.cost;let cd=P.cd*(1-stat('cdr'));if(id==='roar'&&leg('dragonStaff'))cd-=4;S.cds[id]=cd;
 const a=aim();const cast={id,ang:a.ang,t:0,wind:P.wind,rec:P.rec,air:0,done:false};p.face=Math.cos(a.ang)<0?-1:1;BEHAVIOR[id].start?.(ctx,a,cast);p.cast=cast;return true}
function dash(){const p=S.p;if(p.deathT>0||(S.cds.dash||0)>0||p.z>0)return;if(p.cast&&p.cast.t<p.cast.wind)p.cast=null;else if(p.cast&&!p.cast.done)return;p.cast=null;
 let mx=(keys.d?1:0)-(keys.a?1:0)+T.jx,my=(keys.s?1:0)-(keys.w?1:0)+T.jy;let a=mx||my?Math.atan2(my,mx):aim().ang;p.dvx=Math.cos(a)*SK.dash.speed;p.dvy=Math.sin(a)*SK.dash.speed;p.dashT=SK.dash.dur;p.inv=SK.dash.iframes;S.cds.dash=SK.dash.cd;Audio.playSfx('dodge',{vol:0.8})}
function updateCast(dt){const p=S.p,c=p.cast;if(!c)return;c.t+=dt;const B=BEHAVIOR[c.id];
 if(c.air&&c.t>c.wind&&c.t<c.wind+c.air)B.air(ctx,c,(c.t-c.wind)/c.air);
 if(!c.done&&c.t>=c.wind+c.air){c.done=true;B.active(ctx,c)}
 if(c.t>=c.wind+c.air+c.rec)p.cast=null}
// ---------- 波次 / 刷怪 ----------
let bannerTxt='',bannerT=0;const banner=t=>{bannerTxt=t;bannerT=2.2};
function startWave(){const fromTitle=S.state==='title';if(fromTitle)Audio.playSfx('ui_start');S.wave++;const w=WAVES[S.wave-1];S.waveT=w.t;S.spawnT=0.5;S.state='play';S.enemies=[];S.eproj=[];S.zones=[];S.loot=S.loot.filter(l=>l.rarity>=2);
 if(w.boss){S.boss=spawn(w.boss,S.p.x,S.p.y-380);S.boss.phase=1;S.boss.patT=2;banner('BOSS：大天使·米迦 降临！')}else banner('第 '+S.wave+' 波');
 for(let i=0;i<(w.elite||0);i++)S.timers.push({t:6+i*12,fn:()=>elitePack()})}
function spawn(type,x,y,affix){const d=ENEMIES[type],sc=1+(S.wave-1)*0.13;
 if(x==null){const a=rnd(0,6.28),r=rnd(560,720);x=S.p.x+Math.cos(a)*r;y=S.p.y+Math.sin(a)*r*0.75}
 x=clamp(x,30,WORLD.w-30);y=clamp(y,40,WORLD.h-30);
 const e={type,...d,x,y,z:0,vz:0,kvx:0,kvy:0,hp:d.hp*(type==='archangel'?1:sc),t:rnd(0,2),hit:0,cd:rnd(0.5,1.5),st:'move',stT:0,stun:0,slowT:0,slowF:0,fear:0,taunt:0,bubble:0,invuln:0,
  face:1,faceAng:0,slot:rnd(0,6.28),strafe:Math.random()<0.5?1:-1};
 if(affix){e.elite=true;e.affix=affix;e.hp*=3.2;e.r*=1.25;e.dmg*=1.4;if(affix==='快速')e.speed*=1.6;e.bubT=3}
 e.maxhp=e.hp;S.enemies.push(e);return e}
function elitePack(){if(S.state!=='play')return;const af=pick(Object.keys(LOOT.elites)),type=pick(['cultivator','cultivator','paladin','taoist']);const a=rnd(0,6.28),x=S.p.x+Math.cos(a)*560,y=S.p.y+Math.sin(a)*420;
 for(let i=0;i<4;i++)spawn(i===3?'monk':type,x+rnd(-60,60),y+rnd(-60,60),af);banner(`精英怪群 · ${af}`)}
// ---------- 敌人 AI ----------
function telegraph(e,kind,dur,data){e.st='wind';e.stT=dur;e.wmax=dur;e.tk=kind;Object.assign(e,data)}
function enemyAI(e,dt){const p=S.p,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
 e.kvx*=Math.pow(0.002,dt);e.kvy*=Math.pow(0.002,dt);e.x+=e.kvx*dt;e.y+=e.kvy*dt;
 if(e.z>0||e.vz){e.vz-=900*dt;e.z+=e.vz*dt;if(e.z<=0){e.z=0;e.vz=0;e.stun=Math.max(e.stun,0.3)}return}
 e.hit-=dt;e.cd-=dt;e.invuln-=dt;if(e.slowT>0)e.slowT-=dt;
 if(e.affix==='护盾'){e.bubT-=dt;if(e.bubT<=0){e.bubble=e.maxhp*0.25;e.bubT=7}}
 if(e.affix==='熔岩'&&Math.random()<dt*0.25)S.zones.push({x:e.x,y:e.y,r:55,t:4,dps:14,col:'255,70,10',owner:'e',arm:0.8});
 if(e.stun>0){e.stun-=dt;return}
 const spd=e.speed*(e.slowT>0?1-e.slowF:1);let mvx=0,mvy=0;
 if(e.fear>0){e.fear-=dt;mvx=-dx/d;mvy=-dy/d;e.x+=mvx*spd*1.2*dt;e.y+=mvy*spd*1.2*dt;return}
 if(e.ai!=='boss'||e.st!=='wind'){e.faceAng=Math.atan2(dy,dx);e.face=dx<0?-1:1}
 if(e.st==='wind'){e.stT-=dt;if(e.stT<=0)enemyStrike(e);return}
 if(e.st==='rec'){e.stT-=dt;if(e.stT<=0)e.st='move';return}
 if(e.st==='charge'){e.stT-=dt;e.x+=Math.cos(e.chA)*520*dt;e.y+=Math.sin(e.chA)*520*dt;if(d<e.r+22){hurt(e.dmg*1.2,e);e.stT=0}if(e.stT<=0){e.st='rec';e.stT=0.9}return}
 if(e.taunt>0){e.taunt-=dt;mvx=dx/d;mvy=dy/d}
 else if(e.ai==='rush'||e.ai==='shield'){ // 包抄：围绕玩家分配角度，靠近后再收口
  const ring=d>160?110:0,tx=p.x-Math.cos(e.slot)*ring,ty=p.y-Math.sin(e.slot)*ring*0.8,tdx=tx-e.x,tdy=ty-e.y,td=Math.hypot(tdx,tdy)||1;mvx=tdx/td;mvy=tdy/td;
  if(d<e.reach+e.r+10&&e.cd<=0)return telegraph(e,'cone',e.wind,{atkA:e.faceAng});
  if(e.ai==='shield'&&d>170&&d<340&&e.cd<=-1)return telegraph(e,'line',0.75,{atkA:e.faceAng})}
 else if(e.ai==='ranged'){ // 风筝：保持距离，横移
  if(d<200){mvx=-dx/d;mvy=-dy/d}else if(d>e.range+40){mvx=dx/d;mvy=dy/d}else{mvx=-dy/d*e.strafe*0.7;mvy=dx/d*e.strafe*0.7;if(Math.random()<dt*0.3)e.strafe*=-1}
  if(d<e.range+80&&e.cd<=0)return telegraph(e,'shot',e.wind,{atkA:e.faceAng})}
 else if(e.ai==='healer'){ // 躲在队友身后
  let best=null,bd=1e9;for(const o of S.enemies)if(o!==e&&!o.dead&&o.ai!=='healer'){const dd=dist(o,e);if(dd<bd){bd=dd;best=o}}
  let tx,ty;if(best){const bx=best.x-p.x,by=best.y-p.y,bl=Math.hypot(bx,by)||1;tx=best.x+bx/bl*110;ty=best.y+by/bl*110}else{tx=e.x-dx/d*100;ty=e.y-dy/d*100}
  const tdx=tx-e.x,tdy=ty-e.y,td=Math.hypot(tdx,tdy);if(td>10){mvx=tdx/td;mvy=tdy/td}if(d<220){mvx=-dx/d;mvy=-dy/d}
  if(e.cd<=0&&S.enemies.some(o=>o!==e&&o.hp<o.maxhp&&dist(o,e)<190))return telegraph(e,'heal',e.wind,{})}
 else if(e.ai==='boss')return bossAI(e,dt,d);
 e.x+=mvx*spd*dt;e.y+=mvy*spd*dt}
function enemyStrike(e){const p=S.p,d=dist(e,p);e.st='rec';e.stT=0.55;
 if(e.tk==='cone'){e.cd=1.4;S.fx.push({type:'eswipe',x:e.x,y:e.y-20,a:e.atkA,r:e.reach+30,t:0.15});if(d<e.reach+e.r+26&&angDiff(Math.atan2(p.y-e.y,p.x-e.x),e.atkA)<0.9)hurt(e.dmg,e)}
 if(e.tk==='line'){e.cd=4;e.st='charge';e.stT=0.45;e.chA=e.atkA}
 if(e.tk==='shot'){e.cd=e.cd0??2.6;S.eproj.push({x:e.x,y:e.y-30,vx:Math.cos(e.atkA)*300,vy:Math.sin(e.atkA)*300,life:2.2,dmg:e.dmg,talisman:true,src:e})}
 if(e.tk==='heal'){e.cd=3;S.fx.push({type:'ring',x:e.x,y:e.y,r:190,t:0.5,c:'#7f7'});for(const o of S.enemies)if(!o.dead&&dist(o,e)<190){o.hp=Math.min(o.maxhp,o.hp+o.maxhp*0.2);num(o.x,o.y-60,'+',0,'#7f7')}}
 if(e.tk==='bsweep'){S.fx.push({type:'eswipe',x:e.x,y:e.y-40,a:e.atkA,r:280,t:0.2,big:true});S.shake=10;if(d<300&&angDiff(Math.atan2(p.y-e.y,p.x-e.x),e.atkA)<1.1)hurt(28,e);e.stT=0.6}
 if(e.tk==='lances'){for(const a of e.lanceA){S.fx.push({type:'lance',x:e.x,y:e.y,a,t:0.25});const px=p.x-e.x,py=p.y-e.y,along=px*Math.cos(a)+py*Math.sin(a),perp=Math.abs(-px*Math.sin(a)+py*Math.cos(a));if(along>0&&along<760&&perp<34)hurt(24,e)}S.shake=8;e.stT=0.4}
 if(e.tk==='pillars'){for(const q of e.pts){S.fx.push({type:'pillar',x:q.x,y:q.y,t:0.3});if(Math.hypot(p.x-q.x,(p.y-q.y)*1.3)<70)hurt(30,e)}S.shake=12;e.stT=0.5}
 if(e.tk==='ring'){const n=28,gap=Math.atan2(p.y-e.y,p.x-e.x)+rnd(-0.6,0.6);for(let i=0;i<n;i++){const a=i/n*6.283;if(angDiff(a,gap)<0.42)continue;S.eproj.push({x:e.x,y:e.y-50,vx:Math.cos(a)*190,vy:Math.sin(a)*190,life:5,dmg:16,holy:true})}e.stT=0.4}}
function bossAI(e,dt,d){const p=S.p,ratio=e.hp/e.maxhp,ph=ratio>0.66?1:ratio>0.33?2:3;
 if(ph!==e.phase){e.phase=ph;e.invuln=1.2;e.st='rec';e.stT=1.4;S.flash=0.5;impact();banner(ph===2?'第二阶段 · 审判之环':'第三阶段 · 天罚');S.eproj=[];if(ph>=2)for(let i=0;i<4;i++)spawn('cultivator',e.x+rnd(-120,120),e.y+rnd(-60,60));return}
 const dx=p.x-e.x,dy=p.y-e.y;if(d>200){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}
 e.patT-=dt;if(e.patT>0)return;const sp=ph===3?0.75:1;
 const pool=ph===1?['bsweep','lances','lances']:ph===2?['bsweep','lances','ring','ring']:['lances','ring','pillars','pillars','bsweep'];const k=d<300&&Math.random()<0.6?'bsweep':pick(pool);
 const A=Math.atan2(dy,dx);e.patT=(ph===3?1.6:2.2);
 if(k==='bsweep')telegraph(e,'bsweep',0.9*sp,{atkA:A});
 if(k==='lances')telegraph(e,'lances',0.9*sp,{lanceA:ph===1?[A-0.3,A,A+0.3]:[A-0.5,A-0.25,A,A+0.25,A+0.5]});
 if(k==='ring')telegraph(e,'ring',0.7,{});
 if(k==='pillars')telegraph(e,'pillars',1.1*sp,{pts:[{x:p.x,y:p.y},...[0,1,2,3].map(i=>({x:p.x+Math.cos(i*1.57+0.7)*130,y:p.y+Math.sin(i*1.57+0.7)*100}))]})}
// ---------- 掉落 ----------
function dropLoot(x,y,rar){if(rar==null){const r=Math.random();rar=r<0.04?3:r<0.15?2:r<0.45?1:0}
 let slot=pick(Object.keys(LOOT.slots));let name=pick(LOOT.bases[slot]),lg=null;const stats={};
 const n=[1,2,3,3][rar],aff=[...LOOT.affixes].sort(()=>Math.random()-0.5).slice(0,n),sc=1+S.wave*0.08;for(const a of aff)stats[a[0]]=+(a[2]*rnd(0.7,1.3)*sc).toFixed(a[3]?3:0);
 if(rar===3){lg=pick(LOOT.legendary);name=lg.name;slot=lg.slot;stats.dmg=(stats.dmg||0)+0.08}
 S.loot.push({x,y,slot,name,rarity:rar,stats,leg:lg,t:0})}
function fmtStats(it){return LOOT.affixes.filter(a=>it.stats[a[0]]).map(a=>`${a[1]} +${a[3]?Math.round(it.stats[a[0]]*100)+'%':it.stats[a[0]]}`)}
function nearLoot(){let b=null,bd=70;for(const l of S.loot){const dd=dist(l,S.p);if(dd<bd){bd=dd;b=l}}return b}
function pickup(){const l=nearLoot();if(!l)return;const old=S.gear[l.slot];S.gear[l.slot]=l;S.loot=S.loot.filter(x=>x!==l);if(old){old.x=S.p.x+30;old.y=S.p.y+10;S.loot.push(old)}
 num(S.p.x,S.p.y-110,'装备 '+l.name,0,RARITY[l.rarity].c);S.p.hp=Math.min(maxhp(),S.p.hp)}
// ---------- 主更新 ----------
function update(dt){S.t+=dt;if(bannerT>0)bannerT-=dt;if(S.flash>0)S.flash-=dt;if(S.impactT>0)S.impactT-=dt;if(S.state!=='play')return;
 if(S.hitstop>0){S.hitstop-=dt;return}
 const p=S.p;S.stats.time+=dt;S.waveT-=dt;S.comboT-=dt;S.noFuryT=(S.noFuryT||0)-dt;for(const k in S.cds)S.cds[k]=Math.max(0,S.cds[k]-dt);for(const k in S.buffs)S.buffs[k]-=dt;
 p.inv-=dt;p.slowT-=dt;if(p.hitT>0)p.hitT-=dt;if(p.deathT>0){p.deathT-=dt;p.anim='death';if(p.deathT<=0)S.state='over';return}const mh=maxhp();p.hp=Math.min(mh,p.hp+stat('regen')*dt);p.fury=Math.max(0,p.fury-dt*1.5);
 // 输入
 if(mouse.r)tryCast('sweep');
 if(T.atk){T.aim=autoAim();tryCast('fist');T.aim=null}
 if(mouse.l&&!T.on){if(S.clickMove&&!enemyNearCursor()){const a=aim();p.moveTo={x:a.x,y:a.y}}else{p.moveTo=null;tryCast('fist')}}
 let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+T.jx,my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+T.jy;if(Math.hypot(mx,my)>1){const l=Math.hypot(mx,my);mx/=l;my/=l}
 if(!mx&&!my&&p.moveTo){const tx=p.moveTo.x-p.x,ty=p.moveTo.y-p.y,tl=Math.hypot(tx,ty);if(tl<8)p.moveTo=null;else{mx=tx/tl;my=ty/tl}}else if(mx||my)p.moveTo=null;
 const ml=Math.max(1,Math.hypot(mx,my))||1;let spd=stat('speed')*(p.slowT>0?0.6:1);if(p.cast&&!p.cast.air)spd*=p.cast.done?0.5:0.25;
 updateCast(dt);
 if(p.dashT>0){p.dashT-=dt;p.x+=p.dvx*dt;p.y+=p.dvy*dt;if(Math.random()<0.6)S.fx.push({type:'ghost',x:p.x,y:p.y,t:0.2,form:p.form,face:p.face})}
 else if(!(p.cast&&p.cast.air&&p.cast.t>p.cast.wind)){p.x+=mx/ml*spd*dt;p.y+=my/ml*spd*dt;if(mx&&!p.cast)p.face=mx>0?1:-1}
 if(p.cast&&!p.cast.air)p.face=Math.cos(p.cast.ang)<0?-1:1;
 const CAST_ANIM={fist:'attack',sweep:'sweep',leap:'attack',molotov:'attack',roar:'attack',domain:'attack'};
 p.anim=p.deathT>0?'death':p.dashT>0?'dodge':(p.hitT>0&&!p.cast)?'hit':p.cast?(CAST_ANIM[p.cast.id]||'attack'):(mx||my)?'run':'idle';p.x=clamp(p.x,20,WORLD.w-20);p.y=clamp(p.y,40,WORLD.h-20);
 // 刷怪
 const wv=WAVES[S.wave-1];S.spawnT-=dt;if(S.spawnT<=0&&S.waveT>3&&S.enemies.length<70){S.spawnT=wv.rate*1.4;const bag=[];for(const[k,n]of Object.entries(wv.mix))for(let i=0;i<n;i++)bag.push(k);const n=1+Math.floor(S.wave/3);for(let i=0;i<n;i++)spawn(pick(bag))}
 // 小弟助攻（副层自动武器）
 for(const w of S.helpers){w.t-=dt;if(w.t>0)continue;let tg=null,bd=w.range;for(const e of S.enemies){const dd=dist(e,p);if(!e.dead&&dd<bd){bd=dd;tg=e}}if(!tg)continue;w.t=w.cd;const a=Math.atan2(tg.y-p.y,tg.x-p.x);ctx.proj({x:p.x,y:p.y,ang:a,speed:w.speed||500,life:(w.range||300)/(w.speed||500),dmg:w.dmg,col:w.color,w:8,helper:true})}
 for(const e of S.enemies)if(!e.dead)enemyAI(e,dt);
 for(let i=0;i<S.enemies.length;i++){const a=S.enemies[i];for(let j=i+1;j<S.enemies.length;j++){const b=S.enemies[j];const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),m=a.r+b.r;if(d<m&&d>0){const k=(m-d)/2/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k}}a.x=clamp(a.x,20,WORLD.w-20);a.y=clamp(a.y,30,WORLD.h-20)}
 for(const t of S.timers){t.t-=dt;if(t.t<=0&&!t.done){t.done=true;t.fn()}}S.timers=S.timers.filter(t=>!t.done);
 for(const f of S.flasks){f.t+=dt;if(f.t>=f.T&&!f.done){f.done=true;f.fn()}}S.flasks=S.flasks.filter(f=>!f.done);
 for(const pr of S.projs){pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.life-=dt;for(const e of S.enemies){if(e.dead||pr.life<=0||pr.hitset.has(e))continue;if(Math.hypot(e.x-pr.x,e.y-pr.y)<e.r+pr.w/2+6){pr.hitset.add(e);damage(e,pr.dmg,{dir:Math.atan2(pr.vy,pr.vx),kb:pr.kb||0});if(!pr.pierce)pr.life=0}}}
 for(const b of S.eproj){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-p.x,b.y-(p.y-30))<18){b.life=0;hurt(b.dmg,b.src)}}
 for(const z of S.zones){z.t-=dt;if(z.follow){z.x=p.x;z.y=p.y}if(z.arm>0){z.arm-=dt;continue}z.tick=(z.tick||0)-dt;if(z.tick>0)continue;z.tick=0.25;
  if(z.owner==='p'){for(const e of ctx.circle(z.x,z.y,z.r))damage(e,z.dps*0.25,{dot:true,slow:z.slow})}else if(Math.hypot(p.x-z.x,(p.y-z.y)*1.3)<z.r&&p.dashT<=0&&!p.deathT){hurt(z.dps*0.25,null)}}
 for(const gm of S.gems){const d=dist(gm,p);if(d<110){gm.x+=(p.x-gm.x)*dt*9;gm.y+=(p.y-gm.y)*dt*9}if(d<24){gm.got=true;p.xp+=gm.xp;S.soul+=gm.soul;S.stats.soulTotal+=gm.soul}}
 for(const f of S.fx)f.t-=dt;for(const n of S.nums){n.t-=dt;n.y-=(n.tier?60:40)*dt}for(const dc of S.decals)dc.t-=dt;for(const l of S.loot)l.t+=dt;
 S.enemies=S.enemies.filter(e=>!e.dead);S.projs=S.projs.filter(x=>x.life>0);S.eproj=S.eproj.filter(x=>x.life>0);S.gems=S.gems.filter(x=>!x.got);S.fx=S.fx.filter(x=>x.t>0);S.nums=S.nums.filter(x=>x.t>0);S.zones=S.zones.filter(z=>z.t>0);S.decals=S.decals.filter(d=>d.t>0);
 S.shake=Math.max(0,S.shake-dt*35);
 if(S.state!=='play')return;
 if(p.xp>=p.xpNext){p.xp-=p.xpNext;p.lv++;p.xpNext=Math.round(p.xpNext*1.3+5);openLevelUp();return}
 if(wv.boss){if(S.boss?.dead)S.state='win'}
 else if(S.waveT<=0){for(const gm of S.gems){S.soul+=gm.soul;p.xp+=gm.xp}S.gems=[];endWave()}}
function enemyNearCursor(){const a=aim();return S.enemies.some(e=>Math.hypot(e.x-a.x,e.y-30-a.y)<e.r+30)}
// ---------- 升级 / 符文 ----------
const UPG=[['力量','伤害 +10%',p=>p.base.dmg+=0.1],['体魄','最大生命 +20',p=>{p.maxhp+=20;p.hp+=20}],['狠劲','暴击 +5%',p=>p.base.crit+=0.05],['脚力','移速 +8%',p=>p.base.speed*=1.08],['怒火','气势获取 +20%',p=>p.base.fury+=0.2],['回气','回血 +1/秒',p=>p.base.regen+=1],['老练','冷却缩减 +6%',p=>p.base.cdr+=0.06]];
function openLevelUp(){S.state='levelup';const runes=[];for(const id of ORDER){if(S.runes[id]||(SK[id].demon&&!S.evolved))continue;for(const r of['a','b'])runes.push({rune:true,id,r,t:`${SK[id].name}·${SK[id].runes[r].name}`,d:SK[id].runes[r].desc})}
 runes.sort(()=>Math.random()-0.5);const stats=[...UPG].sort(()=>Math.random()-0.5).map(u=>({t:u[0],d:u[1],fn:u[2]}));
 const nr=Math.min(runes.length,S.p.lv%2===0?2:1);S.choices=[...runes.slice(0,nr),...stats].slice(0,3)}
function chooseUp(i){const c=S.choices[i];if(!c)return;Audio.playSfx('ui_levelup');if(c.rune)S.runes[c.id]=c.r;else c.fn(S.p);S.choices=null;S.state='play'}
function endWave(){if(S.wave===5&&!S.evolved){S.state='evolve';return}openShop()}
function rollShop(){const old=S.shop?.slots||[];S.shop.slots=[0,1,2,3].map(i=>{if(S.locked[i]&&old[i]&&!old[i].sold)return old[i];
 if(Math.random()<0.4){const b=pick(WEAPONS);const w=mkW(b.id);return{kind:'w',w,rarity:b.rarity,price:Math.round(b.price*(1+S.wave*0.08))}}
 const it=pick(ITEMS);return{kind:'i',it,rarity:it.rarity,price:Math.round(it.price*(1+S.wave*0.08))}})}
function openShop(){S.state='shop';S.shop={reroll:2+S.wave};rollShop()}
function buy(i){const s=S.shop.slots[i];if(s.sold||S.soul<s.price)return;if(s.kind==='w'){if(S.helpers.length>=3)return;S.helpers.push(s.w)}else{applyItem(s.it);S.items.push(s.it.name)}S.soul-=s.price;s.sold=true;S.locked[i]=false}
function applyItem(it){const b=S.p.base;({maxhp:()=>{S.p.maxhp+=it.v;S.p.hp+=it.v},speed:()=>b.speed*=1+it.v,dmg:()=>b.dmg+=it.v,atkspd:()=>b.cdr+=it.v*0.5,crit:()=>b.crit+=it.v,regen:()=>b.regen+=it.v,pickup:()=>b.fury+=it.v*0.5,pact:()=>{b.dmg+=it.v;S.p.maxhp-=10}})[it.stat]()}
function onKey(k){if(S.state==='title'&&(k==='enter'||k===' ')){startWave();return}
 if((S.state==='over'||S.state==='win')&&k==='enter'){newRun();return}
 if(S.state==='play'){const m={'1':'leap','2':'molotov','3':'roar','4':'domain'};if(m[k])tryCast(m[k]);if(k===' ')dash();if(k==='e')pickup();if(k==='m'){S.clickMove=!S.clickMove;banner(S.clickMove?'点击移动：开':'点击移动：关')}}
 if(S.state==='levelup'&&['1','2','3'].includes(k))chooseUp(+k-1);
 if(S.state==='shop'&&k==='enter')startWave()}
let buttons=[];function onClick(){for(const b of buttons)if(mouse.x>b.x&&mouse.x<b.x+b.w&&mouse.y>b.y&&mouse.y<b.y+b.h){b.fn();return true}return S.state!=='play'}
// ---------- 绘制 ----------
const FONT='"Noto Sans CJK SC","Microsoft YaHei","PingFang SC",sans-serif';
function text(t,x,y,size,col='#fff',al='left',bold=true,stroke=0){g.font=`${bold?'900':'500'} ${size}px ${FONT}`;g.textAlign=al;if(stroke){g.lineWidth=stroke;g.strokeStyle='#000';g.lineJoin='round';g.strokeText(t,x,y)}g.fillStyle=col;g.fillText(t,x,y)}
function inkRect(x,y,w,h,fill){g.fillStyle='#000';g.fillRect(x+5,y+5,w,h);g.fillStyle=fill;g.fillRect(x,y,w,h);g.lineWidth=4;g.strokeStyle='#000';g.strokeRect(x,y,w,h)}
function btn(x,y,w,h,label,fn,col='#f2f2f2',clickSfx=true){buttons.push({x,y,w,h,fn:()=>{if(clickSfx)Audio.playSfx('ui_click',{vol:0.65});fn()}});const hov=mouse.x>x&&mouse.x<x+w&&mouse.y>y&&mouse.y<y+h;if(Art.ui.btn_yellow){g.drawImage(hov||col!=='#f2f2f2'?Art.ui.btn_yellow:Art.ui.btn_gray,x-4,y-4,w+8,h+8)}else inkRect(x,y,w,h,hov?'#ffd400':col);text(label,x+w/2,y+h/2+8,22,'#111','center')}
function drawMuteBtn(x,y){btn(x,y,72,34,Audio.isMuted()?'音效关':'音效开',()=>Audio.toggleMute(),Audio.isMuted()?'#666':'#444',false)}
function drawSprite(key,frame,x,y,face,scale=1,tint){const fr=Art.sprites[key];if(!fr)return;const im=fr[((frame|0)%fr.length+fr.length)%fr.length];g.save();g.translate(x,y);g.scale(face*scale,scale);g.drawImage(tint?tinted(im,tint):im,-im.width/2,-im.height*0.92);g.restore()}
const TC=new Map();function tinted(im,col){const k=col;let m=TC.get(im);if(!m){m={};TC.set(im,m)}if(m[k])return m[k];const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=0.7;x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return m[k]=c}
const ell=(x,y,r,ry)=>{g.beginPath();g.ellipse(x,y,r,ry??r*0.55,0,0,7)};
function sector(x,y,r,a,arc){g.beginPath();g.moveTo(x,y);g.ellipse(x,y,r,r*0.75,0,a-arc/2,a+arc/2);g.closePath()}
function inkSplat(x,y,r,seed){g.fillStyle='rgba(8,8,8,.75)';g.beginPath();for(let i=0;i<14;i++){const a=i/14*6.28,rr=r*(0.6+0.5*Math.abs(Math.sin(seed+i*2.1)));g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*0.5)}g.closePath();g.fill();
 for(let i=0;i<5;i++){const a=seed+i*1.3;ell(x+Math.cos(a)*r*1.4,y+Math.sin(a)*r*0.7,r*0.12);g.fill()}}
function drawTelegraph(e){const k=1-e.stT/e.wmax;g.save();g.fillStyle=`rgba(255,40,30,${0.15+k*0.25})`;g.strokeStyle='rgba(255,60,40,.9)';g.lineWidth=3;
 if(e.tk==='cone'){sector(e.x,e.y,e.reach+30,e.atkA,1.8);g.fill();g.stroke();sector(e.x,e.y,(e.reach+30)*k,e.atkA,1.8);g.fill()}
 if(e.tk==='bsweep'){sector(e.x,e.y,300,e.atkA,2.2);g.fill();g.stroke();sector(e.x,e.y,300*k,e.atkA,2.2);g.fill()}
 if(e.tk==='line'||e.tk==='shot'){const L=e.tk==='line'?260:e.range+60,w=e.tk==='line'?40:10;g.translate(e.x,e.y-20);g.rotate(e.atkA);g.fillRect(0,-w/2,L,w);g.fillRect(0,-w/2,L*k,w);g.strokeRect(0,-w/2,L,w)}
 if(e.tk==='lances')for(const a of e.lanceA){g.save();g.translate(e.x,e.y);g.rotate(a);g.fillStyle=`rgba(255,240,150,${0.15+k*0.35})`;g.fillRect(0,-34,760,68);g.strokeStyle='rgba(255,220,80,.9)';g.strokeRect(0,-34,760,68);g.restore()}
 if(e.tk==='pillars')for(const q of e.pts){g.fillStyle=`rgba(255,240,150,${0.15+k*0.35})`;ell(q.x,q.y,70);g.fill();g.strokeStyle='#ffe14a';g.stroke();ell(q.x,q.y,70*k);g.fill()}
 if(e.tk==='heal'){g.strokeStyle='#7f7';ell(e.x,e.y,190*k);g.stroke()}
 if(e.tk==='ring'){g.strokeStyle='#fff6b0';g.lineWidth=6;ell(e.x,e.y,60+k*40);g.stroke()}
 g.restore();if(e.tk!=='ring'&&e.ai!=='boss')text('!',e.x,e.y-e.r*4-10,30,'#ff3b2f','center',true,5)}
function drawWorld(){const p=S.p;S.cam.x=clamp(p.x-W/2,0,WORLD.w-W);S.cam.y=clamp(p.y-H/2,0,WORLD.h-H);
 g.save();const sh=S.shake;g.translate(-S.cam.x+rnd(-sh,sh),-S.cam.y+rnd(-sh,sh));
 g.fillStyle=g.createPattern(Art.floor,'repeat');g.fillRect(0,0,WORLD.w,WORLD.h);if(Art.edge){const eh=300,ew=Art.edge.width*eh/Art.edge.height;for(let x=0;x<WORLD.w;x+=ew)g.drawImage(Art.edge,x,0,ew,eh)}else if(Art.bg)for(let x=0;x<WORLD.w;x+=1024)g.drawImage(Art.bg,x,0,1024,300);
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,WORLD.w,WORLD.h);g.lineWidth=10;g.strokeStyle='#000';g.strokeRect(0,0,WORLD.w,WORLD.h);
 ['金龙茶餐厅','跌打','當','九龍城寨','麻雀館'].forEach((s,i)=>{g.save();g.shadowColor=i%2?'#f2a':'#2ef';g.shadowBlur=18;text(s,200+i*420,60,34,i%2?'#ff5ab4':'#5ff3ff','left',true,6);g.restore()});
 for(const dc of S.decals){g.globalAlpha=Math.min(1,dc.t/2);inkSplat(dc.x,dc.y,dc.r,dc.seed);g.globalAlpha=1}
 for(const z of S.zones){const a=Math.min(1,z.t)*(z.arm>0?0.4:1);const vf=Art.sprites.vfx_fire;if(vf&&z.owner!=='e'&&!z.follow){const im=vf[Math.floor(S.t*10)%vf.length],s=z.r*2.2/im.width;g.globalAlpha=a;g.drawImage(im,z.x-im.width*s/2,z.y-im.height*s*0.75,im.width*s,im.height*s);g.globalAlpha=1}if(z.follow&&Art.sprites.vfx_aura){const va=Art.sprites.vfx_aura,im=va[Math.floor(S.t*10)%va.length],s=z.r*2.2/im.width;g.globalAlpha=0.7*a;g.drawImage(im,z.x-im.width*s/2,z.y-im.height*s/2,im.width*s,im.height*s);g.globalAlpha=1}g.fillStyle=`rgba(${z.col},${0.28*a})`;ell(z.x,z.y,z.r,z.r/1.3);g.fill();g.strokeStyle=`rgba(${z.col},${0.9*a})`;g.lineWidth=3;g.stroke();
  for(let i=0;i<5;i++){const fa=S.t*2+i*1.26,fx=z.x+Math.cos(fa)*z.r*0.6,fy=z.y+Math.sin(fa)*z.r*0.35;g.fillStyle=`rgba(${z.col},${0.8*a})`;g.beginPath();g.moveTo(fx-7,fy);g.quadraticCurveTo(fx,fy-28-Math.sin(S.t*9+i)*8,fx+7,fy);g.fill()}}
 for(const e of S.enemies)if(e.st==='wind')drawTelegraph(e);
 if(p.cast?.id==='sweep'&&!p.cast.done){g.fillStyle='rgba(255,255,255,.12)';sector(p.x,p.y,SK.sweep.range,p.cast.ang,S.runes.sweep==='a'?6.28:SK.sweep.arc);g.fill()}
 for(const l of S.loot){const R=RARITY[l.rarity];const vb=Art.sprites.vfx_beam;if(vb&&l.rarity>=2){const im=vb[Math.floor(l.t*8)%vb.length];g.drawImage(im,l.x-im.width*0.35,l.y-im.height*0.7*0.92,im.width*0.7,im.height*0.7)}if(l.rarity>=1){const gr=g.createLinearGradient(0,l.y-260,0,l.y);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,R.c);g.globalAlpha=0.35+0.15*Math.sin(l.t*4);g.fillStyle=gr;g.fillRect(l.x-(4+l.rarity*3),l.y-260,8+l.rarity*6,260);g.globalAlpha=1}
  g.fillStyle=R.c;g.fillRect(l.x-10,l.y-8,20,12);g.strokeStyle='#000';g.lineWidth=3;g.strokeRect(l.x-10,l.y-8,20,12);text(l.name,l.x,l.y+24,15,R.c,'center',true,4)}
 for(const gm of S.gems){g.fillStyle=gm.soul>2?'#c46bff':'#5cf0ff';g.beginPath();g.moveTo(gm.x,gm.y-12);g.lineTo(gm.x+7,gm.y-4);g.lineTo(gm.x,gm.y+4);g.lineTo(gm.x-7,gm.y-4);g.closePath();g.fill();g.lineWidth=2;g.strokeStyle='#000';g.stroke()}
 const ents=[...S.enemies.map(e=>({y:e.y,e})),{y:p.y,p:1}].sort((a,b)=>a.y-b.y);
 for(const o of ents){if(o.p){g.fillStyle='rgba(0,0,0,.4)';ell(p.x,p.y,22-p.z*0.08);g.fill();if(p.inv>0&&p.dashT<=0&&!p.cast&&!p.deathT&&Math.floor(S.t*20)%2)continue;
   if(S.buffs.roar>0){g.strokeStyle='rgba(192,255,107,.7)';g.lineWidth=3;ell(p.x,p.y,30);g.stroke()}
   const key=p.form+'_'+p.anim,frs=Art.sprites[key]||Art.sprites[p.form+'_idle'],n=frs?frs.length:4;let fr;
   if(p.deathT>0)fr=Math.min(n-1,Math.floor((1-p.deathT/1.2)*n));
   else if(p.dashT>0)fr=Math.min(n-1,Math.floor((1-p.dashT/Math.max(0.01,SK.dash.dur))*n));
   else if(p.hitT>0&&!p.cast)fr=Math.min(n-1,Math.floor((1-p.hitT/0.35)*n));
   else if(p.cast){const tot=p.cast.wind+(p.cast.air||0)+p.cast.rec;fr=Math.min(n-1,Math.floor(p.cast.t/Math.max(0.01,tot)*n))}
   else fr=Math.floor(S.t*(p.anim==='run'?10:6));
   const br=34+Math.sin(S.t*3)*3,demon=p.form==='demon';
   g.save();g.globalAlpha=0.75;g.strokeStyle=demon?'#e060ff':'#ffd040';g.lineWidth=4;ell(p.x,p.y,br,br*0.48);g.stroke();
   g.globalAlpha=0.28;g.fillStyle=demon?'#c040ff':'#ffe080';ell(p.x,p.y,br*0.9,br*0.42);g.fill();
   g.globalAlpha=0.9;g.strokeStyle=demon?'#fff0ff':'#fff8d0';g.lineWidth=1.5;ell(p.x,p.y,br*0.72,br*0.34);g.stroke();g.restore();
   drawSprite(key,fr,p.x,p.y-p.z,p.face,demon?1.2:1)}
  else{const e=o.e;g.fillStyle='rgba(0,0,0,.4)';ell(e.x,e.y,e.r);g.fill();
   if(e.elite){g.save();g.shadowColor=LOOT.elites[e.affix].col;g.shadowBlur=25;g.strokeStyle=LOOT.elites[e.affix].col;g.lineWidth=4;ell(e.x,e.y,e.r+8);g.stroke();g.restore()}
   const sc=e.elite?1.25:1;drawSprite(e.type+'_'+(e.st==='wind'||e.st==='rec'?'attack':'run'),e.st==='wind'?1:Math.floor(e.t*8),e.x,e.y-e.z,e.face,sc,e.hit>0?'#fff':e.stun>0?'#6bf':e.fear>0?'#c0ff6b':e.elite?LOOT.elites[e.affix].col+'55':null);
   if(e.bubble>0){g.strokeStyle='rgba(210,210,255,.9)';g.lineWidth=3;g.beginPath();g.arc(e.x,e.y-40,e.r*2.6,0,7);g.stroke()}
   if(e.stun>0)text('★',e.x,e.y-e.r*4.5-e.z,18,'#ffd400','center',true,3);
   if(e.ai!=='boss'&&(e.hp<e.maxhp||e.elite)){const bw=e.elite?60:32,yy=e.y-e.r*4.2-e.z;g.fillStyle='#000';g.fillRect(e.x-bw/2-1,yy,bw+2,7);g.fillStyle=e.elite?'#ffb020':'#e33';g.fillRect(e.x-bw/2,yy+1,bw*e.hp/e.maxhp,5);if(e.elite)text(`${e.affix}·${e.name}`,e.x,yy-6,14,LOOT.elites[e.affix].col,'center',true,4)}}}
 for(const pr of S.projs){g.save();g.translate(pr.x,pr.y-24);g.rotate(Math.atan2(pr.vy,pr.vx));g.fillStyle=pr.col;if(pr.helper){g.fillRect(-6,-3,12,6)}else{g.beginPath();g.ellipse(0,0,pr.w*0.6,pr.w/2,0,0,7);g.fill();g.lineWidth=3;g.strokeStyle='#000';g.stroke()}g.restore()}
 for(const f of S.flasks){const k=f.t/f.T,x=f.sx+(f.tx-f.sx)*k,y=f.sy+(f.ty-f.sy)*k-Math.sin(k*Math.PI)*120;g.save();g.translate(x,y);g.rotate(k*12);g.fillStyle='#6a3';g.fillRect(-5,-9,10,18);g.fillStyle='#f80';g.fillRect(-2,-14,4,6);g.strokeStyle='#000';g.lineWidth=2;g.strokeRect(-5,-9,10,18);g.restore()}
 for(const b of S.eproj){if(b.talisman){g.save();g.translate(b.x,b.y);g.rotate(S.t*8);g.fillStyle='#ffe95a';g.fillRect(-6,-10,12,20);g.strokeStyle='#c00';g.lineWidth=2;g.strokeRect(-6,-10,12,20);g.restore()}else{g.fillStyle='#fff6b0';g.beginPath();g.arc(b.x,b.y,9,0,7);g.fill();g.strokeStyle='#000';g.lineWidth=3;g.stroke()}}
 for(const f of S.fx)drawFx(f);
 for(const n of S.nums){const sz=[20,30,46][n.tier||0];g.globalAlpha=Math.min(1,n.t*3);text(n.txt+(n.tier===2?'!!':n.tier===1?'!':''),n.x,n.y,sz,n.c,'center',true,n.tier===2?8:5);g.globalAlpha=1}
 g.restore()}
const VFXMAP={fist:'vfx_punch',cleave:'vfx_sweep',quake:'vfx_slam',boom:'vfx_fire',roar:'vfx_aura'};
function drawGenFx(f){const fr=Art.sprites[VFXMAP[f.type]];if(!fr)return;if(f.t0==null)f.t0=Math.max(f.t,0.01);const k=clamp(1-f.t/f.t0,0,0.999),im=fr[Math.floor(k*fr.length)];
 const s=f.type==='fist'?(f.big?1.1:0.7):Math.max(0.5,(f.r||80)*2/im.width);g.save();g.translate(f.x,f.y);if(f.type==='cleave')g.rotate(f.a);g.globalCompositeOperation='lighter';g.drawImage(im,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s);g.restore()}
function drawFx(f){drawGenFx(f);g.save();g.globalAlpha=Math.min(1,f.t*6);const p=S.p;
 if(f.type==='fist'){g.translate(f.x,f.y);g.rotate(f.a);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=4;const s=f.big?1.8:1;g.beginPath();for(let i=0;i<10;i++){const a=i/10*6.28,r=(i%2?10:26)*s;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.stroke();
  for(let i=0;i<4;i++){g.beginPath();g.moveTo(-50*s,(i-1.5)*8);g.lineTo(-20*s,(i-1.5)*8);g.stroke()}}
 if(f.type==='cleave'){g.translate(f.x,f.y);g.scale(1,0.75);g.lineCap='round';const k=1-f.t/0.22;g.strokeStyle='#fff';g.lineWidth=26;g.beginPath();g.arc(0,0,f.r*0.85,f.a-f.arc/2,f.a-f.arc/2+f.arc*Math.min(1,k*1.5+0.3));g.stroke();g.strokeStyle='#000';g.lineWidth=5;g.stroke();g.strokeStyle='#ff3355';g.lineWidth=6;g.beginPath();g.arc(0,0,f.r*0.6,f.a-f.arc/2,f.a+f.arc/2);g.stroke()}
 if(f.type==='eswipe'){g.translate(f.x,f.y);g.scale(1,0.75);g.strokeStyle='#ff3b2f';g.lineWidth=f.big?20:10;g.beginPath();g.arc(0,0,f.r*0.8,f.a-1,f.a+1);g.stroke()}
 if(f.type==='tele'){const k=1-f.t/f.max;g.globalAlpha=1;g.strokeStyle=f.col+'0.9)';g.fillStyle=f.col+'0.18)';g.lineWidth=3;ell(f.x,f.y,f.r,f.r/1.3);g.fill();g.stroke();ell(f.x,f.y,f.r*k,f.r*k/1.3);g.fill()}
 if(f.type==='quake'){const k=1-f.t/0.35;g.strokeStyle='#000';g.lineWidth=8;ell(f.x,f.y,f.r*(0.4+k*0.8),f.r*(0.4+k*0.8)/1.3);g.stroke();g.strokeStyle='#6bd0ff';g.lineWidth=4;g.stroke();
  for(let i=0;i<8;i++){const a=i/8*6.28;g.strokeStyle='#000';g.lineWidth=3;g.beginPath();g.moveTo(f.x+Math.cos(a)*20,f.y+Math.sin(a)*14);g.lineTo(f.x+Math.cos(a+0.2)*f.r*0.6,f.y+Math.sin(a+0.2)*f.r*0.45);g.lineTo(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r*0.75);g.stroke()}}
 if(f.type==='boom'||f.type==='splash'){const k=1-f.t/0.35,r=f.r*(0.5+k);g.fillStyle=f.type==='boom'?'#ff8a1f':'#111';g.beginPath();for(let i=0;i<14;i++){const a=i/14*6.28,rr=i%2?r*0.55:r;g.lineTo(f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr*0.7)}g.closePath();g.fill();if(f.type==='boom'){g.lineWidth=4;g.strokeStyle='#000';g.stroke()}}
 if(f.type==='roar'){const k=1-f.t/0.5;for(let j=0;j<3;j++){g.strokeStyle=j%2?'#000':'#c0ff6b';g.lineWidth=6-j;ell(f.x,f.y,f.r*(k+j*0.12),f.r*(k+j*0.12)*0.6);g.stroke()}}
 if(f.type==='bolt'){g.strokeStyle=f.c||'#8cf';g.lineWidth=5;g.beginPath();g.moveTo(f.x,f.y);for(let i=1;i<6;i++)g.lineTo(f.x+(f.x2-f.x)*i/6+rnd(-12,12),f.y+(f.y2-f.y)*i/6+rnd(-12,12));g.lineTo(f.x2,f.y2);g.stroke()}
 if(f.type==='lance'){g.translate(f.x,f.y);g.rotate(f.a);g.fillStyle='#fffbe0';g.fillRect(0,-20,760,40);g.strokeStyle='#000';g.lineWidth=3;g.strokeRect(0,-20,760,40)}
 if(f.type==='pillar'){g.fillStyle='rgba(255,250,200,.9)';g.fillRect(f.x-45,f.y-900,90,900);g.strokeStyle='#000';g.lineWidth=4;g.strokeRect(f.x-45,f.y-900,90,900)}
 if(f.type==='ring'){g.strokeStyle=f.c;g.lineWidth=4;ell(f.x,f.y,f.r);g.stroke()}
 if(f.type==='spark'){g.fillStyle='#fff';g.beginPath();g.arc(f.x,f.y,12,0,7);g.fill()}
 if(f.type==='corpse'){const fr=Art.sprites[f.key];g.globalAlpha=Math.min(1,f.t*2);drawSprite(f.key,Math.min(fr.length-1,Math.floor((1-f.t/f.t0)*fr.length*1.6)),f.x,f.y,f.face)}
 if(f.type==='ghost'){g.globalAlpha=f.t*2;drawSprite(f.form+'_run',0,f.x,f.y,f.face,1,'#6bd0ff')}
 g.restore()}
function orb(x,y,r,v,col,label,val){
 const oi=Art.ui[col==='#c4161c'?'orb_hp':'orb_fury'];
 if(oi){const s=(r+14)*2/Math.min(oi.width,oi.height);
  g.drawImage(oi,x-oi.width*s/2,y-oi.height*s/2,oi.width*s,oi.height*s);
  // 玻璃区内按剩余量盖暗（新球自带满液，用遮罩表示消耗）
  const empty=1-clamp(v,0,1);if(empty>0.01){g.save();g.beginPath();g.arc(x,y,r*0.78,0,7);g.clip();
   const top=y-r*0.78,h=2*r*0.78*empty;g.fillStyle='rgba(10,5,5,0.92)';g.fillRect(x-r,top,2*r,h);
   g.fillStyle=col;g.globalAlpha=0.35;g.beginPath();g.moveTo(x-r,top+h);
   for(let i=0;i<=16;i++)g.lineTo(x-r+i*r/8,top+h+Math.sin(S.t*3+i)*2.5);g.lineTo(x+r,top+h);g.lineTo(x+r,top+h+6);g.lineTo(x-r,top+h+6);g.fill();g.restore()}
 }else{g.save();g.fillStyle='#000';g.beginPath();g.arc(x,y,r+8,0,7);g.fill();g.beginPath();g.arc(x,y,r,0,7);g.clip();g.fillStyle='#1a1010';g.fillRect(x-r,y-r,2*r,2*r);
  const lv=y+r-2*r*clamp(v,0,1);g.fillStyle=col;g.beginPath();g.moveTo(x-r,y+r);g.lineTo(x-r,lv);for(let i=0;i<=20;i++)g.lineTo(x-r+i*r/10,lv+Math.sin(S.t*3+i)*3);g.lineTo(x+r,y+r);g.fill();
  g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-r*0.3,y-r*0.45,r*0.35,r*0.2,-0.5,0,7);g.fill();g.restore();g.lineWidth=5;g.strokeStyle='#c9a24a';g.beginPath();g.arc(x,y,r+4,0,7);g.stroke()}
 text(val,x,y+8,24,'#fff','center',true,7);text(label,x,y+r+30,16,'#ddd','center',true,4)}
const ICON={fist:'icon_fist',sweep:'icon_pipe',leap:'icon_kick',molotov:'icon_bottle',roar:'icon_roar',domain:'icon_flame',dash:'icon_dash'};
function drawHUD(){const p=S.p,mh=maxhp();if(T.on){orb(70,190,44,p.hp/mh,'#c4161c','生命',`${Math.max(0,Math.ceil(p.hp))}`);orb(180,190,44,p.fury/100,'#e07a10','气势',Math.floor(p.fury)+'');drawTouch()}else{orb(100,H-100,72,p.hp/mh,'#c4161c','生命',`${Math.max(0,Math.ceil(p.hp))}/${mh}`);orb(W-100,H-100,72,p.fury/100,'#e07a10','气势',Math.floor(p.fury)+'');
 // 技能栏
 const bar=[['fist'],['sweep'],['leap'],['molotov'],['roar'],['domain'],['dash']],bw=74,x0=W/2-bar.length*(bw+8)/2;
 g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x0-14,H-118,bar.length*(bw+8)+20,112);
 bar.forEach(([id],i)=>{const P=SK[id],x=x0+i*(bw+8),y=H-108,lock=P.demon&&!S.evolved;inkRect(x,y,bw,bw,lock?'#333':P.col);{const ic=Art.ui[ICON[id]];if(ic){g.globalAlpha=lock?0.35:1;g.drawImage(ic,x+3,y+3,bw-6,bw-6);g.globalAlpha=1}else text(P.icon,x+bw/2,y+50,34,'#111','center')}
  const cd=S.cds[id]||0,maxcd=id==='dash'?P.cd:P.cd*(1-stat('cdr'))||1;if(cd>0){g.save();g.beginPath();g.rect(x,y,bw,bw);g.clip();g.fillStyle='rgba(0,0,0,.7)';g.beginPath();g.moveTo(x+bw/2,y+bw/2);g.arc(x+bw/2,y+bw/2,bw,-Math.PI/2,-Math.PI/2+6.283*cd/maxcd);g.closePath();g.fill();g.restore();text(cd.toFixed(1),x+bw/2,y+48,22,'#fff','center',true,4)}
  if(lock){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x,y,bw,bw);text('进化解锁',x+bw/2,y+44,14,'#ccc','center')}
  if(P.cost&&p.fury<P.cost&&!lock){g.fillStyle='rgba(40,0,80,.55)';g.fillRect(x,y,bw,bw)}
  text(P.key,x+4,y+16,13,'#fff','left',true,3);if(P.cost)text(P.cost+'',x+bw-4,y+bw-5,14,'#ffb347','right',true,3);if(P.gain)text('+'+P.gain,x+bw-4,y+bw-5,13,'#9f9','right',true,3);
  if(S.runes[id])text(P.runes[S.runes[id]].name,x+bw/2,y-6,13,'#ffd400','center',true,3);text(P.name,x+bw/2,y+bw+14,13,'#fff','center',true,3)});}
 // 顶部
 g.fillStyle='#000';g.fillRect(W/2-302,8,604,12);g.fillStyle='#3df';g.fillRect(W/2-300,10,600*p.xp/p.xpNext,8);text(`Lv.${p.lv}`,W/2-310,20,16,'#3df','right',true,4);
 const wv=WAVES[S.wave-1];text(`第 ${S.wave}/10 波`,W/2,52,28,'#fff','center',true,6);if(!wv?.boss)text(Math.ceil(Math.max(0,S.waveT))+'',W/2,88,32,S.waveT<5?'#f44':'#ffd400','center',true,6);
 if(S.boss&&!S.boss.dead){const b=S.boss;g.fillStyle='#000';g.fillRect(W/2-304,98,608,28);g.fillStyle='#ffe14a';g.fillRect(W/2-300,102,600*b.hp/b.maxhp,20);g.fillStyle='#000';[0.66,0.33].forEach(t=>g.fillRect(W/2-300+600*t-2,102,4,20));text(`大天使·米迦 · 第${['一','二','三'][b.phase-1]}阶段`,W/2,119,16,'#111','center')}
 text(`魂晶 ${S.soul}`,20,34,22,'#c88bff','left',true,5);text(p.form==='punk'?'街头古惑仔':'半魔',20,62,18,p.form==='punk'?'#ffd400':'#ff4a4a','left',true,4);
 text('小弟助攻：'+S.helpers.map(w=>w.name).join(' / '),20,88,15,'#aaa','left',true,3);
 // 装备
 Object.entries(LOOT.slots).forEach(([k,n],i)=>{const it=S.gear[k],x=W-210+i*66,y=14;inkRect(x,y,56,56,it?'#222':'#444');text(n,x+28,y+70,12,'#ccc','center',true,3);if(it){g.strokeStyle=RARITY[it.rarity].c;g.lineWidth=3;g.strokeRect(x+3,y+3,50,50);text(it.name.slice(0,2),x+28,y+35,15,RARITY[it.rarity].c,'center')}});
 if(S.clickMove)text('点击移动：开 (M)',W-20,110,14,'#9f9','right',true,3);
 const l=nearLoot();if(l)drawTooltip(l);
 if(bannerT>0)text(bannerTxt,W/2,H/2-150,56,'#ffd400','center',true,10);drawMuteBtn(W-100,14)}
function drawTooltip(l){const R=RARITY[l.rarity],cur=S.gear[l.slot],x=W/2+40,y=150,w=300;const L=fmtStats(l),CL=cur?fmtStats(cur):[];const h=110+L.length*22+(l.leg?44:0)+(cur?50+CL.length*20:20);
 g.fillStyle='rgba(10,8,6,.92)';g.fillRect(x,y,w,h);g.strokeStyle=R.c;g.lineWidth=3;g.strokeRect(x,y,w,h);let yy=y+30;text(l.name,x+w/2,yy,22,R.c,'center',true,0);yy+=24;text(`${R.n} · ${LOOT.slots[l.slot]}`,x+w/2,yy,14,'#aaa','center',false);yy+=28;
 for(const a of LOOT.affixes)if(l.stats[a[0]]){const dv=(l.stats[a[0]]||0)-(cur?.stats[a[0]]||0);text(fmtStats({stats:{[a[0]]:l.stats[a[0]]}})[0],x+20,yy,16,'#88aaff','left',false);text(dv>0?'▲':dv<0?'▼':'=',x+w-20,yy,16,dv>0?'#5f5':dv<0?'#f55':'#aaa','right');yy+=22}
 if(l.leg){text('传奇：'+l.leg.desc,x+20,yy+6,15,'#ffb020','left',true);yy+=44}
 if(cur){text('当前装备：'+cur.name,x+20,yy+4,14,RARITY[cur.rarity].c,'left',true);yy+=22;for(const s of CL){text(s,x+30,yy,13,'#888','left',false);yy+=20}}else{text('当前：空',x+20,yy,14,'#888','left',false);yy+=20}
 text('[E] 拾取并装备',x+w/2,y+h-10,15,'#ffd400','center',true,3)}
function panel(title){g.fillStyle='rgba(0,0,0,.72)';g.fillRect(0,0,W,H);text(title,W/2,110,52,'#ffd400','center',true,10)}
function drawLevelUp(){panel('升级！选择一项');S.choices.forEach((c,i)=>{const x=W/2-450+i*310,y=210;if(Art.ui.card_level)g.drawImage(Art.ui.card_level,x-20,y-30,320,350);else inkRect(x,y,280,280,c.rune?'#2a1840':'#f5f0e0');
 if(c.rune){g.fillStyle='rgba(60,20,90,.85)';g.fillRect(x+40,y+18,200,28);text('技能符文',x+140,y+40,16,'#ffd400','center',true,3)}text(c.t,x+140,y+96,c.rune?28:40,'#1a1020','center',true,5);text(c.d,x+140,y+150,18,'#2a2030','center',false);btn(x+40,y+210,200,48,`选择 [${i+1}]`,()=>chooseUp(i))})}
function drawShop(){panel(`黑市 · 第 ${S.wave} 波结束`);text(`魂晶 ${S.soul}    小弟助攻 ${S.helpers.length}/3`,W/2,160,24,'#c88bff','center',true,5);
 S.shop.slots.forEach((s,i)=>{const x=60+i*300,y=200;if(s.sold){inkRect(x,y,270,300,'#333');text('已售出',x+135,y+150,28,'#888','center');return}
  const R=RARITY[s.rarity];if(Art.ui.card_shop)g.drawImage(Art.ui.card_shop,x-20,y-40,310,380);else inkRect(x,y,270,300,'#f5f0e0');g.fillStyle=R.c;g.fillRect(x,y,270,36);g.strokeRect(x,y,270,36);text(R.n+(s.kind==='w'?' · 小弟助攻':' · 道具'),x+135,y+26,18,'#111','center');
  if(s.kind==='w'){text(s.w.name,x+135,y+86,32,'#111','center');text(`自动攻击 · 伤害 ${s.w.dmg}  间隔 ${s.w.cd}s`,x+135,y+124,17,'#333','center',false);text(`[${s.w.tag}]`,x+135,y+152,18,'#a33','center')}
  else{text(s.it.name,x+135,y+86,32,'#111','center');text(s.it.desc,x+135,y+130,18,'#333','center',false)}
  const can=S.soul>=s.price&&(s.kind!=='w'||S.helpers.length<3);btn(x+20,y+220,150,48,`${s.price} 魂晶`,()=>buy(i),can?'#9f9':'#888');btn(x+180,y+220,70,48,S.locked[i]?'已锁':'锁定',()=>S.locked[i]=!S.locked[i],S.locked[i]?'#ffd400':'#ddd')});
 btn(W/2-330,560,280,60,`刷新（${S.shop.reroll} 魂晶）`,()=>{if(S.soul>=S.shop.reroll){S.soul-=S.shop.reroll;S.shop.reroll++;rollShop()}});btn(W/2+50,560,280,60,'下一波 [Enter]',startWave,'#ffd400')}
function drawEvolve(){Art.impact(g,W,H,'#c01818');text('血脉觉醒',W/2,180,96,'#fff','center',true,14);drawSprite('punk_idle',0,W/2-220,500,1,2.4);drawSprite('demon_idle',Math.floor(S.t*6),W/2+220,500,-1,2.8);text('→',W/2,420,90,'#fff','center',true,10);
 text('街头古惑仔  ➜  半魔',W/2,580,36,'#ffd400','center',true,8);text('生命 +40 · 伤害 +25% · 解锁【魔王领域】(4)',W/2,625,22,'#fff','center',true,5);
 btn(W/2-140,645,280,56,'接受魔血',()=>{S.evolved=true;S.p.form='demon';S.p.maxhp+=40;S.p.hp=maxhp();openShop()},'#ffd400')}
function drawTitle(){if(Art.bg)g.drawImage(Art.bg,0,0,W,H);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,0,W,H);text('古惑仔成魔',W/2,200,120,'#ffd400','center',true,16);text('第一幕 · 九龙城寨',W/2,268,34,'#fff','center',true,8);
 drawSprite('punk_idle',Math.floor(S.t*6),W/2-160,520,1,2.2);drawSprite('demon_idle',Math.floor(S.t*6),W/2+160,520,-1,2.6);
 ['WASD 移动 · 左键 铁拳连击（攒气势）· 右键 钢管横扫（耗气势）','1 飞踹  2 燃烧瓶  3 咆哮  4 魔王领域 · 空格 闪避 · E 拾取 · M 点击移动'].forEach((s,i)=>text(s,W/2,580+i*32,22,'#fff','center',true,5));
 if(Math.floor(S.t*2)%2)text('按 Enter 开始',W/2,690,32,'#ffd400','center',true,7);drawMuteBtn(W-100,24);buttons.push({x:0,y:0,w:W,h:H,fn:startWave})}
function drawEnd(win){g.fillStyle=win?'rgba(80,0,0,.75)':'rgba(0,0,0,.8)';g.fillRect(0,0,W,H);text(win?'天使陨落 · 城寨归你':'扑街！',W/2,170,80,win?'#ffd400':'#f44','center',true,12);
 const st=S.stats;[`到达波次：${S.wave}/10`,`等级：${S.p.lv}`,`击杀：${st.kills}（精英 ${st.elites}）`,`总伤害：${Math.round(st.dmg)}   最高单击：${Math.round(st.maxHit)}`,`获得魂晶：${st.soulTotal}`,`时长：${Math.floor(st.time/60)}分${Math.floor(st.time%60)}秒`,'符文：'+(Object.entries(S.runes).map(([k,r])=>SK[k].runes[r].name).join('、')||'无'),'装备：'+(Object.values(S.gear).filter(Boolean).map(i=>i.name).join('、')||'无')]
  .forEach((l,i)=>text(l,W/2,250+i*40,24,'#fff','center',true,5));btn(W/2-140,600,280,60,'再来一局 [Enter]',newRun,'#ffd400')}
let last=performance.now(),audioState='';
function syncGameAudio(){if(S.state===audioState)return;audioState=S.state;Audio.syncBgm(S.state)}
function frame(now){const dt=clamp((now-last)/1000,0,0.05);last=now;update(dt);syncGameAudio();buttons=[];g.clearRect(0,0,W,H);
 if(S.state==='title')drawTitle();else{drawWorld();if(S.impactT>0){g.globalAlpha=0.55;Art.impact(g,W,H,'rgba(255,255,255,0)');g.globalAlpha=1}drawHUD();
  if(S.state==='levelup')drawLevelUp();if(S.state==='shop')drawShop();if(S.state==='evolve')drawEvolve();if(S.state==='over')drawEnd(false);if(S.state==='win')drawEnd(true)}
 if(S.flash>0){g.fillStyle=`rgba(255,255,255,${S.flash})`;g.fillRect(0,0,W,H)}requestAnimationFrame(frame)}
requestAnimationFrame(frame);

// ---------- 触屏操作 ----------
const T={on:matchMedia('(pointer:coarse)').matches||'ontouchstart'in window,jx:0,jy:0,atk:false,aim:null,joy:null,drag:{}};
const TB=[ // 右侧按钮布局（画布坐标）
 {id:'fist',x:W-120,y:H-130,r:62,label:'普攻'},{id:'sweep',x:W-250,y:H-90,r:42,label:'横扫'},{id:'leap',x:W-230,y:H-200,r:40,label:'飞踹',drag:true},
 {id:'molotov',x:W-150,y:H-265,r:40,label:'燃烧瓶',drag:true},{id:'roar',x:W-55,y:H-275,r:36,label:'咆哮'},{id:'domain',x:W-345,y:H-150,r:38,label:'领域'},
 {id:'dash',x:W-360,y:H-55,r:36,label:'闪避'},{id:'pick',x:W-50,y:H-30-170,r:0,label:''}];
TB[7]={id:'pick',x:W-330,y:H-250,r:32,label:'拾取'};
function toCanvas(t){const r=C.getBoundingClientRect();const rw=r.width||1,rh=r.height||1;return{x:(t.clientX-r.left)*W/rw,y:(t.clientY-r.top)*H/rh}}
function nearestEnemy(r=520){let b=null,bd=r;for(const e of S.enemies){if(e.dead)continue;const d=dist(e,S.p);if(d<bd){bd=d;b=e}}return b}
function autoAim(){const e=nearestEnemy();if(e)return{x:e.x,y:e.y-20};const p=S.p;return{x:p.x+p.face*100,y:p.y-20}}
function clusterAim(){let best=null,bs=-1;for(const e of S.enemies){if(e.dead||dist(e,S.p)>420)continue;let n=0;for(const o of S.enemies)if(!o.dead&&dist(o,e)<120)n++;if(n>bs){bs=n;best=e}}return best?{x:best.x,y:best.y}:autoAim()}
function castTouch(id,aimPt){if(id==='pick')return pickup();if(id==='dash'){if(!T.jx&&!T.jy){T.aim=autoAim();dash();T.aim=null}else dash();return}T.aim=aimPt||autoAim();tryCast(id);T.aim=null}
function onTouch(ev){if(!T.on){T.on=true}ev.preventDefault();
 for(const t of ev.changedTouches){const q=toCanvas(t),id=t.identifier;
  if(ev.type==='touchstart'){
   if(S.state!=='play'){mouse.x=q.x;mouse.y=q.y;onClick();if(S.state==='title')startWave();continue}
   const b=TB.find(b=>Math.hypot(q.x-b.x,q.y-b.y)<b.r+10);
   if(b){if(b.id==='fist')T.atk=id;else if(b.drag)T.drag[id]={b,sx:q.x,sy:q.y,x:q.x,y:q.y};else castTouch(b.id);continue}
   if(q.x<W*0.5&&T.joy==null)T.joy={id,ox:q.x,oy:q.y,x:q.x,y:q.y}}
  else if(ev.type==='touchmove'){if(T.joy?.id===id){T.joy.x=q.x;T.joy.y=q.y;let dx=q.x-T.joy.ox,dy=q.y-T.joy.oy;const l=Math.hypot(dx,dy);if(l>70){T.joy.ox=q.x-dx/l*70;T.joy.oy=q.y-dy/l*70;dx=dx/l*70;dy=dy/l*70}T.jx=l>8?dx/70:0;T.jy=l>8?dy/70:0}
   if(T.drag[id]){T.drag[id].x=q.x;T.drag[id].y=q.y}}
  else{if(T.joy?.id===id){T.joy=null;T.jx=T.jy=0}if(T.atk===id)T.atk=false;
   const d=T.drag[id];if(d){delete T.drag[id];const dx=d.x-d.sx,dy=d.y-d.sy,l=Math.hypot(dx,dy);if(S.state==='play')castTouch(d.b.id,l>25?dragPoint(d):clusterAim())}}}}
function dragPoint(d){const dx=d.x-d.sx,dy=d.y-d.sy,l=Math.hypot(dx,dy)||1,k=Math.min(1,l/120)*400;return{x:S.p.x+dx/l*k,y:S.p.y+dy/l*k}}
for(const t of['touchstart','touchmove','touchend','touchcancel'])C.addEventListener(t,onTouch,{passive:false});
function drawTouch(){if(S.state!=='play'&&S.state!=='levelup')return;
 if(T.joy){g.globalAlpha=0.5;g.fillStyle='#000';g.beginPath();g.arc(T.joy.ox,T.joy.oy,75,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.stroke();g.fillStyle='#ffd400';g.beginPath();g.arc(T.joy.ox+T.jx*70,T.joy.oy+T.jy*70,32,0,7);g.fill();g.globalAlpha=1}
 else{g.globalAlpha=0.25;g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(160,H-150,75,0,7);g.stroke();text('拖动移动',160,H-145,18,'#fff','center',true,3);g.globalAlpha=1}
 for(const b of TB){const P=SK[b.id],lock=P?.demon&&!S.evolved,cd=S.cds[b.id]||0,max=P?(b.id==='dash'?P.cd:P.cd*(1-stat('cdr'))):1;
  const pressed=(b.id==='fist'&&T.atk!==false)||Object.values(T.drag).some(d=>d.b===b);
  g.globalAlpha=lock?0.35:0.85;g.fillStyle='#000';g.beginPath();g.arc(b.x+4,b.y+4,b.r,0,7);g.fill();g.fillStyle=pressed?'#ffd400':(P?.col||'#ddd');g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.fill();g.lineWidth=4;g.strokeStyle='#000';g.stroke();
  if(cd>0){g.fillStyle='rgba(0,0,0,.65)';g.beginPath();g.moveTo(b.x,b.y);g.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+6.283*cd/max);g.closePath();g.fill()}
  if(P?.cost&&S.p.fury<P.cost&&!lock){g.fillStyle='rgba(40,0,80,.5)';g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.fill()}
  g.globalAlpha=1;{const ic=P&&Art.ui[ICON[b.id]];if(ic&&b.r<=50){const s=b.r*1.5/Math.max(ic.width,ic.height);g.drawImage(ic,b.x-ic.width*s/2,b.y-ic.height*s/2-6,ic.width*s,ic.height*s);text(b.label,b.x,b.y+b.r*0.55,13,'#111','center',true,0)}else{text(b.id==='pick'&&!nearLoot()?'拾取':b.label,b.x,b.y+(P?.icon?14:7),b.r>50?22:15,'#111','center',true,0);if(P?.icon&&b.r<50)text(P.icon,b.x,b.y-4,20,'#111','center')}}
  if(cd>0)text(cd.toFixed(1),b.x,b.y-b.r-6,16,'#fff','center',true,3);if(P?.cost)text(P.cost+'',b.x+b.r*0.7,b.y+b.r*0.85,13,'#ffb347','center',true,3)}
 for(const d of Object.values(T.drag)){const pt=Math.hypot(d.x-d.sx,d.y-d.sy)>25?dragPoint(d):clusterAim();const r=d.b.id==='leap'?SK.leap.radius:SK.molotov.radius;
  g.save();g.translate(-S.cam.x,-S.cam.y);g.strokeStyle='#ffd400';g.lineWidth=4;g.setLineDash([10,8]);g.beginPath();g.moveTo(S.p.x,S.p.y);g.lineTo(pt.x,pt.y);g.stroke();g.setLineDash([]);ell(pt.x,pt.y,r,r/1.3);g.stroke();g.restore()}}
// 画布/竖屏遮罩由 index.html 内联脚本初始化；模块加载后再触发一次重算
window.__scheduleFit?.();
window.__game={get S(){return S},Art,Audio,hurt,dash,startWave,openShop,spawn,elitePack,dropLoot,tryCast,setWave:n=>{S.wave=n-1;startWave()}};
try{Audio.bindUnlock(C)}catch(e){console.warn('[audio] bindUnlock 失败',e)}
