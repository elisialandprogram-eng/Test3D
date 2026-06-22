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
  const camera = new ArcRotateCamera(
    "isoCamera",
    -Math.PI / 4,
    Math.PI / 3,
    80,
    new Vector3(0, 0, 0),
    scene,
  );

  camera.lowerRadiusLimit = 20;
  camera.upperRadiusLimit = 280;
  camera.lowerBetaLimit = Tools.ToRadians(20);
  camera.upperBetaLimit = Tools.ToRadians(75);
  camera.panningDistanceLimit = 240;
  camera.panningSensibility = 80;
  camera.wheelPrecision = 3;
  camera.pinchPrecision = 5;
  camera.angularSensibilityX = 5000;
  camera.angularSensibilityY = 5000;
  camera.panningInertia = 0.85;
  camera.inertia = 0.88;

  camera.attachControl(canvas, true);

  let isPanning = false;
  let lastX = 0;
  let lastZ = 0;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning = true;
      lastX = e.clientX;
      lastZ = e.clientY;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!isPanning) return;
    const dx = (e.clientX - lastX) * 0.12;
    const dz = (e.clientY - lastZ) * 0.12;
    lastX = e.clientX;
    lastZ = e.clientY;
    const alpha = camera.alpha;
    camera.target.x -= Math.cos(alpha) * dx - Math.sin(alpha) * dz;
    camera.target.z -= Math.sin(alpha) * dx + Math.cos(alpha) * dz;
  });

  canvas.addEventListener("pointerup", () => { isPanning = false; });
  canvas.addEventListener("pointerleave", () => { isPanning = false; });

  const edgePanSpeed = 0.35;
  const edgeThreshold = 60;
  let edgeInterval: ReturnType<typeof setInterval> | null = null;
  let mouseX = 0;
  let mouseY = 0;

  canvas.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  edgeInterval = setInterval(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const alpha = camera.alpha;
    let dx = 0;
    let dz = 0;

    if (mouseX < edgeThreshold) dx = -edgePanSpeed;
    if (mouseX > w - edgeThreshold) dx = edgePanSpeed;
    if (mouseY < edgeThreshold) dz = -edgePanSpeed;
    if (mouseY > h - edgeThreshold) dz = edgePanSpeed;

    if (dx !== 0 || dz !== 0) {
      camera.target.x += Math.cos(alpha) * dx - Math.sin(alpha) * dz;
      camera.target.z += Math.sin(alpha) * dx + Math.cos(alpha) * dz;
    }
  }, 16);

  window.addEventListener("ek-zoom", ((e: CustomEvent) => {
    const delta = e.detail.delta;
    camera.radius = Math.max(
      camera.lowerRadiusLimit!,
      Math.min(camera.upperRadiusLimit!, camera.radius + delta * 2),
    );
  }) as EventListener);

  const getState = (): CameraState => {
    const range = camera.upperRadiusLimit! - camera.lowerRadiusLimit!;
    const zoom = Math.round(
      100 - ((camera.radius - camera.lowerRadiusLimit!) / range) * 100,
    );
    return { zoom };
  };

  scene.onDisposeObservable.add(() => {
    if (edgeInterval) clearInterval(edgeInterval);
  });

  return { camera, getState };
}
