// ВИЗУАЛЬНАЯ СИСТЕМА «Послевкусие»
// Правила, по которым текст + фото + музыка превращаются в форму воспоминания.
// Каждое решение записывается в explain[] — система может объяснить, почему день выглядит именно так.
import { clamp, pos, rgb2hsl, hsl2rgb, hueToward, hex, lum } from './util.js';

// Художественные режимы (приёмы) и их смысл
export const MODES = {
  monet: {
    name: 'Импрессионизм', label: 'тихое тепло', ref: 'Клод Моне, импрессионисты',
    why: 'Мазки и рассеянный свет растворяют контуры — так мы помним спокойные тёплые моменты: не детали, а ощущение света.',
    technique: 'фото переписывается тысячами мазков, направленных по форме; мягкий свет, медленные наплывы',
  },
  matisse: {
    name: 'Фовизм и вырезки', label: 'яркая радость', ref: 'Анри Матисс (вырезки), фовисты, ризография',
    why: 'Плоские чистые цвета и пляшущие формы-вырезки передают лёгкость и энергию радостного дня.',
    technique: 'постеризация в 5 насыщенных цветов, растр ризографа, формы-вырезки прыгают в такт',
  },
  kandinsky: {
    name: 'Конструктивизм', label: 'собранное напряжение', ref: 'Василий Кандинский, Баухаус, русский конструктивизм',
    why: 'Жёсткая сетка, линии и геометрия передают концентрацию, ритм и внутреннее напряжение.',
    technique: 'дуотон, нарезка фото по сетке, геометрическая композиция из линий и кругов, резкие склейки на сильную долю',
  },
  ma: {
    name: 'Японский минимализм', label: 'светлая грусть', ref: 'принцип «ма» (пустота), суми-э, японская графика',
    why: 'Пустота вокруг маленького изображения — это тишина. Приглушённые цвета и медленность дают место для грусти и размышления.',
    technique: 'маленькое приглушённое фото в большом поле воздуха, туманные края, печать-ханко, очень медленный ритм',
  },
  film: {
    name: 'Плёночная фотография', label: 'ностальгия', ref: 'любительская плёнка 70–90-х, полароид',
    why: 'Зерно, выцветшие цвета и засветки — визуальный язык памяти: так выглядят фото из семейного альбома.',
    technique: 'кривая выцветшей плёнки, сильное зерно, засветки, рамка отпечатка, оранжевая дата в углу кадра',
  },
  collage: {
    name: 'Коллаж', label: 'шумное вместе', ref: 'дадаистский фотомонтаж, Ханна Хёх, Александр Родченко',
    why: 'Когда день полон людей и событий, он запоминается фрагментами — рваными кусками, наложенными друг на друга.',
    technique: 'рваные фрагменты фото с поворотом, скотч, вырезки слов из записи, новые кусочки появляются в такт',
  },
};

const SEASON_RU = { autumn: 'осень', winter: 'зима', spring: 'весна', summer: 'лето' };

export function buildSpec({ text, photos, music, date }) {
  const explain = [];
  const say = (ico, html) => explain.push({ ico, html });

  // ---------- 1. Музыкальные оси ----------
  const majorK = music.mode === 'major' ? 1 : -1;
  const musicV = majorK * 0.45 * music.modeConfidence + (music.brightness - 0.5) * 0.5;
  const tempoN = clamp((music.bpm - 100) / 50, -1, 1);
  const musicE = clamp(tempoN * 0.45 + (music.energy - 0.5) * 1.3 + (music.busyness - 0.5) * 0.4, -1, 1);
  const era = music.era || null;
  const musicWarm = (music.warm ?? 0) * 0.6 + (0.5 - music.brightness) * 0.6 + (music.mode === 'major' ? 0.1 : -0.1);

  // ---------- 2. Фото-оси ----------
  const photoV = (photos.brightness - 0.48) * 1.2 + (photos.saturation - 0.35) * 0.8;
  const photoE = (photos.contrast - 0.5) * 0.8 + (photos.colorfulness - 0.35) * 1.0;

  // ---------- 3. Сведение в вектор настроения ----------
  const M = {
    valence: clamp(text.valence * 0.55 + musicV * 0.3 + photoV * 0.15, -1, 1),
    energy: clamp(text.arousal * 0.45 + musicE * 0.4 + photoE * 0.15, -1, 1),
    tension: clamp(text.tension * 0.65 + pos(-musicV) * pos(musicE) * 0.5 + pos(-photos.warmth) * pos(0.4 - photos.brightness) * 1.2, 0, 1),
    warmth: clamp(text.warmth * 0.45 + photos.warmth * 0.35 + musicWarm * 0.2, -1, 1),
    nostalgia: clamp(text.nostalgia * 0.65 + (era && era < 2000 ? (2000 - era) / 45 : 0) * 0.45 + pos(0.3 - photos.saturation) * 0.4, 0, 1),
    social: clamp(text.social, 0, 1),
  };

  // ---------- 4. Выбор художественного режима ----------
  const nature = text.place && ['парк', 'пруд', 'озеро', 'река', 'море', 'лес', 'горы', 'набережная', 'дача', 'деревня', 'степь', 'пляж'].includes(text.place.nom);
  const scores = {
    monet: pos(M.valence + 0.15) * 0.9 + pos(-M.energy + 0.2) * 0.8 + pos(M.warmth) * 0.6 + (nature ? 0.3 : 0) - M.tension * 0.8,
    matisse: pos(M.valence) * 1.1 + pos(M.energy) * 1.0 + photos.colorfulness * 0.4 - M.tension * 0.6 - M.nostalgia * 0.3 - M.social * 0.35,
    kandinsky: M.tension * 1.5 + pos(M.energy) * 0.5 + pos(-M.warmth) * 0.4 - pos(M.valence) * 0.3,
    ma: pos(-M.valence + 0.1) * 1.0 + pos(-M.energy) * 0.9 - M.social * 0.4 - M.tension * 0.3 + (text.weather.includes('rain') || text.weather.includes('fog') ? 0.25 : 0),
    film: M.nostalgia * 1.6 + pos(M.warmth) * 0.15,
    collage: M.social * 1.1 * pos(M.energy + 0.2) + (photos.count >= 3 ? 0.15 : 0) + (photos.count >= 4 ? 0.3 : 0) + pos(M.energy) * 0.3 - M.tension * 0.5 - pos(-M.valence) * 0.5,
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const mode = ranked[0][0], second = ranked[1][0];
  const blend = clamp(ranked[1][1] / (ranked[0][1] + 1e-6), 0, 1) * 0.5; // доля вторичного приёма в акцентах

  // ---------- 5. Палитра ----------
  // база — цвета самих фото; затем сдвиг по настроению
  const warmTarget = 32, coolTarget = 215;
  const hueShift = Math.abs(M.warmth) * 0.32;
  const satK = clamp(0.75 + M.valence * 0.25 + M.energy * 0.25 - M.nostalgia * 0.25 - (music.mode === 'minor' ? 0.12 : 0), 0.35, 1.35);
  const lightShift = M.valence * 0.06 + (mode === 'ma' ? 0.08 : 0);
  const transform = rgb => {
    let [h, s, l] = rgb2hsl(rgb);
    h = hueToward(h, M.warmth >= 0 ? warmTarget : coolTarget, s < 0.08 ? 0.6 : hueShift);
    if (s < 0.08) s = 0.08 + Math.abs(M.warmth) * 0.1;
    s = clamp(s * satK, 0, 0.92);
    l = clamp(l + lightShift, 0.06, 0.94);
    return hsl2rgb([h, s, l]);
  };
  let pal = photos.palette.map(c => transform(c.rgb));
  while (pal.length < 5) pal.push(transform(pal[pal.length - 1].map(v => Math.min(255, v + 40))));
  pal = pal.slice(0, 6);
  const byL = [...pal].sort((a, b) => lum(a) - lum(b));
  let accent = transform(photos.accent || pal[0]);
  if (mode === 'kandinsky') accent = hsl2rgb([M.warmth > 0.3 ? 12 : 4, 0.75, 0.5]); // красный акцент Кандинского
  if (mode === 'ma') accent = [176, 42, 32]; // киноварь печати-ханко
  const accHsl = rgb2hsl(accent);
  if (accHsl[1] < 0.35 && mode !== 'ma') accent = hsl2rgb([accHsl[0], 0.55, clamp(accHsl[2], 0.35, 0.6)]);
  // акцент должен читаться на бумаге: светлота 0.32–0.5
  { const [h2, s2, l2] = rgb2hsl(accent); accent = hsl2rgb([h2, Math.max(s2, 0.45), clamp(l2, 0.32, 0.5)]); }

  // бумага — постоянный элемент, слегка тонированный днём (5–8%)
  const paperBase = M.warmth >= 0 ? [244, 238, 226] : [236, 238, 240];
  const paper = paperBase.map((v, i) => Math.round(v * 0.93 + byL[byL.length - 1][i] * 0.07));
  const ink = [28, 26, 23];
  const dark = mode === 'kandinsky' && M.energy > 0.1 && (text.time === 'night' || photos.brightness < 0.35);
  const page = dark ? { bg: [24, 28, 38], fg: [232, 234, 238], sub: [140, 150, 168] } : { bg: paper, fg: ink, sub: [120, 112, 100] };

  // ---------- 6. Ритм и движение (музыка → время) ----------
  const beatsPerPhoto = M.energy > 0.45 ? 2 : M.energy > 0.1 ? 4 : M.energy > -0.35 ? 8 : 16;
  const transition = mode === 'kandinsky' ? 'cut' : mode === 'matisse' ? 'wipe' : mode === 'collage' ? 'stack' : mode === 'film' ? 'flicker' : 'dissolve';
  const motion = clamp(0.25 + pos(M.energy) * 0.9 + music.dynamics * 0.3, 0.15, 1);
  const air = clamp(0.25 + pos(-M.energy) * 0.45 + (music.mode === 'minor' && music.bpm < 90 ? 0.15 : 0) + (mode === 'ma' ? 0.35 : 0), 0, 1);
  const grain = clamp(0.12 + M.nostalgia * 0.55 + (era && era < 1995 ? 0.15 : 0) + (mode === 'film' ? 0.25 : 0), 0, 0.85);
  const secondsPerPhoto = beatsPerPhoto * 60 / music.bpm;
  const duration = clamp(Math.max(15, photos.count * secondsPerPhoto * (photos.count < 3 ? 2 : 1)), 15, 45);

  // ---------- 7. Типографика (шрифты постоянны, меняется характер) ----------
  const type = {
    titleWeight: M.tension > 0.5 ? 700 : M.energy > 0.3 ? 600 : 500,
    titleItalic: mode === 'monet' || mode === 'film' || (mode === 'ma' && M.valence < 0),
    titleUpper: mode === 'kandinsky',
    tracking: mode === 'kandinsky' ? 0.08 : mode === 'ma' ? 0.04 : 0,
    titleSize: mode === 'ma' ? 50 : mode === 'kandinsky' ? 52 : 62,
  };

  // ---------- 8. Частицы погоды из текста ----------
  const particles = text.weather.includes('snow') || (text.season === 'winter' && !text.weather.length && M.warmth < 0.2 && text.seasonFromText) ? 'snow'
    : text.weather.includes('rain') ? 'rain'
    : text.weather.includes('leaves') ? 'leaves'
    : (mode === 'monet' && text.weather.includes('sun')) || mode === 'monet' ? 'dust'
    : mode === 'matisse' ? 'confetti' : null;

  // ---------- 9. Голос озвучки ----------
  const voice = M.tension > 0.5 ? { profile: 'собранный, ровный, чуть ниже обычного', rate: 1.08, pitch: 0.85, prefer: 'male' }
    : M.energy > 0.35 && M.valence > 0 ? { profile: 'живой и быстрый', rate: 1.18, pitch: 1.12, prefer: 'female' }
    : M.valence < -0.1 ? { profile: 'тихий, медленный, с паузами', rate: 0.82, pitch: 0.9, prefer: 'female' }
    : M.nostalgia > 0.45 ? { profile: 'мягкий рассказчик, неспешно', rate: 0.9, pitch: 0.95, prefer: 'male' }
    : { profile: 'тихий и тёплый', rate: 0.88, pitch: 1.0, prefer: 'female' };

  // ---------- 10. Объяснение ----------
  const fmt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  const hits = [...new Set(text.hits)].slice(0, 6).map(w => `«${w}»`).join(', ');
  if (hits) say('Т', `<b>Текст:</b> слова ${hits} → приятность ${fmt(text.valence)}, энергия ${fmt(text.arousal)}${text.tension > 0.25 ? `, напряжение ${text.tension.toFixed(2)}` : ''}${Math.abs(text.warmth) > 0.2 ? `, ${text.warmth > 0 ? 'тепло и уют' : 'холод'} ${fmt(text.warmth)}` : ''}.`);
  if (music.source === 'audio') say('♪', `<b>Песня:</b> ${music.bpm} BPM, ${music.mode === 'major' ? 'мажор' : 'минор'}${music.key ? ` (${music.key})` : ''}, энергия ${music.energy.toFixed(2)}, яркость звука ${music.brightness.toFixed(2)} → ${music.mode === 'minor' ? 'цвета приглушены на 12%' : 'цвета звучат в полную силу'}, ${beatsPerPhoto} ${beatsPerPhoto < 5 ? 'доли' : 'долей'} на кадр.`);
  else say('♪', `<b>Песня (по описанию):</b> жанр — ${music.genre}${era ? `, ${era} г.` : ''}, ~${music.bpm} BPM, ${music.mode === 'major' ? 'светлая' : 'тёмная'} → ${beatsPerPhoto} ${beatsPerPhoto < 5 ? 'доли' : 'долей'} на кадр${era && era < 1995 ? ', плёночное зерно эпохи' : ''}.`);
  say('◐', `<b>Фото:</b> ${photos.count} шт., свет ${photos.brightness.toFixed(2)}, ${photos.warmth > 0.1 ? 'тёплый' : photos.warmth < -0.1 ? 'холодный' : 'нейтральный'} баланс, насыщенность ${photos.saturation.toFixed(2)} → палитра взята из самих снимков и сдвинута ${M.warmth >= 0 ? 'к охре' : 'к синему'}.`);
  say('∑', `<b>Настроение дня:</b> приятность ${fmt(M.valence)}, энергия ${fmt(M.energy)}, напряжение ${M.tension.toFixed(2)}, тепло ${fmt(M.warmth)}, ностальгия ${M.nostalgia.toFixed(2)}, люди рядом ${M.social.toFixed(2)}.`);
  say('✦', `<b>Приём: ${MODES[mode].name}</b> (${MODES[mode].ref}). ${MODES[mode].why}${blend > 0.3 ? ` Акценты — от приёма «${MODES[second].name}».` : ''}`);
  say('⟷', `<b>Ритм:</b> ${transition === 'cut' ? 'резкие склейки в сильную долю' : transition === 'dissolve' ? 'медленные наплывы' : transition === 'wipe' ? 'цветные шторки в такт' : transition === 'stack' ? 'новые фрагменты коллажа в такт' : 'плёночные вспышки между кадрами'}, воздух вокруг фото ${Math.round(air * 100)}%, зерно ${Math.round(grain * 100)}%.`);
  if (particles && ['snow', 'rain', 'leaves'].includes(particles)) say('❄', `<b>Погода из записи:</b> ${particles === 'snow' ? 'снег' : particles === 'rain' ? 'дождь' : 'падающие листья'} в кадре — потому что о ${particles === 'snow' ? 'снеге' : particles === 'rain' ? 'дожде' : 'листьях'} сказано в тексте.`);
  say('🎙', `<b>Голос:</b> ${voice.profile} — по правилу ${M.tension > 0.5 ? '«напряжение → ровный низкий голос»' : M.energy > 0.35 && M.valence > 0 ? '«радость и энергия → быстрый живой голос»' : M.valence < -0.1 ? '«грусть → медленно и тихо»' : M.nostalgia > 0.45 ? '«ностальгия → рассказчик»' : '«покой и тепло → тихий тёплый голос»'}.`);

  return {
    version: 1, mood: M, mode, second, blend, scores,
    label: MODES[mode].label,
    palette: pal.map(hex), paletteRgb: pal, accent, page, dark,
    beatsPerPhoto, transition, motion, air, grain, duration, type, particles, voice,
    season: text.season, seasonRu: SEASON_RU[text.season], explain,
  };
}
