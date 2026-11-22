// Тихие звуки интерфейса. По умолчанию выключены; включаются кнопкой «звук» в шапке.
// Синтез Web Audio: без файлов и без автозапуска — контекст создаётся только после действия пользователя.
let on = false, ac = null;
try { on = localStorage.getItem('pv-sfx') === '1'; } catch {}

export const sfxOn = () => on;
export function setSfx(v) { on = v; try { localStorage.setItem('pv-sfx', v ? '1' : '0'); } catch {} if (v) sfx('step'); }

function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(freq, t0, dur, { type = 'sine', gain = 0.06, glide = 0 } = {}) {
  const a = ctx(), o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, a.currentTime + t0 + dur);
  f.type = 'lowpass'; f.frequency.value = 2400;
  g.gain.setValueAtTime(0, a.currentTime + t0);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(f); f.connect(g); g.connect(a.destination);
  o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
}

export function sfx(kind) {
  if (!on) return;
  try {
    if (kind === 'step') tone(880, 0, 0.09, { type: 'triangle', gain: 0.035 });
    else if (kind === 'error') tone(180, 0, 0.22, { type: 'sine', gain: 0.07, glide: 0.7 });
    else if (kind === 'confirm') { tone(523.3, 0, 0.5, { gain: 0.05 }); tone(659.3, 0.08, 0.5, { gain: 0.045 }); tone(784, 0.16, 0.7, { gain: 0.04 }); }
    else if (kind === 'reveal') { [392, 493.9, 587.3, 784].forEach((f, i) => tone(f, i * 0.11, 1.4, { gain: 0.032 })); }
    else if (kind === 'open') tone(320, 0, 0.35, { type: 'triangle', gain: 0.04, glide: 1.6 });
  } catch {}
}
