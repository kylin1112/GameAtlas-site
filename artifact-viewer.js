import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.mjs';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map(),views=new Set();
const sharedModels = new Set(['case-4-reference.glb', 'case-4-sol.glb', 'retopo-003-input.glb', 'mesh-retopo-004-r04-input.glb']);
export function loadGLB(url){
 if(/^assets\/fast\/(animation-(expert-(10|01|13)-v1|ronin-stow-v1)\/(delivery|reference)|(?:ironman|nier|nailong|silksong|helmet)-reference|mesh-uv-(010|002|006)-r04-textured)\.glb$/.test(url))url=url.replace('/fast/','/fast/stream/');const name=url.split('/').pop();
 if(sharedModels.has(name))url='case-assets/shared/'+name;
 if(!cache.has(url))cache.set(url,(async()=>{let data;
  if(url.includes('/fast/') || (url.startsWith('case-assets/shared/') || url.endsWith('.gz'))){
   const r=await fetch(url.endsWith('.gz')?url:url+'.gz');if(!r.ok)throw Error(`Asset HTTP ${r.status}`);
   const bytes=new Uint8Array(await r.arrayBuffer());data=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes.buffer;
  }else{const r=await fetch(url);if(!r.ok)throw Error(`Asset HTTP ${r.status}`);data=await r.arrayBuffer()}
  return loader.parseAsync(data,new URL('.',new URL(url,location.href)).href);
 })().catch(e=>{cache.delete(url);throw e}));
 return cache.get(url);
}
export function cloneModel(root){const cloned=root.clone(true),map=new Map();function pair(a,b){map.set(a,b);a.children.forEach((c,i)=>pair(c,b.children[i]))}pair(root,cloned);root.traverse(o=>{if(o.isSkinnedMesh){const n=map.get(o);n.skeleton=o.skeleton.clone();n.skeleton.bones=o.skeleton.bones.map(b=>map.get(b));n.bindMatrix.copy(o.bindMatrix);n.bindMatrixInverse.copy(o.bindMatrixInverse)}});return cloned}
export function stage(host,{modal=false}={}){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,2,-2,.01,1000),pivot=new T.Group();scene.add(pivot);scene.add(new T.HemisphereLight(0xffffff,0xb8b4a5,2.3));const light=new T.DirectionalLight(0xfff8ee,2.6);light.position.set(3,5,5);scene.add(light);const fillLight=new T.DirectionalLight(0xffffff,1.1);fillLight.position.set(-4,2,-2);scene.add(fillLight);
 host.replaceChildren(renderer.domElement);const cv=renderer.domElement;cv.tabIndex=0;cv.setAttribute('aria-label','Interactive 3D preview. Drag to rotate; use + and − to zoom.');cv.style.touchAction='pan-y';
 let drag=null,bounds=null,fill=.88,visible=true,dirty=true,dead=false,last=performance.now(),aspect=1;
 let control={yaw:.18,pitch:.08,zoom:1,rotation:0,resume:0,dragging:false};
 const ctx={host,renderer,scene,camera,pivot,modal,time:0,paused:matchMedia('(prefers-reduced-motion: reduce)').matches,update:null};
 Object.defineProperty(ctx,'controls',{get:()=>control});ctx.linkControls=other=>{control=other.controls;ctx.rotationFollower=true;dirty=true};
 function fit(){if(!bounds)return;const size=bounds.getSize(new T.Vector3()),half=Math.max(size.y/2,Math.hypot(size.x,size.z)/(2*aspect))/fill*control.zoom;camera.top=half;camera.bottom=-camera.top;camera.right=camera.top*aspect;camera.left=-camera.right;camera.updateProjectionMatrix()}
 ctx.draw=()=>{dirty=true};function draw(){const {yaw,pitch,rotation}=control;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*10,Math.sin(pitch)*10,Math.cos(yaw)*Math.cos(pitch)*10);pivot.rotation.y=rotation;fit();camera.lookAt(0,0,0);renderer.render(scene,camera);dirty=false}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);aspect=w/h;fit();dirty=true}const ro=new ResizeObserver(resize);ro.observe(host);const io=new IntersectionObserver(e=>{visible=e[0].isIntersecting;dirty=true});io.observe(host);
 ctx.set=(objects,box,options={})=>{pivot.clear();ctx.release?.();ctx.release=null;const b=box?.clone()||new T.Box3().setFromObject(objects[0],true),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),scale=2.5/Math.max(size.x,size.y,size.z);const group=new T.Group();objects.forEach(o=>group.add(o));group.position.copy(center).multiplyScalar(-1);pivot.add(group);pivot.scale.setScalar(scale);pivot.rotation.set(0,0,0);bounds=new T.Box3(new T.Vector3(),size.multiplyScalar(scale));fill=options.fill||.88;Object.assign(control,{yaw:options.yaw??.18,pitch:options.pitch??.08,zoom:1,rotation:0});ctx.time=0;fit();resize();ctx.draw()};
 ctx.reset=()=>{Object.assign(control,{yaw:.18,pitch:.08,zoom:1,rotation:0});ctx.draw()};ctx.zoom=f=>{control.zoom=T.MathUtils.clamp(control.zoom*f,.55,2.5);ctx.draw()};
 cv.onpointerdown=e=>{control.resume=performance.now()+5000;control.dragging=true;drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId)};cv.onpointermove=e=>{if(!drag)return;control.resume=performance.now()+5000;control.yaw-=(e.clientX-drag[0])*.008;control.pitch=T.MathUtils.clamp(control.pitch+(e.clientY-drag[1])*.008,-1.4,1.4);drag=[e.clientX,e.clientY];dirty=true};cv.onpointerup=cv.onpointercancel=()=>{drag=null;control.dragging=false};
 cv.onwheel=e=>{if(!modal&&!e.ctrlKey&&!e.metaKey)return;e.preventDefault();ctx.zoom(Math.exp(e.deltaY*.001))};cv.onkeydown=e=>{if(e.key==='+'||e.key==='='){ctx.zoom(.9);e.preventDefault()}if(e.key==='-'){ctx.zoom(1.1);e.preventDefault()}};
 ctx.tick=now=>{const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;if(dead||!visible||document.hidden||(!modal&&document.querySelector('#case-dialog')?.open))return;if(ctx.autoRotate&&!ctx.rotationFollower&&!ctx.paused&&!control.dragging&&now>control.resume){control.rotation+=dt*.18;dirty=true}if(ctx.rotationFollower||ctx.linked)dirty=true;if(!ctx.paused&&ctx.update){ctx.time+=dt;ctx.update(ctx.time,dt);dirty=true}if(dirty)draw()};ctx.dispose=()=>{dead=true;views.delete(ctx);ro.disconnect();io.disconnect();ctx.release?.();renderer.dispose();renderer.forceContextLoss();cv.remove()};views.add(ctx);return ctx;
}
function loop(now){views.forEach(v=>v.tick(now));requestAnimationFrame(loop)}requestAnimationFrame(loop);
export function materialControls(ctx,root){const originals=new Map();root.traverse(o=>{if(o.isMesh)originals.set(o,o.material)});const clay=new T.MeshStandardMaterial({color:0xd9d6ca,roughness:.85,metalness:0,side:T.DoubleSide}),wire=new T.MeshBasicMaterial({color:0x586854,wireframe:true});ctx.material=mode=>{originals.forEach((m,o)=>o.material=mode==='wire'?wire:mode==='clay'?clay:m);ctx.draw()};const old=ctx.release;ctx.release=()=>{old?.();originals.forEach((m,o)=>o.material=m);clay.dispose();wire.dispose()};}
export async function mountInput(host,url,stale=()=>false){const data=await loadGLB(url);if(stale())return null;const c=stage(host,{modal:true}),root=cloneModel(data.scene);c.set([root]);materialControls(c,root);c.wireframe=on=>c.material(on?'wire':'material');return c}
