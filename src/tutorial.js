// 歴史カードバトル：チュートリアル（本じいの教え）
// 卑弥呼デッキ vs 聖徳太子デッキ。配るカード・場所・相手の手はすべて固定。
// 指示された操作だけ受けつけ、ほかの操作はブロックする。
(function () {
  const U = window.RC_UI.x;
  const $ = (s, r) => (r || document).querySelector(s);
  const IMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const stage = $('#stage');
  const ME = 0;

  const FIXED = {
    locs: ['inasaku', 'asuka', 'mori'],
    order: [['ishibocho', 'kome', 'takayuka', 'magatama', 'arasoi', 'kuni', 'gi', 'hori', 'himiko'],
      ['gozoku', 'bukkyo', 'soga', 'imoko', 'kokusho', 'kenpo', 'horyuji', 'taishi', 'mononobe']]
  };
  const CPU = { 1: [['gozoku', 0]], 2: [['soga', 1]], 3: [['kokusho', 1]], 4: [['kenpo', 1]], 5: [['horyuji', 2]], 6: [['taishi', 2]] };

  // ---------- ねらう場所 ----------
  const hand = (cid) => () => $(`#hand [data-uid$="_${cid}"]`);
  const opp = (cid) => () => $(`#board [data-uid^="p1_"][data-uid$="_${cid}"]`);
  const mine = (cid) => () => $(`#board [data-uid^="p0_"][data-uid$="_${cid}"]`);
  const tile = (li) => () => $(`#board .loc[data-li="${li}"] .tile`);
  const loc = (li) => () => $(`#board .loc[data-li="${li}"]`);
  const tot = (li, w) => () => $(`#board .loc[data-li="${li}"] .tot.${w || 'm'}`);
  const el = (s) => () => $(s);

  // ---------- 台本 ----------
  // f: 本じいの顔　s: 照らす場所（いくつでも）　w: 待つもの（next / play / end）
  const SAY = (f, t, s, w) => ({ f, t, s: s || [], w: w || 'next' });
  const PLAY = (cid, li, t) => ({ f: 'normal', t, s: [hand(cid), tile(li)], w: { play: cid, li } });
  const END = (t) => ({ f: 'normal', t, s: [el('#ctrl .b-end')], w: 'end' });
  const ON_TURN = {
    1: [
      SAY('smile', 'わしは本じい。歴史の本の精じゃ。<br>これからカードバトルの戦い方を教えるぞ。'),
      SAY('normal', '勝負は<b>3つの場所</b>でおこなう。<br><b>6ターン</b>のあいだにカードを置いて、<b>2つの場所</b>でパワーの合計が多いほうが勝ちじゃ。', [el('#board')]),
      SAY('normal', '場所は1ターンに1つずつ表になる。<br>ここは「稲作のムラ」。<b>文化のカードが+2</b>される場所じゃ。場所の効果は、ここに書いてあるぞ。', [tile(0)]),
      SAY('normal', 'これが手札のカードじゃ。<br>左上の数字が<b>コスト</b>（出すのに使うエネルギー）、右上が<b>パワー</b>（強さ）。下に種類と効果が書いてある。', [hand('ishibocho')]),
      SAY('normal', 'エネルギーは<b>ターンの数と同じ</b>だけ使える。<br>1ターン目は1じゃ。', [el('#ctrl .orb')]),
      PLAY('ishibocho', 0, '石包丁を「稲作のムラ」に置いてみるのじゃ。<br>カードを<b>ドラッグ</b>するか、カードを<b>選んでから場所をタップ</b>じゃ。'),
      SAY('smile', '石包丁は<b>文化</b>のカード。この場所なら+2されるぞ。<br>置いたカードは、ターン終了で表になるまで手札にもどせる。', [mine('ishibocho')]),
      END('置き終わったら<b>「ターン終了」</b>じゃ。<br>相手のカードは、ターン終了のときにいっしょに表になるぞ。')
    ],
    2: [
      SAY('normal', '2ターン目。「飛鳥の都」が表になった。<br>ここは<b>政治のカードが+2</b>じゃ。', [tile(1)]),
      SAY('normal', '高床倉庫は<b>永続</b>のカード。<br>場にいるあいだ、<b>ずっと</b>効果が働きつづける。', [hand('takayuka')]),
      PLAY('takayuka', 0, '高床倉庫を「稲作のムラ」に置くのじゃ。<br>となりの石包丁も強くなるぞ。'),
      END('よし、ターン終了じゃ。')
    ],
    3: [
      SAY('normal', '3ターン目。「深い森」は<b>おたがい2枚まで</b>しか置けない場所じゃ。<br>これで3つの場所がそろった。', [tile(2)]),
      SAY('normal', '卑弥呼の勾玉は<b>予言</b>のカード。<br>このターン、<b>相手も同じ場所</b>にカードを出したら当たりで、パワー+3じゃ。相手の手を読むのじゃ。', [hand('magatama')]),
      PLAY('magatama', 1, '相手は「飛鳥の都」に力を入れておる。<br>勾玉を<b>飛鳥の都</b>に置くのじゃ。'),
      PLAY('arasoi', 1, 'もう1枚。むらどうしの争いは<b>公開時</b>に相手のパワーを下げる。<br>これも<b>飛鳥の都</b>に置こう。'),
      SAY('normal', '<b>天下取り</b>は、勝てば★+4・負けると★-2になる宣言。<b>撤退</b>は、★を減らさずに試合を終わる。<br>どちらも3ターン目まで。今回は使わんでよいぞ。', [el('#ctrl .b-decl'), el('#ctrl .b-ret')]),
      END('ターン終了じゃ。予言は当たるかのう…')
    ],
    4: [
      SAY('normal', '「くに」は、<b>ほかの2つの場所の両方</b>に自分のカードがあれば+3じゃ。<br>稲作のムラと飛鳥の都にはもう置いてあるな。', [hand('kuni')]),
      PLAY('kuni', 2, 'くにを<b>深い森</b>に置くのじゃ。'),
      PLAY('kome', 0, 'エネルギーが1残っておる。米づくりを<b>稲作のムラ</b>に置こう。<br>手札のカードのパワーを上げてくれるぞ。'),
      END('ターン終了じゃ。')
    ],
    5: [
      SAY('normal', '魏への使いは<b>史実コンボ</b>のカード。<br>同じ場所に<b>卑弥呼</b>がいれば+4じゃ。歴史でつながる2枚を同じ場所にそろえると強くなる。', [hand('gi')]),
      PLAY('gi', 1, '魏への使いを<b>飛鳥の都</b>に置くのじゃ。'),
      END('ターン終了じゃ。次はいよいよ最終ターンじゃ。')
    ],
    6: [
      SAY('normal', '最終ターン！ 卑弥呼が手札に来たぞ。<br>卑弥呼は、当たった予言1回につきパワー+2じゃ。', [hand('himiko')]),
      PLAY('himiko', 1, '卑弥呼を魏への使いと同じ<b>飛鳥の都</b>に置いて、<b>史実コンボ</b>を決めるのじゃ！'),
      END('ターン終了で、勝負が決まるぞ。')
    ]
  };
  const AFTER = {
    1: [SAY('normal', '相手は「豪族」を出した。<b>公開時</b>の効果で、こちらの石包丁が-1されたのじゃ。<br>公開時の効果は、表になったときに1回だけ働く。', [opp('gozoku'), mine('ishibocho')]),
      SAY('normal', '石包丁は 2＋場所の2−1 で<b>3</b>。相手は2。<br>いまは「稲作のムラ」をリードしておるぞ。', [tot(0), tot(0, 'o')])],
    2: [SAY('normal', '相手の蘇我氏は<b>政治</b>のカード。飛鳥の都で+2されておる。<br>場所の効果は<b>相手にも</b>働くから、よく見るのじゃ。', [opp('soga'), tile(1)]),
      SAY('smile', 'こちらは高床倉庫の永続効果で、石包丁が+1。<br>稲作のムラの合計は<b>8</b>じゃ。', [tot(0)])],
    3: [SAY('smile', '<b>予言的中</b>！ 相手も飛鳥の都に出してきたのう。<br>勾玉のパワーが+3されたぞ。', [mine('magatama')])],
    4: [SAY('normal', '相手の十七条の憲法は永続で、まわりのカードを強くしておる。<br>このままでは飛鳥の都で負けてしまうぞ。', [opp('kenpo'), tot(1, 'o')])],
    6: [SAY('smile', '<b>史実コンボ</b>成立じゃ！ 卑弥呼が魏に使いを送ったのは歴史の事実。<br>歴史のつながりが、そのまま力になるのじゃ。', [mine('gi'), mine('himiko')])]
  };
  const END_STEPS = [
    SAY('smile', '見事じゃ！ <b>稲作のムラ</b>と<b>飛鳥の都</b>の2つで勝ったので、そなたの勝ちじゃ。<br>深い森では負けても、2つ取れば勝ちなのじゃ。', [tot(0), tot(1)]),
    SAY('normal', 'カードの効果は、カードを選ぶといつでも読める。<br>史実コンボの組み合わせは、カード図鑑でもさがせるぞ。'),
    SAY('smile', '教えることは以上じゃ。<br>この教えは「設定」からいつでも見直せるぞ。')
  ];

  // ---------- 画面の部品 ----------
  const NS = 'http://www.w3.org/2000/svg';
  let root, svg, maskG, ringsG, box, txt, foot, face;
  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'tut';
    root.innerHTML = `<svg class="tut-dim" xmlns="${NS}"><defs><mask id="tutMask"><rect x="0" y="0" width="100%" height="100%" fill="#fff"/><g class="mk"></g></mask></defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(4,6,16,.68)" mask="url(#tutMask)"/><g class="rg"></g></svg>
      <div class="tut-box"><div class="tut-face"></div><div class="tut-main"><div class="tut-name"><span>本じい</span><button class="btn tut-skip">スキップ</button></div><div class="tut-txt"></div><div class="tut-foot"></div></div></div>`;
    stage.appendChild(root);
    svg = root.querySelector('svg'); maskG = svg.querySelector('.mk'); ringsG = svg.querySelector('.rg');
    box = root.querySelector('.tut-box'); txt = root.querySelector('.tut-txt'); foot = root.querySelector('.tut-foot'); face = root.querySelector('.tut-face');
    root.querySelector('.tut-skip').addEventListener('click', (e) => { e.stopPropagation(); U.SE.play('tap'); U.openConfirm('チュートリアルをやめますか？', '設定からいつでも見直せます。', 'やめる', () => finish()); });
  }

  // 照らす楕円（ズームインしながら小さくなる）
  let spots = [], spotT0 = 0, raf = 0;
  function setSpots(fns) {
    spots = fns.map(fn => ({ fn, e1: document.createElementNS(NS, 'ellipse'), e2: document.createElementNS(NS, 'ellipse') }));
    maskG.innerHTML = ''; ringsG.innerHTML = '';
    spots.forEach(s => { s.e1.setAttribute('fill', '#000'); maskG.appendChild(s.e1); s.e2.setAttribute('class', 'tut-ring'); ringsG.appendChild(s.e2); });
    spotT0 = performance.now();
    root.classList.toggle('nodim', !fns.length);
  }
  function stageRect(e) {
    const sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth, r = e.getBoundingClientRect();
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!T.active) return;
    const t = Math.min(1, (performance.now() - spotT0) / 520), ease = 1 - Math.pow(1 - t, 3);
    const zoom = 1 + 3.5 * (1 - ease);
    const rects = [];
    spots.forEach(s => {
      const e = s.fn(); if (!e) { s.e1.setAttribute('rx', 0); s.e2.setAttribute('rx', 0); return; }
      const r = stageRect(e); rects.push(r);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rx = (r.w / 2) * 1.22 + 12, ry = (r.h / 2) * 1.22 + 12;
      [s.e1, s.e2].forEach(x => { x.setAttribute('cx', cx); x.setAttribute('cy', cy); x.setAttribute('rx', rx * zoom); x.setAttribute('ry', ry * zoom); });
    });
    placeBox(rects);
  }
  // 照らした場所とかぶらない位置に本じいの吹き出しを置く
  let boxPos = '';
  function placeBox(rects) {
    const W = stage.offsetWidth, H = stage.offsetHeight, land = stage.classList.contains('land');
    const bw = land ? 620 : 452, bh = box.offsetHeight || 150, m = 14;
    const cand = land
      ? [['tc', (W - bw) / 2, m], ['mr', W - bw - m, (H - bh) / 2], ['ml', m, (H - bh) / 2], ['bc', (W - bw) / 2, H - bh - m]]
      : [['tc', (W - bw) / 2, m + 50], ['mc', (W - bw) / 2, (H - bh) / 2], ['bc', (W - bw) / 2, H - bh - m]];
    let best = cand[0], bestO = 1e12;
    for (const c of cand) {
      let o = 0;
      rects.forEach(r => { const pad = 18; const ox = Math.max(0, Math.min(c[1] + bw, r.x + r.w + pad) - Math.max(c[1], r.x - pad)); const oy = Math.max(0, Math.min(c[2] + bh, r.y + r.h + pad) - Math.max(c[2], r.y - pad)); o += ox * oy; });
      if (c[0] === boxPos) o -= 1; // 同じ位置を少しだけ好む（ガタつき防止）
      if (o < bestO) { bestO = o; best = c; }
    }
    if (best[0] !== boxPos) { boxPos = best[0]; box.style.left = best[1] + 'px'; box.style.top = best[2] + 'px'; }
    box.style.width = bw + 'px';
  }

  // ---------- 入力のブロック ----------
  let allow = []; // 押してよい要素を返す関数
  function allowed(target, type) {
    if (!T.active) return true;
    if (target.closest('#modal')) return true;
    if (target.closest('.tut-box, .tut-skip')) return true;
    if (type === 'pointerdown' && target.closest('#board [data-uid]')) return false; // 置いたカードを手札にもどさせない
    return allow.some(fn => { const e = fn(); return e && (e === target || e.contains(target)); });
  }
  ['pointerdown', 'click'].forEach(type => stage.addEventListener(type, (e) => {
    if (allowed(e.target, type)) return;
    e.stopPropagation(); e.preventDefault();
    if (type === 'pointerdown') nudge();
  }, true));

  // ---------- 進行 ----------
  let step = null, typing = 0;
  function show(st) {
    return new Promise(res => {
      step = st; boxPos = '';
      face.style.backgroundImage = `url('${IMG(`img/tut/honjii_${st.f}.webp`)}')`;
      box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
      setSpots(st.s);
      // 文字を少しずつ出す
      clearInterval(typing);
      txt.innerHTML = st.t; const full = txt.innerHTML;
      const plain = txt.textContent.length; let n = 0;
      txt.classList.add('typing'); txt.style.setProperty('--n', 0);
      const nodes = []; (function walk(x) { x.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(txt);
      const draw = () => { let left = n; nodes.forEach(([c, s]) => { c.textContent = s.slice(0, Math.max(0, left)); left -= s.length; }); };
      draw();
      const done = () => { clearInterval(typing); typing = 0; txt.innerHTML = full; txt.classList.remove('typing'); };
      typing = setInterval(() => { n += 2; draw(); if (n >= plain) done(); }, 22);
      U.SE.play('tap', 0.4);
      const w = st.w;
      if (w === 'next') {
        foot.innerHTML = `<button class="btn gold tut-next">つぎへ</button>`;
        allow = [];
        foot.querySelector('.tut-next').onclick = (e) => { e.stopPropagation(); if (typing) { done(); return; } U.SE.play('tap', 0.6); res(); };
        return;
      }
      if (w === 'end') {
        foot.innerHTML = `<div class="tut-hint">「ターン終了」をおそう</div>`;
        allow = [el('#ctrl .b-end')];
        const iv = setInterval(() => { if (window.RC_UI.busy) { clearInterval(iv); res(); } }, 100);
        return;
      }
      // カードを置く
      foot.innerHTML = `<div class="tut-hint">カードを場所に置こう</div>`;
      allow = [hand(w.play), loc(w.li)];
      const iv = setInterval(() => {
        const g = window.RC_UI.G; if (!g || !T.active) return clearInterval(iv);
        if (g.S.pending[ME].some(u => g.S.cards[u].id === w.play)) { clearInterval(iv); U.SE.play('good', 0.7); setTimeout(res, 380); }
      }, 100);
    });
  }
  async function run(list) {
    root.classList.add('on');
    for (const st of list) { if (!T.active) return; await show(st); }
    if (!T.active) return;
    step = null; allow = []; setSpots([]); root.classList.remove('on');
  }
  function nudge() {
    if (!T.active || !root) return;
    U.SE.play('ng', 0.4);
    ringsG.classList.remove('nudge'); void ringsG.getBoundingClientRect(); ringsG.classList.add('nudge'); clearTimeout(nudge.t); nudge.t = setTimeout(() => ringsG.classList.remove('nudge'), 460);
    const h = foot.querySelector('.tut-hint, .tut-next'); if (h) { h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake'); }
  }

  let onDone = null;
  function finish() {
    const cb = onDone; stop();
    window.RC_META.markTutorial();
    if (cb) cb(); else window.RC_META.toMenu();
  }
  function stop() {
    T.active = false; onDone = null; allow = [];
    if (root) { root.classList.remove('on'); setSpots([]); }
    cancelAnimationFrame(raf);
  }

  const T = {
    active: false,
    start(cb) {
      build(); onDone = cb; T.active = true; boxPos = '';
      cancelAnimationFrame(raf); loop();
      window.RC_UI.newGame('himiko', { cpu: 'taishi', seed: 7, fixed: FIXED });
    },
    stop,
    cpu(g, p) {
      (CPU[g.S.turn] || []).forEach(([cid, li]) => { const u = g.S.players[p].hand.find(x => g.S.cards[x].id === cid); if (u) g.play(p, u, li); });
    },
    onTurn(t) { if (ON_TURN[t]) run(ON_TURN[t]); },
    afterTurn(t) { return AFTER[t] ? run(AFTER[t]) : Promise.resolve(); },
    allowPlay(cid, li) { return !!(step && step.w && step.w.play === cid && step.w.li === li); },
    nudge,
    async onEnd() { await U.sleep(400); U.SE.play('cheer'); await U.banner('勝利', '2つの場所を取った！', '', 1500); await run(END_STEPS); if (T.active) finish(); }
  };
  window.RC_TUTORIAL = T;
})();
