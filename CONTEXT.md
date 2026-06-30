# Майнкрафт 2D — контекст проєкту

> Цей файл — повний опис гри для продовження роботи після перезапуску сесії.
> Прочитай його першим, далі дивись на самі файли в `js/`.

---

## 1. Що це

2D-гра в стилі Minecraft / Terraria (вид збоку) на чистому **HTML5 Canvas + JavaScript**.
Без фреймворків, без збірки, без npm-залежностей. Просто статичні файли.

- Розташування: `/Users/marianlukavyi/Desktop/minecraft-test`
- Запуск локально: `python3 -m http.server 8000` → відкрити `http://localhost:8000`
  (можна й просто відкрити `index.html`, але через сервер надійніше).
- Платформа розробки: macOS, є `node` (v22) і `python3`.
- Спілкування з користувачем — **українською**.

## 2. Поточний статус

✅ Працює повністю. Перевірено автоматичним прогоном (див. розділ 8): спавн мобів,
бій, крафт, фізика, день/ніч — без помилок виконання.

✅ **Додано мультиплеєр (WebSocket)** — двоє+ гравців грають в одному світі, бачать
рух одне одного, спільно копають/будують. Деталі — розділ 12.

Останнє, що зробив користувач: додав MCP-сервер Railway
(`claude mcp add railway --transport http https://mcp.railway.com`) у local config
проєкту. **Інструменти Railway з'являться лише після перезапуску сесії.**
Найімовірніша наступна задача — **деплой гри на Railway** (див. розділ 9).

## 3. Стек і архітектура

- Рендер: один `<canvas id="game">` на весь екран, `image-rendering: pixelated`.
- Світ: `Uint8Array` розміром `WORLD_W * WORLD_H` (id блока в кожній клітинці).
- Усі текстури блоків та іконки предметів **малюються кодом** в offscreen-canvas
  і кешуються (`texCache`, `iconCache`). Жодних зовнішніх картинок.
- Модулі підключаються звичайними `<script>` (НЕ ES-модулі) у строгому порядку —
  ділять спільний глобальний scope. Порядок у `index.html` важливий.

### Порядок завантаження скриптів (НЕ міняти без причини)
```
config → items → world → daynight → inventory → crafting → player → mobs → render → input → main
```
Чому саме так: кожен файл на top-level оголошує `const`/`let`, видимі наступним файлам.
Функції викликаються вже під час гри (runtime), тож взаємні виклики між файлами ок.
**Важливий нюанс (вже виправлено):** видача стартових предметів (`addItem(...)`) винесена
в КІНЕЦЬ `inventory.js`, після оголошення DOM-посилань (`hotbarEl` тощо) і `refreshUI`,
бо `addItem → refreshUI → buildHotbar` чіпає `hotbarEl` (інакше TDZ-помилка).

## 4. Структура файлів

```
index.html      розмітка: canvas, HUD (#help, #fps, #hotbar), вікно інвентаря
                (#invOverlay → #invGrid, #invHotbar, #craftList), #held; підключення скриптів
style.css       усі стилі: хотбар, вікно інвентаря+крафт, серця, предмет на курсорі
js/config.js    константи: TILE=32, WORLD_W=256, WORLD_H=96, GRAVITY, MOVE_SPEED,
                JUMP_VEL, REACH=5.2, MAX_STACK=64, INV_COLS=8, INV_ROWS=4,
                INV_SIZE=32, DAY_LENGTH=9000 (кадрів на добу)
js/items.js     B{} (блоки 0..16), I{} (предмети 100..107), ITEMS{} (описи всіх),
                maxStack(), getDrop(), hash(), shade(),
                makeTexture()/texCache, makeIcon()/iconCache, getImg()
js/world.js     world(Uint8Array), idx/inBounds/getBlock/setBlock/isSolid,
                noise1D(), generateWorld()→worldMeta{heightMap,baseLevel},
                collideBox(), moveEntity() (фізика сутностей), surfaceY()
js/daynight.js  gameTime(0..1), advanceTime(), getAmbient()(0.15..1.0),
                isNight(), timeLabel()
js/inventory.js inventory[32], selected, held, invOpen,
                addItem/countItem/removeItem/activeItem,
                UI: fillSlotEl, buildHotbar, buildInvWindow, makeInvSlot,
                slotLeftClick/slotRightClick (drag&drop), toggleInventory, refreshUI;
                у кінці — видача стартових предметів
js/crafting.js  RECIPES[], canCraft(), doCraft(), buildCraftingList()
js/player.js    player{x,y,w,h,vx,vy,onGround,face,hp,maxHp,hurtCd},
                respawnPlayer, damagePlayer, updatePlayer (рух+фізика+вода),
                targetBlock(), handleMouseAction() (атака моба / копання / їжа / будівництво),
                breakTimer (кулдаун дій)
js/mobs.js      mobs[], MOB{pig,zombie}, spawnMob, trySpawnMobs/trySpawnAt (spawnCd),
                mobAt(), hurtMob(), updateMobs() (AI+фізика+атака гравця),
                drawMobs/drawPig/drawZombie/drawMobHealth
js/render.js    canvas, ctx, cam, resize, updateCamera,
                particles + spawnParticles/updateParticles,
                clouds, drawSky (колір/сонце/місяць/хмари за gameTime), roundCloud,
                draw() (світ→моби→гравець→частинки→темрява→світло факелів→підсвітка→HUD),
                drawPlayer, drawHUD/drawHeart/heartPath (серця)
js/input.js     keys{}, mouse{}, слухачі клавіатури/миші/колеса/resize
js/main.js      resize(); refreshUI(); loop(): advanceTime(якщо !invOpen)→updatePlayer
                →updateMobs→updateParticles→updateCamera→draw; лічильник FPS+timeLabel
```

## 5. Реєстри (де що міняти)

**Блоки** (`B` в `items.js`, id 0..16): AIR, GRASS, DIRT, STONE, WOOD, LEAVES, SAND,
COAL, IRON, GOLD, DIAMOND, PLANK, GLASS, WATER, SNOW, BRICK, TORCH.
COAL/IRON/GOLD/DIAMOND — це руда в землі; при копанні дають предмет-ресурс.

**Предмети** (`I` в `items.js`, id 100..107): STICK, APPLE(food:6), PICKAXE(tool),
SWORD(tool, dmg:4), COAL_I, IRON_I, GOLD_I, DIAMOND_I.

**Правила id:** блоки 1..63 зберігаються у `world` (Uint8Array). Предмети мають id ≥ 100
і НІКОЛИ не потрапляють у world (лише в інвентар). `getImg(id)`: id≥100 → іконка, інакше текстура.

**Рецепти** (`RECIPES` в `crafting.js`): дошки←деревина, палички←дошки,
факели←вугілля+паличка, кирка←дошки+палички, меч←дошки+паличка,
скло←пісок, цегла←камінь. Формат: `{ out:{id,n}, in:[{id,n},...] }`.

**Стартовий інвентар** (кінець `inventory.js`): кирка, меч, 16 факелів, 3 яблука,
32 дошки, 16 каменю, 8 скла, 16 цегли.

## 6. Ігрові механіки

- **Фізика:** гравітація, стрибок, колізії AABB по осях (`moveEntity`), уповільнення у воді.
- **Копання/будівництво:** ЛКМ копає (кулдаун `breakTimer`; кирка швидше: 3 vs 7 кадрів),
  дроп іде в інвентар; ПКМ ставить блок з активного слота (витрачає 1) або їсть їжу.
  Не можна поставити твердий блок усередину гравця. Дальність — `REACH`.
- **День/ніч:** `gameTime` 0..1, `DAY_LENGTH=9000` кадрів (~2.5 хв). `getAmbient()`
  керує кольором неба, темрявою (overlay) і спавном. Факели світять (radial gradient,
  composite `lighter`).
- **Моби:** свині (мирні, вдень, блукають) і зомбі (вночі, переслідують, стрибають через
  перешкоди, б'ють гравця, «згорають» удень при ambient>0.6). Кап: 4 свині / 8 зомбі.
  Спавн за 16..26 блоків від гравця. Далекі (>70 блоків) деспавняться.
- **Бій:** ЛКМ по мобу = атака (меч 4, інакше 1 урон) + відкидання. У мобів смужка HP.
- **Здоров'я гравця:** maxHp=20 (10 сердець), `hurtCd` — і-кадри. Яблуко лікує +6.
  Смерть або падіння за межі світу → `respawnPlayer()`.

## 7. Керування

- Рух: `A`/`D` або `←`/`→`; стрибок: `Space` / `W` / `↑`
- ЛКМ: копати / бити моба; ПКМ: ставити блок / їсти яблуко
- Вибір слота: `1`–`8` або колесо миші
- Інвентар+крафт: `E` / `I` / `Tab`; закрити: `E` / `Esc`
- У вікні інвентаря: ЛКМ — узяти/покласти стак, ПКМ — половину/по одному

## 8. Як тестувати без браузера

Синтаксис: `for f in js/*.js; do node --check "$f"; done`
Інтеграційний прогон (заглушки DOM/Canvas через `vm`): є приклади в
`/private/tmp/.../scratchpad/probe.js` (минула сесія). Суть: зібрати всі файли в один
рядок, виконати в `vm.createContext` з фейковими `document`/`canvas`/`requestAnimationFrame`,
прогнати кадри. УВАГА: top-level `const` НЕ стають властивостями vm-контексту — щоб дістати
значення, треба наприкінці bundle писати в `globalThis.__x = ...`.

## 9. Наступний крок: деплой на Railway

Користувач додав MCP Railway. Гра — **статика**, тож найпростіше роздавати її статичним
сервером. Варіанти:
- Node: додати `package.json` зі `start: "npx serve -s . -l $PORT"` (або `http-server`).
- Або `nixpacks.toml` / `Procfile` з `python3 -m http.server $PORT`.
Railway передає порт у змінній `PORT` — сервер має слухати саме її.
Спершу спитати користувача, який варіант (Node `serve` простий і надійний).
Після рестарту будуть доступні MCP-інструменти Railway (`mcp__railway__*` — уточнити назви).

## 10. Ідеї на майбутнє (не реалізовано)

Збереження світу (localStorage), звуки, голод, більше мобів/бос, більше рецептів,
смолоскипи як джерело світла з реальним поширенням, біоми, нескінченний світ (чанки).

## 12. Мультиплеєр (WebSocket)

Гра тепер працює через **Node-сервер** замість статики. Один порт (`PORT`) роздає і
файли, і WebSocket.

- `server.js` — http (роздача статики) + `ws` (WebSocketServer на тому ж сервері).
  Тримає **авторитетний світ** (`Uint8Array`), згенерований раз при старті тим самим
  кодом, що й `js/world.js`. Релеїть між клієнтами: позиції гравців і зміни блоків.
- `package.json` — `start: node server.js`, залежність `ws`. `npm install` → `npm start`.
- `js/net.js` (підключений перед `main.js`) — клієнт: під'єднується до `location.host`,
  на `init` приймає світ сервера (`world.set(...)`, оновлює `worldMeta`, `respawnPlayer()`),
  малює інших гравців (`drawRemotePlayers` → `drawCharacter` з render.js), шле свій стан
  (`netTick`, ~30/с) і зміни блоків (`netSendBlock`).
- Інтеграція в існуючі файли (мінімальні правки, усе через `typeof fn === "function"`):
  `render.js` — `drawPlayer` рознесено на `drawPlayer`+`drawCharacter`, додано виклик
  `drawRemotePlayers`; `player.js` — `netSendBlock` після копання/будівництва;
  `main.js` — `netTick` у циклі; `index.html` — `<script src="js/net.js">` і `#netStatus`.
- **Протокол (JSON):** клієнт→сервер `hello{name}`, `state{x,y,vx,face,hp}`, `block{x,y,v}`;
  сервер→клієнт `init{id,world(base64),heightMap,baseLevel,players}`, `join{p}`, `leave{id}`,
  `state{players[]}`, `block{x,y,v}`.
- **Запуск локально:** `npm install && npm start` → `http://localhost:8000` у двох вкладках.
  Без сервера (`file://`) — одиночна гра з локальним світом (fallback).
- **Свідомі спрощення v1:** моби й час доби рахуються локально на кожному клієнті (можуть
  відрізнятись); інвентар у кожного свій; світ не зберігається між рестартами сервера.
  Спільне = світ, блоки, видимість гравців. Покращення — у розділі 10.

## 11. Важливі застереження

- НЕ ламати порядок підключення скриптів і правило «стартові предмети — в кінці inventory.js».
- Кольори/типи блоків додавати в `ITEMS` (items.js); якщо блок ставиться — `block:true`,
  твердий — `solid:true`. Дроп — у `getDrop()`.
- Усе малюється кодом; нові предмети потребують гілки в `makeIcon()` або `makeTexture()`.
