import * as T from 'three';
import animationBounds from './assets/fast/showcase/motion-bounds.json' with {type: 'json'};
import {loadGLB,cloneModel,stage,materialControls} from './artifact-viewer.js?v=stream1';
async function readShowcaseBuffer(url){
 const response=await fetch(url+'.gz');
 if(!response.ok)throw Error('Preview data unavailable: '+response.status);
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes[0]!==31||bytes[1]!==139)return bytes.buffer;
 return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
const prepared=new Map();
function animationFiles(id){return id==='animation-scorpio-backflip-v1'?['assets/features/'+id+'/animated.glb','assets/features/'+id+'/gt-animated.glb']:['assets/fast/'+id+'/delivery.glb','assets/fast/'+id+'/reference.glb']}
export async function prepareAnimation(id){if(!prepared.has(id))prepared.set(id,(async()=>{
 const selected=window.GAMEATLAS_TOUR.find(c=>c.id===id).display;
 const urls=animationFiles(id);urls[0]=`case-assets/${selected.model}/${id}/${selected.showcaseModelFile || selected.modelFile}`;
 if(selected.showcaseModelFile) urls[1]=`assets/fast/showcase/${id}/reference.glb.gz`;
 const [agent,gt]=await Promise.all(urls.map(loadGLB));const known=animationBounds[id];
 return {agent,gt,bounds:known};
 })().catch(e=>{prepared.delete(id);throw e}));return prepared.get(id)}
export async function measureAnimation(id){const {agent,gt}=await prepareAnimation(id),fs=[agent,gt].map(f=>({scene:cloneModel(f.scene),animations:f.animations}));const mixers=fs.map(f=>{const m=new T.AnimationMixer(f.scene);f.animations.forEach(a=>m.clipAction(a).play());return m}),duration=Math.max(...fs.flatMap(f=>f.animations.map(a=>a.duration))),bounds=new T.Box3(),frames=[];for(let i=0;i<=60;i++){mixers.forEach(m=>m.setTime(duration*i/60));const frameBox=new T.Box3();fs.forEach(f=>{f.scene.updateMatrixWorld(true);f.scene.traverse(o=>{if(o.isMesh)frameBox.union(new T.Box3().setFromObject(o,true))})});bounds.union(frameBox);frames.push({center:frameBox.getCenter(new T.Vector3()).toArray(),size:frameBox.getSize(new T.Vector3()).toArray()})}mixers.forEach(m=>m.stopAllAction());return {min:bounds.min.toArray(),max:bounds.max.toArray(),duration,samples:61,frames}}
export async function mountAnimation(host,id,options={}){
 const data=await prepareAnimation(id);if(options.stale?.())return null;const agent=cloneModel(data.agent.scene),gt=cloneModel(data.gt.scene),ctx=options.ctx||stage(host,{modal:options.modal}),ghost=new T.MeshBasicMaterial({color:0x30dfd0,transparent:true,opacity:.27,depthWrite:false,side:T.DoubleSide});gt.traverse(o=>{if(o.isMesh){o.material=ghost;o.renderOrder=2}});
 const mixers=[agent,gt].map((s,i)=>{const m=new T.AnimationMixer(s);(i?data.gt:data.agent).animations.forEach(c=>m.clipAction(c).play());return m}),duration=data.bounds?.duration||Math.max(...data.agent.animations.map(a=>a.duration));let bounds;
 if(data.bounds)bounds=new T.Box3(new T.Vector3().fromArray(data.bounds.min),new T.Vector3().fromArray(data.bounds.max));else bounds=new T.Box3().setFromObject(agent,true).union(new T.Box3().setFromObject(gt,true));
 const objects=[agent,gt];
 bounds.union(new T.Box3().setFromObject(agent,true));
 if(id==='animation-expert-10-v1' && window.GAMEATLAS_TOUR.find(c=>c.id===id).display.model==='claude-opus-5-5'){
  // Fixed camera target measured across the displayed Opus clip.
  bounds.translate(new T.Vector3(2.1,4.0,3.5).sub(bounds.getCenter(new T.Vector3())));
 }
 ctx.set(objects,bounds,{fill:id==='animation-expert-10-v1'?1.3:id==='animation-expert-01-v1'?1.13:id==='animation-expert-13-v1'?1.45:id==='animation-ronin-stow-v1'?.88:.92,pitch:id==='animation-expert-01-v1'?.27:.04,yaw:id==='animation-expert-10-v1'?1.57:id==='animation-expert-01-v1'?.40:.18});
 materialControls(ctx,agent);const release=ctx.release;ctx.release=()=>{release?.();mixers.forEach(m=>{m.stopAllAction();m.uncacheRoot(m.getRoot())});ghost.dispose()};
 ctx.duration=duration;ctx.update=t=>{mixers.forEach(m=>m.setTime(t%duration))};ctx.seek=f=>{ctx.time=f*duration;ctx.update(ctx.time);ctx.draw()};ctx.ghost=on=>{gt.visible=on;ctx.draw()};ctx.motionMode=mode=>{agent.visible=mode!=='reference';gt.visible=mode!=='delivery';ghost.opacity=mode==='reference'?1:.27;ctx.draw()};ctx.ghost(true);ctx.draw();return ctx;
}
const heatCache=new Map();
function errorColor(v,scale){const neutral=[200,204,210],mid=v<0?[245,166,35]:[70,185,225],end=v<0?[205,30,30]:[35,80,215],t=T.MathUtils.clamp((Math.abs(v)-scale.gray)/(scale.full-scale.gray),0,1),a=t<.4?neutral:mid,b=t<.4?mid:end,k=t<.4?t/.4:(t-.4)/.6;return new T.Color().setRGB(...a.map((x,i)=>(x+(b[i]-x)*k)/255),T.SRGBColorSpace)}
export function prepareHeat(id){if(!heatCache.has(id))heatCache.set(id,(async()=>{const {model,heatModelFile}=window.GAMEATLAS_TOUR.find(c=>c.id===id).display;
 if(heatModelFile){
  const {scene}=await loadGLB(`case-assets/${model}/${id}/${heatModelFile}`);
  const mesh=scene.getObjectByProperty('isMesh',true);
  mesh.updateWorldMatrix(true,false);
  return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
 }
 const base=`case-assets/${model}/${id}/heat/`,[meta,bin]=await Promise.all([fetch(base+'heatmap.json').then(r=>r.json()),readShowcaseBuffer(base+'result.bin')]),it=meta.items.result;let off=meta.reference.vertices*2;off+=(4-off%4)%4;const vertices=new Float32Array(bin,off,it.cand_vertices*3);off+=it.cand_vertices*12;const faces=new Uint32Array(bin,off,it.cand_faces*3);off+=it.cand_faces*12;const values=new Int16Array(bin,off,it.cand_faces),pos=new Float32Array(faces.length*3),colors=new Float32Array(faces.length*3);for(let i=0;i<faces.length;i++){pos.set(vertices.subarray(faces[i]*3,faces[i]*3+3),i*3);const c=errorColor(values[Math.floor(i/3)]*meta.quant,meta.scale);colors.set([c.r,c.g,c.b],i*3)}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();return g})().catch(e=>{heatCache.delete(id);throw e}));return heatCache.get(id)}
export async function mountHeat(host,id,options={}){const geo=await prepareHeat(id);if(options.stale?.())return null;const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide})),c=options.ctx||stage(host,{modal:options.modal});c.set([mesh],null,{fill:id==='mesh-i2m-expert-59-v1'?1.4:id==='mesh-i2m-nailong-v1'?1.12:id==='mesh-i2m-expert-60-v1'?1.5:.88});materialControls(c,mesh);const release=c.release;c.release=()=>{release?.();mesh.material.dispose()};c.update=null;return c}
export async function drawIslands(canvas,id='mesh-uv-008-r04'){const base='assets/features/'+id+'/',[a,b]=await Promise.all(['uv_triangles.bin','face_islands.bin'].map(n=>readShowcaseBuffer(base+n))),tri=new Float64Array(a),ids=new BigInt64Array(b),ctx=canvas.getContext('2d');canvas.width=canvas.height=600;ctx.clearRect(0,0,600,600);ctx.strokeStyle='#747b661c';for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(i*60,0);ctx.lineTo(i*60,600);ctx.moveTo(0,i*60);ctx.lineTo(600,i*60);ctx.stroke()}ctx.lineWidth=.45;for(let f=0;f<tri.length/6;f++){const k=f*6;ctx.beginPath();ctx.moveTo(tri[k]*560+20,580-tri[k+1]*560);ctx.lineTo(tri[k+2]*560+20,580-tri[k+3]*560);ctx.lineTo(tri[k+4]*560+20,580-tri[k+5]*560);ctx.closePath();ctx.fillStyle=`hsla(${155+(Number(ids[f])*37)%100},38%,40%,.16)`;ctx.strokeStyle=`hsla(${155+(Number(ids[f])*37)%100},32%,36%,.65)`;ctx.fill();ctx.stroke()}}
