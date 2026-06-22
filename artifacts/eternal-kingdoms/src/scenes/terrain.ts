import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  VertexBuffer,
  Mesh,
} from "@babylonjs/core";

function smoothNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves = 5): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return val;
}

export function createTerrain(scene: Scene): Mesh {
  const WORLD_SIZE = 500;
  const SUBDIVISIONS = 120;

  const ground = MeshBuilder.CreateGround(
    "terrain",
    {
      width: WORLD_SIZE,
      height: WORLD_SIZE,
      subdivisions: SUBDIVISIONS,
      updatable: true,
    },
    scene,
  );

  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  const count = positions.length / 3;
  const colors = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3] / WORLD_SIZE;
    const z = positions[i * 3 + 2] / WORLD_SIZE;

    const heightNoise = fbm(x * 3, z * 3, 6);
    const colorNoise = fbm(x * 2.5 + 0.7, z * 2.5 + 0.3, 4);
    const detailNoise = fbm(x * 8, z * 8, 3);

    const height = (heightNoise - 0.5) * 4.5;
    positions[i * 3 + 1] = height;

    let r: number, g: number, b: number;

    if (colorNoise < 0.3) {
      r = 0.18 + detailNoise * 0.06;
      g = 0.38 + detailNoise * 0.08;
      b = 0.12 + detailNoise * 0.04;
    } else if (colorNoise < 0.52) {
      r = 0.24 + detailNoise * 0.07;
      g = 0.48 + detailNoise * 0.1;
      b = 0.15 + detailNoise * 0.05;
    } else if (colorNoise < 0.7) {
      r = 0.32 + detailNoise * 0.08;
      g = 0.55 + detailNoise * 0.1;
      b = 0.18 + detailNoise * 0.06;
    } else if (colorNoise < 0.82) {
      r = 0.38 + detailNoise * 0.05;
      g = 0.5 + detailNoise * 0.07;
      b = 0.24 + detailNoise * 0.04;
    } else {
      r = 0.55 + detailNoise * 0.06;
      g = 0.5 + detailNoise * 0.05;
      b = 0.34 + detailNoise * 0.04;
    }

    colors[i * 4] = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 1.0;
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  ground.bakeCurrentTransformIntoVertices();

  const mat = new StandardMaterial("terrainMat", scene);
  mat.vertexColorsEnabled = true;
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  mat.specularPower = 8;

  const tex = new DynamicTexture("terrainTex", { width: 1024, height: 1024 }, scene);
  const ctx = tex.getContext();
  const imgData = ctx.createImageData(1024, 1024);

  for (let py = 0; py < 1024; py++) {
    for (let px = 0; px < 1024; px++) {
      const nx = px / 1024;
      const ny = py / 1024;
      const n1 = fbm(nx * 12, ny * 12, 4);
      const n2 = fbm(nx * 25 + 5, ny * 25 + 5, 3);
      const v = Math.round((n1 * 0.6 + n2 * 0.4) * 30 + 10);
      const idx = (py * 1024 + px) * 4;
      imgData.data[idx] = v;
      imgData.data[idx + 1] = v;
      imgData.data[idx + 2] = v;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  tex.update();

  mat.diffuseTexture = tex;
  mat.diffuseTexture.level = 0.12;
  ground.material = mat;
  ground.receiveShadows = true;
  ground.checkCollisions = true;

  createWaterPatches(scene);

  return ground;
}

function createWaterPatches(scene: Scene) {
  const patches = [
    { x: -80, z: 60, w: 35, h: 28 },
    { x: 90, z: -70, w: 30, h: 22 },
    { x: -120, z: -80, w: 25, h: 20 },
    { x: 60, z: 120, w: 20, h: 18 },
    { x: -40, z: 130, w: 18, h: 14 },
    { x: 130, z: 40, w: 22, h: 16 },
  ];

  patches.forEach(({ x, z, w, h }, idx) => {
    const water = MeshBuilder.CreateGround(
      `water_${idx}`,
      { width: w, height: h, subdivisions: 4 },
      scene,
    );
    water.position = new Vector3(x, -0.4, z);

    const mat = new StandardMaterial(`waterMat_${idx}`, scene);
    mat.diffuseColor = new Color3(0.15, 0.32, 0.58);
    mat.specularColor = new Color3(0.5, 0.6, 0.8);
    mat.specularPower = 64;
    mat.alpha = 0.78;
    water.material = mat;
  });
}
