(()=>{
'use strict';
const T=THREE,PI=Math.PI;
const rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
let seed=11;const srand=()=>(seed=(seed*16807)%2147483647)/2147483647;
const sr=(a,b)=>a+srand()*(b-a),spick=a=>a[Math.floor(srand()*a.length)],rpick=a=>a[Math.floor(Math.random()*a.length)];
const $=id=>document.getElementById(id);
const isTouch=matchMedia('(pointer:coarse)').matches||('ontouchstart' in window);
if(isTouch)document.body.classList.add('touch');

// ---------- renderer ----------
const canvas=$('c');
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.5:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.autoClear=false;
const scene=new T.Scene();scene.background=new T.Color(0x6fd0f5);scene.fog=new T.Fog(0x6fd0f5,70,300);
const camera=new T.PerspectiveCamera(75,1,.12,520);camera.rotation.order='YXZ';
const vmScene=new T.Scene(),vmCam=new T.PerspectiveCamera(55,1,.01,10);
const hemi=new T.HemisphereLight(0xdff4ff,0xb9a27a,1.7);scene.add(hemi);
const sun=new T.DirectionalLight(0xffffff,2.4);sun.castShadow=true;
const SM=isTouch?1024:2048;sun.shadow.mapSize.set(SM,SM);
Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:220});sun.shadow.bias=-.0006;sun.shadow.normalBias=.06;
scene.add(sun,sun.target);
const vmHemi=new T.HemisphereLight(0xffffff,0xb9a27a,1.8),vmSun=new T.DirectionalLight(0xffffff,2.2);vmSun.position.set(-1,2,1.5);vmScene.add(vmHemi,vmSun);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=vmCam.aspect=w/h;camera.fov=w<h?92:74;camera.updateProjectionMatrix();vmCam.fov=w<h?70:55;vmCam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

// ---------- materials / batching ----------
const grad=new T.DataTexture(new Uint8Array([125,125,125,255,195,195,195,255,255,255,255,255]),3,1,T.RGBAFormat);
grad.minFilter=grad.magFilter=T.NearestFilter;grad.needsUpdate=true;
const toonV=new T.MeshToonMaterial({vertexColors:true,gradientMap:grad});
const outM=new T.MeshBasicMaterial({color:0x14141c,side:T.BackSide});
const glowM=new T.MeshBasicMaterial({color:0x2c5d86});
const _v=new T.Vector3(),_v2=new T.Vector3(),_c=new T.Color(),_n3=new T.Matrix3(),_m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_one=new T.Vector3(1,1,1),_p=new T.Vector3();
class Batch{
  constructor(){this.p=[];this.n=[];this.c=[];this.o=[]}
  add(g,color,m,ol){
    const gg=g.index?g.toNonIndexed():g,P=gg.attributes.position,N=gg.attributes.normal;
    if(color!==null){_c.set(color);_n3.getNormalMatrix(m);}
    if(color!==null)for(let i=0;i<P.count;i++){_v.fromBufferAttribute(P,i).applyMatrix4(m);this.p.push(_v.x,_v.y,_v.z);_v.fromBufferAttribute(N,i).applyMatrix3(_n3).normalize();this.n.push(_v.x,_v.y,_v.z);this.c.push(_c.r,_c.g,_c.b)}
    if(ol>0){gg.computeBoundingBox();const bb=gg.boundingBox,cx=(bb.min.x+bb.max.x)/2,cy=(bb.min.y+bb.max.y)/2,cz=(bb.min.z+bb.max.z)/2;
      const sx=bb.max.x-bb.min.x,sy=bb.max.y-bb.min.y,sz=bb.max.z-bb.min.z,kx=sx>1e-4?(sx+2*ol)/sx:1,ky=sy>1e-4?(sy+2*ol)/sy:1,kz=sz>1e-4?(sz+2*ol)/sz:1;
      for(let i=0;i<P.count;i++){_v.fromBufferAttribute(P,i);_v.set((_v.x-cx)*kx+cx,(_v.y-cy)*ky+cy,(_v.z-cz)*kz+cz).applyMatrix4(m);this.o.push(_v.x,_v.y,_v.z)}}
    if(gg!==g)gg.dispose();g.dispose();
  }
  geoms(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));
    let og=null;if(this.o.length){og=new T.BufferGeometry();og.setAttribute('position',new T.Float32BufferAttribute(this.o,3))}return{g,og}}
}
function inst(pr,shadow=true,mat=toonV){const grp=new T.Group(),m=new T.Mesh(pr.g,mat);m.castShadow=shadow;grp.add(m);if(pr.og)grp.add(new T.Mesh(pr.og,outM));return grp}
let B=null,OL=.07,P=new T.Matrix4();
function put(g,col,x,y,z,o){o=o||{};if(o.q)_q.copy(o.q);else _q.setFromEuler(_e.set(o.rx||0,o.ry||0,o.rz||0));_m.compose(_p.set(x,y,z),_q,_one).premultiply(P);B.add(g,col,_m,o.ol===undefined?OL:o.ol)}
const box=(w,h,d,col,x,y,z,o)=>put(new T.BoxGeometry(w,h,d),col,x,y+h/2,z,o);
const cyl=(rt,rb,h,col,x,y,z,o)=>put(new T.CylinderGeometry(rt,rb,h,(o&&o.seg)||12),col,x,y+h/2,z,o);
const cone=(r,h,col,x,y,z,o)=>put(new T.ConeGeometry(r,h,(o&&o.seg)||12),col,x,y+h/2,z,o);
const sph=(r,col,x,y,z,o)=>{const g=new T.SphereGeometry(r,14,10);if(o&&o.s)g.scale(o.s[0],o.s[1],o.s[2]);put(g,col,x,y,z,o)};
function at(x,y,z,ry,fn,rz=0){const old=P;P=old.clone().multiply(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,ry,rz)),_one));fn();P=old}
function proto(fn,ol=.035){const ob=B,oo=OL,op=P;B=new Batch();OL=ol;P=new T.Matrix4();fn();const r=B.geoms();B=ob;OL=oo;P=op;return r}
function shade(col,f){_c.set(col);return new T.Color(_c.r*f,_c.g*f,_c.b*f)}
function prismG(w,h,d){const a=w/2,b=d/2,v=[-a,0,b,a,0,b,a,h,0,-a,0,b,a,h,0,-a,h,0, a,0,-b,-a,0,-b,-a,h,0,a,0,-b,-a,h,0,a,h,0, a,0,b,a,0,-b,a,h,0, -a,0,-b,-a,0,b,-a,h,0, -a,0,b,a,0,-b,a,0,b,-a,0,b,-a,0,-b,a,0,-b];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();return g}
let fontOK='Bangers,"Comic Sans MS","Chalkboard SE","Marker Felt",Impact,sans-serif';
function textTex(text,o={}){const w=o.w||512,h=o.h||128,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');
  if(o.bg){x.fillStyle=o.bg;x.fillRect(0,0,w,h);x.lineWidth=12;x.strokeStyle='#14141c';x.strokeRect(6,6,w-12,h-12)}
  let size=o.size||h*.72;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
  do{x.font=size+'px '+fontOK;size-=4}while(x.measureText(text).width>w-44&&size>12);
  x.lineWidth=size*.22;x.strokeStyle='#14141c';x.strokeText(text,w/2,h/2+4);x.fillStyle=o.fg||'#fff';x.fillText(text,w/2,h/2+4);
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}

// ---------- collision world ----------
const colliders=[];
function solid(x0,x1,z0,z1,y0,y1,ref){const c={x0,x1,z0,z1,y0,y1,ref:ref||null,dead:false};colliders.push(c);return c}
const solidC=(cx,cz,w,d,h,y0=0,ref)=>solid(cx-w/2,cx+w/2,cz-d/2,cz+d/2,y0,y0+h,ref);
const piers=[[-22,-18,30,56],[-28,-12,52,56],[8,13,30,50],[40,66,30,42]];
function isLand(x,z){if(x>=-80&&x<=80&&z>=-78&&z<=30)return true;for(const r of piers)if(x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3])return true;return false}
const STEP=.45;
function collide(p,r,h,axis,dir){for(let i=0;i<colliders.length;i++){const c=colliders[i];if(c.dead)continue;
  if(p.x+r>c.x0&&p.x-r<c.x1&&p.z+r>c.z0&&p.z-r<c.z1&&p.y+STEP<c.y1&&p.y+h>c.y0){if(axis===0)p.x=dir>0?c.x0-r-.001:c.x1+r+.001;else p.z=dir>0?c.z0-r-.001:c.z1+r+.001}}}
function moveXZ(p,dx,dz,r,h){if(dx){p.x+=dx;collide(p,r,h,0,dx)}if(dz){p.z+=dz;collide(p,r,h,1,dz)}}
function groundAt(p,r){let g=isLand(p.x,p.z)?0:-3;r*=.8;for(let i=0;i<colliders.length;i++){const c=colliders[i];if(c.dead)continue;if(p.x+r>c.x0&&p.x-r<c.x1&&p.z+r>c.z0&&p.z-r<c.z1&&c.y1<=p.y+STEP+.02&&c.y1>g)g=c.y1}return g}
const H={t:0,nx:0,ny:0,nz:0,c:null,type:''};
function rayWorld(ox,oy,oz,dx,dy,dz,max){let best=max,bc=null,bax=-1,bs=0;
  for(let i=0;i<colliders.length;i++){const c=colliders[i];if(c.dead)continue;let t0=0,t1=best,ax=-1,as=0,ta,tb,s;
    if(Math.abs(dx)<1e-9){if(ox<c.x0||ox>c.x1)continue}else{ta=(c.x0-ox)/dx;tb=(c.x1-ox)/dx;s=-1;if(ta>tb){s=ta;ta=tb;tb=s;s=1}if(ta>t0){t0=ta;ax=0;as=s}if(tb<t1)t1=tb;if(t0>t1)continue}
    if(Math.abs(dy)<1e-9){if(oy<c.y0||oy>c.y1)continue}else{ta=(c.y0-oy)/dy;tb=(c.y1-oy)/dy;s=-1;if(ta>tb){s=ta;ta=tb;tb=s;s=1}if(ta>t0){t0=ta;ax=1;as=s}if(tb<t1)t1=tb;if(t0>t1)continue}
    if(Math.abs(dz)<1e-9){if(oz<c.z0||oz>c.z1)continue}else{ta=(c.z0-oz)/dz;tb=(c.z1-oz)/dz;s=-1;if(ta>tb){s=ta;ta=tb;tb=s;s=1}if(ta>t0){t0=ta;ax=2;as=s}if(tb<t1)t1=tb;if(t0>t1)continue}
    if(ax>=0&&t0<best){best=t0;bc=c;bax=ax;bs=as}}
  H.c=bc;H.nx=H.ny=H.nz=0;H.type=bc?'c':'';if(bc){if(bax===0)H.nx=bs;else if(bax===1)H.ny=bs;else H.nz=bs}
  if(dy<0){let t=-oy/dy;if(t<best){if(isLand(ox+dx*t,oz+dz*t)){best=t;H.c=null;H.type='g';H.nx=H.nz=0;H.ny=1}else{t=(-.7-oy)/dy;if(t<best){best=t;H.c=null;H.type='w';H.nx=H.nz=0;H.ny=1}}}}
  H.t=best;return H.type!==''}
function raySphere(ox,oy,oz,dx,dy,dz,cx,cy,cz,r){const lx=cx-ox,ly=cy-oy,lz=cz-oz,b=lx*dx+ly*dy+lz*dz,d2=lx*lx+ly*ly+lz*lz-b*b;if(d2>r*r)return -1;const h=Math.sqrt(r*r-d2),t=b-h;return t>0?t:(b+h>0?0:-1)}

// ---------- flow field ----------
const GX0=-80,GZ0=-78,GW=160,GH=136,blocked=new Uint8Array(GW*GH),dist=new Uint16Array(GW*GH),fq=new Int32Array(GW*GH);
function buildGrid(){for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const x=GX0+i+.5,z=GZ0+j+.5;let b=isLand(x,z)?0:1;
  if(!b)for(const c of colliders){if(c.y0<1.3&&c.y1>.5&&x>c.x0-.45&&x<c.x1+.45&&z>c.z0-.45&&z<c.z1+.45){b=1;break}}blocked[j*GW+i]=b}}
function flow(px,pz){dist.fill(65535);let ci=clamp(Math.floor(px-GX0),0,GW-1),cj=clamp(Math.floor(pz-GZ0),0,GH-1),s=cj*GW+ci;
  if(blocked[s]){let bd=1e9;for(let dj=-4;dj<=4;dj++)for(let di=-4;di<=4;di++){const i=ci+di,j=cj+dj;if(i<0||j<0||i>=GW||j>=GH||blocked[j*GW+i])continue;const d=di*di+dj*dj;if(d<bd){bd=d;s=j*GW+i}}if(bd===1e9)return}
  let h=0,t=0;fq[t++]=s;dist[s]=0;while(h<t){const k=fq[h++],d=dist[k]+1,i=k%GW;
    if(i>0&&!blocked[k-1]&&dist[k-1]>d){dist[k-1]=d;fq[t++]=k-1}if(i<GW-1&&!blocked[k+1]&&dist[k+1]>d){dist[k+1]=d;fq[t++]=k+1}
    if(k>=GW&&!blocked[k-GW]&&dist[k-GW]>d){dist[k-GW]=d;fq[t++]=k-GW}if(k<GW*GH-GW&&!blocked[k+GW]&&dist[k+GW]>d){dist[k+GW]=d;fq[t++]=k+GW}}}
function cellDist(x,z){const i=Math.floor(x-GX0),j=Math.floor(z-GZ0);if(i<0||j<0||i>=GW||j>=GH)return 65535;return blocked[j*GW+i]?65535:dist[j*GW+i]}
function fieldDir(e,out){const i=clamp(Math.floor(e.pos.x-GX0),0,GW-1),j=clamp(Math.floor(e.pos.z-GZ0),0,GH-1),own=blocked[j*GW+i]?65535:dist[j*GW+i];
  let best=own,bi=-1,bj=-1;if(own<=2||own===65535&&false){out.set(player.pos.x-e.pos.x,0,player.pos.z-e.pos.z).normalize();return}
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=GW||nj>=GH)continue;const k=nj*GW+ni;if(blocked[k])continue;
    if(di&&dj&&(blocked[j*GW+ni]||blocked[nj*GW+i]))continue;if(dist[k]<best){best=dist[k];bi=ni;bj=nj}}
  if(bi<0)out.set(player.pos.x-e.pos.x,0,player.pos.z-e.pos.z);else out.set(GX0+bi+.5-e.pos.x,0,GZ0+bj+.5-e.pos.z);out.normalize()}

// ---------- world ----------
const WB=new Batch(),GB=new Batch(),dyn={barrels:[],vends:[],bell:null,fountain:null,beam:null,clouds:[],boats:[],sunMesh:null,sea:null};
const spawnPts=[],pickSpots=[];
function gbox(w,h,d,x,y,z){const ob=B;B=GB;box(w,h,d,0xffffff,x,y,z,{ol:0});B=ob}
function gsph(r,x,y,z){const ob=B;B=GB;sph(r,0xffffff,x,y,z,{ol:0});B=ob}
function sign(text,w,h,x,y,z,bg,fg){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textTex(text,{w:512,h:Math.round(512*h/w),bg,fg})}));
  m.matrixAutoUpdate=false;m.matrix.copy(P).multiply(new T.Matrix4().makeTranslation(x,y,z));scene.add(m)}
const roofProps={
  ice(y){cone(1,2.4,0xe9b25f,0,y+.2,0,{rx:PI});sph(1.05,0xff8fb3,0,y+3,0);sph(.85,0xa6f0c6,0,y+4.2,0);sph(.3,0xe0281e,0,y+5.15,0)},
  fries(y){box(2,1.5,1,0xe0281e,0,y,0);for(let i=0;i<6;i++)box(.26,1.5,.26,0xffd23f,-.75+i*.3,y+1+srand()*.5,sr(-.2,.2),{rz:sr(-.25,.25)})},
  fish(y){cyl(.12,.12,1.2,0x444a66,0,y,0);sph(1,0x4f9dde,0,y+1.9,0,{s:[2,1,.55]});cone(.8,1.1,0x3b7fc4,2.3,y+1.35,0,{rz:PI/2});sph(.22,0xffffff,-1.2,y+2.15,.42);sph(.1,0x111111,-1.25,y+2.15,.6,{ol:0})},
  mussel(y){sph(1.5,0x39406e,0,y+.75,0,{s:[1,.42,1.15]});sph(1.5,0x4a5390,0,y+1.5,-.5,{s:[1,.42,1.15],rx:-.6});sph(.45,0xfff6e6,0,y+1.2,.35)},
  tank(y){for(const[a,b]of[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]])box(.14,.9,.14,0x5a4632,a,y,b);cyl(1,1,1.5,0xa9744a,0,y+.9,0);cone(1.15,.7,0x6b4a2f,0,y+2.4,0)},
  ac(y){box(1.5,.8,1.1,0xb8c0cc,0,y,0);cyl(.3,.3,.1,0x555b70,0,y+.8,0)},
  chim(y){box(.8,1.6,.8,0xb5553c,0,y,0);box(1,.25,1,0x8a3f2c,0,y+1.6,0)},
  donut(y){cyl(.12,.12,1,0x444a66,0,y,0);put(new T.TorusGeometry(.95,.42,10,18),0xff8fb3,0,y+2.3,0);put(new T.TorusGeometry(.95,.3,8,18),0xfff6e6,0,y+2.3,.2,{ol:0})},
  crab(y){sph(1.1,0xe8452c,0,y+.8,0,{s:[1.3,.7,.9]});sph(.4,0xe8452c,-1.6,y+1.5,0);sph(.4,0xe8452c,1.6,y+1.5,0);sph(.2,0xffffff,-.4,y+1.8,.3);sph(.2,0xffffff,.4,y+1.8,.3)},
  bubbles(y){sph(.7,0xbfe9ff,-.5,y+.9,0);sph(.5,0xdff4ff,.5,y+1.5,.2);sph(.3,0xffffff,.1,y+2.3,-.1)},
  octo(y){sph(1,0x9b5de5,0,y+1.6,0,{s:[1,1.2,1]});for(let i=0;i<5;i++){const a=i/5*PI*2;cyl(.18,.1,1.2,0x9b5de5,Math.cos(a)*.8,y,Math.sin(a)*.8)}sph(.22,0xffffff,-.35,y+1.8,.85);sph(.22,0xffffff,.35,y+1.8,.85)}
};
function windows(w,d,h,y0){for(let y=y0;y+1.7<h-.4;y+=2.9){const n=Math.max(1,Math.floor((w-1)/2.5));for(let i=0;i<n;i++){const x=(i-(n-1)/2)*(w/n);for(const s of[1,-1]){box(1.4,1.7,.12,0xfff6e6,x,y,s*(d/2+.02),{ol:.04});gbox(1.1,1.4,.2,x,y+.15,s*(d/2+.02));box(1.6,.14,.35,0xfff6e6,x,y-.14,s*(d/2+.1),{ol:.04})}}
    const n2=Math.max(1,Math.floor((d-1)/3));for(let i=0;i<n2;i++){const z=(i-(n2-1)/2)*(d/n2);for(const s of[1,-1]){box(.12,1.7,1.4,0xfff6e6,s*(w/2+.02),y,z,{ol:.04});gbox(.2,1.4,1.1,s*(w/2+.02),y+.15,z)}}}}
function building(x0,x1,z0,z1,h,col,o){o=o||{};const face=o.face||'s',rot={s:0,n:PI,e:PI/2,w:-PI/2}[face],sw=face==='e'||face==='w';
  const cx=(x0+x1)/2,cz=(z0+z1)/2,w=sw?z1-z0:x1-x0,d=sw?x1-x0:z1-z0;solid(x0,x1,z0,z1,0,h+.4);
  at(cx,0,cz,rot,()=>{box(w,h,d,col,0,0,0);box(w+.7,.45,d+.7,shade(col,.72),0,h,0);box(w+.12,.55,d+.12,shade(col,.6),0,0,0,{ol:0});
    const fz=d/2,dx=-w/2+1.5;
    if(o.house){box(1.3,2.3,.16,o.door||0x7a4a2a,0,0,fz+.03);sph(.08,0xffd23f,.4,1.1,fz+.14,{ol:0});windows(w,d,h,1.1);put(prismG(w+.9,o.roofH||2.6,d+.9),o.roof||0xb5553c,0,h+.4,0);if(srand()<.6)roofProps.chim(h+1)}
    else{box(1.5,2.5,.16,o.door||0x7a4a2a,dx,0,fz+.03);gbox(.8,.8,.24,dx,1.4,fz+.03);sph(.08,0xffd23f,dx+.5,1.15,fz+.14,{ol:0});
      const ww=w-3.6,wx=dx+1.3+ww/2;box(ww+.3,2,.12,0xfff6e6,wx,.75,fz+.02,{ol:.04});gbox(ww,1.7,.2,wx,.9,fz+.02);
      if(o.awn){const n=Math.round(w/.9);for(let i=0;i<n;i++)box(w/n,.1,1.5,i%2?o.awn[0]:o.awn[1],-w/2+(i+.5)*w/n,2.95,fz+.72,{rx:.33})}
      box(w*.82,1.25,.2,0x2b2f4a,0,3.55,fz+.06);if(o.sign)sign(o.sign,w*.78,1.05,0,4.18,fz+.18,o.sbg||'#fff3c4',o.sfg||'#ff4b5c');
      windows(w,d,h,5.3);if(o.prop)roofProps[o.prop](h+.45);else roofProps[spick(['ac','tank','chim'])](h+.45)}
  },o.lean||0)}
function lamp(x,z,dz){cyl(.09,.13,4.6,0x2f3550,x,0,z);box(.1,.1,1,0x2f3550,x,4.5,z+dz*.45);cone(.4,.3,0x2f3550,x,4.35,z+dz*.9);gsph(.26,x,4.25,z+dz*.9);solidC(x,z,.3,.3,4.6)}
function tree(x,z,s=1){cyl(.22*s,.3*s,2.2*s,0x8a5a2b,x,0,z);sph(1.5*s,0x5cb85c,x,3*s,z);sph(1.1*s,0x6fd26f,x+.9*s,3.7*s,z+.3*s);sph(1*s,0x4aa84a,x-.8*s,3.5*s,z-.4*s);solidC(x,z,.6*s,.6*s,2.2*s)}
function crate(x,z,s,y=0,col){col=col||spick([0xc9995a,0xb9824f,0xd6a968]);box(s,s,s,col,x,y,z,{ry:0});box(s+.04,.14,s+.04,shade(col,.7),x,y+s*.5-.07,z,{ol:0});solidC(x,z,s,s,s,y)}
function bench(x,z,ry){at(x,0,z,ry,()=>{box(1.8,.12,.5,0xb9824f,0,.45,0);box(1.8,.5,.1,0xb9824f,0,.6,-.25);box(.1,.45,.45,0x2f3550,-.75,0,0);box(.1,.45,.45,0x2f3550,.75,0,0)});const sw=Math.abs(Math.sin(ry))>.5;solidC(x,z,sw?.6:1.8,sw?1.8:.6,.6)}
function wall(axis,a0,a1,c,h,col,ops){ops=(ops||[]).slice().sort((p,q)=>p[0]-q[0]);const th=.4;let a=a0;
  const seg=(s,e,y0,y1)=>{if(e-s<.01||y1-y0<.01)return;if(axis==='x'){box(e-s,y1-y0,th,col,(s+e)/2,y0,c,{ol:0});solid(s,e,c-th/2,c+th/2,y0,y1)}else{box(th,y1-y0,e-s,col,c,y0,(s+e)/2,{ol:0});solid(c-th/2,c+th/2,s,e,y0,y1)}};
  const tr=(s,e,y0,y1)=>{const tc=0x8a5a2b,k=.16,d=th+.14;if(axis==='x'){box(k,y1-y0,d,tc,s,y0,c,{ol:.04});box(k,y1-y0,d,tc,e,y0,c,{ol:.04});box(e-s+k,k,d,tc,(s+e)/2,y1-k/2,c,{ol:.04});if(y0>0)box(e-s+k,k,d+.2,tc,(s+e)/2,y0-k/2,c,{ol:.04})}else{box(d,y1-y0,k,tc,c,y0,s,{ol:.04});box(d,y1-y0,k,tc,c,y0,e,{ol:.04});box(d,k,e-s+k,tc,c,y1-k/2,(s+e)/2,{ol:.04});if(y0>0)box(d+.2,k,e-s+k,tc,c,y0-k/2,(s+e)/2,{ol:.04})}};

  for(const[s,e,y0,y1]of ops){seg(a,s,0,h);seg(s,e,0,y0);seg(s,e,y1,h);tr(s,e,y0,y1);a=e}seg(a,a1,0,h)}
function barrelAt(x,z){dyn.barrels.push({x,z,cd:0})}
function vend(x,z,ry){at(x,0,z,ry,()=>{box(1.2,2.2,.9,0x2ec4b6,0,0,0);gbox(.8,1,.1,-.1,1,.46);box(.25,.5,.1,0x14141c,.42,1.2,.46,{ol:0});box(.8,.3,.1,0x14141c,-.1,.3,.46,{ol:0})});
  const sw=Math.abs(Math.sin(ry))>.5,v={x,z,cd:0,fx:Math.sin(ry),fz:Math.cos(ry)};v.c=solidC(x,z,sw?.9:1.2,sw?1.2:.9,2.2,0,{type:'vend',o:v});dyn.vends.push(v)}

function buildWorld(){
  B=WB;OL=.07;
  box(160,3,108,0xd8cbb0,0,-3,-24,{ol:0});box(160,2.2,.5,0x8d8fa3,0,-3,29.95,{ol:0});
  const road=(x0,x1,z0,z1,col=0x5b6078)=>box(x1-x0,.03,z1-z0,col,(x0+x1)/2,0,(z0+z1)/2,{ol:0});
  road(-80,80,-4,4);road(-50,36,16,24);road(-80,80,-44,-36);road(-34,-26,-36,-4);road(-34,-26,4,16);road(26,34,-36,-4);road(26,34,4,16);
  road(-2,2,-36,-4,0x8a8698);road(-2,2,4,16,0x8a8698);
  for(let x=-77;x<78;x+=5){if(Math.abs(Math.abs(x)-30)<5.5||Math.abs(x)<3.5)continue;box(2.2,.02,.25,0xf6e58d,x,.03,0,{ol:0});box(2.2,.02,.25,0xf6e58d,x,.03,-40,{ol:0});if(x>-48&&x<26)box(2.2,.02,.25,0xf6e58d,x,.03,20,{ol:0})}
  for(let z=-3.5;z<4;z+=1){box(3,.02,.5,0xffffff,0,.03,z,{ol:0});box(3,.02,.5,0xffffff,0,.03,z+20,{ol:0})}
  box(116,.03,6,0xc79a63,-22,0,27,{ol:0});for(let x=-79;x<36;x+=2)box(.08,.02,6,0x9c7446,x,.03,27,{ol:0});
  box(30,.04,15,0xf4dc93,-65,0,22.5,{ol:0});box(44,.03,26,0xb9bccb,58,0,17,{ol:0});
  box(32,.04,29,0x86d16a,-52,0,-20.5,{ol:0});
  // piers
  for(const[x0,x1,z0,z1]of piers){const con=x0===40;box(x1-x0,.5,z1-z0,con?0xb9bccb:0xc79a63,(x0+x1)/2,-.5,(z0+z1)/2,{ol:0});
    for(let z=z0+1;z<=z1;z+=5)for(const x of[x0+.15,x1-.15])cyl(.2,.2,3.2,0x7a5a3a,x,-3,z,{ol:.05});
    if(!con)for(let z=z0+.5;z<z1;z+=1.2)box(x1-x0,.02,.07,0x9c7446,(x0+x1)/2,0,z,{ol:0})}
  for(let x=-46;x<=34;x+=6){if(Math.abs(x+20)<3||Math.abs(x-10.5)<3.5)continue;cyl(.22,.28,.7,0x3d4259,x,0,29.3);sph(.3,0x3d4259,x,.75,29.3,{s:[1,.5,1]});solidC(x,29.3,.5,.5,.8)}
  // --- shops south of Main (front north) ---
  const A=(x0,x1,h,col,o)=>building(x0,x1,6.5,14.6,h,col,Object.assign({face:'n'},o));
  A(-67,-57,7.6,0x7fd1ae,{sign:'REJENS HÆVN · MADDING',awn:[0xffffff,0x2ec4b6],prop:'fish',lean:.012});
  A(-56,-47,8.4,0xffb3c7,{sign:'FYRTÅRNETS IS',awn:[0xffffff,0xff8fb3],prop:'ice',sfg:'#ff5d8f',lean:-.015});
  A(-46,-36.5,7.2,0xf7d774,{sign:'ONKEL ANKERS ANKRE',awn:[0xffffff,0x3d6fd9],sfg:'#3d6fd9',lean:.01});
  A(-23.5,-13.5,8,0x9ad1ff,{sign:'TORSK & CO.',awn:[0xffffff,0x3d6fd9],prop:'fish',sfg:'#3d6fd9',lean:-.012});
  A(-12.5,-3,7.4,0xff9f6b,{sign:'POMMES FRITZ',awn:[0xffd23f,0xe0281e],prop:'fries',lean:.016});
  // --- shops north of Main (front south) ---
  const N=(x0,x1,h,col,o)=>building(x0,x1,-14.6,-6.5,h,col,Object.assign({face:'s'},o));
  N(-23.5,-13.5,8.6,0xffe2a8,{sign:'BØLGENS BAGERI',awn:[0xffffff,0xff8fb3],prop:'donut',sfg:'#c2578a',lean:.014});
  N(-12.5,-3,7.6,0xc8a2e8,{sign:'KRABBEKÆLDEREN',awn:[0xffffff,0x9b5de5],prop:'crab',sfg:'#9b5de5',lean:-.01});
  N(3,12.5,7.8,0xa8e6cf,{sign:'SØMANDENS VASKERI',awn:[0xffffff,0x2ec4b6],prop:'bubbles',sfg:'#1f9e92',lean:.012});
  N(13.5,23.5,8.8,0xf4a6a6,{sign:'BLÆK & SPRUT TATOVERING',awn:[0x2b2f4a,0xff4b5c],prop:'octo',lean:-.016});
  // --- row facing North St ---
  const R3=(x0,x1,h,col,o)=>building(x0,x1,-34.5,-26,h,col,Object.assign({face:'n'},o));
  R3(-23.5,-13.5,11.5,0xe8c39e,{sign:'HOTEL HAVBLIK',awn:[0xffffff,0xe0281e],lean:.008});
  R3(-12.5,-3,10,0xb5d8f0,{sign:'MÅGE-MUSEET',awn:[0xffffff,0x5b6078],sfg:'#3d6fd9',lean:-.01});
  R3(3,12.5,12.4,0xd9e8a0,{sign:'KIOSK KVIK',awn:[0xffd23f,0x2ec4b6],lean:.01});
  R3(13.5,23.5,9.6,0xf7b267,{sign:'NETTETS NET & GARN',awn:[0xffffff,0xf79d65],lean:-.008});
  // --- houses north ---
  const hc=[0xff9f9f,0x9ad1ff,0xfff1a8,0xb8e8b0,0xd9b8f0,0xffc78f,0x8fe0d8],rc=[0xb5553c,0x5b6078,0x8a4f7d,0x3d6fd9];
  for(let x=-67,i=0;x<66;i++){const w=sr(7.5,10.5),x1=Math.min(x+w,67);building(x,x1,-56,-46.5,sr(5,8.5),hc[i%hc.length],{face:'s',house:true,roof:rc[i%rc.length],roofH:sr(2,3.4),lean:sr(-.018,.018)});x=x1+sr(.8,1.6)}
  // --- solid warehouse NE ---
  building(38,66,-30,-7,9,0x8fa3b8,{face:'s',sign:'LAGER 3 · IS & ISENKRAM',prop:'tank',sbg:'#dfe6ee',sfg:'#3d4259'});
  building(40,60,-34.4,-31,5,0xa8b8c8,{face:'n',sign:'TOLD',prop:'ac'});
  // --- restaurant (enterable) x4..23 z6.5..14.6 ---
  {const c=0xfff1a8,h=4.2;wall('x',4,23,6.7,h,c,[[7,10,0,2.8],[11.5,21.5,1,3.3]]);wall('x',4,23,14.4,h,c,[[16.5,19.5,0,2.8],[6,14.5,1,3.3]]);wall('z',6.9,14.2,4.2,h,c);wall('z',6.9,14.2,22.8,h,c);
    box(19.8,.45,8.9,0xe0a84a,13.5,h,10.55);for(const[px,pz]of[[4.1,6.6],[22.9,6.6],[4.1,14.5],[22.9,14.5]])box(.6,h,.6,0xe0a84a,px,0,pz);solid(3.8,23.2,6.3,14.8,h,h+.45);
    for(let i=0;i<9;i++)for(let j=0;j<4;j++)box(2.05,.03,1.9,(i+j)%2?0x2b2f4a:0xfff6e6,5.1+i*2.05,0,7.85+j*1.85,{ol:0});
    const n=21;for(let i=0;i<n;i++){box(19/n,.1,1.5,i%2?0xe0281e:0xffffff,4+(i+.5)*19/n,3.2,5.95,{rx:-.33});box(19/n,.1,1.5,i%2?0xe0281e:0xffffff,4+(i+.5)*19/n,3.2,15.15,{rx:.33})}
    at(13.5,0,10.5,0,()=>{roofProps.mussel(h+.45)});
    at(13.5,0,6.5,PI,()=>{box(9,1.2,.2,0x2b2f4a,0,4.75,0);sign('DEN GLADE MUSLING',8.6,1,0,5.35,.14,'#fff3c4','#ff4b5c')});
    at(13.5,0,14.6,0,()=>{box(9,1.2,.2,0x2b2f4a,0,4.75,0);sign('FISH & FRITTER',8.6,1,0,5.35,.14,'#fff3c4','#3d6fd9')});
    box(1,1.1,5,0x2ec4b6,19.6,0,10.6);box(1.3,.12,5.3,0xfff6e6,19.6,1.1,10.6);solidC(19.6,10.6,1.2,5.2,1.2);
    for(let z=8.8;z<13;z+=1.2){cyl(.05,.05,.7,0x555b70,18.5,0,z,{ol:.03});cyl(.28,.28,.12,0xe0281e,18.5,.7,z,{ol:.04})}
    box(.6,2.4,5,0xb9824f,22.2,0,10.6);for(let i=0;i<5;i++)sph(.2,spick([0xe0281e,0xffd23f,0x86d16a]),22,1.3+(i%2)*.7,8.8+i*.9);solidC(22.2,10.6,.6,5,2.4);
    for(const[tx,tz]of[[7.5,9],[11.5,12],[14.5,9],[8,12.6]]){cyl(.08,.2,.8,0x555b70,tx,0,tz,{ol:.03});cyl(.75,.75,.1,0xfff6e6,tx,.8,tz);sph(.14,0xe0281e,tx+.2,1,tz,{s:[1,1.6,1]});sph(.14,0xffd23f,tx-.2,1,tz+.1,{s:[1,1.6,1]});solidC(tx,tz,1.1,1.1,.9)}
    for(const x of[8,13,18])gsph(.3,x,3.5,10.5);
    const pl=new T.PointLight(0xffe2a8,30,22,1.6);pl.position.set(13.5,3.4,10.5);scene.add(pl)}
  // --- warehouse (enterable) x40..64 z8..24 ---
  {const c=0x7fb0c9,h=7;wall('x',40,64,24,h,c,[[48,56,0,5]]);wall('x',40,64,8,h,c,[[57,60,0,2.8]]);wall('z',8.2,23.8,40,h,c,[[13,18,0,5]]);wall('z',8.2,23.8,64,h,c);
    box(25,.5,17,0x5b7f96,52,h,16);for(const[px,pz]of[[40,8],[64,8],[40,24],[64,24]])box(.7,h,.7,0x5b7f96,px,0,pz);solid(39.6,64.4,7.6,24.4,h,h+.5);box(25.4,.3,.4,0x5b7f96,52,5,24.25,{ol:0});
    at(52,0,24.25,0,()=>{box(9,1.3,.2,0x2b2f4a,0,5.5,0);sign('LAGER 7 · FISK & FUSK',8.6,1.05,0,6.15,.14,'#ffd23f','#2b2f4a')});
    for(const[x,z]of[[43,10.5],[43,12.6],[45.1,10.5],[61,21],[61,18.9],[58.9,21],[50,14],[52.1,14],[50,16.1],[46,20.5]])crate(x,z,2);
    crate(43,10.5,2,2);crate(61,21,2,2);crate(50,14,2,2,0x4f9dde);crate(54.4,16.4,1.2);crate(47.5,11.2,1.2,0,0x86d16a);crate(57,12,1.2);
    box(.5,4.5,6,0x555b70,63.2,0,13);for(let y=1;y<4.5;y+=1.3)box(1.2,.1,6,0xb8c0cc,62.8,y,13,{ol:.03});solidC(63,13,1.6,6,4.5);
    at(53,0,20,.5,()=>{box(1.3,.9,2,0xffd23f,0,.3,0);box(1.1,1.3,.9,0xffd23f,0,1.2,-.5);box(.1,2.4,.1,0x2b2f4a,-.4,.3,1.1);box(.1,2.4,.1,0x2b2f4a,.4,.3,1.1);box(.18,.08,1.1,0x555b70,-.4,.5,1.7);box(.18,.08,1.1,0x555b70,.4,.5,1.7);for(const[a,b]of[[-.7,-.6],[.7,-.6],[-.7,.7],[.7,.7]])cyl(.35,.35,.25,0x14141c,a,.35,b,{rz:PI/2,ol:.03})});solidC(53,20,2.2,2.6,2.4);
    for(const x of[46,52,58])gbox(1.6,.15,.5,x,6.6,16);
    const pl=new T.PointLight(0xdff4ff,60,34,1.5);pl.position.set(52,6,16);scene.add(pl);
    barrelAt(47,17);barrelAt(57,18.5);barrelAt(60,10.5)}
  // --- warehouse yard & cargo dock ---
  const cont=(x,z,col,y=0,ry=0)=>{const sw=ry!==0;at(x,y,z,ry,()=>{box(6,2.6,2.5,col,0,0,0);for(let i=-2.5;i<=2.5;i+=1)box(.12,2.3,2.54,shade(col,.8),i,.15,0,{ol:0})});solidC(x,z,sw?2.5:6,sw?6:2.5,2.6,y)};
  cont(45,34,0xe0562c);cont(45,34,0x2ec4b6,2.6);cont(52.5,34,0x3d6fd9);cont(60,38.5,0xffd23f);cont(60,38.5,0xe0562c,2.6);cont(70,12,0x86d16a,0,PI/2);cont(73,12,0x9b5de5,0,PI/2);cont(71.5,12,0xf79d65,2.6,PI/2);cont(72,24,0x3d6fd9);
  for(const[x,z]of[[38,27],[39.4,27.6],[68,27],[66,3],[74,-2.5]])crate(x,z,1.2);barrelAt(50,39);barrelAt(63,33);barrelAt(70,20);barrelAt(37.5,12);
  // crane
  {const y=0xf5b700;for(const[x,z]of[[47,36.5],[47,41],[56,36.5],[56,41]]){box(.7,12,.7,y,x,0,z);solidC(x,z,.7,.7,12)}box(10,.8,5.5,y,51.5,12,38.75);box(2.4,2,2.4,0xfff6e6,48.5,12.8,38.75);gbox(2.5,1,1.6,48.5,13.3,38.75);
    box(22,.9,1,y,58,14.8,38.75);box(.12,5,.12,0x2b2f4a,66,9.8,38.75,{ol:.03});box(1,.6,1,0x555b70,66,9.2,38.75);cont(66,38.6,0xff8fb3,6.6)}
  // --- props ---
  for(const x of[-62,-44,-21,-6,6,21,44,62]){lamp(x,4.4,-1);lamp(x+3,-4.4,1);lamp(x,-35.6,-1);lamp(x+3,-44.4,1)}
  for(const x of[-44,-21,-6,21])lamp(x,24.5,-1);
  for(const[x,z,s]of[[-64,-30,1.2],[-58,-12,1],[-44,-30,1.1],[-40,-10,1.3],[-66,-18,.9],[-48,-22,1.2]])tree(x,z,s);
  for(const x of[-72,72,-60,60,-45,45])tree(x,-60.5,1.3);
  bench(-52,-27,0);bench(-58,-20,PI/2);bench(-46,-13,PI);bench(-10,26,PI);bench(18,26,PI);bench(-36,26,PI);
  // fountain
  cyl(3,3.2,.7,0xb9bccb,-52,0,-20);cyl(2.6,2.6,.1,0x4fc3e8,-52,.62,-20,{ol:0});cyl(.4,.6,1.6,0xb9bccb,-52,.6,-20);sph(.7,0xf79d65,-52,2.7,-20,{s:[.7,1.3,1.6]});cone(.5,.8,0xf79d65,-52,2.3,-21.3,{rx:-PI/2});solidC(-52,-20,5.4,5.4,.7);dyn.fountain={x:-52,y:3.5,z:-20};
  // back alleys
  const dump=(x,z,col)=>{box(2.6,1.3,1.4,col,x,0,z);box(2.7,.14,1.5,shade(col,.7),x,1.3,z,{rz:.06});solidC(x,z,2.6,1.4,1.4)};
  dump(-18,-16,0x3f8f6b);dump(9,-24.5,0x3d6fd9);dump(-8,-24.6,0x8a4f7d);dump(19,-16,0x3f8f6b);
  for(const[x,z]of[[-21,-24],[-19.6,-24.3],[-6,-17],[6,-17.5],[15,-24],[16.4,-23.6],[22,-20]])crate(x,z,1.2);crate(-21,-24,1.2,1.2);crate(15,-24,1.2,1.2);
  barrelAt(-12,-20);barrelAt(12,-20);barrelAt(-22,-18);barrelAt(0,-30);barrelAt(-40,10);barrelAt(25,27.5);barrelAt(-30,27.5);barrelAt(-26.5,54.5);barrelAt(10.5,44);
  vend(-24.6,10,-PI/2);vend(2.6,-10,PI/2);vend(-36,27.6,PI);vend(36.9,6,PI/2);vend(-37.5,-34.5,PI);
  // trash cans / hydrants / mailboxes
  for(const[x,z]of[[-15,5.2],[10,-5.2],[-40,5.3],[20,-35.2],[-8,24.6]]){cyl(.35,.3,.9,0x5f7fbf,x,0,z);cyl(.4,.4,.12,0x3d4259,x,.9,z);solidC(x,z,.7,.7,1)}
  for(const[x,z]of[[-25.2,-5],[25.2,5],[-25,-35],[35,-5]]){cyl(.18,.22,.6,0xe0281e,x,0,z);sph(.2,0xe0281e,x,.68,z);box(.6,.14,.14,0xe0281e,x,.4,z);solidC(x,z,.45,.45,.8)}
  // beach
  for(const[x,z,c]of[[-70,20,0xff4b5c],[-62,25,0x2ec4b6],[-56,19,0xffd23f]]){cyl(.06,.06,2.4,0xfff6e6,x,0,z,{ol:.03});cone(1.7,.8,c,x,2.3,z,{seg:8});box(1.9,.05,.9,spick([0xff8fb3,0x9ad1ff,0xfff6e6]),x+1.3,.04,z+.6,{ol:.03})}
  cyl(.7,.9,.6,0xe6c877,-74,0,26);cyl(.4,.5,.5,0xe6c877,-74,.6,26);cone(.3,.5,0xe6c877,-74,1.1,26);sph(.55,0xff4b5c,-66,.55,27.5);
  // quay stuff: fish crates, bell post
  for(const[x,z]of[[-14,28.4],[-12.7,28.2],[4,28.3],[16,28.5]]){box(1.1,.5,.8,0x4f9dde,x,0,z);sph(.3,0xc0c8d4,x,.55,z,{s:[1.4,.5,.8]});solidC(x,z,1.1,.8,.5)}
  box(.2,3,.2,0x7a5a3a,-16.5,0,31.5);box(1.2,.16,.2,0x7a5a3a,-17,3,31.5);solidC(-16.5,31.5,.3,.3,3);
  // parasol tables by restaurant
  for(const x of[7.5,12]){cyl(.06,.06,2.5,0xfff6e6,x,0,15.6,{ol:.03});cone(1.5,.7,0xe0281e,x,2.4,15.6,{seg:8});cyl(.7,.7,.08,0xfff6e6,x,.8,15.6);solidC(x,15.6,.3,.3,2.4)}
  // road ends
  for(const[x,z]of[[-79,0],[79,0],[-79,-40],[79,-40]]){for(let i=-3;i<=3;i+=2)box(.2,1,1.6,i%4?0xff4b5c:0xffffff,x,0,z+i,{ol:.04});box(.25,.3,7.6,0xffffff,x,.9,z);solidC(x,z,.4,8,1.4)}
  // backdrop hills / rocks / lighthouse
  OL=.6;for(const[x,z,r,s]of[[-110,-110,50,.5],[-30,-130,60,.55],[50,-120,55,.45],[125,-90,45,.6],[-140,-40,45,.5],[150,-10,40,.55],[-150,40,30,.4]])sph(r,spick([0x6fc26a,0x5cb85c,0x86d16a]),x,-4,z,{s:[1.3,s,1]});
  OL=.25;for(const[x,z,h]of[[-96,-20,18],[-100,6,14],[98,-22,20],[102,2,13],[-95,-48,16],[96,-50,15]]){box(14,h,16,spick(hc),x,0,z);box(15,.8,17,0x5b6078,x,h,z)}
  OL=.15;sph(5,0x8d8fa3,-52,-.5,66,{s:[1.5,.5,1.2]});sph(3,0x9a9cb0,-48,-.3,63,{s:[1.2,.5,1]});
  for(let i=0;i<5;i++)cyl(1.5-i*.12,1.62-i*.12,2.4,i%2?0xe0281e:0xfff6e6,-52,1.4+i*2.4,66,{ol:.12});cyl(1.5,1.5,.3,0x2b2f4a,-52,13.4,66);cyl(.8,.8,1.5,0x2b2f4a,-52,13.7,66,{ol:0});gsph(.75,-52,14.5,66);cone(1.4,1.4,0xe0281e,-52,15.2,66);
  for(const[x,z]of[[30,62],[-5,72],[70,58]]){sph(.7,0xff4b5c,x,-.5,z);cyl(.05,.05,1.4,0x2b2f4a,x,-.2,z,{ol:.03})}
  OL=.07;
  const w=inst(WB.geoms(),true);w.children[0].receiveShadow=true;w.traverse(o=>{o.matrixAutoUpdate=false;o.frustumCulled=false});scene.add(w);
  const gm=new T.Mesh(GB.geoms().g,glowM);gm.frustumCulled=false;scene.add(gm);
  // sea
  {const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#3fb6d9';x.fillRect(0,0,256,256);x.lineCap='round';
    for(let i=0;i<26;i++){const px=srand()*256,py=srand()*256,l=sr(18,46);x.strokeStyle=i%3?'#7fd8ee':'#e8fbff';x.lineWidth=i%3?5:4;for(const ox of[-256,0,256])for(const oy of[-256,0,256]){x.beginPath();x.moveTo(px+ox,py+oy);x.quadraticCurveTo(px+ox+l/2,py+oy-7,px+ox+l,py+oy);x.stroke()}}
    const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(40,40);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
    const m=new T.Mesh(new T.PlaneGeometry(900,900),new T.MeshBasicMaterial({map:t}));m.rotation.x=-PI/2;m.position.set(0,-.7,120);scene.add(m);dyn.sea=m}
  // lighthouse beam
  {const g=new T.ConeGeometry(7,60,16,1,true);g.translate(0,-30,0);g.rotateZ(PI/2);const m=new T.Mesh(g,new T.MeshBasicMaterial({color:0xfff1a8,transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide,fog:false}));m.position.set(-52,14.5,66);scene.add(m);dyn.beam=m}
  // clouds, sun
  const cp=proto(()=>{sph(6,0xffffff,0,0,0,{s:[1.6,.7,1]});sph(4.5,0xffffff,6,1,1,{s:[1.4,.8,1]});sph(4,0xffffff,-6,.5,-1,{s:[1.4,.7,1]});sph(3.5,0xffffff,1,3,0)},.5);
  const cm=new T.MeshBasicMaterial({vertexColors:true,fog:false});
  for(let i=0;i<9;i++){const c=inst(cp,false,cm);c.position.set(sr(-260,260),sr(55,90),sr(-200,240));c.scale.setScalar(sr(.8,1.8));scene.add(c);dyn.clouds.push(c)}
  {const g=new T.Group(),s=new T.Mesh(new T.SphereGeometry(22,20,14),new T.MeshBasicMaterial({color:0xffe45c,fog:false})),o=new T.Mesh(new T.SphereGeometry(24,20,14),new T.MeshBasicMaterial({color:0x14141c,side:T.BackSide,fog:false}));g.add(s,o);scene.add(g);dyn.sunMesh=g}
  // spawn / pickup spots
  spawnPts.push([-75,0],[75,0],[-75,-40],[75,-40],[-30,-42],[30,-42],[0,-34],[-52,-8],[52,3],[-70,22],[-48,28],[-35,28],[-8,28],[20,28],[30,28],[52,40],[-20,54],[10.5,48],[70,28],[0,-20]);
  pickSpots.push([0,-10,'soda'],[-20,53,'burger'],[10.5,47,'mustard'],[52,16,'burger'],[13,10.5,'soda'],[0,-20,'mustard'],[-52,-27,'soda'],[62,38,'mustard'],[-66,22,'soda'],[70,-3,'mustard']);
}

// ---------- dynamic prototypes ----------
const PR={};
function buildProtos(){
  const red=0xf0512d,dk=0x14141c,wh=0xffffff;
  PR.crabBody=proto(()=>{sph(.6,red,0,0,0,{s:[1.2,.62,.88]});sph(.45,0xffb38a,0,-.12,.12,{s:[1.1,.5,.8],ol:0});
    for(const s of[-1,1]){cyl(.05,.05,.4,red,s*.25,.22,.28);sph(.18,wh,s*.25,.72,.3);sph(.075,dk,s*.25,.73,.45,{ol:0});box(.34,.08,.08,dk,s*.25,.9,.42,{rz:s*.5,ol:0})}
    box(.42,.06,.06,dk,0,-.02,.52,{ol:0});box(.1,.1,.05,wh,-.1,-.08,.52,{ol:0});box(.1,.1,.05,wh,.1,-.08,.52,{ol:0})});
  PR.claw=proto(()=>{cyl(.07,.07,.36,red,0,-.05,.1,{rx:PI/2});sph(.3,red,0,.1,.5,{s:[.75,.5,1.4]});sph(.24,0xd63f20,0,-.12,.46,{s:[.7,.42,1.25]})});
  PR.legs=proto(()=>{for(const z of[-.3,0,.3])cyl(.05,.03,.55,red,.25,-.25,z,{rz:.75})});
  PR.legsL=proto(()=>{for(const z of[-.3,0,.3])cyl(.05,.03,.55,red,-.25,-.25,z,{rz:-.75})});
  PR.gull=proto(()=>{sph(.4,wh,0,0,0,{s:[.85,.8,1.3]});sph(.28,wh,0,.32,.42);cone(.11,.42,0xffa62b,0,.07,.82,{rx:PI/2});
    for(const s of[-1,1]){sph(.05,dk,s*.13,.4,.64,{ol:0});box(.2,.05,.05,dk,s*.13,.5,.62,{rz:s*.5,ol:0});cyl(.03,.03,.25,0xffa62b,s*.12,-.55,0,{ol:.02})}
    box(.3,.05,.4,0xb8c4d0,0,0,-.6,{rx:.3});cyl(.2,.2,.1,0x3d6fd9,0,.58,.4);cyl(.3,.3,.04,0x3d6fd9,0,.56,.4)});
  PR.wingR=proto(()=>{box(1,.07,.5,0xb8c4d0,.5,-.035,0);box(.3,.07,.4,0x2b2f4a,1.05,-.035,0)});
  PR.wingL=proto(()=>{box(1,.07,.5,0xb8c4d0,-.5,-.035,0);box(.3,.07,.4,0x2b2f4a,-1.05,-.035,0)});
  PR.puff=proto(()=>{sph(.5,0xf2c84b,0,0,0);sph(.42,0xfff6e6,0,-.1,.08,{ol:0});const up=new T.Vector3(0,1,0),d=new T.Vector3(),q=new T.Quaternion();
    for(let i=0;i<16;i++){const a=i*2.4,y=1-(i+.5)/16*1.7;const r=Math.sqrt(Math.max(0,1-y*y));d.set(Math.cos(a)*r,y,Math.sin(a)*r);if(d.z>.45&&Math.abs(d.y)<.5)continue;q.setFromUnitVectors(up,d);put(new T.ConeGeometry(.07,.24,6),0xa9744a,d.x*.56,d.y*.56,d.z*.56,{q,ol:.02})}
    sph(.17,wh,-.2,.16,.4);sph(.12,wh,.22,.2,.4);sph(.06,dk,-.24,.14,.55,{ol:0});sph(.05,dk,.26,.24,.5,{ol:0});sph(.07,dk,0,-.08,.5,{ol:0});
    box(.06,.3,.25,0xf79d65,-.52,0,0,{rz:.4});box(.06,.3,.25,0xf79d65,.52,0,0,{rz:-.4})});
  PR.pleg=proto(()=>{cyl(.05,.05,.35,0xf79d65,0,-.35,0);box(.16,.07,.26,0xf79d65,0,-.4,.06)});
  PR.boss=proto(()=>{const c=0xc92a2a;sph(.7,c,0,0,0,{s:[1,.75,1.5]});sph(.5,c,0,-.1,-1.1,{s:[.9,.6,1]});sph(.4,c,0,-.25,-1.7,{s:[.9,.6,1]});box(1,.08,.6,0xe8452c,0,-.4,-2.2,{rx:-.3});
    for(const s of[-1,1]){cyl(.05,.05,.4,c,s*.25,.4,.75);sph(.19,wh,s*.25,.9,.78);sph(.08,dk,s*.25,.9,.94,{ol:0});box(.36,.09,.08,dk,s*.25,1.1,.9,{rz:s*.55,ol:0});cyl(.025,.015,1.6,c,s*.35,.5,1.3,{rx:1,rz:-s*.4,ol:.02});
      for(const z of[-.5,0,.5])cyl(.06,.04,.7,c,s*.75,-.75,z,{rz:s*.6})}
    put(new T.TorusGeometry(.2,.03,6,14),0xffd23f,.25,.9,.95,{ol:.015});
    cyl(.4,.45,.3,wh,0,.55,.2);cyl(.55,.55,.05,dk,0,.55,.35);cyl(.42,.42,.08,0x2b2f4a,0,.6,.2,{ol:0});sph(.09,0xffd23f,0,.72,.62,{ol:0});box(.5,.07,.06,dk,0,.05,1.04,{ol:0})});
  PR.barrel=proto(()=>{cyl(.45,.45,1.1,0xe0281e,0,0,0);cyl(.47,.47,.14,0xffd23f,0,.25,0,{ol:0});cyl(.47,.47,.14,0xffd23f,0,.72,0,{ol:0});cyl(.2,.2,.06,0x2b2f4a,.15,1.1,.1,{ol:0});cone(.14,.3,0xffd23f,0,.42,.45,{ol:0,seg:4})},.05);
  PR.burger=proto(()=>{sph(.22,0xd99a4e,0,.06,0,{s:[1,.6,1]});cyl(.24,.24,.07,0x7a4a2a,0,-.06,0);cyl(.26,.26,.03,0x86d16a,0,-.01,0,{ol:0});cyl(.25,.25,.025,0xffd23f,0,-.08,0,{ol:0});sph(.22,0xd99a4e,0,-.14,0,{s:[1,.4,1]})},.025);
  PR.klat=proto(()=>{sph(.16,wh,0,0,0,{s:[1,1.3,1]})},.03);
  PR.can=proto(()=>{cyl(.14,.14,.34,0xb8c0cc,0,-.17,0);cyl(.145,.145,.16,0xe0281e,0,-.08,0,{ol:0})},.03);
  PR.soda=proto(()=>{cyl(.17,.17,.42,0x2ec4b6,0,-.21,0);cyl(.175,.175,.14,wh,0,-.07,0,{ol:0});cyl(.025,.025,.3,0xff4b5c,.06,.2,0,{rz:-.25,ol:.015})},.03);
  PR.must=proto(()=>{cyl(.14,.16,.36,0xffd23f,0,-.2,0);cone(.14,.2,0xffd23f,0,.16,0);cyl(.03,.03,.1,0xe0281e,0,.36,0,{ol:.015})},.03);
  PR.bbox=proto(()=>{box(.42,.3,.42,0xe0281e,0,-.2,0);sph(.14,0xd99a4e,0,.16,0,{s:[1,.6,1]});cyl(.15,.15,.04,0x7a4a2a,0,.08,0,{ol:0})},.03);
  PR.bell=proto(()=>{cyl(.12,.34,.5,0xffd23f,0,-.55,0);sph(.07,0x2b2f4a,0,-.6,0);box(.04,.12,.04,0x2b2f4a,0,-.08,0,{ol:0})},.03);
  const carP=(col,van)=>proto(()=>{const h=van?1.5:.75;box(1.9,.75,3.6,col,0,.35,0);box(1.7,h,van?2.4:1.8,col,0,1.1,van?-.4:-.2);box(1.72,h*.6,(van?2.4:1.8)-.3,0xbfe9ff,0,1.1+h*.25,van?-.4:-.2,{ol:0});box(1.5,h*.6,(van?2.4:1.8)+.02,0xbfe9ff,0,1.1+h*.25,van?-.4:-.2,{ol:0});
    for(const[a,b]of[[-.95,1.15],[.95,1.15],[-.95,-1.15],[.95,-1.15]]){cyl(.42,.42,.3,0x14141c,a,.42-.15,b,{rz:PI/2,ol:.03});cyl(.2,.2,.32,0xdfe6ee,a,.42-.16,b,{rz:PI/2,ol:0})}
    sph(.17,0xfff1a8,-.6,.8,1.8);sph(.17,0xfff1a8,.6,.8,1.8);box(1.95,.18,.2,0xdfe6ee,0,.35,1.82);box(1.95,.18,.2,0xdfe6ee,0,.35,-1.82);box(.6,.1,.05,0x14141c,0,.62,1.83,{ol:0})},.05);
  PR.cars=[carP(0xff4b5c),carP(0x4f9dde),carP(0xffd23f,true),carP(0x86d16a)];
  const boatP=(col,cab)=>proto(()=>{sph(1,col,0,0,0,{s:[1.4,.8,3.3]});sph(1,0xfff6e6,0,.05,0,{s:[1.44,.22,3.34],ol:0});box(1.5,1.3,1.6,0xfff6e6,0,.55,-.6);box(1.52,.5,1.3,0x2b2f4a,0,1.15,-.6,{ol:0});box(1.3,.5,1.62,0x2b2f4a,0,1.15,-.6,{ol:0});box(1.8,.16,1.9,cab,0,1.85,-.6);
    cyl(.07,.07,3.2,0x7a5a3a,0,.6,1);box(.9,.5,.04,cab,.48,3.2,1,{ol:.04});cyl(.18,.22,.7,0x2b2f4a,.3,2,-.9);put(new T.TorusGeometry(.3,.1,8,14),0xff4b5c,.76,1.1,-.6,{ry:PI/2})},.07);
  PR.boats=[boatP(0xe0562c,0x3d6fd9),boatP(0x3d6fd9,0xffd23f),boatP(0x2ec4b6,0xe0281e),boatP(0xffd23f,0x86d16a)];
}

// ---------- particles / decals / text ----------
const PN=420,pMesh=new T.InstancedMesh(new T.SphereGeometry(1,7,5),new T.MeshBasicMaterial(),PN),pOut=new T.InstancedMesh(new T.SphereGeometry(1.25,7,5),outM,PN);
pOut.instanceMatrix=pMesh.instanceMatrix;pMesh.frustumCulled=pOut.frustumCulled=false;scene.add(pMesh,pOut);
const parts=[];let pi=0;const _z=new T.Matrix4().makeScale(0,0,0);
for(let i=0;i<PN;i++){parts.push({a:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,l:0,m:1,s:.1,g:14});pMesh.setMatrixAt(i,_z);pMesh.setColorAt(i,_c.set(0xffffff))}
function part(x,y,z,vx,vy,vz,life,size,col,g=14){const p=parts[pi];p.a=true;p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;p.l=p.m=life;p.s=size;p.g=g;pMesh.setColorAt(pi,_c.set(col));pMesh.instanceColor.needsUpdate=true;pi=(pi+1)%PN}
function burst(x,y,z,n,col,sp=5,size=.12,up=2){for(let i=0;i<n;i++){const a=rnd(PI*2),b=rnd(-1,1),r=Math.sqrt(1-b*b)*rnd(.4,1)*sp;part(x,y,z,Math.cos(a)*r,b*sp*.7+up,Math.sin(a)*r,rnd(.35,.8),size*rnd(.6,1.3),Array.isArray(col)?rpick(col):col)}}
function updParts(dt){for(let i=0;i<PN;i++){const p=parts[i];if(!p.a)continue;p.l-=dt;if(p.l<=0||(p.y<.04&&p.vy<0&&p.g>0)){p.a=false;pMesh.setMatrixAt(i,_z);continue}p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const s=p.s*Math.min(1,p.l/p.m*2.2);_m.makeScale(s,s,s).setPosition(p.x,p.y,p.z);pMesh.setMatrixAt(i,_m)}pMesh.instanceMatrix.needsUpdate=true}
const DN=140,dMesh=(()=>{const sh=new T.Shape();const n=22;for(let i=0;i<=n;i++){const a=i/n*PI*2,r=(i%2?.55:1)*(0.75+srand()*.3);i?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r)}
  const m=new T.InstancedMesh(new T.ShapeGeometry(sh),new T.MeshBasicMaterial({polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),DN);m.frustumCulled=false;for(let i=0;i<DN;i++){m.setMatrixAt(i,_z);m.setColorAt(i,_c.set(0xffffff))}scene.add(m);return m})();
let di=0;const _zAx=new T.Vector3(0,0,1),_q2=new T.Quaternion();
function decal(x,y,z,nx,ny,nz,size,col){_q.setFromUnitVectors(_zAx,_v.set(nx,ny,nz));_q2.setFromAxisAngle(_zAx,rnd(PI*2));_q.multiply(_q2);const o=ny>.5?.085:.03;
  _m.compose(_p.set(x+nx*o,y+ny*o,z+nz*o),_q,_v2.set(size,size,size));dMesh.setMatrixAt(di,_m);dMesh.setColorAt(di,_c.set(col));dMesh.instanceMatrix.needsUpdate=true;dMesh.instanceColor.needsUpdate=true;di=(di+1)%DN}
function decalAtHit(px,py,pz,size,col){if(H.type==='w')return;if(H.c){if(H.c.ref)return;const c=H.c;let m=size;if(!H.nx)m=Math.min(m,px-c.x0,c.x1-px);if(!H.ny)m=Math.min(m,py-c.y0,c.y1-py);if(!H.nz)m=Math.min(m,pz-c.z0,c.z1-pz);if(m<.1)return;size=m}decal(px,py,pz,H.nx,H.ny,H.nz,size,col)}
const txCache=new Map(),pops=[];
for(let i=0;i<22;i++){const s=new T.Sprite(new T.SpriteMaterial({transparent:true,depthTest:false,fog:false}));s.visible=false;s.renderOrder=10;scene.add(s);pops.push({s,l:0,m:1,sz:1})}
let popI=0;
function pop(text,x,y,z,col='#ffd23f',size=1.1){let t=txCache.get(text+col);if(!t){t=textTex(text,{w:384,h:128,fg:col,size:84});txCache.set(text+col,t)}const p=pops[popI];popI=(popI+1)%pops.length;
  p.s.material.map=t;p.s.material.rotation=rnd(-.25,.25);p.s.material.opacity=1;p.s.position.set(x,y,z);p.s.visible=true;p.l=p.m=.95;p.sz=size}
function updPops(dt){for(const p of pops){if(!p.s.visible)continue;p.l-=dt;if(p.l<=0){p.s.visible=false;continue}const k=1-p.l/p.m,e=k<.18?k/.18*1.25:k<.3?1.25-(k-.18)/.12*.25:1;p.s.scale.set(p.sz*3*e,p.sz*e,1);p.s.position.y+=dt*.7;p.s.material.opacity=Math.min(1,p.l/.25)}}

// ---------- audio ----------
let AC=null,master=null,nbuf=null,muted=false;
function initAudio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.38;master.connect(AC.destination);nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){AC=null}}
function tone(f0,f1,d,type='square',v=.25,dl=0){if(!AC||muted)return;const t=AC.currentTime+dl,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.03)}
function noise(d,v=.3,f0=3000,f1=300,dl=0){if(!AC||muted)return;const t=AC.currentTime+dl,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;f.type='lowpass';f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(master);s.start(t,Math.random()*.5);s.stop(t+d+.03)}
const sfx={ketchup(){noise(.09,.3,5000,900);tone(520+rnd(80),160,.09,'triangle',.25)},mustard(){noise(.25,.5,3500,200);tone(220,50,.2,'sawtooth',.3)},burger(){tone(180,60,.22,'sine',.5);noise(.12,.25,1200,300)},
  boom(){noise(.7,.7,1800,60);tone(110,28,.5,'sine',.6)},hit(){tone(1100,700,.05,'square',.12)},kill(){tone(380,1300,.16,'square',.2);tone(700,1700,.12,'triangle',.15,.08)},hurt(){tone(260,90,.22,'sawtooth',.3)},
  pickup(){tone(660,660,.07,'square',.18);tone(880,880,.07,'square',.18,.07);tone(1320,1320,.12,'square',.18,.14)},squawk(){tone(900,500,.12,'sawtooth',.12);tone(700,1100,.1,'sawtooth',.1,.1)},
  honk(){tone(392,392,.22,'square',.12);tone(494,494,.22,'square',.12)},ding(){tone(1245,1240,1.1,'sine',.35);tone(2490,2480,.6,'sine',.12)},jump(){tone(260,520,.1,'sine',.15)},click(){tone(1800,900,.03,'square',.12)},
  reload(){tone(900,500,.04,'square',.12);tone(500,1000,.05,'square',.12,.28)},splash(){noise(.5,.5,2500,300)},beep(){tone(1500,1500,.06,'square',.14)},wave(){tone(392,392,.12,'square',.2);tone(523,523,.12,'square',.2,.13);tone(659,659,.12,'square',.2,.26);tone(784,784,.3,'square',.2,.39)},
  splat(){noise(.12,.3,1400,200)},pinch(){tone(1400,300,.07,'square',.2)},klonk(){tone(180,90,.12,'square',.25);tone(900,880,.2,'sine',.12,.1)},swap(){tone(500,800,.06,'triangle',.15)}};

// ---------- player / weapons ----------
const player={pos:new T.Vector3(0,0,8),vel:new T.Vector3(),yaw:PI,pitch:0,hp:100,ground:true,safe:new T.Vector3(0,0,8),r:.35,h:1.75,bob:0,land:0};
const WPN=[{name:'KETCHUPSPRØJTE',auto:true,rate:.125,dmg:13,pel:1,spread:.011,clip:24,rel:1.05,col:0xe0281e,res:Infinity,kick:.45,s:'ketchup'},
  {name:'SENNEPSSPREDER',auto:false,rate:.7,dmg:9,pel:9,spread:.07,clip:6,rel:1.45,col:0xf5c518,res:24,kick:1.5,s:'mustard'},
  {name:'BURGERBAZOOKA',auto:false,rate:.85,proj:true,clip:3,rel:1.8,col:0xc98a4b,res:6,kick:1.9,s:'burger'}];
const ws={cur:0,next:-1,sw:0,clip:[24,6,3],res:[Infinity,24,6],cd:0,rel:0,recoil:0,spreadK:0};
const vm=new T.Group(),vmW=[];vmScene.add(vm);let flash;
function buildVM(){const glove=()=>{sph(.07,0xffffff,0,-.14,.04);sph(.045,0xffffff,-.06,-.1,.02)};
  const defs=[()=>{cyl(.07,.078,.3,0xe0281e,0,-.15,-.1,{rx:PI/2});cyl(.081,.081,.13,0xffffff,0,-.065,-.1,{rx:PI/2,ol:0});cyl(.082,.082,.035,0x3f8f6b,0,-.017,-.1,{rx:PI/2,ol:0});cone(.07,.13,0xe0281e,0,-.065,-.315,{rx:-PI/2});cyl(.022,.022,.08,0xffffff,0,-.04,-.4,{rx:PI/2});box(.05,.17,.07,0x2b2f4a,0,-.2,.03,{rx:.25});glove()},
    ()=>{for(const s of[-1,1]){cyl(.05,.05,.44,0xf5c518,s*.054,-.22,-.16,{rx:PI/2});cyl(.058,.058,.05,0x7a4a2a,s*.054,-.025,-.37,{rx:PI/2})}box(.15,.1,.22,0x8a5a2b,0,-.07,.14);box(.16,.07,.12,0x3f8f6b,0,-.1,-.12);box(.05,.15,.07,0x8a5a2b,0,-.2,.1,{rx:.25});glove()},
    ()=>{cyl(.11,.11,.56,0x5f7fbf,0,-.28,-.15,{rx:PI/2});cyl(.145,.11,.09,0x3d4f8f,0,-.045,-.45,{rx:PI/2});cone(.11,.14,0x3d4f8f,0,-.07,.2,{rx:PI/2});sph(.09,0xd99a4e,0,0,-.47,{s:[1,1,.6]});box(.03,.06,.1,0xffd23f,0,.11,-.2);box(.05,.17,.07,0x2b2f4a,0,-.25,.03,{rx:.25});sph(.07,0xffffff,0,-.2,.04)}];
  for(const d of defs){const g=inst(proto(d,.009),false);g.visible=false;vm.add(g);vmW.push(g)}vmW[0].visible=true;vm.scale.setScalar(.62);vmW[2].scale.setScalar(.72);vmW[2].position.set(.02,-.03,.05);
  const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.translate(64,64);x.beginPath();for(let i=0;i<16;i++){const a=i/16*PI*2,r=i%2?26:58;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.closePath();x.fillStyle='#fff';x.lineWidth=8;x.strokeStyle='#14141c';x.lineJoin='round';x.stroke();x.fill();
  flash=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(cv),depthTest:false,transparent:true}));flash.scale.set(.22,.22,1);flash.visible=false;vm.add(flash)}
const proj=[];
function shootProj(type,x,y,z,vx,vy,vz){const g=inst(PR[type],false);g.position.set(x,y,z);scene.add(g);proj.push({type,g,vx,vy,vz,grav:type==='burger'?13:14,l:6})}

// ---------- enemies ----------
const enemies=[];
const SAY={crab:['AV!','MIN KLO!','IKKE KETCHUP!','KLIP KLIP?!','DET SVIER!','UFORSKAMMET!'],gull:['SKRÆP!','MIN FJER!','AAARK!','POMFRIT!'],puff:['BLUB!','PUST!','UH-OH…','BLOP?'],boss:['PJAT!','DET KILDER!','GRRR!','FRÆKT!']};
function spawnEnemy(type,x,z,wave){const g=new T.Group(),e={type,g,pos:new T.Vector3(x,0,z),kx:0,kz:0,t:rnd(10),cd:rnd(.5,1.5),hitT:0,dead:false,dt:0,age:0,state:0,st:0,yaw:0,dir:new T.Vector3(),sp:0};
  if(type==='crab'){e.hp=34+wave*3;e.r=.55;e.hr=.78;e.hy=.6;e.spd=Math.min(6.2,3.5+wave*.16)*rnd(.9,1.1);e.body=inst(PR.crabBody);e.body.position.y=.55;g.add(e.body);
    e.cl=inst(PR.claw);e.cr=inst(PR.claw);e.cl.position.set(-.72,.05,.1);e.cr.position.set(.72,.05,.1);e.cl.rotation.y=-.35;e.cr.rotation.y=.35;e.ll=inst(PR.legsL);e.lr=inst(PR.legs);e.ll.position.x=-.5;e.lr.position.x=.5;e.body.add(e.cl,e.cr,e.ll,e.lr)}
  else if(type==='gull'){e.hp=22+wave*2;e.r=.5;e.hr=.62;e.hy=0;e.pos.y=14;e.a=rnd(PI*2);e.body=inst(PR.gull);g.add(e.body);e.wl=inst(PR.wingL);e.wr=inst(PR.wingR);e.wl.position.set(-.3,.1,0);e.wr.position.set(.3,.1,0);e.body.add(e.wl,e.wr)}
  else if(type==='puff'){e.hp=26+wave*2;e.r=.5;e.hr=.62;e.hy=.85;e.spd=Math.min(6.5,4+wave*.15);e.body=inst(PR.puff);e.body.position.y=.85;g.add(e.body);e.l1=inst(PR.pleg);e.l2=inst(PR.pleg);e.l1.position.set(-.2,.42,0);e.l2.position.set(.2,.42,0);g.add(e.l1,e.l2)}
  else{e.hp=e.mhp=420+wave*45;e.r=.9;e.hr=1.75;e.hy=1.7;e.spd=2.7;e.body=inst(PR.boss);e.body.position.y=.95;e.cl=inst(PR.claw);e.cr=inst(PR.claw);e.cl.scale.setScalar(1.9);e.cr.scale.setScalar(1.9);e.cl.position.set(-1,.1,.6);e.cr.position.set(1,.1,.6);e.body.add(e.cl,e.cr);g.add(e.body);g.scale.setScalar(1.8);
    pop('JEG ER HUMMER-HARALD!',x,5,z,'#ff4b5c',2.2)}
  g.position.copy(e.pos);scene.add(g);enemies.push(e);burst(x,e.pos.y+.6,z,10,[0xffffff,0xdff4ff],4,.18);return e}
function hurtEnemy(e,dmg,dx,dz,why){if(e.dead)return;e.hp-=dmg;e.hitT=.2;const k=e.type==='boss'?.6:3.2;e.kx+=dx*k;e.kz+=dz*k;
  if(Math.random()<(e.type==='boss'?.12:.3))pop(rpick(SAY[e.type]),e.pos.x,e.pos.y+e.hy+1.3,e.pos.z,'#ffffff',.95);
  if(e.hp<=0)killEnemy(e,dx,dz,why)}
function killEnemy(e,dx,dz,why){e.dead=true;e.dt=0;e.vy=e.type==='boss'?5:rnd(7,10);e.kx=dx*rnd(4,8);e.kz=dz*rnd(4,8);sfx.kill();
  const now=performance.now();game.combo=now-game.comboT<3200?game.combo+1:1;game.comboT=now;const pts=(e.type==='boss'?1500:e.type==='gull'?150:e.type==='puff'?125:100)*game.combo;game.score+=pts;
  pop(e.type==='boss'?'HUMMERSALAT!':rpick(['SPLAT!','POW!','BONK!','KLASK!','ZAP!','SMASK!']),e.pos.x,e.pos.y+e.hy+1,e.pos.z,rpick(['#ffd23f','#ff4b5c','#2ec4b6']),e.type==='boss'?2.4:1.4);
  hitMark(true);if(e.type==='puff'&&why!=='self')e.boomT=.25;
  if(e.type==='boss'){for(let i=0;i<3;i++)dropPickup(e.pos.x+rnd(-2,2),e.pos.z+rnd(-2,2),['soda','mustard','burger'][i]);shake(.5)}
  else if(Math.random()<.3)dropPickup(e.pos.x,e.pos.z,player.hp<55?'soda':rpick(['soda','mustard','burger','mustard']))}
function explode(x,y,z,R,dmg,src){sfx.boom();shake(clamp(1.2-_v.set(x,y,z).distanceTo(player.pos)/22,0,1)*.6);
  burst(x,y,z,26,src==='burger'?[0xd99a4e,0x86d16a,0xffd23f,0xe0281e,0x7a4a2a]:[0xffd23f,0xff8a3d,0xffffff,0x555b70],9,.26,3);pop(src==='burger'?'KA-BURGER!':'BANG!',x,y+1.4,z,'#ff8a3d',1.9);
  if(y<1.2&&isLand(x,z))decal(x,0,z,0,1,0,R*.45,src==='burger'?0x7a4a2a:0x3d4259);
  for(const e of enemies){if(e.dead)continue;const dx=e.pos.x-x,dz=e.pos.z-z,d=Math.hypot(dx,e.pos.y+e.hy-y,dz);if(d<R+e.hr){const l=Math.hypot(dx,dz)||1;hurtEnemy(e,dmg*clamp(1.15-d/(R+e.hr),.25,1),dx/l*2,dz/l*2,'boom')}}
  for(const b of dyn.barrels){if(b.cd>0)continue;if(Math.hypot(b.x-x,b.z-z)<R&&Math.abs(y-.5)<R)b.fuse=b.fuse||rnd(.12,.3)}
  const dx=player.pos.x-x,dy=player.pos.y+.9-y,dz=player.pos.z-z,d=Math.hypot(dx,dy,dz);if(d<R+.5){const f=clamp(1.1-d/(R+.5),.2,1);damage(dmg*f*(src==='burger'?.22:.45));const l=d||1;player.vel.x+=dx/l*11*f;player.vel.z+=dz/l*11*f;player.vel.y+=5*f+2;player.ground=false}}

// ---------- pickups / barrels / misc dyn ----------
const pickups=[];
function dropPickup(x,z,type,spot){const g=inst(type==='soda'?PR.soda:type==='mustard'?PR.must:PR.bbox,false);g.scale.setScalar(1.5);g.position.set(x,.8,z);scene.add(g);pickups.push({g,type,x,z,t:rnd(6),spot:spot||null,l:spot?1e9:28})}
function collect(p){if(p.type==='soda'){if(player.hp>=100)return false;player.hp=Math.min(100,player.hp+30);pop('+30 ♥',p.x,1.8,p.z,'#ff4b5c')}else if(p.type==='mustard'){ws.res[1]=Math.min(48,ws.res[1]+12);pop('+12 SENNEP',p.x,1.8,p.z,'#ffd23f')}else{ws.res[2]=Math.min(12,ws.res[2]+3);pop('+3 BURGERE',p.x,1.8,p.z,'#d99a4e')}sfx.pickup();return true}
function initDyn(){for(const b of dyn.barrels){b.g=inst(PR.barrel);b.g.position.set(b.x,0,b.z);scene.add(b.g);b.c=solidC(b.x,b.z,.9,.9,1.1,0,{type:'barrel',o:b})}
  const bell=inst(PR.bell);bell.position.set(-17.4,3,31.5);scene.add(bell);dyn.bell={g:bell,sw:0,c:solid(-17.8,-17,31.1,31.9,2.3,3,{type:'bell'})};
  for(const s of pickSpots){const o={x:s[0],z:s[1],type:s[2],cd:0,has:false};s.o=o}
  const bp=[[-25,36,.3],[-14,40,-2.8],[4,38,.2],[17,36,2.9],[-36,34,1.4]];bp.forEach((b,i)=>{const g=inst(PR.boats[i%4]);g.position.set(b[0],-.35,b[1]);g.rotation.y=b[2];scene.add(g);dyn.boats.push({g,x:b[0],z:b[1],ry:b[2],ph:i*1.7})});
  const g=inst(PR.boats[1]);g.scale.setScalar(1.3);scene.add(g);dyn.boats.push({g,sail:true,ph:0})}
function blowBarrel(b){b.cd=35;b.fuse=0;b.c.dead=true;b.g.visible=false;explode(b.x,.6,b.z,5.5,90,'barrel')}

// ---------- cars & NPCs ----------
function mkLoop(pts){const l=[];let tot=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);l.push(d);tot+=d}return{pts,l,tot}}
function loopAt(L,s,o){s=((s%L.tot)+L.tot)%L.tot;for(let i=0;i<L.pts.length;i++){if(s<=L.l[i]){const a=L.pts[i],b=L.pts[(i+1)%L.pts.length],k=s/L.l[i];o.x=lerp(a[0],b[0],k);o.z=lerp(a[1],b[1],k);o.dx=(b[0]-a[0])/L.l[i];o.dz=(b[1]-a[1])/L.l[i];return}s-=L.l[i]}}
const cars=[],npcs=[],_lo={x:0,z:0,dx:0,dz:1};
function initTraffic(){const LA=mkLoop([[-28.2,1.8],[28.2,1.8],[28.2,18.2],[-28.2,18.2]]),LB=mkLoop([[28.2,-1.8],[-28.2,-1.8],[-28.2,-38.2],[28.2,-38.2]]);
  [[LA,0],[LA,70],[LB,20],[LB,100]].forEach(([L,s],i)=>{const g=inst(PR.cars[i]);scene.add(g);cars.push({g,L,s,v:7,pos:new T.Vector3(),yaw:0,honk:0,wob:0,dx:0,dz:1})});
  const loops=[mkLoop([[-25,5.2],[25,5.2],[25,15.5],[-25,15.5]]),mkLoop([[-25,-5.2],[25,-5.2],[25,-35.3],[-25,-35.3]]),mkLoop([[-60,26],[33,26],[33,28.2],[-60,28.2]]),mkLoop([[-66,-45.7],[66,-45.7],[66,-45],[-66,-45]]),mkLoop([[-66,-33.5],[-37.5,-33.5],[-37.5,-6],[-66,-6]])];
  const cl=[0xffd23f,0xff8fb3,0x4f9dde,0x86d16a,0xf79d65,0x9b5de5,0xfff6e6,0x2ec4b6,0xe0562c],sk=[0xf6c9a0,0xd99a6c,0xa86b42,0xffdcb8,0xc68655],pt=[0x3d4f8f,0x5a4632,0x555b70,0x2b2f4a];
  for(let i=0;i<10;i++){const c=cl[i%cl.length],s=sk[i%sk.length],p=pt[i%pt.length],hat=i%5,fat=sr(.9,1.25),tall=sr(.9,1.15);
    const torso=proto(()=>{sph(.36,c,0,.95,0,{s:[fat,1.25,.85*fat]});sph(.27,s,0,1.62,0,{s:[.95,1.12,.95]});sph(.09,s,0,1.56,.27);
      sph(.075,0xffffff,-.1,1.7,.2,{ol:.015});sph(.075,0xffffff,.1,1.7,.2,{ol:.015});sph(.03,0x14141c,-.1,1.7,.27,{ol:0});sph(.03,0x14141c,.1,1.7,.27,{ol:0});box(.13,.03,.03,0x14141c,0,1.42,.24,{ol:0});
      if(hat===0){sph(.28,0xe0281e,0,1.78,0,{s:[1,.6,1]});box(.3,.04,.25,0xe0281e,0,1.78,.3)}
      else if(hat===1)sph(.26,0x7a4a2a,0,2,-.02,{s:[1,1.5,1]});
      else if(hat===2){cyl(.22,.2,.3,0xffffff,0,1.85,0);sph(.28,0xffffff,0,2.22,0,{s:[1,.7,1]})}
      else if(hat===3){sph(.12,0x555b70,-.26,1.66,-.05);sph(.12,0x555b70,.26,1.66,-.05)}
      else{cyl(.42,.42,.04,0xffd23f,0,1.84,0);sph(.26,0xffd23f,0,1.9,0,{s:[1,.7,1]})}});
    const arm=proto(()=>{cyl(.065,.065,.5,c,0,-.5,0);sph(.085,s,0,-.56,0)}),leg=proto(()=>{cyl(.085,.085,.5,p,0,-.5,0);box(.17,.1,.28,0x2b2f4a,0,-.6,.05)});
    const g=new T.Group(),t=inst(torso),al=inst(arm),ar=inst(arm),ll=inst(leg),lr=inst(leg);al.position.set(-.4*fat,1.28,0);ar.position.set(.4*fat,1.28,0);ll.position.set(-.15,.6,0);lr.position.set(.15,.6,0);g.add(t,al,ar,ll,lr);g.scale.setScalar(tall);scene.add(g);
    const L=loops[i%loops.length];npcs.push({g,t,al,ar,ll,lr,L,s:srand()*L.tot,dir:i%2?1:-1,v:sr(1.2,1.9),pos:new T.Vector3(),panic:0,ph:srand()*6,hop:0,yaw:0,say:0})}}

// ---------- HUD ----------
const game={state:'menu',paused:false,score:0,combo:0,comboT:0,wave:0,queue:[],spawnT:0,breakT:0,best:0,flowT:0,time:0,boss:null,shotT:-9};
try{game.best=+localStorage.getItem('kaj_best')||0}catch(e){}
const hud={hp:-1,sc:-1,am:'',wv:''};let hmT=0,msgT=0,vig=0,klat=0,shakeA=0;
function shake(a){shakeA=Math.min(1,shakeA+a)}
function hitMark(kill){hmT=.18;$('hm').style.setProperty('--c',kill?'#ff4b5c':'#fff')}
function msg(a,b,t=2.4){$('msg').textContent=a;$('sub').textContent=b||'';msgT=t}
function damage(d){if(game.state!=='play')return;player.hp-=d;vig=Math.min(1,vig+.35+d/40);shake(.25);sfx.hurt();if(player.hp<=0){player.hp=0;gameOver()}}
function updHUD(dt){const hp=Math.ceil(player.hp);if(hp!==hud.hp){hud.hp=hp;$('hpf').style.width=hp+'%';$('hpt').textContent=hp;$('hpf').style.background=hp>50?'#ff4b5c':hp>25?'#ff8a3d':'#b5179e'}
  if(game.score!==hud.sc){hud.sc=game.score;$('sc').textContent=game.score}
  const cb=performance.now()-game.comboT<3200&&game.combo>1?'COMBO x'+game.combo:'';if(cb!==hud.cb){hud.cb=cb;$('combo').textContent=cb}
  const w=WPN[ws.cur],am=ws.cur+'|'+ws.clip[ws.cur]+'|'+ws.res[ws.cur]+'|'+(ws.rel>0);if(am!==hud.am){hud.am=am;$('an').textContent=ws.rel>0?'…':ws.clip[ws.cur];$('ar').textContent='/ '+(ws.res[ws.cur]===Infinity?'∞':ws.res[ws.cur]);$('wn').textContent=w.name;document.querySelectorAll('.sl').forEach((e,i)=>e.classList.toggle('on',i===ws.cur))}
  const alive=enemies.reduce((n,e)=>n+(e.dead?0:1),0)+game.queue.length,wv=game.wave+'|'+alive;if(wv!==hud.wv){hud.wv=wv;$('wave').textContent=game.wave?'BØLGE '+game.wave+' · '+alive+' TILBAGE':''}
  if(game.boss&&!game.boss.dead){$('bossw').style.display='block';$('bossf').style.width=Math.max(0,game.boss.hp/game.boss.mhp*100)+'%'}else $('bossw').style.display='none';
  hmT=Math.max(0,hmT-dt);$('hm').style.opacity=hmT>0?1:0;vig=Math.max(0,vig-dt*1.4);$('vig').style.opacity=Math.max(vig,player.hp<25?.35+.15*Math.sin(game.time*6):0);
  klat=Math.max(0,klat-dt*.5);$('klat').style.opacity=Math.min(1,klat*1.6);
  msgT=Math.max(0,msgT-dt);$('msg').style.opacity=$('sub').style.opacity=Math.min(1,msgT*3);
  const sp=10+ws.spreadK*16+Math.hypot(player.vel.x,player.vel.z)*.6,ln=9,th=4,X=(id,l,t,w,h)=>{const s=$(id).style;s.left=l+'px';s.top=t+'px';s.width=w+'px';s.height=h+'px'};
  X('x0',-sp-ln,-th/2-2,ln,th);X('x1',sp-4,-th/2-2,ln,th);X('x2',-th/2-2,-sp-ln,th,ln);X('x3',-th/2-2,sp-4,th,ln)}
const rc=$('radar').getContext('2d');let radT=0;
function radar(dt){radT-=dt;if(radT>0)return;radT=.1;const S=104,c=S/2;rc.clearRect(0,0,S,S);const cs=Math.cos(player.yaw),sn=Math.sin(player.yaw);
  const dot=(x,z,col,r)=>{let dx=x-player.pos.x,dz=z-player.pos.z,rx=dx*cs-dz*sn,rz=dx*sn+dz*cs,d=Math.hypot(rx,rz),m=60;if(d>m){rx*=m/d;rz*=m/d}rc.fillStyle=col;rc.strokeStyle='#14141c';rc.lineWidth=2;rc.beginPath();rc.arc(c+rx/m*(c-9),c+rz/m*(c-9),r,0,7);rc.fill();rc.stroke()};
  for(const p of pickups)dot(p.x,p.z,p.type==='soda'?'#2ec4b6':'#ffd23f',3);for(const e of enemies)if(!e.dead)dot(e.pos.x,e.pos.z,e.type==='boss'?'#b5179e':'#ff4b5c',e.type==='boss'?6:4);
  rc.fillStyle='#fff';rc.beginPath();rc.moveTo(c,c-7);rc.lineTo(c+5,c+5);rc.lineTo(c-5,c+5);rc.closePath();rc.fill();rc.stroke()}

// ---------- input ----------
const keys={},inp={mx:0,mz:0,fire:false,firePressed:false,jump:false,sprint:false};let locked=false,lockFail=false,hadLock=false;const lockErr=()=>{if(hadLock){if(game.state==='play')setPause(true)}else lockFail=true};const SENS=.0023;
function look(dx,dy,s){if(game.state!=='play'||game.paused)return;player.yaw-=dx*s;player.pitch=clamp(player.pitch-dy*s,-1.45,1.45);vmSwayX+=dx*s*.6;vmSwayY+=dy*s*.6}
let vmSwayX=0,vmSwayY=0;
addEventListener('keydown',e=>{if(e.repeat)return;keys[e.code]=true;if(game.state!=='play')return;if(e.code==='Space'){inp.jump=true;e.preventDefault()}if(e.code==='KeyR')reload();if(e.code==='Digit1')swap(0);if(e.code==='Digit2')swap(1);if(e.code==='Digit3')swap(2);if(e.code==='KeyQ')swap((ws.cur+1)%3);
  if(e.code==='KeyM'){muted=!muted;msg(muted?'LYD FRA':'LYD TIL','',1)}if((e.code==='Escape'||e.code==='KeyP')&&(lockFail||isTouch))setPause(!game.paused)});
addEventListener('keyup',e=>{keys[e.code]=false});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;inp.fire=false});
document.addEventListener('mousemove',e=>{if(locked||(lockFail&&!isTouch))look(e.movementX||0,e.movementY||0,SENS)});
canvas.addEventListener('mousedown',e=>{if(isTouch)return;if(game.state==='play'&&!game.paused){if(!locked&&!lockFail)lock();if(e.button===0){inp.fire=true;inp.firePressed=true}}});
addEventListener('mouseup',e=>{if(e.button===0)inp.fire=false});addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{if(game.state==='play'&&!game.paused)swap((ws.cur+(e.deltaY>0?1:2))%3)},{passive:true});
function lock(){try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(lockErr)}catch(e){lockErr()}}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(locked)hadLock=true;if(!locked&&game.state==='play'&&!lockFail&&!isTouch)setPause(true)});
document.addEventListener('pointerlockerror',lockErr);
function setPause(p){game.paused=p;$('pause').style.display=p?'flex':'none';inp.fire=false}
$('res').onclick=()=>{setPause(false);if(!isTouch&&!lockFail)lock()};
// touch
const tl=$('touch'),jb=$('jb'),jk=$('jk');let jid=-1,jx=0,jy=0;const lookIds=new Map();
if(isTouch){tl.addEventListener('pointerdown',e=>{if(e.target!==tl)return;e.preventDefault();if(jid<0&&e.clientX<innerWidth*.42&&e.clientY>innerHeight*.3){jid=e.pointerId;jx=e.clientX;jy=e.clientY;jb.style.display='block';jb.style.left=jx+'px';jb.style.top=jy+'px';jk.style.transform='';}else lookIds.set(e.pointerId,[e.clientX,e.clientY])});
  const mv=e=>{if(e.pointerId===jid){let dx=e.clientX-jx,dy=e.clientY-jy;const d=Math.hypot(dx,dy),m=52;if(d>m){dx*=m/d;dy*=m/d}jk.style.transform=`translate(${dx}px,${dy}px)`;inp.mx=dx/m;inp.mz=-dy/m;inp.sprint=d>m*1.5}
    else if(lookIds.has(e.pointerId)){const l=lookIds.get(e.pointerId);look(e.clientX-l[0],e.clientY-l[1],.0052);l[0]=e.clientX;l[1]=e.clientY}};
  const up=e=>{if(e.pointerId===jid){jid=-1;inp.mx=inp.mz=0;inp.sprint=false;jb.style.display='none'}lookIds.delete(e.pointerId)};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);
  const btn=(id,dn,upf)=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();b.classList.add('dn');dn(e)});const u=e=>{if(b.classList.contains('dn')&&(!b._pid||b._pid===e.pointerId)){b.classList.remove('dn');upf&&upf(e)}};addEventListener('pointerup',u);addEventListener('pointercancel',u)};
  btn('bF',e=>{$('bF')._pid=e.pointerId;inp.fire=true;inp.firePressed=true;lookIds.set(e.pointerId,[e.clientX,e.clientY])},()=>{inp.fire=false});
  btn('bJ',()=>{inp.jump=true});btn('bR',()=>reload());btn('bW',()=>swap((ws.cur+1)%3))}

// ---------- weapons logic ----------
function swap(i){if(i===ws.cur||ws.sw>0)return;ws.next=i;ws.sw=.32;ws.rel=0;sfx.swap()}
function reload(){const w=WPN[ws.cur];if(ws.rel>0||ws.sw>0||ws.clip[ws.cur]>=w.clip||ws.res[ws.cur]<=0)return;ws.rel=w.rel;sfx.reload()}
const _f=new T.Vector3(),_r=new T.Vector3(),_u=new T.Vector3(),_d=new T.Vector3(),_o=new T.Vector3(),_mz=new T.Vector3();
function fire(){const w=WPN[ws.cur];if(ws.clip[ws.cur]<=0){if(ws.res[ws.cur]>0)reload();else{sfx.click();if(inp.firePressed)msg('','TOM! FIND MERE '+(ws.cur===1?'SENNEP':'BURGER'),1.2);if(ws.cur)swap(0)}return}
  ws.clip[ws.cur]--;ws.cd=w.rate;ws.recoil=Math.min(1.6,ws.recoil+w.kick);ws.spreadK=Math.min(1,ws.spreadK+.25);sfx[w.s]();game.shotT=game.time;shake(w.kick*.05);
  camera.getWorldDirection(_f);_r.crossVectors(_f,camera.up).normalize();_u.crossVectors(_r,_f);_o.copy(camera.position);_mz.copy(_o).addScaledVector(_r,.22).addScaledVector(_u,-.17).addScaledVector(_f,.75);
  flash.visible=true;flash.material.rotation=rnd(PI);flash.material.color.set(w.col);flashT=.05;player.pitch=Math.min(1.45,player.pitch+w.kick*.012);
  if(w.proj){_d.copy(_f).multiplyScalar(36);shootProj('burger',_mz.x,_mz.y,_mz.z,_d.x+player.vel.x*.5,_d.y+3.2,_d.z+player.vel.z*.5);return}
  let anyHit=false;for(let i=0;i<w.pel;i++){const sp=w.spread*(1+ws.spreadK*.6),a=rnd(PI*2),rr=Math.sqrt(Math.random())*sp;_d.copy(_f).addScaledVector(_r,Math.cos(a)*rr).addScaledVector(_u,Math.sin(a)*rr).normalize();
    rayWorld(_o.x,_o.y,_o.z,_d.x,_d.y,_d.z,130);let t=H.t,he=null,hk=0;
    for(const e of enemies){if(e.dead)continue;const s=raySphere(_o.x,_o.y,_o.z,_d.x,_d.y,_d.z,e.pos.x,e.pos.y+e.hy,e.pos.z,e.hr*(e.infl||1));if(s>=0&&s<t){t=s;he=e;hk=1}}
    for(const n of npcs){const s=raySphere(_o.x,_o.y,_o.z,_d.x,_d.y,_d.z,n.pos.x,1,n.pos.z,.55);if(s>=0&&s<t){t=s;he=n;hk=2}}
    for(const c of cars){const s=raySphere(_o.x,_o.y,_o.z,_d.x,_d.y,_d.z,c.pos.x,.9,c.pos.z,1.45);if(s>=0&&s<t){t=s;he=c;hk=3}}
    const hx=_o.x+_d.x*t,hy=_o.y+_d.y*t,hz=_o.z+_d.z*t;
    // tracer droplets
    const tl=Math.min(t,60),n=w.pel>1?2:3;for(let k=0;k<n;k++){const f=(k+.3)/n*.5;part(lerp(_mz.x,hx,f*.4),lerp(_mz.y,hy,f*.4),lerp(_mz.z,hz,f*.4),_d.x*95,_d.y*95,_d.z*95,Math.max(.03,tl/95*(1-f*.4)),.055,w.col,0)}
    if(hk===1){hurtEnemy(he,w.dmg,_d.x,_d.z,'shot');anyHit=true;burst(hx,hy,hz,4,w.col,3.5,.09,1.5)}
    else if(hk===2){he.hop=.4;he.panic=4;if(he.say<=0){pop(rpick(['HEY!','PAS PÅ!','MIN JAKKE!','UFORSKAMMET!']),he.pos.x,2.6,he.pos.z,'#fff');he.say=1.5}burst(hx,hy,hz,3,w.col,3,.08,1.5)}
    else if(hk===3){if(he.honk<=0){sfx.honk();pop('DYYYT!',he.pos.x,2.8,he.pos.z,'#ffd23f');he.honk=1.2}burst(hx,hy,hz,3,w.col,3,.08,1.5)}
    else if(H.type){burst(hx+H.nx*.05,hy+H.ny*.05,hz+H.nz*.05,H.type==='w'?3:2,H.type==='w'?0xdff4ff:w.col,2.5,.07,1.5);decalAtHit(hx,hy,hz,rnd(.2,.38)*(w.pel>1?.9:1.1),w.col);
      if(H.c&&H.c.ref){const r=H.c.ref;if(r.type==='barrel'){r.o.hp=(r.o.hp||30)-w.dmg;if(r.o.hp<=0&&!r.o.fuse)r.o.fuse=.01}else if(r.type==='vend')useVend(r.o);else if(r.type==='bell'&&dyn.bell.sw<.2){dyn.bell.sw=1;sfx.ding();pop('DING!',-17.4,3.6,31.5,'#ffd23f')}}}}
  if(anyHit){sfx.hit();if(hmT<=0||$('hm').style.getPropertyValue('--c')!=='#ff4b5c')hitMark(false)}}
let flashT=0;
function useVend(v){if(v.cd>0)return;v.cd=22;sfx.klonk();pop('KLONK!',v.x,2.8,v.z,'#2ec4b6');dropPickup(v.x+v.fx*1.3,v.z+v.fz*1.3,'soda')}

// ---------- game flow ----------
function startWave(){game.wave++;const n=game.wave,q=[];const boss=n%4===0;
  for(let i=0;i<(boss?3+n:4+n*2);i++)q.push('crab');if(n>=2)for(let i=0;i<Math.floor(1+n*.7);i++)q.push('gull');if(n>=3)for(let i=0;i<Math.floor(n*.6);i++)q.push('puff');
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]]}if(boss)q.splice(2,0,'boss');game.queue=q;game.spawnT=1;
  msg(boss?'BOSSBØLGE '+n+'!':'BØLGE '+n,boss?'Hummer-Harald vil have sin havn tilbage':rpick(['Krabberne kommer!','Hold på pomfritterne!','De lugter ketchup…','Alle mand på kajen!']));sfx.wave()}
function trySpawn(){const type=game.queue[game.queue.length-1];let best=null,bs=-1;for(let k=0;k<8;k++){const s=rpick(spawnPts),d=Math.hypot(s[0]-player.pos.x,s[1]-player.pos.z);if(d<20||d>85)continue;if(type!=='gull'&&cellDist(s[0],s[1])>=60000)continue;const sc=Math.random();if(sc>bs){bs=sc;best=s}}
  if(!best)return;game.queue.pop();const e=spawnEnemy(type,best[0]+rnd(-1,1),best[1]+rnd(-1,1),game.wave);if(type==='boss')game.boss=e;if(best[1]>27&&type!=='gull'){sfx.splash();burst(best[0],.3,best[1]+1.5,10,0xdff4ff,5,.16,5)}}
function resetGame(){for(const e of enemies)scene.remove(e.g);enemies.length=0;for(const p of proj)scene.remove(p.g);proj.length=0;for(const p of pickups)scene.remove(p.g);pickups.length=0;for(const s of pickSpots)if(s.o){s.o.cd=0;s.o.has=false}
  for(const b of dyn.barrels){b.cd=0;b.fuse=0;b.hp=30;b.c.dead=false;b.g.visible=true}
  player.pos.set(0,0,8);player.vel.set(0,0,0);player.yaw=PI;player.pitch=0;player.hp=100;player.safe.copy(player.pos);
  ws.cur=0;ws.next=-1;ws.sw=0;ws.clip=[24,6,3];ws.res=[Infinity,24,6];ws.rel=0;ws.cd=0;vmW.forEach((g,i)=>g.visible=i===0);
  game.score=0;game.combo=0;game.wave=0;game.queue=[];game.breakT=2.5;game.boss=null;game.time=0}
function startGame(){initAudio();if(AC&&AC.state==='suspended')AC.resume();resetGame();game.state='play';game.paused=false;$('menu').style.display='none';$('over').style.display='none';$('hud').style.display='block';if(isTouch)tl.style.display='block';else lock();
  msg('VELKOMMEN TIL MÅGEVIG','Forsvar havnen!',2.4)}
function gameOver(){game.state='over';inp.fire=false;if(game.score>game.best){game.best=game.score;try{localStorage.setItem('kaj_best',game.best)}catch(e){}}
  $('ovt').innerHTML='BØLGE '+game.wave+' · '+game.score+' POINT<br>REKORD: '+game.best;setTimeout(()=>{$('over').style.display='flex';tl.style.display='none';if(document.exitPointerLock&&locked)document.exitPointerLock()},900)}
$('go').onclick=startGame;$('again').onclick=startGame;

// ---------- update ----------
const _dir=new T.Vector3();
function updPlayer(dt){const p=player;let ix=inp.mx,iz=inp.mz;if(!isTouch||keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD){ix+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);iz+=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)}
  const l=Math.hypot(ix,iz);if(l>1){ix/=l;iz/=l}const sprint=(keys.ShiftLeft||keys.ShiftRight||inp.sprint)&&iz>0,sp=sprint?10.5:7.2,sn=Math.sin(p.yaw),cs=Math.cos(p.yaw);
  const wx=(-sn*iz+cs*ix)*sp,wz=(-cs*iz-sn*ix)*sp,k=Math.min(1,(p.ground?13:3.2)*dt);p.vel.x+=(wx-p.vel.x)*k;p.vel.z+=(wz-p.vel.z)*k;
  if(inp.jump&&p.ground){p.vel.y=7.9;p.ground=false;sfx.jump()}inp.jump=false;
  p.vel.y-=22*dt;moveXZ(p.pos,p.vel.x*dt,p.vel.z*dt,p.r,p.h);p.pos.x=clamp(p.pos.x,-79,79);p.pos.z=clamp(p.pos.z,-77,76);
  for(const c of cars){const dx=p.pos.x-c.pos.x,dz=p.pos.z-c.pos.z,d=Math.hypot(dx,dz);if(d<1.9&&p.pos.y<1.4&&d>.01)moveXZ(p.pos,dx/d*(1.9-d),dz/d*(1.9-d),p.r,p.h)}
  p.pos.y+=p.vel.y*dt;
  if(p.vel.y>0)for(const c of colliders){if(c.dead)continue;if(p.pos.x+.3>c.x0&&p.pos.x-.3<c.x1&&p.pos.z+.3>c.z0&&p.pos.z-.3<c.z1&&p.pos.y+p.h>c.y0&&p.pos.y+p.h<c.y1+.5&&c.y0>p.pos.y+1){p.pos.y=c.y0-p.h;p.vel.y=0}}
  const g=groundAt(p.pos,p.r);if(p.pos.y<=g){if(!p.ground&&p.vel.y<-6)p.land=Math.min(.25,-p.vel.y*.018);p.pos.y=g;p.vel.y=0;p.ground=true}else if(p.pos.y>g+.05)p.ground=false;
  if(p.ground&&g>=0&&isLand(p.pos.x,p.pos.z)&&g<.2)p.safe.copy(p.pos);
  if(p.pos.y<-.9){sfx.splash();burst(p.pos.x,-.4,p.pos.z,16,0xdff4ff,6,.2,6);p.pos.copy(p.safe);p.vel.set(0,0,0);damage(8);msg('PLASK!','Du er ikke en fisk',1.4)}
  const hs=Math.hypot(p.vel.x,p.vel.z);if(p.ground)p.bob+=hs*dt*1.25;p.land=Math.max(0,p.land-dt*.9);
  for(const v of dyn.vends)if(v.cd<=0&&player.hp<100&&Math.hypot(p.pos.x-v.x-v.fx*.9,p.pos.z-v.z-v.fz*.9)<.9)useVend(v);
  // weapon timers
  ws.cd-=dt;ws.spreadK=Math.max(0,ws.spreadK-dt*2.2);ws.recoil=Math.max(0,ws.recoil-dt*(4+ws.recoil*7));
  if(ws.sw>0){ws.sw-=dt;if(ws.sw<=.16&&ws.next>=0){vmW[ws.cur].visible=false;ws.cur=ws.next;ws.next=-1;vmW[ws.cur].visible=true}}
  if(ws.rel>0){ws.rel-=dt;if(ws.rel<=0){const w=WPN[ws.cur],n=Math.min(w.clip-ws.clip[ws.cur],ws.res[ws.cur]);ws.clip[ws.cur]+=n;ws.res[ws.cur]-=n;sfx.click()}}
  const w=WPN[ws.cur];if((w.auto?inp.fire:inp.firePressed)&&ws.cd<=0&&ws.sw<=0&&ws.rel<=0)fire();inp.firePressed=false}
function camUpdate(dt){const p=player;shakeA=Math.max(0,shakeA-dt*2.2);const s=shakeA*shakeA;
  camera.position.set(p.pos.x,p.pos.y+1.62-p.land+Math.sin(p.bob*2)*.035*(p.ground?1:0),p.pos.z);
  camera.rotation.set(p.pitch+rnd(-1,1)*s*.04,p.yaw+rnd(-1,1)*s*.04,rnd(-1,1)*s*.03+Math.sin(p.bob)*.006);
  vmSwayX=lerp(vmSwayX,0,Math.min(1,dt*9));vmSwayY=lerp(vmSwayY,0,Math.min(1,dt*9));
  const sw=ws.sw>0?Math.sin((1-ws.sw/.32)*PI):0,rl=ws.rel>0?Math.sin(clamp(1-ws.rel/WPN[ws.cur].rel,0,1)*PI):0,hs=Math.min(1,Math.hypot(p.vel.x,p.vel.z)/8)*(p.ground?1:.2);
  vm.position.set(.25+Math.sin(p.bob)*.014*hs-clamp(vmSwayX,-.08,.08),-.2-Math.abs(Math.cos(p.bob))*.014*hs+clamp(vmSwayY,-.06,.06)-sw*.35-rl*.22-p.land*.2+clamp(p.vel.y,-6,6)*-.004,-.5+ws.recoil*.07);
  vm.rotation.set(ws.recoil*.16+rl*.9-sw*.6,.04-clamp(vmSwayX,-.1,.1)*1.5,rl*.5);
  if(flashT>0){flashT-=dt;const z=[-.48,-.45,-.56][ws.cur];flash.position.set(0,[-.04,-.02,0][ws.cur],z);if(flashT<=0)flash.visible=false}}
function updEnemies(dt){const p=player;game.flowT-=dt;if(game.flowT<=0){game.flowT=.3;flow(p.pos.x,p.pos.z)}
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.t+=dt;e.hitT=Math.max(0,e.hitT-dt);
    if(e.dead){e.dt+=dt;if(e.boomT){e.boomT-=dt;if(e.boomT<=0){e.boomT=0;explode(e.pos.x,e.pos.y+.8,e.pos.z,4.8,60,'puff');e.dt=9}}
      e.vy-=20*dt;e.pos.y+=e.vy*dt;e.pos.x+=e.kx*dt;e.pos.z+=e.kz*dt;e.g.position.copy(e.pos);e.g.rotation.x+=dt*9;e.g.rotation.z+=dt*6;const s=Math.max(.01,1-e.dt/.75)*(e.type==='boss'?1.8:1);e.g.scale.setScalar(s);
      if(e.dt>.75){burst(e.pos.x,e.pos.y+.5,e.pos.z,e.type==='boss'?40:12,[0xffffff,0xffd23f,0xff8fb3,0x2ec4b6],6,.17,3);if(e.pos.y<2&&isLand(e.pos.x,e.pos.z))decal(e.pos.x,0,e.pos.z,0,1,0,rnd(.6,1),e.type==='gull'?0xffffff:0xe0281e);scene.remove(e.g);enemies.splice(i,1)}continue}
    const dx=p.pos.x-e.pos.x,dz=p.pos.z-e.pos.z,d=Math.hypot(dx,dz)||1;e.age+=dt;if(d<18)e.age=0;
    if(e.age>40&&d>40&&e.type!=='gull'){for(let k=0;k<10;k++){const s=rpick(spawnPts),sd=Math.hypot(s[0]-p.pos.x,s[1]-p.pos.z);if(sd>20&&sd<50&&cellDist(s[0],s[1])<60000){burst(e.pos.x,1,e.pos.z,8,0xffffff,4,.15);e.pos.set(s[0],0,s[1]);burst(s[0],1,s[1],8,0xffffff,4,.15);break}}e.age=0}
    e.carT=(e.carT||0)-dt;e.kx*=Math.max(0,1-dt*6);e.kz*=Math.max(0,1-dt*6);const punch=1+Math.sin(e.hitT/.2*PI)*.28;
    if(e.type==='gull'){e.a+=dt*.8;const tx=p.pos.x+Math.cos(e.a)*8,tz=p.pos.z+Math.sin(e.a)*8,ty=Math.max(p.pos.y+5.5+Math.sin(e.t*1.7),groundAt(e.pos,.3)+3);
      _dir.set(tx-e.pos.x,ty-e.pos.y,tz-e.pos.z);const l=_dir.length();if(l>.01)_dir.multiplyScalar(Math.min(1,9*dt/l));e.pos.add(_dir);e.pos.x+=e.kx*dt;e.pos.z+=e.kz*dt;
      e.yaw=Math.atan2(dx,dz);e.g.position.copy(e.pos);e.g.position.y+=Math.sin(e.t*8)*.08;e.g.rotation.y=e.yaw;e.g.scale.set(punch,2-punch,punch);const f=Math.sin(e.t*14)*.7;e.wl.rotation.z=-f;e.wr.rotation.z=f;
      e.cd-=dt;if(e.cd<=0&&d<13){e.cd=rnd(2.2,3.2);const h=Math.max(1,e.pos.y-p.pos.y-1),tf=Math.sqrt(2*h/14);shootProj('klat',e.pos.x,e.pos.y-.4,e.pos.z,(dx+p.vel.x*tf*.7)/tf,0,(dz+p.vel.z*tf*.7)/tf);sfx.squawk();if(Math.random()<.3)pop('BOMBER VÆK!',e.pos.x,e.pos.y+1,e.pos.z,'#fff',.9)}
      continue}
    // ground types
    let sp=e.spd,mvx=0,mvz=0;
    if(e.type==='puff'&&e.state===1){e.st+=dt;sp=1.5;e.infl=1+e.st*1.1;if(Math.floor(e.st*10)!==Math.floor((e.st-dt)*10))sfx.beep();if(e.st>.95){e.hp=0;e.dead=true;e.dt=9;e.vy=0;explode(e.pos.x,.9,e.pos.z,5,30,'puff');game.score+=25;scene.remove(e.g);enemies.splice(i,1);continue}}
    fieldDir(e,_dir);
    if(e.type==='crab'&&d>3.5){const z=Math.sin(e.t*3.3)*.55;mvx=_dir.x-_dir.z*z;mvz=_dir.z+_dir.x*z}else{mvx=_dir.x;mvz=_dir.z}
    const reach=e.type==='boss'?3.1:1.55;if(d<reach*.8&&Math.abs(p.pos.y-e.pos.y)<2.2)sp*=.15;
    e.dir.x=lerp(e.dir.x,mvx,Math.min(1,dt*8));e.dir.z=lerp(e.dir.z,mvz,Math.min(1,dt*8));
    moveXZ(e.pos,(e.dir.x*sp+e.kx)*dt,(e.dir.z*sp+e.kz)*dt,e.r,1.2);
    for(let j=0;j<i;j++){const o=enemies[j];if(o.dead||o.type==='gull')continue;const ox=e.pos.x-o.pos.x,oz=e.pos.z-o.pos.z,od=Math.hypot(ox,oz),m=e.r+o.r;if(od<m&&od>.001){const pu=(m-od)*.5/od;moveXZ(e.pos,ox*pu,oz*pu,e.r,1.2);moveXZ(o.pos,-ox*pu,-oz*pu,o.r,1.2)}}
    for(const c of cars){const cx=e.pos.x-c.pos.x,cz=e.pos.z-c.pos.z;if(cx*cx+cz*cz<3.2&&c.cv>2&&e.type!=='boss'){if(e.carT>0)break;e.carT=1.5;pop('BONK!',e.pos.x,2,e.pos.z,'#ffd23f',1.3);sfx.klonk();hurtEnemy(e,18,c.dx*4,c.dz*4,'car');break}}
    if(e.dead)continue;
    e.yaw=Math.atan2(dx,dz);e.g.position.copy(e.pos);e.g.rotation.y=e.yaw;const base=e.type==='boss'?1.8:1;
    e.cd-=dt;
    if(e.type==='crab'){e.g.scale.set(punch,2-punch,punch);e.body.position.y=.55+Math.abs(Math.sin(e.t*12))*.06;e.ll.rotation.x=Math.sin(e.t*18)*.5;e.lr.rotation.x=-Math.sin(e.t*18)*.5;
      const snap=e.state===1?-1.1:Math.sin(e.t*5)*.25-.35;e.cl.rotation.x=snap;e.cr.rotation.x=e.state===1?-1.1:Math.sin(e.t*5+2)*.25-.35;
      if(e.state===1){e.st-=dt;if(e.st<=0){e.state=0;if(d<reach+.5&&Math.abs(p.pos.y-e.pos.y)<1.8){damage(9);sfx.pinch();pop('KLIP!',p.pos.x+dx/d*-.8,p.pos.y+1.3,p.pos.z+dz/d*-.8,'#ff4b5c',.8)}}}
      else if(d<reach&&Math.abs(p.pos.y-e.pos.y)<1.8&&e.cd<=0){e.state=1;e.st=.28;e.cd=1.1}}
    else if(e.type==='puff'){const s=(e.infl||1)*punch;e.body.scale.setScalar(s);e.body.position.y=.85+(s-1)*.4+Math.abs(Math.sin(e.t*10))*.08;e.body.rotation.z=e.state?Math.sin(e.t*50)*.12:Math.sin(e.t*10)*.1;e.l1.rotation.x=Math.sin(e.t*14)*.8;e.l2.rotation.x=-Math.sin(e.t*14)*.8;
      if(e.state===0&&d<4.2&&Math.abs(p.pos.y-e.pos.y)<3){e.state=1;e.st=0;pop('UH-OH…',e.pos.x,2.2,e.pos.z,'#fff',.9)}}
    else{e.g.scale.set(base*punch,base*(2-punch),base*punch);e.body.position.y=.95+Math.sin(e.t*4)*.06;e.cl.rotation.x=e.state===1?-1.3:Math.sin(e.t*3)*.3-.3;e.cr.rotation.x=e.state===1?-1.3:Math.sin(e.t*3+2)*.3-.3;
      if(e.state===1){e.st-=dt;if(e.st<=0){e.state=0;shake(.4);sfx.boom();burst(e.pos.x+dx/d*2,.3,e.pos.z+dz/d*2,10,0xd8cbb0,5,.2,3);if(d<reach+1&&Math.abs(p.pos.y-e.pos.y)<2.5){damage(22);p.vel.x+=dx/d*9;p.vel.z+=dz/d*9;p.vel.y+=5;p.ground=false}}}
      else if(d<reach&&e.cd<=0){e.state=1;e.st=.5;e.cd=1.7}
      e.cd2=(e.cd2||2)-dt;if(e.cd2<=0&&d>5&&d<45){e.cd2=rnd(1.8,2.6);const tf=d/19;shootProj('can',e.pos.x,2.6,e.pos.z,(dx+p.vel.x*tf*.6)/tf,(p.pos.y+1-2.6)/tf+7*tf,(dz+p.vel.z*tf*.6)/tf);tone(300,150,.1,'square',.15)}}
  }}
function updProj(dt){for(let i=proj.length-1;i>=0;i--){const q=proj[i],g=q.g;q.l-=dt;q.vy-=q.grav*dt;const sx=q.vx*dt,sy=q.vy*dt,sz=q.vz*dt,l=Math.hypot(sx,sy,sz)||1e-6,dx=sx/l,dy=sy/l,dz=sz/l,o=g.position;let hit=false,t=l;
    if(rayWorld(o.x,o.y,o.z,dx,dy,dz,l)){hit=true;t=H.t}
    if(q.type==='burger'){for(const e of enemies){if(e.dead)continue;const s=raySphere(o.x,o.y,o.z,dx,dy,dz,e.pos.x,e.pos.y+e.hy,e.pos.z,e.hr+.2);if(s>=0&&s<t){t=s;hit=true}}}
    else{const s=raySphere(o.x,o.y,o.z,dx,dy,dz,player.pos.x,player.pos.y+.95,player.pos.z,.7);if(s>=0&&s<t){t=s;hit=true;if(q.type==='klat'){damage(8);klat=1;sfx.splat();msg('','KLAT!',.8)}else{damage(14);pop('BONK!',o.x,o.y+.5,o.z,'#ffd23f')}H.type=''}}
    o.x+=dx*t;o.y+=dy*t;o.z+=dz*t;g.rotation.x+=dt*9;g.rotation.z+=dt*5;
    if(hit||q.l<=0){if(q.type==='burger')explode(o.x,o.y,o.z,5.6,115,'burger');else if(q.type==='klat'){burst(o.x,o.y,o.z,6,0xffffff,3,.12);if(H.type){sfx.splat();decalAtHit(o.x,o.y,o.z,rnd(.4,.7),0xffffff)}}else{burst(o.x,o.y,o.z,5,0xb8c0cc,4,.1);tone(900,300,.06,'square',.12)}
      scene.remove(g);proj.splice(i,1)}}}
function updWorld(dt,t){
  // barrels
  for(const b of dyn.barrels){if(b.cd>0){b.cd-=dt;if(b.cd<=0&&Math.hypot(b.x-player.pos.x,b.z-player.pos.z)>3){b.c.dead=false;b.g.visible=true;b.hp=30;burst(b.x,.6,b.z,6,0xffffff,3,.14)}else if(b.cd<=0)b.cd=1}else if(b.fuse){b.fuse-=dt;b.g.scale.setScalar(1+Math.sin(t*60)*.08);if(b.fuse<=0){b.g.scale.setScalar(1);blowBarrel(b)}}}
  for(const v of dyn.vends)v.cd-=dt;
  const bl=dyn.bell;if(bl.sw>0){bl.sw=Math.max(0,bl.sw-dt*.7);bl.g.rotation.z=Math.sin(t*14)*.6*bl.sw}
  // pickups
  for(const s of pickSpots){const o=s.o;if(!o.has){o.cd-=dt;if(o.cd<=0){o.has=true;dropPickup(o.x,o.z,o.type,o)}}}
  for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.t+=dt;p.l-=dt;p.g.position.y=.8+Math.sin(p.t*3)*.15;p.g.rotation.y=p.t*2.2;p.g.visible=(p.l>4||Math.floor(p.t*8)%2===0)&&Math.hypot(p.x-camera.position.x,p.z-camera.position.z)>.75;
    const near=Math.hypot(p.x-player.pos.x,p.z-player.pos.z)<1.3&&player.pos.y<2;if((near&&collect(p))||p.l<=0){if(p.spot){p.spot.has=false;p.spot.cd=25}scene.remove(p.g);pickups.splice(i,1)}}
  // cars
  for(const c of cars){loopAt(c.L,c.s,_lo);let tv=7;const fx=_lo.dx,fz=_lo.dz;const px=player.pos.x-_lo.x,pz=player.pos.z-_lo.z,ah=px*fx+pz*fz,lat=Math.abs(px*fz-pz*fx);if(game.state==='play'&&ah>0&&ah<7.5&&lat<1.9&&player.pos.y<1.5){tv=0;c.block=(c.block||0)+dt;if(c.block>1.2&&c.honk<=0){sfx.honk();pop('DYT DYT!',_lo.x,2.8,_lo.z,'#ffd23f');c.honk=2.5}}else c.block=0;
    for(const o of cars){if(o===c||o.L!==c.L)continue;let gap=((o.s-c.s)%c.L.tot+c.L.tot)%c.L.tot;if(gap<9)tv=0}
    c.cv=lerp(c.cv||7,tv,Math.min(1,dt*4));c.s+=c.cv*dt;c.honk-=dt;c.dx=fx;c.dz=fz;c.pos.set(_lo.x,0,_lo.z);let ty=Math.atan2(fx,fz),dy=ty-c.yaw;while(dy>PI)dy-=2*PI;while(dy<-PI)dy+=2*PI;c.yaw+=dy*Math.min(1,dt*5);
    c.g.position.set(_lo.x,Math.abs(Math.sin(t*9+c.s))*.04*(c.cv/7),_lo.z);c.g.rotation.set(0,c.yaw,Math.sin(t*7+c.s)*.012);c.g.scale.set(1,1+Math.sin(t*9+c.s)*.02,1)}
  // npcs
  const shotRecent=game.time-game.shotT<1.5&&game.state==='play';
  for(const n of npcs){let thr=shotRecent&&Math.hypot(n.pos.x-player.pos.x,n.pos.z-player.pos.z)<22;if(!thr)for(const e of enemies){if(!e.dead&&Math.abs(e.pos.x-n.pos.x)<8&&Math.abs(e.pos.z-n.pos.z)<8){thr=true;break}}
    if(thr){if(n.panic<=0&&n.say<=0){pop(rpick(['AAAH!','LØB!','KRABBER!','MIN FROKOST!','HJÆLP!']),n.pos.x,2.7,n.pos.z,'#fff',.9);n.say=4}n.panic=3}n.panic-=dt;n.say-=dt;n.hop=Math.max(0,n.hop-dt);
    const pan=n.panic>0,v=n.v*(pan?3.2:1);n.s+=v*dt*n.dir;loopAt(n.L,n.s,_lo);n.pos.set(_lo.x,0,_lo.z);n.ph+=dt*(pan?16:7)*n.v*.7;
    let ty=Math.atan2(_lo.dx*n.dir,_lo.dz*n.dir),dy=ty-n.yaw;while(dy>PI)dy-=2*PI;while(dy<-PI)dy+=2*PI;n.yaw+=dy*Math.min(1,dt*8);
    n.g.position.set(_lo.x,Math.abs(Math.sin(n.ph))*.05+Math.sin(n.hop/.4*PI)*.5,_lo.z);n.g.rotation.y=n.yaw;const sw=Math.sin(n.ph)*(pan?1:.6);n.ll.rotation.x=sw;n.lr.rotation.x=-sw;
    if(pan){n.al.rotation.set(0,0,-2.6+Math.sin(n.ph*1.3)*.3);n.ar.rotation.set(0,0,2.6-Math.sin(n.ph*1.3+1)*.3)}else{n.al.rotation.set(-sw,0,0);n.ar.rotation.set(sw,0,0)}n.t.rotation.z=Math.sin(n.ph)*.05}
  // boats, sea, sky
  for(const b of dyn.boats){if(b.sail){const a=t*.05;b.g.position.set(Math.cos(a)*45+5,-.3+Math.sin(t*1.3)*.1,92+Math.sin(a)*28);b.g.rotation.set(Math.sin(t*1.1)*.04,-a+PI,Math.sin(t*.9)*.05,'YXZ')}else{b.g.position.y=-.35+Math.sin(t*1.4+b.ph)*.09;b.g.rotation.set(Math.sin(t*1.1+b.ph)*.035,b.ry,Math.sin(t*.9+b.ph)*.05,'YXZ')}}
  dyn.sea.material.map.offset.set(t*.012,Math.sin(t*.3)*.02+t*.006);dyn.beam.rotation.y=t*.7;
  for(const c of dyn.clouds){c.position.x+=dt*1.6;if(c.position.x>300)c.position.x=-300}
  const f=dyn.fountain;if(Math.hypot(f.x-camera.position.x,f.z-camera.position.z)<60&&Math.random()<dt*30){const a=rnd(PI*2);part(f.x,f.y,f.z,Math.cos(a)*1.6,4.5,Math.sin(a)*1.6,.9,.1,0xbfe9ff,10)}
}
const C={skyD:new T.Color(0x6fd0f5),skyS:new T.Color(0xffa873),skyN:new T.Color(0x4a4f96),sunD:new T.Color(0xffffff),sunS:new T.Color(0xffb070),sunN:new T.Color(0xa9b4ff),winD:new T.Color(0x2c5d86),winN:new T.Color(0xffd66b),tmp:new T.Color(),seaD:new T.Color(0xffffff),seaN:new T.Color(0x8f86d6)};
function dayCycle(t){const k=(1-Math.cos(t/300*PI*2))/2,sky=C.tmp;if(k<.6)sky.copy(C.skyD).lerp(C.skyS,Math.pow(k/.6,2));else sky.copy(C.skyS).lerp(C.skyN,(k-.6)/.4);
  scene.background.copy(sky);scene.fog.color.copy(sky);
  if(k<.6)sun.color.copy(C.sunD).lerp(C.sunS,k/.6);else sun.color.copy(C.sunS).lerp(C.sunN,(k-.6)/.4);
  sun.intensity=lerp(2.4,1.25,k);hemi.intensity=lerp(1.7,1.25,k);hemi.color.copy(sky).lerp(C.sunD,.6);vmSun.color.copy(sun.color);vmSun.intensity=lerp(2.2,1.4,k);vmHemi.color.copy(hemi.color);
  const el=lerp(1.0,.22,k),az=.9+t*.004;_v.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az));
  const tx=Math.round(camera.position.x/2)*2,tz=Math.round(camera.position.z/2)*2;sun.target.position.set(tx,0,tz);sun.position.set(tx+_v.x*110,_v.y*110,tz+_v.z*110);
  dyn.sunMesh.position.copy(camera.position).addScaledVector(_v,440);
  const g=clamp((k-.45)/.3,0,1);glowM.color.copy(C.winD).lerp(C.winN,g);dyn.beam.material.opacity=.06+g*.3;dyn.sea.material.color.copy(C.seaD).lerp(C.seaN,k*.8)}

// ---------- main loop ----------
let last=0,menuA=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;const tt=now/1000;
  if(game.state==='menu'){menuA+=dt*.12;camera.position.set(Math.cos(menuA)*46-5,20,34+Math.sin(menuA)*30);camera.lookAt(0,3,8);updWorld(dt,tt)}
  else if(!game.paused){game.time+=dt;
    if(game.state==='play'){updPlayer(dt);
      if(game.queue.length){game.spawnT-=dt;const alive=enemies.reduce((n,e)=>n+(e.dead?0:1),0);if(game.spawnT<=0&&alive<Math.min(15,7+game.wave)){game.spawnT=.55;trySpawn()}}
      else if(!enemies.length){if(game.breakT<=0){game.breakT=game.wave?5:2.2;if(game.wave){game.score+=game.wave*250;msg('BØLGE '+game.wave+' KLARET!','+'+game.wave*250+' bonus · pust ud');player.hp=Math.min(100,player.hp+15)}}else{game.breakT-=dt;if(game.breakT<=0)startWave()}}}
    else{player.pitch=lerp(player.pitch,-.9,dt*2);player.land=Math.min(1.2,player.land+dt*2.2);player.vel.set(0,0,0)}
    camUpdate(dt);updEnemies(dt);updProj(dt);updWorld(dt,tt);updHUD(dt);radar(dt)}
  updParts(dt);updPops(dt);dayCycle(game.state==='menu'?40:game.time+40);
  renderer.clear();renderer.render(scene,camera);if(game.state==='play'){renderer.clearDepth();renderer.render(vmScene,vmCam)}}

// ---------- boot ----------
async function boot(){try{await Promise.race([document.fonts.load('60px Bangers'),new Promise(r=>setTimeout(r,1800))])}catch(e){}
  buildProtos();buildWorld();initDyn();buildGrid();initTraffic();buildVM();flow(0,8);
  $('help').innerHTML=isTouch?'<b>VENSTRE TOMMEL</b> gå · <b>HØJRE</b> kig · <b>SKYD</b> hold og sigt · <b>VÅBEN</b> skifter<br>Skyd de røde tønder. Automaterne giver sodavand. Vend telefonen på tværs.':'<b>WASD</b> gå · <b>MUS</b> sigt/skyd · <b>SHIFT</b> løb · <b>MELLEMRUM</b> hop · <b>1-3 / hjul</b> våben · <b>R</b> lad · <b>M</b> lyd<br>Skyd de røde tønder. Automaterne giver sodavand.';
  $('go').textContent='SPIL';requestAnimationFrame(frame)}
boot();
})();
