/* Calculus — A Visual Field Guide: interactive logic */

function setupCanvas(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(2, Math.floor(rect.width * dpr));
  canvas.height = Math.max(2, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height, dpr };
}

function drawGrid(ctx, w, h, view) {
  const minor = 0.1;
  const sx = x => (x - view.xMin) / (view.xMax - view.xMin) * w;
  const sy = y => h - (y - view.yMin) / (view.yMax - view.yMin) * h;
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(11, 37, 69, 0.07)';
  ctx.beginPath();
  for (let x = Math.ceil(view.xMin / minor) * minor; x <= view.xMax; x += minor) { const px = sx(x); ctx.moveTo(px, 0); ctx.lineTo(px, h); }
  for (let y = Math.ceil(view.yMin / minor) * minor; y <= view.yMax; y += minor) { const py = sy(y); ctx.moveTo(0, py); ctx.lineTo(w, py); }
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(11, 37, 69, 0.18)';
  ctx.beginPath();
  for (let x = Math.ceil(view.xMin); x <= view.xMax; x++) { const px = sx(x); ctx.moveTo(px, 0); ctx.lineTo(px, h); }
  for (let y = Math.ceil(view.yMin); y <= view.yMax; y++) { const py = sy(y); ctx.moveTo(0, py); ctx.lineTo(w, py); }
  ctx.stroke();

  const x0 = sx(0), y0 = sy(0);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(11, 37, 69, 0.45)';
  ctx.beginPath();
  if (x0 >= 0 && x0 <= w) { ctx.moveTo(x0, 0); ctx.lineTo(x0, h); }
  if (y0 >= 0 && y0 <= h) { ctx.moveTo(0, y0); ctx.lineTo(w, y0); }
  ctx.stroke();

  ctx.fillStyle = 'rgba(11, 37, 69, 0.55)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let x = Math.ceil(view.xMin); x <= view.xMax; x++) {
    if (x === 0) continue;
    const px = sx(x);
    if (px > 12 && px < w - 12) ctx.fillText(x, px, y0 + 4);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let y = Math.ceil(view.yMin); y <= view.yMax; y++) {
    if (y === 0) continue;
    const py = sy(y);
    if (py > 8 && py < h - 8) ctx.fillText(y, x0 - 4, py);
  }
}

function plotFn(ctx, f, view, w, h, options = {}) {
  const { color = '#0B2545', width = 2, dash = [], samples = 600 } = options;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
  ctx.beginPath();
  const dx = (view.xMax - view.xMin) / samples;
  let started = false;
  for (let i = 0; i <= samples; i++) {
    const x = view.xMin + i * dx;
    let y;
    try { y = f(x); } catch (e) { started = false; continue; }
    if (!isFinite(y) || Math.abs(y) > 1e6) { started = false; continue; }
    const px = (x - view.xMin) / (view.xMax - view.xMin) * w;
    const py = h - (y - view.yMin) / (view.yMax - view.yMin) * h;
    if (py < -1000 || py > h + 1000) { started = false; continue; }
    if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

const mathToPx = (x, y, view, w, h) => [
  (x - view.xMin) / (view.xMax - view.xMin) * w,
  h - (y - view.yMin) / (view.yMax - view.yMin) * h
];
const pxToMath = (px, py, view, w, h) => [
  px / w * (view.xMax - view.xMin) + view.xMin,
  (h - py) / h * (view.yMax - view.yMin) + view.yMin
];

/* ---------- HERO ---------- */
class HeroViz {
  constructor() {
    this.canvas = document.getElementById('hero-canvas');
    this.x = -Math.PI; this.speed = 0.7; this.direction = 1;
    this.range = Math.PI * 1.5; this.playing = true;
    this.lastT = performance.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
    this.canvas.addEventListener('click', () => { this.playing = !this.playing; });
  }
  resize() {
    const r = setupCanvas(this.canvas);
    this.ctx = r.ctx; this.w = r.w; this.h = r.h;
    this.split = this.h * 0.62;
    this.viewTop = { xMin: -Math.PI * 1.2, xMax: Math.PI * 1.2, yMin: -1.6, yMax: 1.6 };
    this.viewBot = { xMin: -Math.PI * 1.2, xMax: Math.PI * 1.2, yMin: -1.6, yMax: 1.6 };
  }
  loop(t) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    if (this.playing) {
      this.x += this.direction * this.speed * dt;
      if (this.x > this.range) { this.x = this.range; this.direction = -1; }
      if (this.x < -this.range) { this.x = -this.range; this.direction = 1; }
    }
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  }
  draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, this.split); ctx.clip();
    drawGrid(ctx, w, this.split, this.viewTop);
    this.drawTop();
    ctx.restore();

    ctx.strokeStyle = 'rgba(11, 37, 69, 0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, this.split); ctx.lineTo(w, this.split); ctx.stroke();

    ctx.save(); ctx.beginPath(); ctx.rect(0, this.split, w, h - this.split); ctx.clip();
    ctx.translate(0, this.split);
    const bh = h - this.split;
    drawGrid(ctx, w, bh, this.viewBot);
    this.drawBottom(bh);
    ctx.restore();
    this.updateReadout();
  }
  drawTop() {
    const { ctx, w } = this, H = this.split, f = Math.sin, fp = Math.cos;
    plotFn(ctx, f, this.viewTop, w, H, { color: '#0B2545', width: 2.4 });
    const x = this.x, slope = fp(x), y = f(x);
    const [px, py] = mathToPx(x, y, this.viewTop, w, H);
    const x1 = this.viewTop.xMin, x2 = this.viewTop.xMax;
    const [tx1, ty1] = mathToPx(x1, y + slope * (x1 - x), this.viewTop, w, H);
    const [tx2, ty2] = mathToPx(x2, y + slope * (x2 - x), this.viewTop, w, H);
    ctx.strokeStyle = 'rgba(215, 92, 42, 0.9)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2); ctx.stroke();

    const [pxBase] = mathToPx(x, 0, this.viewTop, w, H);
    ctx.strokeStyle = 'rgba(215, 92, 42, 0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(pxBase, py); ctx.lineTo(pxBase, H); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#D75C2A'; ctx.strokeStyle = '#FCF9EF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    const triDx = 0.4, triDy = slope * triDx;
    const [a1x, a1y] = mathToPx(x, y, this.viewTop, w, H);
    const [a2x, a2y] = mathToPx(x + triDx, y, this.viewTop, w, H);
    const [a3x, a3y] = mathToPx(x + triDx, y + triDy, this.viewTop, w, H);
    ctx.strokeStyle = 'rgba(215, 92, 42, 0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(a1x, a1y); ctx.lineTo(a2x, a2y); ctx.moveTo(a2x, a2y); ctx.lineTo(a3x, a3y); ctx.stroke();
  }
  drawBottom(bh) {
    const { ctx, w } = this, fp = Math.cos;
    plotFn(ctx, fp, this.viewBot, w, bh, { color: 'rgba(11, 37, 69, 0.4)', width: 1.5 });
    const samples = 200, xStart = -this.range;
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const xi = xStart + (this.x - xStart) * (i / samples);
      const [px, py] = mathToPx(xi, fp(xi), this.viewBot, w, bh);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#D75C2A'; ctx.lineWidth = 2.5; ctx.stroke();

    const [px, py] = mathToPx(this.x, fp(this.x), this.viewBot, w, bh);
    ctx.fillStyle = '#D75C2A'; ctx.strokeStyle = '#FCF9EF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = 'rgba(215, 92, 42, 0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, bh); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(11, 37, 69, 0.55)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText("f′(x) = cos(x) — traced by the slope above", 12, bh - 8);
  }
  updateReadout() {
    const x = this.x, fx = Math.sin(x), s = Math.cos(x);
    const sg = v => (v >= 0 ? '+' : '');
    document.getElementById('hero-x').textContent = sg(x) + x.toFixed(3);
    document.getElementById('hero-fx').textContent = sg(fx) + fx.toFixed(3);
    document.getElementById('hero-slope').textContent = sg(s) + s.toFixed(3);
    document.getElementById('hero-eq').textContent =
      `y = ${fx.toFixed(2)} ${s >= 0 ? '+' : '−'} ${Math.abs(s).toFixed(2)}(x − ${x.toFixed(2)})`;
  }
}

/* ---------- DERIVATIVES ---------- */
const FN_LIBRARY = {
  sin: { f: x => Math.sin(x), fp: x => Math.cos(x), view: { xMin: -Math.PI * 1.2, xMax: Math.PI * 1.2, yMin: -2, yMax: 2 } },
  x2:  { f: x => x * x, fp: x => 2 * x, view: { xMin: -3, xMax: 3, yMin: -2, yMax: 6 } },
  x3:  { f: x => x * x * x, fp: x => 3 * x * x, view: { xMin: -2.2, xMax: 2.2, yMin: -5, yMax: 5 } },
  exp: { f: x => Math.exp(x), fp: x => Math.exp(x), view: { xMin: -2, xMax: 2, yMin: -1, yMax: 9 } },
  log: { f: x => Math.log(x), fp: x => 1 / x, view: { xMin: 0.05, xMax: 6, yMin: -3, yMax: 2.5 } }
};

class DerivativeViz {
  constructor() {
    this.topCanvas = document.getElementById('deriv-top');
    this.botCanvas = document.getElementById('deriv-bot');
    this.fnKey = 'sin'; this.x = 0.6;
    this.zoom = 1; this.panX = 0; this.panY = 0;
    this.dragging = false; this.hovering = false;
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.draw(); });
    this.attachEvents();
    this.draw();
  }
  resize() {
    const a = setupCanvas(this.topCanvas), b = setupCanvas(this.botCanvas);
    this.topCtx = a.ctx; this.topW = a.w; this.topH = a.h;
    this.botCtx = b.ctx; this.botW = b.w; this.botH = b.h;
  }
  get fn() { return FN_LIBRARY[this.fnKey]; }
  get viewTop() {
    const v = this.fn.view;
    const cx = (v.xMin + v.xMax) / 2 + this.panX, cy = (v.yMin + v.yMax) / 2 + this.panY;
    const hw = (v.xMax - v.xMin) / 2 / this.zoom, hh = (v.yMax - v.yMin) / 2 / this.zoom;
    return { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh };
  }
  get viewBot() {
    const v = this.fn.view;
    const cx = (v.xMin + v.xMax) / 2 + this.panX;
    const hw = (v.xMax - v.xMin) / 2 / this.zoom;
    const yRange = (v.yMax - v.yMin) / 2;
    return { xMin: cx - hw, xMax: cx + hw, yMin: -yRange * 0.8 + this.panY, yMax: yRange * 0.8 + this.panY };
  }
  draw() { this.drawTop(); this.drawBot(); this.updateReadout(); }
  drawTop() {
    const { topCtx: ctx, topW: w, topH: h } = this;
    ctx.clearRect(0, 0, w, h);
    const vt = this.viewTop;
    drawGrid(ctx, w, h, vt);
    plotFn(ctx, this.fn.f, vt, w, h, { color: '#0B2545', width: 2.5 });

    const x = this.x, f = this.fn.f, fp = this.fn.fp;
    const y = f(x), m = fp(x);
    const [tx1, ty1] = mathToPx(vt.xMin, y + m * (vt.xMin - x), vt, w, h);
    const [tx2, ty2] = mathToPx(vt.xMax, y + m * (vt.xMax - x), vt, w, h);
    ctx.strokeStyle = '#D75C2A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2); ctx.stroke();

    const [px, py] = mathToPx(x, y, vt, w, h);
    const [, py0] = mathToPx(x, 0, vt, w, h);
    ctx.strokeStyle = 'rgba(215, 92, 42, 0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(px, Math.min(py, py0)); ctx.lineTo(px, Math.max(py, py0)); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#D75C2A'; ctx.strokeStyle = '#FCF9EF'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    if (this.hovering) {
      ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      const label = `m = ${m >= 0 ? '+' : ''}${m.toFixed(3)}`;
      const tx = Math.min(px + 14, w - 80), ty = Math.max(py - 14, 14);
      const mw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(252, 249, 239, 0.95)'; ctx.fillRect(tx - 6, ty - 12, mw + 12, 18);
      ctx.strokeStyle = 'rgba(11, 37, 69, 0.3)'; ctx.lineWidth = 1; ctx.strokeRect(tx - 6, ty - 12, mw + 12, 18);
      ctx.fillStyle = '#0B2545'; ctx.fillText(label, tx, ty);
    }
  }
  drawBot() {
    const { botCtx: ctx, botW: w, botH: h } = this;
    ctx.clearRect(0, 0, w, h);
    const vb = this.viewBot;
    drawGrid(ctx, w, h, vb);
    plotFn(ctx, this.fn.fp, vb, w, h, { color: '#D75C2A', width: 2.2 });
    const m = this.fn.fp(this.x);
    const [px, py] = mathToPx(this.x, m, vb, w, h);
    ctx.strokeStyle = 'rgba(11, 37, 69, 0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0B2545'; ctx.strokeStyle = '#FCF9EF'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  updateReadout() {
    const x = this.x, fx = this.fn.f(x), d = this.fn.fp(x);
    const sg = v => (v >= 0 ? '+' : '');
    document.getElementById('deriv-x-val').textContent = sg(x) + x.toFixed(2);
    document.getElementById('deriv-fx-val').textContent = sg(fx) + fx.toFixed(2);
    document.getElementById('deriv-dfx-val').textContent = sg(d) + d.toFixed(2);
  }
  attachEvents() {
    const c = this.topCanvas;
    const getMouse = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener('mousedown', e => {
      const m = getMouse(e);
      this.x = pxToMath(m.x, m.y, this.viewTop, this.topW, this.topH)[0];
      this.dragging = true; this.draw();
    });
    window.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      const m = { x: e.clientX - r.left, y: e.clientY - r.top };
      const inCanvas = m.x >= 0 && m.x <= this.topW && m.y >= 0 && m.y <= this.topH;
      if (this.dragging) {
        const [mx] = pxToMath(m.x, m.y, this.viewTop, this.topW, this.topH);
        this.x = Math.max(this.viewTop.xMin, Math.min(this.viewTop.xMax, mx));
        this.draw();
      } else if (inCanvas) { this.hovering = true; this.draw(); }
      else if (this.hovering) { this.hovering = false; this.draw(); }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });

    c.addEventListener('wheel', e => {
      e.preventDefault();
      const m = getMouse(e);
      const [mx, my] = pxToMath(m.x, m.y, this.viewTop, this.topW, this.topH);
      this.zoom = Math.max(0.3, Math.min(5, this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      const [mx2, my2] = pxToMath(m.x, m.y, this.viewTop, this.topW, this.topH);
      this.panX += mx - mx2; this.panY += my - my2;
      this.draw();
    }, { passive: false });

    document.getElementById('fn-selector').addEventListener('click', e => {
      const btn = e.target.closest('button[data-fn]');
      if (!btn) return;
      this.fnKey = btn.dataset.fn;
      this.zoom = 1; this.panX = 0; this.panY = 0;
      const v = FN_LIBRARY[this.fnKey].view;
      this.x = Math.max(v.xMin + 0.2, Math.min(v.xMax - 0.2, this.x));
      document.querySelectorAll('#fn-selector button').forEach(b => b.classList.toggle('active', b === btn));
      this.draw();
    });
  }
}

/* ---------- INTEGRALS ---------- */
class IntegralViz {
  constructor() {
    this.canvas = document.getElementById('integral-canvas');
    this.n = 16; this.method = 'mid'; this.a = 0; this.b = 6;
    this.f = x => 0.4 * x * x + 0.5;
    this.F = x => 0.4 * x * x * x / 3 + 0.5 * x;
    this.view = { xMin: -0.5, xMax: 7, yMin: -0.5, yMax: 16 };
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.draw(); });
    this.attachEvents();
    this.draw();
  }
  resize() { const r = setupCanvas(this.canvas); this.ctx = r.ctx; this.w = r.w; this.h = r.h; }
  riemann() {
    const dx = (this.b - this.a) / this.n, rects = [];
    for (let i = 0; i < this.n; i++) {
      const xL = this.a + i * dx, xR = xL + dx;
      let h;
      if (this.method === 'left') h = this.f(xL);
      else if (this.method === 'right') h = this.f(xR);
      else if (this.method === 'mid') h = this.f((xL + xR) / 2);
      else h = (this.f(xL) + this.f(xR)) / 2;
      rects.push({ xL, xR, h, fL: this.f(xL), fR: this.f(xR) });
    }
    return { rects, dx };
  }
  draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h, this.view);
    const { rects, dx } = this.riemann();
    ctx.fillStyle = 'rgba(42, 117, 83, 0.22)'; ctx.strokeStyle = 'rgba(42, 117, 83, 0.7)'; ctx.lineWidth = 1;
    rects.forEach(r => {
      const [px1, py1] = mathToPx(r.xL, 0, this.view, w, h);
      const [px2, py2] = mathToPx(r.xR, r.h, this.view, w, h);
      ctx.beginPath(); ctx.rect(px1, py2, px2 - px1, py1 - py2); ctx.fill(); ctx.stroke();
      if (this.method === 'trap') {
        const [, pyL] = mathToPx(r.xL, r.fL, this.view, w, h);
        const [, pyR] = mathToPx(r.xR, r.fR, this.view, w, h);
        ctx.beginPath(); ctx.moveTo(px1, pyL); ctx.lineTo(px2, pyR);
        ctx.strokeStyle = 'rgba(42, 117, 83, 0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.strokeStyle = 'rgba(42, 117, 83, 0.7)'; ctx.lineWidth = 1;
      }
    });
    ctx.strokeStyle = 'rgba(42, 117, 83, 0.25)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]);
    rects.forEach(r => {
      const [px] = mathToPx(r.xL, 0, this.view, w, h);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    });
    ctx.setLineDash([]);
    plotFn(ctx, this.f, this.view, w, h, { color: '#0B2545', width: 2.5 });
    [this.a, this.b].forEach(x => {
      const [px, py] = mathToPx(x, this.f(x), this.view, w, h);
      ctx.fillStyle = '#0B2545'; ctx.strokeStyle = '#FCF9EF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    const exact = this.F(this.b) - this.F(this.a);
    const approx = rects.reduce((s, r) => s + r.h * dx, 0);
    const err = approx - exact;
    document.getElementById('integral-n-val').textContent = this.n;
    document.getElementById('integral-exact').textContent = exact.toFixed(3);
    document.getElementById('integral-approx').textContent = approx.toFixed(4);
    document.getElementById('integral-error').textContent = (err >= 0 ? '+' : '−') + Math.abs(err).toFixed(4);
    document.getElementById('integral-dx').textContent = dx.toFixed(4);
  }
  attachEvents() {
    document.getElementById('integral-n').addEventListener('input', e => { this.n = parseInt(e.target.value); this.draw(); });
    document.getElementById('method-buttons').addEventListener('click', e => {
      const btn = e.target.closest('button[data-method]');
      if (!btn) return;
      this.method = btn.dataset.method;
      document.querySelectorAll('#method-buttons button').forEach(b => b.classList.toggle('active', b === btn));
      this.draw();
    });
  }
}

/* ---------- LIMITS (ε-δ) ---------- */
class LimitsViz {
  constructor() {
    this.canvas = document.getElementById('limits-canvas');
    this.a = 2; this.L = 4; this.eps = 0.4;
    this.delta = 0.0975; this.deltaTarget = 0.0975; this.deltaStart = 0.0975;
    this.tweenStart = 0; this.tweenDur = 500;
    this.view = { xMin: 1, xMax: 3, yMin: 0.5, yMax: 8 };
    this.f = x => x * x;
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.draw(); });
    this.attachEvents();
    requestAnimationFrame(t => this.loop(t));
  }
  resize() { const r = setupCanvas(this.canvas); this.ctx = r.ctx; this.w = r.w; this.h = r.h; }
  computeDelta(eps) {
    if (eps >= 4) return 1;
    return Math.min(2 - Math.sqrt(4 - eps), Math.sqrt(4 + eps) - 2);
  }
  snapDelta() {
    this.deltaStart = this.delta;
    this.deltaTarget = this.computeDelta(this.eps);
    this.tweenStart = performance.now();
  }
  loop(t) {
    const dt = t - this.tweenStart;
    if (dt < this.tweenDur) {
      const p = Math.min(1, dt / this.tweenDur), eased = 1 - Math.pow(1 - p, 3);
      this.delta = this.deltaStart + (this.deltaTarget - this.deltaStart) * eased;
    } else this.delta = this.deltaTarget;
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  }
  draw() {
    const { ctx, w, h } = this, v = this.view;
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h, v);

    const [, pyE1] = mathToPx(0, this.L - this.eps, v, w, h);
    const [, pyE2] = mathToPx(0, this.L + this.eps, v, w, h);
    ctx.fillStyle = 'rgba(42, 117, 83, 0.15)'; ctx.fillRect(0, pyE2, w, pyE1 - pyE2);
    ctx.strokeStyle = 'rgba(42, 117, 83, 0.7)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(0, pyE1); ctx.lineTo(w, pyE1); ctx.moveTo(0, pyE2); ctx.lineTo(w, pyE2); ctx.stroke();
    ctx.setLineDash([]);

    const [pxD1] = mathToPx(this.a - this.delta, 0, v, w, h);
    const [pxD2] = mathToPx(this.a + this.delta, 0, v, w, h);
    ctx.fillStyle = 'rgba(215, 92, 42, 0.13)'; ctx.fillRect(pxD1, 0, pxD2 - pxD1, h);
    ctx.strokeStyle = 'rgba(215, 92, 42, 0.7)'; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pxD1, 0); ctx.lineTo(pxD1, h); ctx.moveTo(pxD2, 0); ctx.lineTo(pxD2, h); ctx.stroke();
    ctx.setLineDash([]);

    plotFn(ctx, this.f, v, w, h, { color: '#0B2545', width: 2.5 });

    [this.a - this.delta, this.a + this.delta].forEach(x => {
      const [px, py] = mathToPx(x, this.f(x), v, w, h);
      ctx.fillStyle = '#D75C2A'; ctx.strokeStyle = '#FCF9EF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    const [pa, pL] = mathToPx(this.a, this.L, v, w, h);
    ctx.fillStyle = '#FCF9EF'; ctx.strokeStyle = '#0B2545'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pa, pL, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(11, 37, 69, 0.7)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`L + ε = ${(this.L + this.eps).toFixed(3)}`, w - 130, pyE2);
    ctx.fillText(`L − ε = ${(this.L - this.eps).toFixed(3)}`, w - 130, pyE1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('a − δ', pxD1, 8); ctx.fillText('a + δ', pxD2, 8); ctx.fillText(`a = ${this.a}`, pa, 8);

    const set = (id, t) => { document.getElementById(id).textContent = t; };
    set('eps-val', this.eps.toFixed(3)); set('eps-display', this.eps.toFixed(3));
    set('delta-val', this.delta.toFixed(4)); set('delta-display', this.delta.toFixed(4));
    set('status-delta', this.delta.toFixed(4)); set('status-eps', this.eps.toFixed(3));
    document.getElementById('delta-slider').value = this.delta;
  }
  attachEvents() {
    document.getElementById('eps-slider').addEventListener('input', e => {
      this.eps = parseFloat(e.target.value);
      this.snapDelta();
      const status = document.getElementById('delta-status');
      status.classList.remove('flashing');
      void status.offsetWidth;
      status.classList.add('flashing');
    });
  }
}

/* ---------- PROOF WALK-THROUGH ---------- */
class ProofWalkthrough {
  constructor() {
    this.steps = document.querySelectorAll('.proof-step');
    this.total = this.steps.length; this.shown = 0;
    document.getElementById('proof-next').addEventListener('click', () => this.advance());
    document.getElementById('proof-reset').addEventListener('click', () => this.reset());
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'n' || e.key === 'N') this.advance();
    });
    this.update();
  }
  advance() { if (this.shown < this.total) { this.shown++; this.update(); } }
  reset() { this.shown = 0; this.update(); }
  update() {
    this.steps.forEach((s, i) => s.classList.toggle('shown', i < this.shown));
    document.getElementById('proof-bar').style.width = (this.shown / this.total * 100) + '%';
    document.getElementById('proof-count').textContent = `${this.shown} / ${this.total}`;
    const btn = document.getElementById('proof-next');
    btn.textContent = this.shown === 0 ? 'Begin →' : (this.shown >= this.total ? 'Done ✓' : 'Next step →');
    btn.disabled = this.shown >= this.total;
    btn.style.opacity = this.shown >= this.total ? '0.5' : '1';
  }
}

/* ---------- TERM POPOVERS ---------- */
function setupTermPopovers() {
  const popover = document.getElementById('popover');
  document.addEventListener('mouseover', e => {
    const term = e.target.closest('.term');
    if (!term || !term.dataset.def) return;
    popover.innerHTML = '<strong>definition</strong>' + term.dataset.def;
    popover.classList.add('show');
    const r = term.getBoundingClientRect();
    popover.style.left = Math.min(r.left, window.innerWidth - 300) + 'px';
    popover.style.top = (r.bottom + 8) + 'px';
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.term')) popover.classList.remove('show');
  });
}

/* ---------- PRACTICE CARDS ---------- */
function setupPractice() {
  const hintState = {};
  document.querySelectorAll('.hint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target;
      hintState[t] = (hintState[t] || 0) + 1;
      const hints = btn.closest('.problem-card').querySelectorAll('.hint-row');
      if (hintState[t] <= hints.length) hints[hintState[t] - 1].classList.add('shown');
      if (hintState[t] >= hints.length) { btn.textContent = 'No more hints'; btn.disabled = true; btn.style.opacity = '0.5'; }
    });
  });
  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.problem-card').querySelector('.problem-answer').classList.add('shown');
      btn.textContent = '✓ revealed'; btn.disabled = true; btn.style.opacity = '0.5';
    });
  });
}

/* ---------- KaTeX ---------- */
function renderEquations() {
  if (typeof katex === 'undefined') { setTimeout(renderEquations, 50); return; }
  const E = (id, tex) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, { displayMode: true, throwOnError: false });
  };
  E('eq-derivative-def', "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}");
  E('eq-integral-def', "\\int_a^b f(x)\\,dx = \\lim_{n \\to \\infty} \\sum_{i=1}^{n} f(x_i^*)\\,\\Delta x");
  E('eq-ftc', "\\int_a^b f'(x)\\,dx = f(b) - f(a)");
  E('eq-edelta', "\\forall \\varepsilon > 0,\\ \\exists\\ \\delta > 0 : 0 < |x - a| < \\delta \\implies |f(x) - L| < \\varepsilon");
  E('proof-eq-1', "\\frac{d}{dx}[\\sin x] = \\lim_{h \\to 0} \\frac{\\sin(x+h) - \\sin x}{h}");
  E('proof-eq-2', "\\sin(x + h) = \\sin x \\cos h + \\cos x \\sin h");
  E('proof-eq-3', "\\frac{d}{dx}[\\sin x] = \\cos x \\cdot \\underbrace{\\lim_{h\\to 0}\\frac{\\sin h}{h}}_{=\\,1} - \\sin x \\cdot \\underbrace{\\lim_{h\\to 0}\\frac{1 - \\cos h}{h}}_{=\\,0}");
  E('proof-eq-4', "\\frac{d}{dx}[\\sin x] = \\cos x \\cdot 1 - \\sin x \\cdot 0");
  E('proof-eq-5', "\\boxed{\\frac{d}{dx}[\\sin x] = \\cos x}");
}

/* ---------- INIT ---------- */
window.addEventListener('DOMContentLoaded', () => {
  new HeroViz();
  window.derivViz = new DerivativeViz();
  window.integralViz = new IntegralViz();
  window.limitsViz = new LimitsViz();
  new ProofWalkthrough();
  setupTermPopovers();
  setupPractice();
  renderEquations();

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', e => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) {
        e.preventDefault();
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
      }
    });
  });
});
