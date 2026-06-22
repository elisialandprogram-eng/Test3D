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

function isNearKingdom(x: number, z: number, kingdoms: Array<{ x: number; z: number }>): boolean {
  for (const k of kingdoms) {
    const dx = x - k.x;
    const dz = z - k.z;
    if (dx * dx + dz * dz < 14 * 14) return true;
  }
  return false;
}

function isNearWater(x: number, z: number): boolean {
  const patches = [
    { x: -90, z: 55, w: 28, h: 18 },
    { x: 95, z: -65, w: 24, h: 16 },
    { x: -110, z: -75, w: 20, h: 14 },
    { x: 65, z: 110, w: 22, h: 14 },
    { x: -45, z: 125, w: 16, h: 12 },
    { x: 125, z: 45, w: 18, h: 12 },
  ];
  for (const p of patches) {
    if (Math.abs(x - p.x) < p.w / 2 + 6 && Math.abs(z - p.z) < p.h / 2 + 6) return true;
  }
  return false;
}

function makeMatrix(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0): Float32Array {
  return new Float32Array(
    Matrix.Compose(
      new Vector3(sx, sy, sz),
      Quaternion.RotationAxis(Vector3.Up(), ry),
      new Vector3(x, y, z),
    ).asArray(),
  );
}

function applyThinInstances(mesh: Mesh, mats: Float32Array[]) {
  if (mats.length === 0) { mesh.isVisible = false; return; }
  const buf = new Float32Array(mats.length * 16);
  mats.forEach((m, i) => buf.set(m, i * 16));
  mesh.isVisible = true;
  mesh.thinInstanceSetBuffer("matrix", buf, 16);
}

export function createDecorations(scene: Scene, kingdoms: Array<{ x: number; z: number }>) {
  const rand = seededRand(42137);

  // LOK-style: dark green compact cone trees
  const foliageDarkMat = new StandardMaterial("foliageDark", scene);
  foliageDarkMat.diffuseColor = new Color3(0.12, 0.38, 0.10);
  foliageDarkMat.specularColor = new Color3(0.01, 0.02, 0.01);

  const foliageMidMat = new StandardMaterial("foliageMid", scene);
  foliageMidMat.diffuseColor = new Color3(0.18, 0.48, 0.14);
  foliageMidMat.specularColor = new Color3(0.01, 0.02, 0.01);

  const rockMat = new StandardMaterial("rockMat", scene);
  rockMat.diffuseColor = new Color3(0.52, 0.49, 0.44);
  rockMat.specularColor = new Color3(0.04, 0.04, 0.04);

  // Base cone mesh for trees (LOK-style compact)
  const cone = MeshBuilder.CreateCylinder("treeCone", {
    height: 2.2,
    diameterTop: 0,
    diameterBottom: 2.4,
    tessellation: 7,
  }, scene);
  cone.material = foliageDarkMat;
  cone.isVisible = false;

  const coneMid = MeshBuilder.CreateCylinder("treeConeM", {
    height: 1.6,
    diameterTop: 0,
    diameterBottom: 1.8,
    tessellation: 7,
  }, scene);
  coneMid.material = foliageMidMat;
  coneMid.isVisible = false;

  const rock = MeshBuilder.CreateSphere("rock", { diameter: 1, segments: 5 }, scene);
  rock.material = rockMat;
  rock.isVisible = false;

  const coneArr: Float32Array[] = [];
  const coneMArr: Float32Array[] = [];

  // Place tree CLUSTERS like LOK — groups of 2-5 trees close together
  const CLUSTER_COUNT = 180;
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const cx = (rand() - 0.5) * 460;
    const cz = (rand() - 0.5) * 460;
    if (isNearKingdom(cx, cz, kingdoms) || isNearWater(cx, cz)) continue;

    const clusterSize = 2 + Math.floor(rand() * 4);
    for (let t = 0; t < clusterSize; t++) {
      const ox = cx + (rand() - 0.5) * 6;
      const oz = cz + (rand() - 0.5) * 6;
      const s = 0.6 + rand() * 0.55;
      const ry = rand() * Math.PI * 2;

      // Bottom cone
      coneArr.push(makeMatrix(ox, 1.1 * s, oz, s, s, s, ry));
      // Top cone (slightly smaller, shifted up)
      coneMArr.push(makeMatrix(ox, 2.2 * s, oz, s * 0.75, s * 0.75, s * 0.75, ry));
    }
  }

  applyThinInstances(cone, coneArr);
  applyThinInstances(coneMid, coneMArr);

  // Rocks
  const rockArr: Float32Array[] = [];
  for (let i = 0; i < 200; i++) {
    const x = (rand() - 0.5) * 460;
    const z = (rand() - 0.5) * 460;
    if (isNearKingdom(x, z, kingdoms) || isNearWater(x, z)) continue;
    const sx = 0.6 + rand() * 1.8;
    const sy = 0.35 + rand() * 0.65;
    const sz = 0.6 + rand() * 1.8;
    rockArr.push(makeMatrix(x, sy * 0.5, z, sx, sy, sz));
  }
  applyThinInstances(rock, rockArr);

  // Ruined stone blocks
  const ruinMat = new StandardMaterial("ruinMat", scene);
  ruinMat.diffuseColor = new Color3(0.50, 0.46, 0.40);
  ruinMat.specularColor = new Color3(0.04, 0.04, 0.04);

  const ruinBox = MeshBuilder.CreateBox("ruinBox", { width: 1, height: 1, depth: 1 }, scene);
  ruinBox.material = ruinMat;
  ruinBox.isVisible = false;

  const ruinArr: Float32Array[] = [];
  for (let r = 0; r < 10; r++) {
    const cx = (rand() - 0.5) * 400;
    const cz = (rand() - 0.5) * 400;
    if (isNearKingdom(cx, cz, kingdoms) || isNearWater(cx, cz)) continue;
    const blocks = 2 + Math.floor(rand() * 4);
    for (let b = 0; b < blocks; b++) {
      const ox = cx + (rand() - 0.5) * 8;
      const oz = cz + (rand() - 0.5) * 8;
      const w = 0.7 + rand() * 1.2;
      const h = 0.4 + rand() * 1.4;
      const d = 0.7 + rand() * 1.2;
      ruinArr.push(makeMatrix(ox, h / 2, oz, w, h, d, rand() * Math.PI * 2));
    }
  }
  applyThinInstances(ruinBox, ruinArr);
}
