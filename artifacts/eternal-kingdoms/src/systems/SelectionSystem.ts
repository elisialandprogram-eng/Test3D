import {
  Scene,
  PointerEventTypes,
  Mesh,
  HighlightLayer,
  Color3,
  AbstractMesh,
} from "@babylonjs/core";

export interface SelectionInfo {
  entityType: string;
  name?: string;
  coord?: { x: number; y: number };
  level?: number;
  tier?: string;
  resourceType?: string;
  custom?: Record<string, unknown>;
}

let _highlightLayer: HighlightLayer | null = null;
let _selectedMeshes: AbstractMesh[] = [];
let _onSelect: ((info: SelectionInfo | null) => void) | null = null;

export function initSelectionSystem(
  scene: Scene,
  onSelect: (info: SelectionInfo | null) => void
): void {
  _onSelect = onSelect;

  _highlightLayer = new HighlightLayer("SelectionHL", scene, {
    blurHorizontalSize: 0.5,
    blurVerticalSize: 0.5,
  });

  scene.onPointerObservable.add((info) => {
    if (info.type !== PointerEventTypes.POINTERTAP) return;
    const evt = info.event as PointerEvent;
    if (evt.button !== 0) return;

    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) => mesh.isPickable && mesh.name !== "WorldFloor" && !mesh.name.startsWith("Zone_") && !mesh.name.startsWith("plane_")
    );

    clearSelection();

    if (pick?.hit && pick.pickedMesh) {
      const mesh = pick.pickedMesh;
      const meta = mesh.metadata;
      if (!meta || !meta.entityType) return;

      highlightMeshGroup(mesh, scene);

      const selInfo: SelectionInfo = {
        entityType: meta.entityType,
        name: meta.name,
        coord: meta.coord,
        level: meta.level,
        tier: meta.tier,
        resourceType: meta.resourceType,
      };

      _onSelect?.(selInfo);
    } else {
      _onSelect?.(null);
    }
  });
}

function highlightMeshGroup(mesh: AbstractMesh, scene: Scene): void {
  const entityType = mesh.metadata?.entityType;
  const coord = mesh.metadata?.coord;

  const groupMeshes = scene.meshes.filter((m) => {
    if (!m.isEnabled() || !m.metadata) return false;
    if (m.name.startsWith("plane_") || m.name.startsWith("Zone_")) return false;
    const meta = m.metadata;
    if (meta.entityType !== entityType) return false;
    if (coord && meta.coord) {
      return meta.coord.x === coord.x && meta.coord.y === coord.y;
    }
    return m === mesh;
  });

  for (const m of groupMeshes) {
    try {
      _highlightLayer?.addMesh(m as Mesh, Color3.Yellow());
      _selectedMeshes.push(m);
    } catch {
    }
  }
}

function clearSelection(): void {
  if (_highlightLayer) {
    for (const m of _selectedMeshes) {
      try {
        _highlightLayer.removeMesh(m as Mesh);
      } catch {
      }
    }
  }
  _selectedMeshes = [];
}

export function clearSelectionExternal(): void {
  clearSelection();
  _onSelect?.(null);
}
