// Движок «страницы дневника»: вертикальный кадр 9:16 (720×1280).
// ПОСТОЯННОЕ: бумага, поля 44px, шапка (дата · № дня · штамп настроения), окно фото, название-заголовок,
//            рукописная подпись, подвал с «подписью песни» (огибающая громкости) и строкой о песне.
// ПЕРЕМЕННОЕ: обработка фото (6 приёмов), палитра, ритм смены кадров (из BPM), движение, зерно, частицы погоды.
import { rng, hashStr, clamp, lerp, smooth, rgba, rgb2hsl, hsl2rgb, lum, mix, ROMAN } from '../util.js';

export const W = 720, H = 1280, MARGIN = 44;
const BASE = { x: MARGIN, y: 124, w: W - MARGIN * 2, h: 748 };

const FONTS = [
  '500 60px "Cormorant Garamond"', 'italic 500 60px "Cormorant Garamond"', '700 60px "Cormorant Garamond"', '600 60px "Cormorant Garamond"',
  '400 30px "Caveat"', '400 18px "JetBrains Mono"', '600 18px "JetBrains Mono"',
];
let fontsReady = null;
export function loadFonts() {
  if (!fontsReady) fontsReady = Promise.all(FONTS.map(f => document.fonts.load(f, 'Аа').catch(() => null))).then(() => document.fonts.ready);
  return fontsReady;
}

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function cover(bmp, w, h) {
  const c = mk(w, h), x = c.getContext('2d');
  const k = Math.max(w / bmp.width, h / bmp.height);
  const dw = bmp.width * k, dh = bmp.height * k;
  x.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}
function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function eachPixel(c, fn) {
  const x = c.getContext('2d', { willReadFrequently: true });
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const o = fn(d[i], d[i + 1], d[i + 2], i / 4); d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; }
  x.putImageData(id, 0, 0);
  return c;
}
function rectFor(spec) {
  const m = spec.mode;
  if (m === 'ma') { const s = 0.6; const w = BASE.w * s, h = BASE.h * s; return { x: BASE.x + (BASE.w - w) * 0.66, y: BASE.y + (BASE.h - h) * 0.36, w, h }; }
  if (m === 'film') return { x: BASE.x + 40, y: BASE.y + 26, w: BASE.w - 80, h: BASE.h - 70 };
  if (m === 'monet') { const s = 1 - spec.air * 0.16; const w = BASE.w * s, h = BASE.h * s; return { x: BASE.x + (BASE.w - w) / 2, y: BASE.y + (BASE.h - h) / 2, w, h }; }
  return { ...BASE };
}
function blobPath(ctx, r, cx, cy, rad, n = 7) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const rr = rad * (0.55 + r() * 0.65); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  ctx.closePath();
}

// ================= ПРИЁМЫ ОБРАБОТКИ ФОТО =================
const TECH = {
  // ---- Моне: мазки по форме + рассеянный свет ----
  monet(bmp, R, spec, seed) {
    const src = cover(bmp, R.w, R.h);
    const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    const sw = src.width, sh = src.height;
    const L = (x, y) => { x = clamp(x | 0, 0, sw - 1); y = clamp(y | 0, 0, sh - 1); const i = (y * sw + x) * 4; return (sd[i] * 0.3 + sd[i + 1] * 0.59 + sd[i + 2] * 0.11); };
    const pal = spec.paletteRgb;
    const variant = s => {
      const r = rng(seed + s);
      const c = mk(sw, sh), x = c.getContext('2d');
      x.filter = 'blur(10px) saturate(1.1)'; x.drawImage(src, 0, 0); x.filter = 'none';
      x.lineCap = 'round';
      const passes = [{ n: sw * sh / 240, len: [18, 38], wid: [8, 14], a: .75 }, { n: sw * sh / 85, len: [8, 20], wid: [3, 7], a: .85 }, { n: sw * sh / 400, len: [4, 9], wid: [2, 3], a: .9 }];
      for (const p of passes) for (let i = 0; i < p.n; i++) {
        const px = r() * sw, py = r() * sh;
        const ii = ((py | 0) * sw + (px | 0)) * 4;
        let col = [sd[ii], sd[ii + 1], sd[ii + 2]];
        let [h, s2, l] = rgb2hsl(col);
        h += (r() - 0.5) * 18; l = clamp(l + (r() - 0.45) * 0.1, 0, 1); s2 = clamp(s2 * 1.15 + 0.04, 0, 1);
        col = mix(hsl2rgb([h, s2, l]), pal[(r() * pal.length) | 0], 0.12);
        const gx = L(px + 3, py) - L(px - 3, py), gy = L(px, py + 3) - L(px, py - 3);
        const ang = Math.hypot(gx, gy) > 12 ? Math.atan2(gy, gx) + Math.PI / 2 : Math.sin(px * 0.012) * 1.2 + Math.cos(py * 0.009) * 0.9;
        const len = lerp(p.len[0], p.len[1], r()), wd = lerp(p.wid[0], p.wid[1], r());
        x.strokeStyle = rgba(col, p.a); x.lineWidth = wd;
        x.beginPath(); x.moveTo(px - Math.cos(ang) * len / 2, py - Math.sin(ang) * len / 2);
        x.quadraticCurveTo(px + Math.sin(ang) * wd * 0.3, py - Math.cos(ang) * wd * 0.3, px + Math.cos(ang) * len / 2, py + Math.sin(ang) * len / 2); x.stroke();
      }
      // свет: тёплое свечение в самой яркой зоне
      let bx = 0, by = 0, bl = -1;
      for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) { const l = L((gx + .5) * sw / 6, (gy + .5) * sh / 6); if (l > bl) { bl = l; bx = (gx + .5) * sw / 6; by = (gy + .5) * sh / 6; } }
      const g = x.createRadialGradient(bx, by, 0, bx, by, sw * 0.8);
      g.addColorStop(0, 'rgba(255,226,170,0.35)'); g.addColorStop(1, 'rgba(255,226,170,0)');
      x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, sw, sh); x.globalCompositeOperation = 'source-over';
      return c;
    };
    return { a: variant(1), b: variant(2) };
  },

  // ---- Матисс / фовизм: 5 чистых цветов + растр ризографа ----
  matisse(bmp, R, spec) {
    const c = cover(bmp, R.w, R.h);
    const cols = [...spec.paletteRgb].map(p => { const [h, s, l] = rgb2hsl(p); return hsl2rgb([h, clamp(s * 1.35 + 0.15, 0, 0.95), l]); }).sort((a, b) => lum(a) - lum(b));
    const band = cols.length;
    eachPixel(c, (r, g, b) => { const l = (r * 0.3 + g * 0.59 + b * 0.11) / 255; return cols[Math.min(band - 1, Math.floor(Math.pow(l, 0.9) * band))]; });
    const x = c.getContext('2d');
    const src = cover(bmp, R.w, R.h).getContext('2d').getImageData(0, 0, c.width, c.height).data;
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = rgba(mix(spec.accent, [30, 30, 60], 0.35), 0.55);
    const step = 9;
    for (let y = 0; y < c.height; y += step) for (let xx = (y / step) % 2 ? step / 2 : 0; xx < c.width; xx += step) {
      const i = ((y | 0) * c.width + (xx | 0)) * 4; const l = (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255;
      const rad = (1 - l) * step * 0.48; if (rad < 0.6) continue;
      x.beginPath(); x.arc(xx + 2, y + 1.5, rad, 0, Math.PI * 2); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    return { a: c };
  },

  // ---- Кандинский: дуотон высокого контраста ----
  kandinsky(bmp, R, spec) {
    const c = cover(bmp, R.w, R.h);
    const darkC = spec.dark ? [12, 16, 30] : [22, 30, 58];
    const light = spec.dark ? [150, 170, 200] : mix([226, 230, 236], spec.paletteRgb[spec.paletteRgb.length - 1], 0.25);
    eachPixel(c, (r, g, b) => { let l = (r * 0.3 + g * 0.59 + b * 0.11) / 255; l = clamp((l - 0.5) * 1.6 + 0.5); l = smooth(l); return mix(darkC, light, l); });
    return { a: c };
  },

  // ---- «Ма»: приглушённое фото, растворённые края ----
  ma(bmp, R, spec) {
    const c = cover(bmp, R.w, R.h);
    const paper = spec.page.bg;
    eachPixel(c, (r, g, b) => { const l = (r * 0.3 + g * 0.59 + b * 0.11); const k = 0.32; let o = [lerp(l, r, k), lerp(l, g, k), lerp(l, b, k)]; o = o.map(v => v * 0.92 + 18); return mix(o, paper, 0.05); });
    const x = c.getContext('2d');
    const fog = (x0, y0, x1, y1) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, rgba(paper, 1)); g.addColorStop(1, rgba(paper, 0)); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); };
    const f = 0.12;
    fog(0, 0, 0, c.height * f); fog(0, c.height, 0, c.height * (1 - f)); fog(0, 0, c.width * f, 0); fog(c.width, 0, c.width * (1 - f), 0);
    return { a: c };
  },

  // ---- Плёнка: выцветшая кривая, виньетка ----
  film(bmp, R, spec) {
    const ins = 20, bottom = 78;
    const c = cover(bmp, R.w - ins * 2, R.h - ins - bottom);
    const cool = spec.mood.warmth < -0.2;
    eachPixel(c, (r, g, b) => {
      const l = (r * 0.3 + g * 0.59 + b * 0.11);
      r = lerp(l, r, 0.78); g = lerp(l, g, 0.78); b = lerp(l, b, 0.78);
      return cool ? [24 + r * 0.82, 30 + g * 0.84, 34 + b * 0.8] : [30 + r * 0.86, 22 + g * 0.82, 26 + b * 0.68];
    });
    const x = c.getContext('2d');
    const g = x.createRadialGradient(c.width / 2, c.height / 2, c.width * 0.3, c.width / 2, c.height / 2, c.width * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,0,0.45)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    // отпечаток с белой рамкой
    const p = mk(R.w, R.h), px = p.getContext('2d');
    px.fillStyle = '#f7f3ea'; px.fillRect(0, 0, R.w, R.h);
    px.drawImage(c, ins, ins);
    return { a: p, inner: { x: ins, y: ins, w: c.width, h: c.height } };
  },

  // ---- Коллаж: рваный фрагмент с растром ----
  collage(bmp, R, spec, seed) {
    const r = rng(seed);
    const pw = R.w * lerp(0.58, 0.78, r()), ph = pw * lerp(0.8, 1.25, r());
    const c = cover(bmp, pw, ph);
    eachPixel(c, (rr, g, b) => [clamp((rr - 128) * 1.18 + 132, 0, 255), clamp((g - 128) * 1.18 + 128, 0, 255), clamp((b - 128) * 1.18 + 122, 0, 255)]);
    const m = mk(pw + 20, ph + 20), x = m.getContext('2d');
    // рваный край
    x.beginPath();
    const jag = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10); for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(lerp(x0, x1, t) + (r() - 0.5) * 5, lerp(y0, y1, t) + (r() - 0.5) * 5); } };
    x.moveTo(10, 10); jag(10, 10, pw + 10, 10); jag(pw + 10, 10, pw + 10, ph + 10); jag(pw + 10, ph + 10, 10, ph + 10); jag(10, ph + 10, 10, 10);
    x.closePath();
    x.fillStyle = '#f4efe4'; x.fill();
    x.save(); x.clip(); x.drawImage(c, 14, 14, pw - 8, ph - 8); x.restore();
    return { a: m, rot: (r() - 0.5) * 0.24, ox: (r() - 0.5) * (R.w - pw) * 0.9, oy: (r() - 0.5) * (R.h - ph) * 0.8 };
  },
};

// ================= КЛАСС ПАМЯТИ =================
export class Memory {
  constructor(day, opts = {}) {
    this.day = day; this.spec = day.spec; this.music = day.analysis.music;
    this.index = opts.index || 1;
    this.seed = hashStr(day.id + day.title);
    this.R = rectFor(this.spec);
  }

  async prepare(onProgress) {
    await loadFonts();
    const spec = this.spec;
    this.bitmaps = [];
    for (const b of this.day.photos) this.bitmaps.push(await createImageBitmap(b));
    this.layers = [];
    for (let i = 0; i < this.bitmaps.length; i++) {
      this.layers.push(TECH[spec.mode](this.bitmaps[i], this.R, spec, this.seed + i * 101));
      onProgress && onProgress(i + 1, this.bitmaps.length);
      await new Promise(r => setTimeout(r, 0));
    }
    this.paper = this.makePaper();
    this.grainTiles = Array.from({ length: 4 }, (_, i) => this.makeGrain(i));
    this.particles = this.makeParticles();
    this.decor = this.makeDecor();
    this.prepText();
    return this;
  }

  makePaper() {
    const c = mk(W, H), x = c.getContext('2d'), r = rng(this.seed + 7);
    x.fillStyle = rgba(this.spec.page.bg); x.fillRect(0, 0, W, H);
    // волокна бумаги — постоянная фактура дневника
    const id = x.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * (this.spec.dark ? 7 : 10); d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(id, 0, 0);
    x.strokeStyle = this.spec.dark ? 'rgba(255,255,255,0.025)' : 'rgba(80,60,30,0.035)';
    for (let i = 0; i < 260; i++) { const px = r() * W, py = r() * H, a = r() * Math.PI; x.lineWidth = 0.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14); x.stroke(); }
    return c;
  }
  makeGrain(i) {
    const s = 256, c = mk(s, s), x = c.getContext('2d'), id = x.createImageData(s, s), r = rng(this.seed + 99 + i);
    for (let p = 0; p < id.data.length; p += 4) { const v = r() * 255; id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = 255; }
    x.putImageData(id, 0, 0); return c;
  }
  makeParticles() {
    const type = this.spec.particles; if (!type) return null;
    const r = rng(this.seed + 31);
    const n = { snow: 90, rain: 120, leaves: 26, dust: 60, confetti: 40 }[type];
    const pal = this.spec.paletteRgb;
    return { type, list: Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, s: r(), ph: r() * 6.28, c: type === 'leaves' ? mix(pal[(r() * pal.length) | 0], [200, 110, 30], 0.5) : type === 'confetti' ? pal[(r() * pal.length) | 0] : null })) };
  }
  makeDecor() {
    const r = rng(this.seed + 55), R = this.R, spec = this.spec, pal = spec.paletteRgb;
    if (spec.mode === 'matisse') {
      return Array.from({ length: 7 }, (_, i) => {
        const side = i % 4; const t = r();
        const cx = side === 0 ? R.x + t * R.w : side === 1 ? R.x + R.w : side === 2 ? R.x + t * R.w : R.x;
        const cy = side === 0 ? R.y : side === 1 ? R.y + t * R.h : side === 2 ? R.y + R.h : R.y + t * R.h;
        const col = i === 0 ? spec.accent : (() => { const [h, s, l] = rgb2hsl(pal[i % pal.length]); return hsl2rgb([h + 20 * (r() - .5), clamp(s * 1.4 + 0.2, 0, .95), clamp(l, .35, .65)]); })();
        return { cx, cy, rad: 34 + r() * 46, seed: (r() * 1e9) | 0, col, ph: r() * 4, rot: r() * 6 };
      });
    }
    if (spec.mode === 'kandinsky') {
      const yellow = [232, 186, 40], blue = [38, 66, 160], red = spec.accent, ink = spec.dark ? [235, 235, 240] : [24, 22, 26];
      const items = [];
      items.push({ t: 'circle', x: R.x + R.w * (0.62 + r() * 0.2), y: R.y + R.h * (0.18 + r() * 0.2), rad: 70 + r() * 50, col: red, rings: [blue, yellow] });
      items.push({ t: 'circle', x: R.x + R.w * (0.1 + r() * 0.3), y: R.y + R.h * (0.7 + r() * 0.2), rad: 28 + r() * 20, col: yellow, rings: [] });
      items.push({ t: 'circle', x: R.x + R.w * r(), y: R.y + R.h * r(), rad: 12, col: ink, rings: [] });
      for (let i = 0; i < 7; i++) { const a = -0.9 + r() * 1.8, cx = R.x + r() * R.w, cy = R.y + r() * R.h, len = 200 + r() * 500; items.push({ t: 'line', x0: cx - Math.cos(a) * len / 2, y0: cy - Math.sin(a) * len / 2, x1: cx + Math.cos(a) * len / 2, y1: cy + Math.sin(a) * len / 2, w: i < 2 ? 6 : 1.5 + r() * 2, col: i === 0 ? red : ink, d: r() }); }
      items.push({ t: 'tri', x: R.x + R.w * (0.15 + r() * 0.5), y: R.y + R.h * (0.35 + r() * 0.3), s: 60 + r() * 50, rot: r() * 6, col: blue });
      items.push({ t: 'arc', x: R.x + R.w * 0.5, y: R.y + R.h * 0.55, rad: 160 + r() * 80, a0: r() * 3, col: ink });
      items.push({ t: 'grid', x: R.x + R.w * (0.55 + r() * 0.2), y: R.y + R.h * (0.62 + r() * 0.15), n: 4, s: 14, col: ink });
      // ячейки сетки, в которых показано фото
      const cells = []; for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 3; gx++) cells.push({ gx, gy, on: r() > 0.22, dx: 0 });
      return { items, cells };
    }
    if (spec.mode === 'collage') {
      const words = (this.day.text.match(/[А-Яа-яЁёA-Za-z-]{5,}/g) || []).sort((a, b) => b.length - a.length);
      const uniq = [...new Set(words.map(w => w.toLowerCase()))].slice(0, 7);
      return uniq.map((w, i) => ({ w, x: R.x + 20 + r() * (R.w - 200), y: R.y + 30 + r() * (R.h - 60), rot: (r() - 0.5) * 0.3, serif: i % 2 === 0, inv: i % 3 === 0 }));
    }
    return null;
  }
  prepText() {
    const c = mk(10, 10).getContext('2d'), sp = this.spec, ty = sp.type;
    const title = ty.titleUpper ? this.day.title.toUpperCase() : this.day.title;
    let size = ty.titleSize;
    c.font = `${ty.titleItalic ? 'italic ' : ''}${ty.titleWeight} ${size}px "Cormorant Garamond"`;
    let lines = wrap(c, title, W - MARGIN * 2);
    while (lines.length > 2 && size > 36) { size -= 4; c.font = `${ty.titleItalic ? 'italic ' : ''}${ty.titleWeight} ${size}px "Cormorant Garamond"`; lines = wrap(c, title, W - MARGIN * 2); }
    this.titleFont = c.font; this.titleLines = lines.slice(0, 3); this.titleSize = size;
    c.font = '400 31px "Caveat"';
    this.capLines = wrap(c, this.day.analysis.text.caption || '', W - MARGIN * 2).slice(0, 3);
  }

  // ---------- кадр ----------
  draw(ctx, t, level = 0) {
    const sp = this.spec, R = this.R, n = this.layers.length;
    const bpm = this.music.bpm, beat = t * bpm / 60, beatFrac = beat - Math.floor(beat);
    const kick = Math.exp(-beatFrac * 5) * (0.6 + level * 0.8);
    const seg = sp.beatsPerPhoto * 60 / bpm;
    const idx = Math.floor(t / seg) % n, local = (t % seg) / seg;
    const nextIdx = (idx + 1) % n;
    const intro = clamp(t / 1.6);

    ctx.save();
    ctx.drawImage(this.paper, 0, 0);
    const fg = sp.page.fg, sub = sp.page.sub;

    // окно фото (вход: раскрытие)
    ctx.save();
    const reveal = smooth(intro);
    ctx.globalAlpha = reveal;
    this['draw_' + sp.mode](ctx, { t, idx, nextIdx, local, seg, kick, beat, level, n, reveal });
    ctx.restore();

    this.drawParticles(ctx, t);
    this.drawGrain(ctx, t);
    this.drawFrame(ctx, t, fg, sub);
    ctx.restore();
  }

  photoXf(ctx, local, k = 0.06) {
    // медленный «кен бёрнс»: масштаб растёт в течение кадра
    const R = this.R, s = 1 + local * k * this.spec.motion;
    ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(s, s); ctx.translate(-R.x - R.w / 2, -R.y - R.h / 2);
  }

  draw_monet(ctx, f) {
    const R = this.R;
    const fade = 0.22; // доля сегмента на наплыв
    const tr = f.local > 1 - fade && f.n > 1 ? smooth((f.local - (1 - fade)) / fade) : 0;
    const shimmer = 0.5 + 0.5 * Math.sin(f.t * 1.1);
    ctx.save();
    ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    const drawL = (L, a, local) => { ctx.save(); this.photoXf(ctx, local); ctx.globalAlpha *= a; ctx.drawImage(L.a, R.x, R.y); ctx.globalAlpha *= shimmer; ctx.drawImage(L.b, R.x, R.y); ctx.restore(); };
    drawL(this.layers[f.idx], 1, f.local);
    if (tr > 0) drawL(this.layers[f.nextIdx], tr, 0);
    ctx.restore();
    // мягкий край окна — мазок, а не рамка
    ctx.strokeStyle = rgba(this.spec.page.bg, 0.9); ctx.lineWidth = 10; ctx.strokeRect(R.x, R.y, R.w, R.h);
  }

  draw_matisse(ctx, f) {
    const R = this.R;
    const wipeDur = 0.16;
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.save(); this.photoXf(ctx, f.local, 0.04); ctx.drawImage(this.layers[f.idx].a, R.x, R.y); ctx.restore();
    if (f.local > 1 - wipeDur && f.n > 1) {
      const p = smooth((f.local - (1 - wipeDur)) / wipeDur);
      ctx.fillStyle = rgba(this.spec.accent); ctx.fillRect(R.x, R.y, R.w * Math.min(1, p * 2), R.h);
      if (p > 0.5) { const q = (p - 0.5) * 2; ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w * q, R.h); ctx.clip(); ctx.drawImage(this.layers[f.nextIdx].a, R.x, R.y); ctx.restore(); }
    }
    ctx.restore();
    // формы-вырезки пляшут в такт
    for (const d of this.decor) {
      const r = rng(d.seed);
      const s = 1 + f.kick * 0.12 * this.spec.motion;
      ctx.save(); ctx.translate(d.cx, d.cy + Math.sin(f.t * 1.4 + d.ph) * 6); ctx.rotate(d.rot + Math.sin(f.t * 0.6 + d.ph) * 0.15); ctx.scale(s, s);
      ctx.fillStyle = rgba(d.col); blobPath(ctx, r, 0, 0, d.rad, 6 + (d.seed % 3)); ctx.fill();
      ctx.restore();
    }
  }

  draw_kandinsky(ctx, f) {
    const R = this.R, { items, cells } = this.decor;
    const cw = R.w / 3, ch = R.h / 4;
    const cut = f.local * f.seg < 0.12; // глитч в первые 120 мс после склейки
    const L = this.layers[f.idx].a;
    const ink = this.spec.dark ? [235, 235, 240] : [24, 22, 26];
    for (const c of cells) {
      if (!c.on) continue;
      const dx = cut ? (rng(c.gx * 7 + c.gy * 13 + f.idx)() - 0.5) * 40 : 0;
      ctx.drawImage(L, c.gx * cw, c.gy * ch, cw, ch, R.x + c.gx * cw + dx, R.y + c.gy * ch, cw - 4, ch - 4);
    }
    // сетка
    ctx.strokeStyle = rgba(ink, 0.25); ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(R.x + i * cw - 2, R.y - 20); ctx.lineTo(R.x + i * cw - 2, R.y + R.h + 20); ctx.stroke(); }
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(R.x - 20, R.y + i * ch - 2); ctx.lineTo(R.x + R.w + 20, R.y + i * ch - 2); ctx.stroke(); }
    // геометрия — не заходит на зону названия (постоянный элемент)
    const draw = clamp(f.t / 2.4);
    ctx.save(); ctx.beginPath(); ctx.rect(0, R.y - 12, W, R.h + 36); ctx.clip();
    for (const it of items) {
      ctx.save();
      if (it.t === 'circle') {
        const s = 1 + f.kick * 0.1 * this.spec.motion;
        ctx.globalCompositeOperation = this.spec.dark ? 'screen' : 'multiply';
        it.rings.forEach((rc, i) => { ctx.strokeStyle = rgba(rc, 0.9); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(it.x, it.y, it.rad * s * (1.25 + i * 0.25), 0, Math.PI * 2 * draw); ctx.stroke(); });
        ctx.fillStyle = rgba(it.col, 0.9); ctx.beginPath(); ctx.arc(it.x, it.y, it.rad * s, 0, Math.PI * 2); ctx.fill();
      } else if (it.t === 'line') {
        const p = clamp(draw * 1.4 - it.d * 0.4);
        ctx.strokeStyle = rgba(it.col, 0.95); ctx.lineWidth = it.w; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(it.x0, it.y0); ctx.lineTo(lerp(it.x0, it.x1, p), lerp(it.y0, it.y1, p)); ctx.stroke();
      } else if (it.t === 'tri') {
        ctx.translate(it.x, it.y); ctx.rotate(it.rot + f.beat * 0.02); ctx.fillStyle = rgba(it.col, 0.85);
        ctx.globalCompositeOperation = this.spec.dark ? 'screen' : 'multiply';
        ctx.beginPath(); ctx.moveTo(0, -it.s); ctx.lineTo(it.s * 0.87, it.s * 0.5); ctx.lineTo(-it.s * 0.87, it.s * 0.5); ctx.closePath(); ctx.fill();
      } else if (it.t === 'arc') {
        ctx.strokeStyle = rgba(it.col, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it.x, it.y, it.rad, it.a0 + f.t * 0.05, it.a0 + f.t * 0.05 + 2.2 * draw); ctx.stroke();
      } else if (it.t === 'grid') {
        for (let i = 0; i < it.n; i++) for (let j = 0; j < it.n; j++) if ((i + j + Math.floor(f.beat)) % 2 === 0) { ctx.fillStyle = rgba(it.col, 0.85); ctx.fillRect(it.x + i * it.s, it.y + j * it.s, it.s, it.s); }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  draw_ma(ctx, f) {
    const R = this.R;
    // медленное растворение через бумагу
    const fade = 0.3;
    let a = 1;
    if (f.n > 1) { if (f.local > 1 - fade / 2) a = 1 - smooth((f.local - (1 - fade / 2)) / (fade / 2)); else if (f.local < fade / 2 && f.t > f.seg) a = smooth(f.local / (fade / 2)); }
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(Math.sin(f.t * 0.15) * 4, 0);
    ctx.drawImage(this.layers[f.idx].a, R.x, R.y);
    ctx.restore();
    // энсо — круг одним движением кисти, рисуется в начале
    const p = clamp((f.t - 0.6) / 3.2);
    if (p > 0) {
      const cx = BASE.x + 92, cy = BASE.y + BASE.h - 120, rad = 62;
      const r = rng(this.seed + 3);
      for (let i = 0; i < 90 * p; i++) {
        const tt = i / 90, ang = -2.2 + tt * Math.PI * 1.85;
        const w = 9 * Math.sin(tt * Math.PI) + 2 + r() * 1.5;
        ctx.fillStyle = rgba(this.spec.page.fg, 0.75 - tt * 0.3);
        ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, w / 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // печать-ханко
    const sx = R.x + R.w - 34, sy = R.y + R.h + 26;
    ctx.fillStyle = rgba(this.spec.accent, 0.88); ctx.fillRect(sx, sy, 34, 34);
    ctx.fillStyle = rgba(this.spec.page.bg); ctx.font = '600 22px "Cormorant Garamond"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.day.title.charAt(0).toUpperCase(), sx + 17, sy + 18);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // вертикальная тонкая линия
    ctx.strokeStyle = rgba(this.spec.page.fg, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(R.x - 26, R.y + 20); ctx.lineTo(R.x - 26, R.y + R.h * 0.7 * clamp(f.t / 3)); ctx.stroke();
  }

  draw_film(ctx, f) {
    const R = this.R, L = this.layers[f.idx];
    const rot = (f.idx % 2 ? 1 : -1) * 0.018;
    ctx.save();
    ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.rotate(rot); ctx.translate(-R.w / 2, -R.h / 2);
    ctx.shadowColor = 'rgba(40,25,10,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.drawImage(L.a, 0, 0); ctx.shadowColor = 'transparent';
    // засветки
    const ins = L.inner;
    ctx.save(); ctx.beginPath(); ctx.rect(ins.x, ins.y, ins.w, ins.h); ctx.clip();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 2; i++) {
      const lx = ins.x + ins.w * (0.5 + 0.6 * Math.sin(f.t * 0.23 + i * 2.4)), ly = ins.y + ins.h * (0.3 + 0.5 * Math.cos(f.t * 0.17 + i));
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, ins.w * 0.6);
      const a = 0.22 + 0.12 * Math.sin(f.t * 0.7 + i);
      g.addColorStop(0, `rgba(255,${i ? 90 : 140},40,${a})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.fillRect(ins.x, ins.y, ins.w, ins.h);
    }
    ctx.globalCompositeOperation = 'source-over';
    // оранжевая дата камеры
    const d = this.day.date.split('-');
    ctx.font = '600 22px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,140,40,0.9)'; ctx.shadowColor = 'rgba(255,90,0,0.8)'; ctx.shadowBlur = 8;
    ctx.fillText(`'${d[0].slice(2)} ${d[1]} ${d[2]}`, ins.x + ins.w - 150, ins.y + ins.h - 22);
    ctx.restore();
    // подпись на рамке отпечатка
    ctx.font = '400 30px "Caveat"'; ctx.fillStyle = 'rgba(40,36,30,0.75)';
    ctx.fillText(`${f.idx + 1} / ${f.n}`, R.w - 80, R.h - 26);
    ctx.restore();
    // вспышка-переход
    const flash = f.n > 1 ? Math.max(0, 1 - (f.local * f.seg) / 0.35) * (f.t > f.seg ? 1 : 0) : 0;
    if (flash > 0) { ctx.fillStyle = `rgba(255,246,230,${flash * 0.7})`; ctx.fillRect(0, 0, W, H); }
    // мерцание проектора
    ctx.fillStyle = `rgba(0,0,0,${(rng(Math.floor(f.t * 12))() * 0.04).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  draw_collage(ctx, f) {
    const R = this.R, n = this.layers.length;
    // новый фрагмент каждые beatsPerPhoto/2 долей; на странице — до 4 последних
    const step = Math.max(1, this.spec.beatsPerPhoto / 2);
    const k = Math.floor(f.beat / step), frac = (f.beat / step) - k;
    const show = Math.min(4, k + 1);
    for (let j = show - 1; j >= 0; j--) {
      const pieceK = k - j, L = this.layers[((pieceK % n) + n) % n];
      const r = rng(this.seed + pieceK * 17);
      const rot = L.rot + (r() - 0.5) * 0.2, ox = L.ox + (r() - 0.5) * 80, oy = L.oy + (r() - 0.5) * 60;
      const land = j === 0 ? smooth(clamp(frac * 4)) : 1;
      const s = lerp(1.18, 1, land);
      ctx.save();
      ctx.globalAlpha *= j === 0 ? land : 1 - j * 0.08;
      ctx.translate(R.x + R.w / 2 + ox, R.y + R.h / 2 + oy); ctx.rotate(rot); ctx.scale(s, s);
      ctx.shadowColor = 'rgba(30,20,10,0.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.drawImage(L.a, -L.a.width / 2, -L.a.height / 2); ctx.shadowColor = 'transparent';
      // скотч
      ctx.fillStyle = 'rgba(236,224,190,0.75)'; ctx.rotate(-0.5); ctx.fillRect(-L.a.width * 0.42 - 30, -L.a.height * 0.2, 80, 22); ctx.restore();
    }
    // вырезки слов
    const words = this.decor;
    const visible = Math.min(words.length, Math.floor(f.beat / 2));
    for (let i = 0; i < visible; i++) {
      const wd = words[i];
      ctx.save(); ctx.translate(wd.x, wd.y); ctx.rotate(wd.rot);
      ctx.font = wd.serif ? 'italic 600 30px "Cormorant Garamond"' : '600 18px "JetBrains Mono"';
      const tw = ctx.measureText(wd.w).width;
      ctx.fillStyle = wd.inv ? rgba(this.spec.accent) : '#f6f1e6'; ctx.fillRect(-8, -26, tw + 16, 36);
      ctx.fillStyle = wd.inv ? '#fff' : '#1c1a17'; ctx.fillText(wd.w, 0, 0);
      ctx.restore();
    }
  }

  drawParticles(ctx, t) {
    const P = this.particles; if (!P) return;
    ctx.save();
    for (const p of P.list) {
      if (P.type === 'snow') {
        const y = (p.y + t * (30 + p.s * 40)) % H, x = p.x + Math.sin(t * 0.8 + p.ph) * 12;
        ctx.fillStyle = `rgba(255,255,255,${0.5 + p.s * 0.4})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + p.s * 2.5, 0, 6.28); ctx.fill();
      } else if (P.type === 'rain') {
        const y = (p.y + t * (500 + p.s * 300)) % H, x = (p.x + t * 40) % W;
        ctx.strokeStyle = `rgba(${this.spec.dark ? '200,210,230' : '90,100,120'},${0.15 + p.s * 0.2})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y - 18 - p.s * 14); ctx.stroke();
      } else if (P.type === 'leaves') {
        const y = (p.y + t * (40 + p.s * 30)) % (H + 40) - 20, x = p.x + Math.sin(t * 0.9 + p.ph) * 40;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.6 + p.s) + p.ph); ctx.fillStyle = rgba(p.c, 0.85);
        ctx.beginPath(); ctx.ellipse(0, 0, 9 + p.s * 6, 4 + p.s * 3, 0, 0, 6.28); ctx.fill(); ctx.restore();
      } else if (P.type === 'dust') {
        const y = ((p.y - t * (8 + p.s * 10)) % H + H) % H, x = p.x + Math.sin(t * 0.4 + p.ph) * 18;
        const a = 0.25 + 0.35 * Math.sin(t * 1.3 + p.ph * 3) ** 2;
        ctx.fillStyle = `rgba(255,236,190,${a})`; ctx.beginPath(); ctx.arc(x, y, 1 + p.s * 2, 0, 6.28); ctx.fill();
      } else if (P.type === 'confetti') {
        const y = (p.y + t * (60 + p.s * 50)) % H, x = p.x + Math.sin(t * 2 + p.ph) * 14;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + p.ph); ctx.fillStyle = rgba(p.c, 0.9); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
      }
    }
    ctx.restore();
  }

  drawGrain(ctx, t) {
    const g = this.spec.grain; if (g < 0.05) return;
    const tile = this.grainTiles[Math.floor(t * 12) % 4];
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = g * 0.32;
    for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(tile, x, y);
    ctx.restore();
  }

  // ---------- постоянные элементы дневника ----------
  drawFrame(ctx, t, fg, sub) {
    const sp = this.spec, d = this.day.date.split('-');
    const intro = clamp((t - 0.3) / 1.4);
    ctx.save();
    // шапка
    ctx.fillStyle = rgba(fg); ctx.font = '600 18px "JetBrains Mono"'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${+d[2]} · ${ROMAN[+d[1] - 1]} · ${d[0]}`, MARGIN, 72);
    ctx.font = '400 15px "JetBrains Mono"'; ctx.fillStyle = rgba(sub);
    ctx.fillText(new Date(this.day.date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long' }), MARGIN, 96);
    ctx.textAlign = 'right'; ctx.fillStyle = rgba(fg); ctx.font = '600 18px "JetBrains Mono"';
    ctx.fillText(`№ ${String(this.index).padStart(3, '0')}`, W - MARGIN, 72);
    // штамп настроения
    ctx.font = '400 14px "JetBrains Mono"'; const lbl = sp.label.toUpperCase();
    const lw = ctx.measureText(lbl).width + 20;
    ctx.strokeStyle = rgba(sp.accent); ctx.lineWidth = 1.5; ctx.strokeRect(W - MARGIN - lw, 82, lw, 24);
    ctx.fillStyle = rgba(sp.accent); ctx.fillText(lbl, W - MARGIN - 10, 99);
    ctx.textAlign = 'left';

    // заголовок = название папки
    const ty = sp.type;
    const ty0 = 930 + (sp.mode === 'ma' ? 10 : 0);
    ctx.globalAlpha = intro; ctx.fillStyle = rgba(fg); ctx.font = this.titleFont;
    try { ctx.letterSpacing = `${(ty.tracking * this.titleSize).toFixed(1)}px`; } catch {}
    const lh = this.titleSize * 1.02;
    this.titleLines.forEach((l, i) => ctx.fillText(l, MARGIN, ty0 + (1 - intro) * 18 + lh * i + this.titleSize * 0.8));
    try { ctx.letterSpacing = '0px'; } catch {}
    // рукописная подпись — проявляется слева направо
    const capY = ty0 + lh * this.titleLines.length + 34;
    const cp = clamp((t - 1.2) / 2.6);
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, capY - 30, MARGIN + (W - MARGIN * 2) * cp * this.capLines.length, 200); ctx.clip();
    ctx.font = '400 31px "Caveat"'; ctx.fillStyle = rgba(mix(fg, sp.accent, 0.35), 0.95);
    this.capLines.forEach((l, i) => {
      const lp = clamp(cp * this.capLines.length - i);
      ctx.save(); ctx.beginPath(); ctx.rect(MARGIN - 4, capY - 30 + i * 34, (W - MARGIN * 2 + 8) * lp, 40); ctx.clip();
      ctx.fillText(l, MARGIN, capY + i * 34); ctx.restore();
    });
    ctx.restore();

    // подвал: подпись песни
    const fy = H - 92;
    ctx.strokeStyle = rgba(fg, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(MARGIN, fy); ctx.lineTo(W - MARGIN, fy); ctx.stroke();
    const sig = this.music.signature || [];
    const bw = (W - MARGIN * 2) / sig.length, prog = clamp(t / sp.duration);
    sig.forEach((v, i) => {
      const h = 4 + v * 26; ctx.fillStyle = i / sig.length < prog ? rgba(sp.accent, 0.95) : rgba(fg, 0.28);
      ctx.fillRect(MARGIN + i * bw, fy + 14 + (30 - h) / 2, Math.max(1, bw - 2), h);
    });
    ctx.font = '400 14px "JetBrains Mono"'; ctx.fillStyle = rgba(sub);
    const song = this.day.song?.label || 'песня дня';
    const modeRu = this.music.mode === 'major' ? 'мажор' : 'минор';
    let line = `♪ ${song}`; const info = ` · ${this.music.bpm} BPM · ${modeRu}`;
    while (ctx.measureText(line + info).width > W - MARGIN * 2 && line.length > 6) line = line.slice(0, -2) + '…';
    ctx.fillText(line + info, MARGIN, H - 30);
    ctx.restore();
  }
}
