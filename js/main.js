"use strict";
// ===================== Запуск і головний цикл =====================
resize();
refreshUI();

const fpsEl = document.getElementById("fps");
let lastFps = performance.now(), frames = 0;

function loop() {
  // оновлення
  if (!invOpen) advanceTime();      // час іде, коли інвентар закрито
  updatePlayer();
  updateMobs();
  updateParticles();
  updateCamera();
  if (typeof netTick === "function") netTick();   // надіслати свій стан іншим

  // малювання
  draw();

  // лічильники
  frames++;
  const now = performance.now();
  if (now - lastFps > 500) {
    const fps = Math.round(frames * 1000 / (now - lastFps));
    fpsEl.textContent = timeLabel() + "  ·  " + fps + " FPS";
    frames = 0; lastFps = now;
  }
  requestAnimationFrame(loop);
}
loop();
