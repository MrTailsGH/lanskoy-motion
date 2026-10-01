/* ═══════════════════════════════════════════════════════════════════
   НЕОН-РУБЛЬ · тест №5 · 1080×1920 · 30 fps · 120 с
   История «Рубль-квеста» в киберпанке, в настоящем 3D (three.js):
   ночной город под дождём с отражениями на мокром асфальте,
   голографическая карта, неоновая улица, серверное ядро с боссом,
   металлический тайник, небоскрёбы-копилка, погружение сквозь
   масштабы, сохранение, крыша с титрами. Свет — эмиссия и свечение
   (UnrealBloom), туман, отражения окружения, ACES.
   Поверх 3D — плоский интерфейс игры (панели, числа, сообщения),
   на глитчах — расщепление RGB и сдвиг полос, зерно.
   Палитра приглушённая: пыльная роза, бирюза, янтарь, мятный канала.
   Всё — чистая функция seek(t). Случайность — rnd(i).
   ═══════════════════════════════════════════════════════════════════ */
const W=1080,H=1920,FPS=30,DUR=120;
window.META={FPS,DUR,FRAMES:DUR*FPS};
window.T={src:'неон-рубль, без голоса',DUR,B:[]};
window.READY=false;
/* отрезки, где рендер смешивает четыре подкадра (затвор 180°) */
window.BLUR=[[80.6,82.4],[83.2,85.0],[85.8,87.6],[88.3,90.1]];
/* тизер на 10 с: ?cut=teaser — нарезка лучших мест, склейки глитчем */
const TEASER=new URLSearchParams(location.search).get('cut')==='teaser';
const TCUT=[[0,2.4,2.15],[2.4,4.2,21.75],[4.2,6.4,47.7],[6.4,8.6,57.9],[8.6,10,73.4]];
if(TEASER){window.META={FPS,DUR:10,FRAMES:300};window.BLUR=[];}
const tsrc=t=>{if(!TEASER)return t;const c=TCUT.find(q=>t>=q[0]&&t<q[1])||TCUT[TCUT.length-1];return c[2]+(t-c[0]);};
const TGL=[[2.4,.4,.9],[4.2,.4,.9],[6.4,.4,.9],[8.6,.4,.9]];

/* ═══ ПАЛИТРА И МАТЕМАТИКА ═══ */
const C={bg0:'#06070B',bg1:'#0A0C13',ink:'#E3E8EE',dim:'#A3ABBC',mute:'#5E6880',line:'#2A3042',
  cy:'#4FB8C8',cy2:'#24707D',cyL:'#A8DCE4',mi:'#5FD3A0',mi2:'#2A8A63',miL:'#B5EDD3',mg:'#C2508A',mg2:'#6E2A55',mgL:'#E2A6C3',
  am:'#E0A957',am2:'#8F6428',amL:'#F2D3A0',rd:'#D65A4F',rd2:'#7E2C28',rdL:'#F0AAA2',vi:'#7464C2',vi2:'#2E2858',fog:'#1A1630'};
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,p)=>a+(b-a)*p;
const P_=(t,a,d)=>cl((t-a)/d);
const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const out=t=>1-Math.pow(1-t,3);
function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
const spr=(t,w=14)=>t<=0?0:1-(1+w*t)*Math.exp(-w*t);
const sprO=(t,w=14,z=.62)=>{if(t<=0)return 0;const q=Math.sqrt(1-z*z),wd=w*q;return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z/q*Math.sin(wd*t));};
const track=(t,keys,f=spr)=>keys.reduce((v,[ti,vi],i)=>i?v+(vi-keys[i-1][1])*f(t-ti):vi,0);
const hs=(t,list)=>t-list.reduce((s,[h,d])=>s+cl(t-h,0,d),0);
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const rub=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',');
const typed=(s,t,a,cps=30)=>s.slice(0,Math.max(0,Math.floor((t-a)*cps)));
function hex2(h){const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];}
function rgba(h,a){const [r,g_,b]=hex2(h);return `rgba(${r},${g_},${b},${a})`;}
function mixc(a,b,p){const x=hex2(a),y=hex2(b);return '#'+x.map((v,i)=>Math.round(lerp(v,y[i],p)).toString(16).padStart(2,'0')).join('');}
const bez=(a,b,c,u)=>(1-u)*(1-u)*a+2*(1-u)*u*b+u*u*c;

/* ═══ ПЛОСКИЕ ХОЛСТЫ: A — кадр (3D + интерфейс), cv — после обработки ═══ */
const stage=document.getElementById('stage');
const cv=document.createElement('canvas');cv.width=W;cv.height=H;stage.appendChild(cv);
const O=cv.getContext('2d');
let g=null;
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;if(fn){const k=g;g=c.getContext('2d');fn(c);g=k;}return c;}
const A=mk(W,H),AG=A.getContext('2d');g=AG;
const B1=mk(270,480),B1g=B1.getContext('2d'),B2=mk(135,240),B2g=B2.getContext('2d');
const CR=mk(W,H),CRg=CR.getContext('2d'),CB=mk(W,H),CBg=CB.getContext('2d');
const scan=document.createElement('div');Object.assign(scan.style,{position:'absolute',left:0,top:0,width:'1080px',height:'1920px',
  backgroundImage:'repeating-linear-gradient(0deg, rgba(0,0,0,.08) 0 1px, rgba(0,0,0,0) 1px 4px)',zIndex:5});stage.appendChild(scan);
const vig=document.createElement('div');Object.assign(vig.style,{position:'absolute',left:0,top:0,width:'1080px',height:'1920px',
  background:'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,.45) 100%)',zIndex:6});stage.appendChild(vig);

/* ═══ ПЛОСКОЕ РИСОВАНИЕ: интерфейс игры ═══ */
function R(x,y,w,h,c,a=1){g.globalAlpha=a;g.fillStyle=c;g.fillRect(x,y,w,h);g.globalAlpha=1;}
const FN={T:'800 %px Tektur',TB:'900 %px Tektur',R:'400 %px "Russo One"',M:'700 %px "JetBrains Mono"',MB:'800 %px "JetBrains Mono"',U:'900 %px Unbounded'};
const F=(k,px)=>FN[k].replace('%',px);
const AL={l:'left',c:'center',r:'right'};
function tx(s,x,y,f,c,al='l',a=1,ls=0){if(a<=0||!s)return;g.font=f;g.textAlign=AL[al];g.textBaseline='middle';g.letterSpacing=ls+'px';g.globalAlpha=a;g.fillStyle=c;
  g.fillText(s,al==='c'?x+ls/2:x,y);g.globalAlpha=1;g.letterSpacing='0px';}
function tw(s,f,ls=0){g.font=f;g.letterSpacing=ls+'px';const w=g.measureText(s).width;g.letterSpacing='0px';return w;}
function neon(s,x,y,f,c,al='c',a=1,bl=22,ls=0){if(a<=0||!s)return;g.save();g.font=f;g.textAlign=AL[al];g.textBaseline='middle';g.letterSpacing=ls+'px';
  const xx=al==='c'?x+ls/2:x;g.globalAlpha=a;g.fillStyle=c;g.shadowColor=c;g.shadowBlur=bl*2;g.fillText(s,xx,y);g.shadowBlur=bl*.6;g.fillText(s,xx,y);
  g.shadowBlur=0;g.fillStyle=mixc(c,'#FFFFFF',.42);g.fillText(s,xx,y);g.restore();}
function flick(t,seed,on=0){if(t<on)return 0;const u=t-on;if(u<.55){const k=Math.floor(u*22);return rnd(k+seed*31)<.3+u*1.2?1:.12;}return rnd(Math.floor(t*12)+seed*97)<.025?.4:1;}
function haze(x,y,r,col,a){if(a<=0)return;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgba(col,a));gr.addColorStop(1,rgba(col,0));g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}
function cutPath(x,y,w,h,c){g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x,y+h);g.lineTo(x,y+c);g.closePath();}
/* голографическая панель: раскрывается линией, потом по высоте; true — открыта */
function panel(x,y,w,h,col,o=1,fa=.78){if(o<=0)return false;
  const p1=cl(o/.35),p2=cl((o-.35)/.65),ww=Math.max(6,w*out(p1)),hh=Math.max(3,h*io(p2)),xx=x+(w-ww)/2,yy=y+(h-hh)/2,c=Math.min(18,hh/3);
  g.save();cutPath(xx,yy,ww,hh,c);g.fillStyle=rgba('#070A12',fa);g.fill();
  g.lineWidth=2;g.strokeStyle=rgba(col,.9);g.shadowColor=col;g.shadowBlur=12;g.stroke();g.shadowBlur=0;
  if(hh>20){const L=Math.min(26,ww/4,hh/3);g.strokeStyle=col;g.lineWidth=4;g.beginPath();
    g.moveTo(xx+ww-L,yy-7);g.lineTo(xx+ww+7,yy-7);g.lineTo(xx+ww+7,yy+L);g.moveTo(xx+L,yy+hh+7);g.lineTo(xx-7,yy+hh+7);g.lineTo(xx-7,yy+hh-L);g.stroke();}
  g.restore();return p2>=1;}
const popen=(t,a,d=.34)=>cl((t-a)/d);
function tri(x,y,s,c){g.fillStyle=c;g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s*.9,y+s*.6);g.lineTo(x-s*.9,y+s*.6);g.closePath();g.fill();}
function triR(x,y,s,c){g.fillStyle=c;g.beginPath();g.moveTo(x+s,y);g.lineTo(x-s*.6,y-s*.9);g.lineTo(x-s*.6,y+s*.9);g.closePath();g.fill();}
function burst2(t,t0,n,x,y,sp,seed,cols,life=1.2,grav=500,sz=7){const u=t-t0;if(u<0||u>life)return;g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  for(let i=0;i<n;i++){const a=rnd(seed+i)*6.283,v=sp*(.3+.7*rnd(seed+i+.5)),lf=life*(.45+.55*rnd(seed+i+.7));if(u>lf)continue;const f=u/lf;
    const d=k=>v*(1-Math.exp(-3*k))/3,u2=Math.max(0,u-.04);
    const px=x+Math.cos(a)*d(u),py=y+Math.sin(a)*d(u)+.5*grav*u*u,qx=x+Math.cos(a)*d(u2),qy=y+Math.sin(a)*d(u2)+.5*grav*u2*u2;
    g.strokeStyle=cols[Math.min(cols.length-1,Math.floor(f*cols.length))];g.globalAlpha=1-f*f;g.lineWidth=sz*(1-f*.7);g.beginPath();g.moveTo(qx,qy);g.lineTo(px+.01,py);g.stroke();}
  g.restore();}
function flash(a,col){if(a<=0)return;g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=Math.min(.72,a);g.fillStyle=col;g.fillRect(0,0,W,H);g.restore();}
function floatTxt(t,t0,s,x,y,f,col,d=.9){const u=(t-t0)/d;if(u<0||u>1)return;neon(s,x,y-u*80,f,col,'c',u<.7?1:(1-u)/.3,14);}
/* монета-герой плоско: лицо для текстур и финала погружения */
function hero2(x,y,t,o={}){const r=o.r||54,col=o.hurt?C.rd:(o.col||C.mi);
  g.save();g.translate(x,y);
  const dg=g.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);dg.addColorStop(0,'#1A4035');dg.addColorStop(1,'#07120E');g.fillStyle=dg;g.beginPath();g.arc(0,0,r,0,6.283);g.fill();
  g.shadowColor=col;g.shadowBlur=r*.4;g.lineWidth=Math.max(4,r*.12);g.strokeStyle=col;g.beginPath();g.arc(0,0,r*.95,0,6.283);g.stroke();g.shadowBlur=0;
  g.lineWidth=Math.max(2,r*.03);g.strokeStyle=rgba(col,.55);g.beginPath();g.arc(0,0,r*.74,0,6.283);g.stroke();
  for(let k=0;k<12;k++){const an=k/12*6.283+(o.rot||0);g.fillStyle=rgba(col,.85);g.fillRect(Math.cos(an)*r*.84-r*.03,Math.sin(an)*r*.84-r*.03,r*.06,r*.06);}
  const e=r/54;g.fillStyle=col;g.strokeStyle=col;g.lineCap='round';g.shadowColor=col;g.shadowBlur=r*.2;
  if(o.hurt){g.lineWidth=5*e;g.beginPath();for(const s of [-1,1]){g.moveTo(s*17*e-8*e,-14*e);g.lineTo(s*17*e+8*e,2*e);g.moveTo(s*17*e+8*e,-14*e);g.lineTo(s*17*e-8*e,2*e);}g.stroke();
    g.beginPath();g.arc(0,22*e,10*e,3.6,5.8);g.stroke();}
  else if(o.happy){g.lineWidth=5*e;g.beginPath();g.arc(-17*e,-2*e,8*e,3.6,5.8);g.moveTo(25*e,-2*e);g.arc(17*e,-2*e,8*e,3.6,5.8);g.stroke();g.beginPath();g.arc(0,8*e,14*e,.4,2.74);g.stroke();}
  else{const bl=o.blink;g.fillRect(-23*e,-16*e+(bl?10*e:0),12*e,bl?4*e:22*e);g.fillRect(11*e,-16*e+(o.wink||bl?10*e:0),12*e,o.wink||bl?4*e:22*e);g.fillRect(-9*e,16*e,18*e,4*e);}
  g.restore();}

/* ═══════════════════════ 3D ═══════════════════════ */
const {EffectComposer,RenderPass,UnrealBloomPass,OutputPass,Reflector,mergeGeometries}=T3X;
const V3=THREE.Vector3,COL=(h,k=1)=>new THREE.Color(h).multiplyScalar(k);
const RD=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
RD.setPixelRatio(1);RD.setSize(W,H,false);RD.toneMapping=THREE.ACESFilmicToneMapping;RD.toneMappingExposure=1.08;
const S3=new THREE.Scene(),CAM=new THREE.PerspectiveCamera(55,W/H,.3,9000);
const RT=new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,samples:+(new URLSearchParams(location.search).get("ms")||2)});
const COMP=new EffectComposer(RD,RT);COMP.addPass(new RenderPass(S3,CAM));
const BLOOM=new UnrealBloomPass(new THREE.Vector2(W/2,H/2),.85,.55,.2);const QS=new URLSearchParams(location.search);if(QS.get('bl')==='1')COMP.addPass(BLOOM);COMP.addPass(new OutputPass());
const SETS={};
function show(name){for(const k in SETS)SETS[k].visible=k===name;}
function camSet(px,py,pz,tx_,ty,tz,fov=55,roll=0){CAM.position.set(px,py,pz);CAM.up.set(Math.sin(roll),Math.cos(roll),0);CAM.lookAt(tx_,ty,tz);if(CAM.fov!==fov){CAM.fov=fov;CAM.updateProjectionMatrix();}CAM.updateMatrixWorld();}
const _v=new V3();
function scr(x,y,z){_v.set(x,y,z).project(CAM);return [(_v.x+1)/2*W,(1-_v.y)/2*H,_v.z];}
function ctex(w,h,fn,rep){const c=mk(w,h,fn);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
let GLOW;
function sprite(col,k,sx,sy){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:COL(col,k),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.set(sx,sy||sx,1);return s;}
function basic(col,k=1,o={}){return new THREE.MeshBasicMaterial(Object.assign({color:COL(col,k)},o));}
function addM(par,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);par.add(m);return m;}
/* окна: тайл 256×512 = 32×51,2 единицы, угол (0,0) тёмный — туда смотрят крыши */
function winTex(seed,cols,lit=.3,base='#0B0D15'){return ctex(256,512,()=>{R(0,0,256,512,base);
  for(let y=6,fl=0;y<512;y+=40,fl++){const on=rnd(seed+fl*.37)<.8,blind=rnd(seed+fl*2.1)<.4;for(let x=5,c=0;x<256;x+=32,c++){const r=rnd(seed+fl*13+c*7.1);
    if(on&&r<lit){const col=cols[Math.floor(rnd(seed+fl*3+c)*cols.length)],a=.4+.6*rnd(seed+fl+c*3);const gr=g.createLinearGradient(0,y+4,0,y+32);gr.addColorStop(0,col);gr.addColorStop(1,mixc(col,'#000000',.35));
      g.globalAlpha=a;g.fillStyle=gr;g.fillRect(x+2,y+4,22,28);if(blind){g.globalAlpha=a*.55;g.fillStyle='#000';for(let k=0;k<4;k++)g.fillRect(x+2,y+8+k*7,22,2);}}
    else{g.globalAlpha=1;g.fillStyle='#131826';g.fillRect(x+2,y+4,22,28);}}}
  g.globalAlpha=1;R(0,0,10,10,'#000');},true);}
function bld(w,h,d,sc=1){const gm=new THREE.BoxGeometry(w,h,d),uv=gm.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;if(f===2||f===3)uv.setXY(i,.008,.992);else uv.setXY(i,uv.getX(i)*dims[f][0]/(32*sc),uv.getY(i)*dims[f][1]/(51.2*sc));}return gm;}
let BM=[];
function bmat(tex,col='#10131E',ei=1.5){return new THREE.MeshLambertMaterial({color:col,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:ei});}
/* неоновая вывеска на холсте → плоскость */
function signTex(lines,col,o={}){const fpx=o.fpx||80,f=F(o.font||'R',fpx),pad=fpx*.5;let w,h;
  if(o.vert){w=fpx*1.5+pad;h=lines[0].length*fpx*1.08+pad*2;}else{w=Math.max(...lines.map((s,i)=>tw(s,i&&o.f2?F(o.f2,fpx*.6):f,o.ls||0)))+pad*2;h=lines.length*fpx*1.18+pad*1.3;}w=Math.ceil(w);h=Math.ceil(h);
  const tex=ctex(w,h,()=>{if(o.back!==false){g.fillStyle=o.bg||'rgba(6,7,12,.92)';g.fillRect(0,0,w,h);g.save();g.strokeStyle=col;g.lineWidth=5;g.shadowColor=col;g.shadowBlur=10;g.strokeRect(6,6,w-12,h-12);g.restore();}
    if(o.vert){for(let i=0;i<lines[0].length;i++)neon(lines[0][i],w/2,pad+fpx*.55+i*fpx*1.08,f,col,'c',1,10);}
    else lines.forEach((s,i)=>neon(s,w/2,pad*.65+fpx*.62+i*fpx*1.18,i&&o.f2?F(o.f2,fpx*.6):f,i&&o.c2?o.c2:col,'c',1,10,o.ls||0));});return {tex,w,h};}
function signMesh(lines,col,width,o={}){const {tex,w,h}=signTex(lines,col,o);return new THREE.Mesh(new THREE.PlaneGeometry(width,width*h/w),
  new THREE.MeshBasicMaterial({map:tex,transparent:true,color:COL('#ffffff',o.k||1.25),side:THREE.DoubleSide,depthWrite:o.back!==false,blending:o.add?THREE.AdditiveBlending:THREE.NormalBlending}));}
/* небо: купол с градиентом и свечением горизонта, следует за камерой */
let DOME;
function makeDome(){DOME=new THREE.Mesh(new THREE.SphereGeometry(7000,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color('#05050B')},hor:{value:new THREE.Color('#2A1C46')},glow:{value:new THREE.Color('#5A2346')}},
  vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 top,hor,glow;varying vec3 vP;void main(){float h=vP.y;vec3 c=mix(hor,top,smoothstep(-.02,.42,h));c+=glow*exp(-abs(h)*12.);gl_FragColor=vec4(c,1.);}'}));
  DOME.renderOrder=-10;S3.add(DOME);}
function domeCols(top,hor,glow){DOME.material.uniforms.top.value.set(top);DOME.material.uniforms.hor.value.set(hor);DOME.material.uniforms.glow.value.set(glow);}
/* дождь: отрезки в шейдере, привязаны к миру по горизонтали */
let RAIN;
function makeRain(n=7000){const sd=new Float32Array(n*8),pos=new Float32Array(n*6);
  for(let i=0;i<n;i++){const a=rnd(i*1.31+1),b=rnd(i*1.73+2),c=rnd(i*2.11+3);for(let e=0;e<2;e++){const k=(i*2+e)*4;sd[k]=a;sd[k+1]=b;sd[k+2]=c;sd[k+3]=e;}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('sd',new THREE.BufferAttribute(sd,4));
  const mat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uC:{value:new V3()},uR:{value:70},uL:{value:1.6},uA:{value:.5}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:`attribute vec4 sd;uniform float uT,uR,uL;uniform vec3 uC;varying float vE;void main(){float sp=50.+sd.z*30.;vec3 p;
      p.x=uC.x+mod(sd.x*uR-uC.x,uR)-uR*.5;p.z=uC.z+mod(sd.y*uR-uC.z,uR)-uR*.5;p.y=uC.y-uR*.4+mod(sd.z*517.+sd.x*91.-uT*sp,uR*.8)+sd.w*uL;p.x+=sd.w*uL*.14;vE=sd.w;
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:'uniform float uA;varying float vE;void main(){float a=uA*(.15+.85*vE);gl_FragColor=vec4(vec3(.74,.82,.95)*a,a);}'});
  RAIN=new THREE.LineSegments(geo,mat);RAIN.frustumCulled=false;S3.add(RAIN);}
function rainOn(t,a=.5,R_=70,L=1.6){RAIN.visible=a>0;const u=RAIN.material.uniforms;u.uT.value=t;u.uC.value.copy(CAM.position);u.uA.value=a;u.uR.value=R_;u.uL.value=L;}
/* частицы: формула → точки, свечение складывается */
const PMAX=3000,PP=new Float32Array(PMAX*3),PC=new Float32Array(PMAX*3),PS=new Float32Array(PMAX);let PN=0,PTS;
function makeParts(){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(PP,3));geo.setAttribute('col',new THREE.BufferAttribute(PC,3));geo.setAttribute('size',new THREE.BufferAttribute(PS,1));
  PTS=new THREE.Points(geo,new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:'attribute float size;attribute vec3 col;varying vec3 vC;void main(){vC=col;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(900./-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.5,.0,length(d));a*=a;gl_FragColor=vec4(vC*a,a);}'}));PTS.frustumCulled=false;S3.add(PTS);}
const _col=new THREE.Color();
function pAdd(x,y,z,col,k,s){if(PN>=PMAX)return;_col.set(col).multiplyScalar(k);PP[PN*3]=x;PP[PN*3+1]=y;PP[PN*3+2]=z;PC[PN*3]=_col.r;PC[PN*3+1]=_col.g;PC[PN*3+2]=_col.b;PS[PN]=s;PN++;}
function pFlush(){const ge=PTS.geometry;ge.setDrawRange(0,PN);ge.attributes.position.needsUpdate=true;ge.attributes.col.needsUpdate=true;ge.attributes.size.needsUpdate=true;}
function burst3(t,t0,n,x,y,z,sp,seed,cols,life=1.2,grav=9,sz=.6){const u=t-t0;if(u<0||u>life)return;
  for(let i=0;i<n;i++){const th=rnd(seed+i)*6.283,ph=Math.acos(2*rnd(seed+i+.31)-1),v=sp*(.3+.7*rnd(seed+i+.5)),lf=life*(.45+.55*rnd(seed+i+.7));if(u>lf)continue;const f=u/lf;
    const dx=Math.sin(ph)*Math.cos(th),dy=Math.cos(ph),dz=Math.sin(ph)*Math.sin(th);
    for(const [uu,kk] of [[u,1],[Math.max(0,u-.03),.5],[Math.max(0,u-.06),.25]]){const d=v*(1-Math.exp(-3*uu))/3;pAdd(x+dx*d,y+dy*d-.5*grav*uu*uu,z+dz*d,cols[Math.min(cols.length-1,Math.floor(f*cols.length))],(1-f*f)*kk*2.2,sz*(1-f*.6));}}}
function implode3(t,t0,d,n,x,y,z,R0,seed,col){const u=(t-t0)/d;if(u<0||u>1)return;for(let i=0;i<n;i++){const ph=(u*2+rnd(seed+i))%1,th=rnd(seed+i*3)*6.283+ph,el=(rnd(seed+i*5)-.5)*2.4,r=R0*(1-ph);
  pAdd(x+Math.cos(th)*Math.cos(el)*r,y+Math.sin(el)*r,z+Math.sin(th)*Math.cos(el)*r,col,ph*2.4,.35+ph*.4);}}
/* рёбра трубками: босс и тайник */
const _q=new THREE.Quaternion(),_m=new THREE.Matrix4(),_a=new V3(),_b=new V3(),_c=new V3(),UPV=new V3(0,1,0),_s=new V3();
function edgeTube(im,i,a,b,thick=1){_c.subVectors(b,a);const L=_c.length();_q.setFromUnitVectors(UPV,_c.multiplyScalar(1/(L||1)));_a.addVectors(a,b).multiplyScalar(.5);_s.set(thick,L,thick);_m.compose(_a,_q,_s);im.setMatrixAt(i,_m);}
/* ═══ РУБЛИК В 3D: монета с лицом-голограммой ═══ */
const FACE={};let HERO;
function makeHero(){for(const [k,o] of [['n',{}],['blink',{blink:true}],['happy',{happy:true}],['hurt',{hurt:true}],['wink',{wink:true}]])
    FACE[k]=ctex(512,512,()=>{R(0,0,512,512,'#07120E');hero2(256,256,0,Object.assign({r:250},o));});
  const G3=new THREE.Group();const cap=new THREE.MeshStandardMaterial({map:FACE.n,emissive:'#ffffff',emissiveMap:FACE.n,emissiveIntensity:1.25,roughness:.3,metalness:.4});
  const side=new THREE.MeshStandardMaterial({color:'#1A5A45',metalness:.95,roughness:.22,emissive:C.mi2,emissiveIntensity:.5});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.24,96),[side,cap,cap]);body.rotation.x=Math.PI/2;body.rotation.y=Math.PI/2;G3.add(body);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.0,.07,12,128),basic(C.mi,2.4));rim.position.z=.125;G3.add(rim);
  const glow=sprite(C.mi,.55,4.6);glow.position.z=-.3;G3.add(glow);const jet=sprite(C.mi,.9,1.1,2.4);jet.position.set(0,-1.75,0);G3.add(jet);
  G3.userData={cap,rim,glow,jet,side};S3.add(G3);HERO=G3;}
function heroAt(x,y,z,t,o={}){const h=HERO,u=h.userData;h.visible=o.hide!==true;h.position.set(x,y+(o.nobob?0:Math.sin(t*3.1)*.16*(o.s||1)),z);h.scale.setScalar(o.s||1);
  const mood=o.hurt?'hurt':o.happy?'happy':o.wink?'wink':((t%3.3)<.12?'blink':'n');u.cap.map=FACE[mood];u.cap.emissiveMap=FACE[mood];
  const col=o.hurt?C.rd:(o.col||C.mi);u.rim.material.color.copy(COL(col,o.hot?3.4:2.4));u.glow.material.color.copy(COL(col,o.hot?1.1:.5));u.jet.visible=!o.nojet;u.jet.scale.set(1.1,2.2+Math.sin(t*20)*.3,1);
  h.quaternion.copy(CAM.quaternion);h.rotateZ(Math.sin(t*1.3)*.06);if(o.ry)h.rotateY(o.ry);
  if(!o.nojet&&h.visible)for(let k=0;k<5;k++){const u_=((t*2.4+k/5)%1);pAdd(h.position.x+(rnd(k+Math.floor(t*2.4))-.5)*.5*(o.s||1),h.position.y-(1.4+u_*1.8)*(o.s||1),h.position.z,C.mi,(1-u_)*1.4,.25*(o.s||1));}}
/* монетки-снаряды */
let COINS=[];
function makeCoins(){for(let i=0;i<8;i++){const m=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.1,40),new THREE.MeshStandardMaterial({color:'#0E2A20',metalness:.9,roughness:.25,emissive:C.mi2,emissiveIntensity:.6}));
  b.rotation.x=Math.PI/2;m.add(b);const r=new THREE.Mesh(new THREE.TorusGeometry(.42,.05,8,48),basic(C.mi,2.6));m.add(r);const s=sprite(C.mi,.6,2.2);m.add(s);m.userData={r,s};m.visible=false;S3.add(m);COINS.push(m);}}
function coinAt(i,x,y,z,t,col=C.mi){const m=COINS[i];m.visible=true;m.position.set(x,y,z);m.rotation.set(0,t*8+i,0);m.userData.r.material.color.copy(COL(col,2.6));m.userData.s.material.color.copy(COL(col,.6));}
/* летающие машины */
function makeCars(par,n,seed,area){const bodyG=new THREE.CapsuleGeometry(.8,3.2,6,12);bodyG.rotateX(Math.PI/2);
  const bodies=new THREE.InstancedMesh(bodyG,new THREE.MeshStandardMaterial({color:'#1A1D2A',metalness:.9,roughness:.3}),n);
  const lights=new THREE.InstancedMesh(new THREE.SphereGeometry(.28,8,6),basic('#ffffff',1),n*2);
  const cars=[];for(let i=0;i<n;i++){cars.push({y:area.y0+rnd(seed+i+.2)*(area.y1-area.y0),x:area.x0+rnd(seed+i+.4)*(area.x1-area.x0),sp:(18+rnd(seed+i+.6)*30)*(rnd(seed+i+.8)<.5?1:-1),ph:rnd(seed+i+.9)});
    lights.setColorAt(i*2,COL('#F6E6C8',4));lights.setColorAt(i*2+1,COL(C.rd,4));}
  bodies.frustumCulled=lights.frustumCulled=false;par.add(bodies,lights);return {bodies,lights,cars,area};}
function carsAt(cs,t){const {cars,area}=cs,L=area.z1-area.z0;cars.forEach((c,i)=>{const z=area.z0+(((c.ph*L+t*c.sp)%L)+L)%L,dir=Math.sign(c.sp);
  _m.makeTranslation(c.x,c.y,z);cs.bodies.setMatrixAt(i,_m);_m.makeTranslation(c.x,c.y,z+dir*2.4);cs.lights.setMatrixAt(i*2,_m);_m.makeTranslation(c.x,c.y,z-dir*2.4);cs.lights.setMatrixAt(i*2+1,_m);});
  cs.bodies.instanceMatrix.needsUpdate=true;cs.lights.instanceMatrix.needsUpdate=true;}
/* мокрый асфальт: зеркало + тёмная плёнка с лужами */
let PUD;const RW=+(new URLSearchParams(location.search).get("rw")||360);
function wetGround(par,w,d,x,z,tint='#8a8a96'){const mir=new Reflector(new THREE.PlaneGeometry(w,d),{textureWidth:RW,textureHeight:RW*16/9|0,color:tint,clipBias:.003});mir.rotation.x=-Math.PI/2;mir.position.set(x,0,z);par.add(mir);
  const t=PUD.clone();t.needsUpdate=true;t.repeat.set(w/30,d/30);const film=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color:'#06070B',roughness:.9,metalness:0,transparent:true,alphaMap:t,opacity:.94}));
  film.rotation.x=-Math.PI/2;film.position.set(x,.02,z);par.add(film);return mir;}

/* ═══════════ НАБОР «ГОРОД»: проспект, проезды, небоскрёбы (заставка, сохранение, крыша) ═══════════ */
const SIGNS=['БАНК','КОФЕ','ТАКСИ','ОБМЕН','24/7','НОЧЬ','КРЕДИТ','ЗАЙМЫ','ЛОМБАРД','ДАННЫЕ','ОТЕЛЬ','РАМЕН'];
const SCOL=[C.mg,C.cy,C.am,C.mi,C.vi,C.mgL];
let CITY={};
function buildCity(){const G3=new THREE.Group();SETS.city=G3;S3.add(G3);
  const geos=[[],[],[],[],[],[]],put=(x,z,w,d,h,m)=>{const gm=bld(w,h,d);gm.translate(x,h/2,z);geos[m].push(gm);};
  const fronts=[],tops=[];
  for(const side of [-1,1]){let z=90;while(z>-1700){const d=18+rnd(z*.13+side)*24;if(rnd(z*.071+side*3)<.13){z-=28;continue;}
    const w=16+rnd(z*.19+side)*14,h=24+Math.pow(rnd(z*.31+side*5),1.5)*240,x=side*(23+w/2);
    if(!(side<0&&z>-290&&z-d<-230)){put(x,z-d/2,w,d,h,Math.floor(rnd(z*.5+side)*6));fronts.push([side,z,d,h,w]);if(h>150)tops.push([x,h,z-d/2]);}
    const w2=26+rnd(z*.23+side)*34,h2=70+Math.pow(rnd(z*.41+side*7),1.2)*340;put(side*(62+w2/2+rnd(z)*30),z-d/2-12,w2,d+12,h2,Math.floor(rnd(z*.9+side)*6));if(h2>260)tops.push([side*(62+w2/2),h2,z-d/2-12]);
    z-=d+2+rnd(z*.11)*4;}}
  for(let i=0;i<80;i++){const x=(rnd(i+900)-.5)*2000,z=-1750-rnd(i+901)*1100,w=40+rnd(i+902)*90,h=160+Math.pow(rnd(i+903),1.3)*820;put(x,z,w,w,h,i%6);if(h>600)tops.push([x,h,z]);}
  /* крыша для финала: низкое здание у проспекта */
  put(-36,-262,26,30,58,2);
  geos.forEach((arr,i)=>{if(arr.length)G3.add(new THREE.Mesh(mergeGeometries(arr),BM[i]));});
  /* вывески-«лопаты» на фасадах, щиты на крышах, голореклама */
  CITY.signs=[];
  fronts.forEach(([side,z,d,h],i)=>{if(rnd(i*3.7+11)<.55&&h>30){const s=SIGNS[Math.floor(rnd(i*5.1)*SIGNS.length)],col=SCOL[Math.floor(rnd(i*7.3)*SCOL.length)];
      const m=signMesh([s],col,2.6,{vert:true,fpx:70});m.position.set(side*23.6,8+rnd(i*9.1)*Math.min(30,h-20)+m.geometry.parameters.height/2,z-2-rnd(i)*4);G3.add(m);CITY.signs.push([m,i]);}
    if(rnd(i*4.3+5)<.18&&h>40){const col=SCOL[Math.floor(rnd(i*2.3)*SCOL.length)];const m=signMesh([SIGNS[Math.floor(rnd(i*6.6)*SIGNS.length)]],col,16,{fpx:90});m.position.set(side*(23+9),h+6,z-d/2);G3.add(m);CITY.signs.push([m,i+100]);}});
  const HOLO=[['КРЕДИТ ЗА МИНУТУ','ЖМИ СЕЙЧАС'],['ЗАЙМЫ 24/7','БЕЗ ОТКАЗА'],['ИНВЕСТИЦИИ','ГАРАНТИЯ?'],['ВСЁ В РАССРОЧКУ','ПЛАТИ ПОТОМ']];
  CITY.holo=[];HOLO.forEach((L,i)=>{const col=[C.mg,C.cy,C.am,C.vi][i];const m=signMesh(L,col,34,{fpx:84,f2:'M',c2:C.ink,back:false,add:true,k:1.3});m.position.set((i%2?1:-1)*44,70+i*14,-160-i*230);m.rotation.y=(i%2?-1:1)*.35;G3.add(m);CITY.holo.push(m);});
  /* дорога, тротуары, бордюры, разметка, фонари */
  wetGround(G3,140,2600,0,-800);
  for(const s of [-1,1]){addM(G3,new THREE.BoxGeometry(9,.5,2600),new THREE.MeshStandardMaterial({color:'#15161D',roughness:.75,metalness:.2}),s*18.5,.25,-800);
    addM(G3,new THREE.BoxGeometry(.18,.12,2600),basic(s<0?C.mg:C.cy,2.2),s*13.9,.56,-800);}
  const dash=[];for(let z=80;z>-1700;z-=14){const gm=new THREE.PlaneGeometry(.3,5);gm.rotateX(-Math.PI/2);gm.translate(0,.05,z);dash.push(gm);}G3.add(new THREE.Mesh(mergeGeometries(dash),basic(C.cyL,.9)));
  const poles=[],heads=[];for(let z=60;z>-1700;z-=36)for(const s of [-1,1]){const p=new THREE.BoxGeometry(.3,9,.3);p.translate(s*15.2,4.5,z);poles.push(p);const a=new THREE.BoxGeometry(2.4,.2,.3);a.translate(s*14.2,9,z);poles.push(a);
    const hd=new THREE.BoxGeometry(1.4,.2,.6);hd.translate(s*13.4,8.85,z);heads.push(hd);if(z>-700){const sp=sprite('#CFE6F0',.5,6);sp.position.set(s*13.4,8.6,z);G3.add(sp);}
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshBasicMaterial({map:GLOW,color:COL('#9FC7D8',.22),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(s*11,.06,z);G3.add(pool);}
  G3.add(new THREE.Mesh(mergeGeometries(poles),new THREE.MeshStandardMaterial({color:'#20232E',metalness:.8,roughness:.4})));G3.add(new THREE.Mesh(mergeGeometries(heads),basic('#D8EEF6',3)));
  /* маячки на крышах */
  CITY.beacons=tops.slice(0,60).map(([x,h,z])=>{const s=sprite(C.rd,1.6,h>500?14:7);s.position.set(x,h+3,z);G3.add(s);return s;});
  CITY.cars=makeCars(G3,70,40,{x0:-70,x1:70,y0:28,y1:140,z0:-1700,z1:120});
  /* крыша для финала */
  const roof=new THREE.Group();G3.add(roof);roof.position.set(-36,58,-262);
  addM(roof,new THREE.BoxGeometry(26,1.2,30),new THREE.MeshStandardMaterial({color:'#1B1D26',roughness:.6,metalness:.4}),0,.6,0);
  addM(roof,new THREE.BoxGeometry(26.4,1,.6),new THREE.MeshStandardMaterial({color:'#2A2D3A',roughness:.5,metalness:.6}),0,1.7,14.8);
  addM(roof,new THREE.BoxGeometry(.2,.12,26),basic(C.mg,2.4),12.9,1.25,0);addM(roof,new THREE.BoxGeometry(26,.12,.2),basic(C.mg,2.4),0,2.25,15.05);
  for(let i=0;i<3;i++){addM(roof,new THREE.BoxGeometry(3,2.4,3),new THREE.MeshStandardMaterial({color:'#2A2E3B',roughness:.5,metalness:.7}),-8+i*4,2.4,-6);}
  addM(roof,new THREE.CylinderGeometry(.12,.12,14,8),new THREE.MeshStandardMaterial({color:'#333849',metalness:.8,roughness:.3}),-10,8,-10);const bc=sprite(C.rd,2,3);bc.position.set(-10,15.2,-10);roof.add(bc);CITY.roofBeacon=bc;
  const sg=signMesh(['РАМЕН'],C.am,9,{fpx:90});sg.position.set(2,6,-12);roof.add(sg);
    G3.add(new THREE.HemisphereLight('#3A3060','#0A0A10',.6));
}
function cityAt(t){CITY.signs.forEach(([m,i])=>{m.material.opacity=rnd(Math.floor(t*12)+i*97)<.02?.35:1;});
  CITY.holo.forEach((m,i)=>{m.material.opacity=(.55+.25*Math.sin(t*3+i))*(rnd(Math.floor(t*14)+i*13)<.08?.2:1);});
  CITY.beacons.forEach((s,i)=>{s.visible=Math.sin(t*3+i*1.7)>-.1;});CITY.roofBeacon.visible=Math.sin(t*3)>0;carsAt(CITY.cars,t);
  S3.fog=FOG.city;domeCols('#04040A','#2B1C45','#5A2346');}

/* ═══════════ НАБОР «УЛИЦА»: фасады вдоль x, тротуар, лавки ═══════════ */
const XV=6;
const camS=t=>{const u=t-14;if(t<30.5)return u;if(t<31.5){const v=t-30.5;return 16.5+v-.5*v*v;}return 17;};
const xcam=t=>camS(t)*XV;
const WSAL=xcam(15.0)+1.9,WCOF=xcam(19.4)+1.2,WSUB=xcam(25.3)+2.2,WVAU=xcam(29.2)+1.6;
let STR={};
function buildStreet(){const G3=new THREE.Group();SETS.street=G3;S3.add(G3);
  const geos=[[],[],[],[],[],[]],put=(x,z,w,d,h,m)=>{const gm=bld(w,h,d,.26);gm.translate(x,h/2,z);geos[m].push(gm);};
  let x=-70,i=0;const shops=[];while(x<230){const w=12+rnd(i*1.9)*16,h=26+rnd(i*2.7)*90,d=24;put(x+w/2,-14-d/2,w,d,h,Math.floor(rnd(i*3.3)*6));shops.push([x+w/2,w,i]);x+=w+.6;i++;}
  for(let k=0;k<40;k++){const w=20+rnd(k+300)*30,h=70+rnd(k+301)*220;put(-80+k*9+rnd(k+302)*6,-70-rnd(k+303)*40,w,24,h,Math.floor(rnd(k+304)*6));}
  for(let k=0;k<50;k++){const w=40+rnd(k+400)*70,h=150+rnd(k+401)*500;put(-200+k*14,-260-rnd(k+402)*300,w,w,h,k%6);}
  geos.forEach((arr,i)=>{if(arr.length){const m=BM[i].clone();m.emissiveIntensity=1.0;G3.add(new THREE.Mesh(mergeGeometries(arr),m));}});
  /* витрины первых этажей и вывески */
  shops.forEach(([sx,w,i])=>{const col=SCOL[Math.floor(rnd(i*4.4)*SCOL.length)];const tex=ctex(256,128,()=>{const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,mixc(col,'#000000',.55));gr.addColorStop(1,mixc(col,'#000000',.85));g.fillStyle=gr;g.fillRect(0,0,256,128);
      for(let k=0;k<6;k++)R(10+k*42,40+rnd(i+k)*30,26,88,'#000',.35);R(0,0,256,6,col,.9);});
    addM(G3,new THREE.PlaneGeometry(w-1.2,4),new THREE.MeshBasicMaterial({map:tex,color:COL('#ffffff',.9)}),sx,2.6,-13.95);
    if(rnd(i*6.2)<.6){const m=signMesh([SIGNS[Math.floor(rnd(i*8.1)*SIGNS.length)]],col,Math.min(w-2,7),{fpx:80});m.position.set(sx,6.4,-13.9);G3.add(m);}
    if(rnd(i*7.7)<.45){const m=signMesh([SIGNS[Math.floor(rnd(i*9.3)*SIGNS.length)]],SCOL[Math.floor(rnd(i*5.5)*6)],2.2,{vert:true,fpx:64});m.position.set(sx-w/2+1.2,14+rnd(i)*10,-12.6);m.rotation.y=Math.PI/2;G3.add(m);}});
  addM(G3,new THREE.BoxGeometry(320,.5,15),new THREE.MeshStandardMaterial({color:'#15161D',roughness:.7,metalness:.25}),80,.25,-6.5);
  addM(G3,new THREE.BoxGeometry(320,.14,.16),basic(C.cy,2.2),80,.56,1);
  wetGround(G3,360,160,80,80);
  const poles=[];for(let lx=-60;lx<230;lx+=22){const p=new THREE.BoxGeometry(.28,8,.28);p.translate(lx,4,.2);poles.push(p);const s=sprite('#CFE6F0',.55,5);s.position.set(lx,8.1,.6);G3.add(s);
    addM(G3,new THREE.BoxGeometry(1.2,.2,.8),basic('#D8EEF6',3),lx,8.05,.6);}
  G3.add(new THREE.Mesh(mergeGeometries(poles),new THREE.MeshStandardMaterial({color:'#20232E',metalness:.8,roughness:.4})));
  STR.cars=makeCars(G3,40,90,{x0:-40,x1:200,y0:30,y1:90,z0:-200,z1:-40});
  /* ЗАРПЛАТА: стойка с экраном */
  const sal=new THREE.Group();sal.position.set(WSAL,0,-7);G3.add(sal);addM(sal,new THREE.BoxGeometry(1.1,8.6,1.1),new THREE.MeshStandardMaterial({color:'#1A1F2C',metalness:.85,roughness:.3}),0,4.3,0);
  addM(sal,new THREE.BoxGeometry(.12,8.6,.12),basic(C.mi,2.4),-.6,4.3,.6);addM(sal,new THREE.BoxGeometry(.12,8.6,.12),basic(C.mi,2.4),.6,4.3,.6);
  const ss=signMesh(['ЗАРПЛАТА','ПЕРЕВОД'],C.mi,5.6,{fpx:90,f2:'M',c2:C.dim});ss.position.set(0,9.4,.2);sal.add(ss);
  /* КОФЕ: киоск */
  const cof=new THREE.Group();cof.position.set(WCOF,0,-8);G3.add(cof);addM(cof,new THREE.BoxGeometry(6,4.4,4),new THREE.MeshStandardMaterial({color:'#2A1E16',roughness:.6,metalness:.3}),0,2.7,0);
  const ct=ctex(512,320,()=>{const gr=g.createLinearGradient(0,0,0,320);gr.addColorStop(0,'#6B4A22');gr.addColorStop(1,'#2A1A0C');g.fillStyle=gr;g.fillRect(0,0,512,320);haze(256,160,240,C.am,.6);
    g.strokeStyle=C.amL;g.lineWidth=12;g.beginPath();g.moveTo(206,110);g.lineTo(218,240);g.lineTo(294,240);g.lineTo(306,110);g.closePath();g.stroke();g.beginPath();g.arc(320,170,26,-1.4,1.4);g.stroke();
    tx('ЭСПРЕССО  ЛАТТЕ  РАФ',256,290,F('M',26),C.amL,'c');});
  addM(cof,new THREE.PlaneGeometry(5.2,3.1),new THREE.MeshBasicMaterial({map:ct,color:COL('#ffffff',1.3)}),0,2.6,2.02);
  for(let k=0;k<8;k++){addM(cof,new THREE.BoxGeometry(.8,.12,2.2),k%2?basic(C.am,1.6):new THREE.MeshStandardMaterial({color:'#2A1E16'}),-2.8+k*.8,5.2,2.6).rotation.x=.45;}
  const cs=signMesh(['КОФЕ'],C.am,4.6,{fpx:100});cs.position.set(0,6.9,1.6);cof.add(cs);const cl_=new THREE.PointLight(C.am,220,30,2);cl_.position.set(0,3.5,4);cof.add(cl_);
  /* ПОДПИСКА: голореклама */
  const sub=signMesh(['ПОДПИСКА','АВТОПЛАТЁЖ ВКЛЮЧЁН'],C.mgL,8,{fpx:100,f2:'M',c2:C.rd,bg:'rgba(30,20,60,.55)',k:1.5});sub.position.set(WSUB,9,-3);G3.add(sub);STR.sub=sub;
  STR.tether=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:24},()=>new V3())),new THREE.LineDashedMaterial({color:COL(C.rd,2.5),dashSize:.5,gapSize:.35,transparent:true}));STR.tether.frustumCulled=false;G3.add(STR.tether);
  /* КОПИЛКА: сейф-терминал */
  const vau=new THREE.Group();vau.position.set(WVAU,0,-8.5);G3.add(vau);addM(vau,new THREE.BoxGeometry(5,6,3),new THREE.MeshStandardMaterial({color:'#1B2430',metalness:.9,roughness:.28}),0,3.25,0);
  const door=new THREE.Group();door.position.set(0,3.3,1.55);vau.add(door);addM(door,new THREE.TorusGeometry(1.7,.14,12,64),basic(C.cy,2.4));addM(door,new THREE.CylinderGeometry(1.6,1.6,.1,48),new THREE.MeshStandardMaterial({color:'#24303E',metalness:.95,roughness:.2})).rotation.x=Math.PI/2;
  const spokes=new THREE.Group();door.add(spokes);for(let k=0;k<6;k++){const s=addM(spokes,new THREE.BoxGeometry(.16,1.2,.16),basic(C.cyL,1.8),0,0,.12);s.rotation.z=k*1.047;s.translateY(.8);}STR.spokes=spokes;
  const vs=signMesh(['КОПИЛКА'],C.cy,5.2,{fpx:100});vs.position.set(0,7.6,.6);vau.add(vs);const vl=new THREE.PointLight(C.cy,200,30,2);vl.position.set(0,4,4);vau.add(vl);STR.vlight=vl;
  /* такси */
  const taxi=new THREE.Group();G3.add(taxi);const tb=new THREE.Mesh(new THREE.CapsuleGeometry(.95,3.6,8,20),new THREE.MeshStandardMaterial({color:C.am,metalness:.75,roughness:.3,emissive:C.am2,emissiveIntensity:.25}));tb.rotation.z=Math.PI/2;taxi.add(tb);
  addM(taxi,new THREE.BoxGeometry(2.6,.9,1.6),new THREE.MeshStandardMaterial({color:'#0A0C12',metalness:1,roughness:.05}),-.2,.75,0);
  const ts=signMesh(['ТАКСИ'],'#20160A',2.4,{fpx:80,back:false,k:1});ts.position.set(0,0,1);taxi.add(ts);
  const hl=sprite('#F6E6C8',2.2,3.4,1.6);hl.position.set(-2.9,0,0);taxi.add(hl);const tl=sprite(C.rd,2,2.2,1.2);tl.position.set(2.9,0,0);taxi.add(tl);const ug=sprite(C.mg,1.4,6,1.6);ug.position.set(0,-1.1,0);taxi.add(ug);
  STR.taxi=taxi;
  /* пакеты зарплаты */
  STR.pk=[0,1,2,3].map(()=>{const m=addM(G3,new THREE.BoxGeometry(.5,.5,.5),basic(C.mi,3));m.add(sprite(C.mi,.8,2.4));return m;});
  G3.add(new THREE.HemisphereLight('#3A3060','#0A0A10',.7));
}
function streetAt(t){S3.fog=FOG.street;domeCols('#05050B','#2C1E47','#5E2448');carsAt(STR.cars,t);
  STR.spokes.rotation.z=t*.6+(t>29.7&&t<30.6?(t-29.7)*6:0);STR.vlight.intensity=200+(t>29.7&&t<31?600*(1-P_(t,30.5,.5)):0);}

/* ═══════════ НАБОР «КАРТА»: голографический город ═══════════ */
const ROUTE=[[-700,-1100],[-700,-300],[-100,-300],[-100,0],[500,0],[500,900],[700,900]];
const NODE=[[-700,-1100,'ДОМ',C.cy],[-100,0,'ДЕНЬ РУБЛЯ',C.mi],[700,900,'ИНФЛЯЦИЯ',C.rd]];
function routeLen(n){let s=0;for(let i=1;i<=n;i++)s+=Math.hypot(ROUTE[i][0]-ROUTE[i-1][0],ROUTE[i][1]-ROUTE[i-1][1]);return s;}
function routeAt(d){for(let i=1;i<ROUTE.length;i++){const l=Math.hypot(ROUTE[i][0]-ROUTE[i-1][0],ROUTE[i][1]-ROUTE[i-1][1]);if(d<=l){const p=d/l;return [lerp(ROUTE[i-1][0],ROUTE[i][0],p),lerp(ROUTE[i-1][1],ROUTE[i][1],p)];}d-=l;}return ROUTE[ROUTE.length-1];}
let MAP={};
function buildMap(){const G3=new THREE.Group();SETS.map=G3;S3.add(G3);
  addM(G3,new THREE.PlaneGeometry(6000,6000),basic('#05080D'),0,-1,0).rotation.x=-Math.PI/2;
  const gr1=new THREE.GridHelper(2600,26,COL(C.cy2,1.2),COL(C.cy2,1.2));gr1.material.transparent=true;gr1.material.opacity=.55;G3.add(gr1);
  const gr2=new THREE.GridHelper(2600,130,COL(C.cy2,.6),COL(C.cy2,.6));gr2.material.transparent=true;gr2.material.opacity=.25;G3.add(gr2);
  const faces=[],ec=[],em=[];
  for(let i=0;i<12;i++)for(let j=0;j<17;j++){const x=(i-5.5)*200+100,z=(j-8)*200+100;if(rnd(i*31+j)<.12)continue;const d=Math.hypot(x,z)/1600;
    for(let q=0;q<4;q++){const ox=(q%2-.5)*90,oz=(Math.floor(q/2)-.5)*90;if(rnd(i*7+j*3+q)<.2)continue;const h=30+rnd(i*7+j*3+q*1.7)*360*(1.25-d*.6),b=new THREE.BoxGeometry(76,h,76);b.translate(x+ox,h/2,z+oz);faces.push(b);
      (rnd(i+j*5+q)<.12?em:ec).push(new THREE.EdgesGeometry(b));}}
  G3.add(new THREE.Mesh(mergeGeometries(faces),new THREE.MeshBasicMaterial({color:'#08131B',transparent:true,opacity:.9})));
  G3.add(new THREE.LineSegments(mergeGeometries(ec),new THREE.LineBasicMaterial({color:COL(C.cy,1.5),transparent:true,opacity:.85})));
  G3.add(new THREE.LineSegments(mergeGeometries(em),new THREE.LineBasicMaterial({color:COL(C.mg,1.6),transparent:true,opacity:.85})));
  const path=new THREE.CurvePath();for(let i=1;i<ROUTE.length;i++)path.add(new THREE.LineCurve3(new V3(ROUTE[i-1][0],6,ROUTE[i-1][1]),new V3(ROUTE[i][0],6,ROUTE[i][1])));
  MAP.tube=addM(G3,new THREE.TubeGeometry(path,600,9,8,false),basic(C.mi,2.6));MAP.tubeN=600;MAP.total=routeLen(6);
  MAP.dash=new THREE.Line(new THREE.BufferGeometry().setFromPoints(ROUTE.map(p=>new V3(p[0],4,p[1]))),new THREE.LineDashedMaterial({color:COL(C.cyL,1.2),dashSize:22,gapSize:18}));MAP.dash.computeLineDistances();G3.add(MAP.dash);
  const bt=ctex(16,256,()=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,1)');g.fillStyle=gr;g.fillRect(0,0,16,256);});
  MAP.nodes=NODE.map(([x,z,,col])=>{const ring=addM(G3,new THREE.TorusGeometry(70,4,8,64),basic(col,2.5),x,3,z);ring.rotation.x=Math.PI/2;
    addM(G3,new THREE.CylinderGeometry(22,22,600,24,1,true),new THREE.MeshBasicMaterial({map:bt,color:COL(col,1.4),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),x,300,z);return ring;});
  MAP.scan=[0,1].map(()=>{const m=addM(G3,new THREE.RingGeometry(.985,1,128),new THREE.MeshBasicMaterial({color:COL(C.cy,1.6),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),-700,2,-1100);m.rotation.x=-Math.PI/2;return m;});
}

/* ═══════════ НАБОР «ЯДРО»: арена босса ═══════════ */
let ICO=null,BOSS={};
function icosphere(){const p=(1+Math.sqrt(5))/2;let V=[[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]];
  let Fc=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const nr=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};V=V.map(nr);const cache={};const mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(cache[k]!==undefined)return cache[k];V.push(nr(V[a].map((x,i)=>(x+V[b][i])/2)));return cache[k]=V.length-1;};
  const F2=[];Fc.forEach(([a,b,c])=>{const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);});
  const E={};F2.forEach(f=>{for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],k=a<b?a+'_'+b:b+'_'+a;E[k]=[Math.min(a,b),Math.max(a,b)];}});return {V,E:Object.values(E)};}
const BPOS=new V3(0,16,-26),HB=new V3(-4.1,7.5,10);
function buildBoss(){const G3=new THREE.Group();SETS.boss=G3;S3.add(G3);
  wetGround(G3,300,300,0,-40,'#6a5a5e');
  const grid=new THREE.GridHelper(300,60,COL(C.rd,1.4),COL(C.rd2,1.2));grid.position.y=.06;grid.material.transparent=true;grid.material.opacity=.5;G3.add(grid);
  for(let k=0;k<14;k++){const an=Math.PI*(.15+.7*k/13),r=58,x=Math.cos(an)*r*1.1,z=-30-Math.sin(an)*r;const h=40+rnd(k+70)*40;
    addM(G3,new THREE.BoxGeometry(4,h,4),new THREE.MeshStandardMaterial({color:'#15101A',metalness:.8,roughness:.3}),x,h/2,z);addM(G3,new THREE.BoxGeometry(.3,h*.9,.3),basic(k%3?C.rd:C.cy,2.2),x,h/2,z+2.1);}
  addM(G3,new THREE.TorusGeometry(26,.6,16,128),basic(C.rd,1.6),0,18,-62);
  const dc=ctex(64,1024,()=>{R(0,0,64,1024,'#000');g.font=F('M',40);g.textAlign='center';for(let i=0;i<24;i++){g.fillStyle=i%5?C.rd2:C.rd;g.fillText('01AF9C7E'[i%8],32,40+i*42);}},true);
  BOSS.cols=[[-30,C.rd],[-20,C.cy],[20,C.cy],[30,C.rd]].map(([x,col])=>{const tt=dc.clone();tt.needsUpdate=true;tt.wrapS=tt.wrapT=THREE.RepeatWrapping;
    return addM(G3,new THREE.PlaneGeometry(4,60),new THREE.MeshBasicMaterial({map:tt,color:COL(col,1.8),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),x,30,-45);});
  ICO=icosphere();
  BOSS.edges=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.09,1,6,1,true),basic(C.rd,2.6),ICO.E.length);BOSS.edges.frustumCulled=false;G3.add(BOSS.edges);
  BOSS.shell=addM(G3,new THREE.IcosahedronGeometry(8.6,2),new THREE.MeshStandardMaterial({color:'#2A0C10',metalness:.6,roughness:.35,transparent:true,opacity:.42,flatShading:true,emissive:C.rd2,emissiveIntensity:.35}));
  const eye=ctex(512,512,()=>{const gr=g.createRadialGradient(256,256,10,256,256,256);gr.addColorStop(0,'#FFE2DA');gr.addColorStop(.25,C.rdL);gr.addColorStop(.55,C.rd);gr.addColorStop(1,'#3A0D10');g.fillStyle=gr;g.fillRect(0,0,512,512);
    g.strokeStyle='rgba(60,10,12,.6)';g.lineWidth=3;for(let k=0;k<40;k++){const an=k/40*6.283;g.beginPath();g.moveTo(256+Math.cos(an)*70,256+Math.sin(an)*70);g.lineTo(256+Math.cos(an)*200,256+Math.sin(an)*200);g.stroke();}});
  BOSS.core=addM(G3,new THREE.SphereGeometry(3.2,48,32),new THREE.MeshBasicMaterial({map:eye,color:COL('#ffffff',1.6)}));
  BOSS.pupil=addM(G3,new THREE.SphereGeometry(1,24,16),basic('#120406'));BOSS.pupil.scale.set(.55,1.25,.3);
  BOSS.glow=sprite(C.rd,1,26);G3.add(BOSS.glow);
  const beamM=()=>new THREE.MeshBasicMaterial({color:COL('#ffffff',1),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  BOSS.beamR=addM(G3,new THREE.CylinderGeometry(1,1,1,16,1,true),beamM());BOSS.beamG=addM(G3,new THREE.CylinderGeometry(1,1,1,16,1,true),beamM());
  BOSS.hex=new THREE.InstancedMesh(new THREE.TorusGeometry(.9,.07,4,6),basic(C.mi,2.4),12);BOSS.hex.frustumCulled=false;G3.add(BOSS.hex);
  BOSS.light=new THREE.PointLight(C.rd,1500,90,2);BOSS.light.position.copy(BPOS);G3.add(BOSS.light);
  BOSS.crate=makeCrate();G3.add(BOSS.crate);
  G3.add(new THREE.HemisphereLight('#4A2030','#0A0508',.5));
}
function beamTo(m,a,b,r,col,k){_c.subVectors(b,a);const L=_c.length();m.position.addVectors(a,b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UPV,_c.normalize());m.scale.set(r,L,r);m.material.color.copy(COL(col,k));}

/* ═══════════ ТАЙНИК: шестигранный кейс ═══════════ */
function makeCrate(){const G3=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(3,3,3.4,6),new THREE.MeshStandardMaterial({color:'#1C2A38',metalness:.95,roughness:.22,emissive:'#0A1622',emissiveIntensity:.6}));G3.add(body);
  const eg=new THREE.EdgesGeometry(new THREE.CylinderGeometry(3.02,3.02,3.42,6));const pos=eg.attributes.position,E=[];for(let i=0;i<pos.count;i+=2)E.push([new V3().fromBufferAttribute(pos,i),new V3().fromBufferAttribute(pos,i+1)]);
  const im=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.06,1,6,1,true),basic(C.cy,2.6),E.length);E.forEach(([a,b],i)=>edgeTube(im,i,a,b));G3.add(im);
  const lock=new THREE.Group();lock.position.set(0,0,2.62);G3.add(lock);const ring=addM(lock,new THREE.TorusGeometry(1,.1,12,64),basic(C.am,2.6));
  const sp=new THREE.Group();lock.add(sp);for(let k=0;k<8;k++){const s=addM(sp,new THREE.BoxGeometry(.1,.4,.08),basic(C.amL,2));s.rotation.z=k*.785;s.translateY(.6);}
  addM(G3,new THREE.CylinderGeometry(3.05,3.05,.3,6),new THREE.MeshStandardMaterial({color:'#24364A',metalness:.95,roughness:.2}),0,1.86,0);
  G3.userData={im,ring,sp,body};return G3;}
function crateAt(cr,t,glow,shk=0){const u=cr.userData;u.ring.material.color.copy(COL(t>57.0?C.mi:C.am,2.6+glow*2));u.sp.rotation.z=t*(t>57.4?6:1.2);u.im.material.color.copy(COL(C.cy,2.6+glow*3));
  u.body.material.emissiveIntensity=.6+glow*1.5;if(shk){cr.position.x+=(rnd(Math.floor(t*30))-.5)*shk;cr.position.y+=(rnd(Math.floor(t*30)+5)-.5)*shk;}}
let CACHE={};
function buildCache(){const G3=new THREE.Group();SETS.cache=G3;S3.add(G3);
  const hexT=ctex(512,512,()=>{R(0,0,512,512,'#000');g.strokeStyle=C.cy;g.lineWidth=4;const r=48,hw=r*Math.sqrt(3);for(let row=-1;row<8;row++)for(let q=-1;q<6;q++){const cx=q*hw+(row%2?hw/2:0),cy=row*r*1.5;g.beginPath();
    for(let k=0;k<6;k++){const an=k/6*6.283+Math.PI/6;k?g.lineTo(cx+Math.cos(an)*r,cy+Math.sin(an)*r):g.moveTo(cx+Math.cos(an)*r,cy+Math.sin(an)*r);}g.closePath();g.stroke();}},true);
  hexT.repeat.set(8,8);
  addM(G3,new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#080C10',metalness:.85,roughness:.32,emissive:'#ffffff',emissiveMap:hexT,emissiveIntensity:.16})).rotation.x=-Math.PI/2;
  for(let k=0;k<12;k++){const an=k/12*6.283,x=Math.cos(an)*42,z=Math.sin(an)*42-10;addM(G3,new THREE.BoxGeometry(.25,60,.25),basic(k%2?C.cy:C.vi,1.8),x,30,z);}
  addM(G3,new THREE.CylinderGeometry(70,70,90,48,1,true),new THREE.MeshLambertMaterial({color:'#05070B',side:THREE.BackSide}),0,40,-10);
  addM(G3,new THREE.CylinderGeometry(1.5,4.2,34,48,1,true),new THREE.MeshBasicMaterial({color:COL(C.cy,.07),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,22,0);
  CACHE.crate=makeCrate();G3.add(CACHE.crate);
  CACHE.orb=[C.cy,C.mi,C.vi].map(col=>{const o=new THREE.Group();G3.add(o);addM(o,new THREE.TorusGeometry(1,.012,6,160),basic(col,2.6));const sat=addM(o,new THREE.SphereGeometry(.05,12,8),basic(C.miL,4),1,0,0);sat.add(sprite(col,.8,.6));o.userData.sat=sat;return o;});
  CACHE.pillar=addM(G3,new THREE.CylinderGeometry(.5,.5,1,24,1,true),new THREE.MeshBasicMaterial({color:COL(C.miL,3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  CACHE.pillarG=addM(G3,new THREE.CylinderGeometry(1.8,1.8,1,24,1,true),new THREE.MeshBasicMaterial({color:COL(C.mi,.8),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  CACHE.shards=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,.9,.12),new THREE.MeshStandardMaterial({color:'#24364A',metalness:.95,roughness:.2,emissive:C.cy2,emissiveIntensity:1}),46);CACHE.shards.frustumCulled=false;G3.add(CACHE.shards);
  CACHE.wave=[0,1,2].map(()=>addM(G3,new THREE.TorusGeometry(1,.04,8,128),new THREE.MeshBasicMaterial({color:COL(C.cyL,3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));
  CACHE.spot=new THREE.SpotLight(C.cy,700,80,.38,.7,2);CACHE.spot.position.set(0,40,0);CACHE.spot.target.position.set(0,0,0);G3.add(CACHE.spot,CACHE.spot.target);
  CACHE.pl=new THREE.PointLight(C.miL,0,30,2);CACHE.pl.position.set(0,6.5,-1);G3.add(CACHE.pl);
  G3.add(new THREE.HemisphereLight('#203048','#05070A',.6));
}

/* ═══════════ НАБОР «КОПИЛКА»: двадцать башен над водой ═══════════ */
const Bal=n=>10000*(Math.pow(1.01,12*n)-1)/.01;
const TSC=100/9.9e6,TGOAL=5e6*TSC;
let TOW={};
function buildTowers(){const G3=new THREE.Group();SETS.towers=G3;S3.add(G3);
  const tc=winTex(4040,[C.vi,C.mgL,C.am],.45,'#120F22'),ti=winTex(5050,[C.miL,C.mi,C.cyL],.62,'#0C2219');
  const mc=bmat(tc,'#161430',1.6),mi=bmat(ti,'#123526',1.8);
  TOW.t=[];for(let k=0;k<20;k++){const n=k+1,hb=Bal(n)*TSC,hc=120000*n*TSC,x=(k-9.5)*4.6;const grp=new THREE.Group();grp.position.x=x;G3.add(grp);
    const a=bld(3.8,hc,3.8);a.translate(0,hc/2,0);addM(grp,a,mc);const b=bld(3.8,hb-hc,3.8);b.translate(0,hc+(hb-hc)/2,0);addM(grp,b,mi);
    addM(grp,new THREE.BoxGeometry(3.9,.12,3.9),basic(C.mi,2.4),0,hb,0);const bc=sprite(C.rd,1.4,2.2);bc.position.y=hb+1.2;grp.add(bc);
    TOW.t.push({grp,hb,bc});}
  const bgeo=[[],[],[],[],[],[]];for(let i=0;i<90;i++){const x=(rnd(i+1200)-.5)*700,z=-60-rnd(i+1201)*500,w=12+rnd(i+1202)*30,h=30+Math.pow(rnd(i+1203),1.4)*260;const gm=bld(w,h,w);gm.translate(x,h/2,z);bgeo[i%6].push(gm);}
  bgeo.forEach((arr,i)=>G3.add(new THREE.Mesh(mergeGeometries(arr),BM[i])));
  wetGround(G3,800,700,0,150,'#7f8090');
  TOW.goal=addM(G3,new THREE.BoxGeometry(96,.22,.22),basic(C.cy,2.6),0,TGOAL,3);
  TOW.goalP=addM(G3,new THREE.PlaneGeometry(96,TGOAL),new THREE.MeshBasicMaterial({color:COL(C.cy,.08),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,TGOAL/2,3);
  TOW.cars=makeCars(G3,30,140,{x0:-120,x1:120,y0:40,y1:120,z0:-400,z1:-60});
  G3.add(new THREE.HemisphereLight('#3A3060','#0A0A10',.6));
}

/* ═══════════ НАБОР «КВАРТИРА»: рендерится один раз — для погружения ═══════════ */
function buildRoom(phoneTex,viewTex){const G3=new THREE.Group();SETS.room=G3;S3.add(G3);
  const wall=new THREE.MeshStandardMaterial({color:'#17141F',roughness:.8,metalness:.1});
  addM(G3,new THREE.BoxGeometry(40,.4,30),new THREE.MeshStandardMaterial({color:'#1A1620',roughness:.5,metalness:.3}),0,-.2,-5);
  const back=new THREE.Group();G3.add(back);back.position.z=-14;
  addM(back,new THREE.BoxGeometry(40,7,.4),wall,0,3.5,0);addM(back,new THREE.BoxGeometry(40,6,.4),wall,0,22,0);addM(back,new THREE.BoxGeometry(7,12,.4),wall,-16.5,13,0);addM(back,new THREE.BoxGeometry(7,12,.4),wall,16.5,13,0);
  addM(back,new THREE.PlaneGeometry(26,12),new THREE.MeshBasicMaterial({map:viewTex,color:COL('#ffffff',1.15)}),0,13,-.5);
  const rain=ctex(512,256,()=>{for(let i=0;i<260;i++){const x=rnd(i+600)*512,y=rnd(i+601)*256,l=4+rnd(i+602)*16;g.fillStyle=`rgba(200,215,235,${.15+rnd(i+603)*.35})`;g.fillRect(x,y,1.5,l);g.beginPath();g.arc(x,y+l,1.8,0,6.283);g.fill();}});
  addM(back,new THREE.PlaneGeometry(26,12),new THREE.MeshBasicMaterial({map:rain,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),0,13,.3);
  addM(back,new THREE.BoxGeometry(.5,12,.6),new THREE.MeshStandardMaterial({color:'#0C0B10'}),0,13,.2);addM(back,new THREE.BoxGeometry(26,.5,.6),new THREE.MeshStandardMaterial({color:'#0C0B10'}),0,13,.2);
  addM(G3,new THREE.BoxGeometry(.4,26,30),wall,-20,13,-5);addM(G3,new THREE.BoxGeometry(.4,26,30),wall,20,13,-5);addM(G3,new THREE.BoxGeometry(40,.4,30),wall,0,25,-5);
  addM(G3,new THREE.BoxGeometry(36,.18,.18),basic(C.mg,2.6),0,24.5,-13.6);const ml=new THREE.PointLight(C.mg,500,60,2);ml.position.set(0,23,-10);G3.add(ml);
  const desk=new THREE.MeshStandardMaterial({color:'#2A2230',roughness:.35,metalness:.5});addM(G3,new THREE.BoxGeometry(26,.6,9),desk,0,6.2,-6);addM(G3,new THREE.BoxGeometry(.8,6,8),desk,-12,3,-6);addM(G3,new THREE.BoxGeometry(.8,6,8),desk,12,3,-6);
  const mon=ctex(512,320,()=>{R(0,0,512,320,'#081820');for(let i=0;i<12;i++)R(30,30+i*22,120+rnd(i+90)*300,10,i%4?C.cy2:C.cy);});
  addM(G3,new THREE.BoxGeometry(9.6,5.6,.3),new THREE.MeshStandardMaterial({color:'#101219',metalness:.8,roughness:.3}),-6.5,10.8,-8.5);addM(G3,new THREE.PlaneGeometry(9.1,5.1),new THREE.MeshBasicMaterial({map:mon,color:COL('#ffffff',1.4)}),-6.5,10.8,-8.33);
  addM(G3,new THREE.BoxGeometry(.6,2.2,.6),desk,-6.5,7.6,-8.5);const mlg=new THREE.PointLight(C.cy,160,20,2);mlg.position.set(-6.5,10,-6);G3.add(mlg);
  const lamp=new THREE.Group();lamp.position.set(8.5,6.5,-8);G3.add(lamp);addM(lamp,new THREE.CylinderGeometry(.14,.14,6,8),new THREE.MeshStandardMaterial({color:'#B8A98E',metalness:.9,roughness:.25}),0,3,0);
  addM(lamp,new THREE.ConeGeometry(1.4,1.6,24,1,true),new THREE.MeshStandardMaterial({color:'#C9A86A',metalness:.9,roughness:.3,side:THREE.DoubleSide}),-.6,6.2,1).rotation.x=.5;
  const ll=new THREE.PointLight(C.am,420,26,2);ll.position.set(-.6,5.6,1.6);lamp.add(ll);const lg=sprite(C.am,1.3,3);lg.position.set(-.6,5.6,1.6);lamp.add(lg);
  const ph=new THREE.Group();ph.position.set(1.9,9.0,-4.6);G3.add(ph);addM(ph,new THREE.BoxGeometry(2.05,3.75,.22),new THREE.MeshStandardMaterial({color:'#0C0D12',metalness:.9,roughness:.15}));
  const scrM=addM(ph,new THREE.PlaneGeometry(1.8,3.2),new THREE.MeshBasicMaterial({map:phoneTex,color:COL('#ffffff',1.15)}),0,0,.12);
  addM(G3,new THREE.BoxGeometry(1.6,.3,1.2),desk,1.9,6.7,-4.6);addM(G3,new THREE.BoxGeometry(.3,2.4,.3),desk,1.9,7.7,-5.0);
  addM(G3,new THREE.BoxGeometry(5,.4,2.2),new THREE.MeshStandardMaterial({color:'#2B2635',roughness:.5}),-8,6.7,-3.2);
  const plant=new THREE.Group();plant.position.set(13,6.5,-9);G3.add(plant);addM(plant,new THREE.CylinderGeometry(.8,.6,1.4,16),new THREE.MeshStandardMaterial({color:'#3A2F2A'}),0,.7,0);
  for(let k=0;k<9;k++){const l=addM(plant,new THREE.ConeGeometry(.25,3,6),new THREE.MeshStandardMaterial({color:'#1F4A36',roughness:.6}),0,2.4,0);l.rotation.set((rnd(k+800)-.5)*1.2,rnd(k+801)*6,(rnd(k+802)-.5)*1.2);}
  G3.add(new THREE.HemisphereLight('#352B4A','#0A0810',.7));
  return scrM;}

/* ═══ ГЛОБАЛЬНЫЕ ЭФФЕКТЫ ═══ */
const GL=[[1.75,.45,1],[7.0,1.0,.75],[12.95,.75,.85],[26.2,.45,.5],[33.25,.75,.85],[35.35,.65,.8],[36.0,.8,.9],[38.3,.25,.5],[49.0,.5,.7],[53.4,.6,.5],[64.9,.5,.4],
  [79.8,.4,.4],[91.9,.4,.5],[97.45,.5,1],[99.25,.75,.85],[113.5,.3,.4],[118.4,.3,.5]];
function glitchL(t,L){let a=0;L.forEach(([t0,d,A_])=>{const u=(t-t0)/d;if(u>=0&&u<1){const k=Math.floor(t*30);a=Math.max(a,A_*(1-u)*(rnd(k*7+t0)>.22?1:.25));}});return a;}
function glitch(t){let a=0;GL.forEach(([t0,d,A_])=>{const u=(t-t0)/d;if(u>=0&&u<1){const k=Math.floor(t*30);a=Math.max(a,A_*(1-u)*(rnd(k*7+t0)>.22?1:.25));}});return a;}
const SHK=[[19.6,8,.3],[22.55,14,.4],[36.0,10,.8],[38.3,16,.35],[42.3,6,.25],[49.0,22,.6],[52.6,12,.3],[57.4,0,1.0],[58.4,20,.45],[73.95,6,.25],[116.4,4,.15]];
function shake(t){let x=0,y=0;SHK.forEach(([a,A_,d],i)=>{const u=t-a;if(u<0||u>d)return;let amp=A_*(1-u/d);if(a===57.4)amp=2+u*10;const f=Math.floor(t*30);
  x+=(rnd(f*3+i)-.5)*2*amp;y+=(rnd(f*3+i+11)-.5)*2*amp;});return [x,y];}
const FOG={};
/* отрисовать 3D в кадр */
window.PROF={};function render3(){const t0=performance.now();pFlush();DOME.position.copy(CAM.position);COMP.render();const t1=performance.now();g.drawImage(RD.domElement,0,0);const t2=performance.now();PROF.r=t1-t0;PROF.d=t2-t1;PROF.calls=RD.info.render.calls;PROF.tris=RD.info.render.triangles;}
function reset3(){PN=0;COINS.forEach(c=>c.visible=false);HERO.visible=false;RAIN.visible=false;}

/* ═══════════ 1 · ЗАСТАВКА (0–8): терминал → полёт по проспекту ═══════════ */
function sTitle(t){
  show('city');cityAt(t);
  const z=60-26*t-(t>7?260*(t-7)*(t-7):0),fov=55+(t>7?22*io(P_(t,7,1)):0);
  camSet(Math.sin(t*.35)*2.5,13+Math.sin(t*.5)*1.2,z,Math.sin(t*.35)*1.5,15,z-120,fov,Math.sin(t*.4)*.03);
  rainOn(t,.55);render3();
  if(t<2.2){const a=t<1.8?1:1-io(P_(t,1.8,.4));R(0,0,W,H,'#030406',a);
    const LN=[[.15,'> ПОДКЛЮЧЕНИЕ К ГОРОДУ...'],[.75,'> СИГНАЛ ▮▮▮▮▮▮▮▮ ЕСТЬ'],[1.25,'> ЗАГРУЗКА МИРА']];
    if(t<1.9){LN.forEach(([a0,s],i)=>tx(typed(s,t,a0,38),90,820+i*60,F('M',36),i===1?C.mi:C.cy,'l',1));
      const cur=LN.filter(l=>t>=l[0]).length;if(Math.floor(t*3)%2===0){const ly=cur?820+(cur-1)*60:820,lx=cur?96+tw(typed(LN[cur-1][1],t,LN[cur-1][0],38),F('M',36)):96;R(lx+6,ly-20,20,40,C.cy);}}}
  if(t>1.9){const fade=1-P_(t,7.05,.35);
    g.save();g.globalAlpha=.5*P_(t,1.9,.5)*fade;haze(540,780,620,'#030409',1);g.restore();
    neon('НЕОН',540,640,F('TB',236),C.mi,'c',flick(t,1,2.2)*fade,26,6);
    neon('РУБЛЬ',540,868,F('R',214),C.mg,'c',flick(t,2,2.65)*fade,26,4);
    if(t>3.0){const p=out(P_(t,3.0,.5));g.save();g.globalAlpha=fade;g.strokeStyle=C.cy;g.shadowColor=C.cy;g.shadowBlur=12;g.lineWidth=3;g.beginPath();g.moveTo(540-360*p,990);g.lineTo(540+360*p,990);g.stroke();g.restore();}
    if(t>3.3&&panel(110,1030,860,96,C.cy,popen(t,3.3)*fade))tx(typed('КАК РУБЛЮ ВЫЖИТЬ В НОЧНОМ ГОРОДЕ?',t,3.6,34),540,1079,F('M',34),C.ink,'c',fade);
    tx('ПРО ДЕНЬГИ БЕЗ ВОДЫ',540,1178,F('M',28),C.dim,'c',P_(t,4.6,.4)*fade,6);
    if(t>5.4&&panel(300,1240,480,210,C.mi,popen(t,5.4)*fade)){const M=['НАЧАТЬ ИГРУ','ЗАГРУЗИТЬ','НАСТРОЙКИ'];
      M.forEach((m,i)=>{const sel=i===0&&t>6.6&&Math.floor(t*12)%2===0;if(sel)R(318,1262,444,52,C.mi,.9);tx(m,380,1288+i*58,F('M',32),sel?C.bg0:i===0?C.ink:C.mute,'l',fade);});
      if(Math.floor(t*2.5)%2===0||t>6.6)triR(350,1288,13,t>6.6&&Math.floor(t*12)%2===0?C.bg0:C.mi);}}
  flash(P_(t,7.6,.4)*.5,C.cyL);
}

/* ═══════════ 2 · КАРТА (8–14, 34–36) ═══════════ */
function sMap(t){
  show('map');S3.fog=null;domeCols('#03050A','#0A1620','#0E2630');
  const inter=t>=30,t0=inter?34:8,d1=routeLen(3),d2=routeLen(6);
  const dist=inter?lerp(d1,d2,io(P_(t,34.15,1.15))):d1*io(P_(t,9.0,2.6));
  const mk_=routeAt(dist),dive=inter?io(P_(t,35.35,.65)):io(P_(t,12.95,1.05));
  const tg=inter?routeAt(lerp(d1,d2,io(P_(t,34.0,1.3)))):routeAt(d1*io(P_(t,8.6,3.2)));
  const yaw=(inter?.5:-.55)+(t-t0)*.09,pitch=lerp(.88,1.3,dive),D=lerp(inter?2000:2300,inter?1800:1900,P_(t,t0,5))*(1-dive*.88);
  camSet(tg[0]+Math.sin(yaw)*Math.cos(pitch)*D,Math.sin(pitch)*D,tg[1]+Math.cos(yaw)*Math.cos(pitch)*D,tg[0],0,tg[1],50);
  const n=Math.floor(MAP.tubeN*dist/MAP.total);MAP.tube.geometry.setDrawRange(0,n*8*6);
  MAP.scan.forEach((m,k)=>{const u=((t-t0)/2.6+k*.5)%1;m.scale.setScalar(20+u*2600);m.material.opacity=.7*(1-u);});
  MAP.nodes.forEach((r,i)=>r.scale.setScalar(1+.15*Math.sin(t*5+i)));
  heroAt(mk_[0],40,mk_[1],t,{s:16,nojet:true,happy:true});
  for(let i=0;i<60;i++){const x=(rnd(i+70)-.5)*2600,z=(rnd(i+71)-.5)*3400,y=((rnd(i+72)*400+t*40)%400);pAdd(x,y,z,C.cy,.6,6);}
  render3();
  NODE.forEach(([x,z,s,col],i)=>{if(dive>.2)return;const q=scr(x,520,z);if(q[2]>1)return;const w=tw(s,F('M',30))+44;if(panel(q[0]-w/2,q[1]-58,w,56,col,popen(t,t0+.3+i*.25),.85))tx(s,q[0],q[1]-29,F('M',30),col,'c');});
  const hdr=1-dive;if(panel(60,190,960,84,C.cy,popen(t,t0+.05)*hdr)){tx('КАРТА ГОРОДА',96,233,F('M',32),C.cy,'l',hdr,3);tx('ДЕНЬ 1',984,233,F('M',32),C.dim,'r',hdr);}
  const bn=inter?'БОСС · ИНФЛЯЦИЯ':'УРОВЕНЬ 1 · ДЕНЬ РУБЛЯ',bc=inter?C.rd:C.mi,bt=inter?34.9:11.5,bw=tw(bn,F('T',44))+80;
  if(t>bt&&panel(540-bw/2,300,bw,92,bc,popen(t,bt)*hdr))neon(bn,540,347,F('T',44),bc,'c',hdr,12);
  if(dive>0)flash(dive*dive*.6,inter?C.rd:C.mi);
}

/* ═══════════ 3 · УЛИЦА «ДЕНЬ РУБЛЯ» (14–34) ═══════════ */
function wallet(t){return track(t,[[0,0],[15.4,.25],[16.2,.5],[16.9,.75],[17.5,1],[19.6,.75],[22.55,.35],[29.85,.3],[29.95,.25],[30.05,.2],[30.15,.15],[30.25,.1],[30.35,.05],[30.45,0]],x=>spr(x,18));}
function kop(t){return track(t,[[0,0],[29.85,.05],[29.95,.1],[30.05,.15],[30.15,.2],[30.25,.25],[30.35,.3],[30.45,.35]],x=>spr(x,18));}
function sStreet(t){
  show('street');streetAt(t);
  const xc=xcam(t),hx=xc-3.4,hy=3.7,hz=1.5;
  camSet(xc,7.2,31,xc,8.4,0,55);
  const hurt=(t>19.6&&t<19.95)||(t>22.55&&t<22.95),happy=t>32.4;
  heroAt(hx,hy,hz,t,{hurt,happy,s:1.25});
  STR.pk.forEach((m,i)=>{const tc=[15.4,16.2,16.9,17.5][i],u=(t-(tc-.55))/.55;m.visible=u>=0&&u<=1;if(!m.visible)return;
    m.position.set(bez(WSAL,(WSAL+hx)/2,hx,u),bez(9.4,13,hy,u),bez(-6.8,-2,hz,u));m.rotation.set(t*5,t*7,0);});
  {const u=(t-19.2)/.4;if(u>=0&&u<=1)coinAt(0,bez(hx,(hx+WCOF)/2,WCOF,u),bez(hy,8,3.2,u),bez(hz,0,-5.8,u),t,C.am);}
  for(let k=0;k<7;k++){const tc=29.85+k*.1,u=(t-(tc-.3))/.3;if(u<0||u>1)continue;coinAt(1+k,bez(hx,(hx+WVAU)/2,WVAU,u),bez(hy,7.5,3.3,u),bez(hz,0,-6.8,u),t,C.mi);}
  const sub=STR.sub;sub.visible=t<26.6;if(sub.visible){sub.material.opacity=t>26.2?.3+.7*rnd(Math.floor(t*30)):.75+.25*Math.sin(t*6);sub.position.x=WSUB+(t>26.2?(rnd(Math.floor(t*30)+3)-.5)*1.2:0);}
  STR.tether.visible=t>25.3&&t<26.4;if(STR.tether.visible){const p=STR.tether.geometry.attributes.position;for(let i=0;i<24;i++){const u=i/23;p.setXYZ(i,bez(WSUB-3.5,(WSUB+hx)/2,hx+.6,u),bez(7.2,1.5,hy,u)+Math.sin(u*9+t*12)*.15,bez(-3,0,hz,u));}
    p.needsUpdate=true;STR.tether.computeLineDistances();}
  burst3(t,26.6,90,WSUB,9,-3,22,2600,[C.mgL,C.vi,C.mg,C.vi2],1.2,10,.55);
  burst3(t,22.55,40,hx+.6,hy,hz,14,3100,[C.rdL,C.rd,C.rd2],.7,9,.4);burst3(t,19.6,26,hx+.5,hy,hz,11,3200,[C.amL,C.am,C.am2],.6,9,.35);
  burst3(t,32.45,60,hx,hy+2,hz,16,3300,[C.miL,C.mi,C.cy],1.1,6,.45);
  if(t>26.2&&t<26.6)for(let i=0;i<40;i++){const an=i/40*6.283,r=(t-26.2)*28;pAdd(hx+Math.cos(an)*r,hy+Math.sin(an)*r,hz,C.mi,1.6*(1-(t-26.2)/.4),.5);}
  const taxi=STR.taxi;taxi.visible=t>21.8&&t<23.4;if(taxi.visible){const u=(t-21.9)/1.3;taxi.position.set(xc+lerp(17,-17,u),9.5-4.6*Math.sin(Math.PI*cl(u)),hz+1.2);taxi.rotation.set(0,0,Math.cos(Math.PI*u)*.12);}
  rainOn(t,.5);render3();
  const hs_=scr(hx,hy+1.6,hz);
  [15.4,16.2,16.9,17.5].forEach(tc=>floatTxt(t,tc,'+0,25',hs_[0],hs_[1]-40,F('T',46),C.mi));
  floatTxt(t,19.6,'-0,25',hs_[0],hs_[1]-50,F('T',52),C.rd);floatTxt(t,22.55,'-0,40',hs_[0],hs_[1]-50,F('T',52),C.rd);
  if(t>26.9&&t<28.1){const q=scr(WSUB,9,-3),u=P_(t,26.9,.25),a=t<27.8?1:1-P_(t,27.8,.3);g.save();g.translate(q[0],q[1]);g.rotate(-.12);g.scale(lerp(1.6,1,out(u)),lerp(1.6,1,out(u)));
    g.globalAlpha=a;g.strokeStyle=C.mi;g.lineWidth=5;g.shadowColor=C.mi;g.shadowBlur=16;g.strokeRect(-200,-50,400,100);g.restore();neon('ОТМЕНЕНА',q[0],q[1],F('T',56),C.mi,'c',a,10);}
  if(panel(60,190,960,110,C.cy,popen(t,14.15))){tx('ДЕНЬ 1',96,226,F('M',30),C.cy,'l',1,3);tx('23:47',96,268,F('M',28),C.dim,'l');
    tx('КОШЕЛЁК',984,224,F('M',24),C.dim,'r',1,2);neon(rub(wallet(t))+'₽',984,266,F('T',48),C.mi,'r',1,8);}
  if(t>29.7&&panel(600,322,420,72,C.cy,popen(t,29.7))){tx('КОПИЛКА',630,358,F('M',26),C.dim,'l',1,2);neon(rub(kop(t))+'₽',990,358,F('T',40),C.cy,'r',1,8);}
  const LG=[[17.6,'ЗАРПЛАТА','+1,00',C.mi],[20.2,'КОФЕ','-0,25',C.rd],[23.4,'ТАКСИ','-0,40',C.rd],[27.2,'ПОДПИСКА','0,00',C.dim]];
  if(t>17.4&&panel(60,322,500,250,C.mi,popen(t,17.4)*(1-P_(t,30.9,.3)))){LG.forEach(([t0,a,b,col],i)=>{if(t<t0)return;const p=P_(t,t0,.25),y=370+i*50;tx(a,92,y,F('M',30),C.ink,'l',p);tx(b,528,y,F('M',30),col,'r',p);
      if(i===3&&t>27.4){const s=P_(t,27.4,.3);R(92,y,436*s,3,C.rd);}});}
  if(t>31.0){const o=popen(t,31.0)*(1-P_(t,33.3,.3));if(panel(120,620,840,470,C.mi,o,.86)){tx('ОСТАТОК ЗА ДЕНЬ',540,680,F('M',28),C.dim,'c',1,4);
      tx('0,35₽ × 365 ДНЕЙ',540,770,F('T',58),C.ink,'c');R(220,832,640,2,C.mi2);const v=track(t,[[0,0],[31.6,127.75]],x=>spr(x,5));neon(rub(v)+'₽',540,930,F('TB',124),C.mi,'c',1,20);
      if(t>32.45){const u=P_(t,32.45,.22);g.save();g.translate(540,1030);g.rotate(-.06);g.scale(lerp(1.7,1,out(u)),lerp(1.7,1,out(u)));g.globalAlpha=u;g.strokeStyle=C.mi;g.lineWidth=4;g.strokeRect(-200,-30,400,60);g.restore();
        tx('ДЕНЬ ПРОЙДЕН',540,1028,F('M',32),C.mi,'c',u,3);}}}
  flash(t>33.3?P_(t,33.3,.7)*.5:0,C.cyL);
}

/* ═══════════ 4 · БОСС «ИНФЛЯЦИЯ» (36–54) ═══════════ */
function sBoss(t){
  show('boss');S3.fog=FOG.boss;domeCols('#050306','#1E0A10','#3A1018');
  const tt=hs(t,[[38.3,.08],[49.0,.14]]);
  const push=io(P_(t,52.9,1.1));
  camSet(Math.sin(tt*.3)*1.2*(1-push),lerp(10,5.5,push),lerp(40,12,push),0,lerp(5,2.2,push),lerp(-20,-2,push),55);
  BOSS.cols.forEach((m,i)=>{m.material.map.offset.y=-tt*(.18+i*.04);});
  const mat=Math.min(1,spr(tt-36.0,5)),brk=Math.max(0,tt-49.0),yaw=tt*.5,by=BPOS.y+Math.sin(tt*1.6)*.5,R_=8.4;
  const cmpA=t>43.3&&t<47.6?1-.6*cl(Math.min(P_(t,43.3,.3),1-P_(t,47.3,.3))):1;
  const alive=tt<51.0;BOSS.edges.visible=alive;BOSS.shell.visible=alive&&brk<.3;BOSS.core.visible=alive&&brk<.35;BOSS.pupil.visible=BOSS.core.visible;BOSS.glow.visible=alive;
  if(alive){const cy_=Math.cos(yaw),sy_=Math.sin(yaw);const P=ICO.V.map((v,i)=>{let [x,y,z]=v;[x,z]=[x*cy_-z*sy_,x*sy_+z*cy_];const sc=1-mat;x+=(rnd(i)*2-1)*3*sc;y+=(rnd(i+.3)*2-1)*3*sc;z+=(rnd(i+.6)*2-1)*3*sc;
      if(brk>0){const d=brk*brk*2.4+brk*1.4;x+=v[0]*d;y+=v[1]*d-brk*brk*.9;z+=v[2]*d;}return new V3(BPOS.x+x*R_,by+y*R_,BPOS.z+z*R_);});
    const jit=(Math.floor(tt*30)%23===0)?(rnd(Math.floor(tt*30))-.5)*1.6:0;
    ICO.E.forEach(([a,b],i)=>{_a.copy(P[a]);_b.copy(P[b]);if(brk>0){const s=1-cl(brk/1.6);_c.addVectors(_a,_b).multiplyScalar(.5);_a.lerp(_c,1-s);_b.lerp(_c,1-s);}_a.x+=jit;_b.x+=jit;edgeTube(BOSS.edges,i,_a,_b,1.4);});
    BOSS.edges.instanceMatrix.needsUpdate=true;BOSS.edges.material.color.copy(COL(C.rd,2.6*cmpA));
    BOSS.shell.position.set(BPOS.x+jit,by,BPOS.z);BOSS.shell.rotation.set(.3,yaw,0);BOSS.shell.scale.setScalar(Math.max(.01,mat));BOSS.shell.material.opacity=.42*cmpA;
    BOSS.core.position.set(BPOS.x+jit,by,BPOS.z);BOSS.core.lookAt(CAM.position);BOSS.core.scale.setScalar(Math.max(.01,mat)*(tt>37.9&&tt<38.35?1+P_(tt,37.9,.4)*.3:1));
    const hot=tt>49.0&&tt<49.3;BOSS.core.material.color.copy(COL('#ffffff',hot?3:1.6*cmpA));
    _c.subVectors(HB,BOSS.core.position).normalize();BOSS.pupil.position.copy(BOSS.core.position).addScaledVector(_c,2.9*mat);BOSS.pupil.lookAt(HB);BOSS.pupil.scale.set(.55*mat,1.25*mat,.3*mat);
    BOSS.glow.position.set(BPOS.x,by,BPOS.z);BOSS.glow.material.color.copy(COL(C.rd,(.7+(tt>37.9&&tt<38.4?1:0))*cmpA*mat));BOSS.light.intensity=1500*mat*(1-cl(brk));}
  burst3(t,49.0,160,BPOS.x,BPOS.y,BPOS.z,60,4000,[C.rdL,C.rd,C.rd2,C.mg2],1.6,14,1.1);
  BOSS.beamR.visible=tt>38.3&&tt<38.6;if(BOSS.beamR.visible){const a=1-P_(tt,38.3,.3);beamTo(BOSS.beamR,BPOS,HB,1.3*a+.1,C.rd,2.4*a);}
  BOSS.beamG.visible=tt>48.9&&tt<49.5;if(BOSS.beamG.visible){const a=1-P_(tt,49.1,.4);beamTo(BOSS.beamG,HB,BPOS,2*a+.1,C.mi,3*a);}
  burst3(t,38.3,40,HB.x,HB.y,HB.z,14,4100,[C.rdL,C.rd,C.rd2],.7,8,.5);
  const nH=tt>41.9?Math.min(12,Math.floor((tt-41.9)/.05)+1):0;BOSS.hex.count=nH;BOSS.hex.visible=nH>0&&tt<51.5;
  for(let i=0;i<nH;i++){const an=i/12*6.283+tt*.4;_a.set(HB.x+Math.cos(an)*3.1,HB.y+Math.sin(an)*3.1,HB.z);_m.compose(_a,CAM.quaternion,_s.set(1,1,1));BOSS.hex.setMatrixAt(i,_m);}
  BOSS.hex.instanceMatrix.needsUpdate=true;BOSS.hex.material.color.copy(COL(C.mi,tt>42.3&&tt<42.6?4:2.2));
  implode3(tt,47.9,1.0,80,HB.x,HB.y,HB.z,9,5000,C.mi);
  heroAt(HB.x,HB.y,HB.z,tt,{hurt:tt>38.3&&tt<38.8,happy:tt>50.8,hot:tt>47.9&&tt<49.2,s:1.6});
  const cr=BOSS.crate;cr.visible=t>52.3;if(cr.visible){cr.position.set(0,lerp(40,2.1,cl(sprO(t-52.3,9,.45),0,1.08)),-2);cr.rotation.set(0,.5,0);cr.scale.setScalar(.7);crateAt(cr,t,0);}
  render3();
  if(tt>47.9&&tt<48.95){const q=scr(HB.x,HB.y,HB.z),u=P_(tt,47.9,1.05);g.save();g.strokeStyle=rgba(C.miL,.8);g.lineWidth=4;g.beginPath();g.arc(q[0],q[1],lerp(260,70,u),0,6.283);g.stroke();g.restore();}
  flash(t>49.0?.6*Math.exp(-(t-49.0)*5):0,C.miL);flash(t>38.3&&t<38.8?.3*(1-P_(t,38.3,.5)):0,C.rd);
  const hq=scr(HB.x,HB.y+1.8,HB.z);floatTxt(tt,38.35,'-7,4%',hq[0],hq[1]-40,F('T',56),C.rd);floatTxt(tt,42.35,'+12%',hq[0],hq[1]-60,F('T',56),C.mi);
  const ui=1-push,hp=1-io(P_(tt,49.0,.7));
  if(panel(60,180,960,90,C.rd,popen(t,36.4)*ui)){tx('ИНФЛЯЦИЯ',96,225,F('M',32),C.rd,'l',1,3);R(380,212,600,26,'#1E0B0E');R(380,212,600*hp,26,C.rd);R(380,212,600*hp,6,C.rdL,.6);}
  const pw=track(tt,[[0,100],[38.3,92.6]],x=>spr(x,10));
  if(panel(60,1090,430,140,C.mi,popen(t,36.6)*ui)){tx('РУБЛИК',92,1130,F('M',30),C.mi,'l',1,2);tx('СИЛА',92,1186,F('M',26),C.dim,'l');R(180,1176,170,20,'#0E2019');R(180,1176,170*pw/100,20,C.mi);
    tx(pw.toFixed(1).replace('.',',')+'%',462,1186,F('T',36),C.ink,'r');}
  if(t>40.2&&t<48.2){const o=popen(t,40.2)*(1-P_(t,47.9,.3));if(panel(520,1070,360,230,C.cy,o)){const M=['АТАКА','ВКЛАД','ВРЕМЯ','ВЫЙТИ'],cur=t<40.8?0:t<47.0?1:2;
      M.forEach((m,i)=>{const sel=i===cur&&((t>41.2&&t<41.6)||(t>47.4&&t<47.8))&&Math.floor(t*12)%2===0;if(sel)R(536,1092+i*50,328,46,C.cy,.9);tx(m,600,1115+i*50,F('M',32),sel?C.bg0:i===cur?C.ink:C.mute,'l');});
      if(Math.floor(t*2.5)%2===0)triR(568,1115+cur*50,12,C.cy);}}
  const MS=[[36.8,'ИНФЛЯЦИЯ АТАКУЕТ!',''],[38.4,'СИЛА РУБЛЯ -7,4%','ИНФЛЯЦИЯ 8% УСЛОВНО'],[41.3,'ВКЛАД: 12% В ГОД','СТАВКА УСЛОВНАЯ'],[47.5,'СУПЕРУДАР: ВРЕМЯ!',''],[50.8,'ПОБЕДА! ПОКА ВКЛАД','ВЫШЕ ИНФЛЯЦИИ']];
  let m=null;MS.forEach(x=>{if(t>=x[0])m=x;});
  if(m&&panel(60,1330,960,140,C.dim,popen(t,36.7)*(1-P_(t,52.9,.3)))){tx(typed(m[1],t,m[0],32),96,1376,F('M',34),C.ink,'l');tx(typed(m[2],t,m[0]+.55,32),96,1428,F('M',28),C.dim,'l');}
  if(t>43.3&&t<47.8){const o=popen(t,43.3)*(1-P_(t,47.4,.3));if(panel(60,300,960,520,C.cy,o,.88)){
      const a=12*sprO(t-43.7,9),b=8*sprO(t-44.3,9),S=55;tx('ВКЛАД',100,360,F('M',30),C.mi,'l',1,2);R(100,392,a*S,40,C.mi);tx(a.toFixed(0)+'%',100+a*S+18,413,F('T',38),C.ink,'l');
      tx('ИНФЛЯЦИЯ',100,476,F('M',30),C.rd,'l',1,2);R(100,508,b*S,40,C.rd);tx(b.toFixed(0)+'%',100+b*S+18,529,F('T',38),C.ink,'l');
      if(t>45.3){const p=P_(t,45.3,.3);g.save();g.strokeStyle=C.cyL;g.lineWidth=2;g.setLineDash([8,8]);g.globalAlpha=p;g.beginPath();g.moveTo(100+8*S,380);g.lineTo(100+8*S,566);g.moveTo(100+12*S,380);g.lineTo(100+12*S,566);g.stroke();
        g.setLineDash([]);g.lineWidth=3;g.beginPath();g.moveTo(100+8*S,576);g.lineTo(100+12*S,576);g.stroke();g.restore();}
      if(t>45.6)tx('1,12 : 1,08 = 1,037',540,656,F('T',52),C.ink,'c',P_(t,45.6,.3));
      if(t>46.2)neon('+3,7% РЕАЛЬНО',540,750,F('TB',70),C.mi,'c',P_(t,46.2,.2),16);}}
  flash(t>53.6?P_(t,53.6,.4)*.55:0,C.cyL);
}

/* ═══════════ 5 · ТАЙНИК: награда в пять фаз (54–66) ═══════════ */
const HITS=[61.4,61.75,62.1,62.45,62.8],SCR='0123456789ABCDEF#%';
function sCache(t){
  show('cache');S3.fog=FOG.cache;domeCols('#04060A','#0A1420','#0E2230');
  const tt=hs(t,[[58.4,.1]]),up=io(P_(t,64.9,1.1));
  camSet(Math.sin(tt*.25)*2.5,9.2+up*30,16-up*4,0,lerp(3.0,60,up),0,55);
  const cr=CACHE.crate,opened=tt>=58.4;cr.visible=!opened;
  if(!opened){cr.position.set(0,3.4+Math.sin(tt*2)*.15,0);cr.rotation.set(0,.35+tt*.15,0);crateAt(cr,tt,P_(tt,55.6,1.8)+P_(tt,57.4,1),tt>57.4?(tt-57.4)*.35:0);}
  CACHE.orb.forEach((o,i)=>{const ta=[55.6,55.9,56.2][i];o.visible=!opened&&tt>ta;if(!o.visible)return;const p=out(P_(tt,ta,.4)),Rr=Math.max(.01,lerp(7.5,4.4,P_(tt,57.4,1))*p),sp=tt>57.4?6:1.4;
    o.position.set(0,3.4,0);o.scale.setScalar(Rr);o.rotation.set(1.2+i*.35,tt*.2+i,i*.6);o.userData.sat.position.set(Math.cos(tt*sp+i*2),Math.sin(tt*sp+i*2),0);});
  implode3(tt,57.4,1.0,120,0,3.4,0,14,6000,C.miL);
  CACHE.spot.intensity=700+(opened?0:P_(tt,57.4,1)*1200);CACHE.pl.intensity=opened?1200*Math.exp(-(t-58.4)*3):P_(tt,57.4,1)*200;
  CACHE.shards.visible=opened&&t<60.6;if(CACHE.shards.visible){const u=t-58.4;for(let i=0;i<46;i++){const th=rnd(i+1100)*6.283,ph=Math.acos(2*rnd(i+1101)-1),v=6+rnd(i+1102)*14,d=v*(1-Math.exp(-2.5*u))/2.5;
      _a.set(Math.sin(ph)*Math.cos(th)*d,3.4+Math.cos(ph)*d-4*u*u,Math.sin(ph)*Math.sin(th)*d);_q.setFromEuler(new THREE.Euler(u*(3+i%5),u*(2+i%3),u));_m.compose(_a,_q,_s.setScalar(Math.max(.01,1-cl(u/2.2))));CACHE.shards.setMatrixAt(i,_m);}
    CACHE.shards.instanceMatrix.needsUpdate=true;}
  CACHE.wave.forEach((w,k)=>{const u=(t-58.4-k*.08)/.8;w.visible=u>0&&u<1;if(!w.visible)return;w.position.set(0,3.4,0);w.quaternion.copy(CAM.quaternion);w.scale.setScalar(1+out(u)*26);w.material.color.copy(COL(C.cyL,3*(1-u)));});
  burst3(t,58.4,180,0,3.4,0,40,7000,[C.ink,C.cyL,C.cy,C.cy2],1.4,8,.6);
  const ph_=t-64.5;CACHE.pillar.visible=CACHE.pillarG.visible=ph_>0;if(ph_>0){const h=Math.max(.01,lerp(0,90,io(P_(t,64.5,.6))));for(const m of [CACHE.pillar,CACHE.pillarG]){m.scale.set(1,h,1);m.position.set(0,3.4+h/2,0);}}
  render3();
  if(opened&&t<60.5){const a=1-P_(t,58.4,2.1),q=scr(0,3.4,0);g.save();g.globalCompositeOperation='lighter';g.translate(q[0],q[1]);g.rotate(t*.4);for(let k=0;k<14;k++){g.rotate(6.283/14);g.fillStyle=rgba(k%2?C.cy:C.mi,.14*a);g.beginPath();g.moveTo(0,0);g.lineTo(1400,-70);g.lineTo(1400,70);g.closePath();g.fill();}g.restore();}
  flash(t>58.4?.66*Math.exp(-(t-58.4)*5):0,C.miL);
  if(t<57.5&&panel(150,560,780,90,C.am,popen(t,54.2)*(1-P_(t,57.2,.3))))tx('ЗАШИФРОВАННЫЙ ТАЙНИК',540,606,F('M',34),C.amL,'c',1,2);
  if(t>55.7&&t<57.6&&panel(120,1290,840,130,C.cy,popen(t,55.7)*(1-P_(t,57.3,.3)))){const p=P_(t,55.8,1.2);tx('ДЕШИФРОВКА',150,1330,F('M',28),C.cy,'l',1,3);tx(Math.round(p*100)+'%',930,1330,F('T',34),C.ink,'r');
    R(150,1370,780,18,'#0E1A22');R(150,1370,780*p,18,C.cy);let s='';for(let k=0;k<14;k++)s+=SCR[Math.floor(rnd(Math.floor(t*20)*3+k)*16)]+(k%2?' ':'');tx(s,150,1404,F('M',20),C.cy2,'l');}
  const fade=1-P_(t,64.9,.4);
  if(t>59.0){const u=sprO(t-59.0,7),cy_=lerp(980,560,u),w=lerp(80,660,cl(u,0,1.1));if(panel(540-w/2,cy_-110,w,220,C.mi,cl(u*1.6)*fade,.86)){
      tx('НАГРАДА',540,cy_-62,F('M',30),C.dim,'c',1,4);const S='127,75₽';let s='';for(let i=0;i<S.length;i++)s+=t>59.35+i*.08?S[i]:SCR[Math.floor(rnd(Math.floor(t*24)*7+i)*SCR.length)];
      neon(s,540,cy_+30,F('TB',112),C.mi,'c',1,18);}
    if(t>60.4){const a=P_(t,60.4,.25)*fade;g.globalAlpha=a;tri(395,cy_+152,16,C.mi);g.globalAlpha=1;tx('+127,75₽',425,cy_+150,F('T',44),C.mi,'l',a);}}
  if(t>60.9){const n=HITS.filter(h=>t>=h).length,bump=HITS.reduce((s,h)=>s+(t>h?Math.exp(-(t-h)*12)*Math.cos((t-h)*30):0),0);
    if(panel(600,180,420,100,C.cy,popen(t,60.9)*fade)){tx('КОПИЛКА',630,230,F('M',26),C.dim,'l',1,2);neon(rub(n*25.55)+'₽',990,230-bump*10,F('T',46),C.cy,'r',1,10);}
    HITS.forEach((h,k)=>{const t0=h-.45;if(t>t0&&t<h){const u=(t-t0)/.45,x=bez(540,300+k*40,900,u),y=bez(560,300,230,u);g.save();g.shadowColor=C.mi;g.shadowBlur=16;g.strokeStyle=C.mi;g.lineWidth=6;g.fillStyle='#0B1F18';
      g.beginPath();g.arc(x,y,20,0,6.283);g.fill();g.stroke();g.restore();}});
    HITS.forEach(h=>{if(t>h&&t<h+.3)haze(900,230,90,C.cy,.5*(1-(t-h)/.3));});}
  if(t>63.0)tx('25,55 × 5 = 127,75',540,1360,F('M',36),C.dim,'c',P_(t,63.0,.3)*fade);
}

/* ═══════════ 6 · ГОРОД-КОПИЛКА (66–80) ═══════════ */
function sCity(t,still=false){
  show('towers');S3.fog=FOG.towers;domeCols('#04040A','#2A1B44','#5A2346');carsAt(TOW.cars,t);
  const dl=P_(t,66,14);camSet(lerp(30,14,dl),lerp(70,58,dl),lerp(150,178,dl),lerp(4,0,dl),48,0,55);
  TOW.t.forEach((o,k)=>{const ta=67.0+k*.45,p=cl(sprO(t-ta,9,.7),0,1.08);o.grp.visible=p>0;o.grp.position.y=-o.hb*(1-p);o.bc.visible=Math.sin(t*4+k)>0;});
  const hit=t>73.95;TOW.goal.material.color.copy(COL(hit?C.mi:C.cy,hit?3.2+(t<74.5?3*(1-P_(t,73.95,.5)):0):2.2));TOW.goalP.material.color.copy(COL(hit?C.mi:C.cy,.08));
  if(!still)rainOn(t,.45*(1-P_(t,79.2,.6)));
  render3();
  const gq=scr(-48,TGOAL,3);tx('ЦЕЛЬ 5 000 000₽',70,gq[1]-30,F('M',28),hit?C.mi:C.cy,'l');
  if(t>74.1&&t<76.9&&panel(70,gq[1]-200,560,96,C.mi,popen(t,74.1)*(1-P_(t,76.6,.3))))neon('ЦЕЛЬ — НА 16-Й ГОД',350,gq[1]-152,F('T',44),C.mi,'c',1,10);
  const yr=cl((t-67.0)/.45+1,0,20),val=yr<=0?0:Bal(Math.min(20,Math.max(0,yr-1+spr(((t-67.0)%.45),14))));
  if(panel(60,180,960,280,C.mi,popen(t,66.3))){tx('КОПИЛКА · 20 ЛЕТ',96,226,F('M',30),C.dim,'l',1,3);neon(fmt(val)+'₽',96,320,F('TB',96),C.mi,'l',1,16);
    tx('ГОД '+String(Math.floor(yr)).padStart(2,'0'),984,320,F('M',32),C.ink,'r');tx('10 000₽ В МЕСЯЦ · 12% УСЛОВНО',96,412,F('M',28),C.dim,'l');}
  if(t>76.6&&panel(70,520,560,200,C.vi,popen(t,76.6))){const a=P_(t,77.0,.3),b=P_(t,77.6,.3);
    tx('ВЗНОСЫ',100,572,F('M',28),C.dim,'l',a);R(290,558,97*out(a)*.58,28,C.vi);tx('2,4 МЛН',600,572,F('T',34),C.ink,'r',a);
    tx('ПРОЦЕНТЫ',100,660,F('M',28),C.dim,'l',b);R(290,646,303*out(b)*.58,28,C.mi);tx('7,5 МЛН',600,660,F('T',34),C.mi,'r',b);}
}

/* ═══════════ 7 · ПОГРУЖЕНИЕ (80–92): город → квартира → телефон → цифра → рубль ═══════════ */
const DV=[[80.6,82.4],[83.2,85.0],[85.8,87.6],[88.3,90.1]],DL=['ГОРОД','КВАРТИРА','ТЕЛЕФОН','ЦИФРА','ОДИН РУБЛЬ'];
const DIVE=[],DR=[],TRACES=[];
function onC(c,fn){const k=g;g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);fn();g=k;}
function buildDive(){
  const L0=mk(W,H);onC(L0,()=>{reset3();sCity(79.95,true);});
  {const o=TOW.t[19],q=scr((19-9.5)*4.6,o.hb-8,1.95),h=48,w=27;DR[0]=[q[0]-w/2,q[1]-h/2,w,h];}
  const L2=mk(W,H);let r5=null;onC(L2,()=>{R(0,0,W,H,'#0A0F14');R(0,0,W,260,'#0E1A17');tx('КОПИЛКА',540,180,F('M',52),C.mi,'c',1,6);
    tx('ЧЕРЕЗ 20 ЛЕТ',540,420,F('M',40),C.dim,'c',1,4);const S='9 892 554₽',f=F('TB',140);g.font=f;const tot=g.measureText(S).width;let x=540-tot/2;
    for(let i=0;i<S.length;i++){const ch=S[i],w=g.measureText(ch).width;if(i===6){r5=[x,w];}else neon(ch,x+w/2,600,f,C.mi,'c',1,14);x+=w;}
    R(120,720,840,2,C.line);[['ВЗНОСЫ','2 400 000'],['ПРОЦЕНТЫ','7 492 554'],['СТАВКА','12% УСЛ.']].forEach(([a,b],i)=>{tx(a,140,800+i*80,F('M',40),C.dim,'l');tx(b,940,800+i*80,F('M',40),C.ink,'r');});
    g.strokeStyle=C.mi;g.lineWidth=5;g.beginPath();for(let i=0;i<=40;i++){const x=140+i*20,y=1360-Bal(i/2)*1e-4*.36;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
    R(140,1500,800,140,C.mi);tx('ПОПОЛНИТЬ',540,1572,F('MB',48),C.bg0,'c',1,4);});
  {const h=110,w=h*9/16;DR[2]=[r5[0]+r5[1]/2-w/2,600-h/2-4,w,h];}
  const B5=['11111','10000','11110','00001','00001','10001','01110'];
  const L3=mk(W,H);onC(L3,()=>{R(0,0,W,H,'#0A0F14');const cw=108,ch=192,gp=18,ox=(W-5*cw-4*gp)/2,oy=(H-7*ch-6*gp)/2;
    B5.forEach((row,r)=>[...row].forEach((v,q)=>{const x=ox+q*(cw+gp),y=oy+r*(ch+gp);if(v==='1'){R(x,y,cw,ch,'#0C1A15');g.save();g.strokeStyle=C.mi;g.lineWidth=4;g.shadowColor=C.mi;g.shadowBlur=12;g.strokeRect(x+2,y+2,cw-4,ch-4);g.restore();
      for(let k=0;k<4;k++){R(x-8,y+30+k*40,8,4,C.mi2);R(x+cw,y+30+k*40,8,4,C.mi2);}g.save();g.shadowColor=C.mi;g.shadowBlur=12;g.strokeStyle=C.mi;g.lineWidth=6;g.fillStyle='#0B1F18';g.beginPath();g.arc(x+cw/2,y+ch/2,22,0,6.283);g.fill();g.stroke();g.restore();}
      else{g.strokeStyle='#14211D';g.lineWidth=2;g.strokeRect(x+2,y+2,cw-4,ch-4);}}));});
  DR[3]=[(W-5*108-4*18)/2+2*126,(H-7*192-6*18)/2+2*210,108,192];
  const L4=mk(W,H);onC(L4,()=>{R(0,0,W,H,'#08110E');g.strokeStyle=C.mi;g.lineWidth=36;g.strokeRect(18,18,W-36,H-36);
    for(let i=0;i<34;i++){const sd=i*7+900,side=i%4;let x,y;if(side===0){x=80+rnd(sd)*920;y=60;}else if(side===1){x=1020;y=80+rnd(sd)*1760;}else if(side===2){x=80+rnd(sd)*920;y=1860;}else{x=60;y=80+rnd(sd)*1760;}
      const pts=[[x,y]];const mx=side%2?lerp(x,540,.5):x,my=side%2?y:lerp(y,960,.5);pts.push([mx,my]);pts.push(side%2?[mx,960+(y-960)*.15]:[540+(x-540)*.15,my]);pts.push([540,960]);TRACES.push(pts);
      g.strokeStyle=rgba(C.mi2,.8);g.lineWidth=5;g.beginPath();pts.forEach((p,j)=>j?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();R(x-8,y-8,16,16,C.mi);}
    haze(540,960,300,C.mi,.35);hero2(540,960,0,{r:64});});
  const vw=mk(W,H);onC(vw,()=>{reset3();show('city');cityAt(50);camSet(-30,70,-180,40,55,-700,55);rainOn(50,.3);render3();});
  const vt=new THREE.CanvasTexture(vw);vt.colorSpace=THREE.SRGBColorSpace;const pt=new THREE.CanvasTexture(L2);pt.colorSpace=THREE.SRGBColorSpace;
  const scrM=buildRoom(pt,vt);
  const L1=mk(W,H);onC(L1,()=>{reset3();show('room');S3.fog=null;domeCols('#000000','#000000','#000000');camSet(1.2,10.2,9,1.9,9.0,-4.6,48);render3();});
  {const ph=scrM.parent.position,a=scr(ph.x-.9,ph.y+1.6,ph.z+.12),b=scr(ph.x+.9,ph.y-1.6,ph.z+.12);const h=b[1]-a[1],w=h*9/16,cx=(a[0]+b[0])/2;DR[1]=[cx-w/2,a[1],w,h];}
  DIVE.push(L0,L1,L2,L3,L4);
}
function sDive(t){
  let lev=0,s=0;DV.forEach(([a,b],i)=>{if(t>=b)lev=i+1;else if(t>=a){lev=i;s=io((t-a)/(b-a));}});
  g.imageSmoothingEnabled=true;
  if(lev>=4){g.drawImage(DIVE[4],0,0);
    g.save();g.globalCompositeOperation='lighter';TRACES.forEach((pts,i)=>{const u=((t*.7+rnd(i+77))%1);let L=0;const seg=[];for(let j=1;j<pts.length;j++){const l=Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]);seg.push(l);L+=l;}
      let d=u*L;for(let j=1;j<pts.length;j++){if(d<=seg[j-1]){const p=d/seg[j-1];haze(lerp(pts[j-1][0],pts[j][0],p),lerp(pts[j-1][1],pts[j][1],p),26,C.miL,.7);break;}d-=seg[j-1];}});g.restore();
    const u=sprO(t-90.1,6),r=lerp(64,220,cl(u,0,1.1));haze(540,960,r*2.2,C.mi,.35);hero2(540,960,t,{r,wink:t>91.0&&t<91.35,rot:t*.6});
    burst2(t,90.1,40,540,960,1500,1500,[C.miL,C.mi,C.mi2],1.0,0,6);
    if(t>90.5)neon('ВСЁ — ИЗ ОДНОГО РУБЛЯ',540,1330,F('T',58),C.mi,'c',P_(t,90.5,.3),12);
  }else{
    const L=DIVE[lev],[cx0,cy0,cw,ch]=DR[lev],f=W/cw,k=Math.pow(f,s),ccx=cx0+cw/2,ccy=cy0+ch/2,Fx=(540-ccx*f)/(1-f),Fy=(960-ccy*f)/(1-f);
    g.drawImage(L,Fx-Fx*k,Fy-Fy*k,W*k,H*k);const X=Fx+(cx0-Fx)*k,Y=Fy+(cy0-Fy)*k;g.drawImage(DIVE[lev+1],X,Y,cw*k,ch*k);}
  const hold=lev>=4?t>90.6:!DV.some(([a,b])=>t>=a-.05&&t<b+.05);
  if(hold&&lev>0){const s_=DL[Math.min(4,lev)],w=tw(s_,F('M',34),4)+80;const st=lev>=4?90.6:DV[lev-1][1];if(panel(540-w/2,180,w,84,C.cy,popen(t,st+.05)))tx(s_,540,223,F('M',34),C.cy,'c',1,4);}
}

/* ═══════════ 8 · СОХРАНЕНИЕ (92–100): город сверху, слоты, миф ═══════════ */
function sSave(t){
  show('city');cityAt(t);const an=-.4+(t-92)*.03;camSet(Math.sin(an)*260,230,-420+Math.cos(an)*260,0,0,-560,55);rainOn(t,.25);render3();
  R(0,0,W,H,'#04050A',.45);
  const o=popen(t,92.2)*(1-P_(t,95.9,.3));
  if(t<96.3&&panel(90,240,900,960,C.mi,o,.84)){tx('СОХРАНИТЬ ПРОГРЕСС?',540,300,F('M',36),C.ink,'c',1,3);
    const cur=t<93.8?0:2;
    [['ДЕНЬ 365','КОПИЛКА 127,75₽'],['ГОРОД · 20 ЛЕТ','9 892 554₽ УСЛОВНО'],t>95.3?['ВАШ СЛОТ','НАЧАТЬ СЕГОДНЯ']:['ПУСТО','']].forEach(([a,b],i)=>{const y=370+i*240,on=i===cur;
      g.save();g.strokeStyle=on?C.mi:C.line;g.lineWidth=on?3:2;if(on){g.shadowColor=C.mi;g.shadowBlur=12;}g.strokeRect(130,y,820,200);g.restore();if(on&&Math.floor(t*2.5)%2===0)triR(110,y+100,14,C.mi);
      if(i===0)hero2(230,y+100,t,{r:46,happy:true});if(i===1){for(let k=0;k<5;k++){const h=30+k*22;R(190+k*16,y+150-h,12,h,k>2?C.mi:C.vi);}}
      const dimSlot=i===2&&t<95.3;tx(a,320,y+70,F('T',50),dimSlot?C.mute:C.ink,'l');tx(b,320,y+136,F('M',30),i===1?C.dim:i===2?C.mi:C.cy,'l');});
    if(t>94.2&&t<95.4){const p=io(P_(t,94.3,.9));tx('ЗАГРУЗКА В ОБЛАКО',540,1110,F('M',28),C.cy,'c',1,3);R(170,1140,740,20,'#0E1A22');R(170,1140,740*p,20,C.cy);}
    if(t>95.35&&t<96.0)neon('СОХРАНЕНО',540,1130,F('T',48),C.mi,'c',1,12);}
  if(t>96.3){const o2=popen(t,96.3)*(1-P_(t,99.3,.3)),truth=t>97.6,col=truth?C.mi:C.rd;
    if(panel(110,720,860,330,col,o2,.86)){tx(truth?'НА САМОМ ДЕЛЕ':'МИФ',540,790,F('M',32),col,'c',1,6);
      if(truth)neon('«КОПИТЬ — ЭТО КВЕСТ»',540,920,F('TB',62),C.mi,'c',1,14);else tx('«КОПИТЬ — СКУЧНО»',540,920,F('TB',62),C.ink,'c');}}
}

/* ═══════════ 9 · КРЫША: титры, итоги, логотип (100–120) ═══════════ */
function sEnd(t){
  show('city');cityAt(t);const u=P_(t,100,20);
  camSet(lerp(-44,-40,u),lerp(62.5,64,u),lerp(-238,-234,u),lerp(-10,10,u),lerp(66,70,u),-420,55);
  heroAt(-38,61.6,-248.5,t,{s:1.1,happy:true,hide:t>113.6});
  rainOn(t,.4);render3();
  if(t<109.8){const L=[['НЕОН-РУБЛЬ','',1],['ГЕРОЙ','РУБЛИК'],['БОСС','ИНФЛЯЦИЯ'],['ТАЙНИК','+127,75₽'],['ГОРОД','20 ЛЕТ ВЗНОСОВ'],['ЦИФРЫ','ПРИМЕРЫ'],['СТАВКИ','УСЛОВНЫЕ'],['ПРО ДЕНЬГИ','БЕЗ ВОДЫ'],['СПАСИБО ЗА ИГРУ!','',2]];
    const off=(t-100)*170;let y=1400-off;const fa=1-P_(t,109.4,.4);g.save();g.beginPath();g.rect(0,240,W,1140);g.clip();
    L.forEach(r=>{const a=fa*cl((y-240)/120)*cl((1380-y)/120);if(r[2]===1){neon(r[0],540,y,F('TB',92),C.mi,'c',a,16);y+=200;}else if(r[2]===2){neon(r[0],540,y,F('T',52),C.cy,'c',a,12);y+=120;}
      else{tx(r[0],540,y,F('M',28),C.dim,'c',a,4);tx(r[1],540,y+48,F('M',38),C.ink,'c',a);y+=150;}});g.restore();}
  if(t>109.6&&t<113.7){const o=popen(t,109.6)*(1-P_(t,113.3,.3));if(panel(140,420,800,680,C.mi,o,.84)){neon('ИТОГИ',540,500,F('TB',72),C.mi,'c',1,14);
      [[110.0,'ДНЕЙ',365,0],[110.5,'В КОПИЛКЕ',127.75,2],[111.0,'БОССОВ',1,0],[111.5,'ГОРОД, ЛЕТ',20,0]].forEach(([t0,a,v,d],i)=>{if(t<t0)return;const y=620+i*80,c=v*spr(t-t0,9);
        tx(a,190,y,F('M',34),C.dim,'l');tx(d?rub(c)+'₽':String(Math.round(c)),890,y,F('T',42),C.ink,'r');});
      if(t>112.0){const p=spr(t-112.0,8);tx('ПРОЙДЕНО',190,970,F('M',34),C.dim,'l');tx(Math.round(100*p)+'%',890,970,F('T',42),C.mi,'r');R(190,1010,700,22,'#0E2019');R(190,1010,700*p,22,C.mi);}}}
  if(t>113.6){R(0,0,W,H,'#04050A',.35*P_(t,113.6,.5));neon('ЛАНСКОЙ',540,820,F('U',126),C.mi,'c',flick(t,9,113.7),22);tx('ПРО ДЕНЬГИ БЕЗ ВОДЫ',540,940,F('M',30),C.dim,'c',P_(t,114.4,.4),6);
    if(t>115.2){const pr=t>116.4&&t<116.6,o=popen(t,115.2);g.save();if(pr){g.translate(540,1075);g.scale(.94,.94);g.translate(-540,-1075);}
      if(panel(300,1030,480,90,C.mi,o,pr?.95:.8)){if(pr)R(304,1034,472,82,C.mi);tx('ПОДПИСАТЬСЯ',540,1076,F('MB',38),pr?C.bg0:C.ink,'c',1,4);}g.restore();
      floatTxt(t,116.5,'+1 ИГРОК',540,1180,F('T',46),C.mi,1.3);}}
}

/* ═══ СЦЕНЫ, СБОРКА, КАДР ═══ */
const SCN=[[0,8,sTitle],[8,14,sMap],[14,34,sStreet],[34,36,sMap],[36,54,sBoss],[54,66,sCache],[66,80,sCity],[80,92,sDive],[92,100,sSave],[100,120,sEnd]];
let GR,GRP,BUILT=false;
function build(){
  GR=mk(256,256,()=>{const im=g.createImageData(256,256);for(let i=0;i<256*256;i++){const v=Math.floor(rnd(i*.731+3)*255);im.data[i*4]=v;im.data[i*4+1]=v;im.data[i*4+2]=v;im.data[i*4+3]=255;}g.putImageData(im,0,0);});
  GLOW=ctex(128,128,()=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.2,'rgba(255,255,255,.55)');gr.addColorStop(.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});
  PUD=ctex(256,256,()=>{R(0,0,256,256,'#fff');for(let i=0;i<70;i++){const x=rnd(i+40)*256,y=rnd(i+41)*256,r=8+rnd(i+42)*40;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,.95)');gr.addColorStop(1,'rgba(0,0,0,0)');
    for(const dx of [-256,0,256])for(const dy of [-256,0,256]){g.save();g.translate(dx,dy);g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);g.restore();}}},true);
  {const es=new THREE.Scene();es.background=new THREE.Color('#05050A');const add=(col,k,x,y,z,w,h)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic(col,k,{side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);};
    add(C.mg,2.5,-8,2,-6,5,10);add(C.cy,2.5,8,3,-4,4,9);add(C.am,2,0,7,8,8,2);add(C.vi,2,-6,-2,8,6,4);add(C.mi,1.5,7,-1,7,3,6);
    const pm=new THREE.PMREMGenerator(RD);S3.environment=pm.fromScene(es,.02).texture;S3.environmentIntensity=.8;pm.dispose();}
  FOG.city=new THREE.FogExp2('#171230',.0032);FOG.street=new THREE.FogExp2('#171230',.011);FOG.boss=new THREE.FogExp2('#1A0A10',.012);FOG.cache=new THREE.FogExp2('#05090E',.02);FOG.towers=new THREE.FogExp2('#171230',.0026);
  const PAL=[[C.am,C.amL,C.am,'#F6E6C8'],[C.cyL,C.cy,'#DDEFF5'],[C.am,C.cyL,C.mgL,C.amL],[C.mgL,C.mg,C.am],[C.amL,'#DDEFF5'],['#DDEFF5',C.cyL,'#DDEFF5']];
  BM=PAL.map((p,i)=>bmat(winTex(100+i*37,p,[.3,.35,.28,.3,.14,.42][i]),['#10131E','#0F1420','#131220','#160F1C','#0D0F17','#121620'][i],1.5));
  makeDome();makeRain();makeParts();makeHero();makeCoins();
  buildCity();buildStreet();buildMap();buildBoss();buildCache();buildTowers();
  buildDive();
}
window.seek=function(to){
  if(!BUILT)return;const t=tsrc(to);
  g=AG;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.fillStyle=C.bg0;g.fillRect(0,0,W,H);
  reset3();
  const [sx,sy]=shake(t);g.translate(sx,sy);
  const s=SCN.find(q=>t>=q[0]&&t<q[1])||SCN[SCN.length-1];s[2](t);
  g.setTransform(1,0,0,1,0,0);
  const tp=performance.now();post(t,to);PROF.post=performance.now()-tp;
};
function post(t,to){
  O.setTransform(1,0,0,1,0,0);O.globalCompositeOperation='source-over';O.globalAlpha=1;O.filter='none';
  const ga=TEASER?glitchL(to,TGL):glitch(t),f=Math.floor(t*30);
  if(ga>.02){CRg.globalCompositeOperation='copy';CRg.drawImage(A,0,0);CRg.globalCompositeOperation='multiply';CRg.fillStyle='#FF0000';CRg.fillRect(0,0,W,H);
    CBg.globalCompositeOperation='copy';CBg.drawImage(A,0,0);CBg.globalCompositeOperation='multiply';CBg.fillStyle='#00FFFF';CBg.fillRect(0,0,W,H);
    O.fillStyle='#000';O.fillRect(0,0,W,H);O.globalCompositeOperation='lighter';const d=Math.round(4+24*ga);O.drawImage(CR,d,0);O.drawImage(CB,-d,0);O.globalCompositeOperation='source-over';
    const n=3+Math.floor(ga*9);for(let i=0;i<n;i++){const y=Math.floor(rnd(f*13+i)*H),h=Math.floor(8+rnd(f*17+i)*120*ga),dx=Math.round((rnd(f*19+i)-.5)*170*ga);O.drawImage(A,0,y,W,h,dx,y,W,h);}
  }else O.drawImage(A,0,0);
  /* лёгкое свечение интерфейса поверх 3D */
  B1g.globalCompositeOperation='copy';B1g.filter='brightness(.85) contrast(2.2) blur(3px)';B1g.drawImage(cv,0,0,270,480);B1g.filter='none';
  B2g.globalCompositeOperation='copy';B2g.filter='blur(6px)';B2g.drawImage(B1,0,0,135,240);B2g.filter='none';
  O.imageSmoothingEnabled=true;O.globalCompositeOperation='lighter';O.globalAlpha=.42;O.drawImage(B1,0,0,W,H);O.globalAlpha=.4;O.drawImage(B2,0,0,W,H);
  O.globalCompositeOperation='overlay';O.globalAlpha=.06;O.fillStyle=GRP;O.translate(-Math.floor(rnd(f)*256),-Math.floor(rnd(f+.5)*256));O.fillRect(0,0,W+256,H+256);O.setTransform(1,0,0,1,0,0);
  O.globalAlpha=1;O.globalCompositeOperation='source-over';
  if(t>118.6){CRg.globalCompositeOperation='copy';CRg.drawImage(cv,0,0);O.fillStyle='#000';O.fillRect(0,0,W,H);
    const u1=io(P_(t,118.6,.32)),u2=io(P_(t,118.92,.26)),sy=lerp(1,.004,u1),sx=lerp(1,.002,u2);
    if(t<119.3){O.save();O.translate(540,960);O.scale(sx,sy);O.globalCompositeOperation='lighter';O.drawImage(CR,-540,-960);O.globalAlpha=u1*.8;O.fillStyle='#CFEDE2';O.fillRect(-540,-960,W,H);O.restore();}
    if(t>119.15&&t<119.45){O.globalCompositeOperation='lighter';const a=1-P_(t,119.15,.3),gr=O.createRadialGradient(540,960,0,540,960,40);gr.addColorStop(0,`rgba(220,245,235,${a})`);gr.addColorStop(1,'rgba(220,245,235,0)');O.fillStyle=gr;O.fillRect(500,920,80,80);O.globalCompositeOperation='source-over';}
    if(t>119.5&&Math.floor(t*3)%2===0){O.fillStyle=C.cy;O.fillRect(96,800,20,40);}}
  if(t<.15&&Math.floor(t*3)%2===0){O.fillStyle=C.cy;O.fillRect(96,800,20,40);}
}
const FACES=['800 40px Tektur','900 40px Tektur','400 40px "Russo One"','700 40px "JetBrains Mono"','800 40px "JetBrains Mono"','900 40px Unbounded'];
Promise.all(FACES.map(f=>document.fonts.load(f,'НЕОН₽09—«»%'))).then(()=>{build();GRP=O.createPattern(GR,'repeat');BUILT=true;window.seek(0);window.READY=true;})
  .catch(e=>{console.error('build',e&&e.stack||e);});
