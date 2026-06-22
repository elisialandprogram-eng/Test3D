import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

export interface CameraState { coordX: number; coordZ: number; }

export function createIsometricCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
): { camera: ArcRotateCamera; getState: () => CameraState } {

  // ── Fixed presentation angles (spec: 60° pitch, -45° yaw) ──────────────────
  const ALPHA = -Math.PI / 4;   // -45° yaw
  const BETA  = 0.55;            // ≈ 58° from horizontal (MMO isometric)

  const MIN_R = 80;
  const MAX_R = 340;
  const DEF_R = 140;

  const camera = new ArcRotateCamera("cam", ALPHA, BETA, DEF_R, Vector3.Zero(), scene);

  camera.lowerBetaLimit  = BETA;
  camera.upperBetaLimit  = BETA;
  camera.lowerAlphaLimit = ALPHA;
  camera.upperAlphaLimit = ALPHA;
  camera.lowerRadiusLimit = MIN_R;
  camera.upperRadiusLimit = MAX_R;

  camera.inputs.clear();

  // ── Smooth zoom ─────────────────────────────────────────────────────────────
  let targetRadius = DEF_R;
  canvas.addEventListener("wheel", (e) => {
    targetRadius = Math.max(MIN_R, Math.min(MAX_R, targetRadius + e.deltaY * 0.12));
    e.preventDefault();
  }, { passive: false });

  scene.onBeforeRenderObservable.add(() => {
    camera.radius += (targetRadius - camera.radius) * 0.10;
  });

  // ── Drag pan ─────────────────────────────────────────────────────────────────
  let dragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const speed = camera.radius * 0.0013;
    const dx = (e.clientX - lastX) * speed;
    const dy = (e.clientY - lastY) * speed;
    lastX = e.clientX; lastY = e.clientY;
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
  canvas.addEventListener("pointerleave", () => { dragging = false; canvas.style.cursor = "grab"; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ── Edge scroll with inertia ──────────────────────────────────────────────
  let mouseX = 0, mouseY = 0;
  let vx = 0, vz = 0;
  const EDGE = 60;

  window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

  const edgeTick = setInterval(() => {
    if (dragging) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const speed = camera.radius * 0.00045;
    let ax = 0, az = 0;
    if (mouseX < EDGE)     ax = -speed;
    if (mouseX > w - EDGE) ax =  speed;
    if (mouseY < EDGE)     az = -speed;
    if (mouseY > h - EDGE) az =  speed;
    vx = (vx + ax) * 0.82;
    vz = (vz + az) * 0.82;
    if (Math.abs(vx) > 0.0005 || Math.abs(vz) > 0.0005) {
      const a = camera.alpha;
      camera.target.x += Math.cos(a) * vx - Math.sin(a) * vz;
      camera.target.z += Math.sin(a) * vx + Math.cos(a) * vz;
      clamp(camera);
    }
  }, 16);

  scene.onDisposeObservable.add(() => clearInterval(edgeTick));

  function clamp(cam: ArcRotateCamera) {
    const L = 185;
    cam.target.x = Math.max(-L, Math.min(L, cam.target.x));
    cam.target.z = Math.max(-L, Math.min(L, cam.target.z));
  }

  const getState = (): CameraState => ({
    coordX: Math.round((camera.target.x / 0.163) + 1536),
    coordZ: Math.round((camera.target.z / 0.163) + 1536),
  });

  return { camera, getState };
}
