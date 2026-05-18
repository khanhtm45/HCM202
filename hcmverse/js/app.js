const STORAGE_KEY = 'hcmverse_progress';
const LEADERBOARD_KEY = 'hcmverse_leaderboard';

let hcm3d = null;
let active3dDispose = null;
let artifactHallApi = null;

let content = null;
let state = {
  avatar: null,
  visited: new Set(),
  visitedZones: new Set(),
  quizScore: null,
  xp: 0,
  badge: null,
  timelineMilestones: new Set(),
};

async function ensure3d() {
  if (hcm3d !== null) return hcm3d;
  try {
    hcm3d = await import('./hcmverse-3d.js');
  } catch (e) {
    console.warn('[HCMVERSE] WebGL 3D không tải được:', e);
    hcm3d = false;
  }
  return hcm3d;
}

function dispose3d() {
  if (active3dDispose) {
    active3dDispose();
    active3dDispose = null;
  }
  artifactHallApi = null;
}

async function init() {
  const res = await fetch('data/content.json');
  content = await res.json();
  ensure3d();
  applyMeta();
  loadProgress();
  renderAvatars();
  renderZones();
  renderExternalLinks();
  bindGlobal();
  updateProgress();
  updateXpUi();
  renderLeaderboard();
}

function applyMeta() {
  const m = content.meta || {};
  document.title = `${m.title || 'HCMVERSE'} — ${m.subtitle || ''}`;
  const tag = document.getElementById('welcome-tagline');
  if (tag && m.tagline) tag.textContent = m.tagline;
  const badge = document.getElementById('curriculum-badge');
  if (badge && m.curriculum) badge.textContent = m.curriculum;
  const intro = document.getElementById('lobby-intro');
  if (intro && m.tagline) intro.textContent = m.tagline;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.avatar = data.avatar;
    state.visited = new Set(data.visited || []);
    state.visitedZones = new Set(data.visitedZones || data.visited || []);
    state.quizScore = data.quizScore ?? null;
    state.xp = data.xp || 0;
    state.badge = data.badge || null;
    state.timelineMilestones = new Set(data.timelineMilestones || []);
    if (state.avatar) {
      document.getElementById('btn-enter').disabled = false;
      document.querySelectorAll('.avatar-card').forEach((c) => {
        c.classList.toggle('selected', c.dataset.id === state.avatar);
      });
    }
  } catch {}
}

function saveProgress() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      avatar: state.avatar,
      visited: [...state.visited],
      visitedZones: [...state.visitedZones],
      quizScore: state.quizScore,
      xp: state.xp,
      badge: state.badge,
      timelineMilestones: [...state.timelineMilestones],
    })
  );
  updateProgress();
  updateXpUi();
  pushLeaderboard();
}

function addXp(amount, reason) {
  if (!amount) return;
  state.xp += amount;
  saveProgress();
  flashXp(`+${amount} XP${reason ? ` · ${reason}` : ''}`);
}

function flashXp(text) {
  const el = document.createElement('div');
  el.className = 'xp-toast';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.remove(), 2200);
}

function updateXpUi() {
  const v = String(state.xp);
  const xpVal = document.getElementById('xp-value');
  const lobbyXp = document.getElementById('lobby-xp');
  if (xpVal) xpVal.textContent = v;
  if (lobbyXp) lobbyXp.textContent = `${v} XP`;
}

function avatarName() {
  const av = content.avatars.find((a) => a.id === state.avatar);
  return av ? `${av.icon} ${av.name}` : 'Khách';
}

function pushLeaderboard() {
  if (!state.avatar) return;
  const name = avatarName();
  let board = [];
  try {
    board = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
  } catch {}
  const row = {
    name,
    xp: state.xp,
    badge: state.badge,
    at: Date.now(),
  };
  const idx = board.findIndex((b) => b.name === name);
  if (idx >= 0) board[idx] = row;
  else board.push(row);
  board.sort((a, b) => b.xp - a.xp);
  board = board.slice(0, 8);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  renderLeaderboard(board);
}

function renderLeaderboard(board) {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  if (!board) {
    try {
      board = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    } catch {
      board = [];
    }
  }
  list.innerHTML = '';
  if (!board.length) {
    list.innerHTML = '<li class="lb-empty">Hoàn thành khu & quiz để lên bảng</li>';
    return;
  }
  board.forEach((b, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="lb-rank">${i + 1}</span><span class="lb-name">${b.name}</span><span class="lb-xp">${b.xp} XP</span>`;
    list.appendChild(li);
  });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const chrome = document.getElementById('site-chrome');
  if (chrome) chrome.hidden = id === 'screen-welcome';
}

function bindGlobal() {
  document.getElementById('btn-enter').addEventListener('click', enterMuseum);
  document.getElementById('btn-logout').addEventListener('click', () => {
    showScreen('screen-welcome');
  });
}

function renderAvatars() {
  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = '';
  content.avatars.forEach((a) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'avatar-card';
    card.dataset.id = a.id;
    card.innerHTML = `
      <div class="icon">${a.icon}</div>
      <h3>${a.name}</h3>
      <p>${a.desc}</p>`;
    card.addEventListener('click', () => selectAvatar(a.id, card));
    grid.appendChild(card);
  });
}

function selectAvatar(id, card) {
  state.avatar = id;
  document.querySelectorAll('.avatar-card').forEach((c) => c.classList.remove('selected'));
  card.classList.add('selected');
  document.getElementById('btn-enter').disabled = false;
  saveProgress();
}

function enterMuseum() {
  if (!state.avatar) return;
  document.getElementById('user-display').textContent = avatarName();
  showScreen('screen-lobby');
  saveProgress();
}

function renderExternalLinks() {
  const tours = content.externalTours || [];
  const welcome = document.getElementById('welcome-links');
  const lobby = document.getElementById('lobby-external');
  const linkHtml = (t) =>
    `<a href="${t.href}" class="ext-link">${t.title}</a>`;
  if (welcome) welcome.innerHTML = tours.map(linkHtml).join(' · ');
  if (lobby) {
    lobby.innerHTML = `<p class="ext-label">Tour 360° liên kết</p>${tours.map(linkHtml).join('')}`;
  }
}

function renderZones() {
  const grid = document.getElementById('zone-grid');
  grid.innerHTML = '';
  content.zones.forEach((z, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'zone-card';
    if (state.visitedZones.has(z.id)) card.classList.add('visited');
    card.innerHTML = `
      <span class="zone-num">Khu ${i + 1}</span>
      <div class="z-icon">${z.icon}</div>
      <h3>${z.title.replace(/^Khu \d+ — /, '')}</h3>
      <p>${z.summary}</p>`;
    card.addEventListener('click', () => openZone(z));
    grid.appendChild(card);
  });
}

function visitZone(zoneId) {
  if (!state.visitedZones.has(zoneId)) {
    state.visitedZones.add(zoneId);
    state.visited.add(zoneId);
    const xp = content.gamification?.xpPerZone ?? 80;
    addXp(xp, 'Khám phá khu mới');
    renderZones();
  }
}

function openZone(zone) {
  dispose3d();
  visitZone(zone.id);
  document.getElementById('zone-title').textContent = zone.title;
  const introEl = document.getElementById('zone-intro');
  if (zone.intro) {
    introEl.hidden = false;
    introEl.innerHTML = `<p>${zone.intro}</p>`;
  } else {
    introEl.hidden = true;
    introEl.innerHTML = '';
  }
  const body = document.getElementById('zone-body');
  body.innerHTML = '';
  body.className = `zone-body zone-body--${zone.id}`;

  switch (zone.id) {
    case 'timeline':
      renderTimeline(body);
      break;
    case 'artifacts':
      renderArtifacts(body);
      break;
    case 'thought':
      renderThought(body);
      break;
    case 'quiz':
      renderQuiz(body);
      break;
    default:
      body.innerHTML = '<p>Nội dung đang cập nhật.</p>';
  }
  showScreen('screen-zone');
}

async function renderTimeline(container) {
  const wrap = document.createElement('div');
  wrap.className = 'time-tunnel-wrap';
  wrap.innerHTML = `
    <p class="zone-hint zone-hint--3d">Đường hầm thời gian <strong>3D</strong> — cuộn để đi sâu, bấm cổng phát sáng để xem tư liệu &amp; nghe thuyết minh AI.</p>
    <div class="webgl-mount" id="timeline-3d"></div>
    <div class="time-tunnel-fallback" id="timeline-fallback" hidden>
    <div class="time-tunnel" aria-label="Đường hầm thời gian (dự phòng)">
      <div class="tunnel-glow"></div>
      <div class="tunnel-track" id="tunnel-track"></div>
    </div>
    </div>
    <article class="milestone-stage" id="milestone-stage" hidden>
      <button type="button" class="btn btn-ghost milestone-close" id="milestone-close">✕ Đóng</button>
      <div id="milestone-content"></div>
    </article>`;

  const track = wrap.querySelector('#tunnel-track');
  const mount3d = wrap.querySelector('#timeline-3d');
  const fb = wrap.querySelector('#timeline-fallback');

  ensure3d().then((mod) => {
    if (mod && mod.createTimelineTunnel) {
      fb.hidden = true;
      active3dDispose = mod.createTimelineTunnel(mount3d, content.timeline, (item) =>
        openMilestone(item, wrap)
      );
      return;
    }
    mount3d.hidden = true;
    fb.hidden = false;
  });

  content.timeline.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'milestone-node';
    btn.style.setProperty('--i', String(i));
    if (state.timelineMilestones.has(item.year)) btn.classList.add('visited');
    btn.innerHTML = `
      <span class="milestone-year">${item.year}</span>
      <span class="milestone-title">${item.title}</span>`;
    btn.addEventListener('click', () => openMilestone(item, wrap));
    track.appendChild(btn);
  });

  wrap.querySelector('#milestone-close').addEventListener('click', () => {
    wrap.querySelector('#milestone-stage').hidden = true;
  });

  container.appendChild(wrap);
}

function openMilestone(item, wrap) {
  const stage = wrap.querySelector('#milestone-stage');
  const box = wrap.querySelector('#milestone-content');
  stage.hidden = false;
  state.timelineMilestones.add(item.year);
  saveProgress();

  const extraImg = item.mediaImage ? renderMediaBlock(item.mediaImage) : '';
  box.innerHTML = `
    <header class="milestone-head">
      <span class="milestone-head-year">${item.year}</span>
      <h3>${item.title}</h3>
      <p class="milestone-tagline">${item.tagline || ''}</p>
    </header>
    <p class="milestone-desc">${item.desc}</p>
    ${renderMediaBlock(item.media)}
    ${extraImg}
    <div class="milestone-actions">
      <button type="button" class="btn btn-primary" id="btn-milestone-voice">🔊 Thuyết minh AI</button>
    </div>`;

  wrap.querySelectorAll('.milestone-node').forEach((n) => {
    if (n.querySelector('.milestone-year')?.textContent === item.year) n.classList.add('visited');
  });

  const narration = `${item.title}. ${item.desc}`;
  speak(narration);
  box.querySelector('#btn-milestone-voice')?.addEventListener('click', () => speak(narration));
  stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function renderArtifacts(container) {
  container.innerHTML = `
    <p class="zone-hint zone-hint--3d">Phòng hiện vật <strong>3D</strong> — bấm vật trên bệ hoặc danh sách; kéo chuột xoay góc nhìn.</p>
    <div class="webgl-mount webgl-mount--artifacts" id="artifacts-3d"></div>
    <div class="artifact-layout">
      <div class="artifact-grid" id="artifact-grid"></div>
      <div class="artifact-viewer" id="artifact-viewer"></div>
    </div>`;

  const grid = container.querySelector('#artifact-grid');
  const viewer = container.querySelector('#artifact-viewer');
  const mount3d = container.querySelector('#artifacts-3d');

  const mod = await ensure3d();
  if (mod && mod.createArtifactHall) {
    artifactHallApi = mod.createArtifactHall(mount3d, content.artifacts, (art) => {
      const card = grid.querySelector(`[data-id="${art.id}"]`);
      showArtifact(art, viewer, grid, card);
    });
    active3dDispose = artifactHallApi.dispose;
  } else {
    mount3d.hidden = true;
  }

  content.artifacts.forEach((art) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'artifact-card';
    card.dataset.id = art.id;
    const thumb = art.image?.local || art.image?.url || '';
    card.innerHTML = `
      ${thumb ? `<img class="artifact-thumb" src="${thumb}" alt="" loading="lazy">` : '<span class="artifact-thumb-ph">🏺</span>'}
      <strong>${art.name}</strong>
      <p>${art.period}</p>`;
    card.addEventListener('click', () => showArtifact(art, viewer, grid, card));
    grid.appendChild(card);
  });
}

function showArtifact(art, viewer, grid, card) {
  grid.querySelectorAll('.artifact-card').forEach((c) => c.classList.remove('active'));
  card?.classList.add('active');

  viewer.classList.add('active');
  let rotY = 0;
  let rotX = 0;
  let zoom = 1;
  const src = art.image?.local || art.image?.url || '';
  const innerVisual = src
    ? `<img src="${src}" alt="${art.name}" class="viewer-img" draggable="false">`
    : `<span class="viewer-emoji">🏺</span>`;

  viewer.innerHTML = `
    <h3>${art.name}</h3>
    <p class="artifact-desc">${art.desc}</p>
    <div class="viewer-stage">
      <div class="viewer-obj" id="viewer-obj" style="--accent:${art.color}">${innerVisual}</div>
    </div>
    <div class="viewer-controls">
      <span>Kéo để xoay 360°</span>
      <label>Zoom <input type="range" id="zoom-range" min="0.5" max="1.8" step="0.05" value="1"></label>
      <button type="button" class="btn btn-primary" id="btn-narrate">🔊 Thuyết minh AI</button>
    </div>
    ${art.image ? renderMediaBlock(art.image) : ''}
    <div class="narration-box">${art.narration}</div>`;

  const obj = viewer.querySelector('#viewer-obj');
  const zoomRange = viewer.querySelector('#zoom-range');
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function applyTransform() {
    obj.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${zoom})`;
  }

  obj.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    obj.setPointerCapture(e.pointerId);
  });
  obj.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.5;
    rotX += (e.clientY - lastY) * 0.3;
    rotX = Math.max(-35, Math.min(35, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform();
  });
  obj.addEventListener('pointerup', () => {
    dragging = false;
  });
  zoomRange.addEventListener('input', () => {
    zoom = parseFloat(zoomRange.value);
    applyTransform();
  });
  viewer.querySelector('#btn-narrate').addEventListener('click', () => speak(art.narration));
  speak(art.narration);
  applyTransform();
}

async function renderThought(container) {
  container.innerHTML = `
    <p class="zone-hint zone-hint--3d">Không gian tư tưởng <strong>3D</strong> — bấm trụ chủ đề, hoặc dùng tab bên dưới.</p>
    <div class="webgl-mount webgl-mount--thought" id="thought-3d"></div>`;
  const mount3d = container.querySelector('#thought-3d');
  const panelHost = document.createElement('div');
  panelHost.id = 'thought-panel-host';
  container.appendChild(panelHost);

  const tabs = document.createElement('div');
  tabs.className = 'topic-tabs';
  const panel = document.createElement('div');
  panel.className = 'topic-panel';
  panel.id = 'thought-panel';

  const mod = await ensure3d();
  if (mod && mod.createThoughtHall) {
    active3dDispose = mod.createThoughtHall(mount3d, content.thoughtTopics, (topic) => {
      tabs.querySelectorAll('.topic-tab').forEach((x, idx) => {
        x.classList.toggle('active', content.thoughtTopics[idx].id === topic.id);
      });
      renderThoughtPanel(topic, panel);
    });
  } else {
    mount3d.hidden = true;
  }

  content.thoughtTopics.forEach((t, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'topic-tab' + (i === 0 ? ' active' : '');
    tab.textContent = t.title;
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.topic-tab').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      renderThoughtPanel(t, panel);
    });
    tabs.appendChild(tab);
  });

  container.appendChild(tabs);
  container.appendChild(panel);
  renderThoughtPanel(content.thoughtTopics[0], panel);
}

function renderThoughtPanel(topic, panel) {
  const vid = topic.video ? renderMediaBlock(topic.video) : '';
  const infoCards = (topic.infographic || [])
    .map((line) => `<div class="info-card info-card--${topic.theme}">${line}</div>`)
    .join('');

  panel.innerHTML = `
    <h3>${topic.title}</h3>
    <div class="info-grid">${infoCards}</div>
    <ul class="thought-points">${topic.points.map((p) => `<li>${p}</li>`).join('')}</ul>
    <div class="story-box">${topic.story}</div>
    ${renderMediaBlock(topic.media)}
    ${vid}
    <button type="button" class="btn btn-ghost" id="thought-voice">🔊 Nghe tóm tắt</button>`;

  panel.querySelector('#thought-voice')?.addEventListener('click', () => {
    speak(`${topic.title}. ${topic.points.join('. ')}. ${topic.story}`);
  });
}

let quizIndex = 0;
let quizCorrect = 0;

function renderQuiz(container) {
  quizIndex = 0;
  quizCorrect = 0;
  container.innerHTML = `
    <p class="zone-hint">Mini quiz sau hành trình — trả lời nhanh để nhận XP và huy hiệu.</p>
    <div class="quiz-xp-bar">XP hiện tại: <strong>${state.xp}</strong></div>`;
  const card = document.createElement('div');
  card.className = 'quiz-card';
  card.id = 'quiz-card';
  container.appendChild(card);
  showQuizQuestion(card, content.quiz.questions);
}

function showQuizQuestion(card, questions) {
  if (quizIndex >= questions.length) {
    finishQuiz(card);
    return;
  }
  const item = questions[quizIndex];
  card.innerHTML = `
    <p class="quiz-meta">Câu ${quizIndex + 1} / ${questions.length}</p>
    <p class="quiz-q">${item.q}</p>
    <div class="quiz-choices" id="quiz-choices"></div>`;
  const choices = document.getElementById('quiz-choices');
  item.choices.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-choice';
    btn.textContent = text;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      choices.querySelectorAll('.quiz-choice').forEach((b) => (b.disabled = true));
      const xpEach = content.gamification?.xpPerQuizCorrect ?? 25;
      if (i === item.answer) {
        btn.classList.add('correct');
        quizCorrect++;
        addXp(xpEach, 'Trả lời đúng');
      } else {
        btn.classList.add('wrong');
        choices.children[item.answer]?.classList.add('correct');
      }
      const explain = document.createElement('p');
      explain.className = 'quiz-explain';
      explain.textContent = item.explain;
      card.appendChild(explain);
      setTimeout(() => {
        quizIndex++;
        showQuizQuestion(card, questions);
      }, 2000);
    });
    choices.appendChild(btn);
  });
}

function finishQuiz(card) {
  const total = content.quiz.questions.length;
  const pct = Math.round((quizCorrect / total) * 100);
  state.quizScore = pct;
  const badge =
    [...content.quiz.badges]
      .sort((a, b) => b.min - a.min)
      .find((b) => pct >= b.min && pct <= b.max) || content.quiz.badges[0];
  state.badge = badge.name;
  const bonus = badge.xpBonus || 0;
  const completeXp = content.gamification?.xpQuizComplete ?? 100;
  addXp(completeXp + bonus, 'Hoàn thành quiz');
  saveProgress();

  card.innerHTML = `
    <div class="quiz-result">
      <p class="score-text">${pct}% · ${quizCorrect}/${total} câu đúng</p>
      <div class="badge-display">${badge.icon}</div>
      <h3>${badge.name}</h3>
      <p class="quiz-result-sub">Huy hiệu đã mở khóa — tiếp tục khám phá các khu khác!</p>
      <button type="button" class="btn btn-primary" id="quiz-retry">Làm lại quiz</button>
    </div>`;
  document.getElementById('quiz-retry').addEventListener('click', () => {
    quizIndex = 0;
    quizCorrect = 0;
    showQuizQuestion(card, content.quiz.questions);
  });
}

function updateProgress() {
  const zones = content?.zones || [];
  const total = zones.length || 4;
  const done = state.visitedZones.size;
  const pct = Math.round((done / total) * 100);
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = `Tiến độ tham quan: ${done}/${total} khu (${pct}%)`;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'vi-VN';
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

document.getElementById('btn-back-zone').addEventListener('click', () => {
  dispose3d();
  showScreen('screen-lobby');
});

init();
