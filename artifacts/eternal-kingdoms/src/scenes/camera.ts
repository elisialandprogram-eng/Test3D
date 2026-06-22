import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

export interface CameraState {
  coordX: number;
  coordZ: number;
}

export function createIsometricCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
): { camera: ArcRotateCamera; getState: () => CameraState } {
  // alpha=0 → camera sits on the +X axis looking toward origin
  // This makes the square world appear as a rectangle (not rotated 45° / diamond)
  const FIXED_ALPHA  = 0;
  const FIXED_BETA   = 0.24;   // ~14° from zenith — nearly top-down
  const FIXED_RADIUS = 105;    // fixed distance — never changes

  const camera = new ArcRotateCamera(
    "isoCamera",
    FIXED_ALPHA,
    FIXED_BETA,
    FIXED_RADIUS,
    Vector3.Zero(),
    scene,
  );

  // Hard-lock everything — no zoom, no rotate
  camera.lowerRadiusLimit = FIXED_RADIUS;
  camera.upperRadiusLimit = FIXED_RADIUS;
  camera.lowerBetaLimit   = FIXED_BETA;
  camera.upperBetaLimit   = FIXED_BETA;
  camera.lowerAlphaLimit  = FIXED_ALPHA;
  camera.upperAlphaLimit  = FIXED_ALPHA;

  // Kill all default Babylon inputs (scroll zoom, click-rotate, etc.)
  camera.inputs.clear();

  // ── World boundary ──────────────────────────────────────────────────────────
  // Terrain is 500×500, so world runs from -250 to +250.
  // At radius=105 / beta=0.24 the camera's frustum reveals ~55 units forward
  // and ~95 units sideways from the target.  Clamp target to keep the border
  // always out of frame on every side.
  const LIMIT_X = 165;   // world ±250, minus ~85 units visible half-width
  const LIMIT_Z = 185;   // world ±250, minus ~65 units visible half-depth

  function clamp(cam: ArcRotateCamera) {
    cam.target.x = Math.max(-LIMIT_X, Math.min(LIMIT_X, cam.target.x));
    cam.target.z = Math.max(-LIMIT_Z, Math.min(LIMIT_Z, cam.target.z));
  }

  // ── Drag-to-pan (grab-map feel) ─────────────────────────────────────────────
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const PAN_SPEED = 0.18;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastX) * PAN_SPEED;
    const dy = (e.clientY - lastY) * PAN_SPEED;
    lastX = e.clientX;
    lastY = e.clientY;

    // With alpha=0: cos=1, sin=0 → x pans with horizontal drag, z pans with vertical drag
    const a = camera.alpha;
    camera.target.x -= Math.cos(a) * dx - Math.sin(a) * dy;
    camera.target.z -= Math.sin(a) * dx + Math.cos(a) * dy;
    clamp(camera);
  });

  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("pointerleave", () => {
    dragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // No edge-scroll — map only moves on explicit drag

  const getState = (): CameraState => ({
    coordX: Math.round(camera.target.x * 10) / 10,
    coordZ: Math.round(camera.target.z * 10) / 10,
  });

  return { camera, getState };
}
