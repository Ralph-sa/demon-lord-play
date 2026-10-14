// 程序化"一拳超人"墨线风格精灵：粗黑描边 + 平涂 + 少量高光。运行时预渲染为帧缓存。
const INK='#0b0b0b';
function cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function blob(g,x,y,rx,ry,fill,lw=4){g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fillStyle=fill;g.fill();g.lineWidth=lw;g.strokeStyle=INK;g.stroke()}
function limb(g,x1,y1,x2,y2,col,w=7){g.lineCap='round';g.strokeStyle=INK;g.lineWidth=w+5;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
// 人形：opts {skin, top, pants, hair, extra(g,f)}
function humanoid(opts,anim,f,S=96){
  const c=cv(S,S),g=c.getContext('2d'),cx=S/2,base=S*0.92,s=S/96;
  g.scale(s,s);const B=base/s,X=cx/s;
  const t=f/4*Math.PI*2;let sw=0,bob=0,arm=0;
  if(anim==='run'){sw=Math.sin(t)*12;bob=Math.abs(Math.sin(t))*3}
  if(anim==='idle'){bob=Math.sin(t)*1.5}
  if(anim==='attack'){arm=[0,-20,30,10][f]}
  const hipY=B-24-bob,shY=B-50-bob,hdY=B-63-bob;
  limb(g,X-5,hipY,X-5+sw,B-2,opts.pants);limb(g,X+5,hipY,X+5-sw,B-2,opts.pants);
  // 躯干
  g.beginPath();g.moveTo(X-13,shY);g.lineTo(X+13,shY);g.lineTo(X+10,hipY);g.lineTo(X-10,hipY);g.closePath();
  g.fillStyle=opts.top;g.fill();g.lineWidth=4;g.strokeStyle=INK;g.stroke();
  limb(g,X-12,shY+3,X-18-sw*0.6,shY+22,opts.skin,6);
  limb(g,X+12,shY+3,X+18+sw*0.6+arm,shY+22-(anim==='attack'?Math.max(0,arm):0),opts.skin,6);
  blob(g,X,hdY,10,11,opts.skin);
  if(opts.hair)opts.hair(g,X,hdY);
  if(opts.extra)opts.extra(g,X,hdY,shY,hipY,f,anim);
  if(anim==='attack'&&f===2){g.strokeStyle='#fff';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(X+20,shY+10);g.lineTo(X+44,shY-10+i*8);g.stroke()}}
  return c;
}
const FORMS={
 punk:{skin:'#f1c89a',top:'#f5f5f5',pants:'#2b3a8a',hair:(g,x,y)=>{g.fillStyle='#e8b400';g.beginPath();g.moveTo(x-11,y-3);g.lineTo(x-6,y-18);g.lineTo(x,y-9);g.lineTo(x+6,y-19);g.lineTo(x+11,y-3);g.closePath();g.fill();g.lineWidth=3;g.strokeStyle=INK;g.stroke();g.fillStyle=INK;g.fillRect(x-9,y-2,18,4)},
   extra:(g,x,y,sh)=>{g.strokeStyle='#d4a017';g.lineWidth=3;g.beginPath();g.arc(x,sh+2,7,0.2,Math.PI-0.2);g.stroke()}},
 demon:{skin:'#b5473a',top:'#1a1a1a',pants:'#3a0d0d',hair:(g,x,y)=>{g.fillStyle='#ddd';for(const d of[-1,1]){g.beginPath();g.moveTo(x+d*6,y-8);g.quadraticCurveTo(x+d*20,y-16,x+d*16,y-28);g.lineTo(x+d*10,y-12);g.closePath();g.fill();g.lineWidth=3;g.strokeStyle=INK;g.stroke()}g.fillStyle='#ff2';g.fillRect(x-7,y-2,5,3);g.fillRect(x+2,y-2,5,3)},
   extra:(g,x,y,sh,hip,f)=>{g.globalCompositeOperation='destination-over';g.fillStyle='rgba(160,40,255,0.35)';g.beginPath();g.ellipse(x,(sh+hip)/2,30+f%2*3,44,0,0,7);g.fill();g.globalCompositeOperation='source-over'}}
};
const ENEMY={
 cultivator:{skin:'#f1d2b0',top:'#7fd3ff',pants:'#3f7fb0',hair:(g,x,y)=>{blob(g,x,y-12,5,5,'#222',3)},extra:(g,x,y,sh)=>{limb(g,x+16,sh+20,x+30,sh-14,'#cfe',3)}},
 taoist:{skin:'#f1d2b0',top:'#ffd84a',pants:'#8a5a00',hair:(g,x,y)=>{g.fillStyle='#222';g.fillRect(x-9,y-17,18,8);g.strokeStyle=INK;g.strokeRect(x-9,y-17,18,8)},extra:(g,x,y,sh)=>{g.fillStyle='#ffe95a';g.fillRect(x+14,sh+10,8,14);g.strokeStyle='#c00';g.lineWidth=2;g.strokeRect(x+14,sh+10,8,14)}},
 monk:{skin:'#f3c99a',top:'#ff9a3c',pants:'#c0601a',extra:(g,x,y,sh)=>{for(let i=0;i<7;i++)blob(g,x-10+i*3.3,sh+4+Math.sin(i)*2,2,2,'#5a2a0a',1)}},
 paladin:{skin:'#e0e0ee',top:'#c8c8e0',pants:'#777',hair:(g,x,y)=>{g.fillStyle='#bbc';g.fillRect(x-11,y-12,22,16);g.strokeStyle=INK;g.lineWidth=3;g.strokeRect(x-11,y-12,22,16);g.fillStyle=INK;g.fillRect(x-7,y-4,14,3)},
   extra:(g,x,y,sh)=>{g.beginPath();g.moveTo(x-30,sh-2);g.lineTo(x-14,sh-2);g.lineTo(x-14,sh+22);g.lineTo(x-22,sh+32);g.lineTo(x-30,sh+22);g.closePath();g.fillStyle='#e8e8ff';g.fill();g.lineWidth=4;g.strokeStyle=INK;g.stroke();g.fillStyle='#d4a017';g.fillRect(x-23,sh+3,3,20);g.fillRect(x-28,sh+9,13,3)}},
 archangel:{skin:'#fde7c8',top:'#fff6b0',pants:'#e0c060',hair:(g,x,y)=>{g.strokeStyle='#ffe14a';g.lineWidth=4;g.beginPath();g.ellipse(x,y-18,12,4,0,0,7);g.stroke()},
   extra:(g,x,y,sh,hip,f)=>{g.globalCompositeOperation='destination-over';for(const d of[-1,1]){g.beginPath();g.moveTo(x+d*8,sh);g.quadraticCurveTo(x+d*48,sh-40-f*2,x+d*44,sh+20);g.quadraticCurveTo(x+d*28,sh+10,x+d*8,sh+16);g.fillStyle='#fff';g.fill();g.lineWidth=4;g.strokeStyle=INK;g.stroke()}g.globalCompositeOperation='source-over';limb(g,x+18,sh+20,x+20,sh-30,'#ffe14a',4)}}
};
export const Art={sprites:{},icons:{},bg:null,
 async load(){
  for(const [k,o] of Object.entries(FORMS))for(const a of['idle','run','attack'])this.sprites[k+'_'+a]=[0,1,2,3].map(f=>humanoid(o,a,f));
  for(const [k,o] of Object.entries(ENEMY)){const S=k==='archangel'?192:96;for(const a of['run','attack'])this.sprites[k+'_'+a]=[0,1,2,3].map(f=>humanoid(o,a,f,S))}
  this.bg=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src='assets/arena_kowloon.jpg'});
  this.floor=this.makeFloor();
  try{await this.loadGen()}catch(e){console.warn('生成美术加载失败，使用程序化兜底',e)}
 },
 // 定稿美术（assets/gen/manifest.json）：切成与程序化精灵同规格的帧（底部锚点位于 0.92 高度处）
 gen:{},ui:{},
 async loadGen(){
  const M=await (await fetch('assets/gen/manifest.json')).json();
  const img=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=s});
  const frames=(im,m,H)=>{const out=[],s=H/m.h;for(let f=0;f<m.frames;f++){const w=Math.ceil(m.w*s),h=Math.ceil(m.h*s/0.92*(m.ay||1)),c=cv(Math.max(w,96),Math.max(h,10)),x=c.getContext('2d');
    x.drawImage(im,f*m.w,0,m.w,m.h,(c.width-w)/2,c.height*0.92-m.h*s*(m.ay||1),w,m.h*s);out.push(c)}return out};
  const jobs=Object.entries(M).filter(([k])=>!k.startsWith('_')).map(async([k,m])=>{const im=await img(m.src);if(im)this.gen[k]={m,im}});
  await Promise.all(jobs);
  const G=(k,H)=>this.gen[k]?frames(this.gen[k].im,this.gen[k].m,H):null,set=(k,v)=>{if(v)this.sprites[k]=v};
  // 主角：普通形态直接用；魔化形态 = 暗红色调 + 紫色魔气
  const HERO={idle:'hero_idle',run:'hero_run',attack:'hero_combo',sweep:'hero_sweep',dodge:'hero_dodge',hit:'hero_hit',death:'hero_death'};
  for(const[a,k]of Object.entries(HERO)){const fr=G(k,100);if(!fr)continue;set('punk_'+a,fr);set('demon_'+a,fr.map(c=>this.demonize(c)))}
  for(const t of['cultivator','taoist','monk','paladin']){set(t+'_run',G(t+'_move',92));set(t+'_attack',G(t+'_attack',92));set(t+'_death',G(t+'_death',92))}
  for(const v of['punch','sweep','slam','fire','aura','beam'])if(this.gen['vfx_'+v])this.sprites['vfx_'+v]=frames(this.gen['vfx_'+v].im,this.gen['vfx_'+v].m,this.gen['vfx_'+v].m.h);
  for(const[k,s]of Object.entries(M._ui||{})){const im=await img(s);if(im)this.ui[k]=im}
  const gr=M._ground&&await img(M._ground);if(gr){const c=cv(512,512);c.getContext('2d').drawImage(gr,0,0,512,512);this.floor=c}
  this.edge=M._edge?await img(M._edge):null;
 },
 demonize(src){const c=cv(src.width,src.height),x=c.getContext('2d');x.shadowColor='rgba(170,40,255,.9)';x.shadowBlur=14;x.drawImage(src,0,0);x.shadowBlur=0;
  x.globalCompositeOperation='source-atop';x.fillStyle='rgba(150,10,20,.45)';x.fillRect(0,0,c.width,c.height);return c},
 makeFloor(){const c=cv(256,256),g=c.getContext('2d');g.fillStyle='#4a4038';g.fillRect(0,0,256,256);
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=`hsl(25,${8+((x*7+y*3)%5)*2}%,${22+((x+y)%3)*2}%)`;g.fillRect(x*64+2,y*64+2,60,60)}
  g.strokeStyle='#111';g.lineWidth=3;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,256);g.moveTo(0,i*64);g.lineTo(256,i*64);g.stroke()}
  g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1.5;for(let i=0;i<14;i++){const x=(i*97)%256,y=(i*53)%256;g.beginPath();g.moveTo(x,y);g.lineTo(x+12,y+7);g.lineTo(x+18,y+3);g.stroke()}
  return c},
 // 冲击帧（一拳超人风格速度线）
 impact(g,w,h,col){g.save();g.fillStyle=col;g.fillRect(0,0,w,h);g.strokeStyle='#000';g.translate(w/2,h/2);for(let i=0;i<90;i++){const a=Math.random()*7,r1=120+Math.random()*120;g.lineWidth=2+Math.random()*6;g.beginPath();g.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);g.lineTo(Math.cos(a)*900,Math.sin(a)*900);g.stroke()}g.restore()}
};
export const RARITY=[{n:'普通',c:'#cfcfcf'},{n:'稀有',c:'#4aa3ff'},{n:'史诗',c:'#b45cff'},{n:'传说',c:'#ffb020'}];
