import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

export interface CameraState {
  coordX: number;
  coordZ: number;
}

export function createIsometricCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
): { camera: ArcRotateCamera; getState: () => CameraState } {
  // LOK-style: nearly straight-down, very slight tilt
  const FIXED_ALPHA  = -Math.PI / 4;  // 45° yaw — classic strategy angle
  const FIXED_BETA   = 0.24;           // ~14° from zenith — almost perfectly top-down
  const FIXED_RADIUS = 105;            // fixed zoom — never changes

  const camera = new ArcRotateCamera("isoCamera", FIXED_ALPHA, FIXED_BETA, FIXED_RADIUS, Vector3.Zero(), scene);

  // Hard-lock angle and radius
  camera.lowerRadiusLimit = FIXED_RADIUS;
  camera.upperRadiusLimit = FIXED_RADIUS;
  camera.lowerBetaLimit   = FIXED_BETA;
  camera.upperBetaLimit   = FIXED_BETA;
  camera.lowerAlphaLimit  = FIXED_ALPHA;
  camera.upperAlphaLimit  = FIXED_ALPHA;

  // Kill all default inputs
  camera.inputs.clear();

  // ── Drag panning ──
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

  // ── Edge auto-scroll ──
  let mouseX = 0;
  let mouseY = 0;
  const EDGE = 55;
  const SPEED = 0.30;

  window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

  const edgeTick = setInterval(() => {
    if (dragging) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    let dx = 0, dy = 0;
    if (mouseX < EDGE)     dx = -SPEED;
    if (mouseX > w - EDGE) dx =  SPEED;
    if (mouseY < EDGE)     dy = -SPEED;
    if (mouseY > h - EDGE) dy =  SPEED;
    if (dx || dy) {
      const a = camera.alpha;
      camera.target.x += Math.cos(a) * dx - Math.sin(a) * dy;
      camera.target.z += Math.sin(a) * dx + Math.cos(a) * dy;
      clamp(camera);
    }
  }, 16);

  scene.onDisposeObservable.add(() => clearInterval(edgeTick));

  function clamp(cam: ArcRotateCamera) {
    const L = 230;
    cam.target.x = Math.max(-L, Math.min(L, cam.target.x));
    cam.target.z = Math.max(-L, Math.min(L, cam.target.z));
  }

  const getState = (): CameraState => ({
    coordX: Math.round(camera.target.x * 10) / 10,
    coordZ: Math.round(camera.target.z * 10) / 10,
  });

  return { camera, getState };
}
