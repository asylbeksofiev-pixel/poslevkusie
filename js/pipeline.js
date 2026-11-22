// Конвейер: ввод пользователя → анализ → визуальная система → название → обложка → папка дня в архиве.
import { analyzeText } from './analyze/text.js';
import { analyzePhoto, aggregatePhotos } from './analyze/image.js';
import { analyzeAudio, clipAudio } from './analyze/audio.js';
import { musicFromMeta, parseSongMeta, embedFor } from './analyze/music-meta.js';
import { buildSpec } from './mood.js';
import { makeTitle, folderName } from './title.js';
import { Memory, W, H } from './render/engine.js';
import { db } from './db.js';

export const STEPS = ['Читаю запись', 'Смотрю на фотографии', 'Слушаю песню', 'Свожу настроение и выбираю приём', 'Придумываю название дня', 'Пишу страницу дневника'];

export async function createDay({ date, text, photos, song }, onStep = () => {}) {
  const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await onStep(0);
  const textA = analyzeText(text, date);
  await onStep(1);
  const photoList = [];
  for (const p of photos) photoList.push(await analyzePhoto(p));
  const photosA = aggregatePhotos(photoList);
  await onStep(2);
  let music;
  if (song.kind === 'file') {
    try {
      music = await analyzeAudio(song.blob);
      const meta = parseSongMeta(song.meta || '');
      music.genre = meta.genre; music.era = meta.era; music.warm = meta.genreFound ? meta.warm : 0;
      song = await keepFragment(song, music);
    } catch (e) {
      console.warn('Аудио не декодировано, используем описание', e);
      music = musicFromMeta(song.meta || '', {});
      music.decodeError = true;
    }
  } else {
    music = musicFromMeta(song.meta || '', song.hints || {});
  }
  await onStep(3);
  const spec = buildSpec({ text: textA, photos: photosA, music, date });
  await onStep(4);
  const title = makeTitle(textA, spec);
  const day = {
    id, createdAt: Date.now(), date, text, title,
    photos, song: { ...song, label: songLabel(song), embed: song.kind === 'link' ? embedFor(song.url) : null },
    analysis: { text: stripText(textA), photos: photosA, photoList, music }, spec,
  };
  day.folder = folderName(title, date);
  const all = await db.all();
  day.n = all.reduce((m, d) => Math.max(m, d.n || 0), 0) + 1;
  await onStep(5);
  day.cover = await renderCover(day);
  await db.put(day);
  return day;
}

export async function rebuildDay(day) {
  // пересобрать оформление после переименования
  day.folder = folderName(day.title, day.date);
  day.cover = await renderCover(day);
  day.video = null;
  await db.put(day);
  return day;
}

// заменить файл песни фрагментом, который звучит в воспоминании (полный трек не хранится)
async function keepFragment(song, music) {
  const clip = await clipAudio(song.blob, music.offset || 0, 45);
  music.offset = 0; music.fragment = { from: +clip.start.toFixed(1), length: +clip.length.toFixed(1) };
  const base = (song.fileName || 'песня').replace(/\.[a-z0-9]+$/i, '');
  return { ...song, blob: clip.blob, fileName: `${base} — фрагмент ${Math.round(clip.length)} с.wav` };
}

function stripText(a) { const { hitsDetailed, ...rest } = a; return rest; }

export function songLabel(song) {
  if (song.meta) return song.meta.split(',')[0].trim();
  if (song.kind === 'file') return (song.fileName || 'песня').replace(/\.[a-z0-9]+$/i, '').replace(/ — фрагмент \d+ с$/, '');
  return 'песня по ссылке';
}

export async function renderCover(day) {
  const mem = await new Memory(day, { index: day.n || 1 }).prepare();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  mem.draw(c.getContext('2d'), coverTime(day), 0);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
}

// момент для обложки: после вступления, в середине кадра (не на переходе)
export function coverTime(day) {
  const seg = day.spec.beatsPerPhoto * 60 / day.analysis.music.bpm;
  const t = Math.max(4.2, Math.min(day.spec.duration * 0.4, 6));
  return (Math.floor(t / seg) + 0.45) * seg;
}

// заменить песню дня аудиофайлом: настоящий аудиоанализ → новая визуальная система (название сохраняется)
export async function replaceSong(day, file) {
  const music = await analyzeAudio(file);
  const meta = parseSongMeta(day.song.meta || '');
  music.genre = meta.genre; music.era = meta.era; music.warm = meta.genreFound ? meta.warm : 0;
  day.song = await keepFragment({ kind: 'file', blob: file, fileName: file.name, meta: day.song.meta || file.name.replace(/\.[a-z0-9]+$/i, ''), replacedLink: day.song.url || null }, music);
  day.song.label = songLabel(day.song);
  day.analysis.music = music;
  day.spec = buildSpec({ text: day.analysis.text, photos: day.analysis.photos, music, date: day.date });
  day.video = null;
  day.cover = await renderCover(day);
  await db.put(day);
  return day;
}
