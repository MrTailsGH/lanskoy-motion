/* ═══════════════════════════════════════════════════════════════════
   И-01 в 3D · «Вы получаете 80, за вас отдают 134» · 1080×1920 · 30 fps
   Та же дорожка и те же якоря, что у i01.html v3; картинка — three.js.

   Акты: хук (две полосы из пачек денег) → монета в камеру → чек-лента
   в 3D, строка налога въезжает между «на руки» и «начислено» →
   итог 134 000 → бублик долей → белый акт «40%» → прибавка со
   вычёркиванием и стопкой монет → бумажный самолётик и профиль.

   Движение — по DVIZHENIE.md (правила Эмиля Ковальски в наших единицах):
   вход — сильный ease-out, перемещение — сильный ease-in-out, постоянное —
   линейно, пружина только на приземлении главного числа; ничего не растёт
   из нуля; уход быстрее входа; каскад 50–80 мс; смена актов — наплыв
   с расфокусом.

   Цифры на экране — объёмные (TextGeometry по контурам Golos Text Black,
   golos-black.js), подписи и титры — плоский слой поверх 3D.
   Всё — чистая функция seek(t). Случайность — rnd(i).
   ═══════════════════════════════════════════════════════════════════ */
const W=1080,H=1920,FPS=30,DUR=T.DUR;
window.META={FPS,DUR,FRAMES:Math.round(DUR*FPS)};
window.READY=false;

/* ═══ МАТЕМАТИКА И КРИВЫЕ ═══ */
const cl=(x,a=0,b=1)=>x<a?a:x>b?b:x;
const lerp=(a,b,p)=>a+(b-a)*p;
const P_=(t,s,d)=>cl((t-s)/d);
function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
/* кубическая Безье как у CSS: x — время, y — путь; решаем делением пополам */
function bez(x1,y1,x2,y2){
  const f=(t,a,b)=>((1-3*b+3*a)*t+(3*b-6*a))*t*t+3*a*t;
  return x=>{if(x<=0)return 0;if(x>=1)return 1;let lo=0,hi=1,t=x;
    for(let i=0;i<22;i++){t=(lo+hi)/2;if(f(t,x1,x2)<x)lo=t;else hi=t;}return f(t,y1,y2);};
}
const E={
  out: bez(.23,1,.32,1),      // вход, появление, приземление
  move:bez(.77,0,.175,1),     // перемещение по кадру
  lin: t=>t                   // постоянное движение
};
const IN=0.5, STAG=0.065;     // вход детали и каскад (DVIZHENIE §3)
const ent=(t,s,d=IN)=>E.out(P_(t,s,d));
const mov=(t,s,d)=>E.move(P_(t,s,d));
/* затухающая пружина: b — отскок 0,1–0,3, d — время, за которое она садится */
function spring(t,s,d=.7,b=.2){const u=t-s;if(u<=0)return 0;const z=cl(1-2*b,.2,.95),w=4.6/(z*d),q=Math.sqrt(1-z*z);
  return 1-Math.exp(-z*w*u)*(Math.cos(w*q*u)+z/q*Math.sin(w*q*u));}
const tri=(t,P)=>(2/Math.PI)*Math.asin(Math.sin(2*Math.PI*t/P));

/* ═══ ДОРОЖКА: блоки и якоря ═══ */
const B=T.B, bs=i=>B[i-1][0], be=i=>B[i-1][1];
const at=(i,p)=>bs(i)+(be(i)-bs(i))*p;
const pauseAfter=k=>(k>=B.length?1.0:bs(k+1)-be(k));
const fadeOut=k=>Math.min(.33,Math.max(.13,pauseAfter(k)*.62));
const swap=i=>{if(i<1)return 0;if(i>=B.length)return DUR;const a=be(i),b=bs(i+1),m=(a+b)/2;
  return (b-a)<.06?m:Math.min(Math.max(m,a+.03),b-.03);};
/* Якоря ставятся по словам дорожки I-01.mp3 (timing-I-01.json) и
   пересчитываются через блоки: придёт новая дорожка — settime.py
   перепишет T.B, и каждое событие сдвинется вместе со своим блоком. */
const B0=[[0,4.31],[4.61,6.52],[6.77,8.17],[8.84,12.32],[13.05,15.34],[15.98,18.76],[19.15,23.88],[24.32,25.33],
  [25.72,28.70],[29.11,31.75],[32.37,35.87],[36.33,39.36],[39.95,41.45],[41.67,45.39],[45.75,48.32],[48.84,50.39]];
function aw(x){let k=0;for(let i=0;i<B0.length;i++)if(x>=B0[i][0])k=i;const [s,e]=B0[k],p=(x-s)/Math.max(.01,e-s);
  return B[k][0]+p*(B[k][1]-B[k][0]);}

const HK_LAB2=aw(2.10);                 // «за вас отдают»
const HK_CNT =aw(2.45), HK_CD=aw(3.80)-HK_CNT;   // 80 → 134 под «сто тридцать четыре»
const HK_40  =aw(4.95);                 // «сорок» — доля государства загорается
const HK_CHIP=aw(5.75);                 // «государству»
const COIN0  =aw(6.80);                 // «смотрите» — монета поднимается
const COIN1  =aw(7.70);                 // «устроено» — летит в камеру
const X1     =swap(3);                  // монета закрыла кадр: хук → чек
const T_RUK  =aw(9.80), T_NACH=aw(10.50), T_NACHV=aw(11.40);
const T_NDFL =aw(13.05);                // «налог идёт сверху» — строка въезжает
const T_NDFV =aw(15.98);                // «двенадцать тысяч»
const T_VZ   =aw(19.62), T_VZV=aw(22.30);
const T_ITOG =aw(24.32);                // «уже сто двадцать»
const T_MEST =aw(25.72), T_MESV=aw(27.45);
const TOT    =aw(29.09);                // «сто тридцать четыре тысячи в месяц»
const TOT_SRC=aw(30.75);
const X2     =swap(10);                 // чек → доля
const SP_IN  =X2+.10, SP_A=aw(32.85), SP_B=aw(34.20);
const X3     =swap(11);                 // доля → белый
const FL_TXT =aw(37.08);
const X4     =swap(12);                 // белый → прибавка
const RS_V1  =aw(42.55), RS_STR=aw(43.40), RS_ARR=aw(44.10), RS_V2=aw(44.80);
const RS_SH  =aw(45.95), RS_TAP=aw(47.40);
const X5     =swap(15);                 // прибавка → CTA
const CT     =X5;
const XF=.40;                           // наплыв между актами

/* размытие движения: монета в камеру и полёт самолётика */
window.BLUR=[[COIN1+.15,X1+.40],[CT+.05,CT+1.05]];

/* ═══ ЦВЕТ ═══ */
const C={ink:'#FFFFFF',dim:'#9AA3C7',dim2:'#5F6894',
  green:'#2FD38E',greenD:'#16825A',red:'#F0524D',redD:'#8E2430',amber:'#F2B544',amberD:'#9A6714',
  violet:'#8B7CF6',violetD:'#3E338F',teal:'#3FB7C9',sky:'#5AA9F0',pink:'#F07AB0',gold:'#E9B44C',
  paper:'#161C3D',paper2:'#212A5C',bgTop:'#0A0F2C'};
function hex2(h){const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];}
function rgba(h,a){const [r,g_,b]=hex2(h);return `rgba(${r},${g_},${b},${a})`;}
function mixc(a,b,p){const x=hex2(a),y=hex2(b);return '#'+x.map((v,i)=>Math.round(lerp(v,y[i],p)).toString(16).padStart(2,'0')).join('');}
const ru=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const rub=n=>ru(n)+' ₽';
const cnt=(t,s,d,a,b)=>Math.round(lerp(a,b,mov(t,s,d))/100)*100;

/* ═══ ПЛОСКИЕ ХОЛСТЫ ═══
   cv — что видит зритель; A — сборка кадра (3D + свечение + интерфейс);
   XA/XB — два акта на наплыве; B1/B2 — свечение; ACC — размытие движения. */
const stage=document.getElementById('stage');
const cv=document.createElement('canvas');cv.width=W;cv.height=H;stage.appendChild(cv);
const O=cv.getContext('2d');
let g=null;
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;if(fn){const k=g;g=c.getContext('2d');fn(c,g);g=k;}return c;}
const A=mk(W,H),AG=A.getContext('2d');
const XA=mk(W,H),XAg=XA.getContext('2d'),XB=mk(W,H),XBg=XB.getContext('2d');
const B1=mk(270,480),B1g=B1.getContext('2d'),B2=mk(135,240),B2g=B2.getContext('2d');
const ACC=mk(W,H),ACG=ACC.getContext('2d');
const F=(w,s)=>`${w} ${s}px G`;
/* зерно: разбивает ступени градиента в H.264 */
const GR=mk(256,256,(c,x)=>{const d=x.createImageData(256,256);for(let i=0;i<d.data.length;i+=4){const v=rnd(i*.37)*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);});
let GRP=null,RGRP=null;

/* ═══ 3D: сцена, свет, студия ═══ */
const {EffectComposer,RenderPass,OutputPass,Reflector,RoomEnvironment,Font,TextGeometry,RoundedBoxGeometry}=T3X;
const V3=THREE.Vector3;
const RD=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
RD.setPixelRatio(1);RD.setSize(W,H,false);RD.toneMapping=THREE.ACESFilmicToneMapping;RD.toneMappingExposure=1.0;
const S3=new THREE.Scene(),CAM=new THREE.PerspectiveCamera(36,W/H,.1,600);
const QS=new URLSearchParams(location.search);
const RT=new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,samples:+(QS.get('ms')||4)});
const COMP=new EffectComposer(RD,RT);COMP.addPass(new RenderPass(S3,CAM));COMP.addPass(new OutputPass());
/* мир на плоскости z=0 при базовой камере: 184,66 px на единицу */
const CZ=16, PXU=H/(2*CZ*Math.tan(THREE.MathUtils.degToRad(18)));
const sx=px=>(px-W/2)/PXU, sy=py=>(H/2-py)/PXU;
const _v=new V3();
function scr(p){_v.copy(p).project(CAM);return [(_v.x+1)/2*W,(1-_v.y)/2*H,_v.z];}
function wpos(o){return o.getWorldPosition(new V3());}

function ctex(w,h,fn,srgb=true){const c=mk(w,h,fn);const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const GLOW=ctex(128,128,(c,x)=>{const gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);});
const BOKEH=ctex(128,128,(c,x)=>{const gr=x.createRadialGradient(64,64,0,64,64,62);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.78,'rgba(255,255,255,.42)');gr.addColorStop(.9,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);});

/* небо-купол: верх, горизонт, низ и два цветных зарева */
const DOME=new THREE.Mesh(new THREE.SphereGeometry(300,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color()},hor:{value:new THREE.Color()},bot:{value:new THREE.Color()},
    gA:{value:new THREE.Color()},gB:{value:new THREE.Color()},dA:{value:new V3(-.5,.25,-1).normalize()},dB:{value:new V3(.6,.05,-1).normalize()}},
  vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 top,hor,bot,gA,gB,dA,dB;varying vec3 vP;
    void main(){float y=vP.y;vec3 c=y>0.?mix(hor,top,pow(clamp(y*1.6,0.,1.),.7)):mix(hor,bot,clamp(-y*3.,0.,1.));
    c+=gA*pow(max(dot(vP,dA),0.),14.)+gB*pow(max(dot(vP,dB),0.),14.);
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`}));
S3.add(DOME);
S3.fog=new THREE.Fog(0x1a1240,26,90);

/* пол: зеркало низкого разрешения — мягкие цветные отражения */
const FY=-3.4;
const FLOOR=new Reflector(new THREE.PlaneGeometry(220,220),{textureWidth:540,textureHeight:960,color:0x7a7f99,clipBias:.003});
FLOOR.rotation.x=-Math.PI/2;FLOOR.position.y=FY;S3.add(FLOOR);
/* тонировка пола поверх зеркала: темнее у камеры, растворяется в тумане */
const FTEX=ctex(256,256,(c,x)=>{const gr=x.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(255,255,255,.2)');gr.addColorStop(.55,'rgba(255,255,255,.42)');gr.addColorStop(1,'rgba(255,255,255,.55)');x.fillStyle=gr;x.fillRect(0,0,256,256);});
const FTINT=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshBasicMaterial({map:FTEX,transparent:true,depthWrite:false,color:0x120c30}));
FTINT.rotation.x=-Math.PI/2;FTINT.position.y=FY+.01;S3.add(FTINT);

/* свет: ключ, заливка, цветные контровые и бегущий блик */
const HEMI=new THREE.HemisphereLight(0x9aa6ff,0x2a1840,.9);S3.add(HEMI);
const KEY=new THREE.DirectionalLight(0xfff1de,2.4);KEY.position.set(-5,9,12);S3.add(KEY);
const RIML=new THREE.PointLight(0x3fd0e0,160,0,2);RIML.position.set(-8,4,-2);S3.add(RIML);
const RIMR=new THREE.PointLight(0xf06aa8,160,0,2);RIMR.position.set(8,1,-2);S3.add(RIMR);
const SWEEP=new THREE.PointLight(0xffe2b0,70,0,2);SWEEP.position.set(0,2,5);S3.add(SWEEP);

/* боке: цветные пятна в глубине, плывут ровно и медленно */
const BOK=[];const BOKC=[C.teal,C.violet,C.pink,C.amber,C.green,C.sky,C.red,C.violet,C.teal,C.amber];
for(let i=0;i<54;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:BOKEH,color:new THREE.Color(BOKC[i%BOKC.length]),transparent:true,
  blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.5}));
  const r=.5+rnd(i*3.1)*1.5;s.scale.set(r,r,1);s.userData={x:lerp(-24,24,rnd(i*1.7)),y:lerp(-2,16,rnd(i*2.3)),z:lerp(-56,-22,rnd(i*5.9)),ph:rnd(i*7.3)*6.28,sp:.2+rnd(i*9.1)*.5,a:.10+rnd(i*4.4)*.20};
  S3.add(s);BOK.push(s);}
/* пылинки ближе к камере */
const MOTE=[];for(let i=0;i<40;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:new THREE.Color(BOKC[(i*3)%BOKC.length]),transparent:true,
  blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.6}));const r=.05+rnd(i*8.7)*.09;s.scale.set(r,r,1);
  s.userData={x:lerp(-4.5,4.5,rnd(i*2.9)),y:lerp(-5,6,rnd(i*6.1)),z:lerp(-3,6,rnd(i*3.3)),ph:rnd(i*1.3)*6.28};S3.add(s);MOTE.push(s);}

/* студия по акту: цвета неба, пола и зарева */
const LOOK={
  hook:  {top:'#05071A',hor:'#1A1240',bot:'#0C0A22',gA:C.green,gB:C.red,fog:'#1F1548',floor:'#140C34',bok:1},
  rec:   {top:'#05071A',hor:'#151B4C',bot:'#0A0B22',gA:C.amber,gB:C.violet,fog:'#191F55',floor:'#0E1033',bok:1},
  tot:   {top:'#08061A',hor:'#33112A',bot:'#100818',gA:C.red,gB:C.violet,fog:'#3A1536',floor:'#1A0A22',bok:.8},
  split: {top:'#040E14',hor:'#0B2C37',bot:'#061016',gA:C.green,gB:C.red,fog:'#0F3442',floor:'#06161E',bok:1},
  white: {top:'#FFFFFF',hor:'#EDEFF7',bot:'#E4E7F2',gA:'#FFE3E0',gB:'#E1F7EE',fog:'#EEF0F7',floor:'#F4F5FA',bok:0},
  raise: {top:'#030D10',hor:'#0B2B2A',bot:'#06100F',gA:C.green,gB:C.sky,fog:'#0E3533',floor:'#061412',bok:1},
  cta:   {top:'#05081F',hor:'#18214F',bot:'#0A0B24',gA:C.teal,gB:C.violet,fog:'#1E2A62',floor:'#0C1036',bok:1}};
const _c=new THREE.Color();
function studio(name,t,glowA=1,glowB=1){
  const L=LOOK[name],u=DOME.material.uniforms;
  u.top.value.set(L.top);u.hor.value.set(L.hor);u.bot.value.set(L.bot);
  u.gA.value.set(L.gA).multiplyScalar(.26*glowA);u.gB.value.set(L.gB).multiplyScalar(.26*glowB);
  /* зарева медленно плывут — фон не стоит, но глазом движение не читается */
  u.dA.value.set(-.5+.12*Math.sin(t*.21),.22+.05*Math.sin(t*.17),-1).normalize();
  u.dB.value.set(.55+.1*Math.sin(t*.19+1),.06+.05*Math.sin(t*.23+2),-1).normalize();
  S3.fog.color.set(L.hor);FTINT.material.color.set(L.floor);
  const wh=name==='white';
  FLOOR.material.uniforms.color.value.set(wh?0xdfe2ee:0x6a6e8c);
  FTINT.material.opacity=wh?.55:1;
  HEMI.color.set(wh?0xffffff:0x9aa6ff);HEMI.groundColor.set(wh?0xdde0ea:0x2a1840);HEMI.intensity=wh?1.6:.55;
  KEY.intensity=wh?2.4:1.7;RIML.intensity=wh?30:90;RIMR.intensity=wh?30:90;
  RD.toneMappingExposure=wh?1.05:1.0;
  BOK.forEach((s,i)=>{const d=s.userData;s.visible=L.bok>0;
    s.position.set(d.x+Math.sin(t*.07*d.sp+d.ph)*1.6,d.y+t*.05*d.sp%3+Math.sin(t*.11+d.ph)*.6,d.z);
    s.material.opacity=d.a*L.bok*(.75+.25*Math.sin(t*.9*d.sp+d.ph));});
  MOTE.forEach((s,i)=>{const d=s.userData;s.visible=!wh;
    s.position.set(d.x+Math.sin(t*.3+d.ph)*.3,((d.y+t*.12+11)%11)-5,d.z);
    s.material.opacity=.35+.3*Math.sin(t*1.7+d.ph);});
  /* бегущий блик: раз в 6 с проходит по кадру слева направо */
  const sw=((t+1.5)%6)/6;SWEEP.position.set(lerp(-9,9,sw),2.5,4.5);SWEEP.intensity=wh?0:70*Math.sin(Math.PI*sw);
}

/* ═══ МАТЕРИАЛЫ И ОБЪЁМНЫЕ ЦИФРЫ ═══ */
function mNum(col,k=1){
  const c=new THREE.Color(col);
  const front=new THREE.MeshPhysicalMaterial({color:c,roughness:.26,metalness:.05,clearcoat:1,clearcoatRoughness:.12,emissive:c.clone().multiplyScalar(.08*k)});
  const side=new THREE.MeshPhysicalMaterial({color:c.clone().multiplyScalar(.5),roughness:.35,metalness:.1,clearcoat:.7,clearcoatRoughness:.2,emissive:c.clone().multiplyScalar(.05)});
  return [front,side];
}
function tintNum(mats,col,k=1){const c=new THREE.Color(col);mats[0].color.copy(c);mats[0].emissive.copy(c).multiplyScalar(.08*k);mats[1].color.copy(c).multiplyScalar(.5);mats[1].emissive.copy(c).multiplyScalar(.05);}
function setOp(mats,o){(Array.isArray(mats)?mats:[mats]).forEach(m=>{m.opacity=o;m.transparent=o<.999;m.depthWrite=o>.5;});}
let FONT=null,DIGH=.7;
const GEO={};
function tgeo(s,size,depth){const k=s+'|'+size.toFixed(4)+'|'+depth;if(GEO[k])return GEO[k];
  const ge=new TextGeometry(s,{font:FONT,size,depth,curveSegments:6,bevelEnabled:true,bevelThickness:depth*.22,bevelSize:size*.022,bevelOffset:0,bevelSegments:3});
  ge.computeBoundingBox();GEO[k]=ge;return ge;}
/* число: группа стоит на базовой линии; align — край, к которому прижато.
   digitPx — высота цифры в пикселях на плоскости z=0 */
function Num3D(par,{digitPx=100,depthU=.24,col=C.ink,align='l'}){
  const size=(digitPx/PXU)/DIGH,grp=new THREE.Group();par.add(grp);
  const mats=mNum(col),mesh=new THREE.Mesh(tgeo('0',size,depthU),mats);grp.add(mesh);
  let cur=null;const o={grp,mesh,mats,size,
    set(s){if(s===cur)return;cur=s;const ge=tgeo(s,size,depthU),bb=ge.boundingBox;mesh.geometry=ge;
      mesh.position.x=align==='l'?-bb.min.x:align==='r'?-bb.max.x:-(bb.min.x+bb.max.x)/2;mesh.position.z=-depthU/2;
      o.w=bb.max.x-bb.min.x;},w:0};
  return o;
}

/* текстуры денег */
function noteTex(c1,c2,seed){return ctex(256,300,(c,x)=>{
  const gr=x.createLinearGradient(0,0,256,300);gr.addColorStop(0,c1);gr.addColorStop(1,c2);x.fillStyle=gr;x.fillRect(0,0,256,300);
  x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=4;x.strokeRect(14,14,228,272);
  x.lineWidth=1.5;x.strokeStyle='rgba(255,255,255,.18)';for(let i=0;i<9;i++){x.beginPath();x.arc(128,150,24+i*11,0,6.283);x.stroke();}
  x.fillStyle='rgba(255,255,255,.75)';x.font=F(900,110);x.textAlign='center';x.textBaseline='middle';x.fillText('₽',128,118);
  /* бандероль */
  x.fillStyle='#F1E6C8';x.fillRect(0,196,256,46);x.fillStyle='rgba(60,40,10,.75)';x.font=F(900,26);x.fillText('10 000',128,220);
});}
function edgeTex(c1,c2){return ctex(128,128,(c,x)=>{for(let y=0;y<128;y+=4){x.fillStyle=(y/4)%2?c1:c2;x.fillRect(0,y,128,4);}
  x.fillStyle='rgba(255,255,255,.12)';for(let y=0;y<128;y+=16)x.fillRect(0,y,128,1);x.fillStyle='#F1E6C8';x.fillRect(48,0,32,128);});}
const NOTE_G=noteTex('#2FD38E','#127A55',1),EDGE_G=edgeTex('#1FA172','#7FE3B8');
const NOTE_R=noteTex('#F0524D','#8E2430',2),EDGE_R=edgeTex('#C93C3A','#F59A8F');
const NOTE_V=noteTex('#8B7CF6','#3E338F',3),EDGE_V=edgeTex('#6656D8','#C1B8FF');
function bundleMats(note,edge){const m=(map,k)=>new THREE.MeshStandardMaterial({map,roughness:.5,metalness:0,emissive:0xffffff,emissiveMap:map,emissiveIntensity:k});
  return [m(edge,.08),m(edge,.08),m(edge,.12),m(edge,.06),m(note,.13),m(note,.06)];}

/* ═══ АКТ «ХУК»: две полосы из пачек ═══ */
const HOOK=new THREE.Group();S3.add(HOOK);
const BW=.31,BH=.37,BD=.85,PITCH=66/PXU;
const BGEO=new RoundedBoxGeometry(BW,BH,BD,3,.03);
function bundle(par,note,edge,x,y){const m=new THREE.Mesh(BGEO,bundleMats(note,edge));m.position.set(x,y,0);par.add(m);return m;}
const ROW1Y=sy(760),ROW2Y=sy(1090),X0=sx(60);
const bar1=[],bar2=[];
for(let i=0;i<8;i++)bar1.push(bundle(HOOK,NOTE_G,EDGE_G,X0+BW/2+i*PITCH,ROW1Y));
for(let i=0;i<8;i++)bar2.push(bundle(HOOK,NOTE_G,EDGE_G,X0+BW/2+i*PITCH,ROW2Y));
/* сверх ваших восьмидесяти — шесть пачек: пять целых и 0,4 */
const extra=[];for(let k=0;k<6;k++){const m=bundle(HOOK,NOTE_R,EDGE_R,X0+BW/2+(8+k)*PITCH,ROW2Y);if(k===5){m.scale.x=.4;m.position.x-=BW*.3;}extra.push(m);}
let num1,num2,HOOKM=[];

/* монета: переход хук → чек (PRIYOMY №33) */
const COIN=new THREE.Group();S3.add(COIN);
let coinFace=null;

/* ═══ АКТ «ЧЕК» ═══ */
const REC=new THREE.Group();S3.add(REC);
const PW=4.4,TW=1100,TH=1150,TU=PW/TW;          // ширина ленты в мире и в пикселях текстуры
const PTOP=sy(545);
const RCV=mk(TW,TH),RCG=RCV.getContext('2d');
const RTEX=new THREE.CanvasTexture(RCV);RTEX.colorSpace=THREE.SRGBColorSpace;RTEX.anisotropy=8;
const PSEG=60;
const PGEO=new THREE.PlaneGeometry(PW,TH*TU,1,PSEG);PGEO.translate(0,-TH*TU/2,0);
const PMAT=new THREE.MeshStandardMaterial({map:RTEX,transparent:true,alphaTest:.02,side:THREE.DoubleSide,roughness:.55,metalness:.1,
  emissive:0xffffff,emissiveMap:RTEX,emissiveIntensity:.62});
const PAPER=new THREE.Mesh(PGEO,PMAT);
const PGRP=new THREE.Group();PGRP.position.set(0,PTOP,0);PGRP.add(PAPER);REC.add(PGRP);
const PBASE=PGEO.attributes.position.array.slice();let PL=0;
const HEAD=150,RH=118;
const ROWS=[
  {k:'ruk', lab:'на руки',          col:C.green, kind:'line'},
  {k:'ndfl',lab:'НДФЛ 13%',         col:C.red,   kind:'line'},
  {k:'nach',lab:'НАЧИСЛЕНО',        col:C.ink,   kind:'sub'},
  {k:'vz',  lab:'взносы 30%',       col:C.amber, kind:'line'},
  {k:'itog',lab:'ИТОГО',            col:C.ink,   kind:'sub'},
  {k:'mest',lab:'место и техника',  col:C.violet,kind:'line'}];
/* монетки, которые вылетают из строк */
const CP=[];const CGEO=new THREE.CylinderGeometry(.17,.17,.05,40);
/* монитор: «место и техника» */
const MON=new THREE.Group();REC.add(MON);
let num3;   // итог 134 000

/* ═══ АКТ «ДОЛЯ»: бублик ═══ */
const SPL=new THREE.Group();S3.add(SPL);
const DON=new THREE.Group();SPL.add(DON);
const SEGS=[{v:80000,col:C.green},{v:39600,col:C.red},{v:14400,col:C.violet}];
const segM=[];

/* ═══ БЕЛЫЙ АКТ ═══ */
const WHT=new THREE.Group();S3.add(WHT);
let num40;const flyNotes=[];

/* ═══ АКТ «ПРИБАВКА» ═══ */
const RSE=new THREE.Group();S3.add(RSE);
let num5,num6,strike,arrow;const tower=[];

/* ═══ CTA ═══ */
const CTA3=new THREE.Group();S3.add(CTA3);
let plane=null;const trail=[];

const ACTS3={hook:HOOK,rec:REC,split:SPL,white:WHT,raise:RSE,cta:CTA3};

function build(){
  FONT=new Font(window.GOLOS_BLACK);
  const g0=tgeo('0',1,.1);DIGH=g0.boundingBox.max.y-g0.boundingBox.min.y;
  const pm=new THREE.PMREMGenerator(RD);S3.environment=pm.fromScene(new RoomEnvironment(),.04).texture;S3.environmentIntensity=.35;pm.dispose();

  /* хук */
  num1=Num3D(HOOK,{digitPx:96,col:C.green});num1.set('80 000 ₽');num1.grp.position.set(X0,sy(690),0);
  num2=Num3D(HOOK,{digitPx:96,col:C.red});num2.set('80 000 ₽');num2.grp.position.set(X0,sy(1020),0);
  HOOKM=num1.mats.concat(num2.mats);bar1.concat(bar2).forEach(m=>HOOKM.push(...m.material));

  /* монета: золото, ребро в насечку, ₽ на обеих сторонах */
  const rimT=ctex(512,32,(c,x)=>{for(let i=0;i<512;i+=8){x.fillStyle='#F6D27A';x.fillRect(i,0,4,32);x.fillStyle='#9C6A1C';x.fillRect(i+4,0,4,32);}},true);
  rimT.wrapS=THREE.RepeatWrapping;
  const gold=new THREE.MeshPhysicalMaterial({color:C.gold,metalness:1,roughness:.22,clearcoat:.6});
  const rim=new THREE.MeshStandardMaterial({map:rimT,metalness:1,roughness:.3,color:0xffffff});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.16,96,1),[rim,gold,gold]);body.rotation.x=Math.PI/2;COIN.add(body);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.84,.035,12,96),gold);ring.position.z=.08;COIN.add(ring);
  const ring2=ring.clone();ring2.position.z=-.08;COIN.add(ring2);
  const rs=tgeo('₽',1.05,.07),rb=rs.boundingBox;
  for(const sg of [1,-1]){const m=new THREE.Mesh(rs,new THREE.MeshPhysicalMaterial({color:'#FFE3A0',metalness:1,roughness:.15}));
    m.position.set(-(rb.min.x+rb.max.x)/2*sg,-(rb.min.y+rb.max.y)/2,.08*sg);if(sg<0)m.rotation.y=Math.PI;COIN.add(m);}

  /* монетки строк */
  for(let i=0;i<22;i++){const m=new THREE.Mesh(CGEO,new THREE.MeshPhysicalMaterial({color:C.gold,metalness:.9,roughness:.25,clearcoat:.5}));
    m.visible=false;REC.add(m);CP.push(m);}

  /* монитор */
  const frameM=new THREE.MeshPhysicalMaterial({color:C.violet,roughness:.3,clearcoat:1,emissive:new THREE.Color(C.violetD).multiplyScalar(.4)});
  const scrT=ctex(320,200,(c,x)=>{const gr=x.createLinearGradient(0,0,320,200);gr.addColorStop(0,'#1B2A6B');gr.addColorStop(1,'#3E338F');x.fillStyle=gr;x.fillRect(0,0,320,200);
    const hs=[60,95,80,130,150];hs.forEach((h,i)=>{x.fillStyle=[C.teal,C.sky,C.pink,C.amber,C.green][i];x.fillRect(34+i*54,180-h,36,h);});});
  const fr=new THREE.Mesh(new RoundedBoxGeometry(1.25,.82,.1,3,.05),frameM);MON.add(fr);
  const sc=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.68),new THREE.MeshBasicMaterial({map:scrT}));sc.position.z=.052;MON.add(sc);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.38,16),frameM);st.position.y=-.58;MON.add(st);
  const bs_=new THREE.Mesh(new RoundedBoxGeometry(.6,.06,.34,2,.02),frameM);bs_.position.y=-.78;MON.add(bs_);
  MON.visible=false;

  num3=Num3D(REC,{digitPx:118,depthU:.32,col:C.red});num3.set('134 000 ₽');

  /* бублик: сектора кольца с фаской */
  let a=2.80;const sum=SEGS.reduce((s,d)=>s+d.v,0),R1=1.28,R0=.72,gap=.045;
  SEGS.forEach((d,i)=>{const da=2*Math.PI*d.v/sum,a0=a-gap/2,a1=a-da+gap/2;a-=da;
    const sh=new THREE.Shape();sh.absarc(0,0,R1,a0,a1,true);sh.absarc(0,0,R0,a1,a0,false);sh.closePath();
    const ge=new THREE.ExtrudeGeometry(sh,{depth:.42,bevelEnabled:true,bevelThickness:.07,bevelSize:.05,bevelSegments:3,curveSegments:56});
    ge.translate(0,0,-.21);const mats=mNum(d.col,1);const m=new THREE.Mesh(ge,mats);
    const mid=(a0+a1)/2;m.userData={mid,mats};DON.add(m);segM.push(m);});
  DON.position.set(.35,sy(1014),0);

  /* белый акт */
  num40=Num3D(WHT,{digitPx:290,depthU:.7,col:C.red});num40.set('40%');num40.grp.position.set(sx(52),sy(860),0);
  for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.9,.42,.012),new THREE.MeshStandardMaterial({map:NOTE_G,roughness:.6,emissive:0xffffff,emissiveMap:NOTE_G,emissiveIntensity:.2}));
    m.userData={x:lerp(-7,7,rnd(i*3.7)),z:lerp(-6,-3,rnd(i*5.3)),y0:lerp(-6.4,-4.4,rnd(i*2.1)),sp:.35+rnd(i*1.9)*.3,r:rnd(i*7.7)*6.28};WHT.add(m);flyNotes.push(m);}

  /* прибавка */
  num5=Num3D(RSE,{digitPx:96,col:C.ink});num5.set('+ ?');num5.grp.position.set(X0,sy(690),0);
  num6=Num3D(RSE,{digitPx:96,col:C.green});num6.set('+10 000 ₽');num6.grp.position.set(X0,sy(1020),0);
  const sgeo=new RoundedBoxGeometry(1,.1,.1,2,.04);sgeo.translate(.5,0,0);
  strike=new THREE.Mesh(sgeo,mNum(C.red,1)[0]);num5.grp.add(strike);
  const ash=new THREE.Shape();ash.moveTo(-.07,0);ash.lineTo(.07,0);ash.lineTo(.07,-.55);ash.lineTo(.2,-.55);ash.lineTo(0,-.8);ash.lineTo(-.2,-.55);ash.lineTo(-.07,-.55);ash.closePath();
  arrow=new THREE.Mesh(new THREE.ExtrudeGeometry(ash,{depth:.12,bevelEnabled:true,bevelThickness:.03,bevelSize:.02,bevelSegments:2}),mNum(C.green,1.2));
  arrow.position.set(X0+.18,sy(712),0);RSE.add(arrow);
  const tg=new THREE.CylinderGeometry(.36,.36,.075,64);
  for(let i=0;i<15;i++){const m=new THREE.Mesh(tg,[new THREE.MeshStandardMaterial({map:rimT,metalness:1,roughness:.3}),
    new THREE.MeshPhysicalMaterial({color:C.gold,metalness:1,roughness:.22,clearcoat:.5}),new THREE.MeshPhysicalMaterial({color:C.gold,metalness:1,roughness:.22})]);
    m.visible=false;RSE.add(m);tower.push(m);}

  /* бумажный самолётик */
  const pg=new THREE.BufferGeometry();
  const P=[0,0,1.1, -.95,.02,-.55, 0,.02,-.35,   0,0,1.1, 0,.02,-.35, .95,.02,-.55,   0,0,1.1, 0,-.32,-.45, 0,.02,-.35];
  pg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));pg.computeVertexNormals();
  plane=new THREE.Mesh(pg,new THREE.MeshPhysicalMaterial({color:'#7FE0EC',roughness:.35,side:THREE.DoubleSide,clearcoat:.6,emissive:new THREE.Color(C.teal).multiplyScalar(.35)}));
  const pl=new THREE.Group();pl.add(plane);CTA3.add(pl);plane=pl;
  for(let i=0;i<36;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:new THREE.Color(i%3?C.teal:'#ffffff'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    CTA3.add(s);trail.push(s);}
}

/* ═══ КАМЕРА ═══ */
function camBase(t,tx=0,ty=0,z=CZ){
  /* ровный дрейф: мир никогда не стоит (норма приёмки), глазом не читается */
  const dx=.32*tri(t,23),dy=.18*tri(t+5,31);
  CAM.position.set(tx+dx,ty+dy+.25,z);CAM.lookAt(tx+dx*.35,ty+dy*.35,0);CAM.updateMatrixWorld();
}

/* ═══ АКТЫ: каждый ставит свою сцену на момент t ═══ */
function hideAll(){for(const k in ACTS3)ACTS3[k].visible=false;COIN.visible=false;}

function actHook(t){
  studio('hook',t,1-.6*P_(t,HK_LAB2,1.2),.35+.65*ent(t,HK_LAB2,1.2));
  HOOK.visible=true;
  camBase(t,0,0,lerp(16.9,CZ,E.out(P_(t,0,1.6))));
  const gone=mov(t,COIN0,.35);HOOK.position.set(0,0,-1.6*gone);HOOK.visible=gone<.97;
  const keep=1-gone;HOOKM.forEach(m=>{m.opacity=keep;m.transparent=keep<.999;});
  /* второе число набегает с 80 000 до 134 000 */
  const v=cnt(t,HK_CNT,HK_CD,80000,134000);num2.set(rub(v));
  const sp=1+.05*Math.sin(Math.PI*P_(t,HK_CNT,HK_CD));num2.grp.scale.setScalar(sp);
  /* пачки сверх ваших восьмидесяти падают по мере счёта, каскадом */
  extra.forEach((m,k)=>{const thr=k<5?(90000+k*10000):134000,on=HK_CNT+HK_CD*(thr-80000)/54000-.35;
    const p=ent(t,on,.45),sp_=spring(t,on,.6,.15);
    m.visible=t>on-.01;if(m.userData.bx===undefined)m.userData.bx=m.position.x;
    /* выезжает из конца полосы — точка роста у источника, сквозь число не проходит */
    m.position.x=m.userData.bx-(1-sp_)*PITCH*.85;m.position.y=ROW2Y;
    const s=lerp(.88,1,p);m.scale.set(k===5?.4*s:s,s,s);
    m.material.forEach(mm=>{mm.opacity=p*keep;mm.transparent=mm.opacity<.999;});
    /* доля государства: четыре пачки загораются и выходят вперёд */
    const lit=k<4?ent(t,HK_40+k*STAG,.5):0;
    m.position.z=lit*.32;m.position.y+=lit*.07;
    m.material.forEach(mm=>{mm.emissiveIntensity=(mm.map===NOTE_R?.13:.08)+lit*.4;});
    /* остаток — место и техника — гаснет в фиолетовый */
    if(k>=4){const vp=ent(t,HK_CHIP+.2,.6);m.material.forEach(mm=>mm.color.set(mixc('#ffffff','#9C90F0',vp)));}
  });
  /* лёгкое покачивание пачек — живые, но не прыгают */
  bar1.concat(bar2).forEach((m,i)=>{m.rotation.y=.05*Math.sin(t*.8+i*.4);});
  /* цифры чуть поворачиваются за камерой — видна толщина */
  num1.grp.rotation.y=num2.grp.rotation.y=.10*Math.sin(t*.35)+.06;
}

function coinAt(t){
  if(t<COIN0+.36||t>X1+.3){COIN.visible=false;return;}
  COIN.visible=true;
  /* поднимается из доли государства, встаёт перед камерой и летит в неё */
  const src=new V3(0,-.6,1.2);
  const up=ent(t,COIN0+.36,.6),fly=mov(t,COIN1,X1+.3-COIN1);
  const mid=new V3(0,.2,3);
  const p=src.clone().lerp(mid,up);
  p.lerp(new V3(CAM.position.x,CAM.position.y-.05,CAM.position.z+.6),fly);
  COIN.position.copy(p);
  const s=lerp(.35,1.0,up);COIN.scale.setScalar(s);
  /* крутится, а перед камерой доворачивается лицом — кадр закрывает плашмя */
  const SPIN=4.2,s1=(COIN1-COIN0)*SPIN,tgt=Math.ceil((s1+1.2)/(2*Math.PI))*2*Math.PI;
  const ry=t<COIN1?(t-COIN0)*SPIN:lerp(s1,tgt,E.out(P_(t,COIN1,X1-COIN1-.05)));
  COIN.rotation.set(.25*(1-fly),ry,.15*Math.sin(t*3)*(1-fly));
}

/* лента чека: перерисовать текстуру на момент t */
function rowState(t){
  const ins=mov(t,T_NDFL,.6);
  const S={ruk:{slot:0,on:T_RUK},nach:{slot:1+ins,on:T_NACH},ndfl:{slot:1,on:T_NDFL+.5},vz:{slot:3,on:T_VZ},itog:{slot:4,on:T_ITOG},mest:{slot:5,on:T_MEST}};
  const V={ruk:rub(80000),nach:rub(cnt(t,T_NACHV,.55,80000,92000)),
    ndfl:t<T_NDFV?'+ ?':'+'+rub(cnt(t,T_NDFV,.5,0,12000)),
    vz:t<T_VZV?'+ ?':'+'+rub(cnt(t,T_VZV,.55,0,27600)),
    itog:rub(cnt(t,T_ITOG+.1,.45,92000,119600)),
    mest:t<T_MESV?'+ ?':'+'+rub(cnt(t,T_MESV,.45,0,14400))};
  return {S,V,ins};
}
function drawReceipt(t){
  const x=RCG,{S,V,ins}=rowState(t);
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,TW,TH);
  const ps=ROWS.map(r=>ent(t,S[r.k].on,.5));
  const rows=ps[0]+ps[2]+ins+ps[3]+ps[4]+ps[5];
  const L=HEAD+Math.max(.6,rows)*RH+26;
  /* бумага с зубчатым краем */
  x.beginPath();x.moveTo(0,0);x.lineTo(TW,0);x.lineTo(TW,L);
  for(let i=TW;i>0;i-=50){x.lineTo(i-25,L+22);x.lineTo(i-50,L);}
  x.closePath();
  const gr=x.createLinearGradient(0,0,0,L);gr.addColorStop(0,C.paper2);gr.addColorStop(1,C.paper);x.fillStyle=gr;x.fill();
  x.save();x.clip();
  /* волокно бумаги */
  if(!RGRP)RGRP=x.createPattern(GR,'repeat');x.globalAlpha=.05;x.fillStyle=RGRP;x.fillRect(0,0,TW,TH);x.globalAlpha=1;
  x.textBaseline='alphabetic';x.textAlign='left';
  x.letterSpacing='5px';x.font=F(500,30);x.fillStyle=C.dim;x.fillText('ЧЕК · ВАША ЦЕНА ДЛЯ РАБОТОДАТЕЛЯ',50,76);x.letterSpacing='0px';
  x.setLineDash([10,10]);x.strokeStyle='rgba(255,255,255,.16)';x.lineWidth=3;x.beginPath();x.moveTo(50,112);x.lineTo(TW-50,112);x.stroke();
  ROWS.forEach((r,i)=>{const p=ps[i];if(p<=.001)return;
    const st=S[r.k],y=HEAD+st.slot*RH;
    let dx=lerp(-34,0,p),sc=1;
    if(r.k==='ndfl'){dx=lerp(-50,0,ins);}
    x.save();x.globalAlpha=p;if(p<.995)x.filter=`blur(${((1-p)*7).toFixed(1)}px)`;x.translate(dx,0);
    if(BOXES&&p>.3)BOXES.push({k:'строка чека',n:r.lab,x0:10000+50+dx,y0:10000+y+16,x1:10000+TW-50+dx,y1:10000+y+RH-16});
    /* вспышка строки: цвет строки, гаснет ровно за 0,9 с */
    const fl=1-P_(t,st.on+.15,.9);if(fl>0&&fl<1&&r.col!==C.ink){x.fillStyle=rgba(r.col,.20*fl);x.fillRect(24,y+6,TW-48,RH-12);}
    if(r.kind==='sub'){x.setLineDash([10,10]);x.strokeStyle='rgba(255,255,255,.16)';x.beginPath();x.moveTo(50,y+4);x.lineTo(TW-50,y+4);x.stroke();
      x.letterSpacing='5px';x.font=F(600,32);x.fillStyle=C.dim;x.fillText(r.lab,50,y+74);x.letterSpacing='0px';}
    else{x.font=F(500,46);x.fillStyle='#D5DBF5';x.fillText(r.lab,50,y+78);}
    x.textAlign='right';x.font=F(900,72);x.fillStyle=r.col;x.fillText(V[r.k],TW-50,y+86);x.textAlign='left';
    x.restore();
  });
  x.restore();
  RTEX.needsUpdate=true;
  return {L,S};
}
function actRec(t){
  const tot=mov(t,TOT-.05,.35);
  studio(t<TOT?'rec':'tot',t,1,1);
  REC.visible=true;
  const {L,S}=drawReceipt(t);
  const Lu=L*TU;PL=L;
  /* лента: дышит волной и закручивается у нижнего края к зрителю */
  const pa=PGEO.attributes.position.array;
  for(let i=0;i<pa.length;i+=3){const y=PBASE[i+1],d=-y,x=PBASE[i];
    const curl=Math.max(0,d-(Lu-1.1));
    pa[i+2]=.045*Math.sin(1.6*d+1.2*t+x*.7)+.30*curl*curl;}
  PGEO.attributes.position.needsUpdate=true;PGEO.computeVertexNormals();
  PGRP.rotation.set(-.07,.09*Math.sin(t*.27)+.04,.012*Math.sin(t*.4));
  /* под итогом лента уходит назад и гаснет, но не пропадает */
  PGRP.position.set(0,PTOP+lerp(0,.6,tot),lerp(0,-4.5,tot));
  PGRP.updateMatrixWorld(true);
  PMAT.emissiveIntensity=lerp(.62,.06,tot);PMAT.color.setScalar(lerp(1,.25,tot));PMAT.opacity=lerp(1,0,tot)*ent(t,X1+.2,.45);PAPER.visible=tot<.995&&PMAT.opacity>.001;
  /* камера идёт вниз за удлиняющейся лентой */
  const ty=-.12*Math.max(0,Lu-2.0)*(1-tot);
  camBase(t,0,ty,lerp(CZ+.8,CZ,ent(t,X1,1.2)));

  /* монетки: налог — коралловые, взносы — янтарные; вылетают из строки
     вправо-вверх, туда, где «государство» за кадром */
  const bursts=[{t0:T_NDFV+.05,n:7,col:C.red,row:'ndfl'},{t0:T_VZV+.05,n:7,col:C.amber,row:'vz'},{t0:T_MESV+.05,n:7,col:C.violet,row:'mest'}];
  let ci=0;
  bursts.forEach((b,bi)=>{const y=-(HEAD+S[b.row].slot*RH+RH*.55)*TU;
    for(let j=0;j<b.n;j++,ci++){const m=CP[ci];const s0=b.t0+j*.06,u=P_(t,s0,1.25);
      if(u<=0||u>=1){m.visible=false;continue;}
      m.visible=true;m.material.color.set(b.col);
      const st=new V3(PW/2+.25,y,.15);PGRP.localToWorld(st);
      const ang=lerp(-.35,.55,rnd(ci*3.1)),sp=lerp(2.2,3.6,rnd(ci*5.7));
      const pop=E.out(cl(u*2.2)),fly=E.move(cl((u-.25)/.75));
      m.position.set(st.x+Math.cos(ang)*.45*pop+fly*(3.5+sp),st.y+Math.sin(ang)*.45*pop+fly*(.25+sp*.12),st.z+.3*pop+fly*.6);
      m.rotation.set(t*7+j,t*5+j*2,0);m.scale.setScalar(lerp(.9,1,pop));}});
  for(;ci<CP.length;ci++)CP[ci].visible=false;

  /* монитор вырастает из строки «место и техника» */
  const mp=0,ms=0;
  MON.visible=false;
  if(MON.visible){const y=-(HEAD+S.mest.slot*RH+RH*.5)*TU;const st=new V3(PW/2-.6,y,.2);PGRP.localToWorld(st);
    MON.position.set(st.x+lerp(0,.55,ms),st.y+lerp(0,.95,ms),st.z+.6);
    MON.scale.setScalar(lerp(.85,1,ms)*(1-tot*.5));MON.rotation.set(.05,-.35+.08*Math.sin(t*.9),.04*Math.sin(t*.7));
    MON.children.forEach(c=>{if(c.material){c.material.transparent=mp<.999;c.material.opacity=mp*(1-tot);}});}

  /* итог: объёмное 134 000, садится на пружине */
  const np=ent(t,TOT+.3,.5),ns=spring(t,TOT+.3,.8,.2);
  num3.grp.visible=np>0;
  if(num3.grp.visible){num3.set(rub(cnt(t,TOT,.6,119600,134000)));
    num3.grp.position.set(X0,sy(850)+lerp(-.5,0,ns),.6);num3.grp.scale.setScalar(lerp(.9,1,ns));
    num3.grp.rotation.y=.08*Math.sin(t*.4)+.05;setOp(num3.mats,np);}
}

function actSplit(t){
  studio('split',t,.6+.4*ent(t,SP_A,.6),.4+.6*ent(t,SP_B,.6));
  SPL.visible=true;camBase(t,0,0,CZ);
  DON.rotation.set(-.62+.03*Math.sin(t*.5),.08*Math.sin(t*.33),.10*tri(t,17));
  segM.forEach((m,i)=>{const on=SP_IN+i*STAG*1.4,p=ent(t,on,.55),s=spring(t,on,.75,.15);
    const lift=i===0?ent(t,SP_A,.5)*(1-ent(t,SP_B,.5)*.6):0,out=i===1?ent(t,SP_B,.55):0;
    const r=out*.26+lift*.04;
    m.position.set(Math.cos(m.userData.mid)*r,Math.sin(m.userData.mid)*r+(1-s)*.9,lift*.25+out*.2);
    m.scale.setScalar(lerp(.88,1,p));setOp(m.userData.mats,p);
    m.userData.mats[0].emissiveIntensity=1;
    const glow=i===0?lift:i===1?out:0;m.userData.mats[0].emissive.set(m.userData.mats[0].color).multiplyScalar(.06+.22*glow);});
}

function actWhite(t){
  studio('white',t,1,1);WHT.visible=true;camBase(t,0,0,CZ);
  const p=ent(t,X3+.05,.6),s=spring(t,X3+.05,.85,.2);
  num40.grp.position.set(sx(52),sy(860)+lerp(-.5,0,s),0);num40.grp.scale.setScalar(lerp(.86,1,s));
  num40.grp.rotation.set(.04*Math.sin(t*.6),.12*Math.sin(t*.4)+.08,0);setOp(num40.mats,p);
  /* купюры уплывают вверх — мимо рук, ровно и медленно */
  flyNotes.forEach((m,i)=>{const d=m.userData,x=((d.x+(t-X3)*d.sp*.8+8)%16)-8;
    m.position.set(x,d.y0+Math.sin(t*.7+i)*.12,d.z);m.rotation.set(d.r+t*.4*d.sp,d.r*.5+t*.3,d.r+t*.2);
    m.material.transparent=true;m.material.opacity=p*.85;});
}

function actRaise(t){
  studio('raise',t,.5+.5*ent(t,RS_V2,.6),.7);RSE.visible=true;camBase(t,0,0,CZ);
  /* «вы просите» */
  const p5=ent(t,X4+.1,.5);
  num5.set(t<RS_V1?'+ ?':'+'+rub(cnt(t,RS_V1,.4,0,10000)));
  const st=ent(t,RS_STR,.45),dim=mov(t,RS_STR+.3,.6);
  num5.grp.position.set(X0,sy(690)+lerp(-.3,0,p5),lerp(0,-.5,dim));
  num5.grp.rotation.set(lerp(0,-.28,dim),.06+.06*Math.sin(t*.4),0);
  tintNum(num5.mats,mixc('#FFFFFF','#59607E',dim));setOp(num5.mats,p5);
  /* вычёркивание: линия рисуется слева направо */
  strike.visible=st>0;
  strike.position.set(-.12,DIGH*num5.size*.46,.22);
  strike.scale.set(Math.max(.02,st)*(num5.w+.24),1,1);strike.rotation.z=.045;
  /* стрелка растёт от первого числа ко второму */
  const ap=ent(t,RS_ARR,.5);arrow.visible=ap>0;arrow.scale.set(1,lerp(.15,.82,ap),1);setOp(arrow.material,ap);
  arrow.position.set(X0+.2,sy(748),0);
  /* «а на самом деле» */
  const p6=ent(t,RS_ARR+.12,.5),s6=spring(t,RS_V2,.8,.2);
  num6.set('+'+rub(cnt(t,RS_V2,.65,10000,14900)));
  num6.grp.position.set(X0,sy(1020)+lerp(-.3,0,p6),0);num6.grp.scale.setScalar(t<RS_V2?lerp(.92,1,p6):lerp(.94,1,s6));
  num6.grp.rotation.y=.06+.06*Math.sin(t*.4+1);setOp(num6.mats,p6);num6.grp.visible=p6>0;
  /* стопка монет: десять на «десять тысяч», ещё пять на «пятнадцать» */
  const base=new V3(sx(915),sy(1100),0);
  tower.forEach((m,i)=>{const on=i<10?RS_V1+.05+i*.045:RS_V2+.05+(i-10)*.11,p=ent(t,on,.4),s=spring(t,on,.55,.18);
    m.visible=p>0;m.position.set(base.x+.03*Math.sin(i*1.7),base.y+i*.078+.04+(1-s)*1.2,base.z+.03*Math.cos(i*2.3));
    m.rotation.set(.03*Math.sin(i),t*.25+i*.3,.03*Math.cos(i*1.3));m.scale.setScalar(lerp(.9,1,p));
    m.material.forEach(mm=>{mm.transparent=p<.999;mm.opacity=p;});
    if(i>=10){const c=mixc(C.gold,'#7BE3B6',.5*(1-P_(t,on+.3,.8)));m.material[1].color.set(c);}});
}

function actCta(t){
  studio('cta',t,1,1);CTA3.visible=true;camBase(t,0,0,CZ);iconPos();
  /* самолётик прилетает по дуге и садится на место значка */
  const u=mov(t,CT+.02,1.0);
  const end=new V3(sx(ICON.x),sy(ICON.y),0);
  const pts=[new V3(-8,-7,6),new V3(-5.5,-1.5,5.5),new V3(-4,2.2,3.5),new V3(end.x-1.3,end.y+.25,1.2),end];
  const curve=new THREE.CatmullRomCurve3(pts);
  const p=curve.getPointAt(u),tg=curve.getTangentAt(Math.min(.999,u));
  const bob=u>=1?.06*Math.sin((t-CT-1.02)*2.4):0;
  plane.position.set(p.x,p.y+bob,p.z);
  const look=p.clone().add(tg);plane.lookAt(look);
  plane.rotateZ(lerp(-.9,0,u)+.08*Math.sin(t*2));
  const sc=lerp(1.1,.34,E.out(P_(t,CT,1.0)));plane.scale.setScalar(sc);
  if(u>=1){plane.rotation.set(-.15+.05*Math.sin(t*1.7),-.55+.06*Math.sin(t*1.3),.12);}
  trail.forEach((s,i)=>{const back=u-(i+1)*.018;const vis=back>0&&u<1.02;s.visible=vis;
    if(!vis)return;const q=curve.getPointAt(cl(back));s.position.copy(q);
    const k=1-i/trail.length;s.scale.setScalar(.25*k+.05);s.material.opacity=.8*k*(1-P_(t,CT+.9,.5));});
}

/* ═══ ПЛОСКИЙ СЛОЙ: подписи, титры, лента актов, профиль ═══ */
function T2(s,x,y,font,col,a=1,al='left',ls=0,bl=0){if(a<=.001||!s)return 0;g.save();g.globalAlpha*=a;g.font=font;g.fillStyle=col;g.textAlign=al;g.textBaseline='alphabetic';
  g.letterSpacing=ls+'px';if(bl>.2)g.filter=`blur(${bl.toFixed(1)}px)`;g.fillText(s,x,y);const w=g.measureText(s).width;
  if(BOXES&&g.globalAlpha>.3){const fs=+font.match(/(\d+)px/)[1],m=g.getTransform(),x0=al==='center'?x-w/2:al==='right'?x-w:x;
    const a_=m.transformPoint({x:x0,y:y-fs*.74}),b_=m.transformPoint({x:x0+w,y:y+fs*.2});BOXES.push({k:'текст',n:s,x0:a_.x,y0:a_.y,x1:b_.x,y1:b_.y});}
  g.restore();return w;}
function tw(s,font,ls=0){g.save();g.font=font;g.letterSpacing=ls+'px';const w=g.measureText(s).width;g.restore();return w;}
/* вход детали: подъём, расфокус снимается, без масштаба из нуля */
function rise(t,s,dy=26){const p=ent(t,s);return {a:p,y:(1-p)*dy,b:(1-p)*8};}
function Lb(s,x,y,col,t,on,size=30,w=500,ls=4.8){const r=rise(t,on,18);T2(s,x,y+r.y,F(w,size),col,r.a,'left',ls,r.b);}
function pill(x,y,w,h,fill,stroke,a=1){if(a<=0)return;g.save();g.globalAlpha*=a;
  if(BOXES&&g.globalAlpha>.3){const m=g.getTransform(),a_=m.transformPoint({x,y}),b_=m.transformPoint({x:x+w,y:y+h});BOXES.push({k:'плашка',n:'',x0:a_.x,y0:a_.y,x1:b_.x,y1:b_.y});}g.beginPath();g.roundRect(x,y,w,h,h/2);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}g.restore();}
function scrOf(obj,dx=0,dy=0,dz=0){const v=new V3(dx,dy,dz);obj.localToWorld(v);return scr(v);}
const exitA=(t,k)=>1-mov(t,swap(k)-fadeOut(k),fadeOut(k));

const CUES=[
 [-0.60,      'ВЫ ПОЛУЧАЕТЕ|ВОСЕМЬДЕСЯТ.|w'],
 [aw(2.12),   'ЗА ВАС ОТДАЮТ|СТО ТРИДЦАТЬ ЧЕТЫРЕ.|r'],
 [bs(2)+.02,  'ПОЧТИ СОРОК —|ГОСУДАРСТВУ.|r'],
 [bs(3),      'СМОТРИТЕ,|КАК ЭТО УСТРОЕНО.|w'],
 [bs(4),      'НАЧИСЛИТЬ НАДО|ДЕВЯНОСТО ДВЕ.|w'],
 [bs(5),      'НАЛОГ ИДЁТ|СВЕРХУ.|r'],
 [bs(6),      'ДВЕНАДЦАТЬ ТЫСЯЧ|ВЫ НЕ ВИДЕЛИ.|r'],
 [bs(7),      'ВЗНОСЫ —|ТРИДЦАТЬ ПРОЦЕНТОВ.|a'],
 [bs(8),      '|УЖЕ СТО ДВАДЦАТЬ.|w'],
 [bs(9),      'ПЛЮС МЕСТО|И ТЕХНИКА.|v'],
 [bs(10),     'СТО ТРИДЦАТЬ ЧЕТЫРЕ|ТЫСЯЧИ В МЕСЯЦ.|r'],
 [bs(11),     '|ВАМ — ВОСЕМЬДЕСЯТ.|g'],
 [SP_B,       'ГОСУДАРСТВУ —|ПОЧТИ СОРОК.|r'],
 [X3,         ''],
 [Math.max(bs(13),X4+.25),'ВЫВОД|ПРО ПОВЫШЕНИЕ.|w'],
 [bs(14),     '|ПРОСИТЕ НЕ ДЕСЯТЬ.|w'],
 [RS_ARR,     '|ПРОСИТЕ ПЯТНАДЦАТЬ.|g'],
 [bs(15),     '|СЧИТАЙТЕ КАК ОН.|w'],
 [CT,         '']
];
const CCOL={w:C.ink,r:C.red,g:C.green,a:C.amber,v:'#B3A8FF'};
const capFit={};
function fitCap(lines){const k=lines.join('|');if(capFit[k])return capFit[k];let s=76;while(s>48&&lines.some(l=>tw(l,F(900,s),-1)>960))s-=2;capFit[k]=s;return s;}
const onWhite=t=>P_(t,X3-XF/2,XF)*(1-P_(t,X4-XF/2,XF));
function drawCaption(t){
  let idx=-1;for(let i=0;i<CUES.length;i++)if(t>=CUES[i][0])idx=i;
  const wh=onWhite(t)>.5;
  const lines=s=>{if(!s)return null;const p=s.split('|');return {l:[p[0],p[1]].filter(x=>x),c:CCOL[p[2]]||C.ink,two:!!p[0]};};
  const st=idx>=0?CUES[idx][0]:0;
  if(idx>0&&CUES[idx-1][1]){const po=1-mov(t,st,.12);if(po>.001){const L=lines(CUES[idx-1][1]),s=fitCap(L.l);
    L.l.forEach((ln,i)=>T2(ln,60,258+s*.92+i*s*1.08-(1-po)*18,F(900,s),i===L.l.length-1?L.c:(wh?'#0B1026':C.ink),po,'left',-1,(1-po)*7));}}
  if(idx>=0&&CUES[idx][1]){const L=lines(CUES[idx][1]),s=fitCap(L.l);
    L.l.forEach((ln,i)=>{const s0=st+.11+i*.09,p=ent(t,s0,.45);
      T2(ln,60,258+s*.92+i*s*1.08+(1-p)*24,F(900,s),i===L.l.length-1?L.c:(wh?'#0B1026':C.ink),p,'left',-1,(1-p)*6);});}
}
const CHIPS=['вопрос','налог','взносы','место','итог','доля','прибавка','телеграм'];
const CHIP_AT=[0,X1,T_VZ,T_MEST,TOT,X2,X4,CT];
function drawRail(t){
  let k=0;CHIP_AT.forEach((a,i)=>{if(t>=a)k=i;});
  const prev=Math.max(0,k-1),p=k===0?1:ent(t,CHIP_AT[k]);
  const f=F(600,26),ws=CHIPS.map(c=>tw(c,f,.5)+44);const xs=[];let x=0;ws.forEach(w=>{xs.push(x);x+=w+12;});
  const ctr=i=>xs[i]+ws[i]/2,off=300-lerp(k>0?ctr(prev):ctr(0),ctr(k),k>0?p:1);
  const wh=onWhite(t)>.5,ra=1-mov(t,DUR-.6,.5);
  g.save();g.globalAlpha*=ra;const ga0=g.globalAlpha;
  const fade=g.createLinearGradient(0,0,W,0);
  CHIPS.forEach((c,i)=>{const X=off+xs[i];if(X+ws[i]<20||X>880)return;const on=i===k?p:(i===prev&&k>0?1-p:0);
    const edge=cl((X-30)/90)*cl((870-X-ws[i])/110);if(edge<=0)return;g.globalAlpha=ga0*edge;
    pill(X,176,ws[i],52,null,wh?'rgba(0,0,0,.14)':'rgba(255,255,255,.14)');
    if(on>0)pill(X,176,ws[i],52,mixc(C.teal,C.violet,(i%3)/4),null,on);
    T2(c,X+22,211,f,on>.5?'#07112A':(wh?'#5D647E':C.dim),1,'left',.5);});
  g.restore();
}
function drawFooter(t){
  const wh=onWhite(t)>.5;
  const fu=(t>=X1-.1&&t<CT+.1)?ent(t,X1-.1,.5)*(1-mov(t,CT-.2,.3)):0;
  T2('расчёт: 80 000 ₽ на руки · НДФЛ 13% · взносы 30% · 2026',60,1336,F(500,25),wh?'#8A90A8':C.dim2,fu,'left',1.2);
  const w=T2('ЛАНСКОЙ',60,1382,F(900,28),wh?'#0B1026':C.ink,1,'left',4.5);
  T2('· про деньги без воды',60+w+16,1382,F(500,25),wh?'#5D647E':C.dim,1,'left',1.2);
}

/* подписи к объёмным числам — крепятся к их проекции, едут вместе с камерой */
function hudHook(t){
  const a=exitA(t,3)*(1-ent(t,COIN0,.33));if(a<=0)return;
  g.save();g.globalAlpha=a;
  const p1=scrOf(num1.grp,0,num1.size*DIGH,0),p2=scrOf(num2.grp,0,num2.size*DIGH,0);
  T2('ВЫ ПОЛУЧАЕТЕ',p1[0],p1[1]-26,F(500,30),C.dim,1,'left',4.8);
  T2('ЗА ВАС ОТДАЮТ',p2[0],p2[1]-26,F(600,30),C.red,1,'left',4.8);
  /* плашка растёт из четырёх загоревшихся пачек: точка роста — у источника */
  const c=ent(t,HK_CHIP,.5);if(c>0){const q=scrOf(extra[3],BW/2,-BH/2,.32);const s='почти 40 000 — государству',f=F(600,34),w_=tw(s,f)+60;
    const xr=Math.min(1020,q[0]+8),x0=xr-w_,y0=q[1]+20+lerp(14,0,c);
    g.save();g.globalAlpha*=c;g.translate(xr,y0);g.scale(lerp(.92,1,c),lerp(.92,1,c));g.translate(-xr,-y0);
    pill(x0,y0,w_,66,rgba(C.red,.16),rgba(C.red,.5));T2(s,x0+30,y0+45,f,'#FF8A84',1,'left',0,(1-c)*6);g.restore();}
  g.restore();
}
function hudRec(t){
  if(t<TOT-.05)return;
  const a=1-mov(t,X2-fadeOut(10),fadeOut(10));if(a<=0)return;
  g.save();g.globalAlpha=a;
  const q=scrOf(num3.grp,0,num3.size*DIGH,0);
  Lb('ВАША ЦЕНА ДЛЯ РАБОТОДАТЕЛЯ',q[0],q[1]-30,C.dim,t,TOT+.3);
  const b=scrOf(num3.grp,0,0,0);
  Lb('в месяц — вместо 80 000',b[0],b[1]+76,C.ink,t,TOT+.6,46,500,0);
  const SRC=[['НДФЛ 13%','ст. 224 НК РФ'],['взносы 30%','п. 3 ст. 425 НК РФ']];
  SRC.forEach((s,i)=>{const r=rise(t,TOT_SRC+i*STAG,14);if(r.a<=0)return;const y=b[1]+150+i*48+r.y;
    const w1=T2(s[0],b[0],y,F(600,27),i?C.amber:C.red,r.a,'left',.5,r.b);
    g.save();g.globalAlpha*=r.a;g.fillStyle=C.dim2;g.fillRect(b[0]+w1+14,y-9,70,2);g.restore();
    T2(s[1],b[0]+w1+98,y,F(500,27),C.dim,r.a,'left',.5,r.b);});
  g.restore();
}
function hudSplit(t){
  if(t<X2-XF/2||t>X3+XF/2)return;
  const a=1-mov(t,X3-fadeOut(11),fadeOut(11));
  g.save();g.globalAlpha=a;
  Lb('ИЗ 134 000 ₽ В МЕСЯЦ',60,540,C.dim,t,X2+.05,28);
  Lb('ВАМ',60,610,C.green,t,SP_A-.12,32,600,3);
  const r=rise(t,SP_A-.12+STAG,24);T2(rub(80000),56,712+r.y,F(900,92),C.green,r.a,'left',-2,r.b);
  Lb('ГОСУДАРСТВУ',560,610,C.red,t,SP_B-.12,32,600,3);
  const r2=rise(t,SP_B-.12+STAG,24);T2(rub(cnt(t,SP_B-.02,.6,0,39600)),556,712+r2.y,F(900,92),C.red,r2.a,'left',-2,r2.b);
  /* подпись к фиолетовому сектору: выноска от самого сектора влево */
  const m=segM[2];if(m){const q=scrOf(m,Math.cos(m.userData.mid)*1.32,Math.sin(m.userData.mid)*1.32,.3);
    const lp=ent(t,SP_B+.5,.5);if(lp>0){const lx=120,ly=q[1]+120;g.save();g.globalAlpha*=lp;g.strokeStyle=rgba(C.violet,.85);g.lineWidth=3;
      g.beginPath();g.moveTo(q[0],q[1]);g.lineTo(lerp(q[0],lx+40,lp),lerp(q[1],ly-34,lp));g.stroke();g.restore();
      T2('место',60,ly+lerp(10,0,lp),F(600,30),'#B3A8FF',lp,'left',.5,(1-lp)*6);
      T2('и техника',60,ly+38+lerp(10,0,lp),F(600,30),'#B3A8FF',lp,'left',.5,(1-lp)*6);}}
  g.restore();
}
function hudWhite(t){
  if(t<X3||t>X4+XF/2)return;
  const a=1-mov(t,X4-.3,.3);g.save();g.globalAlpha=a;
  const r=rise(t,FL_TXT,30);
  ['вашей цены','вы никогда','не держали в руках'].forEach((s,i)=>{const q=rise(t,FL_TXT+i*STAG,30);T2(s,60,960+i*70+q.y,F(900,64),'#0B1026',q.a,'left',-.5,q.b);});
  const q=rise(t,FL_TXT+.45,14);T2('54 000 из 134 000 ₽',60,1210+q.y,F(500,32),'#6B7190',q.a,'left',0,q.b);
  g.restore();
}
function hudRaise(t){
  if(t<X4||t>X5+XF/2)return;
  const a=exitA(t,15);g.save();g.globalAlpha=a;
  const p1=scrOf(num5.grp,0,num5.size*DIGH,0),p2=scrOf(num6.grp,0,num6.size*DIGH,0);
  Lb('ВЫ ПРОСИТЕ',p1[0],p1[1]-26,C.dim,t,X4+.08);
  Lb('А НА САМОМ ДЕЛЕ',p2[0],p2[1]-26,C.green,t,RS_ARR+.1,30,600);
  /* кнопка пересылки: адресная, нажимается на «считайте» (отклик 0,97) */
  const sp=ent(t,RS_SH,.5);if(sp>0){
    const press=t<RS_TAP?0:t<RS_TAP+.12?E.out(P_(t,RS_TAP,.12)):1-E.out(P_(t,RS_TAP+.12,.2));
    const s=lerp(1,.96,press),bx=60,by=1160+lerp(18,0,sp),bw=tw('↗ переслать',F(600,32))+60;
    g.save();g.globalAlpha*=sp;g.translate(bx+bw/2,by+34);g.scale(s,s);g.translate(-(bx+bw/2),-(by+34));
    pill(bx,by,bw,68,rgba(C.teal,.12+.25*press),C.teal);T2('↗ переслать',bx+30,by+46,F(600,32),C.teal,1);g.restore();
    T2('тому, кто идёт за прибавкой',bx+bw+20,by+44,F(500,28),C.dim,sp,'left',0,(1-sp)*6);
    /* круг отклика от пальца */
    const rp=P_(t,RS_TAP,.6);if(rp>0&&rp<1){g.save();g.globalAlpha*=sp*(1-rp)*.7;g.strokeStyle=C.teal;g.lineWidth=4;g.beginPath();g.arc(bx+bw*.55,by+34,lerp(20,120,E.out(rp)),0,6.283);g.stroke();g.restore();}}
  g.restore();
}
const ICON={x:0,y:380};
function iconPos(){const tw1=tw('TELEGRAM',F(900,68),.7);ICON.x=540-(116+24+tw1)/2+58;}
const PLANE2D=new Path2D('M21.5 3.2 2.6 10.5c-.9.35-.88 1.63.03 1.95l4.7 1.63 1.8 5.4c.28.85 1.4 1.03 1.94.32l2.5-3.28 4.85 3.56c.6.44 1.46.12 1.62-.61l3.2-14.8c.17-.8-.62-1.47-1.74-1.47z');
function hudCta(t){
  if(t<CT-.05)return;
  const f=F(900,68),tw1=tw('TELEGRAM',f,.7),rw=116+24+tw1,x0=540-rw/2;ICON.x=x0+58;ICON.y=380;
  /* кружок значка появляется, когда садится самолётик */
  const ip=ent(t,CT+.9,.4);if(ip>0){g.save();g.globalAlpha=ip;g.translate(ICON.x,ICON.y);g.scale(lerp(.9,1,ip),lerp(.9,1,ip));
    g.beginPath();g.arc(0,0,58,0,6.283);g.lineWidth=4;g.strokeStyle=rgba(C.teal,.9);g.stroke();g.restore();}
  const r=rise(t,CT+.15,18);T2('TELEGRAM',x0+140,404+r.y,f,C.ink,r.a,'left',.7,r.b);
  const r2=rise(t,CT+.3,18);T2('ССЫЛКА В ПРОФИЛЕ',540,500+r2.y,F(900,64),C.green,r2.a,'center',0,r2.b);
  /* карточка профиля */
  const cp=ent(t,CT+.42,.55),PC={x:100,y:560,w:880,h:600};
  if(cp>0){g.save();g.globalAlpha=cp;g.translate(540,PC.y);g.scale(lerp(.95,1,cp),lerp(.95,1,cp));g.translate(-540,-PC.y+lerp(30,0,cp));
    const gr=g.createLinearGradient(0,PC.y,0,PC.y+PC.h);gr.addColorStop(0,'rgba(36,46,104,.92)');gr.addColorStop(1,'rgba(20,24,60,.92)');
    g.beginPath();g.roundRect(PC.x,PC.y,PC.w,PC.h,40);g.fillStyle=gr;g.fill();g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=2;g.stroke();
    const hp=ent(t,CT+.6,.45);
    g.globalAlpha=cp*hp;const av=g.createLinearGradient(140,600,260,720);av.addColorStop(0,C.teal);av.addColorStop(1,C.violet);
    g.beginPath();g.arc(200,660,60,0,6.283);g.fillStyle=av;g.fill();
    T2('ЕЛ',200,677,F(900,46),'#0B1026',1,'center',1);
    T2('Егор Ланской',290,652,F(900,44),C.ink,1);T2('@lanskoy',290,700,F(500,32),C.dim,1);
    let px_=140;['разборы','цифры','без воды'].forEach((s,i)=>{const pp=ent(t,CT+.8+i*STAG,.4);const w_=tw(s,F(600,30))+48;
      g.globalAlpha=cp*pp;pill(px_,750+lerp(10,0,pp),w_,56,[rgba(C.teal,.18),rgba(C.amber,.18),rgba(C.pink,.18)][i],[C.teal,C.amber,C.pink][i]);
      T2(s,px_+24,788+lerp(10,0,pp),F(600,30),[C.teal,C.amber,C.pink][i],1);px_+=w_+14;});
    const dp=ent(t,CT+1.1,.45);g.globalAlpha=cp*dp;
    T2('полный расчёт этого ролика:',140,872,F(500,32),'#C2C8E6',1);T2('НДФЛ, взносы, место — по строкам',140,916,F(500,32),'#C2C8E6',1);
    const lp=ent(t,CT+1.3,.45);g.globalAlpha=cp*lp;pill(140,950,300,58,rgba(C.teal,.15),null);T2('t.me/lanskoy',170,990,F(600,32),C.teal,1);
    const bp=ent(t,CT+1.5,.45),bs2=spring(t,CT+1.5,.6,.15);g.globalAlpha=cp*bp;
    g.save();g.translate(140,1040);g.scale(lerp(.94,1,bs2),lerp(.94,1,bs2));pill(0,0,290,76,null,C.green);T2('подписаться',145,49,F(600,34),C.green,1,'center');g.restore();
    pill(450,1040,250,76,null,'rgba(255,255,255,.3)');T2('открыть',575,1089,F(600,34),C.ink,1,'center');
    g.restore();}
  /* таблетка адреса */
  const pp=ent(t,CT+1.8,.5),ps=spring(t,CT+1.8,.7,.2);if(pp>0){const s='T.ME/LANSKOY',f2=F(900,44),w_=tw(s,f2,1)+120;
    g.save();g.globalAlpha=pp;g.translate(540,1250);g.scale(lerp(.9,1,ps),lerp(.9,1,ps));
    pill(-w_/2,-46,w_,92,C.green,null);g.save();g.translate(-w_/2+34,-18);g.scale(1.5,1.5);g.fillStyle='#0B1026';g.fill(PLANE2D);g.restore();
    T2(s,-w_/2+90,16,f2,'#0B1026',1,'left',1);g.restore();}
}

/* ═══ ЗВУК: реплики из тех же якорей, сводит mixsfx.py ═══ */
window.SFX=[
  {t:HK_CNT,   d:HK_CD, s:'count', m:'onset'},   // 80 → 134
  {t:HK_CHIP,           s:'land'},               // «государству»
  {t:X1,                s:'flash'},              // монета: хук → чек
  {t:T_NDFL,            s:'row'},                // налог въезжает сверху
  {t:T_NDFV,  d:.50,    s:'count', m:'onset'},   // 12 000
  {t:T_VZV,   d:.55,    s:'count', m:'onset'},   // 27 600
  {t:T_ITOG,            s:'row'},                // итого встало
  {t:T_MESV,            s:'land'},               // монитор встал
  {t:TOT,               s:'hero', a:true},       // сто тридцать четыре
  {t:SP_B,              s:'land'},               // сектор государства вышел
  {t:X3,                s:'flash'},              // белый акт
  {t:RS_STR,            s:'click'},              // вычеркнули десять
  {t:RS_V2+.55,         s:'bounce'},             // пятнадцать встало
  {t:CT,                s:'click'},              // CTA
  {t:CT+1.84,           s:'land'}                // адрес канала встал
];

/* ═══ КАДР ═══ */
const ACTL=[['hook',0,X1,actHook],['rec',X1,X2,actRec],['split',X2,X3,actSplit],['white',X3,X4,actWhite],['raise',X4,X5,actRaise],['cta',X5,1e9,actCta]];
function render3(t,ai){hideAll();ACTL[ai][3](t);coinAt(t);if(BOXMODE){S3.updateMatrixWorld(true);CAM.updateMatrixWorld();if(BOXES)boxes3(ai);}else COMP.render();}
function glow(src,dst){/* мягкое свечение светлых мест 3D-слоя */
  B1g.globalCompositeOperation='copy';B1g.filter='brightness(.7) contrast(3) blur(3px)';B1g.drawImage(src,0,0,270,480);B1g.filter='none';
  B2g.globalCompositeOperation='copy';B2g.filter='blur(6px)';B2g.drawImage(B1,0,0,135,240);B2g.filter='none';
  dst.save();dst.globalCompositeOperation='lighter';dst.globalAlpha=.2;dst.drawImage(B1,0,0,W,H);dst.globalAlpha=.24;dst.drawImage(B2,0,0,W,H);dst.restore();}
function frame(t){
  g=AG;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';
  let ai=0;ACTL.forEach((a,i)=>{if(t>=a[1])ai=i;});
  /* наплыв между актами с расфокусом: два состояния читаются как одно превращение */
  const b=ai>0&&ai!==1?ACTL[ai][1]:null,nxt=ai<ACTL.length-1&&ai+1!==1?ACTL[ai+1][1]:null;
  let mix=null;
  if(nxt!==null&&t>nxt-XF/2)mix=[ai,ai+1,P_(t,nxt-XF/2,XF)];
  else if(b!==null&&t<b+XF/2)mix=[ai-1,ai,P_(t,b-XF/2,XF)];
  if(mix&&BOXMODE){render3(t,mix[2]<.5?mix[0]:mix[1]);}
  else if(mix){/* уходящий акт расплывается, на пике расфокуса — смена, новый собирается:
       двух читаемых состояний поверх друг друга не бывает */
    const e=mix[2],bA=18*E.out(cl(e/.5)),bB=18*(1-E.out(cl((e-.5)/.5))),k=E.move(P_(e,.42,.16));
    if(k<1){render3(t,mix[0]);XAg.globalCompositeOperation='copy';XAg.drawImage(RD.domElement,0,0);}
    if(k>0){render3(t,mix[1]);XBg.globalCompositeOperation='copy';XBg.drawImage(RD.domElement,0,0);}
    if(k<1){g.save();if(bA>.3)g.filter=`blur(${bA.toFixed(1)}px)`;g.drawImage(XA,0,0);g.restore();}
    if(k>0){g.save();g.globalAlpha=k;if(bB>.3)g.filter=`blur(${bB.toFixed(1)}px)`;g.drawImage(XB,0,0);g.restore();}
  }else{render3(t,ai);g.drawImage(RD.domElement,0,0);}
  if(onWhite(t)<.5&&!BOXMODE)glow(A,g);
  /* виньетка */
  const vg=g.createRadialGradient(540,860,500,540,960,1250);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${(.45*(1-onWhite(t))).toFixed(3)})`);g.fillStyle=vg;g.fillRect(0,0,W,H);
  /* плоский слой */
  hudHook(t);hudRec(t);hudSplit(t);hudWhite(t);hudRaise(t);hudCta(t);
  const wipe=mov(t,COIN1+.2,.3)*(1-mov(t,X1+.25,.35));
  g.save();g.globalAlpha=1-wipe;drawRail(t);drawCaption(t);drawFooter(t);g.restore();
  /* зерно */
  const f=Math.floor(t*30);g.save();g.globalCompositeOperation='overlay';g.globalAlpha=.05;g.fillStyle=GRP;g.translate(-Math.floor(rnd(f)*256),-Math.floor(rnd(f+.5)*256));g.fillRect(0,0,W+256,H+256);g.restore();
  O.globalCompositeOperation='copy';O.drawImage(A,0,0);O.globalCompositeOperation='source-over';
}
let BUILT=false;
/* ═══ ЗАМЕР НАЛОЖЕНИЙ (?boxes=1): рамки плоского слоя и проекции 3D ═══ */
let BOXES=null;const BOXMODE=QS.get('boxes')==='1';
const _b=new THREE.Box3();
function box3(list,name){_b.makeEmpty();let any=false;list.forEach(o=>{if(!o)return;let v=o,vis=true;while(v){if(!v.visible){vis=false;break;}v=v.parent;}if(vis){_b.expandByObject(o);any=true;}});
  if(!any||_b.isEmpty())return;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let i=0;i<8;i++){const p=new V3(i&1?_b.max.x:_b.min.x,i&2?_b.max.y:_b.min.y,i&4?_b.max.z:_b.min.z);const q=scr(p);if(q[2]>1)continue;x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}
  BOXES.push({k:'3D',n:name,x0,y0,x1,y1});}
function boxes3(ai){const n=ACTL[ai][0],op=m=>{const a=Array.isArray(m)?m[0]:m;return a.opacity===undefined||a.opacity>.3;};
  if(n==='hook'){box3([num1.grp],'80 000');box3([num2.grp],'134 000');box3(bar1,'полоса 1');box3(bar2.concat(extra),'полоса 2');}
  if(n==='rec'){if(PAPER.visible&&PMAT.opacity>.3){const c=[[-PW/2,0],[PW/2,0],[-PW/2,-PL*TU-.1],[PW/2,-PL*TU-.1]].map(([x,y])=>PGRP.localToWorld(new V3(x,y,0)));
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;c.forEach(p=>{const q=scr(p);x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);});BOXES.push({k:'3D',n:'лента чека',x0,y0,x1,y1});}
    if(op(num3.mats))box3([num3.grp],'134 000 итог');box3([MON],'монитор');}
  if(n==='split')box3(segM,'бублик');
  if(n==='white'){box3([num40.grp],'40%');}
  if(n==='raise'){if(op(num5.mats))box3([num5.grp],'+10 000');if(arrow.visible)box3([arrow],'стрелка');if(op(num6.mats))box3([num6.grp],'+14 900');box3(tower,'стопка монет');}
  if(n==='cta')box3([plane],'самолётик');
  if(COIN.visible)box3([COIN],'монета');
  if(n==='rec')CP.forEach(m=>{if(m.visible)box3([m],'монетка');});
  if(n==='white')flyNotes.forEach(m=>box3([m],'купюра'));}
window.boxesAt=function(t){BOXES=[];frame(t);const r=BOXES;BOXES=null;return r;};
window.seek=function(t){if(!BUILT)return;frame(t);};
window.seekMB=function(t,n=4){const sh=.5/30;for(let k=0;k<n;k++){frame(t+((k+.5)/n-.5)*sh);ACG.globalCompositeOperation=k?'source-over':'copy';ACG.globalAlpha=1/(k+1);ACG.drawImage(cv,0,0);}
  ACG.globalAlpha=1;O.globalCompositeOperation='copy';O.drawImage(ACC,0,0);O.globalCompositeOperation='source-over';};
window.ACTS3=ACTS3;
Promise.all([500,600,900].map(w=>document.fonts.load(F(w,40),'ЧЕК₽09'))).then(()=>{build();g=AG;GRP=AG.createPattern(GR,'repeat');BUILT=true;window.seek(0);window.READY=true;})
  .catch(e=>{console.error('build',e&&e.stack||e);});
