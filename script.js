// ============================================================
//  JUMPING DUCK — Complete Game Script v2
//  Fixes: fly mechanic, clean canvas backgrounds, cute girl
//         characters, flicker-free obstacles
// ============================================================

/* ===== CANVAS SETUP ===== */
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = () => canvas.width;
const H = () => canvas.height;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resizeCanvas(); setupBackground(); });
resizeCanvas();

/* ===== CONSTANTS ===== */
const GROUND_RATIO   = 0.80;  // ground Y as fraction of height
const GRAVITY        = 0.50;
const JUMP_VEL       = -14;
const FLY_LIFT       = -0.50; // applied every frame while flying
const FLY_MAX_UP     = -6;    // terminal upward velocity while flying
const FLY_HOVER_SIN  = 0.008; // gentle sine hover amplitude per tick
const MAX_FALL       = 14;
const PLAYER_W       = 54;
const PLAYER_H       = 70;
const GROUND_OBSTACLE_TYPES = [
  { type:'duck',   w:52, h:52, color:'#F4C430', accent:'#FF8C00' },
  { type:'goose',  w:60, h:60, color:'#E8E8E8', accent:'#AAA' },
  { type:'box',    w:46, h:46, color:'#CD853F', accent:'#8B4513' },
  { type:'hay',    w:54, h:42, color:'#F5DEB3', accent:'#DAA520' },
  { type:'rock',   w:48, h:34, color:'#9E9E9E', accent:'#616161' },
  { type:'frog',   w:44, h:42, color:'#66BB6A', accent:'#388E3C', jumper:true },
  { type:'cactus', w:36, h:58, color:'#4CAF50', accent:'#2E7D32' },
];
const AIR_OBSTACLE_TYPES = [
  { type:'bird',  w:56, h:32, color:'#EF5350', accent:'#B71C1C', floatFrac:0.45 },
  { type:'ufo',   w:64, h:28, color:'#7E57C2', accent:'#4527A0', floatFrac:0.38 },
];

/* ===== LETTER COLORS ===== */
const TITLE_TEXT   = 'JUMPING DUCK';
const TITLE_COLORS = ['#FF6B6B','#FFB347','#FFD700','#87DB87','#56C8E0','#B088F9',
                      '#FF6B6B','#FFB347','#FFD700','#87DB87','#56C8E0','#B088F9'];

/* ===== STATE ===== */
let state = {
  screen: 'menu',
  mode: 1,
  names: ['Player 1','Player 2'],
  gameDuration: 45,
  timeLeft: 45,
  ducks: [0, 0],
  running: false,
  muted: false,
};

let lastTime  = 0;
let animFrame = null;

/* ===== MENU ===== */
function buildTitle() {
  const el = document.getElementById('title-letters');
  el.innerHTML = '';
  [...TITLE_TEXT].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'title-letter';
    s.textContent = ch === ' ' ? '\u00A0' : ch;
    s.style.color = TITLE_COLORS[i % TITLE_COLORS.length];
    s.style.animationDelay = `${i * 0.09}s`;
    el.appendChild(s);
  });
}

function spawnMenuDucks() {
  const container = document.getElementById('menuDucks');
  container.innerHTML = '';
  const duckEmojis = ['🦆','🐥','🐤','🦢','🐣'];
  for (let i = 0; i < 5; i++) {
    const d = document.createElement('div');
    d.className = 'menu-duck';
    d.textContent = duckEmojis[i % duckEmojis.length];
    const bottom = 5 + Math.random() * 18;
    const dur    = 8 + Math.random() * 10;
    const delay  = Math.random() * -dur;
    d.style.bottom = `${bottom}%`;
    d.style.animationDuration = `${dur}s`;
    d.style.animationDelay    = `${delay}s`;
    d.style.fontSize = `${1.8 + Math.random() * 1.4}rem`;
    container.appendChild(d);
  }
}

function renderLeaderboard() {
  const list   = document.getElementById('leaderboard-list');
  const scores = loadScores();
  if (!scores.length) {
    list.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>';
    return;
  }
  list.innerHTML = scores.slice(0,7).map((s,i) =>
    `<div class="lb-row">
      <span class="lb-rank">${i+1}.</span>
      <span class="lb-name">${escHtml(s.name)}</span>
      <span>🦆${s.ducks}</span>
      <span>🥇${s.gold}</span>
      <span>💎${s.diamonds}</span>
      <span>${s.time}s</span>
    </div>`
  ).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ===== MENU INTERACTIONS ===== */
let chosenMode = 1;
document.getElementById('btn1p').addEventListener('click', () => {
  chosenMode = 1;
  document.getElementById('p2-group').classList.add('hidden');
  document.getElementById('name-form').classList.remove('hidden');
});
document.getElementById('btn2p').addEventListener('click', () => {
  chosenMode = 2;
  document.getElementById('p2-group').classList.remove('hidden');
  document.getElementById('name-form').classList.remove('hidden');
});
document.getElementById('btn-start').addEventListener('click', () => {
  const n1 = document.getElementById('p1name').value.trim() || 'Player 1';
  const n2 = document.getElementById('p2name').value.trim() || 'Player 2';
  state.names = [n1, n2];
  state.mode  = chosenMode;
  startGame();
});

/* ===== GAME VARIABLES ===== */
let players           = [];
let obstacles         = [];
let particles         = [];
let bgClouds          = [];  // far layer clouds
let bgHills           = [];  // mid hills
let bgBuildings       = [];  // near buildings

// Scene / sky states
let skyPhase       = 0;    // 0=day 1=sunset 2=night
let skyPhaseClock  = 0;
const SKY_PHASE_DUR = 22;  // seconds

let sceneIndex  = 0;
let sceneClock  = 0;
const SCENE_DUR = 20;

const SCENES = [
  { name:'🌾 Farm Fields',   groundTop:'#7CB342', groundBot:'#558B2F' },
  { name:'🏖️ Sunny Beach',   groundTop:'#FFD54F', groundBot:'#F9A825' },
  { name:'🏙️ City Streets',  groundTop:'#78909C', groundBot:'#546E7A' },
  { name:'🌲 Forest Path',   groundTop:'#43A047', groundBot:'#2E7D32' },
  { name:'❄️ Snowy Hills',   groundTop:'#E3F2FD', groundBot:'#BBDEFB' },
  { name:'🎪 Carnival Lane', groundTop:'#CE93D8', groundBot:'#AB47BC' },
];

let gameSpeed    = 3;
let gameTimer    = null;
let giftOpened   = false;
let globalTick   = 0;  // raw frame counter for smooth animations

/* ===== START GAME ===== */
function startGame() {
  cancelAnimationFrame(animFrame);
  clearInterval(gameTimer);

  const durations    = [30, 45, 60];
  state.gameDuration = durations[Math.floor(Math.random() * durations.length)];
  state.timeLeft     = state.gameDuration;
  state.ducks        = [0, 0];
  state.running      = true;
  giftOpened         = false;

  gameSpeed     = 3;
  obstacles     = [];
  particles     = [];
  skyPhase      = 0;
  skyPhaseClock = 0;
  sceneIndex    = 0;
  sceneClock    = 0;
  globalTick    = 0;

  resizeCanvas();
  setupPlayers();
  setupBackground();
  updateHUD();

  showScreen('game-screen');
  document.getElementById('hud-p2').style.display     = state.mode === 2 ? 'flex' : 'none';
  document.getElementById('mob-col2').style.display   = state.mode === 2 ? 'flex' : 'none';

  gameTimer = setInterval(() => {
    state.timeLeft--;
    updateHUD();
    if (state.timeLeft <= 0) { clearInterval(gameTimer); endGame(); }
  }, 1000);

  lastTime  = performance.now();
  animFrame = requestAnimationFrame(gameLoop);
}

/* ===== PLAYER SETUP ===== */
function setupPlayers() {
  const groundY = H() * GROUND_RATIO;
  players = [];
  for (let i = 0; i < state.mode; i++) {
    players.push({
      x: 90 + i * 70,
      y: groundY - PLAYER_H,
      vy: 0,
      onGround: true,
      flying: false,
      flyTick: 0,      // used for hover sine oscillation
      dead: false,
      deadTimer: 0,
      runFrame: 0,
      runTick: 0,
      squash: 1,
      stretch: 1,
      invincible: 0,
      jumpRequest: false,
    });
  }
}

/* ===== BACKGROUND SETUP ===== */
function setupBackground() {
  // Clouds — far layer, very slow
  bgClouds = [];
  for (let i = 0; i < 10; i++) {
    bgClouds.push(makeCloud(Math.random() * W() * 2));
  }
  // Hills — mid layer
  bgHills = [];
  for (let i = 0; i < 7; i++) {
    bgHills.push(makeHill(Math.random() * W() * 2.5));
  }
  // Buildings — near layer
  bgBuildings = [];
  for (let i = 0; i < 6; i++) {
    bgBuildings.push(makeBuilding(Math.random() * W() * 1.5));
  }
}

function makeCloud(x) {
  return {
    x,
    y: 30 + Math.random() * H() * 0.32,
    r: 22 + Math.random() * 28,
    speed: 0.18 + Math.random() * 0.22,
    alpha: 0.75 + Math.random() * 0.25,
    puffs: 2 + Math.floor(Math.random() * 3),
  };
}
function makeHill(x) {
  return {
    x,
    w: 180 + Math.random() * 200,
    h: 80 + Math.random() * 100,
    speed: 0.85 + Math.random() * 0.25,
    hue: Math.floor(Math.random() * 3), // 0 grass 1 sand 2 snow
  };
}
function makeBuilding(x) {
  return {
    x,
    w: 40 + Math.random() * 60,
    h: 60 + Math.random() * 100,
    speed: 2.0 + Math.random() * 0.5,
    windows: Math.floor(Math.random() * 4) + 1,
    hue: Math.floor(Math.random() * 5), // 0..4 = scene variety
  };
}

/* ===== KEYS ===== */
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space')   { if (players[0]) players[0].jumpRequest = true; }
  if (e.code === 'ArrowUp') { if (players[1]) players[1].jumpRequest = true; }
  // Prevent page scroll
  if (['Space','ArrowUp','ArrowDown','KeyW'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

const mobileState = {};
function mobileTouchStart(id) { mobileState[id] = true; }
function mobileTouchEnd(id)   { mobileState[id] = false; }

/* ===== MUTE ===== */
document.getElementById('btn-mute').addEventListener('click', () => {
  state.muted = !state.muted;
  document.getElementById('btn-mute').textContent = state.muted ? '🔇' : '🔊';
});

/* ===== AUDIO ===== */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, type='sine', duration=0.1, vol=0.28) {
  if (state.muted) return;
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(); osc.stop(ac.currentTime + duration);
  } catch(e) {}
}
function playJump()    { playTone(440,'square',0.14,0.22); }
function playFly()     { playTone(660,'sine',0.07,0.12);   }
function playQuack()   { playTone(280,'sawtooth',0.22,0.32); }
function playVictory() {
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'triangle',0.3,0.4),i*130));
}
function playCoin() {
  playTone(880,'sine',0.1,0.38);
  setTimeout(()=>playTone(1320,'sine',0.1,0.38),110);
}

/* ===== GAME LOOP ===== */
function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 16.667, 3);
  lastTime = ts;
  globalTick += dt;
  update(dt);
  render();
  if (state.running) animFrame = requestAnimationFrame(gameLoop);
}

/* ===== UPDATE ===== */
function update(dt) {
  if (!state.running) return;

  // Sky / scene clocks
  skyPhaseClock += dt / 60;
  if (skyPhaseClock > SKY_PHASE_DUR) {
    skyPhaseClock = 0;
    skyPhase = (skyPhase + 1) % 3;
  }
  sceneClock += dt / 60;
  if (sceneClock > SCENE_DUR) {
    sceneClock = 0;
    sceneIndex = (sceneIndex + 1) % SCENES.length;
  }

  // Speed ramp
  const elapsed = state.gameDuration - state.timeLeft;
  gameSpeed = 3 + elapsed * 0.04;

  // ---- PLAYER PHYSICS ----
  players.forEach((p, idx) => {
    if (p.dead) {
      p.deadTimer += dt;
      if (p.deadTimer > 100) { p.dead=false; p.invincible=150; p.deadTimer=0; }
      return;
    }
    if (p.invincible > 0) p.invincible -= dt;

    const groundY = H() * GROUND_RATIO - PLAYER_H;

    // Controls
    const flyKey  = idx===0 ? (keys['KeyW'])                           : (keys['ShiftLeft']||keys['ShiftRight']||keys['KeyM']);
    const mobJump = idx===0 ? mobileState['jump1']                     : mobileState['jump2'];
    const mobFly  = idx===0 ? mobileState['fly1']                      : mobileState['fly2'];
    const wantsJump = p.jumpRequest || mobJump;
    const wantsFly  = (flyKey || mobFly);

    // Jump — only from ground
    if (wantsJump && p.onGround) {
      p.vy       = JUMP_VEL;
      p.onGround = false;
      p.squash   = 0.65; p.stretch = 1.4;
      playJump();
    }
    p.jumpRequest = false;

    // Fly — works in the air (and can take off from ground with a gentle lift)
    if (wantsFly) {
      if (p.onGround) {
        // Take off from ground
        p.vy       = JUMP_VEL * 0.55;
        p.onGround = false;
      }
      // Apply upward force, capped
      p.vy = Math.max(p.vy + FLY_LIFT * dt, FLY_MAX_UP);
      // Gentle hover sine oscillation layered on top
      p.flyTick += dt * 0.06;
      p.y += Math.sin(p.flyTick) * FLY_HOVER_SIN * 60;
      p.flying = true;
      if (Math.floor(globalTick) % 14 === 0) playFly();
    } else {
      p.flying  = false;
      p.flyTick = 0;
    }

    // Gravity (less when flying to give floaty feel)
    const gravMult = wantsFly ? 0.3 : 1;
    p.vy = Math.min(p.vy + GRAVITY * gravMult * dt, MAX_FALL);
    p.y += p.vy * dt;

    // Ground collision
    if (p.y >= groundY) {
      p.y        = groundY;
      p.vy       = 0;
      p.onGround = true;
      p.flying   = false;
      if (p.squash < 0.9) { p.squash=1.3; p.stretch=0.7; }
    }

    // Ceiling
    if (p.y < 0) { p.y = 0; p.vy = Math.max(p.vy, 0); }

    // Squash/stretch ease
    p.squash  += (1 - p.squash)  * 0.18 * dt;
    p.stretch += (1 - p.stretch) * 0.18 * dt;

    // Run animation
    p.runTick += dt;
    if (p.runTick > 7) { p.runFrame = (p.runFrame+1)%6; p.runTick=0; }
  });

  // ---- OBSTACLE SPAWNING ----
  obstacleSpawnTimer += dt;
  if (obstacleSpawnTimer >= obstacleSpawnInterval) {
    obstacleSpawnTimer = 0;
    spawnObstacle();
    const difficulty = 1 - state.timeLeft / state.gameDuration;
    obstacleSpawnInterval = Math.max(45, 130 - difficulty * 85);
  }

  // ---- OBSTACLE UPDATE ----
  obstacles.forEach(o => {
    o.x -= o.speed * dt;
    o.tick += dt;
    if (o.wobble) {
      // smooth sine — store base Y separately
      o.y = o.baseY + Math.sin(o.tick * 0.045) * 10;
    }
    if (o.jumper) {
      o.jumpVy = (o.jumpVy||0) + GRAVITY * dt;
      o.y += o.jumpVy * dt;
      const gnd = H() * GROUND_RATIO - o.h;
      if (o.y >= gnd) { o.y=gnd; o.jumpVy = JUMP_VEL * 0.55; }
    }
  });

  // Remove off-screen, count dodges
  const before = obstacles.length;
  obstacles = obstacles.filter(o => {
    if (o.x + o.w < 0) {
      players.forEach((_p,i) => { if (!players[i].dead) state.ducks[i]++; });
      return false;
    }
    return true;
  });
  if (obstacles.length < before) updateHUD();

  // ---- COLLISION ----
  players.forEach((p,i) => {
    if (p.dead || p.invincible>0) return;
    const px=p.x+10, py=p.y+10, pw=PLAYER_W-20, ph=PLAYER_H-12;
    for (const o of obstacles) {
      if (px < o.x+o.w-6 && px+pw > o.x+6 && py < o.y+o.h-6 && py+ph > o.y+6) {
        p.dead=true; p.deadTimer=0;
        spawnHitParticles(p.x+PLAYER_W/2, p.y+PLAYER_H/2);
        playQuack();
        break;
      }
    }
  });

  // ---- BACKGROUND SCROLL ----
  bgClouds.forEach(c => {
    c.x -= c.speed * dt;
    if (c.x + c.r * 4 < 0) Object.assign(c, makeCloud(W() + c.r * 2));
  });
  bgHills.forEach(h => {
    h.x -= h.speed * dt;
    if (h.x + h.w < 0) Object.assign(h, makeHill(W() + 20));
  });
  bgBuildings.forEach(b => {
    b.x -= b.speed * dt;
    if (b.x + b.w < 0) Object.assign(b, makeBuilding(W() + 10));
  });

  // ---- PARTICLES ----
  particles.forEach(p => {
    p.x += p.vx*dt; p.y += p.vy*dt;
    p.vy += 0.25*dt;
    p.life -= dt;
  });
  particles = particles.filter(p=>p.life>0);
}

/* ===== OBSTACLE SPAWNING HELPERS ===== */
let obstacleSpawnTimer    = 0;
let obstacleSpawnInterval = 130;

function spawnObstacle() {
  const groundY    = H() * GROUND_RATIO;
  const difficulty = 1 - state.timeLeft / state.gameDuration;
  const spawnAir   = Math.random() < 0.22 && difficulty > 0.25;

  if (spawnAir) {
    const t = AIR_OBSTACLE_TYPES[Math.floor(Math.random()*AIR_OBSTACLE_TYPES.length)];
    const baseY = H() * t.floatFrac;
    obstacles.push({
      ...t,
      x: W()+20, y: baseY, baseY,
      vy:0, tick:0,
      speed: gameSpeed + Math.random()*0.8,
      wobble: true, jumper: false,
    });
  } else {
    const t = GROUND_OBSTACLE_TYPES[Math.floor(Math.random()*GROUND_OBSTACLE_TYPES.length)];
    const isGiant = difficulty > 0.65 && Math.random() < 0.12;
    const scale   = isGiant ? 1.8 : 1;
    const w = t.w*scale, h = t.h*scale;
    const baseY = groundY - h;
    obstacles.push({
      ...t,
      x: W()+20, y: baseY, baseY,
      w, h, scale,
      vy:0, tick:0,
      speed: gameSpeed + Math.random()*1.2,
      wobble: false, jumper: !!t.jumper,
      jumpVy: t.jumper ? JUMP_VEL*0.5 : 0,
      isGiant,
    });
  }
}

/* ===== PARTICLES ===== */
function spawnHitParticles(x, y) {
  const colors = ['#FF6B6B','#FFD700','#FF69B4','#87CEEB','#98FB98'];
  for (let i=0; i<10; i++) {
    const angle = (Math.PI*2/10)*i;
    const sp    = 2.5 + Math.random()*3;
    particles.push({
      x, y,
      vx: Math.cos(angle)*sp, vy: Math.sin(angle)*sp - 2,
      life: 45+Math.random()*20,
      color: colors[Math.floor(Math.random()*colors.length)],
      size: 8+Math.random()*8, rot: Math.random()*Math.PI*2,
    });
  }
}

/* ===== RENDER ===== */
function render() {
  ctx.clearRect(0,0,W(),H());

  drawSky();
  drawClouds();
  drawHills();
  drawGround();
  drawBuildings();
  drawObstacles();
  drawPlayers();
  drawParticles();
}

/* ===== SKY ===== */
const SKY_PALETTES = [
  { top:'#87CEEB', bot:'#E0F4FF' },  // day
  { top:'#FF7043', bot:'#FFB347' },  // sunset
  { top:'#1A237E', bot:'#283593' },  // night
];
function drawSky() {
  const {top, bot} = SKY_PALETTES[skyPhase];
  const g = ctx.createLinearGradient(0,0,0,H()*GROUND_RATIO);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W(),H()*GROUND_RATIO);

  // Stars at night
  if (skyPhase===2) {
    ctx.fillStyle='rgba(255,255,255,0.9)';
    for (let i=0; i<40; i++) {
      const sx = ((i*137+globalTick*0.05)%1) * W();
      const sy = ((i*97)%1) * H()*0.55;
      const sr = 1.2 + Math.sin(globalTick*0.04+i)*0.6;
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    }
  }
  // Sun / Moon
  if (skyPhase===0) {
    ctx.fillStyle='#FFD700';
    ctx.beginPath(); ctx.arc(W()*0.85, H()*0.12, 34, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,150,0.3)';
    ctx.beginPath(); ctx.arc(W()*0.85, H()*0.12, 50, 0, Math.PI*2); ctx.fill();
  } else if (skyPhase===2) {
    ctx.fillStyle='#FFFDE7';
    ctx.beginPath(); ctx.arc(W()*0.82, H()*0.1, 26, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#1A237E';
    ctx.beginPath(); ctx.arc(W()*0.82-10, H()*0.1-8, 20, 0, Math.PI*2); ctx.fill();
  }
}

/* ===== CLOUDS (canvas shapes, no emoji) ===== */
function drawCloud(c) {
  const alpha = skyPhase===2 ? c.alpha*0.5 : c.alpha;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = skyPhase===0 ? '#fff' : (skyPhase===1 ? '#FFCCBC' : '#7986CB');
  for (let p=0; p<c.puffs; p++) {
    const ox = (p - (c.puffs-1)*0.5) * c.r * 0.85;
    const oy = p===0 ? 0 : c.r*0.25;
    ctx.beginPath();
    ctx.arc(c.x+ox, c.y+oy, c.r*(p===0?1:0.7), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}
function drawClouds() {
  bgClouds.forEach(c => drawCloud(c));
}

/* ===== HILLS (mid-layer) ===== */
const HILL_COLORS = [
  '#66BB6A', // grass
  '#FFF176', // sand
  '#B0BEC5', // rocky
];
function drawHills() {
  bgHills.forEach(h => {
    const color = HILL_COLORS[h.hue % HILL_COLORS.length];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(h.x, H()*GROUND_RATIO);
    ctx.quadraticCurveTo(h.x + h.w*0.5, H()*GROUND_RATIO - h.h, h.x+h.w, H()*GROUND_RATIO);
    ctx.closePath();
    ctx.fill();
  });
}

/* ===== GROUND ===== */
function drawGround() {
  const gY    = H()*GROUND_RATIO;
  const scene = SCENES[sceneIndex];
  const g     = ctx.createLinearGradient(0,gY,0,H());
  g.addColorStop(0, scene.groundTop);
  g.addColorStop(1, scene.groundBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, gY, W(), H()-gY);

  // Ground line
  ctx.strokeStyle = scene.groundBot;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,gY); ctx.lineTo(W(),gY); ctx.stroke();

  // Repeating ground dashes
  ctx.strokeStyle='rgba(255,255,255,0.25)';
  ctx.lineWidth=2;
  ctx.setLineDash([20,30]);
  const dashY = gY+8;
  ctx.beginPath(); ctx.moveTo(0,dashY); ctx.lineTo(W(),dashY); ctx.stroke();
  ctx.setLineDash([]);
}

/* ===== BUILDINGS (near layer) ===== */
const BUILDING_PALETTES = [
  ['#EF9A9A','#E57373'],  // farm – barn red
  ['#80CBC4','#4DB6AC'],  // beach – teal
  ['#90A4AE','#607D8B'],  // city – slate
  ['#A5D6A7','#66BB6A'],  // forest – green
  ['#E1F5FE','#B3E5FC'],  // snow – icy
  ['#CE93D8','#AB47BC'],  // carnival – purple
];
function drawBuilding(b) {
  const palette = BUILDING_PALETTES[sceneIndex] || BUILDING_PALETTES[0];
  const gY = H()*GROUND_RATIO;
  const x  = b.x, w=b.w, h=b.h;
  const y  = gY - h;

  // Body
  ctx.fillStyle = palette[0];
  ctx.fillRect(x, y, w, h);

  // Darker side face
  ctx.fillStyle = palette[1];
  ctx.fillRect(x+w, y+4, 8, h-4);

  // Roof
  ctx.fillStyle = palette[1];
  ctx.fillRect(x-2, y-6, w+4, 10);

  // Windows
  ctx.fillStyle = skyPhase===2 ? '#FFF59D' : 'rgba(255,255,255,0.6)';
  for (let r=0; r<b.windows; r++) {
    for (let c=0; c<2; c++) {
      const wx = x + 8 + c*(w*0.42);
      const wy = y + 14 + r*22;
      ctx.fillRect(wx, wy, w*0.18, 12);
    }
  }
}
function drawBuildings() {
  bgBuildings.forEach(b => drawBuilding(b));
}

/* ===== OBSTACLES (canvas shapes, no emoji) ===== */
function drawObstacles() {
  obstacles.forEach(o => {
    ctx.save();
    // Pixel-snap to remove sub-pixel flicker
    const ox = Math.round(o.x);
    const oy = Math.round(o.y);
    drawObstacleShape(o, ox, oy);
    ctx.restore();
  });
}

function drawObstacleShape(o, x, y) {
  const w=o.w, h=o.h;
  switch(o.type) {
    case 'duck':
    case 'goose': {
      // Body
      ctx.fillStyle=o.color;
      ctx.strokeStyle='#333'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.62,w*0.38,h*0.34,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Head
      ctx.fillStyle=o.color;
      ctx.beginPath(); ctx.ellipse(x+w*0.65,y+h*0.27,w*0.2,h*0.2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Bill
      ctx.fillStyle=o.accent;
      ctx.beginPath(); ctx.ellipse(x+w*0.84,y+h*0.27,w*0.12,h*0.08,0.3,0,Math.PI*2); ctx.fill();
      // Eye
      ctx.fillStyle='#333';
      ctx.beginPath(); ctx.arc(x+w*0.72,y+h*0.23,2.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(x+w*0.73,y+h*0.22,1,0,Math.PI*2); ctx.fill();
      // Legs
      ctx.strokeStyle=o.accent; ctx.lineWidth=2.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x+w*0.4,y+h*0.9); ctx.lineTo(x+w*0.38,y+h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+w*0.58,y+h*0.9); ctx.lineTo(x+w*0.56,y+h); ctx.stroke();
      // Giant badge
      if (o.isGiant) {
        ctx.fillStyle='#FF1744'; ctx.font='bold 11px Nunito,sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText('GIANT!',x+w*0.5,y-2);
      }
      break;
    }
    case 'box': {
      ctx.fillStyle=o.color; ctx.strokeStyle=o.accent; ctx.lineWidth=2.5;
      ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
      // Cross
      ctx.strokeStyle=o.accent; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w,y+h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+w,y); ctx.lineTo(x,y+h); ctx.stroke();
      break;
    }
    case 'hay': {
      ctx.fillStyle=o.color; ctx.strokeStyle=o.accent; ctx.lineWidth=2;
      roundRect(ctx, x,y,w,h,10); ctx.fill(); ctx.stroke();
      // Lines
      ctx.strokeStyle=o.accent; ctx.lineWidth=1.5;
      for (let i=1;i<3;i++) {
        ctx.beginPath(); ctx.moveTo(x,y+h*i/3); ctx.lineTo(x+w,y+h*i/3); ctx.stroke();
      }
      break;
    }
    case 'rock': {
      ctx.fillStyle=o.color; ctx.strokeStyle=o.accent; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(x+w*0.2,y+h); ctx.lineTo(x,y+h*0.6);
      ctx.lineTo(x+w*0.1,y+h*0.3); ctx.lineTo(x+w*0.5,y);
      ctx.lineTo(x+w*0.85,y+h*0.25); ctx.lineTo(x+w,y+h*0.65);
      ctx.lineTo(x+w*0.8,y+h); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'frog': {
      // Body
      ctx.fillStyle=o.color; ctx.strokeStyle='#333'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.6,w*0.37,h*0.34,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Head
      ctx.fillStyle=o.color;
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.3,w*0.3,h*0.22,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Eyes
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(x+w*0.33,y+h*0.18,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x+w*0.67,y+h*0.18,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#1B5E20';
      ctx.beginPath(); ctx.arc(x+w*0.33,y+h*0.18,2.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+w*0.67,y+h*0.18,2.5,0,Math.PI*2); ctx.fill();
      // Mouth
      ctx.strokeStyle='#1B5E20'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.arc(x+w*0.5,y+h*0.35,5,0.1,Math.PI-0.1); ctx.stroke();
      break;
    }
    case 'cactus': {
      ctx.fillStyle=o.color; ctx.strokeStyle=o.accent; ctx.lineWidth=2;
      // Main trunk
      ctx.fillRect(x+w*0.3,y,w*0.4,h); ctx.strokeRect(x+w*0.3,y,w*0.4,h);
      // Left arm
      ctx.fillRect(x,y+h*0.28,w*0.3+1,h*0.14); ctx.strokeRect(x,y+h*0.28,w*0.31,h*0.14);
      ctx.fillRect(x,y+h*0.1,w*0.14,h*0.2); ctx.strokeRect(x,y+h*0.1,w*0.14,h*0.2);
      // Right arm
      ctx.fillRect(x+w*0.7,y+h*0.38,w*0.3,h*0.14); ctx.strokeRect(x+w*0.7,y+h*0.38,w*0.3,h*0.14);
      ctx.fillRect(x+w*0.86,y+h*0.2,w*0.14,h*0.2); ctx.strokeRect(x+w*0.86,y+h*0.2,w*0.14,h*0.2);
      break;
    }
    case 'bird': {
      // Body
      ctx.fillStyle=o.color; ctx.strokeStyle='#B71C1C'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.5,w*0.3,h*0.38,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Head
      ctx.fillStyle=o.color;
      ctx.beginPath(); ctx.ellipse(x+w*0.2,y+h*0.3,w*0.16,h*0.22,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Wings animated
      const wFlap = Math.sin(o.tick*0.15)*0.35;
      ctx.fillStyle=o.accent;
      ctx.save();
      ctx.translate(x+w*0.5,y+h*0.5);
      ctx.rotate(-wFlap);
      ctx.beginPath(); ctx.ellipse(-w*0.04,0,w*0.38,h*0.15,-0.3,0,Math.PI*2); ctx.fill();
      ctx.rotate(wFlap*2);
      ctx.beginPath(); ctx.ellipse(w*0.04,0,w*0.38,h*0.15,0.3,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // Beak
      ctx.fillStyle='#FFA726';
      ctx.beginPath(); ctx.moveTo(x+w*0.04,y+h*0.3); ctx.lineTo(x,y+h*0.24); ctx.lineTo(x+w*0.04,y+h*0.38); ctx.fill();
      break;
    }
    case 'ufo': {
      // Saucer
      ctx.fillStyle=o.color; ctx.strokeStyle=o.accent; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.65,w*0.48,h*0.32,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      // Dome
      ctx.fillStyle='rgba(178,235,242,0.8)';
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.55,w*0.25,h*0.35,-0.1,Math.PI,0); ctx.fill();
      ctx.strokeStyle=o.accent; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.55,w*0.25,h*0.35,-0.1,Math.PI,0); ctx.stroke();
      // Lights
      const lightCols=['#F44336','#FFEA00','#4CAF50'];
      for (let i=0;i<3;i++) {
        ctx.fillStyle = lightCols[i];
        const blink = Math.sin(o.tick*0.12+i*1.2)>0.2;
        ctx.globalAlpha = blink?1:0.3;
        ctx.beginPath(); ctx.arc(x+w*(0.3+i*0.2),y+h*0.72,3.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }
      // Beam
      const beamAlpha=0.12+Math.abs(Math.sin(o.tick*0.04))*0.14;
      ctx.fillStyle=`rgba(255,255,100,${beamAlpha})`;
      ctx.beginPath(); ctx.moveTo(x+w*0.35,y+h); ctx.lineTo(x+w*0.65,y+h);
      ctx.lineTo(x+w*0.7,y+h+60); ctx.lineTo(x+w*0.3,y+h+60); ctx.closePath(); ctx.fill();
      break;
    }
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
  c.closePath();
}

/* ===== PLAYER DRAWING — cute baby girl with long hair ===== */
// Skin/hair/dress palettes per player
const PLAYER_PALETTES = [
  { skin:'#FFCC99', skinDark:'#E8A87C', hair:'#5D2E0C', dress:'#FF80AB', dressAcc:'#F50057', shoe:'#D32F2F' },
  { skin:'#FFE0B2', skinDark:'#FFCCBB', hair:'#1565C0', dress:'#82B1FF', dressAcc:'#2979FF', shoe:'#1A237E' },
];

function drawPlayers() {
  players.forEach((p, idx) => {
    if (p.dead) return;
    // Blink during invincibility
    if (p.invincible > 0 && Math.floor(p.invincible/7)%2===0) return;

    const pal = PLAYER_PALETTES[idx];
    ctx.save();
    const cx = Math.round(p.x + PLAYER_W/2);
    const cy = Math.round(p.y + PLAYER_H);
    ctx.translate(cx, cy);
    ctx.scale(p.squash, p.stretch);

    drawGirlCharacter(pal, p, idx);

    ctx.restore();

    // Name tag above
    ctx.save();
    ctx.font='bold 10px Nunito,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillText(state.names[idx].slice(0,8), Math.round(p.x+PLAYER_W/2), Math.round(p.y)-3);
    ctx.restore();
  });
}

function drawGirlCharacter(pal, p, idx) {
  // Heights relative to bottom (cy=0 = ground contact)
  const LEG_BOT  = 0;
  const WAIST    = -36;
  const SHOULDER = -56;
  const NECK     = -60;
  const HEAD_CY  = -72;
  const HEAD_R   = 13;

  // === LEGS ===
  const legSwing = p.onGround ? Math.sin(p.runFrame/6*Math.PI*2)*7 : 0;
  ctx.strokeStyle=pal.skin; ctx.lineWidth=9; ctx.lineCap='round';
  // left leg
  ctx.beginPath(); ctx.moveTo(-7,WAIST); ctx.lineTo(-7-legSwing, LEG_BOT); ctx.stroke();
  // right leg
  ctx.beginPath(); ctx.moveTo(7,WAIST); ctx.lineTo(7+legSwing, LEG_BOT); ctx.stroke();
  // Shoes
  ctx.fillStyle=pal.shoe;
  ctx.beginPath(); ctx.ellipse(-7-legSwing, LEG_BOT, 7, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7+legSwing, LEG_BOT, 7, 4, 0, 0, Math.PI*2); ctx.fill();

  // === DRESS / SKIRT ===
  ctx.fillStyle=pal.dress;
  ctx.beginPath();
  ctx.moveTo(-11,SHOULDER);
  ctx.lineTo(-16,WAIST); ctx.lineTo(16,WAIST); ctx.lineTo(11,SHOULDER);
  ctx.closePath(); ctx.fill();
  // Skirt flare
  ctx.beginPath();
  ctx.moveTo(-16,WAIST); ctx.quadraticCurveTo(-20,WAIST+14,-8,LEG_BOT);
  ctx.lineTo(8,LEG_BOT); ctx.quadraticCurveTo(20,WAIST+14,16,WAIST);
  ctx.closePath(); ctx.fill();
  // Dress accent (collar stripe)
  ctx.fillStyle=pal.dressAcc;
  ctx.beginPath(); ctx.moveTo(-11,SHOULDER); ctx.lineTo(11,SHOULDER);
  ctx.lineTo(8,SHOULDER-4); ctx.lineTo(-8,SHOULDER-4); ctx.closePath(); ctx.fill();

  // === ARMS ===
  const armSwing = p.onGround ? Math.sin(p.runFrame/6*Math.PI*2+Math.PI)*9 : 0;
  ctx.strokeStyle=pal.skin; ctx.lineWidth=7; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-11,SHOULDER); ctx.lineTo(-17+armSwing, WAIST-4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11,SHOULDER);  ctx.lineTo(17-armSwing, WAIST-4);  ctx.stroke();

  // Flying wings
  if (p.flying) {
    const wFlap = Math.sin(globalTick*0.2)*14;
    ctx.fillStyle='rgba(255,245,157,0.85)';
    ctx.strokeStyle=pal.dressAcc; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(-18, SHOULDER-4+wFlap, 14, 8, -0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse( 18, SHOULDER-4-wFlap, 14, 8,  0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // sparkle trail
    if (Math.floor(globalTick)%5===0) {
      particles.push({
        x: p.x+PLAYER_W/2+(Math.random()-0.5)*20,
        y: p.y+PLAYER_H*0.5,
        vx:(Math.random()-0.5)*1.5, vy:0.8+Math.random(),
        life:20+Math.random()*10, color:'#FFF176', size:4+Math.random()*4, rot:0,
      });
    }
  }

  // === BODY ===
  ctx.fillStyle=pal.skin;
  ctx.beginPath();
  ctx.ellipse(0,NECK,8,10,0,0,Math.PI*2); ctx.fill();

  // === LONG HAIR (back) ===
  ctx.fillStyle=pal.hair;
  // Back hair flowing down
  ctx.beginPath();
  ctx.moveTo(-12,HEAD_CY-10);
  ctx.quadraticCurveTo(-18,SHOULDER+6,-12,WAIST+12);
  ctx.quadraticCurveTo(-6,WAIST+20,0,SHOULDER+2);
  ctx.quadraticCurveTo(6,WAIST+20,12,WAIST+12);
  ctx.quadraticCurveTo(18,SHOULDER+6,12,HEAD_CY-10);
  ctx.closePath(); ctx.fill();

  // === HEAD ===
  ctx.fillStyle=pal.skin;
  ctx.strokeStyle='#C9956C'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(0,HEAD_CY,HEAD_R,0,Math.PI*2); ctx.fill(); ctx.stroke();

  // Cheeks
  ctx.fillStyle='rgba(255,160,140,0.5)';
  ctx.beginPath(); ctx.ellipse(-HEAD_R+4,HEAD_CY+2,4,3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( HEAD_R-4,HEAD_CY+2,4,3,0,0,Math.PI*2); ctx.fill();

  // Eyes — big anime style
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.ellipse(-5,HEAD_CY-1,4,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 5,HEAD_CY-1,4,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5D4037';
  ctx.beginPath(); ctx.ellipse(-5,HEAD_CY,2.5,3.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 5,HEAD_CY,2.5,3.5,0,0,Math.PI*2); ctx.fill();
  // Pupil shine
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-4,HEAD_CY-1,1.2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 6,HEAD_CY-1,1.2,0,Math.PI*2); ctx.fill();
  // Eyelashes
  ctx.strokeStyle='#333'; ctx.lineWidth=1;
  for (let e=-1;e<=1;e+=2) {
    ctx.beginPath(); ctx.moveTo(e*2,HEAD_CY-5); ctx.lineTo(e*3.5,HEAD_CY-8); ctx.stroke();
  }

  // Smile / expression
  ctx.strokeStyle='#C97070'; ctx.lineWidth=1.5;
  if (p.flying) {
    // "O" excited mouth
    ctx.beginPath(); ctx.arc(0,HEAD_CY+5,3,0,Math.PI*2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0,HEAD_CY+4,5,0.15,Math.PI-0.15); ctx.stroke();
  }

  // === FRONT HAIR + BANGS ===
  ctx.fillStyle=pal.hair;
  ctx.beginPath();
  ctx.arc(0,HEAD_CY,HEAD_R+1,Math.PI,0); // top arc
  ctx.quadraticCurveTo(HEAD_R+2,HEAD_CY+4, HEAD_R,HEAD_CY+2);
  ctx.quadraticCurveTo(4,HEAD_CY-5,0,HEAD_CY-1);
  ctx.quadraticCurveTo(-4,HEAD_CY-5,-HEAD_R,HEAD_CY+2);
  ctx.quadraticCurveTo(-HEAD_R-2,HEAD_CY+4,-HEAD_R-1,HEAD_CY);
  ctx.closePath(); ctx.fill();

  // Hair bow / accessory
  ctx.fillStyle= idx===0 ? '#FF80AB' : '#82B1FF';
  drawBow(ctx, HEAD_R-4, HEAD_CY-HEAD_R-3, 8);
}

function drawBow(ctx2, x, y, r) {
  ctx2.save();
  ctx2.translate(x,y);
  // Two petals
  ctx2.fillStyle=ctx2.fillStyle;
  ctx2.beginPath(); ctx2.ellipse(-r,0,r,r*0.55, 0.5,0,Math.PI*2); ctx2.fill();
  ctx2.beginPath(); ctx2.ellipse( r,0,r,r*0.55,-0.5,0,Math.PI*2); ctx2.fill();
  // Center dot
  ctx2.fillStyle='#fff';
  ctx2.beginPath(); ctx2.arc(0,0,r*0.35,0,Math.PI*2); ctx2.fill();
  ctx2.restore();
}

/* ===== DRAW PARTICLES ===== */
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life/35));
    ctx.translate(p.x,p.y); ctx.rotate(p.rot||0);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
    ctx.restore();
  });
}

/* ===== HUD ===== */
function updateHUD() {
  document.getElementById('hud-p1-name').textContent  = state.names[0];
  document.getElementById('hud-p1-ducks').textContent = state.ducks[0];
  if (state.mode===2) {
    document.getElementById('hud-p2-name').textContent  = state.names[1];
    document.getElementById('hud-p2-ducks').textContent = state.ducks[1];
  }
  const tEl = document.getElementById('hud-timer');
  tEl.textContent = `⏱ ${state.timeLeft}s`;
  tEl.classList.toggle('urgent', state.timeLeft<=10);
  document.getElementById('hud-scene').textContent = SCENES[sceneIndex]?.name || '';
}

/* ===== END GAME ===== */
function endGame() {
  state.running = false;
  cancelAnimationFrame(animFrame);
  render();
  setTimeout(showWinScreen, 400);
}

function showWinScreen() {
  showScreen('win-screen');
  playVictory();

  const subs = document.getElementById('win-subs');
  subs.innerHTML = state.names.slice(0,state.mode).map(
    (n,i)=>`<div>🏅 <b>${escHtml(n)}</b> dodged <b>${state.ducks[i]}</b> ducks!</div>`
  ).join('');

  // Confetti canvas
  const cc   = document.getElementById('confettiCanvas');
  cc.width   = window.innerWidth;
  cc.height  = window.innerHeight;
  const cctx = cc.getContext('2d');
  const confColors = ['#FF6B6B','#FFD700','#87DB87','#56C8E0','#B088F9','#FF69B4','#FFA500'];
  const cp = Array.from({length:180},()=>({
    x: Math.random()*cc.width, y: -10-Math.random()*cc.height*0.6,
    w: 9+Math.random()*12, h: 4+Math.random()*7,
    vx:(Math.random()-0.5)*3, vy:2.5+Math.random()*4,
    rot:Math.random()*Math.PI*2, rotV:(Math.random()-0.5)*0.18,
    color:confColors[Math.floor(Math.random()*confColors.length)],
  }));
  let cfRun=true;
  (function cfLoop(){
    if(!cfRun)return;
    cctx.clearRect(0,0,cc.width,cc.height);
    cp.forEach(c=>{
      c.x+=c.vx; c.y+=c.vy; c.rot+=c.rotV;
      if(c.y>cc.height) c.y=-10;
      cctx.save(); cctx.translate(c.x,c.y); cctx.rotate(c.rot);
      cctx.fillStyle=c.color; cctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);
      cctx.restore();
    });
    requestAnimationFrame(cfLoop);
  })();

  // Scores (no reward yet)
  for(let i=0;i<state.mode;i++) saveScore(state.names[i],state.ducks[i],0,0,state.gameDuration);

  giftOpened=false;
  document.getElementById('gift-box').style.transform='';
  document.getElementById('gift-box').querySelector('.gift-label').textContent='Click to Open!';
  document.getElementById('gift-box').querySelector('.gift-lid').textContent='🎁';
  document.getElementById('reward-display').classList.add('hidden');
  document.getElementById('reward-display').innerHTML='';
}

/* ===== GIFT BOX ===== */
function openGift() {
  if(giftOpened)return;
  giftOpened=true;
  playCoin();
  const box=document.getElementById('gift-box');
  box.style.transform='scale(1.4) rotate(12deg)';
  setTimeout(()=>{
    box.style.transform='';
    box.querySelector('.gift-lid').textContent='🎊';
    box.querySelector('.gift-label').textContent='🎉 Opened!';
    const rewards=[];
    for(let i=0;i<state.mode;i++){
      const gold    =[25,50,75,100,150][Math.floor(Math.random()*5)];
      const diamonds=[1,2,3,5,10][Math.floor(Math.random()*5)];
      rewards.push({name:state.names[i],gold,diamonds});
      saveScore(state.names[i],state.ducks[i],gold,diamonds,state.gameDuration);
    }
    const rd=document.getElementById('reward-display');
    rd.classList.remove('hidden');
    rd.innerHTML=rewards.map(r=>
      `<div class="reward-item">🥇 ${escHtml(r.name)}: +${r.gold} Gold  &nbsp;💎 +${r.diamonds} Diamonds</div>`
    ).join('');
    playCoin();
  },420);
}

/* ===== LEADERBOARD ===== */
function saveScore(name,ducks,gold,diamonds,time){
  const s=loadScores();
  s.push({name,ducks,gold,diamonds,time});
  s.sort((a,b)=>b.ducks-a.ducks||b.gold-a.gold);
  try{ localStorage.setItem('jumpingDuckScores',JSON.stringify(s.slice(0,20))); }catch(e){}
}
function loadScores(){
  try{ return JSON.parse(localStorage.getItem('jumpingDuckScores')||'[]'); }catch(e){return [];}
}

/* ===== SCREEN SWITCHING ===== */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='';});
  const el=document.getElementById(id);
  el.classList.add('active'); el.style.display='flex';
}
function goMenu(){
  state.running=false;
  cancelAnimationFrame(animFrame);
  clearInterval(gameTimer);
  showScreen('menu-screen');
  renderLeaderboard();
}

/* ===== INIT ===== */
buildTitle();
spawnMenuDucks();
renderLeaderboard();
showScreen('menu-screen');
