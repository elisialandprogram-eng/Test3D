import {
  Scene, MeshBuilder, StandardMaterial,
  Vector3, Color3,
} from "@babylonjs/core";
import { SCENE_SIZE } from "../world/WorldConfig";

// Visible raised border walls at all 4 world edges.
// At full zoom-out the player sees these as a clear rectangular boundary.
// They sit just outside the playable area so they don't block gameplay.
export class WorldBorder {
  private meshes: ReturnType<typeof MeshBuilder.CreateBox>[] = [];

  constructor(scene: Scene) {
    const WALL_H  = 90;    // height of border ridge
    const WALL_W  = 180;   // thickness (in the axis perpendicular to the wall)
    const LEN     = SCENE_SIZE + WALL_W * 2; // full length including corners
    const HALF    = SCENE_SIZE / 2;
    const OFFSET  = SCENE_SIZE / 2 + WALL_W / 2; // center of wall strip
    const Y       = WALL_H / 2 - 5;

    const mat = new StandardMaterial("borderMat", scene);
    mat.diffuseColor  = new Color3(0.22, 0.15, 0.10); // dark stone brown
    mat.specularColor = Color3.Black();
    mat.ambientColor  = new Color3(0.8, 0.8, 0.8);

    const walls: Array<[number, number, number, number]> = [
      // [cx, cz, width, depth]
      [HALF,    -OFFSET,  LEN,    WALL_W], // North (z=0 edge)
      [HALF,    SCENE_SIZE + OFFSET, LEN, WALL_W], // South (z=max edge)
      [-OFFSET, HALF,     WALL_W, LEN],  // West  (x=0 edge)
      [SCENE_SIZE + OFFSET, HALF, WALL_W, LEN], // East (x=max edge)
    ];

    for (const [cx, cz, w, d] of walls) {
      const mesh = MeshBuilder.CreateBox(
        "border",
        { width: w, height: WALL_H, depth: d },
        scene,
      );
      mesh.position = new Vector3(cx, Y, cz);
      mesh.material = mat;
      mesh.isPickable = false;
      this.meshes.push(mesh);
    }
  }

  dispose() {
    for (const m of this.meshes) {
      m.material?.dispose();
      m.dispose();
    }
    this.meshes = [];
  }
}
