// Riverside details for the hero scene: coconut palms, boroi (Indian plum) trees, bushes
// and nowkas, the wooden country boats of the Meghna.
import * as THREE from 'three';

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function stripeTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A tube along a curve whose radius changes along its length (the trunk of a palm or a branch). */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 16, radial = 8) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), r = THREE.MathUtils.lerp(r0, r1, t);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(p.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), p.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y), p.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z));
      uv.push(t, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

let trunkTex: THREE.Texture | null = null;
const palmTrunkTexture = () =>
  (trunkTex ??= stripeTexture(256, 16, (g) => {
    // ring scars of a coconut trunk
    g.fillStyle = '#6b5a45'; g.fillRect(0, 0, 256, 16);
    for (let x = 0; x < 256; x += 8) {
      g.fillStyle = 'rgba(30,22,14,0.55)'; g.fillRect(x, 0, 2, 16);
      g.fillStyle = 'rgba(160,140,110,0.35)'; g.fillRect(x + 2, 0, 1, 16);
    }
  }));

/**
 * A coconut palm: a ringed, tapering, curved trunk, a crown of arching fronds made of
 * many hanging leaflets, a few dry fronds and a cluster of coconuts.
 */
export function createCoconutPalm(height = 10, lean = 1.5) {
  const g = new THREE.Group();
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.1, height * 0.35, 0),
    new THREE.Vector3(lean * 0.6, height * 0.75, lean * 0.1),
    new THREE.Vector3(lean, height, 0),
  );
  const trunkMat = new THREE.MeshStandardMaterial({ map: palmTrunkTexture(), roughness: 0.95 });
  trunkMat.map!.repeat.set(height / 4, 1);
  g.add(new THREE.Mesh(taperedTube(curve, height * 0.032, height * 0.02, 18, 9), trunkMat));
  // the swollen base of the trunk
  const base = new THREE.Mesh(new THREE.SphereGeometry(height * 0.045, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), trunkMat);
  base.scale.y = 0.6;
  g.add(base);

  // fronds, merged into one geometry with per-vertex colour
  const pos: number[] = [], col: number[] = [];
  const green = new THREE.Color(0x3f7a33), light = new THREE.Color(0x6aa148), dry = new THREE.Color(0x8a6a3a);
  const top = curve.getPoint(1);
  const nFronds = 16;
  for (let f = 0; f < nFronds; f++) {
    const isDry = f >= nFronds - 3;
    const yaw = (f / nFronds) * Math.PI * 2 + rand(-0.15, 0.15);
    const lift = isDry ? -1.2 : rand(-0.35, 0.55); // dry fronds hang down
    const L = height * (isDry ? 0.35 : rand(0.4, 0.5));
    const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const ribAt = (s: number) => {
      // an arching rib: rises, then droops under its own weight
      const d = s * L;
      const y = Math.sin(lift) * d - (isDry ? 0.1 : 0.55) * d * d / L;
      return top.clone().addScaledVector(dir, d * Math.cos(lift * 0.6)).add(new THREE.Vector3(0, y, 0));
    };
    const steps = 22;
    for (let i = 1; i < steps; i++) {
      const s = i / steps, p = ribAt(s), pn = ribAt(Math.min(1, s + 1 / steps));
      const leafLen = L * 0.32 * Math.sin(Math.PI * Math.min(1, s * 1.15)) + L * 0.04;
      const c = (isDry ? dry : green).clone().lerp(light, isDry ? 0 : rand(0, 0.5));
      for (const sd of [1, -1]) {
        // each leaflet hangs downward and outward from the rib like a thin blade
        const tip = p.clone().addScaledVector(side, sd * leafLen * 0.8).add(new THREE.Vector3(0, -leafLen * 0.55, 0)).addScaledVector(dir, leafLen * 0.25);
        const w = pn.clone().sub(p).multiplyScalar(0.55);
        pos.push(p.x, p.y, p.z, p.x + w.x, p.y + w.y, p.z + w.z, tip.x, tip.y, tip.z);
        for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
      }
      // the rib itself
      const r = L * 0.012;
      pos.push(p.x, p.y + r, p.z, pn.x, pn.y + r, pn.z, p.x, p.y - r, p.z);
      for (let k = 0; k < 3; k++) col.push(0.45, 0.42, 0.25);
    }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  fg.computeVertexNormals();
  const crown = new THREE.Group();
  crown.position.copy(top);
  fg.translate(-top.x, -top.y, -top.z);
  crown.add(new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 })));
  // coconuts tucked under the crown
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x5f6b2a, roughness: 0.6 });
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    const n = new THREE.Mesh(new THREE.SphereGeometry(height * 0.028, 10, 8), nutMat);
    n.scale.set(1, 1.15, 1);
    n.position.set(Math.cos(a) * height * 0.04, -height * (0.03 + (i % 2) * 0.02), Math.sin(a) * height * 0.04);
    crown.add(n);
  }
  g.add(crown);
  const ph = Math.random() * 6;
  g.userData.tick = (t: number) => {
    crown.rotation.z = Math.sin(t * 0.9 + ph) * 0.04;
    crown.rotation.x = Math.cos(t * 0.7 + ph) * 0.03;
  };
  return g;
}

/** A leafy clump: an icosahedron pushed in and out so it looks like a mass of leaves. */
function leafClump(r: number, c1: number, c2: number) {
  const geo = new THREE.IcosahedronGeometry(r, 2);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const a = new THREE.Color(c1), b = new THREE.Color(c2), cols: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.18 * Math.sin(v.x * 7 / r) * Math.cos(v.z * 6 / r) + rand(-0.08, 0.08);
    v.multiplyScalar(n);
    v.y *= 0.8;
    p.setXYZ(i, v.x, v.y, v.z);
    const c = a.clone().lerp(b, THREE.MathUtils.clamp(0.5 + v.y / r * 0.6 + rand(-0.15, 0.15), 0, 1));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A boroi (Indian plum) tree: a crooked trunk, spreading branches, a rounded canopy and small ripe fruit. */
export function createPlumTree(height = 7) {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, height * 0.25, 0.1), new THREE.Vector3(-0.1, height * 0.45, 0)]);
  g.add(new THREE.Mesh(taperedTube(trunk, height * 0.05, height * 0.035, 8, 8), bark));
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  const fork = trunk.getPoint(1);
  const clumps: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand(-0.3, 0.3);
    const end = fork.clone().add(new THREE.Vector3(Math.cos(a) * height * 0.28, height * rand(0.18, 0.3), Math.sin(a) * height * 0.28));
    const mid = fork.clone().lerp(end, 0.5).add(new THREE.Vector3(0, height * 0.05, 0));
    g.add(new THREE.Mesh(taperedTube(new THREE.CatmullRomCurve3([fork, mid, end]), height * 0.03, height * 0.012, 6, 6), bark));
    clumps.push(end);
  }
  clumps.push(fork.clone().add(new THREE.Vector3(0, height * 0.42, 0)));
  const fruitMat = new THREE.MeshStandardMaterial({ color: 0xd2742a, roughness: 0.45, emissive: 0x3a1a05, emissiveIntensity: 0.4 });
  const fruitGeo = new THREE.SphereGeometry(height * 0.018, 8, 6);
  const fruits = new THREE.InstancedMesh(fruitGeo, fruitMat, 40);
  const m = new THREE.Matrix4();
  let fi = 0;
  clumps.forEach((c, i) => {
    const r = height * (i === clumps.length - 1 ? 0.3 : 0.24);
    const clump = new THREE.Mesh(leafClump(r, 0x203d1c, 0x5a8a3a), leafMat);
    clump.position.copy(c);
    g.add(clump);
    for (let k = 0; k < 8 && fi < 40; k++, fi++) {
      const d = new THREE.Vector3(rand(-1, 1), rand(-0.6, 0.4), rand(-1, 1)).normalize().multiplyScalar(r * 0.95);
      m.makeTranslation(c.x + d.x, c.y + d.y * 0.8, c.z + d.z);
      fruits.setMatrixAt(fi, m);
    }
  });
  fruits.count = fi;
  g.add(fruits);
  return g;
}

/** A low shrub or a clump of grass. */
export function createBush(size = 1.5) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(leafClump(size * rand(0.5, 0.8), 0x1c3419, 0x4c7a33), mat);
    c.position.set(rand(-size, size) * 0.6, size * 0.3, rand(-size, size) * 0.4);
    g.add(c);
  }
  return g;
}

/**
 * A nowka: a long wooden country boat with upswept bow and stern, a curved bamboo
 * canopy (chhoi), an optional patched square sail, a boatman with a pole and a lantern.
 */
export function createNowka(opts: { sail?: boolean; lantern?: boolean } = {}) {
  const g = new THREE.Group();
  const L = 9, W = 1.1, H = 0.75;
  // hull: cross-sections along the length, open at the top
  const segs = 28, around = 10;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = (i / segs) * 2 - 1; // -1 stern .. 1 bow
    const half = W * Math.pow(Math.max(0, 1 - u * u), 0.55);
    const rim = H + 1.1 * Math.pow(Math.abs(u), 5); // the ends sweep up
    const keel = -0.15 * (1 - u * u);
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * Math.PI; // from one gunwale, under the keel, to the other
      const z = Math.cos(a) * half;
      const y = THREE.MathUtils.lerp(keel, rim, Math.pow(Math.abs(Math.cos(a)), 0.7)) + (half < 0.05 ? (rim - keel) * 0 : 0);
      pos.push(u * L * 0.5, y, z);
      uv.push(i / segs, j / around);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < around; j++) {
    const a = i * (around + 1) + j, b = a + around + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  hg.setIndex(idx);
  hg.computeVertexNormals();
  const planks = stripeTexture(256, 64, (c) => {
    c.fillStyle = '#5a3a22'; c.fillRect(0, 0, 256, 64);
    for (let y = 0; y < 64; y += 8) { c.fillStyle = 'rgba(20,10,4,0.6)'; c.fillRect(0, y, 256, 1); }
    c.fillStyle = 'rgba(160,110,60,0.25)';
    for (let i = 0; i < 40; i++) c.fillRect(Math.random() * 256, Math.random() * 64, 20 + Math.random() * 30, 1);
    // a painted band near the gunwale, as on many Meghna boats
    c.fillStyle = '#8c2a1e'; c.fillRect(0, 0, 256, 5); c.fillRect(0, 59, 256, 5);
  });
  g.add(new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ map: planks, side: THREE.DoubleSide, roughness: 0.85 })));
  // thwarts (cross planks)
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 });
  [-2.6, -1, 2.2].forEach((x) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, W * 1.7), wood);
    t.position.set(x, H * 0.85, 0);
    g.add(t);
  });
  // chhoi: a half-tube canopy of woven bamboo
  const weave = stripeTexture(64, 64, (c) => {
    c.fillStyle = '#8a6a3c'; c.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 8) {
      c.fillStyle = 'rgba(40,25,10,0.5)'; c.fillRect(i, 0, 1, 64); c.fillRect(0, i, 64, 1);
      c.fillStyle = 'rgba(200,170,110,0.3)'; c.fillRect(i + 3, 0, 2, 64);
    }
  });
  weave.repeat.set(4, 3);
  const chhoi = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.95, W * 0.95, 2.6, 16, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: weave, side: THREE.DoubleSide, roughness: 0.95 }));
  chhoi.rotation.z = Math.PI / 2;
  chhoi.rotation.y = 0;
  chhoi.position.set(0.2, H * 0.9, 0);
  g.add(chhoi);
  // the boatman at the stern with a long bamboo pole
  const man = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 });
  const lungi = new THREE.MeshStandardMaterial({ color: 0x2c5a8a, roughness: 0.9 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.9 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.85, 8), lungi);
  legs.position.y = 0.42; man.add(legs);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 8), shirt);
  body.position.y = 1.15; man.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin);
  head.position.y = 1.62; man.add(head);
  const gamcha = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc23a3a }));
  gamcha.rotation.x = Math.PI / 2; gamcha.position.y = 1.7; man.add(gamcha);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6.5, 6), new THREE.MeshStandardMaterial({ color: 0xb59a5a }));
  pole.position.set(0.5, 1.2, 0.35); pole.rotation.z = 0.5;
  man.add(pole);
  man.position.set(-3.2, H * 0.6, 0);
  g.add(man);
  if (opts.sail) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 6, 6), wood);
    mast.position.set(1.6, H + 2.8, 0);
    g.add(mast);
    const sailTex = stripeTexture(128, 160, (c) => {
      const cols = ['#c9b48a', '#b89a6a', '#d8c9a0', '#a8876a', '#c0a070'];
      for (let y = 0; y < 160; y += 32) for (let x = 0; x < 128; x += 42) { c.fillStyle = cols[(x + y) % 5]; c.fillRect(x, y, 42, 32); }
      c.strokeStyle = 'rgba(60,40,20,0.6)'; c.lineWidth = 1;
      for (let y = 0; y < 160; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); }
    });
    const sg = new THREE.PlaneGeometry(2.8, 3.6, 8, 8);
    const sp = sg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, 0.35 * (1 - Math.pow(sp.getX(i) / 1.4, 2)) * (1 - Math.pow(sp.getY(i) / 1.8, 2)));
    sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 0.95 }));
    sail.rotation.y = Math.PI / 2 - 0.35;
    sail.position.set(1.6, H + 3.2, 0.2);
    g.add(sail);
  }
  if (opts.lantern !== false) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb050, emissiveIntensity: 2.5 }));
    lamp.position.set(1.6, H + 0.35, 0);
    g.add(lamp);
    g.userData.lampPos = lamp.position.clone();
  }
  return g;
}
