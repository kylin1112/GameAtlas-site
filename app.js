const disciplines=[
['Image-to-mesh',26,'Reconstruct editable geometry from visual references.','M16 2 29 9v15L16 31 3 24V9Zm0 0v15m13-8L16 17 3 9m13 8v14'],
['Retopology',10,'Preserve shape with a cleaner, lower-complexity mesh.','M4 8 17 2l13 11-4 16-17 1-7-13Zm0 0 22 21M17 2 9 30M2 17l28-4M4 8l5 22 21-17'],
['UV unwrapping',10,'Build usable UV layouts with controlled overlap and padding.','M2 3h12v11H2ZM19 2l12 3-3 11-10-3ZM3 20l10-3 4 13-12 2ZM22 21h9v10h-9Z'],
['Animation',20,'Recover character motion from a reference clip.','M16 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6M16 9l-2 11 8 6 8-2M14 20 7 29H2M15 13 7 12 2 6M15 13l8 4 7-5'],
['Scene layout',10,'Recreate spatial relationships with supplied scene assets.','M2 22 16 14l14 8-14 9ZM6 19V7l8-5 8 5v10M6 7l8 5 8-5M14 12v13'],
['Camera',10,'Recover viewpoint and field of view in a fixed scene.','M2 8h21v16H2ZM23 12l8-6v20l-8-6M9 24 5 31m12-7 5 7M16 16a4 4 0 1 0-8 0 4 4 0 1 0 8 0'],
['Rendering',3,'Match prescribed views through renderer and scene work.','M25 16a9 9 0 1 0-18 0 9 9 0 1 0 18 0M16 7c-9 9 8 10 0 18M16 1v3m0 24v3M1 16h3m24 0h3M5 5l3 3m16 16 3 3M5 27l3-3M24 8l3-3'],
['PSD composition',2,'Deliver layered compositions and faithful image exports.','M2 2h23v23H2ZM7 7h23v23H7ZM11 23l5-7 5 4 5-8M14 12h1']];
const models=window.GAMEATLAS_LEADERBOARD;


function modelIdentity(name){
 const brands=[[/^GPT-/,'openai'],[/^Gemini/,'gemini'],[/^Kimi/,'kimi'],[/^DeepSeek/,'deepseek'],[/^(Qwen|Flash-Next)/,'qwen'],[/^GLM/,'zai'],[/^(Doubao|Seed)/,'doubao'],[/^Grok/,'grok'],[/^Claude/,'claude'],[/^HY/,'hunyuan']];
 const brand=brands.find(([pattern])=>pattern.test(name))?.[1];
 return `<span class="model-identity">${brand?`<img class="model-brand" src="brand/${brand}.svg?v=12" alt="" width="22" height="22"/>`:''}<span>${name}</span></span>`;
}

let sortColumn='final',ascending=true,rankMetric=0;
function descendingScore(a,b){
 return (Number.isFinite(b)?b:-Infinity)-(Number.isFinite(a)?a:-Infinity);
}
const tableHead=document.querySelector('#table-head');
function sortHeader(key,label){
 return '<th><button type="button" id="sort-'+key+'" data-sort="'+key+'" aria-label="Sort by '+label+'">'+label+' <span aria-hidden="true"></span></button></th>';
}
document.querySelector('#table-head').addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button)return;
 const key=button.id.slice(5);
 if(key==='model')ascending=sortColumn==='model'?!ascending:true;
 else rankMetric=key==='first'?2:0;
 sortColumn=key;
 render();
});
function scoreNumber(value){return Number.isFinite(value)?value.toFixed(2):'—'}
function scoreBar(first,final,name){
 if(!Number.isFinite(final))return `<div class="score-track" role="img" aria-label="${name}: pending selected runs"></div>`;
 const firstBar=Number.isFinite(first)?`<span class="score-first" style="width:${first}%"></span>`:'';
 const finalBar=`<span class="score-final" style="width:${final}%"></span>`;
 const layers=first>=final&&Number.isFinite(first)?firstBar:finalBar+firstBar;
 return `<div class="score-track" role="img" aria-label="${name}: first submission average ${scoreNumber(first)}, final score average ${scoreNumber(final)}" title="First submission Avg ${scoreNumber(first)} · Final score Avg ${scoreNumber(final)}">${layers}</div>`;
}
// Reveal each row once as it enters view; retain the exact final scores.
const scoreObservers=new Map();
function animateScores(root,selector){
 scoreObservers.get(root)?.disconnect();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  observer.unobserve(entry.target);
  const row=entry.target,numbers=[...row.querySelectorAll('[data-score-target]')],bars=[...row.querySelectorAll('.score-track>span')];
  const start=performance.now();
  function frame(now){
   if(!row.isConnected)return;
   const t=Math.min(1,(now-start)/1500),progress=1-Math.pow(1-t,3);
   bars.forEach(bar=>bar.style.transform=`scaleX(${progress})`);
   numbers.forEach(n=>n.textContent=(Number(n.dataset.scoreTarget)*progress).toFixed(2));
   if(t<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }),{threshold:.15});
 root.querySelectorAll(selector).forEach(row=>{
  row.querySelectorAll('.first-number,.final-number,.category-score small,.category-score strong').forEach(n=>{if(!Number.isFinite(Number(n.textContent)))return;n.dataset.scoreTarget=n.textContent;n.setAttribute('aria-label',n.textContent);n.textContent='0.00'});
  row.querySelectorAll('.score-track>span').forEach(bar=>{bar.style.transformOrigin='left';bar.style.transform='scaleX(0)'});
  observer.observe(row);
 });
 scoreObservers.set(root,observer);
}
tableHead.innerHTML='<tr><th>#</th>'+sortHeader('model','Model')+'<th class="score-axis" aria-label="Score bars"></th>'+sortHeader('first','First')+sortHeader('final','Final')+'</tr>';
function render(){
for(const button of tableHead.querySelectorAll('[data-sort]')){
 const active=button.dataset.sort===sortColumn;
 const up=sortColumn==='model'&&ascending;
 if(active)button.parentElement.setAttribute('aria-sort',up?'ascending':'descending');
 else button.parentElement.removeAttribute('aria-sort');
 button.querySelector('span').textContent=active?(up?'↑':'↓'):'↕';
}
const ranked=[...models].sort((a,b)=>descendingScore(a.metrics[rankMetric],b.metrics[rankMetric]));
const query=document.querySelector('#model-search').value.trim().toLowerCase();
const rows=ranked.filter(r=>r.name.toLowerCase().includes(query));
if(sortColumn==='model')rows.sort((a,b)=>ascending?a.name.localeCompare(b.name):b.name.localeCompare(a.name));
document.querySelector('#table-body').innerHTML=rows.map(r=>'<tr><td>'+(Number.isFinite(r.metrics[rankMetric])?ranked.indexOf(r)+1:'—')+'</td><td>'+modelIdentity(r.name)+(!r.complete?' <small class="run-status">In progress</small>':'')+'</td><td>'+scoreBar(r.metrics[2],r.metrics[0],r.name)+'</td><td class="first-number">'+scoreNumber(r.metrics[2])+'</td><td class="final-number">'+scoreNumber(r.metrics[0])+'</td></tr>').join('');
animateScores(document.querySelector('#table-body'),'tr');
document.querySelector('#empty').hidden=rows.length!==0;
}
document.querySelector('#model-search').addEventListener('input',render);render();

const categoryOptions=document.querySelector('#category-options');
categoryOptions.innerHTML=disciplines.map(([name,count,desc,path],i)=>`<button type="button" aria-pressed="${i===0}" data-category="${i}"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="${path}"/></svg><span>${name}</span><small>${count}</small></button>`).join('');
const categoryHeaders=document.querySelectorAll('[data-category-sort]');
let currentCategory=0,categoryMetric='final';
categoryHeaders.forEach(button=>button.addEventListener('click',()=>{
 categoryMetric=button.dataset.categorySort;
 selectCategory(currentCategory);
}));
function selectCategory(index){
 currentCategory=index;
 const scores=categoryMetric==='first'?'categoryFirst':'categories';
 categoryHeaders.forEach(button=>{
  const active=button.dataset.categorySort===categoryMetric;
  button.setAttribute('aria-pressed',String(active));
  button.querySelector('span').textContent=active?'↓':'↕';
 });
 const [name,count,desc]=disciplines[index];
 document.querySelector('#category-title').textContent=name;

 categoryOptions.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 document.querySelector('#category-bars').innerHTML=[...models].sort((a,b)=>descendingScore(a[scores][index],b[scores][index])).map(model=>{const score=model.categories[index],first=model.categoryFirst[index];return `<div class="category-bar-row"><span class="category-model">${modelIdentity(model.name)}</span>${scoreBar(first,score,model.name)}<span class="category-score"><small>${scoreNumber(first)}</small><strong>${scoreNumber(score)}</strong></span></div>`}).join('');
 animateScores(document.querySelector('#category-bars'),'.category-bar-row');
}
categoryOptions.querySelectorAll('button').forEach((button,i)=>button.addEventListener('click',()=>selectCategory(i)));
selectCategory(0);
