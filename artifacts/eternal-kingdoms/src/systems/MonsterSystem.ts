import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Matrix,
  Vector3,
} from "@babylonjs/core";
import { WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";

// Camp color by level tier — matches League of Kingdoms camp difficulty colors
const CAMP_COLORS: Color3[] = [
  new Color3(0.22, 0.78, 0.22),   // Lv 1 - green
  new Color3(0.48, 0.88, 0.10),   // Lv 2 - yellow-green
  new Color3(0.85, 0.88, 0.08),   // Lv 3 - yellow
  new Color3(0.98, 0.75, 0.05),   // Lv 4 - gold
  new Color3(0.98, 0.50, 0.05),   // Lv 5 - orange
  new Color3(0.92, 0.26, 0.08),   // Lv 6 - red-orange
  new Color3(0.88, 0.08, 0.10),   // Lv 7 - red
  new Color3(0.72, 0.04, 0.44),   // Lv 8 - crimson-purple
  new Color3(0.55, 0.04, 0.76),   // Lv 9 - purple
  new Color3(0.10, 0.04, 0.58),   // Lv 10 - deep indigo (boss)
];

// Reduced counts (30% of original)
const MONSTER_COUNTS = [24, 21, 20, 18, 16, 15, 14, 12, 11, 9];

const MIN_DIST_CENTER = 100;

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 211.3 + 137.9) * 98765.4321;
  return x - Math.floor(x);
}

/**
 * Build a monster camp mesh — tent structure with campfire.
 * Low level = small camp (1 tent), higher = bigger camp (2-3 tents + details).
 */
function buildCamp(name: string, level: number, campColor: Color3, scene: Scene): Mesh {
  const parts: Mesh[] = [];

  // --- Materials ---
  const tentMat = new StandardMaterial(`${name}_tentMat`, scene);
  // Tent fabric: slightly desaturated banner color mixed with dark grey
  tentMat.diffuseColor = campColor.scale(0.55).add(new Color3(0.22, 0.20, 0.18));
  tentMat.specularColor = new Color3(0.08, 0.08, 0.08);

  const groundMat = new StandardMaterial(`${name}_groundMat`, scene);
  groundMat.diffuseColor = new Color3(0.38, 0.32, 0.24);
  groundMat.specularColor = new Color3(0.04, 0.04, 0.04);

  const fireMat = new StandardMaterial(`${name}_fireMat`, scene);
  fireMat.diffuseColor = new Color3(1.0, 0.55, 0.05);
  fireMat.emissiveColor = new Color3(0.8, 0.30, 0.00);
  fireMat.specularColor = new Color3(0.5, 0.3, 0.1);

  const poleMat = new StandardMaterial(`${name}_poleMat`, scene);
  poleMat.diffuseColor = new Color3(0.42, 0.32, 0.20);
  poleMat.specularColor = new Color3(0.05, 0.04, 0.03);

  const flagMat = new StandardMaterial(`${name}_flagMat`, scene);
  flagMat.diffuseColor = campColor;
  flagMat.emissiveColor = campColor.scale(0.25);
  flagMat.specularColor = new Color3(0.3, 0.3, 0.3);

  // Scale by level
  const campScale = 0.7 + level * 0.18;
  const cs = campScale;

  // --- Ground pad (dirt clearing) ---
  const groundR = 12 * cs;
  const groundPad = MeshBuilder.CreateCylinder(`${name}_ground`, {
    diameter: groundR * 2, height: 0.8, tessellation: 14,
  }, scene);
  groundPad.position.y = 0.4;
  groundPad.material = groundMat;
  parts.push(groundPad);

  // --- Palisade wall stakes for higher level camps ---
  if (level >= 5) {
    const stakeCount = 8 + Math.floor(level * 1.5);
    const stakeR = groundR - 1.5;
    for (let i = 0; i < stakeCount; i++) {
      const ang = (i / stakeCount) * Math.PI * 2;
      const sx = Math.cos(ang) * stakeR;
      const sz = Math.sin(ang) * stakeR;
      const stakeH = 4 + cs * 2;
      const stake = MeshBuilder.CreateCylinder(`${name}_stake${i}`, {
        diameterTop: 0.8, diameterBottom: 1.2, height: stakeH, tessellation: 5,
      }, scene);
      stake.position = new Vector3(sx, 0.4 + stakeH / 2, sz);
      stake.material = poleMat;
      parts.push(stake);
    }
  }

  // --- Main tent ---
  const tentBodyW = 7 * cs;
  const tentBodyH = 4.5 * cs;
  const tentRoofH = 6 * cs;

  // Tent walls (box)
  const tentBody = MeshBuilder.CreateBox(`${name}_tentBody`, {
    width: tentBodyW, height: tentBodyH, depth: tentBodyW * 0.85,
  }, scene);
  tentBody.position = new Vector3(0, 0.8 + tentBodyH / 2, -2 * cs);
  tentBody.material = tentMat;
  parts.push(tentBody);

  // Tent roof (pyramid — 4-sided cone)
  const tentRoof = MeshBuilder.CreateCylinder(`${name}_tentRoof`, {
    diameterTop: 0, diameterBottom: tentBodyW + 2.5, height: tentRoofH, tessellation: 4,
  }, scene);
  tentRoof.position = new Vector3(0, 0.8 + tentBodyH + tentRoofH / 2 - 0.5, -2 * cs);
  tentRoof.material = tentMat;
  parts.push(tentRoof);

  // Tent flag/pennant on roof peak
  const pole = MeshBuilder.CreateCylinder(`${name}_tentPole`, {
    diameter: 0.6, height: 5 * cs, tessellation: 5,
  }, scene);
  pole.position = new Vector3(0, 0.8 + tentBodyH + tentRoofH + 2.5 * cs, -2 * cs);
  pole.material = poleMat;
  parts.push(pole);

  const pennant = MeshBuilder.CreateBox(`${name}_pennant`, {
    width: 3.5 * cs, height: 2.5 * cs, depth: 0.4,
  }, scene);
  pennant.position = new Vector3(
    1.75 * cs,
    0.8 + tentBodyH + tentRoofH + 4 * cs,
    -2 * cs
  );
  pennant.material = flagMat;
  parts.push(pennant);

  // --- Second tent for mid/high level ---
  if (level >= 4) {
    const t2W = tentBodyW * 0.72;
    const t2H = tentBodyH * 0.72;
    const t2RH = tentRoofH * 0.72;
    const t2Body = MeshBuilder.CreateBox(`${name}_tent2Body`, {
      width: t2W, height: t2H, depth: t2W * 0.85,
    }, scene);
    t2Body.position = new Vector3(6 * cs, 0.8 + t2H / 2, 2 * cs);
    t2Body.material = tentMat;
    parts.push(t2Body);

    const t2Roof = MeshBuilder.CreateCylinder(`${name}_tent2Roof`, {
      diameterTop: 0, diameterBottom: t2W + 1.5, height: t2RH, tessellation: 4,
    }, scene);
    t2Roof.position = new Vector3(6 * cs, 0.8 + t2H + t2RH / 2 - 0.4, 2 * cs);
    t2Roof.material = tentMat;
    parts.push(t2Roof);
  }

  // --- Third tent for boss level ---
  if (level >= 7) {
    const t3W = tentBodyW * 0.65;
    const t3H = tentBodyH * 0.65;
    const t3RH = tentRoofH * 0.65;
    const t3Body = MeshBuilder.CreateBox(`${name}_tent3Body`, {
      width: t3W, height: t3H, depth: t3W * 0.85,
    }, scene);
    t3Body.position = new Vector3(-6 * cs, 0.8 + t3H / 2, 2 * cs);
    t3Body.material = tentMat;
    parts.push(t3Body);

    const t3Roof = MeshBuilder.CreateCylinder(`${name}_tent3Roof`, {
      diameterTop: 0, diameterBottom: t3W + 1.2, height: t3RH, tessellation: 4,
    }, scene);
    t3Roof.position = new Vector3(-6 * cs, 0.8 + t3H + t3RH / 2 - 0.4, 2 * cs);
    t3Roof.material = tentMat;
    parts.push(t3Roof);
  }

  // --- Campfire at center ---
  const fireBase = MeshBuilder.CreateCylinder(`${name}_fireBase`, {
    diameter: 3.5 * cs, height: 1, tessellation: 8,
  }, scene);
  fireBase.position = new Vector3(0, 0.8 + 0.5, 3 * cs);
  fireBase.material = groundMat;
  parts.push(fireBase);

  // Fire log pile (crossed cylinders)
  const log1 = MeshBuilder.CreateCylinder(`${name}_log1`, {
    diameter: 0.8, height: 4 * cs, tessellation: 6,
  }, scene);
  log1.position = new Vector3(0, 0.8 + 1.2, 3 * cs);
  log1.rotation.z = Math.PI / 2;
  log1.bakeCurrentTransformIntoVertices();
  log1.material = poleMat;
  parts.push(log1);

  const log2 = MeshBuilder.CreateCylinder(`${name}_log2`, {
    diameter: 0.8, height: 4 * cs, tessellation: 6,
  }, scene);
  log2.position = new Vector3(0, 0.8 + 1.2, 3 * cs);
  log2.rotation.x = Math.PI / 2;
  log2.bakeCurrentTransformIntoVertices();
  log2.material = poleMat;
  parts.push(log2);

  // Fire flame (emissive sphere)
  const flame = MeshBuilder.CreateSphere(`${name}_flame`, {
    diameter: 2.5 * cs, segments: 6,
  }, scene);
  flame.scaling.set(1, 1.4, 1);
  flame.position = new Vector3(0, 0.8 + 2.5 * cs, 3 * cs);
  flame.bakeCurrentTransformIntoVertices();
  flame.material = fireMat;
  parts.push(flame);

  // Inner bright core of fire
  const fireCore = MeshBuilder.CreateSphere(`${name}_fireCore`, {
    diameter: 1.2 * cs, segments: 5,
  }, scene);
  const coreMat = new StandardMaterial(`${name}_coreMat`, scene);
  coreMat.diffuseColor = new Color3(1.0, 0.95, 0.65);
  coreMat.emissiveColor = new Color3(1.0, 0.80, 0.20);
  fireCore.position = new Vector3(0, 0.8 + 2.8 * cs, 3 * cs);
  fireCore.bakeCurrentTransformIntoVertices();
  fireCore.material = coreMat;
  parts.push(fireCore);

  // --- Boss skull marker for level 8+ ---
  if (level >= 8) {
    const skullMat = new StandardMaterial(`${name}_skullMat`, scene);
    skullMat.diffuseColor = new Color3(0.85, 0.82, 0.78);
    skullMat.emissiveColor = campColor.scale(0.15);

    const skullPost = MeshBuilder.CreateCylinder(`${name}_skullPost`, {
      diameter: 1.2, height: 8 * cs, tessellation: 6,
    }, scene);
    skullPost.position = new Vector3(-4 * cs, 0.8 + 4 * cs, -5 * cs);
    skullPost.material = poleMat;
    parts.push(skullPost);

    const skull = MeshBuilder.CreateSphere(`${name}_skull`, {
      diameter: 3.5 * cs, segments: 6,
    }, scene);
    skull.scaling.set(1, 0.85, 0.85);
    skull.position = new Vector3(-4 * cs, 0.8 + 8 * cs + 1.75 * cs, -5 * cs);
    skull.bakeCurrentTransformIntoVertices();
    skull.material = skullMat;
    parts.push(skull);
  }

  // Set materials on all parts before merge (single-material merge)
  // We can't merge different materials, so return a parent with children
  // Use a hidden root box as the "template" and attach all children
  const root = parts[0]; // ground pad is our "template" for thin instancing anchor
  root.name = name;

  // Since we can't thin-instance composite multi-material meshes,
  // merge what we can — same-material parts separately, then treat as group
  // For simplicity of instancing, we'll just use the ground pad as size reference
  // and return all as separate meshes grouped under a name
  return root;
}

let _monsterMeshes: Mesh[] = [];
let _allCampParts: Mesh[] = [];

export function initMonsterSystem(scene: Scene): Mesh[] {
  _monsterMeshes = [];
  _allCampParts = [];

  const cx = WORLD_CENTER.x;
  const cy = WORLD_CENTER.y;

  let globalSeed = 5000;

  for (let lvl = 1; lvl <= 10; lvl++) {
    const count = MONSTER_COUNTS[lvl - 1];
    const campColor = CAMP_COLORS[lvl - 1];
    const campScale = 0.7 + lvl * 0.18;
    const cs = campScale;

    // Materials shared per level
    const tentMat = new StandardMaterial(`MonTent_Lv${lvl}`, scene);
    tentMat.diffuseColor = campColor.scale(0.55).add(new Color3(0.22, 0.20, 0.18));
    tentMat.specularColor = new Color3(0.08, 0.08, 0.08);

    const groundMat = new StandardMaterial(`MonGround_Lv${lvl}`, scene);
    groundMat.diffuseColor = new Color3(0.38, 0.32, 0.24);

    const fireMat = new StandardMaterial(`MonFire_Lv${lvl}`, scene);
    fireMat.diffuseColor = new Color3(1.0, 0.55, 0.05);
    fireMat.emissiveColor = new Color3(0.8, 0.30, 0.00);

    const poleMat = new StandardMaterial(`MonPole_Lv${lvl}`, scene);
    poleMat.diffuseColor = new Color3(0.42, 0.32, 0.20);

    const flagMat = new StandardMaterial(`MonFlag_Lv${lvl}`, scene);
    flagMat.diffuseColor = campColor;
    flagMat.emissiveColor = campColor.scale(0.25);

    // Generate positions for this level
    const positions: Array<{ x: number; y: number; rot: number }> = [];
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
      const rot = pseudoRand(globalSeed++) * Math.PI * 2;
      positions.push({ x, y, rot });
    }

    // Build and place camps as individual meshes (not thin-instanced — complex geometry)
    for (const { x, y, rot } of positions) {
      // Ground pad
      const groundR = 12 * cs;
      const pad = MeshBuilder.CreateCylinder(`Camp_Lv${lvl}_pad_${x}`, {
        diameter: groundR * 2, height: 0.8, tessellation: 12,
      }, scene);
      pad.position = new Vector3(x, 0.4, y);
      pad.rotation.y = rot;
      pad.material = groundMat;
      pad.isPickable = true;
      pad.metadata = { entityType: "monster", level: lvl };
      _allCampParts.push(pad);
      _monsterMeshes.push(pad);

      // Main tent body
      const tentBodyW = 7 * cs;
      const tentBodyH = 4.5 * cs;
      const tentRoofH = 6 * cs;
      const tentOZ = -2 * cs;

      const tentCos = Math.cos(rot);
      const tentSin = Math.sin(rot);
      const tx = x + tentSin * tentOZ;
      const tz = y + tentCos * tentOZ;

      const tentBody = MeshBuilder.CreateBox(`Camp_Lv${lvl}_tb_${x}`, {
        width: tentBodyW, height: tentBodyH, depth: tentBodyW * 0.85,
      }, scene);
      tentBody.position = new Vector3(tx, 0.8 + tentBodyH / 2, tz);
      tentBody.rotation.y = rot;
      tentBody.material = tentMat;
      tentBody.isPickable = true;
      tentBody.metadata = { entityType: "monster", level: lvl };
      _allCampParts.push(tentBody);

      const tentRoof = MeshBuilder.CreateCylinder(`Camp_Lv${lvl}_tr_${x}`, {
        diameterTop: 0, diameterBottom: tentBodyW + 2.5, height: tentRoofH, tessellation: 4,
      }, scene);
      tentRoof.position = new Vector3(tx, 0.8 + tentBodyH + tentRoofH / 2 - 0.5, tz);
      tentRoof.rotation.y = rot + Math.PI / 4;
      tentRoof.material = tentMat;
      tentRoof.isPickable = false;
      _allCampParts.push(tentRoof);

      // Flag on tent
      const poleH = 5 * cs;
      const poleX = tx;
      const poleZ = tz;
      const poleMesh = MeshBuilder.CreateCylinder(`Camp_Lv${lvl}_pole_${x}`, {
        diameter: 0.6, height: poleH, tessellation: 5,
      }, scene);
      poleMesh.position = new Vector3(poleX, 0.8 + tentBodyH + tentRoofH + poleH / 2 - 0.5, poleZ);
      poleMesh.material = poleMat;
      poleMesh.isPickable = false;
      _allCampParts.push(poleMesh);

      const pennantW = 3.5 * cs;
      const pennantH = 2.5 * cs;
      const pennant = MeshBuilder.CreateBox(`Camp_Lv${lvl}_pn_${x}`, {
        width: pennantW, height: pennantH, depth: 0.4,
      }, scene);
      pennant.position = new Vector3(
        poleX + Math.cos(rot) * pennantW / 2 + 0.3,
        0.8 + tentBodyH + tentRoofH + poleH - pennantH / 2 - 0.2,
        poleZ - Math.sin(rot) * pennantW / 2
      );
      pennant.rotation.y = rot;
      pennant.material = flagMat;
      pennant.isPickable = false;
      _allCampParts.push(pennant);

      // Campfire
      const fireOX = Math.sin(rot) * 3 * cs;
      const fireOZ = Math.cos(rot) * 3 * cs;
      const flame = MeshBuilder.CreateSphere(`Camp_Lv${lvl}_flame_${x}`, {
        diameter: 2.5 * cs, segments: 5,
      }, scene);
      flame.scaling.y = 1.5;
      flame.position = new Vector3(x + fireOX, 0.8 + 2 * cs, y + fireOZ);
      flame.bakeCurrentTransformIntoVertices();
      flame.material = fireMat;
      flame.isPickable = false;
      _allCampParts.push(flame);

      // Second tent for mid-level camps
      if (lvl >= 4) {
        const t2W = tentBodyW * 0.72;
        const t2H = tentBodyH * 0.72;
        const t2RH = tentRoofH * 0.72;
        const t2OX = Math.cos(rot) * 6 * cs;
        const t2OZ = -Math.sin(rot) * 6 * cs;
        const t2x = x + t2OX;
        const t2z = y + t2OZ;

        const t2Body = MeshBuilder.CreateBox(`Camp_Lv${lvl}_t2b_${x}`, {
          width: t2W, height: t2H, depth: t2W * 0.85,
        }, scene);
        t2Body.position = new Vector3(t2x, 0.8 + t2H / 2, t2z);
        t2Body.rotation.y = rot + 0.3;
        t2Body.material = tentMat;
        t2Body.isPickable = false;
        _allCampParts.push(t2Body);

        const t2Roof = MeshBuilder.CreateCylinder(`Camp_Lv${lvl}_t2r_${x}`, {
          diameterTop: 0, diameterBottom: t2W + 1.5, height: t2RH, tessellation: 4,
        }, scene);
        t2Roof.position = new Vector3(t2x, 0.8 + t2H + t2RH / 2 - 0.4, t2z);
        t2Roof.rotation.y = rot + Math.PI / 4 + 0.3;
        t2Roof.material = tentMat;
        t2Roof.isPickable = false;
        _allCampParts.push(t2Roof);
      }

      // Boss skull marker
      if (lvl >= 8) {
        const skullMat = new StandardMaterial(`MonSkull_Lv${lvl}_${x}`, scene);
        skullMat.diffuseColor = new Color3(0.85, 0.82, 0.78);
        skullMat.emissiveColor = campColor.scale(0.15);

        const skullOX = -Math.cos(rot) * 5 * cs;
        const skullOZ = Math.sin(rot) * 5 * cs + (-5 * cs);
        const skullPostH = 8 * cs;

        const skullPost = MeshBuilder.CreateCylinder(`Camp_Lv${lvl}_sp_${x}`, {
          diameter: 1.2, height: skullPostH, tessellation: 6,
        }, scene);
        skullPost.position = new Vector3(x + skullOX, 0.8 + skullPostH / 2, y + skullOZ);
        skullPost.material = poleMat;
        skullPost.isPickable = false;
        _allCampParts.push(skullPost);

        const skull = MeshBuilder.CreateSphere(`Camp_Lv${lvl}_skull_${x}`, {
          diameter: 3.5 * cs, segments: 5,
        }, scene);
        skull.scaling.set(1, 0.85, 0.85);
        skull.position = new Vector3(
          x + skullOX, 0.8 + skullPostH + 1.75 * cs, y + skullOZ
        );
        skull.bakeCurrentTransformIntoVertices();
        skull.material = skullMat;
        skull.isPickable = false;
        _allCampParts.push(skull);
      }
    }
  }

  return _monsterMeshes;
}

export function getMonsterMeshes(): Mesh[] {
  return _monsterMeshes;
}

export function getAllCampParts(): Mesh[] {
  return _allCampParts;
}
