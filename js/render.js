'use strict';
// ─────────────────────────────────────────────────────────────
//  렌더러: 모든 그래픽은 코드로 그립니다 (이미지 에셋 없음)
// ─────────────────────────────────────────────────────────────
const FONT = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
function linGrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function radGrad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

// ── 발광 스프라이트 캐시 ──
const Glow = {
  cache: new Map(),
  sprite(color) {
    let c = this.cache.get(color);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, rgba(color, 1));
      grd.addColorStop(0.2, rgba(color, 0.55));
      grd.addColorStop(0.5, rgba(color, 0.18));
      grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      this.cache.set(color, c);
    }
    return c;
  },
  draw(ctx, x, y, r, color, a) {
    if (a <= 0 || r <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(this.sprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  },
};

// ═════════════════════════════════════════════════════════════
//  타워
// ═════════════════════════════════════════════════════════════
const TRIM = ['#8d93ad', '#c3cadf', '#f2c46d'];

function towerBase(ctx, x, y, trim, level, branch) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ellipse(ctx, x, y + 13, 19, 7); ctx.fill();
  ctx.fillStyle = linGrad(ctx, 0, y - 4, 0, y + 15, ['#4d5373', '#272b3e']);
  ctx.beginPath();
  ctx.moveTo(x - 17, y - 3); ctx.lineTo(x - 17, y + 7);
  ctx.quadraticCurveTo(x, y + 17, x + 17, y + 7); ctx.lineTo(x + 17, y - 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 17, y + 3); ctx.quadraticCurveTo(x, y + 12, x + 17, y + 3);
  ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 6, y + 10); ctx.moveTo(x + 7, y + 4); ctx.lineTo(x + 7, y + 10);
  ctx.stroke();
  ctx.fillStyle = '#5c6386';
  ellipse(ctx, x, y - 3, 17, 7.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ellipse(ctx, x - 4, y - 5, 9, 3); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = 1.6;
  ellipse(ctx, x, y - 3, 15.5, 6.5); ctx.stroke();
  // 단계 표시
  ctx.fillStyle = trim;
  if (branch != null) {
    star(ctx, x, y + 10, 4, 1.8, 5); ctx.fill();
  } else {
    for (let i = 0; i <= level; i++) {
      const px = x + (i - level / 2) * 6;
      poly(ctx, [px, y + 7.5, px + 2.2, y + 10, px, y + 12.5, px - 2.2, y + 10]); ctx.fill();
    }
  }
}

function star(ctx, x, y, r1, r2, n) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (i / (n * 2)) * TAU - Math.PI / 2;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function flameShape(ctx, x, y, w, h, t, c1, c2) {
  const f = Math.sin(t * 18 + x) * 0.15 + Math.sin(t * 11) * 0.1;
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.6, x + f * w * 2, y - h);
  ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.6, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y);
  ctx.fill();
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.quadraticCurveTo(x - w * 0.4, y - h * 0.4, x + f * w, y - h * 0.62);
  ctx.quadraticCurveTo(x + w * 0.4, y - h * 0.4, x + w * 0.5, y);
  ctx.quadraticCurveTo(x, y + w * 0.3, x - w * 0.5, y);
  ctx.fill();
}

function drawTower(ctx, type, level, branch, x, y, angle, t, o = {}) {
  const def = TOWERS[type];
  const trim = branch != null ? def.color : TRIM[Math.min(level, 2)];
  let pop = 1;
  if (o.buildT > 0) pop = 1 + Math.sin((o.buildT / 0.4) * Math.PI) * 0.12;
  if (pop !== 1) { ctx.save(); ctx.translate(x, y + 10); ctx.scale(pop, 2 - pop); ctx.translate(-x, -y - 10); }
  towerBase(ctx, x, y, trim, level, branch);
  const lv = branch != null ? 3 : level;
  switch (type) {
    case 'archer': drawArcher(ctx, x, y, lv, branch, angle, t, o); break;
    case 'cannon': drawCannon(ctx, x, y, lv, branch, angle, t, o); break;
    case 'frost': drawFrost(ctx, x, y, lv, branch, t, o); break;
    case 'arcane': drawArcane(ctx, x, y, lv, branch, angle, t, o); break;
    case 'shrine': drawShrine(ctx, x, y, lv, branch, t, o); break;
    case 'barracks': drawBarracks(ctx, x, y, lv, branch, t, o); break;
  }
  if (pop !== 1) ctx.restore();
  if (o.disabledT > 0) {
    ctx.fillStyle = 'rgba(40,10,60,0.35)';
    ellipse(ctx, x, y - 12, 18, 24); ctx.fill();
    ctx.strokeStyle = `rgba(178,107,255,${0.6 + Math.sin(t * 10) * 0.25})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 14, 16, 6, 0.5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 14, 16, 6, -0.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e2c4ff'; ctx.font = `800 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(o.disabledT) + '', x, y - 36);
  }
}

function drawArcher(ctx, x, y, lv, branch, angle, t, o) {
  const h = branch === 0 ? 30 : 20 + lv * 2.5;
  const top = y - 3 - h;
  ctx.fillStyle = linGrad(ctx, x - 11, 0, x + 11, 0, ['#9a7547', '#7a5a37', '#5a4129']);
  poly(ctx, [x - 11, y - 3, x - 8, top, x + 8, top, x + 11, y - 3]); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let yy = y - 8; yy > top + 2; yy -= 5) { ctx.moveTo(x - 10, yy); ctx.lineTo(x + 10, yy); }
  ctx.stroke();
  ctx.fillStyle = branch === 0 ? '#3d4a5e' : '#6e5233';
  ctx.fillRect(x - 12, top - 4, 24, 5);
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 8 - 2.5, top - 8, 5, 4);
  if (branch === 0) {
    ctx.fillStyle = '#2a3446';
    poly(ctx, [x - 9, top - 8, x + 9, top - 8, x, top - 18]); ctx.fill();
    ctx.fillStyle = '#f2c46d'; ctx.fillRect(x - 1, top - 24, 2, 7);
    ctx.fillStyle = '#ff5d5d'; poly(ctx, [x + 1, top - 24, x + 8, top - 22, x + 1, top - 20]); ctx.fill();
  }
  ctx.save();
  ctx.translate(x, top - 8);
  ctx.rotate(angle);
  const fired = o.flash > 0;
  if (branch === 0) {
    ctx.fillStyle = '#2f3442'; ctx.fillRect(-5, -2.5, 28, 5);
    ctx.fillStyle = '#1c2029'; ctx.fillRect(4, -5, 8, 3);
    Glow.draw(ctx, 24, 0, 6, '#ffb347', 0.8);
    ctx.strokeStyle = '#c9a25c'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(6, -11); ctx.quadraticCurveTo(14, 0, 6, 11); ctx.stroke();
  } else {
    ctx.fillStyle = '#4a3420'; ctx.fillRect(-4, -2.5, 15, 5);
    const n = branch === 1 ? 3 : 1;
    ctx.strokeStyle = '#d8b77a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(7, -9 - lv); ctx.quadraticCurveTo(14, 0, 7, 9 + lv); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,230,210,0.85)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(7, -9 - lv); ctx.lineTo(fired ? 7 : 1, 0); ctx.lineTo(7, 9 + lv); ctx.stroke();
    if (!fired) {
      ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const oy = (i - (n - 1) / 2) * 3.5; ctx.moveTo(1, oy); ctx.lineTo(16, oy); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCannon(ctx, x, y, lv, branch, angle, t, o) {
  const by = y - 4;
  ctx.fillStyle = linGrad(ctx, x - 14, 0, x + 14, 0, ['#4b5168', '#363b4e', '#262a38']);
  ctx.fillRect(x - 13, by - 12, 26, 12);
  ctx.fillStyle = '#4e5470';
  ellipse(ctx, x, by - 12, 13, 5.5); ctx.fill();
  ctx.fillStyle = '#8d93ad';
  for (let i = -2; i <= 2; i++) { circle(ctx, x + i * 5, by - 4, 1); ctx.fill(); }
  if (branch === 0) {
    // 박격포: 하늘을 향한 굵은 포신
    ctx.fillStyle = linGrad(ctx, x - 11, 0, x + 11, 0, ['#5a6078', '#2b2f3e']);
    poly(ctx, [x - 10, by - 12, x - 12, by - 30, x + 12, by - 30, x + 10, by - 12]); ctx.fill();
    ctx.fillStyle = '#23262f'; ellipse(ctx, x, by - 30, 12, 4.5); ctx.fill();
    ctx.fillStyle = '#0c0d12'; ellipse(ctx, x, by - 30, 9, 3.2); ctx.fill();
    Glow.draw(ctx, x, by - 30, 12, '#ff8a4c', 0.25 + (o.flash > 0 ? 0.8 : 0));
    ctx.strokeStyle = '#c9a46b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 11.5, by - 22); ctx.lineTo(x + 11.5, by - 22); ctx.stroke();
    return;
  }
  ctx.save();
  ctx.translate(x, by - 15);
  ctx.rotate(angle);
  if (branch === 1) {
    ctx.fillStyle = linGrad(ctx, 0, -6, 0, 6, ['#b24a2a', '#7a2f1c']);
    rrect(ctx, -12, -6, 9, 12, 3); ctx.fill();
    ctx.fillStyle = linGrad(ctx, 0, -4, 0, 4, ['#7a8096', '#3a3f50']);
    ctx.fillRect(-2, -3.5, 20, 7);
    ctx.fillStyle = '#23262f'; ctx.fillRect(16, -5, 4, 10);
    flameShape(ctx, 22, 0, 2.5, 6, t, 'rgba(120,180,255,0.8)', 'rgba(255,255,255,0.8)');
    if (o.flameOn) Glow.draw(ctx, 24, 0, 16, '#ff8a4c', 0.7);
  } else {
    const len = 16 + lv * 2;
    const recoil = o.flash > 0 ? -3 : 0;
    ctx.fillStyle = linGrad(ctx, 0, -5, 0, 5, ['#6b7188', '#3a3f50', '#22252f']);
    ctx.fillRect(recoil, -4 - lv * 0.4, len, 8 + lv * 0.8);
    ctx.fillStyle = '#1b1d25';
    ctx.fillRect(recoil + len - 3, -5.5 - lv * 0.4, 4, 11 + lv * 0.8);
    ctx.fillStyle = '#2e3241'; circle(ctx, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; circle(ctx, -2, -2, 3); ctx.fill();
    if (o.flash > 0) Glow.draw(ctx, recoil + len + 5, 0, 14, '#ffb36b', o.flash * 8);
  }
  ctx.restore();
}

function crystal(ctx, x, y, s, c1, c2, c3) {
  ctx.fillStyle = linGrad(ctx, x - s, y - s * 1.6, x + s, y + s, [c1, c2, c3]);
  poly(ctx, [x, y - s * 1.6, x + s, y - s * 0.2, x + s * 0.5, y + s, x - s * 0.5, y + s, x - s, y - s * 0.2]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x - s * 0.2, y + s); ctx.moveTo(x - s, y - s * 0.2); ctx.lineTo(x + s, y - s * 0.2); ctx.stroke();
}

function drawFrost(ctx, x, y, lv, branch, t, o) {
  ctx.fillStyle = linGrad(ctx, x - 7, 0, x + 7, 0, ['#a9bfdc', '#7b93b5', '#566d8f']);
  poly(ctx, [x - 8, y - 3, x - 6, y - 16, x + 6, y - 16, x + 8, y - 3]); ctx.fill();
  ctx.fillStyle = '#c5d6ee'; ellipse(ctx, x, y - 16, 7, 2.6); ctx.fill();
  const bob = Math.sin(t * 2.2 + x * 0.1) * 2;
  const cy = y - 31 + bob;
  Glow.draw(ctx, x, cy, 26 + lv * 3, '#7fd8ff', 0.35 + (o.flash > 0 ? 0.4 : 0));
  if (branch === 0) {
    crystal(ctx, x - 7, cy + 5, 5, '#ffffff', '#9fe2ff', '#3c8fd0');
    crystal(ctx, x + 7, cy + 5, 5, '#ffffff', '#9fe2ff', '#3c8fd0');
    crystal(ctx, x, cy - 2, 9, '#ffffff', '#a8e6ff', '#2f7fc4');
  } else {
    const s = 6 + lv * 1.3;
    crystal(ctx, x, cy, s, '#f4feff', '#8fdcff', '#2c74b8');
  }
  if (branch === 1) {
    ctx.strokeStyle = 'rgba(200,240,255,0.35)'; ctx.lineWidth = 1;
    ellipse(ctx, x, cy + 2, 17, 7); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const a = t * 2 + (i / 5) * TAU;
      circle(ctx, x + Math.cos(a) * 17, cy + 2 + Math.sin(a) * 7, 1.6); ctx.fill();
    }
  }
}

function drawArcane(ctx, x, y, lv, branch, angle, t, o) {
  ctx.fillStyle = linGrad(ctx, x - 10, 0, x + 10, 0, ['#4a3a72', '#33285a', '#211a3a']);
  poly(ctx, [x - 10, y - 3, x - 4, y - 27, x + 4, y - 27, x + 10, y - 3]); ctx.fill();
  ctx.strokeStyle = rgba('#c48bff', 0.55 + Math.sin(t * 3) * 0.2); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x - 3, y - 13); ctx.lineTo(x, y - 19); ctx.lineTo(x + 3, y - 13); ctx.closePath(); ctx.stroke();
  const bob = Math.sin(t * 2.6 + x) * 1.6;
  const oy = y - 35 + bob;
  if (branch === 0) {
    ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { ellipse(ctx, x, y - 12 - i * 6, 10 - i * 2, 3); ctx.stroke(); }
    Glow.draw(ctx, x, oy, 30, '#8fd3ff', 0.5 + (o.flash > 0 ? 0.6 : 0));
    ctx.fillStyle = radGrad(ctx, x - 2, oy - 2, 0, 8, ['#ffffff', '#bfe6ff', '#4aa3ff']);
    circle(ctx, x, oy, 7.5); ctx.fill();
    if (Math.random() < 0.3) {
      ctx.strokeStyle = 'rgba(220,240,255,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, oy);
      for (let i = 1; i < 4; i++) ctx.lineTo(x + rand(-12, 12), oy + rand(-10, 14));
      ctx.stroke();
    }
    return;
  }
  if (branch === 1) {
    Glow.draw(ctx, x, oy, 26 + (o.beamMult || 1) * 4, '#c48bff', 0.5);
    ctx.save(); ctx.translate(x, oy); ctx.rotate(t * 1.4);
    ctx.fillStyle = linGrad(ctx, -8, -8, 8, 8, ['#ff9ad5', '#c48bff', '#7fd8ff']);
    poly(ctx, [0, -10, 9, 6, -9, 6]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    return;
  }
  const r = 4.5 + lv;
  Glow.draw(ctx, x, oy, 22 + lv * 4, '#c48bff', 0.45 + (o.flash > 0 ? 0.6 : 0));
  ctx.fillStyle = radGrad(ctx, x - 1.5, oy - 1.5, 0, r, ['#ffffff', '#e2c4ff', '#9b5cff']);
  circle(ctx, x, oy, r); ctx.fill();
  ctx.fillStyle = '#f0e0ff';
  for (let i = 0; i <= lv; i++) {
    const a = t * 3 + (i / (lv + 1)) * TAU;
    circle(ctx, x + Math.cos(a) * (r + 5), oy + Math.sin(a) * (r + 2) * 0.6, 1.4); ctx.fill();
  }
}

function drawShrine(ctx, x, y, lv, branch, t, o) {
  ctx.fillStyle = '#cfc6ae'; ellipse(ctx, x, y - 4, 13, 5); ctx.fill();
  ctx.fillStyle = '#e8e0cb'; ellipse(ctx, x, y - 6, 10, 4); ctx.fill();
  const colH = 16 + lv * 2;
  ctx.fillStyle = linGrad(ctx, 0, y - 6 - colH, 0, y - 6, ['#f3ecd9', '#c7bea6']);
  ctx.fillRect(x - 12, y - 6 - colH, 4, colH);
  ctx.fillRect(x + 8, y - 6 - colH, 4, colH);
  ctx.fillStyle = '#e8dfc6';
  ctx.fillRect(x - 14, y - 9 - colH, 28, 4);
  if (branch === 1) {
    ctx.fillStyle = '#b8323a';
    const w = Math.sin(t * 3) * 1.5;
    poly(ctx, [x - 6, y - 5 - colH, x + 6, y - 5 - colH, x + 6 + w, y - 10, x, y - 13, x - 6 + w, y - 10]); ctx.fill();
    ctx.fillStyle = '#ffd36b'; star(ctx, x, y - colH + 2, 3, 1.3, 5); ctx.fill();
  }
  const bx = x, by = y - 12;
  ctx.fillStyle = linGrad(ctx, bx - 7, 0, bx + 7, 0, ['#f2c46d', '#b8862f']);
  ctx.beginPath(); ctx.moveTo(bx - 7, by - 4); ctx.quadraticCurveTo(bx, by + 6, bx + 7, by - 4); ctx.closePath(); ctx.fill();
  if (branch === 0) {
    ctx.fillStyle = '#ffd36b';
    for (let i = 0; i < 5; i++) { ellipse(ctx, bx - 5 + (i % 3) * 5, by - 5 - Math.floor(i / 3) * 3, 3, 1.4); ctx.fill(); }
    if (Math.sin(t * 4 + x) > 0.8) { ctx.fillStyle = '#fff'; star(ctx, bx + 3, by - 10, 3, 0.8, 4); ctx.fill(); }
    Glow.draw(ctx, bx, by - 6, 26, '#ffd36b', 0.5);
  } else {
    const red = branch === 1;
    Glow.draw(ctx, bx, by - 10, 30 + lv * 3, red ? '#ff6b4c' : '#ffcf6b', 0.55);
    flameShape(ctx, bx, by - 3, 4 + lv * 0.5, 11 + lv, t, red ? '#ff5a3c' : '#ffb347', red ? '#ffd0a0' : '#fff2c4');
  }
}

function drawBarracks(ctx, x, y, lv, branch, t, o) {
  const roof = branch === 0 ? '#2f4f8a' : branch === 1 ? '#5c1e1e' : ['#6b3a2a', '#7a3a2c', '#8a3a2e'][lv];
  const flag = branch === 0 ? '#ffe08a' : branch === 1 ? '#ff5d5d' : '#9be37b';
  ctx.fillStyle = linGrad(ctx, x - 13, 0, x + 13, 0, ['#8a7f70', '#6d6356', '#4e463d']);
  ctx.fillRect(x - 13, y - 21, 26, 19);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let yy = y - 16; yy < y - 2; yy += 5) { ctx.moveTo(x - 13, yy); ctx.lineTo(x + 13, yy); }
  ctx.stroke();
  ctx.fillStyle = '#21180f';
  ctx.beginPath(); ctx.moveTo(x - 4, y - 3); ctx.lineTo(x - 4, y - 10); ctx.arc(x, y - 10, 4, Math.PI, 0); ctx.lineTo(x + 4, y - 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.fillRect(x - 10, y - 17, 4, 4); ctx.fillRect(x + 6, y - 17, 4, 4);
  Glow.draw(ctx, x - 8, y - 15, 7, '#ffcf6b', 0.5); Glow.draw(ctx, x + 8, y - 15, 7, '#ffcf6b', 0.5);
  ctx.fillStyle = roof;
  poly(ctx, [x - 17, y - 20, x + 17, y - 20, x, y - 36]); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  poly(ctx, [x - 17, y - 20, x, y - 36, x - 4, y - 20]); ctx.fill();
  ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y - 36); ctx.lineTo(x, y - 50); ctx.stroke();
  const w = Math.sin(t * 4 + x) * 2;
  ctx.fillStyle = flag;
  poly(ctx, [x, y - 50, x + 12, y - 48 + w * 0.5, x + 10 + w * 0.3, y - 44, x + 12, y - 41 + w * 0.5, x, y - 42]); ctx.fill();
}

// ═════════════════════════════════════════════════════════════
//  적
// ═════════════════════════════════════════════════════════════
function eyes(ctx, pts, color, r = 2.2) {
  ctx.fillStyle = color;
  for (let i = 0; i < pts.length; i += 2) { ellipse(ctx, pts[i], pts[i + 1], r * 0.85, r * 1.15); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < pts.length; i += 2) { circle(ctx, pts[i] + r * 0.25, pts[i + 1] - r * 0.4, r * 0.32); ctx.fill(); }
}

function drawEnemyBody(ctx, type, s, t, e) {
  const walk = e.walk || 0;
  const step = Math.sin(walk * 0.22);
  switch (type) {
    case 'imp': {
      ctx.fillStyle = '#1b1433';
      poly(ctx, [-s * 0.55, -s * 0.75, -s * 0.95, -s * 1.5, -s * 0.2, -s * 0.95]); ctx.fill();
      poly(ctx, [s * 0.55, -s * 0.75, s * 0.85, -s * 1.5, s * 0.2, -s * 0.95]); ctx.fill();
      ctx.fillStyle = '#251b45';
      ellipse(ctx, -s * 0.45 + step * 3, s * 0.78, s * 0.3, s * 0.18); ctx.fill();
      ellipse(ctx, s * 0.45 - step * 3, s * 0.78, s * 0.3, s * 0.18); ctx.fill();
      ctx.fillStyle = radGrad(ctx, -s * 0.3, -s * 0.4, 1, s * 1.2, ['#7d63da', '#4a3592', '#271c50']);
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.2); ctx.quadraticCurveTo(-s, -s * 1.1, 0, -s * 1.05);
      ctx.quadraticCurveTo(s, -s * 1.1, s, s * 0.2); ctx.quadraticCurveTo(s * 0.9, s * 0.85, 0, s * 0.8);
      ctx.quadraticCurveTo(-s * 0.9, s * 0.85, -s, s * 0.2); ctx.fill();
      eyes(ctx, [s * 0.15, -s * 0.25, s * 0.6, -s * 0.25], '#ffd166', s * 0.2);
      break;
    }
    case 'runner': {
      ctx.strokeStyle = '#2a2d38'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, s * 0.2); ctx.lineTo(-s * 0.7 + step * 4, s * 0.8);
      ctx.moveTo(-s * 0.4, s * 0.2); ctx.lineTo(-s * 0.4 - step * 4, s * 0.8);
      ctx.moveTo(s * 0.5, s * 0.2); ctx.lineTo(s * 0.5 - step * 4, s * 0.8);
      ctx.moveTo(s * 0.8, s * 0.2); ctx.lineTo(s * 0.8 + step * 4, s * 0.8);
      ctx.stroke();
      ctx.strokeStyle = '#4a4f60'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-s * 1.1, -s * 0.1); ctx.quadraticCurveTo(-s * 1.6, -s * 0.2, -s * 1.8, -s * 0.75 + step * 2); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = linGrad(ctx, 0, -s * 0.7, 0, s * 0.6, ['#6c7286', '#3a3e4d']);
      ellipse(ctx, 0, 0, s * 1.25, s * 0.62); ctx.fill();
      ctx.fillStyle = '#5d6375';
      circle(ctx, s * 1.05, -s * 0.35, s * 0.55); ctx.fill();
      ellipse(ctx, s * 1.55, -s * 0.2, s * 0.38, s * 0.24); ctx.fill();
      ctx.fillStyle = '#3a3e4d';
      poly(ctx, [s * 0.7, -s * 0.7, s * 0.85, -s * 1.3, s * 1.1, -s * 0.8]); ctx.fill();
      poly(ctx, [s * 1.05, -s * 0.75, s * 1.25, -s * 1.3, s * 1.4, -s * 0.72]); ctx.fill();
      eyes(ctx, [s * 1.22, -s * 0.45], '#ff5d5d', s * 0.17);
      break;
    }
    case 'bat': {
      const f = Math.sin(t * 16 + e.id);
      ctx.fillStyle = '#3d2458';
      for (const side of [-1, 1]) {
        poly(ctx, [side * s * 0.3, -s * 0.1, side * s * 2.2, -s * 0.6 - f * s * 0.9, side * s * 1.8, s * 0.1 - f * s * 0.3,
          side * s * 1.3, s * 0.05, side * s * 1.0, s * 0.45, side * s * 0.4, s * 0.3]);
        ctx.fill();
      }
      ctx.fillStyle = radGrad(ctx, -2, -2, 1, s, ['#8a52c0', '#5a3480']);
      circle(ctx, 0, 0, s * 0.72); ctx.fill();
      ctx.fillStyle = '#5a3480';
      poly(ctx, [-s * 0.5, -s * 0.4, -s * 0.35, -s * 1.05, -s * 0.1, -s * 0.55]); ctx.fill();
      poly(ctx, [s * 0.5, -s * 0.4, s * 0.35, -s * 1.05, s * 0.1, -s * 0.55]); ctx.fill();
      eyes(ctx, [-s * 0.28, -s * 0.1, s * 0.28, -s * 0.1], '#ff5d7a', s * 0.17);
      break;
    }
    case 'brute': {
      const sw = Math.sin(walk * 0.12) * 3;
      ctx.fillStyle = '#4f5464';
      circle(ctx, -s * 1.0, s * 0.1 + sw, s * 0.42); ctx.fill();
      ctx.fillStyle = linGrad(ctx, 0, -s, 0, s, ['#8a8fa0', '#5c6070', '#3a3d4a']);
      rrect(ctx, -s * 0.85, -s * 1.0, s * 1.7, s * 1.85, s * 0.4); ctx.fill();
      ctx.fillStyle = '#4a4e5c';
      rrect(ctx, -s * 0.6, -s * 0.35, s * 1.2, s * 0.6, 3); ctx.fill();
      ctx.strokeStyle = '#ff9a4c'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.1); ctx.lineTo(-s * 0.05, s * 0.4); ctx.lineTo(s * 0.2, s * 0.2); ctx.stroke();
      ctx.fillStyle = '#ffb36b';
      ctx.fillRect(s * 0.05, -s * 0.7, s * 0.28, s * 0.12);
      ctx.fillRect(s * 0.45, -s * 0.7, s * 0.25, s * 0.12);
      ctx.fillStyle = '#5f6474';
      circle(ctx, s * 0.95, s * 0.1 - sw, s * 0.45); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      circle(ctx, s * 0.85, -s * 0.05 - sw, s * 0.2); ctx.fill();
      break;
    }
    case 'shaman': {
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s * 0.75, s * 0.9); ctx.lineTo(s * 0.95, -s * 1.5); ctx.stroke();
      Glow.draw(ctx, s * 0.95, -s * 1.6, s * 1.3, '#7dff9a', 0.6 + Math.sin(t * 4) * 0.2);
      ctx.fillStyle = '#b8ffcb'; circle(ctx, s * 0.95, -s * 1.6, s * 0.25); ctx.fill();
      ctx.fillStyle = linGrad(ctx, 0, -s * 1.2, 0, s, ['#3d6e55', '#1d3a2c']);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.25); ctx.quadraticCurveTo(s * 0.7, -s * 0.9, s * 0.85, s * 0.9);
      ctx.lineTo(-s * 0.85, s * 0.9); ctx.quadraticCurveTo(-s * 0.7, -s * 0.9, 0, -s * 1.25); ctx.fill();
      ctx.fillStyle = '#10201a'; ellipse(ctx, s * 0.05, -s * 0.45, s * 0.42, s * 0.38); ctx.fill();
      ctx.fillStyle = '#d9cfb3'; ellipse(ctx, s * 0.12, -s * 0.42, s * 0.3, s * 0.3); ctx.fill();
      eyes(ctx, [s * 0.02, -s * 0.47, s * 0.25, -s * 0.47], '#3dff7a', s * 0.1);
      break;
    }
    case 'slime': case 'slimelet': {
      const w = Math.sin(t * 5 + e.id) * 0.1;
      ctx.save(); ctx.scale(1 + w, 1 - w);
      ctx.fillStyle = radGrad(ctx, -s * 0.3, -s * 0.4, 1, s * 1.2, ['rgba(190,255,170,0.95)', 'rgba(110,210,100,0.85)', 'rgba(40,120,50,0.85)']);
      ctx.beginPath();
      ctx.moveTo(-s * 1.05, s * 0.75); ctx.quadraticCurveTo(-s * 1.1, -s * 0.95, 0, -s * 1.0);
      ctx.quadraticCurveTo(s * 1.1, -s * 0.95, s * 1.05, s * 0.75); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(30,90,40,0.6)'; circle(ctx, -s * 0.15, s * 0.15, s * 0.32); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(ctx, -s * 0.45, -s * 0.5, s * 0.22, s * 0.12); ctx.fill();
      eyes(ctx, [s * 0.15, -s * 0.2, s * 0.55, -s * 0.2], '#123018', s * 0.14);
      ctx.restore();
      break;
    }
    case 'wraith': {
      Glow.draw(ctx, 0, -s * 0.2, s * 2.2, '#7fe9ff', 0.35);
      ctx.fillStyle = linGrad(ctx, 0, -s, 0, s * 1.4, ['rgba(215,250,255,0.9)', 'rgba(120,210,235,0.6)', 'rgba(60,140,190,0)']);
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.85, -s * 1.2, 0, -s * 1.15);
      ctx.quadraticCurveTo(s * 0.85, -s * 1.2, s * 0.85, -s * 0.2);
      for (let i = 0; i <= 4; i++) {
        const px = s * 0.85 - (i / 4) * s * 1.7;
        const py = s * 1.2 + Math.sin(t * 6 + i * 1.7) * s * 0.25 * (i % 2 ? 1 : 0.4);
        ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0b1a2a';
      ellipse(ctx, s * 0.05, -s * 0.45, s * 0.17, s * 0.28); ctx.fill();
      ellipse(ctx, s * 0.5, -s * 0.45, s * 0.15, s * 0.26); ctx.fill();
      ellipse(ctx, s * 0.28, s * 0.05, s * 0.14, s * 0.2); ctx.fill();
      break;
    }
    case 'knight': {
      ctx.fillStyle = '#2b2f40';
      ctx.fillRect(-s * 0.45 + step * 2, s * 0.4, s * 0.3, s * 0.5);
      ctx.fillRect(s * 0.15 - step * 2, s * 0.4, s * 0.3, s * 0.5);
      ctx.fillStyle = linGrad(ctx, 0, -s, 0, s * 0.5, ['#8a95b8', '#56607f']);
      rrect(ctx, -s * 0.6, -s * 0.45, s * 1.2, s * 0.95, 4); ctx.fill();
      ctx.fillStyle = '#9aa5c6';
      circle(ctx, 0, -s * 0.75, s * 0.5); ctx.fill();
      ctx.fillStyle = '#1a1d2b'; ctx.fillRect(s * 0.0, -s * 0.85, s * 0.48, s * 0.14);
      ctx.fillStyle = '#9c5cff';
      poly(ctx, [-s * 0.1, -s * 1.2, s * 0.15, -s * 1.15, -s * 0.6, -s * 0.6]); ctx.fill();
      ctx.fillStyle = linGrad(ctx, s * 0.4, 0, s * 1.1, 0, ['#4b3a8a', '#2e2358']);
      poly(ctx, [s * 0.45, -s * 0.6, s * 1.05, -s * 0.55, s * 1.05, s * 0.3, s * 0.75, s * 0.75, s * 0.45, s * 0.3]); ctx.fill();
      ctx.strokeStyle = '#b9a8ff'; ctx.lineWidth = 1.2; ctx.stroke();
      break;
    }
    case 'ogre': {
      const sw = e.swing > 0 ? (1 - e.swing / 0.22) : 0;
      ctx.fillStyle = '#4a5228';
      ctx.fillRect(-s * 0.5 + step * 3, s * 0.35, s * 0.32, s * 0.55);
      ctx.fillRect(s * 0.18 - step * 3, s * 0.35, s * 0.32, s * 0.55);
      ctx.fillStyle = radGrad(ctx, -s * 0.2, -s * 0.3, 2, s, ['#9aa75a', '#6f7a3a', '#454d22']);
      ellipse(ctx, 0, -s * 0.05, s * 0.85, s * 0.75); ctx.fill();
      ctx.fillStyle = '#b9c27f'; ellipse(ctx, s * 0.1, s * 0.15, s * 0.45, s * 0.38); ctx.fill();
      ctx.fillStyle = '#7d5a3a'; ctx.fillRect(-s * 0.8, s * 0.2, s * 1.6, s * 0.16);
      ctx.fillStyle = '#7f8a45'; circle(ctx, s * 0.15, -s * 0.85, s * 0.38); ctx.fill();
      ctx.fillStyle = '#f2ead2';
      poly(ctx, [s * 0.15, -s * 0.68, s * 0.2, -s * 0.95, s * 0.28, -s * 0.68]); ctx.fill();
      poly(ctx, [s * 0.42, -s * 0.7, s * 0.47, -s * 0.95, s * 0.53, -s * 0.7]); ctx.fill();
      eyes(ctx, [s * 0.15, -s * 0.95, s * 0.38, -s * 0.95], '#ffd166', s * 0.08);
      ctx.save();
      ctx.translate(s * 0.75, -s * 0.2);
      ctx.rotate(-1.1 + sw * 2.0);
      ctx.fillStyle = '#6b4a2a';
      poly(ctx, [-2, 0, 2, 0, 4, -s * 1.1, -4, -s * 1.1]); ctx.fill();
      ctx.fillStyle = '#4e3520'; ellipse(ctx, 0, -s * 1.1, 6, 8); ctx.fill();
      ctx.fillStyle = '#cfcfcf';
      for (let i = 0; i < 3; i++) { poly(ctx, [-6, -s * 1.1 + i * 5 - 4, -10, -s * 1.1 + i * 5 - 2, -6, -s * 1.1 + i * 5]); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'drake': {
      const f = Math.sin(t * 5 + e.id);
      const wing = (dx, col, k) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(dx - s * 0.35, -s * 0.15);
        ctx.quadraticCurveTo(dx - s * 0.9, -s * (1.0 + f * 0.5) * k, dx - s * 0.2, -s * (1.9 + f * 0.8) * k);
        ctx.lineTo(dx + s * 0.25, -s * (1.3 + f * 0.6) * k);
        ctx.lineTo(dx + s * 0.55, -s * (1.65 + f * 0.7) * k);
        ctx.quadraticCurveTo(dx + s * 0.6, -s * 0.6, dx + s * 0.35, -s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,140,255,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dx, -s * 0.2); ctx.lineTo(dx - s * 0.2, -s * (1.9 + f * 0.8) * k);
        ctx.moveTo(dx, -s * 0.2); ctx.lineTo(dx + s * 0.25, -s * (1.3 + f * 0.6) * k);
        ctx.moveTo(dx, -s * 0.2); ctx.lineTo(dx + s * 0.55, -s * (1.65 + f * 0.7) * k);
        ctx.stroke();
      };
      wing(-s * 0.15, '#26123f', 0.85);
      ctx.strokeStyle = '#4a2475'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.7, 0); ctx.quadraticCurveTo(-s * 1.3, Math.sin(t * 3) * s * 0.3, -s * 1.75, -s * 0.2 + Math.sin(t * 3 + 1) * s * 0.3); ctx.stroke();
      ctx.fillStyle = '#4a2475';
      poly(ctx, [-s * 1.75, -s * 0.2 + Math.sin(t * 3 + 1) * s * 0.3, -s * 2.0, -s * 0.45, -s * 1.95, 0]); ctx.fill();
      ctx.lineCap = 'butt';
      ctx.fillStyle = radGrad(ctx, 0, -s * 0.1, 2, s, ['#8c4cc7', '#5b2d86', '#341a52']);
      ellipse(ctx, 0, 0, s * 0.85, s * 0.42); ctx.fill();
      ctx.fillStyle = '#b48ad8'; ellipse(ctx, s * 0.05, s * 0.18, s * 0.55, s * 0.18); ctx.fill();
      ctx.strokeStyle = '#5b2d86'; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.1); ctx.quadraticCurveTo(s * 0.95, -s * 0.35, s * 1.05, -s * 0.55); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#6a35a0';
      ellipse(ctx, s * 1.2, -s * 0.6, s * 0.38, s * 0.22); ctx.fill();
      ctx.fillStyle = '#2c1648';
      poly(ctx, [s * 1.05, -s * 0.75, s * 0.8, -s * 1.05, s * 1.15, -s * 0.8]); ctx.fill();
      poly(ctx, [s * 1.2, -s * 0.78, s * 1.05, -s * 1.1, s * 1.32, -s * 0.8]); ctx.fill();
      ctx.fillStyle = '#ffd6ff';
      poly(ctx, [s * 1.45, -s * 0.52, s * 1.52, -s * 0.42, s * 1.4, -s * 0.46]); ctx.fill();
      eyes(ctx, [s * 1.3, -s * 0.66], '#ff5df0', s * 0.08);
      wing(s * 0.1, '#3a1f5a', 1);
      break;
    }
    case 'troll': {
      const sw = Math.sin(walk * 0.12) * 3;
      ctx.fillStyle = '#3f4d3a';
      ctx.fillRect(-s * 0.45 + step * 2, s * 0.35, s * 0.3, s * 0.55);
      ctx.fillRect(s * 0.15 - step * 2, s * 0.35, s * 0.3, s * 0.55);
      ctx.strokeStyle = '#56684d'; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.3); ctx.lineTo(-s * 0.85, s * 0.6 + sw); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = radGrad(ctx, -s * 0.2, -s * 0.4, 2, s * 1.1, ['#7d9472', '#56684d', '#33402f']);
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.45); ctx.quadraticCurveTo(-s * 0.95, -s * 0.8, s * 0.1, -s * 0.85);
      ctx.quadraticCurveTo(s * 0.85, -s * 0.7, s * 0.8, s * 0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6f8c4a';
      for (let i = 0; i < 4; i++) { circle(ctx, -s * 0.5 + i * s * 0.3, -s * 0.72 + (i % 2) * 3, s * 0.13); ctx.fill(); }
      ctx.fillStyle = '#66795b'; circle(ctx, s * 0.55, -s * 0.35, s * 0.36); ctx.fill();
      ctx.fillStyle = '#efe6c8';
      poly(ctx, [s * 0.62, -s * 0.18, s * 0.7, -s * 0.42, s * 0.78, -s * 0.18]); ctx.fill();
      eyes(ctx, [s * 0.5, -s * 0.45, s * 0.72, -s * 0.45], '#ffb347', s * 0.07);
      ctx.strokeStyle = '#56684d'; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s * 0.45, -s * 0.2); ctx.lineTo(s * 0.9, s * 0.6 - sw); ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case 'burrower': {
      for (let i = 3; i >= 0; i--) {
        const px = -i * s * 0.55, py = Math.sin(walk * 0.25 - i * 0.9) * 2.5;
        ctx.fillStyle = i === 0 ? '#c98a7a' : i % 2 ? '#a96a5c' : '#b8786a';
        circle(ctx, px, py, s * (0.62 - i * 0.07)); ctx.fill();
        ctx.strokeStyle = 'rgba(60,20,20,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, s * (0.62 - i * 0.07), -1.2, 1.2); ctx.stroke();
      }
      ctx.fillStyle = '#3a1d18';
      poly(ctx, [s * 0.45, -s * 0.25, s * 0.95, -s * 0.4, s * 0.6, -s * 0.05]); ctx.fill();
      poly(ctx, [s * 0.45, s * 0.25, s * 0.95, s * 0.4, s * 0.6, s * 0.05]); ctx.fill();
      eyes(ctx, [s * 0.25, -s * 0.22], '#ffd166', s * 0.1);
      break;
    }
    case 'hexer': {
      Glow.draw(ctx, s * 0.9, -s * 1.5, s * 1.4, '#b26bff', 0.55 + Math.sin(t * 5) * 0.2);
      ctx.fillStyle = '#e2c4ff'; circle(ctx, s * 0.9, -s * 1.5 + Math.sin(t * 3) * 2, s * 0.2); ctx.fill();
      ctx.fillStyle = linGrad(ctx, 0, -s * 1.2, 0, s, ['#3a2558', '#1c1230']);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.3); ctx.quadraticCurveTo(s * 0.75, -s * 0.8, s * 0.8, s * 0.9);
      ctx.lineTo(-s * 0.8, s * 0.9); ctx.quadraticCurveTo(-s * 0.75, -s * 0.8, 0, -s * 1.3); ctx.fill();
      ctx.strokeStyle = 'rgba(178,107,255,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.5); ctx.lineTo(s * 0.6, s * 0.5); ctx.stroke();
      ctx.fillStyle = '#d9cfe6'; ellipse(ctx, s * 0.1, -s * 0.45, s * 0.3, s * 0.34); ctx.fill();
      eyes(ctx, [s * 0.14, -s * 0.48], '#b26bff', s * 0.12);
      ctx.save(); ctx.rotate(t * 1.5);
      ctx.strokeStyle = 'rgba(178,107,255,0.5)'; ctx.setLineDash([3, 5]);
      circle(ctx, 0, -s * 0.2, s * 1.25); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      break;
    }
    case 'hydra': {
      ctx.fillStyle = radGrad(ctx, -s * 0.2, 0, 2, s, ['#4f8a6a', '#2f5a45', '#1a3328']);
      ellipse(ctx, -s * 0.15, s * 0.2, s * 0.95, s * 0.6); ctx.fill();
      ctx.fillStyle = '#7fb08a'; ellipse(ctx, -s * 0.1, s * 0.42, s * 0.6, s * 0.22); ctx.fill();
      const heads = e.hp / e.maxHp > 0.66 ? 3 : e.hp / e.maxHp > 0.33 ? 4 : 5;
      for (let i = 0; i < heads; i++) {
        const a = -1.1 + (i / Math.max(1, heads - 1)) * 1.3;
        const sway = Math.sin(t * 2.4 + i * 1.3) * 0.12;
        const nx = Math.cos(a + sway) * s * 1.05 + s * 0.15, ny = Math.sin(a + sway) * s * 1.05 - s * 0.35;
        ctx.strokeStyle = i % 2 ? '#3d7558' : '#356a4f'; ctx.lineWidth = s * 0.24; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.05); ctx.quadraticCurveTo(s * 0.35, ny * 0.4, nx, ny); ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.fillStyle = '#4f8a6a'; ellipse(ctx, nx + s * 0.1, ny, s * 0.26, s * 0.17); ctx.fill();
        ctx.fillStyle = '#f2ead2'; poly(ctx, [nx + s * 0.25, ny + s * 0.05, nx + s * 0.32, ny + s * 0.16, nx + s * 0.2, ny + s * 0.08]); ctx.fill();
        eyes(ctx, [nx + s * 0.14, ny - s * 0.05], '#ffd166', s * 0.05);
      }
      break;
    }
    case 'lord': {
      ctx.save(); ctx.rotate(t * 0.8);
      ctx.strokeStyle = 'rgba(200,120,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]); circle(ctx, 0, 0, s * 1.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      Glow.draw(ctx, 0, -s * 0.2, s * 2.4, '#b26bff', 0.35);
      ctx.strokeStyle = '#2a1f3a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s * 0.8, s * 0.9); ctx.lineTo(s * 0.95, -s * 1.5); ctx.stroke();
      Glow.draw(ctx, s * 0.95, -s * 1.6, s * 0.9, '#e08bff', 0.9);
      ctx.fillStyle = '#ffd6ff'; circle(ctx, s * 0.95, -s * 1.6, s * 0.15); ctx.fill();
      ctx.fillStyle = linGrad(ctx, 0, -s, 0, s, ['#3a2558', '#1a1028']);
      poly(ctx, [-s * 0.35, -s * 0.8, s * 0.35, -s * 0.8, s * 0.85, s * 0.95, -s * 0.85, s * 0.95]); ctx.fill();
      ctx.strokeStyle = '#b26bff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(0, s * 0.95); ctx.stroke();
      ctx.fillStyle = '#2a1a40';
      poly(ctx, [-s * 0.75, -s * 0.55, -s * 0.2, -s * 0.85, -s * 0.15, -s * 0.45]); ctx.fill();
      poly(ctx, [s * 0.75, -s * 0.55, s * 0.2, -s * 0.85, s * 0.15, -s * 0.45]); ctx.fill();
      ctx.fillStyle = '#120a1c'; circle(ctx, 0, -s * 0.95, s * 0.36); ctx.fill();
      ctx.fillStyle = '#f2c46d';
      poly(ctx, [-s * 0.3, -s * 1.15, -s * 0.25, -s * 1.5, -s * 0.1, -s * 1.25, 0, -s * 1.6, s * 0.1, -s * 1.25, s * 0.25, -s * 1.5, s * 0.3, -s * 1.15]);
      ctx.fill();
      eyes(ctx, [-s * 0.12, -s * 0.95, s * 0.12, -s * 0.95], '#ff5df0', s * 0.07);
      break;
    }
  }
}

function drawEnemy(ctx, e, t) {
  const s = e.size;
  if (e.burrowed) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ellipse(ctx, e.x, e.y + 4, s * 1.1, s * 0.4); ctx.fill();
    ctx.fillStyle = '#5c4430';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, s * 0.95, s * 0.55, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#7a5c40';
    for (let i = 0; i < 4; i++) { circle(ctx, e.x - s * 0.6 + i * s * 0.4, e.y - s * 0.2 + Math.sin(t * 9 + i) * 1.5, 2); ctx.fill(); }
    return;
  }
  if (Math.abs(e.dx) > 0.25) e._face = e.dx < 0 ? -1 : 1;
  const face = e._face || 1;
  const hop = e.flying ? Math.sin(t * 5 + e.id) * 2.5 : -Math.abs(Math.sin((e.walk || 0) * 0.16)) * (e.boss ? 1.5 : 2.5);
  const lift = e.flying ? (e.boss ? 26 : 18) : 0;
  const bx = e.x, by = e.y + hop - lift;
  ctx.fillStyle = e.flying ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.35)';
  ellipse(ctx, e.x, e.y + s * 0.7, s * (e.flying ? 0.8 : 0.95), s * (e.flying ? 0.28 : 0.35)); ctx.fill();
  ctx.save();
  ctx.translate(bx, by);
  if (face < 0 && e.type !== 'bat') ctx.scale(-1, 1);
  drawEnemyBody(ctx, e.type, s, t, e);
  if (e.hitFlash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,255,${(e.hitFlash / 0.08) * 0.35})`;
    ellipse(ctx, 0, -s * 0.2, s * 0.9, s * 0.9); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // 상태 이상
  if (e.shield > 0) {
    const a = 0.25 + 0.15 * Math.sin(t * 4 + e.id);
    ctx.fillStyle = `rgba(156,139,255,${a * 0.35})`;
    ctx.strokeStyle = `rgba(185,168,255,${a + 0.3})`;
    ctx.lineWidth = 1.4;
    circle(ctx, bx, by - s * 0.15, s * 1.35); ctx.fill(); ctx.stroke();
  }
  if (e.freezeT > 0) {
    ctx.fillStyle = 'rgba(190,235,255,0.55)';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2;
    rrect(ctx, bx - s * 1.05, by - s * 1.2, s * 2.1, s * 2.05, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(bx - s * 0.7, by - s * 0.9); ctx.lineTo(bx - s * 0.2, by - s * 0.9); ctx.stroke();
  } else if (e.slowT > 0 && e.slowAmt > 0) {
    ctx.fillStyle = 'rgba(127,216,255,0.2)';
    ellipse(ctx, bx, by - s * 0.1, s * 1.1, s * 1.0); ctx.fill();
    ctx.fillStyle = '#dff6ff';
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1 + e.id;
      circle(ctx, bx + Math.cos(a) * s * 0.9, by + s * 0.5 + Math.sin(a) * 2, 1.2); ctx.fill();
    }
  }
  if (e.burnT > 0) {
    for (let i = 0; i < 2; i++) {
      const fx = bx + (i ? s * 0.4 : -s * 0.35), fy = by - s * 0.3 - i * 2;
      flameShape(ctx, fx, fy, 2.6, 7 + Math.sin(t * 15 + i) * 2, t + i, 'rgba(255,120,40,0.85)', 'rgba(255,230,150,0.9)');
    }
  }
  if (e.stunT > 0) {
    ctx.fillStyle = '#ffe08a';
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i / 3) * TAU;
      star(ctx, bx + Math.cos(a) * s * 0.8, by - s * 1.3 + Math.sin(a) * 3, 2.6, 1.1, 5); ctx.fill();
    }
  }
}

function hpBar(ctx, x, y, w, ratio, shieldRatio) {
  ctx.fillStyle = 'rgba(8,8,16,0.75)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  ctx.fillStyle = ratio > 0.6 ? '#79e07a' : ratio > 0.3 ? '#ffd166' : '#ff5d5d';
  ctx.fillRect(x - w / 2, y, w * clamp(ratio, 0, 1), 3);
  if (shieldRatio > 0) {
    ctx.fillStyle = '#b9a8ff';
    ctx.fillRect(x - w / 2, y - 3, w * clamp(shieldRatio, 0, 1), 2);
  }
}

// ═════════════════════════════════════════════════════════════
//  병사 & 영웅
// ═════════════════════════════════════════════════════════════
const SOLDIER_LOOK = {
  basic: { tunic: '#4e7d3a', helm: '#9aa3b5', shield: '#7a5a37', blade: '#dfe6f0' },
  paladin: { tunic: '#2f4f8a', helm: '#e8d48a', shield: '#d9dde8', blade: '#fff4c4' },
  berserker: { tunic: '#7a2a2a', helm: '#5a5a5a', shield: null, blade: '#e6e6e6', axe: true },
  militia: { tunic: '#8a6a44', helm: '#6d5636', shield: '#6b4a2a', blade: '#c8ced8' },
};

function drawSoldier(ctx, s, t) {
  const L = SOLDIER_LOOK[s.style] || SOLDIER_LOOK.basic;
  const bob = -Math.abs(Math.sin(s.walk * 0.25)) * 1.5;
  let alpha = 1;
  if (s.ttl && s.ttl < 2) alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.ttl * 8));
  if (s.spawnT > 0) alpha *= 1 - s.spawnT / 0.3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, s.x, s.y + 5, 7, 2.6); ctx.fill();
  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.scale(s.face || 1, 1);
  const step = Math.sin(s.walk * 0.3);
  ctx.fillStyle = '#2a2a33';
  ctx.fillRect(-3.5 + step, 0, 2.5, 5); ctx.fillRect(1 - step, 0, 2.5, 5);
  if (L.shield) { ctx.fillStyle = L.shield; ellipse(ctx, -5, -5, 3.2, 4.5); ctx.fill(); }
  ctx.fillStyle = L.tunic;
  rrect(ctx, -4.5, -9, 9, 10, 2.5); ctx.fill();
  ctx.fillStyle = '#f1c9a5'; circle(ctx, 0, -12.5, 3.8); ctx.fill();
  ctx.fillStyle = L.helm;
  ctx.beginPath(); ctx.arc(0, -13, 4.2, Math.PI, 0); ctx.fill();
  if (s.style === 'berserker') {
    ctx.fillStyle = '#e8e0cb';
    poly(ctx, [-4, -15, -7, -19, -3, -16]); ctx.fill();
    poly(ctx, [4, -15, 7, -19, 3, -16]); ctx.fill();
  }
  if (s.style === 'paladin') { ctx.fillStyle = '#ffe08a'; ctx.fillRect(-0.8, -9, 1.6, 9); }
  const sw = s.swing > 0 ? (1 - s.swing / 0.2) : 0;
  ctx.save();
  ctx.translate(4, -6);
  ctx.rotate(-0.9 + sw * 2.2);
  ctx.strokeStyle = L.blade; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.stroke();
  if (L.axe) { ctx.fillStyle = L.blade; poly(ctx, [0, -10, 4.5, -12, 4.5, -6, 0, -7]); ctx.fill(); }
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
  if (s.stunT > 0) {
    ctx.fillStyle = '#ffe08a';
    for (let i = 0; i < 2; i++) { const a = t * 6 + i * Math.PI; star(ctx, s.x + Math.cos(a) * 5, s.y - 21, 2, 0.9, 5); ctx.fill(); }
  }
  if (s.hp < s.maxHp) hpBar(ctx, s.x, s.y - 23, 14, s.hp / s.maxHp, 0);
}

function drawHeroFigure(ctx, id, t, swing, walk) {
  const def = HEROES[id];
  const step = Math.sin(walk * 0.25);
  const sw = swing > 0 ? 1 - swing / 0.25 : 0;
  ctx.fillStyle = shade(def.color, -0.45);
  const wave = Math.sin(t * 4) * 1.5;
  poly(ctx, [-3, -11, 3, -11, -4 + wave, 2, -9 + wave, 1]); ctx.fill();
  ctx.fillStyle = '#24242e';
  ctx.fillRect(-3.5 + step, 0, 2.6, 6); ctx.fillRect(1 - step, 0, 2.6, 6);
  if (id === 'aren') {
    ctx.fillStyle = linGrad(ctx, 0, -11, 0, 1, ['#c8d2e6', '#7d8aa6']);
    rrect(ctx, -5, -11, 10, 12, 3); ctx.fill();
    ctx.fillStyle = '#f1c9a5'; circle(ctx, 0, -14.5, 4); ctx.fill();
    ctx.fillStyle = '#c8d2e6'; ctx.beginPath(); ctx.arc(0, -15, 4.6, Math.PI * 0.95, Math.PI * 0.05 + TAU); ctx.fill();
    ctx.fillStyle = '#1a1d2b'; ctx.fillRect(-0.5, -15.5, 4.5, 1.4);
    ctx.fillStyle = def.color; poly(ctx, [0, -19.5, 2, -24, 3.5, -19]); ctx.fill();
    ctx.save(); ctx.translate(5, -8); ctx.rotate(-1 + sw * 2.4);
    ctx.strokeStyle = '#eef3ff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -13); ctx.stroke();
    ctx.strokeStyle = '#f2c46d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(3, -1); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = linGrad(ctx, -9, -10, -2, 0, ['#4a86d8', '#24497f']);
    circle(ctx, -6, -5, 5.2); ctx.fill();
    ctx.strokeStyle = '#f2c46d'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#f2c46d'; star(ctx, -6, -5, 2, 0.9, 4); ctx.fill();
  } else if (id === 'lyra') {
    ctx.fillStyle = linGrad(ctx, 0, -11, 0, 1, ['#5fb35a', '#2f6a35']);
    rrect(ctx, -4.5, -11, 9, 12, 3); ctx.fill();
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-6, -12, 2.5, 9);
    ctx.fillStyle = '#f1c9a5'; circle(ctx, 0, -14.5, 3.8); ctx.fill();
    ctx.fillStyle = '#3f8a46';
    ctx.beginPath(); ctx.moveTo(-5, -13); ctx.quadraticCurveTo(0, -23, 5, -13); ctx.lineTo(3, -15); ctx.lineTo(-3, -15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c27a'; ctx.fillRect(-4.5, -13, 2, 6);
    ctx.save(); ctx.translate(6, -8);
    ctx.strokeStyle = '#a77b45'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(-3, 0, 8, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.7;
    const pull = swing > 0 ? 0 : 3;
    ctx.beginPath(); ctx.moveTo(-3 + 8 * Math.cos(-1.1), 8 * Math.sin(-1.1)); ctx.lineTo(-pull, 0); ctx.lineTo(-3 + 8 * Math.cos(1.1), 8 * Math.sin(1.1)); ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = linGrad(ctx, 0, -11, 0, 2, ['#7a4ab0', '#3e2366']);
    poly(ctx, [-4, -11, 4, -11, 6.5, 2, -6.5, 2]); ctx.fill();
    ctx.fillStyle = '#f1c9a5'; circle(ctx, 0, -14, 3.6); ctx.fill();
    ctx.fillStyle = '#f2e6ff'; ctx.fillRect(-4, -15, 2, 6);
    ctx.fillStyle = '#5b2d86';
    poly(ctx, [-7, -16, 7, -16, 1, -28 + Math.sin(t * 2) * 1.2]); ctx.fill();
    ctx.fillStyle = '#ffd36b'; star(ctx, 2, -21, 1.8, 0.8, 5); ctx.fill();
    ctx.save(); ctx.translate(6, -2); ctx.rotate(0.1 - sw * 0.6);
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -20); ctx.stroke();
    Glow.draw(ctx, 0, -22, 9, def.color, 0.9);
    ctx.fillStyle = '#ffe6ff'; circle(ctx, 0, -22, 2.2); ctx.fill();
    ctx.restore();
  }
}

function drawHero(ctx, h, t, selected) {
  if (!h.alive) return;
  const def = h.def;
  if (selected) {
    ctx.save(); ctx.translate(h.x, h.y + 5);
    ctx.strokeStyle = rgba(def.color, 0.9); ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20;
    ellipse(ctx, 0, 0, 15, 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  Glow.draw(ctx, h.x, h.y - 10, 30, def.color, 0.22);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ellipse(ctx, h.x, h.y + 6, 10, 3.5); ctx.fill();
  const bob = -Math.abs(Math.sin(h.walk * 0.22)) * 1.8;
  ctx.save();
  ctx.translate(h.x, h.y + bob);
  ctx.scale((h.face || 1) * 1.3, 1.3);
  drawHeroFigure(ctx, h.id, t, h.swing, h.walk);
  ctx.restore();
  if (h.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,80,80,${h.hitFlash * 2.5})`;
    ellipse(ctx, h.x, h.y - 10, 9, 14); ctx.fill();
  }
  if (h.stunT > 0) {
    ctx.fillStyle = '#ffe08a';
    for (let i = 0; i < 3; i++) { const a = t * 6 + (i / 3) * TAU; star(ctx, h.x + Math.cos(a) * 7, h.y - 38, 2.4, 1, 5); ctx.fill(); }
  }
  hpBar(ctx, h.x, h.y - 40, 26, h.hp / h.maxHp, 0);
  ctx.fillStyle = '#14162a';
  circle(ctx, h.x - 18, h.y - 38, 5.5); ctx.fill();
  ctx.strokeStyle = def.color; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `700 7px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(h.level), h.x - 18, h.y - 37.5);
}

// ═════════════════════════════════════════════════════════════
//  맵 장식
// ═════════════════════════════════════════════════════════════
function drawDeco(ctx, d, x, y) {
  const s = d.seed;
  const k = 0.85 + s * 0.35;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  switch (d.kind) {
    case 'tree': {
      ellipse(ctx, x + 3, y + 12, 17 * k, 6 * k); ctx.fill();
      ctx.fillStyle = '#3b2a1c'; ctx.fillRect(x - 2.5, y, 5, 13);
      const cols = ['#173326', '#1f4430', '#2a5a3e'];
      [[0, -8, 15], [-8, -2, 11], [8, -2, 11], [0, -16, 10]].forEach(([dx, dy, r], i) => {
        ctx.fillStyle = cols[Math.min(2, i === 3 ? 2 : i ? 1 : 0)];
        circle(ctx, x + dx * k, y + dy * k, r * k); ctx.fill();
      });
      ctx.fillStyle = 'rgba(150,220,160,0.12)';
      circle(ctx, x - 4 * k, y - 15 * k, 6 * k); ctx.fill();
      break;
    }
    case 'bush': {
      ellipse(ctx, x + 2, y + 8, 13, 4); ctx.fill();
      ctx.fillStyle = '#21462f'; circle(ctx, x - 5, y + 2, 7 * k); ctx.fill();
      ctx.fillStyle = '#2a5a3b'; circle(ctx, x + 4, y, 8 * k); ctx.fill();
      ctx.fillStyle = '#e88aa8'; circle(ctx, x + 2, y - 3, 1.5); ctx.fill(); circle(ctx, x - 6, y + 1, 1.3); ctx.fill();
      break;
    }
    case 'rock': case 'icerock': {
      ellipse(ctx, x + 2, y + 9, 15 * k, 5 * k); ctx.fill();
      const ice = d.kind === 'icerock';
      ctx.fillStyle = ice ? '#4d5f78' : '#4a4f60';
      poly(ctx, [x - 13 * k, y + 8, x - 10 * k, y - 4 * k, x - 2 * k, y - 10 * k, x + 9 * k, y - 6 * k, x + 13 * k, y + 8]); ctx.fill();
      ctx.fillStyle = ice ? '#6d84a3' : '#5d6476';
      poly(ctx, [x - 10 * k, y - 4 * k, x - 2 * k, y - 10 * k, x + 9 * k, y - 6 * k, x + 2 * k, y + 1]); ctx.fill();
      if (ice) { ctx.fillStyle = '#e6f2ff'; poly(ctx, [x - 9 * k, y - 4 * k, x - 2 * k, y - 10 * k, x + 8 * k, y - 6 * k, x, y - 5 * k]); ctx.fill(); }
      break;
    }
    case 'mushroom': {
      for (let i = 0; i < 3; i++) {
        const mx = x + (i - 1) * 7 + s * 4, my = y + 4 + (i % 2) * 4;
        ctx.fillStyle = '#d9cfb3'; ctx.fillRect(mx - 1, my - 4, 2, 5);
        ctx.fillStyle = i % 2 ? '#7fd8ff' : '#ff9ad5';
        ctx.beginPath(); ctx.arc(mx, my - 4, 3.5, Math.PI, 0); ctx.fill();
      }
      break;
    }
    case 'pine': {
      ellipse(ctx, x + 3, y + 13, 14 * k, 5 * k); ctx.fill();
      ctx.fillStyle = '#3b2a1c'; ctx.fillRect(x - 2, y + 4, 4, 9);
      const tiers = [[y + 6, 14], [y - 4, 11], [y - 13, 8]];
      for (const [ty, w] of tiers) {
        ctx.fillStyle = '#1d3a44';
        poly(ctx, [x - w * k, ty, x + w * k, ty, x, ty - 14 * k]); ctx.fill();
        ctx.fillStyle = '#e9f3ff';
        poly(ctx, [x - w * k * 0.45, ty - 7.5 * k, x + w * k * 0.45, ty - 7.5 * k, x, ty - 14 * k]); ctx.fill();
      }
      break;
    }
    case 'crystal': {
      ellipse(ctx, x + 2, y + 9, 12, 4); ctx.fill();
      crystal(ctx, x - 5, y + 2, 4.5 * k, '#ffffff', '#a8e6ff', '#3c7fbf');
      crystal(ctx, x + 4, y - 1, 6 * k, '#ffffff', '#9fe2ff', '#2f6fb0');
      break;
    }
    case 'pillar': {
      ellipse(ctx, x + 3, y + 12, 13, 4.5); ctx.fill();
      ctx.fillStyle = '#4a4256'; ctx.fillRect(x - 10, y + 4, 20, 7);
      const h = 14 + s * 16;
      ctx.fillStyle = linGrad(ctx, x - 7, 0, x + 7, 0, ['#7a7088', '#5b5266', '#423b4c']);
      poly(ctx, [x - 7, y + 4, x - 7, y + 4 - h, x - 2, y + 1 - h, x + 2, y + 6 - h, x + 7, y + 3 - h, x + 7, y + 4]); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 2.5, y + 4); ctx.lineTo(x - 2.5, y + 4 - h + 4); ctx.moveTo(x + 2.5, y + 4); ctx.lineTo(x + 2.5, y + 4 - h + 6); ctx.stroke();
      break;
    }
    case 'rubble': {
      for (let i = 0; i < 4; i++) {
        const rx = x + Math.cos(i * 2.1 + s * 6) * 9, ry = y + 4 + Math.sin(i * 2.1 + s * 6) * 5;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(ctx, rx + 1, ry + 3, 5, 2); ctx.fill();
        ctx.fillStyle = i % 2 ? '#5b5266' : '#6b6178';
        poly(ctx, [rx - 5, ry + 2, rx - 3, ry - 3, rx + 3, ry - 4, rx + 5, ry + 2]); ctx.fill();
      }
      break;
    }
    case 'deadtree': {
      ellipse(ctx, x + 2, y + 12, 10, 3.5); ctx.fill();
      ctx.strokeStyle = '#2b2230'; ctx.lineCap = 'round';
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + 1, y - 6); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x + 1, y - 2); ctx.lineTo(x - 9, y - 12); ctx.moveTo(x + 1, y - 6); ctx.lineTo(x + 9, y - 16);
      ctx.moveTo(x - 5, y - 8); ctx.lineTo(x - 6, y - 17); ctx.moveTo(x + 6, y - 12); ctx.lineTo(x + 12, y - 12);
      ctx.stroke(); ctx.lineCap = 'butt';
      break;
    }
    case 'pool': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, x + 1, y + 3, 21 * k, 13 * k); ctx.fill();
      ctx.fillStyle = radGrad(ctx, x - 4, y - 2, 2, 20 * k, ['#2f5f5a', '#1d3d3a', '#132826']);
      ellipse(ctx, x, y, 20 * k, 12 * k); ctx.fill();
      ctx.strokeStyle = 'rgba(160,230,210,0.18)'; ctx.lineWidth = 1;
      ellipse(ctx, x - 3, y - 1, 9 * k, 4 * k); ctx.stroke();
      ctx.fillStyle = '#3f7a46'; ellipse(ctx, x + 8 * k, y + 3, 4, 2.5); ctx.fill();
      ctx.fillStyle = '#e88aa8'; circle(ctx, x + 8 * k, y + 2, 1.2); ctx.fill();
      break;
    }
    case 'reed': {
      ellipse(ctx, x + 2, y + 11, 12, 4); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const rx = x - 9 + i * 3.6, h = 16 + ((i * 7 + s * 10) % 9);
        ctx.strokeStyle = i % 2 ? '#4f6b3a' : '#3f5a30'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(rx, y + 10); ctx.quadraticCurveTo(rx + 2, y + 10 - h / 2, rx + (i % 3) - 1, y + 10 - h); ctx.stroke();
        if (i % 2 === 0) { ctx.fillStyle = '#5c3d26'; ellipse(ctx, rx + (i % 3) - 1, y + 13 - h, 1.8, 4); ctx.fill(); }
      }
      break;
    }
    case 'stump': {
      ellipse(ctx, x + 2, y + 10, 13, 4.5); ctx.fill();
      ctx.fillStyle = '#3d2e22'; ctx.fillRect(x - 8, y - 4, 16, 14);
      ctx.fillStyle = '#5a4532'; ellipse(ctx, x, y - 4, 8, 3.5); ctx.fill();
      ctx.strokeStyle = '#3d2e22'; ctx.lineWidth = 1; ellipse(ctx, x, y - 4, 4.5, 1.8); ctx.stroke();
      ctx.fillStyle = '#4f6b3a'; ellipse(ctx, x - 6, y + 6, 4, 2.5); ctx.fill();
      break;
    }
    case 'brazier': {
      ellipse(ctx, x + 2, y + 11, 11, 4); ctx.fill();
      ctx.fillStyle = '#3a3344';
      poly(ctx, [x - 3, y + 10, x - 2, y - 2, x + 2, y - 2, x + 3, y + 10]); ctx.fill();
      ctx.fillStyle = '#5b5266';
      ctx.beginPath(); ctx.moveTo(x - 9, y - 4); ctx.quadraticCurveTo(x, y + 6, x + 9, y - 4); ctx.closePath(); ctx.fill();
      break;
    }
  }
}

// ═════════════════════════════════════════════════════════════
//  룬 문양 (UI 아이콘)
// ═════════════════════════════════════════════════════════════
function drawSigil(ctx, sigil, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (TOWERS[sigil]) {
    ctx.scale(s / 58, s / 58);
    drawTower(ctx, sigil, 2, null, 0, 14, -0.6, 0.5, {});
    ctx.restore();
    return;
  }
  const r = s * 0.42;
  switch (sigil) {
    case 'coin':
      ctx.fillStyle = '#f2c46d'; circle(ctx, 0, 0, r); ctx.fill();
      ctx.strokeStyle = '#a77b2f'; circle(ctx, 0, 0, r * 0.7); ctx.stroke();
      ctx.fillStyle = '#a77b2f'; star(ctx, 0, 0, r * 0.4, r * 0.18, 4); ctx.fill();
      break;
    case 'heart':
      ctx.fillStyle = '#ff5d73';
      ctx.beginPath(); ctx.moveTo(0, r * 0.9);
      ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.35);
      ctx.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.4, -r * 0.1, 0, r * 0.9); ctx.fill();
      break;
    case 'hammer':
      ctx.rotate(-0.6);
      ctx.fillStyle = '#a77b45'; ctx.fillRect(-r * 0.12, -r * 0.4, r * 0.24, r * 1.4);
      ctx.fillStyle = '#c8ced8'; rrect(ctx, -r * 0.65, -r * 0.8, r * 1.3, r * 0.5, 2); ctx.fill();
      break;
    case 'eye':
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * 1.1, r, 0); ctx.quadraticCurveTo(0, r * 1.1, -r, 0); ctx.stroke();
      circle(ctx, 0, 0, r * 0.35); ctx.fill();
      break;
    case 'bolt':
      poly(ctx, [r * 0.2, -r, -r * 0.55, r * 0.1, -r * 0.05, r * 0.1, -r * 0.25, r, r * 0.55, -r * 0.15, r * 0.05, -r * 0.15]); ctx.fill();
      break;
    case 'star': star(ctx, 0, 0, r, r * 0.42, 5); ctx.fill(); break;
    case 'crown':
      poly(ctx, [-r, r * 0.5, -r, -r * 0.4, -r * 0.5, 0, 0, -r * 0.7, r * 0.5, 0, r, -r * 0.4, r, r * 0.5]); ctx.fill();
      break;
    case 'hourglass':
      poly(ctx, [-r * 0.7, -r, r * 0.7, -r, 0, 0, r * 0.7, r, -r * 0.7, r, 0, 0]); ctx.stroke();
      poly(ctx, [-r * 0.35, r * 0.65, r * 0.35, r * 0.65, 0, r * 0.25]); ctx.fill();
      break;
    case 'flag':
      ctx.beginPath(); ctx.moveTo(-r * 0.6, r); ctx.lineTo(-r * 0.6, -r); ctx.stroke();
      poly(ctx, [-r * 0.6, -r, r * 0.8, -r * 0.6, -r * 0.6, -r * 0.1]); ctx.fill();
      break;
    case 'orb':
      Glow.draw(ctx, 0, 0, r * 1.6, color, 0.6);
      ctx.fillStyle = radGrad(ctx, -r * 0.3, -r * 0.3, 0, r, ['#ffffff', color]);
      circle(ctx, 0, 0, r * 0.75); ctx.fill();
      break;
    case 'sword':
      ctx.rotate(0.75);
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, -r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.45); ctx.lineTo(r * 0.4, r * 0.45); ctx.stroke();
      break;
    case 'skull':
      circle(ctx, 0, -r * 0.15, r * 0.7); ctx.fill();
      ctx.fillRect(-r * 0.4, r * 0.3, r * 0.8, r * 0.5);
      ctx.fillStyle = '#14162a'; circle(ctx, -r * 0.27, -r * 0.15, r * 0.2); ctx.fill(); circle(ctx, r * 0.27, -r * 0.15, r * 0.2); ctx.fill();
      break;
    case 'frostfire':
      crystal(ctx, -r * 0.35, r * 0.4, r * 0.45, '#ffffff', '#9fe2ff', '#2f6fb0');
      flameShape(ctx, r * 0.35, r * 0.7, r * 0.4, r * 1.4, 0.3, '#ff8a4c', '#ffe08a');
      break;
    case 'unity':
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU - Math.PI / 2; circle(ctx, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.5); ctx.stroke(); }
      break;
    case 'lantern':
      Glow.draw(ctx, 0, 0, r * 1.8, '#ffb347', 0.7);
      ctx.fillStyle = '#2b2e3b'; poly(ctx, [-r * 0.6, -r * 0.55, r * 0.6, -r * 0.55, 0, -r]); ctx.fill();
      ctx.fillStyle = '#ffcf6b'; ctx.fillRect(-r * 0.45, -r * 0.5, r * 0.9, r * 1.1);
      ctx.strokeStyle = '#2b2e3b'; ctx.lineWidth = s * 0.06; ctx.strokeRect(-r * 0.45, -r * 0.5, r * 0.9, r * 1.1);
      break;
    default: circle(ctx, 0, 0, r * 0.6); ctx.fill();
  }
  ctx.restore();
}

// ═════════════════════════════════════════════════════════════
//  렌더러 본체
// ═════════════════════════════════════════════════════════════
const Renderer = {
  canvas: null,
  ctx: null,
  k: 1,
  scale: 1,
  map: null,
  mapFor: null,
  time: 0,
  ambient: [],

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  },

  fit(availW, availH) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.max(0.2, Math.min(availW / WORLD_W, availH / WORLD_H));
    this.scale = scale;
    this.k = scale * dpr;
    const cssW = Math.floor(WORLD_W * scale), cssH = Math.floor(WORLD_H * scale);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(WORLD_W * this.k);
    this.canvas.height = Math.round(WORLD_H * this.k);
    this.mapFor = null;
    return { cssW, cssH };
  },

  // 정적 맵 레이어 (지형/길/장식) → 오프스크린 캔버스
  renderMap(ctx, g) {
    const th = g.theme;
    const rng = mulberry32(g.stage.seed * 31 + 7);
    ctx.fillStyle = th.ground;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let i = 0; i < 40; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H, r = 50 + rng() * 150;
      ctx.fillStyle = radGrad(ctx, x, y, 0, r, [rgba(th.ground2, 0.9), rgba(th.ground2, 0)]);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g.grid[r][c] === 1) continue;
        if ((r + c) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.018)'; ctx.fillRect(c * TILE, r * TILE, TILE, TILE); }
      }
    }
    const onPath = (x, y) => {
      const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
      return r >= 0 && c >= 0 && r < ROWS && c < COLS && g.grid[r][c] === 1;
    };
    if (th.ambient === 'firefly') {
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 700; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H;
        if (onPath(x, y)) continue;
        ctx.strokeStyle = rgba(th.grass, 0.25 + rng() * 0.35);
        ctx.beginPath();
        for (let j = -1; j <= 1; j++) { ctx.moveTo(x + j * 2, y); ctx.lineTo(x + j * 3 + rng() * 2 - 1, y - 3 - rng() * 4); }
        ctx.stroke();
      }
      for (let i = 0; i < 60; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H;
        if (onPath(x, y)) continue;
        ctx.fillStyle = rng() < 0.5 ? 'rgba(232,212,138,0.55)' : 'rgba(199,162,255,0.5)';
        circle(ctx, x, y, 1.3); ctx.fill();
      }
    } else if (th.ambient === 'wisp') {
      for (let i = 0; i < 70; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H, r = 10 + rng() * 34;
        if (onPath(x, y)) continue;
        ctx.fillStyle = radGrad(ctx, x, y, 0, r, ['rgba(20,40,36,0.55)', 'rgba(20,40,36,0)']);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 450; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H;
        if (onPath(x, y)) continue;
        ctx.strokeStyle = rgba(th.grass, 0.2 + rng() * 0.3);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng() * 3 - 1.5, y - 3 - rng() * 5); ctx.stroke();
      }
    } else if (th.ambient === 'snow') {
      for (let i = 0; i < 60; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H, r = 14 + rng() * 40;
        ctx.fillStyle = radGrad(ctx, x, y, 0, r, ['rgba(220,235,255,0.09)', 'rgba(220,235,255,0)']);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 500; i++) {
        const x = rng() * WORLD_W, y = rng() * WORLD_H;
        ctx.fillStyle = `rgba(230,240,255,${0.12 + rng() * 0.25})`;
        circle(ctx, x, y, 0.6 + rng() * 1.1); ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (g.grid[r][c] === 1 || rng() < 0.4) continue;
          const x = c * TILE, y = r * TILE;
          ctx.strokeRect(x + 3, y + 3, TILE / 2 - 4, TILE / 2 - 4);
          ctx.strokeRect(x + TILE / 2 + 1, y + 3, TILE / 2 - 4, TILE - 6);
          ctx.strokeRect(x + 3, y + TILE / 2 + 1, TILE / 2 - 4, TILE / 2 - 4);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 40; i++) {
        let x = rng() * WORLD_W, y = rng() * WORLD_H;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += rng() * 16 - 8; y += rng() * 16 - 8; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    // 하늘길 (비행 경로)
    ctx.save();
    ctx.setLineDash([5, 9]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(210,180,255,0.16)';
    for (const p of g.airPaths) {
      ctx.beginPath(); ctx.moveTo(p.pts[0].x, p.pts[0].y); ctx.lineTo(p.pts[1].x, p.pts[1].y); ctx.stroke();
    }
    ctx.restore();
    // 길
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (w, col, dy = 0) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      for (const p of g.paths) {
        ctx.beginPath();
        ctx.moveTo(p.pts[0].x, p.pts[0].y + dy);
        for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y + dy);
        ctx.stroke();
      }
    };
    stroke(TILE * 1.02, 'rgba(0,0,0,0.32)', 4);
    stroke(TILE * 0.94, th.pathEdge);
    stroke(TILE * 0.8, th.path);
    stroke(TILE * 0.42, rgba(th.pathSpeck, 0.22));
    for (const p of g.paths) {
      for (let d = 0; d < p.length; d += 5) {
        const pt = p.at(d);
        const off = (rng() * 2 - 1) * TILE * 0.33;
        const x = pt.x - pt.dy * off, y = pt.y + pt.dx * off;
        ctx.fillStyle = rgba(rng() < 0.5 ? th.pathSpeck : th.pathEdge, 0.35 + rng() * 0.35);
        ellipse(ctx, x, y, 0.8 + rng() * 2, 0.6 + rng() * 1.4); ctx.fill();
      }
      if (th.ambient === 'firefly') {
        for (let d = 0; d < p.length; d += 7) {
          const pt = p.at(d);
          for (const sd of [-1, 1]) {
            if (rng() < 0.5) continue;
            const off = sd * TILE * (0.42 + rng() * 0.06);
            const x = pt.x - pt.dy * off, y = pt.y + pt.dx * off;
            ctx.strokeStyle = rgba(th.grass, 0.5); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng() * 4 - 2, y - 4 - rng() * 3); ctx.stroke();
          }
        }
      }
    }
    // 등불 받침 광장
    const L = g.lantern;
    ctx.fillStyle = rgba(th.pathEdge, 0.9);
    circle(ctx, L.x, L.y, TILE * 0.78); ctx.fill();
    ctx.fillStyle = rgba(th.pathSpeck, 0.55);
    circle(ctx, L.x, L.y, TILE * 0.66); ctx.fill();
    ctx.strokeStyle = 'rgba(255,207,107,0.25)'; ctx.lineWidth = 2;
    circle(ctx, L.x, L.y, TILE * 0.6); ctx.stroke();
    // 장식
    const decos = g.decos.slice().sort((a, b) => a.r - b.r);
    for (const d of decos) drawDeco(ctx, d, d.c * TILE + TILE / 2, d.r * TILE + TILE / 2 + 4);
    // 비네트
    ctx.fillStyle = radGrad(ctx, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35, WORLD_W * 0.68, ['rgba(4,5,12,0)', 'rgba(4,5,12,0.6)']);
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  },

  ensureMap(g) {
    if (this.mapFor === g && this.map) return;
    const c = this.map || document.createElement('canvas');
    c.width = Math.round(WORLD_W * this.k);
    c.height = Math.round(WORLD_H * this.k);
    const ctx = c.getContext('2d');
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    this.renderMap(ctx, g);
    this.map = c;
    this.mapFor = g;
    this.initAmbient(g.theme.ambient);
  },

  initAmbient(kind) {
    this.ambient = [];
    const n = kind === 'snow' ? 90 : kind === 'ember' ? 45 : kind === 'wisp' ? 22 : 36;
    for (let i = 0; i < n; i++) this.ambient.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), p: rand(0, TAU), s: rand(0.6, 1.4), kind });
  },

  drawAmbient(ctx, dt) {
    for (const a of this.ambient) {
      a.p += dt;
      if (a.kind === 'firefly') {
        a.x += Math.sin(a.p * 0.7 + a.s * 5) * 12 * dt;
        a.y += Math.cos(a.p * 0.5 + a.s * 3) * 9 * dt;
        const blink = Math.max(0, Math.sin(a.p * 1.6 * a.s));
        Glow.draw(ctx, a.x, a.y, 9 * a.s, '#d8ff8a', blink * 0.7);
      } else if (a.kind === 'wisp') {
        a.x += Math.sin(a.p * 0.3 + a.s * 7) * 8 * dt;
        a.y += Math.cos(a.p * 0.25 + a.s * 2) * 6 * dt - 2 * dt;
        Glow.draw(ctx, a.x, a.y, 16 * a.s, a.s > 1 ? '#7dffb0' : '#7fd8ff', (0.3 + Math.sin(a.p * 0.9 + a.s * 5) * 0.2));
      } else if (a.kind === 'snow') {
        a.y += 26 * a.s * dt;
        a.x += (10 + Math.sin(a.p + a.s * 4) * 14) * dt;
        ctx.fillStyle = `rgba(240,248,255,${0.35 + a.s * 0.3})`;
        circle(ctx, a.x, a.y, a.s * 1.4); ctx.fill();
      } else {
        a.y -= 22 * a.s * dt;
        a.x += Math.sin(a.p * 2 + a.s) * 10 * dt;
        Glow.draw(ctx, a.x, a.y, 6 * a.s, '#ff8a4c', 0.55 + Math.sin(a.p * 6) * 0.25);
      }
      if (a.y > WORLD_H + 10) a.y = -10;
      if (a.y < -10) a.y = WORLD_H + 10;
      if (a.x > WORLD_W + 10) a.x = -10;
      if (a.x < -10) a.x = WORLD_W + 10;
    }
  },

  drawLantern(ctx, L, t) {
    const x = L.x, y = L.y;
    const flick = 1 + Math.sin(t * 9) * 0.04 + Math.sin(t * 13.7) * 0.03;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, x, y + 9, 15, 5); ctx.fill();
    ctx.fillStyle = '#3e4256'; ellipse(ctx, x, y + 5, 12, 5); ctx.fill();
    ctx.fillStyle = '#555a74'; ellipse(ctx, x, y + 3, 9, 3.6); ctx.fill();
    ctx.fillStyle = '#25283a'; ctx.fillRect(x - 2.5, y - 36, 5, 39);
    ctx.fillStyle = '#25283a'; ctx.fillRect(x - 2, y - 38, 14, 3);
    const lx = x + 9, ly = y - 26;
    ctx.strokeStyle = '#1b1d28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(lx, y - 35); ctx.lineTo(lx, ly - 12); ctx.stroke();
    const hurt = L.hurt > 0;
    const core = hurt ? '#ff6b6b' : '#ffcf6b';
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, lx, ly, 150 * flick, hurt ? '#ff4d4d' : '#ffb347', 0.28);
    Glow.draw(ctx, lx, ly, 48 * flick, core, 0.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#2b2e3b';
    poly(ctx, [lx - 9, ly - 10, lx + 9, ly - 10, lx, ly - 18]); ctx.fill();
    ctx.fillStyle = rgba(core, 0.85);
    rrect(ctx, lx - 7, ly - 10, 14, 19, 2); ctx.fill();
    ctx.strokeStyle = '#1b1d28'; ctx.lineWidth = 1.6;
    rrect(ctx, lx - 7, ly - 10, 14, 19, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, ly - 10); ctx.lineTo(lx, ly + 9); ctx.stroke();
    ctx.fillStyle = '#2b2e3b'; ctx.fillRect(lx - 8, ly + 8, 16, 3);
    flameShape(ctx, lx, ly + 4, 3, 10 * flick, t, '#fff1c9', '#ffffff');
  },

  drawPortal(ctx, p, color, t) {
    const pt = p.at(TILE * 0.9);
    const s0 = p.segs[0];
    const x = pt.x - s0.dx * TILE * 0.55, y = pt.y - s0.dy * TILE * 0.55;
    ctx.globalCompositeOperation = 'lighter';
    Glow.draw(ctx, x, y, 70, color, 0.32 + Math.sin(t * 2) * 0.06);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8,2,16,0.85)';
    ellipse(ctx, x, y, 17, 17); ctx.fill();
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const r = 22 - i * 6;
      ctx.strokeStyle = rgba(color, 0.75 - i * 0.15);
      ctx.beginPath();
      const a0 = t * (1.5 + i * 0.8) * (i % 2 ? -1 : 1);
      ctx.arc(x, y, r, a0, a0 + Math.PI * 1.2);
      ctx.stroke();
    }
  },

  rangeCircle(ctx, x, y, r, color, strong) {
    ctx.fillStyle = rgba(color, strong ? 0.1 : 0.06);
    circle(ctx, x, y, r); ctx.fill();
    ctx.save();
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -this.time * 12;
    ctx.strokeStyle = rgba(color, strong ? 0.75 : 0.45); ctx.lineWidth = 1.5;
    circle(ctx, x, y, r); ctx.stroke();
    ctx.restore();
  },

  drawFlag(ctx, x, y, color, t) {
    ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 16); ctx.stroke();
    const w = Math.sin(t * 5) * 1.5;
    ctx.fillStyle = color;
    poly(ctx, [x, y - 16, x + 10, y - 14 + w, x, y - 10]); ctx.fill();
    ctx.strokeStyle = rgba(color, 0.6); ctx.lineWidth = 1;
    ellipse(ctx, x, y + 2, 8, 3); ctx.stroke();
  },

  // ── 프레임 그리기 ──
  draw(g, view, dt) {
    this.time += dt;
    const t = this.time;
    const ctx = this.ctx;
    this.ensureMap(g);
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.fillStyle = g.theme.ground;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    if (g.shakeT > 0 && view.shake !== false) {
      const a = g.shakeAmp * (g.shakeT / 0.35);
      ctx.translate(rand(-a, a), rand(-a, a));
    }
    ctx.drawImage(this.map, 0, 0, WORLD_W, WORLD_H);

    // 지면 효과
    for (const f of g.fx) {
      if (f.type === 'scorch') {
        const a = Math.min(1, f.life / f.max * 1.5);
        ctx.fillStyle = radGrad(ctx, f.x, f.y, 0, f.r, [`rgba(15,8,4,${0.55 * a})`, 'rgba(15,8,4,0)']);
        circle(ctx, f.x, f.y, f.r); ctx.fill();
      } else if (f.type === 'rift') {
        const a = Math.min(1, f.life / 0.5);
        ctx.save(); ctx.translate(f.x, f.y);
        ctx.fillStyle = `rgba(160,90,255,${0.12 * a})`;
        circle(ctx, 0, 0, f.r); ctx.fill();
        ctx.strokeStyle = `rgba(224,139,255,${0.6 * a})`; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          const a0 = t * 1.5 + (i / 4) * TAU;
          ctx.arc(0, 0, f.r * (0.4 + i * 0.15), a0, a0 + 1.4);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    for (const gr of g.grounds) {
      const a = Math.min(1, gr.t / 0.6);
      ctx.globalCompositeOperation = 'lighter';
      Glow.draw(ctx, gr.x, gr.y, gr.r * 1.2, '#ff7a3c', (0.45 + Math.sin(t * 20 + gr.x) * 0.1) * a);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 5; i++) {
        const fx = gr.x + Math.cos(i * 1.3 + gr.y) * gr.r * 0.55, fy = gr.y + Math.sin(i * 2.1 + gr.x) * gr.r * 0.35;
        flameShape(ctx, fx, fy, 3 * a, (7 + Math.sin(t * 12 + i) * 2) * a, t + i, 'rgba(255,110,40,0.8)', 'rgba(255,220,140,0.9)');
      }
    }

    // 건설 격자
    if (view.mode === 'build' || view.mode === 'move-tower') {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (g.canBuild(c, r)) ctx.strokeRect(c * TILE + 2.5, r * TILE + 2.5, TILE - 5, TILE - 5);
        }
      }
    }

    // 포탈
    g.paths.forEach((p) => this.drawPortal(ctx, p, g.theme.portal, t));
    (g.airPortals || []).forEach((p) => this.drawPortal(ctx, p, g.theme.portal, t));

    // 선택 범위 표시
    const sel = view.selected;
    if (sel && sel.kind === 'tower') {
      const tw = sel.ref;
      if (tw.type === 'barracks') {
        this.rangeCircle(ctx, tw.x, tw.y, tw.e.range * TILE, tw.def.color, view.mode === 'rally');
        if (tw.rally) this.drawFlag(ctx, tw.rally.x, tw.rally.y, tw.def.color, t);
      } else {
        this.rangeCircle(ctx, tw.x, tw.y, tw.e.range * TILE, tw.def.color, true);
      }
      if (tw.type === 'shrine') {
        for (const o of g.towers) {
          if (o.buff && o.buff.src === tw) {
            ctx.strokeStyle = 'rgba(255,224,138,0.7)'; ctx.lineWidth = 1.5;
            ellipse(ctx, o.x, o.y + 2, 18, 7.5); ctx.stroke();
          }
        }
      }
    }
    if (sel && sel.kind === 'hero' && g.hero.alive) {
      const h = g.hero;
      if (h.range > 0) this.rangeCircle(ctx, h.x, h.y, h.range, h.def.color, false);
    }

    // 깊이 정렬 그리기
    const items = [];
    for (const tw of g.towers) items.push({ y: tw.y, k: 0, o: tw });
    for (const e of g.enemies) if (!e.flying) items.push({ y: e.y, k: 1, o: e });
    for (const u of g.units) items.push({ y: u.y, k: 2, o: u });
    if (g.hero.alive) items.push({ y: g.hero.y, k: 3, o: g.hero });
    items.push({ y: g.lantern.y, k: 4, o: g.lantern });
    for (const d of g.decos) {
      if (d.kind === 'brazier' || d.kind === 'mushroom' || d.kind === 'crystal' || d.kind === 'pool') items.push({ y: d.r * TILE + TILE / 2, k: 5, o: d });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      const o = it.o;
      switch (it.k) {
        case 0:
          if (sel && sel.kind === 'tower' && sel.ref === o) {
            ctx.strokeStyle = rgba(o.def.color, 0.9); ctx.lineWidth = 2;
            ellipse(ctx, o.x, o.y + 4, 21, 9); ctx.stroke();
          }
          drawTower(ctx, o.type, o.level, o.branch, o.x, o.y, o.angle, t + o.c * 0.37, o);
          break;
        case 1:
          if (sel && sel.kind === 'enemy' && sel.ref === o) {
            ctx.strokeStyle = 'rgba(255,93,93,0.85)'; ctx.lineWidth = 1.5;
            ellipse(ctx, o.x, o.y + o.size * 0.7, o.size * 1.2, o.size * 0.45); ctx.stroke();
          }
          drawEnemy(ctx, o, t);
          break;
        case 2: drawSoldier(ctx, o, t); break;
        case 3: drawHero(ctx, o, t, sel && sel.kind === 'hero'); break;
        case 4: this.drawLantern(ctx, o, t); break;
        case 5: {
          const x = o.c * TILE + TILE / 2, y = o.r * TILE + TILE / 2;
          ctx.globalCompositeOperation = 'lighter';
          if (o.kind === 'brazier') {
            Glow.draw(ctx, x, y - 4, 40, '#ff8a4c', 0.45 + Math.sin(t * 10 + x) * 0.08);
            ctx.globalCompositeOperation = 'source-over';
            flameShape(ctx, x, y - 1, 5, 12, t + x, '#ff7a3c', '#ffe0a0');
          } else if (o.kind === 'pool') {
            Glow.draw(ctx, x, y, 22, '#6fe0c0', 0.12 + Math.sin(t * 1.3 + x) * 0.05);
          } else if (o.kind === 'mushroom') {
            Glow.draw(ctx, x, y + 2, 20, o.seed > 0.5 ? '#7fd8ff' : '#ff9ad5', 0.35 + Math.sin(t * 1.5 + x) * 0.1);
          } else {
            Glow.draw(ctx, x, y, 26, '#7fd8ff', 0.25 + Math.sin(t * 1.2 + x) * 0.08);
          }
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
      }
    }

    // 비행 유닛
    for (const e of g.enemies) {
      if (!e.flying) continue;
      if (sel && sel.kind === 'enemy' && sel.ref === e) {
        ctx.strokeStyle = 'rgba(255,93,93,0.85)'; ctx.lineWidth = 1.5;
        ellipse(ctx, e.x, e.y + e.size * 0.7, e.size * 1.2, e.size * 0.45); ctx.stroke();
      }
      drawEnemy(ctx, e, t);
    }

    // 눈보라 오라 / 프리즘 광선
    for (const tw of g.towers) {
      if (tw.e.kind === 'aura') {
        const r = tw.e.range * TILE;
        ctx.strokeStyle = 'rgba(191,234,255,0.10)'; ctx.lineWidth = 1;
        circle(ctx, tw.x, tw.y, r); ctx.stroke();
        ctx.fillStyle = 'rgba(235,248,255,0.55)';
        for (let i = 0; i < 10; i++) {
          const a = t * 0.6 + i * 0.628 + tw.c;
          const rr = r * (0.3 + ((i * 37 + Math.floor(t * 0.5)) % 7) / 10);
          circle(ctx, tw.x + Math.cos(a) * rr, tw.y + Math.sin(a) * rr * 0.8, 1.3); ctx.fill();
        }
      }
      if (tw.e.kind === 'beam' && tw.beamTarget && tw.beamTarget.alive) {
        const tg = tw.beamTarget;
        const sx = tw.x, sy = tw.y - 36;
        const ty = tg.y - (tg.flying ? (tg.boss ? 26 : 18) : 4);
        const m = tw.beamMult || 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(196,139,255,${0.35 + Math.random() * 0.15})`;
        ctx.lineWidth = 3 + m * 1.8;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tg.x, ty); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,255,0.9)';
        ctx.lineWidth = 1 + m * 0.35;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tg.x, ty); ctx.stroke();
        Glow.draw(ctx, tg.x, ty, 10 + m * 4, '#e7c4ff', 0.8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'butt';
      }
    }

    // 투사체
    for (const p of g.projectiles) this.drawProjectile(ctx, p, t);

    // 효과
    this.drawFx(ctx, g, t);

    // 밤 조명: 어둠을 깔고 빛나는 것들 주변만 밝힘
    if (view.lighting !== false) this.drawLighting(ctx, g, t);
    this.drawBadges(ctx, g, t);

    // 환경 입자
    ctx.globalCompositeOperation = 'lighter';
    this.drawAmbient(ctx, dt);
    ctx.globalCompositeOperation = 'source-over';

    // 체력 바 (가려지지 않도록 위에)
    for (const e of g.enemies) {
      if (e.boss || e.hp < e.maxHp || (e.maxShield && e.shield < e.maxShield)) {
        const lift = e.flying ? (e.boss ? 26 : 18) : 0;
        const w = Math.max(18, e.size * 2.1);
        hpBar(ctx, e.x, e.y - lift - e.size * 1.35 - 8, w, e.hp / e.maxHp, e.maxShield ? e.shield / e.maxShield : 0);
      }
    }

    // 커서 오버레이
    this.drawOverlay(ctx, g, view, t);

    // 피격 시 붉은 테두리
    if (g.lantern.hurt > 0) {
      ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
      ctx.fillStyle = radGrad(ctx, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.45, WORLD_W * 0.7,
        ['rgba(255,40,60,0)', `rgba(255,40,60,${g.lantern.hurt * 0.45})`]);
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  },

  drawLighting(ctx, g, t) {
    const dark = g.theme.dark || 0.4;
    const s = 0.5;
    const w = Math.round(WORLD_W * s), h = Math.round(WORLD_H * s);
    let c = this.lightCanvas;
    if (!c) c = this.lightCanvas = document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const l = c.getContext('2d');
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, w, h);
    l.fillStyle = `rgba(3,4,14,${dark})`;
    l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = 'destination-out';
    l.setTransform(s, 0, 0, s, 0, 0);
    const hole = (x, y, r, a) => Glow.draw(l, x, y, r, '#ffffff', a);
    const L = g.lantern;
    const flick = 1 + Math.sin(t * 9) * 0.03 + Math.sin(t * 13.7) * 0.02;
    hole(L.x + 9, L.y - 20, 230 * flick, 1);
    hole(L.x + 9, L.y - 20, 110 * flick, 1);
    for (const tw of g.towers) hole(tw.x, tw.y - 16, tw.branch != null ? 105 : 70 + tw.level * 10, tw.disabledT > 0 ? 0.35 : 0.95);
    if (g.hero.alive) hole(g.hero.x, g.hero.y - 10, 80, 0.85);
    for (const u of g.units) hole(u.x, u.y - 6, 34, 0.5);
    for (const p of g.projectiles) hole(p.x, p.y, 28, 0.8);
    for (const e of g.enemies) {
      if (e.burnT > 0) hole(e.x, e.y, 34, 0.7);
      else if (e.boss) hole(e.x, e.y - (e.flying ? 26 : 0), 60, 0.45);
      else hole(e.x, e.y, 22, 0.3);
    }
    for (const gr of g.grounds) hole(gr.x, gr.y, gr.r * 2, 0.95);
    for (const f of g.fx) {
      const a = clamp(f.life / f.max, 0, 1);
      if (f.type === 'flash') hole(f.x, f.y, f.r * 2.2, a);
      else if (f.type === 'flame') hole(f.x, f.y, 26, a * 0.5);
      else if (f.type === 'bolt') for (const p of f.pts) hole(p.x, p.y, 50, a);
      else if (f.type === 'meteor') hole(f.x, f.y, 70 * (1 - a) + 20, 0.8);
      else if (f.type === 'rift') hole(f.x, f.y, f.r * 1.3, Math.min(1, a * 3) * 0.7);
    }
    for (const d of g.decos) {
      if (d.kind === 'brazier') hole(d.c * TILE + TILE / 2, d.r * TILE + TILE / 2, 95, 0.9);
      else if (d.kind === 'crystal' || d.kind === 'mushroom' || d.kind === 'lava' || d.kind === 'pool') hole(d.c * TILE + TILE / 2, d.r * TILE + TILE / 2, 55, 0.55);
    }
    for (const p of g.paths.concat(g.airPortals || [])) { const pt = p.at(TILE * 0.4); hole(pt.x, pt.y, 70, 0.6); }
    l.globalCompositeOperation = 'source-over';
    ctx.drawImage(c, 0, 0, WORLD_W, WORLD_H);
  },

  // 웨이브 사이: 다음 웨이브가 나올 포탈 위에 호출 배지 (누르면 조기 호출)
  drawBadges(ctx, g, t) {
    this.badges = [];
    const info = g.waveInfo;
    if (!info || g.spawning || g.state === 'won' || g.state === 'lost') return;
    if (g.state !== 'prep' && g.countdown == null) return;
    const counts = {};
    for (const s of info.spawns) {
      const fly = ENEMIES[s.type].flying;
      const key = fly ? `a${s.path}` : `g${s.path}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const spots = [];
    for (const key of Object.keys(counts)) {
      const air = key[0] === 'a';
      const idx = Number(key.slice(1));
      const p = air ? g.airPaths[idx] : g.paths[idx];
      if (!p) continue;
      const pt = p.at(TILE * 1.7);
      const near = spots.find((sp) => dist(sp.x, sp.y, pt.x, pt.y) < 30);
      if (near) { near.n += counts[key]; near.air = near.air || air; continue; }
      spots.push({ x: clamp(pt.x, 22, WORLD_W - 22), y: clamp(pt.y, 22, WORLD_H - 22), n: counts[key], air, boss: false });
    }
    const frac = g.countdown != null ? clamp(g.countdown / WAVE_GAP, 0, 1) : 1;
    const pulse = 1 + Math.sin(t * 5) * 0.06;
    for (const sp of spots) {
      const r = 16 * pulse;
      ctx.globalCompositeOperation = 'lighter';
      Glow.draw(ctx, sp.x, sp.y, 34, info.boss ? '#ff5d73' : '#ffc46b', 0.45);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(12,10,24,0.92)';
      circle(ctx, sp.x, sp.y, r); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3;
      circle(ctx, sp.x, sp.y, r - 1); ctx.stroke();
      ctx.strokeStyle = info.boss ? '#ff5d73' : '#ffc46b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r - 1, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
      ctx.fillStyle = '#fff3dc';
      ctx.font = `800 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (sp.air) { ctx.fillStyle = '#d6b8ff'; poly(ctx, [sp.x - 7, sp.y - 5, sp.x - 2, sp.y - 8, sp.x - 4, sp.y - 3]); ctx.fill(); ctx.fillStyle = '#fff3dc'; }
      ctx.fillText(String(sp.n), sp.x + (sp.air ? 2 : 0), sp.y + 1);
      this.badges.push({ x: sp.x, y: sp.y, r: r + 4 });
    }
  },

  drawProjectile(ctx, p, t) {
    const ang = Math.atan2(p.y - p.prevY, p.x - p.prevX);
    switch (p.kind) {
      case 'arrow': case 'heroArrow': case 'bolt': {
        const len = p.kind === 'bolt' ? 16 : 11;
        const col = p.kind === 'heroArrow' ? '#c8ff9a' : p.kind === 'bolt' ? '#fff3c4' : '#eadfc4';
        if (p.kind !== 'arrow') {
          ctx.globalCompositeOperation = 'lighter';
          Glow.draw(ctx, p.x, p.y, 10, p.kind === 'bolt' ? '#ffcf6b' : '#8ef08a', 0.6);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.strokeStyle = col; ctx.lineWidth = p.kind === 'bolt' ? 2 : 1.5;
        ctx.beginPath(); ctx.moveTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = col;
        poly(ctx, [p.x + Math.cos(ang) * 3, p.y + Math.sin(ang) * 3, p.x + Math.cos(ang + 2.5) * 3.5, p.y + Math.sin(ang + 2.5) * 3.5, p.x + Math.cos(ang - 2.5) * 3.5, p.y + Math.sin(ang - 2.5) * 3.5]);
        ctx.fill();
        break;
      }
      case 'ball': case 'shell': {
        const big = p.kind === 'shell';
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ellipse(ctx, p.gx, p.gy + 4, big ? 6 : 4, big ? 2.4 : 1.6); ctx.fill();
        if (big) {
          ctx.globalCompositeOperation = 'lighter';
          Glow.draw(ctx, p.x, p.y, 14, '#ff8a4c', 0.55);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = big ? '#3a2a20' : '#272a33';
        circle(ctx, p.x, p.y, big ? 5.5 : 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        circle(ctx, p.x - 1.2, p.y - 1.2, big ? 1.8 : 1.3); ctx.fill();
        break;
      }
      case 'shard': {
        ctx.globalCompositeOperation = 'lighter';
        Glow.draw(ctx, p.x, p.y, 13, '#7fd8ff', 0.8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
        ctx.fillStyle = '#e8fbff';
        poly(ctx, [6, 0, 0, 2.6, -6, 0, 0, -2.6]); ctx.fill();
        ctx.restore();
        break;
      }
      case 'orb': {
        ctx.globalCompositeOperation = 'lighter';
        Glow.draw(ctx, p.x, p.y, 16, '#e08bff', 0.9);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff0ff'; circle(ctx, p.x, p.y, 3.2); ctx.fill();
        break;
      }
    }
  },

  drawFx(ctx, g, t) {
    for (const f of g.fx) {
      const a = clamp(f.life / f.max, 0, 1);
      switch (f.type) {
        case 'spark':
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = rgba(f.color, a);
          circle(ctx, f.x, f.y, f.size * (0.4 + a * 0.6)); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          break;
        case 'flame': {
          ctx.globalCompositeOperation = 'lighter';
          const col = a > 0.66 ? '#ffe7a0' : a > 0.33 ? '#ff9a3c' : '#ff4d2a';
          Glow.draw(ctx, f.x, f.y, f.size * (2.2 - a), col, a * 0.85);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'smoke':
          ctx.fillStyle = `rgba(40,38,48,${0.4 * a})`;
          circle(ctx, f.x, f.y, f.size * (1.6 - a * 0.6)); ctx.fill();
          break;
        case 'ring': {
          const r = lerp(f.r0, f.r1, easeOutCubic(1 - a));
          ctx.strokeStyle = rgba(f.color, a * 0.9);
          ctx.lineWidth = f.w * a + 0.5;
          ellipse(ctx, f.x, f.y, r, r * 0.8); ctx.stroke();
          break;
        }
        case 'flash':
          ctx.globalCompositeOperation = 'lighter';
          Glow.draw(ctx, f.x, f.y, f.r * (0.7 + 0.5 * (1 - a)), f.color, a);
          ctx.globalCompositeOperation = 'source-over';
          break;
        case 'soul':
          ctx.globalCompositeOperation = 'lighter';
          Glow.draw(ctx, f.x, f.y, f.size * 1.4, f.color, a * 0.45);
          ctx.globalCompositeOperation = 'source-over';
          break;
        case 'bolt': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const pts = [];
          for (let i = 0; i < f.pts.length - 1; i++) {
            const p0 = f.pts[i], p1 = f.pts[i + 1];
            const n = 5;
            for (let k = 0; k < n; k++) {
              const q = k / n;
              const jitter = k === 0 ? 0 : (Math.random() - 0.5) * 12;
              const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
              pts.push(p0.x + dx * q - (dy / l) * jitter, p0.y + dy * q + (dx / l) * jitter);
            }
          }
          const last = f.pts[f.pts.length - 1];
          pts.push(last.x, last.y);
          for (const [w, col] of [[6, rgba(f.color, 0.4 * a)], [1.6, `rgba(255,255,255,${a})`]]) {
            ctx.strokeStyle = col; ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.stroke();
          }
          for (let i = 1; i < f.pts.length; i++) Glow.draw(ctx, f.pts[i].x, f.pts[i].y, 14, f.color, a * 0.8);
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineCap = 'butt';
          break;
        }
        case 'meteor': {
          const q = 1 - a;
          const sx = f.x + 220, sy = f.y - 360;
          const mx = lerp(sx, f.x, q), my = lerp(sy, f.y, q);
          ctx.fillStyle = `rgba(0,0,0,${0.25 * q})`;
          ellipse(ctx, f.x, f.y, 10 + q * 14, (10 + q * 14) * 0.4); ctx.fill();
          ctx.strokeStyle = `rgba(255,93,93,${0.5 * (1 - q * 0.5)})`; ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]); ellipse(ctx, f.x, f.y, TILE * 1.1, TILE * 0.9); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,150,70,0.5)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(lerp(sx, f.x, Math.max(0, q - 0.25)), lerp(sy, f.y, Math.max(0, q - 0.25))); ctx.lineTo(mx, my); ctx.stroke();
          ctx.lineCap = 'butt';
          Glow.draw(ctx, mx, my, 26, '#ff8a4c', 1);
          Glow.draw(ctx, mx, my, 10, '#fff1c9', 1);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'rain': {
          ctx.strokeStyle = `rgba(230,255,210,${a})`; ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const ox = (i - 1) * 7, oy = -30 * a - i * 4;
            ctx.moveTo(f.x + ox + 4, f.y + oy - 12); ctx.lineTo(f.x + ox, f.y + oy);
          }
          ctx.stroke();
          break;
        }
        case 'text': {
          const al = Math.min(1, a * 2.2);
          ctx.font = `800 ${f.size}px ${FONT}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = `rgba(10,10,20,${al * 0.85})`;
          ctx.strokeText(f.text, f.x, f.y);
          ctx.fillStyle = rgba(f.color, al);
          ctx.fillText(f.text, f.x, f.y);
          break;
        }
      }
    }
  },

  drawOverlay(ctx, g, view, t) {
    if (view.hoverX == null) return;
    const hx = view.hoverX, hy = view.hoverY;
    if (view.mode === 'build' && view.buildType) {
      const c = Math.floor(hx / TILE), r = Math.floor(hy / TILE);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      const ok = g.canBuild(c, r);
      const afford = g.gold >= g.buildCost(view.buildType);
      const good = ok && afford;
      ctx.fillStyle = good ? 'rgba(120,255,160,0.16)' : 'rgba(255,90,90,0.18)';
      ctx.strokeStyle = good ? 'rgba(120,255,160,0.8)' : 'rgba(255,90,90,0.8)';
      ctx.lineWidth = 1.5;
      rrect(ctx, c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4, 6); ctx.fill(); ctx.stroke();
      if (ok) {
        const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
        const s = towerStats(view.buildType, 0, null);
        let range = s.range * (1 + g.mods.range);
        if (view.buildType !== 'shrine') {
          // 미리보기에서도 근처 성소 사거리 버프 반영
          let br = 0;
          for (const sh of g.towers) if (sh.type === 'shrine' && dist(x, y, sh.x, sh.y) <= sh.e.range * TILE + 1) br = Math.max(br, sh.e.buffRange || 0);
          range = (s.range + br) * (1 + g.mods.range);
        }
        this.rangeCircle(ctx, x, y, range * TILE, TOWERS[view.buildType].color, true);
        if (view.buildType === 'barracks') {
          const np = g.nearestPathPoint(x, y);
          if (np) this.drawFlag(ctx, np.x, np.y, TOWERS.barracks.color, t);
        }
        ctx.globalAlpha = 0.6;
        drawTower(ctx, view.buildType, 0, null, x, y, -Math.PI / 2, t, {});
        ctx.globalAlpha = 1;
      }
    } else if (view.mode === 'spell' || view.mode === 'skill') {
      let r, col;
      if (view.mode === 'spell') { r = SPELLS[view.spellId].radius ? SPELLS[view.spellId].radius * TILE : TILE * 0.9; col = SPELLS[view.spellId].color; }
      else { r = g.hero.def.skill.radius * TILE; col = g.hero.def.color; }
      this.rangeCircle(ctx, hx, hy, r, col, true);
      ctx.globalCompositeOperation = 'lighter';
      Glow.draw(ctx, hx, hy, r * 0.6, col, 0.25);
      ctx.globalCompositeOperation = 'source-over';
      if (view.spellId === 'reinforce') {
        const np = g.nearestPathPoint(hx, hy);
        if (np && np.d < TILE * 2) this.drawFlag(ctx, np.x, np.y, '#9be37b', t);
      }
    } else if (view.mode === 'rally' && view.selected && view.selected.kind === 'tower') {
      const tw = view.selected.ref;
      const np = g.nearestPathPoint(hx, hy);
      const ok = np && np.d < TILE * 0.9 && dist(np.x, np.y, tw.x, tw.y) <= tw.e.range * TILE;
      if (np) this.drawFlag(ctx, np.x, np.y, ok ? '#9be37b' : '#ff5d5d', t);
    } else if (view.selected && view.selected.kind === 'hero' && g.hero.alive && view.mode === 'none') {
      const h = g.hero;
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = rgba(h.def.color, 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = rgba(h.def.color, 0.9); ctx.lineWidth = 1.5;
      ellipse(ctx, hx, hy, 9, 4); ctx.stroke();
    }
    if (view.moveMarker && view.moveMarker.t > 0) {
      const m = view.moveMarker;
      ctx.strokeStyle = `rgba(255,255,255,${m.t})`; ctx.lineWidth = 2;
      ellipse(ctx, m.x, m.y, 12 * (1.4 - m.t * 0.4), 5 * (1.4 - m.t * 0.4)); ctx.stroke();
    }
  },
};

// ── UI용 아이콘 그리기 ──
const Icons = {
  prep(canvas, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return ctx;
  },
  tower(canvas, type, level = 0, branch = null, size = 48) {
    const ctx = this.prep(canvas, size, size);
    const k = size / 56;
    ctx.translate(size / 2, size * 0.66);
    ctx.scale(k, k);
    drawTower(ctx, type, level, branch, 0, 0, -0.55, 0.4, {});
  },
  enemy(canvas, type, size = 48) {
    const ctx = this.prep(canvas, size, size);
    const def = ENEMIES[type];
    const k = Math.min(1.6, (size * 0.36) / def.size);
    ctx.translate(size / 2, size * (def.flying ? 0.68 : 0.6));
    ctx.scale(k, k);
    drawEnemy(ctx, { type, x: 0, y: 0, size: def.size, dx: 1, dy: 0, walk: 0, id: 1, flying: def.flying, boss: def.boss, hitFlash: 0, shield: 0, slowT: 0, freezeT: 0, burnT: 0, stunT: 0 }, 0.3);
  },
  hero(canvas, id, size = 56) {
    const ctx = this.prep(canvas, size, size);
    ctx.translate(size / 2, size * 0.8);
    const k = size / 30;
    Glow.draw(ctx, 0, -size * 0.3, size * 0.6, HEROES[id].color, 0.35);
    ctx.scale(k, k);
    drawHeroFigure(ctx, id, 0.4, 0, 0);
  },
  sigil(canvas, sigil, color, size = 56) {
    const ctx = this.prep(canvas, size, size);
    drawSigil(ctx, sigil, size / 2, size / 2, size * 0.8, color);
  },
  spell(canvas, id, size = 44) {
    const ctx = this.prep(canvas, size, size);
    const c = size / 2;
    if (id === 'meteor') {
      Glow.draw(ctx, c + 2, c + 2, size * 0.45, '#ff8a4c', 0.9);
      ctx.strokeStyle = 'rgba(255,170,90,0.7)'; ctx.lineWidth = size * 0.12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c + size * 0.3, c - size * 0.32); ctx.lineTo(c, c); ctx.stroke();
      ctx.fillStyle = '#ffe9c4'; circle(ctx, c, c + 1, size * 0.12); ctx.fill();
    } else {
      ctx.translate(c, c + size * 0.22);
      ctx.scale(size / 26, size / 26);
      drawSoldier(ctx, { x: -4, y: 0, style: 'militia', walk: 0, face: 1, swing: 0, hp: 1, maxHp: 1, stunT: 0, ttl: 0, spawnT: 0 }, 0);
      drawSoldier(ctx, { x: 5, y: 2, style: 'militia', walk: 3, face: 1, swing: 0, hp: 1, maxHp: 1, stunT: 0, ttl: 0, spawnT: 0 }, 0);
    }
  },
  stageThumb(canvas, stageIdx, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${WORLD_W} / ${WORLD_H}`;
    const ctx = canvas.getContext('2d');
    const k = (w * dpr) / WORLD_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const g = new Game({ stage: stageIdx, headless: true });
    Renderer.renderMap(ctx, g);
    Renderer.drawLantern(ctx, g.lantern, 0.5);
    g.paths.forEach((p) => Renderer.drawPortal(ctx, p, g.theme.portal, 0.5));
  },
};
