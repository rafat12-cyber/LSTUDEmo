// Drag-to-rotate for the holographic crest, with inertia, a gentle idle sway,
// keyboard control (arrow keys) and legend chips that bring one symbol forward.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHolo(holo: HTMLElement) {
  const rig = holo.querySelector<HTMLElement>('.holo-rig');
  if (!rig) return;

  let rx = -8, ry = -18; // current angles (deg)
  let vx = 0, vy = 0; // angular velocity from the last drag
  let dragging = false;
  let lastX = 0, lastY = 0;
  let lastInput = performance.now() - 5000;
  let swayT = 0;
  let running = false;

  const clampX = (v: number) => Math.max(-45, Math.min(45, v));
  const apply = () => {
    holo.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    holo.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  };

  const frame = (now: number) => {
    if (!dragging) {
      // inertia after a flick
      ry += vy; rx = clampX(rx + vx);
      vy *= 0.94; vx *= 0.94;
      // after 2.5s idle, ease back into a slow sway so it always feels alive
      if (!reduce && now - lastInput > 2500 && Math.abs(vy) < 0.05) {
        swayT += 0.008;
        const targetY = Math.sin(swayT) * 28 - 10;
        const targetX = Math.sin(swayT * 0.7) * 8 - 6;
        // unwrap ry toward the target so a full spin does not unwind backwards
        const wrapped = ((ry - targetY + 540) % 360) - 180;
        ry = targetY + wrapped * 0.97;
        rx += (targetX - rx) * 0.03;
      }
    }
    apply();
    if (running) requestAnimationFrame(frame);
  };

  const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  const stop = () => { running = false; };

  holo.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true; holo.classList.add('dragging');
    lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
    holo.setPointerCapture(e.pointerId);
    lastInput = performance.now();
    start();
  });
  holo.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vy = dx * 0.45; vx = -dy * 0.35;
    ry += vy; rx = clampX(rx + vx);
    lastInput = performance.now();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; holo.classList.remove('dragging');
    lastInput = performance.now();
    if (reduce) { vx = vy = 0; }
  };
  holo.addEventListener('pointerup', end);
  holo.addEventListener('pointercancel', end);

  holo.addEventListener('keydown', (e) => {
    const step = 12;
    if (e.key === 'ArrowLeft') ry -= step;
    else if (e.key === 'ArrowRight') ry += step;
    else if (e.key === 'ArrowUp') rx = clampX(rx + step);
    else if (e.key === 'ArrowDown') rx = clampX(rx - step);
    else return;
    e.preventDefault();
    lastInput = performance.now();
    apply();
  });

  // Legend chips: bring one symbol to the front and turn the crest toward it
  const chips = holo.querySelectorAll<HTMLButtonElement>('.holo-legend button');
  const facing: Record<string, [number, number]> = { atom: [10, 22], book: [10, -22], coast: [-12, 22], seed: [-12, -22] };
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.focus!;
      const on = !chip.classList.contains('on');
      chips.forEach((c) => c.classList.toggle('on', on && c === chip));
      holo.querySelectorAll('.holo-sym').forEach((s) => s.classList.toggle('focus', on && (s as HTMLElement).dataset.sym === key));
      holo.classList.toggle('has-focus', on);
      if (on) {
        [rx, ry] = facing[key]; vx = vy = 0;
        lastInput = performance.now() + 4000; // hold the pose a little longer
        apply();
      }
    });
  });

  // Only animate while the hero is on screen
  if (!reduce) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(holo);
  }
  apply();
}

document.querySelectorAll<HTMLElement>('.holo').forEach(initHolo);
