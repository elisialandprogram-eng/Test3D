import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh,
} from "@babylonjs/core";

interface RiverSegment { x: number; z: number; w: number; }

function buildRiver(
  scene: Scene,
  name: string,
  segments: RiverSegment[],
  mat: StandardMaterial,
) {
  segments.forEach((seg, i) => {
    const g = MeshBuilder.CreateGround(`${name}_${i}`,
      { width: seg.w, height: seg.w, subdivisions: 2 }, scene);
    g.position = new Vector3(seg.x, 0.06, seg.z);
    g.material = mat;
  });
}

// Build a rough river by interpolating control points
function makePath(cpts: [number,number][], steps: number, width: number): RiverSegment[] {
  const segs: RiverSegment[] = [];
  for (let i=0;i<steps;i++) {
    const t = i/(steps-1);
    const seg = cpts.length - 1;
    const fi  = Math.min(Math.floor(t*seg), seg-1);
    const ft  = t*seg - fi;
    const a=cpts[fi], b=cpts[fi+1];
    segs.push({ x: a[0]+(b[0]-a[0])*ft, z: a[1]+(b[1]-a[1])*ft, w: width });
  }
  return segs;
}

export function createRivers(scene: Scene): Mesh[] {
  const waterMat = new StandardMaterial("riverMat", scene);
  waterMat.diffuseColor  = new Color3(0.22, 0.54, 0.82);
  waterMat.specularColor = new Color3(0.55, 0.72, 0.95);
  waterMat.specularPower = 180;
  waterMat.alpha = 0.84;

  const riverMat2 = new StandardMaterial("riverMat2", scene);
  riverMat2.diffuseColor  = new Color3(0.18, 0.48, 0.76);
  riverMat2.specularColor = new Color3(0.50, 0.68, 0.92);
  riverMat2.specularPower = 160;
  riverMat2.alpha = 0.82;

  // River 1: flows from upper-left mountains down to lower-right lake
  buildRiver(scene, "r1", makePath([
    [-185, -140], [-150,-100], [-115,-65], [-88, -45],
    [-60, -15],  [-30,  18],  [0,  40],  [28,  52], [62, 68],
  ], 18, 8), waterMat);

  // River 2: from upper-right to central lake
  buildRiver(scene, "r2", makePath([
    [165, -145], [135,-100], [110,-60], [92, -35],
    [72,  0],   [55,  30],  [35, 55],  [12, 72],
  ], 16, 7), riverMat2);

  // River 3: from lower mountains toward west lake
  buildRiver(scene, "r3", makePath([
    [140, 165], [100,138], [65,108], [28,85],
    [-8, 60],  [-38,42],  [-65,28], [-88,18], [-108,-8],
  ], 18, 7), waterMat);

  // River 4: short central river connecting lakes
  buildRiver(scene, "r4", makePath([
    [-42,128], [-28, 95], [-10, 68], [8, 48], [28, 28], [48, 8],
  ], 12, 6), riverMat2);

  return [];
}
