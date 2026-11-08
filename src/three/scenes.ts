// The coastal hero scene and the smaller section scenes.
import * as THREE from 'three';
import { C, createAtom, createBookSun, createPalm, createSea, createSeedling } from './models';
import { createStage, addStudioLights } from './stage';

type Tickable = THREE.Object3D & { userData: { tick?: (t: number) => void } };
const tickAll = (objs: Tickable[], t: number) => objs.forEach((o) => o.userData.tick?.(t));

function skyTexture() {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 512;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#04122b');
  grad.addColorStop(0.42, '#0d2a5c');
  grad.addColorStop(0.7, '#3d4f86');
  grad.addColorStop(0.86, '#c9785a');
  grad.addColorStop(1, '#f2b25c');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowSprite(color: string, size: number) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

function createBoat() {
  const g = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.7, 0); hullShape.lineTo(0.7, 0); hullShape.lineTo(0.5, -0.22); hullShape.lineTo(-0.5, -0.22); hullShape.closePath();
  const h = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.3, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0x2a1b14, roughness: 0.8, flatShading: true }));
  h.position.z = -0.15;
  g.add(h);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0, 1.1); sailShape.lineTo(0.6, 0.05); sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshStandardMaterial({ color: 0xf0d9a8, side: THREE.DoubleSide, roughness: 0.9 }));
  sail.position.set(-0.1, 0.02, 0);
  g.add(sail);
  return g;
}

/** Hero background: dusk over the Meghna estuary, waves, palms, boats, birds and stars. */
export function mountCoast(canvas: HTMLCanvasElement) {
  const stage = createStage(canvas, { fov: 50, alpha: false, maxDpr: 1.5 });
  const { scene, camera } = stage;
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0x3d4f86, 30, 95);
  camera.position.set(0, 3.2, 14);
  camera.lookAt(0, 2.4, 0);

  scene.add(new THREE.HemisphereLight(0x9fb6ff, 0x1a1530, 1.1));
  const sunLight = new THREE.DirectionalLight(0xffb36b, 2.4);
  sunLight.position.set(6, 4, -40);
  scene.add(sunLight);

  // sun sitting on the horizon
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffc46b, fog: false }));
  sun.position.set(9, 2.2, -70);
  scene.add(sun);
  const halo = glowSprite('rgba(255,180,90,0.85)', 26);
  halo.position.copy(sun.position);
  scene.add(halo);

  // ocean
  const sea = createSea(160, 90, 90, 50, 0x1d4f7a, 0.22, false);
  (sea.material as THREE.MeshStandardMaterial).roughness = 0.18;
  (sea.material as THREE.MeshStandardMaterial).metalness = 0.35;
  sea.position.set(0, 0, -30);
  scene.add(sea);
  // a band of sunlight reflected on the water
  const glitter = glowSprite('rgba(255,200,120,0.55)', 1);
  glitter.scale.set(8, 26, 1);
  glitter.position.set(7, 0.3, -40);
  scene.add(glitter);

  // distant islands
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x1b2440, roughness: 1, flatShading: true });
  [[-30, -60, 9], [-14, -66, 6], [26, -64, 7]].forEach(([x, z, s]) => {
    const i = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), islandMat);
    i.scale.y = 0.22;
    i.position.set(x, -0.2, z);
    scene.add(i);
  });

  // shore on the left with palm silhouettes
  const shore = new THREE.Mesh(new THREE.SphereGeometry(10, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2236, roughness: 1, flatShading: true }));
  shore.scale.set(1.4, 0.16, 0.7);
  shore.position.set(-17, -0.3, -7);
  scene.add(shore);
  const palms: THREE.Object3D[] = [];
  [[-13, 0.4, -6, 5.2, 0.8], [-15.5, 0.5, -8, 6.4, -0.5], [-17.5, 0.3, -5, 4.4, 1.0], [-11, 0.2, -10, 3.6, 0.5]].forEach(([x, y, z, h, lean]) => {
    const p = createPalm(h, lean, true);
    p.position.set(x, y, z);
    p.rotation.y = x * 0.3;
    scene.add(p);
    palms.push(p);
  });

  // fishing boats
  const boats = [createBoat(), createBoat(), createBoat()];
  boats[0].position.set(-2, 0.2, -18); boats[0].scale.setScalar(1.2);
  boats[1].position.set(14, 0.2, -32); boats[1].scale.setScalar(1.6);
  boats[2].position.set(4, 0.2, -48); boats[2].scale.setScalar(1.8);
  boats.forEach((b) => scene.add(b));

  // birds: simple V shapes flapping
  const birdMat = new THREE.LineBasicMaterial({ color: 0x0b1222 });
  const birds = Array.from({ length: 6 }, (_, i) => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.3, 0.1, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 0.1, 0)]);
    const b = new THREE.Line(geo, birdMat);
    b.position.set(-6 + i * 2.2, 7 + Math.sin(i) * 0.8, -20 - i);
    b.userData.speed = 0.6 + (i % 3) * 0.15;
    scene.add(b);
    return b;
  });

  // stars
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 260; i++) starPos.push((Math.random() - 0.5) * 200, 14 + Math.random() * 40, -80 - Math.random() * 10);
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8, fog: false }));
  scene.add(stars);

  // gentle camera parallax with the mouse
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  stage.onTick((t) => {
    (sea.userData.tick as (t: number) => void)(t * 0.8);
    palms.forEach((p) => p.userData.tick?.(t));
    boats.forEach((b, i) => {
      b.position.y = 0.15 + Math.sin(t * 1.3 + i * 2) * 0.12;
      b.rotation.z = Math.sin(t * 1.1 + i) * 0.05;
      b.position.x += 0.004 * (i % 2 ? -1 : 1);
      if (b.position.x > 30) b.position.x = -30;
      if (b.position.x < -30) b.position.x = 30;
    });
    birds.forEach((b, i) => {
      b.position.x += 0.02 * b.userData.speed;
      if (b.position.x > 22) b.position.x = -22;
      const flap = Math.sin(t * 6 * b.userData.speed + i) * 0.12;
      const pos = (b.geometry.attributes.position as THREE.BufferAttribute);
      pos.setY(0, 0.1 + flap); pos.setY(2, 0.1 + flap); pos.needsUpdate = true;
    });
    glitter.material.opacity = 0.75 + Math.sin(t * 2) * 0.2;
    (stars.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(t * 0.7) * 0.15;
    mx += (tx - mx) * 0.03; my += (ty - my) * 0.03;
    camera.position.x = mx * 2.4;
    camera.position.y = 3.2 - my * 0.8;
    camera.lookAt(mx * 0.8, 2.4, 0);
  });
  stage.renderOnce();
}

/** A decorative scene showing one logo symbol inside a section. */
export function mountSymbol(canvas: HTMLCanvasElement, kind: string) {
  const stage = createStage(canvas, { fov: 30 });
  const { scene, camera } = stage;
  addStudioLights(scene);
  const objs: Tickable[] = [];

  if (kind === 'atom') {
    const atom = createAtom(2.4);
    scene.add(atom); objs.push(atom);
    camera.position.set(0, 0, 4.2);
  } else if (kind === 'book') {
    const book = createBookSun(2.6);
    scene.add(book); objs.push(book);
    camera.position.set(0, 0.2, 4.4);
  } else if (kind === 'seed') {
    const seed = createSeedling(2.6);
    seed.position.y = 0.05;
    scene.add(seed); objs.push(seed);
    camera.position.set(0, 0.2, 4);
    // grow in when first seen
    let grown = 0;
    seed.scale.setScalar(0.01);
    stage.onTick((_, dt) => { grown = Math.min(1, grown + dt * 0.6); const e = 1 - Math.pow(1 - grown, 3); seed.scale.setScalar(2.6 * Math.max(0.01, e)); });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) seed.scale.setScalar(2.6);
  } else if (kind === 'waves') {
    // Meghna water under the stats band, seen from above at a low angle
    const sea = createSea(24, 10, 60, 24, C.seaDeep, 0.16, false);
    (sea.material as THREE.MeshStandardMaterial).color.set(0x1a4a86);
    (sea.material as THREE.MeshStandardMaterial).roughness = 0.45;
    (sea.material as THREE.MeshStandardMaterial).metalness = 0.1;
    scene.add(sea); objs.push(sea);
    camera.position.set(0, 2.2, 6);
    camera.lookAt(0, 0, -2);
  }

  stage.onTick((t) => tickAll(objs, t));
  stage.renderOnce();
}
