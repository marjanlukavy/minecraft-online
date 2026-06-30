"use strict";
// ===================== Інвентар: дані =====================
const inventory = new Array(INV_SIZE).fill(null);  // {id, n} | null
let selected = 0;     // активний слот хотбара (0..7)
let held = null;      // предмет "на курсорі" у вікні інвентаря
let invOpen = false;

function addItem(id, n = 1) {
  for (let i = 0; i < INV_SIZE && n > 0; i++) {       // докласти в наявні стаки
    const s = inventory[i];
    if (s && s.id === id && s.n < maxStack(id)) {
      const add = Math.min(maxStack(id) - s.n, n); s.n += add; n -= add;
    }
  }
  for (let i = 0; i < INV_SIZE && n > 0; i++) {       // у порожні слоти
    if (!inventory[i]) { const add = Math.min(maxStack(id), n); inventory[i] = { id, n: add }; n -= add; }
  }
  refreshUI();
  return n; // залишок
}
function countItem(id) {
  let c = 0;
  for (const s of inventory) if (s && s.id === id) c += s.n;
  return c;
}
function removeItem(id, n) {
  for (let i = 0; i < INV_SIZE && n > 0; i++) {
    const s = inventory[i];
    if (s && s.id === id) { const take = Math.min(s.n, n); s.n -= take; n -= take; if (s.n <= 0) inventory[i] = null; }
  }
  refreshUI();
}
const activeItem = () => inventory[selected];

// ===================== UI =====================
const hotbarEl = document.getElementById("hotbar");
const invOverlay = document.getElementById("invOverlay");
const invGrid = document.getElementById("invGrid");
const invHotbar = document.getElementById("invHotbar");
const craftList = document.getElementById("craftList");
const heldEl = document.getElementById("held");
const heldCanvas = heldEl.querySelector("canvas");
const heldCount = heldEl.querySelector(".count");

function fillSlotEl(el, slotIndex, withNumber) {
  el.innerHTML = "";
  if (withNumber !== undefined) {
    const num = document.createElement("div"); num.className = "num";
    num.textContent = withNumber + 1; el.appendChild(num);
  }
  const s = inventory[slotIndex];
  if (s) {
    const c = document.createElement("canvas"); c.width = c.height = TILE;
    c.getContext("2d").drawImage(getImg(s.id), 0, 0); el.appendChild(c);
    if (s.n > 1) { const cnt = document.createElement("div"); cnt.className = "count"; cnt.textContent = s.n; el.appendChild(cnt); }
  }
}

function buildHotbar() {
  hotbarEl.innerHTML = "";
  for (let i = 0; i < INV_COLS; i++) {
    const slot = document.createElement("div");
    slot.className = "slot" + (i === selected ? " active" : "");
    fillSlotEl(slot, i, i);
    slot.onclick = () => { selected = i; refreshUI(); };
    hotbarEl.appendChild(slot);
  }
}

function buildInvWindow() {
  invGrid.innerHTML = ""; invHotbar.innerHTML = "";
  for (let i = INV_COLS; i < INV_SIZE; i++) invGrid.appendChild(makeInvSlot(i));     // сховище 8..31
  for (let i = 0; i < INV_COLS; i++) invHotbar.appendChild(makeInvSlot(i, i));       // хотбар 0..7
  buildCraftingList();                                                               // crafting.js
}
function makeInvSlot(i, number) {
  const slot = document.createElement("div"); slot.className = "slot";
  fillSlotEl(slot, i, number);
  slot.oncontextmenu = e => e.preventDefault();
  slot.onmousedown = e => {
    e.preventDefault();
    if (e.button === 0) slotLeftClick(i); else if (e.button === 2) slotRightClick(i);
    refreshUI(); updateHeldEl();
  };
  return slot;
}

function slotLeftClick(i) {
  const s = inventory[i];
  if (!held) { if (s) { held = s; inventory[i] = null; } return; }
  if (!s) { inventory[i] = held; held = null; return; }
  if (s.id === held.id) {
    const add = Math.min(maxStack(s.id) - s.n, held.n); s.n += add; held.n -= add;
    if (held.n <= 0) held = null;
  } else { inventory[i] = held; held = s; }
}
function slotRightClick(i) {
  const s = inventory[i];
  if (!held) { if (s) { const take = Math.ceil(s.n / 2); held = { id: s.id, n: take }; s.n -= take; if (s.n <= 0) inventory[i] = null; } return; }
  if (!s) { inventory[i] = { id: held.id, n: 1 }; held.n--; }
  else if (s.id === held.id && s.n < maxStack(s.id)) { s.n++; held.n--; }
  if (held && held.n <= 0) held = null;
}

function updateHeldEl() {
  if (held) {
    heldEl.style.display = "block";
    heldCanvas.width = heldCanvas.height = TILE;
    const g = heldCanvas.getContext("2d"); g.clearRect(0, 0, TILE, TILE); g.drawImage(getImg(held.id), 0, 0);
    heldCount.textContent = held.n > 1 ? held.n : "";
  } else heldEl.style.display = "none";
}
addEventListener("mousemove", e => { heldEl.style.left = e.clientX + "px"; heldEl.style.top = e.clientY + "px"; });

function toggleInventory() {
  invOpen = !invOpen;
  invOverlay.classList.toggle("open", invOpen);
  if (invOpen) buildInvWindow();
  else if (held) { addItem(held.id, held.n); held = null; updateHeldEl(); }
  refreshUI();
}

function refreshUI() {
  buildHotbar();
  if (invOpen) buildInvWindow();
  updateHeldEl();
}

// Режим «будинок-дослідник»: стартових предметів немає (хотбар прихований).
