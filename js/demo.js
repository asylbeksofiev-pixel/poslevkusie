// Демо-дневник: 6 дней с разным настроением.
// «Фото» рисуются процедурно, музыка синтезируется в браузере (OfflineAudioContext) —
// никаких чужих снимков и песен, ничего не нарушает авторские права.
// Дальше демо-дни проходят ТОТ ЖЕ конвейер анализа, что и дни пользователя.
import { rng, mix, rgba, lerp } from './util.js';

const PW = 900, PH = 1200;
const cv = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; return [c, c.getContext('2d')]; };
const toBlob = c => new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
function vgrad(x, stops, y0 = 0, y1 = PH) { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function soft(x, blur, fn) { x.save(); x.filter = `blur(${blur}px)`; fn(); x.restore(); }

// ---------- сцены ----------
const SCENES = {
  autumnAlley(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#f6e2b0'], [0.5, '#eab86a'], [1, '#c98a40']], 0, PH * 0.6); x.fillRect(0, 0, PW, PH);
    x.fillStyle = vgrad(x, [[0, '#a3763f'], [1, '#6b4a26']], PH * 0.55, PH); x.fillRect(0, PH * 0.55, PW, PH);
    x.fillStyle = '#d9b47a'; x.beginPath(); x.moveTo(PW * 0.47, PH * 0.55); x.lineTo(PW * 0.53, PH * 0.55); x.lineTo(PW * 0.85, PH); x.lineTo(PW * 0.15, PH); x.fill();
    for (let side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const d = i / 7, tx = PW / 2 + side * lerp(380, 60, d), base = lerp(PH * 1.02, PH * 0.56, d), h = lerp(900, 160, d);
      x.strokeStyle = '#3d2a1a'; x.lineWidth = lerp(34, 6, d); x.beginPath(); x.moveTo(tx, base); x.lineTo(tx + side * 10, base - h); x.stroke();
      for (let k = 0; k < 70; k++) { x.fillStyle = rgba(['#d9822b', '#e8a33d', '#c4512a', '#f2c14e', '#b8642a'][(r() * 5) | 0], 0.8); x.beginPath(); x.arc(tx + (r() - 0.5) * lerp(420, 90, d), base - h + (r() - 0.3) * lerp(380, 80, d), lerp(46, 10, d) * (0.5 + r()), 0, 7); x.fill(); }
    }
    for (let i = 0; i < 260; i++) { x.fillStyle = rgba(['#e39a3b', '#c95a28', '#f0c050'][(r() * 3) | 0], 0.9); x.beginPath(); x.ellipse(r() * PW, PH * 0.6 + r() * PH * 0.4, 9, 4, r() * 3, 0, 7); x.fill(); }
    soft(x, 40, () => { x.fillStyle = 'rgba(255,230,170,0.35)'; x.beginPath(); x.arc(PW * 0.5, PH * 0.4, 260, 0, 7); x.fill(); });
    return c;
  },
  cocoa(r) {
    const [c, x] = cv();
    x.fillStyle = '#6e4a2c'; x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 40; i++) { x.strokeStyle = rgba([60 + r() * 30, 38 + r() * 20, 20], 0.5); x.lineWidth = 2 + r() * 6; x.beginPath(); x.moveTo(0, i * 32 + r() * 10); x.bezierCurveTo(PW * 0.3, i * 32 + r() * 30, PW * 0.6, i * 32 - r() * 30, PW, i * 32); x.stroke(); }
    for (const [mx, my, s] of [[PW * 0.42, PH * 0.48, 1], [PW * 0.72, PH * 0.3, 0.75]]) {
      x.fillStyle = 'rgba(0,0,0,0.3)'; soft(x, 20, () => { x.beginPath(); x.arc(mx + 20, my + 30, 220 * s, 0, 7); x.fill(); });
      x.fillStyle = '#f1e8da'; x.beginPath(); x.arc(mx, my, 210 * s, 0, 7); x.fill();
      x.fillStyle = '#5a321d'; x.beginPath(); x.arc(mx, my, 170 * s, 0, 7); x.fill();
      x.fillStyle = '#7a4a2c'; x.beginPath(); x.arc(mx - 30 * s, my - 30 * s, 110 * s, 0, 7); x.fill();
      for (let i = 0; i < 6; i++) { x.fillStyle = '#fff7ee'; x.save(); x.translate(mx + (r() - 0.5) * 160 * s, my + (r() - 0.5) * 160 * s); x.rotate(r()); x.fillRect(-18 * s, -18 * s, 36 * s, 36 * s); x.restore(); }
    }
    for (let i = 0; i < 9; i++) { x.fillStyle = rgba(['#e39a3b', '#c95a28', '#f0c050'][i % 3], 0.95); x.beginPath(); x.ellipse(r() * PW, r() * PH, 30, 14, r() * 3, 0, 7); x.fill(); }
    return c;
  },
  pond(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#f3d79a'], [1, '#e6a65a']], 0, PH * 0.45); x.fillRect(0, 0, PW, PH * 0.45);
    for (let i = 0; i < 180; i++) { x.fillStyle = rgba(['#d9822b', '#e8a33d', '#c4512a', '#f2c14e'][(r() * 4) | 0], 0.85); x.beginPath(); x.arc(r() * PW, PH * 0.2 + r() * PH * 0.25, 20 + r() * 40, 0, 7); x.fill(); }
    x.save(); x.translate(0, PH * 0.9); x.scale(1, -1); x.globalAlpha = 0.6; x.filter = 'blur(6px)'; x.drawImage(c, 0, 0, PW, PH * 0.45, 0, 0, PW, PH * 0.45); x.restore();
    x.fillStyle = 'rgba(60,70,80,0.35)'; x.fillRect(0, PH * 0.45, PW, PH * 0.55);
    for (let i = 0; i < 50; i++) { x.strokeStyle = 'rgba(255,230,180,0.35)'; x.lineWidth = 2; x.beginPath(); const y = PH * 0.5 + r() * PH * 0.5, xx = r() * PW; x.moveTo(xx, y); x.lineTo(xx + 40 + r() * 80, y); x.stroke(); }
    return c;
  },
  officeMonitor(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#0b1222'], [1, '#141c30']]); x.fillRect(0, 0, PW, PH);
    soft(x, 60, () => { x.fillStyle = 'rgba(60,110,240,0.55)'; x.fillRect(PW * 0.1, PH * 0.15, PW * 0.8, PH * 0.45); });
    x.fillStyle = '#0e1a33'; x.fillRect(PW * 0.12, PH * 0.18, PW * 0.76, PH * 0.4);
    for (let i = 0; i < 26; i++) { let xx = PW * 0.16 + (r() < 0.3 ? 30 : 0); const y = PH * 0.21 + i * 17; for (let k = 0; k < 4; k++) { const w = 20 + r() * 110; x.fillStyle = ['#7aa2ff', '#c7d2fe', '#5eead4', '#f0abfc', '#94a3b8'][(r() * 5) | 0]; x.fillRect(xx, y, w, 7); xx += w + 10; if (xx > PW * 0.82) break; } }
    x.fillStyle = '#1b2438'; x.fillRect(PW * 0.44, PH * 0.58, PW * 0.12, PH * 0.08); x.fillRect(0, PH * 0.7, PW, PH * 0.3);
    x.fillStyle = '#26314a'; x.fillRect(PW * 0.2, PH * 0.76, PW * 0.6, PH * 0.08);
    x.fillStyle = '#e8eef9'; x.beginPath(); x.arc(PW * 0.85, PH * 0.8, 46, 0, 7); x.fill(); x.fillStyle = '#3b2416'; x.beginPath(); x.arc(PW * 0.85, PH * 0.8, 36, 0, 7); x.fill();
    return c;
  },
  officeWindow(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#0a1020'], [1, '#1a2340']]); x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 14; i++) {
      const bw = 60 + r() * 120, bh = 300 + r() * 700, bx = r() * PW, by = PH - bh;
      x.fillStyle = `rgb(${18 + r() * 14},${24 + r() * 14},${44 + r() * 20})`; x.fillRect(bx, by, bw, bh);
      for (let wy = by + 10; wy < PH; wy += 22) for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) if (r() < 0.35) { x.fillStyle = r() < 0.7 ? 'rgba(160,190,255,0.75)' : 'rgba(255,214,140,0.8)'; x.fillRect(wx, wy, 8, 11); }
    }
    x.strokeStyle = '#2b344c'; x.lineWidth = 26; x.strokeRect(13, 13, PW - 26, PH - 26); x.beginPath(); x.moveTo(PW / 2, 0); x.lineTo(PW / 2, PH); x.stroke();
    return c;
  },
  officeLamp(r) {
    const [c, x] = cv();
    x.fillStyle = '#0d1424'; x.fillRect(0, 0, PW, PH);
    x.fillStyle = vgrad(x, [[0, 'rgba(220,230,255,0.5)'], [1, 'rgba(220,230,255,0)']], PH * 0.2, PH * 0.9);
    x.beginPath(); x.moveTo(PW * 0.45, PH * 0.2); x.lineTo(PW * 0.55, PH * 0.2); x.lineTo(PW * 0.95, PH * 0.9); x.lineTo(PW * 0.05, PH * 0.9); x.fill();
    x.fillStyle = '#1c2640'; x.fillRect(0, PH * 0.85, PW, PH * 0.15);
    for (let i = 0; i < 7; i++) { x.save(); x.translate(PW * (0.25 + r() * 0.5), PH * (0.8 + r() * 0.06)); x.rotate((r() - 0.5) * 0.6); x.fillStyle = '#e9edf5'; x.fillRect(-90, -60, 180, 120); x.fillStyle = '#9aa6bd'; for (let l = 0; l < 6; l++) x.fillRect(-70, -45 + l * 16, 100 + r() * 40, 4); x.restore(); }
    x.fillStyle = '#5b6b8c'; x.fillRect(PW * 0.44, PH * 0.12, PW * 0.12, PH * 0.08);
    return c;
  },
  beach(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#4fb7ee'], [1, '#c4ecff']], 0, PH * 0.45); x.fillRect(0, 0, PW, PH * 0.45);
    soft(x, 30, () => { x.fillStyle = '#fff6c9'; x.beginPath(); x.arc(PW * 0.78, PH * 0.12, 80, 0, 7); x.fill(); });
    x.fillStyle = vgrad(x, [[0, '#0e7fb8'], [1, '#2bb3d6']], PH * 0.45, PH * 0.62); x.fillRect(0, PH * 0.45, PW, PH * 0.17);
    for (let i = 0; i < 80; i++) { x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(r() * PW, PH * 0.46 + r() * PH * 0.15, 10 + r() * 30, 2); }
    x.fillStyle = '#f3d7a0'; x.fillRect(0, PH * 0.62, PW, PH * 0.38);
    for (const [ux, col1, col2] of [[0.25, '#ef4444', '#fff'], [0.68, '#f59e0b', '#22c55e']]) {
      x.strokeStyle = '#555'; x.lineWidth = 6; x.beginPath(); x.moveTo(PW * ux, PH * 0.62); x.lineTo(PW * ux, PH * 0.82); x.stroke();
      for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? col1 : col2; x.beginPath(); x.moveTo(PW * ux, PH * 0.6); x.arc(PW * ux, PH * 0.64, 150, Math.PI + k * Math.PI / 6, Math.PI + (k + 1) * Math.PI / 6); x.fill(); }
    }
    for (const [tx, ty, col] of [[0.1, 0.85, '#ec4899'], [0.5, 0.9, '#3b82f6'], [0.75, 0.86, '#facc15']]) { x.save(); x.translate(PW * tx, PH * ty); x.rotate(-0.1); x.fillStyle = col; x.fillRect(0, 0, 200, 80); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, 30, 200, 14); x.restore(); }
    return c;
  },
  watermelon(r) {
    const [c, x] = cv();
    for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#22d3ee' : '#ffffff'; x.fillRect(0, i * 100, PW, 100); }
    for (let i = 0; i < 5; i++) {
      x.save(); x.translate(PW * (0.2 + r() * 0.6), PH * (0.15 + i * 0.18)); x.rotate(r() * 6);
      x.fillStyle = '#15803d'; x.beginPath(); x.arc(0, 0, 150, 0, Math.PI); x.fill();
      x.fillStyle = '#bbf7d0'; x.beginPath(); x.arc(0, 0, 135, 0, Math.PI); x.fill();
      x.fillStyle = '#ef4444'; x.beginPath(); x.arc(0, 0, 125, 0, Math.PI); x.fill();
      x.fillStyle = '#1f1f1f'; for (let k = 0; k < 9; k++) { x.beginPath(); x.ellipse((r() - 0.5) * 180, 20 + r() * 80, 5, 9, r(), 0, 7); x.fill(); }
      x.restore();
    }
    return c;
  },
  sunsetFriends(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#7c3aed'], [0.35, '#f472b6'], [0.6, '#fb923c'], [0.75, '#fde68a']], 0, PH * 0.7); x.fillRect(0, 0, PW, PH);
    x.fillStyle = '#fff1b8'; x.beginPath(); x.arc(PW * 0.5, PH * 0.66, 120, Math.PI, 0); x.fill();
    x.fillStyle = vgrad(x, [[0, '#be4b6e'], [1, '#3b1d4a']], PH * 0.66, PH); x.fillRect(0, PH * 0.66, PW, PH);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,230,160,0.7)'; x.fillRect(PW * 0.35 + r() * PW * 0.3, PH * 0.68 + r() * PH * 0.15, 20 + r() * 40, 3); }
    x.fillStyle = '#1e0f24';
    [0.2, 0.38, 0.6, 0.8].forEach((px, i) => { const bx = PW * px, by = PH * 0.86 - (i % 2) * 60; x.beginPath(); x.arc(bx, by - 150, 24, 0, 7); x.fill(); x.fillRect(bx - 22, by - 125, 44, 110); x.lineWidth = 12; x.strokeStyle = '#1e0f24'; x.beginPath(); x.moveTo(bx - 18, by - 115); x.lineTo(bx - 60, by - 200); x.moveTo(bx + 18, by - 115); x.lineTo(bx + 60, by - 200); x.moveTo(bx - 12, by - 20); x.lineTo(bx - 30, by + 50); x.moveTo(bx + 12, by - 20); x.lineTo(bx + 30, by + 50); x.stroke(); });
    return c;
  },
  rainWindow(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#9aa5ad'], [1, '#6c7780']]); x.fillRect(0, 0, PW, PH);
    soft(x, 30, () => { for (let i = 0; i < 30; i++) { x.fillStyle = rgba([70 + r() * 40, 80 + r() * 40, 90 + r() * 40], 0.6); x.fillRect(r() * PW, PH * 0.4 + r() * PH * 0.5, 60 + r() * 140, 100 + r() * 300); } });
    for (let i = 0; i < 220; i++) { const dx = r() * PW, dy = r() * PH, rad = 3 + r() * 10; x.fillStyle = 'rgba(210,220,228,0.35)'; x.beginPath(); x.arc(dx, dy, rad, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(dx - rad * 0.3, dy - rad * 0.3, rad * 0.3, 0, 7); x.fill(); }
    for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(220,228,235,0.35)'; x.lineWidth = 3; const sx = r() * PW, sy = r() * PH * 0.6; x.beginPath(); x.moveTo(sx, sy); x.bezierCurveTo(sx + 6, sy + 100, sx - 6, sy + 200, sx + 3, sy + 260 + r() * 200); x.stroke(); }
    return c;
  },
  teaSill(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#b7c0c6'], [1, '#8d979e']]); x.fillRect(0, 0, PW, PH * 0.7);
    x.fillStyle = '#d9d6cf'; x.fillRect(0, PH * 0.7, PW, PH * 0.3);
    x.fillStyle = '#e9e6df'; x.fillRect(PW * 0.3, PH * 0.5, PW * 0.3, PH * 0.22); x.fillStyle = '#b9b3a6'; x.fillRect(PW * 0.3, PH * 0.5, PW * 0.3, 14);
    x.strokeStyle = '#e9e6df'; x.lineWidth = 20; x.beginPath(); x.arc(PW * 0.62, PH * 0.6, 50, -1.2, 1.2); x.stroke();
    soft(x, 12, () => { x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 10; x.beginPath(); x.moveTo(PW * 0.45, PH * 0.48); x.bezierCurveTo(PW * 0.4, PH * 0.4, PW * 0.5, PH * 0.35, PW * 0.44, PH * 0.25); x.stroke(); });
    x.fillStyle = '#5d6b5a'; for (let i = 0; i < 9; i++) { x.save(); x.translate(PW * 0.82, PH * 0.6); x.rotate(-1.4 + i * 0.35); x.beginPath(); x.ellipse(0, -90, 22, 90, 0, 0, 7); x.fill(); x.restore(); }
    x.fillStyle = '#8a6a50'; x.fillRect(PW * 0.75, PH * 0.6, PW * 0.14, PH * 0.12);
    return c;
  },
  greyStreet(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#a9b1b7'], [1, '#5f676d']]); x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 8; i++) { x.fillStyle = rgba([80 + r() * 30, 86 + r() * 30, 92 + r() * 30], 0.9); const bw = 100 + r() * 160; x.fillRect(i * 120 - 40, PH * 0.15 + r() * 200, bw, PH); }
    soft(x, 18, () => { x.fillStyle = 'rgba(190,198,204,0.55)'; x.fillRect(0, 0, PW, PH); });
    x.fillStyle = '#2f3438'; x.beginPath(); x.arc(PW * 0.5, PH * 0.66, 90, Math.PI, 0); x.fill(); x.fillRect(PW * 0.5 - 3, PH * 0.66, 6, 120); x.fillRect(PW * 0.5 - 20, PH * 0.7, 40, 160);
    for (let i = 0; i < 300; i++) { x.strokeStyle = 'rgba(230,235,240,0.3)'; x.lineWidth = 1; const sx = r() * PW, sy = r() * PH; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx - 4, sy + 26); x.stroke(); }
    return c;
  },
  partyBokeh(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#1e0b3a'], [1, '#3b0f4f']]); x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 70; i++) { x.fillStyle = rgba(['#f472b6', '#facc15', '#22d3ee', '#a78bfa', '#fb7185', '#4ade80'][(r() * 6) | 0], 0.25 + r() * 0.45); x.beginPath(); x.arc(r() * PW, r() * PH, 20 + r() * 90, 0, 7); x.fill(); }
    for (let i = 0; i < 200; i++) { x.save(); x.translate(r() * PW, r() * PH); x.rotate(r() * 6); x.fillStyle = ['#f472b6', '#facc15', '#22d3ee', '#fff'][(r() * 4) | 0]; x.fillRect(-6, -3, 12, 6); x.restore(); }
    return c;
  },
  cake(r) {
    const [c, x] = cv();
    x.fillStyle = '#2a1238'; x.fillRect(0, 0, PW, PH);
    soft(x, 50, () => { x.fillStyle = 'rgba(255,190,90,0.5)'; x.beginPath(); x.arc(PW / 2, PH * 0.4, 300, 0, 7); x.fill(); });
    x.fillStyle = '#f9a8d4'; x.fillRect(PW * 0.2, PH * 0.5, PW * 0.6, PH * 0.25); x.fillStyle = '#fde68a'; x.fillRect(PW * 0.2, PH * 0.5, PW * 0.6, 40);
    for (let i = 0; i < 12; i++) { x.fillStyle = '#fff'; x.beginPath(); x.arc(PW * 0.2 + i * PW * 0.6 / 11, PH * 0.5 + 40, 18, 0, Math.PI); x.fill(); }
    for (let i = 0; i < 7; i++) { const cx = PW * 0.27 + i * PW * 0.075; x.fillStyle = ['#60a5fa', '#f472b6', '#facc15', '#4ade80'][i % 4]; x.fillRect(cx, PH * 0.4, 14, PH * 0.1); x.fillStyle = '#ffd36b'; x.beginPath(); x.ellipse(cx + 7, PH * 0.385, 9, 18, 0, 0, 7); x.fill(); }
    x.fillStyle = '#e5e7eb'; x.fillRect(PW * 0.12, PH * 0.75, PW * 0.76, 22);
    for (let i = 0; i < 160; i++) { x.save(); x.translate(r() * PW, r() * PH); x.rotate(r() * 6); x.fillStyle = ['#f472b6', '#facc15', '#22d3ee', '#a78bfa'][(r() * 4) | 0]; x.fillRect(-7, -3, 14, 6); x.restore(); }
    return c;
  },
  concert(r) {
    const [c, x] = cv();
    x.fillStyle = '#0c0616'; x.fillRect(0, 0, PW, PH);
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) { const col = ['#ec4899', '#22d3ee', '#a855f7', '#facc15'][i % 4]; const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.globalAlpha = 0.5; x.beginPath(); const sx = PW * (0.1 + i * 0.16); x.moveTo(sx, 0); x.lineTo(sx + 30, 0); x.lineTo(sx + 300 * (r() - 0.5) + 160, PH); x.lineTo(sx + 300 * (r() - 0.5) - 160, PH); x.fill(); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#05020a';
    for (let i = 0; i < 18; i++) { const hx = r() * PW, hy = PH * 0.8 + r() * 80; x.beginPath(); x.arc(hx, hy, 34, 0, 7); x.fill(); x.fillRect(hx - 40, hy + 20, 80, 300); if (r() < 0.6) { x.lineWidth = 14; x.strokeStyle = '#05020a'; x.beginPath(); x.moveTo(hx + 20, hy + 20); x.lineTo(hx + 50 + r() * 30, hy - 160); x.stroke(); } }
    return c;
  },
  balloons(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#fde68a'], [1, '#fb923c']]); x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 16; i++) { const bx = r() * PW, by = r() * PH * 0.8, col = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#facc15'][(r() * 6) | 0]; x.strokeStyle = 'rgba(80,60,40,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by + 80); x.bezierCurveTo(bx + 20, by + 200, bx - 20, by + 300, bx, by + 420); x.stroke(); x.fillStyle = col; x.beginPath(); x.ellipse(bx, by, 62, 78, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.4)'; x.beginPath(); x.ellipse(bx - 20, by - 25, 12, 22, -0.4, 0, 7); x.fill(); }
    return c;
  },
  snowVillage(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#c9d6e3'], [1, '#eef2f6']], 0, PH * 0.6); x.fillRect(0, 0, PW, PH);
    x.fillStyle = '#f7f9fb'; x.beginPath(); x.moveTo(0, PH * 0.62); x.bezierCurveTo(PW * 0.3, PH * 0.56, PW * 0.7, PH * 0.66, PW, PH * 0.6); x.lineTo(PW, PH); x.lineTo(0, PH); x.fill();
    for (let i = 0; i < 4; i++) {
      const hx = PW * (0.08 + i * 0.24), hy = PH * (0.6 - (i % 2) * 0.04), s = 0.8 + r() * 0.4;
      x.fillStyle = '#7a4b2e'; x.fillRect(hx, hy - 150 * s, 170 * s, 150 * s);
      x.fillStyle = '#f2f5f8'; x.beginPath(); x.moveTo(hx - 20, hy - 150 * s); x.lineTo(hx + 85 * s, hy - 240 * s); x.lineTo(hx + 190 * s, hy - 150 * s); x.fill();
      soft(x, 10, () => { x.fillStyle = 'rgba(255,190,90,0.9)'; x.fillRect(hx + 55 * s, hy - 110 * s, 55 * s, 50 * s); });
      x.fillStyle = '#ffcf7a'; x.fillRect(hx + 60 * s, hy - 105 * s, 45 * s, 40 * s);
      soft(x, 14, () => { x.fillStyle = 'rgba(180,190,200,0.5)'; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(hx + 140 * s + k * 12, hy - 260 * s - k * 40, 20 + k * 6, 0, 7); x.fill(); } });
    }
    for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(r() * PW, r() * PH, 1 + r() * 3.5, 0, 7); x.fill(); }
    return c;
  },
  grandmaKitchen(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#b97a45'], [1, '#6e4426']]); x.fillRect(0, 0, PW, PH);
    x.fillStyle = '#dfe9f2'; x.fillRect(PW * 0.2, PH * 0.08, PW * 0.6, PH * 0.38);
    for (let i = 0; i < 70; i++) { x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 2; const fx = PW * 0.2 + r() * PW * 0.6, fy = PH * 0.08 + r() * PH * 0.38; x.beginPath(); for (let k = 0; k < 6; k++) { x.moveTo(fx, fy); x.lineTo(fx + Math.cos(k) * 22, fy + Math.sin(k) * 22); } x.stroke(); }
    x.strokeStyle = '#f5ecdc'; x.lineWidth = 18; x.strokeRect(PW * 0.2, PH * 0.08, PW * 0.6, PH * 0.38); x.beginPath(); x.moveTo(PW * 0.5, PH * 0.08); x.lineTo(PW * 0.5, PH * 0.46); x.stroke();
    x.fillStyle = '#c0392b'; x.fillRect(0, PH * 0.6, PW, PH * 0.4);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { x.fillStyle = (i + j) % 2 ? '#f4efe6' : '#c0392b'; x.fillRect(i * 100, PH * 0.6 + j * 100, 100, 100); }
    x.fillStyle = '#d4a052'; x.beginPath(); x.ellipse(PW * 0.35, PH * 0.75, 170, 70, 0, 0, 7); x.fill(); x.strokeStyle = '#a8742f'; x.lineWidth = 6; for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(PW * 0.35 + k * 40 - 30, PH * 0.72); x.lineTo(PW * 0.35 + k * 40 + 30, PH * 0.78); x.stroke(); }
    x.fillStyle = 'rgba(160,80,30,0.85)'; x.fillRect(PW * 0.66, PH * 0.6, 90, 150); x.strokeStyle = '#b8b8b0'; x.lineWidth = 10; x.strokeRect(PW * 0.65, PH * 0.66, 110, 100); x.beginPath(); x.arc(PW * 0.65 + 125, PH * 0.71, 30, -1.4, 1.4); x.stroke();
    return c;
  },
  sled(r) {
    const [c, x] = cv();
    x.fillStyle = vgrad(x, [[0, '#dfe7ee'], [1, '#f6f8fa']]); x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 12; i++) { const tx = r() * PW, ty = PH * (0.25 + r() * 0.35), s = 0.6 + r() * 0.8; x.fillStyle = '#3f5a4a'; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(tx, ty - 200 * s + k * 50 * s); x.lineTo(tx - (40 + k * 25) * s, ty - 120 * s + k * 50 * s); x.lineTo(tx + (40 + k * 25) * s, ty - 120 * s + k * 50 * s); x.fill(); } x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.moveTo(tx, ty - 200 * s); x.lineTo(tx - 20 * s, ty - 170 * s); x.lineTo(tx + 20 * s, ty - 170 * s); x.fill(); }
    x.strokeStyle = '#c7d2dc'; x.lineWidth = 4; x.beginPath(); x.moveTo(PW * 0.2, PH); x.bezierCurveTo(PW * 0.4, PH * 0.8, PW * 0.5, PH * 0.7, PW * 0.55, PH * 0.6); x.stroke();
    x.fillStyle = '#b4532a'; x.fillRect(PW * 0.38, PH * 0.78, 200, 26); x.strokeStyle = '#6b3a1c'; x.lineWidth = 8; x.beginPath(); x.moveTo(PW * 0.36, PH * 0.83); x.lineTo(PW * 0.38 + 230, PH * 0.83); x.stroke();
    for (let i = 0; i < 200; i++) { x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(r() * PW, r() * PH, 1 + r() * 3, 0, 7); x.fill(); }
    return c;
  },
};

// ---------- синтез музыки ----------
function noiseBuf(ctx, sec = 1) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

async function synth({ bpm, mode, style, dur = 26, root = 57 }) {
  const sr = 22050, ctx = new OfflineAudioContext(1, sr * dur, sr);
  const master = ctx.createDynamicsCompressor(); master.threshold.value = -16; master.ratio.value = 4; master.connect(ctx.destination);
  const out = ctx.createGain(); out.gain.value = 0.8; out.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = 60 / bpm * 0.75; const fb = ctx.createGain(); fb.gain.value = style === 'ambient' ? 0.45 : 0.25; const wet = ctx.createGain(); wet.gain.value = style === 'ambient' || style === 'lofi' ? 0.35 : 0.15;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
  const nb = noiseBuf(ctx);
  const beat = 60 / bpm;
  const scale = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const prog = mode === 'major' ? [0, 4, 5, 3] : [0, 3, 0, 4]; // минор: i–iv–i–v, тоника не «уплывает» в параллельный мажор
  const chord = (deg, ext = false) => [0, 2, 4].concat(ext ? [6] : []).map(i => { const s = deg + i; return root + scale[s % 7] + 12 * Math.floor(s / 7); });

  const note = (t, f, d, { type = 'triangle', vol = 0.15, attack = 0.01, cutoff = 4000, send = 0, detune = 0 } = {}) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    const g = ctx.createGain(); const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(flt); flt.connect(g); g.connect(out); if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(delay); }
    o.start(t); o.stop(t + d + 0.05);
  };
  const kick = (t, v = 0.9) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4); };
  const noiseHit = (t, { f = 7000, type = 'highpass', d = 0.05, v = 0.2 } = {}) => { const s = ctx.createBufferSource(); s.buffer = nb; const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(flt); flt.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02); };

  const bars = Math.ceil(dur / (beat * 4));
  for (let b = 0; b < bars; b++) {
    const t0 = b * beat * 4, deg = prog[b % 4], ch = chord(deg, style === 'lofi' || style === 'swing');
    if (style === 'swing') {
      ch.forEach(m => note(t0, mtof(m), beat * 3.5, { type: 'triangle', vol: 0.06, attack: 0.04, cutoff: 1800 }));
      for (let i = 0; i < 4; i++) note(t0 + i * beat, mtof(ch[0] - 12 + [0, 4, 7, 9][i]), beat * 0.9, { type: 'sine', vol: 0.22, cutoff: 900 });
      for (let i = 0; i < 4; i++) { noiseHit(t0 + i * beat, { f: 5000, d: 0.12, v: 0.06 }); noiseHit(t0 + i * beat + beat * 0.66, { f: 6000, d: 0.06, v: 0.04 }); }
      if (b % 2 === 0) [0, 1.5, 2, 3].forEach((p, i) => note(t0 + p * beat, mtof(ch[(i + 1) % ch.length] + 12), beat * 1.2, { type: 'sine', vol: 0.09, send: 0.4 }));
      kick(t0, 0.35); kick(t0 + 2 * beat, 0.3);
    } else if (style === 'electro') {
      for (let i = 0; i < 4; i++) { kick(t0 + i * beat, 1); noiseHit(t0 + i * beat + beat / 2, { f: 8000, d: 0.04, v: 0.18 }); }
      noiseHit(t0 + beat, { f: 1800, type: 'bandpass', d: 0.15, v: 0.35 }); noiseHit(t0 + 3 * beat, { f: 1800, type: 'bandpass', d: 0.15, v: 0.35 });
      for (let i = 0; i < 16; i++) note(t0 + i * beat / 4, mtof(ch[i % 3] + (i % 8 > 5 ? 12 : 0)), beat / 4 * 0.9, { type: 'sawtooth', vol: 0.07, cutoff: 1400 + 1200 * Math.sin(b + i / 4), send: 0.2 });
      for (let i = 0; i < 8; i++) note(t0 + i * beat / 2 + beat / 4, mtof(ch[0] - 24), beat / 2 * 0.7, { type: 'square', vol: 0.12, cutoff: 500 });
    } else if (style === 'pop' || style === 'party') {
      const party = style === 'party';
      for (let i = 0; i < 4; i++) { kick(t0 + i * beat, party || i % 2 === 0 ? 0.9 : 0); noiseHit(t0 + i * beat + beat / 2, { f: 9000, d: 0.04, v: 0.12 }); if (party) noiseHit(t0 + i * beat, { f: 9000, d: 0.03, v: 0.1 }); }
      noiseHit(t0 + beat, { f: 2000, type: 'bandpass', d: 0.18, v: 0.45 }); noiseHit(t0 + 3 * beat, { f: 2000, type: 'bandpass', d: 0.18, v: 0.45 });
      for (let i = 0; i < 8; i++) ch.forEach(m => note(t0 + i * beat / 2, mtof(m + 12), beat / 2 * 0.8, { type: 'square', vol: 0.025, cutoff: 3000 }));
      for (let i = 0; i < 8; i++) note(t0 + i * beat / 2, mtof(ch[0] - 12), beat / 2 * 0.8, { type: 'triangle', vol: 0.2, cutoff: 1200 });
      const mel = [4, 2, 0, 2, 4, 4, 5, 4]; mel.forEach((s, i) => note(t0 + i * beat / 2, mtof(root + 12 + scale[(deg + s) % 7]), beat / 2 * 0.9, { type: 'triangle', vol: 0.09, send: 0.2 }));
    } else if (style === 'ambient') {
      ch.forEach((m, i) => note(t0, mtof(m - 12 + i * 0), beat * 4.2, { type: 'sine', vol: 0.08, attack: 1.2, cutoff: 1200 }));
      [0, 1.5, 2.5, 3.25].forEach((p, i) => { if (Math.random() < 0.85) note(t0 + p * beat, mtof(ch[(i * 2) % ch.length] + 12), beat * 3, { type: 'sine', vol: 0.12, send: 0.7, attack: 0.005 }); });
      note(t0, mtof(ch[0] - 24), beat * 4, { type: 'sine', vol: 0.14, attack: 0.5, cutoff: 400 });
    } else if (style === 'lofi') {
      kick(t0, 0.55); kick(t0 + beat * 2.5, 0.45);
      noiseHit(t0 + beat, { f: 1500, type: 'bandpass', d: 0.2, v: 0.22 }); noiseHit(t0 + 3 * beat, { f: 1500, type: 'bandpass', d: 0.2, v: 0.22 });
      for (let i = 0; i < 8; i++) noiseHit(t0 + i * beat / 2 + (i % 2 ? beat * 0.08 : 0), { f: 6000, d: 0.04, v: 0.05 });
      ch.forEach(m => note(t0, mtof(m), beat * 3.8, { type: 'triangle', vol: 0.06, attack: 0.02, cutoff: 1300, detune: (Math.random() - 0.5) * 30, send: 0.3 }));
      note(t0, mtof(ch[0] - 12), beat * 2, { type: 'sine', vol: 0.2, cutoff: 600 }); note(t0 + beat * 2, mtof(ch[2] - 24), beat * 2, { type: 'sine', vol: 0.18, cutoff: 600 });
      for (let i = 0; i < 30; i++) noiseHit(t0 + Math.random() * beat * 4, { f: 3000, d: 0.01, v: 0.06 }); // треск пластинки
    }
  }
  const buf = await ctx.startRendering();
  return wav(buf);
}
function wav(buf) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, n = d.length;
  const ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  const k = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * k)) * 32767, true);
  return new Blob([ab], { type: 'audio/wav' });
}

// ---------- 6 демо-дней ----------
export const DEMO_DAYS = [
  {
    date: '2026-01-04', scenes: ['snowVillage', 'grandmaKitchen', 'sled'],
    text: 'Приехали к бабушке в деревню, как в детстве. Снег по колено, мороз щиплет щёки, а в доме пахнет пирогами и печкой. Пили чай из старых подстаканников, бабушка достала фотоальбом, и мы долго вспоминали деда. Так тепло и немного грустно.',
    music: { bpm: 80, mode: 'major', style: 'lofi' }, meta: 'Демо-трек «Старый альбом» (сгенерирован), lo-fi, 1984',
  },
  {
    date: '2026-07-12', scenes: ['beach', 'watermelon', 'sunsetFriends'],
    text: 'Первый день на море с друзьями! Солнце, жара, мы с ребятами прыгали в волны и хохотали до слёз. Ели арбуз прямо на пляже, музыка из колонки, все загорели. Самый весёлый день лета!',
    music: { bpm: 118, mode: 'major', style: 'pop' }, meta: 'Демо-трек «Солёные волосы» (сгенерирован), поп',
  },
  {
    date: '2026-09-20', scenes: ['partyBokeh', 'cake', 'concert', 'balloons'],
    text: 'День рождения Саши! Собрались всей компанией: шарики, торт со свечами, громкая музыка. Танцевали до ночи, кричали песни, смеялись, кто-то уронил кусок торта — было шумно и безумно весело. Обожаю этих людей!',
    music: { bpm: 140, mode: 'major', style: 'party' }, meta: 'Демо-трек «Ещё одну» (сгенерирован), данс',
  },
  {
    date: '2026-10-18', scenes: ['autumnAlley', 'cocoa', 'pond'],
    text: 'Гуляли с девушкой по парку у пруда, всё было в жёлтых листьях. Было холодно, пальцы мёрзли, но мы взяли какао и долго разговаривали обо всём на свете. Солнце садилось медленно, листья тихо шуршали под ногами. Тёплый спокойный вечер.',
    music: { bpm: 84, mode: 'major', style: 'swing' }, meta: 'Демо-трек «Какао на скамейке» (сгенерирован), джазовая баллада',
  },
  {
    date: '2026-10-29', scenes: ['officeMonitor', 'officeWindow', 'officeLamp'],
    text: 'Срочная сдача проекта. Ночь в офисе, кроме нас никого. Холодный свет мониторов, третий кофе, баги не кончаются. В наушниках электроника, сердце стучит в такт. Успели в 4:40.',
    music: { bpm: 128, mode: 'minor', style: 'electro' }, meta: 'Демо-трек «Deadline» (сгенерирован), электроника',
  },
  {
    date: '2026-11-03', scenes: ['rainWindow', 'teaSill', 'greyStreet'],
    text: 'Весь день шёл дождь. Сидела одна дома у окна с чаем и смотрела, как капли медленно стекают по стеклу. Никуда не хотелось идти, немного грустно и пусто. Тихо, серо, только дождь стучит.',
    music: { bpm: 66, mode: 'minor', style: 'ambient' }, meta: 'Демо-трек «Капли» (сгенерирован), фортепиано, эмбиент',
  },
];

export async function buildDemoInputs(d, i) {
  const photos = [];
  for (let k = 0; k < d.scenes.length; k++) photos.push(await toBlob(SCENES[d.scenes[k]](rng(1000 + i * 31 + k))));
  const audio = await synth(d.music);
  return { date: d.date, text: d.text, photos, song: { kind: 'file', blob: audio, fileName: 'demo.wav', meta: d.meta, demo: true } };
}
