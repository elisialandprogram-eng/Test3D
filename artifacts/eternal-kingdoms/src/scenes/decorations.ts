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
    const dx = x - k.x, dz = z - k.z;
    if (dx * dx + dz * dz < 13 * 13) return true;
  }
  return false;
}

function isNearWater(x: number, z: number): boolean {
  const patches = [
    { x: -88, z:  52, w: 30, h: 20 },
    { x:  92, z: -68, w: 26, h: 18 },
    { x:-108, z: -72, w: 22, h: 16 },
    { x:  62, z: 112, w: 24, h: 16 },
    { x: -42, z: 128, w: 18, h: 14 },
    { x: 128, z:  42, w: 20, h: 14 },
  ];
  for (const p of patches) {
    if (Math.abs(x - p.x) < p.w / 2 + 5 && Math.abs(z - p.z) < p.h / 2 + 5) return true;
  }
  return false;
}

function mat4(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0): Float32Array {
  return new Float32Array(
    Matrix.Compose(
      new Vector3(sx, sy, sz),
      Quaternion.RotationAxis(Vector3.Up(), ry),
      new Vector3(x, y, z),
    ).asArray(),
  );
}

function applyThin(mesh: Mesh, mats: Float32Array[]) {
  if (!mats.length) { mesh.isVisible = false; return; }
  const buf = new Float32Array(mats.length * 16);
  mats.forEach((m, i) => buf.set(m, i * 16));
  mesh.isVisible = true;
  mesh.thinInstanceSetBuffer("matrix", buf, 16);
}

export function createDecorations(scene: Scene, kingdoms: Array<{ x: number; z: number }>) {
  const rand = seededRand(42137);

  // ── LOK tree look: dark green, wide flat cone viewed from above ──────────────
  // Bottom tier — very wide, very short cone (looks like a round blob from top)
  const treeMat = new StandardMaterial("treeMat", scene);
  treeMat.diffuseColor = new Color3(0.13, 0.38, 0.08);
  treeMat.specularColor = Color3.Black();
  treeMat.ambientColor = new Color3(0.3, 0.5, 0.2);

  const treeMat2 = new StandardMaterial("treeMat2", scene);
  treeMat2.diffuseColor = new Color3(0.18, 0.46, 0.10);
  treeMat2.specularColor = Color3.Black();
  treeMat2.ambientColor = new Color3(0.3, 0.5, 0.2);

  // LOK trees look like round dark-green blobs from above
  // Use very wide, short cones (wide = high width-to-height ratio)
  const cone1 = MeshBuilder.CreateCylinder("treeCone1", {
    height: 1.6, diameterTop: 0, diameterBottom: 3.8, tessellation: 9,
  }, scene);
  cone1.material = treeMat;
  cone1.isVisible = false;

  const cone2 = MeshBuilder.CreateCylinder("treeCone2", {
    height: 1.2, diameterTop: 0, diameterBottom: 2.8, tessellation: 9,
  }, scene);
  cone2.material = treeMat2;
  cone2.isVisible = false;

  const rockMat = new StandardMaterial("rockMat", scene);
  rockMat.diffuseColor = new Color3(0.50, 0.46, 0.40);
  rockMat.specularColor = new Color3(0.04, 0.04, 0.04);
  rockMat.ambientColor = new Color3(0.4, 0.4, 0.4);

  const rock = MeshBuilder.CreateSphere("rock", { diameter: 1, segments: 5 }, scene);
  rock.material = rockMat;
  rock.isVisible = false;

  const c1: Float32Array[] = [];
  const c2: Float32Array[] = [];

  // Place dense clusters (LOK has many dense tree groups)
  for (let cluster = 0; cluster < 220; cluster++) {
    const cx = (rand() - 0.5) * 460;
    const cz = (rand() - 0.5) * 460;
    if (isNearKingdom(cx, cz, kingdoms) || isNearWater(cx, cz)) continue;

    const count = 2 + Math.floor(rand() * 5);
    for (let t = 0; t < count; t++) {
      const ox = cx + (rand() - 0.5) * 7;
      const oz = cz + (rand() - 0.5) * 7;
      const s = 0.55 + rand() * 0.65;
      const ry = rand() * Math.PI * 2;
      c1.push(mat4(ox, 0.8 * s, oz, s, s, s, ry));
      c2.push(mat4(ox, 1.6 * s, oz, s * 0.72, s * 0.72, s * 0.72, ry + 0.5));
    }
  }

  applyThin(cone1, c1);
  applyThin(cone2, c2);

  // Rocks — small flat clusters (visible from top as grey blobs)
  const rr: Float32Array[] = [];
  for (let i = 0; i < 250; i++) {
    const x = (rand() - 0.5) * 460;
    const z = (rand() - 0.5) * 460;
    if (isNearKingdom(x, z, kingdoms) || isNearWater(x, z)) continue;
    const sx = 0.7 + rand() * 1.8;
    const sy = 0.25 + rand() * 0.55;
    const sz = 0.7 + rand() * 1.8;
    rr.push(mat4(x, sy * 0.5, z, sx, sy, sz));
  }
  applyThin(rock, rr);

  // ── Ruins / ancient stone blocks ─────────────────────────────────────────────
  const ruinMat = new StandardMaterial("ruinMat", scene);
  ruinMat.diffuseColor = new Color3(0.52, 0.48, 0.42);
  ruinMat.specularColor = Color3.Black();
  ruinMat.ambientColor = new Color3(0.5, 0.5, 0.5);

  const ruinBox = MeshBuilder.CreateBox("ruinBox", { size: 1 }, scene);
  ruinBox.material = ruinMat;
  ruinBox.isVisible = false;

  const rb: Float32Array[] = [];
  for (let r = 0; r < 14; r++) {
    const cx = (rand() - 0.5) * 400;
    const cz = (rand() - 0.5) * 400;
    if (isNearKingdom(cx, cz, kingdoms) || isNearWater(cx, cz)) continue;
    const n = 3 + Math.floor(rand() * 4);
    for (let b = 0; b < n; b++) {
      const ox = cx + (rand() - 0.5) * 9;
      const oz = cz + (rand() - 0.5) * 9;
      const w = 0.8 + rand() * 1.2;
      const h = 0.3 + rand() * 1.2;
      const dep = 0.8 + rand() * 1.2;
      rb.push(mat4(ox, h * 0.5, oz, w, h, dep, rand() * Math.PI));
    }
  }
  applyThin(ruinBox, rb);
}
