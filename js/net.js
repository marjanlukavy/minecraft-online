"use strict";
// ===================== Мультиплеєр (клієнт, WebSocket) =====================
// Підключається до того ж хоста, що роздає гру. Якщо сервера немає (відкрито
// файл напряму) — гра працює як одиночна з локально згенерованим світом.
const NET = {
  ws: null,
  id: null,
  connected: false,
  ready: false,                 // отримали світ від сервера
  players: {},                  // id -> { x, y, vx, face, hp, name, rx, ry }
  name: "Гравець-" + (100 + Math.floor(Math.random() * 900)),
};

let netStatusEl = null;
let nameOverlayOpen = false;     // поки відкрито — ввід гри блокується (див. input.js)

function netConnect() {
  // file:// — сервера нема, лишаємось в одиночному режимі
  if (location.protocol === "file:") { updateNetStatus(); return; }
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  let ws;
  try { ws = new WebSocket(proto + "//" + location.host); }
  catch (e) { setTimeout(netConnect, 2000); return; }
  NET.ws = ws;

  ws.onopen = () => {
    NET.connected = true;
    netSend({ t: "hello", name: NET.name });
    updateNetStatus();
  };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    handleNetMessage(m);
  };
  ws.onclose = () => {
    NET.connected = false; NET.ready = false; NET.players = {};
    updateNetStatus();
    setTimeout(netConnect, 2000);   // авто-перепідключення
  };
  ws.onerror = () => {};            // onclose спрацює слідом
}

function netSend(obj) {
  const ws = NET.ws;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

// викликається з player.js при копанні/будівництві
function netSendBlock(x, y, v) {
  if (NET.connected) netSend({ t: "block", x, y, v });
}

function handleNetMessage(m) {
  switch (m.t) {
    case "init": {
      NET.id = m.id;
      // прийняти авторитетний світ сервера
      const bin = atob(m.world);
      const data = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
      if (data.length === world.length) world.set(data);
      worldMeta.heightMap = m.heightMap;
      worldMeta.baseLevel = m.baseLevel;
      respawnPlayer();
      NET.players = {};
      for (const p of m.players) NET.players[p.id] = p;
      NET.ready = true;
      updateNetStatus();
      break;
    }
    case "join":
      NET.players[m.p.id] = m.p; updateNetStatus(); break;
    case "leave":
      delete NET.players[m.id]; updateNetStatus(); break;
    case "rename": {
      const p = NET.players[m.id];
      if (p) p.name = m.name;
      updateNetStatus();
      break;
    }
    case "state":
      for (const p of m.players) {
        if (p.id === NET.id) continue;
        const cur = NET.players[p.id] || (NET.players[p.id] = {});
        cur.id = p.id;
        cur.x = p.x; cur.y = p.y; cur.vx = p.vx; cur.face = p.face; cur.hp = p.hp;
        if (cur.rx == null) { cur.rx = p.x; cur.ry = p.y; }
      }
      break;
    case "block": {
      const old = getBlock(m.x, m.y);
      setBlock(m.x, m.y, m.v);
      if (m.v === B.AIR && old !== B.AIR) spawnParticles(m.x, m.y, old);
      break;
    }
  }
}

// надсилання свого стану (з main.js, ~30 разів/с)
let _netAccum = 0;
function netTick() {
  if (!NET.connected) return;
  if (++_netAccum < 2) return;     // кожен 2-й кадр
  _netAccum = 0;
  netSend({
    t: "state",
    x: Math.round(player.x), y: Math.round(player.y),
    vx: player.vx, face: player.face, hp: player.hp,
  });
}

// малювання інших гравців (з render.js draw())
function drawRemotePlayers() {
  if (!NET.ready) return;
  for (const id in NET.players) {
    const p = NET.players[id];
    if (p.id === NET.id || p.x == null) continue;
    if (p.rx == null) { p.rx = p.x; p.ry = p.y; }
    p.rx += (p.x - p.rx) * 0.3;     // плавне згладжування
    p.ry += (p.y - p.ry) * 0.3;
    const drawObj = {
      x: p.rx, y: p.ry, w: TILE * 0.6, h: TILE * 1.7,
      vx: p.vx, face: p.face, onGround: false,
    };
    drawCharacter(drawObj, { shirt: "#3aa85f", pants: "#2f6b4a" });

    // табличка з ім'ям над гравцем
    const sx = p.rx - cam.x + TILE * 0.3;
    const sy = p.ry - cam.y - 12;
    const name = p.name || "Гравець";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(sx - tw / 2 - 5, sy - 13, tw + 10, 17);
    ctx.fillStyle = "#fff";
    ctx.fillText(name, sx, sy);
    ctx.textAlign = "left";
  }
}

function updateNetStatus() {
  if (!netStatusEl) netStatusEl = document.getElementById("netStatus");
  if (!netStatusEl) return;
  if (location.protocol === "file:") { netStatusEl.textContent = "💾 Одиночна гра"; return; }
  if (!NET.connected) { netStatusEl.textContent = "🔴 Офлайн"; return; }
  if (!NET.ready) { netStatusEl.textContent = "🟡 Підключення…"; return; }
  const count = 1 + Object.keys(NET.players).filter(k => +k !== NET.id).length;
  netStatusEl.textContent = `🟢 Онлайн · ${count} грав. · ${NET.name}`;
}

// ===================== Екран введення імені =====================
function netSubmitName() {
  const inp = document.getElementById("nameInput");
  let v = ((inp && inp.value) || "").trim().slice(0, 16);
  if (!v) v = NET.name;
  NET.name = v;
  try { localStorage.setItem("mc-name", v); } catch (e) {}
  if (NET.connected) netSend({ t: "rename", name: v });  // оновити ім'я в інших
  const ov = document.getElementById("nameOverlay");
  if (ov) ov.classList.add("hidden");
  nameOverlayOpen = false;
  updateNetStatus();
}

function netInit() {
  try {
    const saved = localStorage.getItem("mc-name");
    if (saved) NET.name = saved;
  } catch (e) {}

  const inp = document.getElementById("nameInput");
  const btn = document.getElementById("nameBtn");
  if (inp) {
    inp.value = NET.name;
    inp.addEventListener("keydown", e => {
      if (e.code === "Enter" || e.code === "NumpadEnter") { e.preventDefault(); netSubmitName(); }
    });
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
  }
  if (btn) btn.addEventListener("click", netSubmitName);
  nameOverlayOpen = true;

  // підключаємось одразу: світ вантажиться за оверлеєм, без блимання
  netConnect();
  updateNetStatus();
}

netInit();
