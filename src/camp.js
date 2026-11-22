// 歴史カードバトル：時代めぐり（7章×3戦。章ごとの特殊ルール）
(function () {
  const U = window.RC_UI.x, M = window.RC_META, $ = (s, r) => (r || document).querySelector(s);
  const { DECKS, CARDS } = window.RC_DATA;
  const IMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const CH = [
    { name: '古代', era: '弥生〜古墳', rule: 'hosaku', rn: '豊作', rt: '毎ターン、場のいちばん弱いカードに+1', b: ['wakatakeru', 'himiko', 'himiko'],
      intro: '米づくりが始まり、ムラがクニになっていく時代じゃ。小さなカードも、毎年の豊作で育つぞ。', clear: '見事じゃ。ムラからクニへ、そして大王の国へ。日本の歴史が動き出したのう。' },
    { name: '飛鳥・奈良', era: '飛鳥〜奈良', rule: 'ritsuryo', rn: '律令', rt: '場所の効果が2倍', b: ['taishi', 'shomu', 'nakanooe'],
      intro: '律令というきまりで国を治める時代じゃ。場所の効果が2倍になる。場所をよく読むのじゃ。', clear: 'きまりを生かして勝ったのう。天皇中心の国づくりが進んだ時代じゃ。' },
    { name: '平安', era: '平安', rule: 'kokufu', rn: '国風文化', rt: '文化のカード+1、戦いのカード-1', b: ['kiyomori', 'michinaga', 'michinaga'],
      intro: 'かな文字や十二単、日本らしい文化が花開いた時代じゃ。文化のカードが強く、戦いのカードは弱くなる。', clear: '雅な都をおさめたのう。だが、やがて武士の時代がやってくる…。' },
    { name: '鎌倉・室町', era: '鎌倉〜室町', rule: 'goon', rn: '御恩と奉公', rt: '同じ場所に自分のカードが3枚以上なら、その場所の全カード+1', b: ['yoshimasa', 'tokimune', 'yoritomo'],
      intro: '将軍と御家人が「御恩と奉公」で結ばれた時代じゃ。なかまを同じ場所に集めると強くなるぞ。', clear: '武士の世を勝ちぬいたのう。いざ鎌倉！ の心じゃ。' },
    { name: '戦国', era: '戦国〜安土桃山', rule: 'gekokujo', rn: '下剋上', rt: 'コスト1〜2のカード+2', b: ['hideyoshi', 'yoshimasa', 'nobunaga'],
      intro: '下の者が上の者をたおす、下剋上の時代じゃ。安いカードほど力を出すぞ。', clear: '戦国の世を制したのう。天下統一はもうすぐじゃ。' },
    { name: '江戸', era: '江戸', rule: 'sakoku', rn: '鎖国', rt: '真ん中の場所のカードは、相手の効果を受けない', b: ['genpaku', 'hideyoshi', 'iemitsu'],
      intro: '国を閉ざした鎖国の時代じゃ。真ん中の場所は、外からの力がとどかぬぞ。', clear: '260年続いた平和の世じゃ。その中でも、新しい学問は育っていったのう。' },
    { name: '幕末・明治', era: '幕末〜明治', rule: 'bunmei', rn: '文明開化', rt: '毎ターン、カードを1枚多く引く', b: ['saigo', 'fukuzawa', 'ito'],
      intro: '西洋の文化がどっと入ってきた文明開化の時代じゃ。毎ターン、カードを1枚多く引けるぞ。', clear: 'ついに時代めぐりを走りぬけたのう！ そなたは立派な歴史の達人じゃ。' }
  ];
  const sv = () => { const S = M.SV; S.camp = S.camp || { done: [] }; return S.camp; };
  const key = (c, n) => c + '-' + n;
  const isDone = (c, n) => sv().done.includes(key(c, n));
  const unlocked = (c, n) => (c === 0 && n === 0) || (n > 0 ? isDone(c, n - 1) : isDone(c - 1, 2));

  function open() {
    U.show('camp');
    const html = CH.map((ch, c) => {
      const open = unlocked(c, 0), nodes = [0, 1, 2].map(n => `<i class="${isDone(c, n) ? 'ok' : ''}${n === 2 ? ' boss' : ''}"></i>`).join('');
      return `<button class="cp-ch${open ? '' : ' locked'}${isDone(c, 2) ? ' clear' : ''}" data-act="campCh" data-ch="${c}">
        <div class="cp-no">第${c + 1}章</div><div class="cp-nm">${ch.name}</div><div class="cp-era">${ch.era}</div>
        <div class="cp-rule"><b>${ch.rn}</b>${open ? ch.rt : '？？？'}</div><div class="cp-nodes">${nodes}</div>${isDone(c, 2) ? '<div class="cp-stamp">制覇</div>' : ''}</button>`;
    }).join('');
    $('#campList').innerHTML = html;
    U.fitAll($('#camp'));
  }
  function openChapter(c) {
    const ch = CH[c];
    if (!unlocked(c, 0)) { U.SE.play('ng'); return U.openConfirm('まだ行けない時代', `第${c}章のボスをたおすと、この時代へ進めます。`, 'わかった', () => {}, 'gold'); }
    U.SE.play('decide');
    const row = (n) => { const d = DECKS[ch.b[n]], ok = unlocked(c, n), done = isDone(c, n), boss = n === 2;
      return `<div class="cp-b${boss ? ' boss' : ''}${ok ? '' : ' locked'}"><div class="cp-bf" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div>
        <div class="cp-bt"><b>${boss ? 'ボス戦：' + CARDS[d.cards[11]].name : (n + 1) + '戦目：' + d.name + 'デッキ'}</b><span>${boss ? CARDS[d.cards[11]].name + 'のパワー+3' : d.theme}　ほうび ${done ? 10 : boss ? 100 : 30}コイン</span></div>
        ${ok ? `<button class="btn ${done ? '' : 'gold'}" data-cb="${n}" data-ico="${done ? 'retry' : 'battle'}">${done ? 'もう一度' : '挑戦'}</button>` : '<div class="cp-lk">前の戦いに勝つ</div>'}</div>`; };
    U.openModal(`<div class="mtitle">第${c + 1}章 ${ch.name}</div>
      <div class="mbody cp-body"><div class="cp-rule2"><b>特別ルール「${ch.rn}」</b>${ch.rt}</div>
      <div class="cp-honjii"><div class="hj"></div><p>${ch.intro}</p></div>${[0, 1, 2].map(row).join('')}</div>
      <div class="mbtns"><button class="btn" data-act="closeModal" data-ico="back">もどる</button></div>`, () => openChapter(c), 'big');
    document.querySelectorAll('[data-cb]').forEach(b => b.onclick = (e) => { e.stopPropagation(); start(c, +b.dataset.cb); });
  }
  function start(c, n) {
    const ch = CH[c], opp = ch.b[n];
    M.openDeckFor('camp', `第${c + 1}章 ${ch.name}：デッキをえらぶ`, (deck) => {
      const rules = { id: ch.rule, name: '特別ルール：' + ch.rn };
      if (n === 2) rules.boss = { p: 1, card: DECKS[opp].cards[11] };
      window.RC_UI.newGame(deck, { cpu: opp, mode: 'camp', rules, extra: { c, n } });
      setTimeout(() => U.banner('特別ルール「' + ch.rn + '」', ch.rt, '', 1800), 600);
    });
  }
  // 試合が終わったら
  function onEnd(G, ME) {
    const { c, n } = G.S.extra, ch = CH[c], win = G.S.over.winner === ME, first = !isDone(c, n);
    let coins = 0;
    if (win) { coins = first ? (n === 2 ? 100 : 30) : 10; if (first) sv().done.push(key(c, n)); M.SV.coins += coins; M.saveNow(); }
    M.BGM.play(win ? 'win' : 'lose');
    const msg = win ? (n === 2 ? ch.clear : '本じい「よくやった。次の戦いへ進むのじゃ」') : '本じい「おしかったのう。デッキや置き場所を変えて、もう一度じゃ」';
    U.openModal(`<div class="mtitle">${win ? (n === 2 ? '第' + (c + 1) + '章 制覇！' : '勝利！') : '敗北…'}</div>
      <div class="mbody fitb cp-res"><div class="cp-honjii"><div class="hj"></div><p>${msg.replace(/^本じい「(.*)」$/, '$1')}</p></div>
      ${win ? `<div class="cp-coin"><span class="ci-inline"></span>+${coins}コイン</div>` : ''}</div>
      <div class="mbtns"><button class="btn" id="cpList">時代めぐりへ</button><button class="btn gold" id="cpAgain">${win && n < 2 ? '次の戦いへ' : 'もう一度'}</button></div>`);
    if (win) U.SE.play('cheer');
    $('#cpList').onclick = () => { U.SE.play('tap'); U.closeModal(); U.setGame(null); open(); };
    $('#cpAgain').onclick = () => { U.SE.play('decide'); U.closeModal(); U.setGame(null); const nn = win && n < 2 ? n + 1 : n; start(c, nn); };
  }
  window.RC_MODES = window.RC_MODES || {};
  window.RC_MODES.camp = { onEnd };
  window.RC_CAMP = { open, openChapter, CH };
  const orig = M.action;
  M.action = function (act, el) { if (act === 'campCh') { openChapter(+el.dataset.ch); return true; } if (act === 'campBack') { U.SE.play('tap'); M.toMenu(); return true; } return orig(act, el); };
})();
