"use strict";
// ===================== Полотно та камера =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const cam = { x: 0, y: 0 };

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
function updateCamera() {
  cam.x = player.x + player.w / 2 - canvas.width / 2;
  cam.y = player.y + player.h / 2 - canvas.height / 2;
  cam.x = Math.max(0, Math.min(WORLD_W * TILE - canvas.width, cam.x));
  cam.y = Math.max(0, Math.min(WORLD_H * TILE - canvas.height, cam.y));
}

// ===================== Частинки =====================
const particles = [];
function spawnParticles(bx, by, type) {
  const col = ITEMS[type] ? ITEMS[type].base : "#999";
  for (let i = 0; i < 8; i++)
    particles.push({ x: bx*TILE + TILE/2, y: by*TILE + TILE/2,
      vx: (Math.random()-0.5)*4, vy: (Math.random()-0.7)*4, life: 30, col });
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.vy += 0.3; p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ===================== Небо, сонце/місяць, хмари =====================
const clouds = [];
for (let i = 0; i < 14; i++)
  clouds.push({ x: Math.random()*WORLD_W*TILE, y: Math.random()*WORLD_H*TILE*0.25,
                w: 80 + Math.random()*120, speed: 0.2 + Math.random()*0.3 });

function lerp(a, b, t) { return a + (b - a) * t; }
function drawSky() {
  const amb = getAmbient();
  // колір неба від денного до нічного
  const top = `rgb(${lerp(20,90,amb)|0},${lerp(24,169,amb)|0},${lerp(60,240,amb)|0})`;
  const bot = `rgb(${lerp(40,215,amb)|0},${lerp(50,238,amb)|0},${lerp(80,252,amb)|0})`;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

  // сонце і місяць рухаються по дузі
  const ang = gameTime * Math.PI * 2;
  const cxp = canvas.width / 2, arcY = canvas.height * 0.95, arcR = canvas.height * 0.8;
  const sunX = cxp - Math.sin(ang) * arcR, sunY = arcY - Math.cos(ang) * arcR;
  const moonX = cxp + Math.sin(ang) * arcR, moonY = arcY + Math.cos(ang) * arcR;
  // сонце
  ctx.globalAlpha = Math.max(0, Math.cos(ang)) * 0.95 + 0.05;
  ctx.fillStyle = "#fff7c8"; ctx.beginPath(); ctx.arc(sunX, sunY, 38, 0, 7); ctx.fill();
  // місяць
  ctx.globalAlpha = Math.max(0, -Math.cos(ang)) * 0.9 + 0.05;
  ctx.fillStyle = "#e8eef5"; ctx.beginPath(); ctx.arc(moonX, moonY, 28, 0, 7); ctx.fill();
  ctx.fillStyle = "#cdd6e0";
  ctx.beginPath(); ctx.arc(moonX-8, moonY-6, 5, 0, 7); ctx.arc(moonX+7, moonY+5, 4, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  // хмари
  ctx.fillStyle = `rgba(255,255,255,${0.3 + amb*0.55})`;
  for (const c of clouds) {
    c.x += c.speed;
    if (c.x - cam.x*0.5 > WORLD_W*TILE) c.x = cam.x*0.5 - c.w;
    roundCloud(c.x - cam.x*0.5, c.y - cam.y*0.3, c.w);
  }
}
function roundCloud(x, y, w) {
  const h = w * 0.45;
  ctx.beginPath();
  ctx.arc(x, y + h*0.6, h*0.6, 0, 7);
  ctx.arc(x + w*0.3, y + h*0.4, h*0.7, 0, 7);
  ctx.arc(x + w*0.6, y + h*0.5, h*0.55, 0, 7);
  ctx.arc(x + w*0.45, y + h*0.75, h*0.6, 0, 7);
  ctx.fill();
}

// ===================== Основний рендер =====================
function draw() {
  drawSky();
  const amb = getAmbient();

  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(WORLD_W - 1, Math.ceil((cam.x + canvas.width) / TILE));
  const y1 = Math.min(WORLD_H - 1, Math.ceil((cam.y + canvas.height) / TILE));
  const torches = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const b = world[idx(x, y)];
      if (b === B.AIR) continue;
      const sx = Math.floor(x*TILE - cam.x), sy = Math.floor(y*TILE - cam.y);
      if (ITEMS[b] && ITEMS[b].water) ctx.globalAlpha = 0.72;
      ctx.drawImage(getImg(b), sx, sy);
      ctx.globalAlpha = 1;
      if (b === B.TORCH) torches.push([sx + TILE/2, sy + TILE*0.35]);
    }

  drawMobs();
  if (typeof drawRemotePlayers === "function") drawRemotePlayers();
  drawPlayer();

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life/30);
    ctx.fillStyle = p.col; ctx.fillRect(p.x-cam.x-2, p.y-cam.y-2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // нічна темрява
  if (amb < 0.99) {
    ctx.fillStyle = `rgba(6,10,30,${(1-amb)*0.82})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // світло факелів пробиває темряву
  if (torches.length) {
    ctx.globalCompositeOperation = "lighter";
    for (const [tx, ty] of torches) {
      const r = 72 + Math.sin(Date.now()/120 + tx) * 6;
      const gr = ctx.createRadialGradient(tx, ty, 4, tx, ty, r);
      gr.addColorStop(0, "rgba(255,190,90,0.5)");
      gr.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(tx, ty, r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // підсвітка цільового блока
  const t = targetBlock();
  if (inBounds(t.bx, t.by) && t.inReach) {
    ctx.strokeStyle = getBlock(t.bx, t.by) === B.AIR ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(t.bx*TILE - cam.x, t.by*TILE - cam.y, TILE, TILE);
  }

  drawHUD();
}

function drawPlayer() {
  drawCharacter(player, { hurt: player.hurtCd > 25 });
}

// універсальний рендер людини: підходить і для гравця, і для мережевих гравців.
// opts: { hurt, shirt, pants }
function drawCharacter(p, opts) {
  opts = opts || {};
  const shirt = opts.shirt || "#3a7ca8";
  const pants = opts.pants || "#2f4a6b";
  const px = Math.floor(p.x - cam.x), py = Math.floor(p.y - cam.y);
  const w = p.w, h = p.h;
  const walking = Math.abs(p.vx || 0) > 0.5 && p.onGround !== false;
  const swing = walking ? Math.sin(Date.now()/90) * 5 : 0;
  ctx.save();
  if (opts.hurt) ctx.globalAlpha = 0.5;                // мерехтіння при ударі
  ctx.translate(px + w/2, py);
  if ((p.face || 1) < 0) ctx.scale(-1, 1);
  ctx.translate(-w/2, 0);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(w/2, h, w*0.55, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = pants;
  ctx.fillRect(w*0.1, h*0.62, w*0.32, h*0.38 + swing);
  ctx.fillRect(w*0.58, h*0.62, w*0.32, h*0.38 - swing);
  ctx.fillStyle = shirt; ctx.fillRect(w*0.05, h*0.32, w*0.9, h*0.34);
  ctx.fillStyle = "#e0b48a";
  ctx.fillRect(0, h*0.34, w*0.18, h*0.26);
  ctx.fillRect(w*0.82, h*0.34, w*0.18, h*0.26);
  ctx.fillStyle = "#e8bd92"; ctx.fillRect(w*0.18, 0, w*0.64, h*0.32);
  ctx.fillStyle = "#5b3a22";
  ctx.fillRect(w*0.18, 0, w*0.64, h*0.10);
  ctx.fillRect(w*0.18, 0, w*0.12, h*0.22);
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(w*0.6, h*0.14, w*0.1, h*0.06);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// серця здоров'я + підпис часу
function drawHUD() {
  const hearts = player.maxHp / 2;
  const startX = canvas.width/2 - hearts*11 + 5;
  const y = canvas.height - 86;
  for (let i = 0; i < hearts; i++) {
    const hp = player.hp - i*2;        // 2,1,0 для цього серця
    drawHeart(startX + i*22, y, hp >= 2 ? 1 : hp === 1 ? 0.5 : 0);
  }
}
function drawHeart(x, y, fill) {
  ctx.save(); ctx.translate(x, y);
  // тінь/контур
  ctx.fillStyle = "rgba(0,0,0,0.5)"; heartPath(1, 1, 9); ctx.fill();
  ctx.fillStyle = "#5a1a1a"; heartPath(0, 0, 9); ctx.fill();
  if (fill > 0) {
    ctx.fillStyle = "#e23b3b";
    if (fill < 1) { ctx.save(); ctx.beginPath(); ctx.rect(-9, -9, 9, 18); ctx.clip(); heartPath(0,0,9); ctx.fill(); ctx.restore(); }
    else { heartPath(0, 0, 9); ctx.fill(); }
  }
  ctx.restore();
}
function heartPath(ox, oy, s) {
  ctx.beginPath();
  ctx.moveTo(ox, oy + s*0.3);
  ctx.bezierCurveTo(ox - s, oy - s*0.7, ox - s*1.1, oy + s*0.2, ox, oy + s);
  ctx.bezierCurveTo(ox + s*1.1, oy + s*0.2, ox + s, oy - s*0.7, ox, oy + s*0.3);
  ctx.closePath();
}
