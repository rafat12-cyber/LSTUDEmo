// The smaller 3D scenes inside the home page sections (the hero lives in hero.ts).
import * as THREE from 'three';
import { C, createAtom, createBookSun, createSea, createSeedling } from './models';
import { createStage, addStudioLights } from './stage';

type Tickable = THREE.Object3D & { userData: { tick?: (t: number) => void } };
const tickAll = (objs: Tickable[], t: number) => objs.forEach((o) => o.userData.tick?.(t));

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
