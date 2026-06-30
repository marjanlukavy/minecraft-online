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
            GLASS:12, WATER:13, SNOW:14, BRICK:15, TORCH:16, STAIRS:17 };

const world = new Uint8Array(WORLD_W * WORLD_H);
const idx = (x, y) => y * WORLD_W + x;
const inBounds = (x, y) => x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
const getBlock = (x, y) => inBounds(x, y) ? world[idx(x, y)] : B.STONE;
const setBlock = (x, y, v) => { if (inBounds(x, y)) world[idx(x, y)] = v; };

// ===================== Сталий світ: хаб-газон + будинок =====================
// Дзеркало js/world.js — той самий будинок, бо світ авторитетний.
const GROUND = 56;
const HOUSE = { x0: 114, x1: 133, roofTop: 44, floorUp: 50, floorGnd: GROUND, floorBas: 62 };

function generateWorld() {
  const heightMap = new Array(WORLD_W).fill(GROUND);
  for (let x = 0; x < WORLD_W; x++)
    for (let y = 0; y < WORLD_H; y++) {
      if (y < GROUND) world[idx(x, y)] = B.AIR;
      else if (y === GROUND) world[idx(x, y)] = B.GRASS;
      else if (y < GROUND + 4) world[idx(x, y)] = B.DIRT;
      else world[idx(x, y)] = B.STONE;
    }
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
  const H = HOUSE, ix0 = H.x0 + 1, ix1 = H.x1 - 1;
  for (let x = ix0; x <= ix1; x++)
    for (let y = H.roofTop; y < H.floorBas; y++) setBlock(x, y, B.AIR);
  for (let y = H.roofTop; y <= H.floorBas; y++) {
    const wall = y < H.floorGnd ? B.PLANK : B.STONE;
    setBlock(H.x0, y, wall); setBlock(H.x1, y, wall);
  }
  for (let x = ix0; x <= ix1; x++) {
    setBlock(x, H.floorUp, B.PLANK);
    setBlock(x, H.floorGnd, B.PLANK);
    setBlock(x, H.floorBas, B.STONE);
  }
  setBlock(H.x0, 54, B.AIR); setBlock(H.x0, 55, B.AIR);
  setBlock(H.x0, 46, B.GLASS); setBlock(H.x1, 46, B.GLASS);
  setBlock(H.x1, 52, B.GLASS);
  for (let y = 48; y <= 55; y++) setBlock(131, y, B.STAIRS);
  for (let y = 54; y <= 61; y++) setBlock(116, y, B.STAIRS);
  setBlock(ix0, 47, B.TORCH); setBlock(ix0, 53, B.TORCH);
  setBlock(ix1, 53, B.TORCH); setBlock(ix0, 59, B.TORCH);
  return { heightMap, baseLevel: GROUND };
}
const worldMeta = generateWorld();
console.log(`[світ] хаб+будинок ${WORLD_W}x${WORLD_H}, GROUND=${GROUND}`);

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

    } else if (msg.t === "rename") {
      client.name = String(msg.name || "Гравець").slice(0, 16);
      broadcast({ t: "rename", id, name: client.name }, ws);

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
