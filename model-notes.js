(()=>{
const names=['GPT-6-Astra','GPT-6.1-Sol','Claude-Opus-5.5','DeepSeek-V4.1-Flash-1017','Kimi-K3.1-Pro','Gemini-4-Argon','Qwen4-Max'];
const tabs=document.querySelector('.notes-tabs'),viewport=document.querySelector('.notes-window');let active=0,position=0;
tabs.innerHTML=names.map((name,i)=>`<button id="note-tab-${i}" role="tab" aria-controls="model-note-${i}" aria-selected="false" tabindex="-1" data-note="${i}">${name}</button>`).join('');
const indices=names.map((_,i)=>i);
function noteContent(name) {
  if (name === 'GPT-6-Astra') {
    return `<p class="notes-detail">Astra is more willing to stop early when its first submission scores above 90. It left submissions unused in nearly half of those runs. With a first score of 90 or below, it used all five submissions in 83% of runs and gained 13.4 points on average by the final result. Scene layout was a striking exception: even after scoring above 90 on the first try, Astra used all five submissions in 11 of 12 runs.</p>
      <p class="notes-detail">On camera tasks, Astra often submitted a rough camera pose early, then compared the rendered view with the reference to refine alignment and field of view. In 18 of 20 runs, it submitted before the midpoint of its tool calls. Scores rose by 48.8 points on average. On animation tasks, the first submission came later: only 10 of 40 runs submitted before that midpoint. Astra still used all five submissions in 36 runs, for an average gain of 6.7 points.</p>`;
  }
  if (name === 'GPT-6.1-Sol') {
    return `<p class="notes-detail">Sol often saves a scored version before trying a different approach. On one cabinet retopology task, its third mesh scored 89.3. Sol kept that file and continued experimenting with the drawers and back panel. When its fifth attempt scored 80.8, it restored the third mesh, verified the export, and delivered it. The same habit shows up in animation, where Sol saved both the animated scene and its motion parameters before testing another fit.</p>
      <p class="notes-detail">On PSD tasks, Sol did most of its checking before asking for a score. For one bridge banner, it inspected the source layers, rendered a draft, and enlarged a crop around the deer to check the detail before submitting. Across four runs on two PSD tasks, the first submission came after a median of 96% of tool calls, and three runs ended with a single submission.</p>`;
  }
  if (name === 'Claude-Opus-5.5') {
    return `<p class="notes-detail">Opus often keeps testing its approach after it has a version ready to score. On one image-to-mesh task, it submitted a mesh, then returned to the top and bottom reference views to examine the object’s cross-sections. It went on to test whether combining depth estimates from several views could improve the shape. The first submission gave it a starting point for a more detailed reconstruction.</p>
      <p class="notes-detail">The same care shows up in animation. After submitting one motion sequence, Opus compared rendered frames with the reference, tested different render settings, and wrote a tracker for a prop’s movement. Opus also kept refining its camera poses. It submitted at least three versions in 18 of 20 camera runs and used all five submissions in 10.</p>`;
  }
  if (name === 'DeepSeek-V4.1-Flash-1017') {
    return `<p class="notes-detail">DeepSeek keeps checking details even when its first submission scores above 90. In 20 of 21 such runs, it submitted at least four versions. On one retopology task, its first mesh scored 99.91. It then measured how closely the mesh followed the source surface, checked for thin spots, and adjusted the contour. After three more submissions, it restored and delivered the original mesh.</p>
      <p class="notes-detail">The same habit appeared in PSD composition. DeepSeek scored above 90 on its first submission in all six runs and used all five submissions in five of them. On one banner, it tried different layer combinations and scored the resulting compositions. Even with a strong first draft, it used the remaining attempts to test specific design choices.</p>`;
  }
  if (name === 'Kimi-K3.1-Pro') {
    return `<p class="notes-detail">Kimi tends to submit a working version early and use the feedback to guide its revisions. Its first submission came after a median of 36% of tool calls on UV tasks, 38% on camera tasks, and 39% on animation tasks. On one camera task, its initial pose scored 20.89. After comparing the render with the reference and refining the camera fit, its second submission reached 98.63. Three further attempts brought the final score to 99.82.</p>
      <p class="notes-detail">On a UV task, the feedback took longer to turn into a gain. Kimi’s first two layouts both scored 22.95. It tested different unwrap angles, checked where UV islands overlapped, and adjusted which islands could share texture space. The next two layouts scored 37.46 and 37.73, and the fifth reached 53.47.</p>`;
  }
  if (name === 'Gemini-4-Argon') {
    return `<p class="notes-detail">Gemini often turns a visual reference into a numerical check it can use to guide the next revision. On one camera task, it matched landmarks in the reference image to points in the 3D scene. It then measured how far each projected point fell from its landmark and adjusted the camera pose to reduce those distances. The final pose scored 99.72.</p>
      <p class="notes-detail">Gemini applied the same approach to motion and shape. For Seraph’s wing deployment, it compared the projected wings with their outlines in two reference views, measuring where the wings fell short or extended too far. It used those errors to refine the wing and feather angles. For Nailong, it used the bottom view to shape the gaps between the toes, then projected the revised mesh into ten views to measure where its silhouette extended beyond the reference or left part of it uncovered.</p>`;
  }
  if (name === 'Qwen4-Max') {
    return `<p class="notes-detail">Qwen makes comparison images around the detail it wants to check. In one room layout, it cropped the piano, ottoman, and sectional sofa separately, then checked the sideboard against the reference after adjusting the furniture. On a camera task in the same room, it used overlays to inspect alignment and zoomed in on the piano lid and the point where two edges met.</p>
      <p class="notes-detail">For animation, Qwen chooses moments in time for the same kind of close inspection. On Seraph’s wing deployment, it first sampled frames at 30-frame intervals, then compared the folded pose and returned to individual frames, including two just six frames apart. Local visual checks appeared in all 30 layout runs and at least 56 of 60 animation runs.</p>`;
  }
}
viewport.innerHTML = `<div class="notes-track">${names.map((name, i) => `
  <article class="notes-card" id="model-note-${i}" role="tabpanel" aria-labelledby="note-tab-${i}" data-card="${i}" tabindex="-1">
    ${noteContent(name)}
    <footer>${modelIdentity(name)}</footer>
  </article>`).join('')}</div>`;
const track=viewport.firstElementChild,cards=[...track.children];
function move(animate=true){track.classList.toggle('is-instant',!animate);const card=cards[position];track.style.transform=`translateX(${(viewport.clientWidth-card.offsetWidth)/2-card.offsetLeft}px)`;cards.forEach((c,k)=>{c.classList.toggle('is-current',k===position);c.setAttribute('aria-hidden',k!==position);c.tabIndex=k===position?0:-1})}
function select(i,pos=i){active=i;position=pos;tabs.querySelectorAll('button').forEach((b,j)=>{b.setAttribute('aria-selected',j===i);b.tabIndex=j===i?0:-1});const t=tabs.children[i];tabs.scrollLeft=Math.max(0,t.offsetLeft-tabs.offsetLeft-(tabs.clientWidth-t.offsetWidth)/2);move()}
tabs.onclick=e=>{const b=e.target.closest('[data-note]');if(b)select(+b.dataset.note)};
tabs.onkeydown=e=>{let next=active;if(e.key==='ArrowRight')next=Math.min(active+1,names.length-1);else if(e.key==='ArrowLeft')next=Math.max(active-1,0);else if(e.key==='Home')next=0;else if(e.key==='End')next=names.length-1;else return;e.preventDefault();select(next);tabs.children[next].focus()};
viewport.onclick=e=>{const card=e.target.closest('[data-card]');if(card){const pos=+card.dataset.card;if(pos!==position)select(indices[pos],pos)}};
new ResizeObserver(()=>move(false)).observe(viewport);
select(0);move(false);
})();
