import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  TILES, TILE_IDS, COMPAT, CATEGORIES, PALETTE, CELL, mulberry32
} from './tiles.js';

// --- Config ---
const GRID = 20;
const CENTER = GRID / 2;

// --- Three.js setup ---
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, GRID * 1.2, GRID * 2.8);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(GRID * 0.9, GRID * 0.9, GRID * 0.9);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 4;
controls.maxDistance = GRID * 2;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffe8c4, 1.1);
sun.position.set(GRID, GRID * 1.4, GRID * 0.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const shSize = GRID * 0.8;
sun.shadow.camera.left = -shSize;
sun.shadow.camera.right = shSize;
sun.shadow.camera.top = shSize;
sun.shadow.camera.bottom = -shSize;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = GRID * 4;
scene.add(sun);
const hemi = new THREE.HemisphereLight(0x9fc5ff, 0x2a2015, 0.35);
scene.add(hemi);

// Ground plane (catch shadows beyond grid)
const groundMat = new THREE.MeshLambertMaterial({ color: 0x0f1218 });
const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(GRID * 4, GRID * 4), groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.01;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// --- Grid visual ---
const gridHelper = new THREE.GridHelper(GRID * CELL, GRID, 0x2a3040, 0x1a2028);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

// Hover highlight
const hoverGeo = new THREE.BoxGeometry(CELL, 0.02, CELL);
const hoverMat = new THREE.MeshBasicMaterial({ color: 0x7fb8ff, transparent: true, opacity: 0.35 });
const hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
hoverMesh.visible = false;
scene.add(hoverMesh);

// --- WFC State ---
// Each cell: { possible: Set<tileId>, collapsed: tileId|null, group: THREE.Group|null, seed: number }
const cells = [];
for (let z = 0; z < GRID; z++) {
  const row = [];
  for (let x = 0; x < GRID; x++) {
    row.push({
      possible: new Set(TILE_IDS),
      collapsed: null,
      group: null,
      seed: Math.floor(Math.random() * 1e9),
    });
  }
  cells.push(row);
}

const cityRoot = new THREE.Group();
scene.add(cityRoot);

function worldPos(x, z) {
  return new THREE.Vector3(
    (x - CENTER + 0.5) * CELL,
    0,
    (z - CENTER + 0.5) * CELL
  );
}

function inBounds(x, z) {
  return x >= 0 && x < GRID && z >= 0 && z < GRID;
}

function clearCellMesh(cell) {
  if (cell.group) {
    cityRoot.remove(cell.group);
    cell.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    cell.group = null;
  }
}

function renderCell(x, z) {
  const cell = cells[z][x];
  clearCellMesh(cell);
  if (!cell.collapsed) return;
  const def = TILES[cell.collapsed];
  const g = def.build(cell.seed);
  const p = worldPos(x, z);
  g.position.copy(p);
  cityRoot.add(g);
  cell.group = g;
}

// --- WFC: propagation with AC-3 style queue ---
function neighbors(x, z) {
  return [
    { dir: 0, nx: x,     nz: z - 1 }, // N
    { dir: 1, nx: x + 1, nz: z     }, // E
    { dir: 2, nx: x,     nz: z + 1 }, // S
    { dir: 3, nx: x - 1, nz: z     }, // W
  ];
}

// Given possible set of source cell in dir d, compute allowed set for neighbor.
function allowedFromSource(possibleSet, d) {
  const out = new Set();
  for (const id of possibleSet) {
    for (const other of COMPAT[id][d]) out.add(other);
  }
  return out;
}

function propagate(startList) {
  // startList: [[x,z], ...] cells whose possible sets changed
  const queue = [...startList];
  let ops = 0;
  while (queue.length) {
    ops++;
    if (ops > 50000) { console.warn('propagation cap'); break; }
    const [x, z] = queue.shift();
    const src = cells[z][x];
    for (const { dir, nx, nz } of neighbors(x, z)) {
      if (!inBounds(nx, nz)) continue;
      const nb = cells[nz][nx];
      if (nb.collapsed) continue;
      const allowed = allowedFromSource(src.possible, dir);
      // Intersect nb.possible with allowed
      let changed = false;
      for (const id of [...nb.possible]) {
        if (!allowed.has(id)) {
          nb.possible.delete(id);
          changed = true;
        }
      }
      if (nb.possible.size === 0) {
        // Contradiction — fallback to grass
        nb.possible = new Set(['grass']);
        changed = true;
      }
      if (changed) queue.push([nx, nz]);
    }
  }
}

// Collapse a cell to a specific tile id (user action or WFC pick)
function collapseCell(x, z, id) {
  const cell = cells[z][x];
  cell.collapsed = id;
  cell.possible = new Set([id]);
  renderCell(x, z);
  propagate([[x, z]]);
}

// WFC pick: lowest-entropy uncollapsed cell, weighted random among its possible.
function pickLowestEntropy() {
  let best = null;
  let bestCount = Infinity;
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const c = cells[z][x];
      if (c.collapsed) continue;
      const n = c.possible.size;
      if (n < 2) continue; // fully constrained or empty
      if (n < bestCount) {
        bestCount = n;
        best = [x, z];
      }
    }
  }
  // Also pick any cell with exactly one possibility (force collapse)
  if (!best) {
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const c = cells[z][x];
        if (!c.collapsed && c.possible.size === 1) return [x, z];
      }
    }
  }
  return best;
}

function weightedPick(ids, rng) {
  const arr = [...ids];
  const weights = arr.map(id => TILES[id].weight || 1);
  const sum = weights.reduce((a,b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

const rng = mulberry32(Date.now() & 0xffffffff);

function stepWFC() {
  const pick = pickLowestEntropy();
  if (!pick) return false;
  const [x, z] = pick;
  const c = cells[z][x];
  const id = weightedPick(c.possible, rng);
  collapseCell(x, z, id);
  return true;
}

function autoFill(maxSteps = GRID * GRID) {
  for (let i = 0; i < maxSteps; i++) {
    if (!stepWFC()) break;
  }
  updateStats();
}

function reset() {
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const c = cells[z][x];
      clearCellMesh(c);
      c.possible = new Set(TILE_IDS);
      c.collapsed = null;
      c.seed = Math.floor(Math.random() * 1e9);
    }
  }
  updateStats();
}

// --- User placement ---
// When user clicks a cell with a category, we pick the best tile id in that
// category given current possibilities. For roads, we auto-select the road
// variant whose connections match adjacent roads.

function placeAt(x, z, cat) {
  if (!inBounds(x, z)) return;
  if (cat === 'erase') {
    const c = cells[z][x];
    if (!c.collapsed) return;
    c.collapsed = null;
    c.possible = new Set(TILE_IDS);
    clearCellMesh(c);
    // Recompute neighbors' possibilities by re-propagating from all collapsed cells.
    recomputeFromCollapsed();
    updateStats();
    return;
  }

  if (cat === 'road') {
    const id = pickRoadVariant(x, z);
    forcePlace(x, z, id);
  } else {
    const options = CATEGORIES[cat];
    const c = cells[z][x];
    // Prefer an option that's still in possible; else force.
    const viable = options.filter(o => c.possible.has(o));
    const pickList = viable.length ? viable : options;
    const id = pickList[Math.floor(rng() * pickList.length)];
    forcePlace(x, z, id);
  }

  // After placing, update neighbor road tiles so they reconnect.
  updateNeighborRoads(x, z);
  updateStats();
}

function forcePlace(x, z, id) {
  const c = cells[z][x];
  clearCellMesh(c);
  c.collapsed = id;
  c.possible = new Set([id]);
  renderCell(x, z);
  // Re-propagate from this cell; neighbors that conflict get their possible
  // pruned but already-collapsed neighbors stay (we don't overwrite).
  propagate([[x, z]]);
}

function pickRoadVariant(x, z) {
  // Determine which neighbors are roads (or will be).
  const n = isRoad(x,     z - 1);
  const e = isRoad(x + 1, z    );
  const s = isRoad(x,     z + 1);
  const w = isRoad(x - 1, z    );
  return roadIdForMask(n, e, s, w);
}

function isRoad(x, z) {
  if (!inBounds(x, z)) return false;
  const c = cells[z][x];
  return c.collapsed && c.collapsed.startsWith('road_');
}

function roadIdForMask(N, E, S, W) {
  const key = (N?'N':'') + (E?'E':'') + (S?'S':'') + (W?'W':'');
  const map = {
    '':     'road_ns', // isolated: default to N-S straight
    'N':    'road_end_n',
    'E':    'road_end_e',
    'S':    'road_end_s',
    'W':    'road_end_w',
    'NS':   'road_ns',
    'EW':   'road_ew',
    'NE':   'road_ne',
    'NW':   'road_nw',
    'SE':   'road_se',
    'SW':   'road_sw',
    'NES':  'road_te',
    'NEW':  'road_tn',
    'NSW':  'road_tw',
    'ESW':  'road_ts',
    'NESW': 'road_cross',
  };
  return map[key] || 'road_ns';
}

function updateNeighborRoads(x, z) {
  for (const { nx, nz } of neighbors(x, z)) {
    if (!inBounds(nx, nz)) continue;
    if (isRoad(nx, nz)) {
      const id = pickRoadVariant(nx, nz);
      const c = cells[nz][nx];
      if (c.collapsed !== id) {
        clearCellMesh(c);
        c.collapsed = id;
        c.possible = new Set([id]);
        renderCell(nx, nz);
      }
    }
  }
}

function recomputeFromCollapsed() {
  // Reset all non-collapsed cells, then propagate from all collapsed cells.
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const c = cells[z][x];
      if (!c.collapsed) c.possible = new Set(TILE_IDS);
    }
  }
  const seeds = [];
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (cells[z][x].collapsed) seeds.push([x, z]);
    }
  }
  propagate(seeds);
}

function updateStats() {
  let collapsed = 0;
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (cells[z][x].collapsed) collapsed++;
    }
  }
  const total = GRID * GRID;
  document.getElementById('stats').textContent =
    `${collapsed}/${total} cells · ${TILE_IDS.length} tile types`;
}

// --- Input: raycasting ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ray_plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let currentTool = 'res';
let hoverCell = null;
let isDragging = false;
let pointerDownAt = null;

function pointerToCell(ev) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(ray_plane, hit)) return null;
  const x = Math.floor(hit.x / CELL + CENTER);
  const z = Math.floor(hit.z / CELL + CENTER);
  if (!inBounds(x, z)) return null;
  return { x, z };
}

canvas.addEventListener('pointermove', ev => {
  const p = pointerToCell(ev);
  if (p) {
    hoverCell = p;
    hoverMesh.visible = true;
    const wp = worldPos(p.x, p.z);
    hoverMesh.position.set(wp.x, 0.01, wp.z);
  } else {
    hoverCell = null;
    hoverMesh.visible = false;
  }
});

canvas.addEventListener('pointerdown', ev => {
  pointerDownAt = { x: ev.clientX, y: ev.clientY };
  isDragging = false;
});

canvas.addEventListener('pointermove', ev => {
  if (pointerDownAt) {
    const dx = ev.clientX - pointerDownAt.x;
    const dy = ev.clientY - pointerDownAt.y;
    if (dx * dx + dy * dy > 16) isDragging = true;
  }
});

canvas.addEventListener('pointerup', ev => {
  if (!isDragging && pointerDownAt) {
    const p = pointerToCell(ev);
    if (p) placeAt(p.x, p.z, currentTool);
  }
  pointerDownAt = null;
  isDragging = false;
});

// --- UI ---
const paletteEl = document.getElementById('palette');
PALETTE.forEach(entry => {
  const btn = document.createElement('div');
  btn.className = 'tool' + (entry.id === currentTool ? ' active' : '');
  btn.dataset.id = entry.id;
  btn.innerHTML = `<span class="swatch" style="background:${entry.color}"></span><span>${entry.label}</span>`;
  btn.addEventListener('click', () => {
    currentTool = entry.id;
    document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t.dataset.id === currentTool));
  });
  paletteEl.appendChild(btn);
});

document.getElementById('reset').addEventListener('click', reset);
document.getElementById('autofill').addEventListener('click', () => autoFill());
document.getElementById('showGrid').addEventListener('change', e => {
  gridHelper.visible = e.target.checked;
});

// --- Resize ---
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- Seed a starter diorama so first view has content ---
(function seed() {
  // small road cross in middle
  const cx = Math.floor(GRID / 2);
  const cz = Math.floor(GRID / 2);
  for (let i = -3; i <= 3; i++) {
    forcePlace(cx + i, cz, 'road_ew');
    forcePlace(cx, cz + i, 'road_ns');
  }
  // re-resolve road tiles now that neighbors exist
  for (let i = -3; i <= 3; i++) {
    updateNeighborRoads(cx + i, cz);
    updateNeighborRoads(cx, cz + i);
  }
  forcePlace(cx, cz, 'road_cross');
  updateStats();
})();

// --- Render loop ---
function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
