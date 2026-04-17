// Tile definitions for WFC.
// Sockets: identifiers on each edge [N, E, S, W]. Tiles match if sockets equal.
// Socket types: 'g' = grass/empty, 'r' = road, 'h' = house-side, 'c' = commercial-side

import * as THREE from "three";

export const CELL = 1.0;
export const VOXEL = CELL / 8;

const COLORS = {
  grass: 0x6bbf59,
  dirt: 0x8a6b3d,
  road: 0x3a3d42,
  stripe: 0xd8d8a8,
  wallA: 0xe8d9b0,
  wallB: 0xc9a97a,
  wallC: 0xb07a5a,
  roofA: 0x8f3a2b,
  roofB: 0x4a5a6e,
  roofC: 0x2b4a3a,
  shopA: 0xe8b24a,
  shopB: 0xd05a4a,
  shopC: 0x4aa3d0,
  window: 0xf6efb9,
  trunk: 0x5a3a22,
  leaf: 0x3a8a3a,
  leaf2: 0x4fa04f,
  accent: 0xefe2c2,
};

// Voxel helpers build a group of box meshes sized in voxel units on a cell.
function box(w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Place a voxel box in cell-local coords (cell centered at 0,0,0, y=0 is ground).
// vx,vy,vz in voxel units from min corner. w,h,d in voxel units.
function voxel(group, vx, vy, vz, w, h, d, color) {
  const m = box(w * VOXEL, h * VOXEL, d * VOXEL, color);
  m.position.set(
    -CELL / 2 + (vx + w / 2) * VOXEL,
    (vy + h / 2) * VOXEL,
    -CELL / 2 + (vz + d / 2) * VOXEL,
  );
  group.add(m);
  return m;
}

// Ground plate for a tile (grass or dirt base).
function ground(group, color = COLORS.grass) {
  voxel(group, 0, -0.25, 0, 8, 0.25, 8, color);
}

// --- Tile builders ---

function buildGrass() {
  const g = new THREE.Group();
  ground(g, COLORS.grass);
  return g;
}

function buildPark(seed = 0) {
  const g = new THREE.Group();
  ground(g, COLORS.grass);
  const rnd = mulberry32(seed + 7);
  const treeCount = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < treeCount; i++) {
    const tx = 1 + Math.floor(rnd() * 5);
    const tz = 1 + Math.floor(rnd() * 5);
    voxel(g, tx + 0.5, 0, tz + 0.5, 1, 3, 1, COLORS.trunk);
    voxel(
      g,
      tx - 1,
      2.5,
      tz - 1,
      4,
      2,
      4,
      rnd() > 0.5 ? COLORS.leaf : COLORS.leaf2,
    );
    voxel(g, tx, 4.5, tz, 2, 1, 2, COLORS.leaf);
  }
  // small bushes
  const bushes = Math.floor(rnd() * 3);
  for (let i = 0; i < bushes; i++) {
    const bx = Math.floor(rnd() * 7);
    const bz = Math.floor(rnd() * 7);
    voxel(g, bx, 0, bz, 1, 1, 1, COLORS.leaf2);
  }
  return g;
}

function buildHouse(seed = 0) {
  const g = new THREE.Group();
  ground(g, COLORS.grass);
  const rnd = mulberry32(seed + 13);

  const wallColor = [COLORS.wallA, COLORS.wallB, COLORS.wallC][
    Math.floor(rnd() * 3)
  ];
  const roofColor = [COLORS.roofA, COLORS.roofB, COLORS.roofC][
    Math.floor(rnd() * 3)
  ];

  const bw = 4 + Math.floor(rnd() * 2); // 4-5
  const bd = 4 + Math.floor(rnd() * 2);
  const bh = 3 + Math.floor(rnd() * 2); // 3-4 storeys
  const bx = Math.floor((8 - bw) / 2);
  const bz = Math.floor((8 - bd) / 2);

  // body
  voxel(g, bx, 0, bz, bw, bh, bd, wallColor);

  // windows — small lighter blocks on sides
  for (let y = 1; y < bh; y += 2) {
    voxel(g, bx - 0.05, y, bz + 1, 0.1, 1, 1, COLORS.window);
    voxel(g, bx + bw - 0.05, y, bz + bd - 2, 0.1, 1, 1, COLORS.window);
    voxel(g, bx + 1, y, bz - 0.05, 1, 1, 0.1, COLORS.window);
    voxel(g, bx + bw - 2, y, bz + bd - 0.05, 1, 1, 0.1, COLORS.window);
  }

  // roof — pyramid-ish stepped
  const rSteps = 2;
  for (let s = 0; s < rSteps; s++) {
    voxel(g, bx + s, bh + s, bz + s, bw - s * 2, 1, bd - s * 2, roofColor);
  }
  return g;
}

function buildShop(seed = 0) {
  const g = new THREE.Group();
  ground(g, COLORS.dirt);
  const rnd = mulberry32(seed + 29);

  const shopColor = [COLORS.shopA, COLORS.shopB, COLORS.shopC][
    Math.floor(rnd() * 3)
  ];
  const bh = 2 + Math.floor(rnd() * 2);

  // base (full footprint, short)
  voxel(g, 0.5, 0, 0.5, 7, bh, 7, COLORS.wallA);

  // awning / accent band
  voxel(g, 0.4, bh, 0.4, 7.2, 0.4, 7.2, shopColor);

  // upper block
  const uh = 1 + Math.floor(rnd() * 2);
  voxel(g, 1.5, bh + 0.4, 1.5, 5, uh, 5, COLORS.wallB);

  // sign
  voxel(g, 3, bh + 0.4 + uh, 0.3, 2, 1, 0.3, shopColor);

  // storefront windows
  voxel(g, 1, 0.5, 0.4, 2, 1.2, 0.1, COLORS.window);
  voxel(g, 4.5, 0.5, 0.4, 2, 1.2, 0.1, COLORS.window);
  return g;
}

function buildRoad(kind) {
  const g = new THREE.Group();
  ground(g, COLORS.road);
  // stripes by kind: straight_ns, straight_ew, corner_ne, corner_nw, corner_se, corner_sw, t_n, t_e, t_s, t_w, cross
  const s = COLORS.stripe;
  const stripe = (x, z, w, d) => voxel(g, x, 0.01, z, w, 0.05, d, s);

  const hasN = ["ns", "ne", "nw", "tn", "te", "tw", "cross"].includes(kind);
  const hasS =
    ["ns", "se", "sw", "tn", "ts", "te", "cross", "tw"].includes(kind) ||
    kind === "tn"
      ? false
      : false;
  // simpler: compute connections from kind
  const conn = connectionsFor(kind);
  // center square
  voxel(g, 3.5, 0.01, 3.5, 1, 0.05, 1, s);
  if (conn.N) stripe(3.9, 0, 0.2, 3.5);
  if (conn.S) stripe(3.9, 4.5, 0.2, 3.5);
  if (conn.E) stripe(4.5, 3.9, 3.5, 0.2);
  if (conn.W) stripe(0, 3.9, 3.5, 0.2);
  return g;
}

function connectionsFor(kind) {
  const map = {
    ns: { N: 1, S: 1, E: 0, W: 0 },
    ew: { N: 0, S: 0, E: 1, W: 1 },
    ne: { N: 1, S: 0, E: 1, W: 0 },
    nw: { N: 1, S: 0, E: 0, W: 1 },
    se: { N: 0, S: 1, E: 1, W: 0 },
    sw: { N: 0, S: 1, E: 0, W: 1 },
    tn: { N: 1, S: 0, E: 1, W: 1 }, // T missing N? convention: tn = T with north arm
    ts: { N: 0, S: 1, E: 1, W: 1 },
    te: { N: 1, S: 1, E: 1, W: 0 },
    tw: { N: 1, S: 1, E: 0, W: 1 },
    cross: { N: 1, S: 1, E: 1, W: 1 },
    end_n: { N: 1, S: 0, E: 0, W: 0 },
    end_s: { N: 0, S: 1, E: 0, W: 0 },
    end_e: { N: 0, S: 0, E: 1, W: 0 },
    end_w: { N: 0, S: 0, E: 0, W: 1 },
  };
  return map[kind] || { N: 0, S: 0, E: 0, W: 0 };
}

// --- Tile registry ---
// edges: [N, E, S, W]. Sockets:
//   'g' grass-edge, 'r' road-edge, 'x' any urban edge (house+shop+grass compatible)
//
// Matching rule: sockets must equal. We use a shared 'x' socket for urban
// tiles so houses/shops/grass neighbor freely; roads only match roads at 'r' edges.

export const TILES = {
  grass: {
    name: "Grass",
    cat: "park",
    edges: ["x", "x", "x", "x"],
    build: buildGrass,
    weight: 1,
  },
  park: {
    name: "Park",
    cat: "park",
    edges: ["x", "x", "x", "x"],
    build: buildPark,
    weight: 2,
  },
  house: {
    name: "House",
    cat: "res",
    edges: ["x", "x", "x", "x"],
    build: buildHouse,
    weight: 3,
  },
  shop: {
    name: "Shop",
    cat: "com",
    edges: ["x", "x", "x", "x"],
    build: buildShop,
    weight: 2,
  },
  // Road tiles — one tile per connection mask. Edge socket 'r' where connection,
  // 'x' where no connection (so roads can border urban).
  road_ns: mkRoad("ns", ["r", "x", "r", "x"]),
  road_ew: mkRoad("ew", ["x", "r", "x", "r"]),
  road_ne: mkRoad("ne", ["r", "r", "x", "x"]),
  road_nw: mkRoad("nw", ["r", "x", "x", "r"]),
  road_se: mkRoad("se", ["x", "r", "r", "x"]),
  road_sw: mkRoad("sw", ["x", "x", "r", "r"]),
  road_tn: mkRoad("tn", ["r", "r", "x", "r"]),
  road_ts: mkRoad("ts", ["x", "r", "r", "r"]),
  road_te: mkRoad("te", ["r", "r", "r", "x"]),
  road_tw: mkRoad("tw", ["r", "x", "r", "r"]),
  road_cross: mkRoad("cross", ["r", "r", "r", "r"]),
  road_end_n: mkRoad("end_n", ["r", "x", "x", "x"]),
  road_end_s: mkRoad("end_s", ["x", "x", "r", "x"]),
  road_end_e: mkRoad("end_e", ["x", "r", "x", "x"]),
  road_end_w: mkRoad("end_w", ["x", "x", "x", "r"]),
};

function mkRoad(kind, edges) {
  return {
    name: "Road",
    cat: "road",
    edges,
    build: () => buildRoad(kind),
    weight: 1,
  };
}

export const TILE_IDS = Object.keys(TILES);

// Build a compatibility table for propagation: for each tile, for each dir,
// list of tile ids whose opposite edge matches.
export const OPPOSITE = [2, 3, 0, 1]; // N<->S, E<->W

export const COMPAT = (() => {
  const table = {};
  for (const id of TILE_IDS) {
    table[id] = [[], [], [], []];
    for (let d = 0; d < 4; d++) {
      const mySock = TILES[id].edges[d];
      const opp = OPPOSITE[d];
      for (const other of TILE_IDS) {
        if (TILES[other].edges[opp] === mySock) {
          table[id][d].push(other);
        }
      }
    }
  }
  return table;
})();

// Category -> list of tile ids user can paint directly
export const CATEGORIES = {
  res: ["house"],
  com: ["shop"],
  park: ["park", "grass"],
  road: [
    "road_ns",
    "road_ew",
    "road_ne",
    "road_nw",
    "road_se",
    "road_sw",
    "road_tn",
    "road_ts",
    "road_te",
    "road_tw",
    "road_cross",
    "road_end_n",
    "road_end_s",
    "road_end_e",
    "road_end_w",
  ],
};

export const PALETTE = [
  { id: "res", label: "Residential", color: "#c9a97a" },
  { id: "com", label: "Commercial", color: "#e8b24a" },
  { id: "park", label: "Park", color: "#6bbf59" },
  { id: "road", label: "Road", color: "#3a3d42" },
  { id: "erase", label: "Erase", color: "#222" },
];

// --- RNG ---
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
