"use strict";
// ===================== Загальні налаштування =====================
const TILE = 32;            // розмір блока (px)
const WORLD_W = 256;        // ширина світу (блоків)
const WORLD_H = 96;         // висота світу (блоків)

const GRAVITY = 0.55;
const MOVE_SPEED = 4.2;
const JUMP_VEL = 10.5;
const REACH = 5.2;          // дальність взаємодії (блоків)

const MAX_STACK = 64;
const INV_COLS = 8;
const INV_ROWS = 4;                  // ряд 0 — хотбар, 1..3 — сховище
const INV_SIZE = INV_COLS * INV_ROWS;

const DAY_LENGTH = 9000;    // кадрів на повну добу (~2.5 хв при 60 fps)
