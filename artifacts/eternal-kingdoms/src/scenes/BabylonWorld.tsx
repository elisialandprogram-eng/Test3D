import { useEffect, useRef, useState, useCallback } from "react";
import {
  Engine,
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  ShadowGenerator,
} from "@babylonjs/core";
import { createIsometricCamera } from "./camera";
import { createTerrain } from "./terrain";
import { createDecorations } from "./decorations";
import { createKingdoms, generateKingdomPositions } from "./kingdoms";
import type { Kingdom } from "./kingdoms";
import type { WorldState } from "../App";

interface BabylonWorldProps {
  onStateChange: (updater: (prev: WorldState) => WorldState) => void;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch { return false; }
}

export function BabylonWorld({ onStateChange }: BabylonWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglError, setWebglError] = useState(false);

  const handleSelect = useCallback((k: Kingdom) => {
    onStateChange((prev: WorldState) => ({
      ...prev,
      selected: { name: k.name, type: k.type, level: k.level },
    }));
  }, [onStateChange]);

  useEffect(() => {
    if (!hasWebGL()) { setWebglError(true); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let decTimer: ReturnType<typeof setTimeout> | null = null;
    let engine: Engine | null = null;

    try {
      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      });

      const scene = new Scene(engine);

      // LOK sky: bright blue sky
      scene.clearColor = new Color4(0.48, 0.68, 0.88, 1.0);

      // Very subtle fog (LOK has a clean horizon)
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogColor = new Color3(0.58, 0.75, 0.90);
      scene.fogStart = 200;
      scene.fogEnd = 350;

      const { camera, getState } = createIsometricCamera(scene, canvas);

      // Bright daylight lighting matching LOK
      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity = 1.1;
      hemi.diffuse = new Color3(1.0, 0.97, 0.90);
      hemi.groundColor = new Color3(0.35, 0.45, 0.28);
      hemi.specular = new Color3(0.05, 0.05, 0.05);

      const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.4), scene);
      sun.intensity = 0.75;
      sun.diffuse = new Color3(1.0, 0.95, 0.80);
      sun.specular = new Color3(0.05, 0.05, 0.04);
      sun.position = new Vector3(80, 150, 60);

      const shadowGen = new ShadowGenerator(1024, sun);
      shadowGen.useBlurExponentialShadowMap = true;
      shadowGen.blurKernel = 12;
      shadowGen.bias = 0.002;

      const kingdoms = generateKingdomPositions();
      createTerrain(scene);
      createKingdoms(scene, kingdoms, shadowGen, handleSelect);

      decTimer = setTimeout(() => {
        createDecorations(scene, kingdoms.map((k) => ({ x: k.x, z: k.z })));
      }, 200);

      let frameCount = 0;
      engine.runRenderLoop(() => {
        scene.render();
        frameCount++;
        if (frameCount % 20 === 0) {
          const { zoom } = getState();
          const target = camera.target;
          onStateChange((prev: WorldState) => ({
            ...prev,
            coords: { x: Math.round(target.x * 10) / 10, z: Math.round(target.z * 10) / 10 },
            zoom,
          }));
        }
      });

      const handleResize = () => engine?.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        if (decTimer) clearTimeout(decTimer);
        window.removeEventListener("resize", handleResize);
        engine?.stopRenderLoop();
        scene.dispose();
        engine?.dispose();
      };
    } catch (err) {
      console.error("Babylon.js init error:", err);
      setWebglError(true);
      return () => { if (decTimer) clearTimeout(decTimer); };
    }
  }, [handleSelect, onStateChange]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse, #1a4020 0%, #0a1a0c 100%)" }}>
        <div className="mmo-panel p-8 max-w-md text-center">
          <div className="mmo-title text-2xl mb-3" style={{ color: "#c9a227" }}>ETERNAL KINGDOMS</div>
          <div className="mmo-text text-sm opacity-60">WebGL is required to render the world map.</div>
        </div>
      </div>
    );
  }

  return (
    <canvas
      id="babylon-canvas"
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: "none", outline: "none" }}
      data-testid="babylon-canvas"
    />
  );
}
