// ============================================================
//  JUMPING DUCK — v4
//  + Ceiling obstacles (bat, thundercloud, hawk, icicle)
//  + Redesigned smooth rabbit / cat characters
//  + Layered gradient feather angel wings
// ============================================================

/* ===== CANVAS ===== */
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
const GROUND_RATIO  = 0.80;
const CEILING_RATIO = 0.12;
const GRAVITY       = 0.52;
const JUMP_VEL      = -14;
const FLY_BURST     = -11;
const MAX_FALL      = 14;
const PLAYER_W      = 60;
const PLAYER_H      = 100;

/* ===== OBSTACLE DEFINITIONS ===== */
const GROUND_OBSTACLES = [
  { type:'duck',   w:54, h:54, color:'#FFCA28', accent:'#F57F17' },
  { type:'goose',  w:62, h:62, color:'#ECEFF1', accent:'#90A4AE' },
  { type:'box',    w:48, h:48, color:'#A1887F', accent:'#5D4037' },
  { type:'hay',    w:56, h:44, color:'#FFE082', accent:'#F9A825' },
  { type:'rock',   w:52, h:38, color:'#B0BEC5', accent:'#546E7A' },
  { type:'frog',   w:46, h:46, color:'#66BB6A', accent:'#2E7D32', jumper:true },
  { type:'cactus', w:36, h:62, color:'#43A047', accent:'#1B5E20' },
];
const AIR_OBSTACLES = [
  { type:'bird', w:60, h:36, color:'#EF5350', accent:'#B71C1C', floatFrac:0.44 },
  { type:'ufo',  w:68, h:32, color:'#7E57C2', accent:'#311B92', floatFrac:0.38 },
];
// Ceiling obstacles — spawn near top to punish flying up
const CEILING_OBSTACLES = [
  { type:'bat',          w:68, h:52, color:'#4A148C', accent:'#E040FB', ceilFrac:0.13 },
  { type:'thundercloud', w:100,h:64, color:'#455A64', accent:'#263238', ceilFrac:0.12 },
  { type:'hawk',         w:86, h:58, color:'#6D4C41', accent:'#3E2723', ceilFrac:0.13 },
  { type:'icicle',       w:80, h:76, color:'#B3E5FC', accent:'#03A9F4', ceilFrac:0.12 },
];

/* ===== TITLE ===== */
const TITLE_TEXT   = 'JUMPING DUCK';
const TITLE_COLORS = ['#FF6B6B','#FFB347','#FFD700','#87DB87','#56C8E0','#B088F9',
                      '#FF6B6B','#FFB347','#FFD700','#87DB87','#56C8E0','#B088F9'];

/* ===== STATE ===== */
let state = {
  screen: 'menu', mode: 1,
  names: ['Player 1','Player 2'],
  gameDuration: 45, timeLeft: 45,
  ducks: [0,0], running: false, muted: false,
};
let lastTime = 0, animFrame = null;

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
  const c = document.getElementById('menuDucks');
  c.innerHTML = '';
  ['🦆','🐥','🐤','🦢','🐣'].forEach((e) => {
    const d = document.createElement('div');
    d.className = 'menu-duck'; d.textContent = e;
    const dur = 8 + Math.random()*10;
    d.style.bottom = `${5+Math.random()*18}%`;
    d.style.animationDuration = `${dur}s`;
    d.style.animationDelay    = `${Math.random()*-dur}s`;
    d.style.fontSize = `${1.8+Math.random()*1.4}rem`;
    c.appendChild(d);
  });
}
function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  const scores = loadScores();
  if (!scores.length) { list.innerHTML='<div class="lb-empty">No scores yet — be the first!</div>'; return; }
  list.innerHTML = scores.slice(0,7).map((s,i)=>
    `<div class="lb-row"><span class="lb-rank">${i+1}.</span>
     <span class="lb-name">${esc(s.name)}</span>
     <span>🦆${s.ducks}</span><span>🥇${s.gold}</span>
     <span>💎${s.diamonds}</span><span>${s.time}s</span></div>`).join('');
}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ===== MENU BUTTONS ===== */
let chosenMode = 1;
document.getElementById('btn1p').addEventListener('click', () => {
  chosenMode=1; document.getElementById('p2-group').classList.add('hidden');
  document.getElementById('name-form').classList.remove('hidden');
});
document.getElementById('btn2p').addEventListener('click', () => {
  chosenMode=2; document.getElementById('p2-group').classList.remove('hidden');
  document.getElementById('name-form').classList.remove('hidden');
});
document.getElementById('btn-start').addEventListener('click', () => {
  state.names=[
    document.getElementById('p1name').value.trim()||'Player 1',
    document.getElementById('p2name').value.trim()||'Player 2',
  ];
  state.mode=chosenMode; startGame();
});

/* ===== GAME VARS ===== */
let players=[],obstacles=[],particles=[];
let bgClouds=[],bgHills=[],bgBuildings=[];
let skyPhase=0,skyPhaseClock=0;
const SKY_PHASE_DUR=22;
let sceneIndex=0,sceneClock=0;
const SCENE_DUR=20;
const SCENES=[
  {name:'🌾 Farm Fields', groundTop:'#8BC34A',groundBot:'#558B2F'},
  {name:'🏖️ Sunny Beach', groundTop:'#FFD54F',groundBot:'#F9A825'},
  {name:'🏙️ City Streets',groundTop:'#78909C',groundBot:'#546E7A'},
  {name:'🌲 Forest Path', groundTop:'#43A047',groundBot:'#2E7D32'},
  {name:'❄️ Snowy Hills', groundTop:'#E3F2FD',groundBot:'#BBDEFB'},
  {name:'🎪 Carnival',    groundTop:'#CE93D8',groundBot:'#AB47BC'},
];
let gameSpeed=3,gameTimer=null,giftOpened=false,globalTick=0;
let obstSpawnTimer=0,obstSpawnInterval=130;

/* ===== START GAME ===== */
function startGame() {
  cancelAnimationFrame(animFrame); clearInterval(gameTimer);
  const durs=[30,45,60];
  state.gameDuration=durs[Math.floor(Math.random()*durs.length)];
  state.timeLeft=state.gameDuration; state.ducks=[0,0]; state.running=true; giftOpened=false;
  gameSpeed=3; obstacles=[]; particles=[];
  skyPhase=0; skyPhaseClock=0; sceneIndex=0; sceneClock=0; globalTick=0;
  obstSpawnTimer=0; obstSpawnInterval=130;
  resizeCanvas(); setupPlayers(); setupBackground(); updateHUD();
  showScreen('game-screen');
  document.getElementById('hud-p2').style.display   = state.mode===2?'flex':'none';
  document.getElementById('mob-col2').style.display = state.mode===2?'flex':'none';
  gameTimer = setInterval(()=>{
    state.timeLeft--; updateHUD();
    if(state.timeLeft<=0){clearInterval(gameTimer);endGame();}
  },1000);
  lastTime=performance.now();
  animFrame=requestAnimationFrame(gameLoop);
}

/* ===== PLAYERS ===== */
function setupPlayers() {
  const gY=H()*GROUND_RATIO;
  players=[];
  for(let i=0;i<state.mode;i++) {
    players.push({
      x:90+i*80, y:gY-PLAYER_H, vy:0,
      onGround:true, dead:false, deadTimer:0,
      runFrame:0, runTick:0,
      squash:1, stretch:1, invincible:0,
      jumpRequest:false, flyRequest:false, wingFlapTick:0,
    });
  }
}

/* ===== BACKGROUND ===== */
function setupBackground() {
  bgClouds    = Array.from({length:12},()=>makeCloud(Math.random()*W()*2.5));
  bgHills     = Array.from({length:7}, ()=>makeHill( Math.random()*W()*3));
  bgBuildings = Array.from({length:6}, ()=>makeBuilding(Math.random()*W()*1.5));
}
function makeCloud(x){
  return{x,y:28+Math.random()*H()*.30,r:20+Math.random()*26,
    speed:.15+Math.random()*.20,alpha:.72+Math.random()*.28,puffs:2+Math.floor(Math.random()*3)};
}
function makeHill(x){
  return{x,w:180+Math.random()*220,h:80+Math.random()*110,speed:.80+Math.random()*.25,col:Math.floor(Math.random()*3)};
}
function makeBuilding(x){
  return{x,w:40+Math.random()*60,h:65+Math.random()*110,speed:1.9+Math.random()*.5,windows:1+Math.floor(Math.random()*4)};
}

/* ===== KEYS ===== */
const keys={};
window.addEventListener('keydown',e=>{
  if(!keys[e.code]){
    if(e.code==='Space')   players[0]&&(players[0].jumpRequest=true);
    if(e.code==='KeyW')    players[0]&&(players[0].flyRequest=true);
    if(e.code==='ArrowUp') players[1]&&(players[1].jumpRequest=true);
    if(e.code==='Enter')   players[1]&&(players[1].flyRequest=true);
  }
  keys[e.code]=true;
  if(['Space','ArrowUp','ArrowDown','KeyW','Enter'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
const mobileState={};
function mobileTouchStart(id){
  mobileState[id]=true;
  if(id==='jump1'&&players[0]) players[0].jumpRequest=true;
  if(id==='jump2'&&players[1]) players[1].jumpRequest=true;
  if(id==='fly1' &&players[0]) players[0].flyRequest=true;
  if(id==='fly2' &&players[1]) players[1].flyRequest=true;
}
function mobileTouchEnd(id){mobileState[id]=false;}

/* ===== MUTE ===== */
document.getElementById('btn-mute').addEventListener('click',()=>{
  state.muted=!state.muted;
  document.getElementById('btn-mute').textContent=state.muted?'🔇':'🔊';
});

/* ===== AUDIO ===== */
let audioCtx=null;
function getAC(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function tone(freq,type='sine',dur=0.1,vol=0.25){
  if(state.muted)return;
  try{const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(vol,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.start();o.stop(ac.currentTime+dur);}catch(e){}
}
const playJump=()=>tone(440,'square',.13,.22);
const playFly= ()=>tone(660,'sine',.10,.15);
const playQuack=()=>tone(280,'sawtooth',.22,.30);
const playVictory=()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,'triangle',.28,.38),i*130));
const playCoin=()=>{tone(880,'sine',.1,.36);setTimeout(()=>tone(1320,'sine',.1,.36),110);};

/* ===== GAME LOOP ===== */
function gameLoop(ts){
  const dt=Math.min((ts-lastTime)/16.667,3);
  lastTime=ts; globalTick+=dt;
  update(dt); render();
  if(state.running) animFrame=requestAnimationFrame(gameLoop);
}

/* ===== UPDATE ===== */
function update(dt){
  if(!state.running)return;
  skyPhaseClock+=dt/60; if(skyPhaseClock>SKY_PHASE_DUR){skyPhaseClock=0;skyPhase=(skyPhase+1)%3;}
  sceneClock   +=dt/60; if(sceneClock>SCENE_DUR)        {sceneClock=0;  sceneIndex=(sceneIndex+1)%SCENES.length;}
  gameSpeed=3+(state.gameDuration-state.timeLeft)*0.04;

  /* PLAYERS */
  players.forEach((p,idx)=>{
    if(p.dead){p.deadTimer+=dt;if(p.deadTimer>100){p.dead=false;p.invincible=150;p.deadTimer=0;}return;}
    if(p.invincible>0) p.invincible-=dt;
    const ceilY  = H()*CEILING_RATIO;
    const groundY= H()*GROUND_RATIO-PLAYER_H;

    if(p.jumpRequest&&p.onGround){
      p.vy=JUMP_VEL; p.onGround=false; p.squash=.65; p.stretch=1.4; playJump();
    }
    p.jumpRequest=false;

    if(p.flyRequest){
      p.vy= p.onGround ? JUMP_VEL*.75 : FLY_BURST;
      if(p.onGround) p.onGround=false;
      p.wingFlapTick=30; playFly();
    }
    p.flyRequest=false;
    if(p.wingFlapTick>0) p.wingFlapTick-=dt;

    p.vy=Math.min(p.vy+GRAVITY*dt,MAX_FALL);
    p.y+=p.vy*dt;
    if(p.y<ceilY){p.y=ceilY;p.vy=Math.max(p.vy,0);}
    if(p.y>=groundY){p.y=groundY;p.vy=0;p.onGround=true;if(p.squash<.9){p.squash=1.3;p.stretch=.7;}}
    p.squash +=(1-p.squash) *.18*dt;
    p.stretch+=(1-p.stretch)*.18*dt;
    p.runTick+=dt; if(p.runTick>7){p.runFrame=(p.runFrame+1)%6;p.runTick=0;}
  });

  /* SPAWN */
  obstSpawnTimer+=dt;
  if(obstSpawnTimer>=obstSpawnInterval){
    obstSpawnTimer=0; spawnObstacle();
    const d=1-state.timeLeft/state.gameDuration;
    obstSpawnInterval=Math.max(45,130-d*85);
  }

  /* MOVE OBSTACLES */
  obstacles.forEach(o=>{
    o.x-=o.speed*dt; o.tick+=dt;
    if(o.wobble) o.y=o.baseY+Math.sin(o.tick*.045)*10;
    if(o.jumper){o.jumpVy=(o.jumpVy||0)+GRAVITY*dt;o.y+=o.jumpVy*dt;const g2=H()*GROUND_RATIO-o.h;if(o.y>=g2){o.y=g2;o.jumpVy=JUMP_VEL*.5;}}
  });
  const before=obstacles.length;
  obstacles=obstacles.filter(o=>{if(o.x+o.w<0){players.forEach((_,i)=>{if(!players[i].dead)state.ducks[i]++;});return false;}return true;});
  if(obstacles.length<before) updateHUD();

  /* COLLIDE */
  players.forEach((p,i)=>{
    if(p.dead||p.invincible>0)return;
    const px=p.x+12,py=p.y+16,pw=PLAYER_W-24,ph=PLAYER_H-18;
    for(const o of obstacles){
      if(px<o.x+o.w-5&&px+pw>o.x+5&&py<o.y+o.h-5&&py+ph>o.y+5){
        p.dead=true;p.deadTimer=0;hitParticles(p.x+PLAYER_W/2,p.y+PLAYER_H*.5);playQuack();break;
      }
    }
  });

  /* BG SCROLL */
  bgClouds.forEach(c=>{c.x-=c.speed*dt;if(c.x+c.r*4<0)Object.assign(c,makeCloud(W()+c.r*2));});
  bgHills.forEach(h=>{h.x-=h.speed*dt;if(h.x+h.w<0)Object.assign(h,makeHill(W()+20));});
  bgBuildings.forEach(b=>{b.x-=b.speed*dt;if(b.x+b.w<0)Object.assign(b,makeBuilding(W()+10));});

  /* PARTICLES */
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.25*dt;p.life-=dt;});
  particles=particles.filter(p=>p.life>0);
}

/* ===== OBSTACLE SPAWN ===== */
function spawnObstacle(){
  const gY  =H()*GROUND_RATIO;
  const diff=1-state.timeLeft/state.gameDuration;
  const roll=Math.random();
  const ceilChance=0.16+diff*0.16;   // 16%→32% ceiling obstacles over time

  if(roll<ceilChance){
    // Ceiling obstacle — appears from TOP
    const t=CEILING_OBSTACLES[Math.floor(Math.random()*CEILING_OBSTACLES.length)];
    const baseY=H()*t.ceilFrac;
    obstacles.push({...t,x:W()+20,y:baseY,baseY,tick:0,
      speed:gameSpeed+Math.random()*.6,wobble:false,jumper:false});
  } else if(roll<ceilChance+0.22&&diff>0.25){
    // Mid-air obstacle
    const t=AIR_OBSTACLES[Math.floor(Math.random()*AIR_OBSTACLES.length)];
    const baseY=H()*t.floatFrac;
    obstacles.push({...t,x:W()+20,y:baseY,baseY,tick:0,
      speed:gameSpeed+Math.random()*.8,wobble:true,jumper:false});
  } else {
    // Ground obstacle
    const t=GROUND_OBSTACLES[Math.floor(Math.random()*GROUND_OBSTACLES.length)];
    const sc=(diff>0.65&&Math.random()<.12)?1.8:1;
    const w=t.w*sc,h=t.h*sc,baseY=gY-h;
    obstacles.push({...t,x:W()+20,y:baseY,baseY,w,h,scale:sc,tick:0,
      speed:gameSpeed+Math.random()*1.2,wobble:false,
      jumper:!!t.jumper,jumpVy:t.jumper?JUMP_VEL*.5:0,isGiant:sc>1});
  }
}

/* ===== HIT PARTICLES ===== */
function hitParticles(x,y){
  const cols=['#FF6B6B','#FFD700','#FF69B4','#87CEEB','#98FB98'];
  for(let i=0;i<14;i++){
    const a=(Math.PI*2/14)*i,sp=2.5+Math.random()*3.5;
    particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,
      life:45+Math.random()*20,color:cols[i%cols.length],size:7+Math.random()*8,rot:Math.random()*Math.PI*2});
  }
}

/* ===== RENDER ===== */
function render(){
  ctx.clearRect(0,0,W(),H());
  drawSky(); drawClouds(); drawHills();
  drawGround(); drawBuildings();
  drawObstacles(); drawPlayers(); drawParticles();
  drawCeilingHint();
}

/* ===== SKY ===== */
const SKIES=[
  {top:'#87CEEB',bot:'#C8E6FF'},
  {top:'#FF7043',bot:'#FFB347'},
  {top:'#1A237E',bot:'#283593'},
];
function drawSky(){
  const{top,bot}=SKIES[skyPhase];
  const g=ctx.createLinearGradient(0,0,0,H()*GROUND_RATIO);
  g.addColorStop(0,top);g.addColorStop(1,bot);
  ctx.fillStyle=g;ctx.fillRect(0,0,W(),H()*GROUND_RATIO);
  if(skyPhase===2){
    for(let i=0;i<45;i++){
      const sx=((i*137.5+globalTick*.04)%1)*W(),sy=((i*100.7)%1)*H()*.5,sr=1+Math.sin(globalTick*.05+i)*.7;
      ctx.fillStyle=`rgba(255,255,255,${.5+Math.sin(globalTick*.04+i)*.4})`;
      ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
    }
  }
  if(skyPhase===0){ctx.fillStyle='#FFD700';ctx.shadowColor='rgba(255,220,0,.5)';ctx.shadowBlur=24;ctx.beginPath();ctx.arc(W()*.86,H()*.11,32,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  if(skyPhase===2){ctx.fillStyle='#FFF9C4';ctx.beginPath();ctx.arc(W()*.82,H()*.10,24,0,Math.PI*2);ctx.fill();ctx.fillStyle=SKIES[2].top;ctx.beginPath();ctx.arc(W()*.82-9,H()*.10-7,18,0,Math.PI*2);ctx.fill();}
}
function drawClouds(){
  bgClouds.forEach(c=>{
    ctx.save();ctx.globalAlpha=(skyPhase===2?.35:.82)*c.alpha;
    ctx.fillStyle=skyPhase===0?'#fff':(skyPhase===1?'#FFCCBC':'#7986CB');
    for(let i=0;i<c.puffs;i++){const ox=(i-(c.puffs-1)*.5)*c.r*.88,oy=i===0?0:c.r*.28;ctx.beginPath();ctx.arc(c.x+ox,c.y+oy,c.r*(i===0?1:.68),0,Math.PI*2);ctx.fill();}
    ctx.restore();
  });
}
const HILL_COLS=['#81C784','#FFE082','#B0BEC5'];
function drawHills(){
  ctx.save();ctx.globalAlpha=.70;
  bgHills.forEach(hl=>{
    ctx.fillStyle=HILL_COLS[hl.col%HILL_COLS.length];
    ctx.beginPath();ctx.moveTo(hl.x,H()*GROUND_RATIO);
    ctx.quadraticCurveTo(hl.x+hl.w*.5,H()*GROUND_RATIO-hl.h,hl.x+hl.w,H()*GROUND_RATIO);
    ctx.closePath();ctx.fill();
  });
  ctx.restore();
}
function drawGround(){
  const gY=H()*GROUND_RATIO,sc=SCENES[sceneIndex];
  const g=ctx.createLinearGradient(0,gY,0,H());
  g.addColorStop(0,sc.groundTop);g.addColorStop(1,sc.groundBot);
  ctx.fillStyle=g;ctx.fillRect(0,gY,W(),H()-gY);
  ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,gY);ctx.lineTo(W(),gY);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;ctx.setLineDash([18,28]);
  ctx.beginPath();ctx.moveTo(0,gY+8);ctx.lineTo(W(),gY+8);ctx.stroke();ctx.setLineDash([]);
}
const BLDG_PAL=[['#EF9A9A','#E57373'],['#80CBC4','#4DB6AC'],['#90A4AE','#607D8B'],['#A5D6A7','#66BB6A'],['#E1F5FE','#B3E5FC'],['#CE93D8','#AB47BC']];
function drawBuildings(){
  ctx.save();ctx.globalAlpha=.88;
  const gY=H()*GROUND_RATIO;
  bgBuildings.forEach(b=>{
    const[c1,c2]=BLDG_PAL[sceneIndex%BLDG_PAL.length];
    const bx=b.x,bw=b.w,bh=b.h,by=gY-bh;
    ctx.fillStyle=c1;ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle=c2;ctx.fillRect(bx+bw,by+4,7,bh-4);ctx.fillRect(bx-2,by-6,bw+4,9);
    ctx.fillStyle=skyPhase===2?'#FFF176':'rgba(255,255,255,.55)';
    for(let r=0;r<b.windows;r++)for(let c=0;c<2;c++)ctx.fillRect(bx+8+c*(bw*.42),by+14+r*22,bw*.18,11);
  });
  ctx.restore();
}
function drawCeilingHint(){
  ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=2;ctx.setLineDash([12,20]);
  ctx.beginPath();ctx.moveTo(0,H()*CEILING_RATIO);ctx.lineTo(W(),H()*CEILING_RATIO);ctx.stroke();ctx.setLineDash([]);
}

/* ===================================================================
   OBSTACLES
   =================================================================== */
function drawObstacles(){
  obstacles.forEach(o=>{
    const ox=Math.round(o.x),oy=Math.round(o.y);
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=10;ctx.shadowOffsetX=3;ctx.shadowOffsetY=5;
    drawObstacleShape(o,ox,oy);
    ctx.restore();
  });
}

function drawObstacleShape(o,x,y){
  const w=o.w,hh=o.h;
  ctx.save();

  switch(o.type){

    /* ----- DUCK / GOOSE ----- */
    case 'duck': case 'goose':{
      ctx.fillStyle=o.color;ctx.strokeStyle='rgba(0,0,0,.65)';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.ellipse(x+w*.50,y+hh*.64,w*.38,hh*.32,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=o.color;
      ctx.beginPath();ctx.ellipse(x+w*.66,y+hh*.28,w*.19,hh*.20,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=o.accent;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(x+w*.85,y+hh*.28,w*.11,hh*.07,.25,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=shH(o.color,20);
      ctx.beginPath();ctx.ellipse(x+w*.44,y+hh*.55,w*.22,hh*.14,-.3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#222';ctx.beginPath();ctx.arc(x+w*.72,y+hh*.22,2.8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+w*.73,y+hh*.21,1.1,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=o.accent;ctx.lineWidth=2.5;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x+w*.40,y+hh*.92);ctx.lineTo(x+w*.38,y+hh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+w*.58,y+hh*.92);ctx.lineTo(x+w*.56,y+hh);ctx.stroke();
      if(o.isGiant){ctx.fillStyle='#FF1744';ctx.font='bold 11px Nunito,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('GIANT!',x+w*.5,y-3);}
      break;
    }
    case 'box':{
      ctx.fillStyle=o.color;ctx.strokeStyle=o.accent;ctx.lineWidth=2.5;
      ctx.fillRect(x,y,w,hh);ctx.strokeRect(x,y,w,hh);
      ctx.strokeStyle='rgba(0,0,0,.22)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+hh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x,y+hh);ctx.stroke();
      ctx.strokeStyle=o.accent;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x,y+hh/2);ctx.lineTo(x+w,y+hh/2);ctx.stroke();
      break;
    }
    case 'hay':{
      ctx.fillStyle=o.color;ctx.strokeStyle=o.accent;ctx.lineWidth=2;
      rrect(x,y,w,hh,10);ctx.fill();ctx.stroke();
      ctx.strokeStyle=shH(o.accent,-20);ctx.lineWidth=1.5;
      for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(x+4,y+hh*i/3);ctx.lineTo(x+w-4,y+hh*i/3);ctx.stroke();}
      break;
    }
    case 'rock':{
      ctx.fillStyle=o.color;ctx.strokeStyle=o.accent;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x+w*.18,y+hh);ctx.lineTo(x,y+hh*.58);ctx.lineTo(x+w*.12,y+hh*.28);ctx.lineTo(x+w*.50,y);ctx.lineTo(x+w*.84,y+hh*.22);ctx.lineTo(x+w,y+hh*.62);ctx.lineTo(x+w*.82,y+hh);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.22,y+hh*.22);ctx.lineTo(x+w*.42,y+hh*.08);ctx.stroke();
      break;
    }
    case 'frog':{
      ctx.fillStyle=o.color;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(x+w*.5,y+hh*.62,w*.37,hh*.33,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(x+w*.5,y+hh*.30,w*.30,hh*.24,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.strokeStyle=o.accent;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(x+w*.33,y+hh*.17,6,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(x+w*.67,y+hh*.17,6,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=o.accent;ctx.beginPath();ctx.arc(x+w*.33,y+hh*.17,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+w*.67,y+hh*.17,3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=shH(o.accent,-20);ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w*.5,y+hh*.36,6,.1,Math.PI-.1);ctx.stroke();
      break;
    }
    case 'cactus':{
      ctx.fillStyle=o.color;ctx.strokeStyle=o.accent;ctx.lineWidth=2;
      ctx.fillRect(x+w*.30,y,w*.40,hh);ctx.strokeRect(x+w*.30,y,w*.40,hh);
      ctx.fillRect(x,y+hh*.28,w*.31,hh*.14);ctx.strokeRect(x,y+hh*.28,w*.31,hh*.14);
      ctx.fillRect(x,y+hh*.10,w*.14,hh*.20);ctx.strokeRect(x,y+hh*.10,w*.14,hh*.20);
      ctx.fillRect(x+w*.70,y+hh*.38,w*.30,hh*.14);ctx.strokeRect(x+w*.70,y+hh*.38,w*.30,hh*.14);
      ctx.fillRect(x+w*.86,y+hh*.20,w*.14,hh*.20);ctx.strokeRect(x+w*.86,y+hh*.20,w*.14,hh*.20);
      break;
    }
    case 'bird':{
      const bFlap=Math.sin(o.tick*.17)*.40;
      ctx.fillStyle=o.color;ctx.strokeStyle=o.accent;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.ellipse(x+w*.50,y+hh*.55,w*.28,hh*.38,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(x+w*.20,y+hh*.32,w*.16,hh*.22,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.save();ctx.translate(x+w*.5,y+hh*.5);ctx.rotate(-bFlap);ctx.fillStyle=o.accent;
      ctx.beginPath();ctx.ellipse(-w*.04,0,w*.36,hh*.15,-.3,0,Math.PI*2);ctx.fill();
      ctx.rotate(bFlap*2);ctx.beginPath();ctx.ellipse(w*.04,0,w*.36,hh*.15,.3,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle='#FFA726';ctx.beginPath();ctx.moveTo(x+w*.04,y+hh*.31);ctx.lineTo(x,y+hh*.24);ctx.lineTo(x+w*.04,y+hh*.38);ctx.fill();
      ctx.fillStyle='#222';ctx.beginPath();ctx.arc(x+w*.22,y+hh*.28,2.5,0,Math.PI*2);ctx.fill();
      break;
    }
    case 'ufo':{
      ctx.fillStyle=o.color;ctx.strokeStyle=o.accent;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(x+w*.5,y+hh*.68,w*.47,hh*.28,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+w*.5,y+hh*.64,w*.38,hh*.18,0,0,Math.PI);ctx.stroke();
      ctx.fillStyle='rgba(165,230,250,.80)';ctx.beginPath();ctx.ellipse(x+w*.5,y+hh*.54,w*.24,hh*.36,-.05,Math.PI,0);ctx.fill();
      ctx.strokeStyle=o.accent;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x+w*.5,y+hh*.54,w*.24,hh*.36,-.05,Math.PI,0);ctx.stroke();
      ['#F44336','#FFEA00','#4CAF50'].forEach((c,i)=>{
        ctx.globalAlpha=Math.sin(o.tick*.12+i*1.2)>.2?1:.25;ctx.fillStyle=c;
        ctx.beginPath();ctx.arc(x+w*(.30+i*.20),y+hh*.75,3.8,0,Math.PI*2);ctx.fill();});
      ctx.globalAlpha=1;
      ctx.fillStyle=`rgba(255,255,80,${.10+Math.abs(Math.sin(o.tick*.04))*.13})`;
      ctx.beginPath();ctx.moveTo(x+w*.36,y+hh);ctx.lineTo(x+w*.64,y+hh);ctx.lineTo(x+w*.72,y+hh+55);ctx.lineTo(x+w*.28,y+hh+55);ctx.closePath();ctx.fill();
      break;
    }

    /* ----- CEILING OBSTACLES ----- */
    case 'bat':{
      const bFlap=Math.sin(o.tick*.20)*.50;
      const bcx=x+w*.5, bcy=y+hh*.40;
      // Wing glow
      ctx.shadowColor=o.accent; ctx.shadowBlur=12;
      // Left wing
      ctx.save();ctx.translate(bcx,bcy);ctx.rotate(-bFlap);
      ctx.fillStyle=o.color;
      ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-8,-10,-w*.4,-8,-w*.5,2);ctx.bezierCurveTo(-w*.4,10,-8,8,0,4);ctx.fill();
      // Wing membrane texture
      ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;
      for(let i=1;i<=3;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-w*.5*i/3.5,2+i*2);ctx.stroke();}
      ctx.rotate(bFlap*2);
      ctx.fillStyle=o.color;
      ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(8,-10,w*.4,-8,w*.5,2);ctx.bezierCurveTo(w*.4,10,8,8,0,4);ctx.fill();
      for(let i=1;i<=3;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w*.5*i/3.5,2+i*2);ctx.stroke();}
      ctx.restore();
      ctx.shadowBlur=0;
      // Body
      ctx.fillStyle=o.color;ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(bcx,bcy,10,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      // Ears
      ctx.fillStyle=o.accent;
      ctx.beginPath();ctx.moveTo(bcx-5,bcy-12);ctx.lineTo(bcx-10,bcy-24);ctx.lineTo(bcx-1,bcy-13);ctx.fill();
      ctx.beginPath();ctx.moveTo(bcx+5,bcy-12);ctx.lineTo(bcx+10,bcy-24);ctx.lineTo(bcx+1,bcy-13);ctx.fill();
      // Glowing red eyes
      ctx.fillStyle='#F44336';ctx.shadowColor='#FF1744';ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(bcx-4,bcy-6,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bcx+4,bcy-6,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      break;
    }

    case 'thundercloud':{
      const cc=x+w*.5,cy2=y+hh*.42;
      // Cloud body — dark stormy puffs
      const cloudAlpha=(skyPhase===2)?.9:.95;
      ctx.fillStyle=`rgba(55,71,79,${cloudAlpha})`;
      [[0,0,32],[-.35,6,25],[.35,5,22],[-.62,2,19],[.62,1,18],[-.2,-7,17],[.18,-8,15]].forEach(([ox,oy,r])=>{
        ctx.beginPath();ctx.arc(cc+ox*w*.5,cy2+oy,r,0,Math.PI*2);ctx.fill();
      });
      // Lighter cloud tops
      ctx.fillStyle='rgba(84,110,122,.7)';
      [[0,-4,24],[-.28,-1,18],[.28,-1,16]].forEach(([ox,oy,r])=>{
        ctx.beginPath();ctx.arc(cc+ox*w*.5,cy2+oy,r,0,Math.PI*2);ctx.fill();
      });
      // Lightning bolt
      const blink=Math.sin(o.tick*.20)>.3;
      if(blink){ctx.shadowColor='#FFEE58';ctx.shadowBlur=16;}
      ctx.fillStyle=blink?'#FFEE58':'rgba(255,238,88,.35)';
      const lx=cc+6,ly=cy2+14;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx-9,ly+18);ctx.lineTo(lx-3,ly+18);ctx.lineTo(lx-11,ly+38);ctx.lineTo(lx+5,ly+18);ctx.lineTo(lx-1,ly+18);ctx.closePath();ctx.fill();
      if(blink)ctx.shadowBlur=0;
      break;
    }

    case 'hawk':{
      const hFlap=Math.sin(o.tick*.09)*.22;
      const hcx=x+w*.44,hcy=y+hh*.46;
      // Wing gradient
      const wg=ctx.createLinearGradient(x,hcy,x+w,hcy);
      wg.addColorStop(0,o.accent);wg.addColorStop(.5,o.color);wg.addColorStop(1,o.accent);
      ctx.save();ctx.translate(hcx,hcy);
      // Left wing
      ctx.rotate(-hFlap);
      ctx.fillStyle=wg;
      ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-10,-hh*.28,-w*.46,-hh*.18,-w*.5,hh*.10);ctx.bezierCurveTo(-w*.38,hh*.24,-hh*.10,hh*.18,0,hh*.08);ctx.fill();
      // Feather tips on left wing
      ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=1;
      for(let i=0;i<4;i++){const t=.25+i*.18;ctx.beginPath();ctx.moveTo(-w*.5*t,hh*.10-t*6);ctx.lineTo(-w*.5*t-4,hh*.18-t*4);ctx.stroke();}
      ctx.rotate(hFlap*2);
      ctx.fillStyle=wg;
      ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(10,-hh*.28,w*.46,-hh*.18,w*.5,hh*.10);ctx.bezierCurveTo(w*.38,hh*.24,hh*.10,hh*.18,0,hh*.08);ctx.fill();
      for(let i=0;i<4;i++){const t=.25+i*.18;ctx.beginPath();ctx.moveTo(w*.5*t,hh*.10-t*6);ctx.lineTo(w*.5*t+4,hh*.18-t*4);ctx.stroke();}
      ctx.rotate(-hFlap);
      ctx.restore();
      // Body
      ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(hcx,hcy,10,18,.15,0,Math.PI*2);ctx.fill();
      // Chest (white)
      ctx.fillStyle='#EFEBE9';ctx.beginPath();ctx.ellipse(hcx,hcy+5,6,11,0,0,Math.PI*2);ctx.fill();
      // Head
      ctx.fillStyle=o.color;ctx.beginPath();ctx.ellipse(hcx-5,hcy-16,9,10,.1,0,Math.PI*2);ctx.fill();
      // Eye
      ctx.fillStyle='#FFEB3B';ctx.beginPath();ctx.arc(hcx-8,hcy-18,3.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';ctx.beginPath();ctx.arc(hcx-8,hcy-18,2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(hcx-7,hcy-19,1,0,Math.PI*2);ctx.fill();
      // Beak
      ctx.fillStyle=o.accent;ctx.beginPath();ctx.moveTo(hcx-14,hcy-16);ctx.lineTo(hcx-21,hcy-14);ctx.lineTo(hcx-14,hcy-12);ctx.closePath();ctx.fill();
      break;
    }

    case 'icicle':{
      const nSpikes=3,sw=w/nSpikes;
      for(let i=0;i<nSpikes;i++){
        const ix=x+i*sw+sw*.5;
        const ih=hh*(.72+Math.sin(o.tick*.07+i*1.3)*.10);
        const ig=ctx.createLinearGradient(ix-sw*.34,y,ix+sw*.34,y+ih);
        ig.addColorStop(0,'rgba(220,245,255,.95)');ig.addColorStop(.6,o.color);ig.addColorStop(1,o.accent);
        ctx.fillStyle=ig;ctx.strokeStyle='rgba(100,200,255,.5)';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(ix-sw*.38,y);ctx.lineTo(ix+sw*.38,y);ctx.lineTo(ix,y+ih);ctx.closePath();ctx.fill();ctx.stroke();
        // Highlight
        ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(ix-sw*.10,y+4);ctx.lineTo(ix-sw*.05,y+ih*.58);ctx.stroke();
        // Drip bead
        ctx.fillStyle='rgba(180,235,255,.8)';ctx.beginPath();ctx.arc(ix,y+ih,4,0,Math.PI*2);ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

/* ===================================================================
   HELPERS
   =================================================================== */
function rrect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function shH(color,amt){
  try{let c=color.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');const n=parseInt(c,16);
    return`rgb(${clamp((n>>16)+amt)},${clamp(((n>>8)&255)+amt)},${clamp((n&255)+amt)})`;}catch(e){return color;}
}
function clamp(v){return Math.min(255,Math.max(0,v));}

/* ===================================================================
   PLAYERS  P1=Rabbit  P2=Cat
   Origin at feet-bottom-center.  Up = negative Y.
   =================================================================== */
const P_PAL=[
  // P1 Rabbit — warm pink theme
  {earOut:'#F8BBD0',earIn:'#F48FB1',skin:'#FFDCB8',skinSh:'#E8A87C',
   dress:'#F06292',dressAcc:'#E91E63',shoe:'#C2185B',
   irisA:'#FF80AB',irisB:'#AD1457',pupil:'#200010'},
  // P2 Cat — cool blue theme
  {earOut:'#B39DDB',earIn:'#9575CD',skin:'#FFE5C8',skinSh:'#FFAB91',
   dress:'#64B5F6',dressAcc:'#1565C0',shoe:'#0D47A1',
   irisA:'#81D4FA',irisB:'#1565C0',pupil:'#001220'},
];

function drawPlayers(){
  players.forEach((p,idx)=>{
    if(p.dead)return;
    if(p.invincible>0&&Math.floor(p.invincible/7)%2===0)return;
    const pal=P_PAL[idx];
    const cx=Math.round(p.x+PLAYER_W/2);
    const cy=Math.round(p.y+PLAYER_H);   // origin at feet

    ctx.save();
    ctx.shadowColor='rgba(255,255,255,.9)';ctx.shadowBlur=22;
    ctx.translate(cx,cy);ctx.scale(p.squash,p.stretch);
    if(idx===0) drawRabbit(pal,p);
    else         drawCat(pal,p);
    ctx.restore();

    // Name tag
    ctx.save();ctx.font='bold 10px Nunito,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillText(state.names[idx].slice(0,9),cx,Math.round(p.y)-4);ctx.restore();
  });
}

/* ----- shared body ----- */
function drawSharedBody(pal,p,headCY,headR){
  const FEET=-2,KNEE=-22,WAIST=-42,CHEST=-60,SHLD=-62;
  const leg=p.onGround?Math.sin(p.runFrame/6*Math.PI*2)*9:0;
  const arm=p.onGround?Math.sin(p.runFrame/6*Math.PI*2+Math.PI)*10:0;

  /* legs */
  ctx.lineCap='round';
  ctx.strokeStyle=pal.skinSh;ctx.lineWidth=11;
  ctx.beginPath();ctx.moveTo(-8,WAIST+2);ctx.lineTo(-7-leg,KNEE);ctx.stroke();
  ctx.beginPath();ctx.moveTo(8,WAIST+2); ctx.lineTo(7+leg,KNEE); ctx.stroke();
  ctx.strokeStyle=pal.skin;ctx.lineWidth=10;
  ctx.beginPath();ctx.moveTo(-8,WAIST+2);ctx.lineTo(-7-leg,KNEE);ctx.stroke();
  ctx.beginPath();ctx.moveTo(8,WAIST+2); ctx.lineTo(7+leg,KNEE); ctx.stroke();
  ctx.strokeStyle=pal.skinSh;ctx.lineWidth=10;
  ctx.beginPath();ctx.moveTo(-7-leg,KNEE);ctx.lineTo(-7-leg*.5,FEET);ctx.stroke();
  ctx.beginPath();ctx.moveTo(7+leg,KNEE); ctx.lineTo(7+leg*.5,FEET); ctx.stroke();
  ctx.strokeStyle=pal.skin;ctx.lineWidth=9;
  ctx.beginPath();ctx.moveTo(-7-leg,KNEE);ctx.lineTo(-7-leg*.5,FEET);ctx.stroke();
  ctx.beginPath();ctx.moveTo(7+leg,KNEE); ctx.lineTo(7+leg*.5,FEET); ctx.stroke();

  /* shoes — rounded chibi */
  const sg=ctx.createRadialGradient(-7-leg*.5,FEET-2,1,-7-leg*.5,FEET,9);
  sg.addColorStop(0,shH(pal.shoe,30));sg.addColorStop(1,pal.shoe);
  ctx.fillStyle=sg;
  ctx.beginPath();ctx.ellipse(-7-leg*.5,FEET,10,5.5,0,0,Math.PI*2);ctx.fill();
  const sg2=ctx.createRadialGradient(7+leg*.5,FEET-2,1,7+leg*.5,FEET,9);
  sg2.addColorStop(0,shH(pal.shoe,30));sg2.addColorStop(1,pal.shoe);
  ctx.fillStyle=sg2;
  ctx.beginPath();ctx.ellipse(7+leg*.5,FEET,10,5.5,0,0,Math.PI*2);ctx.fill();
  // Shoe shine
  ctx.fillStyle='rgba(255,255,255,.35)';
  ctx.beginPath();ctx.ellipse(-7-leg*.5,FEET-1.5,5,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse( 7+leg*.5,FEET-1.5,5,2.5,0,0,Math.PI*2);ctx.fill();

  /* dress bodice */
  const dg=ctx.createLinearGradient(-16,WAIST,16,CHEST);
  dg.addColorStop(0,pal.dressAcc);dg.addColorStop(1,pal.dress);
  ctx.fillStyle=dg;ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-13,SHLD);ctx.lineTo(-16,WAIST);ctx.lineTo(16,WAIST);ctx.lineTo(13,SHLD);ctx.closePath();ctx.fill();ctx.stroke();

  /* skirt — gradient bezier */
  const sk=ctx.createLinearGradient(0,WAIST,0,FEET);
  sk.addColorStop(0,pal.dress);sk.addColorStop(1,pal.dressAcc+'BB');
  ctx.fillStyle=sk;
  ctx.beginPath();
  ctx.moveTo(-16,WAIST);
  ctx.bezierCurveTo(-22,WAIST+12,-24,FEET-16,-10,FEET+2);
  ctx.lineTo(10,FEET+2);
  ctx.bezierCurveTo(24,FEET-16,22,WAIST+12,16,WAIST);
  ctx.closePath();ctx.fill();

  /* collar */
  ctx.fillStyle=pal.dressAcc;
  ctx.beginPath();ctx.moveTo(-12,SHLD);ctx.quadraticCurveTo(0,SHLD+9,12,SHLD);ctx.lineTo(9,SHLD-7);ctx.quadraticCurveTo(0,SHLD-2,-9,SHLD-7);ctx.closePath();ctx.fill();

  /* arms */
  ctx.strokeStyle=pal.skin;ctx.lineWidth=9;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-12,SHLD);ctx.lineTo(-19+arm,WAIST-5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(12,SHLD); ctx.lineTo(19-arm,WAIST-5); ctx.stroke();
  // Hands as small circles
  ctx.fillStyle=pal.skin;
  ctx.beginPath();ctx.arc(-19+arm,WAIST-5,5.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(19-arm,WAIST-5,5.5,0,Math.PI*2);ctx.fill();

  // Neck
  ctx.fillStyle=pal.skin;
  ctx.beginPath();ctx.ellipse(0,headCY+headR+3,6,9,0,0,Math.PI*2);ctx.fill();

  /* wings */
  if(!p.onGround) drawWings(pal,p,SHLD);
}

/* ----- Angel feather wings ----- */
function drawWings(pal,p,shoulderY){
  const active=p.wingFlapTick>0;
  const freq=active?.55:.10;
  const amp =active?.65:.18;
  const flap=Math.sin(globalTick*freq)*amp;

  ctx.save();
  ctx.shadowColor='rgba(200,225,255,.80)';
  ctx.shadowBlur=active?20:10;

  for(const side of[-1,1]){
    ctx.save();
    ctx.translate(side*13,shoulderY-3);
    ctx.scale(side,1);   // mirror right wing
    ctx.rotate(-flap);

    // ── Layer 1: outermost trailing feathers (pale blue-white) ──
    const g1=ctx.createLinearGradient(0,2,42,12);
    g1.addColorStop(0,'rgba(255,255,255,.9)');
    g1.addColorStop(.7,'rgba(210,230,255,.75)');
    g1.addColorStop(1,'rgba(180,210,250,.55)');
    ctx.fillStyle=g1;
    ctx.beginPath();
    ctx.moveTo(0,8);
    ctx.bezierCurveTo(10,4, 36,10, 42,22);
    ctx.bezierCurveTo(36,28, 8,24,  0,18);
    ctx.closePath();ctx.fill();

    // ── Layer 2: main wing body ──
    const g2=ctx.createLinearGradient(0,-4,40,6);
    g2.addColorStop(0,'rgba(255,255,255,1)');
    g2.addColorStop(.55,'rgba(230,242,255,.95)');
    g2.addColorStop(1,'rgba(190,218,255,.85)');
    ctx.fillStyle=g2;
    ctx.beginPath();
    ctx.moveTo(0,2);
    ctx.bezierCurveTo(10,-12, 36,-14, 40,-2);
    ctx.bezierCurveTo(34,10,  8,12,   0,10);
    ctx.closePath();ctx.fill();

    // ── Layer 3: leading edge (bright white) ──
    ctx.fillStyle='rgba(255,255,255,.97)';
    ctx.beginPath();
    ctx.moveTo(0,2);
    ctx.bezierCurveTo(8,-18, 30,-22, 34,-8);
    ctx.bezierCurveTo(26,-2, 6,-2,   0, 2);
    ctx.closePath();ctx.fill();

    // ── Feather tip scallops ──
    ctx.strokeStyle='rgba(160,205,245,.55)';ctx.lineWidth=.9;
    for(let fi=0;fi<6;fi++){
      const t=(fi+.5)/6.5;
      const wx=t*38, wy=-14+t*16;
      ctx.beginPath();ctx.moveTo(wx-3,wy);ctx.quadraticCurveTo(wx,wy+9,wx+3,wy);ctx.stroke();
    }
    // ── Quill lines ──
    ctx.strokeStyle='rgba(180,210,248,.45)';ctx.lineWidth=.8;
    for(let qi=0;qi<5;qi++){
      const t=(qi+1)/6;
      ctx.beginPath();ctx.moveTo(t*36,-14+t*14-4);ctx.lineTo(t*32,+4+t*6);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ----- P1 RABBIT ----- */
function drawRabbit(pal,p){
  const headCY=-76,headR=16;

  // Ears behind head
  drawRabbitEar(pal,-8,headCY,headR,-0.13);
  drawRabbitEar(pal, 8,headCY,headR, 0.13);

  drawSharedBody(pal,p,headCY,headR);

  // Face with radial gradient
  const fg=ctx.createRadialGradient(-4,headCY-5,1,0,headCY,headR);
  fg.addColorStop(0,'#FFF0D8');fg.addColorStop(1,pal.skin);
  ctx.fillStyle=fg;ctx.strokeStyle='rgba(180,110,70,.25)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,headCY,headR,0,Math.PI*2);ctx.fill();ctx.stroke();

  // Soft cheeks
  ctx.fillStyle='rgba(255,138,118,.32)';
  ctx.beginPath();ctx.ellipse(-11,headCY+5,5.5,3.5,-.2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse( 11,headCY+5,5.5,3.5, .2,0,Math.PI*2);ctx.fill();

  // Big anime eyes
  animeEye(-5.5,headCY-1,pal);
  animeEye( 5.5,headCY-1,pal);

  // Bunny nose
  ctx.fillStyle='#FF6B8A';
  ctx.beginPath();ctx.ellipse(0,headCY+6,3.2,2.2,0,0,Math.PI*2);ctx.fill();
  // Bunny split mouth
  ctx.strokeStyle='#D4547A';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(-5,headCY+9);ctx.quadraticCurveTo(-2,headCY+13,0,headCY+9);ctx.stroke();
  ctx.beginPath();ctx.moveTo( 5,headCY+9);ctx.quadraticCurveTo( 2,headCY+13,0,headCY+9);ctx.stroke();

  // Ribbon bow on right ear
  drawBow(8,headCY-headR-22,8,pal.dressAcc);
}

function drawRabbitEar(pal,cx,headCY,headR,tilt){
  const earH=36;
  const tipY=headCY-headR+2;
  ctx.save();ctx.translate(cx,tipY);ctx.rotate(tilt);
  // Outer ear — gradient
  const eg=ctx.createLinearGradient(0,-earH*.7,0,0);
  eg.addColorStop(0,pal.earOut);eg.addColorStop(1,pal.skin);
  ctx.fillStyle=eg;ctx.strokeStyle='rgba(200,130,150,.25)';ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(-7,2);
  ctx.bezierCurveTo(-10,-earH*.35,-7,-earH*.75,0,-earH);
  ctx.bezierCurveTo(7,-earH*.75,10,-earH*.35,7,2);
  ctx.closePath();ctx.fill();ctx.stroke();
  // Inner ear
  ctx.fillStyle=pal.earIn;
  ctx.beginPath();
  ctx.moveTo(-4,0);
  ctx.bezierCurveTo(-5,-earH*.30,-3.5,-earH*.70,0,-earH+6);
  ctx.bezierCurveTo(3.5,-earH*.70,5,-earH*.30,4,0);
  ctx.closePath();ctx.fill();
  ctx.restore();
}

/* ----- P2 CAT ----- */
function drawCat(pal,p){
  const headCY=-74,headR=16;

  // Ears behind head
  drawCatEar(pal,-9,headCY,headR,-0.14);
  drawCatEar(pal, 9,headCY,headR, 0.14);

  drawSharedBody(pal,p,headCY,headR);

  // Face gradient (slightly wider chibi)
  const fg=ctx.createRadialGradient(-4,headCY-5,1,0,headCY,headR);
  fg.addColorStop(0,'#FFF5E0');fg.addColorStop(1,pal.skin);
  ctx.fillStyle=fg;ctx.strokeStyle='rgba(180,125,80,.22)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,headCY,headR,0,Math.PI*2);ctx.fill();ctx.stroke();

  // Cheeks
  ctx.fillStyle='rgba(255,140,120,.30)';
  ctx.beginPath();ctx.ellipse(-11,headCY+5,5.5,3.5,-.2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse( 11,headCY+5,5.5,3.5, .2,0,Math.PI*2);ctx.fill();

  // Whiskers
  ctx.strokeStyle='rgba(80,60,50,.50)';ctx.lineWidth=1.1;
  for(const side of[-1,1]){
    for(let wi=0;wi<3;wi++){
      const wy=headCY+3+(wi-1)*3.8;
      ctx.beginPath();ctx.moveTo(side*3.5,wy);ctx.lineTo(side*19,wy+(wi-1)*2);ctx.stroke();
    }
  }

  // Almond cat eyes
  catEye(-5.5,headCY-1,pal);
  catEye( 5.5,headCY-1,pal);

  // Heart nose
  ctx.fillStyle='#FF8FA3';
  ctx.beginPath();
  ctx.moveTo(0,headCY+7);ctx.bezierCurveTo(4,headCY+4,6,headCY+2,4,headCY+1);
  ctx.bezierCurveTo(2,headCY-.5,0,headCY+2,0,headCY+4);
  ctx.bezierCurveTo(0,headCY+2,-2,headCY-.5,-4,headCY+1);
  ctx.bezierCurveTo(-6,headCY+2,-4,headCY+4,0,headCY+7);
  ctx.fill();

  // Cat mouth
  ctx.strokeStyle='rgba(160,70,90,.72)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(0,headCY+7);ctx.lineTo(-4.5,headCY+12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,headCY+7);ctx.lineTo( 4.5,headCY+12);ctx.stroke();
}

function drawCatEar(pal,cx,headCY,headR,tilt){
  const earH=24;
  ctx.save();ctx.translate(cx,headCY-headR+1);ctx.rotate(tilt);
  // Outer — gradient
  const eg=ctx.createLinearGradient(0,-earH+2,0,4);
  eg.addColorStop(0,pal.earOut);eg.addColorStop(1,pal.skin);
  ctx.fillStyle=eg;ctx.strokeStyle='rgba(150,100,170,.22)';ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(-8,4);
  ctx.bezierCurveTo(-10,-6,-5,-earH+4,0,-earH);
  ctx.bezierCurveTo(5,-earH+4,10,-6,8,4);
  ctx.closePath();ctx.fill();ctx.stroke();
  // Inner tuft
  ctx.fillStyle=pal.earIn;
  ctx.beginPath();
  ctx.moveTo(-4.5,2);
  ctx.bezierCurveTo(-5.5,-5,-3,-earH+6,0,-earH+4);
  ctx.bezierCurveTo(3,-earH+6,5.5,-5,4.5,2);
  ctx.closePath();ctx.fill();
  ctx.restore();
}

/* ----- Anime eye (rabbit) ----- */
function animeEye(cx,cy,pal){
  const EW=5.5,EH=7.2;
  // Sclera
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx,cy,EW,EH,0,0,Math.PI*2);ctx.fill();
  // Iris gradient
  const ig=ctx.createRadialGradient(cx-.8,cy-1.5,0.4,cx,cy,EW);
  ig.addColorStop(0,pal.irisA);ig.addColorStop(.65,pal.irisB);ig.addColorStop(1,'rgba(0,0,0,.6)');
  ctx.fillStyle=ig;ctx.beginPath();ctx.ellipse(cx,cy,EW*.72,EH*.78,0,0,Math.PI*2);ctx.fill();
  // Pupil
  ctx.fillStyle=pal.pupil;ctx.beginPath();ctx.ellipse(cx,cy+.8,EW*.32,EH*.52,0,0,Math.PI*2);ctx.fill();
  // Main shine
  ctx.fillStyle='rgba(255,255,255,.96)';ctx.beginPath();ctx.arc(cx-2,cy-2.2,2.4,0,Math.PI*2);ctx.fill();
  // Small shine
  ctx.fillStyle='rgba(255,255,255,.70)';ctx.beginPath();ctx.arc(cx+2.2,cy+1.2,1.1,0,Math.PI*2);ctx.fill();
  // Lash arc (top)
  ctx.strokeStyle='rgba(55,35,20,.82)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.ellipse(cx,cy,EW+1.2,EH+1.8,0,Math.PI+.12,Math.PI*2-.12);ctx.stroke();
  // 3 eyelashes
  for(let i=0;i<3;i++){
    const ang=Math.PI+.22+i*.24;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(ang)*(EW+1.2),cy+Math.sin(ang)*(EH+1.8));
    ctx.lineTo(cx+Math.cos(ang)*(EW+5),cy+Math.sin(ang)*(EH+4));ctx.stroke();
  }
}

/* ----- Cat almond eye ----- */
function catEye(cx,cy,pal){
  // Almond shape
  ctx.fillStyle='#fff';
  ctx.beginPath();
  ctx.moveTo(cx-6.5,cy);ctx.bezierCurveTo(cx-5,cy-5.5,cx+5,cy-5.5,cx+6.5,cy);
  ctx.bezierCurveTo(cx+5,cy+4.5,cx-5,cy+4.5,cx-6.5,cy);ctx.fill();
  // Iris
  const ig=ctx.createRadialGradient(cx-.5,cy-1,0.4,cx,cy,4.2);
  ig.addColorStop(0,pal.irisA);ig.addColorStop(.6,pal.irisB);ig.addColorStop(1,'rgba(0,0,20,.8)');
  ctx.fillStyle=ig;ctx.beginPath();ctx.ellipse(cx,cy,4,5,0,0,Math.PI*2);ctx.fill();
  // Vertical slit pupil
  ctx.fillStyle=pal.pupil;ctx.beginPath();ctx.ellipse(cx,cy,1.1,4.2,0,0,Math.PI*2);ctx.fill();
  // Main shine
  ctx.fillStyle='rgba(255,255,255,.94)';ctx.beginPath();ctx.arc(cx-1.5,cy-1.8,1.9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.60)';ctx.beginPath();ctx.arc(cx+2,cy+1.2,.9,0,Math.PI*2);ctx.fill();
  // Top lash arc
  ctx.strokeStyle='rgba(50,25,50,.85)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(cx-6.5,cy);ctx.bezierCurveTo(cx-5,cy-6.5,cx+5,cy-6.5,cx+6.5,cy);ctx.stroke();
}

/* ----- Bow decoration ----- */
function drawBow(cx,cy,r,color){
  ctx.save();ctx.translate(cx,cy);
  const bg=ctx.createRadialGradient(-r,0,1,-r,0,r*1.2);
  bg.addColorStop(0,shH(color,40));bg.addColorStop(1,color);
  ctx.fillStyle=bg;
  ctx.beginPath();ctx.ellipse(-r,0,r,r*.58,.45,0,Math.PI*2);ctx.fill();
  const bg2=ctx.createRadialGradient(r,0,1,r,0,r*1.2);
  bg2.addColorStop(0,shH(color,40));bg2.addColorStop(1,color);
  ctx.fillStyle=bg2;
  ctx.beginPath();ctx.ellipse( r,0,r,r*.58,-.45,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(0,0,r*.38,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

/* ===== PARTICLES ===== */
function drawParticles(){
  particles.forEach(p=>{
    ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,p.life/35));
    ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);
    ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
    ctx.restore();
  });
}

/* ===== HUD ===== */
function updateHUD(){
  document.getElementById('hud-p1-name').textContent =state.names[0];
  document.getElementById('hud-p1-ducks').textContent=state.ducks[0];
  if(state.mode===2){
    document.getElementById('hud-p2-name').textContent =state.names[1];
    document.getElementById('hud-p2-ducks').textContent=state.ducks[1];
  }
  const tEl=document.getElementById('hud-timer');
  tEl.textContent=`⏱ ${state.timeLeft}s`;
  tEl.classList.toggle('urgent',state.timeLeft<=10);
  document.getElementById('hud-scene').textContent=SCENES[sceneIndex]?.name||'';
}

/* ===== END / WIN ===== */
function endGame(){state.running=false;cancelAnimationFrame(animFrame);render();setTimeout(showWinScreen,400);}

function showWinScreen(){
  showScreen('win-screen');playVictory();
  document.getElementById('win-subs').innerHTML=state.names.slice(0,state.mode).map((n,i)=>
    `<div>🏅 <b>${esc(n)}</b> dodged <b>${state.ducks[i]}</b> ducks!</div>`).join('');
  const cc=document.getElementById('confettiCanvas');
  cc.width=window.innerWidth;cc.height=window.innerHeight;
  const cctx=cc.getContext('2d');
  const cols=['#FF6B6B','#FFD700','#87DB87','#56C8E0','#B088F9','#FF69B4','#FFA500'];
  const cp=Array.from({length:180},()=>({
    x:Math.random()*cc.width,y:-10-Math.random()*cc.height*.6,
    w:9+Math.random()*12,hi:4+Math.random()*7,
    vx:(Math.random()-.5)*3,vy:2.5+Math.random()*4,
    rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.18,
    color:cols[Math.floor(Math.random()*cols.length)]}));
  (function cfLoop(){
    cctx.clearRect(0,0,cc.width,cc.height);
    cp.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.rot+=c.rotV;if(c.y>cc.height)c.y=-10;
      cctx.save();cctx.translate(c.x,c.y);cctx.rotate(c.rot);cctx.fillStyle=c.color;cctx.fillRect(-c.w/2,-c.hi/2,c.w,c.hi);cctx.restore();});
    requestAnimationFrame(cfLoop);
  })();
  for(let i=0;i<state.mode;i++) saveScore(state.names[i],state.ducks[i],0,0,state.gameDuration);
  giftOpened=false;
  document.getElementById('gift-box').style.transform='';
  document.getElementById('gift-box').querySelector('.gift-label').textContent='Click to Open!';
  document.getElementById('gift-box').querySelector('.gift-lid').textContent='🎁';
  document.getElementById('reward-display').classList.add('hidden');
  document.getElementById('reward-display').innerHTML='';
}

function openGift(){
  if(giftOpened)return;giftOpened=true;playCoin();
  const box=document.getElementById('gift-box');
  box.style.transform='scale(1.4) rotate(12deg)';
  setTimeout(()=>{
    box.style.transform='';
    box.querySelector('.gift-lid').textContent='🎊';
    box.querySelector('.gift-label').textContent='🎉 Opened!';
    const rewards=state.names.slice(0,state.mode).map((name,i)=>{
      const gold=[25,50,75,100,150][Math.floor(Math.random()*5)];
      const dia =[1,2,3,5,10][Math.floor(Math.random()*5)];
      saveScore(name,state.ducks[i],gold,dia,state.gameDuration);
      return{name,gold,dia};});
    const rd=document.getElementById('reward-display');
    rd.classList.remove('hidden');
    rd.innerHTML=rewards.map(r=>`<div class="reward-item">🥇 ${esc(r.name)}: +${r.gold} Gold &nbsp;💎 +${r.dia} Diamonds</div>`).join('');
    playCoin();},420);
}

/* ===== STORAGE ===== */
function saveScore(name,ducks,gold,diamonds,time){
  const s=loadScores();s.push({name,ducks,gold,diamonds,time});
  s.sort((a,b)=>b.ducks-a.ducks||b.gold-a.gold);
  try{localStorage.setItem('jumpingDuckScores',JSON.stringify(s.slice(0,20)));}catch(e){}
}
function loadScores(){try{return JSON.parse(localStorage.getItem('jumpingDuckScores')||'[]');}catch(e){return[];}}

/* ===== SCREEN ===== */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='';});
  const el=document.getElementById(id);el.classList.add('active');el.style.display='flex';
}
function goMenu(){state.running=false;cancelAnimationFrame(animFrame);clearInterval(gameTimer);showScreen('menu-screen');renderLeaderboard();}

/* ===== INIT ===== */
buildTitle();spawnMenuDucks();renderLeaderboard();showScreen('menu-screen');
