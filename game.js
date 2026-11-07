const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const shengWangEl = document.getElementById('shengWangValue');
const festivalEl = document.getElementById('festivalValue');
const policeEl = document.getElementById('policeValue');
const stigmaEl = document.getElementById('stigmaValue');
const timerEl = document.getElementById('timerValue');
const timerBar = document.getElementById('timerBar');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const newGameBtn = document.getElementById('newGameBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const shareBtn = document.getElementById('shareBtn');
const skillButtons = [...document.querySelectorAll('.skill-btn')];

const state = {
  roundTime: 35,
  timeLeft: 35,
  gameOver: false,
  score: { shengWang: 0, festival: 0, police: 0, stigma: 0 },
  conflicts: [],
  particles: [],
  barriers: [],
  player: { x: 0, y: 0 },
  lastTime: 0,
  spawnTimer: 0,
  lastMessage: '廟會秩序正在維持…',
  statusColor: '#f5d477',
  soundEnabled: true,
  skillCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
  skillConfig: {
    Q: { label: '遞結緣水', cooldown: 1.7, range: 170, effect: 'single' },
    W: { label: '貼平安符', cooldown: 5.6, range: 220, effect: 'heavy' },
    E: { label: '吹號鎮喧', cooldown: 6.2, range: 260, effect: 'area' },
    R: { label: '劃界結界', cooldown: 8.5, range: 0, effect: 'barrier' },
  },
};

const groups = ['轎夫', '陣頭', '民眾', '香客'];
const world = {
  centerX: canvas.width / 2,
  centerY: canvas.height * 0.68,
  tileX: 44,
  tileY: 22,
};

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioCtx = new AudioCtor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function setSoundEnabled(enabled) {
  state.soundEnabled = enabled;
  soundToggleBtn.textContent = enabled ? '🔊 音效開' : '🔇 音效關';
  if (enabled) {
    ensureAudio();
    playTone(392, 0.18, 'triangle', 0.04, 40);
  }
}

function songTone(freq, duration, type = 'sine', volume = 0.05, glide = 0, attack = 0.01, decay = 0.03) {
  if (!state.soundEnabled) return;
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const oscillator = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctxAudio.currentTime);
  if (glide !== 0) {
    oscillator.frequency.linearRampToValueAtTime(freq + glide, ctxAudio.currentTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctxAudio.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + duration + decay);
  oscillator.connect(gain);
  gain.connect(ctxAudio.destination);
  oscillator.start();
  oscillator.stop(ctxAudio.currentTime + duration + decay + 0.02);
}

function playTone(freq, duration, type, volume, glide = 0) {
  songTone(freq, duration, type, volume, glide, 0.01, 0.04);
}

function playSwoosh() {
  if (!state.soundEnabled) return;
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, ctxAudio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ctxAudio.currentTime + 0.3);
  gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, ctxAudio.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ctxAudio.destination);
  osc.start();
  osc.stop(ctxAudio.currentTime + 0.38);
}

function playDrum() {
  if (!state.soundEnabled) return;
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(90, ctxAudio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctxAudio.currentTime + 0.14);
  gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, ctxAudio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(ctxAudio.destination);
  osc.start();
  osc.stop(ctxAudio.currentTime + 0.22);
}

function playPoliceSiren() {
  if (!state.soundEnabled) return;
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const start = ctxAudio.currentTime;
  [700, 900, 1100].forEach((f, i) => {
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(f, start + i * 0.08);
    gain.gain.setValueAtTime(0.0001, start + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.03, start + i * 0.08 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.08 + 0.14);
    osc.connect(gain);
    gain.connect(ctxAudio.destination);
    osc.start(start + i * 0.08);
    osc.stop(start + i * 0.08 + 0.16);
  });
}

function playResolveTone() {
  playTone(523.25, 0.18, 'triangle', 0.055, 30);
  playTone(659.25, 0.14, 'triangle', 0.05, 20);
  playTone(783.99, 0.22, 'triangle', 0.04, 15);
}

function playBarrierSound() {
  playTone(220, 0.14, 'sawtooth', 0.05, 80);
  playTone(330, 0.22, 'triangle', 0.04, 60);
}

function playWarning() {
  playTone(220, 0.22, 'square', 0.03, -25);
  playTone(180, 0.18, 'square', 0.04, -15);
}

function resetGame() {
  ensureAudio();
  state.timeLeft = state.roundTime;
  state.gameOver = false;
  state.score = { shengWang: 0, festival: 0, police: 0, stigma: 0 };
  state.conflicts = [];
  state.particles = [];
  state.barriers = [];
  state.player = { x: 0, y: 0 };
  state.spawnTimer = 0;
  state.lastMessage = '廟會秩序正在維持…';
  state.statusColor = '#f5d477';
  state.skillCooldowns = { Q: 0, W: 0, E: 0, R: 0 };
  overlay.classList.add('hidden');
  createConflict();
  createConflict();
  updateHud();
  playDrum();
  requestAnimationFrame(loop);
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function isoToScreen(x, y) {
  return {
    x: world.centerX + (x - y) * world.tileX * 0.9,
    y: world.centerY + (x + y) * world.tileY * 0.6,
  };
}

function worldDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createConflict() {
  const angle = Math.random() * Math.PI * 2;
  const radius = randomRange(3.6, 6.4);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  state.conflicts.push({
    id: `${Date.now()}-${Math.random()}`,
    x,
    y,
    group: groups[Math.floor(Math.random() * groups.length)],
    heat: randomRange(42, 76),
    radius: randomRange(18, 26),
    pulse: Math.random() * Math.PI * 2,
    label: ['吵架', '推擠', '騷動', '情緒激動'][Math.floor(Math.random() * 4)],
  });
}

function updateHud() {
  shengWangEl.textContent = Math.round(state.score.shengWang);
  festivalEl.textContent = Math.round(state.score.festival);
  policeEl.textContent = Math.round(state.score.police);
  stigmaEl.textContent = Math.round(state.score.stigma);
  timerEl.textContent = `${state.timeLeft.toFixed(1)}s`;
  timerBar.style.width = `${(state.timeLeft / state.roundTime) * 100}%`;
}

function addParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: randomRange(-1.5, 1.5),
      vy: randomRange(-1.5, 1.5),
      life: randomRange(0.6, 1.4),
      maxLife: randomRange(0.6, 1.4),
      radius: randomRange(2, 6),
      color,
    });
  }
}

function castSkill(skillKey) {
  if (state.gameOver) return;
  if (state.skillCooldowns[skillKey] > 0) return;

  const config = state.skillConfig[skillKey];
  state.skillCooldowns[skillKey] = config.cooldown;

  if (skillKey === 'Q') {
    const target = getNearestConflict();
    if (!target) return;
    target.heat -= 34;
    target.heat = clamp(target.heat, 0, 140);
    state.score.shengWang += 8;
    state.score.festival += 4;
    state.lastMessage = `${config.label}：${target.group}已冷靜`;
    state.statusColor = '#baf4c2';
    addParticles(target.x, target.y, '#9fe3a1', 18);
    playTone(370, 0.12, 'sine', 0.04, 50);
    playTone(520, 0.18, 'triangle', 0.05, 35);
    return;
  }

  if (skillKey === 'W') {
    const target = getHighestHeatConflict();
    if (!target) return;
    target.heat -= 70;
    state.score.shengWang += 16;
    state.score.festival += 8;
    state.lastMessage = `${config.label}：平安符鎮住衝突`;
    state.statusColor = '#f5d477';
    addParticles(target.x, target.y, '#f5d477', 24);
    playSwoosh();
    playTone(220, 0.12, 'sine', 0.05, 30);
    playTone(660, 0.16, 'triangle', 0.05, 25);
    return;
  }

  if (skillKey === 'E') {
    let cleared = 0;
    for (const conflict of state.conflicts) {
      const dist = worldDistance(conflict, state.player);
      if (dist < 3.1) {
        conflict.heat -= 26;
        cleared += 1;
      }
    }
    if (cleared > 0) {
      state.score.shengWang += cleared * 5;
      state.score.festival += cleared * 6;
      state.lastMessage = `${config.label}：廣域鎮喧成功`;
      state.statusColor = '#9fe3a1';
      addParticles(state.player.x, state.player.y, '#f9f1a8', 30);
      playTone(180, 0.12, 'square', 0.04, -20);
      playSwoosh();
      playTone(420, 0.2, 'triangle', 0.05, 55);
    }
    return;
  }

  if (skillKey === 'R') {
    state.barriers.push({
      x: state.player.x,
      y: state.player.y,
      radius: 2.3,
      ttl: 4.2,
      color: '#68d0ff',
    });
    state.lastMessage = `${config.label}：結界已展開`;
    state.statusColor = '#68d0ff';
    addParticles(state.player.x, state.player.y, '#68d0ff', 35);
    playBarrierSound();
  }
}

function getNearestConflict() {
  let best = null;
  let bestDist = Infinity;
  for (const conflict of state.conflicts) {
    const dist = worldDistance(conflict, state.player);
    if (dist < bestDist) {
      bestDist = dist;
      best = conflict;
    }
  }
  return best;
}

function getHighestHeatConflict() {
  let best = null;
  let bestHeat = -Infinity;
  for (const conflict of state.conflicts) {
    if (conflict.heat > bestHeat) {
      bestHeat = conflict.heat;
      best = conflict;
    }
  }
  return best;
}

function update(dt) {
  if (state.gameOver) return;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    finishRound();
    return;
  }

  for (const key of Object.keys(state.skillCooldowns)) {
    if (state.skillCooldowns[key] > 0) {
      state.skillCooldowns[key] = Math.max(0, state.skillCooldowns[key] - dt);
    }
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    createConflict();
    state.spawnTimer = randomRange(1.2, 2.4);
  }

  state.player.x = 0;
  state.player.y = 0;

  for (const conflict of state.conflicts) {
    conflict.heat += dt * randomRange(6, 12);
    conflict.pulse += dt * 5;

    const dist = worldDistance(conflict, state.player);
    if (dist < 2.5) {
      conflict.heat += dt * 10;
    }

    if (conflict.heat > 120) {
      state.score.police += dt * 9;
      state.score.stigma += dt * 7;
    } else if (conflict.heat > 90) {
      state.score.police += dt * 5.5;
      state.score.stigma += dt * 4.5;
    }
  }

  for (let i = state.barriers.length - 1; i >= 0; i--) {
    const barrier = state.barriers[i];
    barrier.ttl -= dt;
    if (barrier.ttl <= 0) {
      state.barriers.splice(i, 1);
      continue;
    }

    for (const conflict of state.conflicts) {
      const dist = Math.hypot(conflict.x - barrier.x, conflict.y - barrier.y);
      if (dist < barrier.radius) {
        conflict.heat -= dt * 24;
      }
    }
  }

  for (let i = state.conflicts.length - 1; i >= 0; i--) {
    const conflict = state.conflicts[i];
    if (conflict.heat <= 0) {
      state.score.shengWang += 16;
      state.score.festival += 12;
      state.lastMessage = `和平達成：${conflict.group}已止鬨`;
      state.statusColor = '#9fe3a1';
      addParticles(conflict.x, conflict.y, '#7ae8a8', 18);
      playResolveTone();
      state.conflicts.splice(i, 1);
    }
  }

  if (state.score.police >= 100 || state.score.stigma >= 100) {
    finishRound();
    return;
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * 0.45;
    p.y += p.vy * 0.45;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  updateHud();
}

function finishRound() {
  state.gameOver = true;
  const title =
    state.score.police >= 100
      ? '警笛已響起，遶境被迫中止'
      : state.score.stigma >= 100
        ? '網路污名化爆發，文化遭誤解'
        : state.score.shengWang >= 280
          ? 'S級：神明認證・廟會和平大使'
          : state.score.shengWang >= 180
            ? 'A級：廟會秩序守護者'
            : state.score.shengWang >= 100
              ? 'B級：熱鬧但還有待磨合'
              : 'F級：警局泡茶・遶境終結者';

  overlayTitle.textContent = title;
  overlayText.textContent = `聖望 ${Math.round(state.score.shengWang)} / 熱鬧 ${Math.round(state.score.festival)} / 警戒 ${Math.round(state.score.police)} / 污名 ${Math.round(state.score.stigma)}`;
  overlay.classList.remove('hidden');

  if (state.score.police >= 100 || state.score.stigma >= 100) {
    playPoliceSiren();
    playWarning();
  } else {
    playResolveTone();
    playDrum();
  }
}

function copyThreadPost() {
  const title = overlayTitle.textContent;
  const text = `我在《The Cool Butler》裡拿到 ${title}！
聖望 ${Math.round(state.score.shengWang)} · 熱鬧 ${Math.round(state.score.festival)}
警戒 ${Math.round(state.score.police)} · 污名 ${Math.round(state.score.stigma)}
#廟會 #和平 #台灣文化 #TheCoolButler`;

navigator.clipboard.writeText(text).then(() => {
  overlayText.textContent = 'Threads 文案已複製到剪貼簿，快去分享！';
  playResolveTone();
});
}

function drawGround() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2a2b30');
  gradient.addColorStop(1, '#191a1d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = -10; x <= 10; x++) {
    for (let y = -10; y <= 10; y++) {
      const p = isoToScreen(x, y);
      ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)';
      ctx.fillRect(p.x - 22, p.y - 11, 44, 22);
    }
  }

  const temple = [
    isoToScreen(-3.5, -1.5),
    isoToScreen(3.5, -1.5),
    isoToScreen(4.8, 1.5),
    isoToScreen(-4.8, 1.5),
  ];

  ctx.beginPath();
  ctx.moveTo(temple[0].x, temple[0].y);
  ctx.lineTo(temple[1].x, temple[1].y);
  ctx.lineTo(temple[2].x, temple[2].y);
  ctx.lineTo(temple[3].x, temple[3].y);
  ctx.closePath();
  ctx.fillStyle = '#624a2e';
  ctx.fill();

  ctx.fillStyle = '#7a4d2a';
  ctx.fillRect(world.centerX - 20, world.centerY - 36, 40, 60);

  ctx.fillStyle = '#f7d47d';
  ctx.fillRect(world.centerX - 3, world.centerY - 60, 6, 30);

  const lanterns = [
    [-4.2, -0.8],
    [-2.6, -1.2],
    [2.6, -1.2],
    [4.3, -0.8],
  ];
  lanterns.forEach(([lx, ly]) => {
    const p = isoToScreen(lx, ly);
    ctx.fillStyle = '#e95f5e';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 26, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBarrier(barrier) {
  const p = isoToScreen(barrier.x, barrier.y);
  const radius = barrier.radius * world.tileX;
  ctx.strokeStyle = `rgba(104, 208, 255, ${0.5 + Math.sin(Date.now() * 0.02) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawConflict(conflict) {
  const p = isoToScreen(conflict.x, conflict.y);
  const ring = 12 + conflict.heat * 0.42;

  ctx.beginPath();
  ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(240, 95, 95, ${0.08 + conflict.heat / 180})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = conflict.heat > 90 ? '#f26464' : '#f4a261';
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(conflict.group, p.x - 18, p.y - 22);
  ctx.fillText(`${Math.round(conflict.heat)}`, p.x - 10, p.y + 28);
}

function drawPlayer() {
  const p = isoToScreen(state.player.x, state.player.y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#b9f3ff';
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText('執事', p.x - 16, p.y - 26);
}

function drawParticles() {
  for (const p of state.particles) {
    const drawX = world.centerX + p.x * world.tileX * 0.9;
    const drawY = world.centerY + (p.x + p.y) * world.tileY * 0.6;
    ctx.beginPath();
    ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color + 'cc';
    ctx.fill();
  }
}

function drawStatusText() {
  ctx.fillStyle = state.statusColor;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(state.lastMessage, 30, canvas.height - 26);
}

function loop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
  state.lastTime = timestamp;

  update(dt);
  draw();

  if (!state.gameOver) {
    requestAnimationFrame(loop);
  }
}

function draw() {
  drawGround();
  for (const barrier of state.barriers) {
    drawBarrier(barrier);
  }
  for (const conflict of state.conflicts) {
    drawConflict(conflict);
  }
  drawPlayer();
  drawParticles();
  drawStatusText();
}

newGameBtn.addEventListener('click', () => {
  ensureAudio();
  resetGame();
});
soundToggleBtn.addEventListener('click', () => {
  ensureAudio();
  setSoundEnabled(!state.soundEnabled);
});
shareBtn.addEventListener('click', copyThreadPost);

for (const button of skillButtons) {
  button.addEventListener('click', () => {
    ensureAudio();
    castSkill(button.dataset.skill);
  });
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toUpperCase();
  if (['Q', 'W', 'E', 'R'].includes(key)) {
    ensureAudio();
    castSkill(key);
  }
});

setSoundEnabled(true);
resetGame();
