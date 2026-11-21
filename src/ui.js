// 歴史カードバトル：画面・操作・演出
(function () {
  const { CARDS, DECKS, LOCS } = window.RC_DATA;
  const E = window.RC_ENGINE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const stage = $('#stage');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const KW = { reveal: '公開時', ongoing: '永続', prophecy: '予言', combo: '史実コンボ', none: '効果なし' };

  // ---------- 保存 ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('rekishicard_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rekishicard_' + k, JSON.stringify(v)); } catch (e) { } },
  };

  // ---------- 音 ----------
  const SE = {
    on: store.get('sound', true), cache: {}, ctx: null,
    play(n, vol) {
      if (!this.on || !window.RC_SE || !RC_SE[n]) return;
      try {
        let base = this.cache[n]; if (!base) base = this.cache[n] = new Audio(RC_SE[n]);
        const a = base.cloneNode(); a.volume = Math.min(1, 0.55 * (vol || 1)); a.play().catch(() => { });
      } catch (e) { }
    },
    whoosh(hi) {
      if (!this.on) return;
      try {
        const ctx = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
        const len = 0.28, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(hi ? 2400 : 900, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(hi ? 600 : 300, ctx.currentTime + len);
        const g = ctx.createGain(); g.gain.value = 0.35;
        src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
      } catch (e) { }
    },
  };

  // ---------- 画面サイズ ----------
  let layout = 'land', scale = 1;
  function fitStage() {
    const w = window.innerWidth, h = window.innerHeight;
    const nl = w < h ? 'port' : 'land';
    const W = nl === 'land' ? 1280 : 480, H = nl === 'land' ? 720 : 960;
    scale = Math.min(w / W, h / H);
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    stage.style.transform = `translate(${(w - W * scale) / 2}px, ${(h - H * scale) / 2}px) scale(${scale})`;
    if (nl !== layout) { layout = nl; stage.className = layout; if (G) renderAll(); fitAll(); if ($('#modal').classList.contains('on') && modalRedraw) modalRedraw(); }
  }
  function rectS(el) {
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale };
  }
  function toStage(cx, cy) { const s = stage.getBoundingClientRect(); return { x: (cx - s.left) / scale, y: (cy - s.top) / scale }; }

  // 文字がはみ出さないように縮める
  function fitText(el, min) {
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    while (el.scrollWidth > el.clientWidth + 0.5 && fs > (min || 8) && n++ < 40) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
  }
  function fitBlock(el, min) {
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    while (el.scrollHeight > el.clientHeight + 0.5 && fs > (min || 9) && n++ < 40) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
  }
  function fitAll(root) {
    $$('.fit', root || stage).forEach(el => fitText(el, 8));
    $$('.fitb', root || stage).forEach(el => fitBlock(el, 9));
  }

  // ---------- 背景の光の粒 ----------
  (function particles() {
    const cv = $('#bgfx'), cx = cv.getContext('2d');
    let W = 0, H = 0; const P = [];
    function rs() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    rs(); window.addEventListener('resize', rs);
    for (let i = 0; i < 60; i++) P.push({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .6, v: Math.random() * .0006 + .0002, p: Math.random() * 6.28 });
    function loop(t) {
      cx.clearRect(0, 0, W, H);
      const gr = cx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, Math.max(W, H) * 0.7);
      gr.addColorStop(0, '#1b1433'); gr.addColorStop(1, '#05040a'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
      for (const q of P) {
        q.y -= q.v; q.x += Math.sin(t / 2000 + q.p) * .0002; if (q.y < -0.02) { q.y = 1.02; q.x = Math.random(); }
        const a = .35 + .35 * Math.sin(t / 600 + q.p);
        cx.beginPath(); cx.fillStyle = `rgba(255,214,140,${a})`; cx.shadowColor = '#ffd27a'; cx.shadowBlur = 8;
        cx.arc(q.x * W, q.y * H, q.r, 0, 6.28); cx.fill();
      }
      cx.shadowBlur = 0;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  // ---------- 画面切りかえ ----------
  function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); fitAll(); }

  // ---------- 状態 ----------
  let G = null, V = null, sel = null, busy = true, myDeck = 'himiko', cpuDeck = 'taishi', log = null;
  const ME = 0, OP = 1;
  const imgUrl = (d) => d.img.startsWith('face:') ? `img/face/${d.img.slice(5)}.webp` : `img/card/${d.img}.webp`;
  const isFace = (d) => d.img.startsWith('face:');
  const revealed = (uid) => V.resolving ? V.rev.has(uid) : G.S.cards[uid].revealed;
  const pw = (uid) => V.snap.powers[uid];

  function newGame(deckId) {
    myDeck = deckId; cpuDeck = deckId === 'himiko' ? 'taishi' : 'himiko';
    G = E.create({ seed: (Math.random() * 1e9) | 0, decks: [myDeck, cpuDeck] });
    V = { resolving: false, rev: new Set(), snap: G.snap(), hide: new Set(), oppShown: false, locShown: [false, false, false] };
    log = { combos: [] }; sel = null; busy = true;
    show('game'); renderAll();
    setTimeout(nextTurn, 500);
  }

  // ---------- 描画 ----------
  function cardEl(uid, mode) {
    const c = G.S.cards[uid], d = CARDS[c.id];
    const el = document.createElement('div');
    el.dataset.uid = uid;
    if (mode === 'back') { el.className = 'card bc back'; return el; }
    el.className = 'card ' + (mode === 'hand' ? 'hc' : 'bc') + (d.leader ? ' leader' : '');
    const p = pw(uid), base = d.power;
    const pc = p > base ? ' up' : p < base ? ' down' : '';
    if (mode === 'hand') {
      el.innerHTML = `<div class="art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div><div class="frame"></div>
        <div class="cost">${d.cost}</div><div class="pow${pc}">${p}</div><div class="nm fit">${d.name}</div><div class="kw kw-${d.kind}">${KW[d.kind]}</div>`;
    } else {
      el.innerHTML = `<div class="art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div><div class="frame"></div>
        <div class="cost">${d.cost}</div><div class="pow${pc}">${p}</div><div class="bnm">${d.name}</div>`;
      if (c.proph && revealed(uid)) {
        const st = V.resolving && V.prophPending && V.prophPending.has(uid) ? 'wait' : c.proph.state;
        if (st !== 'none') el.insertAdjacentHTML('beforeend', `<div class="pmark ${st}">${st === 'hit' ? '的中' : st === 'miss' ? 'はずれ' : '予言'}</div>`);
      }
      if (revealed(uid) && c.comboShown && (!V.resolving || V.comboDone.has(uid))) el.classList.add('combo');
    }
    return el;
  }

  function renderTop() {
    const od = DECKS[cpuDeck];
    const handN = G.S.players[OP].hand.filter(u => !V.hide.has(u)).length;
    $('#oppBar').innerHTML = `<div class="face" style="background-image:url('img/face/${od.face}.webp')"></div>
      <div><div class="oname">${od.name}デッキ</div>${layout === 'land' ? `<div class="otheme">${od.theme}・${od.desc}（CPU）</div>` : ''}</div>
      ${G.S.declared[OP] ? '<div class="tagbadge decl">宣言</div>' : ''}
      <div class="ohand">${layout === 'land' ? '手札' : ''}<b>${handN}</b></div>`;
    $('#turnBox').innerHTML = `<div class="tn">ターン ${Math.max(1, G.S.turn)}<small> / 6</small></div><div class="stk">★${G.S.stakes}</div>
      <button class="menu" data-act="menu" aria-label="メニュー"><i></i><i></i><i></i></button>`;
  }

  function renderBoard() {
    const B = $('#board'); B.innerHTML = '';
    for (let li = 0; li < 3; li++) {
      const L = G.loc(li), shown = V.locShown[li];
      const col = document.createElement('div'); col.className = 'loc'; col.dataset.li = li;
      if (shown) { const t = V.snap.totals[li]; if (t[0] > t[1]) col.classList.add('lead-me'); else if (t[1] > t[0]) col.classList.add('lead-op'); }
      const cap = shown ? G.cap(li) : 4;
      const mk = (p) => {
        const side = document.createElement('div'); side.className = 'side ' + (p === ME ? 'me' : 'opp');
        const slots = document.createElement('div'); slots.className = 'slots';
        let list = G.S.board[li][p];
        if (p === OP && !V.oppShown) list = list.filter(u => !G.S.pending[OP].includes(u));
        for (let i = 0; i < 4; i++) {
          const sl = document.createElement('div'); sl.className = 'slot' + (i >= cap ? ' closed' : '');
          slots.appendChild(sl);
        }
        list.forEach((uid, i) => {
          const sl = slots.children[i]; if (!sl) return;
          let el;
          if (p === OP && !revealed(uid)) el = cardEl(uid, 'back');
          else { el = cardEl(uid, 'board'); if (p === ME && !revealed(uid)) { el.classList.add('pend'); el.dataset.drag = '1'; } }
          el.style.position = 'absolute'; el.style.inset = '0'; el.style.width = '100%'; el.style.height = '100%';
          sl.appendChild(el);
        });
        side.appendChild(slots); return side;
      };
      const tile = document.createElement('div'); tile.className = 'tile' + (shown ? '' : ' hidden'); tile.dataset.loc = li;
      if (shown) {
        const t = V.snap.totals[li];
        tile.innerHTML = `<div class="timg" style="background-image:url('img/loc/${L.img}.webp')"></div><div class="tshade"></div>
          <div class="tot o${t[1] > t[0] ? ' win' : ''}" data-tot="1">${t[1]}</div>
          <div class="tname fit">${L.name}</div><div class="ttext fitb">${layout === 'port' ? L.short : L.text}</div>
          <div class="tot m${t[0] > t[1] ? ' win' : ''}" data-tot="0">${t[0]}</div>`;
      } else {
        tile.innerHTML = `<div class="timg"></div><div class="tq"><b>？</b><span>ターン${li + 1}で公開</span></div>`;
      }
      col.appendChild(mk(OP)); col.appendChild(tile); col.appendChild(mk(ME));
      B.appendChild(col);
    }
    markTargets();
    fitAll(B);
  }

  function renderHand(newOnes) {
    const H = $('#hand'); H.innerHTML = '';
    const hand = G.S.players[ME].hand.filter(u => !V.hide.has(u));
    const left = G.energyLeft(ME);
    hand.forEach(uid => {
      const el = cardEl(uid, 'hand'); el.dataset.drag = '1';
      if (CARDS[G.S.cards[uid].id].cost > left || busy) el.classList.add('poor');
      if (sel === uid) el.classList.add('sel');
      if (newOnes && newOnes.includes(uid)) el.classList.add('newdraw');
      H.appendChild(el);
    });
    if (!hand.length) H.innerHTML = '<div class="hand-empty">手札がありません</div>';
    fitAll(H);
  }

  function renderCtrl() {
    const left = G.S.turn ? G.energyLeft(ME) : 0;
    const anyPlayable = !busy && G.S.players[ME].hand.some(u => CARDS[G.S.cards[u].id].cost <= left && [0, 1, 2].some(li => G.canPlay(ME, u, li)));
    $('#ctrl').innerHTML = `<div class="orb${left <= 0 ? ' zero' : ''}"><b>${left}</b><small>エネルギー</small></div>
      <button class="btn gold b-end${!busy && !anyPlayable ? ' pulse' : ''}" data-act="end" ${busy ? 'disabled' : ''}>ターン終了</button>
      <button class="btn blue b-decl" data-act="declare" ${busy || G.S.declared[ME] || G.S.stakes >= 8 ? 'disabled' : ''}>天下取り<span>宣言 ★×2</span></button>
      <button class="btn red b-ret" data-act="retreat" ${busy ? 'disabled' : ''}>撤退<span>★${G.S.stakes}で終わる</span></button>`;
  }

  function renderDetail() {
    const D = $('#detail'); D.classList.remove('withbtn');
    if (sel === null || sel === undefined) {
      D.innerHTML = layout === 'land'
        ? `<div class="dt-hint"><b>カードを選ぶ</b><p>手札のカードを場所までドラッグ<br>または カードを選んでから<br>場所をクリック（タップ）<br><br>場所やカードを選ぶと<br>くわしい説明が出ます</p></div>`
        : `<div class="dt-hint"><b>カードを選ぶ</b><p>ドラッグで置く／選んでから場所をタップ<br>場所やカードをタップで説明</p></div>`;
      return;
    }
    if (typeof sel === 'string' && sel.startsWith('loc')) {
      const li = +sel.slice(3), L = G.loc(li);
      if (!V.locShown[li]) { D.innerHTML = `<div class="dt-hint"><b>まだ表になっていない場所</b><p>ターン${li + 1}で公開されます</p></div>`; return; }
      D.innerHTML = `<div class="dt-art" style="background-image:url('img/loc/${L.img}.webp')"></div><div class="dt-name fit">${L.name}</div>
        <div class="dt-meta"><span class="m tag">${L.era === '共通' ? '共通の場所' : L.era + 'の場所'}</span></div>
        <div class="dt-text fitb"><span class="kwl kw-ongoing">場所</span>${L.text}</div>
        <div class="dt-memo fitb">カードの「タグ」（政治・外交・文化・宗教・戦い）が場所の効果に合うと強くなる。</div>`;
      fitAll(D); return;
    }
    const c = G.S.cards[sel]; if (!c) { sel = null; return renderDetail(); }
    const d = CARDS[c.id];
    const own = c.owner === ME;
    if (!own && !revealed(sel)) { D.innerHTML = `<div class="dt-hint"><b>伏せられたカード</b><p>ターン終了で公開されます</p></div>`; return; }
    const pend = own && G.S.pending[ME].includes(sel) && !busy;
    const p = pw(sel);
    D.innerHTML = `<div class="dt-art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div>
      <div class="dt-name fit">${d.name}</div>
      <div class="dt-meta"><span class="m c">${d.cost}</span><span class="m p">${p}</span>${d.tags.map(t => `<span class="m tag">${t}</span>`).join('')}</div>
      <div class="dt-text fitb"><span class="kwl kw-${d.kind}">${KW[d.kind]}</span>${d.kind === 'none' ? '' : d.text}</div>
      <div class="dt-memo fitb">${d.memo}</div>
      ${pend ? `<div class="dt-btn"><button class="btn" data-act="unplay">手札にもどす</button></div>` : ''}`;
    if (pend) D.classList.add('withbtn');
    fitAll(D);
  }

  function renderAll() { if (!G) return; renderTop(); renderBoard(); renderHand(); renderCtrl(); renderDetail(); }

  function markTargets() {
    const card = (typeof sel === 'string' && !sel.startsWith('loc')) ? sel : (drag && drag.uid);
    const mine = card && G.S.cards[card] && G.S.cards[card].owner === ME && (G.S.players[ME].hand.includes(card) || G.S.pending[ME].includes(card));
    $$('#board .loc').forEach(col => {
      const li = +col.dataset.li;
      col.classList.remove('can', 'cant');
      if (!mine || busy) return;
      col.classList.add(G.canPlay(ME, card, li) ? 'can' : 'cant');
    });
  }

  // ---------- FLIP（カードがなめらかに移動）----------
  function grabRects() { const m = {}; $$('#board [data-uid], #hand [data-uid]').forEach(el => m[el.dataset.uid] = rectS(el)); return m; }
  function flipFrom(old, dur) {
    $$('#board [data-uid], #hand [data-uid]').forEach(el => {
      const a = old[el.dataset.uid]; if (!a) return;
      const b = rectS(el); if (!b.w) return;
      const dx = a.x - b.x, dy = a.y - b.y, sx = a.w / b.w, sy = a.h / b.h;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .02) return;
      el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }],
        { duration: dur || 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  // ---------- 演出パーツ ----------
  const FX = $('#fx');
  function centerOf(el) { const r = rectS(el); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  function addFx(html, x, y, life) {
    const w = document.createElement('div'); w.innerHTML = html; const el = w.firstElementChild;
    if (x !== undefined) { el.style.left = x + 'px'; el.style.top = y + 'px'; }
    FX.appendChild(el); setTimeout(() => el.remove(), life || 1200); return el;
  }
  function ring(x, y, color) { addFx(`<div class="ring ${color || ''}"></div>`, x, y, 700); }
  function sparks(x, y, n) {
    for (let i = 0; i < (n || 10); i++) {
      const a = Math.random() * 6.28, r = 40 + Math.random() * 50;
      const el = addFx(`<div class="spark"></div>`, x, y, 800);
      el.style.setProperty('--dx', Math.cos(a) * r + 'px'); el.style.setProperty('--dy', Math.sin(a) * r + 'px');
    }
  }
  function floatText(x, y, text, cls) { addFx(`<div class="float ${cls}">${text}</div>`, x, y, 1100); }
  function cardNode(uid) { return $(`#board [data-uid="${uid}"]`) || $(`#hand [data-uid="${uid}"]`); }
  async function banner(big, sub, cls, hold) {
    const el = addFx(`<div class="banner ${cls || ''}"><div class="bar"></div><div class="shine"></div>${cls === 'combo' ? '<div class="ctitle">史実コンボ</div>' : ''}<div class="big">${big}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`, undefined, undefined, 99999);
    await sleep(hold || 900);
    el.classList.add('out'); await sleep(280); el.remove();
  }
  function countTotals() {
    $$('#board .tot').forEach(el => {
      const li = +el.closest('.loc').dataset.li, p = +el.dataset.tot;
      const to = V.snap.totals[li][p], from = +(el.dataset.prev || el.textContent);
      el.dataset.prev = to;
      if (from === to) return;
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 350); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      el.animate([{ transform: 'translateX(-50%) scale(1.35)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 350 });
    });
  }
  // 合計の表示を前の値からカウントアップさせるため、描画前の値を覚えておく
  function renderBoardCounting() {
    const prev = $$('#board .tot').map(el => ({ li: +el.closest('.loc').dataset.li, p: +el.dataset.tot, v: +el.textContent }));
    renderBoard();
    prev.forEach(o => { const el = $(`#board .loc[data-li="${o.li}"] .tot[data-tot="${o.p}"]`); if (el) { el.dataset.prev = o.v; el.textContent = o.v; } });
    countTotals();
  }

  // ---------- ターンの流れ ----------
  async function nextTurn() {
    busy = true; sel = null;
    const ev = G.startTurn();
    const draws = ev.filter(e => e.t === 'draw');
    draws.forEach(e => V.hide.add(e.uid));
    V.snap = G.snap(); renderAll();
    for (const e of ev) {
      if (e.t === 'turn') { SE.whoosh(); await banner('ターン ' + e.turn, e.turn === 6 ? '最終ターン' : 'エネルギー ' + e.turn, '', 750); }
      else if (e.t === 'stakes') { SE.play('good'); await banner('★×2', '最終ターンで賭けが2倍！（★' + e.stakes + '）', '', 900); renderTop(); }
      else if (e.t === 'locReveal') {
        V.locShown[e.li] = true; renderBoard();
        const tile = $(`#board .loc[data-li="${e.li}"] .tile`); tile.classList.add('flipin'); SE.whoosh(true); SE.play('decide');
        const c = centerOf(tile); setTimeout(() => { ring(c.x, c.y); sparks(c.x, c.y, 14); }, 250);
        await sleep(850);
      }
    }
    draws.filter(e => e.p === OP).forEach(e => V.hide.delete(e.uid));
    const mine = draws.filter(e => e.p === ME).map(e => e.uid);
    mine.forEach(u => V.hide.delete(u));
    renderTop(); renderHand(mine); if (mine.length) SE.play('tap');
    await sleep(mine.length ? 450 : 0);
    // CPU（置き場所は伏せたまま、ターン終了で見せる）
    E.cpuPlan(G, OP);
    const dc = E.cpuDecide(G, OP);
    if (dc === 'declare' && G.declare(OP)) { SE.play('shock'); await banner('天下取り宣言', '相手が勝負に出た！ 賭けが2倍（★' + G.S.stakes + '）', '', 1200); }
    else if (dc === 'retreat') { G.retreat(OP); renderAll(); return showResult(); }
    busy = false; V.snap = G.snap(); renderAll();
  }

  async function endTurn() {
    if (busy) return;
    busy = true; sel = null; SE.play('decide');
    // 相手の伏せカードを見せる
    const oppNew = G.S.pending[OP].slice();
    V.oppShown = true; renderAll();
    oppNew.forEach((u, i) => { const el = cardNode(u); if (el) el.animate([{ transform: 'translateY(-60px) scale(1.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
    if (oppNew.length) SE.whoosh();
    await sleep(500 + oppNew.length * 90);

    const prevRev = new Set(Object.keys(G.S.cards).filter(u => G.S.cards[u].revealed));
    const handBefore = new Set(G.S.players[ME].hand.concat(G.S.players[OP].hand));
    const prophWait = new Set(Object.keys(G.S.cards).filter(u => G.S.cards[u].proph && G.S.cards[u].proph.state === 'wait'));
    const comboBefore = new Set(Object.keys(G.S.cards).filter(u => G.S.cards[u].comboShown));
    const ev = G.endTurn();
    V.resolving = true; V.rev = prevRev; V.prophPending = prophWait; V.comboDone = comboBefore;
    G.S.players[ME].hand.forEach(u => { if (!handBefore.has(u)) V.hide.add(u); });
    G.S.players[OP].hand.forEach(u => { if (!handBefore.has(u)) V.hide.add(u); });

    for (const e of ev) {
      if (e.t === 'revealStart') {
        await banner(e.first === ME ? 'あなたから公開' : '相手から公開', 'リードしているほうが先に公開', '', 700);
      } else if (e.t === 'reveal') {
        V.rev.add(e.uid); V.snap = e.snap; renderBoardCounting();
        const el = cardNode(e.uid);
        if (el) { el.classList.add('flipin'); const c = centerOf(el); setTimeout(() => { ring(c.x, c.y, e.p === ME ? 'blue' : 'red'); }, 120); }
        SE.whoosh(true); SE.play('tap', 0.8);
        await sleep(560);
      } else if (e.t === 'effect') {
        V.snap = e.snap; renderBoardCounting(); renderHand();
        const src = cardNode(e.uid);
        if (e.proph) { V.prophPending.add(e.uid); renderBoard(); }
        if (src) { const c = centerOf(src); if (!e.targets.length) floatText(c.x, c.y - 30, e.text, 'info'); }
        if (e.targets.length) {
          SE.play(e.delta < 0 ? 'hit' : 'ok', 0.9);
          e.targets.forEach(t => {
            const el = cardNode(t); if (!el) return;
            const c = centerOf(el);
            el.classList.add(e.delta < 0 ? 'hit' : 'buff');
            floatText(c.x, c.y - 10, (e.delta > 0 ? '+' : '') + e.delta, e.delta < 0 ? 'minus' : 'plus');
            if (e.delta > 0) sparks(c.x, c.y, 8);
          });
          if (src && !e.targets.includes(e.uid)) { const c = centerOf(src); floatText(c.x, c.y - 40, e.text, 'info'); }
        }
        await sleep(e.targets.length ? 750 : 600);
      } else if (e.t === 'fetch') {
        V.hide.delete(e.uid); renderTop(); renderHand(e.p === ME ? [e.uid] : null);
        const src = cardNode(e.from);
        if (src) { const c = centerOf(src); floatText(c.x, c.y - 30, CARDS[G.S.cards[e.uid].id].name + 'を手札に', 'info'); }
        SE.play('good', 0.8); await sleep(800);
      } else if (e.t === 'combo') {
        V.comboDone.add(e.uid); V.snap = e.snap; renderBoardCounting();
        const d = CARDS[G.S.cards[e.uid].id], pd = CARDS[G.S.cards[e.partner].id];
        [e.uid, e.partner].forEach(u => { const el = cardNode(u); if (el) { const c = centerOf(el); ring(c.x, c.y); sparks(c.x, c.y, 16); } });
        SE.play('good');
        if (G.S.cards[e.uid].owner === ME) log.combos.push({ a: pd.name, b: d.name, memo: d.memo });
        else log.combos.push({ a: pd.name, b: d.name, memo: d.memo, opp: true });
        await banner(`${pd.name} × ${d.name}`, d.memo + `（パワー+${d.amount}）`, 'combo', 2300);
      } else if (e.t === 'prophecy') {
        V.prophPending.delete(e.uid); V.snap = e.snap; renderBoardCounting();
        const el = cardNode(e.uid);
        if (el) { const c = centerOf(el); addFx(`<div class="stamp ${e.hit ? 'hit' : 'miss'}">${e.hit ? '予言的中' : 'はずれ'}</div>`, c.x, c.y - 10, 1000); if (e.hit) { ring(c.x, c.y); sparks(c.x, c.y, 16); } }
        SE.play(e.hit ? 'good' : 'ng', 0.8);
        if (e.hit) e.targets.forEach(t => { const tl = cardNode(t); if (!tl) return; const c = centerOf(tl); tl.classList.add(e.delta < 0 ? 'hit' : 'buff'); floatText(c.x, c.y, (e.delta > 0 ? '+' : '') + e.delta, e.delta < 0 ? 'minus' : 'plus'); });
        await sleep(950);
      }
    }
    V.resolving = false; V.oppShown = false; V.hide.clear();
    V.snap = G.snap(); renderAll();
    if (G.S.over) { await sleep(400); return showResult(); }
    await sleep(250);
    nextTurn();
  }

  // ---------- 操作 ----------
  function trySelect(uid) {
    if (sel === uid) sel = null; else sel = uid;
    SE.play('tap', 0.6);
    $$('#hand .hc').forEach(el => el.classList.toggle('sel', el.dataset.uid === sel));
    markTargets(); renderDetail();
  }
  function doPlay(uid, li, fromRect) {
    if (busy) return false;
    const was = G.S.pending[ME].includes(uid);
    if (!G.canPlay(ME, uid, li)) {
      SE.play('ng', 0.6);
      const cost = CARDS[G.S.cards[uid].id].cost;
      const msg = !V.locShown[li] ? 'まだ表になっていない場所' : (!was && cost > G.energyLeft(ME)) ? 'エネルギーが足りない' : 'この場所はいっぱい';
      const col = $(`#board .loc[data-li="${li}"] .tile`); if (col) { const c = centerOf(col); floatText(c.x, c.y, msg, 'info'); }
      return false;
    }
    const old = grabRects(); if (fromRect) old[uid] = fromRect;
    G.play(ME, uid, li);
    sel = null; V.snap = G.snap();
    renderBoard(); renderHand(); renderCtrl(); renderDetail();
    flipFrom(old, 260);
    const el = cardNode(uid);
    if (el) { setTimeout(() => { el.classList.add('slam'); const c = centerOf(el); ring(c.x, c.y, 'blue'); sparks(c.x, c.y, 8); }, 230); }
    const orb = $('#ctrl .orb'); if (orb && !was) orb.classList.add('bump');
    SE.play('decide', 0.8);
    return true;
  }
  function doUnplay(uid, fromRect) {
    if (busy || !G.S.pending[ME].includes(uid)) return;
    const old = grabRects(); if (fromRect) old[uid] = fromRect;
    G.unplay(ME, uid); sel = null; V.snap = G.snap();
    renderBoard(); renderHand(); renderCtrl(); renderDetail();
    flipFrom(old, 280); SE.play('tap', 0.6);
  }

  // ドラッグ（マウス・トラックパッド・タッチ共通）
  let press = null, drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    const ac = e.target.closest('[data-act]');
    if (ac) return; // ボタンはクリックで処理
    const cardElm = e.target.closest('#hand [data-uid], #board [data-uid]');
    if (cardElm && cardElm.dataset.drag && !busy) {
      press = { uid: cardElm.dataset.uid, el: cardElm, x: e.clientX, y: e.clientY, id: e.pointerId, fromBoard: !!cardElm.closest('#board') };
      try { stage.setPointerCapture(e.pointerId); } catch (_) { }
      return;
    }
    press = null;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!drag && Math.hypot(dx, dy) > 8 * Math.max(1, scale)) startDrag(e);
    if (drag) moveDrag(e);
  });
  stage.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) { press = null; return; }
    if (drag) endDrag(e);
    else onTap(press.el);
    press = null;
  });
  stage.addEventListener('pointercancel', () => { if (drag) cancelDrag(); press = null; });

  function startDrag(e) {
    const uid = press.uid, src = press.el;
    const r = rectS(src);
    const ghost = cardEl(uid, 'hand'); ghost.classList.add('ghost');
    ghost.classList.remove('poor', 'sel', 'newdraw');
    FX.appendChild(ghost); fitAll(ghost);
    const gw = ghost.offsetWidth, gh = ghost.offsetHeight;
    const p = toStage(e.clientX, e.clientY);
    drag = { uid, src, ghost, gw, gh, lx: p.x, vx: 0, fromRect: r, fromBoard: press.fromBoard, li: -1 };
    src.classList.add('dragging');
    sel = uid; renderDetail(); markTargets();
    SE.play('tap', 0.5);
  }
  function moveDrag(e) {
    const p = toStage(e.clientX, e.clientY);
    drag.vx = drag.vx * 0.7 + (p.x - drag.lx) * 0.3; drag.lx = p.x;
    const rot = Math.max(-18, Math.min(18, drag.vx * 1.6));
    drag.ghost.style.transform = `translate(${p.x - drag.gw / 2}px, ${p.y - drag.gh * 0.6}px) rotate(${rot}deg) scale(1.06)`;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const col = under && under.closest('#board .loc');
    const li = col ? +col.dataset.li : -1;
    if (li !== drag.li) { $$('#board .loc').forEach(c => c.classList.toggle('hover', +c.dataset.li === li)); drag.li = li; }
    drag.overHand = !!(under && under.closest('#hand'));
  }
  function endDrag(e) {
    const d = drag; drag = null;
    const gr = rectS(d.ghost);
    d.ghost.remove();
    $$('#board .loc').forEach(c => c.classList.remove('hover'));
    d.src.classList.remove('dragging');
    if (d.li >= 0 && doPlay(d.uid, d.li, gr)) return;
    if (d.fromBoard && d.overHand) { doUnplay(d.uid, gr); return; }
    // もとの位置にもどる
    const old = {}; old[d.uid] = gr; sel = d.uid; renderHand(); renderBoard(); flipFrom(old, 260); renderDetail();
  }
  function cancelDrag() { if (!drag) return; drag.ghost.remove(); drag.src.classList.remove('dragging'); drag = null; renderAll(); }

  function onTap(el) {
    const uid = el.dataset.uid;
    if (el.closest('#hand')) return trySelect(uid);
    // 置いたばかりのカード：選ぶ（説明と「手札にもどす」）
    sel = sel === uid ? null : uid; SE.play('tap', 0.5); renderHand(); markTargets(); renderDetail();
  }

  // クリック（ボタン・場所・相手のカード）
  stage.addEventListener('click', (e) => {
    const ac = e.target.closest('[data-act]');
    if (ac) { action(ac.dataset.act, ac); return; }
    if (!G || !$('#game').classList.contains('on')) return;
    const bc = e.target.closest('#board [data-uid]');
    if (bc && !bc.dataset.drag) { sel = bc.dataset.uid; SE.play('tap', 0.5); renderHand(); markTargets(); renderDetail(); return; }
    if (bc) return;
    const col = e.target.closest('#board .loc');
    if (col) {
      const li = +col.dataset.li;
      const card = typeof sel === 'string' && !sel.startsWith('loc') ? sel : null;
      const mine = card && (G.S.players[ME].hand.includes(card) || G.S.pending[ME].includes(card));
      if (mine && !busy) { doPlay(card, li); return; }
      sel = 'loc' + li; SE.play('tap', 0.5); renderHand(); markTargets(); renderDetail();
      return;
    }
  });

  // ---------- ボタンの動作 ----------
  let modalRedraw = null;
  function action(act, el) {
    switch (act) {
      case 'toDeck': SE.play('decide'); renderDeckList(); show('deck'); break;
      case 'toTitle': SE.play('tap'); closeModal(); G = null; show('title'); break;
      case 'pickDeck': SE.play('decide'); newGame(el.dataset.deck); break;
      case 'howto': SE.play('tap'); openHowto(0); break;
      case 'sound': SE.on = !SE.on; store.set('sound', SE.on); $('#soundBtn').textContent = '音：' + (SE.on ? 'オン' : 'オフ'); SE.play('tap'); break;
      case 'end': endTurn(); break;
      case 'unplay': if (sel) doUnplay(sel); break;
      case 'declare':
        if (!busy && G.declare(ME)) { SE.play('cheer'); renderAll(); banner('天下取り宣言', '勝てば★' + G.S.stakes + '！', '', 1000); }
        break;
      case 'retreat': openConfirm('撤退しますか？', `いまの賭け（★${G.S.stakes}）だけ負けて、この試合を終わります。`, '撤退する', () => { G.retreat(ME); SE.play('ko'); renderAll(); showResult(); }); break;
      case 'menu': openMenu(); break;
      case 'closeModal': SE.play('tap'); closeModal(); break;
      case 'again': SE.play('decide'); closeModal(); newGame(myDeck); break;
      case 'deckAgain': SE.play('tap'); closeModal(); G = null; renderDeckList(); show('deck'); break;
    }
  }

  function renderDeckList() {
    $('#deckList').innerHTML = Object.values(DECKS).map(d => `
      <div class="deckcard" data-act="pickDeck" data-deck="${d.id}">
        <div class="dimg" style="background-image:url('img/face/${d.face}.webp')"></div><div class="dshade"></div>
        <div class="dera">${d.era}時代</div>
        <div class="dname">${d.name}</div><div class="dtheme">テーマ「${d.theme}」</div><div class="ddesc">${d.desc}</div>
      </div>`).join('');
  }

  // ---------- モーダル ----------
  function openModal(html, redraw) { const M = $('#modal'); M.innerHTML = `<div class="shade"></div><div class="box panel">${html}</div>`; M.classList.add('on'); modalRedraw = redraw || null; fitAll(M); }
  function closeModal() { const M = $('#modal'); M.classList.remove('on'); M.innerHTML = ''; modalRedraw = null; }
  function openConfirm(title, body, okLabel, onOk) {
    openModal(`<div class="mtitle">${title}</div><div class="mbody fitb" style="text-align:center">${body}</div>
      <div class="mbtns"><button class="btn" data-act="closeModal">やめる</button><button class="btn red" id="mOk">${okLabel}</button></div>`);
    $('#mOk').onclick = () => { closeModal(); onOk(); };
  }
  function openMenu() {
    SE.play('tap');
    openModal(`<div class="mtitle">メニュー</div>
      <div class="mbody" style="display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center">
        <button class="btn" style="width:300px" id="mHow">あそびかた</button>
        <button class="btn" style="width:300px" id="mSnd">音：${SE.on ? 'オン' : 'オフ'}</button>
        <button class="btn red" style="width:300px" id="mTitle">タイトルにもどる</button>
      </div>
      <div class="mbtns"><button class="btn gold" data-act="closeModal">つづける</button></div>`, openMenu);
    $('#mHow').onclick = () => openHowto(0, true);
    $('#mSnd').onclick = () => { SE.on = !SE.on; store.set('sound', SE.on); $('#soundBtn').textContent = '音：' + (SE.on ? 'オン' : 'オフ'); $('#mSnd').textContent = '音：' + (SE.on ? 'オン' : 'オフ'); SE.play('tap'); };
    $('#mTitle').onclick = () => openConfirm('タイトルにもどりますか？', 'この試合は記録されません。', 'もどる', () => { G = null; show('title'); });
  }
  const HOWTO = [
    ['勝ち方', '試合は<b>6ターン</b>で終わります。<br>場所は3つ。<b>2つの場所</b>でパワーの合計が相手より多ければ勝ち！<br>場所は1ターン目に左、2ターン目に中央、3ターン目に右が表になります。'],
    ['カードを出す', '使えるエネルギーは<b>ターンの数</b>と同じ（3ターン目なら3）。<br>手札のカードを場所に<b>ドラッグ</b>するか、カードを選んでから場所を<b>クリック（タップ）</b>して置きます。<br>1つの場所に置けるのは<b>4枚まで</b>。置いたカードは、ターン終了まで手札にもどせます。'],
    ['公開とカードの効果', '「ターン終了」で、相手といっしょにカードを公開。<b>リードしているほう</b>が先に公開します。<br><b>公開時</b>：表になったとき1回発動　<b>永続</b>：場にいるあいだずっと<br><b>予言</b>：次のターンに相手がその場所に来たら発動<br><b>史実コンボ</b>：歴史でつながる2枚が同じ場所にそろうと強くなる'],
    ['場所の効果', '場所にはそれぞれ効果があります。<br>カードの<b>タグ</b>（政治・外交・文化・宗教・戦い）が場所に合うとパワーアップ。<br>相手の時代の場所でも戦えるように、デッキを組み立てよう。'],
    ['天下取り宣言と撤退', '勝つと<b>★1</b>。勝てそうなら<b>天下取り宣言</b>で★が2倍に。相手も宣言できます。<br>最終ターンになると、★は自動で2倍。<br>負けそうなら<b>撤退</b>すれば、その時点の★だけ負けて終われます。'],
  ];
  function openHowto(i, fromMenu) {
    const pg = HOWTO[i];
    openModal(`<div class="mtitle">${pg[0]}</div><div class="mbody fitb">${pg[1]}</div>
      <div class="dots">${HOWTO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="mbtns"><button class="btn" id="hPrev" ${i === 0 ? 'disabled' : ''}>まえへ</button>
      ${i < HOWTO.length - 1 ? '<button class="btn gold" id="hNext">つぎへ</button>' : `<button class="btn gold" id="hClose">とじる</button>`}</div>`, () => openHowto(i, fromMenu));
    if ($('#hPrev')) $('#hPrev').onclick = () => { SE.play('tap'); openHowto(i - 1, fromMenu); };
    if ($('#hNext')) $('#hNext').onclick = () => { SE.play('tap'); openHowto(i + 1, fromMenu); };
    if ($('#hClose')) $('#hClose').onclick = () => { SE.play('tap'); if (fromMenu && G) openMenu(); else closeModal(); };
  }

  function showResult() {
    busy = true; renderCtrl();
    const r = G.S.over;
    const win = r.winner === ME, draw = r.winner < 0;
    const delta = draw ? 0 : (win ? r.stakes : -r.stakes);
    const total = Math.max(0, store.get('stars', 0) + delta); store.set('stars', total);
    SE.play(win ? 'cheer' : draw ? 'tap' : 'shock');
    const locs = [0, 1, 2].map(li => {
      const a = G.total(li, ME), b = G.total(li, OP);
      const m = a > b ? '<span class="w">勝</span>' : b > a ? '<span class="l">負</span>' : '分';
      return `<div class="res-loc"><span class="rn fit">${G.loc(li).name}</span><span class="rs">${a} - ${b}　${m}</span></div>`;
    }).join('');
    const maxC = layout === 'land' ? 3 : 4;
    const cl = log.combos.slice(0, maxC).map(c => `<div class="ci"><b>${c.a} × ${c.b}</b>${c.memo}</div>`).join('');
    const more = log.combos.length > maxC ? `<div style="color:var(--ink2)">ほか ${log.combos.length - maxC} 件</div>` : '';
    const title = r.retreat !== undefined ? (win ? '相手が撤退' : '撤退') : (win ? '勝利' : draw ? '引き分け' : '敗北');
    const fn = () => {
      openModal(`<div class="res-title ${win ? 'win' : draw ? 'draw' : 'lose'}">${title}</div>
        <div class="res-stars">${draw ? '★の増減なし' : (win ? '★' + r.stakes + ' かくとく' : '★' + r.stakes + ' うしなった')}　（通算 ★${total}）</div>
        <div class="res-locs">${locs}</div>
        <div class="res-combos fitb"><h4>この試合の史実コンボ</h4>${cl || '<div style="color:var(--ink2)">史実コンボは出なかった。歴史でつながるカードを同じ場所に置いてみよう</div>'}${more}</div>
        <div class="mbtns"><button class="btn" data-act="deckAgain">デッキをえらぶ</button><button class="btn gold" data-act="again">もう一度</button></div>`, fn);
      if (win) for (let i = 0; i < 40; i++) {
        const c = document.createElement('div'); c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%'; c.style.background = ['#ffe7a3', '#e8c36a', '#8fd0ff', '#ff9aa8', '#fff'][i % 5];
        c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * .6 + 's';
        $('#modal').appendChild(c); setTimeout(() => c.remove(), 4000);
      }
    };
    fn();
  }

  // ---------- 開始 ----------
  $('#soundBtn').textContent = '音：' + (SE.on ? 'オン' : 'オフ');
  window.addEventListener('resize', fitStage);
  stage.className = layout; fitStage();
  if (layout !== stage.className) stage.className = layout;
  show('title');
  // テスト用（自動確認ツールから使う）
  window.RC_UI = { get G() { return G; }, newGame, endTurn, doPlay, action, get busy() { return busy; } };
})();
