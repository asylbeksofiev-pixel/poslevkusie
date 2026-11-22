// Страница «Система»: правила визуальной системы — схемой, интерактивной картой и короткими правилами вместо таблиц.
import { MODES } from './mood.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pos = v => Math.max(0, v);
const TRIGGER = {
  monet: 'приятно, спокойно, тепло; природа',
  matisse: 'приятно и энергично, яркие фото',
  kandinsky: 'напряжение: дедлайн, экзамен, стресс',
  ma: 'грустно и тихо, дождь или туман',
  film: 'ностальгия или песня до 1995 года',
  collage: 'много людей и событий, 3+ фото',
};
const ORDER = ['monet', 'matisse', 'kandinsky', 'ma', 'film', 'collage'];

// те же формулы выбора приёма, что в mood.js (без поправок на погоду и число фото)
export function scoreModes(M) {
  return {
    monet: pos(M.valence + 0.15) * 0.9 + pos(-M.energy + 0.2) * 0.8 + pos(M.warmth) * 0.6 - M.tension * 0.8,
    matisse: pos(M.valence) * 1.1 + pos(M.energy) * 1.0 + 0.16 - M.tension * 0.6 - M.nostalgia * 0.3 - M.social * 0.35,
    kandinsky: M.tension * 1.5 + pos(M.energy) * 0.5 + pos(-M.warmth) * 0.4 - pos(M.valence) * 0.3,
    ma: pos(-M.valence + 0.1) * 1.0 + pos(-M.energy) * 0.9 - M.social * 0.4 - M.tension * 0.3,
    film: M.nostalgia * 1.6 + pos(M.warmth) * 0.15,
    collage: M.social * 1.1 * pos(M.energy + 0.2) + 0.15 + pos(M.energy) * 0.3 - M.tension * 0.5 - pos(-M.valence) * 0.5,
  };
}

export function renderSystemDoc(days = [], urlFor = () => '') {
  const byMode = {}; days.forEach(d => { byMode[d.spec.mode] ||= d; });
  const card = (k, i) => {
    const m = MODES[k], d = byMode[k];
    return `<${d ? `a href="#/day/${d.id}"` : 'div'} class="sy-mode card" data-mode="${k}" style="--i:${i}">
      <div class="cover">${d ? `<img src="${urlFor(d.cover)}" alt="${esc(d.title)}" loading="lazy">` : '<span class="skeleton"></span>'}</div>
      <p class="mono sy-mode-n">0${i + 1} · ${m.label}</p><h3>${m.name}</h3>
      <p class="sy-when"><b>когда:</b> ${TRIGGER[k]}</p><p class="sy-why">${m.why}</p></${d ? 'a' : 'div'}>`;
  };
  const dots = days.map(d => {
    const M = d.spec.mood, x = 50 + M.valence * 46, y = 50 - M.energy * 46;
    return `<a class="sy-dot" href="#/day/${d.id}" style="left:${x}%;top:${y}%" title="${esc(d.title)}"><img src="${urlFor(d.cover)}" alt=""><span>${esc(d.title)}</span></a>`;
  }).join('');
  const slider = (id, label, min, max, val) => `<label class="sy-sl"><span class="mono">${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="0.05" value="${val}"><output id="${id}-o">${val}</output></label>`;
  return `
  <div class="sy-bg" aria-hidden="true"></div>
  <header class="sy-head sy-r">
    <p class="kicker mono">визуальная система</p>
    <h1>Как настроение дня<br>превращается в форму</h1>
    <p class="lead">Не шаблон, а правила. Три входа → вектор настроения → приём, палитра и ритм. Каждое решение объяснимо.</p>
  </header>

  <section class="sy-flow sy-r" aria-label="Схема системы">
    <div class="sy-in">
      <div class="sy-node"><b>Т</b><h4>Текст</h4><p>слова → приятность, энергия, напряжение, тепло, люди, ностальгия</p></div>
      <div class="sy-node"><b>◐</b><h4>Фото</h4><p>пиксели → палитра, свет, контраст, теплота</p></div>
      <div class="sy-node"><b>♪</b><h4>Песня</h4><p>звук → темп, мажор/минор, энергия, яркость</p></div>
    </div>
    <svg class="sy-wires" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,50 C60,50 40,150 100,150"/><path d="M0,150 L100,150"/><path d="M0,250 C60,250 40,150 100,150"/>
    </svg>
    <div class="sy-node sy-core"><b>∑</b><h4>Настроение дня</h4>
      <div class="sy-bars"><i style="--v:.55">текст 55%</i><i style="--v:.3">песня 30%</i><i style="--v:.15">фото 15%</i></div>
      <p>веса для приятности; песня главная для ритма, фото — для цвета</p></div>
    <svg class="sy-wires" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,150 C60,150 40,50 100,50"/><path d="M0,150 L100,150"/><path d="M0,150 C60,150 40,250 100,250"/>
    </svg>
    <div class="sy-out">
      <div class="sy-node"><b>✦</b><h4>Приём</h4><p>1 из 6 художественных языков</p></div>
      <div class="sy-node"><b>▦</b><h4>Палитра</h4><p>из ваших фото, сдвиг к охре или синему</p></div>
      <div class="sy-node"><b>⟷</b><h4>Ритм</h4><p>BPM → 2–16 долей на кадр, переходы</p></div>
    </div>
  </section>

  <section class="sy-map-sec sy-r">
    <div class="sy-map-text">
      <p class="kicker mono">попробуйте</p>
      <h2>Карта настроений</h2>
      <p class="muted">Двигайте ползунки — система выберет приём по тем же формулам, что и для настоящих дней. Точки — дни вашего дневника.</p>
      ${slider('sl-v', 'приятность', -1, 1, 0.4)}
      ${slider('sl-e', 'энергия', -1, 1, -0.2)}
      ${slider('sl-t', 'напряжение', 0, 1, 0)}
      ${slider('sl-n', 'ностальгия', 0, 1, 0)}
      ${slider('sl-s', 'люди рядом', 0, 1, 0.1)}
      <div class="sy-pick" aria-live="polite"><p class="mono">приём</p><h3 id="sy-pick-name"></h3><p id="sy-pick-why" class="muted"></p><div class="sy-scores" id="sy-scores"></div></div>
    </div>
    <div class="sy-map" id="sy-map">
      <span class="sy-ax sy-ax-x mono">грустно ← приятность → приятно</span>
      <span class="sy-ax sy-ax-y mono">спокойно ← энергия → энергично</span>
      <span class="sy-zone" style="left:72%;top:72%">Импрессионизм</span>
      <span class="sy-zone" style="left:74%;top:22%">Фовизм</span>
      <span class="sy-zone" style="left:22%;top:18%">Конструктивизм</span>
      <span class="sy-zone" style="left:20%;top:76%">«Ма»</span>
      ${dots}
      <span class="sy-you" id="sy-you"></span>
    </div>
  </section>

  <section class="sy-r">
    <p class="kicker mono">шесть приёмов</p>
    <h2>Один дневник — шесть художественных языков</h2>
    <div class="sy-modes">${ORDER.map(card).join('')}</div>
  </section>

  <section class="sy-two sy-r">
    <div><p class="kicker mono">постоянно</p><h2>Делает ленту дневником</h2>
      <ul class="sy-chips"><li>бумага с волокнами</li><li>сетка, поля 44 px</li><li>дата · № дня · штамп</li><li>название = папка, 3–7 слов</li><li>рукописная подпись</li><li>подпись песни внизу</li><li>3 шрифта</li></ul></div>
    <div><p class="kicker mono">меняется</p><h2>Делает день своим</h2>
      <ul class="sy-chips var"><li>приём обработки фото</li><li>палитра</li><li>ритм кадров</li><li>переходы</li><li>воздух вокруг фото</li><li>зерно</li><li>частицы погоды</li><li>характер шрифта</li><li>голос озвучки</li></ul></div>
  </section>

  <section class="sy-r">
    <p class="kicker mono">правила</p>
    <h2>Вход → решение</h2>
    <ol class="sy-rules">
      <li><span>энергия &gt; 0.45 / 0.1 / −0.35</span><i>→</i><span>2 / 4 / 8 / 16 долей на кадр; кадр = доли × 60 / BPM</span></li>
      <li><span>минор</span><i>→</i><span>насыщенность −12%; медленный минор — +15% воздуха</span></li>
      <li><span>тепло дня</span><i>→</i><span>оттенки палитры сдвигаются к охре или синему на |тепло| × 32%</span></li>
      <li><span>ностальгия, песня до 1995</span><i>→</i><span>плёночное зерно до 85%</span></li>
      <li><span>«дождь», «снег», «листья»</span><i>→</i><span>частицы погоды в кадре</span></li>
      <li><span>напряжение / радость / грусть</span><i>→</i><span>голос: ровный низкий / быстрый живой / медленный тихий</span></li>
    </ol>
  </section>

  <section class="sy-r">
    <p class="kicker mono">глубже, чем «грустно — значит синий»</p>
    <ul class="sy-deep">
      <li><b>Медленная минорная песня</b> — больше воздуха, приглушённые цвета, 8–16 долей на кадр.</li>
      <li><b>«Холодно» рядом с «какао» и «вдвоём»</b> — тепло: уют перевешивает погоду, холод остаётся в частицах.</li>
      <li><b>Ночной дедлайн</b> темнеет страницу, но сетка и шрифты те же — это всё ещё один дневник.</li>
      <li><b>Палитра из ваших фото</b> — два «тёплых» дня никогда не совпадут.</li>
    </ul>
    <p class="muted sy-ethics">Настроение — художественный приём, не диагностика. Всё хранится только в браузере.</p>
  </section>`;
}

// живые элементы страницы: ползунки → выбор приёма, точка на карте, появление разделов
export function mountSystem(root) {
  const $ = s => root.querySelector(s);
  const ids = ['v', 'e', 't', 'n', 's'];
  const update = () => {
    const val = k => parseFloat($('#sl-' + k).value);
    ids.forEach(k => { $('#sl-' + k + '-o').textContent = val(k).toFixed(2); });
    const M = { valence: val('v'), energy: val('e'), tension: val('t'), nostalgia: val('n'), social: val('s'), warmth: val('v') * 0.5 };
    const sc = scoreModes(M), ranked = Object.entries(sc).sort((a, b) => b[1] - a[1]), best = ranked[0][0], max = Math.max(0.01, ranked[0][1]);
    $('#sy-pick-name').textContent = MODES[best].name;
    $('#sy-pick-why').textContent = MODES[best].why;
    $('#sy-scores').innerHTML = ranked.map(([k, v]) => `<div class="${k === best ? 'best' : ''}"><span>${MODES[k].name}</span><i style="--w:${Math.max(0, v / max)}"></i></div>`).join('');
    const you = $('#sy-you'); you.style.left = (50 + M.valence * 46) + '%'; you.style.top = (50 - M.energy * 46) + '%';
    root.querySelectorAll('.sy-mode').forEach(c => c.classList.toggle('hl', c.dataset.mode === best));
  };
  ids.forEach(k => $('#sl-' + k).addEventListener('input', update));
  update();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  root.querySelectorAll('.sy-r').forEach(el => io.observe(el));
  return () => io.disconnect();
}
