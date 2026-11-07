const host = document.getElementById('gameCanvas');
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
  effects: [],
  smoke: [],
  player: null,
  spawnTimer: 1.5,
  lastMessage: '廟會秩序正在維持…',
  soundEnabled: true,
  lastTime: 0,
  skillCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
};

if (!window.THREE) {
  host.innerHTML = '<p style="padding:2rem;color:white">3D 引擎載入失敗，請檢查網路連線後重新整理。</p>';
  throw new Error('Three.js failed to load');
}

const THREE = window.THREE;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#24242b');
scene.fog = new THREE.Fog('#24242b', 22, 48);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
host.appendChild(renderer.domElement);

const cameraRig = { yaw: -0.9, pitch: 0.8, distance: 19, target: new THREE.Vector3(0, 1.8, 0) };
function updateCamera() {
  const x = cameraRig.target.x + Math.cos(cameraRig.yaw) * Math.cos(cameraRig.pitch) * cameraRig.distance;
  const y = cameraRig.target.y + Math.sin(cameraRig.pitch) * cameraRig.distance;
  const z = cameraRig.target.z + Math.sin(cameraRig.yaw) * Math.cos(cameraRig.pitch) * cameraRig.distance;
  camera.position.set(x, y, z);
  camera.lookAt(cameraRig.target);
}
updateCamera();

scene.add(new THREE.HemisphereLight(0xffe6bd, 0x292b38, 2.0));
const moonLight = new THREE.DirectionalLight(0xffd69a, 3.2);
moonLight.position.set(-7, 13, 8); moonLight.castShadow = true; moonLight.shadow.mapSize.set(1024, 1024); scene.add(moonLight);
const redGlow = new THREE.PointLight(0xff4b2b, 17, 16); redGlow.position.set(-4, 3, -3); scene.add(redGlow);
const lanternGlow = new THREE.PointLight(0xffa53c, 12, 14); lanternGlow.position.set(4, 3, -3); scene.add(lanternGlow);

const mat = (color, roughness = 0.82, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const materials = {
  ground: mat('#55564f'), stone: mat('#777469'), wood: mat('#6e3421'), roof: mat('#a83e2c'), gold: mat('#e9b64d', 0.38, 0.35),
  red: mat('#c92f2c'), dark: mat('#29252a'), cream: mat('#f3d9a0'), blue: mat('#5abde0'), green: mat('#70d49a'),
};

function mesh(geometry, material, parent = scene, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}

function makeLabel(text, color = '#fff2c7') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,12,8,.78)'; g.beginPath(); g.roundRect(8, 8, 240, 64, 18); g.fill();
  g.strokeStyle = 'rgba(245,212,119,.7)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = color; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 40);
  const texture = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.4, 0.75, 1);
  return sprite;
}

function createTemple() {
  mesh(new THREE.BoxGeometry(8, 0.45, 5), materials.stone, scene, [0, 0.22, -5.7]);
  mesh(new THREE.BoxGeometry(6.7, 2.3, 3.7), materials.wood, scene, [0, 1.45, -5.7]);
  mesh(new THREE.BoxGeometry(6.9, 0.24, 0.25), materials.gold, scene, [0, 2.35, -3.8]);
  const roof = mesh(new THREE.CylinderGeometry(0.5, 1, 1, 4, 1), materials.roof, scene, [0, 3.05, -5.7]);
  roof.rotation.y = Math.PI / 4; roof.scale.set(5.2, 1.25, 3.5);
  mesh(new THREE.BoxGeometry(5.2, 0.2, 0.24), materials.gold, scene, [0, 3.72, -5.7]);
  for (const x of [-3.1, 3.1]) { const pillar = mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), materials.red, scene, [x, 1.35, -3.82]); pillar.rotation.z = Math.PI; }
  const door = mesh(new THREE.BoxGeometry(1.5, 1.7, 0.16), materials.dark, scene, [0, 1.25, -3.78]);
  door.material = new THREE.MeshStandardMaterial({ color: '#311c17', roughness: 0.9 });
  mesh(new THREE.CylinderGeometry(0.72, 0.9, 0.7, 10), materials.gold, scene, [0, 0.65, -1.6]);
  mesh(new THREE.ConeGeometry(0.64, 0.32, 10), materials.red, scene, [0, 1.15, -1.6]);
  for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 5), materials.wood, scene, [(i - 1) * 0.18, 1.75, -1.6]);
  for (const x of [-4.6, 4.6]) {
    const lion = new THREE.Group(); lion.position.set(x, 0.35, -3.3); scene.add(lion);
    mesh(new THREE.BoxGeometry(0.9, 0.75, 0.8), materials.stone, lion, [0, 0.4, 0]);
    mesh(new THREE.SphereGeometry(0.36, 12, 10), materials.stone, lion, [0, 0.95, 0]);
    mesh(new THREE.SphereGeometry(0.12, 8, 8), materials.gold, lion, [0, 0.98, 0.32]);
    mesh(new THREE.BoxGeometry(1.12, 0.2, 1), materials.stone, lion, [0, 0.1, 0]);
  }
  for (const z of [-7.3, -4.4, -1.4, 1.8]) {
    for (const x of [-6.4, 6.4]) {
      mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.1, 8), materials.wood, scene, [x, 2.05, z]);
      const lantern = mesh(new THREE.BoxGeometry(0.52, 0.72, 0.52), materials.red, scene, [x, 3.15, z]);
      lantern.material = new THREE.MeshStandardMaterial({ color: '#d52e24', emissive: '#ff401c', emissiveIntensity: 1.15, roughness: 0.38 });
      mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12), materials.gold, scene, [x, 3.53, z]);
    }
  }
}

mesh(new THREE.PlaneGeometry(38, 38), materials.ground, scene, [0, -0.08, 0]).rotation.x = -Math.PI / 2;
const plaza = mesh(new THREE.BoxGeometry(20, 0.18, 18), mat('#716858'), scene, [0, 0.02, 0]); plaza.receiveShadow = true;
const grid = new THREE.GridHelper(18, 18, '#b39b6e', '#887d68'); grid.position.y = 0.13; grid.material.transparent = true; grid.material.opacity = 0.23; scene.add(grid);
createTemple();
for (const x of [-9.2, 9.2]) {
  for (let z = -5; z <= 6; z += 2.5) {
    mesh(new THREE.BoxGeometry(1.1, 1.2, 1.1), materials.wood, scene, [x, 0.6, z]);
    const awning = mesh(new THREE.ConeGeometry(0.9, 0.65, 4), materials.red, scene, [x, 1.48, z]);
    awning.rotation.y = Math.PI / 4;
    mesh(new THREE.BoxGeometry(1.25, 0.12, 1.2), materials.gold, scene, [x, 0.08, z]);
  }
}

function createFigure(color, x, z, parent, scale = 1) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
  mesh(new THREE.CylinderGeometry(0.22, 0.29, 0.82, 8), mat(color), group, [0, 0.7, 0]);
  mesh(new THREE.SphereGeometry(0.22, 12, 10), materials.cream, group, [0, 1.28, 0]);
  mesh(new THREE.ConeGeometry(0.28, 0.27, 8), materials.dark, group, [0, 1.53, 0]);
  mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.52, 6), materials.cream, group, [0.29, 0.83, 0]);
  return group;
}

function createPlayer() {
  const group = new THREE.Group(); scene.add(group);
  mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.05, 8), materials.blue, group, [0, 0.72, 0]);
  mesh(new THREE.SphereGeometry(0.25, 12, 10), materials.cream, group, [0, 1.42, 0]);
  const headpiece = mesh(new THREE.ConeGeometry(0.32, 0.5, 4), materials.gold, group, [0, 1.8, 0]);
  headpiece.rotation.y = Math.PI / 4;
  mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.6, 6), materials.gold, group, [0.42, 1.08, 0]);
  const tridentGroup = new THREE.Group(); group.add(tridentGroup); tridentGroup.position.set(0.42, 1.84, 0);
  for (const x of [-0.16, 0, 0.16]) mesh(new THREE.ConeGeometry(0.065, 0.32, 5), materials.gold, tridentGroup, [x, 0.84 + (x === 0 ? 0.14 : 0), 0]);
  const label = makeLabel('執事阿文', '#b9f3ff'); label.position.set(0, 2.45, 0); group.add(label);
  return group;
}
state.player = createPlayer();

function createConflict() {
  if (state.conflicts.length >= 7) return;
  const angle = Math.random() * Math.PI * 2;
  const radius = 4.2 + Math.random() * 3.1;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const groupNames = ['轎夫', '陣頭', '民眾', '香客'];
  const groupName = groupNames[Math.floor(Math.random() * groupNames.length)];
  const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
  const aura = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#ff5547', transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.08; root.add(aura);
  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.055, 8, 32), new THREE.MeshBasicMaterial({ color: '#ff7555', transparent: true, opacity: 0.9 }));
  marker.rotation.x = Math.PI / 2; marker.position.y = 0.1; root.add(marker);
  const colors = ['#d9583e', '#383447', '#4c986a', '#d2a744'];
  const figures = [];
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    figures.push(createFigure(colors[i], Math.cos(a) * 0.55, Math.sin(a) * 0.55, root, 0.78));
  }
  const label = makeLabel(groupName + ' · 騷動', '#ffe4be'); label.position.set(0, 2.6, 0); root.add(label);
  state.conflicts.push({ x, z, heat: 42 + Math.random() * 35, root, aura, marker, figures, label, phase: Math.random() * 6 });
}

function resize() {
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
resize();

let audioCtx = null; let ambientTimer = null;
function ensureAudio() {
  if (!state.soundEnabled) return null;
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioCtx = new AudioCtor();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!ambientTimer) ambientTimer = window.setInterval(() => { if (state.soundEnabled && !state.gameOver) playDrum(); }, 1150);
  return audioCtx;
}
function tone(frequency, duration = 0.16, type = 'sine', volume = 0.045, glide = 0, delay = 0) {
  const audio = ensureAudio(); if (!audio) return;
  const now = audio.currentTime + delay;
  const osc = audio.createOscillator(); const gain = audio.createGain();
  osc.type = type; osc.frequency.setValueAtTime(frequency, now);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + glide), now + duration);
  gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + duration + 0.025);
}
function playDrum() { tone(92, 0.13, 'sawtooth', 0.035, -48); tone(680, 0.045, 'triangle', 0.012, -420, 0.08); }
function playWater() { tone(880, 0.12, 'sine', 0.035, -520); tone(620, 0.2, 'triangle', 0.035, -220, 0.08); }
function playTalisman() { tone(250, 0.18, 'triangle', 0.04, 280); tone(740, 0.24, 'sine', 0.04, 180, 0.1); }
function playHorn() { tone(196, 0.36, 'sawtooth', 0.035, 30); tone(294, 0.33, 'triangle', 0.035, 20, 0.04); tone(392, 0.3, 'triangle', 0.025, 15, 0.09); }
function playBarrier() { tone(165, 0.4, 'sine', 0.05, 420); tone(330, 0.38, 'triangle', 0.035, 210, 0.06); }
function playPeace() { [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.035, 20, i * 0.1)); }
function playSiren() { [0, 0.22, 0.44, 0.66].forEach((d, i) => tone(i % 2 ? 760 : 980, 0.2, 'square', 0.025, i % 2 ? 180 : -180, d)); }
function setSound(enabled) {
  state.soundEnabled = enabled;
  soundToggleBtn.textContent = enabled ? '🔊 音效開' : '🔇 音效關';
  soundToggleBtn.setAttribute('aria-pressed', String(enabled));
  if (enabled) { ensureAudio(); tone(440, 0.12, 'triangle', 0.025); }
  else if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
}

function updateHud() {
  shengWangEl.textContent = Math.round(state.score.shengWang);
  festivalEl.textContent = Math.round(state.score.festival);
  policeEl.textContent = Math.round(state.score.police);
  stigmaEl.textContent = Math.round(state.score.stigma);
  timerEl.textContent = `${state.timeLeft.toFixed(1)}s`;
  timerBar.style.width = `${Math.max(0, state.timeLeft / state.roundTime * 100)}%`;
}
function addEffect(x, z, color, kind = 'burst') {
  const geometry = kind === 'ring' ? new THREE.TorusGeometry(0.55, 0.07, 8, 48) : new THREE.SphereGeometry(0.32, 12, 10);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const object = new THREE.Mesh(geometry, material); object.position.set(x, 0.55, z);
  if (kind === 'ring') object.rotation.x = Math.PI / 2;
  scene.add(object); state.effects.push({ object, life: 0.85, max: 0.85, kind });
}
function nearestConflict() {
  return state.conflicts.reduce((nearest, item) => !nearest || Math.hypot(item.x, item.z) < Math.hypot(nearest.x, nearest.z) ? item : nearest, null);
}
function highestConflict() { return state.conflicts.reduce((best, item) => !best || item.heat > best.heat ? item : best, null); }
function settleConflict(item) {
  if (item.heat > 0) return false;
  state.score.shengWang += 16; state.score.festival += 12;
  state.lastMessage = '互相體諒啦！和平達成'; playPeace(); addEffect(item.x, item.z, '#7ae8a8');
  scene.remove(item.root); state.conflicts.splice(state.conflicts.indexOf(item), 1); return true;
}
function castSkill(key) {
  if (state.gameOver || state.skillCooldowns[key] > 0) return;
  const cooldown = { Q: 1.7, W: 5.6, E: 6.2, R: 8.5 }[key];
  state.skillCooldowns[key] = cooldown;
  if (key === 'Q') {
    const target = nearestConflict(); if (!target) return;
    target.heat = Math.max(0, target.heat - 38); state.score.shengWang += 8; state.score.festival += 4;
    target.aura.material.color.set('#65df9a'); state.lastMessage = '神明有在看！結緣水讓大家冷靜'; playWater(); addEffect(target.x, target.z, '#8ee8bd', 'ring'); settleConflict(target);
  } else if (key === 'W') {
    const target = highestConflict(); if (!target) return;
    target.heat = Math.max(0, target.heat - 76); state.score.shengWang += 16; state.score.festival += 8;
    target.label.material.color.set('#ffe17a'); state.lastMessage = '平安符飛到衝突現場！'; playTalisman(); addEffect(target.x, target.z, '#f5d477', 'ring'); settleConflict(target);
  } else if (key === 'E') {
    let hit = 0;
    for (const target of [...state.conflicts]) {
      if (Math.hypot(target.x, target.z) < 6.4) {
        target.heat -= 30; hit++; target.aura.material.color.set('#b5ef7c'); settleConflict(target);
      }
    }
    if (hit) { state.score.shengWang += hit * 5; state.score.festival += hit * 6; state.lastMessage = '號角聲響起：互相體諒啦！'; addEffect(0, 0, '#f9e58b', 'ring'); }
    playHorn();
  } else if (key === 'R') {
    addEffect(0, 0, '#68d0ff', 'ring');
    const barrier = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.075, 10, 64), new THREE.MeshBasicMaterial({ color: '#68d0ff', transparent: true, opacity: 0.8 }));
    barrier.rotation.x = Math.PI / 2; barrier.position.y = 0.18; scene.add(barrier); state.effects.push({ object: barrier, life: 4.2, max: 4.2, kind: 'barrier' });
    state.lastMessage = '太極結界展開，隔開爭執！'; playBarrier();
  }
  updateHud();
}

function resetGame() {
  ensureAudio();
  for (const item of state.conflicts) scene.remove(item.root);
  for (const item of state.effects) scene.remove(item.object);
  state.conflicts.length = 0; state.effects.length = 0; state.smoke.forEach(p => scene.remove(p.object)); state.smoke.length = 0;
  state.timeLeft = state.roundTime; state.gameOver = false; state.score = { shengWang: 0, festival: 0, police: 0, stigma: 0 };
  state.spawnTimer = 1.3; state.lastMessage = '廟會秩序正在維持…'; state.skillCooldowns = { Q: 0, W: 0, E: 0, R: 0 }; state.lastTime = 0;
  state.player.position.set(0, 0, 0); overlay.classList.add('hidden'); createConflict(); createConflict(); updateHud();
  requestAnimationFrame(loop);
}
function finishRound() {
  if (state.gameOver) return;
  state.gameOver = true;
  const score = state.score.shengWang;
  const title = state.score.police >= 100 ? '警笛已響起，遶境被迫中止' : state.score.stigma >= 100 ? '網路污名化爆發，文化遭誤解' : score >= 100 ? 'S級：神明認證・廟會和平大使' : score >= 65 ? 'A級：廟會秩序守護者' : score >= 35 ? 'B級：熱鬧但還有待磨合' : 'F級：警局泡茶・遶境終結者';
  overlayTitle.textContent = title;
  overlayText.textContent = `聖望 ${Math.round(state.score.shengWang)} / 熱鬧 ${Math.round(state.score.festival)} / 警戒 ${Math.round(state.score.police)} / 污名 ${Math.round(state.score.stigma)}`;
  overlay.classList.remove('hidden');
  if (state.score.police >= 100 || state.score.stigma >= 100) playSiren(); else playPeace();
}

function update(dt) {
  if (state.gameOver) return;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) { state.timeLeft = 0; finishRound(); return; }
  for (const key of Object.keys(state.skillCooldowns)) state.skillCooldowns[key] = Math.max(0, state.skillCooldowns[key] - dt);
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) { createConflict(); state.spawnTimer = 1.4 + Math.random() * 1.1; }
  for (const item of [...state.conflicts]) {
    item.heat += dt * (5.5 + Math.random() * 2.5); item.phase += dt * 5;
    item.root.position.y = Math.sin(item.phase) * 0.045;
    item.marker.rotation.z += dt * 0.7;
    const intensity = Math.min(1, item.heat / 135);
    item.aura.scale.setScalar(0.8 + intensity * 0.75 + Math.sin(item.phase) * 0.08);
    item.aura.material.opacity = 0.12 + intensity * 0.22;
    item.label.position.y = 2.6 + Math.sin(item.phase * 0.7) * 0.08;
    if (item.heat > 115) { state.score.police += dt * 9; state.score.stigma += dt * 7; }
    else if (item.heat > 88) { state.score.police += dt * 5.5; state.score.stigma += dt * 4.5; }
    if (item.heat <= 0) settleConflict(item);
  }
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const effect = state.effects[i]; effect.life -= dt;
    const progress = 1 - effect.life / effect.max;
    if (effect.kind === 'barrier') {
      for (const item of state.conflicts) if (Math.hypot(item.x, item.z) < 3.3) item.heat -= dt * 22;
      effect.object.material.opacity = Math.max(0, 0.8 * (1 - progress));
      effect.object.scale.setScalar(0.94 + Math.sin(performance.now() * 0.006) * 0.07);
    } else {
      effect.object.scale.setScalar(0.5 + progress * 3.3);
      effect.object.material.opacity = Math.max(0, 1 - progress);
    }
    if (effect.life <= 0) { scene.remove(effect.object); state.effects.splice(i, 1); }
  }
  if (Math.random() < dt * 8) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 7, 6), new THREE.MeshBasicMaterial({ color: '#d4c9bd', transparent: true, opacity: 0.18 }));
    puff.position.set((Math.random() - 0.5) * 0.5, 1.8, -1.6 + (Math.random() - 0.5) * 0.3); scene.add(puff); state.smoke.push({ object: puff, life: 2.1 });
  }
  for (let i = state.smoke.length - 1; i >= 0; i--) {
    const puff = state.smoke[i]; puff.life -= dt; puff.object.position.y += dt * 0.5; puff.object.position.x += Math.sin(performance.now() * 0.001 + i) * dt * 0.13;
    puff.object.material.opacity = Math.max(0, puff.life / 2.1 * 0.18);
    if (puff.life <= 0) { scene.remove(puff.object); puff.object.geometry.dispose(); puff.object.material.dispose(); state.smoke.splice(i, 1); }
  }
  if (state.score.police >= 100 || state.score.stigma >= 100) { finishRound(); return; }
  updateHud();
}

let isDragging = false; let lastPointer = null;
host.addEventListener('pointerdown', (event) => { isDragging = true; lastPointer = { x: event.clientX, y: event.clientY }; host.setPointerCapture(event.pointerId); });
host.addEventListener('pointermove', (event) => {
  if (!isDragging || !lastPointer) return;
  const dx = event.clientX - lastPointer.x; const dy = event.clientY - lastPointer.y; lastPointer = { x: event.clientX, y: event.clientY };
  cameraRig.yaw -= dx * 0.0045; cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch - dy * 0.004, 0.25, 1.35);
  updateCamera();
});
host.addEventListener('pointerup', () => { isDragging = false; lastPointer = null; });
host.addEventListener('pointerleave', () => { isDragging = false; lastPointer = null; });
host.addEventListener('wheel', (event) => { event.preventDefault(); cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance + event.deltaY * 0.01, 12, 28); updateCamera(); }, { passive: false });

function loop(timestamp) {
  const dt = state.lastTime ? Math.min((timestamp - state.lastTime) / 1000, 0.04) : 0;
  state.lastTime = timestamp;
  update(dt);
  state.player.rotation.y = Math.sin(timestamp * 0.0012) * 0.08;
  redGlow.intensity = 14 + Math.sin(timestamp * 0.003) * 3;
  renderer.render(scene, camera); requestAnimationFrame(loop);
}

newGameBtn.addEventListener('click', resetGame);
soundToggleBtn.addEventListener('click', () => setSound(!state.soundEnabled));
shareBtn.addEventListener('click', async () => {
  const text = `我在《The Cool Butler》拿到「${overlayTitle.textContent}」！\n聖望 ${Math.round(state.score.shengWang)} · 熱鬧 ${Math.round(state.score.festival)}\n警戒 ${Math.round(state.score.police)} · 污名 ${Math.round(state.score.stigma)}\n#廟會 #和平 #台灣文化 #TheCoolButler`;
  try { await navigator.clipboard.writeText(text); overlayText.textContent = 'Threads 文案已複製到剪貼簿，快去分享！'; playPeace(); }
  catch { overlayText.textContent = text; }
});
for (const button of skillButtons) button.addEventListener('click', () => { ensureAudio(); castSkill(button.dataset.skill); });
document.addEventListener('keydown', event => {
  if (event.repeat || event.target.matches('input,textarea,button')) return;
  const key = event.key.toUpperCase();
  if (['Q', 'W', 'E', 'R'].includes(key)) { ensureAudio(); castSkill(key); }
});
setSound(true); resetGame();
