// Встроенные плееры музыкальных сервисов, которыми можно управлять:
// воспоминание по ссылке запускает и останавливает песню вместе с анимацией.
// YouTube — IFrame API (postMessage), SoundCloud — Widget API (postMessage), Spotify — Embed iFrame API.
// Яндекс Музыка и Apple Music не дают управлять плеером снаружи — для них подсказка нажать ▶ в плеере.

function ytId(u) {
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (h === 'youtu.be') return u.pathname.split('/')[1];
  if (h.endsWith('youtube.com') || h === 'youtube-nocookie.com') {
    return u.searchParams.get('v') || (u.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{6,})/) || [])[2] || null;
  }
  return null;
}

export function parseSongUrl(url = '') {
  let u; try { u = new URL(url.trim()); } catch { return null; }
  const h = u.hostname.replace(/^www\.|^m\./, '');
  const id = ytId(u);
  if (id) return { kind: 'youtube', id, controllable: true, label: 'YouTube' };
  if (h === 'open.spotify.com') {
    const m = u.pathname.match(/(track|album|playlist|episode)\/([\w]+)/);
    if (m) return { kind: 'spotify', type: m[1], id: m[2], controllable: true, label: 'Spotify' };
  }
  if (h === 'soundcloud.com' || h === 'on.soundcloud.com') return { kind: 'soundcloud', url: url.trim(), controllable: true, label: 'SoundCloud' };
  if (/^music\.yandex\./.test(h)) {
    const a = u.pathname.match(/album\/(\d+)\/track\/(\d+)/);
    if (a) return { kind: 'yandex', src: `https://music.yandex.ru/iframe/album/${a[1]}/track/${a[2]}`, controllable: false, label: 'Яндекс Музыка' };
    const t = u.pathname.match(/track\/(\d+)/);
    if (t) return { kind: 'yandex', src: `https://music.yandex.ru/iframe/track/${t[1]}`, controllable: false, label: 'Яндекс Музыка' };
  }
  if (h === 'music.apple.com') return { kind: 'apple', src: url.trim().replace('music.apple.com', 'embed.music.apple.com'), controllable: false, label: 'Apple Music' };
  return { kind: 'link', url: url.trim(), controllable: false, label: 'ссылка' };
}

let ytApi = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApi) return ytApi;
  ytApi = new Promise(resolve => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
    setTimeout(() => resolve(window.YT && window.YT.Player ? window.YT : null), 8000);
  });
  return ytApi;
}

let spotifyApi = null;
function loadSpotifyApi() {
  if (spotifyApi) return spotifyApi;
  spotifyApi = new Promise(resolve => {
    window.onSpotifyIframeApiReady = api => resolve(api);
    const s = document.createElement('script'); s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true; document.head.appendChild(s);
    setTimeout(() => resolve(null), 8000);
  });
  return spotifyApi;
}

// Создаёт плеер в контейнере и возвращает контроллер { play(), pause(), controllable, note }
export async function mountEmbed(container, url, onError) {
  container.innerHTML = '';
  const info = parseSongUrl(url);
  if (!info) return null;
  const note = document.createElement('p'); note.className = 'hint';
  const ctrl = { info, controllable: info.controllable, play() {}, pause() {} };

  if (info.kind === 'youtube') {
    const holder = document.createElement('div'); holder.className = 'yt-holder'; container.appendChild(holder);
    note.textContent = 'Песня играет вместе с воспоминанием.';
    const YT = await loadYouTubeApi();
    if (YT) {
      await new Promise(res => {
        ctrl._p = new YT.Player(holder, {
          videoId: info.id, height: 200, width: '100%',
          playerVars: { playsinline: 1, rel: 0, origin: location.origin, enablejsapi: 1 },
          events: {
            onReady: () => res(),
            onError: e => {
              ctrl.controllable = false; ctrl.error = e.data;
              note.textContent = (e.data === 101 || e.data === 150 || e.data === 153)
                ? 'Владелец этого видео запретил воспроизводить его на других сайтах — YouTube показывает только ссылку. Замените песню аудиофайлом: система заново проанализирует настоящий звук.'
                : 'YouTube не смог открыть это видео. Проверьте ссылку или замените песню аудиофайлом.';
              note.classList.add('warn');
              onError && onError(e.data);
              res();
            },
          },
        });
        setTimeout(res, 8000);
      });
      ctrl.play = () => { try { ctrl._p.unMute(); ctrl._p.setVolume(100); ctrl._p.playVideo(); } catch {} };
      ctrl.pause = () => { try { ctrl._p.pauseVideo(); } catch {} };
    } else {
      holder.innerHTML = `<iframe src="https://www.youtube.com/embed/${info.id}?playsinline=1&rel=0" height="200" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media" title="Песня дня на YouTube"></iframe>`;
      ctrl.controllable = false;
      note.textContent = 'Нажмите ▶ в плеере YouTube, чтобы песня звучала вместе с воспоминанием.';
    }
  } else if (info.kind === 'soundcloud') {
    const f = document.createElement('iframe');
    f.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(info.url)}&visual=false&show_comments=false&auto_play=false`;
    f.height = 166; f.allow = 'autoplay'; f.referrerPolicy = 'strict-origin-when-cross-origin'; f.title = 'Песня дня на SoundCloud';
    container.appendChild(f);
    const send = method => f.contentWindow && f.contentWindow.postMessage(JSON.stringify({ method }), 'https://w.soundcloud.com');
    ctrl.play = () => send('play'); ctrl.pause = () => send('pause');
    note.textContent = 'Песня играет вместе с воспоминанием.';
  } else if (info.kind === 'spotify') {
    const holder = document.createElement('div'); container.appendChild(holder);
    const api = await loadSpotifyApi();
    if (api) {
      await new Promise(res => api.createController(holder, { uri: `spotify:${info.type}:${info.id}`, width: '100%', height: 152 }, c => { ctrl._c = c; res(); }));
      ctrl.play = () => { ctrl._c && (ctrl._c.resume ? ctrl._c.resume() : ctrl._c.play()); };
      ctrl.pause = () => ctrl._c && ctrl._c.pause();
      note.textContent = 'Песня играет вместе с воспоминанием. Без входа в Spotify сервис даёт послушать 30 секунд.';
    } else {
      holder.innerHTML = `<iframe src="https://open.spotify.com/embed/${info.type}/${info.id}" height="152" allow="autoplay; encrypted-media" title="Песня дня в Spotify"></iframe>`;
      ctrl.controllable = false;
      note.textContent = 'Нажмите ▶ в плеере Spotify, чтобы песня звучала вместе с воспоминанием.';
    }
  } else if (info.kind === 'yandex' || info.kind === 'apple') {
    const f = document.createElement('iframe');
    f.src = info.src; f.height = info.kind === 'yandex' ? 180 : 175; f.referrerPolicy = 'strict-origin-when-cross-origin'; f.allow = 'autoplay; encrypted-media; clipboard-write'; f.title = `Песня дня — ${info.label}`;
    container.appendChild(f);
    note.textContent = `${info.label} не позволяет запускать песню с сайта. Нажмите ▶ в плеере — воспоминание продолжит играть под неё.`;
  } else {
    const a = document.createElement('a'); a.className = 'btn-ghost'; a.href = info.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Открыть песню';
    container.appendChild(a);
    note.textContent = 'Этот сервис не встраивается на сайт. Откройте песню в соседней вкладке и включите воспоминание.';
  }
  container.appendChild(note);
  return ctrl;
}
