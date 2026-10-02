/* ═══════════════════════════════════════════════════════════════════
   ПИКСЕЛЬ-3D · тест №6 v3 · 1080×1920 · 30 fps · 30 с
   3D-мир (свет, отражения, туман, камера) считается в 270×480 и
   переводится в палитру из 55 цветов с двойным контуром. Персонажи —
   нарисованные по пикселям спрайты с анимацией, стоят в 3D-мире
   (как в HD-2D): Рублик, босс «Инфляция», кофейный воришка, такси,
   призрак-автоплатёж, прохожие, кот. Вся сцена в одной сетке 270×480,
   вывод ×4 по соседу — каждый пиксель чистый.
   Сюжет: титул → день рубля → бой с инфляцией → босс рассыпается
   пикселями, они собираются в башни копилки → цель → логотип.
   Всё — чистая функция seek(t). Случайность — rnd(i).
   ═══════════════════════════════════════════════════════════════════ */
const LW=270,LH=480,K=4,W=LW*K,H=LH*K,FPS=30,DUR=30;
window.META={FPS,DUR,FRAMES:DUR*FPS};
window.T={src:'пиксель-3d v3, без голоса',DUR,B:[]};
window.READY=false;window.BLUR=[];

/* ═══ ПАЛИТРА: 55 цветов ═══ */
const PAL=['#0B0A1A','#151433','#22204D','#332E6B','#4B3A8C','#6E55B0','#9A7FD1',
  '#7A2E5A','#B0447A','#D9709E','#F2A9C4','#A8483A','#D9704A','#F2A262','#FFD29A',
  '#C98A2E','#F0C048','#FFE9A0','#5A1A22','#9C2F34','#D9544D','#F2908A',
  '#0F2A1F','#1E5A3E','#2E9E6A','#4FD39A','#9EF2C8','#123A44','#1F6E7A','#36A7B5','#7FDCE2',
  '#1A2A5E','#2F4E9C','#5A86D1','#06070B','#2A2D3A','#4A4F63','#7D8299','#C3C8D6','#F4F6FA',
  '#3A1E2E','#5C3A2A','#8C5A3C','#E8D8C8','#B5EDD3',
  '#2F6E9C','#5AA8D1','#A8D8F0','#5A1E5A','#9A3A8C','#D070C0','#3A5A2A','#6E9A3A','#A8C85A','#C08A5A'];
const P={ink:'#F4F6FA',dim:'#C3C8D6',mute:'#7D8299',dk:'#0B0A1A',box:'#151433',mi:'#4FD39A',miL:'#9EF2C8',mi2:'#2E9E6A',mi3:'#1E5A3E',miW:'#B5EDD3',
  am:'#F0C048',amL:'#FFE9A0',am2:'#C98A2E',pk:'#D9709E',pkL:'#F2A9C4',pk2:'#B0447A',cy:'#36A7B5',cyL:'#7FDCE2',cy2:'#1F6E7A',
  rd:'#D9544D',rdL:'#F2908A',rd2:'#9C2F34',rd3:'#5A1A22',vi:'#6E55B0',viL:'#9A7FD1',vi2:'#4B3A8C',pe:'#F2A262',peL:'#FFD29A',pe2:'#D9704A',
  sk:'#5AA8D1',skL:'#A8D8F0',mg:'#9A3A8C',mgL:'#D070C0',li:'#A8C85A',li2:'#6E9A3A',br:'#8C5A3C',brL:'#C08A5A',skin:'#E8D8C8',skin2:'#C08A5A',gr:'#4A4F63',gr2:'#2A2D3A'};
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,p)=>a+(b-a)*p;
const P_=(t,a,d)=>cl((t-a)/d);
const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const out=t=>1-Math.pow(1-t,3);
function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
const spr=(t,w=14)=>t<=0?0:1-(1+w*t)*Math.exp(-w*t);
const sprO=(t,w=14,z=.62)=>{if(t<=0)return 0;const q=Math.sqrt(1-z*z),wd=w*q;return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z/q*Math.sin(wd*t));};
const track=(t,keys,f=spr)=>keys.reduce((v,[ti,vi],i)=>i?v+(vi-keys[i-1][1])*f(t-ti):vi,0);
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const rub=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',');
const typed=(s,t,a,cps=30)=>s.slice(0,Math.max(0,Math.floor((t-a)*cps)));
const RGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const Bal=n=>10000*(Math.pow(1.01,12*n)-1)/.01;
const wrap=(x,a,b)=>a+((((x-a)%(b-a))+(b-a))%(b-a));
const bez=(a,b,c,u)=>(1-u)*(1-u)*a+2*(1-u)*u*b+u*u*c;

/* ═══ ХОЛСТЫ ═══ */
const stage=document.getElementById('stage');
const RAW=new URLSearchParams(location.search).get('raw')==='1';
const cv=document.createElement('canvas');cv.width=RAW?LW:W;cv.height=RAW?LH:H;cv.style.width='1080px';cv.style.height='1920px';stage.appendChild(cv);
const O=cv.getContext('2d');O.imageSmoothingEnabled=false;
let g=null;
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;if(fn){const k=g;g=c.getContext('2d');g.imageSmoothingEnabled=false;fn(c);g=k;}return c;}
const HUD=mk(LW,LH),HG=HUD.getContext('2d');g=HG;

/* ═══ ПИКСЕЛЬНЫЙ ИНТЕРФЕЙС ═══ */
const F8='8px "Press Start 2P"',F16='16px "Press Start 2P"';
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
const TXC=new Map();
function txc(s,font,col){const key=s+'|'+font+'|'+col;let c=TXC.get(key);if(c)return c;
  const m=document.createElement('canvas').getContext('2d');m.font=font;const w=Math.ceil(m.measureText(s).width)+2,fs=parseInt(font.match(/(\d+)px/)[1]),h=Math.ceil(fs*1.35)+2;
  c=document.createElement('canvas');c.width=Math.max(1,w);c.height=h;const x=c.getContext('2d');x.font=font;x.textBaseline='top';x.fillStyle=col;x.fillText(s,1,1);
  const im=x.getImageData(0,0,c.width,h),d=im.data,rgb=RGB(col);for(let i=0;i<d.length;i+=4){const on_=d[i+3]>118;d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=on_?255:0;}
  x.putImageData(im,0,0);TXC.set(key,c);return c;}
function Tt(s,x,y,font,col,al,sh){if(!s)return 0;const c=txc(s,font||F8,col||P.ink);let X=al==='c'?x-c.width/2:al==='r'?x-c.width:x;X=Math.round(X);
  if(sh){g.drawImage(txc(s,font||F8,sh),X+1,Math.round(y)+1);}g.drawImage(c,X,Math.round(y));return c.width;}
function TX(s,x,y,font,col,ext,al){const c=txc(s,font,col);let X=al==='c'?x-c.width/2:x;X=Math.round(X);ext.forEach((e,k)=>{g.drawImage(txc(s,font,e),X+k+1,Math.round(y)+k+1);});g.drawImage(c,X,Math.round(y));return c.width;}
function box(x,y,w,h,bc,fill){x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);if(w<3||h<3)return;
  rect(x+1,y+1,w-2,h-2,fill||P.box);g.fillStyle=bc||P.mi;g.fillRect(x+1,y,w-2,1);g.fillRect(x+1,y+h-1,w-2,1);g.fillRect(x,y+1,1,h-2);g.fillRect(x+w-1,y+1,1,h-2);
  g.fillStyle=P.dk;g.fillRect(x+2,y+h-2,w-4,1);g.fillRect(x+w-2,y+2,1,h-4);}
const step4=(t,a,d=.2)=>Math.floor(cl((t-a)/d)*4)/4;
function popup(t,t0,s,x,y,col,f=F8){const u=(t-t0)/.9;if(u<0||u>1)return;if(u>.78&&Math.floor(t*20)%2)return;Tt(s,x,y-Math.round(out(u)*20),f,col,'c',P.dk);}
function triR(x,y,c){g.fillStyle=c;for(let k=0;k<4;k++)g.fillRect(x+k,y+k,1,7-2*k);}
function stamp(t,t0,s,x,y,col){if(t<t0)return;const u=P_(t,t0,.18);const c=txc(s,F8,col),bw=c.width+10;
  if(u<1&&Math.floor(t*30)%2)return;box(x-bw/2,y-4,bw,16,col,P.dk);g.drawImage(c,Math.round(x-c.width/2),y);}

/* ═══ ПИКСЕЛЬНЫЕ СПРАЙТЫ ═══ */
const SPC=new Map();
/* масштаб рисования спрайта: координаты в «базовых» пикселях, концы округляются — без дыр и размытия */
let SS=1;
const rp=(x,y,w,h,c)=>{const x0=Math.round(x*SS),y0=Math.round(y*SS),x1=Math.round((x+w)*SS),y1=Math.round((y+h)*SS);g.fillStyle=c;g.fillRect(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0));};
const pp=(x,y,c)=>rp(x,y,1,1,c);
function outline(c,ol){const x=c.getContext('2d'),w=c.width,h=c.height,im=x.getImageData(0,0,w,h),d=im.data,a=new Uint8Array(w*h);for(let i=0;i<w*h;i++)a[i]=d[i*4+3]>0?1:0;const [r,g_,b]=RGB(ol);
  for(let y=0;y<h;y++)for(let X=0;X<w;X++){const i=y*w+X;if(a[i])continue;if((X>0&&a[i-1])||(X<w-1&&a[i+1])||(y>0&&a[i-w])||(y<h-1&&a[i+w])){d[i*4]=r;d[i*4+1]=g_;d[i*4+2]=b;d[i*4+3]=255;}}x.putImageData(im,0,0);}
function sprite2(key,w,h,fn,ol=P.dk,ss=1){let c=SPC.get(key);if(c)return c;SS=ss;c=mk(Math.round(w*ss),Math.round(h*ss),fn);SS=1;if(ol)outline(c,ol);SPC.set(key,c);return c;}
function disc(cx,cy,r,shade){for(let y=Math.floor((cy-r-1)*SS);y<=(cy+r)*SS;y++)for(let x=Math.floor((cx-r-1)*SS);x<=(cx+r)*SS;x++){const dx=(x+.5)/SS-cx,dy=(y+.5)/SS-cy,d=Math.hypot(dx,dy);if(d<=r){g.fillStyle=shade(dx,dy,d);g.fillRect(x,y,1,1);}}}
/* отражение в луже: перевёрнуто, темнее, через пиксель */
const RFC=new Map();
function refl(c){let r=RFC.get(c);if(r)return r;r=mk(c.width,c.height,()=>{g.save();g.scale(1,-1);g.drawImage(c,0,-c.height);g.restore();
  const im=g.getImageData(0,0,c.width,c.height),d=im.data;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if((x+y)%2||y>c.height*.75){d[i+3]=0;continue;}d[i]*=.45;d[i+1]*=.42;d[i+2]*=.55;}g.putImageData(im,0,0);});
  RFC.set(c,r);return r;}

/* Рублик: монета с лицом, ручками и ножками */
function heroSpr(mood='n',look=1,legs='stand',arms='down',hot=false){
  return sprite2(`h|${mood}|${look}|${legs}|${arms}|${hot}`,30,34,()=>{
    const cx=15,cy=14,r=10.6,hurt=mood==='hurt';
    const L=hurt?P.pkL:P.miW,B=hurt?P.rdL:P.mi,D=hurt?P.rd:P.mi2,DD=hurt?P.rd2:P.mi3;
    const lg=(x,y,h)=>{rp(x,y,2,h,DD);rp(x-1,y+h,4,2,P.gr2);};
    if(legs==='air'){lg(10,24,1);lg(18,24,1);}else if(legs==='squash'){lg(8,24,2);lg(20,24,2);}else{lg(10,24,3);lg(18,24,3);}
    const arm=(pts)=>pts.forEach(([x,y])=>pp(x,y,DD));
    if(arms==='up')arm([[4,11],[3,10],[2,9],[2,8],[26,11],[27,10],[28,9],[28,8]]);
    else if(arms==='wave')arm([[4,15],[3,15],[2,16],[26,11],[27,10],[28,9],[28,8],[27,7]]);
    else if(arms==='push')arm([[25,14],[26,14],[27,14],[28,13],[4,16],[3,17]]);
    else arm([[4,15],[3,16],[3,17],[26,15],[27,16],[27,17]]);
    disc(cx,cy,r,(dx,dy,d)=>{if(d>r-1.3)return dx+dy<-3?L:D;if(d>r-2.3&&dx+dy>3)return DD;const s=dx+dy;return s<-9?L:s>9?D:B;});
    for(let a=0;a<28;a++){const an=a/28*6.283,x=Math.round(cx-.5+Math.cos(an)*7.6),y=Math.round(cy-.5+Math.sin(an)*7.6);if(Math.cos(an)+Math.sin(an)>.3)pp(x,y,D);}
    rp(9,7,2,2,P.ink);pp(11,6,P.ink);
    const lx=look>0?1:look<0?-1:0;
    if(mood==='blink'){rp(10,13,4,1,P.dk);rp(17,13,4,1,P.dk);}
    else if(mood==='happy'){[[10,13],[11,12],[12,12],[13,13]].forEach(([x,y])=>pp(x,y,P.dk));[[17,13],[18,12],[19,12],[20,13]].forEach(([x,y])=>pp(x,y,P.dk));}
    else if(hurt){[[10,11],[13,11],[11,12],[12,12],[11,13],[12,13],[10,14],[13,14]].forEach(([x,y])=>pp(x,y,P.dk));[[17,11],[20,11],[18,12],[19,12],[18,13],[19,13],[17,14],[20,14]].forEach(([x,y])=>pp(x,y,P.dk));}
    else{rp(10,10,4,5,P.ink);rp(17,10,4,5,P.ink);rp(11+lx,11,2,3,P.dk);rp(18+lx,11,2,3,P.dk);pp(11+lx,11,P.ink);pp(18+lx,11,P.ink);}
    rp(7,16,2,1,P.pk);rp(22,16,2,1,P.pk);
    if(mood==='happy'){rp(12,17,7,3,P.dk);rp(13,19,5,1,P.pk);}else if(hurt){[[12,18],[13,17],[14,18],[15,17],[16,18],[17,17],[18,18]].forEach(([x,y])=>pp(x,y,P.dk));}
    else{[[12,17],[13,18],[14,18],[15,18],[16,18],[17,18],[18,17]].forEach(([x,y])=>pp(x,y,P.dk));}
  },hot?P.amL:P.dk,1.5);}
/* Инфляция: красный монстр со стрелками «вверх» и ценником */
function bossSpr(mood='n',lx=0,frame=0){
  return sprite2(`b|${mood}|${lx}|${frame}`,74,72,()=>{
    const cx=37,cy=42;
    [[20,frame%2?1:0],[37,frame%2?0:2],[54,frame%2?1:0]].forEach(([x,o])=>{const y0=4+o;for(let k=0;k<6;k++)rp(x-k,y0+k,2*k+1,1,k<2?P.rdL:P.rd);rp(x-2,y0+6,5,10,P.rd);rp(x-2,y0+6,2,10,P.rdL);rp(x+2,y0+6,1,10,P.rd2);});
    disc(cx,cy,27,(dx,dy,d)=>{if(d>25.6)return dx+dy<-6?P.rdL:P.rd3;const s=dx+dy;if(rnd(Math.floor(dx*7+dy*13))<.06)return P.pk2;return s<-20?P.rdL:s>18?P.rd2:P.rd;});
    for(let k=0;k<9;k++){rp(19+k,27+Math.floor(k/2),1,3,P.rd3);rp(54-k,27+Math.floor(k/2),1,3,P.rd3);}
    if(mood==='blink'){rp(22,37,10,2,P.rd3);rp(42,37,10,2,P.rd3);}
    else{disc(27,37,5.2,()=>P.ink);disc(47,37,5.2,()=>P.ink);rp(25+lx*2,35,4,4,P.dk);rp(45+lx*2,35,4,4,P.dk);pp(25+lx*2,35,P.ink);pp(45+lx*2,35,P.ink);}
    if(mood==='open'){rp(23,48,28,12,P.rd3);rp(26,56,22,3,P.pk2);for(let k=0;k<7;k++){rp(24+k*4,48,3,3,P.ink);pp(25+k*4,51,P.ink);rp(24+k*4,58,3,2,P.ink);}}
    else{rp(24,50,26,5,P.rd3);for(let k=0;k<7;k++){rp(25+k*4,50,3,2,P.ink);pp(26+k*4,52,P.ink);}}
    rp(62,48,10,12,P.am);rp(62,48,10,2,P.amL);pp(63,50,P.dk);[[65,52],[69,52],[68,53],[67,54],[66,55],[65,56],[69,56]].forEach(([x,y])=>pp(x,y,P.dk));rp(60,46,3,1,P.amL);rp(59,45,1,1,P.amL);
  });}
/* кофейный воришка */
function cofSpr(frame=0,grab=false){return sprite2(`c|${frame}|${grab}`,24,28,()=>{
  for(let y=7;y<22;y++){const w=Math.round(lerp(14,10,(y-7)/14)),x0=12-Math.ceil(w/2);rp(x0,y,w,1,P.skin);rp(x0+w-3,y,3,1,P.dim);}
  rp(5,6,14,2,P.br);rp(6,5,12,1,P.brL);rp(6,13,12,3,P.pk);rp(6,13,12,1,P.pkL);
  for(let y=9;y<16;y++){pp(19,y,P.dim);pp(21,y,P.dim);}pp(20,9,P.dim);pp(20,15,P.dim);
  rp(8,10,3,3,P.ink);rp(13,10,3,3,P.ink);rp(9,11,2,2,P.dk);rp(14,11,2,2,P.dk);rp(7,9,4,1,P.br);rp(13,9,4,1,P.br);
  rp(9,17,6,2,P.dk);pp(10,17,P.ink);pp(13,17,P.ink);
  rp(8,22,2,3,P.br);rp(14,22,2,3,P.br);
  for(let k=0;k<3;k++){const y=(4-((frame+k*2)%5));pp(8+k*4,Math.max(0,y),P.dim);pp(9+k*4,Math.max(0,y-1),P.dim);}
  if(grab){rp(1,13,3,1,P.skin);rp(0,12,2,3,P.am);}
},P.dk,1.4);}
/* такси, едет влево */
function taxiSpr(frame=0){return sprite2(`x|${frame}`,52,24,()=>{
  rp(16,3,20,7,P.am2);rp(18,4,7,5,P.cyL);rp(27,4,7,5,P.cyL);rp(18,4,7,1,P.ink);rp(23,1,6,2,P.rdL);
  for(let y=9;y<18;y++)rp(3,y,46,1,y<11?P.amL:y>15?P.am2:P.am);rp(2,11,1,5,P.am2);rp(49,11,1,5,P.am2);
  for(let x=4;x<48;x+=2){pp(x,13,(x/2)%2?P.dk:P.ink);pp(x+1,13,(x/2)%2?P.ink:P.dk);}
  rp(2,11,2,2,P.amL);rp(48,11,2,2,P.rd);
  [[10,18],[38,18]].forEach(([x,y])=>{rp(x,y,6,2,P.pk2);rp(x+1,y+2,4,1+(frame%2),P.pkL);});
},P.dk,1.25);}
/* призрак-автоплатёж */
function ghostSpr(frame=0){return sprite2(`g|${frame}`,24,28,()=>{
  disc(12,10,9,(dx,dy)=>dx+dy<-6?P.pkL:dx+dy>6?P.vi:P.viL);rp(3,10,18,10,P.viL);rp(16,10,5,10,P.vi);
  for(let x=3;x<21;x++){const h=((x+frame)%4<2)?2:0;rp(x,20,1,h+1,(x>15?P.vi:P.viL));}
  rp(7,8,3,4,P.ink);rp(14,8,3,4,P.ink);rp(8,9,2,2,P.dk);rp(15,9,2,2,P.dk);rp(10,14,4,2,P.dk);
  rp(7,16,10,4,P.cy);rp(7,17,10,1,P.dk);rp(8,19,3,1,P.cyL);
},P.dk,1.45);}
/* прохожие: тип, кадр шага */
const PTYPES=[{coat:P.pk,hair:P.br,acc:'umb'},{coat:P.sk,hair:P.dk,acc:'bag'},{coat:P.am,hair:P.brL,acc:'cap'},{coat:P.li2,hair:P.dk,acc:'scarf'},{coat:P.vi,hair:P.pe2,acc:''},{coat:P.mg,hair:P.amL,acc:'umb'},{coat:P.cy2,hair:P.br,acc:'bag'},{coat:P.pe2,hair:P.dk,acc:'cap'}];
function pedSpr(ty,frame){const T=PTYPES[ty%PTYPES.length];return sprite2(`p|${ty}|${frame}`,16,32,()=>{
  const sk=ty%3===1?P.skin2:P.skin,ox=1,oy=5;
  if(T.acc==='umb'){const uc=T.coat===P.pk?P.mgL:P.pkL;rp(ox,oy-4,14,2,uc);rp(ox+2,oy-5,10,1,uc);rp(ox+7,oy-2,1,3,P.gr);}
  rp(ox+4,oy+1,5,5,sk);rp(ox+4,oy,5,2,T.hair);pp(ox+4,oy+2,T.hair);if(T.acc==='cap'){rp(ox+3,oy-1,7,2,P.rd);rp(ox+8,oy+1,3,1,P.rd);}
  pp(ox+7,oy+3,P.dk);
  rp(ox+3,oy+7,7,9,T.coat);rp(ox+8,oy+7,2,9,P.gr2);if(T.acc==='scarf')rp(ox+3,oy+6,7,2,P.rd);
  const sw=[0,1,0,-1][frame%4];rp(ox+2,oy+8+Math.max(0,sw),1,6,T.coat);rp(ox+10,oy+8+Math.max(0,-sw),1,6,T.coat);
  if(T.acc==='bag')rp(ox+10,oy+12,3,4,P.am2);
  const l1=[0,2,0,-2][frame%4];rp(ox+4+Math.min(0,l1),oy+16,2,7,P.gr2);rp(ox+7+Math.max(0,-l1),oy+16,2,7,P.gr2);rp(ox+3+Math.min(0,l1),oy+23,3,1,P.dk);rp(ox+7+Math.max(0,-l1),oy+23,3,1,P.dk);
},P.dk,1.35);}
function catSpr(frame){return sprite2(`k|${frame}`,14,12,()=>{rp(3,4,8,5,P.pe);rp(3,4,8,1,P.peL);rp(9,1,4,4,P.pe);pp(9,0,P.pe);pp(12,0,P.pe);pp(10,2,frame===2?P.pe2:P.dk);pp(12,2,frame===2?P.pe2:P.dk);
  rp(3,9,1,2,P.pe2);rp(9,9,1,2,P.pe2);const tl=frame%2?[[2,5],[1,4],[1,3]]:[[2,6],[1,6],[0,5]];tl.forEach(([x,y])=>pp(x,y,P.pe2));},P.dk,1.4);}
function coinSpr(f){return sprite2(`m|${f}`,11,11,()=>{const w=[4.2,3,1.6,.8][f%4];for(let y=1;y<10;y++)for(let x=1;x<10;x++){const dx=(x+.5-5.5)/w,dy=(y+.5-5.5)/4.2;if(dx*dx+dy*dy<=1)pp(x,y,dx+dy<-.6?P.amL:dx+dy>.6?P.am2:P.am);}if(f%4<2)pp(4,3,P.ink);});}
function tagSpr(){return sprite2('t',12,9,()=>{rp(2,1,9,7,P.rd);rp(2,1,9,2,P.rdL);pp(1,4,P.rd);[[4,3],[8,3],[7,4],[6,5],[5,6],[8,6]].forEach(([x,y])=>pp(x,y,P.ink));});}
/* спрайт в мировой точке: низ спрайта — на земле */
function at(c,x,y,z,dy=0,fl=false){const q=scr(x,y,z);if(q[2]>1)return null;const X=Math.round(q[0]-c.width/2),Y=Math.round(q[1]-c.height+dy);
  if(fl){g.save();g.translate(X+c.width,Y);g.scale(-1,1);g.drawImage(c,0,0);g.restore();}else g.drawImage(c,X,Y);return [q[0],q[1]+dy-c.height/2,X,Y];}
function shadow(x,z,w){const q=scr(x,0,z);if(q[2]>1)return;g.fillStyle='rgba(11,10,26,.55)';for(let k=0;k<2;k++){const ww=Math.round(w*(1-k*.35));g.fillRect(Math.round(q[0]-ww/2),Math.round(q[1])-1+k,ww,1);}}
function reflAt(c,x,z){const q=scr(x,0,z);if(q[2]>1)return;g.drawImage(refl(c),Math.round(q[0]-c.width/2),Math.round(q[1])+1);}
const pp2=(x,y,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),1,1);};

/* ═══════════════════════ 3D ═══════════════════════ */
const {Reflector,mergeGeometries}=T3X;
const V3=THREE.Vector3,COL=(h,k=1)=>new THREE.Color(h).multiplyScalar(k);
const RD=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
RD.setPixelRatio(1);RD.setSize(LW,LH,false);RD.toneMapping=THREE.NoToneMapping;RD.outputColorSpace=THREE.LinearSRGBColorSpace;
const S3=new THREE.Scene(),CAM=new THREE.PerspectiveCamera(50,LW/LH,.5,3000);
const RT=new THREE.WebGLRenderTarget(LW,LH,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(LW,LH)});
const RTN=new THREE.WebGLRenderTarget(LW,LH,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
const NMAT=new THREE.MeshNormalMaterial();
const POST=new THREE.ShaderMaterial({uniforms:{tC:{value:RT.texture},tD:{value:RT.depthTexture},tN:{value:RTN.texture},res:{value:new THREE.Vector2(LW,LH)},near:{value:.5},far:{value:3000},
    pal:{value:PAL.map(h=>{const [r,g_,b]=RGB(h);return new V3(r/255,g_/255,b/255);})},dith:{value:.04},expo:{value:1.16},sat:{value:1.18}},
  vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tC,tD,tN;uniform vec2 res;uniform float near,far,dith,expo,sat;uniform vec3 pal[${PAL.length}];
    float lin(float d){float z=d*2.-1.;return 2.*near*far/(far+near-z*(far-near));}
    vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
    float bay(vec2 p){int x=int(mod(p.x,4.)),y=int(mod(p.y,4.));int i=x+y*4;
      float m[16];m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for(int k=0;k<16;k++){if(k==i)return (m[k]+.5)/16.;}return .5;}
    void main(){vec2 uv=gl_FragCoord.xy/res;vec3 c=aces(texture2D(tC,uv).rgb*expo);c=pow(c,vec3(1./2.2));
      float lu=dot(c,vec3(.3,.59,.11));c=clamp(mix(vec3(lu),c,sat),0.,1.);
      float d=lin(texture2D(tD,uv).r);vec3 n=texture2D(tN,uv).rgb*2.-1.;float sil=0.,hi=0.;
      for(int k=0;k<4;k++){vec2 o=k==0?vec2(1.,0.):k==1?vec2(-1.,0.):k==2?vec2(0.,1.):vec2(0.,-1.);
        float dn=lin(texture2D(tD,uv+o/res).r);vec3 nn=texture2D(tN,uv+o/res).rgb*2.-1.;
        if(dn-d>.05*d+.5)sil=1.;
        else if(abs(dn-d)<.03*d+.25&&dot(n,nn)<.8&&(k==1||k==2)&&d<400.)hi=1.;}
      if(sil>.5)c=c*.3+vec3(.025,.02,.06);else if(hi>.5)c=min(c*1.3+.05,1.);
      c+=(bay(gl_FragCoord.xy)-.5)*dith;
      vec3 best=pal[0];float bd=1e9;for(int k=0;k<${PAL.length};k++){vec3 q=c-pal[k];float dd=dot(q*vec3(.9,1.2,.7),q);if(dd<bd){bd=dd;best=pal[k];}}
      gl_FragColor=vec4(best,1.);}`,depthTest:false,depthWrite:false});
const PS=new THREE.Scene(),PC=new THREE.OrthographicCamera(-1,1,1,-1,0,1);PS.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),POST));
function camSet(px,py,pz,tx_,ty,tz,fov=50){CAM.position.set(px,py,pz);CAM.lookAt(tx_,ty,tz);if(CAM.fov!==fov){CAM.fov=fov;CAM.updateProjectionMatrix();}CAM.updateMatrixWorld();}
const _v=new V3();function scr(x,y,z){_v.set(x,y,z).project(CAM);return [(_v.x+1)/2*LW,(1-_v.y)/2*LH,_v.z];}
function ctex(w,h,fn,rep){const c=mk(w,h,fn);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function addM(par,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);par.add(m);return m;}
let GLOW;
function glow(col,k,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:COL(col,k),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sp.scale.set(s,s,1);return sp;}
function winTex(seed,cols,lit){return ctex(16,32,()=>{rect(0,0,16,32,'#0E0D22');for(let y=1;y<32;y+=4)for(let x=1;x<16;x+=4){const r=rnd(seed+x*7.1+y*3.3);
  g.fillStyle=r<lit?cols[Math.floor(rnd(seed+x+y*5)*cols.length)]:'#1C1A3A';g.fillRect(x,y,2,2);}rect(0,0,1,1,P.dk);},true);}
function bld(w,h,d){const gm=new THREE.BoxGeometry(w,h,d),uv=gm.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;if(f===2||f===3)uv.setXY(i,.01,.99);else uv.setXY(i,uv.getX(i)*dims[f][0]/8,uv.getY(i)*dims[f][1]/16);}return gm;}
function sign(s,col,h,vert){const pad=2,cw=vert?12:s.length*8+pad*2+2,ch=vert?s.length*9+pad*2+2:12;
  const tx_=ctex(cw,ch,()=>{rect(0,0,cw,ch,P.dk);g.fillStyle=col;g.fillRect(0,0,cw,1);g.fillRect(0,ch-1,cw,1);g.fillRect(0,0,1,ch);g.fillRect(cw-1,0,1,ch);
    if(vert){for(let i=0;i<s.length;i++)Tt(s[i],cw/2,pad+1+i*9,F8,col,'c');}else Tt(s,cw/2,pad,F8,col,'c');});
  const w=h*cw/ch,m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx_,color:COL('#ffffff',1.5)}));
  const gl=glow(col,.5,Math.max(w,h)*1.8);gl.position.z=-.3;m.add(gl);return m;}
const VBOX=new THREE.BoxGeometry(.92,.92,.92);
function vmesh(n,emi=.35){const m=new THREE.InstancedMesh(VBOX,new THREE.MeshLambertMaterial({color:'#ffffff',emissive:'#ffffff',emissiveIntensity:emi}),n);
  m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);m.frustumCulled=false;
  m.material.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance*=vColor;');};return m;}
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new V3(),_p=new V3(),_c=new THREE.Color();
function setV(m,i,x,y,z,s=1,rx=0,ry=0,rz=0){_q.setFromEuler(_e.set(rx,ry,rz));_m.compose(_p.set(x,y,z),_q,_s.set(s,s,s));m.setMatrixAt(i,_m);}
function colV(m,i,h,k=1){_c.set(h).multiplyScalar(k);m.setColorAt(i,_c);}
function glyphBits(s){const c=mk(s.length*8+2,10,()=>{g.font=F8;g.textBaseline='top';g.fillStyle='#fff';g.fillText(s,0,0);});const d=c.getContext('2d').getImageData(0,0,c.width,10).data,B=[];
  for(let y=0;y<10;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>118)B.push([x,y]);return {B,w:c.width};}

/* ═══ МИР: сумерки в пять красок ═══ */
let DOME,SUN,WORLD={};const NOHIDE=[];
const SKY={top:'#151433',u1:'#2F4E9C',u2:'#9A3A8C',u3:'#F2A262',hor:'#FFE9A0'},SKYR={top:'#2A0C1A',u1:'#5A1E5A',u2:'#9C2F34',u3:'#D9544D',hor:'#F2908A'};
function buildWorld(){
  DOME=new THREE.Mesh(new THREE.SphereGeometry(2500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{c0:{value:new THREE.Color()},c1:{value:new THREE.Color()},c2:{value:new THREE.Color()},c3:{value:new THREE.Color()},c4:{value:new THREE.Color()},sun:{value:new THREE.Color('#FFE9A0')},sdir:{value:new V3(-.3,.06,-1).normalize()}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 c0,c1,c2,c3,c4,sun,sdir;varying vec3 vP;float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){float h=vP.y;vec3 c=h<.04?mix(c4,c3,smoothstep(-.02,.04,h)):h<.13?mix(c3,c2,smoothstep(.04,.13,h)):h<.3?mix(c2,c1,smoothstep(.13,.3,h)):mix(c1,c0,smoothstep(.3,.6,h));
        float s=dot(vP,sdir);c+=sun*smoothstep(.9962,.9972,s)*1.5+sun*pow(max(s,0.),50.)*.5;
        vec2 g=floor(vec2(atan(vP.x,vP.z)*300.,h*300.));if(h>.3&&h2(g)>.996)c+=vec3(.9,.85,1.)*smoothstep(.3,.55,h);gl_FragColor=vec4(c,1.);}`}));
  DOME.renderOrder=-10;S3.add(DOME);
  WORLD.clouds=[];for(let i=0;i<12;i++){const w=60+rnd(i+40)*100,cA=[P.pkL,P.peL,P.amL,P.mgL][i%4],cB=[P.pk,P.pe,P.pe2,P.mg][i%4],tex=ctex(40,10,()=>{for(let k=0;k<30;k++){const x=rnd(i*30+k)*34,y=2+rnd(i*30+k+.5)*5,r=1+rnd(i*30+k+.7)*3;g.fillStyle=cB;g.fillRect(x,y+1,r*2,r);g.fillStyle=cA;g.fillRect(x,y,r*2,r*.6);}});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.85,fog:false,color:COL('#ffffff',1),depthWrite:false}));
    m.position.set((rnd(i+41)-.5)*1000,80+rnd(i+42)*170,-900-rnd(i+43)*300);m.userData.x0=m.position.x;S3.add(m);NOHIDE.push(m);WORLD.clouds.push(m);}
  const G=new THREE.Group();S3.add(G);WORLD.g=G;
  const BC=['#22204D','#332E6B','#1A2A5E','#3A1E2E','#5A1E5A','#151433','#123A44'];
  const WC=[[P.am,P.peL,P.pkL],[P.cyL,P.amL,P.skL],[P.pk,P.peL,P.am],[P.amL,P.am,P.li],[P.mgL,P.cyL,P.pkL],[P.peL,P.amL,P.cyL],[P.cyL,P.li,P.amL]];
  const mats=BC.map((c,i)=>new THREE.MeshLambertMaterial({color:c,emissive:'#ffffff',emissiveMap:winTex(100+i*17,WC[i],[.2,.16,.22,.18,.16,.2,.18][i]),emissiveIntensity:1.2}));
  const geos=BC.map(()=>[]),put=(x,z,w,d,h,m)=>{const gm=bld(w,h,d);gm.translate(x,h/2,z);geos[m].push(gm);};
  let x=-80,i=0;WORLD.tops=[];while(x<80){const w=6+Math.floor(rnd(i*1.9)*6)*2,h=14+Math.floor(rnd(i*2.7)*10)*4;put(x+w/2,-18,w,10,h,i%7);if(h>=30&&i%2)WORLD.tops.push([x+w/2,h,-18]);x+=w+1;i++;}
  for(let k=0;k<30;k++){const w=8+rnd(k+300)*10,h=24+rnd(k+301)*36;put(-100+k*7+rnd(k+302)*4,-38-rnd(k+303)*14,w,12,h,(k+2)%7);}
  for(let k=0;k<70;k++){const a=rnd(k+400)*Math.PI-Math.PI,r=180+rnd(k+401)*300,w=14+rnd(k+402)*26,h=30+Math.pow(rnd(k+403),1.6)*130;put(Math.sin(a)*r,-60-Math.abs(Math.cos(a))*r,w,w,h,k%7);}
  geos.forEach((a,k)=>{if(a.length)G.add(new THREE.Mesh(mergeGeometries(a),mats[k]));});
  /* витрины и полосатые маркизы */
  for(let k=0,xx=-66;xx<70;xx+=9,k++){const c=[P.pk,P.am,P.cy,P.pe,P.viL,P.li,P.mgL][k%7],c2=[P.pkL,P.amL,P.cyL,P.peL,P.ink,P.li2,P.pkL][k%7];
    const tex=ctex(16,8,()=>{rect(0,0,16,8,c);rect(0,6,16,2,P.dk);for(let j=0;j<4;j++)rect(1+j*4,2,2,4,'#3A1E2E');});
    addM(G,new THREE.PlaneGeometry(7,3.2),new THREE.MeshBasicMaterial({map:tex,color:COL('#ffffff',.95)}),xx,1.9,-12.9);
    const aw=ctex(8,2,()=>{for(let j=0;j<8;j++)rect(j,0,1,2,j%2?c:c2);});const a_=addM(G,new THREE.PlaneGeometry(7.4,1.6),new THREE.MeshLambertMaterial({map:aw,emissive:'#ffffff',emissiveMap:aw,emissiveIntensity:.5}),xx,4.1,-12.2);a_.rotation.x=-.9;}
  WORLD.signs=[];[['КОФЕ',P.pk,-30,7],['БАНК',P.cy,-12,8],['24/7',P.am,40,7],['ОБМЕН',P.pe,50,7],['РАМЕН',P.am,-48,7],['ЦВЕТЫ',P.li,6,7.5]].forEach(([s,c,xx,y])=>{const m=sign(s,c,2.4);m.position.set(xx,y,-12.8);G.add(m);WORLD.signs.push([m,s]);});
  [['НОЧЬ',P.viL,-22,14],['ДАННЫЕ',P.cy,16,16],['КРЕДИТ',P.pk,34,15],['ИГРЫ',P.mgL,-40,15]].forEach(([s,c,xx,y])=>{const m=sign(s,c,10,true);m.position.set(xx,y,-11.5);G.add(m);WORLD.signs.push([m,s]);});
  addM(G,new THREE.BoxGeometry(240,.5,10),new THREE.MeshLambertMaterial({color:'#2A2D3A'}),0,.25,-8);
  addM(G,new THREE.BoxGeometry(240,.2,.3),new THREE.MeshBasicMaterial({color:COL(P.cy,1.4)}),0,.55,-3);
  const mir=new Reflector(new THREE.PlaneGeometry(400,300),{textureWidth:LW,textureHeight:LH,color:'#8a86a0',clipBias:.003});mir.rotation.x=-Math.PI/2;mir.position.set(0,0,120);G.add(mir);NOHIDE.push(mir);
  const pud=ctex(64,64,()=>{rect(0,0,64,64,'#fff');for(let k=0;k<26;k++){g.fillStyle='#000';const x=rnd(k+50)*64,y=rnd(k+51)*64,w=4+rnd(k+52)*14;g.fillRect(x,y,w,w*.5);g.fillRect(x+2,y-1,w-4,1);}},true);pud.repeat.set(30,22);
  const film=addM(G,new THREE.PlaneGeometry(400,300),new THREE.MeshLambertMaterial({color:'#151433',transparent:true,alphaMap:pud,opacity:.88}),0,.02,120);film.rotation.x=-Math.PI/2;
  /* фонари разных цветов и гирлянды между ними */
  WORLD.posts=[];for(let xx=-75,k=0;xx<=75;xx+=15,k++){const lc=[P.amL,P.pkL,P.cyL][k%3];addM(G,new THREE.BoxGeometry(.4,7,.4),new THREE.MeshLambertMaterial({color:'#4A4F63'}),xx,3.5,-3.6);
    addM(G,new THREE.BoxGeometry(1.4,.4,.8),new THREE.MeshBasicMaterial({color:COL(lc,1.6)}),xx,7,-3.2);const s=glow(lc,.6,6);s.position.set(xx,6.8,-3);G.add(s);WORLD.posts.push(xx);}
  WORLD.bulbs=[];const BN=14;for(let p=0;p<WORLD.posts.length-1;p++)for(let k=0;k<BN;k++){const u=(k+.5)/BN,x=lerp(WORLD.posts[p],WORLD.posts[p+1],u),y=7.3-Math.sin(Math.PI*u)*1.8;WORLD.bulbs.push([x,y,-3.6]);}
  WORLD.BUL=vmesh(WORLD.bulbs.length,1.2);G.add(WORLD.BUL);WORLD.bulbs.forEach(([x,y,z],i)=>setV(WORLD.BUL,i,x,y,z,.42));
  S3.add(new THREE.HemisphereLight('#9A7FD1','#22204D',1.0));
  SUN=new THREE.DirectionalLight('#F2A262',1.7);SUN.position.set(-60,30,-100);S3.add(SUN);
  WORLD.neon=[[P.pk,-30,6,-8],[P.cy,-12,6,-8],[P.am,6,6,-6],[P.mgL,26,6,-6]].map(([c,xx,y,z])=>{const l=new THREE.PointLight(c,90,30,2);l.position.set(xx,y,z);S3.add(l);return l;});
  S3.fog=new THREE.FogExp2('#4B3A8C',.0032);
  /* реквизит дня: зарплатный терминал, киоск кофе, сейф-копилка */
  const ATM=new THREE.Group();ATM.position.set(-15,0,-5.2);G.add(ATM);addM(ATM,new THREE.BoxGeometry(2.4,4.6,1.4),new THREE.MeshLambertMaterial({color:'#2A2D3A'}),0,2.3,0);
  const st=ctex(8,6,()=>{rect(0,0,8,6,P.mi3);rect(1,1,6,1,P.miL);rect(1,3,4,1,P.mi);});addM(ATM,new THREE.PlaneGeometry(1.8,1.3),new THREE.MeshBasicMaterial({map:st,color:COL('#ffffff',1.4)}),0,3.3,.72);
  const sa=sign('ЗАРПЛАТА',P.mi,1.6);sa.position.set(0,5.6,.2);ATM.add(sa);
  const KIO=new THREE.Group();KIO.position.set(-3,0,-6.2);G.add(KIO);addM(KIO,new THREE.BoxGeometry(5.4,3.8,2.6),new THREE.MeshLambertMaterial({color:'#5C3A2A'}),0,1.9,0);
  const kt=ctex(12,6,()=>{rect(0,0,12,6,P.pe);rect(1,1,10,4,'#3A1E2E');rect(2,2,2,2,P.amL);rect(8,2,2,2,P.amL);});addM(KIO,new THREE.PlaneGeometry(4.4,2.2),new THREE.MeshBasicMaterial({map:kt,color:COL('#ffffff',1.2)}),0,1.9,1.32);
  const aw2=ctex(8,2,()=>{for(let j=0;j<8;j++)rect(j,0,1,2,j%2?P.pk:P.ink);});const ak=addM(KIO,new THREE.PlaneGeometry(6,1.6),new THREE.MeshLambertMaterial({map:aw2,emissive:'#ffffff',emissiveMap:aw2,emissiveIntensity:.6}),0,4.1,1.6);ak.rotation.x=-.8;
  const VAU=new THREE.Group();VAU.position.set(24,0,-5.6);G.add(VAU);addM(VAU,new THREE.BoxGeometry(4.2,5,2.4),new THREE.MeshLambertMaterial({color:'#4A4F63'}),0,2.5,0);
  const door=addM(VAU,new THREE.CylinderGeometry(1.5,1.5,.3,20),new THREE.MeshLambertMaterial({color:P.am2,emissive:P.am,emissiveIntensity:.4}),0,2.6,1.3);door.rotation.x=Math.PI/2;WORLD.door=door;
  const vs=sign('КОПИЛКА',P.cy,1.6);vs.position.set(0,5.9,.6);VAU.add(vs);
}
function skyAt(t){const r=cl(Math.min(P_(t,14.0,.7),1-P_(t,21.3,.8))),u=DOME.material.uniforms;
  ['top','u1','u2','u3','hor'].forEach((k,i)=>u['c'+i].value.copy(new THREE.Color(SKY[k]).lerp(new THREE.Color(SKYR[k]),r)));
  S3.fog.color.copy(new THREE.Color('#4B3A8C').lerp(new THREE.Color('#5A1A22'),r));SUN.color.copy(new THREE.Color('#F2A262').lerp(new THREE.Color('#D9544D'),r));}

/* ═══ ЖИЗНЬ: машины, окна, бегущая строка, антенны, облака, птицы, гирлянды, пылинки ═══ */
let CAR,WINF,BIRD,TICK,TICKC,SPK;const CARS=[],WINS=[],ANT=[];
function buildLife(){const G=WORLD.g;
  for(let i=0;i<10;i++)CARS.push({dir:i%2?-1:1,sp:9+rnd(i+720)*9,x0:(rnd(i+721)-.5)*160,y:20+rnd(i+722)*16,z:-26-rnd(i+723)*22,col:[P.cy2,P.vi2,P.pk2,P.mg,P.sk][i%5]});
  CAR=vmesh(CARS.length*6,.3);G.add(CAR);CARS.forEach(c=>{c.f=glow(P.amL,.9,4);c.b=glow(P.rd,.8,3);G.add(c.f,c.b);});
  WINF=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1.2),new THREE.MeshBasicMaterial({color:'#ffffff'}),80);WINF.frustumCulled=false;G.add(WINF);
  for(let i=0;i<80;i++){WINS.push({x:-60+rnd(i+740)*120,y:5+Math.floor(rnd(i+741)*4)*2,ph:rnd(i+742)*9,sp:.3+rnd(i+743)*.6,c:[P.amL,P.peL,P.pkL,P.cyL,P.am,P.li,P.mgL][i%7]});_m.makeTranslation(WINS[i].x,WINS[i].y+.6,-12.97);WINF.setMatrixAt(i,_m);}
  BIRD=vmesh(18,.1);G.add(BIRD);
  TICKC=mk(64,10);TICK=new THREE.CanvasTexture(TICKC);TICK.magFilter=TICK.minFilter=THREE.NearestFilter;TICK.generateMipmaps=false;TICK.colorSpace=THREE.SRGBColorSpace;
  addM(G,new THREE.PlaneGeometry(9.6,1.5),new THREE.MeshBasicMaterial({map:TICK,color:COL('#ffffff',1.5)}),-58,11.6,-12.85);addM(G,new THREE.BoxGeometry(10.2,2.1,.3),new THREE.MeshLambertMaterial({color:'#151433'}),-58,11.6,-13.05);
  WORLD.tops.forEach(([x,h,z])=>{const sp=glow(P.rd,1.2,3);sp.position.set(x,h+1.2,z);G.add(sp);ANT.push(sp);addM(G,new THREE.BoxGeometry(.3,2.4,.3),new THREE.MeshLambertMaterial({color:'#4A4F63'}),x,h+.2,z);});
  SPK=vmesh(800,1);S3.add(SPK);}
let SN=0;function spk(x,y,z,c,s,k=1.3){if(SN>=800)return;setV(SPK,SN,x,y,z,s);colV(SPK,SN,c,k);SN++;}
function lifeAt(t){
  CARS.forEach((c,i)=>{const x=wrap(c.x0+c.dir*c.sp*t,-100,100);[[-.9,0,c.col],[0,0,c.col],[.9,0,c.col],[0,.8,P.cyL],[1.7*c.dir,0,P.amL],[-1.7*c.dir,0,P.rd]].forEach(([lx,ly,col],k)=>{setV(CAR,i*6+k,x+lx,c.y+ly+Math.sin(t*2+i)*.3,c.z,.9);colV(CAR,i*6+k,col,k>=4?2:1);});
    c.f.position.set(x+2.4*c.dir,c.y,c.z);c.b.position.set(x-2.4*c.dir,c.y,c.z);});CAR.instanceMatrix.needsUpdate=true;CAR.instanceColor.needsUpdate=true;
  WINS.forEach((w,i)=>{_c.set(rnd(Math.floor(t*w.sp+w.ph)*13+i)<.55?w.c:'#1C1A3A');WINF.setColorAt(i,_c);});WINF.instanceColor.needsUpdate=true;
  {const x=TICKC.getContext('2d');x.fillStyle=P.dk;x.fillRect(0,0,64,10);const msg='КОПИ С УМОМ * ВКЛАДЫ * КЕШБЭК * ',w=msg.length*8,off=Math.floor(t*22)%w;x.drawImage(txc(msg,F8,P.amL),-off,1);x.drawImage(txc(msg,F8,P.amL),w-off,1);TICK.needsUpdate=true;}
  ANT.forEach((a,i)=>{a.visible=Math.sin(t*3.4+i*1.9)>0;});
  WORLD.clouds.forEach((m,i)=>{m.position.x=m.userData.x0+t*(4+i%4);});
  WORLD.signs.forEach(([m,s],i)=>{const k=s==='24/7'?(Math.floor(t*2.5)%2?1.6:.5):(rnd(Math.floor(t*10)+i*31)<.04?.4:1.5);m.material.color.copy(COL('#ffffff',k));});
  const BC=[P.pk,P.amL,P.cyL,P.li,P.mgL,P.pe];WORLD.bulbs.forEach((b,i)=>{const on=((i+Math.floor(t*8))%5)!==0;colV(WORLD.BUL,i,BC[i%6],on?1.6:.35);});WORLD.BUL.instanceColor.needsUpdate=true;
  let bn=0;if(t<4.5)for(let i=0;i<6;i++){const x=-40+((t*7+i*9)%80),y=52+i%3*3+Math.sin(t*1.5+i)*1.5,z=-30-i*4,fl=Math.sin(t*14+i*2)>0?.6:-.3;setV(BIRD,bn++,x,y,z,.7);setV(BIRD,bn++,x-.7,y+fl,z,.7);setV(BIRD,bn++,x+.7,y+fl,z,.7);}
  for(let k=0;k<bn;k++)colV(BIRD,k,'#151433',1);BIRD.count=bn;BIRD.instanceMatrix.needsUpdate=true;if(bn)BIRD.instanceColor.needsUpdate=true;
  [-36,8,36].forEach((vx,j)=>{for(let k=0;k<5;k++){const ph=(t*.5+k/5+j*.3)%1;spk(vx+Math.sin(ph*6+k+j)*.6,.6+ph*5,-9.2,ph<.4?P.mute:P.gr,.22+ph*.25,1);}});
  for(let i=0;i<26;i++){const cx=CAM.position.x,x=cx+wrap(rnd(i+800)*40+t*(.6+rnd(i+801)),-20,20),y=1.5+wrap(rnd(i+802)*16+t*.4,0,16),z=-1+rnd(i+803)*6;spk(x,y,z,[P.pkL,P.amL,P.cyL,P.miL,P.li][i%5],.16);}
  WORLD.door.rotation.y=t>11.3&&t<12.1?(t-11.3)*5:0;
}

/* ═══ ТИТУЛ: буквы из вокселей ═══ */
let TV,TB=[];
function buildTitle(){const a=glyphBits('РУБЛЬ'),b=glyphBits('КВЕСТ');
  a.B.forEach(([x,y])=>{for(let l=0;l<2;l++)TB.push({x:x-a.w/2,y:-y,z:l,row:y,l,ch:Math.floor(x/8),big:1});});
  b.B.forEach(([x,y])=>TB.push({x:(x-b.w/2)*.75,y:-11-y*.75,z:0,row:y,l:0,ch:5+Math.floor(x/8),big:0}));
  TV=vmesh(TB.length,1.2);S3.add(TV);}
const TPOS=new V3(0,36,-6),TS=.7;
function titleAt(t){const vis=t<4.6;TV.visible=vis;if(!vis)return;const rows=[P.miW,P.miL,P.miL,P.mi,P.mi,P.mi,P.mi2,P.mi2];
  TB.forEach((v,i)=>{const t0=.15+v.ch*.1,u=sprO(t-t0,9,.6),sc=v.big?TS:TS*.75;const sx=(rnd(i)-.5)*80,sy=(rnd(i+.3)-.5)*60+20,sz=(rnd(i+.6)-.5)*40+30;
    const bob=Math.sin(t*3.2+v.x*.3)*.55,ex=t>3.3?out(P_(t,3.3,.9)):0,glx=lerp(-30,30,((t-1.2)%1.4)/1.4),gl=t>1.2&&Math.abs(v.x*sc-glx)<1.1;
    const x=TPOS.x+lerp(sx,v.x*TS,u)+(ex?(rnd(i+5)-.5)*60*ex:0),y=TPOS.y+lerp(sy,v.y*TS,u)+bob+(ex?(rnd(i+6)*30)*ex:0),z=TPOS.z+lerp(sz,v.z*TS,u)+(ex?rnd(i+7)*20*ex:0);
    setV(TV,i,x,y,z,sc*(t<t0?0:1)*(1-ex),(1-u)*3+ex*4,(1-u)*2,0);
    colV(TV,i,gl&&!v.l?P.ink:(v.big?(v.l?P.mi2:rows[v.row]||P.mi):[P.amL,P.amL,P.am,P.am,P.pe,P.pe,P.pe2,P.pe2][v.row]||P.am),1.5);});
  TV.instanceMatrix.needsUpdate=true;TV.instanceColor.needsUpdate=true;}

/* ═══ СЮЖЕТ ДНЯ: станции героя ═══ */
/* [время, x, тип] — x героя на дороге (z=0); между станциями прыжки, 'big' — большой прыжок */
const HK=[[4.0,-24],[4.6,-16],[6.0,-16],[6.6,-6],[7.7,-6],[8.1,0],[9.3,0],[9.75,6],[10.05,6],[10.45,10.2,'big'],[10.75,11],[11.1,20],[22.2,20],[23.2,12],[30,12]];
function heroX(t){if(t<=HK[0][0])return [HK[0][1],0,'stand',0];for(let i=1;i<HK.length;i++){const [t0,x0]=HK[i-1],[t1,x1,ty]=HK[i];if(t<=t1){if(x1===x0)return [x0,0,'stand',0];
  const u=(t-t0)/(t1-t0),x=lerp(x0,x1,u);if(ty==='big')return [x,Math.sin(Math.PI*u)*9,'air',u];const n=Math.max(1,Math.round(Math.abs(x1-x0)/3.2)),ph=(u*n)%1;return [x,Math.sin(Math.PI*ph)*2.4,ph<.1||ph>.9?'squash':'air',ph];}}return [HK[HK.length-1][1],0,'stand',0];}
function camX(t){const keys=[[0,-21]];for(let i=1;i<HK.length;i++)if(HK[i][1]!==HK[i-1][1]&&HK[i][0]<14)keys.push([HK[i-1][0],HK[i][1]+3]);return track(t,keys,x=>spr(x,3.2));}
const WAL=[[0,0],[4.9,.25],[5.25,.5],[5.6,.75],[5.95,1],[7.05,.75],[8.6,.35],[11.35,.3],[11.45,.25],[11.55,.2],[11.65,.15],[11.75,.1],[11.85,.05],[11.95,0]];
const KOP=[[0,0],[11.35,.05],[11.45,.1],[11.55,.15],[11.65,.2],[11.75,.25],[11.85,.3],[11.95,.35]];

/* ═══ БОСС → ПИКСЕЛИ → БАШНИ ═══ */
const BW=new V3(30,8.5,-1.2),EXP=21.1,ASM=22.0;
let BV;const BVX=[];let TW=[];
function bossCam(t){const sw=Math.sin(t*.7)*.6;return [[25+sw,10,40],[25+sw*.5,8.5,-4]];}
function buildBossTowers(){
  const tw=[];for(let k=0;k<20;k++){const h=Math.max(1,Math.round(Bal(k+1)/Bal(20)*40)),hc=Math.max(1,Math.round(120000*(k+1)/Bal(20)*40));tw.push({h,hc,x:(k-9.5)*2.3});}
  const T=[];tw.forEach((o,k)=>{for(let y=0;y<o.h;y++)for(let q=0;q<4;q++){const top=y>=o.hc;const c=top?(rnd(k*17+y*5+q)<.28?P.amL:[P.mi,P.mi2,P.li,P.miL][(q+y)%4]):(rnd(k*31+y*7+q)<.25?P.am:[P.vi,P.vi2,P.sk,P.mg][(q+y)%4]);
    T.push({k,y,x:o.x+(q%2)-.5,z:-6+Math.floor(q/2)-.5,c});}});
  T.sort((a,b)=>a.k-b.k||a.y-b.y);
  /* пиксели босса → мировые точки в его плоскости (камера боя в момент взрыва) */
  const [p,q]=bossCam(EXP);camSet(...p,...q,50);const bc=bossSpr('open',-1,0),d=bc.getContext('2d').getImageData(0,0,bc.width,bc.height).data;
  const D=CAM.position.distanceTo(BW),wpx=2*D*Math.tan(25*Math.PI/180)/LH,S=[];
  for(let y=0;y<bc.height;y++)for(let x=0;x<bc.width;x++){const i=(y*bc.width+x)*4;if(d[i+3]<128)continue;const hex='#'+[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
    S.push({x:BW.x+(x-bc.width/2)*wpx,y:BW.y+(bc.height/2-y)*wpx,z:BW.z,c:hex});}
  S.sort((a,b)=>rnd(a.x*91+a.y*37)-rnd(b.x*91+b.y*37));
  const N=Math.max(T.length,S.length);for(let i=0;i<N;i++){BVX.push({s:S[i%S.length],tg:T[i]||null,dup:i>=S.length});}
  TW=tw;BV=vmesh(N,.32);BV.userData.wpx=wpx;S3.add(BV);}
function expPos(s,i,u){const dx=s.x-BW.x,dy=s.y-BW.y,l=Math.hypot(dx,dy)||1,sp=10+rnd(i*1.7)*16,vz=(rnd(i*2.9)-.5)*14,vy=4+rnd(i*2.3)*8,kx=(1-Math.exp(-1.8*u))/1.8,g_=24;
  let y=s.y+(dy/l*sp)*kx+vy*u-.5*g_*u*u;const x=s.x+dx/l*sp*kx,z=s.z+vz*kx;if(y<.5)y=.5+Math.abs(Math.sin(u*9))*Math.max(0,1.2-u)*1.2;return [x,y,z];}
function voxAt(t){if(t<EXP){BV.visible=false;return;}BV.visible=true;const wpx=BV.userData.wpx;
  BVX.forEach((v,i)=>{let [x,y,z]=expPos(v.s,i,Math.min(t,ASM)-EXP),s=lerp(wpx*1.6,.7,P_(t,EXP,.5)),col=v.s.c,rx=(t-EXP)*(2+i%5),ry=(t-EXP)*(1+i%3);
    if(v.dup)s*=1-P_(t,EXP+.3,.7);
    if(t>ASM){if(v.tg){const dl=v.tg.k*.045+v.tg.y*.01,f=io(cl((t-ASM-dl)/.7)),[ex,ey,ez]=expPos(v.s,i,ASM-EXP);x=lerp(ex,v.tg.x,f);z=lerp(ez,v.tg.z,f);y=lerp(ey,v.tg.y+.5,f)+Math.sin(Math.PI*f)*8;
        s=lerp(.7,1,f);rx*=1-f;ry*=1-f;if(f>.85)col=v.tg.c;}else s=0;}
    setV(BV,i,x,y,z,s,rx,ry,0);colV(BV,i,col,1);});
  BV.instanceMatrix.needsUpdate=true;BV.instanceColor.needsUpdate=true;}

/* ═══ КАМЕРА ═══ */
const CK=[[0,[10,20,124],[0,38,-6]],[1.8,[6,26,92],[0,36,-6]],[3.2,[0,30,66],[0,34,-6]],[4.0,[-21,8,32],[-21,6.5,-4]],[4.1,[-21,8,32],[-21,6.5,-4]]];
function cr(p0,p1,p2,p3,u){const u2=u*u,u3=u2*u;return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u2+(-p0+3*p1-3*p2+p3)*u3);}
function spline(K_,t){let i=K_.findIndex((k,j)=>j<K_.length-1&&t>=k[0]&&t<K_[j+1][0]);if(i<0)i=K_.length-2;const u=cl((t-K_[i][0])/(K_[i+1][0]-K_[i][0]));
  const g_=(j,w)=>K_[Math.max(0,Math.min(K_.length-1,j))][w];return [1,2].map(w=>[0,1,2].map(a=>cr(g_(i-1,w)[a],g_(i,w)[a],g_(i+1,w)[a],g_(i+2,w)[a],u)));}
const SHK=[[7.05,.25,.3],[8.6,.45,.4],[14.75,1.0,.6],[15.6,.5,.35],[21.1,1.4,.7],[25.3,.25,.3]];
function shake(t){let a=0;SHK.forEach(([t0,A,d],i)=>{const u=t-t0;if(u>=0&&u<d)a+=A*(1-u/d)*(rnd(Math.floor(t*30)+i*7)-.5)*2;});return a;}
function camAt(t){let p,q;
  if(t<4.0)[p,q]=spline(CK,t);
  else if(t<13.9){const x=camX(t);p=[x,8,32];q=[x,6.5,-4];}
  else{const x0=camX(13.9),[bp,bq]=bossCam(t),u=io(P_(t,13.9,.9));p=[lerp(x0,bp[0],u),lerp(8,bp[1],u),lerp(32,bp[2],u)];q=[lerp(x0,bq[0],u),lerp(6.5,bq[1],u),lerp(-4,bq[2],u)];
    if(t>21.8){const v=io(P_(t,21.8,1.6));p=[lerp(p[0],0,v),lerp(p[1],24,v),lerp(p[2],92,v)];q=[lerp(q[0],0,v),lerp(q[1],20,v),lerp(q[2],-6,v)];}
    if(t>27.5){const v=io(P_(t,27.5,2.5));p[2]+=v*6;p[1]+=v*2;}}
  const sh=shake(t);p[0]+=sh;p[1]+=sh*.6;q[0]+=sh;
  const f=new V3(q[0]-p[0],q[1]-p[1],q[2]-p[2]),D=f.length();f.normalize();const rr=new V3().crossVectors(f,new V3(0,1,0)).normalize(),uu=new V3().crossVectors(rr,f),px=2*D*Math.tan(25*Math.PI/180)/LH;
  const P0=new V3(...p),a=P0.dot(rr),b=P0.dot(uu),off=rr.multiplyScalar(Math.round(a/px)*px-a).add(uu.multiplyScalar(Math.round(b/px)*px-b));
  camSet(p[0]+off.x,p[1]+off.y,p[2]+off.z,q[0]+off.x,q[1]+off.y,q[2]+off.z,50);}

/* ═══ КАДР ═══ */
let BUILT=false;
window.seek=function(t){
  if(!BUILT)return;
  SN=0;skyAt(t);camAt(t);titleAt(t);voxAt(t);lifeAt(t);
  WORLD.neon.forEach((l,i)=>l.intensity=90*(rnd(Math.floor(t*12)+i*31)<.03?.2:1));
  if(t>EXP&&t<EXP+1.2){const u=t-EXP;for(let i=0;i<70;i++){const th=rnd(i+900)*6.283,ph=Math.acos(2*rnd(i+901)-1),v=10+rnd(i+902)*22,d=v*(1-Math.exp(-3*u))/3;if(u>.5+rnd(i+903)*.7)continue;
    spk(BW.x+Math.sin(ph)*Math.cos(th)*d,BW.y+Math.cos(ph)*d-6*u*u,BW.z+Math.sin(ph)*Math.sin(th)*d,[P.amL,P.pkL,P.rdL,P.peL][i%4],.4,1.6);}}
  SPK.count=SN;SPK.instanceMatrix.needsUpdate=true;if(SN)SPK.instanceColor.needsUpdate=true;
  DOME.position.copy(CAM.position);POST.uniforms.near.value=CAM.near;POST.uniforms.far.value=CAM.far;
  RD.setRenderTarget(RT);RD.render(S3,CAM);
  NOHIDE.forEach(o=>{o.userData.v=o.visible;o.visible=false;});S3.overrideMaterial=NMAT;RD.setRenderTarget(RTN);RD.setClearColor(0x8080ff,1);RD.clear();RD.render(S3,CAM);
  S3.overrideMaterial=null;NOHIDE.forEach(o=>{o.visible=o.userData.v;});RD.setClearColor(0x000000,0);RD.setRenderTarget(null);RD.render(PS,PC);
  g=HG;g.clearRect(0,0,LW,LH);actors(t);hud(t);
  const OW=cv.width,OH=cv.height;O.imageSmoothingEnabled=false;O.globalCompositeOperation='source-over';O.globalAlpha=1;O.drawImage(RD.domElement,0,0,OW,OH);O.drawImage(HUD,0,0,OW,OH);
  const fl=t>EXP&&t<EXP+.45?.6*(1-(t-EXP)/.45):t>15.6&&t<15.75?.3:t>14.75&&t<14.9?.3:0;if(fl>0){O.globalAlpha=fl;O.fillStyle=t>EXP?P.peL:P.rdL;O.fillRect(0,0,OW,OH);O.globalAlpha=1;}
};

/* ═══ АКТЁРЫ ═══ */
const PEDS=[];for(let i=0;i<12;i++)PEDS.push({ty:i,dir:rnd(i+700)<.5?-1:1,sp:1.6+rnd(i+701)*1.4,x0:(rnd(i+702)-.5)*120,z:-9.6+rnd(i+703)*1.2,ph:rnd(i+705)*4});
let HEROP=[0,0],BOSSP=[0,0];
function actors(t){
  const L=[];
  PEDS.forEach(p=>{let x=wrap(p.x0+p.dir*p.sp*t,-60,60),fr=Math.floor(t*p.sp*3+p.ph)%4,flee=t>14.6&&t<22;
    if(flee){const fl=Math.sign(wrap(p.x0+p.dir*p.sp*14.6,-60,60)-BW.x)||1;x=wrap(p.x0+p.dir*p.sp*14.6,-60,60)+fl*Math.min(30,(t-14.6)*12);fr=Math.floor(t*12+p.ph)%4;}
    L.push({z:p.z,draw:()=>{shadow(x,p.z,8);at(pedSpr(p.ty,fr),x,0,p.z,0,flee?(x<BW.x):p.dir<0);}});});
  L.push({z:-8.5,draw:()=>{const fr=(t%3<.15)?2:Math.floor(t*2)%2;at(catSpr(fr),27.5,.5,-8.5);}});
  if(t>=3.9){const [x,hy,legs]=heroX(t);let mood='n',arms='down',hot=false,look=1;
    if((t>7.0&&t<7.4)||(t>8.6&&t<9.0)||(t>15.55&&t<16.0))mood='hurt';
    if((t>5.95&&t<6.4)||(t>10.6&&t<11.0)||(t>13.2&&t<13.9)||(t>21.4&&t<22.2)||t>25.0)mood='happy';
    if((t>13.2&&t<13.9)||(t>25.0&&t<26.0))arms='up';if(t>28.0)arms=Math.floor(t*4)%2?'wave':'up';
    if(t>11.3&&t<12.0)arms='push';if(t>20.4&&t<21.1){hot=Math.floor(t*12)%2===0;arms='push';}
    if(mood==='n'&&(t%2.7)<.12)mood='blink';
    if(t>22.2)look=0;
    let jy=hy;if(t>25.0&&t<26.2)jy=Math.abs(Math.sin((t-25)*Math.PI*2.5))*2.2;if(t>13.2&&t<13.9)jy=Math.abs(Math.sin((t-13.2)*Math.PI*3))*1.6;
    const lg=jy>.05?(legs==='squash'?'squash':'air'):'stand';
    const c=heroSpr(mood,look,lg,arms,hot);
    L.push({z:0,draw:()=>{shadow(x,0,14-Math.min(8,jy*2));if(jy<.6)reflAt(c,x,0);const bob=jy===0?(Math.floor(t*3)%2):0;const r=at(c,x,jy,0,bob+2);if(r)HEROP=[r[0],r[1]];
      if(legs==='squash'&&jy<.4){const gq=scr(x,0,0);for(let k=0;k<3;k++){pp2(gq[0]-9-k*3,gq[1]-1-k%2,P.dim);pp2(gq[0]+9+k*3,gq[1]-1-k%2,P.dim);}}}});}
  if(t>6.4&&t<8.2){const u=P_(t,6.5,.35),x=lerp(-3,-4.4,u),y=t<6.85?Math.sin(Math.PI*P_(t,6.5,.35))*3:0,fr=Math.floor(t*8)%5,back=t>7.4?P_(t,7.4,.6):0;
    L.push({z:-2,draw:()=>{shadow(x,-2,10);at(cofSpr(fr,t>6.95&&t<7.5),x+back*1.5,y+back*1.2,-2-back*3.5,0,true);}});}
  if(t>7.9&&t<9.3){const u=(t-8.0)/1.2,x=lerp(16,-14,u),y=4.2-2.2*Math.sin(Math.PI*cl(u));L.push({z:.5,draw:()=>{at(taxiSpr(Math.floor(t*12)%2),x,y,.5);
    const q=scr(x,y,.5);for(let k=0;k<8;k++)pp2(q[0]+26+k*3,q[1]-8+(k%3)*3,k%2?P.pkL:P.amL);}});}
  if(t>9.4&&t<10.75){const x=10.5,y=4.2+Math.sin(t*4)*.4,fr=Math.floor(t*6)%4,hit=t>10.45;
    L.push({z:-.5,draw:()=>{const q=scr(x,y,-.5);if(hit){const u=P_(t,10.45,.3);for(let k=0;k<14;k++){const an=k/14*6.283;pp2(q[0]+Math.cos(an)*u*22,q[1]-12+Math.sin(an)*u*22,k%2?P.viL:P.pkL);}return;}
      at(ghostSpr(fr),x,y,-.5);const [hx_]=heroX(t);const b=scr(hx_,1.8,0);if(t<10.1)for(let k=0;k<10;k++){const u=k/9;if((k+Math.floor(t*12))%2)pp2(lerp(q[0],b[0],u),lerp(q[1]-10,b[1]-14,u)+Math.sin(u*9+t*8)*2,P.rd);}}});}
  if(t>14.0&&t<EXP){const drop=cl(sprO(t-14.1,6,.45),0,1.1),y=lerp(30,BW.y,drop),fr=Math.floor(t*3)%2,mood=(t>15.1&&t<15.7)||(t>20.9)?'open':(t%1.9<.12?'blink':'n');
    const k_=cl(Math.min(P_(t,18.0,.3),1-P_(t,19.9,.3)));
    L.push({z:BW.z,draw:()=>{const c=bossSpr(mood,-1,fr);const br=Math.round(Math.sin(t*3.2)*1.2);const q=at(c,BW.x,y,BW.z,c.height/2+br);if(!q)return;BOSSP=[q[0],q[1]];
      if(t>20.95){g.save();g.beginPath();g.rect(q[2],q[3],c.width,c.height);g.clip();g.globalCompositeOperation='source-atop';g.globalAlpha=.6;rect(q[2],q[3],c.width,c.height,P.ink);g.restore();}
      if(k_>0)for(let yy=Math.max(0,q[3]);yy<q[3]+c.height;yy+=2)for(let xx=q[2]+((yy>>1)%2);xx<q[2]+c.width;xx+=2)pp2(xx,yy,P.box);}});}
  L.sort((a,b)=>a.z-b.z).forEach(a=>a.draw());
  fx(t);}
function fx(t){
  const hq=HEROP;
  [4.9,5.25,5.6,5.95].forEach(tc=>{const u=(t-(tc-.45))/.45;if(u<0||u>1)return;const a=scr(-15,3.3,-4.5),b=hq;g.drawImage(coinSpr(Math.floor(t*12)%4),Math.round(bez(a[0],(a[0]+b[0])/2,b[0],u)-5),Math.round(bez(a[1],a[1]-50,b[1],u)-5));});
  {const u=(t-7.05)/.5;if(u>0&&u<1){const b=scr(-4,1.5,-2);g.drawImage(coinSpr(Math.floor(t*12)%4),Math.round(lerp(hq[0],b[0],u)-5),Math.round(lerp(hq[1],b[1],u)-5-Math.sin(Math.PI*u)*16));}}
  if(t>8.6&&t<9.2){const u=t-8.6;for(let k=0;k<4;k++){const an=-Math.PI/2+(k-1.5)*.5;g.drawImage(coinSpr((k+Math.floor(t*12))%4),Math.round(hq[0]+Math.cos(an)*u*60-5),Math.round(hq[1]+Math.sin(an)*u*60+u*u*120-5));}}
  for(let k=0;k<7;k++){const tc=11.35+k*.1,u=(t-(tc-.3))/.3;if(u<0||u>1)continue;const b=scr(24,2.6,-4.3);g.drawImage(coinSpr((k+Math.floor(t*12))%4),Math.round(bez(hq[0],(hq[0]+b[0])/2,b[0],u)-5),Math.round(bez(hq[1],hq[1]-40,b[1],u)-5));}
  for(let k=0;k<3;k++){const t0=15.15+k*.12,u=(t-t0)/.45;if(u<0||u>1)continue;const a=BOSSP;g.drawImage(tagSpr(),Math.round(lerp(a[0]-10,hq[0],u)-6),Math.round(lerp(a[1]+10,hq[1],u)-4-Math.sin(Math.PI*u)*20));}
  if(t>17.4&&t<21.1){const n=Math.min(12,Math.floor((t-17.4)/.05)+1);for(let i=0;i<n;i++){const an=i/12*6.283+t*1.2,x=Math.round(hq[0]+Math.cos(an)*22),y=Math.round(hq[1]+Math.sin(an)*22);g.fillStyle=i%2?P.miL:P.cyL;g.fillRect(x,y-1,1,3);g.fillRect(x-1,y,3,1);}}
  if(t>20.4&&t<21.05){const u=P_(t,20.4,.65);for(let i=0;i<30;i++){const ph=(u*1.7+rnd(i+600))%1,an=rnd(i+601)*6.283,r=60*(1-ph);pp2(hq[0]+Math.cos(an)*r,hq[1]+Math.sin(an)*r,ph>.6?P.ink:P.miL);}}
  if(t>20.98&&t<21.25){const a=hq,b=BOSSP,n=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<n;s+=1){const u=s/n,x=lerp(a[0],b[0],u),y=lerp(a[1],b[1],u),w=(t<21.12?5:3)+Math.round(Math.sin(s*.7+t*60));
    g.fillStyle=P.miL;g.fillRect(Math.round(x),Math.round(y-w/2),1,Math.round(w));g.fillStyle=P.ink;g.fillRect(Math.round(x),Math.round(y-1),1,2);}}
  const sparks=(t0,x,y,cols,n=14)=>{const u=t-t0;if(u<0||u>.5)return;for(let k=0;k<n;k++){const an=rnd(k+t0*7)*6.283,r=u*(30+rnd(k+t0)*30);pp2(x+Math.cos(an)*r,y+Math.sin(an)*r+u*u*60,cols[k%cols.length]);}};
  [4.9,5.25,5.6,5.95].forEach(tc=>sparks(tc,hq[0],hq[1],[P.amL,P.am,P.ink]));sparks(7.05,hq[0],hq[1],[P.pe,P.am]);sparks(8.6,hq[0],hq[1],[P.rdL,P.amL]);sparks(15.6,hq[0],hq[1],[P.rdL,P.rd]);sparks(10.45,hq[0],hq[1]+20,[P.miL,P.viL]);
}

/* ═══ ИНТЕРФЕЙС ═══ */
function hud(t){
  const hq=HEROP;
  if(t>1.4&&t<3.5)TX('ПРО ДЕНЬГИ БЕЗ ВОДЫ',135,326,F8,P.ink,[P.dk],'c');
  if(t>2.2&&t<3.4){const o=step4(t,2.2);box(135-62*o,344,124*o,22,P.am,P.box);if(o>=1){Tt('НАЧАТЬ ИГРУ',143,351,F8,t>2.9&&Math.floor(t*12)%2?P.am:P.ink,'c');if(Math.floor(t*3)%2===0)triR(80,351,P.am);}}
  if(t>4.3&&t<13.9){const o=step4(t,4.3)*(1-step4(t,13.6));if(o>0){box(8,40,254,34*o,P.mi,P.box);if(o>=1){Tt('ДЕНЬ 1',16,47,F8,P.mi);Tt('08:00',16,58,F8,P.mute);Tt('КОШЕЛЁК',254,47,F8,P.dim,'r');
      Tt(rub(track(t,WAL,x=>spr(x,16)))+'₽',254,58,F8,P.amL,'r',P.dk);}}}
  if(t>11.3&&t<13.9){const o=step4(t,11.3)*(1-step4(t,13.6));box(150,78,112,20*o,P.cy,P.box);if(o>=1){Tt('КОПИЛКА',156,84,F8,P.dim);Tt(rub(track(t,KOP,x=>spr(x,16)))+'₽',256,84,F8,P.cyL,'r');}}
  const LG=[[6.1,'ЗАРПЛАТА','+1,00',P.mi],[7.35,'КОФЕ','-0,25',P.rdL],[9.0,'ТАКСИ','-0,40',P.rdL],[10.8,'ПОДПИСКА','0,00',P.mute]];
  if(t>6.0&&t<11.9){const o=step4(t,6.0)*(1-step4(t,11.7));box(8,78,138,52*o,P.mi,P.box);if(o>=1)LG.forEach(([t0,a,b,c],i)=>{if(t<t0)return;const y=85+i*11;Tt(a,14,y,F8,P.ink);Tt(b,140,y,F8,c,'r');if(i===3&&t>11.0)rect(14,y+3,126*P_(t,11.0,.3),1,P.rd);});}
  [4.9,5.25,5.6,5.95].forEach(tc=>popup(t,tc,'+0,25',hq[0],hq[1]-26,P.amL));popup(t,7.05,'-0,25',hq[0],hq[1]-26,P.rdL);popup(t,8.6,'-0,40',hq[0],hq[1]-26,P.rdL);
  if(t>9.5&&t<10.4){const q=scr(10.5,6.6,-.5),o=step4(t,9.5);box(q[0]-48*o,q[1]-36,96*o,16,P.rd,P.dk);if(o>=1)Tt('АВТОПЛАТЁЖ',q[0],q[1]-32,F8,P.rdL,'c');}
  if(t>10.5&&t<11.6){const q=scr(10.5,6,-.5);stamp(t,10.5,'ОТМЕНЕНА!',q[0],q[1]-24,P.mi);}
  if(t>12.0&&t<13.9){const o=step4(t,12.0)*(1-step4(t,13.6));box(20,150,230,92*o,P.am,P.box);if(o>=1){Tt('ОСТАТОК ЗА ДЕНЬ',135,158,F8,P.dim,'c');Tt('0,35₽ × 365 ДНЕЙ',135,174,F8,P.ink,'c');
      const v=track(t,[[0,0],[12.4,127.75]],x=>spr(x,5));TX(rub(v)+'₽',135,192,F16,P.amL,[P.am2],'c');if(t>13.0)stamp(t,13.0,'ДЕНЬ ПРОЙДЕН!',135,220,P.mi);}}
  if(t>14.4&&t<21.9){const o=step4(t,14.4)*(1-step4(t,21.7));box(8,40,254,30*o,P.rd,P.box);if(o>=1){Tt('ИНФЛЯЦИЯ',16,47,F8,P.rdL);Tt('8% УСЛ.',254,47,F8,P.rdL,'r');const hp=1-io(P_(t,EXP,.4));
      rect(16,58,238,6,P.rd3);rect(16,58,238*hp,6,P.rd);rect(16,58,238*hp,2,P.rdL);}}
  const cmp=t>17.8&&t<19.9;
  if(t>14.8&&t<21.9&&!cmp){const o=step4(t,14.8)*(1-step4(t,21.7));box(8,76,254,40*o,P.dim,P.box);if(o>=1){
      const M=[[14.85,'ИНФЛЯЦИЯ АТАКУЕТ!',''],[15.6,'СИЛА РУБЛЯ -7,4%','ИНФЛЯЦИЯ 8% УСЛОВНО'],[17.2,'ВКЛАД: 12% В ГОД','СТАВКА УСЛОВНАЯ'],[20.2,'СУПЕРУДАР: ВРЕМЯ!',''],[21.4,'ПОБЕДА! ПОКА ВКЛАД','ВЫШЕ ИНФЛЯЦИИ']];
      let m=M[0];M.forEach(x=>{if(t>=x[0])m=x;});Tt(typed(m[1],t,m[0],34),16,84,F8,P.ink);Tt(typed(m[2],t,m[0]+.4,34),16,98,F8,m[0]<16?P.rdL:P.miL);}}
  if(cmp){const o=step4(t,17.8)*(1-step4(t,19.7));box(8,76,254,122*o,P.cy,P.box);if(o>=1){
      const a=12*cl(sprO(t-18.0,9),0,1.1),b=8*cl(sprO(t-18.3,9),0,1.1),S=16;Tt('ВКЛАД',16,84,F8,P.mi);rect(16,95,a*S,8,P.mi);rect(16,95,a*S,2,P.miL);Tt(Math.round(a)+'%',16+a*S+4,95,F8,P.ink);
      Tt('ИНФЛЯЦИЯ',16,110,F8,P.rdL);rect(16,121,b*S,8,P.rd);rect(16,121,b*S,2,P.rdL);Tt(Math.round(b)+'%',16+b*S+4,121,F8,P.ink);
      if(t>18.7){g.fillStyle=P.cyL;for(let y=93;y<132;y+=2){g.fillRect(16+8*S,y,1,1);g.fillRect(16+12*S,y,1,1);}rect(16+8*S,134,4*S+1,1,P.cyL);}
      if(t>18.9)Tt('1,12 : 1,08 = 1,037',135,146,F8,P.ink,'c');if(t>19.3)TX('+3,7% РЕАЛЬНО',135,164,F16,P.miL,[P.mi3],'c');}}
  if(t>16.4&&t<20.6){const o=step4(t,16.4)*(1-step4(t,20.4)),x0=168,y0=286;box(x0,y0,94,50*o,P.cy,P.box);if(o>=1){const M=['АТАКА','ВКЛАД','ВРЕМЯ','ВЫЙТИ'],cur=t<16.9?0:t<19.9?1:2;
      M.forEach((m,i)=>{const sel=i===cur&&((t>17.0&&t<17.3)||(t>20.0&&t<20.3))&&Math.floor(t*12)%2===0;if(sel)rect(x0+3,y0+4+i*11,88,10,P.cy);Tt(m,x0+16,y0+5+i*11,F8,sel?P.dk:i===cur?P.ink:P.mute);});
      if(Math.floor(t*3)%2===0)triR(x0+6,y0+5+cur*11,P.cy);}}
  if(t>14.4&&t<21.9){const o=step4(t,14.6)*(1-step4(t,21.7));box(8,206,120,30*o,P.mi,P.box);if(o>=1){Tt('РУБЛИК',14,212,F8,P.mi);const pw=track(t,[[0,100],[15.6,92.6]],x=>spr(x,10));rect(14,224,60,5,P.mi3);rect(14,224,60*pw/100,5,P.mi);Tt(pw.toFixed(1).replace('.',',')+'%',122,222,F8,P.ink,'r');}}
  popup(t,15.6,'-7,4%',hq[0],hq[1]-26,P.rdL);popup(t,17.4,'+12%',hq[0],hq[1]-26,P.miL);
  if(t>22.6){const o=step4(t,22.6);box(8,40,254,58*o,P.mi,P.box);if(o>=1){Tt('КОПИЛКА · 20 ЛЕТ',16,47,F8,P.dim);
      const v=t>24.9?Bal(20):Bal(20)*io(P_(t,22.8,2.0));TX(fmt(v)+'₽',16,60,F16,P.miL,[P.mi3]);Tt('10 000₽ В МЕСЯЦ · 12% УСЛ.',16,84,F8,P.mute);}}
  if(t>25.0){const s=Bal(16)/Bal(20)*40,q=scr(-26,s,-6);g.fillStyle=P.cyL;for(let x=0;x<LW;x+=4)if(Math.floor((x+t*40)/4)%2)g.fillRect(x,Math.round(q[1]),2,1);Tt('ЦЕЛЬ 5 000 000₽',8,Math.round(q[1])+3,F8,P.cyL,null,P.dk);
    const o=step4(t,25.3)*(1-step4(t,27.6));if(o>0){box(8,Math.round(q[1])-30,156*o,20,P.mi,P.box);if(o>=1)Tt('ЦЕЛЬ — НА 16-Й ГОД',14,Math.round(q[1])-24,F8,P.miL);}}
  if(t>26.2&&t<27.9){const o=step4(t,26.2)*(1-step4(t,27.7));box(8,104,190,36*o,P.vi,P.box);if(o>=1){const a=P_(t,26.4,.3),b=P_(t,26.8,.3);
      Tt('ВЗНОСЫ',14,110,F8,P.dim);rect(78,110,30*a,7,P.vi);Tt('2,4 МЛН',192,110,F8,P.ink,'r');Tt('ПРОЦЕНТЫ',14,124,F8,P.dim);rect(86,124,60*b,7,P.mi);Tt('7,5 МЛН',192,124,F8,P.miL,'r');}}
  if(t>27.9){const o=step4(t,27.9);box(135-70*o,108,140*o,30,P.mi,P.box);if(o>=1){TX('ЛАНСКОЙ',135,114,F16,P.miL,[P.mi3],'c');}
    if(t>28.4)Tt('ПРО ДЕНЬГИ БЕЗ ВОДЫ',135,144,F8,P.ink,'c',P.dk);
    if(t>28.8){const pr=t>29.25&&t<29.45,o2=step4(t,28.8);box(135-58*o2,158,116*o2,22,P.am,pr?P.am:P.box);if(o2>=1)Tt('ПОДПИСАТЬСЯ',135,165,F8,pr?P.dk:P.amL,'c');}
    popup(t,29.45,'+1 ИГРОК',135,192,P.miL);}
}
const FACES=[F8,F16];
Promise.all(FACES.map(f=>document.fonts.load(f,'ЛАНСКОЙ₽09'))).then(()=>{
  GLOW=ctex(32,32,()=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot(x-15.5,y-15.5)/16;const a=Math.max(0,1-d);g.fillStyle=`rgba(255,255,255,${a*a})`;g.fillRect(x,y,1,1);}});
  buildWorld();buildTitle();buildLife();buildBossTowers();
  S3.traverse(o=>{if(o.isSprite&&!NOHIDE.includes(o))NOHIDE.push(o);});
  BUILT=true;window.seek(0);window.READY=true;}).catch(e=>console.error('build',e&&e.stack||e));
