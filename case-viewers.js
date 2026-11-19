import {colorBareDelivery} from './mesh-preview-color.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.mjs';
import {stage,loadGLB,cloneModel,materialControls} from './artifact-viewer.js?v=stream1';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map();
async function delivery(url){if(!url.endsWith('.gz'))return loadGLB(url);if(!cache.has(url))cache.set(url,(async()=>{const r=await fetch(url);if(!r.ok)throw Error('Preview unavailable');const bytes=new Uint8Array(await r.arrayBuffer());const data=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes.buffer;return loader.parseAsync(data,new URL('.',new URL(url,location.href)).href)})().catch(e=>{cache.delete(url);throw e}));return cache.get(url)}
const gtURL=id=>id==='animation-scorpio-backflip-v1'?`assets/features/${id}/gt-animated.glb`:`assets/fast/${id}/reference.glb`;
export async function pair({left,right,input,output,animation,id,video,motion,stale,onTime}){
 const fullReference=animation&&['animation-expert-10-v1','animation-expert-01-v1','animation-expert-04-v1','animation-expert-72-v1','animation-seraph-wing-deploy-v1'].includes(id);
 const [a,b,samples,character]=await Promise.all([fullReference?delivery(`case-assets/references/${id}/scene.glb.gz`):animation?loadGLB(gtURL(id)):input?delivery(input):null,output?delivery(output):null,motion&&!output?fetch(motion).then(r=>r.json()):null,animation&&!fullReference?loadGLB(id==='animation-scorpio-backflip-v1'?'assets/features/'+id+'/animated.glb':'assets/fast/'+id+'/delivery.glb'):null]);
 if(stale())return null;
 const contexts=[],mixers=[],roots=[],ghostMaterial=new T.MeshBasicMaterial({color:0x25cfc0,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide});let ghostRoot=null,sampleGroup=null;
 const leftRoot=a?cloneModel((character||a).scene):null,rightRoot=b?cloneModel(b.scene):null;
 const meshComparison=id.startsWith('mesh-i2m-');
 const releaseColors=meshComparison&&a&&rightRoot?colorBareDelivery(a.scene,rightRoot,{colorUniformSurface:id==='mesh-i2m-expert-42-v1'||id==='mesh-i2m-vanguard-v1'}):null;
 const animate=root=>{const m=new T.AnimationMixer(root);return m};
 if(animation){
  if(leftRoot){
   // Use the reference rig's starting pose and clips on the textured character.
   if(character){const nodes=new Map();a.scene.traverse(node=>{if(node.name)nodes.set(node.name,node)});
   leftRoot.traverse(node=>{const ref=nodes.get(node.name);if(ref){node.position.copy(ref.position);node.quaternion.copy(ref.quaternion);node.scale.copy(ref.scale)}});}
   const m=animate(leftRoot);a.animations.forEach(c=>m.clipAction(c).play());mixers.push(m);}
  if(rightRoot){const m=animate(rightRoot);b.animations.forEach(c=>m.clipAction(c).play());mixers.push(m);}
 }
 if(samples){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(samples.pos[0].length*3),3));
  sampleGroup=new T.Points(geometry,new T.PointsMaterial({color:0x34567e,size:5,sizeAttenuation:false}));
  sampleGroup.frustumCulled=false;
 }
 const box=new T.Box3();[leftRoot,rightRoot].filter(Boolean).forEach(r=>box.union(new T.Box3().setFromObject(r,true)));
 const duration=Math.max(...[a,b].filter(Boolean).flatMap(x=>x.animations?.map(c=>c.duration)||[]),samples?.times?.at(-1)||0,1);
 const connor=id==='animation-expert-72-v1';
 const dragoOpus=id==='animation-expert-10-v1'&&output?.includes('/claude-opus-5-5/');
 if(connor||dragoOpus)box.makeEmpty();
 if(animation){for(let i=0;i<=12;i++){mixers.forEach(m=>m.setTime(duration*i/12));[leftRoot,rightRoot].filter(Boolean).forEach(r=>{if(connor||dragoOpus)r.updateMatrixWorld(true);box.union(new T.Box3().setFromObject(r,true))})}mixers.forEach(m=>m.setTime(0));}
 if(sampleGroup){samples.pos.forEach(frame=>frame.forEach(p=>box.expandByPoint(new T.Vector3(p[0],p[2],-p[1]))));}
 const framing=animation?{fill:.97}:{};
 if(id==='animation-expert-10-v1')Object.assign(framing,{yaw:1.05,pitch:.18,fill:1.30});
 if(id==='animation-expert-01-v1')Object.assign(framing,{yaw:.22,pitch:.22,fill:1.19});
 if(connor)Object.assign(framing,{pitch:0,fill:.86});
 if(leftRoot&&!video){const ctx=stage(left,{modal:true});ctx.set([leftRoot],meshComparison?null:box,framing);contexts.push(ctx);roots.push(leftRoot);materialControls(ctx,leftRoot);}
 if(rightRoot||sampleGroup){
  const ctx=stage(right,{modal:true});const objects=[rightRoot||sampleGroup];
  if(animation&&a){ghostRoot=cloneModel(a.scene);ghostRoot.traverse(o=>{if(o.isMesh){o.material=ghostMaterial;o.renderOrder=2}});ghostRoot.visible=false;const m=animate(ghostRoot);a.animations.forEach(c=>m.clipAction(c).play());mixers.push(m);objects.push(ghostRoot);}
  const deliveryBox=dragoOpus?box.clone().translate(new T.Vector3(2.1,4.0,3.5).sub(box.getCenter(new T.Vector3()))):box;
  ctx.set(objects,meshComparison?null:deliveryBox,framing);if(contexts[0]){ctx.linkControls(contexts[0]);contexts[0].linked=true;}contexts.push(ctx);if(rightRoot)materialControls(ctx,rightRoot);
 }
 if(!contexts.length){ghostMaterial.dispose();return null;}
 const clock=contexts.at(-1);contexts.slice(0,-1).forEach(c=>c.paused=true);let isPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function setTime(time){const t=Math.max(0,Math.min(duration,time));mixers.forEach(m=>m.setTime(t));if(samples){const i=Math.min(samples.pos.length-1,Math.round(t/duration*(samples.pos.length-1)));const positions=sampleGroup.geometry.attributes.position;samples.pos[i].forEach((p,j)=>positions.setXYZ(j,p[0],p[2],-p[1]));positions.needsUpdate=true;}if(video&&video.duration&&Math.abs(video.currentTime-t/duration*video.duration)>.1)video.currentTime=t/duration*video.duration;contexts.forEach(c=>c.draw());onTime?.(t/duration,t,duration);}
 clock.update=t=>setTime(t%duration);clock.paused=isPaused;setTime(0);
 const api={referenceColors:!!releaseColors,duration,get paused(){return isPaused},set paused(v){isPaused=v;clock.paused=v;},seek(f){clock.time=f*duration;setTime(clock.time)},ghost(on){if(ghostRoot){ghostRoot.visible=on;clock.draw()}},reset(){contexts.forEach(c=>{c.reset();Object.assign(c.controls,framing)})},material(mode){contexts.forEach(c=>c.material?.(mode))},dispose(){contexts.forEach(c=>c.dispose());releaseColors?.();mixers.forEach(m=>m.stopAllAction());ghostMaterial.dispose();sampleGroup?.geometry.dispose();sampleGroup?.material.dispose();}};
 return api;
}
