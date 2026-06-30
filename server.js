"use strict";
// =====================================================================
//  Сервер мультиплеєра «Майнкрафт 2D»
//  - роздає статичні файли гри (index.html, js/*, style.css)
//  - тримає АВТОРИТЕТНИЙ світ: усі гравці бачать однаковий світ
//  - релеїть позиції гравців і зміни блоків між клієнтами по WebSocket
//  Один порт (process.env.PORT) — і HTTP, і WS (важливо для Railway).
// =====================================================================
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

// ===================== Світ (порт логіки з js/) =====================
const TILE = 32, WORLD_W = 256, WORLD_H = 96;
const B = { AIR:0, GRASS:1, DIRT:2, STONE:3, WOOD:4, LEAVES:5,
            SAND:6, COAL:7, IRON:8, GOLD:9, DIAMOND:10, PLANK:11,
            GLASS:12, WATER:13, SNOW:14, BRICK:15, TORCH:16 };

const world = new Uint8Array(WORLD_W * WORLD_H);
const idx = (x, y) => y * WORLD_W + x;
const inBounds = (x, y) => x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
const getBlock = (x, y) => inBounds(x, y) ? world[idx(x, y)] : B.STONE;
const setBlock = (x, y, v) => { if (inBounds(x, y)) world[idx(x, y)] = v; };

function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function noise1D(x, seed, scale, amp) {
  const xs = x / scale, x0 = Math.floor(xs), x1 = x0 + 1, t = xs - x0;
  const s = t * t * (3 - 2 * t);
  const a = hash(x0, seed), b = hash(x1, seed);
  return (a + (b - a) * s) * amp;
}

// Та сама генерація, що й у js/world.js — щоб світ був звичним.
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
  for (let x = 2; x < WORLD_W - 2; x++)
    for (let y = baseLevel + 6; y < WORLD_H - 2; y++) {
      const n = noise1D(x, seed + 7, 6, 1) + noise1D(y * 3, seed + 9, 6, 1);
      if (world[idx(x, y)] === B.STONE && n > 1.32 && n < 1.62) world[idx(x, y)] = B.AIR;
    }
  const sprinkle = (type, chance, minY) => {
    for (let x = 0; x < WORLD_W; x++)
      for (let y = minY; y < WORLD_H; y++)
        if (world[idx(x, y)] === B.STONE && Math.random() < chance) world[idx(x, y)] = type;
  };
  sprinkle(B.COAL, 0.020, baseLevel + 2);
  sprinkle(B.IRON, 0.012, baseLevel + 6);
  sprinkle(B.GOLD, 0.005, baseLevel + 16);
  sprinkle(B.DIAMOND, 0.003, baseLevel + 24);
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
console.log(`[світ] згенеровано ${WORLD_W}x${WORLD_H}, baseLevel=${worldMeta.baseLevel}`);

// ===================== HTTP: роздача статики =====================
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml",
};
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// ===================== WebSocket: мультиплеєр =====================
const wss = new WebSocketServer({ server });
let nextId = 1;
const clients = new Map(); // ws -> { id, name, state }

function broadcast(obj, except) {
  const data = JSON.stringify(obj);
  for (const [ws] of clients) {
    if (ws === except) continue;
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

wss.on("connection", (ws) => {
  const id = nextId++;
  const client = { id, name: "Гравець", state: null };
  clients.set(ws, client);
  console.log(`[ws] під'єднався #${id} (всього ${clients.size})`);

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.t === "hello") {
      client.name = String(msg.name || "Гравець").slice(0, 16);
      // надіслати новачку: світ + усі вже присутні гравці
      const players = [];
      for (const [, c] of clients) {
        if (c === client || !c.state) continue;
        players.push({ id: c.id, name: c.name, ...c.state });
      }
      ws.send(JSON.stringify({
        t: "init",
        id,
        world: Buffer.from(world).toString("base64"),
        heightMap: worldMeta.heightMap,
        baseLevel: worldMeta.baseLevel,
        players,
      }));
      // повідомити інших про новачка
      broadcast({ t: "join", p: { id, name: client.name } }, ws);

    } else if (msg.t === "state") {
      client.state = {
        x: +msg.x || 0, y: +msg.y || 0, vx: +msg.vx || 0,
        face: msg.face === -1 ? -1 : 1, hp: +msg.hp || 0,
      };
      broadcast({ t: "state", players: [{ id, ...client.state }] }, ws);

    } else if (msg.t === "block") {
      const x = msg.x | 0, y = msg.y | 0, v = msg.v | 0;
      if (inBounds(x, y) && v >= 0 && v <= 63) {
        setBlock(x, y, v);
        broadcast({ t: "block", x, y, v }, ws);
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ t: "leave", id }, ws);
    console.log(`[ws] від'єднався #${id} (всього ${clients.size})`);
  });
  ws.on("error", () => {});
});

server.listen(PORT, () => {
  console.log(`🟢 Майнкрафт 2D онлайн слухає http://localhost:${PORT}`);
});
