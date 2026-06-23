import {
  Scene, MeshBuilder, StandardMaterial,
  DynamicTexture, Vector3, Color3,
} from "@babylonjs/core";
import { getTerrainColorWithNoise } from "../world/TerrainGen";
import {
  CHUNK_WORLD_SIZE, CHUNK_SCENE_SIZE, CHUNKS_PER_AXIS,
  CHUNK_TEX_SIZE, STREAM_RADIUS, UNLOAD_RADIUS,
} from "../world/WorldConfig";

interface LoadedChunk {
  cx: number;
  cy: number;
  mesh: ReturnType<typeof MeshBuilder.CreateGround>;
  mat: StandardMaterial;
  tex: DynamicTexture;
}

export class ChunkStreamer {
  private scene: Scene;
  private loaded = new Map<string, LoadedChunk>();
  private lastCX = -999;
  private lastCY = -999;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  private key(cx: number, cy: number) { return `${cx},${cy}`; }

  private buildChunk(cx: number, cy: number): void {
    // No bounds check — chunks generate at any position so terrain always fills
    // the viewport and world edges are never exposed.
    const k = this.key(cx, cy);
    if (this.loaded.has(k)) return;

    // ── Build texture ───────────────────────────────────────────────────────
    const offscreen = document.createElement("canvas");
    offscreen.width  = CHUNK_TEX_SIZE;
    offscreen.height = CHUNK_TEX_SIZE;
    const ctx2d = offscreen.getContext("2d")!;
    const img   = ctx2d.createImageData(CHUNK_TEX_SIZE, CHUNK_TEX_SIZE);
    const data  = img.data;
    const ppc   = CHUNK_TEX_SIZE / CHUNK_WORLD_SIZE; // pixels per coord

    for (let py = 0; py < CHUNK_TEX_SIZE; py++) {
      for (let px = 0; px < CHUNK_TEX_SIZE; px++) {
        const wx = cx * CHUNK_WORLD_SIZE + Math.floor(px / ppc);
        const wy = cy * CHUNK_WORLD_SIZE + Math.floor(py / ppc);
        const [r, g, b] = getTerrainColorWithNoise(wx, wy);
        const i = (py * CHUNK_TEX_SIZE + px) * 4;
        data[i]     = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx2d.putImageData(img, 0, 0);

    // ── Babylon DynamicTexture ──────────────────────────────────────────────
    const tex = new DynamicTexture(
      `cTex_${k}`,
      { width: CHUNK_TEX_SIZE, height: CHUNK_TEX_SIZE },
      this.scene,
      false,
    );
    tex.getContext().drawImage(offscreen, 0, 0);
    tex.update(false);

    // ── Ground mesh ─────────────────────────────────────────────────────────
    const scX = cx * CHUNK_SCENE_SIZE + CHUNK_SCENE_SIZE / 2;
    const scZ = cy * CHUNK_SCENE_SIZE + CHUNK_SCENE_SIZE / 2;

    const mesh = MeshBuilder.CreateGround(
      `chunk_${k}`,
      { width: CHUNK_SCENE_SIZE, height: CHUNK_SCENE_SIZE, subdivisions: 1 },
      this.scene,
    );
    mesh.position = new Vector3(scX, 0, scZ);
    mesh.isPickable = true;

    const mat = new StandardMaterial(`cMat_${k}`, this.scene);
    mat.diffuseTexture  = tex;
    mat.specularColor   = new Color3(0, 0, 0);
    mat.ambientColor    = new Color3(1, 1, 1);
    mesh.material = mat;

    this.loaded.set(k, { cx, cy, mesh, mat, tex });
  }

  private dropChunk(k: string): void {
    const c = this.loaded.get(k);
    if (!c) return;
    c.tex.dispose();
    c.mat.dispose();
    c.mesh.dispose();
    this.loaded.delete(k);
  }

  update(camTarget: Vector3): void {
    const cx = Math.floor(camTarget.x / CHUNK_SCENE_SIZE);
    const cy = Math.floor(camTarget.z / CHUNK_SCENE_SIZE);
    if (cx === this.lastCX && cy === this.lastCY) return;
    this.lastCX = cx;
    this.lastCY = cy;

    // Load nearby
    for (let dy = -STREAM_RADIUS; dy <= STREAM_RADIUS; dy++) {
      for (let dx = -STREAM_RADIUS; dx <= STREAM_RADIUS; dx++) {
        this.buildChunk(cx + dx, cy + dy);
      }
    }

    // Unload distant
    for (const [k, c] of this.loaded) {
      const dist = Math.max(Math.abs(c.cx - cx), Math.abs(c.cy - cy));
      if (dist > UNLOAD_RADIUS) this.dropChunk(k);
    }
  }

  dispose(): void {
    for (const k of [...this.loaded.keys()]) this.dropChunk(k);
  }
}
