/* ═══════════════════════════════════════════════════════════════════
   ПИКСЕЛЬ-3D · тест №6 · 1080×1920 · 30 fps · 10 с
   Пиксели «Рубль-квеста» + 3D «Неон-рубля» + монеты в график из
   «Лаборатории». Настоящая 3D-сцена (свет, отражения, туман, камера)
   считается в 270×480, шейдер переводит её в палитру из 45 цветов
   с упорядоченным растром и пиксельным контуром, кадр увеличивается
   ровно в 4 раза. Всё собрано из вокселей: титул, Рублик, монеты,
   босс; взорванный босс кубиками складывается в башни копилки.
   Интерфейс игры — пиксельный, в той же сетке 270×480.
   Сумерки вместо ночи — краски: индиго, фиолетовый, персиковый закат,
   розовый, бирюзовый и янтарный неон, мятный канала. Без кислотных.
   Всё — чистая функция seek(t). Случайность — rnd(i).
   ═══════════════════════════════════════════════════════════════════ */
const LW=270,LH=480,K=4,W=LW*K,H=LH*K,FPS=30,DUR=10;
window.META={FPS,DUR,FRAMES:DUR*FPS};
window.T={src:'пиксель-3d, без голоса',DUR,B:[]};
window.READY=false;window.BLUR=[];

/* ═══ ПАЛИТРА: 45 цветов, рампы ═══ */
const PAL=['#0B0A1A','#151433','#22204D','#332E6B','#4B3A8C','#6E55B0','#9A7FD1',
  '#7A2E5A','#B0447A','#D9709E','#F2A9C4','#A8483A','#D9704A','#F2A262','#FFD29A',
  '#C98A2E','#F0C048','#FFE9A0','#5A1A22','#9C2F34','#D9544D','#F2908A',
  '#0F2A1F','#1E5A3E','#2E9E6A','#4FD39A','#9EF2C8','#123A44','#1F6E7A','#36A7B5','#7FDCE2',
  '#1A2A5E','#2F4E9C','#5A86D1','#06070B','#2A2D3A','#4A4F63','#7D8299','#C3C8D6','#F4F6FA',
  '#3A1E2E','#5C3A2A','#8C5A3C','#E8D8C8','#B5EDD3'];
const P={ink:'#F4F6FA',dim:'#C3C8D6',mute:'#7D8299',bg:'#0B0A1A',box:'#151433',mi:'#4FD39A',miL:'#9EF2C8',mi2:'#2E9E6A',mi3:'#1E5A3E',
  am:'#F0C048',amL:'#FFE9A0',am2:'#C98A2E',pk:'#D9709E',pkL:'#F2A9C4',pk2:'#B0447A',cy:'#36A7B5',cyL:'#7FDCE2',cy2:'#1F6E7A',
  rd:'#D9544D',rdL:'#F2908A',rd2:'#9C2F34',rd3:'#5A1A22',vi:'#6E55B0',viL:'#9A7FD1',vi2:'#4B3A8C',pe:'#F2A262',peL:'#FFD29A',pe2:'#D9704A'};
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

/* ═══ ХОЛСТЫ: 3D в 270×480, интерфейс в 270×480, вывод ×4 ═══ */
const stage=document.getElementById('stage');
const RAW=new URLSearchParams(location.search).get('raw')==='1';
const cv=document.createElement('canvas');cv.width=RAW?LW:W;cv.height=RAW?LH:H;cv.style.width='1080px';cv.style.height='1920px';stage.appendChild(cv);
const O=cv.getContext('2d');O.imageSmoothingEnabled=false;
let g=null;
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;if(fn){const k=g;g=c.getContext('2d');g.imageSmoothingEnabled=false;fn(c);g=k;}return c;}
const HUD=mk(LW,LH),HG=HUD.getContext('2d');g=HG;
/* без полос развёртки и виньетки: пиксель должен быть чистым */

/* ═══ ПИКСЕЛЬНЫЙ ИНТЕРФЕЙС (из «Рубль-квеста») ═══ */
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
/* окно RPG: рамка в два цвета, срезанные углы; раскрывается ступенями */
function box(x,y,w,h,bc,fill){x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);if(w<3||h<3)return;
  rect(x+1,y+1,w-2,h-2,fill||P.box);g.fillStyle=bc||P.mi;g.fillRect(x+1,y,w-2,1);g.fillRect(x+1,y+h-1,w-2,1);g.fillRect(x,y+1,1,h-2);g.fillRect(x+w-1,y+1,1,h-2);
  g.fillStyle='#0B0A1A';g.fillRect(x+2,y+h-2,w-4,1);g.fillRect(x+w-2,y+2,1,h-4);}
const step4=(t,a,d=.2)=>Math.floor(cl((t-a)/d)*4)/4;
function popup(t,t0,s,x,y,col){const u=(t-t0)/.8;if(u<0||u>1)return;if(u>.75&&Math.floor(t*20)%2)return;Tt(s,x,y-Math.round(u*18),F8,col,'c','#0B0A1A');}
function triR(x,y,c){g.fillStyle=c;for(let k=0;k<4;k++)g.fillRect(x+k,y+k,1,7-2*k);}

/* ═══════════════════════ 3D ═══════════════════════ */
const {Reflector,mergeGeometries}=T3X;
const V3=THREE.Vector3,COL=(h,k=1)=>new THREE.Color(h).multiplyScalar(k);
const RD=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
RD.setPixelRatio(1);RD.setSize(LW,LH,false);RD.toneMapping=THREE.NoToneMapping;RD.outputColorSpace=THREE.LinearSRGBColorSpace;
const S3=new THREE.Scene(),CAM=new THREE.PerspectiveCamera(50,LW/LH,.5,3000);
const RT=new THREE.WebGLRenderTarget(LW,LH,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(LW,LH)});
/* пост: тонмаппинг → тёмный контур по силуэту (скачок глубины) и светлый по рёбрам (излом нормали)
   → слабый растр Байера → ближайший цвет палитры */
const RTN=new THREE.WebGLRenderTarget(LW,LH,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
const NMAT=new THREE.MeshNormalMaterial();
const POST=new THREE.ShaderMaterial({uniforms:{tC:{value:RT.texture},tD:{value:RT.depthTexture},tN:{value:RTN.texture},res:{value:new THREE.Vector2(LW,LH)},near:{value:.5},far:{value:3000},
    pal:{value:PAL.map(h=>{const [r,g_,b]=RGB(h);return new V3(r/255,g_/255,b/255);})},dith:{value:.045},expo:{value:1.12}},
  vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tC,tD,tN;uniform vec2 res;uniform float near,far,dith,expo;uniform vec3 pal[${PAL.length}];
    float lin(float d){float z=d*2.-1.;return 2.*near*far/(far+near-z*(far-near));}
    vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
    float bay(vec2 p){int x=int(mod(p.x,4.)),y=int(mod(p.y,4.));int i=x+y*4;
      float m[16];m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for(int k=0;k<16;k++){if(k==i)return (m[k]+.5)/16.;}return .5;}
    void main(){vec2 uv=gl_FragCoord.xy/res;vec3 c=aces(texture2D(tC,uv).rgb*expo);c=pow(c,vec3(1./2.2));
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
function sprite(col,k,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:COL(col,k),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sp.scale.set(s,s,1);return sp;}
/* окна: тайл 16×32 пикселя = 8×16 единиц, крыши смотрят в тёмный угол */
function winTex(seed,cols,lit){return ctex(16,32,()=>{rect(0,0,16,32,'#0E0D22');for(let y=1;y<32;y+=4)for(let x=1;x<16;x+=4){const r=rnd(seed+x*7.1+y*3.3);
  g.fillStyle=r<lit?cols[Math.floor(rnd(seed+x+y*5)*cols.length)]:'#1C1A3A';g.fillRect(x,y,2,2);}rect(0,0,1,1,'#0B0A1A');},true);}
function bld(w,h,d){const gm=new THREE.BoxGeometry(w,h,d),uv=gm.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;if(f===2||f===3)uv.setXY(i,.01,.99);else uv.setXY(i,uv.getX(i)*dims[f][0]/8,uv.getY(i)*dims[f][1]/16);}return gm;}
/* вывеска: пиксельный текст на плоскости + ореол */
function sign(s,col,h,vert){const pad=2,cw=vert?12:s.length*8+pad*2+2,ch=vert?s.length*9+pad*2+2:12;
  const tx_=ctex(cw,ch,()=>{rect(0,0,cw,ch,'#0B0A1A');g.fillStyle=col;g.fillRect(0,0,cw,1);g.fillRect(0,ch-1,cw,1);g.fillRect(0,0,1,ch);g.fillRect(cw-1,0,1,ch);
    if(vert){for(let i=0;i<s.length;i++)Tt(s[i],cw/2,pad+1+i*9,F8,col,'c');}else Tt(s,cw/2,pad,F8,col,'c');});
  const w=h*cw/ch,m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx_,color:COL('#ffffff',1.5)}));
  const gl=sprite(col,.5,Math.max(w,h)*1.8);gl.position.z=-.3;m.add(gl);return m;}

/* ═══ ВОКСЕЛИ ═══ */
const VBOX=new THREE.BoxGeometry(.92,.92,.92);
function vmesh(n,emi=.35){const m=new THREE.InstancedMesh(VBOX,new THREE.MeshLambertMaterial({color:'#ffffff',emissive:'#ffffff',emissiveIntensity:emi}),n);
  m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);m.frustumCulled=false;return m;}
/* эмиссия Lambert берёт цвет материала, а не экземпляра — подмешиваем свечение шейдером */
function vglow(m){m.material.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance*=vColor;');};m.material.vertexColors=false;return m;}
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new V3(),_p=new V3(),_c=new THREE.Color();
function setV(m,i,x,y,z,s=1,rx=0,ry=0,rz=0){_q.setFromEuler(_e.set(rx,ry,rz));_m.compose(_p.set(x,y,z),_q,_s.set(s,s,s));m.setMatrixAt(i,_m);}
function colV(m,i,h,k=1){_c.set(h).multiplyScalar(k);m.setColorAt(i,_c);}

/* шрифт → воксели: биты Press Start 2P 8px */
function glyphBits(s){const c=mk(s.length*8+2,10,()=>{g.font=F8;g.textBaseline='top';g.fillStyle='#fff';g.fillText(s,0,0);});const d=c.getContext('2d').getImageData(0,0,c.width,10).data,B=[];
  for(let y=0;y<10;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>118)B.push([x,y]);return {B,w:c.width};}
/* Рублик: монета 15×15, лицо меняется */
const HN=15;
function heroPix(mood,look=0){const R=7.2,M=[];for(let y=0;y<HN;y++)for(let x=0;x<HN;x++){const dx=x-7,dy=y-7,d=Math.hypot(dx,dy);if(d>R)continue;
    let c=d>R-1.3?(dx+dy<0?P.miL:P.mi2):(d>R-2.2?P.mi:'#3FC089');
    const eye=(ex)=>x===ex+look&&y>=4&&y<=7;
    if(mood==='hurt'){if((Math.abs(dx+3)===Math.abs(dy+1)||Math.abs(dx-3)===Math.abs(dy+1))&&Math.abs(dy+1)<=1&&Math.abs(Math.abs(dx)-3)<=1)c=P.rd3;}
    else if(mood==='happy'){if((y===5&&(x===4||x===10))||(y===4&&(x===5||x===9))||(y===5&&(x===6||x===8)))c=P.mi3;if(y===10&&x>=5&&x<=9)c=P.mi3;if(y===9&&(x===4||x===10))c=P.mi3;}
    else if(mood==='blink'){if(y===6&&(x===4+look||x===5+look||x===9+look||x===10+look))c=P.mi3;if(y===10&&x>=6&&x<=8)c=P.mi3;}
    else{if(eye(4)||eye(5)||eye(9)||eye(10))c=P.mi3;if(y===10&&x>=6&&x<=8)c=P.mi3;}
    M.push([x,y,c]);}return M;}
let HERO,HMOOD='';
function heroAt(x,y,z,t,o={}){const mood=o.hurt?'hurt':o.happy?'happy':(t%2.6<.12?'blink':'n');const M=heroPix(mood,o.look||0),vs=o.s||.26,sq=o.sq||1;
  const ry=Math.atan2(CAM.position.x-x,CAM.position.z-z);HERO.visible=true;HERO.count=M.length*2;
  M.forEach(([px,py,c],i)=>{for(let l=0;l<2;l++){const lx=(px-7)*vs,ly=(7-py)*vs*sq,lz=(l-.5)*vs;const cx=Math.cos(ry),sx=Math.sin(ry);
      setV(HERO,i*2+l,x+lx*cx+lz*sx,y+ly,z-lx*sx+lz*cx,vs,0,ry,0);colV(HERO,i*2+l,o.hurt&&l===1?P.rd:c,o.hot?1.3:1);}});
  HERO.instanceMatrix.needsUpdate=true;HERO.instanceColor.needsUpdate=true;}

/* ═══ МИР: сумеречный город, улица ═══ */
let DOME,SUN,WORLD={};const NOHIDE=[];
function buildWorld(){
  DOME=new THREE.Mesh(new THREE.SphereGeometry(2500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color()},mid:{value:new THREE.Color()},hor:{value:new THREE.Color()},sun:{value:new THREE.Color()},sdir:{value:new V3(-.35,.07,-1).normalize()}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top,mid,hor,sun,sdir;varying vec3 vP;float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){float h=vP.y;vec3 c=h<.12?mix(hor,mid,smoothstep(-.02,.12,h)):mix(mid,top,smoothstep(.12,.5,h));
        float s=dot(vP,sdir);c+=sun*smoothstep(.9965,.9975,s)*1.4+sun*pow(max(s,0.),60.)*.45;
        vec2 g=floor(vec2(atan(vP.x,vP.z)*300.,h*300.));if(h>.25&&h2(g)>.9965)c+=vec3(.8,.75,.9)*smoothstep(.25,.5,h);gl_FragColor=vec4(c,1.);}`}));
  DOME.renderOrder=-10;S3.add(DOME);
  /* облака: плоские пиксельные пятна в закате */
  for(let i=0;i<9;i++){const w=60+rnd(i+40)*90,tex=ctex(32,8,()=>{for(let k=0;k<26;k++){const x=rnd(i*30+k)*28,y=2+rnd(i*30+k+.5)*4,r=1+rnd(i*30+k+.7)*3;g.fillStyle=k%3?P.pkL:P.peL;g.fillRect(x,y,r*2,r);}});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.75,fog:false,color:COL('#ffffff',.9),depthWrite:false}));
    m.position.set((rnd(i+41)-.5)*900,90+rnd(i+42)*160,-900-rnd(i+43)*300);m.userData.x0=m.position.x;S3.add(m);NOHIDE.push(m);(WORLD.clouds=WORLD.clouds||[]).push(m);}
  const G=new THREE.Group();S3.add(G);WORLD.g=G;
  const BC=['#22204D','#332E6B','#1A2A5E','#3A1E2E','#2A2D3A','#151433'];
  const WC=[[P.am,P.peL,P.pkL],[P.cyL,P.amL],[P.pk,P.peL,P.am],[P.amL,P.am],[P.viL,P.cyL,P.pkL],[P.peL,P.amL,P.cyL]];
  const mats=BC.map((c,i)=>new THREE.MeshLambertMaterial({color:c,emissive:'#ffffff',emissiveMap:winTex(100+i*17,WC[i],[.2,.16,.22,.18,.14,.2][i]),emissiveIntensity:1.15}));
  const geos=BC.map(()=>[]),put=(x,z,w,d,h,m)=>{const gm=bld(w,h,d);gm.translate(x,h/2,z);geos[m].push(gm);};
  /* фасады вдоль улицы (x), задний ряд, дальний город */
  let x=-70,i=0;WORLD.tops=[];while(x<70){const w=6+Math.floor(rnd(i*1.9)*6)*2,h=14+Math.floor(rnd(i*2.7)*10)*4;put(x+w/2,-18,w,10,h,i%6);if(h>=30&&i%2)WORLD.tops.push([x+w/2,h,-18]);x+=w+1;i++;}
  for(let k=0;k<26;k++){const w=8+rnd(k+300)*10,h=24+rnd(k+301)*36;put(-90+k*7+rnd(k+302)*4,-38-rnd(k+303)*14,w,12,h,(k+2)%6);}
  for(let k=0;k<70;k++){const a=rnd(k+400)*Math.PI-Math.PI,r=180+rnd(k+401)*300,w=14+rnd(k+402)*26,h=30+Math.pow(rnd(k+403),1.6)*130;put(Math.sin(a)*r,-60-Math.abs(Math.cos(a))*r,w,w,h,k%6);}
  geos.forEach((a,k)=>{if(a.length)G.add(new THREE.Mesh(mergeGeometries(a),mats[k]));});
  /* витрины первых этажей */
  for(let k=0,xx=-56;xx<60;xx+=9,k++){const c=[P.pk,P.am,P.cy,P.pe,P.viL][k%5],tex=ctex(16,8,()=>{rect(0,0,16,8,c);rect(0,6,16,2,'#0B0A1A');for(let j=0;j<4;j++)rect(1+j*4,2,2,4,'#3A1E2E');});
    addM(G,new THREE.PlaneGeometry(7,3.2),new THREE.MeshBasicMaterial({map:tex,color:COL('#ffffff',.9)}),xx,1.9,-12.9);}
  WORLD.signs=[];[['КОФЕ',P.pk,-30,7],['БАНК',P.cy,-6,8],['24/7',P.am,16,7],['ОБМЕН',P.pe,34,7],['РАМЕН',P.am,-46,7]].forEach(([s,c,xx,y])=>{const m=sign(s,c,2.4);m.position.set(xx,y,-12.8);G.add(m);WORLD.signs.push([m,s]);});
  [['НОЧЬ',P.viL,-20,14],['ДАННЫЕ',P.cy,8,16],['КРЕДИТ',P.pk,26,15]].forEach(([s,c,xx,y])=>{const m=sign(s,c,10,true);m.position.set(xx,y,-11.5);G.add(m);WORLD.signs.push([m,s]);});
  /* тротуар, бордюр-неон, мокрая дорога */
  addM(G,new THREE.BoxGeometry(200,.5,10),new THREE.MeshLambertMaterial({color:'#2A2D3A'}),0,.25,-8);
  addM(G,new THREE.BoxGeometry(200,.2,.3),new THREE.MeshBasicMaterial({color:COL(P.cy,1.4)}),0,.55,-3);
  const mir=new Reflector(new THREE.PlaneGeometry(400,300),{textureWidth:LW,textureHeight:LH,color:'#8a86a0',clipBias:.003});mir.rotation.x=-Math.PI/2;mir.position.set(0,0,120);G.add(mir);NOHIDE.push(mir);
  const pud=ctex(64,64,()=>{rect(0,0,64,64,'#fff');for(let k=0;k<26;k++){g.fillStyle='#000';const x=rnd(k+50)*64,y=rnd(k+51)*64,w=4+rnd(k+52)*14;g.fillRect(x,y,w,w*.5);g.fillRect(x+2,y-1,w-4,1);}},true);pud.repeat.set(30,22);
  const film=addM(G,new THREE.PlaneGeometry(400,300),new THREE.MeshLambertMaterial({color:'#151433',transparent:true,alphaMap:pud,opacity:.9}),0,.02,120);film.rotation.x=-Math.PI/2;
  for(let xx=-60;xx<=60;xx+=15){addM(G,new THREE.BoxGeometry(.4,7,.4),new THREE.MeshLambertMaterial({color:'#4A4F63'}),xx,3.5,-3.6);addM(G,new THREE.BoxGeometry(1.4,.4,.8),new THREE.MeshBasicMaterial({color:COL(P.amL,1.6)}),xx,7,-3.2);
    const s=sprite(P.am,.55,6);s.position.set(xx,6.8,-3);G.add(s);}
  S3.add(new THREE.HemisphereLight('#9A7FD1','#22204D',.95));
  SUN=new THREE.DirectionalLight('#F2A262',1.6);SUN.position.set(-60,30,-100);S3.add(SUN);
  WORLD.neon=[[P.pk,-30,6,-8],[P.cy,-6,6,-8],[P.am,16,6,-8]].map(([c,xx,y,z])=>{const l=new THREE.PointLight(c,90,30,2);l.position.set(xx,y,z);S3.add(l);return l;});
  S3.fog=new THREE.FogExp2('#4B3A8C',.0034);
}
function skyAt(t){const r=cl(Math.min(P_(t,5.0,.6),1-P_(t,7.4,.6))),u=DOME.material.uniforms;
  u.top.value.copy(new THREE.Color('#151433').lerp(new THREE.Color('#2A0C1A'),r));u.mid.value.copy(new THREE.Color('#6E55B0').lerp(new THREE.Color('#7A2E5A'),r));
  u.hor.value.copy(new THREE.Color('#F2A262').lerp(new THREE.Color('#D9544D'),r));u.sun.value.copy(new THREE.Color('#FFD29A').lerp(new THREE.Color('#F2908A'),r));
  S3.fog.color.set(new THREE.Color('#4B3A8C').lerp(new THREE.Color('#5A1A22'),r));SUN.color.set(new THREE.Color('#F2A262').lerp(new THREE.Color('#D9544D'),r));}

/* ═══ ТИТУЛ: буквы из вокселей ═══ */
let TV,TB=[];
function buildTitle(){const a=glyphBits('РУБЛЬ'),b=glyphBits('КВЕСТ');
  a.B.forEach(([x,y])=>{for(let l=0;l<2;l++)TB.push({x:x-a.w/2,y:-y,z:l,row:y,l,ch:Math.floor(x/8),big:1});});
  b.B.forEach(([x,y])=>TB.push({x:(x-b.w/2)*.75,y:-11-y*.75,z:0,row:y,l:0,ch:5+Math.floor(x/8),big:0}));
  TV=vglow(vmesh(TB.length,1.2));S3.add(TV);}
const TPOS=new V3(0,36,-6),TS=.7;
function titleAt(t){const vis=t<3.4;TV.visible=vis;if(!vis)return;const rows=['#B5EDD3',P.miL,P.miL,P.mi,P.mi,P.mi,P.mi2,P.mi2];
  TB.forEach((v,i)=>{const t0=.12+v.ch*.08,u=sprO(t-t0,9,.6),sc=v.big?TS:TS*.75;const sx=(rnd(i)-.5)*80,sy=(rnd(i+.3)-.5)*60+20,sz=(rnd(i+.6)-.5)*40+30;
    const bob=Math.sin(t*3.2+v.x*.3)*.55,ex=t>2.5?out(P_(t,2.5,.9)):0,glx=lerp(-30,30,((t-1.0)%1.3)/1.3),gl=t>1.0&&Math.abs(v.x*(v.big?TS:TS*.75)-glx)<1.1;
    const x=TPOS.x+lerp(sx,v.x*TS,u)+(ex?(rnd(i+5)-.5)*60*ex:0),y=TPOS.y+lerp(sy,v.y*TS,u)+bob+(ex?(rnd(i+6)*30)*ex:0),z=TPOS.z+lerp(sz,v.z*TS,u)+(ex?rnd(i+7)*20*ex:0);
    setV(TV,i,x,y,z,sc*(t<t0?0:1)*(1-ex),(1-u)*3+ex*4,(1-u)*2,0);colV(TV,i,gl&&!v.l?'#F4F6FA':(v.big?(v.l?P.mi2:rows[v.row]||P.mi):[P.amL,P.amL,P.am,P.am,P.pe,P.pe,P.pe2,P.pe2][v.row]||P.am),1.5);});
  TV.instanceMatrix.needsUpdate=true;TV.instanceColor.needsUpdate=true;}

/* ═══ МОНЕТЫ, ИСКРЫ ═══ */
let CV,SPK;const CN=[];
for(let y=0;y<7;y++)for(let x=0;x<7;x++){const d=Math.hypot(x-3,y-3);if(d<=3.3)CN.push([x-3,3-y,d>2.4?(x+y<6?P.amL:P.am2):(x===3&&y>1&&y<5?P.am2:P.am)]);}
const COINT=[3.2,3.65,4.1];
const hx=t=>-14+5.2*(cl(t,2.6,5.0)-2.6);
function coinsAt(t){let n=0;COINT.forEach((tc,k)=>{const x=hx(tc),y=7.2,z=-6;if(t>tc)return;const ry=t*4+k;
    CN.forEach(([px,py,c])=>{const s=.28;setV(CV,n,x+px*s*Math.cos(ry),y+py*s+Math.sin(t*3+k)*.3,z-px*s*Math.sin(ry),s,0,ry,0);colV(CV,n,c,1);n++;});});
  CV.count=n;CV.instanceMatrix.needsUpdate=true;if(n)CV.instanceColor.needsUpdate=true;}
let SN=0;
function spk(x,y,z,c,s){if(SN>=600)return;setV(SPK,SN,x,y,z,s);colV(SPK,SN,c,1.3);SN++;}
function burst3(t,t0,n,x,y,z,sp,seed,cols,life=.9,grav=14,sz=.35){const u=t-t0;if(u<0||u>life)return;
  for(let i=0;i<n;i++){const th=rnd(seed+i)*6.283,ph=Math.acos(2*rnd(seed+i+.31)-1),v=sp*(.35+.65*rnd(seed+i+.5)),lf=life*(.5+.5*rnd(seed+i+.7));if(u>lf)continue;const f=u/lf,d=v*(1-Math.exp(-3*u))/3;
    spk(x+Math.sin(ph)*Math.cos(th)*d,y+Math.cos(ph)*d-.5*grav*u*u,z+Math.sin(ph)*Math.sin(th)*d,cols[Math.min(cols.length-1,Math.floor(f*cols.length))],sz*(1-f*.5));}}

/* ═══ БОСС И БАШНИ: одни и те же кубики ═══ */
let BV;const BVX=[];let TW=[];const BPOS=new V3(9,15,-7),HB_X=-1.5;
function buildBossTowers(){
  const tw=[];for(let k=0;k<20;k++){const h=Math.max(1,Math.round(Bal(k+1)/Bal(20)*40)),hc=Math.max(1,Math.round(120000*(k+1)/Bal(20)*40));tw.push({h,hc,x:(k-9.5)*2.3});}
  const T=[];tw.forEach((o,k)=>{for(let y=0;y<o.h;y++)for(let q=0;q<4;q++)T.push({k,y,x:o.x+(q%2)*1-.5,z:-6+Math.floor(q/2)*1-.5,c:y<o.hc?(rnd(k*31+y*7+q)<.25?P.am:(q%2?P.vi2:P.vi)):(rnd(k*17+y*5+q)<.3?P.amL:(q%2?P.mi2:P.mi))});});
  T.sort((a,b)=>a.k-b.k||a.y-b.y);
  const S=[];const R=7.6;for(let x=-8;x<=8;x++)for(let y=-8;y<=8;y++)for(let z=-8;z<=8;z++){const d=Math.hypot(x,y,z);if(d<=R&&d>R-1.3)S.push([x,y,z,d]);}
  S.sort((a,b)=>rnd(a[0]*13+a[1]*7+a[2]*3)-rnd(b[0]*13+b[1]*7+b[2]*3));
  const N=Math.max(T.length,S.length);
  for(let i=0;i<N;i++){const s=S[i%S.length],tg=T[i]||null;const [x,y,z]=s;
    /* лицо: злые глаза и рот на передней стороне */
    let c=y>3?P.rdL:y>-2?P.rd:P.rd2;if(rnd(i*3.1)<.12)c=P.pk2;
    BVX.push({x,y,z,c,tg,dup:i>=S.length,front:z>5});}
  TW=tw;BV=vglow(vmesh(N,.28));S3.add(BV);}
const bossCenter=t=>new V3(BPOS.x,BPOS.y+lerp(46,0,cl(sprO(t-5.0,6,.45),0,1.1))+Math.sin(t*1.8)*.5,BPOS.z);
const EXP=6.8,ASM=7.6;
function expPos(v,i,u,c0){const d=new V3(v.x,v.y,v.z).normalize(),sp=8+rnd(i*1.7)*16,vy=6+rnd(i*2.3)*10,kx=(1-Math.exp(-1.6*u))/1.6;
  const p=new V3(c0.x+v.x+d.x*sp*kx,0,c0.z+v.z+d.z*sp*kx),y0=c0.y+v.y,g=26;let y=y0+vy*u-.5*g*u*u;
  if(y<.5){const tb=(vy+Math.sqrt(vy*vy+2*g*(y0-.5)))/g,v2=(g*tb-vy)*.38,uu=u-tb;y=Math.max(.5,.5+v2*uu-.5*g*uu*uu);}p.y=y;return p;}
function bossAt(t){if(t<5.0){BV.visible=false;return;}BV.visible=true;const c0=bossCenter(Math.min(t,EXP)),yaw=Math.sin(t*.9)*.35,cy=Math.cos(yaw),sy=Math.sin(yaw),cE=bossCenter(EXP);
  const hitFlash=t>5.85&&t<6.0?1.6:1,breath=1+.035*Math.sin(t*3.2),blink=(t%1.7)<.1,look=t<6.75?-1:0;
  const face=(x,y,c)=>{const ax=Math.abs(x),ex=x-look,aex=Math.abs(ex);if(blink?(y===1&&(aex===2||aex===3)):((aex===2||aex===3)&&y>=0&&y<=2))return '#0B0A1A';if((y===3&&(ax===1||ax===2))||(y===4&&(ax===3||ax===4)))return '#0B0A1A';if(y===-3&&ax<=3)return '#0B0A1A';if((y===-4||y===-2)&&ax===4)return '#0B0A1A';return c;};
  BVX.forEach((v,i)=>{let x,y,z,s=1,rx=0,ry=yaw,col=v.c,k=1;
    if(t<EXP){if(v.dup){s=0;}const bx=v.x*breath,by=v.y*breath,bz=v.z*breath;x=c0.x+bx*cy+bz*sy;y=c0.y+by;z=c0.z-bx*sy+bz*cy;k=hitFlash;if(t>6.55)k=1+(t-6.55)*4;if(v.front)col=face(v.x,v.y,v.c);}
    else{const u=Math.min(t,ASM)-EXP,ev={x:v.x*cy+v.z*sy,y:v.y,z:-v.x*sy+v.z*cy},p=expPos(ev,i,u,cE);x=p.x;y=p.y;z=p.z;rx=u*(3+i%5);ry=u*(2+i%3);if(v.dup)s=1-cl(u/.6);
      if(t>ASM&&v.tg){const d=v.tg.k*.04+v.tg.y*.008,f=io(cl((t-ASM-d)/.6)),pe=expPos(ev,i,ASM-EXP,cE);x=lerp(pe.x,v.tg.x,f);z=lerp(pe.z,v.tg.z,f);y=lerp(pe.y,v.tg.y+.5,f)+Math.sin(Math.PI*f)*9;
        rx=(1-f)*rx;ry=(1-f)*ry;if(f>.85)col=v.tg.c;s=1;}
      else if(t>ASM&&!v.tg)s=0;}
    setV(BV,i,x,y,z,s,rx,ry,0);colV(BV,i,col,k);});
  BV.instanceMatrix.needsUpdate=true;BV.instanceColor.needsUpdate=true;}


/* ═══ ЖИЗНЬ ГОРОДА: прохожие, машины, бегущая строка, окна, пар, птицы, огоньки ═══ */
let PED,CAR,WINF,BIRD,TICK,TICKC;const PEDS=[],CARS=[],WINS=[],ANT=[];
function buildLife(){
  const G=WORLD.g,coats=[P.pk,P.cy,P.am,P.viL,P.pe,P.mi2,P.pk2,P.cy2];
  for(let i=0;i<10;i++)PEDS.push({dir:rnd(i+700)<.5?-1:1,sp:1.6+rnd(i+701)*1.6,x0:(rnd(i+702)-.5)*100,z:-10.6+rnd(i+703)*1.6,coat:coats[i%8],skin:rnd(i+704)<.5?'#E8D8C8':'#8C5A3C',hat:[P.am,P.ink,P.pkL,'#2A2D3A'][i%4],ph:rnd(i+705)});
  PED=vglow(vmesh(PEDS.length*8,.25));G.add(PED);
  for(let i=0;i<8;i++)CARS.push({dir:i%2?-1:1,sp:9+rnd(i+720)*9,x0:(rnd(i+721)-.5)*160,y:20+rnd(i+722)*16,z:-26-rnd(i+723)*22,col:[P.cy2,P.vi2,P.pk2,'#2A2D3A'][i%4]});
  CAR=vglow(vmesh(CARS.length*6,.3));G.add(CAR);
  CARS.forEach(c=>{c.f=sprite(P.amL,.9,4);c.b=sprite(P.rd,.8,3);G.add(c.f,c.b);});
  const wg=new THREE.PlaneGeometry(1,1.2);WINF=new THREE.InstancedMesh(wg,new THREE.MeshBasicMaterial({color:'#ffffff'}),70);WINF.frustumCulled=false;G.add(WINF);
  for(let i=0;i<70;i++){WINS.push({x:-50+rnd(i+740)*100,y:5+Math.floor(rnd(i+741)*4)*2,ph:rnd(i+742)*9,sp:.3+rnd(i+743)*.6,c:[P.amL,P.peL,P.pkL,P.cyL,P.am][i%5]});
    _m.makeTranslation(WINS[i].x,WINS[i].y+.6,-12.97);WINF.setMatrixAt(i,_m);}
  BIRD=vglow(vmesh(6*3,.1));G.add(BIRD);
  const tc=mk(64,10);TICKC=tc;TICK=new THREE.CanvasTexture(tc);TICK.magFilter=TICK.minFilter=THREE.NearestFilter;TICK.generateMipmaps=false;TICK.colorSpace=THREE.SRGBColorSpace;
  const bb=addM(G,new THREE.PlaneGeometry(9.6,1.5),new THREE.MeshBasicMaterial({map:TICK,color:COL('#ffffff',1.5)}),30,11.6,-12.85);
  addM(G,new THREE.BoxGeometry(10.2,2.1,.3),new THREE.MeshLambertMaterial({color:'#151433'}),30,11.6,-13.05);const bg=sprite(P.am,.35,12);bg.position.set(30,11.6,-13.2);G.add(bg);
  /* огоньки на крышах */
  WORLD.tops.forEach(([x,h,z],i)=>{const sp=sprite(P.rd,1.2,3);sp.position.set(x,h+1.2,z);G.add(sp);ANT.push(sp);addM(G,new THREE.BoxGeometry(.3,2.4,.3),new THREE.MeshLambertMaterial({color:'#4A4F63'}),x,h+.2,z);});
}
const wrap=(x,a,b)=>a+((((x-a)%(b-a))+(b-a))%(b-a));
function lifeAt(t){
  /* прохожие: ноги через шаг, корпус покачивается */
  PEDS.forEach((p,i)=>{const x=wrap(p.x0+p.dir*p.sp*t,-55,55),ph=(t*p.sp*1.3+p.ph)*Math.PI*2,sw=Math.sin(ph),vs=.5,ry=p.dir>0?0:Math.PI,bob=Math.abs(Math.cos(ph))*.06;
    const V=[[-.25,.25+Math.max(0,sw)*.18,sw*.22,'#2A2D3A'],[.25,.25+Math.max(0,-sw)*.18,-sw*.22,'#2A2D3A'],[-.25,.8+bob,0,p.coat],[.25,.8+bob,0,p.coat],[-.25,1.3+bob,0,p.coat],[.25,1.3+bob,0,p.coat],[0,1.82+bob,0,p.skin],[0,2.3+bob,0,p.hat]];
    V.forEach(([lx,ly,lf,c],k)=>{setV(PED,i*8+k,x+p.dir*lf,ly,p.z+lx,vs,0,ry,0);colV(PED,i*8+k,c,1);});});
  PED.instanceMatrix.needsUpdate=true;PED.instanceColor.needsUpdate=true;
  /* летающие машины */
  CARS.forEach((c,i)=>{const x=wrap(c.x0+c.dir*c.sp*t,-90,90);const V=[[-.9,0,c.col],[0,0,c.col],[.9,0,c.col],[0,.8,'#7FDCE2'],[1.7*c.dir,0,P.amL],[-1.7*c.dir,0,P.rd]];
    V.forEach(([lx,ly,col],k)=>{setV(CAR,i*6+k,x+lx,c.y+ly+Math.sin(t*2+i)*.3,c.z,.9);colV(CAR,i*6+k,col,k>=4?2:1);});
    c.f.position.set(x+2.4*c.dir,c.y,c.z);c.b.position.set(x-2.4*c.dir,c.y,c.z);});
  CAR.instanceMatrix.needsUpdate=true;CAR.instanceColor.needsUpdate=true;
  /* окна зажигаются и гаснут */
  WINS.forEach((w,i)=>{const on=rnd(Math.floor(t*w.sp+w.ph)*13+i)<.55;_c.set(on?w.c:'#1C1A3A');WINF.setColorAt(i,_c);});WINF.instanceColor.needsUpdate=true;
  /* бегущая строка */
  {const x=TICKC.getContext('2d');x.fillStyle='#0B0A1A';x.fillRect(0,0,64,10);const msg='КОПИ С УМОМ * ВКЛАДЫ * КЕШБЭК * ',w=msg.length*8,off=Math.floor(t*22)%w;
    x.drawImage(txc(msg,F8,P.amL),-off,1);x.drawImage(txc(msg,F8,P.amL),w-off,1);TICK.needsUpdate=true;}
  /* огоньки антенн мигают вразнобой */
  ANT.forEach((a,i)=>{a.visible=Math.sin(t*3.4+i*1.9)>0;});
  /* облака плывут */
  (WORLD.clouds||[]).forEach((m,i)=>{m.position.x=m.userData.x0+t*(4+i);});
  /* вывески: «24/7» мигает, остальные иногда моргают */
  WORLD.signs.forEach(([m,s],i)=>{const k=s==='24/7'?(Math.floor(t*2.5)%2?1.6:.5):(rnd(Math.floor(t*10)+i*31)<.04?.4:1.5);m.material.color.copy(COL('#ffffff',k));});
  /* птицы в небе над титулом */
  let bn=0;if(t<3.6)for(let i=0;i<6;i++){const x=-40+((t*7+i*9)%80),y=52+i%3*3+Math.sin(t*1.5+i)*1.5,z=-30-i*4,fl=Math.sin(t*14+i*2)>0?.6:-.3;
    setV(BIRD,bn++,x,y,z,.7);setV(BIRD,bn++,x-.7,y+fl,z,.7);setV(BIRD,bn++,x+.7,y+fl,z,.7);}
  for(let k=0;k<bn;k++)colV(BIRD,k,'#151433',1);BIRD.count=bn;BIRD.instanceMatrix.needsUpdate=true;if(bn)BIRD.instanceColor.needsUpdate=true;
  /* пар из люков */
  [-24,4,28].forEach((vx,j)=>{for(let k=0;k<5;k++){const ph=(t*.5+k/5+j*.3)%1;spk(vx+Math.sin(ph*6+k+j)*.6,.6+ph*5,-9.2,ph<.4?'#7D8299':'#4A4F63',.22+ph*.25);}});
  /* пылинки у камеры */
  for(let i=0;i<26;i++){const cx=CAM.position.x,x=cx+wrap(rnd(i+800)*40+t*(.6+rnd(i+801)),-20,20),y=1.5+wrap(rnd(i+802)*16+t*.4,0,16),z=-1+rnd(i+803)*6;spk(x,y,z,[P.pkL,P.amL,P.cyL,P.miL][i%4],.16);}
}
/* ═══ КАМЕРА: сплайн Кэтмелла — Рома через ключи, без остановок ═══ */
const CK=[[0,[10,20,124],[0,38,-6]],[1.3,[6,26,92],[0,36,-6]],[2.4,[0,30,66],[0,34,-6]],[3.0,[-9,8,30],[-9,6.5,-6]],[5.0,[2,8,30],[2,6.5,-6]],
  [5.6,[4,12,44],[4,11,-6]],[7.0,[3,11,40],[4,10,-6]],[7.6,[1,14,56],[1,12,-6]],[8.7,[0,26,92],[0,20,-6]],[10,[0,27,98],[0,21,-6]]];
function cr(p0,p1,p2,p3,u){const u2=u*u,u3=u2*u;return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u2+(-p0+3*p1-3*p2+p3)*u3);}
function camAt(t){let i=CK.findIndex((k,j)=>j<CK.length-1&&t>=k[0]&&t<CK[j+1][0]);if(i<0)i=CK.length-2;const u=cl((t-CK[i][0])/(CK[i+1][0]-CK[i][0]));
  const g_=(j,w)=>CK[Math.max(0,Math.min(CK.length-1,j))][w];const P3=w=>[0,1,2].map(a=>cr(g_(i-1,w)[a],g_(i,w)[a],g_(i+1,w)[a],g_(i+2,w)[a],u));
  let p=P3(1),q=P3(2);if(t>3.0&&t<5.0){const fx=hx(t)+2.5;p[0]=lerp(p[0],fx,cl(Math.min((t-3)/.4,(5-t)/.4)));q[0]=lerp(q[0],fx,cl(Math.min((t-3)/.4,(5-t)/.4)));}
  const sh=shake(t);p[0]+=sh;p[1]+=sh*.6;q[0]+=sh;
  const f=new V3(q[0]-p[0],q[1]-p[1],q[2]-p[2]),D=f.length();f.normalize();const rr=new V3().crossVectors(f,new V3(0,1,0)).normalize(),uu=new V3().crossVectors(rr,f),px=2*D*Math.tan(25*Math.PI/180)/LH;
  const P0=new V3(...p),a=P0.dot(rr),b=P0.dot(uu),da=Math.round(a/px)*px-a,db=Math.round(b/px)*px-b,off=rr.multiplyScalar(da).add(uu.multiplyScalar(db));
  camSet(p[0]+off.x,p[1]+off.y,p[2]+off.z,q[0]+off.x,q[1]+off.y,q[2]+off.z,50);}
const SHK=[[5.6,.7,.5],[5.88,.5,.3],[6.8,1.2,.6]];
function shake(t){let a=0;SHK.forEach(([t0,A,d],i)=>{const u=t-t0;if(u>=0&&u<d)a+=A*(1-u/d)*(rnd(Math.floor(t*30)+i*7)-.5)*2;});return a;}

/* ═══ КАДР ═══ */
function heroState(t){/* прыжки по улице, потом стойка перед боссом, потом зритель у башен */
  if(t<2.6)return null;
  if(t<5.0){const ph=((t-2.6)/.45)%1,hop=Math.sin(Math.PI*ph),sq=ph<.12||ph>.9?.82:1+.08*hop;return {x:hx(t),y:3.2+hop*3.4,z:-6,sq};}
  if(t<7.6)return {x:HB_X,y:3.6+Math.sin(t*3)*.3,z:-6,sq:1};
  return {x:lerp(HB_X,-30,io(P_(t,7.6,1.0))),y:3.6,z:lerp(-6,6,io(P_(t,7.6,1.0))),sq:1};}
let BUILT=false;
window.seek=function(t){
  if(!BUILT)return;
  SN=0;skyAt(t);camAt(t);titleAt(t);coinsAt(t);bossAt(t);lifeAt(t);
  WORLD.neon.forEach((l,i)=>l.intensity=90*(rnd(Math.floor(t*12)+i*31)<.03?.2:1));
  const hs=heroState(t);HERO.visible=!!hs;if(hs)heroAt(hs.x,hs.y,hs.z,t,{sq:hs.sq,hurt:t>5.88&&t<6.2,happy:(t>4.1&&t<4.5)||t>7.0,hot:t>6.3&&t<6.8,s:.26,look:t>2.6&&t<5.0?1:t<7.6&&t>5.0?1:-1});
  if(t>2.6&&t<5.1)for(let k=1;k<7;k++){const tl=2.6+k*.45,u=(t-tl)/.35;if(u<0||u>1)continue;for(let j=0;j<8;j++){const an=j/8*Math.PI*2,r=.6+u*1.6;spk(hx(tl)+Math.cos(an)*r,.7+u*.6*Math.abs(Math.sin(an)),-6+Math.sin(an)*r*.6,u<.5?'#C3C8D6':'#7D8299',.4*(1-u));}}
  if(hs&&t>2.6&&t<5.0)for(let k=0;k<6;k++){const u=((t*3+k/6)%1);spk(hs.x-1.2-u*2.5,hs.y+(rnd(k+Math.floor(t*3))-.5)*1.5,-6,P.miL,.25*(1-u));}
  /* искры: монеты, удар босса, суперудар, взрыв */
  COINT.forEach((tc,k)=>burst3(t,tc,26,hx(tc),7.2,-6,10,100+k*40,[P.amL,P.am,P.pe,P.pe2],.7,10,.3));
  if(t>5.6&&t<5.88){const u=(t-5.6)/.28,c=bossCenter(t);for(let k=0;k<6;k++){const f=cl(u-k*.06);spk(lerp(c.x-6,HB_X,f),lerp(c.y,4,f),-6,P.rdL,.6);}}
  burst3(t,5.88,24,HB_X,4,-6,9,300,[P.rdL,P.rd,P.rd2],.6,10,.3);
  if(t>6.3&&t<6.75){const u=(t-6.3)/.45;for(let i=0;i<40;i++){const ph=(u*1.6+rnd(i+600))%1,th=rnd(i+601)*6.283,r=9*(1-ph);spk(HB_X+Math.cos(th)*r,4+Math.sin(th)*r,-6+(rnd(i+602)-.5)*3,P.miL,.25+ph*.2);}}
  if(t>6.62&&t<6.85){const c=bossCenter(6.8),n=26;for(let k=0;k<n;k++){const f=k/n;spk(lerp(HB_X+1,c.x,f),lerp(4,c.y,f)+Math.sin(f*20+t*30)*.2,-6,k%2?P.miL:P.mi,.9);}}
  burst3(t,EXP,80,BPOS.x,BPOS.y,BPOS.z,26,900,[P.amL,P.pkL,P.rdL,P.rd],1.1,12,.45);
  SPK.count=SN;SPK.instanceMatrix.needsUpdate=true;if(SN)SPK.instanceColor.needsUpdate=true;
  DOME.position.copy(CAM.position);
  POST.uniforms.near.value=CAM.near;POST.uniforms.far.value=CAM.far;
  RD.setRenderTarget(RT);RD.render(S3,CAM);
  NOHIDE.forEach(o=>{o.userData.v=o.visible;o.visible=false;});S3.overrideMaterial=NMAT;RD.setRenderTarget(RTN);RD.setClearColor(0x8080ff,1);RD.clear();RD.render(S3,CAM);
  S3.overrideMaterial=null;NOHIDE.forEach(o=>{o.visible=o.userData.v;});RD.setClearColor(0x000000,0);RD.setRenderTarget(null);RD.render(PS,PC);
  /* интерфейс */
  g=HG;g.clearRect(0,0,LW,LH);hud(t,hs);
  const OW=cv.width,OH=cv.height;O.imageSmoothingEnabled=false;O.globalCompositeOperation='source-over';O.globalAlpha=1;O.drawImage(RD.domElement,0,0,OW,OH);O.drawImage(HUD,0,0,OW,OH);
  const fl=t>6.8&&t<7.2?.55*(1-(t-6.8)/.4):t>5.88&&t<6.05?.3:0;if(fl>0){O.globalAlpha=fl;O.fillStyle=t<6.5?P.rdL:P.peL;O.fillRect(0,0,OW,OH);O.globalAlpha=1;}
};
function hud(t,hs){
  /* титул */
  if(t>1.2&&t<2.7){const p=step4(t,1.2);TX('ПРО ДЕНЬГИ БЕЗ ВОДЫ',135,326,F8,P.ink,['#0B0A1A'],'c');void p;}
  if(t>1.7&&t<2.6){const o=step4(t,1.7);box(135-62*o,344,124*o,22,P.am,'#151433');if(o>=1){Tt('НАЧАТЬ ИГРУ',143,351,F8,t>2.2&&Math.floor(t*12)%2?P.am:P.ink,'c');if(Math.floor(t*3)%2===0)triR(80,351,P.am);}}
  /* улица */
  if(t>2.9&&t<5.2){const o=step4(t,2.9)*(1-step4(t,4.95));if(o>0){box(8,40,254,34*o,P.mi,'#151433');if(o>=1){Tt('ДЕНЬ 1',16,47,F8,P.mi);Tt('КОШЕЛЁК',254,47,F8,P.dim,'r');
      const w=track(t,[[0,0],[3.2,.25],[3.65,.5],[4.1,.75]],x=>spr(x,16));Tt(rub(w)+'₽',254,58,F8,P.amL,'r','#0B0A1A');}}}
  COINT.forEach(tc=>{if(t>tc&&t<tc+.8){const q=scr(hx(tc),7.2,-6);popup(t,tc,'+0,25',q[0],q[1]-24,P.amL);}});
  /* босс */
  if(t>5.2&&t<7.4){const o=step4(t,5.2)*(1-step4(t,7.2));if(o>0){box(8,40,254,30*o,P.rd,'#151433');if(o>=1){Tt('ИНФЛЯЦИЯ',16,47,F8,P.rdL);const hp=1-io(P_(t,6.8,.4));rect(16,58,238,6,'#5A1A22');rect(16,58,238*hp,6,P.rd);rect(16,58,238*hp,2,P.rdL);}}}
  if(hs&&t>5.88&&t<6.7){const q=scr(hs.x,hs.y+2.4,hs.z);popup(t,5.88,'-7,4%',q[0],q[1]-10,P.rdL);}
  if(t>5.4&&t<7.5){const o=step4(t,5.4)*(1-step4(t,7.3));if(o>0){box(8,76,254,40*o,P.dim,'#151433');if(o>=1){
      const M=[[5.45,'ИНФЛЯЦИЯ АТАКУЕТ!','СИЛА РУБЛЯ -7,4%'],[6.25,'СУПЕРУДАР: ВРЕМЯ!',''],[6.95,'ПОБЕДА!','РУБЛИ СТАНУТ БАШНЯМИ']];let m=M[0];M.forEach(x=>{if(t>=x[0])m=x;});
      Tt(typed(m[1],t,m[0],34),16,84,F8,P.ink);Tt(typed(m[2],t,m[0]+.4,34),16,98,F8,m===M[0]?P.rdL:P.miL);}}}
  /* копилка */
  if(t>7.9){const o=step4(t,7.9);box(8,40,254,58*o,P.mi,'#151433');if(o>=1){Tt('КОПИЛКА · 20 ЛЕТ',16,47,F8,P.dim);
      const v=Bal(20)*io(P_(t,8.0,1.4));TX(fmt(v)+'₽',16,60,F16,P.miL,[P.mi3]);Tt('10 000₽/МЕС · 12% УСЛ.',16,84,F8,P.mute);}}
  if(t>8.9){const s=Bal(16)/Bal(20)*40,q=scr(-26,s,-6);g.fillStyle=P.cyL;for(let x=0;x<LW;x+=4)if(Math.floor((x+t*40)/4)%2)g.fillRect(x,Math.round(q[1]),2,1);
    const o=step4(t,9.0);if(o>0){box(8,Math.round(q[1])-26,140*o,18,P.cy,'#151433');if(o>=1)Tt('ЦЕЛЬ: 16-Й ГОД',14,Math.round(q[1])-21,F8,P.cyL);}}
  if(t>9.35){const o=step4(t,9.35);box(135-60*o,104,120*o,24,P.mi,'#151433');if(o>=1)TX('ЛАНСКОЙ',135,108,F16,P.miL,[P.mi3],'c');}
}
const FACES=[F8,F16];
Promise.all(FACES.map(f=>document.fonts.load(f,'ЛАНСКОЙ₽09'))).then(()=>{
  GLOW=ctex(32,32,()=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot(x-15.5,y-15.5)/16;const a=Math.max(0,1-d);g.fillStyle=`rgba(255,255,255,${a*a})`;g.fillRect(x,y,1,1);}});
  buildWorld();buildTitle();
  CV=vmesh(400,.5);vglow(CV);S3.add(CV);SPK=vglow(vmesh(600,1));S3.add(SPK);HERO=vglow(vmesh(HN*HN*2,.55));S3.add(HERO);
  buildBossTowers();buildLife();
  S3.traverse(o=>{if(o.isSprite&&!NOHIDE.includes(o))NOHIDE.push(o);});
  BUILT=true;window.seek(0);window.READY=true;}).catch(e=>console.error('build',e&&e.stack||e));
