import { useState, useCallback, useRef } from "react";
import type { AssetDef, PlacedAsset, LayerName, MapData } from "./types";
import { LAYERS } from "./types";

let assetCounter   = 1;
let placedCounter  = 1;

export function useMapEditor() {
  const [library, setLibrary]           = useState<AssetDef[]>([]);
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId]       = useState<string | null>(null);
  const [activeLayer, setActiveLayer]           = useState<LayerName>("vegetation");

  // Keep a ref map for library lookup (avoids stale-closure issues)
  const libraryMap = useRef<Map<string, AssetDef>>(new Map());

  // ── Asset library ────────────────────────────────────────────────────────
  const uploadAsset = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const id = `asset_${assetCounter++}`;
      const def: AssetDef = { id, name: file.name.replace(/\.[^.]+$/, ""), dataUrl };
      libraryMap.current.set(id, def);
      setLibrary(prev => [...prev, def]);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeFromLibrary = useCallback((assetId: string) => {
    libraryMap.current.delete(assetId);
    setLibrary(prev => prev.filter(a => a.id !== assetId));
    setPlacedAssets(prev => prev.filter(p => p.assetId !== assetId));
    if (activeAssetId === assetId) setActiveAssetId(null);
  }, [activeAssetId]);

  // ── Placement ────────────────────────────────────────────────────────────
  const placedRef = useRef<PlacedAsset[]>([]);

  const placeAtCoord = useCallback((wx: number, wy: number): PlacedAsset | null => {
    if (!activeAssetId) return null;
    const placed: PlacedAsset = {
      id: `placed_${placedCounter++}`,
      assetId: activeAssetId,
      x: wx,
      y: wy,
      rotation: 0,
      scale: 1,
      layer: activeLayer,
    };
    placedRef.current = [...placedRef.current, placed];
    setPlacedAssets(placedRef.current);
    return placed;
  }, [activeAssetId, activeLayer]);

  const updatePlaced = useCallback((id: string, patch: Partial<PlacedAsset>): PlacedAsset | null => {
    let updated: PlacedAsset | null = null;
    placedRef.current = placedRef.current.map(p => {
      if (p.id !== id) return p;
      updated = { ...p, ...patch };
      return updated;
    });
    setPlacedAssets(placedRef.current);
    return updated;
  }, []);

  const deletePlaced = useCallback((id: string) => {
    placedRef.current = placedRef.current.filter(p => p.id !== id);
    setPlacedAssets(placedRef.current);
    if (selectedPlacedId === id) setSelectedPlacedId(null);
  }, [selectedPlacedId]);

  const clearAllPlaced = useCallback(() => {
    placedRef.current = [];
    setPlacedAssets([]);
    setSelectedPlacedId(null);
  }, []);

  // ── Save / Load ──────────────────────────────────────────────────────────
  const saveMap = useCallback(() => {
    const data: MapData = { world: "1", assets: placedRef.current };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = "map_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const loadMap = useCallback((json: string): PlacedAsset[] => {
    try {
      const data: MapData = JSON.parse(json);
      placedRef.current = data.assets ?? [];
      setPlacedAssets(placedRef.current);
      setSelectedPlacedId(null);
      return placedRef.current;
    } catch {
      alert("Invalid map JSON.");
      return [];
    }
  }, []);

  const selectedAsset = placedAssets.find(p => p.id === selectedPlacedId) ?? null;

  return {
    library,
    libraryMap: libraryMap.current,
    placedAssets,
    selectedPlacedId,
    selectedAsset,
    activeAssetId,
    activeLayer,

    setSelectedPlacedId,
    setActiveAssetId,
    setActiveLayer,

    uploadAsset,
    removeFromLibrary,
    placeAtCoord,
    updatePlaced,
    deletePlaced,
    clearAllPlaced,
    saveMap,
    loadMap,
  };
}
