// Live 3D background: a slowly turning sphere of soft gold points (no lines).
// It follows the mouse a little and scroll turns it. Drawn on one fixed <canvas>
// behind the whole page. Pauses when the tab is hidden; a single still frame is
// drawn when the visitor prefers reduced motion.

const canvas = document.querySelector<HTMLCanvasElement>('.bg3d');
const ctx = canvas?.getContext('2d');

if (canvas && ctx) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 760px)').matches;
  const COUNT = small ? 70 : 140;

  type P = { x: number; y: number; z: number; r: number; tw: number };
  const pts: P[] = [];
  // Fibonacci sphere gives an even spread of points
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * 2.399963229728653;
    const jitter = 0.92 + Math.random() * 0.16;
    pts.push({ x: Math.cos(th) * rad * jitter, y: y * jitter, z: Math.sin(th) * rad * jitter, r: 0.8 + Math.random() * 1.6, tw: Math.random() * 6.28 });
  }

  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('pointermove', (e) => {
    tmx = (e.clientX / w) * 2 - 1;
    tmy = (e.clientY / h) * 2 - 1;
  }, { passive: true });

  let angle = 0;
  const proj = new Array(COUNT);

  const draw = (t: number) => {
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    const scrollTurn = window.scrollY * 0.0006;
    const ay = angle + scrollTurn + mx * 0.35;
    const ax = 0.35 + my * 0.25;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const R = Math.max(w, h) * 0.42;
    const ox = w * 0.62, oy = h * 0.5;
    const fov = 2.6;

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < COUNT; i++) {
      const p = pts[i];
      const x1 = p.x * cy - p.z * sy;
      const z1 = p.x * sy + p.z * cy;
      const y1 = p.y * cx - z1 * sx;
      const z2 = p.y * sx + z1 * cx;
      const s = fov / (fov + z2);
      proj[i] = { x: ox + x1 * R * s, y: oy + y1 * R * s, z: z2, s, p };
    }

    // points (no connecting lines)
    for (let i = 0; i < COUNT; i++) {
      const q = proj[i];
      const near = (1 - q.z) / 2; // 0 far .. 1 near
      const twinkle = 0.75 + Math.sin(t * 0.002 + q.p.tw) * 0.25;
      ctx.fillStyle = `rgba(200, 150, 46, ${(0.25 + near * 0.5) * twinkle})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.p.r * q.s * (0.7 + near), 0, 6.283);
      ctx.fill();
    }
  };

  let raf = 0;
  const loop = (t: number) => {
    angle += 0.0012;
    draw(t);
    raf = requestAnimationFrame(loop);
  };

  if (reduce) {
    draw(0);
    window.addEventListener('resize', () => draw(0));
  } else {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    });
  }
}
