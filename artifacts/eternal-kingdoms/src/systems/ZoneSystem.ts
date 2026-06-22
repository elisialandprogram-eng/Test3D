import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  Mesh,
  DynamicTexture,
} from "@babylonjs/core";
import { ZONE_GRID, ZONE_SIZE, getZoneBounds } from "../engine/CoordinateEngine";
import { createLabel } from "../engine/AssetManager";

export interface ZoneData {
  name: string;
  col: number;
  row: number;
  centerX: number;
  centerY: number;
  overlay: Mesh;
  label: Mesh;
}

const ZONE_COLORS = [
  new Color3(0.8, 0.2, 0.2),
  new Color3(0.2, 0.6, 0.9),
  new Color3(0.9, 0.6, 0.1),
  new Color3(0.5, 0.2, 0.8),
  new Color3(0.2, 0.75, 0.4),
  new Color3(0.85, 0.3, 0.6),
  new Color3(0.1, 0.7, 0.8),
  new Color3(0.7, 0.7, 0.1),
];

let _zones: ZoneData[] = [];

export function initZoneSystem(scene: Scene): ZoneData[] {
  _zones = [];

  for (let row = 0; row < ZONE_GRID; row++) {
    for (let col = 0; col < ZONE_GRID; col++) {
      const bounds = getZoneBounds(col, row);
      const letter = String.fromCharCode(65 + col);
      const name = `${letter}${row + 1}`;
      const cx = bounds.centerX;
      const cy = bounds.centerY;

      const overlay = MeshBuilder.CreateGround(
        `Zone_${name}`,
        { width: ZONE_SIZE - 4, height: ZONE_SIZE - 4, subdivisions: 1 },
        scene
      );
      overlay.position = new Vector3(cx, 0.5, cy);

      const mat = new StandardMaterial(`ZoneMat_${name}`, scene);
      const color = ZONE_COLORS[(col + row * 3) % ZONE_COLORS.length];
      mat.diffuseColor = color;
      mat.emissiveColor = color.scale(0.3);
      mat.alpha = 0.22;
      mat.backFaceCulling = false;
      mat.disableLighting = false;
      overlay.material = mat;
      overlay.setEnabled(false);
      overlay.isPickable = false;

      const labelPlane = createLabel(
        name,
        new Vector3(cx, 8, cy),
        scene,
        72,
        "rgba(255,255,255,0.95)",
        "rgba(0,0,0,0.5)"
      );
      labelPlane.setEnabled(false);
      labelPlane.isPickable = false;

      _zones.push({ name, col, row, centerX: cx, centerY: cy, overlay, label: labelPlane });
    }
  }

  return _zones;
}

export function setZoneOverlayVisible(visible: boolean): void {
  for (const z of _zones) {
    z.overlay.setEnabled(visible);
    z.label.setEnabled(visible);
  }
}

export function getZones(): ZoneData[] {
  return _zones;
}

export function getZoneByCoord(x: number, y: number): ZoneData | null {
  const col = Math.min(ZONE_GRID - 1, Math.floor(x / ZONE_SIZE));
  const row = Math.min(ZONE_GRID - 1, Math.floor(y / ZONE_SIZE));
  return _zones.find((z) => z.col === col && z.row === row) ?? null;
}
