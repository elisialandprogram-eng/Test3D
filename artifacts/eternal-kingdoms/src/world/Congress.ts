import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  GlowLayer,
  PBRMaterial,
  CylinderBuilder,
} from "@babylonjs/core";
import { WORLD_CENTER, coordToWorld } from "../engine/CoordinateEngine";
import { createLabel } from "../engine/AssetManager";

export function createCongress(scene: Scene): Mesh[] {
  const { x, z } = { x: WORLD_CENTER.x, z: WORLD_CENTER.y };
  const meshes: Mesh[] = [];

  const glow = scene.getGlowLayerByName("WorldGlow") as GlowLayer | null;

  const stone = new StandardMaterial("CongressStone", scene);
  stone.diffuseColor = new Color3(0.72, 0.68, 0.58);
  stone.specularColor = new Color3(0.2, 0.18, 0.14);
  stone.ambientColor = new Color3(0.4, 0.35, 0.28);

  const gold = new StandardMaterial("CongressGold", scene);
  gold.diffuseColor = new Color3(0.9, 0.75, 0.1);
  gold.specularColor = new Color3(1, 0.9, 0.3);
  gold.emissiveColor = new Color3(0.3, 0.2, 0.0);

  const crystal = new StandardMaterial("CongressCrystal", scene);
  crystal.diffuseColor = new Color3(0.4, 0.8, 1.0);
  crystal.emissiveColor = new Color3(0.2, 0.5, 0.9);
  crystal.alpha = 0.85;
  crystal.specularColor = new Color3(1, 1, 1);

  // Foundation - 3 tiers
  const tiers = [
    { r: 55, h: 4, y: 2 },
    { r: 42, h: 5, y: 6.5 },
    { r: 30, h: 6, y: 12 },
  ];

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const base = MeshBuilder.CreateCylinder(
      `CongressBase${i}`,
      { diameter: t.r * 2, height: t.h, tessellation: 16 },
      scene
    );
    base.position = new Vector3(x, t.y, z);
    base.material = stone;
    base.receiveShadows = true;
    meshes.push(base);
  }

  // Central keep
  const keep = MeshBuilder.CreateBox(
    "CongressKeep",
    { width: 30, height: 35, depth: 30 },
    scene
  );
  keep.position = new Vector3(x, 32.5, z);
  keep.material = stone;
  keep.receiveShadows = true;
  meshes.push(keep);

  // Central spire
  const spire = MeshBuilder.CreateCylinder(
    "CongressSpire",
    { diameterTop: 0, diameterBottom: 6, height: 40, tessellation: 8 },
    scene
  );
  spire.position = new Vector3(x, 70, z);
  spire.material = gold;
  meshes.push(spire);

  // Crystal orb at top
  const orb = MeshBuilder.CreateSphere("CongressOrb", { diameter: 10, segments: 12 }, scene);
  orb.position = new Vector3(x, 95, z);
  orb.material = crystal;
  if (glow) glow.addIncludedOnlyMesh(orb);
  meshes.push(orb);

  // 8 surrounding pillars
  const PILLAR_COUNT = 8;
  const PILLAR_RADIUS = 50;
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const angle = (i / PILLAR_COUNT) * Math.PI * 2;
    const px = x + Math.cos(angle) * PILLAR_RADIUS;
    const pz = z + Math.sin(angle) * PILLAR_RADIUS;

    const pillar = MeshBuilder.CreateCylinder(
      `Pillar${i}`,
      { diameter: 5, height: 28, tessellation: 8 },
      scene
    );
    pillar.position = new Vector3(px, 14, pz);
    pillar.material = stone;
    pillar.receiveShadows = true;
    meshes.push(pillar);

    const cap = MeshBuilder.CreateCylinder(
      `PillarCap${i}`,
      { diameterTop: 0, diameterBottom: 6, height: 6, tessellation: 8 },
      scene
    );
    cap.position = new Vector3(px, 31, pz);
    cap.material = gold;
    meshes.push(cap);

    const smallOrb = MeshBuilder.CreateSphere(`PillarOrb${i}`, { diameter: 3 }, scene);
    smallOrb.position = new Vector3(px, 35, pz);
    smallOrb.material = crystal;
    if (glow) glow.addIncludedOnlyMesh(smallOrb);
    meshes.push(smallOrb);
  }

  // 4 corner towers
  const TOWER_CORNERS = [
    [-20, -20], [20, -20], [20, 20], [-20, 20],
  ];
  for (const [tx, tz] of TOWER_CORNERS) {
    const tower = MeshBuilder.CreateBox(
      `CongressTower_${tx}_${tz}`,
      { width: 10, height: 28, depth: 10 },
      scene
    );
    tower.position = new Vector3(x + tx, 14, z + tz);
    tower.material = stone;
    tower.receiveShadows = true;
    meshes.push(tower);

    const towerSpire = MeshBuilder.CreateCylinder(
      `TowerSpire_${tx}_${tz}`,
      { diameterTop: 0, diameterBottom: 8, height: 14, tessellation: 6 },
      scene
    );
    towerSpire.position = new Vector3(x + tx, 35, z + tz);
    towerSpire.material = gold;
    meshes.push(towerSpire);
  }

  // Label
  const labelPlane = createLabel(
    "✦ ANCIENT CONGRESS ✦",
    new Vector3(x, 115, z),
    scene,
    52,
    "#e8c547",
    "rgba(0,0,0,0.6)"
  );
  meshes.push(labelPlane);

  // Set metadata
  for (const mesh of meshes) {
    mesh.metadata = {
      ...(mesh.metadata || {}),
      entityType: "congress",
      name: "Ancient Congress",
      coord: { x: WORLD_CENTER.x, y: WORLD_CENTER.y },
    };
  }

  return meshes;
}
