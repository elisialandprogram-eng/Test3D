import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  Matrix,
  Quaternion,
} from "@babylonjs/core";

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function terrainHeight(x: number, z: number): number {
  const nx = x / 500;
  const nz = z / 500;
  const n = Math.sin(nx * 127.1 + nz * 311.7) * 43758.5453;
  return ((n - Math.floor(n)) - 0.5) * 4.5;
}

function isNearKingdom(x: number, z: number, kingdoms: Array<{ x: number; z: number }>): boolean {
  for (const k of kingdoms) {
    const dx = x - k.x;
    const dz = z - k.z;
    if (dx * dx + dz * dz < 18 * 18) return true;
  }
  return false;
}

function isNearWater(x: number, z: number): boolean {
  const patches = [
    { x: -80, z: 60, w: 35, h: 28 },
    { x: 90, z: -70, w: 30, h: 22 },
    { x: -120, z: -80, w: 25, h: 20 },
    { x: 60, z: 120, w: 20, h: 18 },
    { x: -40, z: 130, w: 18, h: 14 },
    { x: 130, z: 40, w: 22, h: 16 },
  ];
  for (const p of patches) {
    if (Math.abs(x - p.x) < p.w / 2 + 8 && Math.abs(z - p.z) < p.h / 2 + 8) return true;
  }
  return false;
}

function makeMatrix(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0): Matrix {
  return Matrix.Compose(
    new Vector3(sx, sy, sz),
    Quaternion.RotationAxis(Vector3.Up(), ry),
    new Vector3(x, y, z),
  );
}

export function createDecorations(scene: Scene, kingdoms: Array<{ x: number; z: number }>) {
  const rand = seededRand(42137);

  const trunkMat = new StandardMaterial("trunkMat", scene);
  trunkMat.diffuseColor = new Color3(0.35, 0.22, 0.12);
  trunkMat.specularColor = new Color3(0.02, 0.01, 0.01);

  const foliageMat1 = new StandardMaterial("foliageMat1", scene);
  foliageMat1.diffuseColor = new Color3(0.15, 0.45, 0.12);
  foliageMat1.specularColor = new Color3(0.01, 0.03, 0.01);

  const foliageMat2 = new StandardMaterial("foliageMat2", scene);
  foliageMat2.diffuseColor = new Color3(0.12, 0.35, 0.10);
  foliageMat2.specularColor = new Color3(0.01, 0.02, 0.01);

  const foliageMat3 = new StandardMaterial("foliageMat3", scene);
  foliageMat3.diffuseColor = new Color3(0.22, 0.52, 0.18);
  foliageMat3.specularColor = new Color3(0.01, 0.03, 0.01);

  const rockMat = new StandardMaterial("rockMat", scene);
  rockMat.diffuseColor = new Color3(0.48, 0.44, 0.40);
  rockMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const bushMat = new StandardMaterial("bushMat", scene);
  bushMat.diffuseColor = new Color3(0.2, 0.42, 0.14);
  bushMat.specularColor = new Color3(0.01, 0.02, 0.01);

  const ruinMat = new StandardMaterial("ruinMat", scene);
  ruinMat.diffuseColor = new Color3(0.55, 0.5, 0.44);
  ruinMat.specularColor = new Color3(0.06, 0.05, 0.04);

  createTreeInstances(scene, rand, kingdoms, trunkMat, [foliageMat1, foliageMat2, foliageMat3]);
  createRockInstances(scene, rand, kingdoms, rockMat);
  createBushInstances(scene, rand, kingdoms, bushMat);
  createRuins(scene, rand, kingdoms, ruinMat);
}

function applyThinInstances(mesh: Mesh, matArrays: Float32Array[]) {
  if (matArrays.length === 0) { mesh.isVisible = false; return; }
  const combined = new Float32Array(matArrays.length * 16);
  matArrays.forEach((m, i) => combined.set(m, i * 16));
  mesh.isVisible = true;
  mesh.thinInstanceSetBuffer("matrix", combined, 16);
}

function createTreeInstances(
  scene: Scene,
  rand: () => number,
  kingdoms: Array<{ x: number; z: number }>,
  trunkMat: StandardMaterial,
  foliageMats: StandardMaterial[],
) {
  const trunk = MeshBuilder.CreateCylinder("treeTrunk", {
    height: 2.2, diameterTop: 0.25, diameterBottom: 0.5, tessellation: 7,
  }, scene);
  trunk.material = trunkMat;
  trunk.isVisible = false;

  const canopy1 = MeshBuilder.CreateCylinder("treeCanopy1", {
    height: 2.8, diameterTop: 0, diameterBottom: 3.2, tessellation: 8,
  }, scene);
  canopy1.material = foliageMats[0];
  canopy1.isVisible = false;

  const canopy2 = MeshBuilder.CreateCylinder("treeCanopy2", {
    height: 2.4, diameterTop: 0, diameterBottom: 2.4, tessellation: 7,
  }, scene);
  canopy2.material = foliageMats[1];
  canopy2.isVisible = false;

  const canopy3 = MeshBuilder.CreateCylinder("treeCanopy3", {
    height: 2.0, diameterTop: 0, diameterBottom: 1.6, tessellation: 6,
  }, scene);
  canopy3.material = foliageMats[2];
  canopy3.isVisible = false;

  const TREE_COUNT = 650;
  const tmArr: Float32Array[] = [];
  const c1Arr: Float32Array[] = [];
  const c2Arr: Float32Array[] = [];
  const c3Arr: Float32Array[] = [];

  for (let i = 0; i < TREE_COUNT; i++) {
    const x = (rand() - 0.5) * 470;
    const z = (rand() - 0.5) * 470;
    if (isNearKingdom(x, z, kingdoms) || isNearWater(x, z)) continue;

    const bh = terrainHeight(x, z);
    const s = 0.55 + rand() * 0.85;
    const ry = rand() * Math.PI * 2;

    tmArr.push(new Float32Array(makeMatrix(x, bh + 1.1 * s, z, s, s, s, ry).asArray()));
    c1Arr.push(new Float32Array(makeMatrix(x, bh + 2.0 * s, z, s, s, s, ry).asArray()));
    c2Arr.push(new Float32Array(makeMatrix(x, bh + 3.2 * s, z, s, s, s, ry).asArray()));
    c3Arr.push(new Float32Array(makeMatrix(x, bh + 4.2 * s, z, s, s, s, ry).asArray()));
  }

  applyThinInstances(trunk, tmArr);
  applyThinInstances(canopy1, c1Arr);
  applyThinInstances(canopy2, c2Arr);
  applyThinInstances(canopy3, c3Arr);
}

function createRockInstances(
  scene: Scene,
  rand: () => number,
  kingdoms: Array<{ x: number; z: number }>,
  rockMat: StandardMaterial,
) {
  const rock = MeshBuilder.CreateSphere("rock", { diameter: 1, segments: 5 }, scene);
  rock.material = rockMat;
  rock.isVisible = false;

  const mats: Float32Array[] = [];
  for (let i = 0; i < 280; i++) {
    const x = (rand() - 0.5) * 460;
    const z = (rand() - 0.5) * 460;
    if (isNearKingdom(x, z, kingdoms) || isNearWater(x, z)) continue;
    const bh = terrainHeight(x, z);
    const sx = 0.5 + rand() * 1.5;
    const sy = 0.3 + rand() * 0.8;
    const sz = 0.5 + rand() * 1.5;
    mats.push(new Float32Array(makeMatrix(x, bh + sy * 0.5, z, sx, sy, sz).asArray()));
  }
  applyThinInstances(rock, mats);
}

function createBushInstances(
  scene: Scene,
  rand: () => number,
  kingdoms: Array<{ x: number; z: number }>,
  bushMat: StandardMaterial,
) {
  const bush = MeshBuilder.CreateSphere("bush", { diameter: 1.4, segments: 6 }, scene);
  bush.material = bushMat;
  bush.isVisible = false;

  const mats: Float32Array[] = [];
  for (let i = 0; i < 420; i++) {
    const x = (rand() - 0.5) * 470;
    const z = (rand() - 0.5) * 470;
    if (isNearKingdom(x, z, kingdoms) || isNearWater(x, z)) continue;
    const bh = terrainHeight(x, z);
    const s = 0.4 + rand() * 0.8;
    mats.push(new Float32Array(makeMatrix(x, bh + s * 0.5, z, s, s * 0.65, s).asArray()));
  }
  applyThinInstances(bush, mats);
}

function createRuins(
  scene: Scene,
  rand: () => number,
  kingdoms: Array<{ x: number; z: number }>,
  ruinMat: StandardMaterial,
) {
  for (let r = 0; r < 12; r++) {
    const cx = (rand() - 0.5) * 400;
    const cz = (rand() - 0.5) * 400;
    if (isNearKingdom(cx, cz, kingdoms) || isNearWater(cx, cz)) continue;

    const numBlocks = 3 + Math.floor(rand() * 5);
    for (let b = 0; b < numBlocks; b++) {
      const ox = cx + (rand() - 0.5) * 10;
      const oz = cz + (rand() - 0.5) * 10;
      const bh = terrainHeight(ox, oz);
      const w = 0.8 + rand() * 1.5;
      const h = 0.5 + rand() * 2.0;
      const d = 0.8 + rand() * 1.5;

      const block = MeshBuilder.CreateBox(`ruin_${r}_${b}`, { width: w, height: h, depth: d }, scene);
      block.position = new Vector3(ox, bh + h / 2, oz);
      block.rotation.y = rand() * Math.PI * 2;
      block.material = ruinMat;
    }
  }
}
