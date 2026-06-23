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
  shape: "tree" | "boulder" | "wheat" | "crystal";
}

const RESOURCE_CONFIGS: ResourceConfig[] = [
  { type: "Wood",  count: 420, color: new Color3(0.15, 0.45, 0.10), emissive: new Color3(0.01, 0.05, 0.00), shape: "tree"    },
  { type: "Stone", count: 320, color: new Color3(0.60, 0.57, 0.52), emissive: new Color3(0.02, 0.02, 0.02), shape: "boulder" },
  { type: "Food",  count: 270, color: new Color3(0.90, 0.75, 0.12), emissive: new Color3(0.06, 0.04, 0.00), shape: "wheat"   },
  { type: "Gold",  count: 210, color: new Color3(1.00, 0.82, 0.05), emissive: new Color3(0.28, 0.16, 0.00), shape: "crystal" },
];

const MIN_DIST_FROM_CENTER = 100;
const MIN_DIST_FROM_EDGE   = 50;

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Leafy deciduous tree — round sphere canopy, NOT stacked cones.
 * Looks like League of Kingdoms tree nodes from above.
 */
function buildTree(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  // Brown trunk material
  const trunkMat = new StandardMaterial(`${name}_trunkMat`, scene);
  trunkMat.diffuseColor = new Color3(0.38, 0.24, 0.12);
  trunkMat.specularColor = new Color3(0.05, 0.03, 0.02);

  // Trunk — narrow cylinder
  const trunk = MeshBuilder.CreateCylinder(`${name}_trunk`, {
    diameterTop: 1.8, diameterBottom: 2.8, height: 7, tessellation: 7,
  }, scene);
  trunk.position.y = 0;
  trunk.material = trunkMat;
  trunk.bakeCurrentTransformIntoVertices();

  // Main canopy — large sphere, flattened slightly
  const canopy = MeshBuilder.CreateSphere(`${name}_canopy`, {
    diameter: 18, segments: 8,
  }, scene);
  canopy.scaling.set(1, 0.72, 1);
  canopy.position.y = 11;
  canopy.material = mat;
  canopy.bakeCurrentTransformIntoVertices();

  // Secondary canopy blob — overlapping for fullness
  const canopy2 = MeshBuilder.CreateSphere(`${name}_canopy2`, {
    diameter: 13, segments: 7,
  }, scene);
  canopy2.scaling.set(0.9, 0.65, 0.9);
  canopy2.position.set(3, 13, 2);
  canopy2.material = mat;
  canopy2.bakeCurrentTransformIntoVertices();

  // Third small blob for silhouette variety
  const canopy3 = MeshBuilder.CreateSphere(`${name}_canopy3`, {
    diameter: 10, segments: 6,
  }, scene);
  canopy3.scaling.set(0.85, 0.60, 0.85);
  canopy3.position.set(-3.5, 12, -2);
  canopy3.material = mat;
  canopy3.bakeCurrentTransformIntoVertices();

  const merged = Mesh.MergeMeshes(
    [trunk, canopy, canopy2, canopy3], true, true, undefined, false, false
  );
  if (!merged) {
    const fallback = MeshBuilder.CreateSphere(name, { diameter: 16, segments: 7 }, scene);
    fallback.position.y = 8;
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

/**
 * Stone boulder cluster — natural rocky outcropping.
 */
function buildBoulder(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  const main = MeshBuilder.CreateSphere(`${name}_a`, { diameter: 10, segments: 5 }, scene);
  main.scaling.set(1, 0.58, 1.1);
  main.bakeCurrentTransformIntoVertices();
  main.material = mat;

  const r = MeshBuilder.CreateSphere(`${name}_b`, { diameter: 7, segments: 4 }, scene);
  r.position.set(5.5, -0.5, 0.5);
  r.scaling.set(1, 0.52, 0.9);
  r.bakeCurrentTransformIntoVertices();
  r.material = mat;

  const l = MeshBuilder.CreateSphere(`${name}_c`, { diameter: 5.5, segments: 4 }, scene);
  l.position.set(-4, -0.5, 3);
  l.scaling.set(0.9, 0.48, 1);
  l.bakeCurrentTransformIntoVertices();
  l.material = mat;

  const back = MeshBuilder.CreateSphere(`${name}_d`, { diameter: 6, segments: 4 }, scene);
  back.position.set(1, 1.5, -4.5);
  back.scaling.set(1, 0.55, 0.85);
  back.bakeCurrentTransformIntoVertices();
  back.material = mat;

  const merged = Mesh.MergeMeshes(
    [main, r, l, back], true, true, undefined, false, false
  );
  if (!merged) {
    const fallback = MeshBuilder.CreateSphere(name, { diameter: 10, segments: 5 }, scene);
    fallback.scaling.y = 0.55;
    fallback.bakeCurrentTransformIntoVertices();
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

/**
 * Wheat / grain field — wide flat cylinders layered to look like a crop bundle.
 */
function buildWheat(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  // Thick flat base
  const base = MeshBuilder.CreateCylinder(`${name}_base`, {
    diameterTop: 10, diameterBottom: 12, height: 3, tessellation: 10,
  }, scene);
  base.material = mat;

  // Bundle stalks (slightly tapered cylinders)
  const mid = MeshBuilder.CreateCylinder(`${name}_mid`, {
    diameterTop: 7, diameterBottom: 9, height: 5, tessellation: 8,
  }, scene);
  mid.position.y = 4;
  mid.bakeCurrentTransformIntoVertices();
  mid.material = mat;

  // Top grain head — flattened large sphere
  const head = MeshBuilder.CreateSphere(`${name}_head`, { diameter: 11, segments: 7 }, scene);
  head.position.y = 9.5;
  head.scaling.set(1, 0.48, 1);
  head.bakeCurrentTransformIntoVertices();
  head.material = mat;

  // Side ear cluster
  const ear = MeshBuilder.CreateSphere(`${name}_ear`, { diameter: 6, segments: 5 }, scene);
  ear.position.set(4, 8, 2);
  ear.scaling.set(0.6, 0.55, 0.6);
  ear.bakeCurrentTransformIntoVertices();
  ear.material = mat;

  const merged = Mesh.MergeMeshes(
    [base, mid, head, ear], true, true, undefined, false, false
  );
  if (!merged) {
    const fallback = MeshBuilder.CreateCylinder(name, { diameter: 10, height: 9, tessellation: 9 }, scene);
    fallback.material = mat;
    return fallback;
  }
  merged.name = name;
  merged.material = mat;
  return merged;
}

/**
 * Gold crystal deposit — faceted gem-like hexagonal crystals.
 */
function buildCrystal(name: string, mat: StandardMaterial, scene: Scene): Mesh {
  // Main large crystal
  const main = MeshBuilder.CreateCylinder(`${name}_a`, {
    diameterTop: 0, diameterBottom: 6.5, height: 11, tessellation: 6,
  }, scene);
  main.position.y = 0;
  main.material = mat;

  // Second crystal, offset and tilted
  const c2 = MeshBuilder.CreateCylinder(`${name}_b`, {
    diameterTop: 0, diameterBottom: 4.5, height: 8, tessellation: 6,
  }, scene);
  c2.position.set(4, -1, 2);
  c2.rotation.z = 0.25;
  c2.bakeCurrentTransformIntoVertices();
  c2.material = mat;

  // Third small crystal
  const c3 = MeshBuilder.CreateCylinder(`${name}_c`, {
    diameterTop: 0, diameterBottom: 3.5, height: 6, tessellation: 6,
  }, scene);
  c3.position.set(-3, -1.5, 3);
  c3.rotation.z = -0.2;
  c3.bakeCurrentTransformIntoVertices();
  c3.material = mat;

  // Base nugget
  const base = MeshBuilder.CreateCylinder(`${name}_base`, {
    diameter: 8, height: 2.5, tessellation: 6,
  }, scene);
  base.position.y = -3;
  base.bakeCurrentTransformIntoVertices();
  base.material = mat;

  const merged = Mesh.MergeMeshes(
    [main, c2, c3, base], true, true, undefined, false, false
  );
  if (!merged) {
    const fallback = MeshBuilder.CreateCylinder(name, {
      diameterTop: 0, diameterBottom: 6, height: 10, tessellation: 6,
    }, scene);
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
    mat.specularColor = new Color3(0.08, 0.08, 0.06);

    let template: Mesh;
    switch (cfg.shape) {
      case "tree":    template = buildTree(   `Res_${cfg.type}`, mat, scene); break;
      case "boulder": template = buildBoulder(`Res_${cfg.type}`, mat, scene); break;
      case "wheat":   template = buildWheat(  `Res_${cfg.type}`, mat, scene); break;
      default:        template = buildCrystal(`Res_${cfg.type}`, mat, scene); break;
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
      const scale = 0.78 + pseudoRand(globalSeed++) * 0.44;
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
