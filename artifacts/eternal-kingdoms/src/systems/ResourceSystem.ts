import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Matrix,
} from "@babylonjs/core";
import { WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";

export type ResourceType = "Wood" | "Stone" | "Food" | "Gold";

interface ResourceConfig {
  type: ResourceType;
  count: number;
  color: Color3;
  emissive: Color3;
  shape: "tree" | "boulder" | "wheat" | "nugget";
}

// 70% reduction from original (1500/1200/1000/800 → 450/360/300/240)
const RESOURCE_CONFIGS: ResourceConfig[] = [
  { type: "Wood",  count: 450, color: new Color3(0.18, 0.52, 0.12), emissive: new Color3(0.02, 0.08, 0.01), shape: "tree"   },
  { type: "Stone", count: 360, color: new Color3(0.58, 0.55, 0.50), emissive: new Color3(0.03, 0.03, 0.03), shape: "boulder" },
  { type: "Food",  count: 300, color: new Color3(0.88, 0.72, 0.10), emissive: new Color3(0.06, 0.04, 0.00), shape: "wheat"   },
  { type: "Gold",  count: 240, color: new Color3(0.98, 0.82, 0.05), emissive: new Color3(0.22, 0.14, 0.00), shape: "nugget"  },
];

const MIN_DIST_FROM_CENTER = 100;
const MIN_DIST_FROM_EDGE   = 50;

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * All helper builders use a single material so MergeMeshes
 * produces a mono-material mesh suitable for thin instances.
 */
function buildTree(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  const trunk = MeshBuilder.CreateCylinder(`${name}_a`, {
    diameterTop: 1.8, diameterBottom: 2.8, height: 5, tessellation: 6,
  }, scene);
  trunk.material = mat;

  const lower = MeshBuilder.CreateCylinder(`${name}_b`, {
    diameterTop: 0, diameterBottom: 14, height: 10, tessellation: 7,
  }, scene);
  lower.position.y = 8;
  lower.material = mat;

  const upper = MeshBuilder.CreateCylinder(`${name}_c`, {
    diameterTop: 0, diameterBottom: 9, height: 8, tessellation: 7,
  }, scene);
  upper.position.y = 15;
  upper.material = mat;

  const tip = MeshBuilder.CreateCylinder(`${name}_d`, {
    diameterTop: 0, diameterBottom: 5, height: 6, tessellation: 7,
  }, scene);
  tip.position.y = 21;
  tip.material = mat;

  // Bake positions into vertices before merge
  lower.bakeCurrentTransformIntoVertices();
  upper.bakeCurrentTransformIntoVertices();
  tip.bakeCurrentTransformIntoVertices();

  const merged = Mesh.MergeMeshes([trunk, lower, upper, tip], true, true, undefined, false, false);
  if (!merged) {
    const fallback = MeshBuilder.CreateCylinder(name, {
      diameterTop: 0, diameterBottom: 12, height: 18, tessellation: 7,
    }, scene);
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

function buildBoulder(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  const main = MeshBuilder.CreateSphere(`${name}_a`, { diameter: 8, segments: 5 }, scene);
  main.scaling.set(1, 0.6, 1);
  main.bakeCurrentTransformIntoVertices();
  main.material = mat;

  const r = MeshBuilder.CreateSphere(`${name}_b`, { diameter: 5, segments: 4 }, scene);
  r.position.set(5, 0, 1);
  r.scaling.y = 0.55;
  r.bakeCurrentTransformIntoVertices();
  r.material = mat;

  const l = MeshBuilder.CreateSphere(`${name}_c`, { diameter: 4.5, segments: 4 }, scene);
  l.position.set(-3.5, 0, 3);
  l.scaling.y = 0.5;
  l.bakeCurrentTransformIntoVertices();
  l.material = mat;

  const merged = Mesh.MergeMeshes([main, r, l], true, true, undefined, false, false);
  if (!merged) {
    const fallback = MeshBuilder.CreateSphere(name, { diameter: 8, segments: 5 }, scene);
    fallback.scaling.y = 0.55;
    fallback.bakeCurrentTransformIntoVertices();
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

function buildWheat(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  const base = MeshBuilder.CreateCylinder(`${name}_a`, {
    diameterTop: 6, diameterBottom: 8, height: 6, tessellation: 8,
  }, scene);
  base.material = mat;

  const crown = MeshBuilder.CreateSphere(`${name}_b`, { diameter: 7, segments: 6 }, scene);
  crown.position.y = 5;
  crown.scaling.set(1, 0.55, 1);
  crown.bakeCurrentTransformIntoVertices();
  crown.material = mat;

  const merged = Mesh.MergeMeshes([base, crown], true, true, undefined, false, false);
  if (!merged) {
    const fallback = MeshBuilder.CreateCylinder(name, { diameter: 7, height: 7, tessellation: 8 }, scene);
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

function buildNugget(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  const bot = MeshBuilder.CreateCylinder(`${name}_a`, {
    diameterTop: 6, diameterBottom: 0, height: 5, tessellation: 6,
  }, scene);
  bot.material = mat;

  const top = MeshBuilder.CreateCylinder(`${name}_b`, {
    diameterTop: 0, diameterBottom: 6, height: 4, tessellation: 6,
  }, scene);
  top.position.y = 4.5;
  top.bakeCurrentTransformIntoVertices();
  top.material = mat;

  const merged = Mesh.MergeMeshes([bot, top], true, true, undefined, false, false);
  if (!merged) {
    const fallback = MeshBuilder.CreateBox(name, { width: 4, height: 6, depth: 4 }, scene);
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

let _resourceMeshes: Mesh[] = [];

export function initResourceSystem(scene: Scene): Mesh[] {
  _resourceMeshes = [];

  const cx = WORLD_CENTER.x;
  const cy = WORLD_CENTER.y;
  let globalSeed = 100;

  for (const cfg of RESOURCE_CONFIGS) {
    const mat = new StandardMaterial(`ResMat_${cfg.type}`, scene);
    mat.diffuseColor = cfg.color;
    mat.emissiveColor = cfg.emissive;
    mat.specularColor = new Color3(0.08, 0.08, 0.08);

    let template: Mesh;
    switch (cfg.shape) {
      case "tree":    template = buildTree(   `Res_${cfg.type}`, mat, scene); break;
      case "boulder": template = buildBoulder(`Res_${cfg.type}`, mat, scene); break;
      case "wheat":   template = buildWheat(  `Res_${cfg.type}`, mat, scene); break;
      default:        template = buildNugget( `Res_${cfg.type}`, mat, scene); break;
    }

    template.isPickable = true;
    template.metadata = { entityType: "resource", resourceType: cfg.type };

    const matrices: Matrix[] = [];

    for (let i = 0; i < cfg.count; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = MIN_DIST_FROM_EDGE + pseudoRand(globalSeed++) * (WORLD_SIZE - MIN_DIST_FROM_EDGE * 2);
        y = MIN_DIST_FROM_EDGE + pseudoRand(globalSeed++) * (WORLD_SIZE - MIN_DIST_FROM_EDGE * 2);
        attempts++;
      } while (
        attempts < 10 &&
        Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < MIN_DIST_FROM_CENTER
      );

      const rot   = pseudoRand(globalSeed++) * Math.PI * 2;
      const scale = 0.85 + pseudoRand(globalSeed++) * 0.35;
      const scaleM = Matrix.Scaling(scale, scale, scale);
      const rotM   = Matrix.RotationY(rot);
      const transM = Matrix.Translation(x, 0, y);
      matrices.push(scaleM.multiply(rotM).multiply(transM));
    }

    const buffers = new Float32Array(matrices.length * 16);
    for (let i = 0; i < matrices.length; i++) {
      matrices[i].copyToArray(buffers, i * 16);
    }
    template.thinInstanceSetBuffer("matrix", buffers, 16);
    template.thinInstanceCount = matrices.length;

    _resourceMeshes.push(template);
  }

  return _resourceMeshes;
}

export function getResourceMeshes(): Mesh[] {
  return _resourceMeshes;
}
