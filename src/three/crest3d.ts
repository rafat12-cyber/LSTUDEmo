// The LSTU crest in 3D, built like a real carved crest: a navy shield frame with a gold rim,
// four recessed windows (one per quadrant of the logo) and a small 3D scene inside each window.
// Every scene is clipped to its window, so nothing ever crosses the border, and the layers
// inside each window shift with the pointer to show their depth.
import * as THREE from 'three';
import { C, std, sx, sy, shieldShape, createAtom, createBookSun, createPalm, createRibbon, ribbonTexture } from './models';

const D = 0.42; // depth of each window recess

type Quad = {
  key: 'atom' | 'book' | 'coast' | 'seed';
  poly: THREE.Vector2[]; // window outline (convex, CCW)
  center: THREE.Vector2;
  size: THREE.Vector2;
  bg: string;
  group: THREE.Group;
  layers: { obj: THREE.Object3D; depth: number; base: THREE.Vector3 }[];
  localPlanes: THREE.Plane[];
  worldPlanes: THREE.Plane[];
};

/* ---------------- geometry helpers ---------------- */

/** Sutherland–Hodgman: clip a polygon against an axis-aligned rectangle. */
function clipToRect(poly: THREE.Vector2[], x0: number, x1: number, y0: number, y1: number) {
  const edges: [(p: THREE.Vector2) => boolean, (a: THREE.Vector2, b: THREE.Vector2) => THREE.Vector2][] = [
    [(p) => p.x >= x0, (a, b) => new THREE.Vector2(x0, a.y + ((b.y - a.y) * (x0 - a.x)) / (b.x - a.x))],
    [(p) => p.x <= x1, (a, b) => new THREE.Vector2(x1, a.y + ((b.y - a.y) * (x1 - a.x)) / (b.x - a.x))],
    [(p) => p.y >= y0, (a, b) => new THREE.Vector2(a.x + ((b.x - a.x) * (y0 - a.y)) / (b.y - a.y), y0)],
    [(p) => p.y <= y1, (a, b) => new THREE.Vector2(a.x + ((b.x - a.x) * (y1 - a.y)) / (b.y - a.y), y1)],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    }
  }
  // drop near-duplicate points
  return out.filter((p, i) => p.distanceTo(out[(i + 1) % out.length]) > 1e-3);
}

const isCCW = (poly: THREE.Vector2[]) => THREE.ShapeUtils.area(poly) > 0;

/** Inward-facing clipping planes for a convex polygon in the crest's local XY plane. */
function planesFor(poly: THREE.Vector2[]) {
  const pts = isCCW(poly) ? poly : [...poly].reverse();
  const planes: THREE.Plane[] = [];
  // simplify: skip edges that are almost collinear with the previous kept edge
  let lastDir: THREE.Vector2 | null = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dir = b.clone().sub(a).normalize();
    if (lastDir && dir.dot(lastDir) > 0.995 && planes.length) { lastDir = dir; continue; }
    lastDir = dir;
    const n = new THREE.Vector3(-dir.y, dir.x, 0); // left normal = inward for CCW
    planes.push(new THREE.Plane(n, -n.dot(new THREE.Vector3(a.x, a.y, 0))));
  }
  planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.005)); // nothing in front of the face
  return planes;
}

/* ---------------- textures ---------------- */

const SHIELD_PATH = 'M10 16 C60 18 115 14 150 4 C185 14 240 18 290 16 L290 175 C290 258 230 306 150 334 C70 306 10 258 10 175 Z';

/** Front of the frame: navy, thin gold lines around each window, LSTU in gold at the tip. */
function frameTexture() {
  const cv = document.createElement('canvas');
  cv.width = 600; cv.height = 680;
  const g = cv.getContext('2d')!;
  g.scale(2, 2);
  const grad = g.createLinearGradient(0, 0, 300, 340);
  grad.addColorStop(0, '#163a74'); grad.addColorStop(1, '#0b2452');
  g.fillStyle = grad; g.fillRect(0, 0, 300, 340);
  // fine inner gold border
  g.save();
  g.translate(150, 170); g.scale(0.9, 0.9); g.translate(-150, -172);
  g.strokeStyle = '#e2b955'; g.lineWidth = 2.2; g.stroke(new Path2D(SHIELD_PATH));
  g.restore();
  g.fillStyle = '#f1cf7a';
  g.font = '700 36px "Playfair Display", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 4; g.shadowOffsetY = 1;
  g.fillText('LSTU', 150, 285);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // ExtrudeGeometry caps use raw x/y as UVs; map the shield's local units onto the 300 x 340 drawing
  tex.repeat.set(0.5, 150 / 340);
  tex.offset.set(0.5, 170 / 340);
  return tex;
}

/** Soft vertical gradient for a window's back wall. */
function backTexture(top: string, bottom: string) {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 128;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, top); grad.addColorStop(1, bottom);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------- window scenes ---------------- */

function wavyStrip(width: number, height: number, amp: number, waves: number, color: number, emissive = 0x000000) {
  const s = new THREE.Shape();
  const left = -width / 2, steps = 48;
  s.moveTo(left, -height);
  for (let i = 0; i <= steps; i++) {
    const x = left + (i / steps) * width;
    s.lineTo(x, Math.sin((i / steps) * Math.PI * 2 * waves) * amp);
  }
  s.lineTo(left + width, -height);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  return new THREE.Mesh(geo, std(color, { roughness: 0.3, metalness: 0.1, emissive, emissiveIntensity: 0.15 }));
}

/** Coast window (logo bottom-left): palms on a sandy shore with the sea rolling in. */
function coastScene(q: Quad) {
  const { size } = q;
  const w = size.x, h = size.y;
  const group = new THREE.Group();
  const add = (obj: THREE.Object3D, depth: number) => { group.add(obj); q.layers.push({ obj, depth, base: obj.position.clone() }); };

  // distant green land along the horizon
  const land = new THREE.Mesh(
    new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-w, -0.02); s.quadraticCurveTo(-w * 0.2, 0.12, w * 0.15, 0.0); s.lineTo(w * 0.15, -0.2); s.lineTo(-w, -0.2); s.closePath(); return s; })()),
    std(0x3f9a4c, { roughness: 0.9 }),
  );
  land.position.set(0, -h * 0.02, -D + 0.04);
  add(land, 0.2);

  // sea: layered wave strips, wider than the window (the window clips them)
  const seaColors = [0x6cb6e8, 0x3c8fd2, 0x2a73bd, 0x1c5ea8];
  seaColors.forEach((c, i) => {
    const strip = wavyStrip(w * 2.2, h, 0.018 + i * 0.004, 5 + i, c);
    strip.position.set(0, -h * 0.08 - i * h * 0.1, -D + 0.08 + i * 0.075);
    strip.userData.speed = 0.06 + i * 0.03;
    strip.userData.wave = true;
    add(strip, 0.35 + i * 0.25);
  });

  // sandy beach sweeping in from the left
  const beachShape = new THREE.Shape();
  beachShape.moveTo(-w * 0.75, -h);
  beachShape.lineTo(-w * 0.75, -h * 0.05);
  beachShape.quadraticCurveTo(-w * 0.25, -h * 0.02, 0.0, -h * 0.32);
  beachShape.quadraticCurveTo(w * 0.1, -h * 0.5, -w * 0.05, -h);
  beachShape.closePath();
  const beach = new THREE.Mesh(new THREE.ExtrudeGeometry(beachShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }), std(C.sand, { roughness: 0.95 }));
  beach.position.set(0, 0, -D + 0.3);
  add(beach, 1.1);

  // palms on the beach, sized to fill the window's height
  const palmSpecs: [number, number, number, number][] = [
    [-w * 0.3, h * 0.92, 0.14, -D + 0.3],
    [-w * 0.12, h * 0.78, -0.1, -D + 0.24],
    [-w * 0.42, h * 0.62, 0.2, -D + 0.18],
  ];
  palmSpecs.forEach(([x, ph, lean, z]) => {
    const p = createPalm(ph, lean * ph);
    p.position.set(x, -h * 0.36, z);
    add(p, 1 + (z + D) * 1.5);
  });

  group.position.set(q.center.x, q.center.y + h * 0.04, 0);
  group.userData.tick = (t: number) => {
    group.children.forEach((c) => {
      if (c.userData.wave) c.position.x = Math.sin(t * c.userData.speed * 6) * 0.03;
      c.userData.tick?.(t);
    });
  };
  return group;
}

/** Seedling window (logo bottom-right): a young plant growing out of a mound of earth. */
function seedScene(q: Quad) {
  const { size } = q;
  const w = size.x, h = size.y;
  const group = new THREE.Group();
  const add = (obj: THREE.Object3D, depth: number) => { group.add(obj); q.layers.push({ obj, depth, base: obj.position.clone() }); };

  // three mounds of earth, back to front, spanning the full window width
  const soilColors = [0x4d3019, 0x5f3c20, 0x734a28];
  soilColors.forEach((c, i) => {
    const s = new THREE.Shape();
    const ww = w * 1.6;
    s.moveTo(-ww / 2, -h);
    s.lineTo(-ww / 2, -h * 0.34 + i * 0.01);
    s.bezierCurveTo(-ww * 0.2, -h * (0.1 - i * 0.02), ww * 0.2, -h * (0.12 - i * 0.02), ww / 2, -h * 0.36);
    s.lineTo(ww / 2, -h);
    s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), std(c, { roughness: 1, flatShading: true }));
    m.position.set(0, -i * h * 0.06, -D + 0.08 + i * 0.12);
    add(m, 0.4 + i * 0.35);
  });
  // a few pebbles on the front mound
  for (let i = 0; i < 7; i++) {
    const pb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.018 + (i % 3) * 0.006), std(0x8a6a4a, { flatShading: true }));
    pb.position.set(-w * 0.4 + i * w * 0.13, -h * 0.36 + Math.sin(i * 1.7) * 0.02, -D + 0.38);
    add(pb, 1.2);
  }

  // the plant
  const plant = new THREE.Group();
  const stemCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -h * 0.3, 0), new THREE.Vector3(0.02, h * 0.05, 0), new THREE.Vector3(-0.005, h * 0.3, 0));
  plant.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.022, 8, false), std(0x2f8f3e, { roughness: 0.5 })));
  const leafShape = new THREE.Shape();
  const L = w * 0.42;
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(L * 0.25, L * 0.42, L * 0.7, L * 0.45, L, L * 0.3);
  leafShape.bezierCurveTo(L * 0.7, L * 0.05, L * 0.3, -L * 0.08, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  // midrib bend: lift the middle of the leaf toward the viewer
  const lp = leafGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i) / L; lp.setZ(i, lp.getZ(i) + Math.sin(Math.PI * x) * 0.05); }
  leafGeo.computeVertexNormals();
  const leafMat = std(0x46b85a, { roughness: 0.45, emissive: 0x0c3a12, emissiveIntensity: 0.3 });
  const right = new THREE.Mesh(leafGeo, leafMat);
  right.position.set(0, h * 0.12, 0);
  right.rotation.set(0, -0.25, 0.25);
  const left = new THREE.Mesh(leafGeo, leafMat);
  left.position.set(0, -h * 0.02, 0);
  left.rotation.set(0, Math.PI + 0.25, 0.2);
  left.scale.setScalar(0.85);
  plant.add(right, left);
  plant.position.set(w * 0.02, 0, -D + 0.24);
  add(plant, 0.9);

  group.position.set(q.center.x, q.center.y + h * 0.06, 0);
  group.userData.tick = (t: number) => {
    right.rotation.z = 0.25 + Math.sin(t * 1.3) * 0.07;
    left.rotation.z = 0.2 + Math.sin(t * 1.3 + 1) * 0.07;
    plant.rotation.y = Math.sin(t * 0.6) * 0.25;
  };
  return group;
}

function atomScene(q: Quad) {
  const r = Math.min(q.size.x, q.size.y) * 0.8;
  const atom = createAtom(r / 0.62);
  atom.position.set(q.center.x, q.center.y - q.size.y * 0.02, -D * 0.5);
  q.layers.push({ obj: atom, depth: 0.7, base: atom.position.clone() });
  return atom;
}

function bookScene(q: Quad) {
  // the book and sun span about 0.66 wide and 0.7 tall (from the book's foot to the tips of the rays)
  const k = Math.min(q.size.x / 0.7, q.size.y / 0.76);
  const book = createBookSun(k);
  book.position.set(q.center.x, q.center.y - 0.115 * k - q.size.y * 0.02, -D * 0.42);
  q.layers.push({ obj: book, depth: 0.7, base: book.position.clone() });
  return book;
}

/* ---------------- the crest ---------------- */

export function createCrest3D(bnName: string) {
  const crest = new THREE.Group();

  // window outlines: the inner shield outline clipped to each quadrant
  const inner = shieldShape(0.1).getPoints(48);
  if (isCCW(inner) === false) inner.reverse();
  const g = 0.028; // half-width of the dividing bars
  const yMid = sy(158), yLow = sy(250);
  const rects: [Quad['key'], number, number, number, number, string, string][] = [
    ['atom', -2, -g, yMid + g, 2, '#0e2f66', '#09214a'],
    ['book', g, 2, yMid + g, 2, '#ffffff', '#eef2f8'],
    ['coast', -2, -g, yLow + g, yMid - g, '#f4f8fc', '#dfeaf5'],
    ['seed', g, 2, yLow + g, yMid - g, '#0e2f66', '#09214a'],
  ];
  const quads: Quad[] = rects.map(([key, x0, x1, y0, y1, top, bottom]) => {
    const poly = clipToRect(inner, x0, x1, y0, y1);
    const box = new THREE.Box2().setFromPoints(poly);
    const localPlanes = planesFor(poly);
    return {
      key, poly, bg: top,
      center: box.getCenter(new THREE.Vector2()),
      size: box.getSize(new THREE.Vector2()),
      group: new THREE.Group(),
      layers: [],
      localPlanes,
      worldPlanes: localPlanes.map((p) => p.clone()),
      _colors: [top, bottom],
    } as Quad & { _colors: string[] };
  });

  // ---- navy frame with four window holes, plus a gold rim around it
  const frameShape = shieldShape(0.045);
  quads.forEach((q) => frameShape.holes.push(new THREE.Path(isCCW(q.poly) ? [...q.poly].reverse() : q.poly)));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: D, bevelEnabled: false, curveSegments: 32 });
  frameGeo.translate(0, 0, -D);
  const frameFront = new THREE.MeshStandardMaterial({ map: frameTexture(), roughness: 0.45, metalness: 0.15 });
  const frameSide = std(0x14366c, { roughness: 0.6 });
  const frame = new THREE.Mesh(frameGeo, [frameFront, frameSide]);
  crest.add(frame);

  const rimShape = shieldShape(0);
  rimShape.holes.push(new THREE.Path(shieldShape(0.045).getPoints(96).reverse()));
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: D + 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 3, curveSegments: 32 });
  rimGeo.translate(0, 0, -D - 0.04);
  const rimMat = std(C.gold, { metalness: 0.85, roughness: 0.25, emissive: 0x6b4a10, emissiveIntensity: 0 });
  crest.add(new THREE.Mesh(rimGeo, rimMat));

  // gold bars between the windows, standing slightly proud of the face
  const barMat = std(C.gold, { metalness: 0.85, roughness: 0.25, emissive: 0x6b4a10, emissiveIntensity: 0 });
  const bars = new THREE.Group();
  const top = sy(20), bottomY = yLow;
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(g * 1.6, top - bottomY, 0.04), barMat);
  vBar.position.set(0, (top + bottomY) / 2, 0.01);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, g * 1.6, 0.04), barMat);
  hBar.position.set(0, yMid, 0.01);
  const lBar = new THREE.Mesh(new THREE.BoxGeometry(1.62, g * 1.6, 0.04), barMat);
  lBar.position.set(0, yLow, 0.01);
  bars.add(vBar, hBar, lBar);
  // keep bars inside the shield outline
  const outlinePlanes = planesFor(shieldShape(0.06).getPoints(24)).slice(0, -1);
  barMat.clippingPlanes = outlinePlanes.map((p) => p.clone());
  crest.add(bars);

  // ---- back walls, and the scene inside each window
  const backMats: THREE.MeshStandardMaterial[] = [];
  quads.forEach((q) => {
    const colors = (q as Quad & { _colors: string[] })._colors;
    const backGeo = new THREE.ShapeGeometry(new THREE.Shape(q.poly));
    // map the gradient top-to-bottom over the window
    const uv = backGeo.attributes.uv as THREE.BufferAttribute;
    const box = new THREE.Box2().setFromPoints(q.poly);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, (uv.getY(i) - box.min.y) / (box.max.y - box.min.y));
    const back = new THREE.Mesh(backGeo, new THREE.MeshStandardMaterial({ map: backTexture(colors[0], colors[1]), roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0, emissiveMap: null }));
    back.position.z = -D + 0.002;
    backMats.push(back.material as THREE.MeshStandardMaterial);
    crest.add(back);

    const scene = q.key === 'atom' ? atomScene(q) : q.key === 'book' ? bookScene(q) : q.key === 'coast' ? coastScene(q) : seedScene(q);
    q.group.add(scene);
    // every material inside the window is clipped to the window
    q.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      (Array.isArray(m) ? m : [m]).forEach((mm) => { mm.clippingPlanes = q.worldPlanes; mm.clipShadows = true; });
    });
    // a soft light inside each window so the scenes read clearly
    const lamp = new THREE.PointLight(0xfff1d6, 1.5, 1.6, 1.2);
    lamp.position.set(q.center.x, q.center.y, 0.15);
    q.group.add(lamp);
    q.group.userData.lamp = lamp;
    crest.add(q.group);
  });

  // ---- ribbon with the Bangla name
  const ribbon = createRibbon(bnName);
  ribbon.position.set(0, -1.2, 0.16);
  crest.add(ribbon);
  // a little self-light keeps the Bangla name readable in the night scene
  ribbon.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m?.map) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 0.3; }
  });

  // ---- neon glow: an outline and a soft halo that brighten when the torch lights the crest
  const outlinePts = shieldShape(-0.02).getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0.03));
  const neon = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outlinePts), new THREE.LineBasicMaterial({ color: 0x9ff3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  crest.add(neon);
  const haloCv = document.createElement('canvas');
  haloCv.width = haloCv.height = 128;
  const hg = haloCv.getContext('2d')!;
  const hgrad = hg.createRadialGradient(64, 64, 10, 64, 64, 64);
  hgrad.addColorStop(0, 'rgba(160,240,255,0.55)'); hgrad.addColorStop(0.6, 'rgba(120,200,255,0.18)'); hgrad.addColorStop(1, 'rgba(0,0,0,0)');
  hg.fillStyle = hgrad; hg.fillRect(0, 0, 128, 128);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(haloCv), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.z = -D - 0.2;
  halo.name = 'halo';
  crest.add(halo);

  /* ---- API ---- */
  const tmpM = new THREE.Matrix4();
  crest.userData.updateClipping = () => {
    crest.updateMatrixWorld(true);
    tmpM.copy(crest.matrixWorld);
    quads.forEach((q) => q.localPlanes.forEach((p, i) => q.worldPlanes[i].copy(p).applyMatrix4(tmpM)));
    outlinePlanes.forEach((p, i) => (barMat.clippingPlanes![i] as THREE.Plane).copy(p).applyMatrix4(tmpM));
  };

  // pointer parallax inside the windows: px/py in -1..1 relative to the crest
  const par = new THREE.Vector2(), parTarget = new THREE.Vector2();
  crest.userData.setPointer = (x: number, y: number) => parTarget.set(x, y);

  let glow = 1, glowTarget = 1;
  let focus = '';
  crest.userData.setGlow = (v: number) => { glowTarget = v; };
  crest.userData.setFocus = (k: string) => { focus = k; };
  const applyGlow = () => {
    rimMat.emissiveIntensity = 0.28 * glow;
    barMat.emissiveIntensity = 0.28 * glow;
    (neon.material as THREE.LineBasicMaterial).opacity = 0.7 * glow;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.4 * glow;
    backMats.forEach((m, i) => { m.emissive.set(quads[i].bg); m.emissiveIntensity = 0.06 + 0.12 * glow; });
    quads.forEach((q) => {
      const f = !focus ? 1 : q.key === focus ? 2.6 : 0.45;
      (q.group.userData.lamp as THREE.PointLight).intensity = (0.8 + 1.0 * glow) * f;
    });
    frameFront.emissive.set(0x1b3f7a); frameFront.emissiveIntensity = 0.05 + 0.12 * glow;
  };

  crest.userData.tick = (t: number, dt = 0.016) => {
    par.lerp(parTarget, Math.min(1, dt * 6));
    glow += (glowTarget - glow) * Math.min(1, dt * 3);
    applyGlow();
    quads.forEach((q) => {
      q.group.children[0].userData.tick?.(t);
      q.layers.forEach((l) => {
        l.obj.position.x = l.base.x - par.x * 0.035 * l.depth;
        l.obj.position.y = l.base.y - par.y * 0.03 * l.depth;
      });
    });
    (neon.material as THREE.LineBasicMaterial).opacity *= 0.85 + Math.sin(t * 7) * 0.05 + Math.sin(t * 23) * 0.03; // neon shimmer
  };
  crest.userData.symbols = Object.fromEntries(quads.map((q) => [q.key, q.group]));
  crest.userData.refreshTextures = () => {
    frameFront.map = frameTexture(); frameFront.needsUpdate = true;
    const rm = ribbon.material as THREE.MeshStandardMaterial;
    rm.map = ribbonTexture(bnName); rm.emissiveMap = rm.map; rm.needsUpdate = true;
  };
  crest.userData.height = 2.62; // shield top to ribbon bottom, for fitting to the page
  crest.userData.centerY = -0.12;
  applyGlow();
  return crest;
}
