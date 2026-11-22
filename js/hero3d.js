// 3D-сцена главного экрана: дни дневника висят в тёмном пространстве как светящиеся экраны,
// отражаются в «мокром» полу, вокруг — пыль и световые колонны. Камера следует за мышью,
// день под курсором выходит вперёд, по клику — открывается.
import * as THREE from 'three';

const BG = 0x07070a, FLOOR_Y = -1.95, CW = 1.62, CH = CW * 16 / 9;

function gradTex(stops, w = 4, h = 256, vertical = true) {
  const c = document.createElement('canvas'); c.width = vertical ? w : h; c.height = vertical ? h : w;
  const x = c.getContext('2d');
  const g = vertical ? x.createLinearGradient(0, 0, 0, h) : x.createLinearGradient(0, 0, h, 0);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}
function glowTex(color = '255,77,46') {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.25, `rgba(${color},.45)`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
function floorTex() {
  // мокрый асфальт: вертикальные смазанные блики
  const w = 512, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 30); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}

export class Hero3D {
  constructor(canvas, { onOpen, onHover } = {}) {
    this.canvas = canvas; this.onOpen = onOpen; this.onHover = onHover;
    this.mouse = new THREE.Vector2(0, 0); this.mouseT = new THREE.Vector2(0, 0); this.scroll = 0;
    this.cards = []; this.hovered = null; this.running = false; this.t0 = performance.now();
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.setClearColor(BG, 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.FogExp2(BG, 0.038);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(0, 0.5, 10.5);
    this.loader = new THREE.TextureLoader();
    this.ray = new THREE.Raycaster();
    this.buildWorld();
    this.resize();
    this.bind();
  }

  buildWorld() {
    const s = this.scene;
    // пол
    const floorMat = new THREE.MeshBasicMaterial({ color: BG, transparent: true, opacity: 0.8, alphaMap: null });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; s.add(floor);
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ map: floorTex(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    wet.rotation.x = -Math.PI / 2; wet.position.y = FLOOR_Y + 0.002; s.add(wet);

    // световые колонны позади — акцентный цвет и белые
    this.pillars = [];
    const pillarDefs = [[-0.55, 0xffffff, 0.16], [0, 0xff4d2e, 0.95], [0.55, 0xffffff, 0.22]];
    pillarDefs.forEach(([x, col, op], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 9), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, fog: false }));
      m.position.set(x, 2.4, -4.2); s.add(m); this.pillars.push(m);
      const refl = m.clone(); refl.material = m.material.clone(); refl.material.opacity = op * 0.35;
      refl.scale.y = -1; refl.position.y = FLOOR_Y * 2 - 2.4; s.add(refl);
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.set(9, 9, 1); glow.position.set(0, 0.6, -4.6); s.add(glow); this.glow = glow;
    const floorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('255,90,60'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    floorGlow.scale.set(12, 3, 1); floorGlow.position.set(0, FLOOR_Y + 0.05, -2.5); s.add(floorGlow);

    // пыль
    const N = 900, pos = new Float32Array(N * 3), spd = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = FLOOR_Y + Math.random() * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2; spd[i] = 0.05 + Math.random() * 0.15; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe2cc, size: 0.035, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.dustSpd = spd; s.add(this.dust);

    this.reflFade = gradTex([[0, '#000'], [0.45, '#000'], [1, '#fff']]);
  }

  setDays(days, urlFor) {
    // убрать старые
    this.cards.forEach(c => this.scene.remove(c.group));
    this.cards = [];
    const list = days.length ? days.slice(-7) : new Array(5).fill(null);
    const n = list.length, mid = (n - 1) / 2;
    list.forEach((d, i) => {
      const k = i - mid;
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: d ? 0xffffff : 0x1a1a22, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), mat);
      const rmat = new THREE.MeshBasicMaterial({ color: d ? 0xffffff : 0x1a1a22, transparent: true, opacity: 0, alphaMap: this.reflFade, side: THREE.DoubleSide, depthWrite: false });
      const refl = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), rmat);
      refl.scale.y = -1;
      group.add(mesh); group.add(refl);
      const base = { x: k * 2.05, y: 0.05 + Math.abs(k) * 0.04, z: -Math.abs(k) * 0.85 - (n > 5 ? 0.4 : 0), ry: -k * 0.2 };
      group.position.set(base.x, base.y - 2.2, base.z);
      group.rotation.y = base.ry;
      this.scene.add(group);
      const card = { group, mesh, refl, mat, rmat, base, day: d, i, lift: 0, appear: 0, delay: 0.25 + Math.abs(k) * 0.12 + i * 0.05 };
      mesh.userData.card = card;
      if (d && d.cover) this.loader.load(urlFor(d.cover), tex => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; mat.map = tex; rmat.map = tex; mat.needsUpdate = rmat.needsUpdate = true; });
      this.cards.push(card);
    });
    this.t0 = performance.now();
  }

  bind() {
    this._move = e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseT.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.clientX = e.clientX; this.clientY = e.clientY;
    };
    this._click = () => { if (this.hovered && this.hovered.day && this.onOpen) this.onOpen(this.hovered.day); };
    this._resize = () => this.resize();
    window.addEventListener('pointermove', this._move, { passive: true });
    this.canvas.addEventListener('click', this._click);
    window.addEventListener('resize', this._resize);
    this.io = new IntersectionObserver(([en]) => { en.isIntersecting ? this.start() : this.stop(); });
    this.io.observe(this.canvas);
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // на узких экранах — отъезжаем, чтобы влезли все дни
    this.camera.position.z = w / h < 0.7 ? 23 : w / h < 1 ? 17 : w / h < 1.3 ? 13 : 10.5;
    this.camera.updateProjectionMatrix();
  }
  start() { if (this.running) return; this.running = true; this.last = performance.now(); const loop = () => { if (!this.running) return; this.frame(); this.raf = requestAnimationFrame(loop); }; loop(); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  destroy() { this.stop(); this.io.disconnect(); window.removeEventListener('pointermove', this._move); window.removeEventListener('resize', this._resize); this.renderer.dispose(); }

  frame() {
    const now = performance.now(), t = (now - this.t0) / 1000, dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.mouse.lerp(this.mouseT, 0.06);
    const cam = this.camera;
    cam.position.x += (this.mouse.x * 1.1 - cam.position.x) * 0.05;
    cam.position.y += (0.55 + this.mouse.y * 0.45 + this.scroll * 1.5 - cam.position.y) * 0.05;
    cam.lookAt(0, -0.55 - this.scroll * 0.5, -1.5);

    // наведение
    this.ray.setFromCamera(this.mouseT, cam);
    const hit = this.ray.intersectObjects(this.cards.map(c => c.mesh))[0];
    const h = hit ? hit.object.userData.card : null;
    if (h !== this.hovered) {
      this.hovered = h;
      this.canvas.style.cursor = h && h.day ? 'pointer' : 'default';
      this.onHover && this.onHover(h && h.day ? h.day : null, this.clientX, this.clientY);
    } else if (h && this.onHover) this.onHover(h.day, this.clientX, this.clientY);

    for (const c of this.cards) {
      const a = Math.min(1, Math.max(0, (t - c.delay) / 1.4));
      const e = 1 - Math.pow(1 - a, 3);
      // «проявление»: из тёмно-красного под фонарём — в полный цвет
      const dv = c.day ? Math.min(1, Math.max(0, (t - c.delay - 0.4) / 2.6)) : 0;
      if (c.day) { c.mat.color.setRGB(0.16 + 0.84 * dv, 0.03 + 0.97 * dv * dv, 0.02 + 0.98 * dv * dv); c.rmat.color.copy(c.mat.color); }
      const isH = c === this.hovered && c.day;
      c.lift += ((isH ? 1 : 0) - c.lift) * 0.09;
      const dim = this.hovered && this.hovered.day && !isH ? 0.45 : 1;
      const float = Math.sin(t * 0.7 + c.i * 1.3) * 0.07;
      const g = c.group;
      g.position.x = c.base.x;
      g.position.y = c.base.y + float - (1 - e) * 2.4 + c.lift * 0.18;
      g.position.z = c.base.z + c.lift * 1.1;
      g.rotation.y = c.base.ry * (1 - c.lift * 0.8) + Math.sin(t * 0.4 + c.i) * 0.03;
      g.rotation.z = Math.sin(t * 0.5 + c.i * 2) * 0.012;
      const sc = 1 + c.lift * 0.06; g.scale.set(sc, sc, sc);
      c.mat.opacity += (e * dim - c.mat.opacity) * 0.12;
      c.rmat.opacity = c.mat.opacity * 0.32;
      // отражение — зеркально относительно пола
      c.refl.position.y = (FLOOR_Y - g.position.y) * 2 / sc;
    }
    // колонны дышат
    this.pillars[1].material.opacity = 0.75 + Math.sin(t * 1.3) * 0.15;
    this.glow.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.1;
    // пыль
    const p = this.dust.geometry.attributes.position.array;
    for (let i = 0; i < this.dustSpd.length; i++) {
      p[i * 3 + 1] += this.dustSpd[i] * dt;
      p[i * 3] += Math.sin(t * 0.3 + i) * 0.0015;
      if (p[i * 3 + 1] > FLOOR_Y + 8) p[i * 3 + 1] = FLOOR_Y;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, cam);
  }
}

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
