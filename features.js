const decks={animation:[['animation-expert-10-v1','DRAGO 3D'],['animation-expert-01-v1','Ghillie Suit Sniper'],['animation-expert-13-v1','CREATURE MONSTER'],['animation-ronin-stow-v1','Ronin']],mesh:[['mesh-i2m-expert-03-v1','Iron Man'],['mesh-i2m-expert-59-v1','NieR:Automata'],['mesh-i2m-nailong-v1','Nailong'],['mesh-i2m-expert-60-v1','Silksong']],uv:['008','010','002','006'].map(n=>['mesh-uv-'+n+'-r04','uv-'+n+'-r04'])};
const cases=window.GAMEATLAS_TOUR;
let viewer;
let viewerPromise;
function loadViewer() {
 return viewerPromise ??= import('./vendor/public-viewer.js?v=motion-frame4').then(module => viewer = module).catch(error => {
  viewerPromise = null;
  throw error;
 });
}
const ROTATION_MS=5000;
// First-page models take priority over speculative carousel downloads.
const initialLoads=[];
function prefetchNext(fn){Promise.allSettled(initialLoads).then(()=>setTimeout(fn,400))}
const meshReferences={"mesh-i2m-nailong-v1":"nailong","mesh-i2m-expert-03-v1":"ironman","mesh-i2m-expert-59-v1":"nier","mesh-i2m-expert-60-v1":"silksong"};
function reference(id){return viewer.loadGLB("assets/fast/"+meshReferences[id]+"-reference.glb")}
function uvReference(id){return viewer.loadGLB('assets/fast/'+(id==='mesh-uv-008-r04'?'helmet-reference':id+'-textured')+'.glb')}
async function prepareUV(id){const canvas=document.createElement('canvas');const [model]=await Promise.all([uvReference(id),viewer.drawIslands(canvas,id)]);return {model,canvas}}
function scoreCard(card,id){const i=cases.findIndex(c=>c.id===id),item=cases[i],r=item.results[0];card.dataset.previewCase=id;const credit=card.querySelector('.feature-model');credit.textContent=r.name;if(r.name.startsWith('GPT-'))credit.insertAdjacentHTML('afterbegin',"<svg class=\"agent-brand-logo\" aria-hidden=\"true\" fill=\"#3d5f88\" fill-rule=\"evenodd\" height=\"1em\" style=\"flex:none;line-height:1\" viewBox=\"0 0 24 24\" width=\"1em\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"></path></svg>");card.querySelector('.feature-score').innerHTML=`${Number.isFinite(r.score)?r.score.toFixed(1):'—'} <small>/ 100</small>`;card.querySelectorAll('.inspect-case').forEach(b=>{b.setAttribute('aria-label',`Inspect ${item.case}: ${r.name}`);b.onclick=()=>{card.dataset.inspecting='true';window.openAtlasCase(i,b,decks[card.querySelector('[data-carousel]').dataset.carousel].map(([id])=>cases.findIndex(c=>c.id===id)))}})}
function carousel(kind){const host=document.querySelector(kind==='animation'?'#feature-animation':kind==='mesh'?'#feature-heat':'#feature-uv'),controls=document.querySelector(`[data-carousel="${kind}"]`),card=host.closest('article'),status=card.querySelector('.switch-status');let index=-1,request=0,busy=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,visible=false,nextAt=Infinity;const pointers=new Set(),keys=new Set();scoreCard(card,decks[kind][0][0]);document.querySelector(`#${kind}-name`).textContent=decks[kind][0][1];const restart=()=>{nextAt=performance.now()+ROTATION_MS};new IntersectionObserver(es=>{visible=es[0].isIntersecting;restart()}).observe(card);
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
 try{await initialize();if(mine!==request)return;await prepare(target);if(mine!==request)return;const [id,name]=decks[kind][target];if(kind==='uv'){const {model,canvas}=await prepare(target);if(mine!==request)return;ctx.set([viewer.cloneModel(model.scene)],null,{fill:.93,yaw:-.28});ctx.autoRotate=true;const dest=document.querySelector('#uv-islands');dest.width=canvas.width;dest.height=canvas.height;dest.getContext('2d').drawImage(canvas,0,0);}else await (kind==='animation'?viewer.mountAnimation(host,id,{ctx,stale:()=>mine!==request}):viewer.mountHeat(host,id,{ctx,stale:()=>mine!==request}));if(mine!==request)return;if(gtCtx){const gt=await reference(id);if(mine!==request)return;gtCtx.set([viewer.cloneModel(gt.scene)],null,{fill:id==='mesh-i2m-expert-59-v1'?1.4:id==='mesh-i2m-nailong-v1'?1.12:id==='mesh-i2m-expert-60-v1'?1.5:.94});gtCtx.paused=matchMedia('(prefers-reduced-motion: reduce)').matches}index=target;card.dataset.index=String(index);document.querySelector(`#${kind}-name`).textContent=name;scoreCard(card,id);card.querySelectorAll('.case-dot').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));if(kind==='animation'){const toggle=card.querySelector('.gt-switch');toggle.checked=true;toggle.onchange=()=>ctx.ghost(toggle.checked)}status.hidden=true;ctx.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;card.dataset.interactive='true';prefetchNext(()=>{if(visible&&!paused&&!document.hidden&&!document.querySelector('#case-dialog').open)prepare(index+1).catch(()=>{})})}catch(e){if(mine===request){status.hidden=false;status.textContent='3D preview unavailable. Select a dot to retry.'}console.warn(e)}finally{if(mine===request){busy=false;card.setAttribute('aria-busy','false');restart()}}}
 controls.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>load(Math.max(index,0)+ +b.dataset.dir));const dots=card.querySelector('.case-dots');dots.innerHTML=decks[kind].map(([,n],i)=>`<button class="case-dot" aria-label="Show ${n}" aria-current="false" data-index="${i}"></button>`).join('');dots.querySelectorAll('button').forEach(b=>b.onclick=()=>load(+b.dataset.index));
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
 card.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{ctx.zoom(+b.dataset.zoom)});return load(0)
}
initialLoads.push(carousel('animation'),carousel('mesh'),carousel('uv'));
