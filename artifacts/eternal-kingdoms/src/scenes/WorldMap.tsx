import {
  useRef, useEffect, useCallback, forwardRef, useImperativeHandle,
} from "react";
import {
  Engine, Scene, HemisphericLight, DirectionalLight,
  Vector3, Color4, Color3, Mesh, MeshBuilder,
  StandardMaterial, DynamicTexture, Texture,
} from "@babylonjs/core";
import { createWorldCamera } from "../engine/WorldCamera";
import { ChunkStreamer } from "../engine/ChunkStreamer";
import { sceneToWorld, getZoneId, getLandId } from "../world/CoordSystem";
import { worldToScene } from "../world/CoordSystem";
import { TILE_SCALE, SCENE_SIZE } from "../world/WorldConfig";
import type { PlacedAsset, AssetDef } from "../editor/types";

export interface HoverInfo {
  x: number;
  y: number;
  zoneId: number;
  landId: number;
}

export interface WorldMapHandle {
  placeAsset(placed: PlacedAsset, library: Map<string, AssetDef>): void;
  removeAsset(id: string): void;
  updateAsset(placed: PlacedAsset): void;
  clearAll(): void;
  loadAll(assets: PlacedAsset[], library: Map<string, AssetDef>): void;
}

interface WorldMapProps {
  onHover?: (info: HoverInfo | null) => void;
  editorMode?: boolean;
  selectedAssetId?: string | null;
  onTerrainClick?: (wx: number, wy: number) => void;
  onAssetSelect?: (id: string | null) => void;
}

function makeTextureFromDataUrl(
  dataUrl: string,
  name: string,
  scene: Scene,
): Promise<DynamicTexture> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const tex = new DynamicTexture(name, { width: img.width, height: img.height }, scene, false);
      tex.getContext().drawImage(img, 0, 0);
      tex.update(false);
      tex.hasAlpha = true;
      resolve(tex);
    };
    img.src = dataUrl;
  });
}

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(
  ({ onHover, editorMode, selectedAssetId, onTerrainClick, onAssetSelect }, ref) => {
    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const sceneRef   = useRef<Scene | null>(null);
    const streamerRef = useRef<ChunkStreamer | null>(null);
    const assetMeshes = useRef<Map<string, Mesh>>(new Map());
    const assetTextures = useRef<Map<string, DynamicTexture>>(new Map());

    // ── Imperative API exposed to AdminMapEditor ───────────────────────────
    useImperativeHandle(ref, () => ({
      async placeAsset(placed: PlacedAsset, library: Map<string, AssetDef>) {
        const scene = sceneRef.current;
        if (!scene) return;
        const assetDef = library.get(placed.assetId);
        if (!assetDef) return;

        const { sx, sz } = worldToScene(placed.x, placed.y);

        // Reuse texture if already loaded for this asset type
        let tex = assetTextures.current.get(placed.assetId);
        if (!tex) {
          tex = await makeTextureFromDataUrl(assetDef.dataUrl, `aTex_${placed.assetId}`, scene);
          assetTextures.current.set(placed.assetId, tex);
        }

        const size = TILE_SCALE * 3 * placed.scale;
        const mesh = MeshBuilder.CreatePlane(`aSprite_${placed.id}`, { size }, scene);
        mesh.position = new Vector3(sx, size * 0.5, sz);
        mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
        mesh.metadata = { placedId: placed.id };

        const mat = new StandardMaterial(`aMat_${placed.id}`, scene);
        mat.diffuseTexture = tex;
        mat.useAlphaFromDiffuseTexture = true;
        mat.backFaceCulling = false;
        mat.specularColor = Color3.Black();
        mesh.material = mat;

        assetMeshes.current.set(placed.id, mesh);
      },

      removeAsset(id: string) {
        const mesh = assetMeshes.current.get(id);
        if (!mesh) return;
        mesh.material?.dispose();
        mesh.dispose();
        assetMeshes.current.delete(id);
      },

      updateAsset(placed: PlacedAsset) {
        const mesh = assetMeshes.current.get(placed.id);
        if (!mesh) return;
        const { sx, sz } = worldToScene(placed.x, placed.y);
        const size = TILE_SCALE * 3 * placed.scale;
        mesh.position.x = sx;
        mesh.position.z = sz;
        mesh.position.y = size * 0.5;
        mesh.scaling.setAll(placed.scale);
        mesh.rotation.y = (placed.rotation * Math.PI) / 180;
      },

      clearAll() {
        for (const [id] of assetMeshes.current) {
          const mesh = assetMeshes.current.get(id)!;
          mesh.material?.dispose();
          mesh.dispose();
        }
        assetMeshes.current.clear();
      },

      async loadAll(assets: PlacedAsset[], library: Map<string, AssetDef>) {
        this.clearAll();
        for (const p of assets) this.placeAsset(p, library);
      },
    }));

    // ── Scene setup ────────────────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = new Engine(canvas, true, { antialias: true, stencil: true });
      const scene  = new Scene(engine);
      sceneRef.current = scene;

      scene.clearColor = new Color4(0.09, 0.11, 0.17, 1);

      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity = 1.3;
      hemi.groundColor = new Color3(0.4, 0.4, 0.4);

      const sun = new DirectionalLight("sun", new Vector3(-1, -2, -0.5), scene);
      sun.intensity = 0.5;

      const cam = createWorldCamera(scene, canvas);

      const streamer = new ChunkStreamer(scene);
      streamerRef.current = streamer;
      streamer.update(cam.target);

      engine.runRenderLoop(() => {
        streamer.update(cam.target);
        scene.render();
      });

      const onResize = () => engine.resize();
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        streamer.dispose();
        scene.dispose();
        engine.dispose();
        sceneRef.current = null;
      };
    }, []);

    // ── Pointer events ─────────────────────────────────────────────────────
    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!onHover) return;
        const scene = sceneRef.current;
        if (!scene) return;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const pick = scene.pick(e.clientX - rect.left, e.clientY - rect.top);
        if (pick?.hit && pick.pickedPoint) {
          const { x, y } = sceneToWorld(pick.pickedPoint.x, pick.pickedPoint.z);
          onHover({ x, y, zoneId: getZoneId(x, y), landId: getLandId(x, y) });
        } else {
          onHover(null);
        }
      },
      [onHover],
    );

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        const scene = sceneRef.current;
        if (!scene) return;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const pick = scene.pick(e.clientX - rect.left, e.clientY - rect.top);
        if (!pick?.hit || !pick.pickedPoint) return;

        if (editorMode) {
          const meta = pick.pickedMesh?.metadata as { placedId?: string } | null;
          if (meta?.placedId) {
            onAssetSelect?.(meta.placedId);
          } else {
            const { x, y } = sceneToWorld(pick.pickedPoint.x, pick.pickedPoint.z);
            onTerrainClick?.(x, y);
          }
        }
      },
      [editorMode, onTerrainClick, onAssetSelect],
    );

    return (
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      />
    );
  },
);

WorldMap.displayName = "WorldMap";
