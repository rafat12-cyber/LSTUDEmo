// Small helper that owns one WebGL canvas: renderer, resize, render-only-when-visible,
// pause when the tab is hidden, and a single still frame for reduced-motion visitors.
import * as THREE from 'three';

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  onTick: (fn: (t: number, dt: number) => void) => void;
  renderOnce: () => void;
  size: { w: number; h: number };
};

export function createStage(canvas: HTMLCanvasElement, opts: { fov?: number; alpha?: boolean; maxDpr?: number } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opts.alpha ?? true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr ?? 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.1, 500);
  const ticks: ((t: number, dt: number) => void)[] = [];
  const size = { w: 1, h: 1 };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    size.w = Math.max(1, r.width); size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
  };
  resize();

  let visible = false, running = false, last = performance.now(), t = 0;
  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    ticks.forEach((fn) => fn(t, dt));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  const update = () => {
    const should = visible && !document.hidden && !reduceMotion;
    if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    if (!should) running = false;
  };
  const renderOnce = () => { ticks.forEach((fn) => fn(t, 0)); renderer.render(scene, camera); };

  new ResizeObserver(() => { resize(); if (!running) renderOnce(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }, { rootMargin: '100px' }).observe(canvas);
  document.addEventListener('visibilitychange', update);

  return { renderer, scene, camera, canvas, size, renderOnce, onTick: (fn) => ticks.push(fn) };
}

export function addStudioLights(scene: THREE.Scene, warm = 0xffe2b0) {
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x2a2238, 1.2));
  const key = new THREE.DirectionalLight(warm, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd8ff, 1.2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
}
