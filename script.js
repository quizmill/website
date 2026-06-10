/* quizmill.dev — all interactivity, no dependencies.
   Three exhibits: (1) a real practice loop in the hero, with the
   mistakes re-queue and a sticker unlock; (2) the pack→app switcher,
   now a navigable mini quizmill instance (home / practice / stickers /
   progress); (3) the agent terminal.
*/
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TRY_URL = 'https://try.quizmill.dev';

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
      "Cassini flew through Enceladus's south-polar water plumes, confirming a salty subsurface ocean. Triton's geysers are nitrogen, not water. — [NASA: Enceladus](https://science.nasa.gov/saturn/moons/enceladus/)",
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

/** Render the markdown subset packs use in explanations — [text](url)
 *  links — into safe HTML. Mirrors the engine's McqMarkdown for links:
 *  external refs become real, attributed anchors. Everything else is
 *  escaped so explanation text can't inject markup. */
function linkify(text) {
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = '';
  let last = 0;
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    out += `<a href="${esc(m[2])}" target="_blank" rel="noopener" class="explain-link">${esc(m[1])} ↗</a>`;
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  return out;
}

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
    streak: 0,
    streakStickerShown: false,
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
    state.streak += 1;
    if (state.missed.has(idx)) state.rescued.add(idx);
    else state.doneFirstTry.add(idx);
  } else {
    state.streak = 0;
    state.missed.add(idx);
    state.queue.push(idx); // the whole product, in one line
  }

  // Three in a row — the sticker system, demonstrated live.
  if (state.streak === 3 && !state.streakStickerShown) {
    state.streakStickerShown = true;
    stickerToast(quizEl.closest('.demo-frame'), '🔥', 'Hot streak', '3 correct in a row');
    if (!reducedMotion) confetti(24);
  }

  const tail = quizEl.querySelector('.quiz-tail');
  tail.innerHTML = `
    <div class="quiz-feedback ${right ? 'good' : 'bad'}">
      <span class="verdict">${right ? (state.rescued.has(idx) ? 'Rescued.' : 'Correct.') : 'Not quite.'}</span>
      ${linkify(q.explanation)}
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
      <a class="quiz-link" href="${TRY_URL}" target="_blank" rel="noopener">or keep going in the real app ↗</a>
    </div>
  `;
  quizEl.querySelector('.quiz-btn').addEventListener('click', startQuiz);
  if (rescued === state.missed.size && !reducedMotion) confetti();
}

/** Sticker-unlocked toast pinned to a container (hero frame or phone). */
function stickerToast(container, emoji, name, desc) {
  if (!container) return;
  container.querySelector('.sticker-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'sticker-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="st-emoji">${emoji}</span><span><b>Sticker unlocked</b>${name} — ${desc}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function confetti(count = 70, host = document.body, fixed = true) {
  const colors = ['#b45309', '#0f766e', '#1e3a5f', '#e8943a', '#15803d'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    piece.className = fixed ? 'confetti' : 'confetti confetti-local';
    piece.style.left = Math.random() * 100 + (fixed ? 'vw' : '%');
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--t', 1.8 + Math.random() * 1.6 + 's');
    piece.style.setProperty('--r', Math.floor(Math.random() * 720 - 360) + 'deg');
    piece.style.animationDelay = Math.random() * 0.4 + 's';
    host.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

if (quizEl) startQuiz();

/* ————— 2. Pack → app switcher: a navigable mini quizmill ————— */
/* Each pack carries enough data to feel like the real app: categories
   with seeded history, two on-theme questions, a sticker set, and a
   daily streak. Playing updates everything live. */
const PACKS = [
  {
    name: 'Solar System',
    note: 'the bundled demo pack',
    color: '#0f766e',
    initials: 'SSP',
    title: 'Solar System Practice',
    subtitle: 'The demo pack. Build your own.',
    cats: [
      { label: 'Planets & Moons', answered: 9, acc: 67 },
      { label: 'Space Exploration', answered: 4, acc: 75 },
    ],
    streak: 1,
    seedStickers: [],
    questions: [
      {
        cat: 'Planets & Moons',
        prompt: 'Which planet rotates on its side, tilted about 98°?',
        options: ['Saturn', 'Uranus', 'Neptune', 'Jupiter'],
        correct: 1,
        explanation:
          'Uranus rolls around the Sun — rings and moons orbit the tilted plane too, likely after an ancient giant impact.',
      },
      {
        cat: 'Space Exploration',
        prompt: 'Which spacecraft was first to reach interstellar space, Golden Record aboard?',
        options: ['Voyager 1', 'Apollo 11', 'Cassini', 'New Horizons'],
        correct: 0,
        explanation:
          'Voyager 1 crossed the heliopause in 2012, 35 years after launch — still phoning home on ~4 watts. — [NASA: Voyager](https://science.nasa.gov/mission/voyager/)',
      },
    ],
    caption: 'Ships in the repo — npm run dev and it’s there. Or tap Practice ↑',
  },
  {
    name: 'Claude Cert Practice',
    note: '635 questions · community-curated',
    color: '#1e3a5f',
    initials: 'CCP',
    title: 'Claude Cert Practice',
    subtitle: 'Architect Foundations — keep building.',
    cats: [
      { label: 'Agentic Architecture', answered: 52, acc: 81 },
      { label: 'Prompt Engineering', answered: 31, acc: 74 },
      { label: 'Tools & MCP', answered: 18, acc: 61 },
      { label: 'Claude Code', answered: 44, acc: 86 },
    ],
    streak: 6,
    seedStickers: ['volume'],
    questions: [
      {
        cat: 'Tools & MCP',
        prompt: 'In MCP, which component exposes tools for a client to call?',
        options: ['The model', 'An MCP server', 'The system prompt', 'The transport layer'],
        correct: 1,
        explanation:
          'Servers advertise tools (and resources, prompts); clients connect and the model decides when to call them.',
      },
      {
        cat: 'Prompt Engineering',
        prompt: 'Most reliable way to get strict JSON out of Claude?',
        options: [
          'Ask twice, firmly',
          'Define a tool schema and require the tool call',
          'Set temperature to 0 and hope',
          'Append "JSON ONLY!!" to the prompt',
        ],
        correct: 1,
        explanation:
          'Tool use validates against a JSON Schema at the API layer — the model retries on mismatch. Prompt pleading does not.',
      },
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
      { label: 'English', answered: 71, acc: 78 },
      { label: 'Maths', answered: 55, acc: 83 },
      { label: 'Verbal Reasoning', answered: 62, acc: 71 },
    ],
    streak: 11,
    seedStickers: ['streak', 'volume'],
    questions: [
      {
        cat: 'Maths',
        prompt: 'What is ¾ of 96?',
        options: ['64', '72', '68', '76'],
        correct: 1,
        explanation: '96 ÷ 4 = 24, then 24 × 3 = 72. Quarter first, then scale.',
      },
      {
        cat: 'Verbal Reasoning',
        prompt: 'Find the four-letter word hidden across two words: “the camp lanterns flickered”',
        options: ['plan', 'tern', 'lamp', 'lick'],
        correct: 0,
        explanation: 'cam(p lan)terns — hidden words straddle the join between words.',
      },
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
      { label: 'Services & kube-proxy', answered: 12, acc: 75 },
      { label: 'Ingress & Gateway', answered: 5, acc: 60 },
      { label: 'NetworkPolicy', answered: 0, acc: 0 },
    ],
    streak: 0,
    seedStickers: [],
    questions: [
      {
        cat: 'Services & kube-proxy',
        prompt: 'A ClusterIP Service routes to zero endpoints. Most likely cause?',
        options: [
          'kube-proxy is down on the control plane',
          'The Service selector matches no Pod labels',
          'CoreDNS lost the Service record',
          'The Pods lack a readinessProbe',
        ],
        correct: 1,
        explanation:
          'Endpoints are computed from the selector; no matching labels → empty endpoint set. DNS still resolves — at nothing.',
      },
      {
        cat: 'NetworkPolicy',
        prompt: 'Once a NetworkPolicy selects a pod, traffic not matched by any rule is…',
        options: ['allowed', 'denied', 'logged and allowed', 'rate-limited'],
        correct: 1,
        explanation:
          'Selection flips the default: in the policed direction, anything no rule allows is dropped. Unselected pods stay wide open.',
      },
    ],
    caption: '“Make me a learning pack about Kubernetes networking.” — that’s the whole workflow.',
  },
];

/* Sticker definitions for the mini cabinet — mirrors the real app:
   static stickers + one mastery sticker per pack category. */
const MASTERY_EMOJIS = ['📚', '🧮', '🧩', '🔬', '🪐', '🗺️'];
function packStickers(p) {
  const mastery = p.cats.slice(0, 2).map((c, i) => ({
    id: `mastery-${i}`,
    emoji: MASTERY_EMOJIS[i % MASTERY_EMOJIS.length],
    name: `${c.label.split(' ')[0]} mastery`,
    desc: `80% on 30+ ${c.label} questions`,
  }));
  return [
    { id: 'first', emoji: '🎈', name: 'First steps', desc: 'Finish your first session' },
    { id: 'flawless', emoji: '✨', name: 'Flawless', desc: '100% on a full round' },
    { id: 'streak', emoji: '🔥', name: 'Hot streak', desc: '5 correct in a row' },
    { id: 'volume', emoji: '💯', name: 'Centurion', desc: 'Answer 100 questions' },
    ...mastery,
  ];
}

const chipsEl = document.getElementById('pack-chips');
const miniEl = document.getElementById('mini-app');
const phoneScreen = document.getElementById('phone-screen');
let mini = null; // live state for the selected pack

if (chipsEl && miniEl) {
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
  phoneScreen.style.setProperty('--ac', p.color);
  document.getElementById('phone-caption').textContent = p.caption;
  mini = {
    pack: p,
    // Deep-copy seeded history so replays and pack switches reset cleanly.
    cats: p.cats.map((c) => ({ ...c })),
    stickers: new Set(p.seedStickers),
    streak: p.streak,
    sessions: 0,
  };
  miniHome();
}

function miniTotals() {
  let answered = 0;
  let correct = 0;
  for (const c of mini.cats) {
    answered += c.answered;
    correct += Math.round((c.answered * c.acc) / 100);
  }
  return { answered, acc: answered ? Math.round((correct / answered) * 100) : 0 };
}

function miniHome() {
  const p = mini.pack;
  const t = miniTotals();
  miniEl.innerHTML = `
    <div class="ma-head">
      <div class="app-icon">${p.initials}</div>
      <div class="ma-nav">
        <button data-go="progress" aria-label="Progress" title="Progress">▤</button>
        <button data-go="stickers" aria-label="Sticker cabinet" title="Sticker cabinet">★</button>
      </div>
    </div>
    <h3 class="app-title">${p.title}</h3>
    <p class="app-subtitle">${p.subtitle}</p>
    <div class="ma-stats">
      <div class="ma-stat"><b>${t.answered}</b><span>answered</span></div>
      <div class="ma-stat"><b>${t.acc}%</b><span>accuracy</span></div>
    </div>
    <div class="ma-cats">
      ${mini.cats
        .map(
          (c, i) => `
        <button class="ma-cat" data-cat="${i}">
          <span>${c.label}<small>${c.answered ? `${c.answered} answered · ${c.acc}%` : 'start here'}</small></span>
          <span class="ma-cat-go">›</span>
        </button>`,
        )
        .join('')}
    </div>
    <button class="app-practice" data-practice>Practice</button>
  `;
  miniEl.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => (b.dataset.go === 'stickers' ? miniStickers() : miniProgress())),
  );
  miniEl.querySelectorAll('[data-cat], [data-practice]').forEach((b) =>
    b.addEventListener('click', () => miniPractice()),
  );
}

function miniPractice() {
  const qs = mini.pack.questions;
  const session = { i: 0, correct: 0 };
  askMini(qs, session);
}

function askMini(qs, session) {
  const q = qs[session.i];
  miniEl.innerHTML = `
    <div class="ma-head">
      <button class="ma-back" data-home>‹ Home</button>
      <span class="ma-count">Q ${session.i + 1} / ${qs.length}</span>
    </div>
    <span class="ma-chip">${q.cat}</span>
    <div class="ma-q">${q.prompt}</div>
    <div class="ma-opts">
      ${q.options
        .map(
          (text, i) =>
            `<button class="ma-opt" data-i="${i}"><span class="key">${'ABCD'[i]}</span><span>${text}</span></button>`,
        )
        .join('')}
    </div>
    <div class="ma-tail"></div>
  `;
  miniEl.querySelector('[data-home]').addEventListener('click', miniHome);
  miniEl.querySelectorAll('.ma-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const picked = Number(btn.dataset.i);
      const right = picked === q.correct;
      turnWheel();
      if (right) session.correct += 1;
      miniEl.querySelectorAll('.ma-opt').forEach((b) => {
        const i = Number(b.dataset.i);
        b.disabled = true;
        if (i === q.correct) b.classList.add('is-correct');
        else if (i === picked) b.classList.add('is-wrong');
        else b.classList.add('is-dim');
      });
      // Update the live category history, like a real recorded attempt.
      const cat = mini.cats.find((c) => c.label === q.cat);
      if (cat) {
        const correctSoFar = Math.round((cat.answered * cat.acc) / 100) + (right ? 1 : 0);
        cat.answered += 1;
        cat.acc = Math.round((correctSoFar / cat.answered) * 100);
      }
      const last = session.i + 1 === qs.length;
      miniEl.querySelector('.ma-tail').innerHTML = `
        <div class="ma-feedback ${right ? 'good' : 'bad'}">
          <b>${right ? 'Correct.' : 'Not quite.'}</b> ${linkify(q.explanation)}
        </div>
        <button class="ma-next">${last ? 'See results' : 'Next question'}</button>
      `;
      miniEl.querySelector('.ma-next').addEventListener('click', () => {
        if (last) finishMini(qs, session);
        else {
          session.i += 1;
          askMini(qs, session);
        }
      });
    });
  });
}

function finishMini(qs, session) {
  mini.sessions += 1;
  if (mini.streak === 0) mini.streak = 1;
  const fresh = [];
  if (!mini.stickers.has('first')) fresh.push('first');
  if (session.correct === qs.length && !mini.stickers.has('flawless')) fresh.push('flawless');
  fresh.forEach((id) => mini.stickers.add(id));

  const all = packStickers(mini.pack);
  miniEl.innerHTML = `
    <div class="ma-head"><button class="ma-back" data-home>‹ Home</button></div>
    <div class="ma-end">
      <div class="ma-score">${session.correct}/${qs.length}</div>
      <div class="ma-end-sub">${session.correct === qs.length ? 'flawless round' : 'keep the wheel turning'}</div>
      <button class="app-practice" data-again>Another round</button>
      <button class="ma-ghost" data-stickers>Sticker cabinet ★</button>
    </div>
  `;
  miniEl.querySelector('[data-home]').addEventListener('click', miniHome);
  miniEl.querySelector('[data-again]').addEventListener('click', miniPractice);
  miniEl.querySelector('[data-stickers]').addEventListener('click', miniStickers);

  if (fresh.length) {
    const s = all.find((x) => x.id === fresh[0]);
    stickerToast(phoneScreen, s.emoji, s.name, s.desc);
    if (!reducedMotion) confetti(18, phoneScreen, false);
  }
}

function miniStickers() {
  const all = packStickers(mini.pack);
  const earned = mini.stickers;
  miniEl.innerHTML = `
    <div class="ma-head">
      <button class="ma-back" data-home>‹ Home</button>
      <span class="ma-count">${earned.size} / ${all.length} stickers</span>
    </div>
    <h3 class="ma-h">Sticker cabinet</h3>
    <div class="ma-grid">
      ${all
        .map((s) => {
          const got = earned.has(s.id);
          return `<div class="ma-sticker ${got ? 'is-earned' : ''}">
            <span class="ma-sticker-emoji">${s.emoji}</span>
            <b>${s.name}</b><small>${s.desc}</small>
            ${got ? '' : '<small class="ma-locked">locked</small>'}
          </div>`;
        })
        .join('')}
    </div>
    <p class="ma-note">Earn them by practising — this cabinet is live.</p>
  `;
  miniEl.querySelector('[data-home]').addEventListener('click', miniHome);
}

function miniProgress() {
  const days = [55, 70, 40, 80, 65, 90, miniTotals().acc || 50];
  miniEl.innerHTML = `
    <div class="ma-head">
      <button class="ma-back" data-home>‹ Home</button>
      ${mini.streak ? `<span class="ma-streak">🔥 ${mini.streak}-day streak</span>` : ''}
    </div>
    <h3 class="ma-h">Progress</h3>
    <div class="ma-section">Accuracy by category</div>
    <div class="ma-bars">
      ${mini.cats
        .map(
          (c) => `
        <div class="ma-bar-row">
          <span>${c.label}</span><em>${c.answered ? c.acc + '%' : '—'}</em>
          <div class="bar"><i style="--p:${c.answered ? Math.max(c.acc, 4) : 0}%"></i></div>
        </div>`,
        )
        .join('')}
    </div>
    <div class="ma-section">Last 7 days</div>
    <div class="ma-days">
      ${days.map((h) => `<i style="--h:${h}%"></i>`).join('')}
    </div>
    <p class="ma-note">Weakest questions queue up for review — the wheel brings them back.</p>
  `;
  miniEl.querySelector('[data-home]').addEventListener('click', miniHome);
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

/* ————— hero typing rotator ————— */
const TOPICS = [
  'Kubernetes networking',
  'Spanish irregular verbs',
  'the GRE',
  'music theory',
  'the periodic table',
  'your own codebase',
];
const typer = document.getElementById('typer');
if (typer) {
  if (reducedMotion) {
    typer.textContent = TOPICS[0];
  } else {
    (async () => {
      for (let n = 0; ; n++) {
        const word = TOPICS[n % TOPICS.length];
        for (let i = 1; i <= word.length; i++) {
          typer.textContent = word.slice(0, i);
          await wait(55);
        }
        await wait(1400);
        for (let i = word.length; i >= 0; i--) {
          typer.textContent = word.slice(0, i);
          await wait(28);
        }
        await wait(250);
      }
    })();
  }
}

/* ————— scroll-reveal: fade-up sections + cards as they enter view ————— */
if (!reducedMotion && 'IntersectionObserver' in window) {
  const groups = ['.feature', '.install-card', '.pack-card', '.agent-step', '.show-card'];
  document.querySelectorAll(groups.join(',')).forEach((el) => el.classList.add('reveal'));
  const revealIO = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        // Stagger siblings for a gentle cascade.
        const sibs = [...(e.target.parentElement?.children ?? [])].filter((c) =>
          c.classList.contains('reveal'),
        );
        e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 6) * 70 + 'ms';
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));
}

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
