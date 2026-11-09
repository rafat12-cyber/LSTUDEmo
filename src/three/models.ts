// 3D models of the LSTU crest and its symbols, built from three.js primitives.
// Used by the hero crest (crest3d.ts), the hero scene (hero.ts) and the section scenes.
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

export const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });

/* ------------------------------------------------------------------ */
/* Shield outline (logo proportions), in a 2 x ~2.27 unit box          */
/* ------------------------------------------------------------------ */
// Source coordinates are a 300 x 340 drawing; convert to centred units.
export const sx = (x: number) => (x - 150) / 150;
export const sy = (y: number) => (170 - y) / 150;

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

/** Lined page texture for the open book. */
function pageTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#efe6cf'); grad.addColorStop(0.12, '#fbf6e8'); grad.addColorStop(1, '#fffdf6');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#7d8aa6'; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40, 34 + i * 22); g.lineTo(220, 34 + i * 22); g.stroke(); }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sun rising over an open book, as on the crest: the book stands open facing the viewer
 * (pages toward you, not lying flat), and the sun rises half-hidden from behind it.
 */
export function createBookSun(scale = 1) {
  const g = new THREE.Group();
  const W = 0.31, H = 0.24; // one page

  // ---- sun: a thick disc behind the book; the book hides its lower half
  const sunGroup = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.05, 48),
    std(C.sunRed, { emissive: 0xc0321c, emissiveIntensity: 0.55, roughness: 0.35 }),
  );
  disc.rotation.x = Math.PI / 2; // flat face toward the viewer
  sunGroup.add(disc);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshBasicMaterial({ color: 0xff8a3d }));
  core.position.z = 0.026;
  sunGroup.add(core);
  const rays = new THREE.Group();
  const rayGeo = new THREE.ConeGeometry(0.028, 0.12, 4);
  const rayMat = std(C.sunRed, { emissive: 0xd8401f, emissiveIntensity: 0.5, roughness: 0.4, flatShading: true });
  const N = 13;
  for (let i = 0; i < N; i++) {
    const a = (-12 + (i / (N - 1)) * 204) * (Math.PI / 180); // a little past the horizon on both sides
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0);
    ray.rotation.z = a - Math.PI / 2;
    rays.add(ray);
  }
  sunGroup.add(rays);
  sunGroup.position.set(0, H * 0.62, -0.09);
  g.add(sunGroup);

  // ---- open book standing up, facing the viewer, pages fanned in a soft V
  const book = new THREE.Group();
  const pageTex = pageTexture();
  const bend = (geo: THREE.BufferGeometry, dir: number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const u = Math.abs(x) / W; // 0 at spine, 1 at outer edge
      pos.setZ(i, pos.getZ(i) - 0.07 * u + 0.025 * Math.sin(Math.PI * u)); // outer edges recede, pages curve
      pos.setY(i, y + 0.03 * Math.sin(Math.PI * u) * (y > 0 ? 1 : 0.4)); // curved top edge like a real open book
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    if (dir < 0) geo.scale(1, 1, 1);
  };
  [-1, 1].forEach((dir) => {
    const pageGeo = new THREE.PlaneGeometry(W, H, 16, 4);
    pageGeo.translate((dir * W) / 2, 0, 0);
    bend(pageGeo, dir);
    const tex = pageTex.clone();
    if (dir < 0) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; }
    tex.needsUpdate = true;
    const page = new THREE.Mesh(pageGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
    book.add(page);
    // page block thickness behind
    const blockGeo = new THREE.BoxGeometry(W, H, 0.035, 16, 4, 1);
    blockGeo.translate((dir * W) / 2, 0, -0.022);
    bend(blockGeo, dir);
    book.add(new THREE.Mesh(blockGeo, std(0xe8dcc0, { roughness: 0.9 })));
    // cover, slightly larger
    const coverGeo = new THREE.BoxGeometry(W + 0.025, H + 0.03, 0.018, 16, 4, 1);
    coverGeo.translate((dir * (W + 0.025)) / 2, -0.004, -0.05);
    bend(coverGeo, dir);
    book.add(new THREE.Mesh(coverGeo, std(C.bookBlue, { roughness: 0.5 })));
  });
  // spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, H + 0.03, 10), std(0x173f80));
  spine.position.set(0, -0.004, -0.045);
  book.add(spine);
  book.rotation.x = -0.12; // top leans back slightly
  book.position.y = -0.1;
  g.add(book);

  g.scale.setScalar(scale);
  g.userData.tick = (t: number) => {
    rays.children.forEach((r, i) => { r.scale.y = 1 + Math.sin(t * 2.4 + i * 0.7) * 0.18; });
    sunGroup.position.y = H * 0.62 + Math.sin(t * 0.8) * 0.008;
  };
  g.userData.sway = true;
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
export function ribbonTexture(text: string) {
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

export function createRibbon(text: string) {
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
