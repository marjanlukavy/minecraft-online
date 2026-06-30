"use strict";
// ===================== Моби =====================
const mobs = [];

const MOB = {
  pig:    { hostile: false, hp: 8,  speed: 1.2, w: TILE*0.9, h: TILE*0.8, drop: I.APPLE },
  zombie: { hostile: true,  hp: 14, speed: 1.9, w: TILE*0.6, h: TILE*1.7, dmg: 3, drop: I.STICK },
};

function spawnMob(type, x, y) {
  const d = MOB[type];
  mobs.push({
    type, x, y, w: d.w, h: d.h,
    vx: 0, vy: 0, onGround: false, face: 1,
    hp: d.hp, hurt: 0, kb: 0, atkCd: 0,
    wanderDir: 0, wanderCd: 0, jumpCd: 0,
  });
}

// спроба заспавнити мобів біля гравця
let spawnCd = 0;
function trySpawnMobs() {
  if (spawnCd > 0) { spawnCd--; return; }
  spawnCd = 30;
  const night = isNight();
  const pigs = mobs.filter(m => m.type === "pig").length;
  const zombies = mobs.filter(m => m.type === "zombie").length;

  if (!night && pigs < 4 && Math.random() < 0.5) trySpawnAt("pig");
  if (night && zombies < 8 && Math.random() < 0.7) trySpawnAt("zombie");
}
function trySpawnAt(type) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const bx = Math.floor(player.x / TILE) + side * (16 + Math.floor(Math.random() * 10));
  if (bx < 2 || bx >= WORLD_W - 2) return;
  const by = surfaceY(bx);
  const d = MOB[type];
  const x = bx * TILE, y = by * TILE - d.h - 1;
  if (collideBox(x, y, d.w, d.h)) return;     // не спавнити в стіні
  spawnMob(type, x, y);
}

function mobAt(wx, wy) {
  for (const m of mobs)
    if (wx >= m.x && wx <= m.x + m.w && wy >= m.y && wy <= m.y + m.h) return m;
  return null;
}

function hurtMob(m, dmg, dirX) {
  m.hp -= dmg; m.hurt = 10; m.kb = 8;
  m.vx = dirX * 4.5; m.vy = -4;
  if (m.hp <= 0) {
    const d = MOB[m.type];
    if (d.drop && Math.random() < 0.7) addItem(d.drop, 1 + Math.floor(Math.random() * 2));
    const i = mobs.indexOf(m); if (i >= 0) mobs.splice(i, 1);
  }
}

function updateMobs() {
  trySpawnMobs();
  const pcx = player.x + player.w / 2;

  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i], d = MOB[m.type];
    if (m.hurt > 0) m.hurt--;
    if (m.kb > 0) m.kb--;
    if (m.atkCd > 0) m.atkCd--;

    // прибрати далеких; зомбі "згорають" удень
    const far = Math.abs(m.x - player.x) > 70 * TILE;
    if (far || (m.type === "zombie" && getAmbient() > 0.6)) { mobs.splice(i, 1); continue; }

    // --- AI (під час відкидання керування вимкнене) ---
    let dir = 0;
    if (m.kb <= 0) {
      if (d.hostile) {
        dir = Math.sign(pcx - (m.x + m.w / 2));
        m.vx = dir * d.speed;
      } else {
        if (m.wanderCd-- <= 0) { m.wanderDir = [-1, 0, 0, 1][Math.floor(Math.random() * 4)]; m.wanderCd = 60 + Math.random() * 90; }
        dir = m.wanderDir; m.vx = dir * d.speed;
      }
      if (dir) m.face = dir;
    } else {
      m.vx *= 0.9;
    }

    // стрибок через перешкоду
    if (dir && m.onGround && collideBox(m.x + dir * 4, m.y, m.w, m.h)) m.vy = -9;

    m.vy = Math.min(m.vy + GRAVITY, 16);
    moveEntity(m);
    if (m.y > WORLD_H * TILE) { mobs.splice(i, 1); continue; }

    // атака гравця
    if (d.hostile &&
        m.x < player.x + player.w && m.x + m.w > player.x &&
        m.y < player.y + player.h && m.y + m.h > player.y && m.atkCd <= 0) {
      damagePlayer(d.dmg, Math.sign(player.x + player.w / 2 - (m.x + m.w / 2)) || 1);
      m.atkCd = 45;
    }
  }
}

// ===================== Малювання =====================
function drawMobs() {
  for (const m of mobs) {
    const sx = Math.floor(m.x - cam.x), sy = Math.floor(m.y - cam.y);
    if (sx < -64 || sx > canvas.width + 64) continue;
    ctx.save();
    ctx.translate(sx + m.w / 2, sy);
    if (m.face < 0) ctx.scale(-1, 1);
    ctx.translate(-m.w / 2, 0);
    if (m.hurt > 0) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 30); }
    // тінь
    ctx.globalAlpha *= 1;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(m.w / 2, m.h, m.w * 0.5, 3.5, 0, 0, 7); ctx.fill();
    if (m.type === "pig") drawPig(m); else drawZombie(m);
    ctx.restore();
    ctx.globalAlpha = 1;
    drawMobHealth(m, sx, sy);
  }
}
function drawPig(m) {
  const w = m.w, h = m.h;
  ctx.fillStyle = m.hurt > 0 ? "#ff9a9a" : "#f0a0a8";
  ctx.fillRect(w*0.05, h*0.25, w*0.9, h*0.6);          // тіло
  ctx.fillStyle = "#e08890";
  ctx.fillRect(w*0.7, h*0.3, w*0.3, h*0.4);            // голова
  ctx.fillStyle = "#c96f78";
  ctx.fillRect(w*0.9, h*0.42, w*0.12, h*0.18);         // рило
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(w*0.8, h*0.4, 3, 3);  // око
  ctx.fillStyle = "#d98088";
  ctx.fillRect(w*0.15, h*0.85, w*0.18, h*0.15);
  ctx.fillRect(w*0.6, h*0.85, w*0.18, h*0.15);         // ніжки
}
function drawZombie(m) {
  const w = m.w, h = m.h;
  ctx.fillStyle = "#27632a";                           // ноги
  ctx.fillRect(w*0.12, h*0.62, w*0.32, h*0.38);
  ctx.fillRect(w*0.56, h*0.62, w*0.32, h*0.38);
  ctx.fillStyle = m.hurt > 0 ? "#7fae5a" : "#3f7d44";  // тулуб
  ctx.fillRect(w*0.08, h*0.3, w*0.84, h*0.36);
  ctx.fillStyle = "#5aa05f";                           // руки вперед
  ctx.fillRect(w*0.3, h*0.34, w*0.55, h*0.12);
  ctx.fillStyle = "#6cae5f"; ctx.fillRect(w*0.2, 0, w*0.6, h*0.3);  // голова
  ctx.fillStyle = "#143a16"; ctx.fillRect(w*0.34, h*0.12, w*0.1, h*0.05); // очі
  ctx.fillRect(w*0.56, h*0.12, w*0.1, h*0.05);
}
function drawMobHealth(m, sx, sy) {
  const d = MOB[m.type];
  if (m.hp >= d.hp) return;
  const bw = m.w, frac = Math.max(0, m.hp / d.hp);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(sx, sy - 7, bw, 4);
  ctx.fillStyle = d.hostile ? "#d33" : "#3c3";
  ctx.fillRect(sx, sy - 7, bw * frac, 4);
}
