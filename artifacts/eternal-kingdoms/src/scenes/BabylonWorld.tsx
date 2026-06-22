import { useEffect, useRef, useState, useCallback } from "react";
import {
  Engine, Scene, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, ShadowGenerator, GlowLayer,
} from "@babylonjs/core";
import { createIsometricCamera } from "./camera";
import { createTerrain } from "./terrain";
import { createMountains } from "./mountains";
import { createVegetation } from "./vegetation";
import { createRivers } from "./rivers";
import { createLandmarks, generateKingdomPositions } from "./landmarks";
import type { Kingdom } from "./landmarks";
import type { WorldState } from "../App";

interface Props { onStateChange: (u: (prev: WorldState) => WorldState) => void; }

function hasWebGL() {
  try {
    const c=document.createElement("canvas");
    return !!(c.getContext("webgl2")||c.getContext("webgl")||c.getContext("experimental-webgl"));
  } catch { return false; }
}

export function BabylonWorld({ onStateChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglError, setWebglError] = useState(false);

  const handleSelect = useCallback((k: Kingdom) => {
    onStateChange(prev => ({ ...prev, selected: { name:k.name, type:k.type, level:k.level } }));
  }, [onStateChange]);

  useEffect(() => {
    if (!hasWebGL()) { setWebglError(true); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let timers: ReturnType<typeof setTimeout>[] = [];

    let engine: Engine | null = null;
    try {
      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      });

      const scene = new Scene(engine);

      // ── Sky ────────────────────────────────────────────────────────────────
      scene.clearColor = new Color4(0.46, 0.68, 0.90, 1.0);

      // ── Soft fog ───────────────────────────────────────────────────────────
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogColor = new Color3(0.55, 0.72, 0.90);
      scene.fogStart = 260;
      scene.fogEnd   = 420;

      const { getState } = createIsometricCamera(scene, canvas);

      // ── Lighting ───────────────────────────────────────────────────────────
      const hemi = new HemisphericLight("hemi", new Vector3(0,1,0), scene);
      hemi.intensity   = 1.30;
      hemi.diffuse     = new Color3(1.0, 0.98, 0.92);
      hemi.groundColor = new Color3(0.50, 0.60, 0.35);
      hemi.specular    = Color3.Black();

      const sun = new DirectionalLight("sun", new Vector3(-0.5,-1.0,-0.4), scene);
      sun.intensity = 0.45;
      sun.diffuse   = new Color3(1.0, 0.92, 0.75);
      sun.specular  = Color3.Black();
      sun.position  = new Vector3(100, 180, 80);

      const sg = new ShadowGenerator(1024, sun);
      sg.useBlurExponentialShadowMap = true;
      sg.blurKernel = 12;
      sg.bias = 0.002;

      // ── Glow layer for magical structures ─────────────────────────────────
      const gl = new GlowLayer("glow", scene);
      gl.intensity = 0.7;

      // ── Build world synchronously then defer expensive passes ──────────────
      const kingdoms = generateKingdomPositions();
      const excl = [
        {x:0, z:0, r:28},        // Ancient Temple
        ...kingdoms.map(k=>({x:k.x, z:k.z, r:14})),
      ];

      createTerrain(scene);
      createRivers(scene);
      createLandmarks(scene, kingdoms, sg, gl, handleSelect);

      // Defer mountains + vegetation (expensive) so first frame paints fast
      timers.push(setTimeout(() => createMountains(scene, kingdoms.map(k=>({x:k.x,z:k.z}))), 120));
      timers.push(setTimeout(() => createVegetation(scene, excl), 350));

      // ── Render loop ────────────────────────────────────────────────────────
      let frame = 0;
      engine.runRenderLoop(() => {
        scene.render();
        if (frame++ % 20 === 0) {
          const { coordX, coordZ } = getState();
          onStateChange(prev => ({ ...prev, coords: { x: coordX, z: coordZ } }));
        }
      });

      const onResize = () => engine?.resize();
      window.addEventListener("resize", onResize);

      return () => {
        timers.forEach(t => clearTimeout(t));
        window.removeEventListener("resize", onResize);
        engine?.stopRenderLoop();
        scene.dispose();
        engine?.dispose();
      };
    } catch (err) {
      console.error("Babylon init error:", err);
      setWebglError(true);
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [handleSelect, onStateChange]);

  if (webglError) return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a1a0c]">
      <div className="mmo-panel p-8 max-w-md text-center">
        <div className="mmo-title text-2xl mb-3" style={{color:"#c9a227"}}>ETERNAL KINGDOMS</div>
        <div className="mmo-text text-sm opacity-60">WebGL required — open in a WebGL-capable browser.</div>
      </div>
    </div>
  );

  return (
    <canvas ref={canvasRef} id="babylon-canvas"
      className="w-full h-full block"
      style={{touchAction:"none",outline:"none",cursor:"grab"}}
      data-testid="babylon-canvas"
    />
  );
}
