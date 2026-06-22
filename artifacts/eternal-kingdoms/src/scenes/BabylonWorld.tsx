import { useEffect, useRef, useCallback } from "react";
import {
  Engine,
  Scene,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  Vector3,
  Color3,
  Color4,
  GlowLayer,
  PointerEventTypes,
} from "@babylonjs/core";

import { createCamera, setupCameraControls, ViewMode } from "../engine/CameraEngine";
import { worldToCoord, getZone, WORLD_SIZE } from "../engine/CoordinateEngine";
import { createWorldFloor } from "../world/WorldFloor";
import { createCongress } from "../world/Congress";
import { initLandSystem } from "../systems/LandSystem";
import { initZoneSystem, setZoneOverlayVisible } from "../systems/ZoneSystem";
import { initKingdomSystem, setKingdomLabelsVisible } from "../systems/KingdomSystem";
import { initShrineSystem } from "../systems/ShrineSystem";
import { initResourceSystem } from "../systems/ResourceSystem";
import { initMonsterSystem } from "../systems/MonsterSystem";
import { initSelectionSystem, SelectionInfo } from "../systems/SelectionSystem";

export interface WorldStateUpdate {
  coord?: { x: number; y: number };
  zone?: string;
  viewMode?: ViewMode;
  selected?: SelectionInfo | null;
  cameraTarget?: { x: number; z: number };
  cameraRadius?: number;
}

interface BabylonWorldProps {
  onStateChange: (updater: (prev: WorldStateUpdate) => WorldStateUpdate) => void;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function BabylonWorld({ onStateChange }: BabylonWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleStateChange = useCallback(
    (partial: Partial<WorldStateUpdate>) => {
      onStateChange((prev) => ({ ...prev, ...partial }));
    },
    [onStateChange]
  );

  useEffect(() => {
    if (!hasWebGL()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: Engine | null = null;

    try {
      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      });

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.44, 0.67, 0.88, 1);
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogColor = new Color3(0.44, 0.67, 0.88);
      scene.fogStart = 2600;
      scene.fogEnd = 3400;

      const glow = new GlowLayer("WorldGlow", scene);
      glow.intensity = 0.7;

      const camera = createCamera(scene);
      camera.attachControl(canvas, true);
      scene.activeCamera = camera;

      const hemi = new HemisphericLight("HemiLight", new Vector3(0.2, 1, 0.3), scene);
      hemi.intensity = 1.2;
      hemi.diffuse = new Color3(1.0, 0.98, 0.92);
      hemi.groundColor = new Color3(0.35, 0.45, 0.28);

      const sun = new DirectionalLight("SunLight", new Vector3(-0.6, -1.5, -0.8).normalize(), scene);
      sun.intensity = 0.8;
      sun.diffuse = new Color3(1.0, 0.95, 0.8);
      sun.position = new Vector3(WORLD_SIZE / 2, 1200, WORLD_SIZE / 2);

      const shadowGen = new ShadowGenerator(512, sun);
      shadowGen.useBlurExponentialShadowMap = true;
      shadowGen.blurScale = 2;
      shadowGen.bias = 0.001;

      createWorldFloor(scene);
      initLandSystem();

      initZoneSystem(scene);
      setZoneOverlayVisible(false); // Zones hidden in FIELD view by default

      const congressMeshes = createCongress(scene);
      for (const m of congressMeshes) {
        try { shadowGen.addShadowCaster(m, false); } catch { /* skip */ }
      }

      const kingdoms = initKingdomSystem(scene);
      for (const k of kingdoms) {
        for (const m of k.meshes) {
          try { shadowGen.addShadowCaster(m, false); } catch { /* skip */ }
        }
      }

      const shrines = initShrineSystem(scene);
      for (const s of shrines) {
        for (const m of s.meshes) {
          try { shadowGen.addShadowCaster(m, false); } catch { /* skip */ }
        }
      }

      initResourceSystem(scene);
      initMonsterSystem(scene);

      initSelectionSystem(scene, (info) => {
        handleStateChange({ selected: info });
      });

      const _camControls = setupCameraControls(camera, scene, canvas, (mode) => {
        setZoneOverlayVisible(mode === "WORLD");
        handleStateChange({ viewMode: mode });
      });

      scene.onPointerObservable.add((info) => {
        if (info.type !== PointerEventTypes.POINTERMOVE) return;
        const evt = info.event as PointerEvent;
        const pick = scene.pick(evt.clientX, evt.clientY, (m) => m.name === "WorldFloor");
        if (pick?.hit && pick.pickedPoint) {
          const coord = worldToCoord(pick.pickedPoint.x, pick.pickedPoint.z);
          const zone = getZone(coord.x, coord.y);
          handleStateChange({ coord, zone: zone.name });
        }
      });

      engine.resize();

      let frame = 0;
      engine.runRenderLoop(() => {
        scene.render();
        frame++;
        if (frame % 6 === 0) {
          setKingdomLabelsVisible(camera, 650);
          handleStateChange({
            cameraTarget: { x: camera.target.x, z: camera.target.z },
            cameraRadius: camera.radius,
          });
        }
      });

      const onResize = () => engine!.resize();
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        engine!.stopRenderLoop();
        scene.dispose();
        engine!.dispose();
      };
    } catch (err) {
      console.error("[EternalKingdoms] Scene init failed:", err);
      engine?.dispose();
    }
  }, [handleStateChange]);

  return (
    <canvas
      ref={canvasRef}
      id="babylon-canvas"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
        outline: "none",
        touchAction: "none",
        cursor: "grab",
      }}
    />
  );
}
