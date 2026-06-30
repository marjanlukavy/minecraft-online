"use strict";
// ===================== Крафт =====================
// Кожен рецепт: { out:{id,n}, in:[{id,n}, ...] }
const RECIPES = [
  { out: { id: B.PLANK,  n: 4 }, in: [{ id: B.WOOD, n: 1 }] },
  { out: { id: I.STICK,  n: 4 }, in: [{ id: B.PLANK, n: 2 }] },
  { out: { id: B.TORCH,  n: 4 }, in: [{ id: I.COAL_I, n: 1 }, { id: I.STICK, n: 1 }] },
  { out: { id: I.PICKAXE,n: 1 }, in: [{ id: B.PLANK, n: 3 }, { id: I.STICK, n: 2 }] },
  { out: { id: I.SWORD,  n: 1 }, in: [{ id: B.PLANK, n: 2 }, { id: I.STICK, n: 1 }] },
  { out: { id: B.GLASS,  n: 1 }, in: [{ id: B.SAND, n: 1 }] },
  { out: { id: B.BRICK,  n: 4 }, in: [{ id: B.STONE, n: 2 }] },
];

function canCraft(r) { return r.in.every(ing => countItem(ing.id) >= ing.n); }
function doCraft(r) {
  if (!canCraft(r)) return;
  r.in.forEach(ing => removeItem(ing.id, ing.n));
  addItem(r.out.id, r.out.n);   // викликає refreshUI → перебудовує список
}

function buildCraftingList() {
  craftList.innerHTML = "";
  for (const r of RECIPES) {
    const ok = canCraft(r);
    const row = document.createElement("div");
    row.className = "recipe" + (ok ? "" : " cant");

    const out = document.createElement("canvas"); out.width = out.height = TILE;
    out.getContext("2d").drawImage(getImg(r.out.id), 0, 0);
    row.appendChild(out);
    if (r.out.n > 1) {
      const c = document.createElement("span"); c.className = "rname";
      c.textContent = "×" + r.out.n; row.appendChild(c);
    }

    const arrow = document.createElement("span"); arrow.className = "arrow"; arrow.textContent = "⬅"; row.appendChild(arrow);

    for (const ing of r.in) {
      const wrap = document.createElement("span"); wrap.className = "ing";
      const ic = document.createElement("canvas"); ic.width = ic.height = TILE;
      ic.getContext("2d").drawImage(getImg(ing.id), 0, 0); wrap.appendChild(ic);
      const cc = document.createElement("span"); cc.className = "c"; cc.textContent = ing.n; wrap.appendChild(cc);
      row.appendChild(wrap);
    }

    const nm = document.createElement("span"); nm.className = "rname";
    nm.textContent = ITEMS[r.out.id].name; row.appendChild(nm);

    if (ok) row.onclick = () => doCraft(r);
    craftList.appendChild(row);
  }
}
