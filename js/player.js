// Плеер воспоминания: музыка (Web Audio) + анимация страницы в ритм + запись видео (MediaRecorder).
import { decodeAudio } from './analyze/audio.js';

let AC = null;
const audioCtx = () => (AC ||= new (window.AudioContext || window.webkitAudioContext)());

export class Player {
  constructor(canvas, memory, day, { onTick, onEnd } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.mem = memory; this.day = day; this.onTick = onTick; this.onEnd = onEnd;
    this.duration = day.spec.duration;
    this.playing = false; this.buffer = null;
  }
  async loadAudio() {
    if (this.buffer || this.day.song?.kind !== 'file' || !this.day.song.blob) return;
    this.buffer = await decodeAudio(this.day.song.blob);
  }
  still(t) { if (t == null) { const seg = this.day.spec.beatsPerPhoto * 60 / this.day.analysis.music.bpm; const t0 = Math.max(4.2, Math.min(this.duration * 0.4, 6)); t = (Math.floor(t0 / seg) + 0.45) * seg; } this.mem.draw(this.ctx, t, 0); }

  async play({ record = false } = {}) {
    this.stop(true);
    await this.loadAudio();
    const ac = audioCtx(); await ac.resume();
    this.gain = ac.createGain(); this.gain.gain.value = 1;
    this.analyser = ac.createAnalyser(); this.analyser.fftSize = 512;
    this.gain.connect(this.analyser); this.analyser.connect(ac.destination);
    if (this.buffer) {
      this.src = ac.createBufferSource(); this.src.buffer = this.buffer;
      this.src.connect(this.gain);
      const off = this.day.analysis.music.offset || 0;
      this.src.start(0, Math.min(off, Math.max(0, this.buffer.duration - this.duration)));
      const end = ac.currentTime + this.duration;
      this.gain.gain.setValueAtTime(1, end - 1.6); this.gain.gain.linearRampToValueAtTime(0, end);
    }
    let recPromise = null;
    if (record) {
      const stream = this.canvas.captureStream(30);
      if (this.buffer) { this.dest = ac.createMediaStreamDestination(); this.gain.connect(this.dest); this.dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }
      const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
      this.rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks = [];
      this.rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      recPromise = new Promise(res => { this.rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' })); });
      this.rec.start(250);
    }
    if (!this.buffer && this.embed && this.embed.controllable) { try { this.embed.play(); } catch {} }
    this.t0 = ac.currentTime; this.playing = true;
    const data = new Uint8Array(this.analyser.fftSize);
    const loop = () => {
      if (!this.playing) return;
      const t = ac.currentTime - this.t0;
      let level = 0;
      if (this.buffer) { this.analyser.getByteTimeDomainData(data); let s = 0; for (const v of data) s += ((v - 128) / 128) ** 2; level = Math.min(1, Math.sqrt(s / data.length) * 3); }
      this.mem.draw(this.ctx, Math.min(t, this.duration), level);
      this.onTick && this.onTick(t / this.duration);
      if (t >= this.duration) { this.stop(); this.onEnd && this.onEnd(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    loop();
    return recPromise;
  }
  duck(on) { if (this.gain && this.playing) this.gain.gain.setTargetAtTime(on ? 0.3 : 1, audioCtx().currentTime, 0.3); }
  stop(silent) {
    if (this.playing && this.embed && this.embed.controllable) { try { this.embed.pause(); } catch {} }
    this.playing = false;
    cancelAnimationFrame(this.raf);
    try { this.src && this.src.stop(); } catch {}
    this.src = null;
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    this.rec = null;
    try { this.gain && this.gain.disconnect(); } catch {}
  }
}

// ---------- Озвучка: голос подбирается правилами системы ----------
const FEMALE = /irina|svetlana|ekaterina|dariya|daria|elena|anna|milena|katya|google рус|женск|female|alena|polina/i;
const MALE = /pavel|dmitry|dmitri|maxim|yuri|мужск|male|nikolai|artem/i;
export function pickVoice(pref) {
  const vs = speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang));
  if (!vs.length) return null;
  const natural = v => /natural|online|neural/i.test(v.name) ? 1 : 0;
  const g = v => pref === 'male' ? (MALE.test(v.name) ? 2 : 0) : (FEMALE.test(v.name) ? 2 : 0);
  return [...vs].sort((a, b) => (g(b) + natural(b)) - (g(a) + natural(a)))[0];
}
export function speak(day, { onStart, onEnd } = {}) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const v = day.spec.voice;
  const u = new SpeechSynthesisUtterance(day.text);
  const voice = pickVoice(v.prefer);
  if (voice) u.voice = voice;
  u.lang = 'ru-RU'; u.rate = v.rate; u.pitch = v.pitch; u.volume = 1;
  u.onstart = () => onStart && onStart(voice);
  u.onend = u.onerror = () => onEnd && onEnd();
  speechSynthesis.speak(u);
  return true;
}
if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }
