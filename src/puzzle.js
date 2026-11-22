// 歴史パズル（詰将棋スタイル：最終ターン。デッキ・引くカード・相手の手はすべて固定）
(function () {
  const U = window.RC_UI.x, M = window.RC_META, $ = (s, r) => (r || document).querySelector(s);
  const { DECKS, CARDS } = window.RC_DATA;
  const IMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const PZ = window.RC_PUZZLES || [];
  const sv = () => { const S = M.SV; S.puzzle = S.puzzle || { done: [] }; return S.puzzle; };
  const isDone = (id) => sv().done.includes(id);
  let page = 0, fails = {};
  const LOCN = (li) => ['左', '真ん中', '右'][li];

  function open(pg) {
    if (pg !== undefined) page = pg;
    U.show('puzzle');
    const per = 8, pages = Math.ceil(PZ.length / per); page = Math.max(0, Math.min(page, pages - 1));
    $('#pzList').innerHTML = PZ.slice(page * per, page * per + per).map(p => {
      const d = DECKS[p.deck], o = DECKS[p.opp], own = M.isOwned(p.deck);
      return `<button class="pz-t${isDone(p.id) ? ' done' : ''}" data-act="pzOpen" data-pz="${p.id}" style="--c:${d.color}">
        <div class="pz-no">No.${p.id}</div>${own ? '' : '<div class="pz-rent">レンタル</div>'}
        <div class="pz-faces"><div class="pz-f" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div><span>VS</span><div class="pz-f o" style="background-image:url('${IMG(`img/face/${o.face}.webp`)}')"></div></div>
        <div class="pz-nm fit">${d.name}デッキ</div><div class="pz-sub fit">相手：${o.name}</div>${isDone(p.id) ? '<div class="pz-stamp">正解</div>' : ''}</button>`;
    }).join('');
    $('#pzPage').textContent = `${page + 1} / ${pages}　クリア ${sv().done.length} / ${PZ.length}`;
    $('#pzPrev').disabled = page === 0; $('#pzNext').disabled = page >= pages - 1;
    $('#pzPrev').onclick = () => { U.SE.play('tap'); open(page - 1); };
    $('#pzNext').onclick = () => { U.SE.play('tap'); open(page + 1); };
    U.fitAll($('#puzzle'));
  }
  function intro(id) {
    const p = PZ.find(x => x.id === id), d = DECKS[p.deck], o = DECKS[p.opp];
    U.SE.play('decide');
    U.openModal(`<div class="mtitle">歴史パズル No.${id}</div>
      <div class="mbody pz-body"><div class="cp-honjii"><div class="hj"></div><p>最終ターンじゃ。<b>このターンだけで、3つのうち2つの場所をとれ</b>。<br>相手が出すカードは裏向きで見えておる。引くカードも相手の手も、毎回同じじゃ。</p></div>
      <div class="pz-vs"><div><div class="pz-f" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div><b>${d.name}デッキ</b>${M.isOwned(p.deck) ? '' : '<small>（レンタル）</small>'}</div><span>VS</span><div><div class="pz-f o" style="background-image:url('${IMG(`img/face/${o.face}.webp`)}')"></div><b>${o.name}デッキ</b></div></div>
      ${isDone(id) ? '<div class="pz-note">クリアずみ（もう一度とけます）</div>' : '<div class="pz-note">はじめてクリアで 20コイン</div>'}</div>
      <div class="mbtns"><button class="btn" id="pzStop" data-ico="back">やめる</button><button class="btn gold" id="pzGo" data-ico="puzzle">挑戦する</button></div>`);
    $('#pzStop').onclick = () => { U.SE.play('tap'); U.closeModal(); U.setGame(null); open(); }; // どこから開いても一覧にもどる
    $('#pzGo').onclick = () => { U.closeModal(); start(id); };
  }
  function start(id) {
    const p = PZ.find(x => x.id === id);
    window.RC_UI.resumeGame({ v: 1, deck: p.deck, cpu: p.opp, seed: p.seed, o: { mode: 'puzzle', extra: { id } }, turns: JSON.parse(JSON.stringify(p.pre)) }, '歴史パズル No.' + id, 'このターンで2つの場所をとれ！');
  }
  const MODE = {
    noDecide: true,
    cpu(g, op) { const p = PZ.find(x => x.id === g.S.extra.id); if (g.S.turn === 6) p.q6.forEach(([u, li]) => g.play(op, u, li)); },
    onEnd(G, ME) {
      const id = G.S.extra.id, p = PZ.find(x => x.id === id), win = G.S.over.winner === ME, first = win && !isDone(id);
      if (win) { if (first) { sv().done.push(id); M.SV.coins += 20; } M.track('puzzle'); M.saveNow(); U.SE.play('cheer'); }
      else fails[id] = (fails[id] || 0) + 1;
      M.BGM.play(win ? 'win' : 'lose');
      const kd = CARDS[G.S.cards[p.key].id];
      const hint = fails[id] >= 2 ? `<div class="pz-hint"><b>本じいのヒント</b>「${kd.name}」がカギじゃ。${p.keyLi >= 0 ? `${LOCN(p.keyLi)}の場所に置いてみるとよいぞ。` : 'どこに置くかよく考えるのじゃ。'}</div>` : (win ? '' : '<div class="pz-note">2回まちがえると、本じいがヒントをくれる</div>');
      U.openModal(`<div class="mtitle">${win ? '正解！' : 'ざんねん…'}</div>
        <div class="mbody pz-body">${win ? `<div class="cp-honjii"><div class="hj"></div><p>見事じゃ！ カギは「${kd.name}」じゃったな。<br>${kd.memo}</p></div>${first ? '<div class="cp-coin"><span class="ci-inline"></span>+20コイン</div>' : ''}` : `<div class="cp-honjii"><div class="hj"></div><p>おしいのう。置くカードと場所を変えて、もう一度じゃ。</p></div>${hint}`}</div>
        <div class="mbtns"><button class="btn" id="pzToList">パズル一覧へ</button><button class="btn gold" id="pzAgain">${win ? (PZ.find(x => x.id === id + 1) ? '次の問題へ' : 'もう一度') : 'もう一度'}</button></div>`);
      $('#pzToList').onclick = () => { U.SE.play('tap'); U.closeModal(); U.setGame(null); open(); };
      $('#pzAgain').onclick = () => { U.SE.play('decide'); U.closeModal(); U.setGame(null); const nx = win && PZ.find(x => x.id === id + 1) ? id + 1 : id; nx === id ? start(id) : intro(nx); };
    }
  };
  window.RC_MODES = window.RC_MODES || {};
  window.RC_MODES.puzzle = MODE;
  window.RC_PUZZLE = { open, start };
  const orig = M.action;
  M.action = function (act, el) { if (act === 'pzOpen') { intro(+el.dataset.pz); return true; } return orig(act, el); };
})();
