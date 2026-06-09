/* quizmill.dev — all interactivity, no dependencies.
   Three exhibits: (1) a real practice loop in the hero, with the
   mistakes re-queue; (2) the pack→app switcher; (3) the agent terminal.
*/
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ————— 1. The live practice loop ————— */
/* Five questions straight from the bundled demo pack. */
const QUESTIONS = [
  {
    prompt: 'Which planet is closest to the Sun?',
    options: ['Venus', 'Mercury', 'Mars', 'Earth'],
    correct: 1,
    explanation:
      'Mercury orbits at about 58 million km, the innermost of the eight planets. Venus is second — hottest, but not closest. A classic mix-up.',
  },
  {
    prompt: 'Which planet has the most confirmed moons as of the mid-2020s?',
    options: ['Jupiter', 'Uranus', 'Saturn', 'Neptune'],
    correct: 2,
    explanation:
      'Saturn overtook Jupiter after a wave of small-moon discoveries, passing 140 confirmed moons. Jupiter held the record for decades — the tempting distractor.',
  },
  {
    prompt: 'Why is Venus hotter than Mercury, despite being farther from the Sun?',
    options: [
      'A thick CO₂ atmosphere traps heat',
      'Volcanic activity heats it from inside',
      'One side always faces the Sun',
      'It reflects less sunlight than Mercury',
    ],
    correct: 0,
    explanation:
      "Venus's dense CO₂ atmosphere produces a runaway greenhouse effect — about 465°C, day and night. Mercury, with almost no atmosphere, averages cooler.",
  },
  {
    prompt: 'Which moon has a subsurface ocean and erupting water plumes?',
    options: ['Phobos (Mars)', 'Enceladus (Saturn)', 'Callisto (Jupiter)', 'Triton (Neptune)'],
    correct: 1,
    explanation:
      "Cassini flew through Enceladus's south-polar water plumes, confirming a salty subsurface ocean. Triton's geysers are nitrogen, not water.",
  },
  {
    prompt: 'What disqualifies Pluto from being a planet under the 2006 IAU definition?',
    options: [
      'It is smaller than some moons',
      "It hasn't cleared its orbital neighbourhood",
      "It doesn't orbit the Sun directly",
      'It lacks the gravity to be round',
    ],
    correct: 1,
    explanation:
      'Pluto fails only the third test: it shares the Kuiper belt with many similar bodies. It is round, and it is bigger than several moons.',
  },
];

const quizEl = document.getElementById('quiz');
const headerWheel = document.querySelector('#header-wheel .wheel-spin');
let wheelTurn = 0;

function turnWheel() {
  wheelTurn += 45;
  if (headerWheel) headerWheel.style.transform = `rotate(${wheelTurn}deg)`;
}

function startQuiz() {
  const state = {
    queue: QUESTIONS.map((_, i) => i),
    missed: new Set(),
    rescued: new Set(),
    doneFirstTry: new Set(),
    seenCount: 0,
  };
  renderQuestion(state);
}

function dots(state, currentIdx) {
  return QUESTIONS.map((_, i) => {
    if (i === currentIdx) return '<span class="now"></span>';
    if (state.doneFirstTry.has(i) || state.rescued.has(i)) return '<span class="done"></span>';
    if (state.missed.has(i)) return '<span class="missed"></span>';
    return '<span></span>';
  }).join('');
}

function renderQuestion(state) {
  const idx = state.queue[0];
  const q = QUESTIONS[idx];
  const isRetry = state.missed.has(idx);
  quizEl.innerHTML = `
    <div class="quiz-meta">
      <span class="quiz-chip ${isRetry ? 'requeued' : ''}">${isRetry ? '⟳ back for a rescue' : 'practice'}</span>
      <div class="quiz-dots">${dots(state, idx)}</div>
    </div>
    <div class="quiz-prompt">${q.prompt}</div>
    <div class="quiz-opts">
      ${q.options
        .map(
          (text, i) =>
            `<button class="quiz-opt" data-i="${i}"><span class="key">${'ABCD'[i]}</span><span>${text}</span></button>`,
        )
        .join('')}
    </div>
    <div class="quiz-tail"></div>
  `;
  quizEl.querySelectorAll('.quiz-opt').forEach((btn) => {
    btn.addEventListener('click', () => answer(state, idx, Number(btn.dataset.i)));
  });
}

function answer(state, idx, picked) {
  const q = QUESTIONS[idx];
  const right = picked === q.correct;
  turnWheel();
  quizEl.querySelectorAll('.quiz-opt').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('is-correct');
    else if (i === picked) btn.classList.add('is-wrong');
    else btn.classList.add('is-dim');
  });

  state.queue.shift();
  if (right) {
    if (state.missed.has(idx)) state.rescued.add(idx);
    else state.doneFirstTry.add(idx);
  } else {
    state.missed.add(idx);
    state.queue.push(idx); // the whole product, in one line
  }

  const tail = quizEl.querySelector('.quiz-tail');
  tail.innerHTML = `
    <div class="quiz-feedback ${right ? 'good' : 'bad'}">
      <span class="verdict">${right ? (state.rescued.has(idx) ? 'Rescued.' : 'Correct.') : 'Not quite.'}</span>
      ${q.explanation}
      ${!right ? '<span class="comeback">⟳ Re-queued — it comes back until you get it right.</span>' : ''}
    </div>
    <div class="quiz-next">
      <button class="quiz-btn">${state.queue.length === 0 ? 'See results' : 'Next question'}</button>
    </div>
  `;
  tail.querySelector('.quiz-btn').addEventListener('click', () => {
    if (state.queue.length === 0) renderEnd(state);
    else renderQuestion(state);
  });
}

function renderEnd(state) {
  const total = QUESTIONS.length;
  const firstTry = state.doneFirstTry.size;
  const rescued = state.rescued.size;
  quizEl.innerHTML = `
    <div class="quiz-end">
      <div class="score">${firstTry}/${total}</div>
      <div>first try</div>
      ${rescued ? `<div class="rescued">+ ${rescued} rescued from the mistakes queue ⟳</div>` : ''}
      <p>That loop you just felt — answer, review, retry — ships in every pack. Yours included.</p>
      <button class="quiz-btn" style="max-width:240px">Grind again</button>
    </div>
  `;
  quizEl.querySelector('.quiz-btn').addEventListener('click', startQuiz);
  if (rescued === state.missed.size && !reducedMotion) confetti();
}

function confetti() {
  const colors = ['#b45309', '#0f766e', '#1e3a5f', '#e8943a', '#15803d'];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--t', 1.8 + Math.random() * 1.6 + 's');
    piece.style.setProperty('--r', Math.floor(Math.random() * 720 - 360) + 'deg');
    piece.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

if (quizEl) startQuiz();

/* ————— 2. Pack → app switcher ————— */
const PACKS = [
  {
    name: 'Solar System',
    note: 'the bundled demo pack',
    color: '#0f766e',
    initials: 'SSP',
    title: 'Solar System Practice',
    subtitle: 'The demo pack. Build your own.',
    cats: [
      ['Planets & Moons', 64],
      ['Space Exploration', 38],
    ],
    caption: 'Ships in the repo — npm run dev and it’s there.',
  },
  {
    name: 'Claude Cert Practice',
    note: '635 questions · community-curated',
    color: '#1e3a5f',
    initials: 'CCP',
    title: 'Claude Cert Practice',
    subtitle: 'Architect Foundations — keep building.',
    cats: [
      ['Agentic Architecture', 52],
      ['Prompt Engineering', 31],
      ['Tools & MCP', 18],
      ['Claude Code', 44],
      ['Context & Reliability', 26],
    ],
    caption: 'npm run pack:use quizmill/pack-claude-cert',
  },
  {
    name: '11+ Practice',
    note: 'a private family pack',
    color: '#3b78e0',
    initials: 'P',
    title: '11+ Practice',
    subtitle: "Let's keep going.",
    cats: [
      ['English', 71],
      ['Maths', 55],
      ['Verbal Reasoning', 62],
    ],
    caption: 'Private repos install the same way. Nobody else ever sees it.',
  },
  {
    name: 'Kubernetes Networking',
    note: 'the one your agent writes next',
    color: '#7c3aed',
    initials: 'KN',
    title: 'Kubernetes Networking',
    subtitle: 'Packets find a way.',
    cats: [
      ['Services & kube-proxy', 12],
      ['Ingress & Gateway', 5],
      ['NetworkPolicy', 0],
    ],
    caption: '“Make me a learning pack about Kubernetes networking.” — that’s the whole workflow.',
  },
];

const chipsEl = document.getElementById('pack-chips');
if (chipsEl) {
  PACKS.forEach((p, i) => {
    const chip = document.createElement('button');
    chip.className = 'pack-chip' + (i === 0 ? ' is-active' : '');
    chip.style.setProperty('--pc', p.color);
    chip.setAttribute('role', 'tab');
    chip.innerHTML = `<span class="swatch">${p.initials}</span><span>${p.name}<small>${p.note}</small></span>`;
    chip.addEventListener('click', () => selectPack(i));
    chipsEl.appendChild(chip);
  });
  selectPack(0);
}

function selectPack(i) {
  const p = PACKS[i];
  chipsEl.querySelectorAll('.pack-chip').forEach((c, j) => c.classList.toggle('is-active', i === j));
  const screen = document.querySelector('.phone-screen');
  screen.style.setProperty('--ac', p.color);
  document.getElementById('app-icon').textContent = p.initials;
  document.getElementById('app-title').textContent = p.title;
  document.getElementById('app-subtitle').textContent = p.subtitle;
  document.getElementById('app-cats').innerHTML = p.cats
    .map(
      ([label, pct]) =>
        `<div class="app-cat">${label}<div class="bar"><i style="--p:${pct}%"></i></div></div>`,
    )
    .join('');
  document.getElementById('phone-caption').textContent = p.caption;
}

/* ————— 3. The agent terminal ————— */
const SCRIPT = [
  { cls: 'u', text: '> Make me a learning pack about Kubernetes networking', type: true },
  { cls: 'a', text: 'Scoping with you: practitioner level · ~40 questions · 3 categories', delay: 700 },
  { cls: 'a', text: 'Writing packs/k8s-networking/ — pack.json, questions.json…', delay: 900 },
  { cls: 'dim', text: '$ npm run pack:validate packs/k8s-networking', delay: 1100 },
  { cls: 'err', text: '✗ questions.json[k8s-networking-services-007]: correctKey must reference one of the options', delay: 700 },
  { cls: 'a', text: 'Fixing 1 error…', delay: 800 },
  { cls: 'dim', text: '$ npm run pack:validate packs/k8s-networking', delay: 900 },
  { cls: 'ok', text: '✓ valid pack at packs/k8s-networking — 40 questions', delay: 700 },
  { cls: 'dim', text: '$ npm run pack:use packs/k8s-networking && npm run dev', delay: 900 },
  { cls: 'ok', text: '✓ activated "Kubernetes Networking" — your app is at http://localhost:3000', delay: 700 },
];

const termBody = document.getElementById('terminal-body');

async function runTerminal() {
  if (reducedMotion) {
    termBody.innerHTML = SCRIPT.map((l) => `<div class="${l.cls}">${l.text}</div>`).join('');
    return;
  }
  for (;;) {
    termBody.innerHTML = '';
    for (const line of SCRIPT) {
      await wait(line.delay ?? 0);
      const div = document.createElement('div');
      div.className = line.cls;
      termBody.appendChild(div);
      if (line.type) {
        const cur = document.createElement('span');
        cur.className = 'cursor';
        div.appendChild(cur);
        for (const ch of line.text) {
          cur.insertAdjacentText('beforebegin', ch);
          await wait(28);
        }
        await wait(400);
        cur.remove();
      } else {
        div.textContent = line.text;
      }
    }
    await wait(5200);
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (termBody) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        runTerminal();
      }
    },
    { threshold: 0.3 },
  );
  io.observe(termBody);
}

/* ————— small stuff: tabs + copy buttons ————— */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab);
    });
  });
});

document.querySelectorAll('[data-copy] .copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const code = btn.parentElement.querySelector('code');
    const text = [...code.childNodes]
      .filter((n) => !(n.classList && n.classList.contains('c')))
      .map((n) => n.textContent)
      .join('')
      .replace(/^\n+/, '');
    await navigator.clipboard.writeText(text);
    btn.textContent = 'copied ✓';
    setTimeout(() => (btn.textContent = 'copy'), 1600);
  });
});
