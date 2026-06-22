import { Scene, Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, DynamicTexture } from "@babylonjs/core";
import { coordToWorld } from "./CoordinateEngine";

export interface SpawnedAsset {
  id: string;
  type: string;
  coord: { x: number; y: number };
  mesh: Mesh;
  data?: Record<string, unknown>;
}

const registry = new Map<string, SpawnedAsset>();

export function spawnAsset(
  type: string,
  x: number,
  y: number,
  scene: Scene,
  data?: Record<string, unknown>
): SpawnedAsset {
  const id = `${type}_${x}_${y}_${Math.random().toString(36).slice(2, 7)}`;
  const pos = coordToWorld(x, y, 0);
  const mesh = MeshBuilder.CreateBox(`asset_${id}`, { size: 1 }, scene);
  mesh.position = new Vector3(pos.x, pos.y, pos.z);
  mesh.metadata = { assetId: id, type, coord: { x, y }, ...(data || {}) };

  const asset: SpawnedAsset = { id, type, coord: { x, y }, mesh, data };
  registry.set(id, asset);
  return asset;
}

export function getRegistry() {
  return registry;
}

export function createLabel(
  text: string,
  position: Vector3,
  scene: Scene,
  fontSize = 48,
  color = "white",
  bgColor?: string
): Mesh {
  const texWidth = Math.max(256, text.length * (fontSize * 0.65));
  const texHeight = fontSize * 2.2;

  const texture = new DynamicTexture(`lbl_${text}`, { width: texWidth, height: texHeight }, scene);
  texture.hasAlpha = true;

  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, texWidth, texHeight);

  if (bgColor) {
    ctx.fillStyle = bgColor;
    const pad = 8;
    ctx.roundRect(pad, pad, texWidth - pad * 2, texHeight - pad * 2, 4);
    ctx.fill();
  }

  ctx.font = `bold ${fontSize}px Cinzel, serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;
  ctx.fillText(text, texWidth / 2, texHeight / 2);
  texture.update();

  const aspectRatio = texWidth / texHeight;
  const plane = MeshBuilder.CreatePlane(`plane_${text}`, { width: aspectRatio * 12, height: 12 }, scene);
  plane.position = position;
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;

  const mat = new StandardMaterial(`mat_lbl_${text}`, scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  plane.material = mat;

  return plane;
}
