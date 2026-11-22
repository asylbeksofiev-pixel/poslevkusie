// Музыка по описанию (для ссылок, где звук недоступен): жанр, эпоха, характер.
// Также — разбор ссылок на музыкальные сервисы во встраиваемые плееры.

// жанр → смещения настроения. warm: тёплое/акустическое звучание, cold: синтетическое
const GENRES = [
  [['джаз', 'jazz', 'свинг', 'swing', 'блюз', 'blues', 'соул', 'soul', 'боссанов', 'bossa'], { name: 'джаз / свинг', energy: .4, bpm: 105, mode: 'major', warm: .8, bright: .45, era: 1958 }],
  [['электрон', 'electro', 'техно', 'techno', 'хаус', 'house', 'edm', 'транс', 'trance', 'synth', 'синт', 'drum and bass', 'dnb', 'dubstep'], { name: 'электроника', energy: .8, bpm: 126, mode: 'minor', warm: -.7, bright: .65 }],
  [['рок', 'rock', 'панк', 'punk', 'гранж', 'grunge', 'метал', 'metal', 'альтернатив', 'alternative'], { name: 'рок', energy: .85, bpm: 132, mode: 'minor', warm: -.1, bright: .7 }],
  [['классик', 'classical', 'фортепиан', 'piano', 'пиано', 'оркестр', 'orchestra', 'неоклассик', 'саундтрек', 'soundtrack', 'ost'], { name: 'классика / фортепиано', energy: .25, bpm: 76, mode: 'minor', warm: .3, bright: .35 }],
  [['эмбиент', 'ambient', 'чилаут', 'chill', 'медитац'], { name: 'эмбиент', energy: .15, bpm: 70, mode: 'major', warm: 0, bright: .3 }],
  [['lo-fi', 'lofi', 'лоуфай', 'лофай'], { name: 'lo-fi', energy: .3, bpm: 80, mode: 'major', warm: .6, bright: .3, era: 1995 }],
  [['поп', 'pop', 'k-pop', 'кпоп', 'диско', 'disco', 'данс', 'dance'], { name: 'поп', energy: .7, bpm: 116, mode: 'major', warm: .1, bright: .7 }],
  [['инди', 'indie', 'фолк', 'folk', 'акуст', 'acoustic', 'бард', 'кантри', 'country'], { name: 'инди / фолк', energy: .4, bpm: 96, mode: 'major', warm: .7, bright: .45 }],
  [['рэп', 'rap', 'хип-хоп', 'хипхоп', 'hip-hop', 'hip hop', 'трэп', 'trap', 'дрилл', 'drill'], { name: 'хип-хоп', energy: .7, bpm: 140, mode: 'minor', warm: -.2, bright: .55 }],
  [['r&b', 'rnb', 'арэнби'], { name: 'R&B', energy: .45, bpm: 90, mode: 'minor', warm: .4, bright: .45 }],
  [['шансон', 'романс', 'эстрад', 'советск'], { name: 'эстрада', energy: .45, bpm: 100, mode: 'minor', warm: .5, bright: .45, era: 1978 }],
];

// небольшой словарь исполнителей → жанр и эпоха
const ARTISTS = {
  'sinatra': ['джаз', 1957], 'синатр': ['джаз', 1957], 'armstrong': ['джаз', 1962], 'армстронг': ['джаз', 1962], 'ella fitzgerald': ['джаз', 1958],
  'norah jones': ['джаз', 2002], 'chet baker': ['джаз', 1956], 'nat king cole': ['джаз', 1955], 'michael bubl': ['джаз', 2005],
  'daft punk': ['электрон', 2001], 'justice': ['электрон', 2007], 'aphex twin': ['электрон', 1995], 'moderat': ['электрон', 2013], 'kavinsky': ['электрон', 2010],
  'the weeknd': ['поп', 2020], 'dua lipa': ['поп', 2020], 'taylor swift': ['поп', 2019], 'billie eilish': ['поп', 2019], 'abba': ['поп', 1976], 'beatles': ['рок', 1966],
  'queen': ['рок', 1977], 'nirvana': ['рок', 1991], 'radiohead': ['альтернатив', 1997], 'arctic monkeys': ['инди', 2013], 'muse': ['рок', 2006], 'coldplay': ['поп', 2005],
  'metallica': ['метал', 1991], 'linkin park': ['рок', 2003], 'lana del rey': ['инди', 2012], 'cigarettes after sex': ['инди', 2017], 'joji': ['r&b', 2020],
  'adele': ['поп', 2011], 'kanye': ['рэп', 2010], 'kendrick': ['рэп', 2015], 'eminem': ['рэп', 2002], 'drake': ['рэп', 2016], 'travis scott': ['рэп', 2018],
  'massive attack': ['электрон', 1998], 'portishead': ['электрон', 1994], 'hans zimmer': ['саундтрек', 2014], 'einaudi': ['фортепиан', 2013], 'эйнауди': ['фортепиан', 2013],
  'chopin': ['классик', 1835], 'шопен': ['классик', 1835], 'debussy': ['классик', 1890], 'дебюсси': ['классик', 1890], 'вивальди': ['классик', 1725], 'чайковск': ['классик', 1880],
  'кино': ['рок', 1988], 'цой': ['рок', 1988], 'земфира': ['рок', 2000], 'сплин': ['рок', 2001], 'би-2': ['рок', 2000], 'ддт': ['рок', 1992], 'мумий тролль': ['рок', 1998],
  'аквариум': ['рок', 1985], 'наутилус': ['рок', 1988], 'алла пугачева': ['эстрад', 1982], 'пугачев': ['эстрад', 1982], 'скриптонит': ['рэп', 2017], 'jah khalib': ['рэп', 2018],
  'miyagi': ['рэп', 2018], 'мияги': ['рэп', 2018], 'макс корж': ['поп', 2016], 'монеточк': ['поп', 2018], 'zivert': ['поп', 2019], 'ninety one': ['поп', 2018],
  'dimash': ['поп', 2018], 'димаш': ['поп', 2018], 'кайрат нуртас': ['поп', 2015], 'ирина кайратовна': ['рэп', 2021], 'молчат дома': ['электрон', 2018],
  'бутырка': ['шансон', 2005], 'magic city': ['инди', 2018], 'pharrell': ['поп', 2014], 'bruno mars': ['поп', 2016], 'frank ocean': ['r&b', 2016],
};

export function parseSongMeta(metaText = '', hints = {}) {
  const t = metaText.toLowerCase().replace(/ё/g, 'е');
  let genre = null, artistHit = null, era = null;
  for (const a in ARTISTS) if (t.includes(a)) { artistHit = a; era = ARTISTS[a][1]; const g = ARTISTS[a][0]; genre = GENRES.find(([keys]) => keys.some(k => k.includes(g) || g.includes(k))); break; }
  for (const entry of GENRES) if (entry[0].some(k => t.includes(k))) { genre = entry; break; }
  const y = t.match(/(19[2-9]\d|20[0-3]\d)/);
  if (y) era = +y[1];
  const g = genre ? genre[1] : { name: 'не указан', energy: .5, bpm: 105, mode: null, warm: 0, bright: .5 };
  if (!era && g.era) era = g.era;
  let energy = g.energy, bpm = g.bpm, mode = g.mode;
  if (hints.energy === 'calm') { energy = Math.min(energy, .25); bpm = Math.min(bpm, 80); }
  if (hints.energy === 'mid') { energy = .5; bpm = Math.max(92, Math.min(bpm, 115)); }
  if (hints.energy === 'high') { energy = Math.max(energy, .8); bpm = Math.max(bpm, 125); }
  if (hints.mode) mode = hints.mode;
  return {
    genre: g.name, genreFound: !!genre, artistHit, era, warm: g.warm, energy, bpm,
    mode: mode || 'major', modeConfidence: mode ? (hints.mode ? .9 : .45) : .2, brightness: g.bright,
  };
}

export function musicFromMeta(meta, hints) {
  const m = parseSongMeta(meta, hints);
  // синтетическая «подпись» — по темпу и энергии
  const signature = Array.from({ length: 96 }, (_, i) => 0.35 + 0.4 * m.energy + 0.25 * Math.abs(Math.sin(i * 0.37 * (m.bpm / 100))) * (0.5 + m.energy / 2));
  return { source: 'meta', bpm: m.bpm, energy: m.energy, brightness: m.brightness, mode: m.mode, modeConfidence: m.modeConfidence, busyness: m.energy, dynamics: .3, key: null, signature, genre: m.genre, era: m.era, warm: m.warm, artistHit: m.artistHit };
}

export function embedFor(url = '') {
  try {
    const u = new URL(url.trim());
    const h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtu.be') return { kind: 'youtube', src: `https://www.youtube.com/embed/${u.pathname.slice(1)}`, height: 200 };
    if (h.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || (u.pathname.match(/\/(shorts|embed)\/([\w-]+)/) || [])[2];
      if (id) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}`, height: 200 };
    }
    if (h === 'open.spotify.com') {
      const m = u.pathname.match(/(track|album|playlist)\/([\w]+)/);
      if (m) return { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: 152 };
    }
    if (/^music\.yandex\./.test(h)) {
      const m = u.pathname.match(/album\/(\d+)\/track\/(\d+)/);
      if (m) return { kind: 'yandex', src: `https://music.yandex.ru/iframe/album/${m[1]}/track/${m[2]}`, height: 180 };
    }
    if (h === 'soundcloud.com') return { kind: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&visual=false`, height: 166 };
    if (h === 'music.apple.com') return { kind: 'apple', src: url.replace('music.apple.com', 'embed.music.apple.com'), height: 175 };
    return { kind: 'link', src: url };
  } catch { return null; }
}
