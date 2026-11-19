const cases=window.GAMEATLAS_TOUR;
const deckIds={
 animation:['animation-expert-13-v1','animation-expert-10-v1','animation-expert-01-v1','animation-ronin-stow-v1'],
 mesh:['mesh-i2m-expert-03-v1','mesh-i2m-expert-59-v1','mesh-i2m-nailong-v1','mesh-i2m-expert-60-v1'],
 uv:['008','010','002','006'].map(n=>'mesh-uv-'+n+'-r04')
};
const decks=Object.fromEntries(Object.entries(deckIds).map(([kind,ids])=>[kind,ids.map(id=>[id,cases.find(item=>item.id===id).case])]));
let viewer;
let viewerPromise;
function loadViewer() {
 return viewerPromise ??= import('./vendor/public-viewer.js?v=direct3d2').then(module => viewer = module).catch(error => {
  viewerPromise = null;
  throw error;
 });
}
const ROTATION_MS=5000;
const meshReferences={"mesh-i2m-nailong-v1":"nailong","mesh-i2m-expert-03-v1":"ironman","mesh-i2m-expert-59-v1":"nier","mesh-i2m-expert-60-v1":"silksong"};
function reference(id) {
 const name = meshReferences[id] + '-reference.glb';
 return viewer.loadGLB((id === 'mesh-i2m-expert-03-v1' ? 'assets/fast/showcase/' : 'assets/fast/') + name);
}
function uvReference(id){return viewer.loadGLB(id === 'mesh-uv-008-r04' ? 'assets/fast/showcase/helmet-reference.glb' : 'assets/fast/'+id+'-textured.glb')}
async function prepareUV(id){
 const selected=cases.find(c=>c.id===id).display;
 const canvas=new Image();canvas.src=`case-assets/${selected.model}/${id}/${selected.showcaseUvImage || selected.uvImage}`;
 const [model]=await Promise.all([uvReference(id),canvas.decode()]);return {model,canvas};
}
function scoreCard(card,id){
 const i=cases.findIndex(c=>c.id===id),item=cases[i],model=item.display.model;
 const r=window.GAMEATLAS_CASE_DATA.tasks[id][model],name=window.GAMEATLAS_CASE_DATA.models.find(m=>m.id===model).name;
 card.dataset.previewCase=id;card.querySelector('.feature-model').innerHTML=modelIdentity(name);
 card.querySelector('.feature-score').innerHTML=`${item.display.submission ? r.examples[0].score.toFixed(1) : Number.isFinite(r.score)?r.score.toFixed(1):'—'} <small>/ 100${item.display.submission ? " · Submission 1" : ""}</small>`;card.querySelectorAll('.inspect-case').forEach(b=>{b.setAttribute('aria-label',`Inspect ${item.case}: ${name}`);b.onclick=()=>{card.dataset.inspecting='true';window.openAtlasCase(i,b,decks[card.querySelector('[data-carousel]').dataset.carousel].map(([id])=>cases.findIndex(c=>c.id===id)))}})}
function carousel(kind){const host=document.querySelector(kind==='animation'?'#feature-animation':kind==='mesh'?'#feature-heat':'#feature-uv'),controls=document.querySelector(`[data-carousel="${kind}"]`),card=host.closest('article'),status=card.querySelector('.switch-status');let index=-1,request=0,busy=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,visible=false,nextAt=Infinity;const pointers=new Set(),keys=new Set();scoreCard(card,decks[kind][0][0]);document.querySelector(`#${kind}-name`).textContent=decks[kind][0][1];const restart=()=>{nextAt=performance.now()+ROTATION_MS};const stage = card.querySelector('.feature-stage');
 // Begin loading before the card scrolls into view. Rotation starts only once it is in view.
 const loader = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  loader.disconnect();
  if (index === -1) load(0);
 }, {rootMargin: '320px 0px'});
 loader.observe(stage);
 new IntersectionObserver(([entry]) => {
  // On short screens a stage can be taller than the viewport.
  const requiredHeight = Math.min(entry.boundingClientRect.height, entry.rootBounds.height) * .75;
  visible = entry.isIntersecting && entry.intersectionRect.height >= requiredHeight;
  restart();
 }, {threshold: [0, .25, .5, .75, 1]}).observe(stage);
 let ctx, gtCtx;
 async function initialize() {
  await loadViewer();
  ctx ??= viewer.stage(host);
  if(kind==='mesh' && !gtCtx) {
   gtCtx=viewer.stage(document.querySelector('#feature-mesh-gt'));
   gtCtx.linkControls(ctx);
   ctx.linked=true;
   gtCtx.autoRotate=ctx.autoRotate=true;
  }
 }
 const ready=new Set(),pending=new Map();function prepare(i){i=(i+decks[kind].length)%decks[kind].length;if(!pending.has(i))pending.set(i,(kind==='animation'?viewer.prepareAnimation(decks[kind][i][0]):kind==='uv'?prepareUV(decks[kind][i][0]):Promise.all([viewer.prepareHeat(decks[kind][i][0]),reference(decks[kind][i][0])])).then(v=>{ready.add(i);return v}).catch(e=>{pending.delete(i);throw e}));return pending.get(i)}
 async function load(target){const mine=++request;busy=true;card.setAttribute('aria-busy','true');nextAt=Infinity;target=(target+decks[kind].length)%decks[kind].length;const [task,title]=decks[kind][target];
 index=target;
 card.dataset.interactive='false';
 card.dataset.index=String(index);
 status.textContent='Loading 3D preview…';
 status.hidden=ready.has(target);
 document.querySelector('#'+kind+'-name').textContent=title;
 scoreCard(card,task);
 card.querySelectorAll('.case-dot').forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));
 try{await initialize();if(mine!==request)return;await prepare(target);if(mine!==request)return;const [id,name]=decks[kind][target];if(kind==='uv'){const {model,canvas}=await prepare(target);if(mine!==request)return;ctx.set([viewer.cloneModel(model.scene)],null,{fill:.93,yaw:-.28});ctx.autoRotate=true;const dest=document.querySelector('#uv-islands');dest.width=canvas.width;dest.height=canvas.height;dest.getContext('2d').drawImage(canvas,0,0);}else await (kind==='animation'?viewer.mountAnimation(host,id,{ctx,stale:()=>mine!==request}):viewer.mountHeat(host,id,{ctx,stale:()=>mine!==request}));if(mine!==request)return;if(gtCtx){const gt=await reference(id);if(mine!==request)return;gtCtx.set([viewer.cloneModel(gt.scene)],null,{fill:id==='mesh-i2m-expert-59-v1'?1.4:id==='mesh-i2m-nailong-v1'?1.12:id==='mesh-i2m-expert-60-v1'?1.5:.94});gtCtx.paused=matchMedia('(prefers-reduced-motion: reduce)').matches}index=target;card.dataset.index=String(index);document.querySelector(`#${kind}-name`).textContent=name;scoreCard(card,id);card.querySelectorAll('.case-dot').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));if(kind==='animation'){const toggle=card.querySelector('.gt-switch');toggle.checked=true;toggle.onchange=()=>ctx.ghost(toggle.checked)}status.hidden=true;ctx.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;card.dataset.interactive='true'}catch(e){if(mine===request){status.hidden=false;status.textContent='3D preview unavailable. Select a dot to retry.'}console.warn(e)}finally{if(mine===request){busy=false;card.setAttribute('aria-busy','false');restart()}}}
 controls.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>load(Math.max(index,0)+ +b.dataset.dir));const dots=card.querySelector('.case-dots');dots.innerHTML=decks[kind].map(([,n],i)=>`<button class="case-dot" aria-label="Show ${n}" aria-current="${i===0}" data-index="${i}"></button>`).join('');dots.querySelectorAll('button').forEach(b=>b.onclick=()=>load(+b.dataset.index));
 const pause=controls.querySelector('.carousel-pause');function sync(){pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',`${paused?'Play':'Pause'} ${kind} carousel`)}pause.onclick=()=>{paused=!paused;restart();sync()};sync();
 card.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);nextAt=Infinity});
 const release=e=>{if(pointers.delete(e.pointerId))restart()};
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);card.addEventListener('lostpointercapture',release);
 card.addEventListener('wheel',restart,{passive:true});
 card.addEventListener('keydown',e=>{if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){keys.add(e.key);nextAt=Infinity}});
 window.addEventListener('keyup',e=>{if(keys.delete(e.key))restart()});
 window.addEventListener('blur',()=>{pointers.clear();keys.clear();restart()});
 document.addEventListener('visibilitychange',restart);
 document.querySelector('#case-dialog').addEventListener('close',()=>{if(card.dataset.inspecting==='true'){delete card.dataset.inspecting;restart()}});
 setInterval(()=>{if(!visible||document.hidden||busy||paused||pointers.size||keys.size||card.dataset.inspecting==='true')return;
 if(performance.now()>=nextAt)load(index+1);
 },100);
 card.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{ctx?.zoom(+b.dataset.zoom)})
}
for (const kind of Object.keys(decks)) carousel(kind);
