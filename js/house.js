"use strict";
// =====================================================================
//  Будинок: інтер'єр (кімнати + меблі), фасад-cutaway та тепле світло.
//  Фасад непрозорий, коли ти зовні, і плавно зникає, коли заходиш усередину.
//  Координати мають збігатися з HOUSE/buildHouse() у world.js.
// =====================================================================

let houseFacade = 1;          // 1 = фасад видно (зовні), ~0.1 = всередині

const fx = tx => Math.round(tx * TILE - cam.x);   // тайл-X → екран
const fy = ty => Math.round(ty * TILE - cam.y);   // тайл-Y → екран

// гравець усередині коробки будинку?
function playerInsideHouse() {
  const pcx = (player.x + player.w / 2) / TILE;
  const pcy = (player.y + player.h / 2) / TILE;
  return pcx > HOUSE.x0 && pcx < HOUSE.x1 + 1 &&
         pcy > HOUSE.roofTop - 1 && pcy < HOUSE.floorBas + 1;
}

function updateHouse() {
  const target = playerInsideHouse() ? 0.10 : 1.0;
  houseFacade += (target - houseFacade) * 0.12;     // плавний перехід
}

// ===================== Інтер'єр (за фасадом) =====================
const ROOMS = [
  { x0: 115, x1: 132, y0: 45, y1: 49, base: 50, bg: "#c8a87e", floor: "#9c7748" }, // 2-й: спальня
  { x0: 115, x1: 132, y0: 51, y1: 55, base: 56, bg: "#b8946a", floor: "#8a6a40" }, // 1-й: вітальня
  { x0: 115, x1: 132, y0: 57, y1: 61, base: 62, bg: "#56555b", floor: "#3c3b40" }, // підвал
];

function drawHouseInterior() {
  for (const r of ROOMS) {
    const px = fx(r.x0), py = fy(r.y0);
    const w = (r.x1 - r.x0 + 1) * TILE, h = (r.y1 - r.y0 + 1) * TILE;
    const g = ctx.createLinearGradient(0, py, 0, py + h);
    g.addColorStop(0, shade(r.bg, 16));
    g.addColorStop(1, shade(r.bg, -14));
    ctx.fillStyle = g; ctx.fillRect(px, py, w, h);
    // вертикальні панелі на стіні
    ctx.strokeStyle = "rgba(0,0,0,0.07)"; ctx.lineWidth = 1;
    for (let xx = px + TILE; xx < px + w; xx += TILE) {
      ctx.beginPath(); ctx.moveTo(xx, py); ctx.lineTo(xx, py + h); ctx.stroke();
    }
    // підлога-смужка
    ctx.fillStyle = r.floor; ctx.fillRect(px, fy(r.base) - 7, w, 7);
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(px, fy(r.base) - 7, w, 2);
  }
  drawFurniture();
  drawLadder(131, 48, 55);   // сходи нагору
  drawLadder(116, 54, 61);   // сходи в підвал
}

function drawLadder(tx, ty0, ty1) {
  const x = fx(tx), y0 = fy(ty0), y1 = fy(ty1 + 1);
  const lw = TILE * 0.58, ox = x + TILE * 0.16;
  ctx.fillStyle = "#5c3f20";
  ctx.fillRect(ox, y0, 4, y1 - y0);
  ctx.fillRect(ox + lw, y0, 4, y1 - y0);
  ctx.fillStyle = "#8a6435";
  for (let yy = y0 + 4; yy < y1; yy += 8) ctx.fillRect(ox, yy, lw + 4, 3);
}

function drawFurniture() {
  // ---------- 2-й поверх: спальня ----------
  let base = 50 * TILE;
  bed(116.3, base, 3.6);
  nightstand(120.4, base);
  plant(130.6, base);
  picture(124.5, 46.4, "#3a6ea5");
  picture(127.2, 46.4, "#7a4b8a");

  // ---------- 1-й поверх: вітальня ----------
  base = 56 * TILE;
  rug(118, base, 6.5);
  sofa(117.4, base, 3.2);
  table(121.2, base);
  bookshelf(124.6, base);
  fireplace(128.2, base);

  // ---------- підвал ----------
  base = 62 * TILE;
  barrel(118.4, base);
  barrel(120.1, base);
  crates(125.4, base);
  shelf(129.6, base);
}

// --- меблі (tx = ліва межа в тайлах, by = піксельна підлога) ---
function bed(tx, by, wTiles) {
  const x = fx(tx), y = by - cam.y, w = wTiles * TILE;
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(x, y - 18, w, 18);            // каркас
  ctx.fillStyle = "#d8534e"; ctx.fillRect(x + 3, y - 24, w - 6, 10);   // ковдра
  ctx.fillStyle = "#f3ece0"; ctx.fillRect(x + 4, y - 28, w * 0.28, 9); // подушка
  ctx.fillStyle = "#5a3c20"; ctx.fillRect(x, y - 34, 5, 34);           // спинка
}
function nightstand(tx, by) {
  const x = fx(tx), y = by - cam.y;
  ctx.fillStyle = "#7a5430"; ctx.fillRect(x, y - 16, TILE * 0.7, 16);
  ctx.fillStyle = "#4d3520"; ctx.fillRect(x + 4, y - 10, TILE * 0.7 - 8, 3);
  // лампа
  ctx.fillStyle = "#caa15a"; ctx.fillRect(x + TILE * 0.3, y - 24, 4, 8);
  ctx.fillStyle = "#ffe9a8"; ctx.beginPath(); ctx.moveTo(x + TILE * 0.18, y - 24);
  ctx.lineTo(x + TILE * 0.52, y - 24); ctx.lineTo(x + TILE * 0.46, y - 32);
  ctx.lineTo(x + TILE * 0.24, y - 32); ctx.closePath(); ctx.fill();
}
function plant(tx, by) {
  const x = fx(tx), y = by - cam.y;
  ctx.fillStyle = "#a4673a"; ctx.fillRect(x, y - 12, TILE * 0.5, 12);  // горщик
  ctx.fillStyle = "#3f8f44";
  ctx.beginPath(); ctx.arc(x + TILE * 0.25, y - 20, 11, 0, 7); ctx.fill();
  ctx.fillStyle = "#4fae55";
  ctx.beginPath(); ctx.arc(x + TILE * 0.1, y - 16, 7, 0, 7);
  ctx.arc(x + TILE * 0.42, y - 17, 7, 0, 7); ctx.fill();
}
function picture(tx, ty, col) {
  const x = fx(tx), y = fy(ty), w = TILE * 0.9, h = TILE * 0.7;
  ctx.fillStyle = "#caa45a"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x + 3, y + 3, w - 6, 4);
}
function rug(tx, by, wTiles) {
  const x = fx(tx), y = by - cam.y, w = wTiles * TILE;
  ctx.fillStyle = "#8a3b46"; ctx.fillRect(x, y - 3, w, 3);
  ctx.fillStyle = "#b9606a"; ctx.fillRect(x + 6, y - 3, w - 12, 1.5);
}
function sofa(tx, by, wTiles) {
  const x = fx(tx), y = by - cam.y, w = wTiles * TILE;
  ctx.fillStyle = "#3f6f8a"; ctx.fillRect(x, y - 14, w, 14);            // сидіння
  ctx.fillStyle = "#356079"; ctx.fillRect(x, y - 26, w, 14);           // спинка
  ctx.fillStyle = "#4a82a0";
  ctx.fillRect(x, y - 26, 6, 26); ctx.fillRect(x + w - 6, y - 26, 6, 26); // підлокітники
}
function table(tx, by) {
  const x = fx(tx), y = by - cam.y, w = TILE * 1.1;
  ctx.fillStyle = "#7a5430"; ctx.fillRect(x, y - 14, w, 4);
  ctx.fillStyle = "#5e3f22"; ctx.fillRect(x + 3, y - 14, 3, 14); ctx.fillRect(x + w - 6, y - 14, 3, 14);
  ctx.fillStyle = "#d9c27a"; ctx.fillRect(x + w * 0.3, y - 20, 6, 6); // ваза/чашка
}
function bookshelf(tx, by) {
  const x = fx(tx), y = by - cam.y, w = TILE * 1.1, h = 40;
  ctx.fillStyle = "#5e3f22"; ctx.fillRect(x, y - h, w, h);
  const cols = ["#9e4b3a", "#3f7d44", "#3a6ea5", "#caa15a", "#7a4b8a"];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = cols[(i + r) % cols.length];
      ctx.fillRect(x + 4 + i * (w - 8) / 5, y - h + 4 + r * 12, (w - 8) / 5 - 2, 10);
    }
}
function fireplace(tx, by) {
  const x = fx(tx), y = by - cam.y, w = TILE * 1.5, h = 44;
  ctx.fillStyle = "#7d7d82"; ctx.fillRect(x, y - h, w, h);             // камінь
  ctx.fillStyle = "#5a5a60"; ctx.fillRect(x + 6, y - h + 10, w - 12, h - 10); // топка
  ctx.fillStyle = "#1c1c1f"; ctx.fillRect(x + 10, y - h + 16, w - 20, h - 18);
  // вогонь
  const t = Date.now() / 120;
  ctx.fillStyle = "#ff8a1f";
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 9, y - 4);
  ctx.quadraticCurveTo(x + w / 2, y - 26 - Math.sin(t) * 3, x + w / 2 + 9, y - 4); ctx.fill();
  ctx.fillStyle = "#ffd24d";
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 5, y - 4);
  ctx.quadraticCurveTo(x + w / 2, y - 18 - Math.cos(t) * 3, x + w / 2 + 5, y - 4); ctx.fill();
}
function barrel(tx, by) {
  const x = fx(tx), y = by - cam.y, w = TILE * 0.7, h = 22;
  ctx.fillStyle = "#7a5430"; ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = "#5e3f22"; ctx.fillRect(x, y - h + 4, w, 3); ctx.fillRect(x, y - 6, w, 3);
  ctx.fillStyle = "#8a6435"; ctx.fillRect(x + 2, y - h, 2, h);
}
function crates(tx, by) {
  const x = fx(tx), y = by - cam.y, s = TILE * 0.7;
  const box = (ox, oy) => {
    ctx.fillStyle = "#9a7240"; ctx.fillRect(ox, oy, s, s);
    ctx.strokeStyle = "#5e3f22"; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, s, s);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + s, oy + s);
    ctx.moveTo(ox + s, oy); ctx.lineTo(ox, oy + s); ctx.stroke();
  };
  box(x, y - s); box(x + s + 2, y - s); box(x + s * 0.5, y - s * 2 - 2);
}
function shelf(tx, by) {
  const x = fx(tx), y = by - cam.y, w = TILE * 1.0;
  ctx.fillStyle = "#5e3f22";
  ctx.fillRect(x, y - 30, w, 3); ctx.fillRect(x, y - 14, w, 3);
  const jars = ["#6ee7e0", "#caa15a", "#9e4b3a"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = jars[i];
    ctx.fillRect(x + 3 + i * (w / 3), y - 28, w / 3 - 5, 11);
    ctx.fillRect(x + 3 + i * (w / 3), y - 12, w / 3 - 5, 9);
  }
}

// ===================== Фасад-cutaway =====================
function drawHouseFacade() {
  const a = houseFacade;
  if (a < 0.02) return;
  const x0 = fx(HOUSE.x0), x1 = fx(HOUSE.x1 + 1);
  const w = x1 - x0;
  const wallTop = fy(HOUSE.roofTop);          // 44
  const wallBot = fy(HOUSE.floorGnd);         // 56 (рівень землі)
  const apexY = fy(HOUSE.roofTop - 7);        // вершина даху
  const eaveOver = TILE * 0.7;

  ctx.save();
  ctx.globalAlpha = a;

  // --- стіни (тинькований фахверк) ---
  const wg = ctx.createLinearGradient(0, wallTop, 0, wallBot);
  wg.addColorStop(0, "#efe4cf"); wg.addColorStop(1, "#dccdb0");
  ctx.fillStyle = wg; ctx.fillRect(x0, wallTop, w, wallBot - wallTop);
  // дерев'яні балки (Tudor)
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(x0, wallTop, w, 6); ctx.fillRect(x0, wallBot - 6, w, 6);
  ctx.fillRect(x0, wallTop, 6, wallBot - wallTop); ctx.fillRect(x1 - 6, wallTop, 6, wallBot - wallTop);
  const midY = fy(HOUSE.floorUp);             // балка між поверхами (50)
  ctx.fillRect(x0, midY - 3, w, 6);
  // діагональні балки
  ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 5;
  for (let bx = x0 + TILE * 1.5; bx < x1 - TILE; bx += TILE * 3) {
    ctx.beginPath(); ctx.moveTo(bx, midY); ctx.lineTo(bx + TILE, wallBot - 6);
    ctx.moveTo(bx + TILE * 2, midY); ctx.lineTo(bx + TILE, wallBot - 6); ctx.stroke();
  }

  // --- вікна з теплим світлом ---
  houseWindow(x0 + TILE * 1.0, fy(45.4), TILE * 1.4, TILE * 1.5);   // 2-й лівий
  houseWindow(x1 - TILE * 2.4, fy(45.4), TILE * 1.4, TILE * 1.5);   // 2-й правий
  houseWindow(x1 - TILE * 2.4, fy(51.4), TILE * 1.4, TILE * 1.7);   // 1-й правий

  // --- двері (зліва, де отвір) ---
  const dx = x0 + TILE * 0.3, dyTop = fy(53.1), dh = wallBot - dyTop;
  ctx.fillStyle = "#5a3a1c"; ctx.fillRect(dx, dyTop, TILE * 1.5, dh);
  ctx.fillStyle = "#6e4a26";
  ctx.fillRect(dx + 3, dyTop + 3, TILE * 1.5 - 6, dh - 6);
  ctx.strokeStyle = "#3f2a14"; ctx.lineWidth = 2;
  ctx.strokeRect(dx + 7, dyTop + 7, TILE * 1.5 - 14, dh * 0.45);
  ctx.strokeRect(dx + 7, dyTop + dh * 0.52, TILE * 1.5 - 14, dh * 0.4);
  ctx.fillStyle = "#ffd24d"; ctx.beginPath();
  ctx.arc(dx + TILE * 1.5 - 9, dyTop + dh * 0.55, 3, 0, 7); ctx.fill();

  // --- дах (двосхилий, з гребенем) ---
  ctx.fillStyle = "#7a3b34";
  ctx.beginPath();
  ctx.moveTo(x0 - eaveOver, wallTop);
  ctx.lineTo(x0 + w / 2, apexY);
  ctx.lineTo(x1 + eaveOver, wallTop);
  ctx.closePath(); ctx.fill();
  // черепиця (ряди)
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 2;
  for (let i = 1; i <= 4; i++) {
    const ry = wallTop - (wallTop - apexY) * (i / 5);
    const t = i / 5, lx = x0 - eaveOver + (w / 2 + eaveOver) * t, rx = x1 + eaveOver - (w / 2 + eaveOver) * t;
    ctx.beginPath(); ctx.moveTo(lx, ry); ctx.lineTo(rx, ry); ctx.stroke();
  }
  ctx.fillStyle = "#5e2c27";                                  // карниз
  ctx.fillRect(x0 - eaveOver, wallTop - 4, w + eaveOver * 2, 6);

  // --- димар + дим ---
  const cmx = x0 + w * 0.72, cmy = fy(40);
  ctx.fillStyle = "#9e4b3a"; ctx.fillRect(cmx, cmy, TILE * 0.8, TILE * 1.4);
  ctx.fillStyle = "#7d3a2c"; ctx.fillRect(cmx, cmy, TILE * 0.8, 5);
  ctx.fillStyle = "rgba(220,220,225,0.5)";
  const t = Date.now() / 600;
  for (let i = 0; i < 3; i++) {
    const sy = cmy - 10 - i * 14, sx = cmx + TILE * 0.4 + Math.sin(t + i) * 6;
    ctx.beginPath(); ctx.arc(sx, sy, 6 + i * 2, 0, 7); ctx.fill();
  }

  // --- вивіска ---
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(x0 + w / 2 - TILE * 0.9, wallTop + 10, TILE * 1.8, TILE * 0.7);
  ctx.fillStyle = "#f3ece0"; ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.fillText("Дім", x0 + w / 2, wallTop + 10 + TILE * 0.5);
  ctx.textAlign = "left";

  ctx.restore();
}

function houseWindow(x, y, w, h) {
  ctx.fillStyle = "#5a3a1c"; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);   // рама
  ctx.fillStyle = "#ffe6a0"; ctx.fillRect(x, y, w, h);                   // тепле скло
  ctx.strokeStyle = "#5a3a1c"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
}

// ===================== Тепле світло (composite "lighter") =====================
// Викликається в render.js у блоці підсвітки. Вікна світяться, особливо вночі.
function drawHouseLights() {
  const night = 1 - getAmbient();
  const glow = 0.35 + night * 0.55;
  const pts = [
    [HOUSE.x0 + 1.7, 46.2], [HOUSE.x1 - 1.7, 46.2], [HOUSE.x1 - 1.7, 52.3], // вікна
  ];
  for (const [tx, ty] of pts) {
    const cx = fx(tx) + TILE / 2, cy = fy(ty) + TILE / 2;
    const r = 90;
    const gr = ctx.createRadialGradient(cx, cy, 6, cx, cy, r);
    gr.addColorStop(0, `rgba(255,210,120,${0.5 * glow * houseFacade})`);
    gr.addColorStop(1, "rgba(255,210,120,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  }
}
