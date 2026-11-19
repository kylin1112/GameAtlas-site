(async () => {
const panel = document.querySelector('#behavior-panel');
const tabs = document.querySelector('#behavior-tabs');
// Keep replay media off the network until the reader approaches this section.
await new Promise(resolve => {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    resolve();
  }, {rootMargin: '240px 0px'});
  observer.observe(tabs.closest('section'));
});
const camera = await fetch('assets/replay/submissions.json').then(r => r.json());
const fishRoot = 'assets/replay/fish/';
const b2Root = 'assets/replay/b2/';
const cases = [
  {
    label: 'Camera · Sol', title: 'Living & dining room', model: 'GPT-6.1-Sol', brand: 'openai',
    reference: 'assets/replay/reference.png', submissions: camera,
    notes: ['Match shelf corners and chair feet','Use chair silhouettes to refine the fit','Align the shelf edges','Adjust the pose using chair feet','Set camera height and remove roll'],
    regions: [[.16,.27,.76,.60],[.50,.49,.45,.38],[.15,.35,.21,.38],[.55,.73,.20,.12],[.15,.35,.21,.38]],
    positions: [[115,180],[360,335],[278,265],[300,510],[278,265]]
  },
  {
    label: 'Image-to-mesh · Kimi', title: 'Fish reconstruction', model: 'Kimi-K3.1-Pro', brand: 'kimi',
    reference: fishRoot + 'reference-side.webp',
    viewBox: [900, 620],
    inspections: [
      'Trace the reference silhouette',
      'Inspect the ridges along the flank',
      'Inspect · The body still breaks into flat bands',
      'Inspect · Compare the head and gill outline',
      'Inspect · Check where the fins meet the body'
    ],
    submissions: [49.30,54.41,61.50,64.88,65.04].map((score, i) => ({score, image: fishRoot + (i + 1) + '.webp?v=side1'})),
    notes: ['Build the first mesh from the reference views','Relax the ridges along the body','Remesh and check the silhouette','Refine the head and gill contour','Check the final fin and body profiles'],
    regions: [[.07,.20,.86,.60],[.33,.43,.34,.20],[.09,.21,.82,.58],[.09,.41,.29,.27],[.42,.20,.42,.50]]
  },
  {
    label: 'Animation · Astra', title: 'B2 battle droid', model: 'GPT-6-Astra', brand: 'openai',
    reference: b2Root + 'reference.webp', referenceMotion: b2Root + '0.webp',
    viewBox: [600, 600], inspectTime: 6000, duration: 12000,
    submissions: [61.49,70.00,81.94,87.48,87.92].map((score, i) => ({score, image: b2Root + (i + 1) + '.webp'})),
    inspections: [
      'Watch one full stride in the reference',
      'Compare the legs\nthrough the stride',
      'Check each\nhand angle',
      'Check the pose against individual frames',
      'Compare the two\nstride cycles'
    ],
    notes: [
      'Fit the first stride to tracked landmarks',
      'Fit and smooth\nthe silhouette',
      'Refine the wrists\nand hand poses',
      'Refit joint angles frame by frame',
      'Smooth corrections\nacross both cycles'
    ],
    regions: [[.26,.12,.48,.79],[.32,.54,.38,.36],[.30,.42,.36,.20],[.28,.14,.44,.73],[.32,.53,.38,.37]],
    positions: [[36,54],[182,336],[170,264],[32,68],[182,330]]
  }
];
const q = selector => panel.querySelector(selector);
const drawTime = 1400;
let duration, inspectTime, peekTime = 0;
let active, data, pts, step = 0, elapsed = 0, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, visible = false, last = 0, peek = false;
tabs.innerHTML = cases.map(item => `<button type="button">${item.label}</button>`).join('');
function motionLayer(id, label) {
  return `<svg id="${id}" class="motion-layer" viewBox="0 0 300 300" role="img" aria-label="${label}"><svg width="300" height="300" overflow="hidden"><image width="2400" height="2700"/></svg></svg>`;
}

function showMotion(layer, source, frame) {
  const strip = layer.querySelector('image');
  if (strip.getAttribute('href') !== source) strip.setAttribute('href', source);
  const viewport = layer.querySelector('svg');
  const view = `${(frame % 8) * 300} ${Math.floor(frame / 8) * 300} 300 300`;
  if (viewport.getAttribute('viewBox') !== view) viewport.setAttribute('viewBox', view);
}

function selectCase(index) {
  active = cases[index];
  data = active.submissions;
  duration = active.duration || 7200;
  inspectTime = active.inspectTime || 3000;
  pts = data.map((d,i) => [40+i*93,235-d.score*2.35]);
  peek = false;
  last = 0;
  panel.dataset.case = active.referenceMotion ? 'b2' : active.brand;
  Array.from(tabs.children).forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
panel.innerHTML=`<div class="replay-chart"><div class="replay-heading"><h3>${active.title}</h3><span class="replay-agent"><img src="brand/${active.brand}.svg" alt="">${active.model}</span></div><div class="replay-score"><strong id="replay-score">0.00</strong><span>/ 100</span></div><svg class="replay-plot" viewBox="0 0 452 280" aria-label="Five online submission scores"><path d="M40 235H412" class="plot-baseline"/><path id="replay-line"/><circle id="replay-cursor" r="5"/>${pts.map((p,i)=>`<g class="replay-point" data-step="${i}" role="button" tabindex="0" aria-label="Submission ${i+1}, score ${data[i].score.toFixed(2)}"><circle cx="${p[0]}" cy="${p[1]}" r="17" fill="transparent"/><circle class="plot-dot" cx="${p[0]}" cy="${p[1]}" r="4"/><text class="dot-score" x="${p[0]}" y="${p[1]-16}" text-anchor="middle">${data[i].score.toFixed(2)}</text><text class="dot-index" x="${p[0]}" y="264" text-anchor="middle">${i+1}</text></g>`).join('')}</svg><div class="replay-navigation"><button id="replay-prev" aria-label="Previous submission">←</button><button id="replay-play" aria-label="Pause replay">Ⅱ</button><button id="replay-next" aria-label="Next submission">→</button><span id="replay-counter">01 / 05</span></div><div class="replay-progress"><i></i></div></div><div class="replay-film"><div class="replay-frame">${active.referenceMotion ? motionLayer('replay-before', 'Previous motion or reference') + motionLayer('replay-image', 'Current submission motion') + motionLayer('replay-gt', 'Ground truth outline') : '<img id="replay-before" alt="Previous submission"><img id="replay-image" alt="Current submission">'}<svg class="replay-overlay" viewBox="0 0 ${(active.viewBox || [720,720]).join(' ')}" preserveAspectRatio="${active.viewBox ? 'xMidYMid meet' : 'xMidYMid slice'}" aria-hidden="true"><rect id="replay-region" rx="4"/><path id="replay-guides"/><text id="replay-note"></text></svg><button class="reference-peek" aria-label="Show reference"><img src="${active.reference}" alt="Reference view"><span>Reference ↗</span></button>${active.referenceMotion ? '<label class="motion-gt-control"><input type="checkbox" checked> Cyan GT</label>' : ''}</div></div>`;
  bindControls();
  setup(0);
  syncPlayButton();
}
function setup(i) {
  step = (i + data.length) % data.length;
  elapsed = playing ? 0 : inspectTime + drawTime;
  if (!active.referenceMotion) q('#replay-image').src = data[step].image;
  q('#replay-counter').textContent = `0${step + 1} / 05`;
  const region = q('#replay-region');
  active.regions[step].forEach((v, j) => region.setAttribute(['x','y','width','height'][j], v * (active.viewBox?.[j % 2] || 720)));
  q('#replay-guides').setAttribute('d', active === cases[0] && (step === 2 || step === 4) ? 'M112 300H252M112 350H252M112 400H252M112 450H252' : '');
  const note = q('#replay-note');
  note.textContent = active.notes[step];
  delete note.dataset.message;
  const [x, y] = active.positions?.[step] || [
    Number(region.getAttribute('x')),
    Number(region.getAttribute('y')) - 12
  ];
  note.setAttribute('x', x);
  note.setAttribute('y', y);
  panel.dataset.step = step;
  paint();
}
function paint() {
  const progress = Math.max(0, Math.min(1, (elapsed - inspectTime) / drawTime));
  const t = 1 - Math.pow(1 - progress, 3);
  const previous = step ? pts[step - 1] : [pts[0][0], 235];
  const now = previous.map((v, axis) => v + (pts[step][axis] - v) * t);
  const chain = pts.slice(0, step).concat([now]);
  q('#replay-line').setAttribute('d', chain.map((p,i) => (i ? 'L' : 'M') + p.join(' ')).join(' '));
  q('#replay-cursor').setAttribute('cx', now[0]);
  q('#replay-cursor').setAttribute('cy', now[1]);
  const inspecting = elapsed < inspectTime;
  const previousScore = step ? data[step - 1].score : 0;
  const score = (previousScore + (data[step].score - previousScore) * t).toFixed(2);
  if (active.inspections) {
    const caption = q('#replay-note');
    const message = peek ? 'Reference' : inspecting ? active.inspections[step] : active.notes[step];
    if (caption.dataset.message !== message) {
      caption.dataset.message = message;
      const lines = message.split('\n');
      caption.setAttribute('text-anchor', lines.length > 1 ? 'end' : 'start');
      caption.replaceChildren(...lines.map((line, i) => {
        const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        span.setAttribute('x', caption.getAttribute('x'));
        span.setAttribute('dy', i ? '1.2em' : '0');
        span.textContent = line;
        return span;
      }));
    }
  }
  q('#replay-score').textContent = score;
  q('#replay-image').style.opacity = peek ? 0 : t;
  const source = peek || !step ? (active.referenceMotion || active.reference) : data[step - 1].image;
  const before = q('#replay-before');
  if (active.referenceMotion) {
    const frame = Math.floor((peek ? peekTime : elapsed) * 12 / 1000) % 72;
    showMotion(before, source, frame);
    showMotion(q('#replay-image'), data[step].image, frame);
    const outline = q('#replay-gt');
    const showOutline = !peek && (step > 0 || t > 0) && q('.motion-gt-control input').checked;
    outline.style.visibility = showOutline ? 'visible' : 'hidden';
    if (showOutline) showMotion(outline, b2Root + 'gt-outline.webp', frame);
  } else if (before.getAttribute('src') !== source) before.src = source;
  const openingReference = active.inspections && !step && progress < 1;
  if (active.inspections) {
    before.style.opacity = peek ? 1 : 1 - t;
    q('#replay-region').style.visibility = openingReference ? 'hidden' : 'visible';
  }
  q('.replay-overlay').style.opacity = peek ? 0 : 1;
  q('.replay-progress i').style.width = (elapsed / duration * 100) + '%';
  panel.querySelectorAll('.replay-point').forEach((point, i) => {
    point.classList.toggle('reached', i < step || (i === step && progress === 1));
    point.classList.toggle('selected', i === step);
  });
  panel.dataset.phase = inspecting ? 'inspect' : 'submit';
}
function syncPlayButton(){q('#replay-play').textContent=playing?'Ⅱ':'▶';q('#replay-play').setAttribute('aria-label',playing?'Pause replay':'Play replay');}
function bindControls(){
  if (active.referenceMotion) q('.motion-gt-control input').onchange = paint;
q('#replay-play').onclick=()=>{playing=!playing;syncPlayButton()};q('#replay-prev').onclick=()=>setup(step-1);q('#replay-next').onclick=()=>setup(step+1);
panel.querySelectorAll('[data-step]').forEach(b=>{const go=()=>{setup(+b.dataset.step);elapsed=inspectTime+drawTime;playing=false;q('#replay-play').textContent='▶';q('#replay-play').setAttribute('aria-label','Play replay');paint()};b.onclick=go;b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();go()}}});
q('.reference-peek').onclick=()=>{peek=!peek;peekTime=elapsed;q('.reference-peek').classList.toggle('active',peek);q('.reference-peek').setAttribute('aria-pressed',peek);paint()};
}
Array.from(tabs.children).forEach((button, index) => button.onclick = () => selectCase(index));
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0},{threshold:.2}).observe(panel);
document.addEventListener('visibilitychange',()=>last=0);
function tick(ts) {
  if (last && playing && visible && !document.hidden) {
    const delta = Math.min(ts - last, 100);
    if (!peek) {
      elapsed += delta;
      if (elapsed >= duration) setup(step + 1);
      paint();
    } else if (active.referenceMotion) {
      peekTime += delta;
      paint();
    }
  }
  last = ts;
  requestAnimationFrame(tick);
}
selectCase(0);requestAnimationFrame(tick);
})();
