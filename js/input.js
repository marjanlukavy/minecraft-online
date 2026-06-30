"use strict";
// ===================== Ввід =====================
const keys = {};
const mouse = { x: 0, y: 0, left: false, right: false };

// чи зараз користувач щось друкує (поле вводу / відкритий екран імені) —
// тоді ігрові клавіші ігноруємо
function uiTyping(e) {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return true;
  return typeof nameOverlayOpen !== "undefined" && nameOverlayOpen;
}

addEventListener("keydown", e => {
  if (uiTyping(e)) return;
  keys[e.code] = true;
  // не прокручувати сторінку стрілками/пробілом
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
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

addEventListener("resize", resize);
