// Приложение «Послевкусие»: маршруты, лендинг, архив, запись дня, страница дня, экспорт папки дня.
import { db } from './db.js';
import { createDay, rebuildDay, replaceSong, STEPS } from './pipeline.js';
import { Memory, loadFonts } from './render/engine.js';
import { Player, speak, pickVoice } from './player.js';
import { mountEmbed, parseSongUrl } from './embeds.js';
import { MODES } from './mood.js';
import { DEMO_DAYS, buildDemoInputs } from './demo.js';
import { resizeImageBlob, fmtDate, weekday } from './util.js';
import { renderSystemDoc } from './system-doc.js';
import { Hero3D, webglOK } from './hero3d.js';
import { ConfirmExperience } from './confirm3d.js';
import { initMotion, enterHome, leaveHome, scrollTop, onScroll, tilt, refreshScroll } from './motion.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const urls = new Map();
const urlFor = blob => { if (!blob) return ''; if (!urls.has(blob)) urls.set(blob, URL.createObjectURL(blob)); return urls.get(blob); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg, ms = 3200) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), ms); }

// ---------------- маршрутизация ----------------
let player = null;
function show(id) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $('#view-' + id).classList.remove('hidden');
  const nav = { home: '', archive: 'diary', new: 'new', system: 'system', day: 'diary' }[id];
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
  scrollTop();
  if (id !== 'home') leaveHome();
  if (hero) (id === 'home' ? hero.start() : hero.stop());
}
async function route() {
  if (player) { player.stop(); player = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const h = location.hash.replace(/^#/, '') || '/';
  const [, a, b] = h.split('/');
  if (!a) { show('home'); const all = await renderHome(); const wd = all.find(d => d.spec.mode === 'kandinsky') || all[0]; enterHome(wd && { sig: wd.analysis.music.signature, bpm: wd.analysis.music.bpm, title: wd.title }); }
  else if (a === 'diary') { show('archive'); renderArchive(); }
  else if (a === 'new') { show('new'); resetForm(); }
  else if (a === 'system') { show('system'); $('#system-doc').innerHTML = renderSystemDoc(); }
  else if (a === 'day' && b) { show('day'); renderDay(b); }
  else { location.hash = '#/'; }
}
window.addEventListener('hashchange', route);

// ---------------- демо-дневник ----------------
let demoBuilding = null;
async function ensureDemo(force = false) {
  const all = await db.all();
  if (all.length && !force) return;
  if (demoBuilding) return demoBuilding;
  demoBuilding = (async () => {
    const st = $('#demo-status');
    for (let i = 0; i < DEMO_DAYS.length; i++) {
      const msg = `Собираю демо-дневник: день ${i + 1} из ${DEMO_DAYS.length}…`;
      if (st) st.textContent = msg;
      const ab = $('#archive-count'); if (ab && !$('#view-archive').classList.contains('hidden')) ab.textContent = msg;
      const inputs = await buildDemoInputs(DEMO_DAYS[i], i);
      await createDay(inputs);
      if (!$('#view-home').classList.contains('hidden')) renderHome(true);
      if (!$('#view-archive').classList.contains('hidden')) renderArchive(true);
    }
    if (st) st.textContent = 'наведите на день — нажмите, чтобы открыть';
    try { localStorage.setItem('pv-demo', '1'); } catch {}
    demoBuilding = null;
    if (!$('#view-home').classList.contains('hidden') && window.scrollY < innerHeight * 0.5) route();
  })();
  return demoBuilding;
}

// ---------------- лендинг ----------------
let hero = null, heroDaysKey = '';
function ensureHero() {
  if (hero || !webglOK()) { if (!webglOK()) $('.hero').classList.add('no-gl'); return; }
  try {
    const tip = $('#hero-tip');
    hero = new Hero3D($('#hero-gl'), {
      onOpen: d => { location.hash = '#/day/' + d.id; },
      onHover: (d, x, y) => {
        if (!d) { tip.classList.remove('on'); return; }
        tip.textContent = `${d.title} · ${fmtDate(d.date)}`;
        tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
      },
    });
    onScroll(y => { if (hero) hero.scroll = Math.min(1, y / innerHeight); });
    window.__hero = hero;
  } catch (e) { console.warn('WebGL недоступен', e); $('.hero').classList.add('no-gl'); hero = null; }
}
async function renderHome(fromDemo) {
  const all = await db.all();
  ensureHero();
  const key = all.map(d => d.id + (d.cover ? d.cover.size : 0)).join();
  if (hero && key !== heroDaysKey) { heroDaysKey = key; hero.setDays(all, urlFor); }
  if (!hero) $('#hero-visual').innerHTML = all.slice(-3).map(d => `<a href="#/day/${d.id}"><img src="${urlFor(d.cover)}" alt="${esc(d.title)}"></a>`).join('');
  $('#hero-count').textContent = all.length ? `в дневнике ${all.length} ${plural(all.length, ['день', 'дня', 'дней'])}` : 'дневник · 2026';
  const byMode = {}; all.forEach(d => { byMode[d.spec.mode] ||= d; });
  $('#home-modes').innerHTML = Object.entries(MODES).map(([k, m], i) => {
    const d = byMode[k];
    return `<${d ? `a href="#/day/${d.id}"` : 'div'} class="mode-card"><div class="mc-img ${d ? '' : 'skeleton'}" style="${d ? `background-image:url(${urlFor(d.cover)})` : ''}"></div><div class="mc-num"><span>0${i + 1} / ${m.label}</span><span>${d ? 'открыть →' : ''}</span></div><h4>${m.name}</h4><p>${m.why}</p></${d ? 'a' : 'div'}>`;
  }).join('');
  if (fromDemo) refreshScroll();
  if (!all.length && !fromDemo) {
    let seen = false; try { seen = localStorage.getItem('pv-demo') === 'cleared'; } catch {}
    if (!seen) ensureDemo();
  }
  return all;
}

// ---------------- архив ----------------
let moodFilter = null;
async function renderArchive() {
  const all = (await db.all()).reverse();
  const q = $('#search').value.trim().toLowerCase();
  const list = all.filter(d => (!moodFilter || d.spec.mode === moodFilter) && (!q || (d.title + ' ' + d.text + ' ' + d.spec.label + ' ' + (d.song?.label || '')).toLowerCase().replace(/ё/g, 'е').includes(q.replace(/ё/g, 'е'))));
  if (!demoBuilding) $('#archive-count').textContent = all.length ? `${all.length} ${plural(all.length, ['день', 'дня', 'дней'])} · ${list.length !== all.length ? `найдено ${list.length}` : 'листайте ленту — каждый день узнаваемо свой'}` : '';
  const modesUsed = [...new Set(all.map(d => d.spec.mode))];
  $('#mood-filter').innerHTML = modesUsed.length > 1 ? [`<button class="chip ${!moodFilter ? 'active' : ''}" data-m="">все</button>`, ...modesUsed.map(m => `<button class="chip ${moodFilter === m ? 'active' : ''}" data-m="${m}">${MODES[m].label}</button>`)].join('') : '';
  $('#archive-grid').innerHTML = list.map(d => `
    <a class="card" href="#/day/${d.id}">
      <div class="cover"><img loading="lazy" src="${urlFor(d.cover)}" alt="${esc(d.title)}"></div>
      <div class="meta"><div class="d frame">кадр ${String(d.n || 0).padStart(3, '0')} ▸ ${d.spec.label}</div><div class="t">${esc(d.title)}</div><div class="d">${fmtDate(d.date)}</div></div>
    </a>`).join('') + (demoBuilding ? `<div class="card"><div class="cover skeleton"></div><div class="meta"><div class="t muted">собираю…</div></div></div>` : '');
  $('#archive-empty').classList.toggle('hidden', all.length > 0 || !!demoBuilding);
  tilt($('#archive-grid'));
  if (all.length && !list.length) $('#archive-grid').innerHTML = `<div class="empty" style="grid-column:1/-1"><p class="hand">Такого дня не нашлось</p><p class="muted">Попробуйте другое слово — поиск идёт по названию, тексту записи и песне.</p></div>`;
}
const rgbHex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const plural = (n, f) => f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];
$('#search').addEventListener('input', () => renderArchive());
$('#mood-filter').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; moodFilter = b.dataset.m || null; renderArchive(); });
$('#btn-demo').addEventListener('click', async () => { $('#btn-demo').disabled = true; await ensureDemo(true); $('#btn-demo').disabled = false; renderArchive(); });

// ---------------- новый день ----------------
let formPhotos = [], formAudio = null, songTab = 'file';
function resetForm() {
  $('#new-form').classList.remove('hidden'); $('#progress').classList.add('hidden');
  if (!$('#f-date').value) $('#f-date').value = new Date().toISOString().slice(0, 10);
  $$('.err').forEach(e => e.remove()); $$('.field.invalid').forEach(f => f.classList.remove('invalid'));
}
function renderThumbs() {
  $('#photo-thumbs').innerHTML = formPhotos.map((p, i) => `<div class="th"><img src="${urlFor(p)}" alt=""><button type="button" data-i="${i}" aria-label="Убрать фото">×</button></div>`).join('');
}
async function addPhotos(files) {
  const imgs = [...files].filter(f => f.type.startsWith('image/'));
  for (const f of imgs) { if (formPhotos.length >= 8) { toast('Не больше 8 фото на день'); break; } try { formPhotos.push(await resizeImageBlob(f)); } catch { toast(`Не удалось открыть ${f.name}`); } }
  renderThumbs();
}
$('#f-photos').addEventListener('change', e => { addPhotos(e.target.files); e.target.value = ''; });
$('#photo-thumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; formPhotos.splice(+b.dataset.i, 1); renderThumbs(); });
const drop = $('#photo-drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addPhotos(e.dataTransfer.files));
$('#f-audio').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 40 * 1024 * 1024) { toast('Файл больше 40 МБ — выберите покороче'); return; }
  formAudio = f; $('#audio-name').textContent = `♪ ${f.name} — будет проанализирован при сохранении`;
  if (!$('#f-songmeta').value) $('#f-songmeta').value = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ');
});
$('#f-link').addEventListener('input', () => {
  const v = $('#f-link').value.trim(); const box = $('#link-info'); if (!box) return;
  if (!v) { box.textContent = ''; return; }
  const info = parseSongUrl(v);
  box.textContent = !info ? 'Это не похоже на ссылку.' : info.controllable ? `${info.label}: песня будет играть вместе с воспоминанием.` : info.kind === 'link' ? 'Сервис не распознан: при просмотре будет кнопка «Открыть песню».' : `${info.label}: плеер встроится, но включать песню нужно кнопкой ▶ в нём.`;
});
$('#song-tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; songTab = b.dataset.tab;
  $$('#song-tabs button').forEach(x => x.classList.toggle('active', x === b));
  $$('.tab-body').forEach(x => x.classList.toggle('hidden', x.dataset.body !== songTab));
});
function fieldErr(el, msg) { const f = el.closest('.field') || el.parentElement; f.classList.add('invalid'); const p = document.createElement('p'); p.className = 'err'; p.textContent = msg; f.appendChild(p); }
$('#new-form').addEventListener('submit', async e => {
  e.preventDefault();
  $$('.err').forEach(x => x.remove()); $$('.field.invalid').forEach(f => f.classList.remove('invalid'));
  const text = $('#f-text').value.trim(), date = $('#f-date').value;
  let ok = true;
  if (!date) { fieldErr($('#f-date'), 'Укажите дату'); ok = false; }
  if (text.length < 20) { fieldErr($('#f-text'), 'Напишите хотя бы пару предложений — из них система поймёт настроение дня'); ok = false; }
  if (!formPhotos.length) { fieldErr($('#photo-drop'), 'Добавьте хотя бы одну фотографию дня'); ok = false; }
  let song;
  const meta = $('#f-songmeta').value.trim();
  if (songTab === 'file') {
    if (!formAudio) { fieldErr($('#song-tabs'), 'Выберите аудиофайл песни или переключитесь на ссылку'); ok = false; }
    else song = { kind: 'file', blob: formAudio, fileName: formAudio.name, meta };
  } else {
    const url = $('#f-link').value.trim();
    let valid = false; try { valid = /^https?:/.test(new URL(url).protocol); } catch {}
    if (!valid) { fieldErr($('#f-link'), 'Вставьте ссылку на песню (https://…)'); ok = false; }
    else if (!meta) { fieldErr($('#f-songmeta'), 'Для ссылки опишите песню: исполнитель — название, жанр, год'); ok = false; }
    else song = { kind: 'link', url, meta, hints: { energy: $('#f-energy').value, mode: $('#f-mode').value } };
  }
  if (!ok) { $('.field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

  // проявка дня: загрузка по настоящим шагам конвейера → открытка → отпечаток дня → итог
  const exp = new ConfirmExperience({ steps: STEPS });
  exp.open();
  $('#btn-create').disabled = true;
  try {
    const day = await createDay({ date, text, photos: formPhotos, song }, i => exp.step(i));
    formPhotos = []; formAudio = null; renderThumbs(); $('#new-form').reset(); $('#audio-name').textContent = 'Выбрать mp3 / wav / m4a';
    const act = await exp.reveal(day);
    openDay(day.id, act === 'play');
  } catch (err) {
    console.error(err);
    exp.fail();
    toast('Не получилось собрать день: ' + (err.message || err), 6000);
  } finally { $('#btn-create').disabled = false; }
});
// открыть день; autoplay — воспроизвести сразу (клик пользователя ещё «тёплый», браузер разрешит звук)
let autoplayDay = null;
function openDay(id, autoplay) { autoplayDay = autoplay ? id : null; location.hash = '#/day/' + id; }
// показать проявку уже сохранённого дня (для демонстрации): __replayConfirm() — последний день
window.__replayConfirm = async id => {
  const all = await db.all(); const day = id ? await db.get(id) : all[all.length - 1]; if (!day) return;
  const exp = new ConfirmExperience({ steps: STEPS }); exp.open();
  for (let i = 0; i < STEPS.length; i++) { exp.step(i); await new Promise(r => setTimeout(r, 420)); }
  openDay(day.id, (await exp.reveal(day)) === 'play');
};

// ---------------- страница дня ----------------
async function renderDay(id) {
  const day = await db.get(id);
  if (!day) { toast('Такого дня нет в архиве'); location.hash = '#/diary'; return; }
  const all = await db.all();
  const i = all.findIndex(d => d.id === id);
  const sp = day.spec;
  $('#d-date').textContent = `${fmtDate(day.date)} · ${weekday(day.date)} · № ${String(day.n || i + 1).padStart(3, '0')}`;
  $('#d-title').textContent = day.title;
  $('#d-folder').textContent = day.folder;
  const m = day.analysis.music;
  $('#d-stamps').innerHTML = [sp.label, MODES[sp.mode].name, `${m.bpm} BPM`, m.mode === 'major' ? 'мажор' : 'минор', sp.seasonRu].map(s => `<span class="stamp">${esc(s)}</span>`).join('');
  $('#d-text').textContent = day.text;
  $('#d-photos').innerHTML = day.photos.map(p => `<img src="${urlFor(p)}" alt="">`).join('');
  $('#d-explain').innerHTML = sp.explain.map(e => `<li><span class="ico">${e.ico}</span><span>${e.html}</span></li>`).join('');
  $('#d-palette').innerHTML = sp.palette.map(c => `<div style="background:${c}"><span>${c}</span></div>`).join('');
  $('#stage-glow').style.background = `radial-gradient(circle, ${sp.palette[0]}, ${rgbHex(sp.accent)} 60%, transparent 75%)`;
  const v = pickVoice(sp.voice.prefer);
  $('#d-voice').textContent = `${sp.voice.profile} · скорость ${sp.voice.rate}, высота ${sp.voice.pitch}${v ? ` · голос: ${v.name}` : ''}`;
  $('#d-prev').style.visibility = i > 0 ? 'visible' : 'hidden'; if (i > 0) $('#d-prev').href = '#/day/' + all[i - 1].id;
  $('#d-next').style.visibility = i < all.length - 1 ? 'visible' : 'hidden'; if (i < all.length - 1) $('#d-next').href = '#/day/' + all[i + 1].id;
  $('#rec-status').textContent = '';
  // встроенный плеер для ссылок — управляется вместе с воспоминанием
  const ew = $('#embed-wrap');
  let embedCtrl = null;
  const sr = $('#song-replace');
  sr.classList.toggle('hidden', day.song.kind !== 'link');
  sr.classList.remove('urgent');
  if (day.song.kind === 'link' && day.song.url) { ew.classList.remove('hidden'); embedCtrl = await mountEmbed(ew, day.song.url, () => sr.classList.add('urgent')); }
  else { ew.classList.add('hidden'); ew.innerHTML = ''; }

  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8e2d6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await loadFonts();
  const mem = await new Memory(day, { index: day.n || i + 1 }).prepare();
  if (location.hash !== '#/day/' + id) return;
  player = new Player(canvas, mem, day, {
    onTick: p => { $('#playhead').style.width = Math.min(100, p * 100) + '%'; },
    onEnd: () => { setPlayUI(false); },
  });
  player.embed = embedCtrl;
  player.still();
  setPlayUI(false);
  $('#playhead').style.width = '0';
  renderDay.current = day;
  if (autoplayDay === id) { autoplayDay = null; togglePlay(); }
}
function setPlayUI(on) { $('#btn-play').textContent = on ? '■ Стоп' : '▶ Смотреть'; $('#play-overlay').classList.toggle('hidden', on); }
async function togglePlay() {
  if (!player) return;
  if (player.playing) { player.stop(); setPlayUI(false); return; }
  setPlayUI(true);
  try { await player.play(); } catch (e) { console.error(e); toast('Не удалось воспроизвести: ' + e.message); setPlayUI(false); }
}
$('#btn-play').addEventListener('click', togglePlay);
$('#play-overlay').addEventListener('click', togglePlay);
$('#btn-voice').addEventListener('click', () => {
  const day = renderDay.current; if (!day) return;
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); player?.duck(false); $('#btn-voice').textContent = 'Озвучить запись'; return; }
  const ok = speak(day, {
    onStart: v => { player?.duck(true); $('#btn-voice').textContent = '■ Остановить голос'; if (!v) toast('Русский голос в системе не найден — используется голос по умолчанию'); },
    onEnd: () => { player?.duck(false); $('#btn-voice').textContent = 'Озвучить запись'; },
  });
  if (!ok) toast('Браузер не поддерживает синтез речи');
});
$('#d-title').addEventListener('click', async () => {
  const day = renderDay.current; if (!day) return;
  const t = prompt('Название дня (3–7 слов):', day.title);
  if (!t || !t.trim() || t.trim() === day.title) return;
  day.title = t.trim().replace(/\s+/g, ' ');
  await rebuildDay(day); toast('Название обновлено'); renderDay(day.id);
});
$('#f-replace').addEventListener('change', async e => {
  const day = renderDay.current, f = e.target.files[0]; e.target.value = '';
  if (!day || !f) return;
  if (f.size > 40 * 1024 * 1024) { toast('Файл больше 40 МБ — выберите покороче'); return; }
  player?.stop();
  $('#rec-status').textContent = 'Слушаю песню и пересобираю воспоминание…';
  try { await replaceSong(day, f); toast('Песня заменена — воспоминание пересобрано по настоящему звуку'); renderDay(day.id); }
  catch (err) { console.error(err); $('#rec-status').textContent = ''; toast('Не удалось прочитать этот аудиофайл. Попробуйте mp3 или wav.'); }
});
$('#btn-delete').addEventListener('click', async () => {
  const day = renderDay.current; if (!day) return;
  if (!confirm(`Удалить день «${day.title}»? Это нельзя отменить.`)) return;
  await db.del(day.id);
  if (!(await db.all()).length) { try { localStorage.setItem('pv-demo', 'cleared'); } catch {} }
  location.hash = '#/diary';
});

async function recordVideo(day) {
  if (day.video) return day.video;
  if (!window.MediaRecorder) throw new Error('браузер не умеет записывать видео');
  player.stop();
  const st = $('#rec-status');
  const btns = ['#btn-video', '#btn-zip'].map(s => $(s)); btns.forEach(b => b.disabled = true);
  setPlayUI(true);
  const tick = setInterval(() => { const left = Math.max(0, Math.ceil(day.spec.duration * (1 - parseFloat($('#playhead').style.width || '0') / 100))); st.textContent = `● Записываю воспоминание в реальном времени… осталось ~${left} с`; }, 300);
  try {
    const blob = await player.play({ record: true });
    day.video = blob; await db.put(day);
    return blob;
  } finally { clearInterval(tick); st.textContent = ''; btns.forEach(b => b.disabled = false); setPlayUI(false); }
}
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
$('#btn-video').addEventListener('click', async () => {
  const day = renderDay.current; if (!day) return;
  try { const v = await recordVideo(day); download(v, `${day.folder}.webm`); toast('Видео сохранено'); } catch (e) { toast('Не удалось записать видео: ' + e.message); }
});
$('#btn-cover').addEventListener('click', () => { const day = renderDay.current; if (!day) return; $('#canvas').toBlob(b => download(b, `${day.folder} — обложка.png`), 'image/png'); });
$('#btn-zip').addEventListener('click', async () => {
  const day = renderDay.current; if (!day) return;
  if (!window.JSZip) { toast('Библиотека архивов не загрузилась — проверьте интернет'); return; }
  try {
    const video = await recordVideo(day);
    const zip = new JSZip(), f = zip.folder(day.folder);
    f.file('запись.txt', `${day.title}\n${fmtDate(day.date)}\n\n${day.text}\n`);
    day.photos.forEach((p, k) => f.file(`фото/${String(k + 1).padStart(2, '0')}.jpg`, p));
    if (day.song.kind === 'file' && day.song.blob) {
      const ext = (day.song.fileName || 'song.mp3').split('.').pop();
      f.file(`песня.${ext}`, day.song.blob);
    }
    f.file('песня.txt', `${day.song.label}\n${day.song.url || ''}\n\nАнализ: ${day.analysis.music.bpm} BPM, ${day.analysis.music.mode === 'major' ? 'мажор' : 'минор'}, энергия ${day.analysis.music.energy.toFixed(2)}\n`);
    f.file(`воспоминание.${video.type.includes('mp4') ? 'mp4' : 'webm'}`, video);
    f.file('обложка.jpg', day.cover);
    f.file('озвучка.txt', `Голос: ${day.spec.voice.profile}\nСкорость: ${day.spec.voice.rate}, высота: ${day.spec.voice.pitch}\nСинтез речи браузера (Web Speech API), русский голос.\n\n${day.text}\n`);
    const strip = h => h.replace(/<[^>]+>/g, '');
    f.file('почему_так.txt', `Почему день «${day.title}» выглядит так\n\n` + day.spec.explain.map(e => '• ' + strip(e.html)).join('\n') + '\n');
    f.file('day.json', JSON.stringify({ title: day.title, date: day.date, folder: day.folder, spec: { ...day.spec, explain: undefined }, analysis: day.analysis }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    download(blob, `${day.folder}.zip`);
    toast('Папка дня сохранена');
  } catch (e) { console.error(e); toast('Не удалось собрать папку: ' + e.message); }
});

// ---------------- старт ----------------
initMotion();
loadFonts();
route();
