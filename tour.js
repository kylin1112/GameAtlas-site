(()=>{
const cases=window.GAMEATLAS_TOUR,data=window.GAMEATLAS_CASE_DATA,dialog=document.querySelector('#case-dialog');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=v=>Number.isFinite(v)?v.toFixed(2):'—';
const names={pose:'Pose & trajectory',constraints:'Contacts & support',temporal:'Temporal stability',form:'Form',silhouette:'Silhouette',structure:'Structure',detail:'Detail',continuity:'Surface continuity',distortion:'Distortion',density:'Texel density',coverage:'Atlas coverage',regularity:'Regularity',shape:'Shape preservation',gross:'Large-scale structure',parts:'Missing parts',bulk:'Volume',under:'Undersampling',messy:'Irregular topology',local:'Local detail',planar:'Planar surfaces',ngon:'Polygon structure',transform:'Transforms',integrity:'Mesh integrity',budget:'Triangle budget',center:'Object placement',object_integrity:'Object integrity',physical:'Physical relationships',rotation:'Orientation',delivery:'Delivery',translation:'Camera position',reprojection:'Frame alignment',focal:'Field of view',identity:'Layer identity',layout:'Layer placement',visibility:'Visibility',relations:'Layer relationships',visual_score:'Image similarity',rung_score:'Stage quality',validity:'Contract validity',geometry_defects:'Geometry defects',delivery_orientation:'Delivery orientation',frame_similarity_score:'Frame similarity',material_focus_score:'Material fidelity',transmission_highlight_score:'Transmission & highlights',stability_score:'Stability'};
let index=0,model=data.models[0].id,version=0,api=null,opener=null,catalogPromise,rung=null,exampleIndex=0;
const $=s=>dialog.querySelector(s),base=()=>`case-assets/${model}/${cases[index].id}/`,selected=()=>data.tasks[cases[index].id]?.[model]||{},label=id=>names[id]||id.replaceAll('_',' ');
function stop(){version++;api?.dispose();api=null;dialog.querySelectorAll('video').forEach(v=>v.pause())}
function empty(host,title,detail=''){host.innerHTML=`<div class="detail-empty">${esc(title)}${detail?`<small>${esc(detail)}</small>`:''}</div>`}
function image(host,url,alt){host.replaceChildren();const img=new Image();img.alt=alt;img.src=url;img.onerror=()=>empty(host,'Preview unavailable','Please try again.');host.append(img)}
function mountShell(){dialog.innerHTML=`<div class="detail-shell"><header class="detail-top"><span id="detail-category"></span><nav class="detail-nav" aria-label="Task navigation"><button id="case-prev" aria-label="Previous task">←</button><button id="case-next" aria-label="Next task">→</button><button id="case-close" aria-label="Close task">×</button></nav></header><div class="detail-heading"><h2 id="case-name"></h2><p id="detail-brief"></p></div><div class="detail-models" role="group" aria-label="Compare model deliveries"></div><div class="detail-body"><section class="detail-visuals"><div class="detail-pair"><section class="detail-pane"><div class="detail-pane-head"><span id="input-label">Task input</span><small id="input-note"></small></div><div class="detail-media" id="input-media"></div><div class="detail-views" id="input-views"></div></section><section class="detail-pane"><div class="detail-pane-head"><span id="delivery-label">Model delivery</span><small id="delivery-note"></small></div><div class="detail-media" id="output-media"></div><div class="detail-views" id="output-views"></div></section></div><div class="detail-controls"></div><p class="detail-caption"></p></section><aside class="detail-evaluation"><div class="detail-score-block"><div class="detail-eyebrow">Evaluation</div><div class="detail-score"><strong id="case-score"></strong><span>/ 100<br><span id="score-type">Final score</span></span></div><p class="detail-first" id="case-first"></p></div><div class="detail-report"></div><details class="detail-provenance"><summary>Task & score provenance</summary><p id="detail-source"></p></details></aside></div></div>`;
$('#case-close').onclick=()=>dialog.close();$('#case-prev').onclick=()=>step(-1);$('#case-next').onclick=()=>step(1);}
function score(){
 const final=selected(), sample=final.examples?.[exampleIndex], record=sample || final;
 $('#case-score').textContent=num(record.score);
 $('#score-type').textContent=sample ? `Submission ${sample.submission}` : 'Final score';
 $('#case-first').textContent=sample ? `Run ${sample.run} final score  ${num(sample.finalScore)} / 100` : Number.isFinite(final.first) ? `First submission  ${num(final.first)} / 100` : final.run===2 && cases[index].stage===5 ? 'Run 2 · Final delivery' : 'First submission pending';
 $('#detail-source').innerHTML=`${esc(cases[index].id)}<br>Run ${esc(record.run)} · ${sample ? 'Submission '+sample.submission : 'Final delivery'}<br>${sample ? 'Evaluation '+esc(sample.evaluationId) : 'Score for this delivery.'}${!sample && final.job ? `<br><a href="${esc(final.job)}" target="_blank" rel="noopener">Public score record ↗</a>` : ''}`;
}
function evaluation(e){if(!e){$('.detail-report').innerHTML=`<p class="detail-rule">${Number.isFinite(selected().score)?'A score is recorded; detailed evidence is not available for this delivery.':'This run has not completed. No score has been assigned.'}</p>`;return;}
 const metrics=(e.metrics||[]).map(m=>`<details class="detail-metric"><summary><span>${esc(label(m.id))}</span><b>${num(m.score)}${Number.isFinite(m.maximum)?` <small>/ 100</small>`:''}</b></summary><div class="detail-meter"><i style="--score:${Math.max(0,Math.min(100,m.score||0))}%"></i></div><p>${Number.isFinite(m.weight)?`Weight ${(m.weight*100).toFixed(0)}%. `:''}${m.role==='multiplier'?'Applied as a stability multiplier. ':''}${Number.isFinite(m.deduction)?`Lost ${num(m.deduction)} points${Number.isFinite(m.maximum)?` (maximum ${num(m.maximum)})`:''}.`:'Measured quality for this dimension; see the scoring formula above.'}</p></details>`).join('');
 const ds=(e.deductions||[]).map(d=>`<details class="detail-metric loss"><summary><span>${esc(label(d.id))}</span><b>${d.points>0?'−':''}${num(d.points)}</b></summary><p>${esc(d.reason||(d.points>0?'Measured deduction applied to this delivery.':'No deduction was applied.'))}</p></details>`).join('');
 $('.detail-report').innerHTML=`<p class="detail-rule">${esc(e.summary||'Objective measurements from this delivery.')}</p>${metrics}${ds?`<section class="detail-deductions"><h3>Point deductions</h3>${ds}</section>`:''}${(e.checks||[]).map(x=>`<p class="detail-check">${esc(x)}</p>`).join('')}${rung?`<p class="detail-note">Details: ${esc(rung)}. Final score above reflects the recorded task result.</p>`:''}`;
}
function modelButtons(){const s=cases[index];$('.detail-models').innerHTML=data.models.map(m=>`<button data-model="${esc(m.id)}" aria-pressed="${model===m.id}">${modelIdentity(esc(m.name))}<b>${num(data.tasks[s.id]?.[m.id]?.examples?.[model===m.id ? exampleIndex : 0]?.score ?? data.tasks[s.id]?.[m.id]?.score)}</b></button>`).join('');$('.detail-models').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(model===b.dataset.model)return;model=b.dataset.model;exampleIndex=0;rung=null;modelButtons();score();media()});}
async function media(){stop();const v=version,s=cases[index],left=$('#input-media'),right=$('#output-media'),stale=()=>v!==version||!dialog.open;$('.detail-controls').replaceChildren();$('#input-views').replaceChildren();$('#output-views').replaceChildren();left.innerHTML=right.innerHTML='<span class="detail-loading">Preparing preview</span>';$('.detail-caption').textContent='';$('.detail-report').innerHTML='<p class="detail-rule">Loading evaluation evidence…</p>';
 try{
 catalogPromise??=fetch('case-assets/catalog.json?v=reviewed-tasks2', {cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()});
 const catalog=await catalogPromise;if(stale())return;
 const record=catalog.find(x=>x.model===model&&x.task===s.id)||{},path=base(),refbase=`case-assets/references/${s.id}/`;
 const samples=selected().examples || [];
 const sample=samples[exampleIndex];
 if(samples.length){
  const buttons=[...samples.map(item=>`Run ${item.run} · Submission ${item.submission}`),`Run ${selected().run} · Final`];
  $('#output-views').innerHTML=buttons.map((label,i)=>`<button type="button" aria-pressed="${exampleIndex===i}" data-example="${i}">${esc(label)}</button>`).join('');
  $('#output-views').querySelectorAll('button').forEach(b=>b.onclick=()=>{exampleIndex=Number(b.dataset.example);modelButtons();score();media()});
 }
 let active=sample || record;
 if(record.rungs?.length){rung??=s.id==='sponza-reference-render-ladder-v2-threejs' ? record.rungs[0].id : record.rungs.at(-1).id;active={...record,...record.rungs.find(x=>x.id===rung)};$('#output-views').innerHTML=record.rungs.map(x=>`<button data-rung="${esc(x.id)}" aria-pressed="${rung===x.id}">${esc(x.id==='single'?'Final image':x.id.split('-')[0].toUpperCase())}</button>`).join('');$('#output-views').querySelectorAll('button').forEach(b=>b.onclick=()=>{rung=b.dataset.rung;media()});}
 evaluation(active.evaluation);
 const retopo=s.id.startsWith('mesh-retopo-'),animation=s.id.startsWith('animation-'),mesh=s.id.startsWith('mesh-i2m-'),uv=s.id.startsWith('mesh-uv-');
 $('#input-label').textContent=animation||mesh||uv||s.stage===3||s.stage===5?'Ground truth':'Task input';
 $('#input-note').textContent='';
 $('#delivery-label').textContent=uv?'UV layout':'Model delivery';
 $('#delivery-note').title=record.reconstruction?'Original rig animated from the scored joint samples. Unrecorded joints follow the supplied rig.':'';
 $('#delivery-note').textContent=record.reconstruction?'Reconstructed motion':'';
 let input=null;
 if(mesh){
  const featured={'mesh-i2m-expert-03-v1':'ironman','mesh-i2m-expert-59-v1':'nier','mesh-i2m-nailong-v1':'nailong','mesh-i2m-expert-60-v1':'silksong'};
  input=featured[s.id]?`assets/fast/${featured[s.id]}-reference.glb`:refbase+'reference.glb.gz';
 }else if(s.stage===3){
  input=refbase+'gt.glb.gz';
 }else if(s.stage===5){
  const level=rung?.split('-')[0];
  if(level)image(left,refbase+level+'.webp','Ground truth');
  else empty(left,'Ground truth unavailable');
 }else if(s.stage===4||s.stage===6){
  const ri=rung?Math.max(0,parseInt(rung.slice(1))||0):0;const src=s.views?.[ri]?.[1]||s.image;image(left,'assets/cases/'+src,'Task reference');
 }else if(uv){
  input='assets/fast/'+(s.id==='mesh-uv-008-r04'?'helmet-reference':s.id+'-textured')+'.glb';
 }else if(!animation){input=s.referenceModel?'assets/cases/'+s.referenceModel:null;if(!input)image(left,'assets/cases/'+s.image,'Task reference');}
 const output=!uv&&record.modelFile?path+record.modelFile:null;
 if(uv){
  if(active.uvImage)image(right,path+active.uvImage,'Submitted UV layout');
  else empty(right,'UV layout unavailable');
 }else if(!output){if(active.image)image(right,path+active.image,'Model delivery');else if(!record.motion)empty(right,Number.isFinite(selected().score)?'No viewable delivery':'Run in progress',Number.isFinite(selected().score)?'The recorded score is retained.':'The artifact will appear after this run completes.');}
 if(input){const name=input.split('/').pop();if(['retopo-003-input.glb','case-4-reference.glb','mesh-retopo-004-r04-input.glb'].includes(name))input='case-assets/shared/'+name+'.gz';}if(input||output||animation){const m=await import('./vendor/public-viewer.js?v=showcase3124');if(stale())return;const mounted=await m.pair({left,right,input,output,animation,id:s.id,motion:record.motion?path+record.motion:null,stale,onTime:f=>{const timeline=$('#detail-timeline');if(timeline)timeline.value=Math.round(f*1000)}});if(stale()){mounted?.dispose();return;}api=mounted;}
 if(api){
  if(api.referenceColors){$('#delivery-note').textContent='Reference-colored preview';$('#delivery-note').title='Ground-truth colors mapped onto the submitted geometry for display.';}
  if(retopo)api.material('wire');
  $('.detail-controls').innerHTML=animation?`<button id="detail-play">${api.paused?'Play':'Pause'}</button><input id="detail-timeline" type="range" min="0" max="1000" value="0" aria-label="Animation progress"><button id="detail-reset">Reset view</button>`:uv?'<button id="detail-reset">Reset view</button>':`<button data-material="material" aria-pressed="${!retopo}">Material</button><button data-material="clay" aria-pressed="false">Clay</button><button data-material="wire" aria-pressed="${retopo}">Wireframe</button><button id="detail-reset">Reset view</button>`;
  $('#detail-reset').onclick=()=>api.reset();if(animation){$('#detail-play').onclick=e=>{api.paused=!api.paused;e.target.textContent=api.paused?'Play':'Pause'};$('#detail-timeline').oninput=e=>{api.paused=true;api.seek(+e.target.value/1000);$('#detail-play').textContent='Play'};if(output||record.motion){right.insertAdjacentHTML('beforeend','<label class="detail-ghost-toggle"><input type="checkbox"> Cyan GT</label>');right.querySelector('input').onchange=e=>api.ghost(e.target.checked);}}else $('.detail-controls').querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{api.material(b.dataset.material);$('.detail-controls').querySelectorAll('[data-material]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 }
 $('.detail-caption').textContent=animation||mesh||uv||s.stage===3||s.stage===5?'':(s.stage===4?'Submitted camera preview · camera geometry is scored; lighting is not.':'Input and recorded delivery.');
 }catch(e){if(stale())return;console.warn('Case detail',e);empty(right,'Preview could not be loaded','The recorded score remains available.');if(left.querySelector('.detail-loading'))empty(left,'Reference preview unavailable');}
}
function show(i){stop();index=(i+cases.length)%cases.length;exampleIndex=0;rung=null;const s=cases[index];model=s.display.model;dialog.classList.toggle('paired-detail',s.id.startsWith('animation-')||s.id.startsWith('mesh-i2m-')||s.id.startsWith('mesh-uv-')||s.id.startsWith('mesh-retopo-'));$('#detail-category').textContent=s.name==='UV'?'UV unwrapping':s.name==='Mesh'?'Image-to-mesh':s.name;$('#case-name').textContent=s.case;$('#detail-brief').textContent=s.short;modelButtons();score();media();dialog.scrollTop=0;}
let entryCases=[];
function step(delta){
 const at=entryCases.indexOf(index), count=entryCases.length;
 if(count>1)show(entryCases[(at+delta+count)%count]);
}
mountShell();window.openAtlasCase=(i,button,sequence)=>{entryCases=Array.isArray(sequence)&&sequence.includes(i)?sequence.filter(n=>cases[n]):[i];opener=button;if(!dialog.open)dialog.showModal();document.body.classList.add('case-open');show(i);$('#case-close').focus()};
dialog.addEventListener('close',()=>{if(dialog.open)return;stop();document.body.classList.remove('case-open');opener?.focus()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});dialog.addEventListener('keydown',e=>{if(['INPUT','VIDEO','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}if(e.key==='ArrowRight'){e.preventDefault();step(1)}});
})();
