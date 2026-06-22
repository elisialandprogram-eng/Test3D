import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  GlowLayer,
} from "@babylonjs/core";
import { coordToWorld, WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";
import { createLabel } from "../engine/AssetManager";

export type ShrineTier = "A" | "B" | "C";

export interface ShrineData {
  id: number;
  tier: ShrineTier;
  coord: { x: number; y: number };
  meshes: Mesh[];
  label: Mesh;
}

const SHRINE_POSITIONS: Array<{ x: number; y: number; tier: ShrineTier }> = [
  // Tier A - 3 major shrines
  { x: 768, y: 768, tier: "A" },
  { x: 2304, y: 768, tier: "A" },
  { x: 1536, y: 2560, tier: "A" },
  // Tier B - 6 shrines
  { x: 400, y: 1536, tier: "B" },
  { x: 2672, y: 1536, tier: "B" },
  { x: 1100, y: 400, tier: "B" },
  { x: 1972, y: 400, tier: "B" },
  { x: 900, y: 2400, tier: "B" },
  { x: 2100, y: 2400, tier: "B" },
  // Tier C - 12 shrines scattered
  { x: 300, y: 300, tier: "C" },
  { x: 900, y: 150, tier: "C" },
  { x: 1536, y: 200, tier: "C" },
  { x: 2200, y: 150, tier: "C" },
  { x: 2800, y: 300, tier: "C" },
  { x: 2900, y: 1100, tier: "C" },
  { x: 2900, y: 2000, tier: "C" },
  { x: 2700, y: 2800, tier: "C" },
  { x: 1536, y: 2900, tier: "C" },
  { x: 350, y: 2800, tier: "C" },
  { x: 150, y: 2000, tier: "C" },
  { x: 150, y: 1000, tier: "C" },
];

function buildShrineA(x: number, y: number, scene: Scene, glow: GlowLayer | null): Mesh[] {
  const pos = coordToWorld(x, y, 0);
  const meshes: Mesh[] = [];

  const stoneMat = new StandardMaterial("ShA_stone", scene);
  stoneMat.diffuseColor = new Color3(0.5, 0.45, 0.55);

  const glowMat = new StandardMaterial("ShA_glow", scene);
  glowMat.diffuseColor = new Color3(0.9, 0.4, 1.0);
  glowMat.emissiveColor = new Color3(0.6, 0.1, 0.9);

  // Base tiers
  for (let i = 0; i < 3; i++) {
    const r = 18 - i * 4;
    const tier = MeshBuilder.CreateCylinder(`ShA_base${i}_${x}`, {
      diameter: r * 2, height: 4, tessellation: 12,
    }, scene);
    tier.position = new Vector3(pos.x, i * 4 + 2, pos.z);
    tier.material = stoneMat;
    tier.receiveShadows = true;
    meshes.push(tier);
  }

  // Tall obelisk
  const obelisk = MeshBuilder.CreateBox(`ShA_obelisk_${x}`, { width: 6, height: 45, depth: 6 }, scene);
  obelisk.position = new Vector3(pos.x, 12 + 22.5, pos.z);
  obelisk.material = stoneMat;
  meshes.push(obelisk);

  // Crystal apex
  const apex = MeshBuilder.CreateCylinder(`ShA_apex_${x}`, {
    diameterTop: 0, diameterBottom: 8, height: 12, tessellation: 6,
  }, scene);
  apex.position = new Vector3(pos.x, 12 + 45 + 6, pos.z);
  apex.material = glowMat;
  if (glow) glow.addIncludedOnlyMesh(apex);
  meshes.push(apex);

  // Ring of pillars
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const px = pos.x + Math.cos(ang) * 16;
    const pz = pos.z + Math.sin(ang) * 16;
    const pillar = MeshBuilder.CreateCylinder(`ShA_pillar${i}_${x}`, {
      diameter: 3, height: 22, tessellation: 6,
    }, scene);
    pillar.position = new Vector3(px, 11, pz);
    pillar.material = stoneMat;
    meshes.push(pillar);
  }

  for (const m of meshes) {
    m.metadata = { entityType: "shrine", tier: "A", coord: { x, y } };
  }
  return meshes;
}

function buildShrineB(x: number, y: number, scene: Scene, glow: GlowLayer | null): Mesh[] {
  const pos = coordToWorld(x, y, 0);
  const meshes: Mesh[] = [];

  const stoneMat = new StandardMaterial("ShB_stone", scene);
  stoneMat.diffuseColor = new Color3(0.45, 0.55, 0.5);

  const glowMat = new StandardMaterial("ShB_glow", scene);
  glowMat.diffuseColor = new Color3(0.2, 0.8, 1.0);
  glowMat.emissiveColor = new Color3(0.0, 0.5, 0.8);

  const base = MeshBuilder.CreateCylinder(`ShB_base_${x}`, { diameter: 20, height: 3, tessellation: 10 }, scene);
  base.position = new Vector3(pos.x, 1.5, pos.z);
  base.material = stoneMat;
  base.receiveShadows = true;
  meshes.push(base);

  const body = MeshBuilder.CreateCylinder(`ShB_body_${x}`, {
    diameter: 10, height: 22, tessellation: 8,
  }, scene);
  body.position = new Vector3(pos.x, 3 + 11, pos.z);
  body.material = stoneMat;
  meshes.push(body);

  const crystal = MeshBuilder.CreateSphere(`ShB_crystal_${x}`, { diameter: 10, segments: 8 }, scene);
  crystal.position = new Vector3(pos.x, 3 + 22 + 5, pos.z);
  crystal.material = glowMat;
  if (glow) glow.addIncludedOnlyMesh(crystal);
  meshes.push(crystal);

  for (const m of meshes) {
    m.metadata = { entityType: "shrine", tier: "B", coord: { x, y } };
  }
  return meshes;
}

function buildShrineC(x: number, y: number, scene: Scene, glow: GlowLayer | null): Mesh[] {
  const pos = coordToWorld(x, y, 0);
  const meshes: Mesh[] = [];

  const stoneMat = new StandardMaterial("ShC_stone", scene);
  stoneMat.diffuseColor = new Color3(0.5, 0.5, 0.45);

  const glowMat = new StandardMaterial("ShC_glow", scene);
  glowMat.diffuseColor = new Color3(1.0, 0.8, 0.1);
  glowMat.emissiveColor = new Color3(0.7, 0.4, 0.0);

  const base = MeshBuilder.CreateBox(`ShC_base_${x}`, { width: 10, height: 2, depth: 10 }, scene);
  base.position = new Vector3(pos.x, 1, pos.z);
  base.material = stoneMat;
  base.receiveShadows = true;
  meshes.push(base);

  const obelisk = MeshBuilder.CreateCylinder(`ShC_ob_${x}`, {
    diameterTop: 0.5, diameterBottom: 4, height: 14, tessellation: 6,
  }, scene);
  obelisk.position = new Vector3(pos.x, 2 + 7, pos.z);
  obelisk.material = stoneMat;
  meshes.push(obelisk);

  const gem = MeshBuilder.CreateSphere(`ShC_gem_${x}`, { diameter: 4, segments: 6 }, scene);
  gem.position = new Vector3(pos.x, 2 + 14 + 2, pos.z);
  gem.material = glowMat;
  if (glow) glow.addIncludedOnlyMesh(gem);
  meshes.push(gem);

  for (const m of meshes) {
    m.metadata = { entityType: "shrine", tier: "C", coord: { x, y } };
  }
  return meshes;
}

let _shrines: ShrineData[] = [];

export function initShrineSystem(scene: Scene): ShrineData[] {
  _shrines = [];
  const glow = scene.getGlowLayerByName("WorldGlow") as GlowLayer | null;

  const TIER_LABELS: Record<ShrineTier, string> = {
    A: "✦ Shrine of Eternity",
    B: "◈ Shrine of Power",
    C: "◇ Shrine",
  };
  const LABEL_HEIGHTS: Record<ShrineTier, number> = { A: 80, B: 45, C: 28 };
  const LABEL_COLORS: Record<ShrineTier, string> = {
    A: "#cc66ff",
    B: "#44aaff",
    C: "#ffcc44",
  };

  SHRINE_POSITIONS.forEach(({ x, y, tier }, i) => {
    const builders = { A: buildShrineA, B: buildShrineB, C: buildShrineC };
    const meshes = builders[tier](x, y, scene, glow);

    const wPos = coordToWorld(x, y, 0);
    const label = createLabel(
      TIER_LABELS[tier],
      new Vector3(wPos.x, LABEL_HEIGHTS[tier], wPos.z),
      scene,
      32,
      LABEL_COLORS[tier],
      "rgba(0,0,0,0.5)"
    );
    label.isPickable = false;

    _shrines.push({ id: i + 1, tier, coord: { x, y }, meshes, label });
  });

  return _shrines;
}

export function getShrines(): ShrineData[] {
  return _shrines;
}
