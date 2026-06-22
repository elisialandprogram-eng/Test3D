import {
  Scene, MeshBuilder, StandardMaterial, Color3,
  Vector3, Mesh, Matrix, Quaternion,
} from "@babylonjs/core";

function seededRand(seed: number) {
  let s = seed;
  return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
}
function mat4(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry=0): Float32Array {
  return new Float32Array(
    Matrix.Compose(
      new Vector3(sx,sy,sz),
      Quaternion.RotationAxis(Vector3.Up(),ry),
      new Vector3(x,y,z),
    ).asArray()
  );
}
function thin(mesh: Mesh, mats: Float32Array[]) {
  if(!mats.length){mesh.isVisible=false;return;}
  const buf=new Float32Array(mats.length*16);
  mats.forEach((m,i)=>buf.set(m,i*16));
  mesh.isVisible=true;
  mesh.thinInstanceSetBuffer("matrix",buf,16);
}

// Same noise as terrain so biome placement matches
function hash(x: number, y: number) {
  const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n);
}
function sn(x: number, y: number) {
  const ix=Math.floor(x),iy=Math.floor(y);
  const fx=x-ix,fy=y-iy;
  const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  return hash(ix,iy)+(hash(ix+1,iy)-hash(ix,iy))*ux+(hash(ix,iy+1)-hash(ix,iy))*uy
        +(hash(ix,iy)-hash(ix+1,iy)-hash(ix,iy+1)+hash(ix+1,iy+1))*ux*uy;
}
function fbm(x: number, y: number, oct=5){
  let v=0,a=0.5,f=1,m=0;
  for(let i=0;i<oct;i++){v+=sn(x*f,y*f)*a;m+=a;a*=0.5;f*=2.1;} return v/m;
}

type Exclusion = {x:number;z:number;r:number};

function blocked(x: number, z: number, excl: Exclusion[]): boolean {
  for(const e of excl){const dx=x-e.x,dz=z-e.z;if(dx*dx+dz*dz<e.r*e.r)return true;}
  return false;
}

export function createVegetation(
  scene: Scene,
  exclusions: Exclusion[],
) {
  const rand = seededRand(74219);

  // ── Materials ─────────────────────────────────────────────────────────────
  const trunkMat = new StandardMaterial("treeTrunk", scene);
  trunkMat.diffuseColor = new Color3(0.38, 0.26, 0.14);
  trunkMat.specularColor = Color3.Black();

  const canopyForestMat = new StandardMaterial("canopyForest", scene);
  canopyForestMat.diffuseColor = new Color3(0.12, 0.42, 0.08);
  canopyForestMat.specularColor = Color3.Black();
  canopyForestMat.ambientColor = new Color3(0.2, 0.45, 0.15);

  const canopyMidMat = new StandardMaterial("canopyMid", scene);
  canopyMidMat.diffuseColor = new Color3(0.18, 0.52, 0.12);
  canopyMidMat.specularColor = Color3.Black();
  canopyMidMat.ambientColor = new Color3(0.25, 0.5, 0.18);

  const canopyPlainsMat = new StandardMaterial("canopyPlains", scene);
  canopyPlainsMat.diffuseColor = new Color3(0.26, 0.62, 0.16);
  canopyPlainsMat.specularColor = Color3.Black();
  canopyPlainsMat.ambientColor = new Color3(0.3, 0.58, 0.2);

  const bushMat = new StandardMaterial("bushMat", scene);
  bushMat.diffuseColor = new Color3(0.20, 0.50, 0.12);
  bushMat.specularColor = Color3.Black();

  // ── Mesh templates ─────────────────────────────────────────────────────────
  // Trunk: cylinder
  const trunk = MeshBuilder.CreateCylinder("treeTrunk",
    {height:1,diameterTop:0.18,diameterBottom:0.25,tessellation:7},scene);
  trunk.material = trunkMat; trunk.isVisible=false;

  // Forest canopy: wide, layered look — bottom wide cone
  const coneForestLow = MeshBuilder.CreateCylinder("coneForestLow",
    {height:1,diameterTop:0.1,diameterBottom:1,tessellation:9},scene);
  coneForestLow.material = canopyForestMat; coneForestLow.isVisible=false;

  // Forest canopy mid
  const coneForestMid = MeshBuilder.CreateCylinder("coneForestMid",
    {height:1,diameterTop:0.05,diameterBottom:0.72,tessellation:9},scene);
  coneForestMid.material = canopyMidMat; coneForestMid.isVisible=false;

  // Plains canopy
  const conePlains = MeshBuilder.CreateCylinder("conePlains",
    {height:1,diameterTop:0,diameterBottom:0.82,tessellation:8},scene);
  conePlains.material = canopyPlainsMat; conePlains.isVisible=false;

  // Bush
  const bushSphere = MeshBuilder.CreateSphere("bush",{diameter:1,segments:5},scene);
  bushSphere.material = bushMat; bushSphere.isVisible=false;

  const trunks:  Float32Array[] = [];
  const cflLow:  Float32Array[] = [];
  const cflMid:  Float32Array[] = [];
  const cPl:     Float32Array[] = [];
  const bushes:  Float32Array[] = [];

  // ── Forest clusters (dense, in forest biome zones) ─────────────────────────
  for (let cluster = 0; cluster < 280; cluster++) {
    const cx = (rand()-0.5)*460, cz = (rand()-0.5)*460;
    if (blocked(cx,cz,exclusions)) continue;
    const nx = (cx+250)/500, ny = (cz+250)/500;
    const moist = fbm(nx*3.5+5.1, ny*3.5+2.8, 5);
    const elev  = fbm(nx*2.8+0.3, ny*2.8+0.7, 7);
    if (moist < 0.58 || elev > 0.70 || elev < 0.28) continue; // only in forest biome

    const count = 3 + Math.floor(rand()*7);
    for (let t=0;t<count;t++) {
      const ox = cx+(rand()-0.5)*9;
      const oz = cz+(rand()-0.5)*9;
      if (blocked(ox,oz,exclusions)) continue;
      const h = 4.5 + rand()*5.5;
      const bw = h * (0.34+rand()*0.22);
      const ry = rand()*Math.PI*2;
      trunks.push(mat4(ox, h*0.28, oz, 1, h*0.52, 1, ry));
      cflLow.push(mat4(ox, h*0.48, oz, bw, h*0.52, bw, ry));
      cflMid.push(mat4(ox, h*0.74, oz, bw*0.64, h*0.38, bw*0.64, ry+0.6));
    }
  }

  // ── Plains trees (sparse, bright) ─────────────────────────────────────────
  for (let attempt=0; attempt<600; attempt++) {
    const x=(rand()-0.5)*460, z=(rand()-0.5)*460;
    if (blocked(x,z,exclusions)) continue;
    const nx=(x+250)/500, ny=(z+250)/500;
    const moist=fbm(nx*3.5+5.1,ny*3.5+2.8,5);
    const elev =fbm(nx*2.8+0.3,ny*2.8+0.7,7);
    if (moist>0.58||elev>0.68||elev<0.28) continue; // plains only
    const h=3.5+rand()*4;
    const bw=h*(0.38+rand()*0.18);
    const ry=rand()*Math.PI*2;
    trunks.push(mat4(x, h*0.28, z, 0.85, h*0.5, 0.85, ry));
    cPl.push(mat4(x, h*0.62, z, bw, h*0.58, bw, ry));
  }

  // ── Bushes (scattered broadly) ─────────────────────────────────────────────
  for (let i=0;i<400;i++) {
    const x=(rand()-0.5)*460, z=(rand()-0.5)*460;
    if (blocked(x,z,exclusions)) continue;
    const elev=fbm(((x+250)/500)*2.8+0.3,((z+250)/500)*2.8+0.7,7);
    if (elev>0.70) continue;
    const s=0.5+rand()*1.2;
    bushes.push(mat4(x,s*0.45,z, s*1.2,s*0.7,s*1.2, rand()*Math.PI*2));
  }

  thin(trunk,   trunks);
  thin(coneForestLow, cflLow);
  thin(coneForestMid, cflMid);
  thin(conePlains, cPl);
  thin(bushSphere, bushes);
}
