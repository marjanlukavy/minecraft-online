"use strict";
// ===================== Цикл день / ніч =====================
// gameTime: 0..1 (0 = полудень, 0.5 = північ)
let gameTime = 0.0;

function advanceTime() {
  gameTime = (gameTime + 1 / DAY_LENGTH) % 1;
}

// рівень освітлення 0.15 (глуха ніч) .. 1.0 (день)
function getAmbient() {
  const day = 0.5 + 0.5 * Math.cos(gameTime * Math.PI * 2);
  return 0.15 + 0.85 * day;
}
function isNight() { return getAmbient() < 0.45; }

// підпис фази доби
function timeLabel() {
  const a = getAmbient();
  if (a > 0.85) return "☀️ День";
  if (a > 0.45) return gameTime < 0.5 ? "🌇 Вечір" : "🌅 Ранок";
  return "🌙 Ніч";
}
