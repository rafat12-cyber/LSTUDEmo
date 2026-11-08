// Motion layer for the LSTU site: scroll reveals, 3D card tilt, hero parallax,
// animated counters, scroll progress and a back-to-top button.
// Nothing runs when the visitor prefers reduced motion; the page stays fully static and readable.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const root = document.documentElement;

function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.textContent = '↑';
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }));
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 600), { passive: true });
}

function initScroll() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.setProperty('--progress', p.toFixed(4));
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// Elements that rise into view as you scroll, and which of them tilt under the pointer.
const REVEAL = '.section-title, .card, .board, .quicklinks a, .welcome .portrait, .welcome > div, .content, .sidebar .widget, .person, .table-wrap, .stat';
const TILT = '.card, .quicklinks a, .person, .welcome .portrait';

function initReveal() {
  const els = Array.from(document.querySelectorAll<HTMLElement>(REVEAL));
  // Stagger siblings that share a parent, so rows of cards cascade in.
  const groups = new Map<Element | null, number>();
  els.forEach((el) => {
    const n = groups.get(el.parentElement) ?? 0;
    groups.set(el.parentElement, n + 1);
    el.style.setProperty('--d', `${Math.min(n, 6) * 0.09}s`);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target as HTMLElement;
      el.classList.add('in');
      io.unobserve(el);
      // Drop the stagger delay once revealed so hover and tilt respond instantly.
      window.setTimeout(() => el.style.setProperty('--d', '0s'), 1400);
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
  els.forEach((el) => io.observe(el));
}

function initTilt() {
  if (!finePointer.matches) return;
  document.querySelectorAll<HTMLElement>(TILT).forEach((el) => {
    el.classList.add('tilt');
    const max = el.matches('.quicklinks a') ? 12 : 8;
    let frame = 0;
    el.addEventListener('pointerenter', () => el.classList.add('tilting'));
    el.addEventListener('pointermove', (ev) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width;
        const y = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${((x - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - y) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      el.classList.remove('tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

function initHeroParallax() {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero || !finePointer.matches) return;
  let frame = 0;
  hero.addEventListener('pointermove', (ev) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (((ev.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      hero.style.setProperty('--my', (((ev.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--mx', '0');
    hero.style.setProperty('--my', '0');
  });
}

function initCounters() {
  const nums = document.querySelectorAll<HTMLElement>('[data-count]');
  if (!nums.length) return;
  const fmt = new Intl.NumberFormat('en-US');
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix ?? '';
    const duration = 1600 + Math.min(target, 3000) * 0.2;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt.format(Math.round(target * eased)) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.parentElement?.classList.add('counted');
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
}

function init() {
  initBackToTop();
  if (reduce.matches || !('IntersectionObserver' in window)) {
    root.classList.remove('motion');
    return;
  }
  root.classList.add('motion', 'motion-ready');
  initScroll();
  initReveal();
  initTilt();
  initHeroParallax();
  initCounters();
}

init();
