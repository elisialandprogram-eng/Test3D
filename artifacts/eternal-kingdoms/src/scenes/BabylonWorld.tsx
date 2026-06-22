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

      // LOK sky — bright daylight blue
      scene.clearColor = new Color4(0.53, 0.74, 0.92, 1.0);
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogColor = new Color3(0.60, 0.78, 0.94);
      scene.fogStart = 230;
      scene.fogEnd = 380;

      const { getState } = createIsometricCamera(scene, canvas);

      // ── Lighting: LOK is very bright, flat, almost no shadows ─────────────────
      // Strong hemisphere = flat even brightness matching LOK's painted look
      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity    = 1.35;
      hemi.diffuse      = new Color3(1.0, 1.0, 0.96);
      hemi.groundColor  = new Color3(0.55, 0.65, 0.40);
      hemi.specular     = Color3.Black();

      // Weak sun just for very subtle depth on buildings
      const sun = new DirectionalLight("sun", new Vector3(-0.4, -1.0, -0.3), scene);
      sun.intensity = 0.28;
      sun.diffuse   = new Color3(1.0, 0.95, 0.80);
      sun.specular  = Color3.Black();
      sun.position  = new Vector3(80, 150, 60);

      // Shadow only for castles (not terrain)
      const sg = new ShadowGenerator(512, sun);
      sg.useBlurExponentialShadowMap = true;
      sg.blurKernel = 8;
      sg.bias = 0.003;

      const kingdoms = generateKingdomPositions();
      createTerrain(scene);
      createKingdoms(scene, kingdoms, sg, handleSelect);

      decTimer = setTimeout(() => {
        createDecorations(scene, kingdoms.map((k) => ({ x: k.x, z: k.z })));
      }, 250);

      let frame = 0;
      engine.runRenderLoop(() => {
        scene.render();
        if (frame++ % 20 === 0) {
          const { coordX, coordZ } = getState();
          onStateChange((prev: WorldState) => ({
            ...prev,
            coords: { x: coordX, z: coordZ },
          }));
        }
      });

      const onResize = () => engine?.resize();
      window.addEventListener("resize", onResize);

      return () => {
        if (decTimer) clearTimeout(decTimer);
        window.removeEventListener("resize", onResize);
        engine?.stopRenderLoop();
        scene.dispose();
        engine?.dispose();
      };
    } catch (err) {
      console.error("Babylon init error:", err);
      setWebglError(true);
      return () => { if (decTimer) clearTimeout(decTimer); };
    }
  }, [handleSelect, onStateChange]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1a4020, #0a1a0c)" }}>
        <div className="mmo-panel p-8 max-w-md text-center">
          <div className="mmo-title text-2xl mb-3" style={{ color: "#c9a227" }}>ETERNAL KINGDOMS</div>
          <div className="mmo-text text-sm opacity-60">WebGL required — open in a WebGL-capable browser.</div>
        </div>
      </div>
    );
  }

  return (
    <canvas
      id="babylon-canvas"
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: "none", outline: "none", cursor: "grab" }}
      data-testid="babylon-canvas"
    />
  );
}
