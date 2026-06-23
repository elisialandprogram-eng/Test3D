import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";
import { KingdomData } from "./KingdomSystem";

// Platform height from KingdomSystem (always 3)
const PLATFORM_H = 3;

function levelScale(level: number): number {
  return 1.0 + (level - 1) * 0.13;
}

const DISTRICT_THEMES = [
  { roofR: 0.75, roofG: 0.25, roofB: 0.15, wallR: 0.82, wallG: 0.74, wallB: 0.60 }, // Residential
  { roofR: 0.85, roofG: 0.55, roofB: 0.05, wallR: 0.80, wallG: 0.76, wallB: 0.58 }, // Market
  { roofR: 0.20, roofG: 0.40, roofB: 0.35, wallR: 0.60, wallG: 0.58, wallB: 0.50 }, // Military
  { roofR: 0.20, roofG: 0.35, roofB: 0.70, wallR: 0.72, wallG: 0.68, wallB: 0.58 }, // Crafting
];

function rnd(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function makeBuilding(
  id: string,
  cx: number, groundY: number, cz: number,
  w: number, depth: number, h: number,
  wallMat: StandardMaterial,
  roofMat: StandardMaterial,
  scene: Scene
): Mesh[] {
  const body = MeshBuilder.CreateBox(`${id}_body`, { width: w, height: h, depth }, scene);
  body.position = new Vector3(cx, groundY + h / 2, cz);
  body.material = wallMat;
  body.receiveShadows = true;

  const roofH = Math.min(w, depth) * 0.5;
  const roof = MeshBuilder.CreateCylinder(`${id}_roof`, {
    diameterTop: 0, diameterBottom: Math.max(w, depth) + 2,
    height: roofH, tessellation: 4,
  }, scene);
  roof.rotation.y = Math.PI / 4;
  roof.position = new Vector3(cx, groundY + h + roofH / 2, cz);
  roof.material = roofMat;

  return [body, roof];
}

function makeTree(id: string, cx: number, groundY: number, cz: number, scene: Scene): Mesh[] {
  const trunkMat = new StandardMaterial(`${id}_trM`, scene);
  trunkMat.diffuseColor = new Color3(0.35, 0.22, 0.1);

  const foliageMat = new StandardMaterial(`${id}_foM`, scene);
  foliageMat.diffuseColor = new Color3(0.22, 0.55, 0.15);
  foliageMat.emissiveColor = new Color3(0.02, 0.06, 0.01);

  const trunk = MeshBuilder.CreateCylinder(`${id}_tr`, {
    diameterTop: 1.2, diameterBottom: 1.8, height: 5, tessellation: 6,
  }, scene);
  trunk.position = new Vector3(cx, groundY + 2.5, cz);
  trunk.material = trunkMat;

  const crown = MeshBuilder.CreateCylinder(`${id}_cr`, {
    diameterTop: 0, diameterBottom: 10, height: 8, tessellation: 7,
  }, scene);
  crown.position = new Vector3(cx, groundY + 8, cz);
  crown.material = foliageMat;

  return [trunk, crown];
}

function makeFountain(id: string, cx: number, groundY: number, cz: number, scene: Scene): Mesh[] {
  const stoneMat = new StandardMaterial(`${id}_stone`, scene);
  stoneMat.diffuseColor = new Color3(0.7, 0.68, 0.62);

  const waterMat = new StandardMaterial(`${id}_water`, scene);
  waterMat.diffuseColor = new Color3(0.2, 0.55, 0.85);
  waterMat.emissiveColor = new Color3(0.05, 0.2, 0.4);
  waterMat.alpha = 0.85;

  const basin = MeshBuilder.CreateCylinder(`${id}_basin`, {
    diameter: 14, height: 2, tessellation: 12,
  }, scene);
  basin.position = new Vector3(cx, groundY + 1, cz);
  basin.material = stoneMat;

  const innerRing = MeshBuilder.CreateCylinder(`${id}_inner`, {
    diameter: 10, height: 2.4, tessellation: 12,
  }, scene);
  innerRing.position = new Vector3(cx, groundY + 1.2, cz);
  innerRing.material = stoneMat;

  const water = MeshBuilder.CreateCylinder(`${id}_water`, {
    diameter: 9, height: 0.4, tessellation: 12,
  }, scene);
  water.position = new Vector3(cx, groundY + 2.2, cz);
  water.material = waterMat;

  const column = MeshBuilder.CreateCylinder(`${id}_col`, {
    diameterTop: 1.5, diameterBottom: 2, height: 6, tessellation: 8,
  }, scene);
  column.position = new Vector3(cx, groundY + 5, cz);
  column.material = stoneMat;

  const topBowl = MeshBuilder.CreateCylinder(`${id}_topBowl`, {
    diameter: 6, height: 1.5, tessellation: 10,
  }, scene);
  topBowl.position = new Vector3(cx, groundY + 8.5, cz);
  topBowl.material = stoneMat;

  return [basin, innerRing, water, column, topBowl];
}

function makePlaza(id: string, cx: number, groundY: number, cz: number, size: number, scene: Scene): Mesh {
  const plazaMat = new StandardMaterial(`${id}_plaza`, scene);
  plazaMat.diffuseColor = new Color3(0.68, 0.62, 0.52);
  plazaMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const plaza = MeshBuilder.CreateBox(`${id}_plaza`, { width: size, height: 0.4, depth: size }, scene);
  plaza.position = new Vector3(cx, groundY + 0.2, cz);
  plaza.material = plazaMat;
  plaza.receiveShadows = true;
  plaza.isPickable = false;
  return plaza;
}

function makeRoad(id: string, cx: number, groundY: number, cz: number, w: number, depth: number, scene: Scene): Mesh {
  const roadMat = new StandardMaterial(`${id}_road`, scene);
  roadMat.diffuseColor = new Color3(0.55, 0.50, 0.42);
  roadMat.specularColor = new Color3(0.02, 0.02, 0.02);

  const road = MeshBuilder.CreateBox(id, { width: w, height: 0.3, depth }, scene);
  road.position = new Vector3(cx, groundY + 0.15, cz);
  road.material = roadMat;
  road.receiveShadows = true;
  road.isPickable = false;
  return road;
}

export function buildKingdomInterior(kingdom: KingdomData, scene: Scene): Mesh[] {
  const allMeshes: Mesh[] = [];
  const id = `KCity_${kingdom.id}`;
  const cx = kingdom.coord.x;
  const cz = kingdom.coord.y;  // game coord.y → Babylon z
  const s = levelScale(kingdom.level);
  const groundY = PLATFORM_H;   // top of platform = y=3
  const seed = kingdom.id * 37;

  const keepHalf = 16 * s;
  const wallR = 40 * s;
  const dist = (keepHalf + wallR) / 2;

  // ── Stone plaza around the keep ──
  const plazaSize = keepHalf * 2 + 12;
  allMeshes.push(makePlaza(`${id}_plz`, cx, groundY, cz, plazaSize, scene));

  // ── Cross roads (N, S, E, W of keep to walls) ──
  const roadLen = (wallR - keepHalf) - 3;
  const roadW = 6;
  allMeshes.push(makeRoad(`${id}_rdN`, cx, groundY, cz - keepHalf - roadLen / 2, roadW, roadLen, scene));
  allMeshes.push(makeRoad(`${id}_rdS`, cx, groundY, cz + keepHalf + roadLen / 2, roadW, roadLen, scene));
  allMeshes.push(makeRoad(`${id}_rdE`, cx + keepHalf + roadLen / 2, groundY, cz, roadLen, roadW, scene));
  allMeshes.push(makeRoad(`${id}_rdW`, cx - keepHalf - roadLen / 2, groundY, cz, roadLen, roadW, scene));

  // ── Fountain (south courtyard) ──
  allMeshes.push(...makeFountain(`${id}_fnt`, cx, groundY, cz + keepHalf + 12, scene));

  // ── 4 corner districts ──
  const corners = [
    { sx: -1, sz: -1, themeIdx: 0 },  // NW: Residential
    { sx:  1, sz: -1, themeIdx: 1 },  // NE: Market
    { sx:  1, sz:  1, themeIdx: 2 },  // SE: Military
    { sx: -1, sz:  1, themeIdx: 3 },  // SW: Crafting
  ];

  for (const corner of corners) {
    const theme = DISTRICT_THEMES[corner.themeIdx];
    const dcx = cx + corner.sx * dist;
    const dcz = cz + corner.sz * dist;
    const dId = `${id}_d${corner.themeIdx}`;

    const wallMat = new StandardMaterial(`${dId}_wall`, scene);
    wallMat.diffuseColor = new Color3(theme.wallR, theme.wallG, theme.wallB);
    wallMat.specularColor = new Color3(0.1, 0.1, 0.1);

    const roofMat = new StandardMaterial(`${dId}_roof`, scene);
    roofMat.diffuseColor = new Color3(theme.roofR, theme.roofG, theme.roofB);
    roofMat.specularColor = new Color3(0.15, 0.15, 0.15);

    // Main building
    const mainH = 10 + rnd(seed + corner.themeIdx) * 4;
    allMeshes.push(...makeBuilding(`${dId}_main`, dcx, groundY, dcz, 12, 12, mainH, wallMat, roofMat, scene));

    // Side building A (along x-axis)
    const offA = 12 + rnd(seed + 10) * 3;
    const sideAH = 7 + rnd(seed + corner.themeIdx * 3) * 3;
    allMeshes.push(...makeBuilding(
      `${dId}_sA`, dcx + corner.sx * offA, groundY, dcz,
      8, 9, sideAH, wallMat, roofMat, scene
    ));

    // Side building B (along z-axis)
    const offB = 12 + rnd(seed + 20) * 3;
    const sideBH = 6 + rnd(seed + corner.themeIdx * 7) * 2;
    allMeshes.push(...makeBuilding(
      `${dId}_sB`, dcx, groundY, dcz + corner.sz * offB,
      9, 7, sideBH, wallMat, roofMat, scene
    ));

    // District trees
    const treeOff = 15;
    allMeshes.push(...makeTree(`${dId}_tA`, dcx + corner.sx * treeOff * 0.3, groundY, dcz + corner.sz * treeOff, scene));
    allMeshes.push(...makeTree(`${dId}_tB`, dcx + corner.sx * treeOff, groundY, dcz + corner.sz * treeOff * 0.3, scene));
  }

  // ── Cardinal-point decorative trees flanking the keep ──
  const treeR = keepHalf + 8;
  allMeshes.push(...makeTree(`${id}_tN0`, cx - 8, groundY, cz - treeR, scene));
  allMeshes.push(...makeTree(`${id}_tN1`, cx + 8, groundY, cz - treeR, scene));
  allMeshes.push(...makeTree(`${id}_tS0`, cx - 8, groundY, cz + treeR, scene));
  allMeshes.push(...makeTree(`${id}_tS1`, cx + 8, groundY, cz + treeR, scene));

  for (const m of allMeshes) {
    if (!m.metadata) m.metadata = {};
    m.isPickable = false;
  }

  return allMeshes;
}

let _cityMeshes: Mesh[] = [];

export function initKingdomCitySystem(kingdoms: KingdomData[], scene: Scene): void {
  _cityMeshes = [];
  for (const k of kingdoms) {
    try {
      const meshes = buildKingdomInterior(k, scene);
      _cityMeshes.push(...meshes);
    } catch (e) {
      console.error(`[EK] KingdomCity failed for ${k.name}:`, e);
    }
  }
  console.log(`[EK] KingdomCitySystem built ${_cityMeshes.length} meshes for ${kingdoms.length} kingdoms`);
}

export function getCityMeshes(): Mesh[] {
  return _cityMeshes;
}
