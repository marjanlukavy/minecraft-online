"use strict";
// ===================== Світ: дані та доступ =====================
const world = new Uint8Array(WORLD_W * WORLD_H);
const idx = (x, y) => y * WORLD_W + x;
const inBounds = (x, y) => x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
const getBlock = (x, y) => inBounds(x, y) ? world[idx(x, y)] : B.STONE;
const setBlock = (x, y, v) => { if (inBounds(x, y)) world[idx(x, y)] = v; };
const isSolid = b => b !== B.AIR && ITEMS[b] && ITEMS[b].solid;

// плавний 1D шум для рельєфу
function noise1D(x, seed, scale, amp) {
  const xs = x / scale, x0 = Math.floor(xs), x1 = x0 + 1, t = xs - x0;
  const s = t * t * (3 - 2 * t);
  const a = hash(x0, seed), b = hash(x1, seed);
  return (a + (b - a) * s) * amp;
}

function generateWorld() {
  const seed = Math.floor(Math.random() * 1000);
  const baseLevel = Math.floor(WORLD_H * 0.42);
  const heightMap = [];
  for (let x = 0; x < WORLD_W; x++) {
    let h = baseLevel;
    h += noise1D(x, seed, 28, 16) - 8;
    h += noise1D(x, seed + 1, 9, 6) - 3;
    heightMap[x] = Math.floor(h);
  }
  for (let x = 0; x < WORLD_W; x++) {
    const surf = heightMap[x], snowy = surf < baseLevel - 9;
    for (let y = 0; y < WORLD_H; y++) {
      if (y < surf) world[idx(x, y)] = B.AIR;
      else if (y === surf) world[idx(x, y)] = snowy ? B.SNOW : B.GRASS;
      else if (y < surf + 4) world[idx(x, y)] = B.DIRT;
      else world[idx(x, y)] = B.STONE;
    }
  }
  // печери
  for (let x = 2; x < WORLD_W - 2; x++)
    for (let y = baseLevel + 6; y < WORLD_H - 2; y++) {
      const n = noise1D(x, seed + 7, 6, 1) + noise1D(y * 3, seed + 9, 6, 1);
      if (world[idx(x, y)] === B.STONE && n > 1.32 && n < 1.62) world[idx(x, y)] = B.AIR;
    }
  // руда
  const sprinkle = (type, chance, minY) => {
    for (let x = 0; x < WORLD_W; x++)
      for (let y = minY; y < WORLD_H; y++)
        if (world[idx(x, y)] === B.STONE && Math.random() < chance) world[idx(x, y)] = type;
  };
  sprinkle(B.COAL, 0.020, baseLevel + 2);
  sprinkle(B.IRON, 0.012, baseLevel + 6);
  sprinkle(B.GOLD, 0.005, baseLevel + 16);
  sprinkle(B.DIAMOND, 0.003, baseLevel + 24);
  // дерева
  for (let x = 3; x < WORLD_W - 3; x++) {
    if (Math.random() < 0.10) {
      const surf = heightMap[x];
      if (world[idx(x, surf)] !== B.GRASS) continue;
      const th = 4 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= th; i++) setBlock(x, surf - i, B.WOOD);
      const top = surf - th;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 1; dy++) {
          if (Math.abs(dx) === 2 && dy <= -1) continue;
          if (getBlock(x + dx, top + dy) === B.AIR) setBlock(x + dx, top + dy, B.LEAVES);
        }
    }
  }
  return { heightMap, baseLevel };
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
