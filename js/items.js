"use strict";
// ===================== Реєстр блоків і предметів =====================
// Блоки: id 1..63 (зберігаються у світі). Предмети: id >= 100 (лише в інвентарі).
const B = { AIR:0, GRASS:1, DIRT:2, STONE:3, WOOD:4, LEAVES:5,
            SAND:6, COAL:7, IRON:8, GOLD:9, DIAMOND:10, PLANK:11,
            GLASS:12, WATER:13, SNOW:14, BRICK:15, TORCH:16 };

const I = { STICK:100, APPLE:101, PICKAXE:102, SWORD:103,
            COAL_I:104, IRON_I:105, GOLD_I:106, DIAMOND_I:107 };

const ITEMS = {
  // --- блоки (block:true → можна ставити) ---
  [B.GRASS]:   { name:"Трава",    base:"#5f9e3a", top:"#7bc44f", solid:true, block:true },
  [B.DIRT]:    { name:"Земля",    base:"#7a5234", solid:true, block:true },
  [B.STONE]:   { name:"Камінь",   base:"#8a8a8f", solid:true, block:true },
  [B.WOOD]:    { name:"Деревина", base:"#6b4a26", solid:true, block:true },
  [B.LEAVES]:  { name:"Листя",    base:"#3f8f33", solid:true, leaf:true, block:true },
  [B.SAND]:    { name:"Пісок",    base:"#e3d39b", solid:true, block:true },
  [B.PLANK]:   { name:"Дошки",    base:"#b5854b", solid:true, block:true },
  [B.GLASS]:   { name:"Скло",     base:"#bfe9f7", solid:true, glass:true, block:true },
  [B.WATER]:   { name:"Вода",     base:"#3a78d0", solid:false, water:true, block:true },
  [B.SNOW]:    { name:"Сніг",     base:"#eef4f8", solid:true, block:true },
  [B.BRICK]:   { name:"Цегла",    base:"#9e4b3a", solid:true, block:true },
  [B.TORCH]:   { name:"Факел",    base:"#caa15a", solid:false, torch:true, block:true },
  // руда в землі (дроп — ресурс-предмет)
  [B.COAL]:    { name:"Вугільна руда", base:"#8a8a8f", ore:"#2b2b2b", solid:true },
  [B.IRON]:    { name:"Залізна руда",  base:"#8a8a8f", ore:"#c8a17a", solid:true },
  [B.GOLD]:    { name:"Золота руда",   base:"#8a8a8f", ore:"#f4d35e", solid:true },
  [B.DIAMOND]: { name:"Алмазна руда",  base:"#8a8a8f", ore:"#6ee7e0", solid:true },
  // --- предмети (іконки малюються кодом) ---
  [I.STICK]:    { name:"Паличка", icon:"stick" },
  [I.APPLE]:    { name:"Яблуко",  icon:"apple", food:6 },
  [I.PICKAXE]:  { name:"Кирка",   icon:"pickaxe", tool:true },
  [I.SWORD]:    { name:"Меч",     icon:"sword",   tool:true, dmg:4 },
  [I.COAL_I]:   { name:"Вугілля", icon:"coal" },
  [I.IRON_I]:   { name:"Залізо",  icon:"iron" },
  [I.GOLD_I]:   { name:"Золото",  icon:"gold" },
  [I.DIAMOND_I]:{ name:"Алмаз",   icon:"diamond" },
};
const maxStack = id => (ITEMS[id] && ITEMS[id].tool) ? 1 : MAX_STACK;

// що випадає при видобутку блока
function getDrop(b) {
  switch (b) {
    case B.GRASS: return { id: B.DIRT, n: 1 };
    case B.GLASS: return null;
    case B.WATER: return null;
    case B.LEAVES:
      if (Math.random() < 0.06) return { id: I.APPLE, n: 1 };
      if (Math.random() < 0.25) return { id: I.STICK, n: 1 };
      return null;
    case B.COAL:    return { id: I.COAL_I,    n: 1 };
    case B.IRON:    return { id: I.IRON_I,    n: 1 };
    case B.GOLD:    return { id: I.GOLD_I,    n: 1 };
    case B.DIAMOND: return { id: I.DIAMOND_I, n: 1 };
    default:        return { id: b, n: 1 };
  }
}

// ===================== Псевдошум та кольори =====================
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `rgb(${r},${g},${b})`;
}

// ===================== Текстури блоків =====================
const texCache = {};
function makeTexture(id) {
  const def = ITEMS[id];
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const g = c.getContext("2d");
  const px = 4;

  if (def.torch) {                                  // факел на прозорому фоні
    g.fillStyle = "#6b4a26"; g.fillRect(TILE/2-2, TILE*0.45, 4, TILE*0.5);
    g.fillStyle = "#3a2716"; g.fillRect(TILE/2-2, TILE*0.45, 2, TILE*0.5);
    g.fillStyle = "#ffd24d"; g.fillRect(TILE/2-4, TILE*0.28, 8, 10);
    g.fillStyle = "#ff8a1f"; g.fillRect(TILE/2-3, TILE*0.34, 6, 6);
    g.fillStyle = "#fff6c2"; g.fillRect(TILE/2-1, TILE*0.30, 3, 4);
    texCache[id] = c; return c;
  }

  g.fillStyle = def.base; g.fillRect(0, 0, TILE, TILE);
  for (let y = 0; y < TILE; y += px)
    for (let x = 0; x < TILE; x += px) {
      const amt = (hash(x + id*31, y + id*71) - 0.5) * 38;
      g.fillStyle = shade(def.base, amt); g.fillRect(x, y, px, px);
    }
  if (def.top) {
    g.fillStyle = def.top; g.fillRect(0, 0, TILE, 7);
    for (let x = 0; x < TILE; x += px) {
      const h = 7 + Math.floor(hash(x, id) * 6); g.fillRect(x, 7, px, h-7);
    }
  }
  if (def.ore) for (let i = 0; i < 6; i++) {
    const rx = Math.floor(hash(i, id)*(TILE-8))+2, ry = Math.floor(hash(i+50, id)*(TILE-8))+2;
    g.fillStyle = shade(def.ore, -15); g.fillRect(rx, ry, 6, 6);
    g.fillStyle = def.ore;             g.fillRect(rx+1, ry+1, 3, 3);
  }
  if (def.glass) {
    g.clearRect(2, 2, TILE-4, TILE-4);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(2, 2, TILE-4, TILE-4);
    g.strokeStyle = "#dff3fb"; g.lineWidth = 2; g.strokeRect(1, 1, TILE-2, TILE-2);
    g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(5, 5, 4, 12);
  }
  if (def.leaf) for (let i = 0; i < 10; i++)
    g.clearRect(Math.floor(hash(i, id+9)*TILE), Math.floor(hash(i+5, id+9)*TILE), px, px);
  if (def.water) { g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, 0, TILE, 5); }
  g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 2; g.strokeRect(1, 1, TILE-2, TILE-2);
  texCache[id] = c; return c;
}

// ===================== Іконки предметів =====================
const iconCache = {};
function makeIcon(id) {
  const def = ITEMS[id], S = TILE;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  switch (def.icon) {
    case "stick":
      g.save(); g.translate(S/2, S/2); g.rotate(-0.7);
      g.fillStyle = "#7a5a32"; g.fillRect(-3, -11, 6, 22);
      g.fillStyle = "#5c4426"; g.fillRect(-3, -11, 2, 22); g.restore(); break;
    case "apple":
      g.fillStyle = "#cf2f2f";
      g.beginPath(); g.arc(S*0.42, S*0.58, S*0.26, 0, 7); g.fill();
      g.beginPath(); g.arc(S*0.6, S*0.58, S*0.22, 0, 7); g.fill();
      g.fillStyle = "#ff7b6b"; g.beginPath(); g.arc(S*0.4, S*0.5, S*0.07, 0, 7); g.fill();
      g.fillStyle = "#5c3a1a"; g.fillRect(S*0.5, S*0.22, 3, 9);
      g.fillStyle = "#4caf50"; g.beginPath(); g.ellipse(S*0.62, S*0.26, 7, 4, -0.6, 0, 7); g.fill(); break;
    case "pickaxe":
      g.strokeStyle = "#7a5a32"; g.lineWidth = 5; g.lineCap = "round";
      g.beginPath(); g.moveTo(S*0.32, S*0.8); g.lineTo(S*0.62, S*0.28); g.stroke();
      g.strokeStyle = "#b9c0c7"; g.lineWidth = 7;
      g.beginPath(); g.moveTo(S*0.34, S*0.22); g.quadraticCurveTo(S*0.62, S*0.16, S*0.86, S*0.34); g.stroke(); break;
    case "sword":
      g.strokeStyle = "#cdd3da"; g.lineWidth = 6; g.lineCap = "round";
      g.beginPath(); g.moveTo(S*0.3, S*0.78); g.lineTo(S*0.72, S*0.24); g.stroke();
      g.strokeStyle = "#f4d35e"; g.lineWidth = 5;
      g.beginPath(); g.moveTo(S*0.26, S*0.58); g.lineTo(S*0.46, S*0.78); g.stroke();
      g.strokeStyle = "#7a5a32"; g.lineWidth = 6;
      g.beginPath(); g.moveTo(S*0.24, S*0.7); g.lineTo(S*0.36, S*0.84); g.stroke(); break;
    case "coal":   nugget(g, S, "#2b2b2b", "#444"); break;
    case "iron":   ingot(g, S, "#d8d8de", "#a9a9b2"); break;
    case "gold":   ingot(g, S, "#f4d35e", "#caa42e"); break;
    case "diamond":
      g.fillStyle = "#6ee7e0";
      g.beginPath(); g.moveTo(S*0.5, S*0.2); g.lineTo(S*0.78, S*0.45);
      g.lineTo(S*0.5, S*0.82); g.lineTo(S*0.22, S*0.45); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.beginPath(); g.moveTo(S*0.5, S*0.2); g.lineTo(S*0.64, S*0.45);
      g.lineTo(S*0.5, S*0.45); g.closePath(); g.fill(); break;
  }
  iconCache[id] = c; return c;
}
function nugget(g, S, c1, c2) {
  g.fillStyle = c2; g.beginPath(); g.arc(S*0.5, S*0.55, S*0.26, 0, 7); g.fill();
  g.fillStyle = c1;
  g.beginPath(); g.arc(S*0.45, S*0.5, S*0.2, 0, 7); g.fill();
  g.beginPath(); g.arc(S*0.62, S*0.62, S*0.13, 0, 7); g.fill();
}
function ingot(g, S, c1, c2) {
  g.fillStyle = c2;
  g.beginPath(); g.moveTo(S*0.28, S*0.42); g.lineTo(S*0.72, S*0.42);
  g.lineTo(S*0.8, S*0.66); g.lineTo(S*0.2, S*0.66); g.closePath(); g.fill();
  g.fillStyle = c1; g.fillRect(S*0.3, S*0.46, S*0.4, S*0.1);
}

// зображення предмета (блок або item)
function getImg(id) {
  if (id >= 100) return iconCache[id] || makeIcon(id);
  return texCache[id] || makeTexture(id);
}
