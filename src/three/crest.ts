// Hero crest: the full LSTU crest in real 3D. Drag (mouse or touch), arrow keys,
// or the legend chips turn it; it sways gently when left alone.
import * as THREE from 'three';
import { createCrest } from './models';
import { createStage, addStudioLights, reduceMotion } from './stage';

export function mountCrest(holo: HTMLElement, bnName: string) {
  const canvas = holo.querySelector<HTMLCanvasElement>('canvas.crest-canvas');
  if (!canvas) return;
  const stage = createStage(canvas, { fov: 30 });
  const { scene, camera } = stage;
  camera.position.set(0, -0.1, 6.4);
  addStudioLights(scene);
  const glow = new THREE.PointLight(0x9fe6ff, 6, 6);
  glow.position.set(0, -2, 1.5);
  scene.add(glow);

  const crest = createCrest(bnName);
  crest.position.y = 0.12;
  scene.add(crest);
  document.fonts?.ready.then(() => { crest.userData.refreshTextures(); stage.renderOnce(); });

  // rotation state
  let rx = -0.06, ry = -0.32, vx = 0, vy = 0;
  let dragging = false, lastX = 0, lastY = 0, lastInput = -10, swayT = 0, clock = 0;
  const LIM_Y = 0.75, LIM_X = 0.4; // keep it readable as a crest
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

  stage.onTick((t, dt) => {
    clock = t;
    crest.userData.tick(t);
    if (!dragging) {
      ry = clamp(ry + vy, LIM_Y); rx = clamp(rx + vx, LIM_X);
      vy *= 0.92; vx *= 0.92;
      if (t - lastInput > 2.5) {
        swayT += dt;
        ry += (Math.sin(swayT * 0.45) * 0.45 - ry) * 0.02;
        rx += (Math.sin(swayT * 0.3) * 0.08 - 0.04 - rx) * 0.02;
      }
    }
    crest.rotation.set(rx, ry, 0);
    crest.position.y = 0.12 + Math.sin(t * 0.9) * 0.04;
  });

  holo.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true; holo.classList.add('dragging');
    lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
    holo.setPointerCapture(e.pointerId);
  });
  holo.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vy = dx * 0.008; vx = dy * 0.006;
    ry = clamp(ry + vy, LIM_Y); rx = clamp(rx + vx, LIM_X);
    lastInput = clock;
    if (reduceMotion) { crest.rotation.set(rx, ry, 0); stage.renderOnce(); }
  });
  const end = () => { dragging = false; holo.classList.remove('dragging'); lastInput = clock; if (reduceMotion) vx = vy = 0; };
  holo.addEventListener('pointerup', end);
  holo.addEventListener('pointercancel', end);
  holo.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.1, 0], ArrowDown: [0.1, 0] }[e.key];
    if (!k) return;
    e.preventDefault();
    rx = clamp(rx + k[0], LIM_X); ry = clamp(ry + k[1], LIM_Y); lastInput = clock;
    crest.rotation.set(rx, ry, 0); stage.renderOnce();
  });

  // legend chips: turn toward a symbol and lift it out of the shield
  const syms = crest.userData.symbols as Record<string, THREE.Object3D>;
  const baseZ = Object.fromEntries(Object.entries(syms).map(([k, o]) => [k, o.position.z]));
  const facing: Record<string, [number, number]> = { atom: [0.12, 0.45], book: [0.12, -0.45], coast: [-0.15, 0.45], seed: [-0.15, -0.45] };
  let focus = '';
  stage.onTick(() => {
    Object.entries(syms).forEach(([k, o]) => {
      const target = baseZ[k] + (k === focus ? 0.35 : 0);
      const s = k === focus ? 1.18 : 1;
      o.position.z += (target - o.position.z) * 0.12;
      o.scale.setScalar(o.scale.x + (((o.userData.baseScale ??= o.scale.x) * s) - o.scale.x) * 0.12);
    });
  });
  holo.querySelectorAll<HTMLButtonElement>('.holo-legend button').forEach((chip, _, all) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.focus!;
      focus = focus === key ? '' : key;
      all.forEach((c) => c.classList.toggle('on', c.dataset.focus === focus));
      if (focus) { [rx, ry] = facing[focus]; vx = vy = 0; lastInput = clock + 4; }
      if (reduceMotion) {
        Object.entries(syms).forEach(([k, o]) => { o.position.z = baseZ[k] + (k === focus ? 0.35 : 0); });
        crest.rotation.set(rx, ry, 0);
        stage.renderOnce();
      }
    });
  });

  crest.rotation.set(rx, ry, 0);
  stage.renderOnce();
  holo.classList.add('ready');
}
