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
  ArcRotateCamera,
  MeshBuilder,
  StandardMaterial,
  PointerEventTypes,
} from "@babylonjs/core";

import { setupCameraControls, ViewMode } from "../engine/CameraEngine";
import { worldToCoord, getZone, WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";
import { createWorldFloor } from "../world/WorldFloor";
import { createCongress } from "../world/Congress";
import { initLandSystem } from "../systems/LandSystem";
import { initZoneSystem, setZoneOverlayVisible } from "../systems/ZoneSystem";
import { initKingdomSystem, setKingdomLabelsVisible } from "../systems/KingdomSystem";
import { initShrineSystem } from "../systems/ShrineSystem";
import { initResourceSystem } from "../systems/ResourceSystem";
import { initMonsterSystem } from "../systems/MonsterSystem";
import { initSelectionSystem, SelectionInfo } from "../systems/SelectionSystem";
import { initKingdomCitySystem, getCityMeshes } from "../systems/KingdomCitySystem";

export interface WorldStateUpdate {
  coord?: { x: number; y: number };
  zone?: string;
  viewMode?: ViewMode;
  selected?: SelectionInfo | null;
  cameraTarget?: { x: number; z: number };
  cameraRadius?: number;
}

export interface CameraControls {
  setViewMode: (mode: ViewMode) => void;
  flyTo: (x: number, z: number, radius?: number) => void;
}

interface BabylonWorldProps {
  onStateChange: (updater: (prev: WorldStateUpdate) => WorldStateUpdate) => void;
  onCameraReady?: (controls: CameraControls) => void;
}

export function BabylonWorld({ onStateChange, onCameraReady }: BabylonWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  const handleStateChange = useCallback(
    (partial: Partial<WorldStateUpdate>) => {
      onStateChange((prev) => ({ ...prev, ...partial }));
    },
    [onStateChange]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas has pixel dimensions before engine init
    canvas.width  = canvas.clientWidth  || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;

    let engine: Engine;
    let scene: Scene;

    try {
      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: false,
        stencil: true,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
        alpha: false,
      });
      engineRef.current = engine;
    } catch (err) {
      console.error("[EK] Engine creation failed:", err);
      return;
    }

    try {
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.44, 0.67, 0.88, 1);
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogColor = new Color3(0.44, 0.67, 0.88);
      scene.fogStart = 2600;
      scene.fogEnd = 3400;

      // Camera
      const camera = new ArcRotateCamera(
        "MainCamera",
        -Math.PI / 4,
        Math.PI / 3.5,
        250,
        new Vector3(WORLD_CENTER.x, 0, WORLD_CENTER.y),
        scene
      );
      camera.lowerRadiusLimit = 20;
      camera.upperRadiusLimit = 2500;
      camera.lowerBetaLimit = 0.18;
      camera.upperBetaLimit = Math.PI / 2.05;
      camera.wheelPrecision = 0.3;
      camera.inputs.removeByType("ArcRotateCameraPointersInput");
      camera.attachControl(canvas, true);
      scene.activeCamera = camera;

      // Lighting
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
      shadowGen.bias = 0.001;

      // Glow
      const glow = new GlowLayer("WorldGlow", scene);
      glow.intensity = 0.7;

      // World content — each step wrapped individually to catch errors
      try { createWorldFloor(scene); } catch (e) { console.error("[EK] WorldFloor:", e); }
      try { initLandSystem(); }      catch (e) { console.error("[EK] LandSystem:", e); }
      try { initZoneSystem(scene); setZoneOverlayVisible(false); } catch (e) { console.error("[EK] ZoneSystem:", e); }

      let congressMeshes: any[] = [];
      try { congressMeshes = createCongress(scene); } catch (e) { console.error("[EK] Congress:", e); }
      for (const m of congressMeshes) { try { shadowGen.addShadowCaster(m, false); } catch {} }

      let kingdoms: any[] = [];
      try { kingdoms = initKingdomSystem(scene); } catch (e) { console.error("[EK] KingdomSystem:", e); }
      for (const k of kingdoms) {
        for (const m of k.meshes) { try { shadowGen.addShadowCaster(m, false); } catch {} }
      }
      try { initKingdomCitySystem(kingdoms, scene); } catch (e) { console.error("[EK] KingdomCitySystem:", e); }
      for (const m of getCityMeshes()) { try { shadowGen.addShadowCaster(m, false); } catch {} }

      try { initShrineSystem(scene); }    catch (e) { console.error("[EK] ShrineSystem:", e); }
      try { initResourceSystem(scene); }  catch (e) { console.error("[EK] ResourceSystem:", e); }
      try { initMonsterSystem(scene); }   catch (e) { console.error("[EK] MonsterSystem:", e); }

      try {
        initSelectionSystem(scene, (info) => handleStateChange({ selected: info }));
      } catch (e) { console.error("[EK] SelectionSystem:", e); }

      // Camera controls
      const camControls = setupCameraControls(camera, scene, canvas, (mode) => {
        setZoneOverlayVisible(mode === "WORLD");
        handleStateChange({ viewMode: mode });
      });

      const controls: CameraControls = {
        setViewMode: (mode: ViewMode) => {
          if (mode === "WORLD") {
            camera.radius = 1800;
          } else if (mode === "FIELD") {
            camera.radius = 250;
            camera.beta = Math.PI / 3.5;
          } else if (mode === "KINGDOM") {
            // Top-down isometric view for kingdom detail
            camera.radius = 180;
            camera.beta = Math.PI / 2.3;
          }
          setZoneOverlayVisible(mode === "WORLD");
          handleStateChange({ viewMode: mode });
        },
        flyTo: (x: number, z: number, radius?: number) => {
          camera.target.x = x;
          camera.target.z = z;
          if (radius !== undefined) camera.radius = radius;
        },
      };

      onCameraReady?.(controls);

      // Pointer move for coordinate tracking
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

      // Render loop
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

      console.log("[EK] Scene initialized successfully");
    } catch (err) {
      console.error("[EK] Scene setup failed:", err);
    }

    const onResize = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      engineRef.current?.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engineRef.current?.stopRenderLoop();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [handleStateChange, onCameraReady]);

  return (
    <canvas
      ref={canvasRef}
      id="babylon-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        outline: "none",
        touchAction: "none",
      }}
    />
  );
}
