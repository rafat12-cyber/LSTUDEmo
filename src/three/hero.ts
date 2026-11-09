// The home page hero, as one 3D scene: a moonlit night on the Meghna estuary.
// A fishing ship rides the water with a sailor on the bow. His torch beam lights the LSTU crest,
// which glows like neon while the light is on it. Visitors can drag the beam to move the light
// (the crest loses its glow when the light leaves it) and drag the crest to turn it.
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { createStage, reduceMotion } from './stage';
import { createCrest3D } from './crest3d';
import { createCoconutPalm, createPlumTree, createBush, createNowka } from './riverside';

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tileable normal map for the water surface, made from a sum of waves. */
function waterNormals() {
  const N = 256;
  const t = canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N);
    const waves: [number, number, number, number][] = [];
    for (let i = 0; i < 14; i++) waves.push([Math.round(Math.random() * 10 - 5) || 1, Math.round(Math.random() * 10 - 5), 0.3 + Math.random(), Math.random() * 6.28]);
    const height = (x: number, y: number) => waves.reduce((s, [kx, ky, a, p]) => s + a * Math.sin(((kx * x + ky * y) / N) * Math.PI * 2 + p), 0);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      const n = new THREE.Vector3(-dx * 0.22, -dy * 0.22, 1).normalize();
      const i = (y * N + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Moon surface: grey highlands, dark maria and craters. */
function moonTexture() {
  return canvasTex(1024, 512, (g) => {
    g.fillStyle = '#cfcabd'; g.fillRect(0, 0, 1024, 512);
    // speckle
    for (let i = 0; i < 9000; i++) {
      const v = 170 + Math.random() * 60;
      g.fillStyle = `rgba(${v},${v - 4},${v - 12},0.35)`;
      g.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
    }
    // maria (dark seas), concentrated on the side facing us
    const maria: [number, number, number, number][] = [[420, 190, 120, 80], [560, 230, 90, 70], [500, 300, 110, 60], [640, 160, 70, 50], [360, 280, 70, 45], [600, 330, 60, 40]];
    maria.forEach(([x, y, rx, ry]) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, rx);
      grad.addColorStop(0, 'rgba(110,108,104,0.85)'); grad.addColorStop(0.7, 'rgba(120,118,112,0.55)'); grad.addColorStop(1, 'rgba(120,118,112,0)');
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
    });
    // craters with a bright rim and a shadowed floor
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * 1024, y = 40 + Math.random() * 432, r = Math.random() < 0.9 ? 2 + Math.random() * 7 : 10 + Math.random() * 14;
      g.fillStyle = 'rgba(90,88,84,0.45)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(245,242,232,0.55)'; g.lineWidth = Math.max(1, r * 0.25);
      g.beginPath(); g.arc(x - r * 0.1, y - r * 0.1, r, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    }
    // Tycho-like bright ray crater
    g.strokeStyle = 'rgba(250,248,240,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; g.beginPath(); g.moveTo(520, 400); g.lineTo(520 + Math.cos(a) * 90, 400 + Math.sin(a) * 60); g.stroke(); }
    g.fillStyle = '#f2efe6'; g.beginPath(); g.arc(520, 400, 7, 0, Math.PI * 2); g.fill();
  });
}

function glowTexture(inner: string, outer = 'rgba(0,0,0,0)') {
  return canvasTex(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner); grad.addColorStop(1, outer);
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  });
}

function cloudTexture() {
  return canvasTex(256, 128, (g) => {
    for (let i = 0; i < 22; i++) {
      const x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 18 + Math.random() * 30;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Ship and sailor                                                     */
/* ------------------------------------------------------------------ */

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });

function createShip() {
  const ship = new THREE.Group();

  // hull: side profile extruded across the beam, then tapered toward the bow and the keel
  const prof = new THREE.Shape();
  prof.moveTo(-4.0, 1.2);
  prof.lineTo(3.4, 1.2);
  prof.quadraticCurveTo(4.3, 1.35, 4.7, 1.9);
  prof.quadraticCurveTo(4.1, 0.4, 3.0, -0.45);
  prof.lineTo(-3.5, -0.45);
  prof.quadraticCurveTo(-4.2, 0.2, -4.0, 1.2);
  const hullGeo = new THREE.ExtrudeGeometry(prof, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, steps: 1, curveSegments: 16 });
  hullGeo.translate(0, 0, -1.3);
  const hp = hullGeo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const cRed = new THREE.Color(0x8c1d1d), cWhite = new THREE.Color(0xf2efe6), cBlue = new THREE.Color(0x173a6e);
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i);
    let z = hp.getZ(i);
    const bow = THREE.MathUtils.clamp((x - 1.8) / 2.9, 0, 1);
    const keel = THREE.MathUtils.clamp((y + 0.45) / 1.6, 0, 1);
    z *= THREE.MathUtils.lerp(1, 0.08, Math.pow(bow, 1.3)) * THREE.MathUtils.lerp(0.55, 1, keel);
    hp.setZ(i, z);
    const c = y < 0.35 ? cRed : y < 0.55 ? cWhite : cBlue;
    colors.push(c.r, c.g, c.b);
  }
  hullGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  hullGeo.computeVertexNormals();
  ship.add(new THREE.Mesh(hullGeo, mat(0xffffff, { vertexColors: true, roughness: 0.45 })));

  // deck
  const deckShape = new THREE.Shape();
  deckShape.moveTo(-3.9, -1.15); deckShape.lineTo(2.2, -1.15); deckShape.quadraticCurveTo(3.8, -0.6, 4.4, 0);
  deckShape.quadraticCurveTo(3.8, 0.6, 2.2, 1.15); deckShape.lineTo(-3.9, 1.15); deckShape.closePath();
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(deckShape), mat(0x7a5233, { roughness: 0.9 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 1.23;
  ship.add(deck);

  // railings
  const railMat = mat(0xdedad0, { metalness: 0.5, roughness: 0.35 });
  const railPts = [new THREE.Vector3(-3.8, 1.85, 1.1), new THREE.Vector3(2.2, 1.85, 1.1), new THREE.Vector3(4.2, 2.0, 0.05)];
  [1, -1].forEach((sd) => {
    const curve = new THREE.CatmullRomCurve3(railPts.map((p) => new THREE.Vector3(p.x, p.y, p.z * sd)));
    ship.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.035, 6, false), railMat));
    for (let i = 0; i <= 8; i++) {
      const p = curve.getPoint(i / 8);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), railMat);
      post.position.set(p.x, p.y - 0.31, p.z);
      ship.add(post);
    }
  });

  // wheelhouse with warm lit windows
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.9), mat(0xf4f1ea, { roughness: 0.5 }));
  cabin.position.set(-1.4, 2.05, 0);
  ship.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, 2.15), mat(0x173a6e));
  roof.position.set(-1.4, 2.92, 0);
  ship.add(roof);
  const winMat = new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb04a, emissiveIntensity: 2.2 });
  for (let i = 0; i < 3; i++) {
    [1, -1].forEach((sd) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.4), winMat);
      w.position.set(-2.2 + i * 0.75, 2.3, sd * 0.96);
      if (sd < 0) w.rotation.y = Math.PI;
      ship.add(w);
    });
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), winMat);
  front.position.set(-0.19, 2.35, 0); front.rotation.y = Math.PI / 2;
  ship.add(front);
  // funnel with a gold band
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.0, 16), mat(0x173a6e));
  funnel.position.set(-2.3, 3.45, 0);
  ship.add(funnel);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.16, 16), mat(0xd4a23a, { metalness: 0.7, roughness: 0.3 }));
  band.position.set(-2.3, 3.6, 0);
  ship.add(band);
  // lifebuoys
  [1, -1].forEach((sd) => {
    const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 24), mat(0xff6a1f, { roughness: 0.5 }));
    buoy.position.set(-1.4, 2.0, sd * 0.97);
    ship.add(buoy);
  });

  // mast, crossbar, masthead lantern
  const mastMat = mat(0x3a3f4a, { metalness: 0.4, roughness: 0.4 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 10), mastMat);
  mast.position.set(0.6, 3.5, 0);
  ship.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), mastMat);
  yard.rotation.x = Math.PI / 2; yard.position.set(0.6, 4.9, 0);
  ship.add(yard);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffd27a, emissiveIntensity: 3 }));
  lantern.position.set(0.6, 5.85, 0);
  ship.add(lantern);
  const lanternLight = new THREE.PointLight(0xffc977, 25, 30, 1.6);
  lanternLight.position.copy(lantern.position);
  ship.add(lanternLight);
  const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,200,120,0.9)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  lanternGlow.scale.setScalar(1.6);
  lanternGlow.position.copy(lantern.position);
  ship.add(lanternGlow);
  // stays (rigging lines)
  const stayMat = new THREE.LineBasicMaterial({ color: 0x9aa3b5, transparent: true, opacity: 0.7 });
  [[4.5, 1.9, 0], [-3.9, 1.3, 0.9], [-3.9, 1.3, -0.9]].forEach(([x, y, z]) => {
    ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.6, 5.7, 0), new THREE.Vector3(x, y, z)]), stayMat));
  });

  // Bangladesh flag on the stern staff, waving
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), mastMat);
  staff.position.set(-3.85, 2.0, 0);
  ship.add(staff);
  const flagTex = canvasTex(160, 96, (g) => {
    g.fillStyle = '#006a4e'; g.fillRect(0, 0, 160, 96);
    g.fillStyle = '#f42a41'; g.beginPath(); g.arc(72, 48, 29, 0, Math.PI * 2); g.fill();
  });
  const flagGeo = new THREE.PlaneGeometry(0.8, 0.48, 12, 4);
  flagGeo.translate(-0.4, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(-3.85, 2.55, 0);
  ship.add(flag);
  const flagBase = Float32Array.from((flagGeo.attributes.position as THREE.BufferAttribute).array as Float32Array);

  // ---- extra ship detail
  // brass-rimmed portholes with warm light behind them
  const brass = mat(0xc9a24a, { metalness: 0.8, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb860, emissiveIntensity: 1.2 });
  for (let i = 0; i < 6; i++) {
    [1, -1].forEach((sd) => {
      const x = -3.1 + i * 0.85;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 18), brass);
      ring.position.set(x, 0.86, sd * 1.36);
      ship.add(ring);
      const pane = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), glass);
      pane.position.set(x, 0.86, sd * 1.365);
      if (sd < 0) pane.rotation.y = Math.PI;
      ship.add(pane);
    });
  }
  // the ship's name on both sides of the stern
  const nameTex = canvasTex(512, 96, (g) => {
    g.fillStyle = '#f4f1ea'; g.font = '700 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MV MEGHNA · LSTU', 256, 50);
  });
  [1, -1].forEach((sd) => {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.6 }));
    plate.position.set(-2.0, 1.02, sd * 1.375);
    if (sd < 0) plate.rotation.y = Math.PI;
    ship.add(plate);
  });
  // rubber tyre fenders hanging over the side
  const rubber = mat(0x151515, { roughness: 0.9 });
  [-0.7, 0.5, 1.6].forEach((x) => [1, -1].forEach((sd) => {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 16), rubber);
    tyre.position.set(x, 0.62, sd * 1.43);
    ship.add(tyre);
  }));
  // anchor at the bow
  const anchor = new THREE.Group();
  const ironMat = mat(0x2a2d33, { metalness: 0.7, roughness: 0.4 });
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), ironMat);
  anchor.add(shank);
  const arms = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 16, Math.PI), ironMat);
  arms.rotation.z = Math.PI; arms.position.y = -0.12;
  anchor.add(arms);
  const stock = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), ironMat);
  stock.position.y = 0.34;
  anchor.add(stock);
  [1, -1].forEach((sd) => { const a = anchor.clone(); a.position.set(3.55, 1.0, sd * 0.72); a.rotation.y = sd > 0 ? -0.35 : Math.PI + 0.35; ship.add(a); });
  // cargo on the foredeck: crates, a coiled rope and a fishing net
  const crateMat = mat(0x8a6236, { roughness: 0.85 });
  ([[0.95, 0.35, 0.4, 0.5], [1.35, -0.45, 0.35, 0.4], [1.0, -0.5, 0.3, 0.3]] as const).forEach(([x, z, s1, s2]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(s1, s2, s1), crateMat);
    c.position.set(x, 1.23 + s2 / 2, z);
    c.rotation.y = x;
    ship.add(c);
  });
  const coilMat = mat(0xc8b080, { roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28 - i * 0.04, 0.035, 6, 20), coilMat);
    coil.rotation.x = Math.PI / 2; coil.position.set(-3.3, 1.27 + i * 0.05, 0.45);
    ship.add(coil);
  }
  const net = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f7a6a, wireframe: true }));
  net.scale.y = 0.45; net.position.set(-3.2, 1.23, -0.5);
  ship.add(net);
  // a cabin door and a ladder to the roof
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.1), mat(0x173a6e));
  door.position.set(-2.62, 1.8, 0); door.rotation.y = -Math.PI / 2;
  ship.add(door);
  for (let i = 0; i < 5; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), railMat);
    rung.rotation.x = Math.PI / 2; rung.position.set(-2.66, 1.4 + i * 0.3, 0.75);
    ship.add(rung);
  }
  // radar and antennas on the wheelhouse roof
  const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mastMat);
  radarMast.position.set(-0.9, 3.2, 0);
  ship.add(radarMast);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.9), mat(0xf4f1ea));
  radar.position.set(-0.9, 3.47, 0);
  ship.add(radar);
  const whipMat = new THREE.LineBasicMaterial({ color: 0xc0c6d0 });
  [[-1.8, 0.7], [-1.9, -0.7]].forEach(([x, z]) => {
    ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 3.0, z), new THREE.Vector3(x - 0.15, 4.3, z)]), whipMat));
  });
  // navigation lights: red to port, green to starboard
  ([[0xff3030, 1], [0x30ff70, -1]] as const).forEach(([c, sd]) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: c }));
    l.position.set(-0.25, 2.95, sd * 1.05);
    ship.add(l);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(c === 0xff3030 ? 'rgba(255,60,60,0.8)' : 'rgba(60,255,120,0.8)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.scale.setScalar(0.6); halo.position.copy(l.position);
    ship.add(halo);
  });
  // a small orange dinghy on the stern deck
  const dinghy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xff7a2a, { side: THREE.DoubleSide }));
  dinghy.scale.set(1.6, 0.6, 0.8); dinghy.position.set(-3.1, 1.6, 0);
  ship.add(dinghy);
  // smoke drifting from the funnel
  const smokeTex = glowTexture('rgba(160,170,190,0.5)');
  const puffs = Array.from({ length: 6 }, (_, i) => {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    p.userData.phase = i / 6;
    ship.add(p);
    return p;
  });

  // sailor on the bow
  const sailor = createSailor();
  sailor.position.set(2.75, 1.23, 0);
  ship.add(sailor);

  ship.userData.sailor = sailor;
  ship.userData.tick = (t: number) => {
    radar.rotation.y = t * 1.6;
    puffs.forEach((p) => {
      const k = (t * 0.18 + p.userData.phase) % 1;
      p.position.set(-2.3 - k * 2.2, 4.0 + k * 2.2, k * 0.4);
      p.scale.setScalar(0.5 + k * 1.6);
      (p.material as THREE.SpriteMaterial).opacity = 0.35 * Math.sin(Math.PI * k);
    });
    const fp = flagGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) {
      const x = flagBase[i * 3];
      fp.setZ(i, Math.sin(x * 6 + t * 5) * 0.06 * -x);
    }
    fp.needsUpdate = true;
    lanternLight.intensity = 23 + Math.sin(t * 9) * 1.5 + Math.sin(t * 23) * 1;
  };
  return ship;
}

function createSailor() {
  const s = new THREE.Group();
  const coat = mat(0xf2b632, { roughness: 0.55 });
  const trousers = mat(0x1d2a44, { roughness: 0.8 });
  const skin = mat(0xb9825a, { roughness: 0.7 });
  const boots = mat(0x111111, { roughness: 0.6 });
  const body = new THREE.Group();
  s.add(body);
  [-0.14, 0.14].forEach((z) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 10), trousers);
    leg.position.set(0, 0.46, z);
    body.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.18), boots);
    boot.position.set(0.06, 0.06, z);
    body.add(boot);
  });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 6, 14), coat);
  torso.position.y = 1.2;
  body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), skin);
  neck.position.y = 1.62;
  body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), skin);
  head.position.y = 1.82;
  body.add(head);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4), mat(0x2b2018));
  beard.position.set(0.02, 1.8, 0);
  body.add(beard);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x173a6e, { roughness: 0.8 }));
  cap.position.y = 1.86;
  body.add(cap);
  const capRoll = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 8, 20), mat(0x173a6e, { roughness: 0.8 }));
  capRoll.rotation.x = Math.PI / 2; capRoll.position.y = 1.88;
  body.add(capRoll);
  // left arm resting
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.55, 4, 8), coat);
  leftArm.position.set(0, 1.13, -0.34); leftArm.rotation.x = 0.15;
  body.add(leftArm);
  // right arm: a shoulder pivot whose +Z points along the arm toward the target
  const shoulder = new THREE.Group();
  shoulder.position.set(0, 1.45, 0.33);
  body.add(shoulder);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.55, 4, 8), coat);
  arm.rotation.x = Math.PI / 2; arm.position.z = 0.32;
  shoulder.add(arm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
  hand.position.z = 0.66;
  shoulder.add(hand);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.36, 12), mat(0x2b2f36, { metalness: 0.7, roughness: 0.3 }));
  torch.rotation.x = Math.PI / 2; torch.position.z = 0.76;
  shoulder.add(torch);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xeaffff }));
  lens.position.z = 0.945;
  shoulder.add(lens);
  const tip = new THREE.Object3D();
  tip.position.z = 0.96;
  shoulder.add(tip);
  s.userData = { body, shoulder, tip };
  return s;
}

/* ------------------------------------------------------------------ */
/* Torch beam                                                          */
/* ------------------------------------------------------------------ */

function createBeam() {
  const geo = new THREE.CylinderGeometry(0.05, 1, 1, 48, 1, true);
  geo.translate(0, -0.5, 0);
  geo.rotateX(-Math.PI / 2); // extends from the origin along +Z
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(0xbff4ff) }, uStrength: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main(){
        vAlong = 1.0 - uv.y;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength; uniform float uTime;
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main(){
        float edge = pow(abs(dot(vN, vV)), 1.6);
        float fade = pow(1.0 - vAlong, 1.3) * smoothstep(0.0, 0.04, vAlong);
        float dust = 0.85 + 0.15 * sin(vAlong * 60.0 - uTime * 2.0);
        gl_FragColor = vec4(uColor * edge * fade * dust * uStrength * 0.55, 1.0);
      }`,
  });
  const cone = new THREE.Mesh(geo, m);
  // invisible, fatter copy for picking the beam with the pointer
  const hit = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
  hit.scale.set(2.2, 2.2, 1);
  cone.add(hit);
  cone.userData.hit = hit;
  cone.frustumCulled = false;
  return cone;
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

export function mountHero(canvas: HTMLCanvasElement, holo: HTMLElement | null, bnName: string) {
  const small = window.matchMedia('(max-width: 760px)').matches;
  const stage = createStage(canvas, { fov: 45, alpha: false, maxDpr: small ? 1.25 : 1.5 });
  const { scene, camera, renderer } = stage;
  renderer.localClippingEnabled = true;
  renderer.toneMappingExposure = 0.95;
  camera.far = 2000;
  camera.updateProjectionMatrix();
  scene.fog = new THREE.Fog(0x16233f, 90, 420);

  const moonDir = new THREE.Vector3(0.1, 0.27, -1).normalize();

  // ---- sky dome with a moon glow
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { moonDir: { value: moonDir } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 moonDir; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 horizon = vec3(0.11,0.15,0.28), mid = vec3(0.05,0.10,0.22), top = vec3(0.01,0.03,0.09);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.2, h));
          col = mix(col, top, smoothstep(0.2, 0.75, h));
          float m = max(dot(normalize(vDir), moonDir), 0.0);
          col += vec3(0.55,0.62,0.8) * pow(m, 60.0) * 0.3 + vec3(0.25,0.3,0.45) * pow(m, 6.0) * 0.18;
          if (h < 0.0) col = horizon * 0.6;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  // ---- stars (two layers that twinkle out of step)
  const starLayers = [0, 1].map((k) => {
    const pos: number[] = [];
    for (let i = 0; i < 420; i++) {
      const th = Math.random() * Math.PI * 2, y = 0.08 + Math.pow(Math.random(), 0.7) * 0.9;
      const r = Math.sqrt(1 - y * y);
      pos.push(Math.cos(th) * r * 560, y * 560, Math.sin(th) * r * 560);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: k ? 1.6 : 2.4, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
    scene.add(pts);
    return pts;
  });

  // a shooting star now and then
  const shootGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(-14, 4, 0)]);
  const shoot = new THREE.Line(shootGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false }));
  scene.add(shoot);

  // ---- the moon, with craters, a halo and moonlight
  const moonPos = moonDir.clone().multiplyScalar(420);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(17, 48, 32),
    new THREE.MeshStandardMaterial({ map: moonTexture(), emissiveMap: moonTexture(), emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 1, fog: false }),
  );
  moon.position.copy(moonPos);
  moon.rotation.y = -Math.PI / 2 - 0.2;
  scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(170,190,240,0.28)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  halo.scale.setScalar(85);
  halo.position.copy(moonPos).multiplyScalar(0.99);
  scene.add(halo);
  const moonLight = new THREE.DirectionalLight(0xc9d6ff, 1.3);
  moonLight.position.copy(moonDir).multiplyScalar(100);
  scene.add(moonLight);
  scene.add(new THREE.HemisphereLight(0x5d74b3, 0x0a0f1e, 0.75));
  // soft fill from the viewer's side, so the trees, boats and ship facing us are not just silhouettes
  const fill = new THREE.DirectionalLight(0x8fa6d8, 0.55);
  fill.position.set(30, 40, 80);
  scene.add(fill);

  // ---- clouds lit by the moon
  const cloudTex = cloudTexture();
  const clouds = Array.from({ length: 7 }, (_, i) => {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0x9fb0d8, transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
    c.scale.set(140 + i * 12, 46 + (i % 3) * 8, 1);
    c.position.set(-260 + i * 90, 70 + (i % 3) * 22, -380 - (i % 2) * 40);
    scene.add(c);
    return c;
  });

  // ---- water that reflects the sky, the moon, the ship and the crest
  const water = new Water(new THREE.PlaneGeometry(1600, 1600), {
    textureWidth: small ? 256 : 512, textureHeight: small ? 256 : 512,
    waterNormals: waterNormals(),
    sunDirection: moonDir.clone(),
    sunColor: 0x46506c,
    waterColor: 0x061a36,
    distortionScale: 1.6,
    fog: true,
    alpha: 1,
  });
  water.rotation.x = -Math.PI / 2;
  {
    // a darker, clearer river: weaker mirror and no grey floor in the reflection
    const wm = water.material as THREE.ShaderMaterial;
    wm.fragmentShader = wm.fragmentShader.replace('vec3( 0.1 ) + reflectionSample * 0.9', 'vec3( 0.015 ) + reflectionSample * 0.62');
    wm.needsUpdate = true;
  }
  (water.material as THREE.ShaderMaterial).uniforms['size'].value = 2.2;
  scene.add(water);

  // ---- far shore: hills, lights of villages, a lighthouse
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x0f1a33, roughness: 1, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const r = 40 + Math.random() * 50;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
    hill.scale.y = 0.12 + Math.random() * 0.12;
    hill.position.set(-420 + i * 80 + Math.random() * 30, -0.5, -330 - Math.random() * 60);
    scene.add(hill);
  }
  const lightsPos: number[] = [];
  for (let i = 0; i < 150; i++) lightsPos.push(-380 + Math.random() * 760, 1 + Math.random() * 4, -300 - Math.random() * 30);
  const villageGeo = new THREE.BufferGeometry();
  villageGeo.setAttribute('position', new THREE.Float32BufferAttribute(lightsPos, 3));
  const village = new THREE.Points(villageGeo, new THREE.PointsMaterial({ color: 0xffc97a, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false }));
  scene.add(village);

  const lighthouse = new THREE.Group();
  const island = new THREE.Mesh(new THREE.DodecahedronGeometry(9, 0), new THREE.MeshStandardMaterial({ color: 0x1b2236, roughness: 1, flatShading: true }));
  island.scale.set(1.4, 0.35, 1);
  lighthouse.add(island);
  const stripeTex = canvasTex(8, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#c0302a'; g.fillRect(0, i * 8, 8, 8); } });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 12, 16), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 }));
  tower.position.y = 8;
  lighthouse.add(tower);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 2.5 }));
  lampRoom.position.y = 14.7;
  lighthouse.add(lampRoom);
  const capTop = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0x8c1d1d }));
  capTop.position.y = 16.1;
  lighthouse.add(capTop);
  const lhGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,220,150,0.95)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  lhGlow.scale.setScalar(10);
  lhGlow.position.y = 14.7;
  lighthouse.add(lhGlow);
  const sweep = new THREE.Group();
  sweep.position.y = 14.7;
  const sweepBeam = new THREE.Mesh(new THREE.ConeGeometry(5, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  sweepBeam.rotation.z = Math.PI / 2; sweepBeam.position.x = 45;
  sweep.add(sweepBeam);
  lighthouse.add(sweep);
  lighthouse.position.set(150, 0, -260);
  scene.add(lighthouse);

  // ---- river banks with coconut palms, boroi (Indian plum) trees and bushes
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x1f3320, roughness: 1, flatShading: true });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 1 });
  const palms: THREE.Object3D[] = [];
  const makeBank = (cx: number, cz: number, rx: number, rz: number, trees: [string, number, number, number, number][]) => {
    const sand = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2), sandMat);
    sand.scale.set(rx * 1.06, 1.6, rz * 1.08); sand.position.set(cx, -0.6, cz);
    scene.add(sand);
    const land = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2), bankMat);
    land.scale.set(rx, 2.6, rz); land.position.set(cx, -0.6, cz);
    scene.add(land);
    trees.forEach(([kind, x, z, h, lean]) => {
      const tr = kind === 'palm' ? createCoconutPalm(h, lean) : kind === 'plum' ? createPlumTree(h) : createBush(h);
      tr.position.set(cx + x, 1.6, cz + z);
      tr.rotation.y = x * 0.37 + z;
      scene.add(tr);
      if (kind === 'palm') palms.push(tr);
    });
  };
  // the near bank on the left
  makeBank(-62, -62, 34, 22, [
    ['palm', 10, 6, 13, 2.6], ['palm', 3, -4, 16, -1.8], ['palm', 16, -8, 11, 3.2], ['palm', -6, 8, 14, 1.2], ['palm', 22, 4, 9, 2.2],
    ['plum', -2, 2, 8, 0], ['plum', 12, -14, 7, 0], ['plum', -14, -6, 9, 0],
    ['bush', 20, 12, 1.6, 0], ['bush', 6, 14, 1.4, 0], ['bush', 26, -4, 1.3, 0], ['bush', -10, 14, 1.8, 0],
  ]);
  // the far bank on the right, past the crest
  makeBank(112, -150, 40, 18, [
    ['palm', -18, 4, 15, -2], ['palm', -6, -2, 18, 1.5], ['palm', 8, 6, 14, -1], ['palm', 20, -4, 16, 2],
    ['plum', -26, -6, 10, 0], ['plum', 0, 8, 9, 0], ['plum', 26, 6, 11, 0],
    ['bush', -12, 10, 2.2, 0], ['bush', 14, 12, 2, 0],
  ]);

  // ---- nowkas (country boats) out on the river, away from the ship
  const nowkas = ([[6, -62, 0.5, true], [58, -78, -0.5, false], [-34, -110, 1.2, true], [30, -150, 2.6, false], [-4, -190, -0.2, true]] as const).map(([x, z, ry, sail], i) => {
    const n = createNowka({ sail });
    n.position.set(x, 0, z);
    n.rotation.y = ry;
    n.scale.setScalar(1.25);
    scene.add(n);
    if (n.userData.lampPos) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,190,110,0.9)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.setScalar(2.4); glow.position.copy(n.userData.lampPos);
      n.add(glow);
    }
    n.userData.phase = i * 1.7;
    return n;
  });

  // ---- the ship, the sailor and the torch
  const ship = createShip();
  scene.add(ship);
  const sailor = ship.userData.sailor as THREE.Group;
  const { body, shoulder, tip } = sailor.userData as { body: THREE.Group; shoulder: THREE.Group; tip: THREE.Object3D };
  const beam = createBeam();
  scene.add(beam);
  const spot = new THREE.SpotLight(0xd9f8ff, 95, 0, 0.11, 0.6, 1.1);
  scene.add(spot);
  const target = new THREE.Object3D();
  scene.add(target);
  spot.target = target;
  const hitGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(190,245,255,0.5)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  scene.add(hitGlow);

  // ---- the crest
  const crest = createCrest3D(bnName);
  scene.add(crest);
  document.fonts?.ready.then(() => { crest.userData.refreshTextures(); stage.renderOnce(); });

  /* ---------------- layout: tie the 3D crest and ship to the page layout ---------------- */
  const stageEl = holo?.querySelector<HTMLElement>('.holo-stage') ?? null;
  const anchor = { ndc: new THREE.Vector2(0.5, 0.1), heightFrac: 0.6 };
  const CREST_DIST = 16;
  const baseCam = new THREE.Vector3(0, 3.4, 22);
  const lookAt = new THREE.Vector3(0, 4.2, -10);

  const shipNdcNarrow = new THREE.Vector2(0.3, -0.3);
  const layout = () => {
    const c = canvas.getBoundingClientRect();
    if (holo && c.width > 0) {
      // phones: the ship sails just below the crest's chips and hint, clear of the text
      const hb = holo.getBoundingClientRect();
      shipNdcNarrow.set(0.3, -(((hb.bottom + 48 - c.top) / c.height) * 2 - 1));
    }
    if (stageEl && c.width > 0) {
      const r = stageEl.getBoundingClientRect();
      anchor.ndc.set(((r.left + r.width / 2 - c.left) / c.width) * 2 - 1, -(((r.top + r.height * 0.46 - c.top) / c.height) * 2 - 1));
      anchor.heightFrac = r.height / c.height;
    }
    // phones stack the crest above the text, so the camera tilts down to bring the water up behind the crest
    const narrow = c.width < 1000;
    lookAt.set(0, narrow ? 0.5 : 4.2, -10);
    camera.position.copy(baseCam);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    // ship: to the left of and below the crest on wide screens, below and to the right of it on phones
    const shipNdc = narrow ? shipNdcNarrow : new THREE.Vector2(Math.max(-0.2, anchor.ndc.x - 0.62), -0.62);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(shipNdc, camera);
    const hitP = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP)) ship.position.copy(hitP);
    else ship.position.set(0, 0, -20);
    const d = ship.position.distanceTo(camera.position);
    ship.scale.setScalar(d / (narrow ? 56 : 30));
    ship.rotation.y = narrow ? 0.35 : -0.25;
    ship.userData.baseY = 0.25 * ship.scale.x;
  };
  layout();
  new ResizeObserver(() => { layout(); if (reduceMotion) stage.renderOnce(); }).observe(canvas);

  const placeCrest = () => {
    const dir = new THREE.Vector3(anchor.ndc.x, anchor.ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
    crest.position.copy(camera.position).addScaledVector(dir, CREST_DIST);
    const visibleH = 2 * CREST_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    crest.scale.setScalar((anchor.heightFrac * visibleH * 0.86) / crest.userData.height);
    crest.position.addScaledVector(camera.up, -crest.userData.centerY * crest.scale.x);
  };

  /* ---------------- interaction ---------------- */
  let rx = 0, ry = 0, vx = 0, vy = 0; // crest rotation: 0, 0 faces the visitor
  let hoverX = 0, hoverY = 0, hoverTX = 0, hoverTY = 0; // hover tilt
  let mode: '' | 'crest' | 'beam' = '';
  let lastX = 0, lastY = 0, lastInput = -100, lastBeamMove = -100, clock = 0;
  const aim = new THREE.Vector3(); // where the torch points
  let aimOnCrest = true, beamHover = false;
  const LIM_Y = 0.75, LIM_X = 0.4;
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const toNdc = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); };
  const crestCenter = () => crest.getWorldPosition(new THREE.Vector3()).addScaledVector(camera.up, crest.userData.centerY * crest.scale.x * 0.4);
  const pickCrest = () => raycaster.intersectObject(crest, true).find((h) => (h.object as THREE.Mesh).isMesh && h.object.name !== 'halo');
  const pickBeam = () => raycaster.intersectObject(beam.userData.hit as THREE.Mesh, false)[0] || raycaster.intersectObject(sailor, true)[0];
  const aimPlanePoint = () => {
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), crestCenter());
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, p) ? p : null;
  };

  canvas.addEventListener('pointerdown', (e) => {
    toNdc(e); raycaster.setFromCamera(ndc, camera);
    const hc = pickCrest();
    const hb = !hc && pickBeam();
    if (!hc && !hb) return;
    mode = hc ? 'crest' : 'beam';
    canvas.setPointerCapture(e.pointerId);
    lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
    canvas.classList.add('grabbing');
    lastInput = clock;
  });
  canvas.addEventListener('pointermove', (e) => {
    toNdc(e); raycaster.setFromCamera(ndc, camera);
    if (mode === 'crest') {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      vy = dx * 0.008; vx = dy * 0.006;
      ry = clamp(ry + vy, LIM_Y); rx = clamp(rx + vx, LIM_X);
      lastInput = clock;
      if (reduceMotion) stage.renderOnce();
      return;
    }
    if (mode === 'beam') {
      const p = aimPlanePoint();
      if (p) { p.y = Math.max(p.y, 0.5); aim.copy(p); aimOnCrest = false; lastBeamMove = clock; }
      if (reduceMotion) stage.renderOnce();
      return;
    }
    // hover: shift the scenes inside the crest windows toward the pointer, and hint what can be dragged
    const hc = pickCrest();
    if (hc) {
      const local = crest.worldToLocal(hc.point.clone());
      hoverTX = clamp(local.x, 1); hoverTY = clamp(local.y, 1.2);
      crest.userData.setPointer(hoverTX, hoverTY);
      canvas.style.cursor = 'grab';
      beamHover = false;
    } else {
      hoverTX = hoverTY = 0;
      crest.userData.setPointer(0, 0);
      beamHover = !!pickBeam();
      canvas.style.cursor = beamHover ? 'grab' : '';
    }
  });
  const end = () => { if (!mode) return; mode = ''; canvas.classList.remove('grabbing'); lastInput = clock; if (reduceMotion) vx = vy = 0; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!mode) { crest.userData.setPointer(0, 0); hoverTX = hoverTY = 0; } });

  // keyboard on the crest's placeholder element
  holo?.addEventListener('keydown', (e) => {
    const k = ({ ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.1, 0], ArrowDown: [0.1, 0] } as Record<string, number[]>)[e.key];
    if (!k) return;
    e.preventDefault();
    rx = clamp(rx + k[0], LIM_X); ry = clamp(ry + k[1], LIM_Y); lastInput = clock;
    stage.renderOnce();
  });
  // legend chips: turn toward a symbol and light up its window
  const facing: Record<string, [number, number]> = { atom: [0.1, 0.4], book: [0.1, -0.4], coast: [-0.12, 0.4], seed: [-0.12, -0.4] };
  let focus = '';
  holo?.querySelectorAll<HTMLButtonElement>('.holo-legend button').forEach((chip, _, all) => {
    chip.addEventListener('click', () => {
      focus = focus === chip.dataset.focus ? '' : chip.dataset.focus!;
      all.forEach((c) => c.classList.toggle('on', c.dataset.focus === focus));
      crest.userData.setFocus(focus);
      if (focus) { [rx, ry] = facing[focus]; vx = vy = 0; lastInput = clock + 4; }
      // re-aim the torch at the crest so the chosen window is lit
      aimOnCrest = true;
      stage.renderOnce();
    });
  });

  /* ---------------- animation ---------------- */
  const userQ = new THREE.Quaternion(), e3 = new THREE.Euler();
  const tmp = new THREE.Vector3(), dirA = new THREE.Vector3(), dirB = new THREE.Vector3();
  let mx = 0, my = 0, tmx = 0, tmy = 0, shootT = 6;
  window.addEventListener('pointermove', (e) => { tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  stage.onTick((t, dt) => {
    clock = t;
    // gentle camera drift with the mouse (the crest is re-anchored, so it stays put on the page)
    mx += (tmx - mx) * 0.03; my += (tmy - my) * 0.03;
    camera.position.set(baseCam.x + mx * 1.6, baseCam.y - my * 0.6, baseCam.z);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();

    // crest: it only moves when the visitor turns it (drag, hover, keys, chips);
    // otherwise it settles back to face the front and stays still
    if (mode !== 'crest') {
      ry = clamp(ry + vy, LIM_Y); rx = clamp(rx + vx, LIM_X);
      vy *= 0.9; vx *= 0.9;
      if (t - lastInput > 1.2) {
        const k = Math.min(1, (dt || 0.016) * 2.5);
        ry -= ry * k; rx -= rx * k;
      }
    }
    hoverX += (hoverTX - hoverX) * 0.08; hoverY += (hoverTY - hoverY) * 0.08;
    placeCrest();
    userQ.setFromEuler(e3.set(rx - hoverY * 0.08, ry + hoverX * 0.12, 0));
    crest.quaternion.copy(camera.quaternion).multiply(userQ);
    crest.userData.updateClipping();
    crest.userData.tick(t, dt || 0.016);

    // ship rides the swell
    ship.position.y = (ship.userData.baseY ?? 0) + Math.sin(t * 1.1) * 0.12 * ship.scale.x;
    ship.rotation.z = Math.sin(t * 0.9) * 0.035;
    ship.rotation.x = Math.sin(t * 0.7 + 1) * 0.025;
    ship.userData.tick(t);

    // the torch: aim back at the crest a few seconds after the visitor lets go
    const cc = crestCenter();
    if (aimOnCrest || (mode !== 'beam' && t - lastBeamMove > 7)) {
      aim.lerp(cc, aimOnCrest ? 1 : Math.min(1, dt * 1.5));
      if (aim.distanceTo(cc) < 0.05 * crest.scale.x) aimOnCrest = true;
    }
    // the sailor turns his body toward the light's target and points the torch at it
    sailor.updateMatrixWorld(true);
    const local = sailor.worldToLocal(tmp.copy(aim));
    body.rotation.y = Math.atan2(local.x, local.z); // the body's +Z faces the light's target
    body.updateMatrixWorld(true);
    shoulder.lookAt(aim);
    const tipPos = tip.getWorldPosition(new THREE.Vector3());
    spot.position.copy(tipPos);
    target.position.copy(aim);
    beam.position.copy(tipPos);
    beam.lookAt(aim);
    const len = tipPos.distanceTo(aim) * 1.15;
    const rad = len * Math.tan(spot.angle) * 0.9;
    beam.scale.set(rad, rad, len);
    (beam.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // how directly does the light fall on the crest? 1 = full neon glow, 0 = lights off
    dirA.copy(aim).sub(tipPos).normalize();
    dirB.copy(cc).sub(tipPos).normalize();
    const ang = Math.acos(THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1));
    const on = 1 - THREE.MathUtils.smoothstep(ang, 0.04, 0.14);
    crest.userData.setGlow(on);
    hitGlow.position.copy(aim);
    hitGlow.scale.setScalar(3.5 * crest.scale.x);
    (hitGlow.material as THREE.SpriteMaterial).opacity = 0.06 + 0.14 * on;
    (beam.material as THREE.ShaderMaterial).uniforms.uStrength.value = 0.5 + (beamHover ? 0.25 : 0) + (mode === 'beam' ? 0.25 : 0);

    // water, sky and details
    (water.material as THREE.ShaderMaterial).uniforms['time'].value += (dt || 0) * 0.45;
    starLayers.forEach((s, i) => { (s.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(t * (1.3 + i) + i * 2) * 0.25; });
    (village.material as THREE.PointsMaterial).opacity = 0.8 + Math.sin(t * 3.1) * 0.08;
    clouds.forEach((c, i) => { c.position.x += 0.6 * dt * (1 + (i % 3) * 0.3); if (c.position.x > 420) c.position.x = -420; });
    sweep.rotation.y = t * 0.6;
    palms.forEach((p) => p.userData.tick?.(t));
    nowkas.forEach((b) => { const ph = b.userData.phase; b.position.y = Math.sin(t * 1.1 + ph) * 0.18; b.rotation.z = Math.sin(t * 0.9 + ph) * 0.04; b.rotation.x = Math.sin(t * 0.7 + ph) * 0.02; });
    moon.rotation.y += dt * 0.004;

    // shooting star
    shootT -= dt;
    const sm = shoot.material as THREE.LineBasicMaterial;
    if (shootT < 0) {
      shootT = 9 + Math.random() * 10;
      shoot.position.set(-60 + Math.random() * 200, 120 + Math.random() * 60, -400);
      shoot.userData.life = 1;
    }
    if (shoot.userData.life > 0) {
      shoot.userData.life -= dt * 1.4;
      shoot.position.x -= dt * 160; shoot.position.y -= dt * 40;
      sm.opacity = Math.max(0, shoot.userData.life);
    }
  });

  aim.copy(crestCenter());
  stage.renderOnce();
  holo?.classList.add('ready');
  canvas.classList.add('ready');
}
