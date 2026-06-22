import {
  ArcRotateCamera,
  Scene,
  Vector3,
} from "@babylonjs/core";

export interface CameraState {
  coordX: number;
  coordZ: number;
}

export function createIsometricCamera(scene: Scene, canvas: HTMLCanvasElement): {
  camera: ArcRotateCamera;
  getState: () => CameraState;
} {
  // Fixed LOK-style isometric camera — no zoom, no rotation
  const FIXED_ALPHA = -Math.PI / 4;   // 45° yaw
  const FIXED_BETA  = 0.40;            // ~23° from zenith — near top-down
  const FIXED_RADIUS = 95;             // fixed distance — never changes

  const camera = new ArcRotateCamera("isoCamera", FIXED_ALPHA, FIXED_BETA, FIXED_RADIUS, Vector3.Zero(), scene);

  // Hard-lock everything except panning target
  camera.lowerRadiusLimit = FIXED_RADIUS;
  camera.upperRadiusLimit = FIXED_RADIUS;
  camera.lowerBetaLimit   = FIXED_BETA;
  camera.upperBetaLimit   = FIXED_BETA;
  camera.lowerAlphaLimit  = FIXED_ALPHA;
  camera.upperAlphaLimit  = FIXED_ALPHA;

  // Disable all built-in inputs — we handle panning ourselves
  camera.inputs.clear();

  // ──────────────────────────────────────────────
  // Drag panning (left-button drag)
  // ──────────────────────────────────────────────
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // Speed calibrated to FIXED_RADIUS / field-of-view
  const PAN_SPEED = 0.14;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastX) * PAN_SPEED;
    const dy = (e.clientY - lastY) * PAN_SPEED;
    lastX = e.clientX;
    lastY = e.clientY;

    // Project screen-space drag onto world XZ
    const alpha = camera.alpha;
    camera.target.x -= Math.cos(alpha) * dx - Math.sin(alpha) * dy;
    camera.target.z -= Math.sin(alpha) * dx + Math.cos(alpha) * dy;

    clampTarget(camera);
  });

  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointerleave", () => { dragging = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ──────────────────────────────────────────────
  // Edge-auto-scroll (mouse near screen edge)
  // ──────────────────────────────────────────────
  let mouseX = 0;
  let mouseY = 0;
  const EDGE_THRESHOLD = 55;
  const EDGE_SPEED = 0.32;

  window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

  const edgeInterval = setInterval(() => {
    if (dragging) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    let dx = 0, dy = 0;
    if (mouseX < EDGE_THRESHOLD)     dx = -EDGE_SPEED;
    if (mouseX > w - EDGE_THRESHOLD) dx =  EDGE_SPEED;
    if (mouseY < EDGE_THRESHOLD)     dy = -EDGE_SPEED;
    if (mouseY > h - EDGE_THRESHOLD) dy =  EDGE_SPEED;

    if (dx !== 0 || dy !== 0) {
      const alpha = camera.alpha;
      camera.target.x += Math.cos(alpha) * dx - Math.sin(alpha) * dy;
      camera.target.z += Math.sin(alpha) * dx + Math.cos(alpha) * dy;
      clampTarget(camera);
    }
  }, 16);

  scene.onDisposeObservable.add(() => {
    clearInterval(edgeInterval);
    window.removeEventListener("mousemove", () => {});
  });

  function clampTarget(cam: ArcRotateCamera) {
    const LIMIT = 220;
    cam.target.x = Math.max(-LIMIT, Math.min(LIMIT, cam.target.x));
    cam.target.z = Math.max(-LIMIT, Math.min(LIMIT, cam.target.z));
  }

  const getState = (): CameraState => ({
    coordX: Math.round(camera.target.x * 10) / 10,
    coordZ: Math.round(camera.target.z * 10) / 10,
  });

  return { camera, getState };
}
