(() => {
'use strict';

// ============ CONSTANTS ============
const SAVE_KEY = 'idleOrbit.save.v1';
const PLANET_RADIUS = 42;
const MIN_ORBIT = 80;
const MAX_ORBIT = 520;
const TAU = Math.PI * 2;

const RARITIES = {
  common:   { color: '#7bb8ff', mult: 1.0,  weight: 60 },
  uncommon: { color: '#9df7b6', mult: 1.6,  weight: 25 },
  rare:     { color: '#b48aff', mult: 2.8,  weight: 11 },
  epic:     { color: '#ffb36b', mult: 5.0,  weight: 3.5 },
  legendary:{ color: '#ff7bd0', mult: 9.0,  weight: 0.5 },
};

const BLUEPRINT_POOL = [
  { name: 'Scout MK-I',       rarity: 'common',    data: 1.0, alloy: 0.10, color: '#7bb8ff', size: 3.0 },
  { name: 'Relay MK-II',      rarity: 'common',    data: 1.3, alloy: 0.08, color: '#7bb8ff', size: 3.2 },
  { name: 'Prospector',       rarity: 'uncommon',  data: 0.8, alloy: 0.35, color: '#9df7b6', size: 3.4 },
  { name: 'DataHawk',         rarity: 'uncommon',  data: 2.2, alloy: 0.05, color: '#9df7b6', size: 3.2 },
  { name: 'Nomad Array',      rarity: 'rare',      data: 2.5, alloy: 0.40, color: '#b48aff', size: 3.6 },
  { name: 'Voidseer',         rarity: 'rare',      data: 4.0, alloy: 0.20, color: '#b48aff', size: 3.8 },
  { name: 'Sol Harvester',    rarity: 'epic',      data: 3.5, alloy: 0.90, color: '#ffb36b', size: 4.2 },
  { name: 'Quantum Eye',      rarity: 'epic',      data: 6.5, alloy: 0.30, color: '#ffb36b', size: 4.2 },
  { name: 'Ouroboros Mk-0',   rarity: 'legendary', data: 8.0, alloy: 1.20, color: '#ff7bd0', size: 4.8 },
];

const UPGRADES = {
  satPower:       { baseCost: { data: 50 },          costMult: 1.55, maxLv: 50 },
  alloyYield:     { baseCost: { alloy: 30 },         costMult: 1.50, maxLv: 50 },
  orbitStability: { baseCost: { data: 100 },         costMult: 1.70, maxLv: 20 },
  facility:       { baseCost: { data: 500, alloy: 200 }, costMult: 2.10, maxLv: 15 },
  launchDiscount: { baseCost: { alloy: 80 },         costMult: 1.80, maxLv: 10 },
};

const PLANET_NAMES = ['Kepler', 'Proxima', 'Trappist', 'Gliese', 'Wolf', 'Tau Ceti', 'Ross', 'Lalande'];
const DISCOVERY_EVENTS = [
  { t: 'Resource Shower',   msg: 'Asteroid cluster intercepted — +{X} Alloy', grant: 'alloy', mult: 30 },
  { t: 'Data Cache',        msg: 'Derelict probe recovered — +{X} Data',       grant: 'data', mult: 40 },
  { t: 'Blueprint Fragment',msg: 'Salvaged schematics — free blueprint!',       grant: 'blueprint' },
  { t: 'Signal Burst',      msg: 'Ancient pulsar detected — 2× Data for 30s',   grant: 'boost_data' },
  { t: 'Meteoric Vein',     msg: 'Rich vein in nearby belt — 2× Alloy for 30s', grant: 'boost_alloy' },
];

// ============ STATE ============
const state = {
  data: 0,
  alloy: 50,
  planetName: PLANET_NAMES[0] + '-0',
  satellites: [],
  maxSats: 4,
  upgrades: { satPower: 1, alloyYield: 1, orbitStability: 1, facility: 1, launchDiscount: 1 },
  selectedBP: 0,
  blueprints: [ { ...BLUEPRINT_POOL[0], id: 0 } ],
  nextBpId: 1,
  discoveryProgress: 0,
  discoveryLog: [],
  boosts: { data: 0, alloy: 0 }, // seconds remaining
  lastSaved: Date.now(),
  lastTick: Date.now(),
};

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    Object.assign(state, s);
    // offline earnings
    const elapsed = Math.min((Date.now() - state.lastTick) / 1000, 3600 * 8);
    if (elapsed > 2 && state.satellites.length) {
      const rates = computeRates();
      const d = rates.data * elapsed * 0.5;
      const a = rates.alloy * elapsed * 0.5;
      state.data += d;
      state.alloy += a;
      setTimeout(() => toast(`Welcome back. Offline: +${fmt(d)} ◈, +${fmt(a)} ⬢`, 'event'), 400);
    }
  } catch (e) { console.warn('load failed', e); }
}

function save() {
  state.lastSaved = Date.now();
  state.lastTick = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

// ============ CANVAS / RENDER ============
const canvas = document.getElementById('space');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, cx = 0, cy = 0, dpr = 1;
const stars = [];

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2;
  cy = H / 2;
  buildStars();
}

function buildStars() {
  stars.length = 0;
  const count = Math.floor((W * H) / 2200);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      tw: Math.random() * TAU,
      tws: 0.4 + Math.random() * 1.2,
    });
  }
}

// ============ SATELLITES ============
function launchSatellite(radius, bp) {
  const sat = {
    id: Math.random().toString(36).slice(2, 9),
    radius: Math.max(MIN_ORBIT, Math.min(MAX_ORBIT, radius)),
    angle: Math.random() * TAU,
    speed: 0,
    bp: { ...bp },
    trail: [],
    age: 0,
    born: performance.now(),
  };
  sat.speed = computeOrbitSpeed(sat.radius);
  state.satellites.push(sat);
}

function computeOrbitSpeed(r) {
  // Kepler-ish: inner orbits faster
  return 1.6 * Math.sqrt(MIN_ORBIT / r);
}

function updateSatellites(dt) {
  for (const s of state.satellites) {
    s.angle += s.speed * dt;
    if (s.angle > TAU) s.angle -= TAU;
    s.age += dt;
    const x = cx + Math.cos(s.angle) * s.radius;
    const y = cy + Math.sin(s.angle) * s.radius;
    s.x = x; s.y = y;
    s.trail.push({ x, y, a: 1 });
    if (s.trail.length > 28) s.trail.shift();
    for (const t of s.trail) t.a *= 0.93;
  }
}

function computeRates() {
  const u = state.upgrades;
  const satPowerMult = 1 + (u.satPower - 1) * 0.20;
  const alloyMult    = 1 + (u.alloyYield - 1) * 0.25;
  const stabBonus    = 1 + (u.orbitStability - 1) * 0.10;
  const facilityMult = 1 + (u.facility - 1) * 0.15;

  let data = 0, alloy = 0;
  for (const s of state.satellites) {
    const rFactor = 0.6 + (s.radius - MIN_ORBIT) / (MAX_ORBIT - MIN_ORBIT) * 1.2;
    data  += s.bp.data  * rFactor;
    alloy += s.bp.alloy * rFactor;
  }
  data  *= satPowerMult * stabBonus * facilityMult;
  alloy *= alloyMult    * stabBonus * facilityMult;
  if (state.boosts.data  > 0) data  *= 2;
  if (state.boosts.alloy > 0) alloy *= 2;
  return { data, alloy };
}

// ============ DRAW ============
function drawStars(t) {
  ctx.save();
  for (const s of stars) {
    const a = 0.4 + Math.sin(t * 0.001 * s.tws + s.tw) * 0.35;
    ctx.fillStyle = `rgba(200, 220, 255, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanet(t) {
  // glow
  const grad = ctx.createRadialGradient(cx, cy, PLANET_RADIUS * 0.5, cx, cy, PLANET_RADIUS * 2.8);
  grad.addColorStop(0, 'rgba(123, 184, 255, 0.55)');
  grad.addColorStop(0.5, 'rgba(80, 120, 200, 0.18)');
  grad.addColorStop(1, 'rgba(80, 120, 200, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS * 2.8, 0, TAU);
  ctx.fill();

  // body
  const pg = ctx.createRadialGradient(cx - PLANET_RADIUS * 0.4, cy - PLANET_RADIUS * 0.5, 2, cx, cy, PLANET_RADIUS);
  pg.addColorStop(0, '#9ec6ff');
  pg.addColorStop(0.5, '#4a70b8');
  pg.addColorStop(1, '#1a2848');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS, 0, TAU);
  ctx.fill();

  // continents (fake)
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(100, 200, 140, 0.35)';
  for (let i = 0; i < 4; i++) {
    const a = t * 0.00008 + i * 1.7;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 18, cy + Math.sin(a * 1.3) * 12, 10 + (i % 2) * 6, 6 + (i % 3) * 3, a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // rim
  ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS, 0, TAU);
  ctx.stroke();
}

function drawOrbitRings() {
  ctx.save();
  for (const s of state.satellites) {
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, s.radius, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSatellites() {
  for (const s of state.satellites) {
    // trail
    ctx.lineWidth = 1.6;
    for (let i = 1; i < s.trail.length; i++) {
      const p1 = s.trail[i - 1], p2 = s.trail[i];
      ctx.strokeStyle = `${hexA(s.bp.color, p2.a * 0.5)}`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // body
    const size = s.bp.size || 3;
    ctx.fillStyle = s.bp.color;
    ctx.shadowColor = s.bp.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, size, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    // solar panels
    ctx.strokeStyle = s.bp.color;
    ctx.lineWidth = 1.2;
    const perp = s.angle + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(perp) * (size + 1), s.y + Math.sin(perp) * (size + 1));
    ctx.lineTo(s.x + Math.cos(perp) * (size + 5), s.y + Math.sin(perp) * (size + 5));
    ctx.moveTo(s.x - Math.cos(perp) * (size + 1), s.y - Math.sin(perp) * (size + 1));
    ctx.lineTo(s.x - Math.cos(perp) * (size + 5), s.y - Math.sin(perp) * (size + 5));
    ctx.stroke();
  }
}

function drawDrag() {
  if (!drag.active) return;
  const dx = drag.x - cx;
  const dy = drag.y - cy;
  const d = Math.hypot(dx, dy);
  const r = Math.max(MIN_ORBIT, Math.min(MAX_ORBIT, d));
  const valid = canAffordLaunch() && state.satellites.length < state.maxSats;

  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = valid ? 'rgba(157, 247, 182, 0.6)' : 'rgba(255, 120, 120, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();

  // preview sat at drag pos
  const ang = Math.atan2(dy, dx);
  const px = cx + Math.cos(ang) * r;
  const py = cy + Math.sin(ang) * r;
  ctx.setLineDash([]);
  ctx.fillStyle = valid ? '#9df7b6' : '#ff8888';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, TAU);
  ctx.fill();
  ctx.restore();

  // label
  ctx.fillStyle = valid ? '#9df7b6' : '#ff8888';
  ctx.font = '11px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`r=${Math.round(r)}  ${valid ? 'RELEASE' : (state.satellites.length >= state.maxSats ? 'SLOTS FULL' : 'NEED ALLOY')}`, drag.x + 12, drag.y - 8);
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ============ INPUT ============
const drag = { active: false, x: 0, y: 0 };

function onPointerDown(e) {
  const p = getPoint(e);
  const d = Math.hypot(p.x - cx, p.y - cy);
  if (d < PLANET_RADIUS + 28) {
    drag.active = true;
    drag.x = p.x;
    drag.y = p.y;
    canvas.classList.add('dragging');
    canvas.setPointerCapture?.(e.pointerId);
  }
}
function onPointerMove(e) {
  if (!drag.active) return;
  const p = getPoint(e);
  drag.x = p.x;
  drag.y = p.y;
}
function onPointerUp(e) {
  if (!drag.active) return;
  drag.active = false;
  canvas.classList.remove('dragging');
  const p = getPoint(e);
  const d = Math.hypot(p.x - cx, p.y - cy);
  if (d < MIN_ORBIT) return;
  attemptLaunch(Math.min(MAX_ORBIT, d));
}
function getPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', () => { drag.active = false; canvas.classList.remove('dragging'); });

// ============ ECONOMY ============
function launchCost() {
  const base = 10;
  const n = state.satellites.length;
  const disc = 1 - (state.upgrades.launchDiscount - 1) * 0.10;
  return Math.ceil(base * Math.pow(1.35, n) * disc);
}

function canAffordLaunch() {
  return state.alloy >= launchCost();
}

function attemptLaunch(radius) {
  if (state.satellites.length >= state.maxSats) { toast('Max satellites reached. Upgrade Facility.'); return; }
  const cost = launchCost();
  if (state.alloy < cost) { toast(`Need ${cost} Alloy`); return; }
  state.alloy -= cost;
  const bp = state.blueprints[state.selectedBP] || state.blueprints[0];
  launchSatellite(radius, bp);
  refreshLaunchUI();
}

function upgradeCost(key) {
  const def = UPGRADES[key];
  const lv = state.upgrades[key];
  const mult = Math.pow(def.costMult, lv - 1);
  const out = {};
  for (const k in def.baseCost) out[k] = Math.ceil(def.baseCost[k] * mult);
  return out;
}

function canAffordUpgrade(key) {
  const c = upgradeCost(key);
  return (!c.data || state.data >= c.data) && (!c.alloy || state.alloy >= c.alloy);
}

function buyUpgrade(key) {
  const def = UPGRADES[key];
  if (state.upgrades[key] >= def.maxLv) { toast('Max level'); return; }
  if (!canAffordUpgrade(key)) { toast('Cannot afford'); return; }
  const c = upgradeCost(key);
  if (c.data)  state.data  -= c.data;
  if (c.alloy) state.alloy -= c.alloy;
  state.upgrades[key]++;
  if (key === 'facility') state.maxSats = 4 + (state.upgrades.facility - 1);
  if (key === 'orbitStability') {
    // slight speed reduction on existing sats (aesthetic) — actually boost via rate only
  }
  refreshUpgradeUI();
}

function rollBlueprint() {
  const cost = 250 + state.blueprints.length * 120;
  if (state.data < cost) { toast(`Need ${cost} Data`); return; }
  state.data -= cost;

  // weighted
  let total = 0;
  for (const k in RARITIES) total += RARITIES[k].weight;
  let roll = Math.random() * total;
  let chosenRarity = 'common';
  for (const k in RARITIES) {
    roll -= RARITIES[k].weight;
    if (roll <= 0) { chosenRarity = k; break; }
  }
  const pool = BLUEPRINT_POOL.filter(b => b.rarity === chosenRarity);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const bp = { ...pick, id: state.nextBpId++ };
  state.blueprints.push(bp);
  const tClass = chosenRarity === 'legendary' || chosenRarity === 'epic' ? 'epic' : (chosenRarity === 'rare' ? 'rare' : '');
  toast(`${chosenRarity.toUpperCase()}: ${pick.name}`, tClass);
  refreshBlueprintsUI();
  refreshRollButton();
}

// ============ DISCOVERY ============
function tickDiscovery(dt) {
  const satCount = state.satellites.length;
  if (!satCount) return;
  state.discoveryProgress += dt * (0.8 + satCount * 0.3) * (1 + (state.upgrades.facility - 1) * 0.2);
  const el = document.getElementById('disc-fill');
  const lbl = document.getElementById('disc-label');
  if (el) el.style.width = Math.min(100, state.discoveryProgress) + '%';
  if (lbl) lbl.textContent = `Scanning... ${Math.min(100, state.discoveryProgress).toFixed(1)}%`;
  if (state.discoveryProgress >= 100) {
    state.discoveryProgress = 0;
    triggerDiscovery();
  }
}

function triggerDiscovery() {
  const ev = DISCOVERY_EVENTS[Math.floor(Math.random() * DISCOVERY_EVENTS.length)];
  let msg = ev.msg;
  let x = 0;
  if (ev.grant === 'alloy') {
    x = Math.ceil(ev.mult * (1 + state.upgrades.facility * 0.5));
    state.alloy += x;
    msg = msg.replace('{X}', x);
  } else if (ev.grant === 'data') {
    x = Math.ceil(ev.mult * (1 + state.upgrades.facility * 0.5));
    state.data += x;
    msg = msg.replace('{X}', x);
  } else if (ev.grant === 'blueprint') {
    rollBlueprintFree();
  } else if (ev.grant === 'boost_data') {
    state.boosts.data = 30;
  } else if (ev.grant === 'boost_alloy') {
    state.boosts.alloy = 30;
  }
  logDiscovery(ev.t, msg);
  toast(`✦ ${ev.t}: ${msg}`, 'event');
}

function rollBlueprintFree() {
  let total = 0;
  for (const k in RARITIES) total += RARITIES[k].weight;
  let roll = Math.random() * total;
  let chosenRarity = 'common';
  for (const k in RARITIES) {
    roll -= RARITIES[k].weight;
    if (roll <= 0) { chosenRarity = k; break; }
  }
  const pool = BLUEPRINT_POOL.filter(b => b.rarity === chosenRarity);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const bp = { ...pick, id: state.nextBpId++ };
  state.blueprints.push(bp);
  refreshBlueprintsUI();
}

function logDiscovery(title, msg) {
  state.discoveryLog.unshift({ t: title, m: msg, ts: Date.now() });
  if (state.discoveryLog.length > 30) state.discoveryLog.pop();
  renderDiscoveryLog();
}

function renderDiscoveryLog() {
  const box = document.getElementById('disc-log');
  if (!box) return;
  box.innerHTML = state.discoveryLog.slice(0, 15).map(l =>
    `<div class="disc-log-item"><span class="t">${l.t}</span> — ${l.m}</div>`
  ).join('');
}

// ============ UI ============
function fmt(n) {
  if (n < 1000) return n.toFixed(n < 10 ? 2 : 0);
  if (n < 1e6) return (n / 1000).toFixed(2) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(2) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(2) + 'B';
  return (n / 1e12).toFixed(2) + 'T';
}

function refreshHUD() {
  const rates = computeRates();
  document.querySelector('#res-data .val').textContent = fmt(state.data);
  document.querySelector('#res-alloy .val').textContent = fmt(state.alloy);
  document.querySelector('#res-rate .val').textContent = fmt(rates.data);
  document.getElementById('planet-name').textContent = state.planetName;
  document.getElementById('planet-lvl').textContent = state.upgrades.facility;
}

function refreshLaunchUI() {
  document.getElementById('launch-cost').textContent = launchCost();
  const bp = state.blueprints[state.selectedBP] || state.blueprints[0];
  document.getElementById('bp-name').textContent = bp.name;
  document.getElementById('bp-name').style.color = bp.color;
  document.getElementById('bp-stats').textContent = `◈ ${bp.data}/s · ⬢ ${bp.alloy}/s`;
}

function refreshUpgradeUI() {
  for (const key in UPGRADES) {
    const el = document.querySelector(`.up-item[data-up="${key}"]`);
    if (!el) continue;
    const lv = state.upgrades[key];
    const def = UPGRADES[key];
    el.querySelector('.up-lvl span').textContent = lv;
    const btn = el.querySelector('.up-buy');
    if (lv >= def.maxLv) {
      btn.disabled = true;
      btn.innerHTML = 'MAX';
    } else {
      const c = upgradeCost(key);
      const parts = [];
      if (c.data)  parts.push(`${fmt(c.data)} ◈`);
      if (c.alloy) parts.push(`${fmt(c.alloy)} ⬢`);
      btn.innerHTML = `Buy <span class="cost">${parts.join(' / ')}</span>`;
      btn.disabled = !canAffordUpgrade(key);
    }
  }
}

function refreshBlueprintsUI() {
  const list = document.getElementById('bp-list');
  if (!list) return;
  list.innerHTML = state.blueprints.map((b, i) => `
    <div class="bp-item ${i === state.selectedBP ? 'selected' : ''}" data-idx="${i}" style="--rarity: ${b.color}">
      <div class="bp-item-name">${b.name} <span style="opacity:0.5;font-size:10px;font-weight:400">[${b.rarity}]</span></div>
      <div class="bp-item-stats">◈ ${b.data}/s · ⬢ ${b.alloy}/s · ×${(RARITIES[b.rarity]?.mult || 1).toFixed(1)}</div>
    </div>
  `).join('');
  list.querySelectorAll('.bp-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedBP = parseInt(el.dataset.idx, 10);
      refreshBlueprintsUI();
      refreshLaunchUI();
    });
  });
}

function refreshRollButton() {
  const btn = document.getElementById('btn-roll');
  if (!btn) return;
  const cost = 250 + state.blueprints.length * 120;
  btn.querySelector('.cost').textContent = `${fmt(cost)} ◈`;
  btn.disabled = state.data < cost;
}

function toast(msg, cls = '') {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ============ TABS ============
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.querySelectorAll('.up-item').forEach(el => {
  const key = el.dataset.up;
  el.querySelector('.up-buy').addEventListener('click', () => buyUpgrade(key));
});

document.getElementById('btn-roll').addEventListener('click', rollBlueprint);

// ============ MAIN LOOP ============
let lastFrame = performance.now();
let lastUI = 0;
let lastSave = 0;

function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  const rates = computeRates();
  state.data  += rates.data  * dt;
  state.alloy += rates.alloy * dt;
  if (state.boosts.data  > 0) state.boosts.data  = Math.max(0, state.boosts.data  - dt);
  if (state.boosts.alloy > 0) state.boosts.alloy = Math.max(0, state.boosts.alloy - dt);

  updateSatellites(dt);
  tickDiscovery(dt);

  // render
  ctx.clearRect(0, 0, W, H);
  drawStars(now);
  drawOrbitRings();
  drawPlanet(now);
  drawSatellites();
  drawDrag();

  // ui throttled
  if (now - lastUI > 120) {
    refreshHUD();
    refreshUpgradeUI();
    refreshRollButton();
    lastUI = now;
  }
  if (now - lastSave > 5000) {
    save();
    lastSave = now;
  }

  requestAnimationFrame(loop);
}

// ============ BOOT ============
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', save);

resize();
load();
refreshHUD();
refreshLaunchUI();
refreshUpgradeUI();
refreshBlueprintsUI();
refreshRollButton();
renderDiscoveryLog();

// seed tutorial
if (!state.satellites.length && state.alloy >= 10) {
  setTimeout(() => toast('Drag from planet outward to launch first satellite', 'event'), 600);
}

requestAnimationFrame(loop);

})();
