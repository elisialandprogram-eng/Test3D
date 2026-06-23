import {
  ArcRotateCamera, Vector3, Scene, PointerEventTypes,
} from "@babylonjs/core";
import {
  CAM_ALPHA, CAM_BETA,
  CAM_RADIUS_INIT, CAM_RADIUS_MIN, CAM_RADIUS_MAX,
  SCENE_SIZE,
} from "../world/WorldConfig";

const HALF = SCENE_SIZE / 2;

// Pre-computed camera right / forward vectors in world XZ for our fixed angle
// right_xz = (cos(alpha + PI/2), 0, sin(alpha + PI/2))
const RIGHT_X = Math.cos(CAM_ALPHA + Math.PI / 2);
const RIGHT_Z = Math.sin(CAM_ALPHA + Math.PI / 2);
// forward_xz = "into screen" direction — rotate right 90° around Y
const FWD_X = -RIGHT_Z;
const FWD_Z =  RIGHT_X;

export function createWorldCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
): ArcRotateCamera {
  const cam = new ArcRotateCamera(
    "worldCam",
    CAM_ALPHA,
    CAM_BETA,
    CAM_RADIUS_INIT,
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

  // Remove pointer-rotate input; keep mouse-wheel zoom
  cam.inputs.removeByType("ArcRotateCameraPointersInput");
  cam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

  // ── Custom pan via left-mouse drag ───────────────────────────────────────
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  scene.onPointerObservable.add((info) => {
    const ev = info.event as PointerEvent;
    switch (info.type) {
      case PointerEventTypes.POINTERDOWN:
        if (ev.button === 0) {
          isDragging = true;
          lastX = ev.clientX;
          lastY = ev.clientY;
        }
        break;

      case PointerEventTypes.POINTERMOVE:
        if (!isDragging) break;
        {
          const dx = ev.clientX - lastX;
          const dy = ev.clientY - lastY;
          lastX = ev.clientX;
          lastY = ev.clientY;

          // Pan scale proportional to zoom level
          const panScale = cam.radius / 900;

          cam.target.x -= (dx * RIGHT_X + dy * FWD_X) * panScale;
          cam.target.z -= (dx * RIGHT_Z + dy * FWD_Z) * panScale;

          // Clamp to world bounds
          cam.target.x = Math.max(0, Math.min(SCENE_SIZE, cam.target.x));
          cam.target.z = Math.max(0, Math.min(SCENE_SIZE, cam.target.z));
        }
        break;

      case PointerEventTypes.POINTERUP:
      case PointerEventTypes.POINTEROUT:
        isDragging = false;
        break;
    }
  });

  return cam;
}
