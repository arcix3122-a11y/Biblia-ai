const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

GlobalFonts.registerFromPath('C:/Windows/Fonts/ariblk.ttf', 'ArialBlack');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf', 'SegoeBold');

const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const GREEN = '#53FC18';
const GREEN_D = '#2faa0d';
const BG = '#0e0e10';
const WHITE = '#ffffff';

function save(canvas, name) {
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('wrote', name, (buf.length / 1024).toFixed(1) + 'KB');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dotGrid(ctx, w, h, color, step, rad, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let x = step / 2; x < w; x += step) {
    for (let y = step / 2; y < h; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- AVATAR 512x512 ----------
function avatar() {
  const S = 512;
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  // bg
  ctx.fillStyle = BG;
  roundRect(ctx, 0, 0, S, S, 96);
  ctx.fill();
  dotGrid(ctx, S, S, GREEN, 34, 2, 0.07);
  // ring
  ctx.lineWidth = 18;
  ctx.strokeStyle = GREEN;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2 - 18, 168, 0, Math.PI * 2);
  ctx.stroke();
  // monogram A
  ctx.fillStyle = GREEN;
  ctx.font = '260px ArialBlack';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', S / 2, S / 2 - 30);
  // handle
  ctx.fillStyle = WHITE;
  ctx.font = '54px ArialBlack';
  ctx.fillText('331', S / 2, S / 2 + 168);
  save(c, 'avatar.png');
}

// ---------- BANNER (wide) ----------
function banner(w, h, name) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0a0a0b');
  g.addColorStop(0.55, '#101512');
  g.addColorStop(1, '#0a160a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  dotGrid(ctx, w, h, GREEN, 40, 2.4, 0.06);
  // left neon bar
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, 16, h);
  // diagonal accent
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(w * 0.66, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(w * 0.78, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // name
  const cx = w * 0.06;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = WHITE;
  ctx.font = `${Math.round(h * 0.30)}px ArialBlack`;
  ctx.fillText('ARCZI', cx, h * 0.40);
  ctx.fillStyle = GREEN;
  const aw = ctx.measureText('ARCZI').width;
  ctx.fillText('331', cx + aw + 18, h * 0.40);
  // subtitle
  ctx.fillStyle = GREEN;
  ctx.font = `${Math.round(h * 0.085)}px SegoeBold`;
  ctx.fillText('FORTNITE  •  PL  •  LIVE', cx + 4, h * 0.66);
  ctx.fillStyle = '#9a9a9a';
  ctx.font = `${Math.round(h * 0.07)}px SegoeBold`;
  ctx.fillText('kick.com/arczi331', cx + 4, h * 0.80);
  save(c, name);
}

// ---------- EMOTE helpers ----------
function emoteBase(S) {
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  return { c, ctx };
}
function face(ctx, S, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = S * 0.045;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.40, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
function eyes(ctx, S, open) {
  ctx.fillStyle = '#0a0a0a';
  const ey = S * 0.42, ex = S * 0.16, r = S * (open ? 0.075 : 0.055);
  ctx.beginPath(); ctx.arc(S / 2 - ex, ey, r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(S / 2 + ex, ey, r, 0, Math.PI * 2); ctx.fill();
}

function emoteHappy() {
  const S = 512; const { c, ctx } = emoteBase(S);
  face(ctx, S, GREEN);
  eyes(ctx, S, false);
  ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = S * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(S / 2, S * 0.52, S * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  save(c, 'emote_happy.png');
}
function emoteSad() {
  const S = 512; const { c, ctx } = emoteBase(S);
  face(ctx, S, '#7fd6ff');
  eyes(ctx, S, false);
  ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = S * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(S / 2, S * 0.70, S * 0.16, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  // tear
  ctx.fillStyle = '#4aa3ff';
  ctx.beginPath(); ctx.arc(S / 2 - S * 0.16, S * 0.58, S * 0.04, 0, Math.PI * 2); ctx.fill();
  save(c, 'emote_sad.png');
}
function emotePog() {
  const S = 512; const { c, ctx } = emoteBase(S);
  face(ctx, S, GREEN);
  eyes(ctx, S, true);
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath(); ctx.ellipse(S / 2, S * 0.62, S * 0.10, S * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  save(c, 'emote_pog.png');
}
function emoteLove() {
  const S = 512; const { c, ctx } = emoteBase(S);
  ctx.fillStyle = GREEN;
  const cx = S / 2, cy = S * 0.46, u = S * 0.20;
  ctx.beginPath();
  ctx.moveTo(cx, cy + u);
  ctx.bezierCurveTo(cx - u * 2, cy - u * 0.6, cx - u * 0.9, cy - u * 1.5, cx, cy - u * 0.5);
  ctx.bezierCurveTo(cx + u * 0.9, cy - u * 1.5, cx + u * 2, cy - u * 0.6, cx, cy + u);
  ctx.closePath();
  ctx.fill();
  save(c, 'emote_love.png');
}
function emoteFire() {
  const S = 512; const { c, ctx } = emoteBase(S);
  function flame(scale, color, oy) {
    ctx.fillStyle = color;
    const cx = S / 2, by = S * 0.82;
    ctx.beginPath();
    ctx.moveTo(cx, by);
    ctx.bezierCurveTo(cx - 150 * scale, by - 60 * scale, cx - 110 * scale, S * 0.30 + oy, cx - 30 * scale, S * 0.22 + oy);
    ctx.bezierCurveTo(cx - 40 * scale, S * 0.40 + oy, cx + 10 * scale, S * 0.36 + oy, cx + 5 * scale, S * 0.16 + oy);
    ctx.bezierCurveTo(cx + 80 * scale, S * 0.30 + oy, cx + 130 * scale, by - 50 * scale, cx, by);
    ctx.closePath();
    ctx.fill();
  }
  flame(1.0, GREEN_D, 0);
  flame(0.62, GREEN, S * 0.10);
  flame(0.3, '#d9ffce', S * 0.20);
  save(c, 'emote_fire.png');
}
function textEmote(text, name, color) {
  const S = 512; const { c, ctx } = emoteBase(S);
  ctx.fillStyle = color || GREEN;
  roundRect(ctx, S * 0.08, S * 0.08, S * 0.84, S * 0.84, S * 0.18);
  ctx.fill();
  ctx.fillStyle = BG;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs2 = text.length > 1 ? S * 0.42 : S * 0.6;
  ctx.font = `${fs2}px ArialBlack`;
  ctx.fillText(text, S / 2, S / 2 + S * 0.02);
  save(c, name);
}

// ---------- SUB BADGES ----------
function badge(name, ringColor, label) {
  const S = 288; const c = createCanvas(S, S); const ctx = c.getContext('2d');
  // outer ring
  ctx.fillStyle = ringColor;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2); ctx.fill();
  // inner
  ctx.fillStyle = BG;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.34, 0, Math.PI * 2); ctx.fill();
  // label
  ctx.fillStyle = ringColor;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${S * 0.30}px ArialBlack`;
  ctx.fillText(label, S / 2, S / 2 + S * 0.02);
  save(c, name);
}

avatar();
banner(1200, 480, 'banner.png');
banner(1920, 1080, 'banner_offline.png');
emoteHappy();
emoteSad();
emotePog();
emoteLove();
emoteFire();
textEmote('W', 'emote_w.png', GREEN);
textEmote('L', 'emote_l.png', '#ff5470');
textEmote('GG', 'emote_gg.png', GREEN);
badge('badge_standard.png', '#cd7f32', '1');
badge('badge_3m.png', '#c0c0c0', '3');
badge('badge_6m.png', '#ffd23f', '6');
badge('badge_12m.png', GREEN, '12');
console.log('DONE');
