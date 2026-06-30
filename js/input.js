"use strict";
// ===================== Ввід =====================
const keys = {};
const mouse = { x: 0, y: 0, left: false, right: false };

addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "KeyE" || e.code === "KeyI" || e.code === "Tab") { e.preventDefault(); toggleInventory(); }
  if (e.code === "Escape" && invOpen) toggleInventory();
  const n = parseInt(e.key);
  if (n >= 1 && n <= INV_COLS) { selected = n - 1; refreshUI(); }
});
addEventListener("keyup", e => { keys[e.code] = false; });

canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
});
canvas.addEventListener("mousedown", e => {
  if (e.button === 0) mouse.left = true;
  if (e.button === 2) mouse.right = true;
});
addEventListener("mouseup", e => {
  if (e.button === 0) mouse.left = false;
  if (e.button === 2) mouse.right = false;
});
canvas.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("wheel", e => {
  if (invOpen) return;
  selected = (selected + (e.deltaY > 0 ? 1 : -1) + INV_COLS) % INV_COLS;
  refreshUI();
}, { passive: true });

addEventListener("resize", resize);
