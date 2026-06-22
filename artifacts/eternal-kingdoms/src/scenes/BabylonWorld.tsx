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
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
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
    if (!hasWebGL()) {
      setWebglError(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: Engine | null = null;
    let decTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      });

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.38, 0.52, 0.72, 1.0);
      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogColor = new Color3(0.48, 0.60, 0.78);
      scene.fogDensity = 0.0042;

      const { camera, getState } = createIsometricCamera(scene, canvas);

      const hemi = new HemisphericLight("hemi", new Vector3(0.3, 1, 0.3), scene);
      hemi.intensity = 0.82;
      hemi.diffuse = new Color3(1.0, 0.95, 0.85);
      hemi.groundColor = new Color3(0.28, 0.35, 0.22);
      hemi.specular = new Color3(0.1, 0.1, 0.1);

      const sun = new DirectionalLight("sun", new Vector3(-0.6, -1, -0.5), scene);
      sun.intensity = 1.1;
      sun.diffuse = new Color3(1.0, 0.92, 0.78);
      sun.specular = new Color3(0.15, 0.12, 0.08);
      sun.position = new Vector3(60, 120, 50);

      const shadowGen = new ShadowGenerator(1024, sun);
      shadowGen.useBlurExponentialShadowMap = true;
      shadowGen.blurKernel = 16;
      shadowGen.bias = 0.001;

      const kingdoms = generateKingdomPositions();
      createTerrain(scene);
      createKingdoms(scene, kingdoms, shadowGen, handleSelect);

      decTimer = setTimeout(() => {
        createDecorations(scene, kingdoms.map((k) => ({ x: k.x, z: k.z })));
      }, 300);

      let frameCount = 0;
      engine.runRenderLoop(() => {
        scene.render();
        frameCount++;
        if (frameCount % 20 === 0) {
          const camState = getState();
          const target = camera.target;
          onStateChange((prev: WorldState) => ({
            ...prev,
            coords: {
              x: Math.round(target.x * 10) / 10,
              z: Math.round(target.z * 10) / 10,
            },
            zoom: camState.zoom,
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
      return () => {
        if (decTimer) clearTimeout(decTimer);
      };
    }
  }, [handleSelect, onStateChange]);

  if (webglError) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at center, #1a3520 0%, #0d1f0e 50%, #060d07 100%)",
        }}
      >
        <div
          className="mmo-panel p-8 max-w-md text-center"
          style={{ border: "1px solid rgba(201,162,39,0.5)" }}
        >
          <div className="mmo-title text-2xl mb-3" style={{ color: "#c9a227" }}>
            ETERNAL KINGDOMS
          </div>
          <div className="mmo-text text-base opacity-70 mb-4">
            WebGL is required to render the world map.
          </div>
          <div className="mmo-text text-sm opacity-50">
            Please open this app in a browser with WebGL support enabled.
          </div>
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
