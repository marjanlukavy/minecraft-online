"use strict";
// ===================== Світ: дані та доступ =====================
const world = new Uint8Array(WORLD_W * WORLD_H);
const idx = (x, y) => y * WORLD_W + x;
const inBounds = (x, y) => x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
const getBlock = (x, y) => inBounds(x, y) ? world[idx(x, y)] : B.STONE;
const setBlock = (x, y, v) => { if (inBounds(x, y)) world[idx(x, y)] = v; };
const isSolid = b => b !== B.AIR && ITEMS[b] && ITEMS[b].solid;
const isClimb = b => ITEMS[b] && ITEMS[b].climb;     // сходи: можна лізти

// чи перекриває сутність climbable-блок (сходи)
function overlapsClimb(e) {
  const left = Math.floor(e.x / TILE), right = Math.floor((e.x + e.w) / TILE);
  const top = Math.floor(e.y / TILE), bottom = Math.floor((e.y + e.h) / TILE);
  for (let bx = left; bx <= right; bx++)
    for (let by = top; by <= bottom; by++)
      if (inBounds(bx, by) && isClimb(getBlock(bx, by))) return true;
  return false;
}

// ===================== Сталий світ: хаб-газон + будинок =====================
const GROUND = 56;          // рядок поверхні газону (на ньому стоїть гравець)

// межі будинку в тайлах (мають збігатися з house.js та server.js!)
const HOUSE = {
  x0: 114, x1: 133,         // колони лівої та правої стін
  roofTop: 44,              // верх стін (вище — дах-фасад)
  floorUp: 50,              // плита 2-го поверху = стеля 1-го
  floorGnd: GROUND,         // плита 1-го поверху = стеля підвалу
  floorBas: 62,             // підлога підвалу
};

function generateWorld() {
  const heightMap = new Array(WORLD_W).fill(GROUND);
  for (let x = 0; x < WORLD_W; x++)
    for (let y = 0; y < WORLD_H; y++) {
      if (y < GROUND) world[idx(x, y)] = B.AIR;
      else if (y === GROUND) world[idx(x, y)] = B.GRASS;
      else if (y < GROUND + 4) world[idx(x, y)] = B.DIRT;
      else world[idx(x, y)] = B.STONE;
    }
  decorateHub();
  buildHouse();
  return { heightMap, baseLevel: GROUND };
}

// декоративні дерева на газоні (подалі від будинку)
function decorateHub() {
  for (const tx of [60, 84, 168, 196, 224]) {
    const th = 4 + (tx % 3);
    for (let i = 1; i <= th; i++) setBlock(tx, GROUND - i, B.WOOD);
    const top = GROUND - th;
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 1; dy++) {
        if (Math.abs(dx) === 2 && dy <= -1) continue;
        if (getBlock(tx + dx, top + dy) === B.AIR) setBlock(tx + dx, top + dy, B.LEAVES);
      }
  }
}

// триповерховий будинок зі сходами
function buildHouse() {
  const H = HOUSE, ix0 = H.x0 + 1, ix1 = H.x1 - 1;
  // 1) порожнина: кімнати + підвал
  for (let x = ix0; x <= ix1; x++)
    for (let y = H.roofTop; y < H.floorBas; y++) setBlock(x, y, B.AIR);
  // 2) стіни: над землею — дошки, фундамент — камінь
  for (let y = H.roofTop; y <= H.floorBas; y++) {
    const wall = y < H.floorGnd ? B.PLANK : B.STONE;
    setBlock(H.x0, y, wall); setBlock(H.x1, y, wall);
  }
  // 3) перекриття між поверхами
  for (let x = ix0; x <= ix1; x++) {
    setBlock(x, H.floorUp, B.PLANK);
    setBlock(x, H.floorGnd, B.PLANK);
    setBlock(x, H.floorBas, B.STONE);
  }
  // 4) двері в лівій стіні (рівень землі)
  setBlock(H.x0, 54, B.AIR); setBlock(H.x0, 55, B.AIR);
  // 5) вікна
  setBlock(H.x0, 46, B.GLASS); setBlock(H.x1, 46, B.GLASS);
  setBlock(H.x1, 52, B.GLASS);
  // 6) сходи: 1↔2 поверх (праворуч) та 1↔підвал (ліворуч), крізь плити
  for (let y = 48; y <= 55; y++) setBlock(131, y, B.STAIRS);
  for (let y = 54; y <= 61; y++) setBlock(116, y, B.STAIRS);
  // 7) лампи-факели
  setBlock(ix0, 47, B.TORCH);
  setBlock(ix0, 53, B.TORCH);
  setBlock(ix1, 53, B.TORCH);
  setBlock(ix0, 59, B.TORCH);
}
const worldMeta = generateWorld();

// ===================== Колізії / фізика для сутностей =====================
function collideBox(x, y, w, h) {
  const left = Math.floor(x / TILE), right = Math.floor((x + w) / TILE);
  const top = Math.floor(y / TILE), bottom = Math.floor((y + h) / TILE);
  for (let bx = left; bx <= right; bx++)
    for (let by = top; by <= bottom; by++)
      if (isSolid(getBlock(bx, by))) return true;
  return false;
}

// рухає сутність {x,y,w,h,vx,vy,onGround} з урахуванням колізій
function moveEntity(e) {
  let nx = e.x + e.vx;
  if (!collideBox(nx, e.y, e.w, e.h)) e.x = nx;
  else { while (!collideBox(e.x + Math.sign(e.vx), e.y, e.w, e.h) &&
                Math.abs(e.x - nx) > 0.5) e.x += Math.sign(e.vx); e.vx = 0; }
  let ny = e.y + e.vy; e.onGround = false;
  if (!collideBox(e.x, ny, e.w, e.h)) e.y = ny;
  else { while (!collideBox(e.x, e.y + Math.sign(e.vy), e.w, e.h) &&
                Math.abs(e.y - ny) > 0.5) e.y += Math.sign(e.vy);
         if (e.vy > 0) e.onGround = true; e.vy = 0; }
  e.x = Math.max(0, Math.min(WORLD_W * TILE - e.w, e.x));
}

// поверхня (перший твердий блок зверху) у колонці bx
function surfaceY(bx) {
  for (let y = 0; y < WORLD_H; y++) if (isSolid(getBlock(bx, y))) return y;
  return WORLD_H - 1;
}
