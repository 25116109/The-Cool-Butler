const host = document.getElementById('gameCanvas');
const $ = (id) => document.getElementById(id);
const ui = {
  sheng: $('shengWangValue'), festival: $('festivalValue'), police: $('policeValue'), stigma: $('stigmaValue'),
  timer: $('timerValue'), timerBar: $('timerBar'), startScreen: $('startScreen'), overlay: $('overlay'),
  title: $('overlayTitle'), result: $('overlayText'), record: $('recordMessage'), start: $('startBtn'),
  difficulty: $('difficultySelect'), leaderboard: $('leaderboardList'), best: $('bestScore'),
  sound: $('soundToggleBtn'), newGame: $('newGameBtn'), menu: $('menuBtn'), resultMenu: $('resultMenuBtn'), share: $('shareBtn'),
  joystick: $('joystick'), stick: $('stick'),
};
const state = {
  roundTime: 35, timeLeft: 35, started: false, gameOver: false, difficulty: 'normal',
  score: { shengWang: 0, festival: 0, police: 0, stigma: 0 }, conflicts: [], effects: [], smoke: [],
  player: null, spawnTimer: 1.4, soundEnabled: true, musicEnabled: true, lastTime: 0,
  skillCooldowns: { Q: 0, W: 0, E: 0, R: 0 }, movement: { x: 0, z: 0 }, keys: new Set(),
};
const difficultySettings = {
  easy: { name: '平安場', spawn: 2.4, heat: 0.62, penalty: 0.55, maxCrowds: 5 },
  normal: { name: '遶境場', spawn: 1.65, heat: 1, penalty: 1, maxCrowds: 7 },
  hard: { name: '鬧熱場', spawn: 1.05, heat: 1.42, penalty: 1.35, maxCrowds: 9 },
};
const STORAGE_KEY = 'cool-butler-records-v1';

if (!window.THREE) { host.innerHTML = '<p class="engine-error">3D 引擎載入失敗，請檢查網路連線後重新整理。</p>'; throw new Error('Three.js failed to load'); }
const THREE = window.THREE;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#24242b'); scene.fog = new THREE.Fog('#24242b', 22, 48);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; host.appendChild(renderer.domElement);
const cameraRig = { yaw: -0.9, pitch: 0.8, distance: 19, target: new THREE.Vector3(0, 1.8, 0) };
function updateCamera() {
  camera.position.set(cameraRig.target.x + Math.cos(cameraRig.yaw) * Math.cos(cameraRig.pitch) * cameraRig.distance,
    cameraRig.target.y + Math.sin(cameraRig.pitch) * cameraRig.distance,
    cameraRig.target.z + Math.sin(cameraRig.yaw) * Math.cos(cameraRig.pitch) * cameraRig.distance);
  camera.lookAt(cameraRig.target);
}
updateCamera();
scene.add(new THREE.HemisphereLight(0xffe6bd, 0x292b38, 2));
const moonLight = new THREE.DirectionalLight(0xffd69a, 3.2); moonLight.position.set(-7, 13, 8); moonLight.castShadow = true; moonLight.shadow.mapSize.set(1024, 1024); scene.add(moonLight);
const redGlow = new THREE.PointLight(0xff4b2b, 17, 16); redGlow.position.set(-4, 3, -3); scene.add(redGlow);
const lanternGlow = new THREE.PointLight(0xffa53c, 12, 14); lanternGlow.position.set(4, 3, -3); scene.add(lanternGlow);
const mat = (color, roughness = .82, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const materials = { ground: mat('#55564f'), stone: mat('#777469'), wood: mat('#6e3421'), roof: mat('#a83e2c'), gold: mat('#e9b64d', .38, .35), red: mat('#c92f2c'), dark: mat('#29252a'), cream: mat('#f3d9a0'), blue: mat('#5abde0') };
function mesh(geometry, material, parent = scene, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material); object.position.set(...position); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function makeLabel(text, color = '#fff2c7') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 80; const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,12,8,.78)'; g.beginPath(); g.roundRect(8, 8, 240, 64, 18); g.fill();
  g.strokeStyle = 'rgba(245,212,119,.7)'; g.lineWidth = 3; g.stroke(); g.fillStyle = color; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 40);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); sprite.scale.set(2.4, .75, 1); return sprite;
}
function createTemple() {
  mesh(new THREE.BoxGeometry(8, .45, 5), materials.stone, scene, [0, .22, -5.7]);
  mesh(new THREE.BoxGeometry(6.7, 2.3, 3.7), materials.wood, scene, [0, 1.45, -5.7]);
  mesh(new THREE.BoxGeometry(6.9, .24, .25), materials.gold, scene, [0, 2.35, -3.8]);
  const roof = mesh(new THREE.CylinderGeometry(.5, 1, 1, 4), materials.roof, scene, [0, 3.05, -5.7]); roof.rotation.y = Math.PI / 4; roof.scale.set(5.2, 1.25, 3.5);
  mesh(new THREE.BoxGeometry(5.2, .2, .24), materials.gold, scene, [0, 3.72, -5.7]);
  for (const x of [-3.1, 3.1]) { const p = mesh(new THREE.CylinderGeometry(.12, .16, 2.4, 8), materials.red, scene, [x, 1.35, -3.82]); p.rotation.z = Math.PI; }
  mesh(new THREE.BoxGeometry(1.5, 1.7, .16), materials.dark, scene, [0, 1.25, -3.78]);
  mesh(new THREE.CylinderGeometry(.72, .9, .7, 10), materials.gold, scene, [0, .65, -1.6]); mesh(new THREE.ConeGeometry(.64, .32, 10), materials.red, scene, [0, 1.15, -1.6]);
  for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(.025, .025, 1.1, 5), materials.wood, scene, [(i - 1) * .18, 1.75, -1.6]);
  for (const x of [-4.6, 4.6]) {
    const lion = new THREE.Group(); lion.position.set(x, .35, -3.3); scene.add(lion);
    mesh(new THREE.BoxGeometry(.9, .75, .8), materials.stone, lion, [0, .4, 0]); mesh(new THREE.SphereGeometry(.36, 12, 10), materials.stone, lion, [0, .95, 0]);
    mesh(new THREE.SphereGeometry(.12, 8, 8), materials.gold, lion, [0, .98, .32]); mesh(new THREE.BoxGeometry(1.12, .2, 1), materials.stone, lion, [0, .1, 0]);
  }
  for (const z of [-7.3, -4.4, -1.4, 1.8]) for (const x of [-6.4, 6.4]) {
    mesh(new THREE.CylinderGeometry(.07, .1, 4.1, 8), materials.wood, scene, [x, 2.05, z]);
    const lantern = mesh(new THREE.BoxGeometry(.52, .72, .52), materials.red, scene, [x, 3.15, z]);
    lantern.material = new THREE.MeshStandardMaterial({ color: '#d52e24', emissive: '#ff401c', emissiveIntensity: 1.15, roughness: .38 });
    mesh(new THREE.CylinderGeometry(.3, .3, .08, 12), materials.gold, scene, [x, 3.53, z]);
  }
}
mesh(new THREE.PlaneGeometry(38, 38), materials.ground, scene, [0, -.08, 0]).rotation.x = -Math.PI / 2;
mesh(new THREE.BoxGeometry(20, .18, 18), mat('#716858'), scene, [0, .02, 0]);
const grid = new THREE.GridHelper(18, 18, '#b39b6e', '#887d68'); grid.position.y = .13; grid.material.transparent = true; grid.material.opacity = .23; scene.add(grid);
createTemple();
for (const x of [-9.2, 9.2]) for (let z = -5; z <= 6; z += 2.5) {
  mesh(new THREE.BoxGeometry(1.1, 1.2, 1.1), materials.wood, scene, [x, .6, z]); const awning = mesh(new THREE.ConeGeometry(.9, .65, 4), materials.red, scene, [x, 1.48, z]); awning.rotation.y = Math.PI / 4;
  mesh(new THREE.BoxGeometry(1.25, .12, 1.2), materials.gold, scene, [x, .08, z]);
}
function createFigure(color, x, z, parent, scale = 1) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
  mesh(new THREE.CylinderGeometry(.22, .29, .82, 8), mat(color), group, [0, .7, 0]); mesh(new THREE.SphereGeometry(.22, 12, 10), materials.cream, group, [0, 1.28, 0]);
  mesh(new THREE.ConeGeometry(.28, .27, 8), materials.dark, group, [0, 1.53, 0]); mesh(new THREE.CylinderGeometry(.07, .09, .52, 6), materials.cream, group, [.29, .83, 0]); return group;
}
function createPlayer() {
  const group = new THREE.Group(); scene.add(group);
  mesh(new THREE.CylinderGeometry(.28, .36, 1.05, 8), materials.blue, group, [0, .72, 0]); mesh(new THREE.SphereGeometry(.25, 12, 10), materials.cream, group, [0, 1.42, 0]);
  const hat = mesh(new THREE.ConeGeometry(.32, .5, 4), materials.gold, group, [0, 1.8, 0]); hat.rotation.y = Math.PI / 4;
  mesh(new THREE.CylinderGeometry(.035, .05, 1.6, 6), materials.gold, group, [.42, 1.08, 0]); const tines = new THREE.Group(); group.add(tines); tines.position.set(.42, 1.84, 0);
  for (const x of [-.16, 0, .16]) mesh(new THREE.ConeGeometry(.065, .32, 5), materials.gold, tines, [x, .84 + (x === 0 ? .14 : 0), 0]);
  const label = makeLabel('執事阿文', '#b9f3ff'); label.position.set(0, 2.45, 0); group.add(label); return group;
}
state.player = createPlayer();
function createConflict() {
  const cfg = difficultySettings[state.difficulty]; if (state.conflicts.length >= cfg.maxCrowds) return;
  let x, z; do { const a = Math.random() * Math.PI * 2; const r = 4.2 + Math.random() * 3.1; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (Math.hypot(x - state.player.position.x, z - state.player.position.z) < 2.5);
  const names = ['轎夫', '陣頭', '民眾', '香客']; const name = names[Math.floor(Math.random() * names.length)];
  const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
  const aura = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#ff5547', transparent: true, opacity: .2, side: THREE.DoubleSide })); aura.rotation.x = -Math.PI / 2; aura.position.y = .08; root.add(aura);
  const marker = new THREE.Mesh(new THREE.TorusGeometry(.75, .055, 8, 32), new THREE.MeshBasicMaterial({ color: '#ff7555', transparent: true, opacity: .9 })); marker.rotation.x = Math.PI / 2; marker.position.y = .1; root.add(marker);
  const colors = ['#d9583e', '#383447', '#4c986a']; const figures = [];
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; figures.push(createFigure(colors[i], Math.cos(a) * .55, Math.sin(a) * .55, root, .78)); }
  const label = makeLabel(name + ' · 騷動', '#ffe4be'); label.position.set(0, 2.6, 0); root.add(label);
  state.conflicts.push({ x, z, heat: 38 + Math.random() * 35, root, aura, marker, figures, label, phase: Math.random() * 6 });
}
function resize() { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host); resize();

// Procedural temple-festival music and effects. Browsers unlock audio after a user gesture.
let audioCtx = null, musicTimer = null, musicStep = 0;
function audio() {
  if (!state.soundEnabled) return null;
  if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; audioCtx = new C(); }
  if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx;
}
function tone(freq, duration = .16, type = 'sine', volume = .035, glide = 0, delay = 0) {
  const ctx = audio(); if (!ctx) return; const t = ctx.currentTime + delay; const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t); if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + glide), t + duration);
  gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(volume, t + .012); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + duration + .025);
}
function startMusic() {
  if (!state.soundEnabled || musicTimer) return;
  const beat = () => {
    if (!state.soundEnabled || !state.started || state.gameOver) return;
    const notes = [196, 247, 294, 247, 220, 294, 330, 294]; const n = notes[musicStep % notes.length];
    if (musicStep % 2 === 0) tone(82, .13, 'sawtooth', .018, -38);
    tone(n, .22, 'triangle', .012, 8); if (musicStep % 4 === 3) tone(640, .045, 'triangle', .008, -400, .09);
    musicStep++;
  };
  beat(); musicTimer = window.setInterval(beat, 430);
}
function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
function playWater() { tone(880, .12, 'sine', .035, -520); tone(620, .2, 'triangle', .035, -220, .08); }
function playTalisman() { tone(250, .18, 'triangle', .04, 280); tone(740, .24, 'sine', .04, 180, .1); }
function playHorn() { tone(196, .36, 'sawtooth', .035, 30); tone(294, .33, 'triangle', .035, 20, .04); tone(392, .3, 'triangle', .025, 15, .09); }
function playBarrier() { tone(165, .4, 'sine', .05, 420); tone(330, .38, 'triangle', .035, 210, .06); }
function playPeace() { [523, 659, 784].forEach((f, i) => tone(f, .25, 'triangle', .035, 20, i * .1)); }
function playSiren() { [0, .22, .44, .66].forEach((d, i) => tone(i % 2 ? 760 : 980, .2, 'square', .025, i % 2 ? 180 : -180, d)); }
function setSound(enabled) {
  state.soundEnabled = enabled; ui.sound.textContent = enabled ? '🔊 音樂／音效' : '🔇 音樂／音效'; ui.sound.setAttribute('aria-pressed', String(enabled));
  if (!enabled) stopMusic(); else { audio(); if (state.started && !state.gameOver) startMusic(); tone(440, .12, 'triangle', .02); }
}

function readRecords() { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
function renderRecords() {
  const records = readRecords(); const best = records[0]?.score || 0; ui.best.textContent = best;
  ui.leaderboard.innerHTML = '';
  if (!records.length) { const li = document.createElement('li'); li.textContent = '尚無紀錄，來拿下第一名吧！'; ui.leaderboard.append(li); return; }
  for (const record of records.slice(0, 5)) { const li = document.createElement('li'); li.textContent = `${record.score} 分 · ${record.difficulty} · ${record.date}`; ui.leaderboard.append(li); }
}
function saveRecord() {
  const records = readRecords(); const score = Math.round(state.score.shengWang + state.score.festival * .35);
  records.push({ score, difficulty: difficultySettings[state.difficulty].name, date: new Date().toLocaleDateString('zh-TW') });
  records.sort((a, b) => b.score - a.score); const top = records.slice(0, 5);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(top)); } catch { /* private browsing can disable storage */ }
  const isBest = top[0]?.score === score; ui.record.textContent = isBest ? '🎉 新紀錄！已保存到這台裝置。' : '本機排行榜已更新。'; renderRecords();
}
function updateHud() {
  ui.sheng.textContent = Math.round(state.score.shengWang); ui.festival.textContent = Math.round(state.score.festival);
  ui.police.textContent = Math.round(state.score.police); ui.stigma.textContent = Math.round(state.score.stigma);
  ui.timer.textContent = `${state.timeLeft.toFixed(1)}s`; ui.timerBar.style.width = `${Math.max(0, state.timeLeft / state.roundTime * 100)}%`;
}
function addEffect(x, z, color, kind = 'burst') {
  const geometry = kind === 'ring' || kind === 'barrier' ? new THREE.TorusGeometry(kind === 'barrier' ? 3.2 : .55, .07, 8, 48) : new THREE.SphereGeometry(.32, 12, 10);
  const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .95 })); object.position.set(x, kind === 'barrier' ? .18 : .55, z);
  if (kind === 'ring' || kind === 'barrier') object.rotation.x = Math.PI / 2;
  scene.add(object); state.effects.push({ object, x, z, life: kind === 'barrier' ? 4.2 : .85, max: kind === 'barrier' ? 4.2 : .85, kind });
}
function nearestConflict() { return state.conflicts.reduce((a, b) => !a || Math.hypot(b.x - state.player.position.x, b.z - state.player.position.z) < Math.hypot(a.x - state.player.position.x, a.z - state.player.position.z) ? b : a, null); }
function highestConflict() { return state.conflicts.reduce((a, b) => !a || b.heat > a.heat ? b : a, null); }
function settleConflict(item) {
  if (item.heat > 0) return false;
  state.score.shengWang += 16; state.score.festival += 12; scene.remove(item.root);
  const idx = state.conflicts.indexOf(item); if (idx >= 0) state.conflicts.splice(idx, 1);
  addEffect(item.x, item.z, '#7ae8a8'); state.lastMessage = '互相體諒啦！和平達成'; playPeace(); return true;
}
function castSkill(key) {
  if (!state.started || state.gameOver || state.skillCooldowns[key] > 0) return;
  state.skillCooldowns[key] = { Q: 1.7, W: 5.6, E: 6.2, R: 8.5 }[key];
  if (key === 'Q') {
    const target = nearestConflict(); if (!target) return;
    target.heat -= 40; target.aura.material.color.set('#65df9a'); state.score.shengWang += 8; state.score.festival += 4;
    state.lastMessage = '神明有在看！結緣水讓大家冷靜'; playWater(); if (target.heat <= 0) settleConflict(target); else addEffect(target.x, target.z, '#8ee8bd', 'ring');
  } else if (key === 'W') {
    const target = highestConflict(); if (!target) return;
    target.heat -= 78; target.label.material.color.set('#ffe17a'); state.score.shengWang += 16; state.score.festival += 8;
    state.lastMessage = '平安符飛到衝突現場！'; playTalisman(); if (target.heat <= 0) settleConflict(target); else addEffect(target.x, target.z, '#f5d477', 'ring');
  } else if (key === 'E') {
    let hit = 0;
    for (const target of [...state.conflicts]) if (Math.hypot(target.x - state.player.position.x, target.z - state.player.position.z) < 6.4) {
      target.heat -= 34; hit++; if (target.heat <= 0) settleConflict(target); else target.aura.material.color.set('#b5ef7c');
    }
    if (hit) { state.score.shengWang += hit * 5; state.score.festival += hit * 6; state.lastMessage = '號角聲響起：互相體諒啦！'; addEffect(state.player.position.x, state.player.position.z, '#f9e58b', 'ring'); }
    playHorn();
  } else {
    addEffect(state.player.position.x, state.player.position.z, '#68d0ff', 'barrier'); state.lastMessage = '太極結界展開，隔開爭執！'; playBarrier();
  }
  updateHud();
}
function startGame() {
  audio(); state.difficulty = ui.difficulty.value; state.started = true; state.gameOver = false;
  state.timeLeft = state.roundTime; state.score = { shengWang: 0, festival: 0, police: 0, stigma: 0 };
  for (const item of state.conflicts) scene.remove(item.root); state.conflicts.length = 0;
  for (const effect of state.effects) scene.remove(effect.object); state.effects.length = 0;
  for (const puff of state.smoke) scene.remove(puff.object); state.smoke.length = 0;
  state.spawnTimer = .7; state.skillCooldowns = { Q: 0, W: 0, E: 0, R: 0 }; state.lastTime = 0;
  state.player.position.set(0, 0, 0); cameraRig.target.set(0, 1.8, 0); updateCamera();
  createConflict(); createConflict(); ui.startScreen.classList.add('hidden'); ui.overlay.classList.add('hidden'); updateHud(); startMusic();
}
function showMenu() {
  state.started = false; state.gameOver = false; stopMusic(); ui.overlay.classList.add('hidden'); ui.startScreen.classList.remove('hidden'); renderRecords();
}
function finishRound() {
  if (state.gameOver) return; state.gameOver = true; state.started = false; stopMusic();
  const score = state.score.shengWang;
  const title = state.score.police >= 100 ? '警笛已響起，遶境被迫中止' : state.score.stigma >= 100 ? '網路污名化爆發，文化遭誤解' : score >= 100 ? 'S級：神明認證・廟會和平大使' : score >= 65 ? 'A級：廟會秩序守護者' : score >= 35 ? 'B級：熱鬧但還有待磨合' : 'F級：警局泡茶・遶境終結者';
  ui.title.textContent = title; ui.result.textContent = `聖望 ${Math.round(state.score.shengWang)} / 熱鬧 ${Math.round(state.score.festival)} / 警戒 ${Math.round(state.score.police)} / 污名 ${Math.round(state.score.stigma)} · ${difficultySettings[state.difficulty].name}`;
  saveRecord(); ui.overlay.classList.remove('hidden');
  if (state.score.police >= 100 || state.score.stigma >= 100) playSiren(); else playPeace();
}
function update(dt) {
  if (!state.started || state.gameOver) return;
  state.timeLeft -= dt; if (state.timeLeft <= 0) { state.timeLeft = 0; finishRound(); return; }
  for (const key of Object.keys(state.skillCooldowns)) state.skillCooldowns[key] = Math.max(0, state.skillCooldowns[key] - dt);
  const cfg = difficultySettings[state.difficulty]; state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) { createConflict(); state.spawnTimer = cfg.spawn * (.72 + Math.random() * .56); }
  let mx = state.movement.x, mz = state.movement.z;
  if (state.keys.has('a') || state.keys.has('arrowleft')) mx -= 1;
  if (state.keys.has('d') || state.keys.has('arrowright')) mx += 1;
  if (state.keys.has('w') || state.keys.has('arrowup')) mz -= 1;
  if (state.keys.has('s') || state.keys.has('arrowdown')) mz += 1;
  const mag = Math.hypot(mx, mz); if (mag > 1) { mx /= mag; mz /= mag; }
  const moving = mag > .08;
  state.player.position.x = THREE.MathUtils.clamp(state.player.position.x + mx * dt * 5.3, -7.8, 7.8);
  state.player.position.z = THREE.MathUtils.clamp(state.player.position.z + mz * dt * 5.3, -7.1, 7.1);
  state.player.rotation.y = moving ? Math.atan2(mx, mz) : Math.sin(performance.now() * .0012) * .08;
  state.player.position.y = moving ? Math.abs(Math.sin(performance.now() * .012)) * .07 : 0;
  cameraRig.target.x += (state.player.position.x - cameraRig.target.x) * Math.min(1, dt * 2.3);
  cameraRig.target.z += (state.player.position.z - cameraRig.target.z) * Math.min(1, dt * 2.3);
  updateCamera();
  for (const item of [...state.conflicts]) {
    item.heat += dt * (5.5 + Math.random() * 2.5) * cfg.heat; item.phase += dt * 5; item.root.position.y = Math.sin(item.phase) * .045;
    item.marker.rotation.z += dt * .7; const intensity = Math.min(1, item.heat / 135);
    item.aura.scale.setScalar(.8 + intensity * .75 + Math.sin(item.phase) * .08); item.aura.material.opacity = .12 + intensity * .22;
    item.label.position.y = 2.6 + Math.sin(item.phase * .7) * .08;
    if (item.heat > 115) { state.score.police += dt * 9 * cfg.penalty; state.score.stigma += dt * 7 * cfg.penalty; }
    else if (item.heat > 88) { state.score.police += dt * 5.5 * cfg.penalty; state.score.stigma += dt * 4.5 * cfg.penalty; }
    if (item.heat <= 0) settleConflict(item);
  }
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const e = state.effects[i]; e.life -= dt; const p = 1 - e.life / e.max;
    if (e.kind === 'barrier') {
      for (const item of state.conflicts) if (Math.hypot(item.x - e.x, item.z - e.z) < 3.3) item.heat -= dt * 22;
      e.object.material.opacity = Math.max(0, .8 * (1 - p)); e.object.scale.setScalar(.94 + Math.sin(performance.now() * .006) * .07);
    } else { e.object.scale.setScalar(.5 + p * 3.3); e.object.material.opacity = Math.max(0, 1 - p); }
    if (e.life <= 0) { scene.remove(e.object); e.object.geometry.dispose(); e.object.material.dispose(); state.effects.splice(i, 1); }
  }
  if (Math.random() < dt * 8) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(.08 + Math.random() * .08, 7, 6), new THREE.MeshBasicMaterial({ color: '#d4c9bd', transparent: true, opacity: .18 }));
    puff.position.set((Math.random() - .5) * .5, 1.8, -1.6 + (Math.random() - .5) * .3); scene.add(puff); state.smoke.push({ object: puff, life: 2.1 });
  }
  for (let i = state.smoke.length - 1; i >= 0; i--) {
    const p = state.smoke[i]; p.life -= dt; p.object.position.y += dt * .5; p.object.position.x += Math.sin(performance.now() * .001 + i) * dt * .13; p.object.material.opacity = Math.max(0, p.life / 2.1 * .18);
    if (p.life <= 0) { scene.remove(p.object); p.object.geometry.dispose(); p.object.material.dispose(); state.smoke.splice(i, 1); }
  }
  if (state.score.police >= 100 || state.score.stigma >= 100) { finishRound(); return; } updateHud();
}

let dragging = false, lastPointer = null;
host.addEventListener('pointerdown', e => { if (e.target.closest('#mobileControls')) return; dragging = true; lastPointer = { x: e.clientX, y: e.clientY }; host.setPointerCapture(e.pointerId); });
host.addEventListener('pointermove', e => { if (!dragging || !lastPointer) return; const dx = e.clientX - lastPointer.x, dy = e.clientY - lastPointer.y; lastPointer = { x: e.clientX, y: e.clientY }; cameraRig.yaw -= dx * .0045; cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch - dy * .004, .25, 1.35); updateCamera(); });
host.addEventListener('pointerup', () => { dragging = false; lastPointer = null; }); host.addEventListener('pointercancel', () => { dragging = false; lastPointer = null; });
host.addEventListener('wheel', e => { e.preventDefault(); cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance + e.deltaY * .01, 12, 28); updateCamera(); }, { passive: false });
function joystickMove(e) {
  const rect = ui.joystick.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const dx = e.clientX - cx, dy = e.clientY - cy, max = rect.width * .34, len = Math.min(max, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx), nx = Math.cos(angle) * len, ny = Math.sin(angle) * len;
  ui.stick.style.transform = `translate(calc(-50% + ${nx}px),calc(-50% + ${ny}px))`;
  state.movement.x = nx / max; state.movement.z = ny / max;
}
ui.joystick.addEventListener('pointerdown', e => { e.preventDefault(); ui.joystick.setPointerCapture(e.pointerId); joystickMove(e); });
ui.joystick.addEventListener('pointermove', e => { if (ui.joystick.hasPointerCapture(e.pointerId)) joystickMove(e); });
function resetJoystick() { state.movement.x = 0; state.movement.z = 0; ui.stick.style.transform = 'translate(-50%,-50%)'; }
ui.joystick.addEventListener('pointerup', resetJoystick); ui.joystick.addEventListener('pointercancel', resetJoystick);
function frame(timestamp) {
  const dt = state.lastTime ? Math.min((timestamp - state.lastTime) / 1000, .04) : 0; state.lastTime = timestamp; update(dt);
  redGlow.intensity = 14 + Math.sin(timestamp * .003) * 3; lanternGlow.intensity = 11 + Math.sin(timestamp * .002 + 1) * 2;
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
ui.start.addEventListener('click', startGame); ui.newGame.addEventListener('click', startGame); ui.menu.addEventListener('click', showMenu); ui.resultMenu.addEventListener('click', showMenu);
ui.sound.addEventListener('click', () => setSound(!state.soundEnabled));
ui.share.addEventListener('click', async () => {
  const text = `我在《The Cool Butler》拿到「${ui.title.textContent}」！\n聖望 ${Math.round(state.score.shengWang)} · 熱鬧 ${Math.round(state.score.festival)}\n警戒 ${Math.round(state.score.police)} · 污名 ${Math.round(state.score.stigma)}\n#廟會 #和平 #台灣文化 #TheCoolButler`;
  try { await navigator.clipboard.writeText(text); ui.record.textContent = 'Threads 文案已複製，快去分享！'; playPeace(); } catch { ui.record.textContent = text; }
});
for (const button of document.querySelectorAll('.skill-btn')) button.addEventListener('click', () => { audio(); castSkill(button.dataset.skill); });
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase(); if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) { state.keys.add(key); e.preventDefault(); }
  const skill = key.toUpperCase(); if (['Q','W','E','R'].includes(skill) && !e.repeat && !e.target.matches('input,textarea,select')) { audio(); castSkill(skill); }
});
document.addEventListener('keyup', e => state.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { state.keys.clear(); resetJoystick(); });
renderRecords(); updateHud(); requestAnimationFrame(frame);
