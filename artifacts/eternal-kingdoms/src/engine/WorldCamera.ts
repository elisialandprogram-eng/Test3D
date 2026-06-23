import {
  ArcRotateCamera, Vector3, Scene, PointerEventTypes,
} from "@babylonjs/core";
import {
  CAM_ALPHA, CAM_BETA,
  CAM_RADIUS_INIT, CAM_RADIUS_MIN, CAM_RADIUS_MAX,
  SCENE_SIZE, CHUNK_SCENE_SIZE,
} from "../world/WorldConfig";
import { worldToScene } from "../world/CoordSystem";

const HALF = SCENE_SIZE / 2;

// With alpha = -PI/2:
//   right_xz = (cos(0), sin(0)) = (1, 0)  → X axis = left/right on screen
//   fwd_xz   = (0, 1)                      → Z axis = up/down on screen
const RIGHT_X = Math.cos(CAM_ALPHA + Math.PI / 2);
const RIGHT_Z = Math.sin(CAM_ALPHA + Math.PI / 2);
const FWD_X   = -RIGHT_Z;
const FWD_Z   =  RIGHT_X;

// Smooth fly-to animation state
interface FlyState {
  fromX: number; fromZ: number; fromR: number;
  toX:   number; toZ:   number; toR:   number;
  t: number; duration: number;
}

export class WorldCamera {
  readonly cam: ArcRotateCamera;
  private fly: FlyState | null = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    const cam = new ArcRotateCamera(
      "worldCam",
      CAM_ALPHA, CAM_BETA, CAM_RADIUS_INIT,
      new Vector3(HALF, 0, HALF),
      scene,
    );

    cam.lowerAlphaLimit  = CAM_ALPHA;
    cam.upperAlphaLimit  = CAM_ALPHA;
    cam.lowerBetaLimit   = CAM_BETA;
    cam.upperBetaLimit   = CAM_BETA;
    cam.lowerRadiusLimit = CAM_RADIUS_MIN;
    cam.upperRadiusLimit = CAM_RADIUS_MAX;

    cam.attachControl(canvas, true);
    cam.inputs.removeByType("ArcRotateCameraPointersInput");
    cam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    this.cam = cam;

    // ── Left-mouse pan ──────────────────────────────────────────────────────
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    scene.onPointerObservable.add((info) => {
      const ev = info.event as PointerEvent;
      switch (info.type) {
        case PointerEventTypes.POINTERDOWN:
          if (ev.button === 0) { dragging = true; lastX = ev.clientX; lastY = ev.clientY; }
          break;

        case PointerEventTypes.POINTERMOVE:
          if (!dragging) break;
          {
            const dx = ev.clientX - lastX;
            const dy = ev.clientY - lastY;
            lastX = ev.clientX;
            lastY = ev.clientY;

            // Stop any fly-to when user drags
            this.fly = null;

            const panScale = cam.radius / 500;
            cam.target.x -= (dx * RIGHT_X + dy * FWD_X) * panScale;
            cam.target.z -= (dx * RIGHT_Z + dy * FWD_Z) * panScale;

            const pad = CHUNK_SCENE_SIZE * 3;
            cam.target.x = Math.max(-pad, Math.min(SCENE_SIZE + pad, cam.target.x));
            cam.target.z = Math.max(-pad, Math.min(SCENE_SIZE + pad, cam.target.z));
          }
          break;

        case PointerEventTypes.POINTERUP:
        case PointerEventTypes.POINTEROUT:
          dragging = false;
          break;
      }
    });

    // ── Scroll-wheel zoom ───────────────────────────────────────────────────
    canvas.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      this.fly = null;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      cam.radius = Math.max(CAM_RADIUS_MIN, Math.min(CAM_RADIUS_MAX, cam.radius * factor));
    }, { passive: false });

    // ── Animate fly-to on each frame ────────────────────────────────────────
    scene.onBeforeRenderObservable.add(() => {
      if (!this.fly) return;
      this.fly.t += 1;
      const raw = this.fly.t / this.fly.duration;
      const ease = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw;
      const e = Math.min(ease, 1);
      cam.target.x = this.fly.fromX + (this.fly.toX - this.fly.fromX) * e;
      cam.target.z = this.fly.fromZ + (this.fly.toZ - this.fly.fromZ) * e;
      cam.radius   = this.fly.fromR + (this.fly.toR   - this.fly.fromR) * e;
      if (this.fly.t >= this.fly.duration) this.fly = null;
    });
  }

  // Smoothly fly camera to a world coordinate + zoom radius over ~60 frames
  flyTo(worldX: number, worldY: number, radius: number, durationFrames = 60) {
    const { sx, sz } = worldToScene(worldX, worldY);
    this.fly = {
      fromX: this.cam.target.x, fromZ: this.cam.target.z, fromR: this.cam.radius,
      toX: sx, toZ: sz, toR: Math.max(CAM_RADIUS_MIN, Math.min(CAM_RADIUS_MAX, radius)),
      t: 0, duration: durationFrames,
    };
  }

  // Incremental zoom step (negative = zoom in, positive = zoom out)
  zoomBy(delta: number) {
    this.fly = null;
    const factor = delta > 0 ? 1.4 : 0.71;
    this.cam.radius = Math.max(CAM_RADIUS_MIN, Math.min(CAM_RADIUS_MAX, this.cam.radius * factor));
  }
}
