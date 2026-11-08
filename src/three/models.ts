// 3D models of the LSTU crest and its symbols, built from three.js primitives.
// Used by the hero crest, the coastal hero scene and the section scenes.
import * as THREE from 'three';

export const C = {
  navy: 0x0d2a5c,
  navyDeep: 0x071d3b,
  gold: 0xd4a23a,
  goldLight: 0xf1cf7a,
  white: 0xf7f5ef,
  red: 0xd8332b,
  blue: 0x2f6fd6,
  sunOrange: 0xf28c28,
  sunRed: 0xe2412b,
  page: 0xfbf6e8,
  bookBlue: 0x1f4f9a,
  trunk: 0x8a5a2b,
  leaf: 0x2e9b45,
  leafLight: 0x58c46a,
  sea: 0x2a7fc4,
  seaDeep: 0x1b5e9b,
  sand: 0xe7c98f,
  soil: 0x6b4426,
};

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });

/* ------------------------------------------------------------------ */
/* Shield outline (logo proportions), in a 2 x ~2.27 unit box          */
/* ------------------------------------------------------------------ */
// Source coordinates are a 300 x 340 drawing; convert to centred units.
const sx = (x: number) => (x - 150) / 150;
const sy = (y: number) => (170 - y) / 150;

export function shieldShape(inset = 0): THREE.Shape {
  const k = 1 - inset; // uniform shrink toward the centre for inner borders
  const p = (x: number, y: number) => new THREE.Vector2(sx(x) * k, sy(y) * k + (inset ? -0.02 : 0));
  const s = new THREE.Shape();
  const a = p(10, 16);
  s.moveTo(a.x, a.y);
  // top edge: rises gently to a point at the centre, like the crest
  const c1 = p(60, 18), c2 = p(115, 14), m = p(150, 4);
  s.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, m.x, m.y);
  const c3 = p(185, 14), c4 = p(240, 18), b = p(290, 16);
  s.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, b.x, b.y);
  const r1 = p(290, 175);
  s.lineTo(r1.x, r1.y);
  const c5 = p(290, 258), c6 = p(230, 306), tip = p(150, 334);
  s.bezierCurveTo(c5.x, c5.y, c6.x, c6.y, tip.x, tip.y);
  const c7 = p(70, 306), c8 = p(10, 258), l1 = p(10, 175);
  s.bezierCurveTo(c7.x, c7.y, c8.x, c8.y, l1.x, l1.y);
  s.lineTo(a.x, a.y);
  return s;
}

/** Shield face texture: the four quadrants of the real crest, gold dividers, LSTU at the tip. */
function shieldFaceTexture(): THREE.CanvasTexture {
  const W = 600, H = 680; // 2x the 300 x 340 drawing
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.scale(2, 2);
  const path = new Path2D('M10 16 C60 18 115 14 150 4 C185 14 240 18 290 16 L290 175 C290 258 230 306 150 334 C70 306 10 258 10 175 Z');
  g.save();
  g.clip(path);
  const navy = '#0d2a5c', white = '#f7f5ef';
  g.fillStyle = navy; g.fillRect(0, 0, 150, 160); // top-left: atom
  g.fillStyle = white; g.fillRect(150, 0, 150, 160); // top-right: sun and book
  g.fillStyle = white; g.fillRect(0, 160, 150, 92); // bottom-left: coast
  g.fillStyle = navy; g.fillRect(150, 160, 150, 92); // bottom-right: seedling
  g.fillStyle = navy; g.fillRect(0, 252, 300, 100); // tip: LSTU
  // dividers
  g.strokeStyle = '#d4a23a'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(150, 0); g.lineTo(150, 252); g.moveTo(0, 160); g.lineTo(300, 160); g.moveTo(0, 252); g.lineTo(300, 252); g.stroke();
  // LSTU wordmark (no ring around it, as on the real crest)
  g.fillStyle = '#f1cf7a';
  g.font = '700 34px "Playfair Display", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('LSTU', 150, 282);
  g.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Map a ShapeGeometry's raw x/y UVs onto 0..1 of the face texture. */
function fitUVs(geo: THREE.BufferGeometry) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const x = uv.getX(i), y = uv.getY(i);
    uv.setXY(i, (x * 150 + 150) / 300, 1 - (170 - y * 150) / 340);
  }
  uv.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/* Symbols                                                             */
/* ------------------------------------------------------------------ */
export function createAtom(scale = 1) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), std(C.red, { emissive: 0x5a0d08, roughness: 0.35 }));
  g.add(core);
  // a few nucleons for a richer nucleus
  [[0.05, 0.03, 0.02, C.blue], [-0.04, 0.04, -0.03, C.blue], [0.0, -0.05, 0.04, C.red]].forEach(([x, y, z, c]) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), std(c as number, { roughness: 0.35 }));
    n.position.set(x as number, y as number, z as number);
    g.add(n);
  });
  const rings: THREE.Group[] = [];
  const colors = [C.blue, C.red, 0x6cc3ff];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 10, 72), std(colors[i], { metalness: 0.3, roughness: 0.3, emissive: colors[i], emissiveIntensity: 0.15 }));
    ring.add(torus);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), std(0xffffff, { emissive: 0x9fdcff, emissiveIntensity: 0.8 }));
    e.position.x = 0.3;
    ring.add(e);
    ring.userData.electron = e;
    ring.scale.set(1, 0.42, 1);
    const holder = new THREE.Group();
    holder.add(ring);
    holder.rotation.z = (i * Math.PI) / 3;
    g.add(holder);
    rings.push(ring);
  }
  g.scale.setScalar(scale);
  g.userData.tick = (t: number) => {
    rings.forEach((r, i) => {
      const a = t * (1.6 + i * 0.4) + i * 2;
      (r.userData.electron as THREE.Mesh).position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
    });
    g.rotation.y = Math.sin(t * 0.6) * 0.5;
  };
  return g;
}

export function createBookSun(scale = 1) {
  const g = new THREE.Group();
  // sun: half disc with depth, and rays as small cones
  const sunGroup = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 32, 20),
    std(C.sunRed, { emissive: C.sunOrange, emissiveIntensity: 0.35, roughness: 0.4 }),
  );
  sun.scale.z = 0.55; // a rounded disc, rising behind the book
  sunGroup.add(sun);
  const rays = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const a = (i / 10) * Math.PI; // upper semicircle
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.11, 8), std(C.sunRed, { emissive: C.sunOrange, emissiveIntensity: 0.3 }));
    ray.position.set(Math.cos(a) * 0.23, Math.sin(a) * 0.23, 0);
    ray.rotation.z = a - Math.PI / 2;
    rays.add(ray);
  }
  sunGroup.add(rays);
  sunGroup.position.y = 0.06;
  g.add(sunGroup);

  // open book: two bent page blocks + covers
  const book = new THREE.Group();
  const pageShape = (dir: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(dir * 0.14, 0.05, dir * 0.28, 0.02);
    s.lineTo(dir * 0.28, -0.03);
    s.quadraticCurveTo(dir * 0.14, 0.0, 0, -0.05);
    s.closePath();
    return s;
  };
  [-1, 1].forEach((dir) => {
    const pages = new THREE.Mesh(new THREE.ExtrudeGeometry(pageShape(dir), { depth: 0.2, bevelEnabled: false }), std(C.page, { roughness: 0.8 }));
    pages.position.z = -0.1;
    book.add(pages);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), std(C.bookBlue));
    cover.position.set(dir * 0.145, -0.06, 0);
    cover.rotation.z = dir * 0.12;
    book.add(cover);
  });
  // page lines
  const lineMat = std(0x7a8aa8);
  for (let i = 0; i < 3; i++) {
    [-1, 1].forEach((dir) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.006), lineMat);
      l.position.set(dir * 0.14, 0.035 - i * 0.022, 0.101);
      book.add(l);
    });
  }
  book.rotation.x = 0.35;
  book.position.y = -0.14;
  g.add(book);
  g.scale.setScalar(scale);
  g.userData.tick = (t: number) => {
    rays.rotation.z = Math.sin(t * 0.8) * 0.06;
    rays.children.forEach((r, i) => { r.scale.y = 1 + Math.sin(t * 3 + i) * 0.15; });
    g.rotation.y = Math.sin(t * 0.5) * 0.35;
  };
  return g;
}

/** A low-poly palm tree. `dark` makes a dusk silhouette for the hero scene. */
export function createPalm(height = 1, lean = 0.25, dark = false) {
  const g = new THREE.Group();
  const trunkMat = std(dark ? 0x1a1d2a : C.trunk, { roughness: 0.9, flatShading: true });
  const leafMat = std(dark ? 0x0f1a22 : C.leaf, { roughness: 0.7, flatShading: true, side: THREE.DoubleSide });
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.2, height * 0.55, 0),
    new THREE.Vector3(lean, height, 0),
  );
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, height * 0.035, 6, false), trunkMat);
  g.add(trunk);
  const crown = new THREE.Group();
  crown.position.copy(curve.getPoint(1));
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const s = new THREE.Shape();
    const L = height * 0.42;
    s.moveTo(0, 0);
    s.quadraticCurveTo(L * 0.5, L * 0.16, L, 0);
    s.quadraticCurveTo(L * 0.5, -L * 0.04, 0, 0);
    const frond = new THREE.Mesh(new THREE.ShapeGeometry(s, 6), leafMat);
    const holder = new THREE.Group();
    frond.rotation.z = -0.35 - (i % 2) * 0.15; // droop
    holder.add(frond);
    holder.rotation.y = (i / fronds) * Math.PI * 2;
    holder.rotation.x = 0.15;
    crown.add(holder);
  }
  // coconuts
  if (!dark) {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(height * 0.03, 8, 6), std(0x5a3a1c));
      c.position.set(Math.cos(i * 2.1) * height * 0.035, -height * 0.03, Math.sin(i * 2.1) * height * 0.035);
      crown.add(c);
    }
  }
  g.add(crown);
  g.userData.crown = crown;
  g.userData.tick = (t: number) => {
    crown.rotation.z = Math.sin(t * 1.1 + height) * 0.06;
    crown.rotation.x = Math.cos(t * 0.9 + height) * 0.04;
  };
  return g;
}

/** A small animated patch of sea, built on a plane whose vertices move. */
export function createSea(w: number, d: number, segW: number, segD: number, color = C.sea, amp = 0.02, flat = true) {
  const geo = new THREE.PlaneGeometry(w, d, segW, segD);
  geo.rotateX(-Math.PI / 2);
  const mat = std(color, { roughness: 0.25, metalness: 0.15, flatShading: flat });
  const mesh = new THREE.Mesh(geo, mat);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array as Float32Array);
  mesh.userData.tick = (t: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.setY(i, Math.sin(x * 4 / w * 6 + t * 1.6) * amp + Math.cos(z * 3 / d * 6 + t * 1.2) * amp * 0.7 + Math.sin((x + z) * 2 + t * 2.3) * amp * 0.4);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return mesh;
}

export function createCoast(scale = 1) {
  const g = new THREE.Group();
  const sea = createSea(0.62, 0.36, 18, 10, C.sea, 0.012);
  sea.position.set(0.04, -0.09, 0.0);
  g.add(sea);
  // sandy beach curving into the sea
  const beachShape = new THREE.Shape();
  beachShape.moveTo(-0.35, -0.1);
  beachShape.quadraticCurveTo(-0.05, -0.02, 0.05, -0.2);
  beachShape.lineTo(-0.35, -0.2);
  beachShape.closePath();
  const beach = new THREE.Mesh(new THREE.ExtrudeGeometry(beachShape, { depth: 0.36, bevelEnabled: false }), std(C.sand, { roughness: 0.95 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0.02, -0.06, 0.16);
  beach.scale.set(0.8, 0.8, 0.1);
  g.add(beach);
  // green land behind
  const land = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0x3b8f45, { flatShading: true }));
  land.scale.set(1.1, 0.35, 0.8);
  land.position.set(-0.2, -0.11, -0.08);
  g.add(land);
  const palms = [createPalm(0.42, 0.1), createPalm(0.34, -0.08), createPalm(0.28, 0.12)];
  palms[0].position.set(-0.22, -0.1, 0.0);
  palms[1].position.set(-0.08, -0.1, -0.06);
  palms[2].position.set(-0.3, -0.1, -0.1);
  palms.forEach((p) => g.add(p));
  g.scale.setScalar(scale);
  g.userData.tick = (t: number) => {
    (sea.userData.tick as (t: number) => void)(t);
    palms.forEach((p) => (p.userData.tick as (t: number) => void)(t));
  };
  return g;
}

export function createSeedling(scale = 1) {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(C.soil, { roughness: 1, flatShading: true }));
  soil.scale.set(1, 0.32, 0.6);
  soil.position.y = -0.2;
  g.add(soil);
  // little soil clumps
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.03), std(0x5a3920, { flatShading: true }));
    c.position.set(-0.2 + i * 0.08, -0.19 + Math.sin(i) * 0.01, 0.1 * Math.cos(i * 2));
    g.add(c);
  }
  const stemCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.18, 0), new THREE.Vector3(0.02, 0.0, 0), new THREE.Vector3(0, 0.16, 0));
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 10, 0.018, 8, false), std(C.leaf));
  g.add(stem);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.08, 0.1, 0.24, 0.06);
  leafShape.quadraticCurveTo(0.12, -0.04, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
  const leafMat = std(C.leafLight, { roughness: 0.5 });
  const right = new THREE.Mesh(leafGeo, leafMat);
  right.position.set(0.0, 0.08, 0);
  right.rotation.set(0.2, -0.3, 0.35);
  const left = new THREE.Mesh(leafGeo, leafMat);
  left.position.set(0.0, 0.0, 0);
  left.rotation.set(-0.2, Math.PI + 0.3, -0.35);
  left.scale.setScalar(0.85);
  g.add(right, left);
  g.scale.setScalar(scale);
  g.userData.grow = 1;
  g.userData.tick = (t: number) => {
    right.rotation.z = 0.35 + Math.sin(t * 1.4) * 0.08;
    left.rotation.z = -0.35 - Math.sin(t * 1.4 + 1) * 0.08;
    g.rotation.y = Math.sin(t * 0.5) * 0.4;
  };
  return g;
}

/* ------------------------------------------------------------------ */
/* Ribbon with the Bangla name                                         */
/* ------------------------------------------------------------------ */
function ribbonTexture(text: string) {
  const cv = document.createElement('canvas');
  cv.width = 1400; cv.height = 140;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#0d2a5c'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#d4a23a'; g.lineWidth = 8; g.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  g.fillStyle = '#ffffff';
  g.font = '600 74px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2 + 6);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createRibbon(text: string) {
  const W = 2.6, H = 0.26;
  const geo = new THREE.PlaneGeometry(W, H, 40, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    // smile-shaped banner that wraps slightly toward the viewer at the ends
    pos.setY(i, pos.getY(i) + (x * x) * 0.16);
    pos.setZ(i, (x * x) * 0.12);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: ribbonTexture(text), roughness: 0.6, side: THREE.DoubleSide });
  const ribbon = new THREE.Mesh(geo, mat);
  return ribbon;
}

/* ------------------------------------------------------------------ */
/* The full crest                                                      */
/* ------------------------------------------------------------------ */
export function createCrest(bnName: string) {
  const crest = new THREE.Group();
  const depth = 0.16;

  // gold rim (extruded outer shield)
  const rim = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shieldShape(), { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }),
    std(C.gold, { metalness: 0.75, roughness: 0.28 }),
  );
  rim.position.z = -depth;
  crest.add(rim);
  // navy outer border band and the painted face sit just in front of the rim
  const band = new THREE.Mesh(new THREE.ShapeGeometry(shieldShape(0.0), 48), std(C.navy, { roughness: 0.5 }));
  band.position.z = 0.032;
  crest.add(band);
  const faceGeo = new THREE.ShapeGeometry(shieldShape(0.07), 48);
  fitUVs(faceGeo);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: shieldFaceTexture(), roughness: 0.6, metalness: 0.0 }));
  face.position.z = 0.036;
  crest.add(face);
  // thin gold inner border line
  const innerLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(shieldShape(0.07).getPoints(120).map((p) => new THREE.Vector3(p.x, p.y, 0.04))),
    new THREE.LineBasicMaterial({ color: C.goldLight }),
  );
  crest.add(innerLine);

  // symbols, each kept well inside its quadrant
  const atom = createAtom(0.82);
  atom.position.set(-0.42, 0.5, 0.2);
  const bookSun = createBookSun(0.95);
  bookSun.position.set(0.42, 0.5, 0.17);
  const coast = createCoast(0.9);
  coast.position.set(-0.4, -0.2, 0.14);
  const seed = createSeedling(0.95);
  seed.position.set(0.42, -0.22, 0.16);
  // the bottom quadrants are short; tilt their scenes so depth reads from the front
  coast.rotation.x = 0.45;
  [atom, bookSun, coast, seed].forEach((s) => crest.add(s));

  const ribbon = createRibbon(bnName);
  ribbon.position.set(0, -1.18, 0.22);
  crest.add(ribbon);

  crest.userData.symbols = { atom, book: bookSun, coast, seed };
  crest.userData.tick = (t: number) => {
    [atom, bookSun, coast, seed].forEach((s) => (s.userData.tick as (t: number) => void)(t));
  };
  // re-render the painted textures once web fonts are ready
  crest.userData.refreshTextures = () => {
    (face.material as THREE.MeshStandardMaterial).map = shieldFaceTexture();
    (ribbon.material as THREE.MeshStandardMaterial).map = ribbonTexture(bnName);
    (face.material as THREE.MeshStandardMaterial).needsUpdate = true;
    (ribbon.material as THREE.MeshStandardMaterial).needsUpdate = true;
  };
  return crest;
}
