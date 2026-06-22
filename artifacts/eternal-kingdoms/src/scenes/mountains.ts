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
      new Vector3(sx, sy, sz),
      Quaternion.RotationAxis(Vector3.Up(), ry),
      new Vector3(x, y, z),
    ).asArray()
  );
}
function thin(mesh: Mesh, mats: Float32Array[]) {
  if (!mats.length) { mesh.isVisible=false; return; }
  const buf=new Float32Array(mats.length*16);
  mats.forEach((m,i)=>buf.set(m,i*16));
  mesh.isVisible=true;
  mesh.thinInstanceSetBuffer("matrix",buf,16);
}

// Simple noise for mountain zone detection
function hash(x: number, y: number) {
  const n = Math.sin(x*127.1+y*311.7)*43758.5453;
  return n-Math.floor(n);
}
function fbm2(x: number, y: number, oct=4) {
  let v=0,a=0.5,f=1,m=0;
  for(let i=0;i<oct;i++){
    const ix=Math.floor(x*f),iy=Math.floor(y*f);
    const fx=x*f-ix,fy=y*f-iy;
    const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
    const nn=hash(ix,iy)+(hash(ix+1,iy)-hash(ix,iy))*ux+(hash(ix,iy+1)-hash(ix,iy))*uy
            +(hash(ix,iy)-hash(ix+1,iy)-hash(ix,iy+1)+hash(ix+1,iy+1))*ux*uy;
    v+=nn*a;m+=a;a*=0.5;f*=2.1;
  }
  return v/m;
}

export function createMountains(scene: Scene, kingdomPositions: Array<{x:number;z:number}>) {
  const rand = seededRand(5512887);

  // ── Shared materials ─────────────────────────────────────────────────────────
  const rockMat = new StandardMaterial("mtnRock", scene);
  rockMat.diffuseColor = new Color3(0.42, 0.38, 0.32);
  rockMat.specularColor = new Color3(0.05,0.05,0.05);
  rockMat.ambientColor = new Color3(0.5,0.5,0.5);

  const midMat = new StandardMaterial("mtnMid", scene);
  midMat.diffuseColor = new Color3(0.58, 0.58, 0.62);
  midMat.specularColor = new Color3(0.06,0.06,0.07);
  midMat.ambientColor = new Color3(0.55,0.55,0.58);

  const snowMat = new StandardMaterial("mtnSnow", scene);
  snowMat.diffuseColor = new Color3(0.92, 0.93, 0.98);
  snowMat.specularColor = new Color3(0.3,0.3,0.35);
  snowMat.ambientColor = new Color3(0.85,0.87,0.95);

  // ── Peak mesh templates ───────────────────────────────────────────────────────
  const peakBase = MeshBuilder.CreateCylinder("mtnPeakBase",
    {height:1,diameterTop:0.3,diameterBottom:1,tessellation:7}, scene);
  peakBase.material = rockMat; peakBase.isVisible = false;

  const peakMid = MeshBuilder.CreateCylinder("mtnPeakMid",
    {height:1,diameterTop:0,diameterBottom:0.55,tessellation:7}, scene);
  peakMid.material = midMat; peakMid.isVisible = false;

  const peakSnow = MeshBuilder.CreateCylinder("mtnPeakSnow",
    {height:1,diameterTop:0,diameterBottom:0.30,tessellation:7}, scene);
  peakSnow.material = snowMat; peakSnow.isVisible = false;

  const rockBoulder = MeshBuilder.CreateSphere("mtnBoulder",{diameter:1,segments:5},scene);
  rockBoulder.material = rockMat; rockBoulder.isVisible = false;

  const pb: Float32Array[] = [];
  const pm: Float32Array[] = [];
  const ps: Float32Array[] = [];
  const bld: Float32Array[] = [];

  function isNearKingdom(x: number, z: number): boolean {
    for (const k of kingdomPositions) {
      const dx=x-k.x, dz=z-k.z;
      if(dx*dx+dz*dz < 18*18) return true;
    }
    return false;
  }
  function isNearCenter(x: number, z: number): boolean {
    return x*x+z*z < 25*25;
  }

  // Scatter mountain clusters in high-elevation noise zones
  for (let attempt = 0; attempt < 1200; attempt++) {
    const cx = (rand()-0.5)*440;
    const cz = (rand()-0.5)*440;
    // Only place in "mountain zones" (high elev noise)
    const elev = fbm2((cx+250)/500*2.8+0.3, (cz+250)/500*2.8+0.7, 7);
    if (elev < 0.65) continue;
    if (isNearKingdom(cx, cz) || isNearCenter(cx, cz)) continue;

    // Cluster of 1-4 peaks
    const count = 1 + Math.floor(rand() * 4);
    for (let p = 0; p < count; p++) {
      const ox = cx + (rand()-0.5)*14;
      const oz = cz + (rand()-0.5)*14;

      const baseH = 10 + rand() * 20;
      const bw    = baseH * (0.55 + rand() * 0.35);
      const midH  = baseH * (0.38 + rand() * 0.20);
      const snowH = baseH * (0.22 + rand() * 0.12);
      const ry    = rand() * Math.PI * 2;

      // Rock base
      pb.push(mat4(ox, baseH/2, oz, bw, baseH, bw, ry));
      // Middle grey section
      pm.push(mat4(ox, baseH + midH*0.5, oz, bw*0.5, midH, bw*0.5, ry+0.4));
      // Snow cap
      ps.push(mat4(ox, baseH + midH + snowH*0.5, oz, bw*0.28, snowH, bw*0.28, ry+0.9));

      // Surrounding boulders
      const bc = 2 + Math.floor(rand() * 4);
      for (let b=0;b<bc;b++){
        const ba = (b/bc)*Math.PI*2+rand()*0.8;
        const br = bw * 0.6 + rand() * bw * 0.5;
        const bsx = 1.2+rand()*2.5, bsy=0.6+rand()*1.8, bsz=1.2+rand()*2.5;
        bld.push(mat4(ox+Math.cos(ba)*br, bsy*0.5, oz+Math.sin(ba)*br, bsx,bsy,bsz));
      }
    }
  }

  thin(peakBase, pb);
  thin(peakMid, pm);
  thin(peakSnow, ps);
  thin(rockBoulder, bld);
}
