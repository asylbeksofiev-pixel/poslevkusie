// Анализ фото: доминирующие цвета (k-means), свет, контраст, насыщенность, теплота, «цветистость».
import { rgb2hsl, lum } from '../util.js';

export async function analyzePhoto(blob) {
  const bmp = await createImageBitmap(blob);
  const S = 72;
  const c = new OffscreenCanvas(S, S);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, S, S);
  const d = ctx.getImageData(0, 0, S, S).data;
  const px = [];
  let L = 0, L2 = 0, sat = 0, warm = 0, rg = 0, yb = 0, rg2 = 0, yb2 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const p = [d[i], d[i + 1], d[i + 2]];
    px.push(p);
    const l = lum(p); L += l; L2 += l * l;
    sat += rgb2hsl(p)[1];
    warm += (p[0] - p[2]) / 255;
    const a = p[0] - p[1], b = 0.5 * (p[0] + p[1]) - p[2];
    rg += a; yb += b; rg2 += a * a; yb2 += b * b;
  }
  const n = px.length;
  const mean = L / n;
  const std = Math.sqrt(Math.max(0, L2 / n - mean * mean));
  const mrg = rg / n, myb = yb / n;
  const colorfulness = Math.sqrt(Math.max(0, rg2 / n - mrg * mrg) + Math.max(0, yb2 / n - myb * myb)) + 0.3 * Math.sqrt(mrg * mrg + myb * myb);
  return {
    brightness: mean, contrast: Math.min(1, std / 0.3), saturation: sat / n,
    warmth: Math.max(-1, Math.min(1, (warm / n) * 3)), colorfulness: Math.min(1, colorfulness / 110),
    palette: kmeans(px, 5), w: bmp.width, h: bmp.height,
  };
}

function kmeans(px, k) {
  // детерминированная инициализация по яркости
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  let cent = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + 0.5) / k * sorted.length)].slice());
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 12; it++) {
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < px.length; i++) {
      let best = 0, bd = 1e9;
      for (let j = 0; j < k; j++) {
        const dr = px[i][0] - cent[j][0], dg = px[i][1] - cent[j][1], db = px[i][2] - cent[j][2];
        const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (dd < bd) { bd = dd; best = j; }
      }
      assign[i] = best;
      const s = sum[best]; s[0] += px[i][0]; s[1] += px[i][1]; s[2] += px[i][2]; s[3]++;
    }
    cent = sum.map((s, j) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cent[j]);
  }
  const counts = new Array(k).fill(0);
  assign.forEach(a => counts[a]++);
  return cent.map((c, i) => ({ rgb: c.map(Math.round), share: counts[i] / px.length }))
    .filter(c => c.share > 0).sort((a, b) => b.share - a.share);
}

export function aggregatePhotos(list) {
  const n = list.length;
  const avg = key => list.reduce((s, p) => s + p[key], 0) / n;
  // общая палитра: объединяем кластеры, взвешивая долей
  const all = list.flatMap(p => p.palette.map(c => ({ ...c, share: c.share / n })));
  const merged = [];
  for (const c of all.sort((a, b) => b.share - a.share)) {
    const near = merged.find(m => Math.hypot(m.rgb[0] - c.rgb[0], m.rgb[1] - c.rgb[1], m.rgb[2] - c.rgb[2]) < 38);
    if (near) near.share += c.share; else merged.push({ rgb: c.rgb.slice(), share: c.share });
  }
  merged.sort((a, b) => b.share - a.share);
  // самый насыщенный цвет — кандидат в акцент
  const accent = [...merged].sort((a, b) => rgb2hsl(b.rgb)[1] * Math.sqrt(b.share) - rgb2hsl(a.rgb)[1] * Math.sqrt(a.share))[0];
  return {
    count: n, brightness: avg('brightness'), contrast: avg('contrast'), saturation: avg('saturation'),
    warmth: avg('warmth'), colorfulness: avg('colorfulness'), palette: merged.slice(0, 6), accent: accent?.rgb,
  };
}
