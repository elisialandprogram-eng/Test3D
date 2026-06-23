export type LayerName = "ground_deco" | "vegetation" | "resources" | "structures" | "special";

export const LAYERS: LayerName[] = [
  "ground_deco",
  "vegetation",
  "resources",
  "structures",
  "special",
];

export interface AssetDef {
  id: string;
  name: string;
  dataUrl: string;
}

export interface PlacedAsset {
  id: string;
  assetId: string;
  x: number;        // world X
  y: number;        // world Y
  rotation: number; // degrees
  scale: number;
  layer: LayerName;
}

export interface MapData {
  world: string;
  assets: PlacedAsset[];
}
