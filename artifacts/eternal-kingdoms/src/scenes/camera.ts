import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Tools,
} from "@babylonjs/core";

export interface CameraState {
  zoom: number;
}

export function createIsometricCamera(scene: Scene, canvas: HTMLCanvasElement): {
  camera: ArcRotateCamera;
  getState: () => CameraState;
} {
  // LOK-style: nearly top-down, slight angle
  const camera = new ArcRotateCamera(
    "isoCamera",
    -Math.PI / 4,       // alpha: 45° yaw
    0.42,               // beta: ~24° from zenith = near top-down
    90,
    new Vector3(0, 0, 0),
    scene,
  );

  camera.lowerRadiusLimit = 25;
  camera.upperRadiusLimit = 220;
  camera.lowerBetaLimit = Tools.ToRadians(15);
  camera.upperBetaLimit = Tools.ToRadians(50);
  camera.upperAlphaLimit = camera.alpha;
  camera.lowerAlphaLimit = camera.alpha;

  camera.panningSensibility = 60;
  camera.wheelPrecision = 2.5;
  camera.pinchPrecision = 4;
  camera.inertia = 0.88;
  camera.panningInertia = 0.82;

  camera.attachControl(canvas, true);

  // Middle-click or Alt+drag panning
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 2) {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!isPanning) return;
    const dx = (e.clientX - lastX) * 0.10;
    const dy = (e.clientY - lastY) * 0.10;
    lastX = e.clientX;
    lastY = e.clientY;
    const alpha = camera.alpha;
    camera.target.x -= Math.cos(alpha) * dx - Math.sin(alpha) * dy;
    camera.target.z -= Math.sin(alpha) * dx + Math.cos(alpha) * dy;
  });

  canvas.addEventListener("pointerup", () => { isPanning = false; });
  canvas.addEventListener("pointerleave", () => { isPanning = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Edge panning
  let mouseX = 0;
  let mouseY = 0;
  canvas.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

  const edgeThreshold = 60;
  const edgeSpeed = 0.28;
  const edgeInterval = setInterval(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const alpha = camera.alpha;
    let dx = 0, dy = 0;
    if (mouseX < edgeThreshold) dx = -edgeSpeed;
    if (mouseX > w - edgeThreshold) dx = edgeSpeed;
    if (mouseY < edgeThreshold) dy = -edgeSpeed;
    if (mouseY > h - edgeThreshold) dy = edgeSpeed;
    if (dx !== 0 || dy !== 0) {
      camera.target.x += Math.cos(alpha) * dx - Math.sin(alpha) * dy;
      camera.target.z += Math.sin(alpha) * dx + Math.cos(alpha) * dy;
    }
  }, 16);

  window.addEventListener("ek-zoom", ((e: CustomEvent) => {
    const delta = e.detail.delta;
    camera.radius = Math.max(
      camera.lowerRadiusLimit!,
      Math.min(camera.upperRadiusLimit!, camera.radius + delta * 1.5),
    );
  }) as EventListener);

  scene.onDisposeObservable.add(() => clearInterval(edgeInterval));

  const getState = (): CameraState => {
    const range = camera.upperRadiusLimit! - camera.lowerRadiusLimit!;
    const zoom = Math.round(100 - ((camera.radius - camera.lowerRadiusLimit!) / range) * 100);
    return { zoom };
  };

  return { camera, getState };
}
