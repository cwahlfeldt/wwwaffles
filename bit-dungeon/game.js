(() => {
  'use strict';

  const SIZE = 5;
  const CELL_GAP = 6;
  const BOARD_PAD = 8;

  const TYPE = {
    PLAYER: 'player',
    ENEMY: 'enemy',
    TRAP: 'trap',
    LOOT: 'loot',
  };

  const boardEl = document.getElementById('board');
  const hpEl = document.getElementById('hp');
  const atkEl = document.getElementById('atk');
  const scoreEl = document.getElementById('score');
  const turnEl = document.getElementById('floor'); // repurposed as TURN
  const turnLabel = turnEl ? turnEl.parentElement.querySelector('.label') : null;
  const logEl = document.getElementById('log');
  const restartBtn = document.getElementById('restart');
  const overlay = document.getElementById('gameover');
  const overTitle = document.getElementById('over-title');
  const overStats = document.getElementById('over-stats');
  const overRestart = document.getElementById('over-restart');

  const state = {
    entities: [],
    nextId: 1,
    player: null,
    score: 0,
    turn: 0,
    busy: false,
    dead: false,
    nextTile: null, // { type, extra } — tile that will spawn after the next move
  };

  // ----- Rendering -----

  function buildCells() {
    boardEl.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      boardEl.appendChild(cell);
    }
  }

  function cellSize() {
    const rect = boardEl.getBoundingClientRect();
    const inner = rect.width - BOARD_PAD * 2 - CELL_GAP * (SIZE - 1);
    return inner / SIZE;
  }

  function tilePos(x, y) {
    const cs = cellSize();
    const px = BOARD_PAD + x * (cs + CELL_GAP);
    const py = BOARD_PAD + y * (cs + CELL_GAP);
    return { px, py };
  }

  function spriteFor(type, extra) {
    if (type === TYPE.PLAYER) return SPRITES.player;
    if (type === TYPE.TRAP) return SPRITES.trap;
    if (type === TYPE.LOOT) {
      if (extra.kind === 'heart') return SPRITES.loot_heart;
      if (extra.kind === 'sword') return SPRITES.loot_sword;
      return SPRITES.loot_gold;
    }
    if (type === TYPE.ENEMY) {
      const tier = Math.max(1, Math.min(5, extra.tier || 1));
      return SPRITES['enemy' + tier];
    }
    return '';
  }

  function makeEntity(type, x, y, extra = {}) {
    const el = document.createElement('div');
    el.className = `entity ${type}`;
    if (extra.strong) el.classList.add('strong');
    if (type === TYPE.ENEMY && extra.tier) el.classList.add('tier-' + extra.tier);
    if (type === TYPE.LOOT && extra.kind) el.classList.add(extra.kind);

    const sprite = document.createElement('div');
    sprite.className = 'sprite';
    sprite.innerHTML = spriteFor(type, extra);
    el.appendChild(sprite);

    if (type === TYPE.ENEMY) {
      const badge = document.createElement('div');
      badge.className = 'atk-badge';
      badge.textContent = extra.atk || 1;
      el.appendChild(badge);

      const hpbar = document.createElement('div');
      hpbar.className = 'hpbar';
      const fill = document.createElement('div');
      fill.style.width = '100%';
      hpbar.appendChild(fill);
      el.appendChild(hpbar);
    }

    if (type === TYPE.TRAP) {
      const badge = document.createElement('div');
      badge.className = 'atk-badge trap-badge';
      badge.textContent = extra.atk || 1;
      el.appendChild(badge);
    }

    boardEl.appendChild(el);

    const ent = {
      id: state.nextId++,
      type,
      x, y,
      el,
      hp: extra.hp || 1,
      maxHp: extra.hp || 1,
      atk: extra.atk || 1,
      score: extra.score || 0,
      tier: extra.tier || 0,
      kind: extra.kind || null,
      strong: !!extra.strong,
    };

    place(ent);
    el.classList.add('spawn');
    setTimeout(() => el.classList.remove('spawn'), 260);

    state.entities.push(ent);
    return ent;
  }

  function place(ent) {
    const { px, py } = tilePos(ent.x, ent.y);
    ent.el.style.transform = `translate(${px}px, ${py}px)`;
    ent.el.style.setProperty('--tx', `${px}px`);
    ent.el.style.setProperty('--ty', `${py}px`);
  }

  function placeAll() {
    for (const e of state.entities) {
      if (!e.dead) place(e);
    }
  }

  function entityAt(x, y, filterFn) {
    for (const e of state.entities) {
      if (e.dead) continue;
      if (e.x === x && e.y === y) {
        if (!filterFn || filterFn(e)) return e;
      }
    }
    return null;
  }

  function removeEntity(ent) {
    ent.dead = true;
    ent.el.classList.add('fading');
    setTimeout(() => {
      if (ent.el.parentNode) ent.el.parentNode.removeChild(ent.el);
    }, 220);
  }

  function log(msg, cls = '') {
    logEl.textContent = msg;
    logEl.className = 'log' + (cls ? ' ' + cls : '');
  }

  function updateHud() {
    const p = state.player;
    hpEl.textContent = p ? p.hp : 0;
    atkEl.textContent = p ? p.atk : 0;
    scoreEl.textContent = state.score;
    if (turnEl) turnEl.textContent = state.turn;
    if (turnLabel) turnLabel.textContent = 'TURN';
    const hpStat = hpEl.parentElement;
    if (p && p.hp <= 3) hpStat.classList.add('hp-low');
    else hpStat.classList.remove('hp-low');
    renderNextPreview();
  }

  function shakeBoard() {
    boardEl.classList.remove('board-shake');
    void boardEl.offsetWidth;
    boardEl.classList.add('board-shake');
  }

  // ----- Next-tile preview -----

  function renderNextPreview() {
    const box = document.getElementById('next-sprite');
    const label = document.getElementById('next-label');
    if (!box || !state.nextTile) return;
    box.innerHTML = spriteFor(state.nextTile.type, state.nextTile.extra || {});
    let name = state.nextTile.type.toUpperCase();
    if (state.nextTile.type === TYPE.ENEMY) {
      const names = ['', 'RAT', 'GOBLIN', 'ORC', 'SKELETON', 'DEMON'];
      name = names[state.nextTile.extra.tier] || 'ENEMY';
    } else if (state.nextTile.type === TYPE.LOOT) {
      name = state.nextTile.extra.kind.toUpperCase();
    }
    if (label) label.textContent = name;
  }

  // ----- Sliding mechanic -----
  // Everything except the player and permanent obstacles slides every turn.
  // Rule: in the traversal order (entities closest to the leading edge first),
  // each entity moves as far as it can in the direction. Collisions are
  // resolved one step at a time.
  function slide(dx, dy) {
    if (state.busy || state.dead) return;

    const movers = state.entities.filter(e => !e.dead);
    movers.sort((a, b) => {
      if (dx === 1) return b.x - a.x;
      if (dx === -1) return a.x - b.x;
      if (dy === 1) return b.y - a.y;
      if (dy === -1) return a.y - b.y;
      return 0;
    });

    const transforms = [];
    let anyMoved = false;
    let anyCollision = false;

    for (const ent of movers) {
      if (ent.dead) continue;
      let cx = ent.x, cy = ent.y;
      while (true) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) break;

        const blocker = entityAt(nx, ny, (e) => e !== ent);
        if (!blocker) {
          cx = nx; cy = ny;
          continue;
        }

        const outcome = resolveCollision(ent, blocker, nx, ny, dx, dy);
        if (outcome.anyEffect) anyCollision = true;

        if (outcome.attack) {
          // Player attacks enemy. Player does not move. Push handled in applyTransforms.
          transforms.push({ kind: 'attack', attacker: ent, target: blocker, dx, dy });
          break;
        }
        if (outcome.playerTripsTrap) {
          transforms.push({ kind: 'player-trips-trap', player: ent, trap: blocker });
          break;
        }
        if (outcome.pickup) {
          transforms.push({ kind: 'pickup', mover: ent, blocker });
          // Player doesn't slide past loot either (keep simple: pickup from adjacent).
          // But for the player the movement rule says "never moves on attack" — pickup is different.
          // We let the player move onto the loot's (now empty) cell.
          cx = nx; cy = ny;
          continue;
        }
        if (outcome.mergeTo) {
          transforms.push({ kind: 'merge', mover: ent, blocker, to: outcome.mergeTo });
          break;
        }
        if (outcome.enemyHitsTrap) {
          transforms.push({ kind: 'enemy-hits-trap',
            enemy: outcome.swapped ? blocker : ent,
            trap:  outcome.swapped ? ent : blocker });
          break;
        }
        if (outcome.trapHitsPlayer) {
          transforms.push({ kind: 'trap-hits-player', trap: ent, player: blocker });
          break;
        }
        if (outcome.trapsAnnihilate) {
          transforms.push({ kind: 'traps-annihilate', a: ent, b: blocker });
          break;
        }
        if (outcome.destroyBlocker) {
          transforms.push({ kind: 'destroy-blocker', mover: ent, blocker });
          // Mover slides into the vacated cell and can keep sliding.
          cx = nx; cy = ny;
          continue;
        }

        break;
      }

      if (cx !== ent.x || cy !== ent.y) {
        ent.x = cx; ent.y = cy;
        anyMoved = true;
      }
    }

    placeAll();

    if (!anyMoved && !anyCollision) {
      shakeBoard();
      return;
    }

    state.busy = true;
    setTimeout(() => {
      applyTransforms(transforms);
      endTurn();
      state.busy = false;
    }, 160);
  }

  // Determine what happens when `mover` slides into `blocker`.
  // Collisions never move the attacker into the blocker's cell. Enemies can be
  // pushed one tile further by the player's hit if the cell behind them is free.
  function resolveCollision(mover, blocker, nx, ny, dx, dy) {
    const a = mover.type, b = blocker.type;

    // --- Player attacks an enemy ---
    if (a === TYPE.PLAYER && b === TYPE.ENEMY) {
      return { attack: true, dx, dy, anyEffect: true };
    }

    // --- Player hits a trap by sliding into it ---
    // Player never moves; sliding into a trap disarms it (trap destroyed) and deals damage.
    if (a === TYPE.PLAYER && b === TYPE.TRAP) {
      return { playerTripsTrap: true, anyEffect: true };
    }

    // --- Player picks up loot (player stays put; loot is consumed) ---
    if (a === TYPE.PLAYER && b === TYPE.LOOT) {
      return { pickup: true, anyEffect: true };
    }

    // --- Enemy slides into something ---
    if (a === TYPE.ENEMY && b === TYPE.PLAYER) {
      // Enemies can no longer damage the player by contact. They just stop.
      return { anyEffect: false };
    }
    if (a === TYPE.ENEMY && b === TYPE.ENEMY) {
      if (mover.tier === blocker.tier && mover.tier < 5) {
        return { mergeTo: { tier: mover.tier + 1 }, anyEffect: true };
      }
      return { anyEffect: false };
    }
    if (a === TYPE.ENEMY && b === TYPE.TRAP) {
      return { enemyHitsTrap: true, anyEffect: true };
    }
    if (a === TYPE.ENEMY && b === TYPE.LOOT) {
      return { destroyBlocker: true, anyEffect: true };
    }

    // --- Trap slides into something ---
    if (a === TYPE.TRAP && b === TYPE.PLAYER) {
      return { trapHitsPlayer: true, anyEffect: true };
    }
    if (a === TYPE.TRAP && b === TYPE.ENEMY) {
      return { enemyHitsTrap: true, swapped: true, anyEffect: true };
    }
    if (a === TYPE.TRAP && b === TYPE.TRAP) {
      return { trapsAnnihilate: true, anyEffect: true };
    }
    if (a === TYPE.TRAP && b === TYPE.LOOT) {
      return { destroyBlocker: true, anyEffect: true };
    }

    // --- Loot interactions: loot never initiates damage; it just bounces ---
    return { anyEffect: false };
  }

  function applyTransforms(transforms) {
    for (const t of transforms) {
      if (t.kind === 'attack') {
        resolveAttack(t.attacker, t.target, t.dx, t.dy);
      } else if (t.kind === 'pickup') {
        pickupLoot(t.mover, t.blocker);
      } else if (t.kind === 'merge') {
        mergeEnemies(t.mover, t.blocker, t.to);
      } else if (t.kind === 'player-trips-trap') {
        if (!t.player.dead && !t.trap.dead) {
          applyDamage(t.player, t.trap.atk, 'trap');
          removeEntity(t.trap);
          log(`Trap disarmed — you lost ${t.trap.atk} HP.`, 'bad');
        }
      } else if (t.kind === 'enemy-hits-trap') {
        if (!t.enemy.dead && !t.trap.dead) {
          applyDamage(t.enemy, t.trap.atk, 'trap');
          removeEntity(t.trap);
          if (!t.enemy.dead) log('Enemy triggers a trap.', 'info');
          else log('Enemy dies on the spikes!', 'good');
        }
      } else if (t.kind === 'trap-hits-player') {
        if (!t.player.dead && !t.trap.dead) {
          applyDamage(t.player, t.trap.atk, 'trap');
          removeEntity(t.trap);
        }
      } else if (t.kind === 'traps-annihilate') {
        if (!t.a.dead) removeEntity(t.a);
        if (!t.b.dead) removeEntity(t.b);
        log('Traps collide and break.', 'info');
      } else if (t.kind === 'destroy-blocker') {
        if (!t.blocker.dead) removeEntity(t.blocker);
      }
    }
  }

  // Player attacks an adjacent enemy. Player never moves. If the enemy survives
  // and the tile behind it is open, the enemy is pushed one tile. Otherwise the
  // enemy stays and counter-attacks.
  function resolveAttack(player, enemy, dx, dy) {
    if (player.dead || enemy.dead) return;
    applyDamage(enemy, player.atk, TYPE.PLAYER);
    if (enemy.dead) return;

    const bx = enemy.x + dx, by = enemy.y + dy;
    const inBounds = bx >= 0 && bx < SIZE && by >= 0 && by < SIZE;
    const pushCell = inBounds ? entityAt(bx, by, e => e !== enemy) : 'wall';

    if (inBounds && !pushCell) {
      enemy.x = bx; enemy.y = by;
      place(enemy);
      flashHit(enemy);
      log('Enemy shoved back.', 'info');
    } else {
      // Counter-attack: this is the only way enemies damage the player.
      applyDamage(player, enemy.atk, TYPE.ENEMY);
      if (!player.dead) log(`Counter-attacked for ${enemy.atk}.`, 'bad');
    }
  }

  function mergeEnemies(mover, blocker, to) {
    // Blocker upgrades, mover is consumed.
    const newTier = to.tier;
    const { hp, atk, score } = enemyStatsForTier(newTier);

    // Replace blocker's sprite and stats.
    blocker.tier = newTier;
    blocker.maxHp = hp;
    blocker.hp = hp;
    blocker.atk = atk;
    blocker.score = score;

    const sprite = blocker.el.querySelector('.sprite');
    if (sprite) sprite.innerHTML = spriteFor(TYPE.ENEMY, { tier: newTier });
    const badge = blocker.el.querySelector('.atk-badge');
    if (badge) badge.textContent = atk;
    const bar = blocker.el.querySelector('.hpbar > div');
    if (bar) bar.style.width = '100%';

    blocker.el.classList.remove('tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5');
    blocker.el.classList.add('tier-' + newTier);

    // Flash the merge.
    blocker.el.classList.remove('hit');
    void blocker.el.offsetWidth;
    blocker.el.classList.add('hit');

    removeEntity(mover);
    state.score += 2 * newTier;
    log(`Enemies merged into tier ${newTier}. +${2 * newTier}`, 'info');
  }

  function enemyStatsForTier(tier) {
    const hp = tier;
    const atk = Math.max(1, Math.floor(tier / 2) + (tier >= 3 ? 1 : 0));
    const score = tier * 5;
    return { hp, atk, score };
  }

  function applyDamage(target, dmg, source) {
    if (dmg <= 0) return;
    target.hp -= dmg;
    flashHit(target);
    if (target.type === TYPE.ENEMY) {
      const bar = target.el.querySelector('.hpbar > div');
      if (bar) bar.style.width = `${Math.max(0, target.hp / target.maxHp) * 100}%`;
    }
    if (target.hp <= 0) {
      if (target.type === TYPE.ENEMY) {
        state.score += target.score;
        log(`Enemy slain. +${target.score}`, 'good');
      } else if (target.type === TYPE.PLAYER) {
        log(source === 'trap' ? 'Killed by a trap.' : 'Slain in combat.', 'bad');
      }
      removeEntity(target);
      if (target.type === TYPE.PLAYER) state.dead = true;
    } else if (target.type === TYPE.PLAYER) {
      if (source === 'trap') log(`Trap! -${dmg} HP`, 'bad');
      else log(`Hit for ${dmg}. HP ${target.hp}/${target.maxHp}`, 'bad');
    }
    updateHud();
  }

  function flashHit(ent) {
    if (!ent.el) return;
    ent.el.classList.remove('hit');
    void ent.el.offsetWidth;
    ent.el.classList.add('hit');
    setTimeout(() => ent.el.classList.remove('hit'), 240);
  }

  function pickupLoot(player, loot) {
    if (loot.kind === 'heart') {
      const heal = 3;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      log(`Heart! +${heal} HP`, 'good');
    } else if (loot.kind === 'sword') {
      player.atk += 1;
      log(`Sword! ATK +1`, 'good');
    } else {
      state.score += 5;
      log(`Gold. +5`, 'good');
    }
    removeEntity(loot);
    updateHud();
  }

  // ----- Turn flow -----

  function endTurn() {
    if (state.dead) {
      setTimeout(() => endRun('YOU DIED'), 250);
      return;
    }
    state.turn++;

    // Spawn the pre-announced tile at an edge cell, then roll the next one.
    spawnNextTile();

    // Pre-roll the NEXT next tile for the preview.
    state.nextTile = rollNextTile();

    updateHud();

    // Check lose by deadlock (board full + no legal move).
    if (isDeadlocked()) {
      setTimeout(() => endRun('BOARD LOCKED'), 250);
    }
  }

  function spawnNextTile() {
    if (!state.nextTile) return;
    const cell = findSpawnCell();
    if (!cell) return; // board full; deadlock check handles this
    const { type, extra } = state.nextTile;
    makeEntity(type, cell.x, cell.y, extra);
  }

  function findSpawnCell() {
    // Prefer cells far from the player to give breathing room.
    const candidates = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!entityAt(x, y)) candidates.push({ x, y });
      }
    }
    if (!candidates.length) return null;
    const p = state.player;
    if (p) {
      candidates.sort((a, b) => {
        const da = Math.abs(a.x - p.x) + Math.abs(a.y - p.y);
        const db = Math.abs(b.x - p.x) + Math.abs(b.y - p.y);
        return db - da;
      });
      // Pick from the farthest half, randomly.
      const pool = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function rollNextTile() {
    // Pressure curve: more enemies/traps as score climbs.
    const pressure = Math.min(1, state.score / 200);
    const r = Math.random();

    // Loot odds: ~18% early, tapers with pressure.
    const lootOdds = 0.18 - 0.08 * pressure;
    if (r < lootOdds) {
      const kr = Math.random();
      let kind = 'gold';
      if (kr < 0.35) kind = 'heart';
      else if (kr < 0.6) kind = 'sword';
      return { type: TYPE.LOOT, extra: { kind } };
    }

    // Trap odds: ~18%, rises slightly with pressure.
    const trapOdds = lootOdds + 0.18 + 0.07 * pressure;
    if (r < trapOdds) {
      const dmg = 1 + Math.floor(state.score / 80);
      return { type: TYPE.TRAP, extra: { atk: dmg } };
    }

    // Otherwise: enemy, tier weighted toward low early.
    const tierR = Math.random();
    let tier = 1;
    if (tierR < 0.55) tier = 1;
    else if (tierR < 0.82) tier = 2;
    else if (tierR < 0.95) tier = 3;
    else tier = 4;
    // Boost tier with pressure.
    tier = Math.min(5, tier + Math.floor(pressure * 1.5));
    const { hp, atk, score } = enemyStatsForTier(tier);
    return {
      type: TYPE.ENEMY,
      extra: { tier, hp, atk, score, strong: tier >= 3 },
    };
  }

  function isDeadlocked() {
    // Deadlock only when board is full AND no slide direction would change anything.
    const occupied = state.entities.filter(e => !e.dead).length;
    if (occupied < SIZE * SIZE) return false;

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      if (simulateCanResolve(dx, dy)) return false;
    }
    return true;
  }

  function simulateCanResolve(dx, dy) {
    for (const ent of state.entities) {
      if (ent.dead) continue;
      const nx = ent.x + dx, ny = ent.y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      const other = entityAt(nx, ny, e => e !== ent);
      if (!other) return true;
      const a = ent.type, b = other.type;
      if (a === TYPE.PLAYER && (b === TYPE.ENEMY || b === TYPE.TRAP || b === TYPE.LOOT)) return true;
      if (a === TYPE.ENEMY && (b === TYPE.TRAP || b === TYPE.LOOT)) return true;
      if (a === TYPE.ENEMY && b === TYPE.ENEMY && ent.tier === other.tier && ent.tier < 5) return true;
      if (a === TYPE.TRAP && (b === TYPE.ENEMY || b === TYPE.TRAP || b === TYPE.LOOT || b === TYPE.PLAYER)) return true;
    }
    return false;
  }

  function endRun(titleText) {
    overlay.classList.remove('hidden');
    overTitle.textContent = titleText;
    overStats.innerHTML = `Turn ${state.turn} · Score ${state.score}`;
  }

  // ----- Setup -----

  function startGame() {
    state.entities.forEach(e => {
      if (e.el && e.el.parentNode) e.el.parentNode.removeChild(e.el);
    });
    state.entities = [];
    state.nextId = 1;
    state.score = 0;
    state.turn = 0;
    state.busy = false;
    state.dead = false;

    overlay.classList.add('hidden');

    const cx = Math.floor(SIZE / 2);
    const cy = Math.floor(SIZE / 2);
    state.player = makeEntity(TYPE.PLAYER, cx, cy, { hp: 10, atk: 2 });
    state.player.maxHp = 10;

    // Starting tiles: a couple low-tier enemies, one trap, one loot.
    spawnInitial(TYPE.ENEMY, { tier: 1, ...enemyStatsForTier(1) });
    spawnInitial(TYPE.ENEMY, { tier: 1, ...enemyStatsForTier(1) });
    spawnInitial(TYPE.TRAP, { atk: 1 });
    spawnInitial(TYPE.LOOT, { kind: 'heart' });

    state.nextTile = rollNextTile();
    updateHud();
    log('Slide tiles. Push enemies into traps. Nothing ever clears — only transforms.', 'info');
  }

  function spawnInitial(type, extra) {
    const cell = findSpawnCell();
    if (!cell) return;
    makeEntity(type, cell.x, cell.y, extra);
  }

  // ----- Input -----

  function handleKey(e) {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); slide(0, -1); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); slide(0, 1); }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); slide(-1, 0); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); slide(1, 0); }
    else if (k === 'r' || k === 'R') { startGame(); }
  }

  let touchStart = null;
  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const threshold = 18;
    if (adx < threshold && ady < threshold) { touchStart = null; return; }
    if (adx > ady) slide(dx > 0 ? 1 : -1, 0);
    else slide(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }

  let mouseStart = null;
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    mouseStart = { x: e.clientX, y: e.clientY };
  }
  function handleMouseUp(e) {
    if (!mouseStart) return;
    const dx = e.clientX - mouseStart.x;
    const dy = e.clientY - mouseStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const threshold = 24;
    mouseStart = null;
    if (adx < threshold && ady < threshold) return;
    if (adx > ady) slide(dx > 0 ? 1 : -1, 0);
    else slide(0, dy > 0 ? 1 : -1);
  }

  window.addEventListener('keydown', handleKey);
  boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
  boardEl.addEventListener('touchend', handleTouchEnd, { passive: true });
  boardEl.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);

  restartBtn.addEventListener('click', startGame);
  overRestart.addEventListener('click', startGame);

  // Rules modal
  const rulesEl = document.getElementById('rules');
  const helpBtn = document.getElementById('help');
  const rulesClose = document.getElementById('rules-close');

  const spriteMap = {
    'player': SPRITES.player,
    'enemy-1': SPRITES.enemy1,
    'enemy-2': SPRITES.enemy2,
    'enemy-3': SPRITES.enemy3,
    'enemy-4': SPRITES.enemy4,
    'enemy-5': SPRITES.enemy5,
    'trap': SPRITES.trap,
    'loot-heart': SPRITES.loot_heart,
    'loot-sword': SPRITES.loot_sword,
    'loot-gold': SPRITES.loot_gold,
  };
  document.querySelectorAll('.sprite-box').forEach(box => {
    for (const cls of box.classList) {
      if (spriteMap[cls]) {
        box.innerHTML = spriteMap[cls];
        break;
      }
    }
  });

  helpBtn.addEventListener('click', () => rulesEl.classList.remove('hidden'));
  rulesClose.addEventListener('click', () => rulesEl.classList.add('hidden'));
  rulesEl.addEventListener('click', (e) => {
    if (e.target === rulesEl) rulesEl.classList.add('hidden');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') rulesEl.classList.add('hidden');
    if (e.key === '?' || e.key === '/') {
      e.preventDefault();
      rulesEl.classList.toggle('hidden');
    }
  });

  window.addEventListener('resize', placeAll);

  buildCells();
  requestAnimationFrame(() => {
    startGame();
  });
})();
