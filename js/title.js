// Название папки дня: 3–7 слов, единый тон дневника — «что + где/с кем + деталь».
// Пример: «Осенний парк и какао», «Ночь в офисе перед сдачей», «Вечер осенью с девушкой у пруда».
import { hashStr } from './util.js';

const TIME_NOUN = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' };
const TIME_G = { morning: 'n', day: 'm', evening: 'm', night: 'f' };
const SEASON_ADV = { autumn: 'осенью', winter: 'зимой', spring: 'весной', summer: 'летом' };
const SEASON_ADJ = {
  autumn: { m: 'Осенний', f: 'Осенняя', n: 'Осеннее', p: 'Осенние' },
  winter: { m: 'Зимний', f: 'Зимняя', n: 'Зимнее', p: 'Зимние' },
  spring: { m: 'Весенний', f: 'Весенняя', n: 'Весеннее', p: 'Весенние' },
  summer: { m: 'Летний', f: 'Летняя', n: 'Летнее', p: 'Летние' },
};
// настроенческие прилагательные по режиму
const MOOD_ADJ = {
  monet: { m: 'Тихий', f: 'Тихая', n: 'Тихое' },
  matisse: { m: 'Яркий', f: 'Яркая', n: 'Яркое' },
  kandinsky: { m: 'Долгий', f: 'Долгая', n: 'Долгое' },
  ma: { m: 'Серый', f: 'Серая', n: 'Серое' },
  film: { m: 'Тёплый', f: 'Тёплая', n: 'Тёплое' },
  collage: { m: 'Шумный', f: 'Шумная', n: 'Шумное' },
};

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function makeTitle(text, spec, salt = '') {
  const t = text.time, s = text.season, place = text.place, obj = text.objects.filter(o => !['листья', 'листопад', 'снег', 'дождь'].includes(o) || !place);
  const candidates = [];
  const firstObj = obj[0];

  // A: «Ночь в офисе перед сдачей»
  if (t && place && text.reason) candidates.push([TIME_NOUN[t], place.loc, text.reason]);
  // B: «Вечер осенью с девушкой у пруда»
  if (t && place && text.company) candidates.push([TIME_NOUN[t], text.seasonFromText ? SEASON_ADV[s] : '', text.company, place.loc]);
  // C: «Осенний парк и какао»
  if (place && firstObj && place.nom !== 'дом' && place.g) candidates.push([SEASON_ADJ[s][place.g], place.nom, 'и', firstObj]);
  // D: «Утро у моря с друзьями»
  if (t && place) candidates.push([TIME_NOUN[t], place.loc, text.company || (firstObj ? 'и ' + firstObj : '')]);
  // E: «Летний день с друзьями у моря»
  if (place && text.company) candidates.push([SEASON_ADJ[s][TIME_G[t || 'day']], (TIME_NOUN[t || 'day']).toLowerCase(), text.company, place.loc]);
  // F: «Дождливый вечер дома и чай»
  if (t && firstObj) candidates.push([MOOD_ADJ[spec.mode][TIME_G[t]], (TIME_NOUN[t]).toLowerCase(), place ? place.loc : '', 'и ' + firstObj]);
  if (text.reason === 'в день рождения') candidates.unshift(text.company ? ['День рождения', text.company, place ? place.loc : ''] : [MOOD_ADJ[spec.mode].m, 'день рождения', place ? place.loc : '']);
  else if (text.reason && !t) candidates.push([MOOD_ADJ[spec.mode].m, 'день', text.reason]);
  // G: запасной — «Тихий осенний вечер дома»
  const tt = t || (spec.mood.energy < -0.2 ? 'evening' : 'day');
  candidates.push([MOOD_ADJ[spec.mode][TIME_G[tt]], SEASON_ADJ[s][TIME_G[tt]].toLowerCase(), TIME_NOUN[tt].toLowerCase(), place ? place.loc : (text.company || '')]);

  const clean = c => c.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  let options = candidates.map(clean).filter(x => { const n = x.split(' ').length; return n >= 3 && n <= 7; });
  if (!options.length) options = [clean(candidates[candidates.length - 1])];
  // детерминированно: первое подходящее; при salt — следующее (кнопка «другое название»)
  const idx = salt ? hashStr(salt) % options.length : 0;
  return cap(options[idx]);
}

export function folderName(title, date) {
  return `${date} — ${title}`.replace(/[\\/:*?"<>|]/g, '').trim();
}
