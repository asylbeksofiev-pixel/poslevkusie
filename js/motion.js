// Движение сайта: плавная прокрутка (Lenis), анимации по скроллу (GSAP ScrollTrigger),
// курсор, проявление текста по словам, горизонтальная галерея, живая волна, 3D-наклон карточек.
const G = () => window.gsap, ST = () => window.ScrollTrigger;
let lenis = null, homeCtx = null, waveRaf = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMotion() {
  if (G() && ST()) G().registerPlugin(ST());
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true }); window.__lenis = lenis;
    if (G() && ST()) { lenis.on('scroll', ST().update); G().ticker.add(t => lenis.raf(t * 1000)); G().ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  initCursor();
}
export function scrollTop() { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); }
export function onScroll(fn) { if (lenis) lenis.on('scroll', e => fn(e.scroll)); else window.addEventListener('scroll', () => fn(window.scrollY), { passive: true }); }

function initCursor() {
  const el = document.querySelector('.cursor'); if (!el || matchMedia('(hover: none)').matches) return;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
  const loop = () => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; el.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); };
  loop();
  document.addEventListener('pointerover', e => { el.classList.toggle('big', !!e.target.closest('a, button, .card, .mode-card, .drop, #hero-gl[style*="pointer"]')); });
}

function splitWords(node) {
  if (node.dataset.split) return [...node.querySelectorAll('.w')];
  node.dataset.split = '1';
  node.innerHTML = node.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  return [...node.querySelectorAll('.w')];
}

export function enterHome(wave) {
  leaveHome();
  const gsap = G(), ScrollTrigger = ST();
  document.querySelectorAll('[data-words]').forEach(splitWords);
  startWave(wave);
  if (!gsap || !ScrollTrigger || reduce) { document.querySelectorAll('.w').forEach(w => w.style.opacity = 1); return; }
  homeCtx = gsap.context(() => {
    // заголовок героя
    gsap.from('.hero-title .ht', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.2 });
    gsap.from('.hero-side > *, .hero-meta', { opacity: 0, y: 24, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.7 });
    // параллакс заголовка при уходе
    gsap.to('.hero-title', { yPercent: -30, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    // слова проявляются по скроллу
    document.querySelectorAll('[data-words]').forEach(node => {
      gsap.to(node.querySelectorAll('.w'), { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: node, start: 'top 82%', end: 'bottom 45%', scrub: true } });
    });
    gsap.from('.statement-grid > div', { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.statement-grid', start: 'top 85%' } });
    gsap.from('.step-list li', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.step-list', start: 'top 80%' } });
    gsap.from('.music-map li', { x: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.music-map', start: 'top 80%' } });
    gsap.from('.h2', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.h2', start: 'top 85%' } });
    // горизонтальная галерея приёмов — закреплена, едет вбок
    const mm = gsap.matchMedia();
    mm.add('(min-width: 641px)', () => {
      const track = document.querySelector('.modes-rail');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.modes-sec', start: 'top top', end: () => '+=' + dist(), pin: '.modes-pin', scrub: 0.8, invalidateOnRefresh: true } });
    });
  });
  // ScrollTrigger запоминает прокрутку и восстанавливает её при refresh() — из-за этого при возврате на главную
  // страница «прыгала» в середину с полупрозрачным заголовком. Сбрасываем память и начинаем сверху.
  ScrollTrigger.clearScrollMemory && ScrollTrigger.clearScrollMemory('manual');
  requestAnimationFrame(() => { ScrollTrigger.refresh(); scrollTop(); });
}
export function refreshScroll() { if (ST()) requestAnimationFrame(() => ST().refresh()); }
export function leaveHome() {
  if (homeCtx) { homeCtx.revert(); homeCtx = null; }
  cancelAnimationFrame(waveRaf);
}

// «подпись песни» реального дня: огибающая громкости из аудиоанализа, пульс — в темпе песни
function startWave(wave) {
  const c = document.getElementById('wave'); if (!c) return;
  const cap = document.getElementById('wave-cap');
  const x = c.getContext('2d'); const W = c.width, H = c.height;
  const sig = wave?.sig?.length ? wave.sig : null;
  if (!sig) { x.clearRect(0, 0, W, H); if (cap) cap.textContent = ''; return; }
  if (cap) cap.textContent = `подпись песни дня «${wave.title}» · ${wave.bpm} bpm · наведите курсор`;
  const N = sig.length, bpm = wave.bpm || 100;
  let mx = -1;
  c.onpointermove = e => { const r = c.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; };
  c.onpointerleave = () => { mx = -1; };
  const loop = t => {
    x.clearRect(0, 0, W, H);
    const beat = (t / 1000) * bpm / 60, kick = Math.exp(-(beat % 1) * 5);
    const prog = (t / 1000 / 24) % 1;
    for (let i = 0; i < N; i++) {
      const p = i / N, near = mx < 0 ? 0 : Math.exp(-((p - mx) ** 2) / 0.004);
      const v = sig[i] * (0.82 + 0.18 * kick) + near * 0.25;
      const h = Math.max(4, v * H * 0.92), bw = W / N;
      x.fillStyle = p < prog ? '#ff4d2e' : `rgba(236,234,230,${0.22 + sig[i] * 0.5 + near * 0.3})`;
      x.fillRect(i * bw + 1, (H - h) / 2, Math.max(1, bw - 3), h);
    }
    waveRaf = requestAnimationFrame(loop);
  };
  waveRaf = requestAnimationFrame(loop);
}

// 3D-наклон карточек за курсором
export function tilt(container, sel = '.card') {
  container.querySelectorAll(sel).forEach(card => {
    const cover = card.querySelector('.cover, .mc-img'); if (!cover || card.dataset.tilt) return;
    card.dataset.tilt = '1';
    card.addEventListener('pointermove', e => {
      const r = cover.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cover.style.transform = `rotateY(${(px - 0.5) * 14}deg) rotateX(${(0.5 - py) * 14}deg) translateZ(10px)`;
      cover.style.setProperty('--mx', px * 100 + '%'); cover.style.setProperty('--my', py * 100 + '%');
    });
    card.addEventListener('pointerleave', () => { cover.style.transform = ''; });
  });
}
