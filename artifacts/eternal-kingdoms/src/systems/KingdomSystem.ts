import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";
import { coordToWorld, WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";
import { createLabel } from "../engine/AssetManager";

export interface KingdomData {
  id: number;
  name: string;
  coord: { x: number; y: number };
  level: number;
  meshes: Mesh[];
  label: Mesh;
  rootMesh: Mesh;
}

const KINGDOM_NAMES = [
  "Stormcrest","Ironveil","Jadespire","Ashfall","Goldmere",
  "Duskholm","Thornwall","Silvergate","Emberhaven","Coldmoor",
  "Ravenskeep","Bleakwatch","Sunforge","Moonstone","Blackfen",
  "Starfall","Dusthold","Grimspire","Nightvale","Dawnmere",
  "Copperfield","Steelwall","Shadowfen","Brightmoor","Ironpeak",
  "Frostgate","Cindervast","Swifthollow","Greymantle","Wildmark",
  "Oakhaven","Strongbow","Dreadmoor","Seawatch","Thornmere",
  "Wolfspire","Firekeep","Icehollow","Stonegate","Skywatch",
  "Bloodmere","Swampveil","Goldspire","Ironhollow","Darkwall",
  "Sunvale","Moonfen","Starkeep","Dustspire","Grimwall",
  "Brightgate","Ashhollow","Coldspire","Nightwatch","Dawnveil",
  "Embermere","Ravenwall","Jadefen","Coppergate","Steelpeak",
  "Silverhollow","Blackspire","Whitegate","Redmere","Bluefen",
  "Greenwall","Yellowpeak","Purplegate","Orangemere","Violetfen",
  "Crimsonwall","Azurespire","Scarletgate","Cobaltmere","Magenfen",
  "Tealwall","Navypeak","Slategate","Rosefen","Ivorywall",
  "Ebonspire","Ambergate","Jadehollow","Sapphiremere","Quartzfen",
  "Onyxwall","Opalspire","Pearlgate","Rubyfen","Emeraldwall",
  "Topazpeak","Amethystgate","Garnetmere","Citrinfen","Peridotwall",
  "Tanzanitespire","Aquamargate","Coralmere","Obsidianfen","Malachitewall",
];

const BANNER_COLORS: Color3[] = [
  new Color3(0.8, 0.1, 0.1),
  new Color3(0.1, 0.3, 0.85),
  new Color3(0.15, 0.65, 0.15),
  new Color3(0.75, 0.55, 0.1),
  new Color3(0.6, 0.1, 0.7),
  new Color3(0.1, 0.6, 0.7),
  new Color3(0.85, 0.35, 0.1),
  new Color3(0.3, 0.1, 0.55),
];

let _kingdoms: KingdomData[] = [];

/**
 * Scale factor per level: Lv1=1.0, Lv5=1.5, Lv10=2.2
 * 5× overall base size vs old system (platform: 18→90)
 */
function getLevelScale(level: number): number {
  return 1.0 + (level - 1) * 0.13;
}

function makeKingdomMeshes(
  name: string,
  x: number,
  y: number,
  level: number,
  colorIndex: number,
  scene: Scene
): { meshes: Mesh[]; rootMesh: Mesh } {
  const pos = coordToWorld(x, y, 0);
  const meshes: Mesh[] = [];
  const s = getLevelScale(level);

  const wallMat = new StandardMaterial(`KMat_wall_${name}`, scene);
  wallMat.diffuseColor = new Color3(0.65 + level * 0.008, 0.58, 0.47);
  wallMat.specularColor = new Color3(0.2, 0.16, 0.12);
  wallMat.ambientColor = new Color3(0.4, 0.35, 0.28);

  const roofMat = new StandardMaterial(`KMat_roof_${name}`, scene);
  roofMat.diffuseColor = BANNER_COLORS[colorIndex % BANNER_COLORS.length];
  roofMat.specularColor = new Color3(0.4, 0.4, 0.4);
  roofMat.emissiveColor = BANNER_COLORS[colorIndex % BANNER_COLORS.length].scale(0.15);

  const stoneMat = new StandardMaterial(`KMat_stone_${name}`, scene);
  stoneMat.diffuseColor = new Color3(0.5, 0.47, 0.43);
  stoneMat.specularColor = new Color3(0.1, 0.1, 0.1);

  // === PLATFORM (foundation) ===
  const platformW = 90 * s;
  const platformH = 3;
  const platform = MeshBuilder.CreateBox(`${name}_platform`, {
    width: platformW, height: platformH, depth: platformW,
  }, scene);
  platform.position = new Vector3(pos.x, platformH / 2, pos.z);
  platform.material = stoneMat;
  platform.receiveShadows = true;
  meshes.push(platform);

  // === OUTER WALLS ===
  const wallH = 10 + level * 0.4;
  const wallThick = 4;
  const wallInner = platformW * 0.45;
  const wallSegDefs = [
    { ox: 0,          oz: -wallInner, w: platformW, d: wallThick, axis: "x" },
    { ox: 0,          oz:  wallInner, w: platformW, d: wallThick, axis: "x" },
    { ox: -wallInner, oz: 0, w: wallThick, d: platformW - wallThick * 2, axis: "z" },
    { ox:  wallInner, oz: 0, w: wallThick, d: platformW - wallThick * 2, axis: "z" },
  ];
  for (const wd of wallSegDefs) {
    const wall = MeshBuilder.CreateBox(`${name}_outerwall_${wd.ox}_${wd.oz}`, {
      width: wd.w, height: wallH, depth: wd.d,
    }, scene);
    wall.position = new Vector3(pos.x + wd.ox, platformH + wallH / 2, pos.z + wd.oz);
    wall.material = wallMat;
    wall.receiveShadows = true;
    meshes.push(wall);
  }

  // === CORNER TOWERS ===
  const towerRadius = wallInner;
  const towerW = 14 * s;
  const towerH = wallH + 8 + level * 0.5;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [cx2, cz2] of corners) {
    const tw = MeshBuilder.CreateCylinder(`${name}_tower_${cx2}_${cz2}`, {
      diameter: towerW, height: towerH, tessellation: 8,
    }, scene);
    tw.position = new Vector3(pos.x + cx2 * towerRadius, platformH + towerH / 2, pos.z + cz2 * towerRadius);
    tw.material = wallMat;
    tw.receiveShadows = true;
    meshes.push(tw);

    const roof = MeshBuilder.CreateCylinder(`${name}_towerRoof_${cx2}_${cz2}`, {
      diameterTop: 0, diameterBottom: towerW + 4, height: 10 + level * 0.2, tessellation: 8,
    }, scene);
    roof.position = new Vector3(
      pos.x + cx2 * towerRadius,
      platformH + towerH + (10 + level * 0.2) / 2,
      pos.z + cz2 * towerRadius
    );
    roof.material = roofMat;
    meshes.push(roof);
  }

  // === MAIN KEEP (central) ===
  const keepW = 32 * s;
  const keepH = 28 + level * 1.2;
  const keep = MeshBuilder.CreateBox(`${name}_keep`, {
    width: keepW, height: keepH, depth: keepW,
  }, scene);
  keep.position = new Vector3(pos.x, platformH + keepH / 2, pos.z);
  keep.material = wallMat;
  keep.receiveShadows = true;
  meshes.push(keep);

  // Keep roof
  const keepRoof = MeshBuilder.CreateCylinder(`${name}_keepRoof`, {
    diameterTop: 0, diameterBottom: keepW + 6, height: 18 + level * 0.3, tessellation: 6,
  }, scene);
  keepRoof.position = new Vector3(pos.x, platformH + keepH + (18 + level * 0.3) / 2, pos.z);
  keepRoof.material = roofMat;
  meshes.push(keepRoof);

  // Keep spire (higher levels only)
  if (level >= 5) {
    const spire = MeshBuilder.CreateCylinder(`${name}_spire`, {
      diameterTop: 0, diameterBottom: 4, height: 14 + level * 0.4, tessellation: 4,
    }, scene);
    spire.position = new Vector3(pos.x, platformH + keepH + (18 + level * 0.3) + 7, pos.z);
    spire.material = roofMat;
    meshes.push(spire);
  }

  // === ROOT MESH ===
  const root = MeshBuilder.CreateBox(`${name}_root`, { size: 0.01 }, scene);
  root.position = new Vector3(pos.x, 0, pos.z);
  root.isVisible = false;

  const meta = { entityType: "kingdom", name, coord: { x, y }, level };
  for (const m of meshes) {
    m.metadata = meta;
    m.isPickable = true;
  }
  root.metadata = meta;

  return { meshes, rootMesh: root };
}

export function initKingdomSystem(scene: Scene): KingdomData[] {
  _kingdoms = [];

  const usedPositions: Array<{ x: number; y: number }> = [
    { x: WORLD_CENTER.x, y: WORLD_CENTER.y },
  ];

  const minDist = 180; // Increased spacing for bigger castles

  const getRandomPos = () => {
    let attempts = 0;
    while (attempts < 200) {
      const x = 250 + Math.random() * (WORLD_SIZE - 500);
      const y = 250 + Math.random() * (WORLD_SIZE - 500);
      const tooClose = usedPositions.some(
        (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minDist
      );
      if (!tooClose) {
        usedPositions.push({ x, y });
        return { x: Math.round(x), y: Math.round(y) };
      }
      attempts++;
    }
    return {
      x: Math.round(250 + Math.random() * (WORLD_SIZE - 500)),
      y: Math.round(250 + Math.random() * (WORLD_SIZE - 500)),
    };
  };

  for (let i = 0; i < 100; i++) {
    const pos = getRandomPos();
    const name = KINGDOM_NAMES[i % KINGDOM_NAMES.length];
    const level = Math.floor(Math.random() * 25) + 1;
    const s = getLevelScale(level);

    const { meshes, rootMesh } = makeKingdomMeshes(name, pos.x, pos.y, level, i, scene);

    const labelY = (28 + level * 1.2) * s + 30;
    const labelFontSize = Math.round(28 + level * 1.2);
    const labelColor = level >= 15 ? "#ffdd44" : level >= 8 ? "#f0e080" : "#ddccaa";
    const label = createLabel(
      `${name} Lv.${level}`,
      new Vector3(coordToWorld(pos.x, pos.y).x, labelY, coordToWorld(pos.x, pos.y).z),
      scene,
      labelFontSize,
      labelColor,
      "rgba(0,0,0,0.6)"
    );
    label.isPickable = false;
    label.setEnabled(false); // Start hidden, shown by distance culling

    _kingdoms.push({ id: i + 1, name, coord: pos, level, meshes, label, rootMesh });
  }

  return _kingdoms;
}

export function getKingdoms(): KingdomData[] {
  return _kingdoms;
}

export function setKingdomLabelsVisible(
  camera: { radius: number },
  maxRadius = 650
): void {
  for (const k of _kingdoms) {
    k.label.setEnabled(camera.radius < maxRadius);
  }
}
