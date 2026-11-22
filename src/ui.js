// 歴史カードバトル：画面・操作・演出
(function () {
  const { CARDS, DECKS, LOCS } = window.RC_DATA;
  const E = window.RC_ENGINE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const stage = $('#stage');
  let SPEED = 1; // 自動テストでは小さくして早送りする
  const sleep = (ms) => new Promise(r => setTimeout(r, ms * SPEED));
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

  // ---------- 段位 ----------
  const RANKS = [[0, '足軽'], [10, '武士'], [30, '大名'], [60, '天下人']];
  function rankOf(st) { let r = RANKS[0]; RANKS.forEach(x => { if (st >= x[0]) r = x; }); return r; }
  function rankIdx(st) { let k = 0; RANKS.forEach((x, i) => { if (st >= x[0]) k = i; }); return k; }
  let showLabels = store.get('labels', true);
  let use3d = store.get('d3', true);
  function applyLabels() { stage.classList.toggle('lbl', showLabels); stage.classList.toggle('d3', use3d); }

  // ---------- 画面サイズ ----------
  let layout = 'land', scale = 1;
  function fitStage() {
    const w = window.innerWidth, h = window.innerHeight;
    const nl = w < h ? 'port' : 'land';
    const W = nl === 'land' ? 1280 : 480, H = nl === 'land' ? 720 : 960;
    scale = Math.min(w / W, h / H);
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    stage.style.transform = `translate(${(w - W * scale) / 2}px, ${(h - H * scale) / 2}px) scale(${scale})`;
    if (nl !== layout) { layout = nl; stage.classList.remove('land', 'port'); stage.classList.add(layout); if (G) renderAll(); fitAll(); if ($('#modal').classList.contains('on') && modalRedraw) modalRedraw(); if ($('#zukan').classList.contains('on')) renderZukan(); if ($('#deck').classList.contains('on')) renderDeckList(); }
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
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); fitAll();
    if (window.RC_META) RC_META.onShow(id);
    if (window.RC_FX) setTimeout(() => RC_FX.screenIn($('#' + id)), 30);
  }

  // ---------- 状態 ----------
  let G = null, V = null, sel = null, busy = true, myDeck = 'himiko', cpuDeck = 'taishi', log = null;
  let ME = 0, OP = 1; // 友達対戦では、2台で同じ試合を作るため B側は ME=1 になる
  const imgUrl = (d) => d.img.startsWith('face:') ? `img/face/${d.img.slice(5)}.webp` : `img/card/${d.img}.webp`;
  const isFace = (d) => d.img.startsWith('face:');
  const revealed = (uid) => V.resolving ? V.rev.has(uid) : G.S.cards[uid].revealed;
  const pw = (uid) => V.snap.powers[uid];

  const TUT = () => window.RC_TUTORIAL && RC_TUTORIAL.active ? RC_TUTORIAL : null;
  // 試合の記録（ブラウザを閉じても、つづきから再開できるように）
  let RES = null;
  const saveRes = () => { if (RES && !RES.o.tut) store.set('resume', RES); };
  function clearResume() { RES = null; store.set('resume', null); }
  function newGame(deckId, o) {
    o = o || {};
    ME = o.me || 0; OP = 1 - ME;
    myDeck = deckId; const others = Object.keys(DECKS).filter(k => k !== deckId); cpuDeck = o.cpu || others[Math.floor(Math.random() * others.length)];
    const seed = o.seed || ((Math.random() * 1e9) | 0);
    G = E.create({ seed, decks: ME === 0 ? [myDeck, cpuDeck] : [cpuDeck, myDeck], fixed: o.fixed, rules: o.rules });
    G.S.mode = o.mode || 'cpu'; G.S.extra = o.extra || null; G.S.ruleName = o.rules && o.rules.name;
    RES = { v: 1, me: ME, deck: myDeck, cpu: cpuDeck, seed, o: { fixed: o.fixed, rules: o.rules, mode: o.mode || 'cpu', tut: !!o.tut, extra: o.extra || null }, turns: [] };
    saveRes();
    V = { resolving: false, rev: new Set(), snap: G.snap(), hide: new Set(), oppShown: false, locShown: [false, false, false], disp: null };
    log = { combos: [] }; sel = null; busy = true;
    show('game'); renderAll(); camera(-1, 1, 1, 10);
    setTimeout(nextTurn, 500);
  }
  // 記録から試合を組み立てなおす（演出なし）
  // 2台で同じ結果になるように、いつも同じ順番（プレイヤー0→1）で組み立てる
  function rebuild(R, partial) {
    const me = R.me || 0, op = 1 - me;
    const g = E.create({ seed: R.seed, decks: me === 0 ? [R.deck, R.cpu] : [R.cpu, R.deck], fixed: R.o.fixed, rules: R.o.rules }); g.S.mode = R.o.mode; g.S.extra = R.o.extra; g.S.ruleName = R.o.rules && R.o.rules.name;
    R.turns.forEach((t, i) => {
      g.startTurn();
      const by = { [me]: t.p || [], [op]: t.q || [] };
      [0, 1].forEach(pl => by[pl].forEach(([u, li]) => g.play(pl, u, li)));
      [0, 1].forEach(pl => { if ((pl === me ? t.d0 : t.d1)) g.declare(pl); });
      if (g.S.fRetreat === undefined) { if (t.r0 && t.r1) g.S.fRetreat = 0; else if (t.r0) g.S.fRetreat = me; else if (t.r1) g.S.fRetreat = op; }
      if (!(partial && i === R.turns.length - 1)) g.endTurn();
    });
    return g;
  }
  function resumeGame(R, bt, bs) {
    ME = R.me || 0; OP = 1 - ME;
    myDeck = R.deck; cpuDeck = R.cpu; RES = R;
    G = rebuild(R);
    if (G.S.over || G.S.turn >= 6) { clearResume(); RES = null; if (window.RC_META) RC_META.toMenu(); return; } // 終わった試合は再開しない
    V = { resolving: false, rev: new Set(), snap: G.snap(), hide: new Set(), oppShown: false, locShown: [0, 1, 2].map(li => G.S.turn >= li + 1), disp: null };
    log = { combos: [] }; sel = null; busy = true;
    show('game'); renderAll(); camera(-1, 1, 1, 10);
    banner(bt || 'つづきから', bs || 'ターン' + (G.S.turn + 1) + 'から再開します', '', 1400);
    setTimeout(nextTurn, 1400);
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
    const cv = V.snap.costs ? V.snap.costs[uid] : d.cost;
    const cc = cv > d.cost ? ' up' : cv < d.cost ? ' down' : '';
    if (mode === 'hand') {
      el.innerHTML = handInner(d, p, pc, cv, cc);
    } else {
      el.innerHTML = `<div class="art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div><div class="frame"></div>
        <div class="cost">${d.cost}</div><div class="pow${pc}">${p}</div><div class="bnm">${d.name}</div>${tagDots(d)}`;
      if (!V.resolving && c.loc >= 0 && revealed(uid)) {
        if (G.isProtected(uid)) el.classList.add('prot');
        if (d.kind === 'ongoing' && G.silenced(uid)) el.classList.add('muted');
      }
      if (c.proph && revealed(uid)) {
        const st = V.resolving && V.prophPending && V.prophPending.has(uid) ? 'wait' : c.proph.state;
        if (st !== 'none') el.insertAdjacentHTML('beforeend', `<div class="pmark ${st}">${st === 'hit' ? '的中' : st === 'miss' ? 'はずれ' : '予言'}</div>`);
      }
      if (revealed(uid) && c.comboShown && (!V.resolving || V.comboDone.has(uid))) el.classList.add('combo');
    }
    return el;
  }

  // カードの種類（政治・文化・宗教・戦い・外交）
  const TAGC = { '政治': 'sei', '文化': 'bun', '宗教': 'shu', '戦い': 'sen', '外交': 'gai' };
  const tagRow = (d) => `<div class="tags">${d.tags.map(t => `<span class="tg tg-${TAGC[t] || 'x'}">${t}</span>`).join('')}</div>`;
  const tagDots = (d) => `<div class="tdots">${d.tags.map(t => `<span class="tg tg-${TAGC[t] || 'x'}">${t[0]}</span>`).join('')}</div>`;
  function handInner(d, p, pc, cv, cc) {
    return `<div class="art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div><div class="frame"></div>
        <div class="cost${cc || ''}">${cv === undefined ? d.cost : cv}</div><div class="pow${pc || ''}">${p}</div><div class="lb lb-c">コスト</div><div class="lb lb-p">パワー</div>
        <div class="nm fit">${d.name}</div><div class="kw kw-${d.kind}">${KW[d.kind]}</div>${tagRow(d)}`;
  }
  function renderTop() {
    const od = DECKS[cpuDeck];
    const handN = G.S.players[OP].hand.filter(u => !V.hide.has(u)).length;
    $('#oppBar').innerHTML = `<div class="face" style="background-image:url('img/face/${od.face}.webp')"></div>
      <div><div class="oname">${od.name}デッキ</div>${layout === 'land' ? `<div class="otheme">${od.theme}・${od.desc}（${G.S.mode === 'friend' ? '友達' : 'CPU'}）</div>` : ''}</div>
      ${G.S.declaredBy === OP ? '<div class="tagbadge decl">天下取り宣言</div>' : ''}${G.S.ruleName && layout === 'land' ? `<div class="tagbadge rule">${G.S.ruleName}</div>` : ''}
      <div class="ohand">${layout === 'land' ? '手札' : ''}<b>${handN}</b></div>`;
    $('#turnBox').innerHTML = `<div class="tn">ターン ${Math.max(1, G.S.turn)}<small> / 6</small></div><div class="stk">★+${G.S.stakes}/-${G.S.stakes / 2}</div>
      <button class="menu" data-act="menu" aria-label="メニュー"><i></i><i></i><i></i></button>`;
  }

  function renderBoard() {
    const B = $('#board'); B.innerHTML = '';
    for (let li = 0; li < 3; li++) {
      const L = G.loc(li), shown = V.locShown[li];
      const col = document.createElement('div'); col.className = 'loc'; col.dataset.li = li;
      if (shown) { const t = V.snap.totals[li]; if (t[ME] > t[OP]) col.classList.add('lead-me'); else if (t[OP] > t[ME]) col.classList.add('lead-op'); }
      const mk = (p) => {
        const cap = shown ? G.cap(li, p) : 4;
        const side = document.createElement('div'); side.className = 'side ' + (p === ME ? 'me' : 'opp');
        const slots = document.createElement('div'); slots.className = 'slots';
        let list = V.disp ? V.disp[li][p] : G.S.board[li][p];
        if (p === OP && !V.oppShown) list = list.filter(u => !G.S.pending[OP].includes(u));
        for (let i = 0; i < 4; i++) {
          const sl = document.createElement('div'); sl.className = 'slot' + (i >= cap ? ' closed' : '');
          slots.appendChild(sl);
        }
        list.forEach((uid, i) => {
          const sl = slots.children[i]; if (!sl) return;
          let el;
          if (p === OP && !revealed(uid)) el = cardEl(uid, 'back');
          else { el = cardEl(uid, 'board'); if (p === ME && !revealed(uid) && !V.resolving) { el.classList.add('pend'); el.dataset.drag = '1'; } else if (p === ME && !revealed(uid)) el.classList.add('pend'); }
          el.style.position = 'absolute'; el.style.inset = '0'; el.style.width = '100%'; el.style.height = '100%';
          sl.appendChild(el);
        });
        side.appendChild(slots); return side;
      };
      const tile = document.createElement('div'); tile.className = 'tile' + (shown ? '' : ' hidden'); tile.dataset.loc = li;
      if (shown) {
        const t = V.snap.totals[li];
        tile.innerHTML = `<div class="timg" style="background-image:url('img/loc/${L.img}.webp')"></div><div class="tshade"></div>
          <div class="tot o${t[OP] > t[ME] ? ' win' : ''}" data-tot="${OP}">${t[OP]}</div>
          <div class="tname fit">${L.name}</div><div class="ttext fitb">${layout === 'port' ? L.short : L.text}</div>
          <div class="tot m${t[ME] > t[OP] ? ' win' : ''}" data-tot="${ME}">${t[ME]}</div>`;
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
      if (G.costOf(uid) > left || busy) el.classList.add('poor');
      if (sel === uid) el.classList.add('sel');
      if (newOnes && newOnes.includes(uid)) el.classList.add('newdraw');
      if (layout === 'land' && use3d) { const k = hand.indexOf(uid) - (hand.length - 1) / 2; el.style.setProperty('--fr', (k * 1.5) + 'deg'); el.style.setProperty('--fy', (k * k * 1.6) + 'px'); }
      H.appendChild(el);
    });
    if (!hand.length) H.innerHTML = '<div class="hand-empty">手札がありません</div>';
    fitAll(H);
  }

  function renderCtrl() {
    const left = G.S.turn ? G.energyLeft(ME) : 0;
    const anyPlayable = !busy && G.S.players[ME].hand.some(u => [0, 1, 2].some(li => G.canPlay(ME, u, li)));
    const bonus = G.S.turn ? G.S.players[ME].energyBonus : 0;
    $('#ctrl').innerHTML = `<div class="orb${left <= 0 ? ' zero' : ''}${bonus ? ' bonus' : ''}"><b>${left}</b><small>エネルギー</small>${bonus ? `<i class="orb-plus">+${bonus}</i>` : ''}</div>
      <button data-ico="check" class="btn gold b-end${!busy && !anyPlayable ? ' pulse' : ''}" data-act="end" ${busy ? 'disabled' : ''}>ターン終了</button>
      <button data-ico="crown" class="btn blue b-decl" data-act="declare" ${busy || !G.canDeclare(ME) ? 'disabled' : ''}>${G.S.declaredBy === ME ? '宣言中<span>★+4/-2</span>' : `天下取り<span>${layout === 'land' ? '★+4/-2 3ターンまで' : '★+4/-2'}</span>`}</button>
      <button data-ico="flag" class="btn red b-ret" data-act="retreat" ${busy || !G.canRetreat(ME) ? 'disabled' : ''}>撤退<span>${G.S.declaredBy === ME ? (layout === 'land' ? '宣言中はできない' : 'できない') : (layout === 'land' ? '★0 3ターンまで' : '★0')}</span></button>`;
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
    const p = pw(sel), cv = G.costOf(sel);
    D.innerHTML = `<div class="dt-art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div>
      <div class="dt-name fit">${d.name}</div>
      <div class="dt-meta"><span class="m c">${cv}</span><span class="m p">${p}</span>${d.tags.map(t => `<span class="m tag tg-${TAGC[t] || 'x'}">${t}</span>`).join('')}</div>
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
  function flipFrom(old, dur, sel) {
    $$(sel || '#board [data-uid], #hand [data-uid]').forEach(el => {
      const a = old[el.dataset.uid]; if (!a) return;
      const b = rectS(el); if (!b.w) return;
      const dx = a.x - b.x, dy = a.y - b.y, sx = a.w / b.w, sy = a.h / b.h;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .02) return;
      el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }],
        { duration: dur || 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  // ---------- カメラ（疑似3D）----------
  // li：寄る場所（-1で全体）、z：寄りぐあい、tilt：傾きの倍率
  function camera(li, z, tilt, dur) {
    const B = $('#board'); if (!B) return Promise.resolve();
    if (!use3d) { B.style.removeProperty('--cx'); B.style.removeProperty('--cz'); B.style.removeProperty('--tilt'); return Promise.resolve(); }
    let cx = 0;
    if (li >= 0) { const col = B.children[li]; if (col) cx = (B.offsetWidth / 2 - (col.offsetLeft + col.offsetWidth / 2)) * 0.6; }
    B.style.setProperty('--dur', (dur || 500) + 'ms');
    B.style.setProperty('--cx', cx + 'px'); B.style.setProperty('--cz', z || 1); B.style.setProperty('--tilt', tilt === undefined ? 1 : tilt);
    return sleep(dur || 500);
  }
  function cameraReset(dur) { return camera(-1, 1, 1, dur || 400); }

  // カードを手札から盤面へ、弧をえがいて飛ばす
  function flyCard(uid, from, toEl, done) {
    const fly = cardEl(uid, 'hand'); fly.classList.add('ghost', 'flying'); fly.classList.remove('poor', 'sel', 'newdraw');
    FX.appendChild(fly); fitAll(fly);
    const w = fly.offsetWidth, h = fly.offsetHeight, to = rectS(toEl);
    const mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - 70;
    toEl.style.visibility = 'hidden';
    const a = fly.animate([
      { transform: `translate(${from.x}px,${from.y}px) scale(${from.w / w},${from.h / h}) rotate(0deg)` },
      { transform: `translate(${mx}px,${my}px) scale(${(from.w / w + to.w / w) / 2 * 1.1}) rotate(${to.x > from.x ? 8 : -8}deg)`, offset: .5 },
      { transform: `translate(${to.x}px,${to.y}px) scale(${to.w / w},${to.h / h}) rotate(0deg)` }],
      { duration: 340, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
    fly.style.transformOrigin = '0 0';
    a.onfinish = () => { fly.remove(); toEl.style.visibility = ''; done && done(); };
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
  // カットイン（強いカード・史実コンボ）
  async function cutIn(uids, name, sub, mode, mine) {
    const arts = uids.map(u => { const d = CARDS[G.S.cards[u].id]; return `<div class="cu-art${isFace(d) ? ' face' : ''}" style="background-image:url('${imgUrl(d)}')"></div>`; }).join(mode === 'combo' ? '<div class="cu-x">×</div>' : '');
    const tag = mode === 'combo' ? '史実コンボ' : (mine ? 'あなたの切り札' : '相手の切り札');
    const el = addFx(`<div class="cutin ${mode} ${mine ? 'me' : 'op'}"><div class="cu-flash"></div><div class="cu-band"><div class="cu-lines"></div>
      <div class="cu-arts">${arts}</div><div class="cu-text"><div class="cu-tag">${tag}</div><div class="cu-name">${name}</div><div class="cu-sub">${sub}</div></div></div></div>`, undefined, undefined, 99999);
    SE.whoosh(); SE.play(mode === 'combo' ? 'cheer' : 'shock', 0.8);
    await sleep(mode === 'combo' ? 1900 : 1050);
    el.classList.add('out'); await sleep(260); el.remove();
  }
  // 「〇〇の効果」吹き出し：どのカードの効果で、何がいくつ変わったか
  function fxCall(srcUid, lines, at) {
    const src = srcUid && cardNode(srcUid), d = srcUid && CARDS[G.S.cards[srcUid].id];
    const c = at || (src ? centerOf(src) : { x: stage.offsetWidth / 2, y: stage.offsetHeight / 2 });
    const mine = srcUid && G.S.cards[srcUid].owner === ME;
    const html = `<div class="fxcall ${mine ? 'me' : 'op'}"><div class="fc-h">${d ? d.name + 'の効果' : '効果'}</div>${lines.map(l => `<div class="fc-l"><span>${l[0]}</span>${l[1] !== undefined ? `<b class="${l[2] || ''}">${l[1]}</b>` : ''}</div>`).join('')}</div>`;
    const el = addFx(html, c.x, c.y, 1500);
    // 画面からはみ出さないように
    const W = stage.offsetWidth, H = stage.offsetHeight, w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, c.x)) + 'px';
    el.style.top = Math.max(h + 8, Math.min(H - 8, c.y - 34)) + 'px';
    return el;
  }
  // 効果の元から対象へ光の線
  function beam(fromEl, toEl, cls) {
    if (!fromEl || !toEl || fromEl === toEl) return;
    const a = centerOf(fromEl), b = centerOf(toEl), dx = b.x - a.x, dy = b.y - a.y;
    const el = addFx(`<div class="beam ${cls || ''}"></div>`, a.x, a.y, 700);
    el.style.width = Math.hypot(dx, dy) + 'px'; el.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }
  const strong = (d) => d.cost >= 5 || d.leader;
  const nm = (u) => CARDS[G.S.cards[u].id].name;
  const sg = (n) => (n > 0 ? '+' : '') + n;
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
      if (V.resolving) { const r = rectS(el); floatText(r.x + r.w + 16, r.y + r.h / 2, sg(to - from), 'tdiff ' + (to > from ? 'plus' : 'minus')); el.classList.remove('tglow'); void el.offsetWidth; el.classList.add('tglow'); if (window.RC_FX) RC_FX.pop(el, to > from); }
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
      if (e.t === 'turn') { SE.whoosh(); camera(-1, 1.04, 1, 600); await banner('ターン ' + e.turn, e.turn === 6 ? '最終ターン' : 'エネルギー ' + e.turn, '', 750); }
      else if (e.t === 'locReveal') {
        await camera(e.li, 1.12, 0.85, 450);
        V.locShown[e.li] = true; renderBoard();
        const tile = $(`#board .loc[data-li="${e.li}"] .tile`); tile.classList.add('flipin'); SE.whoosh(true); SE.play('decide');
        setTimeout(() => { const c = centerOf(tile); ring(c.x, c.y); sparks(c.x, c.y, 14); }, 250);
        await sleep(850);
      }
    }
    await cameraReset(350);
    for (const e of ev) if (e.t === 'effect' && e.rule) { const el = cardNode(e.uid); if (el) { const c = centerOf(el); floatText(c.x, c.y - 10, e.text, 'plus'); el.classList.add('buff'); } }
    for (const e of ev) {
      if (e.p !== ME) continue;
      const orb = $('#ctrl .orb'), c = orb ? centerOf(orb) : { x: 640, y: 600 };
      if (e.t === 'ramp') { renderCtrl(); floatText(c.x, c.y - 50, 'エネルギー+' + e.amount, 'plus'); SE.play('good', 0.8); await sleep(700); }
      if (e.t === 'costUp') { floatText(c.x, c.y - 50, '手札のコスト+' + e.amount, 'minus'); SE.play('ng', 0.8); await sleep(700); }
    }
    draws.filter(e => e.p === OP).forEach(e => V.hide.delete(e.uid));
    const mine = draws.filter(e => e.p === ME).map(e => e.uid);
    mine.forEach(u => V.hide.delete(u));
    renderTop(); renderHand(mine); if (mine.length) SE.play('tap');
    await sleep(mine.length ? 450 : 0);
    // CPU（置き場所は伏せたまま、ターン終了で見せる）
    let dc = null;
    const MODE = (window.RC_MODES || {})[G.S.mode];
    if (TUT()) TUT().cpu(G, OP);
    else if (MODE && MODE.cpu) MODE.cpu(G, OP);
    else { E.cpuPlan(G, OP); dc = MODE && MODE.noDecide ? null : E.cpuDecide(G, OP); }
    if (dc === 'declare' && G.declare(OP)) { SE.play('shock'); await banner('天下取り宣言', '相手が勝負に出た！ 勝てば★+4、負けると★-2。撤退は3ターン目まで', '', 1600); }
    else if (dc === 'retreat') { G.retreat(OP); renderAll(); camera(-1, 0.96, 0.45, 900); return showResult(); }
    V.handStart = G.S.players[ME].hand.slice();
    busy = false; V.snap = G.snap(); renderAll();
    if (TUT()) TUT().onTurn(G.S.turn);
  }

  async function endTurn() {
    if (busy) return;
    busy = true; sel = null; SE.play('decide');
    if (G.S.mode !== 'tut' && window.RC_META) G.S.pending[ME].forEach(u => { const d = CARDS[G.S.cards[u].id]; RC_META.track('play', { kind: d.kind, tags: d.tags }); });
    const MODE = (window.RC_MODES || {})[G.S.mode];
    const pl = (p) => G.S.pending[p].map(u => [u, G.S.cards[u].loc]);
    let rec = { p: pl(ME), q: pl(OP), d0: G.S.declaredBy === ME, d1: G.S.declaredBy === OP, r0: !!G.S.myRetreatReq };
    // 友達対戦：音で相手の手を受け取る
    if (MODE && MODE.exchange) { const r = await MODE.exchange(G, ME, rec, V.handStart); if (!r) { busy = false; renderCtrl(); return; } rec.q = r.plays; rec.d1 = r.decl; rec.r1 = !!r.retreat; }
    if (RES) {
      RES.turns.push(rec); saveRes();
      // 記録から組み立てなおして、毎回同じ順番で解決する（2台対戦・再開で結果がずれないように）
      const hide = V.hide; G = rebuild(RES, true); V.snap = G.snap(); V.hide = hide;
    }
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
    V.disp = G.S.board.map(l => l.map(x => x.slice()));
    const ev = G.endTurn();
    V.resolving = true; V.rev = prevRev; V.prophPending = prophWait; V.comboDone = comboBefore;
    G.S.players[ME].hand.forEach(u => { if (!handBefore.has(u)) V.hide.add(u); });
    G.S.players[OP].hand.forEach(u => { if (!handBefore.has(u)) V.hide.add(u); });

    for (const e of ev) {
      if (e.t === 'revealStart') {
        await banner(e.first === ME ? 'あなたから公開' : '相手から公開', 'リードしているほうが先に公開', '', 700);
      } else if (e.t === 'reveal') {
        if (e.li !== V.camLi) { V.camLi = e.li; await camera(e.li, 1.06, 0.92, 260); }
        V.rev.add(e.uid); V.snap = e.snap; renderBoardCounting();
        const el = cardNode(e.uid);
        if (el) { el.classList.add('flipin'); const c = centerOf(el); setTimeout(() => { ring(c.x, c.y, e.p === ME ? 'blue' : 'red'); }, 120); }
        SE.whoosh(true); SE.play('tap', 0.8);
        await sleep(560);
        const rd = CARDS[G.S.cards[e.uid].id];
        if (window.RC_FX) await RC_FX.reveal(cardNode(e.uid), rd, strong(rd));
        if (strong(rd)) await cutIn([e.uid], rd.name, rd.text, 'big', e.p === ME);
      } else if (e.t === 'effect') {
        V.snap = e.snap; renderBoardCounting(); renderHand();
        const src = cardNode(e.uid);
        if (e.proph) { V.prophPending.add(e.uid); renderBoard(); }
        if (src) src.classList.add('casting');
        if (!e.targets.length && !e.cost) fxCall(e.uid, [[e.text]]);
        if (e.cost) { fxCall(e.uid, [[e.text]]); $$('#hand .hc').forEach(h => { h.classList.add('buff'); beam(src, h, 'gold'); }); SE.play('good', 0.8); await sleep(800); continue; }
        if (e.targets.length) {
          // 対象がほかの場所にもあるときは全体を見せる
          const lis = new Set(e.targets.map(t => G.S.cards[t].loc).filter(l => l >= 0));
          if (lis.size > 1 || (lis.size === 1 && !lis.has(V.camLi))) { V.camLi = lis.size === 1 ? [...lis][0] : -1; await camera(V.camLi, V.camLi < 0 ? 1 : 1.06, V.camLi < 0 ? 1 : 0.92, 240); }
          SE.play(e.delta < 0 ? 'hit' : 'ok', 0.9);
          const lines = [];
          e.targets.forEach(t => {
            const el = cardNode(t);
            if (e.delta !== undefined) lines.push([nm(t), sg(e.delta), e.delta < 0 ? 'minus' : 'plus']);
            if (!el) return;
            const c = centerOf(el);
            beam(src, el, e.delta < 0 ? 'red' : 'gold'); if (window.RC_FX) RC_FX.orb(src, el, e.delta >= 0);
            el.classList.add(e.delta < 0 ? 'hit' : 'buff');
            if (e.delta !== undefined) floatText(c.x, c.y - 10, sg(e.delta), e.delta < 0 ? 'minus' : 'plus');
            if (e.delta > 0) sparks(c.x, c.y, 8); else if (e.delta < 0) ring(c.x, c.y, 'red');
          });
          if (e.toHand) lines.unshift(['手札']);
          if (!lines.length) lines.push([e.text]);
          else { const tx = (e.text || '').replace(/\s*[+\-−]?\d+$/, '').trim(); if (tx && lines.length < 4 && !e.targets.some(t => tx.includes(nm(t)))) lines.unshift([tx]); }
          fxCall(e.uid, lines.slice(0, 5));
        }
        await sleep(e.targets.length ? 900 : 650);
      } else if (e.t === 'destroy') {
        const src = cardNode(e.uid), el = cardNode(e.target);
        fxCall(e.uid, [[nm(e.target), '退場', 'minus']]); beam(src, el, 'red');
        await sleep(350);
        if (el && window.RC_FX) RC_FX.destroy(el);
        if (el) { const c = centerOf(el); el.classList.add('shatter'); sparks(c.x, c.y, 18); ring(c.x, c.y, 'red'); floatText(c.x, c.y, '退場', 'minus'); }
        SE.play('hit'); SE.whoosh();
        await sleep(600);
        V.disp.forEach(l => l.forEach((x, i) => l[i] = x.filter(u => u !== e.target)));
        V.snap = e.snap; renderBoardCounting();
        await sleep(250);
      } else if (e.t === 'steal' || e.t === 'move') {
        const src = cardNode(e.uid), tu = e.target || e.uid, owner = G.S.cards[tu].owner;
        fxCall(e.uid, [[nm(tu), e.t === 'steal' ? 'うばう' : (e.target ? '移動' : 'かけつける'), e.t === 'steal' ? 'minus' : '']]);
        await sleep(300);
        const old = grabRects();
        V.disp.forEach(l => l.forEach((x, i) => l[i] = x.filter(u => u !== tu)));
        V.disp[e.t === 'steal' ? e.li : e.to][owner].push(tu);
        V.snap = e.snap; renderBoardCounting(); flipFrom(old, 520, '#board [data-uid]');
        SE.whoosh(); SE.play(e.t === 'steal' ? 'shock' : 'tap', 0.8);
        await sleep(560);
        const el = cardNode(tu); if (el) { const c = centerOf(el); ring(c.x, c.y, owner === ME ? 'blue' : 'red'); }
        await sleep(250);
      } else if (e.t === 'spawn') {
        e.targets.forEach(t => { V.rev.add(t); V.disp[G.S.cards[t].loc][e.p].push(t); });
        V.snap = e.snap; renderBoardCounting();
        e.targets.forEach(t => { const el = cardNode(t); if (el) { el.classList.add('slam'); const c = centerOf(el); ring(c.x, c.y, e.p === ME ? 'blue' : 'red'); sparks(c.x, c.y, 8); } });
        SE.play('decide', 0.8); await sleep(650);
      } else if (e.t === 'draw') {
        V.hide.delete(e.uid); renderTop(); if (e.p === ME) renderHand([e.uid]);
        const src = cardNode(e.reason);
        if (src) { fxCall(e.reason, [['カードを引く', '+1枚', 'plus']]); if (e.p === ME) beam(src, cardNode(e.uid), 'gold'); }
        SE.play('tap', 0.8); await sleep(550);
      } else if (e.t === 'discard') {
        fxCall(e.uid, e.targets.map(u => [nm(u), '捨てた', 'minus']));
        V.snap = e.snap; renderHand(); SE.play('ng', 0.8); await sleep(850);
      } else if (e.t === 'rampSet' || e.t === 'canceled') {
        const src = cardNode(e.uid);
        fxCall(e.uid, [e.t === 'rampSet' ? ['次のターンのエネルギー', '+' + e.amount, 'plus'] : ['効果が止められた']]); if (src && e.t === 'canceled') src.classList.add('hit');
        SE.play(e.t === 'rampSet' ? 'good' : 'ng', 0.7); await sleep(650);
      } else if (e.t === 'fetch') {
        V.hide.delete(e.uid); renderTop(); renderHand(e.p === ME ? [e.uid] : null);
        const src = cardNode(e.from);
        fxCall(e.from, [[nm(e.uid), '手札へ', 'plus']]); if (e.p === ME) beam(src, cardNode(e.uid), 'gold');
        SE.play('good', 0.8); await sleep(800);
      } else if (e.t === 'combo') {
        V.camLi = G.S.cards[e.uid].loc; await camera(V.camLi, 1.14, 0.85, 320);
        V.comboDone.add(e.uid); V.snap = e.snap; renderBoardCounting();
        const d = CARDS[G.S.cards[e.uid].id], pd = CARDS[G.S.cards[e.partner].id];
        [e.uid, e.partner].forEach(u => { const el = cardNode(u); if (el) { const c = centerOf(el); ring(c.x, c.y); sparks(c.x, c.y, 16); } });
        SE.play('good');
        if (G.S.cards[e.uid].owner === ME) log.combos.push({ a: pd.name, b: d.name, memo: d.memo });
        else log.combos.push({ a: pd.name, b: d.name, memo: d.memo, opp: true });
        if (window.RC_FX) await RC_FX.lightning(cardNode(e.partner), cardNode(e.uid));
        await cutIn([e.partner, e.uid], `${pd.name} × ${d.name}`, d.memo + `<b>${d.name} パワー+${d.amount}</b>`, 'combo', G.S.cards[e.uid].owner === ME);
      } else if (e.t === 'prophecy') {
        V.prophPending.delete(e.uid); V.snap = e.snap; renderBoardCounting();
        const el = cardNode(e.uid);
        if (el) { const c = centerOf(el); addFx(`<div class="stamp ${e.hit ? 'hit' : 'miss'}">${e.hit ? '予言的中' : 'はずれ'}</div>`, c.x, c.y - 10, 1000); if (e.hit) { ring(c.x, c.y); sparks(c.x, c.y, 16); } }
        SE.play(e.hit ? 'good' : 'ng', 0.8);
        if (e.hit) { e.targets.forEach(t => { const tl = cardNode(t); if (!tl) return; const c = centerOf(tl); beam(el, tl, e.delta < 0 ? 'red' : 'gold'); tl.classList.add(e.delta < 0 ? 'hit' : 'buff'); floatText(c.x, c.y, sg(e.delta), e.delta < 0 ? 'minus' : 'plus'); });
          if (e.targets.length) fxCall(e.uid, e.targets.slice(0, 4).map(t => [nm(t), sg(e.delta), e.delta < 0 ? 'minus' : 'plus'])); }
        await sleep(950);
      }
    }
    V.camLi = -1; await cameraReset(350);
    V.resolving = false; V.oppShown = false; V.hide.clear(); V.disp = null;
    V.snap = G.snap(); renderAll();
    if (TUT()) await TUT().afterTurn(G.S.turn);
    if (G.S.over) { camera(-1, 0.96, 0.45, 900); await sleep(700); return showResult(); }
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
    if (TUT() && !TUT().allowPlay(G.S.cards[uid].id, li)) { SE.play('ng', 0.6); TUT().nudge(); return false; }
    const was = G.S.pending[ME].includes(uid);
    if (!G.canPlay(ME, uid, li)) {
      SE.play('ng', 0.6);
      const cost = CARDS[G.S.cards[uid].id].cost;
      const msg = !V.locShown[li] ? 'まだ表になっていない場所' : (!was && cost > G.energyLeft(ME)) ? 'エネルギーが足りない' : 'この場所はいっぱい';
      const col = $(`#board .loc[data-li="${li}"] .tile`); if (col) { const c = centerOf(col); floatText(c.x, c.y, msg, 'info'); }
      return false;
    }
    const old = grabRects(); const from = fromRect || old[uid];
    G.play(ME, uid, li);
    sel = null; V.snap = G.snap();
    renderBoard(); renderHand(); renderCtrl(); renderDetail();
    flipFrom(old, 260, '#hand [data-uid]');
    const el = cardNode(uid);
    const land = () => { el.classList.add('slam'); const c = centerOf(el); ring(c.x, c.y, 'blue'); sparks(c.x, c.y, 8); SE.whoosh(); if (window.RC_FX) RC_FX.place(el, CARDS[G.S.cards[uid].id]); };
    if (el && from) flyCard(uid, from, el, land); else if (el) land();
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
    if (window.RC_META && RC_META.action(act, el)) return;
    switch (act) {
      case 'toDeck': SE.play('decide'); show('deck'); renderDeckList(true); break;
      case 'zukan': SE.play('decide'); RC_META.openZList(true); break;
      case 'zkBack': SE.play('tap'); if (zk.from === 'shop') RC_META.openShop(); else RC_META.openZList(); break;
      case 'zkPrev': case 'zkNext': {
        SE.play('tap'); const ids = Object.keys(DECKS), own = ids.filter(i => RC_META.isOwned(i)); if (own.length < 2) break;
        const cur = own.indexOf(ids[zk.deck]); const nx = own[(cur + (act === 'zkNext' ? 1 : own.length - 1)) % own.length];
        zk.deck = ids.indexOf(nx); zk.card = 0; renderZukan(); break; }
      case 'zkCard': SE.play('tap', 0.6); zk.card = +el.dataset.i; renderZukan(); break;
      case 'toTitle': SE.play('tap'); RC_META.toMenu(); break;
      case 'pickDeck': SE.play('decide'); newGame(el.dataset.deck); break;
      case 'howto': SE.play('tap'); openHowto(0); break;
      case 'settings': SE.play('tap'); openSettings(false); break;
      case 'end': endTurn(); break;
      case 'unplay': if (sel) doUnplay(sel); break;
      case 'declare':
        if (!busy && G.canDeclare(ME)) openConfirm('天下取り宣言しますか？', '勝てば<b>★+4</b>、負ければ<b>★-2</b>になります。<br>宣言すると、この試合ではもう撤退できません。', '宣言する', () => { G.declare(ME); SE.play('cheer'); renderAll(); banner('天下取り宣言', '勝てば★+4！ もう逃げない', '', 1100); }, 'blue');
        break;
      case 'retreat': if (G.S.mode === 'friend') { if (!busy && G.S.turn <= 3 && !G.S.fRetreat && G.S.declaredBy !== ME) openConfirm('撤退しますか？', '友達対戦では、撤退しても試合は最後まで続きます。<br>勝ち負けは<b>あなたの負け</b>で決まり、★は減りません。', '撤退する', () => { G.S.myRetreatReq = true; SE.play('ko'); banner('撤退', 'ターン終了で相手に伝わります', '', 1200); }); break; }
        if (!busy && G.canRetreat(ME)) openConfirm('撤退しますか？', '<b>★を減らさずに</b>負けて、この試合を終わります。<br>（ふつうに負けると★-1、宣言されて負けると★-2）', '撤退する', () => { G.retreat(ME); SE.play('ko'); renderAll(); camera(-1, 0.96, 0.45, 900); showResult(); }); break;
      case 'menu': openMenu(); break;
      case 'closeModal': SE.play('tap'); closeModal(); break;
      case 'again': SE.play('decide'); closeModal(); newGame(myDeck); break;
      case 'deckAgain': SE.play('tap'); closeModal(); G = null; show('deck'); renderDeckList(); break;
      case 'resMenu': SE.play('tap'); RC_META.toMenu(); break;
    }
  }

  function renderDeckList(r) { if (window.RC_META) RC_META.renderDeckList(r); }

  // ---------- カード図鑑 ----------
  let zk = { deck: 0, card: 0, from: 'title' };
  function renderZukan() {
    const ids = Object.keys(DECKS), d = DECKS[ids[zk.deck]];
    $('#zkTop').innerHTML = `<div class="zf" style="background-image:url('img/face/${d.face}.webp')"></div>
      <div class="zt"><div class="zn fit">${d.name}</div><div class="ze fit">${d.era}時代・「${d.theme}」${layout === 'land' ? '　' + d.desc : ''}　${zk.from === 'shop' ? 'ショップの品' : ''}</div></div>
      ${zk.from === 'shop' ? '' : `<button class="btn" data-act="zkPrev">${layout === 'land' ? '前の人物' : '前へ'}</button><button class="btn" data-act="zkNext">${layout === 'land' ? '次の人物' : '次へ'}</button>`}`;
    $('#zkGrid').innerHTML = d.cards.map((cid, i) => { const c = CARDS[cid]; return `<div class="card hc zkhc${i === zk.card ? ' on' : ''}${c.leader || isFace(c) ? ' leader' : ''}" data-act="zkCard" data-i="${i}">${handInner(c, c.power)}</div>`; }).join('');
    const c = CARDS[d.cards[zk.card]];
    const decksWith = Object.values(DECKS).filter(x => x.cards.includes(c.id)).map(x => x.name);
    $('#zkInfo').innerHTML = `<div class="zi-art${isFace(c) ? ' face' : ''}" style="background-image:url('${imgUrl(c)}')"></div>
      <div class="zi-name fit">${c.name}</div>
      <div class="zi-meta"><span class="m c">コスト ${c.cost}</span><span class="m p">パワー ${c.power}</span>${c.tags.map(t => `<span class="m tag tg-${TAGC[t] || 'x'}">${t}</span>`).join('')}</div>
      <div class="zi-text fitb"><span class="kwl kw-${c.kind}">${KW[c.kind]}</span>${c.kind === 'none' ? '' : c.text}</div>
      <div class="zi-memo fitb">${c.memo}</div>
      <div class="zi-share fitb">${decksWith.length > 1 ? '共通カード：' + decksWith.join('・') + 'のデッキに入っている' : ''}</div>`;
    fitAll($('#zukan'));
  }
  function openZukanDeck(id, from) { zk.from = from; zk.deck = Object.keys(DECKS).indexOf(id); zk.card = 0; show('zukan'); renderZukan(); }

  // ---------- モーダル ----------  // ---------- モーダル ----------
  function openModal(html, redraw, cls) { const M = $('#modal'); M.innerHTML = `<div class="shade"></div><div class="box panel ${cls || ''}">${html}</div>`; M.classList.add('on'); modalRedraw = redraw || null; M.querySelectorAll('.mtitle').forEach(t => t.classList.add('fit')); fitAll(M); }
  function closeModal() { const M = $('#modal'); M.classList.remove('on'); M.innerHTML = ''; modalRedraw = null; }
  function openConfirm(title, body, okLabel, onOk, color, pre) {
    openModal(`<div class="mtitle">${title}</div><div class="mbody cbody">${pre || ''}<div class="fitb ctext">${body}</div></div>
      <div class="mbtns"><button class="btn" data-act="closeModal" data-ico="back">やめる</button><button class="btn ${color || 'red'}" id="mOk">${okLabel}</button></div>`, null, pre ? 'cfm tall' : 'cfm');
    $('#mOk').onclick = () => { closeModal(); onOk(); };
  }
  function openMenu() {
    SE.play('tap');
    openModal(`<div class="mtitle">メニュー</div>
      <div class="mbody" style="display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center">
        <button class="btn" style="width:300px" id="mHow">あそびかた</button>
        <button class="btn" style="width:300px" id="mSet">設定</button>
        <button class="btn red" style="width:300px" id="mTitle">タイトルにもどる</button>
      </div>
      <div class="mbtns"><button class="btn gold" data-act="closeModal">つづける</button></div>`, openMenu);
    $('#mHow').onclick = () => openHowto(0, true);
    $('#mSet').onclick = () => openSettings(true);
    $('#mTitle').onclick = () => openConfirm('タイトルにもどりますか？', 'この試合は放棄されます（★・コインは変わりません）。', 'もどる', () => quitGame());
  }
  let dbgTaps = 0;
  // 全画面（PC・スマホ）
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fsOK = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  function toggleFull() {
    try {
      if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
    } catch (e) {}
  }
  document.addEventListener('fullscreenchange', () => setTimeout(fitStage, 120));
  document.addEventListener('webkitfullscreenchange', () => setTimeout(fitStage, 120));
  function openSettings(fromMenu) {
    const IC = (n) => window.RC_ICON(n, 'srow');
    const row = (id, ic, label, on) => `<div class="setrow">${IC(ic)}<span>${label}</span><button class="btn tog ${on ? 'gold on' : ''}" id="${id}"><i></i>${on ? 'オン' : 'オフ'}</button></div>`;
    const act = (id, ic, label, b, cls) => `<div class="setrow">${IC(ic)}<span>${label}</span><button class="btn ${cls || ''}" id="${id}">${b}</button></div>`;
    const rows = [row('sSnd', 'sound', '効果音', SE.on), row('sBgm', 'music', 'BGM', RC_META.BGM.on), row('sLbl', 'label', 'コスト・パワーの文字', showLabels), row('s3d', 'cube', '3D表示（重いときはオフ）', use3d)];
    if (window.RC_FX && RC_FX.ok) rows.push(act('sFx', 'star', '演出の豪華さ', RC_FX.quality === 'high' ? '豪華' : 'ふつう', RC_FX.quality === 'high' ? 'gold' : ''));
    if (fsOK()) rows.push(act('sFull', 'full', '全画面表示', fsEl() ? 'もどす' : '全画面', fsEl() ? 'gold' : ''));
    if (G) rows.push(act('sQuit', 'home', 'タイトル画面にもどる（試合は放棄）', 'もどる', 'red'));
    else rows.push(act('sBg', 'palette', 'メニューの背景', 'えらぶ'), act('sName', 'pen', '名前：' + RC_META.playerName(), 'かえる'), act('sTut', 'help', 'チュートリアル', '見る'));
    openModal(`<div class="mtitle" id="sTitle">設定</div>
      <div class="mbody setbody${rows.length > 5 ? ' many' : ''}">${rows.join('')}</div>
      <div class="mbtns"><button class="btn gold" id="sBack">${fromMenu ? 'もどる' : 'とじる'}</button></div>`, () => openSettings(fromMenu), rows.length > 5 ? 'big' : '');
    // 「設定」の文字を20回おすとデバッグモード
    $('#sTitle').onclick = () => { dbgTaps++; if (dbgTaps >= 20) { dbgTaps = 0; SE.play('decide'); RC_META.openDebug(); } };
    $('#sBgm').onclick = () => { RC_META.BGM.set(!RC_META.BGM.on); SE.play('tap'); openSettings(fromMenu); };
    $('#sSnd').onclick = () => { SE.on = !SE.on; store.set('sound', SE.on); SE.play('tap'); openSettings(fromMenu); };
    $('#s3d').onclick = () => { use3d = !use3d; store.set('d3', use3d); applyLabels(); SE.play('tap'); if (G) { renderAll(); camera(-1, 1, 1, 10); } openSettings(fromMenu); };
    $('#sLbl').onclick = () => { showLabels = !showLabels; store.set('labels', showLabels); applyLabels(); SE.play('tap'); openSettings(fromMenu); };
    if ($('#sFx')) $('#sFx').onclick = () => { SE.play('tap'); RC_FX.setQuality(RC_FX.quality === 'high' ? 'low' : 'high'); openSettings(fromMenu); };
    if ($('#sFull')) $('#sFull').onclick = () => { SE.play('tap'); toggleFull(); setTimeout(() => openSettings(fromMenu), 300); };
    if ($('#sTut')) $('#sTut').onclick = () => { SE.play('decide'); closeModal(); window.RC_TUTORIAL.start(null); };
    if ($('#sBg')) $('#sBg').onclick = () => { SE.play('tap'); RC_META.openBgPicker(); };
    if ($('#sName')) $('#sName').onclick = () => { SE.play('tap'); RC_META.openNameInput(() => openSettings(fromMenu)); };
    if ($('#sQuit')) $('#sQuit').onclick = () => { SE.play('tap'); openConfirm('タイトル画面にもどりますか？', 'この試合は放棄されます（★・コインは変わりません）。<br>相手との通信が切れたときや、同期がずれたときに使ってください。', 'もどる', () => quitGame(), 'red'); };
    $('#sBack').onclick = () => { SE.play('tap'); if (fromMenu && G) openMenu(); else closeModal(); };
  }
  function quitGame() {
    G = null; busy = false; if (window.RC_TUTORIAL) RC_TUTORIAL.stop();
    clearResume(); if (window.RC_META) RC_META.toMenu();
  }
  function cardGuide() {
    const d = CARDS['kenpo'];
    const items = [['1', 'コスト', '出すのに必要なエネルギー'], ['2', 'パワー', '場所の合計に足される強さ'], ['3', '名前', '歴史の人物・出来事・もの'], ['4', '効果の種類', '公開時・永続・予言・史実コンボ。<br>くわしい効果はカードを選ぶと出る']];
    return `<div class="guide"><div class="gcard"><div class="card hc">${handInner(d, d.power)}</div>
      <i class="num n1">1</i><i class="num n2">2</i><i class="num n3">3</i><i class="num n4">4</i></div>
      <div class="glist">${items.map(x => `<div class="gi"><i class="num">${x[0]}</i><div><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('')}</div></div>`;
  }
  // あそびかた：画面のスクショに番号をつけて説明（スクショは tools/howtoshots.py で撮る）
  const HIMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const HOWTO = [
    ['カードの見方', null],
    ['画面の見方', 'screen', [['相手', 'デッキと手札の枚数'], ['場所', '3つの場所で勝負する'], ['自分の場', 'ここにカードを置く'], ['手札', '出せるカード'], ['エネルギー', 'ターンの数だけ使える'], ['ターン終了', '置き終わったら押す'], ['ターン・メニュー', '6ターンで試合終了']]],
    ['勝ち方', 'win', [['自分の合計', 'その場所の自分のパワーの合計'], ['相手の合計', '相手のパワーの合計'], ['場所が表になる', '1・2・3ターン目に左から1つずつ']], '<b>3つの場所のうち2つ</b>で合計が多ければ勝ち！'],
    ['カードを出す', 'play', [['カードをえらぶ', 'タップ（クリック）かドラッグ'], ['場所をえらぶ', '置きたい場所をタップ'], ['エネルギー', 'カードのコストの分だけ使う'], ['説明', 'えらんだカードの効果が出る']], '1つの場所に<b>4枚まで</b>。ターン終了まではやり直せる'],
    ['場所の効果', 'loc', [['場所をタップ', '表になった場所をえらぶ'], ['効果', '合うカードがパワーアップ']], 'カードの種類（政治・文化など）が場所に合うと強くなる'],
    ['効果の種類', 'kinds', [['効果の種類', '<b>公開時</b>：表になったとき1回／<b>永続</b>：ずっと／<b>予言</b>：相手も同じ場所に出したら'], ['カードの種類', '政治・文化・宗教・戦い・外交'], ['場のカード', '左下の小さな字が種類']]],
    ['史実コンボ', 'combo', [['コンボのカード', '金色の「史実コンボ」'], ['説明', '歴史でつながるカードと同じ場所にそろうと、パワーアップ']], '例：卑弥呼と魏への使い。カード図鑑でさがそう'],
    ['天下取りと撤退', 'decl', [['天下取り宣言', '勝てば★+4・負けると★-2（3ターン目まで）'], ['撤退', '★を減らさずに試合を終わる（3ターン目まで）'], ['ターンと★', 'いまのターンと、勝ち負けの★']], 'CPU戦は勝ち★+2・負け★-1。段位は負けても下がらない'],
    ['ランクとコイン', 'rank', [['CPUランク', 'CPU戦の★で上がる'], ['対人ランク', '友達との対戦で上がる'], ['コイン', '試合やミッションでもらえる'], ['デイリー', '毎日3つのミッション（最大200コイン）']]],
    ['ショップ', 'shop', [['デッキ', '毎日8つ入れかわる'], ['ねだん', 'さいしょの5デッキは50コイン'], ['コイン', 'いま持っているコイン']], '買うとメニューの背景ももらえる'],
    ['モード', 'modes', [['CPUと対戦', 'ふつうの対戦'], ['時代めぐり', '時代ごとの特別ルールで7章'], ['歴史パズル', '決まった場面から勝ちを考える'], ['友達と対戦', '2台で音を使って対戦']]]
  ];
  function howtoPage(pg) {
    const lay = layout === 'land' ? 'land' : 'port', marks = ((window.RC_HOWTO_MARKS || {})[pg[1]] || {})[lay] || [];
    return `<div class="hw"><div class="hw-img ${lay}" style="background-image:url('${HIMG(`img/howto/${pg[1]}_${lay}.webp`)}')">${marks.map(m => `<i class="num" style="left:${m[1]}%;top:${m[2]}%">${m[0]}</i>`).join('')}</div>
      <div class="glist">${pg[2].map((x, k) => `<div class="gi"><i class="num">${k + 1}</i><div><b>${x[0]}</b><span>${x[1]}</span></div></div>`).join('')}${pg[3] ? `<div class="hw-note">${pg[3]}</div>` : ''}</div></div>`;
  }
  function openHowto(i, fromMenu) {
    const pg = HOWTO[i];
    openModal(`<button class="mclose" id="hX" aria-label="とじる">${window.RC_ICON('close')}</button><div class="mtitle">${pg[0]}</div>${pg[1] ? `<div class="mbody">${howtoPage(pg)}</div>` : `<div class="mbody">${cardGuide()}</div>`}
      <div class="dots">${HOWTO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="mbtns"><button class="btn" id="hPrev" data-ico="back" ${i === 0 ? 'disabled' : ''}>まえへ</button>
      ${i < HOWTO.length - 1 ? '<button class="btn gold" id="hNext" data-ico="next">つぎへ</button>' : `<button class="btn gold" id="hClose">とじる</button>`}</div>`, () => openHowto(i, fromMenu), 'big');
    if ($('#hPrev')) $('#hPrev').onclick = () => { SE.play('tap'); openHowto(i - 1, fromMenu); };
    if ($('#hNext')) $('#hNext').onclick = () => { SE.play('tap'); openHowto(i + 1, fromMenu); };
    if ($('#hClose')) $('#hClose').onclick = () => { SE.play('tap'); if (fromMenu && G) openMenu(); else closeModal(); };
    $('#hX').onclick = () => { SE.play('tap'); if (fromMenu && G) openMenu(); else closeModal(); };
  }

  // 勝ったデッキの主役が話す
  function pickLine(wDeck, lDeck, wp) {
    const L = (window.RC_LINES || {})[wDeck] || []; if (!L.length) return null;
    const order = Object.keys(DECKS), lp = 1 - wp, rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const won = [0, 1, 2].filter(li => G.total(li, wp) > G.total(li, lp)), diffs = won.map(li => G.total(li, wp) - G.total(li, lp));
    const combo = Object.values(G.S.cards).some(c => c.owner === wp && c.loc >= 0 && c.comboShown);
    const decl = G.S.declaredBy === wp && G.S.over.retreat === undefined;
    const by = (k) => L.filter(x => x.k === k);
    let c = L.filter(x => x.k === 'rival' && x.vs === lDeck);
    if (!c.length) c = [].concat(decl ? by('decl') : [], combo ? by('combo') : [], diffs.length >= 2 && diffs.every(d => d >= 10) ? by('big') : [], diffs.some(d => d <= 2) ? by('close') : []);
    if (!c.length) c = order.indexOf(lDeck) < order.indexOf(wDeck) ? by('old') : order.indexOf(lDeck) > order.indexOf(wDeck) ? by('new') : [];
    if (!c.length || Math.random() < 0.25) c = c.concat(by('normal'));
    return rnd(c.length ? c : L);
  }
  function victoryScene(wDeck, lDeck, wp) {
    return new Promise(done => {
      const ln = pickLine(wDeck, lDeck, wp); if (!ln) return done();
      const d = DECKS[wDeck], spName = (window.RC_SPNAME || {})[ln.sp] || d.name, mine = wp === ME;
      const el = document.createElement('div'); el.className = 'vscene ' + (mine ? 'me' : 'op'); el.style.setProperty('--dc', d.color);
      el.innerHTML = `<div class="vs-rays"></div><div class="vs-tag">${mine ? 'あなたの勝ち' : (G.S.mode === 'friend' ? '相手の勝ち' : 'CPUの勝ち')}</div>
        <div class="vs-port" style="background-image:url('img/vic/${ln.sp}.webp')"></div>
        <div class="vs-bub"><div class="vs-nm">${spName}</div><div class="vs-t"></div></div><div class="vs-tap">タップしてつづける</div>`;
      stage.appendChild(el); SE.play(mine ? 'cheer' : 'shock', 0.8); SE.whoosh();
      const t = el.querySelector('.vs-t'); let n = 0; const chars = [...ln.t];
      const iv = setInterval(() => { n++; t.textContent = chars.slice(0, n).join(''); if (n >= chars.length) clearInterval(iv); }, 45);
      setTimeout(() => { el.onclick = () => { if (n < chars.length) { n = chars.length; t.textContent = ln.t; clearInterval(iv); return; } SE.play('tap'); el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 280); }; }, 600);
    });
  }
  async function showResult() {
    busy = true; renderCtrl(); clearResume();
    if (G.S.fRetreat !== undefined && G.S.over) { G.S.over.winner = 1 - G.S.fRetreat; G.S.over.retreat = G.S.fRetreat; }
    if (TUT()) return TUT().onEnd();
    if (G.S.over.winner >= 0) { const wp = G.S.over.winner; await victoryScene(wp === ME ? myDeck : cpuDeck, wp === ME ? cpuDeck : myDeck, wp); }
    RC_META.track('game', { mode: G.S.mode, win: G.S.over.winner === ME, deck: myDeck, maxPow: Math.max(...[0, 1, 2].map(li => G.total(li, ME))), combos: log.combos.filter(c => !c.opp).length });
    const MODE = (window.RC_MODES || {})[G.S.mode];
    if (MODE && MODE.onEnd) return MODE.onEnd(G, ME, { myDeck, cpuDeck, combos: log.combos });
    const r = G.S.over;
    const win = r.winner === ME, draw = r.winner < 0;
    const X = RC_META.applyResult(r, ME);
    RC_META.BGM.play(win ? 'win' : 'lose');
    SE.play(win ? 'cheer' : draw ? 'tap' : 'shock');
    const locs = [0, 1, 2].map(li => {
      const a = G.total(li, ME), b = G.total(li, OP);
      const m = a > b ? '<span class="w">勝</span>' : b > a ? '<span class="l">負</span>' : '分';
      return `<div class="res-loc"><span class="rn fit">${G.loc(li).name}</span><span class="rs">${a} - ${b}　${m}</span></div>`;
    }).join('');
    const maxC = layout === 'land' ? 3 : 2;
    const cl = log.combos.slice(0, maxC).map(c => `<div class="ci"><b>${c.a} × ${c.b}</b>${c.memo}</div>`).join('');
    const more = log.combos.length > maxC ? `<div style="color:var(--ink2)">ほか ${log.combos.length - maxC} 件</div>` : '';
    const title = r.retreat !== undefined ? (win ? '相手が撤退' : '撤退') : (win ? '勝利' : draw ? '引き分け' : '敗北');
    const fn = () => {
      openModal(`<div class="res-title ${win ? 'win' : draw ? 'draw' : 'lose'}">${title}</div>
        <div class="res-stars">${X.delta === 0 ? '★の増減なし' : (X.delta > 0 ? '★+' + X.delta : '★' + X.delta)}${G.S.declaredBy >= 0 && r.retreat === undefined ? '（宣言）' : ''}</div>
        <div class="res-locs">${locs}</div>${RC_META.resultHtml(X)}
        <div class="res-combos fitb"><h4>この試合の史実コンボ</h4>${cl || '<div style="color:var(--ink2)">史実コンボは出なかった。歴史でつながるカードを同じ場所に置いてみよう</div>'}${more}</div>
        <div class="mbtns"><button class="btn" data-act="resMenu" data-ico="home">メニュー</button><button class="btn" data-act="deckAgain" data-ico="cards">デッキ変更</button><button class="btn gold" data-act="again" data-ico="retry">もう一度</button></div>`, () => { fn(); });
      if (win) for (let i = 0; i < 40; i++) {
        const c = document.createElement('div'); c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%'; c.style.background = ['#ffe7a3', '#e8c36a', '#8fd0ff', '#ff9aa8', '#fff'][i % 5];
        c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * .6 + 's';
        $('#modal').appendChild(c); setTimeout(() => c.remove(), 4000);
      }
    };
    fn(); RC_META.animateResult(X);
  }

  // ---------- 開始 ----------
  applyLabels();
  window.addEventListener('resize', fitStage);
  stage.classList.add(layout); fitStage(); applyLabels();
  // テスト用（自動確認ツールから使う）と、meta.js から使う部品
  window.RC_UI = { get G() { return G; }, renderCtrl: () => renderCtrl(), newGame, endTurn, doPlay, action, get busy() { return busy; }, fast(v) { SPEED = v ? 0.03 : 1; }, resumeGame, clearResume, rebuild, get isFast() { return SPEED < 1; }, cardNode: (u) => cardNode(u), get sel() { return sel; },
    x: { get ME() { return ME; }, get G() { return G; }, get myDeck() { return myDeck; }, get cpuDeck() { return cpuDeck; }, showResult, store, SE, show, openModal, closeModal, openConfirm, fitAll, banner, sleep, setGame(v) { G = v; }, openZukanDeck, get layout() { return layout; } } };
})();
