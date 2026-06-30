"use strict";
// ===================== Гравець =====================
const player = {
  x: (WORLD_W / 2) * TILE, y: 0,
  w: TILE * 0.6, h: TILE * 1.7,
  vx: 0, vy: 0, onGround: false, face: 1,
  hp: 20, maxHp: 20, hurtCd: 0,
};
const spawnX = player.x;
function respawnPlayer() {
  player.x = spawnX;
  player.y = (worldMeta.heightMap[Math.floor(spawnX / TILE)] - 3) * TILE;
  player.vx = player.vy = 0; player.hp = player.maxHp; player.hurtCd = 40;
}
respawnPlayer();

function damagePlayer(dmg, dirX) {
  if (player.hurtCd > 0) return;
  player.hp -= dmg; player.hurtCd = 30;
  player.vx += (dirX || 0) * 5; player.vy = -4.5;
  if (player.hp <= 0) respawnPlayer();
}

let breakTimer = 0;

function updatePlayer() {
  if (player.hurtCd > 0) player.hurtCd--;
  if (breakTimer > 0) breakTimer--;

  let move = 0;
  if (!invOpen) {
    if (keys["ArrowLeft"] || keys["KeyA"]) move -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) move += 1;
  }
  player.vx = player.vx * 0.0 + move * MOVE_SPEED;  // керований рух (відкидання гасне миттєво по X)
  if (move) player.face = move;

  if (!invOpen && (keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) && player.onGround) {
    player.vy = -JUMP_VEL; player.onGround = false;
  }

  const cx = Math.floor((player.x + player.w / 2) / TILE);
  const cyy = Math.floor((player.y + player.h / 2) / TILE);
  const inWater = getBlock(cx, cyy) === B.WATER;
  player.vy += inWater ? GRAVITY * 0.3 : GRAVITY;
  if (inWater) { player.vy = Math.min(player.vy, 2.5); player.vx *= 0.6; }
  player.vy = Math.min(player.vy, 16);

  moveEntity(player);

  if (player.y > WORLD_H * TILE) { respawnPlayer(); }

  if (!invOpen) handleMouseAction();
}

// ===================== Прицілювання та дії =====================
function targetBlock() {
  const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
  const bx = Math.floor(wx / TILE), by = Math.floor(wy / TILE);
  const px = (player.x + player.w / 2) / TILE, py = (player.y + player.h / 2) / TILE;
  const dist = Math.hypot(bx + 0.5 - px, by + 0.5 - py);
  return { bx, by, wx, wy, inReach: dist <= REACH };
}

function handleMouseAction() {
  const t = targetBlock();

  // --- ЛКМ: спершу спроба вдарити моба, інакше копати ---
  if (mouse.left && breakTimer <= 0) {
    const m = mobAt(t.wx, t.wy);
    if (m && t.inReach) {
      const act = activeItem();
      const dmg = (act && ITEMS[act.id].dmg) ? ITEMS[act.id].dmg : 1;
      hurtMob(m, dmg, Math.sign(m.x + m.w / 2 - (player.x + player.w / 2)) || 1);
      breakTimer = 18;
      return;
    }
    if (t.inReach && inBounds(t.bx, t.by)) {
      const b = getBlock(t.bx, t.by);
      if (b !== B.AIR) {
        const drop = getDrop(b); if (drop) addItem(drop.id, drop.n);
        spawnParticles(t.bx, t.by, b);
        setBlock(t.bx, t.by, B.AIR);
        if (typeof netSendBlock === "function") netSendBlock(t.bx, t.by, B.AIR);
        const act = activeItem();
        breakTimer = (act && act.id === I.PICKAXE) ? 3 : 7;
      }
    }
    return;
  }

  // --- ПКМ: їсти їжу або ставити блок ---
  if (mouse.right) {
    const act = activeItem();
    if (!act) { return; }
    const def = ITEMS[act.id];
    if (def.food) {                                  // з'їсти
      if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + def.food);
        act.n--; if (act.n <= 0) inventory[selected] = null;
        refreshUI();
      }
      mouse.right = false; return;
    }
    if (def.block && t.inReach && inBounds(t.bx, t.by) && getBlock(t.bx, t.by) === B.AIR) {
      if (def.solid) {                               // не ставити в себе
        const overlap = player.x < (t.bx + 1) * TILE && player.x + player.w > t.bx * TILE &&
                        player.y < (t.by + 1) * TILE && player.y + player.h > t.by * TILE;
        if (overlap) { mouse.right = false; return; }
      }
      setBlock(t.bx, t.by, act.id);
      if (typeof netSendBlock === "function") netSendBlock(t.bx, t.by, act.id);
      act.n--; if (act.n <= 0) inventory[selected] = null;
      refreshUI();
    }
    mouse.right = false; // одна дія за клік
  }
}
