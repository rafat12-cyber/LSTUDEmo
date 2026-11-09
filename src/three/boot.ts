// Boots the three.js scenes only where they are on the page and only if WebGL works.
// three.js is loaded lazily so the rest of the page never waits for it.

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

const holo = document.querySelector<HTMLElement>('.holo');
const coast = document.querySelector<HTMLCanvasElement>('canvas.coast-canvas');
const symbols = document.querySelectorAll<HTMLCanvasElement>('canvas.sym3d');

if (webglAvailable() && (holo || coast || symbols.length)) {
  document.documentElement.classList.add('webgl');
  const start = async () => {
    const [{ mountHero }, { mountSymbol }] = await Promise.all([import('./hero'), import('./scenes')]);
    if (coast) mountHero(coast, holo, holo?.dataset.bn || '');
    symbols.forEach((c) => mountSymbol(c, c.dataset.kind || 'atom'));
  };
  start().catch(() => document.documentElement.classList.remove('webgl'));
}
