import {Audio} from './audio-api.js';
// 暗黑式主动技能行为。数值来自 data/skills.json，符文 a/b 改变行为。
// 每个技能：wind(前摇) → active(生效帧) → rec(后摇)。leap 有空中阶段。
export const BEHAVIOR={
 fist:{
  start(c,aim,cast){const S=c.S;S.combo=(S.comboT>0?S.combo+1:0)%3;S.comboT=0.9;cast.step=S.combo;cast.ang=aim.ang;
   const fast=c.rune('fist')==='b';cast.wind=c.P.fist.wind*(fast?0.6:1);cast.rec=c.P.fist.rec*(fast?0.6:1)*(cast.step===2?1.6:1)},
  active(c,cast){const P=c.P.fist,S=c.S,p=S.p,st=cast.step;let n=0;
   Audio.playSfx('attack',{vol:st===2?1.1:0.85,pitch:0.9+st*0.05});
   c.fx({type:'fist',x:p.x+Math.cos(cast.ang)*40,y:p.y-26+Math.sin(cast.ang)*28,a:cast.ang,t:0.15,big:st===2});
   for(const e of c.arc(p.x,p.y,cast.ang,P.range+(st===2?20:0),P.arc)){n++;c.damage(e,P.dmg[st],{dir:cast.ang,kb:P.kb[st],stun:st===2&&c.rune('fist')==='a'?1:0.15})}
   if(st===2&&c.leg('ironFist'))c.proj({x:p.x,y:p.y,ang:cast.ang,speed:700,life:0.45,dmg:40,pierce:true,col:'#ffd84a',w:30,kb:120});
   if(n)c.gain(P.gain+(c.rune('fist')==='b'?4:0));if(st===2)c.shake(n?6:2)}},
 sweep:{
  active(c,cast){const P=c.P.sweep,p=c.S.p,full=c.rune('sweep')==='a',bone=c.rune('sweep')==='b';
   Audio.playSfx('sweep',{vol:1.05});
   c.fx({type:'cleave',x:p.x,y:p.y-20,a:cast.ang,r:P.range,arc:full?6.3:P.arc,t:0.22});c.shake(7);
   for(const e of c.arc(p.x,p.y,cast.ang,P.range,full?7:P.arc))c.damage(e,P.dmg*(bone?1.2:1),{dir:Math.atan2(e.y-p.y,e.x-p.x),kb:P.kb,stun:bone?1.2:0,slow:bone?0:P.slow});
   if(c.leg('guanBlade'))c.proj({x:p.x,y:p.y,ang:cast.ang,speed:650,life:0.7,dmg:55,pierce:true,col:'#ff3355',w:60,kb:80})}},
 leap:{
  start(c,aim,cast){const p=c.S.p,P=c.P.leap;const d=Math.min(P.maxDist,aim.d);cast.sx=p.x;cast.sy=p.y;cast.tx=p.x+Math.cos(aim.ang)*d;cast.ty=p.y+Math.sin(aim.ang)*d;cast.air=P.air;
   c.fx({type:'tele',x:cast.tx,y:cast.ty,r:P.radius*(c.rune('leap')==='a'?1.6:1),t:P.wind+P.air,max:P.wind+P.air,col:'rgba(120,200,255,'})},
  air(c,cast,k){const p=c.S.p;p.x=cast.sx+(cast.tx-cast.sx)*k;p.y=cast.sy+(cast.ty-cast.sy)*k;p.z=Math.sin(k*Math.PI)*90;p.inv=Math.max(p.inv,0.05)},
  active(c,cast){const P=c.P.leap,p=c.S.p,big=c.rune('leap')==='a',r=P.radius*(big?1.6:1);p.z=0;
   const slam=(mul)=>{c.fx({type:'quake',x:p.x,y:p.y,r,t:0.35});c.shake(12*mul);let n=0;
    for(const e of c.circle(p.x,p.y,r)){n++;c.damage(e,P.dmg*mul,{dir:Math.atan2(e.y-p.y,e.x-p.x),kb:140,stun:P.stun,knockup:big?260:120})}if(n)c.gain(P.gain)};
   slam(1);if(c.rune('leap')==='b')c.later(0.4,()=>slam(0.6));
   if(c.leg('thunderLeg'))for(let i=0;i<6;i++)c.later(0.1+i*0.08,()=>{const a=i/6*6.28,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r*0.7;c.fx({type:'bolt',x,y:y-500,x2:x,y2:y,t:0.2,c:'#8cf'});for(const e of c.circle(x,y,60))c.damage(e,35,{stun:0.4})})}},
 molotov:{
  start(c,aim,cast){cast.tx=c.S.p.x+Math.cos(aim.ang)*Math.min(420,aim.d);cast.ty=c.S.p.y+Math.sin(aim.ang)*Math.min(420,aim.d)},
  active(c,cast){const P=c.P.molotov,p=c.S.p,r=c.rune('molotov');const rad=P.radius*(r==='a'?0.75:r==='b'?1.3:1);
   const land=(x,y)=>{c.fx({type:'boom',x,y,r:rad*0.8,t:0.3,c:'#ff8a1f'});for(const e of c.circle(x,y,rad))c.damage(e,P.impact,{});
    c.zone({x,y,r:rad,t:P.dur,dps:P.dps*(r==='a'?1.8:1),slow:r==='b'?0.6:P.slow,col:'255,120,20',owner:'p'})};
   c.flask(p.x,p.y-30,cast.tx,cast.ty,()=>land(cast.tx,cast.ty));
   if(c.leg('twinFlask')){const a=Math.atan2(cast.ty-p.y,cast.tx-p.x)+Math.PI/2,ox=Math.cos(a)*rad*1.6,oy=Math.sin(a)*rad*1.2;c.flask(p.x,p.y-30,cast.tx+ox,cast.ty+oy,()=>land(cast.tx+ox,cast.ty+oy))}}},
 roar:{
  active(c,cast){const P=c.P.roar,S=c.S,p=S.p,r=c.rune('roar');c.fx({type:'roar',x:p.x,y:p.y-30,r:P.radius,t:0.5});c.shake(9);
   for(const e of c.circle(p.x,p.y,P.radius)){if(r==='a'){e.taunt=3;e.kvx=(p.x-e.x)*2;e.kvy=(p.y-e.y)*2}else e.fear=P.fear;if(r==='b')c.damage(e,50,{stun:1})}
   S.buffs.roar=P.buffDur;if(r==='a')S.buffs.guard=P.buffDur;c.gain(P.gain+(c.leg('dragonStaff')?100:0))}},
 domain:{
  start(c,aim,cast){const p=c.S.p;c.fx({type:'tele',x:p.x,y:p.y,r:c.P.domain.radius,t:c.P.domain.wind,max:c.P.domain.wind,col:'rgba(176,74,255,'})},
  active(c,cast){const P=c.P.domain,S=c.S,p=S.p;const hit=c.circle(p.x,p.y,P.radius);
   if(c.rune('domain')==='b')for(const e of hit){e.kvx=(p.x-e.x)*3;e.kvy=(p.y-e.y)*3}
   c.impact();c.shake(18);for(const e of hit){c.damage(e,P.dmg,{dir:Math.atan2(e.y-p.y,e.x-p.x),kb:c.rune('domain')==='b'?0:200,knockup:200,stun:0.8});if(c.rune('domain')==='a')p.hp=Math.min(p.maxhp,p.hp+3)}
   c.zone({x:p.x,y:p.y,r:P.radius,t:P.dur,dps:P.dps,slow:P.slow,col:'150,50,255',owner:'p',follow:true})}}
};
