// Проявка дня: кинематографичная сцена после «Сохранить день».
// Загрузка 1→100% идёт по настоящим шагам конвейера → из-под кадра поднимается открытка-конверт дневника →
// она ложится на «стол» и раскрывается → из альбомных уголков встаёт отпечаток дня (обложка воспоминания),
// проявляясь из красного света фонаря в полный цвет; за ним расходятся «цветоделённые» слои палитры дня →
// отпечаток уходит влево, открытка уплывает вниз, справа появляется текст: название папки и правила, по которым день выглядит так.
import * as THREE from 'three';
import { MODES } from './mood.js';
import { fmtDate, weekday } from './util.js';
import { sfx } from './sfx.js';

const BG = 0x07070a;
const CW = 1.9, CH = 2.62, CT = 0.026;        // открытка: ширина, высота, толщина створки
const PH0 = 2.06, PW0 = PH0 * 9 / 16, PT = 0.012; // отпечаток внутри открытки
const TILT = 1.02;                            // на сколько открытка ложится назад (рад)
const MIN_LOAD_MS = 3900;

const ease = {
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ---------- текстуры (рисуются на canvas) ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function paper(x, w, h, base, fibres = 900, dark = false) {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < fibres; i++) {
    x.strokeStyle = dark ? `rgba(255,255,255,${Math.random() * 0.035})` : `rgba(90,70,40,${Math.random() * 0.06})`;
    x.lineWidth = Math.random() * 1.2;
    const px = Math.random() * w, py = Math.random() * h, a = Math.random() * Math.PI, l = 4 + Math.random() * 18;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, dark ? 'rgba(0,0,0,.45)' : 'rgba(80,60,30,.12)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}
function tex(c, renderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function wrap(x, text, maxW) {
  const words = text.split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
const dateLine = d => { const [y, m, dd] = d.split('-'); return `${+dd} · ${ROMAN[+m - 1]} · ${y}`; };

function coverFront(day) {
  const w = 1024, h = Math.round(1024 * CH / CW), c = canvas(w, h), x = c.getContext('2d');
  paper(x, w, h, '#17161b', 1400, true);
  x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = 2; x.strokeRect(54, 54, w - 108, h - 108);
  x.font = '400 26px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(236,234,230,.55)'; x.textBaseline = 'top';
  x.fillText('ДНЕВНИК · ' + day.date.slice(0, 4), 92, 92);
  x.textAlign = 'right'; x.fillText('КАДР ' + String(day.n || 1).padStart(3, '0'), w - 92, 92);
  // фонарь
  x.textAlign = 'center';
  const cy = h * 0.4;
  const glow = x.createRadialGradient(w / 2, cy, 0, w / 2, cy, 120); glow.addColorStop(0, 'rgba(255,77,46,.28)'); glow.addColorStop(1, 'rgba(255,77,46,0)');
  x.fillStyle = glow; x.fillRect(w / 2 - 130, cy - 130, 260, 260);
  x.fillStyle = '#ff4d2e'; x.beginPath(); x.arc(w / 2, cy, 30, 0, Math.PI * 2); x.fill();
  // название — «слепое тиснение»: светлый оттиск с тенью
  x.font = '900 118px Unbounded, sans-serif'; x.textBaseline = 'alphabetic';
  const ty = h * 0.58;
  x.fillStyle = 'rgba(0,0,0,.7)'; x.fillText('ПОСЛЕ', w / 2 + 2, ty + 3); x.fillText('ВКУСИЕ', w / 2 + 2, ty + 116);
  x.fillStyle = '#e9e6e0'; x.fillText('ПОСЛЕ', w / 2, ty);
  x.fillStyle = '#ff4d2e'; x.fillText('ВКУСИЕ', w / 2, ty + 113);
  x.font = '400 28px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(236,234,230,.6)';
  x.fillText(dateLine(day.date), w / 2, h - 150);
  x.font = '400 22px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(236,234,230,.35)';
  x.fillText('ДЕНЬ ПРОЯВЛЕН · НЕ ОТКРЫВАТЬ НА СВЕТУ', w / 2, h - 106);
  return c;
}
function coverInside(day) {
  const w = 1024, h = Math.round(1024 * CH / CW), c = canvas(w, h), x = c.getContext('2d');
  paper(x, w, h, '#efe8da');
  x.fillStyle = 'rgba(40,34,28,.55)'; x.font = '400 24px "JetBrains Mono", monospace'; x.textBaseline = 'top';
  x.fillText('ЗАПИСЬ · ' + fmtDate(day.date).toUpperCase(), 96, 104);
  x.fillStyle = '#2a2520'; x.font = '400 54px Caveat, cursive';
  let t = day.text.replace(/\s+/g, ' ').trim(); if (t.length > 230) t = t.slice(0, 230).replace(/\s\S*$/, '') + '…';
  const lines = wrap(x, '«' + t + '»', w - 200).slice(0, 10);
  lines.forEach((l, i) => x.fillText(l, 100, 190 + i * 70));
  x.fillStyle = 'rgba(40,34,28,.6)'; x.font = '400 46px Caveat, cursive'; x.textAlign = 'right';
  x.fillText('— ' + weekday(day.date), w - 110, 190 + lines.length * 70 + 30);
  return c;
}
function panelInside(day) {
  const w = 1024, h = Math.round(1024 * CH / CW), c = canvas(w, h), x = c.getContext('2d');
  paper(x, w, h, '#f1ebdf');
  const sx = w / CW, sy = h / CH;
  const rx = (CW / 2 - PW0 / 2) * sx, ry = (CH / 2 - PH0 / 2) * sy, rw = PW0 * sx, rh = PH0 * sy;
  // след отпечатка и альбомные уголки
  x.fillStyle = 'rgba(70,52,30,.08)'; x.fillRect(rx, ry, rw, rh);
  x.fillStyle = '#26221e';
  const k = 64;
  [[rx, ry, 1, 1], [rx + rw, ry, -1, 1], [rx, ry + rh, 1, -1], [rx + rw, ry + rh, -1, -1]].forEach(([px, py, dx, dy]) => {
    x.beginPath(); x.moveTo(px - dx * 12, py - dy * 12); x.lineTo(px + dx * k, py - dy * 12); x.lineTo(px - dx * 12, py + dy * k); x.closePath(); x.fill();
  });
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(40,34,28,.6)'; x.font = '400 22px "JetBrains Mono", monospace';
  x.fillText(('▣ ' + day.folder).toUpperCase().slice(0, 52), w / 2, ry / 2);
  // палитра дня — полоса под отпечатком
  const pal = day.spec.palette.slice(0, 6), pw = 70, gap = 10, total = pal.length * pw + (pal.length - 1) * gap;
  pal.forEach((col, i) => { x.fillStyle = col; x.fillRect(w / 2 - total / 2 + i * (pw + gap), ry + rh + (h - ry - rh) / 2 - 16, pw, 32); });
  return c;
}
function cardBack() {
  const w = 512, h = Math.round(512 * CH / CW), c = canvas(w, h), x = c.getContext('2d');
  paper(x, w, h, '#151419', 500, true);
  x.fillStyle = '#ff4d2e'; x.beginPath(); x.arc(w / 2, h - 90, 9, 0, Math.PI * 2); x.fill();
  return c;
}
function glowCanvas() {
  const s = 256, c = canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,77,46,1)'); g.addColorStop(0.3, 'rgba(255,77,46,.35)'); g.addColorStop(1, 'rgba(255,77,46,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
}

// ---------- текстовая часть финала ----------
export function rulesFor(day) {
  const sp = day.spec, m = day.analysis.music;
  const minor = m.mode !== 'major';
  const out = [];
  out.push([`${m.bpm} BPM${m.source === 'audio' ? '' : ' (по описанию)'}`, `${sp.beatsPerPhoto} ${sp.beatsPerPhoto < 5 ? 'доли' : 'долей'} на кадр, ${({ cut: 'резкие склейки', dissolve: 'медленные наплывы', wipe: 'цветные шторки', stack: 'фрагменты в такт', flicker: 'плёночные вспышки' })[sp.transition]}`]);
  out.push([minor ? 'минор' : 'мажор', minor ? `цвета приглушены, воздух вокруг фото ${Math.round(sp.air * 100)}%` : `цвета звучат в полную силу, воздух ${Math.round(sp.air * 100)}%`]);
  // причина выбора приёма — те же оси, по которым его выбирает mood.js
  const why = { monet: 'тепло и покой', matisse: 'радость и энергия', kandinsky: 'напряжение', ma: 'тишина и грусть', film: 'ностальгия', collage: 'много людей и событий' }[sp.mode];
  out.push([why, `приём «${MODES[sp.mode].name}» — ${MODES[sp.mode].ref.split(',')[0]}`]);
  return out;
}
function finalHTML(day) {
  const sp = day.spec, m = day.analysis.music;
  const r = (html, d, cls = '') => `<div class="cx-r ${cls}" style="--d:${d}s">${html}</div>`;
  return `
    ${r(`<p class="cx-kicker mono">день проявлен · кадр ${String(day.n || 1).padStart(3, '0')}</p>`, 0)}
    ${r(`<p class="cx-date mono">${esc(fmtDate(day.date))} · ${esc(weekday(day.date))}</p>`, 0.08)}
    ${r(`<h2 class="cx-title">${esc(day.title)}</h2>`, 0.16)}
    ${r(`<p class="cx-folder mono">${esc(day.folder)}</p>`, 0.26)}
    ${r(`<div class="cx-stamps">${[sp.label, MODES[sp.mode].name, `${m.bpm} BPM`, m.mode === 'major' ? 'мажор' : 'минор'].map(s => `<span class="stamp">${esc(s)}</span>`).join('')}</div>`, 0.34)}
    ${r(`<p class="cx-h mono">почему он выглядит так</p><ul class="cx-rules">${rulesFor(day).map(([a, b]) => `<li><span>${esc(a)}</span><i>→</i><span>${esc(b)}</span></li>`).join('')}</ul>`, 0.44)}
    ${r(`<div class="cx-pal">${sp.palette.map(c => `<span style="background:${c}"></span>`).join('')}</div>`, 0.54)}
    ${r(`<div class="cx-cta"><button type="button" class="btn-box" data-act="play">▶ Смотреть воспоминание</button><button type="button" class="btn-ghost" data-act="day">Открыть страницу дня →</button></div>`, 0.64)}`;
}

// ================================================================
export class ConfirmExperience {
  constructor({ steps = [] } = {}) {
    this.steps = steps;
    this.reduced = reducedMotion();
    this.gl = !this.reduced && webgl();
    this.state = { rise: 0, open: 0, tilt: 0, pop: 0, lift: 0, develop: 0, fan: 0, move: 0, out: 0, load: 0 };
    this.shown = 0; this.stepIdx = -1; this.done = false; this.raf = 0;
    this.pointer = new THREE.Vector2(); this.pointerS = new THREE.Vector2();
  }

  // 1. открыть экран загрузки сразу по нажатию
  open() {
    const el = this.el = document.createElement('div');
    el.className = 'cx' + (this.gl ? '' : ' cx-flat');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Проявка дня');
    const ticks = Array.from({ length: 100 }, (_, i) => { const a = (i / 100) * Math.PI * 2 - Math.PI / 2, r1 = 92, r2 = 100; return `<line x1="${110 + Math.cos(a) * r1}" y1="${110 + Math.sin(a) * r1}" x2="${110 + Math.cos(a) * r2}" y2="${110 + Math.sin(a) * r2}"/>`; }).join('');
    el.innerHTML = `
      ${this.gl ? '<canvas class="cx-gl" aria-hidden="true"></canvas>' : ''}
      <div class="cx-load" aria-live="polite">
        <p class="cx-kicker mono">проявляю день</p>
        <div class="cx-dial"><svg viewBox="0 0 220 220" aria-hidden="true">${ticks}</svg><div class="cx-num"><span class="cx-n">1</span><i>%</i></div></div>
        <p class="cx-msg mono">${esc(this.steps[0] || 'Читаю запись')}</p>
      </div>
      <div class="cx-final"><div class="cx-still"></div><div class="cx-text"></div></div>
      <button type="button" class="cx-skip mono gone">пропустить →</button>`;
    document.body.appendChild(el);
    window.__cx = this;
    document.documentElement.classList.add('cx-lock');
    window.__lenis?.stop?.();
    this.ticks = [...el.querySelectorAll('.cx-dial line')];
    this.nEl = el.querySelector('.cx-n'); this.msgEl = el.querySelector('.cx-msg');
    this.onKey = e => { if (e.key === 'Escape' && this.resolve) this.finish('day'); };
    window.addEventListener('keydown', this.onKey);
    el.querySelector('.cx-skip').addEventListener('click', () => this.skip());
    el.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) this.finish(b.dataset.act); });
    if (this.gl) { try { this.initGL(); } catch (e) { console.warn('3D недоступно, показываю без него', e); this.gl = false; el.classList.add('cx-flat'); el.querySelector('.cx-gl')?.remove(); } }
    this.t0 = performance.now(); this.last = this.t0;
    requestAnimationFrame(() => el.classList.add('on'));
    const loop = () => { this.raf = requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  // шаг конвейера (0..steps-1) — потолок, выше которого проценты не уходят
  // возвращает промис на два кадра: конвейер уступает поток, и проценты не замирают на тяжёлых шагах
  step(i) {
    this.stepIdx = Math.max(this.stepIdx, i); if (this.msgEl && this.steps[i]) this.msgEl.textContent = this.steps[i];
    return new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 120); }); // в фоновой вкладке кадров нет
  }

  // 2. день собран — дождаться 100% и сыграть сцену. Промис возвращает выбор пользователя: 'play' | 'day'
  reveal(day) {
    this.day = day; this.done = true;
    this.el?.querySelector('.cx-skip').classList.remove('gone');
    if (this.msgEl) this.msgEl.textContent = 'Страница дня готова';
    return new Promise(res => { this.resolve = res; this.waitFull(); });
  }
  fail() { this.dispose(); }

  waitFull() {
    if (this.shown < 100) { this.waitT = setTimeout(() => this.waitFull(), 60); return; }
    this.waitT = setTimeout(() => this.play(), 380);
  }

  async play() {
    if (this.started || !this.el) return; this.started = true;
    const el = this.el, day = this.day;
    el.querySelector('.cx-text').innerHTML = finalHTML(day);
    if (!this.gl) {
      this.coverUrl = URL.createObjectURL(day.cover);
      el.querySelector('.cx-still').innerHTML = `<img src="${this.coverUrl}" alt="Обложка дня «${esc(day.title)}»">`;
      el.classList.add('loaded');
      setTimeout(() => { el.classList.add('show-text', 'show-still'); this.focusCta(); }, this.reduced ? 250 : 500);
      el.querySelector('.cx-skip').classList.add('gone');
      return;
    }
    await this.buildDay(day);
    if (!this.el || !this.renderer) return;
    el.classList.add('loaded');
    const S = this.state, g = window.gsap;
    const tl = this.tl = g ? g.timeline({ onComplete: () => el.querySelector('.cx-skip').classList.add('gone') }) : null;
    if (!tl) { Object.assign(S, { rise: 1, open: 1, tilt: 1, pop: 1, lift: 1, develop: 1, fan: 1, move: 1, out: 1 }); this.showText(); return; }
    tl.to(S, { rise: 1, duration: 1.5, ease: 'power3.out' }, 0.05)
      .to(S, { load: 1, duration: 0.7, ease: 'power2.inOut' }, 0)
      .to(S, { open: 1, duration: 1.65, ease: 'power2.inOut' }, 1.3)
      .to(S, { tilt: 1, duration: 1.7, ease: 'power2.inOut' }, 1.2)
      .to(S, { pop: 1, duration: 1.35, ease: 'power3.out' }, 2.55)
      .to(S, { develop: 1, duration: 2.3, ease: 'sine.inOut' }, 2.6)
      .to(S, { lift: 1, duration: 1.2, ease: 'power2.out' }, 2.95)
      .to(S, { fan: 1, duration: 1.5, ease: 'power2.out' }, 3.35)
      .to(S, { move: 1, duration: 1.7, ease: 'power3.inOut' }, 4.2)
      .to(S, { out: 1, duration: 1.4, ease: 'power2.in' }, 4.3)
      .call(() => sfx('open'), null, 1.35)
      .call(() => sfx('reveal'), null, 2.7)
      .call(() => this.showText(), null, 5.15);
    // темп сцены следует за днём: спокойный день раскрывается медленнее, энергичный — быстрее
    tl.timeScale(Math.min(1.15, Math.max(0.86, 0.8 + day.spec.motion * 0.4)));
    if (this.skipReq) { tl.progress(1); this.showText(); }
  }
  showText() { this.el.classList.add('show-text'); setTimeout(() => this.focusCta(), 900); }
  focusCta() { this.el?.querySelector('[data-act="play"]')?.focus({ preventScroll: true }); }
  skip() {
    if (!this.done) return; // день ещё собирается — пропустить можно только саму анимацию
    if (this.shown < 100) { this.shown = 100; this.paintPercent(100); }
    clearTimeout(this.waitT);
    this.skipReq = true;
    if (!this.started) { this.play(); return; }
    if (this.tl) { this.tl.progress(1); this.showText(); }
  }
  finish(act) {
    const r = this.resolve; this.resolve = null;
    this.el.classList.add('closing');
    setTimeout(() => this.dispose(), 650);
    r && r(act);
  }

  // ---------- WebGL ----------
  initGL() {
    const cv = this.el.querySelector('.cx-gl');
    const small = Math.min(innerWidth, innerHeight) < 700;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
    r.setClearColor(BG, 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    s.add(new THREE.HemisphereLight(0xfff1e6, 0x1a1418, 1.05));
    const key = this.key = new THREE.DirectionalLight(0xfff3e8, 2.1);
    key.position.set(-3.2, 4.6, 6.5); key.castShadow = true;
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 24 });
    key.shadow.radius = small ? 3 : 5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    s.add(key);
    const fill = new THREE.DirectionalLight(0xffe2d2, 0.35); fill.position.set(4, 1, 5); s.add(fill);
    // красный фонарь проявочной — контровой свет сзади-снизу
    const lamp = this.lamp = new THREE.PointLight(0xff4d2e, 0, 16, 1.6); lamp.position.set(2.6, -1.2, -1.5); s.add(lamp);

    this.glowTex = new THREE.CanvasTexture(glowCanvas());
    const glow = this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(11, 11, 1); glow.position.set(0, 0.2, -5); s.add(glow);

    // пыль в луче фонаря
    const N = small ? 260 : 520, p = new Float32Array(N * 3); this.dustSpd = new Float32Array(N);
    for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 14; p[i * 3 + 1] = (Math.random() - 0.5) * 8; p[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1.5; this.dustSpd[i] = 0.04 + Math.random() * 0.12; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd9c4, size: 0.028, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.dust);

    this.onResize = () => this.resize();
    this.onMove = e => this.pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    this.resize();
  }

  async buildDay(day) {
    try { await Promise.all(['900 64px Unbounded', '400 20px "JetBrains Mono"', '400 40px Caveat'].map(f => document.fonts.load(f, 'АаZ'))); } catch {}
    const r = this.renderer, s = this.scene;
    const std = o => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, ...o });
    const edge = std({ color: 0xe4dccd });
    const tFront = tex(coverFront(day), r), tIn = tex(coverInside(day), r), tPanel = tex(panelInside(day), r), tBack = tex(cardBack(), r);
    // у ImageBitmap флаг flipY в WebGL не работает — переворачиваем при декодировании
    const bmp = await createImageBitmap(day.cover, { imageOrientation: 'flipY' });
    const tCover = new THREE.Texture(bmp); tCover.colorSpace = THREE.SRGBColorSpace; tCover.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy()); tCover.needsUpdate = true;
    this.bitmap = bmp;
    if (!this.renderer) { bmp.close && bmp.close(); return; }

    const root = this.root = new THREE.Group(); s.add(root);
    const spread = this.spread = new THREE.Group(); root.add(spread);
    // задняя створка (правая страница разворота)
    const back = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CT), [edge, edge, edge, edge, std({ map: tPanel }), std({ map: tBack, roughness: 0.7 })]);
    back.position.set(CW / 2, 0, 0); back.castShadow = back.receiveShadow = true; spread.add(back);
    // корешок
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(CT * 0.9, CT * 0.9, CH, 12, 1, true), std({ color: 0x1b1a1f, roughness: 0.6 }));
    spine.position.set(0, 0, CT * 0.55); spine.castShadow = true; spread.add(spine);
    // передняя створка на петле
    const hinge = this.hinge = new THREE.Group(); hinge.position.set(0, 0, CT / 2 + 0.018); spread.add(hinge);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CT), [edge, edge, edge, edge, std({ map: tFront, roughness: 0.62 }), std({ map: tIn })]);
    cover.position.set(CW / 2, 0, CT / 2); cover.castShadow = cover.receiveShadow = true; hinge.add(cover);
    // тень на невидимый «стол»
    const catcher = this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.42 }));
    catcher.position.set(0, 0, -CT / 2 - 0.004); catcher.receiveShadow = true; root.add(catcher);

    // отпечаток дня: точка вращения — нижний край, как у раскладной открытки
    const pivot = this.pivot = new THREE.Group();
    pivot.position.set(CW / 2, -PH0 / 2, CT / 2 + 0.008); spread.add(pivot);
    const pg = new THREE.BoxGeometry(PW0, PH0, PT); pg.translate(0, PH0 / 2, 0);
    const white = std({ color: 0xf4f0e8, roughness: 0.8 });
    this.printFront = std({ map: tCover, roughness: 0.42 });
    const print = this.print = new THREE.Mesh(pg, [white, white, white, white, this.printFront, std({ color: 0xece5d8 })]);
    print.castShadow = true; print.receiveShadow = true; pivot.add(print);
    // слои цветоделения — палитра дня
    const pal = day.spec.palette; const cols = [pal[0], pal[Math.min(2, pal.length - 1)], '#' + day.spec.accent.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')];
    this.plates = cols.map((c, i) => {
      const gpl = new THREE.PlaneGeometry(PW0, PH0); gpl.translate(0, PH0 / 2, 0);
      const m = new THREE.Mesh(gpl, std({ color: new THREE.Color(c), side: THREE.DoubleSide, roughness: 0.92 }));
      m.userData.base = new THREE.Color(c); m.castShadow = true; m.receiveShadow = true;
      m.position.z = -PT / 2 - 0.002 - i * 0.002; pivot.add(m); return m;
    });
    pivot.visible = false;
    this.detached = false;
    this.resize();
  }

  resize() {
    if (!this.renderer) return;
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const vh = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), vw = vh * this.camera.aspect;
    const narrow = w / h < 0.9;
    // финальное положение отпечатка: слева на широком экране, сверху на узком
    let ph = Math.min(vh * 0.6, vw * 0.34 * 16 / 9), cy = -0.02;
    if (narrow) {
      // на узком экране отпечаток занимает место над текстом — меряем, сколько его осталось
      const wpp = vh / h, top = 64, txt = this.el && this.el.querySelector('.cx-text');
      const textTop = txt && txt.offsetHeight ? h - txt.offsetHeight : h * 0.55;
      const space = Math.max(120, textTop - top - 18);
      ph = Math.min(space * wpp * 0.94, vh * 0.4);
      cy = (h / 2 - (top + space / 2)) * wpp;
    }
    this.final = {
      scale: ph / PH0,
      x: narrow ? -0.06 : -vw * 0.235,
      y: cy - ph / 2,
      z: 0, ry: narrow ? 0.12 : 0.24,
    };
    // сама открытка помещается в кадр на любом экране
    this.shiftK = narrow ? 0.1 : 0.75;
    this.cardScale = Math.min(1.12, (vw * 0.86) / (CW * 2), (vh * 0.66) / CH);
  }

  paintPercent(n) {
    if (n === this.painted) return; this.painted = n;
    this.nEl.textContent = n;
    for (let i = 0; i < 100; i++) this.ticks[i].classList.toggle('lit', i < n);
    const cur = this.el.querySelector('.cx-dial line.cur'); cur && cur.classList.remove('cur');
    this.ticks[Math.max(0, n - 1)].classList.add('cur');
  }

  frame() {
    const now = performance.now(), rawDt = (now - this.last) / 1000, dt = Math.min(0.05, rawDt), t = (now - this.t0) / 1000; this.last = now;
    const perFrame = Math.max(1, Math.round(rawDt * 60)); // на медленном устройстве шаг крупнее, длительность та же
    // ---- проценты: плавно, по одному, но не быстрее настоящего конвейера ----
    if (this.shown < 100) {
      const minMs = this.reduced ? 1200 : MIN_LOAD_MS;
      const timeT = 100 * ease.sine(Math.min(1, (now - this.t0) / minMs));
      const cap = this.done ? 100 : Math.min(96, ((this.stepIdx + 1) / Math.max(1, this.steps.length)) * 100 - 3);
      const target = Math.min(cap, timeT);
      // не больше одного процента за кадр: каждое число 1, 2, 3… действительно показывается
      if (this.shown < target) this.shown = Math.min(target, Math.floor(this.shown) + perFrame, this.shown + Math.min(58, Math.max(9, (target - this.shown) * 4)) * rawDt);
      else if (!this.done) this.shown = Math.min(cap, this.shown + 1.2 * dt); // «дышит», пока идёт тяжёлый шаг
      this.paintPercent(Math.max(1, Math.min(100, Math.floor(this.shown))));
    }
    if (!this.gl || !this.renderer) return;
    const S = this.state, cam = this.camera;
    this.pointerS.lerp(this.pointer, 0.05);
    cam.position.x = this.pointerS.x * 0.22; cam.position.y = this.pointerS.y * 0.14;
    cam.lookAt(0, 0, 0);

    // свет фонаря разгорается во время загрузки и гаснет к финалу
    const p = Math.min(1, this.shown / 100);
    this.glow.material.opacity = 0.08 + p * 0.16 - S.move * 0.1;
    this.lamp.intensity = (p * 18 + Math.sin(t * 1.4) * 1.5) * (1 - S.move * 0.6);
    this.dust.material.opacity = Math.min(0.5, t * 0.25);
    const dp = this.dust.geometry.attributes.position.array;
    for (let i = 0; i < this.dustSpd.length; i++) { dp[i * 3 + 1] += this.dustSpd[i] * dt; dp[i * 3] += Math.sin(t * 0.3 + i) * 0.0012; if (dp[i * 3 + 1] > 4) dp[i * 3 + 1] = -4; }
    this.dust.geometry.attributes.position.needsUpdate = true;

    if (this.root) {
      const k = this.cardScale;
      const root = this.root;
      // подъём из-под кадра → ложится на «стол» → уплывает вниз
      root.scale.setScalar(k);
      root.position.set(-CW / 2 * k * this.shiftK * S.pop, -7.5 * (1 - S.rise) - 0.95 * S.tilt * k - 7 * S.out, -0.6 * S.tilt + 0.3 * (1 - S.rise));
      root.rotation.set(0.5 * (1 - S.rise) - TILT * S.tilt - 0.35 * S.out, -0.32 * (1 - S.rise) + 0.12 * S.tilt * (1 - S.open) , 0.07 * (1 - S.rise));
      // раскрытие: петля + центрирование разворота
      const oa = S.open;
      this.spread.position.x = -CW / 2 * (1 - oa);
      this.hinge.rotation.y = -Math.PI * 0.985 * oa;
      // отпечаток встаёт из альбомных уголков
      this.pivot.visible = oa > 0.55;
      if (!this.detached) {
        this.pivot.rotation.x = TILT * S.pop;
        this.pivot.position.z = CT / 2 + 0.008 + S.lift * 0.55;
        this.pivot.position.y = -PH0 / 2 + S.lift * 0.12;
      }
    }
    if (this.print) {
      // проявка: из красного света — в полный цвет (как дни на главной)
      const d = S.develop;
      this.printFront.color.setRGB(0.16 + 0.84 * d, 0.03 + 0.97 * d * d, 0.02 + 0.98 * d * d);
      this.plates.forEach((m, i) => {
        const f = S.fan, b = m.userData.base;
        m.material.color.setRGB(b.r * (0.25 + 0.75 * d) + (1 - d) * 0.12, b.g * (0.25 + 0.75 * d), b.b * (0.25 + 0.75 * d));
        m.position.set((i + 1) * 0.06 * f, (i + 1) * 0.035 * f, -PT / 2 - 0.002 - (i + 1) * (0.002 + 0.08 * f));
        m.rotation.z = -(i + 1) * 0.022 * f;
      });
      // переход в мировые координаты, чтобы отпечаток пережил уход открытки
      if (S.move > 0 && !this.detached) {
        this.root.updateMatrixWorld(true);
        this.scene.attach(this.pivot);
        this.from = { pos: this.pivot.position.clone(), q: this.pivot.quaternion.clone(), s: this.pivot.scale.x };
        this.detached = true;
      }
      if (this.detached) {
        const f = this.final, m = S.move;
        const idle = Math.max(0, m - 0.9) / 0.1;
        const fl = Math.sin(t * 0.9) * 0.05 * idle;
        const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.03 + this.pointerS.y * 0.05 * idle, f.ry + Math.sin(t * 0.5) * 0.03 * idle + this.pointerS.x * 0.08 * idle, 0));
        this.pivot.position.set(
          THREE.MathUtils.lerp(this.from.pos.x, f.x, m),
          THREE.MathUtils.lerp(this.from.pos.y, f.y, m) + Math.sin(m * Math.PI) * 0.35 + fl,
          THREE.MathUtils.lerp(this.from.pos.z, f.z, m));
        this.pivot.quaternion.slerpQuaternions(this.from.q, tq, m);
        this.pivot.scale.setScalar(THREE.MathUtils.lerp(this.from.s, f.scale, m));
      }
    }
    if (this.root && S.out >= 1) this.root.visible = false;
    this.renderer.render(this.scene, cam);
  }

  dispose() {
    cancelAnimationFrame(this.raf); clearTimeout(this.waitT);
    this.tl && this.tl.kill(); this.tl = null;
    window.removeEventListener('keydown', this.onKey);
    if (this.renderer) {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointermove', this.onMove);
      this.scene.traverse(o => {
        o.geometry && o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(m => { ['map', 'alphaMap'].forEach(k => m[k] && m[k].dispose()); m.dispose(); });
      });
      this.bitmap && this.bitmap.close && this.bitmap.close();
      this.renderer.dispose(); this.renderer.forceContextLoss();
      this.renderer = null;
    }
    this.coverUrl && URL.revokeObjectURL(this.coverUrl);
    this.el && this.el.remove(); this.el = null;
    document.documentElement.classList.remove('cx-lock');
    window.__lenis?.start?.();
  }
}
