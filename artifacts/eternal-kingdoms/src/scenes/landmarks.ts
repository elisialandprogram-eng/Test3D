import {
  Scene, MeshBuilder, StandardMaterial, Color3, Vector3,
  Mesh, ShadowGenerator, ActionManager, ExecuteCodeAction,
  DynamicTexture, GlowLayer,
} from "@babylonjs/core";

export interface Kingdom {
  name: string; x: number; z: number;
  type: string; level: number;
}

// ── Seeded RNG ───────────────────────────────────────────────────────────────
function seededRand(seed: number) {
  let s = seed;
  return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
}

// ── Pre-defined scattered kingdoms ───────────────────────────────────────────
const PRESET_KINGDOMS: Array<{name:string;x:number;z:number;type:string;level:number}> = [
  {name:"Stormcrest",     x:-148,z:-95,  type:"Gold Age",  level:22},
  {name:"Ashenmoor",      x: 118,z:-128, type:"Silver Age",level:18},
  {name:"Duskhaven",      x:-165,z:  62, type:"Iron Age",  level:14},
  {name:"Embervale",      x:  88,z: 148, type:"Bronze Age",level:20},
  {name:"Frostpeak",      x:-108,z: 135, type:"Stone Age", level:11},
  {name:"Grimhold",       x: 155,z:  40, type:"Iron Age",  level:16},
  {name:"Hallowmere",     x: -48,z:-155, type:"Gold Age",  level:24},
  {name:"Irongate",       x:  35,z:-118, type:"Silver Age",level:19},
  {name:"Jadespire",      x:-185,z: -28, type:"Bronze Age",level:13},
  {name:"Kingsfall",      x: 175,z:-105, type:"Iron Age",  level:17},
  {name:"Lightshade",     x: -75,z: 175, type:"Stone Age", level:10},
  {name:"Moonhallow",     x: 135,z: 118, type:"Gold Age",  level:21},
  {name:"Nightwatch",     x:-125,z: -165,type:"Silver Age",level:15},
  {name:"Oakhaven",       x:  62,z:-175, type:"Bronze Age",level:12},
  {name:"Peakwatch",      x:-155,z:  125,type:"Iron Age",  level:16},
  {name:"Queensbury",     x: 195,z:  85, type:"Gold Age",  level:23},
  {name:"Ravencrest",     x: -22,z: 195, type:"Silver Age",level:18},
  {name:"Shadowfen",      x: -92,z: -48, type:"Stone Age", level:9 },
  {name:"Thornwall",      x:  48,z:  92, type:"Bronze Age",level:14},
  {name:"Umbervale",      x: 112,z: -52, type:"Iron Age",  level:20},
  {name:"Veilstone",      x:-188,z: -92, type:"Gold Age",  level:25},
  {name:"Windmere",       x:  -5,z:-140, type:"Silver Age",level:17},
  {name:"Xanthos",        x: 182,z:-178, type:"Bronze Age",level:11},
  {name:"Yellowspire",    x:-135,z:  -5, type:"Iron Age",  level:15},
  {name:"Zephyrhold",     x:  65,z: 165, type:"Stone Age", level:8 },
  {name:"Arcaneveil",     x: -55,z:  55, type:"Gold Age",  level:22},
  {name:"Bladehaven",     x: 105,z:  -8, type:"Silver Age",level:19},
  {name:"Cindermoor",     x: -95,z: 105, type:"Bronze Age",level:16},
  {name:"Dawnridge",      x: 145,z:  -62,type:"Iron Age",  level:13},
  {name:"Eclipsegate",    x: -48,z: -105,type:"Gold Age",  level:21},
  {name:"Flamewatch",     x: 165,z:  165,type:"Silver Age",level:18},
  {name:"Gloomspire",     x:-165,z:  -55,type:"Bronze Age",level:14},
  {name:"Highmantle",     x:  95,z: -148,type:"Iron Age",  level:20},
  {name:"Ironveil Keep",  x:  -8,z:   38,type:"Gold Age",  level:26},
  {name:"Jadehaven",      x: -75,z: -145,type:"Silver Age",level:17},
];

// ── Colour themes ─────────────────────────────────────────────────────────────
const THEMES = [
  {wall:new Color3(0.52,0.48,0.42), roof:new Color3(0.20,0.16,0.12), flag:new Color3(0.72,0.16,0.16)},
  {wall:new Color3(0.48,0.52,0.58), roof:new Color3(0.12,0.16,0.28), flag:new Color3(0.18,0.28,0.72)},
  {wall:new Color3(0.54,0.52,0.42), roof:new Color3(0.22,0.20,0.10), flag:new Color3(0.20,0.62,0.20)},
  {wall:new Color3(0.58,0.52,0.44), roof:new Color3(0.28,0.18,0.10), flag:new Color3(0.80,0.62,0.16)},
  {wall:new Color3(0.46,0.44,0.52), roof:new Color3(0.18,0.12,0.26), flag:new Color3(0.68,0.20,0.68)},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function addShadow(mesh: Mesh, sg: ShadowGenerator | null) {
  if (!sg) return;
  sg.addShadowCaster(mesh, true);
  mesh.receiveShadows = true;
}

function labelPlane(
  scene: Scene, parent: Mesh, k: Kingdom, h: number
) {
  const p = MeshBuilder.CreatePlane(`lbl_${k.name}`,{width:4.5,height:1.6},scene);
  p.position = new Vector3(0, h+2.5, 0);
  p.billboardMode = Mesh.BILLBOARDMODE_ALL;
  p.parent = parent;

  const t = new DynamicTexture(`lt_${k.name}`,{width:360,height:128},scene,false);
  const ctx = t.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0,0,360,128);

  // diamond
  const dx=32,dy=64,ds=18;
  ctx.save(); ctx.translate(dx,dy); ctx.rotate(Math.PI/4);
  ctx.fillStyle="#d4922a"; ctx.fillRect(-ds/2,-ds/2,ds,ds);
  ctx.strokeStyle="rgba(255,255,255,0.9)"; ctx.lineWidth=2.5;
  ctx.strokeRect(-ds/2,-ds/2,ds,ds); ctx.restore();

  ctx.fillStyle="#fff"; ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=5;
  ctx.font="bold 22px Arial"; ctx.textAlign="left"; ctx.textBaseline="middle";
  ctx.fillText(`Lv.${k.level}  ${k.name}`,58,64);
  t.update();

  const m=new StandardMaterial(`lm_${k.name}`,scene);
  m.diffuseTexture=t; m.diffuseTexture.hasAlpha=true;
  m.useAlphaFromDiffuseTexture=true;
  m.emissiveColor=new Color3(1,1,1); m.disableLighting=true;
  m.backFaceCulling=false; p.material=m;
}

// ── Standard castle (small/medium) ───────────────────────────────────────────
function buildCastle(
  scene: Scene, k: Kingdom, sg: ShadowGenerator|null,
  onSelect: (k:Kingdom)=>void, S=1.0, themeIdx=0,
) {
  const theme = THEMES[themeIdx % THEMES.length];
  const root  = new Mesh(`kr_${k.name}`,scene);
  root.position = new Vector3(k.x, 0, k.z);

  const wm = new StandardMaterial(`wm_${k.name}`,scene);
  wm.diffuseColor=theme.wall; wm.specularColor=Color3.Black();
  wm.ambientColor=theme.wall.scale(0.5);

  const rm = new StandardMaterial(`rm_${k.name}`,scene);
  rm.diffuseColor=theme.roof; rm.specularColor=Color3.Black();
  rm.ambientColor=theme.roof.scale(0.5);

  const click = (m: Mesh) => {
    m.parent=root; addShadow(m,sg);
    m.actionManager=new ActionManager(scene);
    m.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger,()=>onSelect(k))
    );
  };

  const BW=5.5*S, WH=1.6*S;

  const base=MeshBuilder.CreateBox(`b_${k.name}`,{width:BW+S,height:0.28*S,depth:BW+S},scene);
  base.position.y=0.14*S; base.material=wm; click(base);

  [[BW,WH,0.32*S,0,-BW/2],[BW,WH,0.32*S,0,BW/2],
   [0.32*S,WH,BW,-BW/2,0],[0.32*S,WH,BW,BW/2,0]].forEach(([w,h,d,px,pz],i)=>{
    const wall=MeshBuilder.CreateBox(`w_${k.name}_${i}`,{width:w as number,height:h as number,depth:d as number},scene);
    wall.position.set(px as number,0.28*S+WH/2,pz as number); wall.material=wm; click(wall);
  });

  const twrD=1.4*S, twrH=3.8*S;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([tx,tz],i)=>{
    const twr=MeshBuilder.CreateCylinder(`t_${k.name}_${i}`,
      {height:twrH,diameter:twrD,tessellation:9},scene);
    twr.position.set(tx*(BW/2),0.28*S+twrH/2,tz*(BW/2)); twr.material=wm; click(twr);
    const cap=MeshBuilder.CreateCylinder(`tc_${k.name}_${i}`,
      {height:twrD*0.9,diameterTop:0,diameterBottom:twrD*1.1,tessellation:9},scene);
    cap.position.set(tx*(BW/2),0.28*S+twrH+twrD*0.45,tz*(BW/2)); cap.material=rm; click(cap);
  });

  const kw=3*S,kh=3.5*S;
  const keep=MeshBuilder.CreateBox(`k_${k.name}`,{width:kw,height:kh,depth:kw},scene);
  keep.position.y=0.28*S+kh/2; keep.material=wm; click(keep);
  const kr=MeshBuilder.CreateCylinder(`kr_${k.name}`,
    {height:kw*0.7,diameterTop:0,diameterBottom:kw*1.15,tessellation:8},scene);
  kr.position.y=0.28*S+kh+kw*0.35; kr.material=rm; click(kr);

  labelPlane(scene,root,k,0.28*S+kh+kw*0.7);
}

// ── Hero Kingdom ──────────────────────────────────────────────────────────────
function buildHeroKingdom(
  scene: Scene, sg: ShadowGenerator|null, gl: GlowLayer,
  onSelect: (k:Kingdom)=>void,
): Kingdom {
  const hero: Kingdom = {name:"Ironveil Citadel",x:28,z:-18,type:"Gold Age",level:30};

  const root=new Mesh("hero",scene);
  root.position=new Vector3(hero.x,0,hero.z);

  const S=1.8;

  const wallM=new StandardMaterial("heroWall",scene);
  wallM.diffuseColor=new Color3(0.52,0.48,0.40); wallM.specularColor=Color3.Black();
  wallM.ambientColor=new Color3(0.55,0.52,0.45);

  const roofM=new StandardMaterial("heroRoof",scene);
  roofM.diffuseColor=new Color3(0.24,0.18,0.12); roofM.specularColor=Color3.Black();

  const glowM=new StandardMaterial("heroGlow",scene);
  glowM.emissiveColor=new Color3(0.8,0.55,0.1);
  glowM.disableLighting=true;

  const flagM=new StandardMaterial("heroFlag",scene);
  flagM.diffuseColor=new Color3(0.72,0.12,0.12); flagM.specularColor=Color3.Black();

  const click=(m: Mesh)=>{
    m.parent=root; addShadow(m,sg);
    m.actionManager=new ActionManager(scene);
    m.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger,()=>onSelect(hero))
    );
  };

  // Outer bailey
  const OW=14*S;
  [[OW,2*S,1.2*S,0,-(OW/2)],[OW,2*S,1.2*S,0,OW/2],
   [1.2*S,2*S,OW,-(OW/2),0],[1.2*S,2*S,OW,OW/2,0]].forEach(([w,h,d,px,pz],i)=>{
    const wall=MeshBuilder.CreateBox(`hw_${i}`,{width:w as number,height:h as number,depth:d as number},scene);
    wall.position.set(px as number,h/2,pz as number); wall.material=wallM; click(wall);
  });

  // Outer corner towers
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([tx,tz],i)=>{
    const h=7*S,d=2.2*S;
    const twr=MeshBuilder.CreateCylinder(`ht_${i}`,{height:h,diameter:d,tessellation:9},scene);
    twr.position.set(tx*(OW/2),h/2,tz*(OW/2)); twr.material=wallM; click(twr);
    const cap=MeshBuilder.CreateCylinder(`htc_${i}`,{height:d*0.85,diameterTop:0,diameterBottom:d*1.1,tessellation:9},scene);
    cap.position.set(tx*(OW/2),h+d*0.425,tz*(OW/2)); cap.material=roofM; click(cap);
    // Glowing window slit
    const win=MeshBuilder.CreateBox(`hw_${i}`,{width:0.3,height:0.5,depth:0.3},scene);
    win.position.set(tx*(OW/2+0.1),h*0.62,tz*(OW/2+0.1)); win.material=glowM; click(win);
  });

  // Inner keep
  const KW=6*S, KH=12*S;
  const keep=MeshBuilder.CreateBox("hKeep",{width:KW,height:KH,depth:KW},scene);
  keep.position.y=KH/2; keep.material=wallM; click(keep);

  // Keep pyramid roof
  const kRoof=MeshBuilder.CreateCylinder("hKeepRoof",
    {height:KW*1.1,diameterTop:0,diameterBottom:KW*1.15,tessellation:8},scene);
  kRoof.position.y=KH+KW*0.55; kRoof.material=roofM; click(kRoof);

  // Keep flanking towers (mid-height)
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([tx,tz],i)=>{
    const h=8.5*S,d=1.8*S;
    const t=MeshBuilder.CreateCylinder(`hft_${i}`,{height:h,diameter:d,tessellation:9},scene);
    t.position.set(tx*(KW/2+0.5),h/2,tz*(KW/2+0.5)); t.material=wallM; click(t);
    const c=MeshBuilder.CreateCylinder(`hftc_${i}`,{height:d*0.8,diameterTop:0,diameterBottom:d*1.1,tessellation:9},scene);
    c.position.set(tx*(KW/2+0.5),h+d*0.4,tz*(KW/2+0.5)); c.material=roofM; click(c);
  });

  // Grand flag / central spire
  const spire=MeshBuilder.CreateCylinder("hSpire",
    {height:9*S,diameter:0.4*S,tessellation:6},scene);
  spire.position.y=KH+KW*1.1+4.5*S; spire.material=glowM; click(spire);
  gl.addIncludedOnlyMesh(spire);

  const flag=MeshBuilder.CreateBox("hFlag",{width:2.2*S,height:1.0*S,depth:0.1*S},scene);
  flag.position.set(1.1*S, KH+KW*1.1+8.8*S, 0); flag.material=flagM; click(flag);

  // Glowing wall torches (8 points)
  for (let t=0;t<8;t++) {
    const angle=t/8*Math.PI*2;
    const torch=MeshBuilder.CreateSphere(`htorch_${t}`,{diameter:0.5*S,segments:5},scene);
    torch.position.set(Math.cos(angle)*(OW/2+0.1),2.4*S,Math.sin(angle)*(OW/2+0.1));
    torch.material=glowM; torch.parent=root;
    gl.addIncludedOnlyMesh(torch);
  }

  labelPlane(scene,root,hero,KH+KW*1.1+2);
  return hero;
}

// ── Ancient Temple ─────────────────────────────────────────────────────────────
function buildAncientTemple(
  scene: Scene, sg: ShadowGenerator|null, gl: GlowLayer,
) {
  const root=new Mesh("ancientTemple",scene);
  root.position=new Vector3(0,0,0); // Center of the world

  const stoneMat=new StandardMaterial("tmplStone",scene);
  stoneMat.diffuseColor=new Color3(0.78,0.72,0.60); stoneMat.specularColor=Color3.Black();
  stoneMat.ambientColor=new Color3(0.7,0.65,0.55);

  const pillarMat=new StandardMaterial("tmplPillar",scene);
  pillarMat.diffuseColor=new Color3(0.86,0.80,0.68); pillarMat.specularColor=Color3.Black();
  pillarMat.ambientColor=new Color3(0.78,0.72,0.62);

  const glowGold=new StandardMaterial("tmplGlow",scene);
  glowGold.emissiveColor=new Color3(0.9,0.65,0.08); glowGold.disableLighting=true;

  const glowCyan=new StandardMaterial("tmplCyan",scene);
  glowCyan.emissiveColor=new Color3(0.2,0.85,0.95); glowCyan.disableLighting=true;

  const add=(m: Mesh)=>{m.parent=root; addShadow(m,sg);};

  // Tier 1 — grand outer platform
  const t1=MeshBuilder.CreateCylinder("t1",{height:2.5,diameter:38,tessellation:24},scene);
  t1.position.y=1.25; t1.material=stoneMat; add(t1);

  // Tier 2
  const t2=MeshBuilder.CreateCylinder("t2",{height:2.5,diameter:26,tessellation:20},scene);
  t2.position.y=3.75; t2.material=stoneMat; add(t2);

  // Tier 3
  const t3=MeshBuilder.CreateCylinder("t3",{height:2.5,diameter:16,tessellation:16},scene);
  t3.position.y=6.25; t3.material=stoneMat; add(t3);

  // Tier 4
  const t4=MeshBuilder.CreateCylinder("t4",{height:3.0,diameter:9,tessellation:12},scene);
  t4.position.y=9.0; t4.material=pillarMat; add(t4);

  // 12 outer columns around tier 1
  for (let c=0;c<12;c++) {
    const angle=c/12*Math.PI*2;
    const col=MeshBuilder.CreateCylinder(`col_${c}`,{height:10,diameter:1.4,tessellation:9},scene);
    col.position.set(Math.cos(angle)*17.5, 2.5+5, Math.sin(angle)*17.5);
    col.material=pillarMat; add(col);
    const cap=MeshBuilder.CreateCylinder(`colcap_${c}`,{height:1.4,diameterTop:2.2,diameterBottom:2.2,tessellation:9},scene);
    cap.position.set(Math.cos(angle)*17.5, 2.5+10+0.7, Math.sin(angle)*17.5);
    cap.material=pillarMat; add(cap);
  }

  // 8 inner columns around tier 3
  for (let c=0;c<8;c++) {
    const angle=c/8*Math.PI*2;
    const col=MeshBuilder.CreateCylinder(`icol_${c}`,{height:8,diameter:1.0,tessellation:8},scene);
    col.position.set(Math.cos(angle)*7, 7.5+4, Math.sin(angle)*7);
    col.material=pillarMat; add(col);
  }

  // Central grand spire
  const spire=MeshBuilder.CreateCylinder("tmplSpire",
    {height:38,diameter:2.8,tessellation:8},scene);
  spire.position.y=10.5+19; spire.material=pillarMat; add(spire);

  const spireTip=MeshBuilder.CreateCylinder("tmplSpireTip",
    {height:8,diameterTop:0,diameterBottom:3.2,tessellation:8},scene);
  spireTip.position.y=10.5+38+4; spireTip.material=glowGold; add(spireTip);
  gl.addIncludedOnlyMesh(spireTip);

  // Glowing crystal orb at apex
  const orb=MeshBuilder.CreateSphere("tmplOrb",{diameter:3,segments:12},scene);
  orb.position.y=10.5+38+8+1.5; orb.material=glowGold; add(orb);
  gl.addIncludedOnlyMesh(orb);

  // 4 obelisks on outer platform corners
  [0,1,2,3].forEach(i=>{
    const angle=i/4*Math.PI*2 + Math.PI/4;
    const obl=MeshBuilder.CreateCylinder(`obl_${i}`,
      {height:20,diameterTop:0.3,diameterBottom:2.0,tessellation:6},scene);
    obl.position.set(Math.cos(angle)*15, 2.5+10, Math.sin(angle)*15);
    obl.material=stoneMat; add(obl);
    const ot=MeshBuilder.CreateSphere(`oblt_${i}`,{diameter:1.8,segments:8},scene);
    ot.position.set(Math.cos(angle)*15, 2.5+20+0.9, Math.sin(angle)*15);
    ot.material=glowCyan; add(ot);
    gl.addIncludedOnlyMesh(ot);
  });

  // Ground runescribed ring (glowing circle on the ground)
  const ring=MeshBuilder.CreateTorus("tmplRing",
    {diameter:44,thickness:0.6,tessellation:60},scene);
  ring.position.y=0.1; ring.material=glowGold; add(ring);
  gl.addIncludedOnlyMesh(ring);

  // Title label
  const lp=MeshBuilder.CreatePlane("tmplLbl",{width:10,height:2.2},scene);
  lp.position=new Vector3(0,70,0);
  lp.billboardMode=Mesh.BILLBOARDMODE_ALL;
  lp.parent=root;
  const lt=new DynamicTexture("tmplLblTex",{width:512,height:128},scene,false);
  const lc=lt.getContext() as CanvasRenderingContext2D;
  lc.clearRect(0,0,512,128);
  lc.fillStyle="#f0c840"; lc.shadowColor="rgba(0,0,0,0.9)"; lc.shadowBlur=8;
  lc.font="bold 34px serif"; lc.textAlign="center"; lc.textBaseline="middle";
  lc.fillText("✦ ANCIENT TEMPLE ✦",256,64);
  lt.update();
  const lm=new StandardMaterial("tmplLblMat",scene);
  lm.diffuseTexture=lt; lm.diffuseTexture.hasAlpha=true;
  lm.useAlphaFromDiffuseTexture=true;
  lm.emissiveColor=new Color3(1,1,1); lm.disableLighting=true; lm.backFaceCulling=false;
  lp.material=lm;
}

// ── Shrines ───────────────────────────────────────────────────────────────────
function buildShrine(
  scene: Scene, x: number, z: number, tier: "A"|"B"|"C",
  gl: GlowLayer,
) {
  const root=new Mesh(`shrine_${tier}_${x}`,scene);
  root.position=new Vector3(x,0,z);

  const stoneMat=new StandardMaterial(`shrineStone_${tier}`,scene);
  stoneMat.diffuseColor=new Color3(0.55,0.52,0.46); stoneMat.specularColor=Color3.Black();

  const glowMat=new StandardMaterial(`shrineGlow_${tier}`,scene);
  if(tier==="A") glowMat.emissiveColor=new Color3(0.9,0.62,0.08);
  else if(tier==="B") glowMat.emissiveColor=new Color3(0.18,0.72,0.95);
  else glowMat.emissiveColor=new Color3(0.42,0.82,0.42);
  glowMat.disableLighting=true;

  const stones = tier==="A"?8 : tier==="B"?6 : 5;
  const radius  = tier==="A"?5  : tier==="B"?3.8 : 3;
  const stoneH  = tier==="A"?4  : tier==="B"?3   : 2;

  for(let s=0;s<stones;s++){
    const a=s/stones*Math.PI*2;
    const st=MeshBuilder.CreateBox(`ss_${tier}_${x}_${s}`,
      {width:0.7,height:stoneH,depth:0.45},scene);
    st.position.set(Math.cos(a)*radius, stoneH/2, Math.sin(a)*radius);
    st.rotation.y=a; st.material=stoneMat; st.parent=root;
  }

  if(tier!=="C"){
    // Central structure
    const central=MeshBuilder.CreateCylinder(`shrineCtr_${tier}`,
      {height:tier==="A"?8:5, diameter:1.0, tessellation:7},scene);
    central.position.y=tier==="A"?4:2.5; central.material=stoneMat; central.parent=root;
    const orb=MeshBuilder.CreateSphere(`shrineOrb_${tier}`,
      {diameter:tier==="A"?2.0:1.5,segments:10},scene);
    orb.position.y=tier==="A"?8+1.0:5+0.75; orb.material=glowMat; orb.parent=root;
    gl.addIncludedOnlyMesh(orb);
  }

  if(tier==="A"){
    // Extra crystal formations
    for(let c=0;c<4;c++){
      const a=c/4*Math.PI*2;
      const cry=MeshBuilder.CreateCylinder(`shrineXtl_${x}_${c}`,
        {height:3,diameterTop:0,diameterBottom:0.8,tessellation:6},scene);
      cry.position.set(Math.cos(a)*2,1.5,Math.sin(a)*2);
      cry.material=glowMat; cry.parent=root;
      gl.addIncludedOnlyMesh(cry);
    }
    // Outer glow ring
    const ring=MeshBuilder.CreateTorus(`shrineRing_${x}`,
      {diameter:radius*2+1,thickness:0.25,tessellation:40},scene);
    ring.position.y=0.12; ring.material=glowMat; ring.parent=root;
    gl.addIncludedOnlyMesh(ring);
  }
}

// ── Public entry point ────────────────────────────────────────────────────────
export function generateKingdomPositions(): Kingdom[] {
  return PRESET_KINGDOMS;
}

export function createLandmarks(
  scene: Scene,
  kingdoms: Kingdom[],
  sg: ShadowGenerator | null,
  gl: GlowLayer,
  onSelect: (k: Kingdom) => void,
) {
  const rand = seededRand(99173);

  // Ancient Temple — world centrepiece
  buildAncientTemple(scene, sg, gl);

  // Hero kingdom
  const hero = buildHeroKingdom(scene, sg, gl, onSelect);

  // Standard kingdoms
  kingdoms.forEach((k, i) => {
    if (k.name === hero.name) return; // skip hero duplicate
    buildCastle(scene, k, sg, onSelect, 0.82 + rand()*0.38, i % THEMES.length);
  });

  // Shrines — ring around the temple
  // Type A (closest, 4 positions)
  [[38,0],[-38,0],[0,38],[0,-38]].forEach(([sx,sz])=>{
    buildShrine(scene,sx,sz,"A",gl);
  });
  // Type B (middle ring, 6 positions)
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2+0.3;
    buildShrine(scene,Math.cos(a)*85,Math.sin(a)*85,"B",gl);
  }
  // Type C (outer ring, 8 positions)
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2+0.15;
    buildShrine(scene,Math.cos(a)*145,Math.sin(a)*145,"C",gl);
  }
}
