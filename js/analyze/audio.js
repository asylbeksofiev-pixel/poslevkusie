// Аудиоанализ в браузере (без внешних сервисов):
// темп (BPM) — автокорреляция огибающей атак (spectral flux),
// энергия — громкость RMS, яркость — спектральный центроид,
// лад (мажор/минор) и тональность — хромаграмма + профили Крумхансла–Шмуклера,
// «подпись песни» — огибающая громкости для постоянного элемента страницы.

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function hann(n) { const w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); return w; }

const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function corr(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return n / Math.sqrt(da * db || 1);
}

export async function decodeAudio(blob) {
  const buf = await blob.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  return await ctx.decodeAudioData(buf);
}

// Песню целиком не храним (условие кейса): оставляем только фрагмент, который звучит в воспоминании.
// Моно 32 кГц, 16 бит, до 45 с (~2,9 МБ), мягкие края 0,4 с.
export async function clipAudio(blob, offset = 0, seconds = 45) {
  const src = await decodeAudio(blob);
  const SR = 32000;
  const start = Math.max(0, Math.min(offset, Math.max(0, src.duration - seconds)));
  const len = Math.min(seconds, src.duration - start);
  const oc = new OfflineAudioContext(1, Math.ceil(len * SR), SR);
  const node = oc.createBufferSource(); node.buffer = src;
  const g = oc.createGain();
  const fade = Math.min(0.4, len / 4);
  g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(1, fade);
  g.gain.setValueAtTime(1, len - fade); g.gain.linearRampToValueAtTime(0, len);
  node.connect(g); g.connect(oc.destination);
  node.start(0, start, len);
  const out = await oc.startRendering();
  return { blob: encodeWav(out.getChannelData(0), SR), start, length: len };
}
function encodeWav(data, sr) {
  const buf = new ArrayBuffer(44 + data.length * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) { const s = Math.max(-1, Math.min(1, data[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([buf], { type: 'audio/wav' });
}

export async function analyzeAudio(blob) {
  const ab = await decodeAudio(blob);
  const sr = ab.sampleRate;
  const ch0 = ab.getChannelData(0), ch1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
  const total = ch0.length;
  // анализируем фрагмент до 45 с из середины песни
  const segLen = Math.min(total, sr * 45);
  const start = total > sr * 60 ? Math.floor(total * 0.25) : Math.max(0, Math.floor((total - segLen) / 2));
  const mono = new Float32Array(segLen);
  for (let i = 0; i < segLen; i++) mono[i] = ch1 ? (ch0[start + i] + ch1[start + i]) / 2 : ch0[start + i];

  // --- громкость ---
  let sq = 0; for (let i = 0; i < segLen; i++) sq += mono[i] * mono[i];
  const rms = Math.sqrt(sq / segLen);
  const db = 20 * Math.log10(rms + 1e-9);
  const energyLoud = Math.max(0, Math.min(1, (db + 30) / 22));

  // --- огибающая атак на 11025 Гц ---
  const dsK = Math.max(1, Math.round(sr / 11025)), dsr = sr / dsK;
  const ds = new Float32Array(Math.floor(segLen / dsK));
  for (let i = 0; i < ds.length; i++) { let s = 0; for (let k = 0; k < dsK; k++) s += mono[i * dsK + k]; ds[i] = s / dsK; }
  const N = 512, H = 128, win = hann(N), fps = dsr / H;
  const frames = Math.floor((ds.length - N) / H);
  const onset = new Float32Array(Math.max(0, frames));
  const frameRms = [];
  let prev = new Float32Array(N / 2);
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let f = 0; f < frames; f++) {
    let e = 0;
    for (let i = 0; i < N; i++) { const x = ds[f * H + i]; re[i] = x * win[i]; im[i] = 0; e += x * x; }
    frameRms.push(Math.sqrt(e / N));
    fft(re, im);
    let flux = 0;
    for (let k = 1; k < N / 2; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = m - prev[k]; if (d > 0) flux += d; prev[k] = m;
    }
    onset[f] = flux;
  }
  // нормализация и удаление тренда
  const env = Array.from(onset);
  const smoothW = Math.round(fps * 0.5);
  const local = env.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - smoothW); j < Math.min(env.length, i + smoothW); j++) { s += env[j]; c++; } return s / c; });
  const o = env.map((v, i) => Math.max(0, v - local[i]));

  // --- темп: автокорреляция ---
  let bestBpm = 100, bestScore = -1;
  const scores = [];
  for (let bpm = 55; bpm <= 200; bpm += 0.5) {
    const lag = 60 * fps / bpm;
    const l0 = Math.floor(lag), fr = lag - l0;
    let s = 0;
    for (let i = 0; i + l0 + 1 < o.length; i++) s += o[i] * (o[i + l0] * (1 - fr) + o[i + l0 + 1] * fr);
    s /= Math.max(1, o.length - l0);
    const w = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.85) ** 2);
    scores.push([bpm, s]);
    if (s * w > bestScore) { bestScore = s * w; bestBpm = bpm; }
  }
  while (bestBpm < 68) bestBpm *= 2;
  while (bestBpm > 172) bestBpm /= 2;
  const meanScore = scores.reduce((s, x) => s + x[1], 0) / scores.length;
  const tempoConfidence = Math.max(0, Math.min(1, (bestScore / (meanScore || 1) - 1) / 2));

  // плотность атак
  const thr = o.reduce((s, x) => s + x, 0) / o.length * 1.8;
  let peaks = 0;
  for (let i = 1; i < o.length - 1; i++) if (o[i] > thr && o[i] >= o[i - 1] && o[i] > o[i + 1]) peaks++;
  const onsetRate = peaks / (o.length / fps);
  const busyness = Math.max(0, Math.min(1, (onsetRate - 1) / 5));

  // динамика
  const fm = frameRms.reduce((s, x) => s + x, 0) / frameRms.length;
  const fsd = Math.sqrt(frameRms.reduce((s, x) => s + (x - fm) ** 2, 0) / frameRms.length);
  const dynamics = Math.min(1, fsd / (fm + 1e-6));

  // --- хрома и центроид на исходной частоте ---
  const NC = 8192, chroma = new Array(12).fill(0), winC = hann(NC);
  const reC = new Float32Array(NC), imC = new Float32Array(NC);
  let centSum = 0, centN = 0;
  const step = Math.floor(sr * 0.25);
  for (let p = 0; p + NC < segLen; p += step) {
    for (let i = 0; i < NC; i++) { reC[i] = mono[p + i] * winC[i]; imC[i] = 0; }
    fft(reC, imC);
    let num = 0, den = 0;
    for (let k = 1; k < NC / 2; k++) {
      const f = k * sr / NC, m = Math.hypot(reC[k], imC[k]);
      num += f * m; den += m;
      if (f >= 60 && f <= 2100) {
        const midi = 69 + 12 * Math.log2(f / 440);
        const r = Math.round(midi);
        if (Math.abs(midi - r) < 0.35) chroma[((r % 12) + 12) % 12] += Math.sqrt(m);
      }
    }
    if (den > 0) { centSum += num / den; centN++; }
  }
  const centroid = centSum / Math.max(1, centN);
  const brightness = Math.max(0, Math.min(1, (centroid - 700) / 2800));
  let best = { r: -2 };
  for (let k = 0; k < 12; k++) {
    const rot = p => p.map((_, i) => p[(i - k + 12) % 12]);
    const rM = corr(chroma, rot(MAJOR)), rm = corr(chroma, rot(MINOR));
    if (rM > best.r) best = { r: rM, key: NOTES[k], mode: 'major' };
    if (rm > best.r) best = { r: rm, key: NOTES[k], mode: 'minor' };
  }
  // уверенность лада: разница между лучшей мажорной и минорной гипотезой
  let bM = -2, bm = -2;
  for (let k = 0; k < 12; k++) {
    const rot = p => p.map((_, i) => p[(i - k + 12) % 12]);
    bM = Math.max(bM, corr(chroma, rot(MAJOR))); bm = Math.max(bm, corr(chroma, rot(MINOR)));
  }
  const modeConfidence = Math.max(0.15, Math.min(1, Math.abs(bM - bm) * 6));

  // энергия = громкость + темп + плотность
  const energy = Math.max(0, Math.min(1, energyLoud * 0.45 + busyness * 0.3 + Math.max(0, Math.min(1, (bestBpm - 70) / 90)) * 0.25));

  // подпись песни: огибающая громкости всего трека, 96 точек
  const sig = [];
  const bucket = Math.floor(total / 96);
  for (let b = 0; b < 96; b++) {
    let s = 0; const st = b * bucket;
    for (let i = 0; i < bucket; i += 64) { const x = ch0[st + i] || 0; s += x * x; }
    sig.push(Math.sqrt(s / (bucket / 64)));
  }
  const sigMax = Math.max(...sig) || 1;

  return {
    source: 'audio', duration: ab.duration, offset: start / sr, bpm: Math.round(bestBpm), tempoConfidence,
    energy, loudnessDb: Math.round(db), brightness, centroid: Math.round(centroid),
    key: best.key, mode: best.mode, modeConfidence, busyness, dynamics,
    signature: sig.map(x => x / sigMax),
  };
}
