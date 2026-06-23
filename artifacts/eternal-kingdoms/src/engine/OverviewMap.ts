import {
  Scene, MeshBuilder, StandardMaterial,
  DynamicTexture, Vector3, Color3,
} from "@babylonjs/core";
import { getTerrainColorWithNoise } from "../world/TerrainGen";
import { SCENE_SIZE, OVERVIEW_TEX_SIZE } from "../world/WorldConfig";

// Generates a single low-resolution texture covering the entire world,
// used when the camera is zoomed far out (world overview mode).
export class OverviewMap {
  private mesh: ReturnType<typeof MeshBuilder.CreateGround>;
  private mat: StandardMaterial;
  private tex: DynamicTexture;
  private visible = true;

  constructor(scene: Scene) {
    const SIZE = OVERVIEW_TEX_SIZE; // 256 px → 8 world coords per pixel

    const offscreen = document.createElement("canvas");
    offscreen.width  = SIZE;
    offscreen.height = SIZE;
    const ctx = offscreen.getContext("2d")!;
    const img = ctx.createImageData(SIZE, SIZE);
    const data = img.data;
    const coordsPerPixel = 2048 / SIZE;

    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const wx = Math.floor(px * coordsPerPixel);
        const wy = Math.floor(py * coordsPerPixel);
        const [r, g, b] = getTerrainColorWithNoise(wx, wy);
        const i = (py * SIZE + px) * 4;
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new DynamicTexture(
      "worldOverviewTex",
      { width: SIZE, height: SIZE },
      scene, false,
    );
    tex.getContext().drawImage(offscreen, 0, 0);
    tex.update(false);

    const mesh = MeshBuilder.CreateGround(
      "worldOverview",
      { width: SCENE_SIZE, height: SCENE_SIZE, subdivisions: 1 },
      scene,
    );
    mesh.position = new Vector3(SCENE_SIZE / 2, -0.2, SCENE_SIZE / 2);
    mesh.isPickable = false;

    const mat = new StandardMaterial("worldOverviewMat", scene);
    mat.diffuseTexture = tex;
    mat.specularColor  = Color3.Black();
    mat.ambientColor   = new Color3(1, 1, 1);
    mesh.material = mat;

    this.mesh = mesh;
    this.mat  = mat;
    this.tex  = tex;
  }

  setVisible(v: boolean) {
    if (this.visible === v) return;
    this.visible      = v;
    this.mesh.isVisible = v;
  }

  dispose() {
    this.tex.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
