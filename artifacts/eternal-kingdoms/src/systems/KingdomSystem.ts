import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  DynamicTexture,
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

// League-of-kingdoms style banner colors — rich and saturated
const BANNER_COLORS: Color3[] = [
  new Color3(0.82, 0.10, 0.10), // crimson
  new Color3(0.10, 0.28, 0.88), // royal blue
  new Color3(0.12, 0.62, 0.20), // forest green
  new Color3(0.85, 0.55, 0.05), // golden
  new Color3(0.58, 0.08, 0.72), // royal purple
  new Color3(0.05, 0.58, 0.75), // teal blue
  new Color3(0.88, 0.32, 0.08), // burnt orange
  new Color3(0.28, 0.08, 0.55), // deep indigo
];

let _kingdoms: KingdomData[] = [];

function getLevelScale(level: number): number {
  return 1.0 + (level - 1) * 0.11;
}

function makeStoneMaterial(name: string, scene: Scene, variation = 0): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  // Stone grey with slight variation — proper castle stone
  const base = 0.52 + variation * 0.05;
  mat.diffuseColor = new Color3(base + 0.04, base, base - 0.04);
  mat.specularColor = new Color3(0.12, 0.12, 0.10);
  mat.ambientColor = new Color3(0.3, 0.28, 0.25);
  return mat;
}

function makeBannerMaterial(name: string, color: Color3, scene: Scene): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color.scale(0.18);
  mat.specularColor = new Color3(0.3, 0.3, 0.3);
  return mat;
}

function addBattlements(
  name: string,
  cx: number, cy: number,
  wallLen: number,
  wallTop: number,
  wallThick: number,
  isAlongX: boolean,
  merW: number,
  merH: number,
  mat: StandardMaterial,
  scene: Scene,
  meshes: Mesh[]
) {
  const count = Math.max(3, Math.floor(wallLen / (merW * 2.2)));
  const spacing = wallLen / count;
  for (let i = 0; i < count; i++) {
    const offset = -wallLen / 2 + spacing * (i + 0.5);
    const mx = isAlongX ? cx + offset : cx;
    const mz = isAlongX ? cy : cy + offset;
    const mer = MeshBuilder.CreateBox(`${name}_mer_${i}`, {
      width:  isAlongX ? merW : wallThick + 1,
      height: merH,
      depth:  isAlongX ? wallThick + 1 : merW,
    }, scene);
    mer.position = new Vector3(mx, wallTop + merH / 2, mz);
    mer.material = mat;
    mer.receiveShadows = true;
    meshes.push(mer);
  }
}

function addFlag(
  name: string,
  px: number, py: number, pz: number,
  bannerColor: Color3,
  scale: number,
  scene: Scene,
  meshes: Mesh[]
) {
  const poleMat = new StandardMaterial(`${name}_poleMat`, scene);
  poleMat.diffuseColor = new Color3(0.72, 0.65, 0.50);
  poleMat.specularColor = new Color3(0.5, 0.5, 0.4);

  const bannerMat = makeBannerMaterial(`${name}_banMat`, bannerColor, scene);

  const poleH = 12 * scale;
  const pole = MeshBuilder.CreateCylinder(`${name}_pole`, {
    diameter: 0.9 * scale, height: poleH, tessellation: 6,
  }, scene);
  pole.position = new Vector3(px, py + poleH / 2, pz);
  pole.material = poleMat;
  meshes.push(pole);

  const banW = 7 * scale;
  const banH = 5 * scale;
  const banner = MeshBuilder.CreateBox(`${name}_banner`, {
    width: banW, height: banH, depth: 0.5 * scale,
  }, scene);
  banner.position = new Vector3(px + banW / 2 + 0.45 * scale, py + poleH - banH / 2, pz);
  banner.material = bannerMat;
  meshes.push(banner);
}

function addTower(
  name: string,
  px: number, py: number, pz: number,
  radius: number,
  height: number,
  wallMat: StandardMaterial,
  roofMat: StandardMaterial,
  bannerColor: Color3,
  scene: Scene,
  meshes: Mesh[],
  scale: number
) {
  // Tower body
  const tower = MeshBuilder.CreateCylinder(`${name}_body`, {
    diameter: radius * 2, height: height, tessellation: 10,
  }, scene);
  tower.position = new Vector3(px, py + height / 2, pz);
  tower.material = wallMat;
  tower.receiveShadows = true;
  meshes.push(tower);

  // Tower walkway ring
  const ring = MeshBuilder.CreateCylinder(`${name}_ring`, {
    diameter: radius * 2 + 4, height: 2.5, tessellation: 10,
  }, scene);
  ring.position = new Vector3(px, py + height + 1.25, pz);
  ring.material = wallMat;
  ring.receiveShadows = true;
  meshes.push(ring);

  // Tower battlements (round)
  const batCount = 6;
  const batR = radius + 1.5;
  const batW = 3.5 * scale;
  const batH = 4.5 * scale;
  for (let i = 0; i < batCount; i++) {
    const ang = (i / batCount) * Math.PI * 2;
    const bx = px + Math.cos(ang) * batR;
    const bz = pz + Math.sin(ang) * batR;
    const bat = MeshBuilder.CreateBox(`${name}_bat${i}`, {
      width: batW, height: batH, depth: batW,
    }, scene);
    bat.position = new Vector3(bx, py + height + 2.5 + batH / 2, bz);
    bat.material = wallMat;
    meshes.push(bat);
  }

  // Conical roof
  const roofH = 14 * scale;
  const roof = MeshBuilder.CreateCylinder(`${name}_roof`, {
    diameterTop: 0, diameterBottom: radius * 2 + 5, height: roofH, tessellation: 10,
  }, scene);
  roof.position = new Vector3(px, py + height + 2.5 + batH * 0.8 + roofH / 2 - 1, pz);
  roof.material = roofMat;
  meshes.push(roof);

  // Flag on tower
  addFlag(
    `${name}_flag`,
    px, py + height + 2.5 + batH * 0.8 + roofH - 1,
    pz,
    bannerColor, scale, scene, meshes
  );
}

function makeKingdomMeshes(
  name: string,
  x: number, y: number,
  level: number,
  colorIndex: number,
  scene: Scene
): { meshes: Mesh[]; rootMesh: Mesh } {
  const pos = coordToWorld(x, y, 0);
  const meshes: Mesh[] = [];
  const s = getLevelScale(level);
  const bannerColor = BANNER_COLORS[colorIndex % BANNER_COLORS.length];

  const wallMat      = makeStoneMaterial(`KM_wall_${name}`,    scene, 0);
  const darkMat      = makeStoneMaterial(`KM_dark_${name}`,    scene, -0.08);
  const roofMat      = makeBannerMaterial(`KM_roof_${name}`,   bannerColor, scene);

  // === MOAT / FOUNDATION PLATFORM ===
  const platW = 100 * s;
  const platH = 4;
  const plat = MeshBuilder.CreateBox(`${name}_plat`, {
    width: platW + 18, height: platH, depth: platW + 18,
  }, scene);
  plat.position = new Vector3(pos.x, platH / 2 - 0.5, pos.z);
  plat.material = darkMat;
  plat.receiveShadows = true;
  meshes.push(plat);

  // Stone courtyard floor (inner lighter square)
  const courtW = platW;
  const court = MeshBuilder.CreateBox(`${name}_court`, {
    width: courtW, height: 1, depth: courtW,
  }, scene);
  court.position = new Vector3(pos.x, platH, pos.z);
  court.material = wallMat;
  court.receiveShadows = true;
  meshes.push(court);

  // === OUTER WALLS with BATTLEMENTS ===
  const wallH  = 14 + level * 0.35;
  const wallT  = 5.5;
  const wallInner = platW * 0.42;
  const wallTop = platH + wallH;
  const merH = 4.5;
  const merW = 5.5;

  // 4 walls (N, S, W, E)
  const wallDefs = [
    { ox: 0,          oz: -wallInner, w: platW, d: wallT, alongX: true  },
    { ox: 0,          oz:  wallInner, w: platW, d: wallT, alongX: true  },
    { ox: -wallInner, oz: 0, w: wallT, d: platW - wallT * 2, alongX: false },
    { ox:  wallInner, oz: 0, w: wallT, d: platW - wallT * 2, alongX: false },
  ];

  for (const wd of wallDefs) {
    const wall = MeshBuilder.CreateBox(`${name}_wall_${wd.ox}`, {
      width: wd.w, height: wallH, depth: wd.d,
    }, scene);
    wall.position = new Vector3(pos.x + wd.ox, platH + wallH / 2, pos.z + wd.oz);
    wall.material = wallMat;
    wall.receiveShadows = true;
    meshes.push(wall);

    // Battlements on top of each wall
    addBattlements(
      `${name}_bat_${wd.ox}`,
      pos.x + wd.ox, pos.z + wd.oz,
      wd.alongX ? wd.w - wallT * 1.8 : wd.d,
      wallTop, wallT,
      wd.alongX, merW, merH, wallMat, scene, meshes
    );
  }

  // === GATEHOUSE (south wall) ===
  const gateW = 14 * s;
  const gateH = wallH * 0.85;
  const gateArchH = gateH * 0.55;
  const gateZ = -wallInner;

  // Gate flanking towers (smaller)
  for (const side of [-1, 1]) {
    const gfx = pos.x + side * (gateW / 2 + 5 * s);
    const gfz = pos.z + gateZ;
    const gfTower = MeshBuilder.CreateBox(`${name}_gft_${side}`, {
      width: 8 * s, height: wallH + 5, depth: wallT + 4,
    }, scene);
    gfTower.position = new Vector3(gfx, platH + (wallH + 5) / 2, gfz);
    gfTower.material = darkMat;
    gfTower.receiveShadows = true;
    meshes.push(gfTower);
  }

  // Gate arch top (dark stone above entrance)
  const gateTop = MeshBuilder.CreateBox(`${name}_gateTop`, {
    width: gateW, height: wallH - gateArchH, depth: wallT + 2,
  }, scene);
  gateTop.position = new Vector3(
    pos.x, platH + gateArchH + (wallH - gateArchH) / 2, pos.z + gateZ
  );
  gateTop.material = darkMat;
  meshes.push(gateTop);

  // === CORNER TOWERS ===
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
  const towerR = 9 * s;
  const towerH = wallH + 12 + level * 0.5;

  for (const [cx2, cz2] of corners) {
    addTower(
      `${name}_ct${cx2}${cz2}`,
      pos.x + cx2 * wallInner,
      platH,
      pos.z + cz2 * wallInner,
      towerR, towerH,
      wallMat, roofMat, bannerColor,
      scene, meshes, s
    );
  }

  // === MAIN KEEP ===
  const keepW  = 34 * s;
  const keepH  = 32 + level * 1.4;
  const keep = MeshBuilder.CreateBox(`${name}_keep`, {
    width: keepW, height: keepH, depth: keepW,
  }, scene);
  keep.position = new Vector3(pos.x, platH + keepH / 2, pos.z);
  keep.material = wallMat;
  keep.receiveShadows = true;
  meshes.push(keep);

  // Keep walkway ring
  const keepRing = MeshBuilder.CreateBox(`${name}_keepRing`, {
    width: keepW + 8, height: 3, depth: keepW + 8,
  }, scene);
  keepRing.position = new Vector3(pos.x, platH + keepH + 1.5, pos.z);
  keepRing.material = wallMat;
  meshes.push(keepRing);

  // Keep battlements (on each face)
  const kBatDefs = [
    { ox: 0, oz: -(keepW + 8) / 2, len: keepW + 8, ax: true  },
    { ox: 0, oz:  (keepW + 8) / 2, len: keepW + 8, ax: true  },
    { ox: -(keepW + 8) / 2, oz: 0, len: keepW + 8, ax: false },
    { ox:  (keepW + 8) / 2, oz: 0, len: keepW + 8, ax: false },
  ];
  const keepTop = platH + keepH + 3;
  for (const kb of kBatDefs) {
    addBattlements(
      `${name}_kBat_${kb.ox}`,
      pos.x + kb.ox, pos.z + kb.oz,
      kb.len, keepTop, 5.5 * s,
      kb.ax, 5.5 * s, 5.5 * s, wallMat, scene, meshes
    );
  }

  // Keep conical roof
  const keepRoofH = 22 + level * 0.4;
  const keepRoof = MeshBuilder.CreateCylinder(`${name}_keepRoof`, {
    diameterTop: 0, diameterBottom: keepW + 12, height: keepRoofH, tessellation: 4,
  }, scene);
  keepRoof.position = new Vector3(
    pos.x, keepTop + 5.5 * s * 0.8 + keepRoofH / 2 - 1, pos.z
  );
  keepRoof.material = roofMat;
  meshes.push(keepRoof);

  // Main keep flag (tallest)
  addFlag(
    `${name}_mainFlag`,
    pos.x, keepTop + 5.5 * s * 0.8 + keepRoofH - 1, pos.z,
    bannerColor, s * 1.4, scene, meshes
  );

  // Higher-level secondary spire on keep roof
  if (level >= 8) {
    const spireH = 20 + level * 0.6;
    const spire = MeshBuilder.CreateCylinder(`${name}_spire`, {
      diameterTop: 0, diameterBottom: 6 * s, height: spireH, tessellation: 4,
    }, scene);
    spire.position = new Vector3(
      pos.x, keepTop + 5.5 * s * 0.8 + keepRoofH + spireH / 2, pos.z
    );
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

  const minDist = 190;

  const getRandomPos = () => {
    let attempts = 0;
    while (attempts < 200) {
      const x = 260 + Math.random() * (WORLD_SIZE - 520);
      const y = 260 + Math.random() * (WORLD_SIZE - 520);
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
      x: Math.round(260 + Math.random() * (WORLD_SIZE - 520)),
      y: Math.round(260 + Math.random() * (WORLD_SIZE - 520)),
    };
  };

  for (let i = 0; i < 100; i++) {
    const pos = getRandomPos();
    const name = KINGDOM_NAMES[i % KINGDOM_NAMES.length];
    const level = Math.floor(Math.random() * 25) + 1;
    const s = getLevelScale(level);

    const { meshes, rootMesh } = makeKingdomMeshes(name, pos.x, pos.y, level, i, scene);

    const labelY = (32 + level * 1.4) * s + 40;
    const labelFontSize = Math.round(26 + level * 1.0);
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
    label.setEnabled(false);

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
