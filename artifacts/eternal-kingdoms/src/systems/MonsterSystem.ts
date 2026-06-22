import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Matrix,
} from "@babylonjs/core";
import { WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";

const MONSTER_COLORS: Color3[] = [
  new Color3(0.25, 0.85, 0.25),   // Lv 1 - bright green
  new Color3(0.5,  0.92, 0.1),    // Lv 2 - yellow-green
  new Color3(0.85, 0.92, 0.08),   // Lv 3 - yellow
  new Color3(0.98, 0.78, 0.05),   // Lv 4 - golden
  new Color3(0.98, 0.52, 0.05),   // Lv 5 - orange
  new Color3(0.92, 0.28, 0.08),   // Lv 6 - red-orange
  new Color3(0.88, 0.1,  0.1),    // Lv 7 - red
  new Color3(0.72, 0.05, 0.45),   // Lv 8 - crimson-purple
  new Color3(0.55, 0.05, 0.78),   // Lv 9 - purple
  new Color3(0.12, 0.05, 0.6),    // Lv 10 - deep indigo (boss)
];

// ~30% of original counts [80,70,65,60,55,50,45,40,35,30]
const MONSTER_COUNTS = [24, 21, 20, 18, 16, 15, 14, 12, 11, 9]; // 160 total

const MIN_DIST_CENTER = 100;

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 211.3 + 137.9) * 98765.4321;
  return x - Math.floor(x);
}

let _monsterMeshes: Mesh[] = [];

export function initMonsterSystem(scene: Scene): Mesh[] {
  _monsterMeshes = [];
  const cx = WORLD_CENTER.x;
  const cy = WORLD_CENTER.y;

  let globalSeed = 5000;

  for (let lvl = 1; lvl <= 10; lvl++) {
    const count = MONSTER_COUNTS[lvl - 1];
    const color = MONSTER_COLORS[lvl - 1];

    // Base size grows with level; bosses (Lv8-10) are noticeably larger
    const baseSize = lvl <= 4 ? 5 + lvl * 0.6
                   : lvl <= 7 ? 7 + lvl * 0.8
                   : 12 + (lvl - 7) * 1.5;

    const mat = new StandardMaterial(`MonMat_Lv${lvl}`, scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.35);
    mat.specularColor = new Color3(0.5, 0.5, 0.5);

    // Visual shape: low levels = box, mid = octahedron-ish cylinder, bosses = sphere
    let template: Mesh;
    if (lvl <= 4) {
      // Small creature: flat diamond box
      template = MeshBuilder.CreateBox(`Monster_Lv${lvl}`, {
        width: baseSize, height: baseSize * 1.1, depth: baseSize,
      }, scene);
    } else if (lvl <= 7) {
      // Mid creature: faceted cylinder (elite)
      template = MeshBuilder.CreateCylinder(`Monster_Lv${lvl}`, {
        diameterTop: baseSize * 0.7, diameterBottom: baseSize * 0.85,
        height: baseSize * 1.25, tessellation: 6,
      }, scene);
    } else {
      // Boss: imposing sphere + aura ring
      template = MeshBuilder.CreateSphere(`Monster_Lv${lvl}`, {
        diameter: baseSize, segments: 8,
      }, scene);
    }

    template.material = mat;
    template.isPickable = true;
    template.metadata = { entityType: "monster", level: lvl };

    const matrices: Matrix[] = [];

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = 80 + pseudoRand(globalSeed++) * (WORLD_SIZE - 160);
        y = 80 + pseudoRand(globalSeed++) * (WORLD_SIZE - 160);
        attempts++;
      } while (
        attempts < 15 &&
        Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < MIN_DIST_CENTER
      );

      const halfH = (lvl <= 4 ? baseSize * 1.1 : lvl <= 7 ? baseSize * 1.25 : baseSize) / 2;
      const rot = pseudoRand(globalSeed++) * Math.PI * 2;
      const rotM = Matrix.RotationY(rot);
      const transM = Matrix.Translation(x, halfH, y);
      matrices.push(rotM.multiply(transM));
    }

    const buffers = new Float32Array(matrices.length * 16);
    for (let i = 0; i < matrices.length; i++) {
      matrices[i].copyToArray(buffers, i * 16);
    }
    template.thinInstanceSetBuffer("matrix", buffers, 16);
    template.thinInstanceCount = matrices.length;

    _monsterMeshes.push(template);
  }

  return _monsterMeshes;
}

export function getMonsterMeshes(): Mesh[] {
  return _monsterMeshes;
}
