import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";
import { WORLD_SIZE } from "../engine/CoordinateEngine";

export function createWorldFloor(scene: Scene): Mesh {
  const ground = MeshBuilder.CreateGround(
    "WorldFloor",
    { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: 1 },
    scene
  );
  ground.position = new Vector3(WORLD_SIZE / 2, 0, WORLD_SIZE / 2);
  ground.isPickable = true;
  ground.receiveShadows = true;

  const mat = new StandardMaterial("GrassMat", scene);
  const texSize = 1024;
  const texture = new DynamicTexture("GrassTex", { width: texSize, height: texSize }, scene);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  const baseColor = "#2e6b18";
  const darkColor = "#1e4a0e";
  const lightColor = "#3d8a20";
  const midColor = "#347518";

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, texSize, texSize);

  const seed = (n: number) => {
    const x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 800; i++) {
    const rx = seed(i * 3.1) * texSize;
    const ry = seed(i * 7.7) * texSize;
    const rr = 15 + seed(i * 2.3) * 60;
    const t = seed(i * 5.5);
    const col = t < 0.3 ? darkColor : t < 0.6 ? midColor : lightColor;
    ctx.globalAlpha = 0.18 + t * 0.22;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rr, rr * (0.5 + seed(i) * 0.8), seed(i * 11) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 300; i++) {
    const rx = seed(i * 17.3) * texSize;
    const ry = seed(i * 13.1) * texSize;
    const len = 4 + seed(i * 9) * 12;
    ctx.globalAlpha = 0.08 + seed(i * 3) * 0.12;
    ctx.strokeStyle = seed(i) < 0.5 ? "#4aa824" : "#1b4010";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + (seed(i * 6) - 0.5) * len, ry - len);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  texture.update();

  texture.wrapU = 1;
  texture.wrapV = 1;
  texture.uScale = 48;
  texture.vScale = 48;

  mat.diffuseTexture = texture;
  mat.diffuseColor = new Color3(0.85, 1, 0.75);
  mat.specularColor = new Color3(0.05, 0.07, 0.03);
  mat.ambientColor = new Color3(0.5, 0.6, 0.4);

  ground.material = mat;
  return ground;
}
