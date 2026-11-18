(()=>{
const names=['GPT-6-Astra','GPT-6.1-Sol','Claude-Opus-5.5','Claude-Sonnet-5.5','Gemini-4-Argon','Qwen4-Max'];
const tabs=document.querySelector('.notes-tabs'),viewport=document.querySelector('.notes-window');let active=0,position=0;
tabs.innerHTML=names.map((name,i)=>`<button id="note-tab-${i}" role="tab" aria-controls="model-note-${i}" aria-selected="false" tabindex="-1" data-note="${i}">${name}</button>`).join('');
const indices=names.map((_,i)=>i);
viewport.innerHTML=`<div class="notes-track">${indices.map((i,k)=>`<article class="notes-card" id="model-note-${i}" role="tabpanel" aria-labelledby="note-tab-${i}" data-card="${k}" tabindex="-1"><p class="notes-status">PLACEHOLDER · ANALYSIS TO FOLLOW</p><p class="notes-copy">How does ${names[i]} approach production work? This space will bring together its strengths, recurring limitations, and response to feedback, grounded in completed runs and the artifacts it produced.</p><footer><strong>${names[i]}</strong><span>Findings will be added after run review.</span></footer></article>`).join('')}</div>`;
const track=viewport.firstElementChild,cards=[...track.children];
function move(animate=true){track.classList.toggle('is-instant',!animate);const card=cards[position];track.style.transform=`translateX(${(viewport.clientWidth-card.offsetWidth)/2-card.offsetLeft}px)`;cards.forEach((c,k)=>{c.classList.toggle('is-current',k===position);c.setAttribute('aria-hidden',k!==position);c.tabIndex=k===position?0:-1})}
function select(i,pos=i){active=i;position=pos;tabs.querySelectorAll('button').forEach((b,j)=>{b.setAttribute('aria-selected',j===i);b.tabIndex=j===i?0:-1});const t=tabs.children[i];tabs.scrollLeft=Math.max(0,t.offsetLeft-tabs.offsetLeft-(tabs.clientWidth-t.offsetWidth)/2);move()}
tabs.onclick=e=>{const b=e.target.closest('[data-note]');if(b)select(+b.dataset.note)};
tabs.onkeydown=e=>{let next=active;if(e.key==='ArrowRight')next=Math.min(active+1,names.length-1);else if(e.key==='ArrowLeft')next=Math.max(active-1,0);else if(e.key==='Home')next=0;else if(e.key==='End')next=names.length-1;else return;e.preventDefault();select(next);tabs.children[next].focus()};
viewport.onclick=e=>{const card=e.target.closest('[data-card]');if(card){const pos=+card.dataset.card;if(pos!==position)select(indices[pos],pos)}};
new ResizeObserver(()=>move(false)).observe(viewport);
select(0);move(false);
})();
