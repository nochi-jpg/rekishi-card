// 歴史カードバトル：豪華な演出（PixiJS の光と粒子 ＋ GSAP の動き）
// 画面の上に透明な描画面を1枚かさねて、光・粒・雷・衝撃波を描く。設定で「ふつう」にすると軽くなる
(function () {
  const stage = document.getElementById('stage');
  const store = { get: (k, d) => { try { const v = localStorage.getItem('rekishicard_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('rekishicard_' + k, JSON.stringify(v)); } catch (e) { } } };
  const HAS = !!(window.PIXI && window.gsap);
  const TAGC = { '政治': 0x4a8cff, '文化': 0xff9a2e, '宗教': 0xb36bff, '戦い': 0xff4a4a, '外交': 0x2fd0c8 };
  let quality = store.get('fxq', 'high');
  let app = null, layer = null, glowLayer = null, texDot = null, texStar = null, parts = [], tasks = [], ready = false, starting = null;
  const fast = () => window.RC_UI && window.RC_UI.isFast;
  const hi = () => ready && quality === 'high' && !fast();
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---------- 準備 ----------
  function makeTex(draw, size) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return PIXI.Texture.from(c); }
  async function init() {
    if (!HAS || app || starting) return starting;
    starting = (async () => {
      try {
        app = new PIXI.Application();
        await app.init({ backgroundAlpha: 0, antialias: true, width: stage.offsetWidth, height: stage.offsetHeight, resolution: Math.min(1.5, window.devicePixelRatio || 1), autoDensity: true, preference: 'webgl' });
      } catch (e) { app = null; return; }
      const cv = app.canvas; cv.id = 'fxCanvas'; stage.appendChild(cv);
      glowLayer = new PIXI.Container(); layer = new PIXI.Container(); app.stage.addChild(glowLayer, layer);
      try { glowLayer.filters = [new PIXI.filters.GlowFilter({ distance: 14, outerStrength: 3, innerStrength: 0.5, color: 0xffffff, quality: 0.2 })]; } catch (e) { }
      texDot = makeTex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.65)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); }, 64);
      texStar = makeTex((g, s) => { g.translate(s / 2, s / 2); const r = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 4); g.fillRect(-s / 2, -2, s, 4); } g.beginPath(); g.arc(0, 0, s / 6, 0, Math.PI * 2); g.fill(); }, 64);
      app.ticker.add(tick); app.ticker.stop();
      ready = true; resize();
    })();
    return starting;
  }
  function resize() { if (!app) return; app.renderer.resize(stage.offsetWidth, stage.offsetHeight); app.canvas.style.width = stage.offsetWidth + 'px'; app.canvas.style.height = stage.offsetHeight + 'px'; }
  window.addEventListener('resize', () => setTimeout(resize, 120));
  function wake() { if (app && !app.ticker.started) app.ticker.start(); }
  function tick(t) {
    const dt = Math.min(3, t.deltaTime);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { p.sp.destroy(); parts.splice(i, 1); continue; }
      if (p.to) { p.sp.x += (p.to.x - p.sp.x) * 0.12 * dt; p.sp.y += (p.to.y - p.sp.y) * 0.12 * dt; }
      else { p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt; p.sp.x += p.vx * dt; p.sp.y += p.vy * dt; }
      const k = p.life / p.max; p.sp.alpha = Math.min(1, k * 1.6) * p.a; p.sp.scale.set(p.s * (p.grow ? 1 + (1 - k) * p.grow : 0.4 + k * 0.6));
    }
    for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i](dt) === false) tasks.splice(i, 1);
    if (!parts.length && !tasks.length) app.ticker.stop();
  }
  // 要素の中心（ステージの座標）
  function at(el) {
    if (!el) return null; const sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth, r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k, w: r.width / k, h: r.height / k };
  }
  function part(x, y, o) {
    const sp = new PIXI.Sprite(o.star ? texStar : texDot); sp.anchor.set(0.5); sp.x = x; sp.y = y; sp.tint = o.color;
    const life = o.life * (0.7 + Math.random() * 0.6);
    const p = { sp, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag || 0.94, life, max: life, s: o.size * (0.6 + Math.random() * 0.8) / 64, a: o.a || 1, grow: o.grow || 0, to: o.to };
    sp.scale.set(p.s); layer.addChild(sp); parts.push(p); return p;
  }
  // 粒をふき出す
  function spark(x, y, color, n, speed, size, life, opt) {
    if (!hi()) return; wake(); opt = opt || {};
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8); part(x, y, { color, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opt.up || 0), g: opt.g || 0.05, size, life, star: opt.star && Math.random() < 0.4, drag: opt.drag }); }
  }
  // 光の輪
  function ring(x, y, color, r0, r1, dur, width) {
    if (!hi()) return Promise.resolve(); wake();
    const g = new PIXI.Graphics(); g.x = x; g.y = y; glowLayer.addChild(g);
    const st = { r: r0, a: 1 };
    const draw = () => { g.clear(); g.circle(0, 0, st.r).stroke({ width: width * st.a + 1, color, alpha: st.a }); };
    draw(); tasks.push(() => { if (g.destroyed) return false; draw(); });
    return new Promise(res => gsap.to(st, { r: r1, a: 0, duration: dur, ease: 'power2.out', onComplete: () => { g.destroy(); res(); } }));
  }
  // 画面のフラッシュ
  function flash(color, a, dur) {
    if (!hi()) return; wake();
    const g = new PIXI.Graphics().rect(0, 0, stage.offsetWidth, stage.offsetHeight).fill({ color: color || 0xffffff }); g.alpha = a || 0.7; layer.addChild(g);
    gsap.to(g, { alpha: 0, duration: dur || 0.5, ease: 'power2.out', onComplete: () => g.destroy() }); tasks.push(() => !g.destroyed);
  }
  // 画面のゆれ
  function shake(power) {
    if (fast()) return; const el = document.querySelector('.screen.on'); if (!el) return;
    gsap.fromTo(el, { x: 0, y: 0 }, { x: () => (Math.random() - 0.5) * power, y: () => (Math.random() - 0.5) * power, duration: 0.05, repeat: 7, yoyo: true, ease: 'none', onComplete: () => gsap.set(el, { x: 0, y: 0, clearProps: 'transform' }) });
  }
  const colorOf = (d) => TAGC[d && d.tags && d.tags[0]] || 0xffd36e;
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');

  // ---------- 演出 ----------
  // カードが表になったとき：種類の色で光る。効果の種類で光の形がちがう。強いカードはためて叩きつける
  async function reveal(el, d, strong) {
    if (!el || fast()) return;
    const c = colorOf(d), p = at(el); if (!p) return;
    el.style.setProperty('--fxc', hex(c)); el.classList.remove('fxglow'); void el.offsetWidth; el.classList.add('fxglow');
    if (strong) await slam(el, c);
    if (d.kind === 'reveal') { ring(p.x, p.y, c, 10, 90, 0.6, 6); spark(p.x, p.y, c, 16, 4, 18, 30); }
    else if (d.kind === 'ongoing') aura(p, c, 900);
    else if (d.kind === 'prophecy') magic(p, c);
    else if (d.kind === 'combo') { ring(p.x, p.y, 0xffd36e, 10, 80, 0.5, 5); spark(p.x, p.y, 0xffd36e, 14, 3.5, 16, 30, { star: true }); }
    else spark(p.x, p.y, c, 10, 3, 14, 26);
  }
  // ためて、叩きつける
  async function slam(el, c) {
    const p = at(el); if (!p) return;
    if (hi()) { wake(); for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 70; part(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, { color: c, size: 14, life: 22, to: { x: p.x, y: p.y } }); } }
    window.RC_UI && window.RC_UI.x.SE.play('tap', 0.5);
    await new Promise(res => {
      gsap.timeline({ onComplete: res })
        .to(el, { scale: 1.45, y: -40, rotation: -5, duration: 0.32, ease: 'back.out(2)' })
        .to(el, { scale: 1.5, rotation: 4, duration: 0.14, ease: 'sine.inOut' })
        .to(el, { scale: 1, y: 0, rotation: 0, duration: 0.12, ease: 'power4.in' });
    });
    gsap.set(el, { clearProps: 'transform' });
    window.RC_UI && window.RC_UI.x.SE.play('hit', 0.9);
    shake(16); ring(p.x, p.y, c, 20, 220, 0.55, 14); ring(p.x, p.y, 0xffffff, 10, 140, 0.4, 6);
    spark(p.x, p.y, c, 40, 9, 20, 34, { star: true, g: 0.12 }); spark(p.x, p.y, 0xffffff, 18, 6, 12, 22);
    flash(c, 0.15, 0.35);
  }
  // 永続：オーラ（下から上へ光がのぼる）
  function aura(p, c, ms) {
    if (!hi()) return; wake(); const t0 = performance.now();
    tasks.push(() => { if (performance.now() - t0 > ms) return false; if (Math.random() < 0.6) part(p.x + (Math.random() - 0.5) * p.w, p.y + p.h / 2, { color: c, vy: -1.6 - Math.random() * 1.4, vx: (Math.random() - 0.5) * 0.4, g: 0, drag: 0.99, size: 16, life: 40 }); });
    ring(p.x, p.y, c, p.w * 0.3, p.w * 0.9, 0.8, 4);
  }
  // 予言：魔法陣
  function magic(p, c) {
    if (!hi()) return; wake();
    const g = new PIXI.Graphics(); g.x = p.x; g.y = p.y; glowLayer.addChild(g);
    const R = Math.max(p.w, p.h) * 0.75;
    g.circle(0, 0, R).stroke({ width: 3, color: c }).circle(0, 0, R * 0.8).stroke({ width: 2, color: c });
    for (let k = 0; k < 2; k++) { const o = k * Math.PI / 3; g.moveTo(Math.cos(o - Math.PI / 2) * R * 0.8, Math.sin(o - Math.PI / 2) * R * 0.8); for (let i = 1; i <= 3; i++) { const a = o - Math.PI / 2 + i * Math.PI * 2 / 3; g.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); } } g.stroke({ width: 2, color: c });
    g.scale.set(0.2); g.alpha = 0;
    gsap.timeline({ onComplete: () => g.destroy() }).to(g, { alpha: 1, duration: 0.25 }, 0).to(g.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0).to(g, { rotation: Math.PI, duration: 1.3, ease: 'none' }, 0).to(g, { alpha: 0, duration: 0.4 }, 0.9);
    tasks.push(() => !g.destroyed);
  }
  // 効果：元から対象へ光の玉が飛ぶ
  function orb(fromEl, toEl, plus) {
    if (!hi() || !fromEl || !toEl || fromEl === toEl) return; wake();
    const a = at(fromEl), b = at(toEl), c = plus ? 0xffd36e : 0xff5a6e;
    const sp = new PIXI.Sprite(texStar); sp.anchor.set(0.5); sp.tint = c; sp.scale.set(0.6); layer.addChild(sp);
    const st = { t: 0 }, mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 120, my = Math.min(a.y, b.y) - 80;
    tasks.push(() => { if (sp.destroyed) return false; part(sp.x, sp.y, { color: c, size: 12, life: 14 }); });
    gsap.to(st, { t: 1, duration: 0.45, ease: 'power1.in', onUpdate: () => { const t = st.t, u = 1 - t; sp.x = u * u * a.x + 2 * u * t * mx + t * t * b.x; sp.y = u * u * a.y + 2 * u * t * my + t * t * b.y; sp.rotation += 0.3; },
      onComplete: () => { sp.destroy(); spark(b.x, b.y, c, 14, 4, 16, 24); ring(b.x, b.y, c, 6, 50, 0.35, 4); } });
  }
  // 史実コンボ：2枚のあいだに雷
  async function lightning(aEl, bEl) {
    if (fast()) return;
    const A = at(aEl), B = at(bEl); if (!A || !B) return;
    window.RC_UI && window.RC_UI.x.SE.play('shock', 0.8);
    if (!hi()) { await sleep(200); return; }
    wake();
    const g = new PIXI.Graphics(); layer.addChild(g);
    const bolt = (x1, y1, x2, y2, w, col, depth) => {
      const n = 10, pts = [[x1, y1]];
      for (let i = 1; i < n; i++) { const t = i / n, nx = -(y2 - y1), ny = x2 - x1, L = Math.hypot(nx, ny) || 1, off = (Math.random() - 0.5) * 60 * Math.sin(Math.PI * t); pts.push([x1 + (x2 - x1) * t + nx / L * off, y1 + (y2 - y1) * t + ny / L * off]); }
      pts.push([x2, y2]);
      [[w * 4, 0.12], [w * 2, 0.3], [w, 0.95]].forEach(([ww, aa]) => { g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.stroke({ width: ww, color: col, alpha: aa }); });
      if (depth > 0) for (let i = 0; i < 2; i++) { const q = pts[2 + Math.floor(Math.random() * (n - 4))]; bolt(q[0], q[1], q[0] + (Math.random() - 0.5) * 140, q[1] + (Math.random() - 0.5) * 140, w * 0.45, col, depth - 1); }
    };
    let alive = true; const t0 = performance.now();
    tasks.push(() => { if (!alive) return false; g.clear(); bolt(A.x, A.y, B.x, B.y, 7, 0xbfe4ff, 1); bolt(A.x, A.y, B.x, B.y, 3, 0xffffff, 0); if (performance.now() - t0 > 650) { alive = false; g.destroy(); } });
    for (let i = 0; i < 4; i++) { setTimeout(() => { spark(A.x, A.y, 0xbfe4ff, 10, 5, 14, 20); spark(B.x, B.y, 0xffd36e, 10, 5, 14, 20); }, i * 140); }
    flash(0xffffff, 0.2, 0.25); await sleep(320); flash(0xbfe4ff, 0.3, 0.4); shake(12);
    const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; ring(m.x, m.y, 0xffd36e, 20, 260, 0.6, 12); spark(m.x, m.y, 0xffd36e, 50, 10, 22, 40, { star: true });
    await sleep(380);
  }
  // カードを置いた（自分の場に出した）とき
  function place(el, d) {
    if (!el || fast()) return; const p = at(el); if (!p) return; const c = colorOf(d);
    gsap.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', clearProps: 'transform' });
    ring(p.x, p.y, c, 8, 60, 0.4, 4); spark(p.x, p.y, c, 8, 2.5, 12, 20);
  }
  // 退場
  function destroy(el) { if (!el || fast()) return; const p = at(el); if (!p) return; spark(p.x, p.y, 0xff5a3a, 30, 7, 18, 30, { g: 0.15 }); ring(p.x, p.y, 0xff5a3a, 10, 90, 0.4, 8); shake(6); }
  // 合計が変わったとき
  function pop(el, plus) {
    if (!el || fast()) return;
    gsap.fromTo(el, { scale: 1.45 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, .5)' });
    const p = at(el); if (p) spark(p.x, p.y, plus ? 0xffd36e : 0xff5a6e, 8, 3, 12, 18);
  }
  // メニューのボタンが順番にすべりこむ
  function menuIn() {
    if (!window.gsap || fast()) return;
    const b = document.querySelectorAll('#title.menu .mm');
    gsap.fromTo(b, { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.6)', clearProps: 'transform,opacity' });
    const h = document.querySelectorAll('#title.menu .hud > *');
    gsap.fromTo(h, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity', delay: 0.1 });
  }
  // 画面の切りかえ：中身がふわっと出る
  function screenIn(sc) {
    if (!window.gsap || fast() || !sc) return;
    const kids = sc.querySelectorAll(':scope > .deck-list > *, :scope > .cp-list > *, :scope > .pz-list > *, #shopGrid > *');
    if (kids.length) gsap.fromTo(kids, { y: 30, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.035, ease: 'back.out(1.5)', clearProps: 'transform,opacity' });
  }

  window.RC_FX = {
    init, reveal, slam, orb, lightning, place, destroy, pop, menuIn, screenIn, spark, ring, flash, shake,
    get quality() { return quality; }, setQuality(q) { quality = q; store.set('fxq', q); },
    get ok() { return HAS; }
  };
  if (HAS) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init(); }
})();
