import {
  ArcRotateCamera,
  Scene,
  Vector3,
  PointerEventTypes,
  Matrix,
  Plane,
} from "@babylonjs/core";
import { WORLD_SIZE, WORLD_CENTER } from "./CoordinateEngine";

export type ViewMode = "FIELD" | "WORLD" | "KINGDOM";

export const FIELD_RADIUS_DEFAULT = 250;
export const WORLD_RADIUS_DEFAULT = 1800;

const BORDER_EDGE = 60; // px from edge to trigger edge scroll
const EDGE_SCROLL_SPEED = 8;
const PAN_SPEED = 0.55;
const CAMERA_MARGIN = 100;

export interface CameraState {
  targetX: number;
  targetZ: number;
  radius: number;
  viewMode: ViewMode;
}

export function createCamera(scene: Scene): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    "MainCamera",
    -Math.PI / 4,
    Math.PI / 3.5,
    FIELD_RADIUS_DEFAULT,
    new Vector3(WORLD_CENTER.x, 0, WORLD_CENTER.y),
    scene
  );

  camera.lowerRadiusLimit = 20;
  camera.upperRadiusLimit = 2500;
  camera.lowerBetaLimit = 0.18;
  camera.upperBetaLimit = Math.PI / 2.05;
  camera.wheelPrecision = 0.3;
  camera.pinchPrecision = 200;
  camera.panningSensibility = 0;

  camera.inputs.removeByType("ArcRotateCameraPointersInput");

  return camera;
}

export function setupCameraControls(
  camera: ArcRotateCamera,
  scene: Scene,
  canvas: HTMLCanvasElement,
  onViewModeChange: (mode: ViewMode) => void
) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartZ = 0;
  let pointerStartX = 0;
  let pointerStartZ = 0;
  let mouseX = 0;
  let mouseY = 0;

  const getGroundPosition = (evt: { clientX: number; clientY: number }) => {
    const pickResult = scene.pick(evt.clientX, evt.clientY, (mesh) => mesh.name === "WorldFloor");
    if (pickResult?.hit && pickResult.pickedPoint) {
      return pickResult.pickedPoint;
    }
    const unproject = Vector3.Unproject(
      new Vector3(evt.clientX, evt.clientY, 0),
      canvas.width,
      canvas.height,
      Matrix.Identity(),
      camera.getViewMatrix(),
      camera.getProjectionMatrix()
    );
    const ray = scene.createPickingRay(evt.clientX, evt.clientY, Matrix.Identity(), camera);
    const ground = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());
    const distance = ray.intersectsPlane(ground);
    if (distance !== null && distance >= 0) {
      return ray.origin.add(ray.direction.scale(distance));
    }
    return null;
  };

  const clampTarget = (x: number, z: number) => ({
    x: Math.max(CAMERA_MARGIN, Math.min(WORLD_SIZE - CAMERA_MARGIN, x)),
    z: Math.max(CAMERA_MARGIN, Math.min(WORLD_SIZE - CAMERA_MARGIN, z)),
  });

  scene.onPointerObservable.add((info) => {
    if (info.type === PointerEventTypes.POINTERDOWN) {
      const evt = info.event as PointerEvent;
      if (evt.button === 0 || evt.button === 1 || evt.button === 2) {
        isDragging = true;
        pointerStartX = evt.clientX;
        pointerStartZ = evt.clientY;
        dragStartX = camera.target.x;
        dragStartZ = camera.target.z;
        canvas.style.cursor = "grabbing";
      }
    }

    if (info.type === PointerEventTypes.POINTERMOVE) {
      const evt = info.event as PointerEvent;
      mouseX = evt.clientX;
      mouseY = evt.clientY;

      if (isDragging) {
        const dx = (evt.clientX - pointerStartX) * PAN_SPEED * (camera.radius / 300);
        const dz = (evt.clientY - pointerStartZ) * PAN_SPEED * (camera.radius / 300);

        const alpha = camera.alpha;
        const cosA = Math.cos(alpha);
        const sinA = Math.sin(alpha);

        const worldDX = cosA * dx + sinA * dz;
        const worldDZ = sinA * dx - cosA * dz;

        const clamped = clampTarget(
          dragStartX - worldDX,
          dragStartZ - worldDZ
        );
        camera.target.x = clamped.x;
        camera.target.z = clamped.z;
      }
    }

    if (info.type === PointerEventTypes.POINTERUP) {
      isDragging = false;
      canvas.style.cursor = "default";
    }

    if (info.type === PointerEventTypes.POINTERWHEEL) {
      const evt = info.event as WheelEvent;
      const delta = evt.deltaY > 0 ? 1.12 : 0.88;
      const newRadius = Math.max(20, Math.min(2500, camera.radius * delta));
      camera.radius = newRadius;

      const newMode = newRadius > 900 ? "WORLD" : "FIELD";
      onViewModeChange(newMode as ViewMode);
    }
  });

  let edgeScrollActive = false;
  scene.registerBeforeRender(() => {
    if (!edgeScrollActive || isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const relX = mouseX - rect.left;
    const relY = mouseY - rect.top;

    let dx = 0;
    let dz = 0;

    if (relX < BORDER_EDGE) dx = -1;
    else if (relX > rect.width - BORDER_EDGE) dx = 1;
    if (relY < BORDER_EDGE) dz = -1;
    else if (relY > rect.height - BORDER_EDGE) dz = 1;

    if (dx !== 0 || dz !== 0) {
      const speed = EDGE_SCROLL_SPEED * (camera.radius / 300);
      const alpha = camera.alpha;
      const cosA = Math.cos(alpha);
      const sinA = Math.sin(alpha);

      const worldDX = (cosA * dx + sinA * dz) * speed;
      const worldDZ = (sinA * dx - cosA * dz) * speed;

      const clamped = clampTarget(
        camera.target.x + worldDX,
        camera.target.z - worldDZ
      );
      camera.target.x = clamped.x;
      camera.target.z = clamped.z;
    }
  });

  return {
    disableEdgeScroll: () => { edgeScrollActive = false; },
    enableEdgeScroll: () => { edgeScrollActive = true; },
    panTo: (x: number, z: number) => {
      const clamped = clampTarget(x, z);
      camera.target.x = clamped.x;
      camera.target.z = clamped.z;
    },
    setViewMode: (mode: ViewMode) => {
      if (mode === "WORLD") {
        camera.radius = WORLD_RADIUS_DEFAULT;
      } else if (mode === "FIELD") {
        camera.radius = FIELD_RADIUS_DEFAULT;
      }
      onViewModeChange(mode);
    },
  };
}
