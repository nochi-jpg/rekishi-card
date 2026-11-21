// 歴史カードバトル：ルールエンジン（画面とは切りはなし、2台対戦でも同じ処理を使う）
(function () {
  const { CARDS, DECKS, LOCS } = window.RC_DATA;
  const TURNS = 6, HAND_MAX = 7, SIDE_MAX = 4;

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create(opt) {
    const R = rng(opt.seed || 1);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    const S = { turn: 0, stakes: 2, declaredBy: -1, over: null, seq: 0,
      players: [], cards: {}, locs: [], board: [[[], []], [[], []], [[], []]], pending: [[], []] };

    // 山札
    opt.decks.forEach((deckId, p) => {
      const deck = DECKS[deckId].cards.map((cid, i) => {
        const uid = 'p' + p + '_' + cid;
        S.cards[uid] = { uid, id: cid, owner: p, bonus: 0, revealed: false, turn: 0, loc: -1, order: 0, proph: null, comboShown: false };
        return uid;
      });
      shuffle(deck);
      S.players.push({ deckId, deck, hand: [], hits: 0 });
    });

    // 場所：自分の時代・相手の時代・共通から1つずつ。開く順はランダム
    const eraOf = (p) => DECKS[opt.decks[p]].era;
    const byEra = (era) => Object.values(LOCS).filter(l => l.era === era).map(l => l.id);
    let chosen;
    if (eraOf(0) === eraOf(1)) chosen = shuffle(byEra(eraOf(0))).slice(0, 2);
    else chosen = [pick(byEra(eraOf(0))), pick(byEra(eraOf(1)))];
    chosen.push(pick(byEra('共通')));
    shuffle(chosen);
    S.locs = chosen.map(id => ({ id, revealed: false }));

    // ---------- 計算 ----------
    const def = (uid) => CARDS[S.cards[uid].id];
    const loc = (li) => LOCS[S.locs[li].id];
    const cap = (li) => (S.locs[li].revealed && loc(li).cap) || SIDE_MAX;
    const revealedAt = (li, p) => S.board[li][p].filter(u => S.cards[u].revealed);
    const allRevealed = (p) => S.board.flatMap(l => l[p]).filter(u => S.cards[u].revealed);

    function comboOn(uid) {
      const c = S.cards[uid], d = def(uid);
      if (d.kind !== 'combo' || !c.revealed || c.loc < 0) return false;
      return revealedAt(c.loc, c.owner).some(u => S.cards[u].id === d.partner);
    }
    function power(uid) {
      const c = S.cards[uid], d = def(uid);
      let v = d.power + c.bonus;
      if (c.loc < 0 || !c.revealed) return Math.max(0, v);
      const p = c.owner;
      // 場所の効果
      const L = loc(c.loc);
      if (L.tag && d.tags.includes(L.tag)) v += L.amount;
      // 永続
      for (const su of allRevealed(p)) {
        const s = S.cards[su], sd = def(su);
        if (sd.kind !== 'ongoing') continue;
        if (sd.fx === 'ongoingTagHere' && s.loc === c.loc && d.tags.includes(sd.tag) && (sd.self || su !== uid)) v += sd.amount;
        if (sd.fx === 'ongoingOthersHere' && s.loc === c.loc && su !== uid) v += sd.amount;
        if (sd.fx === 'ongoingTagAll' && d.tags.includes(sd.tag) && (sd.self || su !== uid)) v += sd.amount;
      }
      if (d.fx === 'taishi') v += allRevealed(p).filter(u => u !== uid && def(u).tags.includes('政治')).length * d.amount;
      if (comboOn(uid)) v += d.amount;
      return Math.max(0, v);
    }
    function total(li, p) { return revealedAt(li, p).reduce((a, u) => a + power(u), 0); }
    function snap() {
      const powers = {};
      for (const uid in S.cards) powers[uid] = power(uid);
      return { powers, totals: [0, 1, 2].map(li => [total(li, 0), total(li, 1)]) };
    }
    function leads(p) {
      let n = 0;
      for (let li = 0; li < 3; li++) if (total(li, p) > total(li, 1 - p)) n++;
      return n;
    }

    // ---------- ターン ----------
    function startTurn() {
      const ev = [];
      S.turn++;
      ev.push({ t: 'turn', turn: S.turn });
      if (S.turn <= 3) { S.locs[S.turn - 1].revealed = true; ev.push({ t: 'locReveal', li: S.turn - 1 }); }
      const n = S.turn === 1 ? 4 : 1; // 最初の手札3枚＋1ターン目の1枚
      for (let p = 0; p < 2; p++) for (let i = 0; i < n; i++) {
        const P = S.players[p];
        if (!P.deck.length || P.hand.length >= HAND_MAX) continue;
        const uid = P.deck.shift(); P.hand.push(uid); ev.push({ t: 'draw', p, uid });
      }
      S.pending = [[], []];
      return ev;
    }
    function energyLeft(p) { return S.turn - S.pending[p].reduce((a, u) => a + def(u).cost, 0); }
    function sideCount(li, p) { return S.board[li][p].length; }
    function canPlay(p, uid, li) {
      if (S.over || !S.locs[li].revealed) return false;
      const c = S.cards[uid];
      const inHand = S.players[p].hand.includes(uid);
      const movingHere = !inHand && S.pending[p].includes(uid);
      if (!inHand && !movingHere) return false;
      if (movingHere && c.loc === li) return false;
      if (inHand && def(uid).cost > energyLeft(p)) return false;
      return sideCount(li, p) < cap(li);
    }
    function play(p, uid, li) {
      if (!canPlay(p, uid, li)) return false;
      const c = S.cards[uid];
      if (S.pending[p].includes(uid)) { // 置きなおし
        S.board[c.loc][p] = S.board[c.loc][p].filter(u => u !== uid);
      } else {
        S.players[p].hand = S.players[p].hand.filter(u => u !== uid);
        S.pending[p].push(uid);
        c.order = ++S.seq;
      }
      c.loc = li; c.turn = S.turn; S.board[li][p].push(uid);
      return true;
    }
    function unplay(p, uid) {
      if (!S.pending[p].includes(uid)) return false;
      const c = S.cards[uid];
      S.board[c.loc][p] = S.board[c.loc][p].filter(u => u !== uid);
      S.pending[p] = S.pending[p].filter(u => u !== uid);
      c.loc = -1; c.turn = 0; S.players[p].hand.push(uid);
      return true;
    }

    // ---------- 公開 ----------
    function applyReveal(uid, ev) {
      const c = S.cards[uid], d = def(uid), p = c.owner, li = c.loc;
      const P = S.players[p];
      const out = (o) => ev.push(Object.assign({ t: 'effect', uid }, o, { snap: snap() }));
      switch (d.fx) {
        case 'buffHandRandom': case 'buffHandTag': {
          const cand = P.hand.filter(u => d.fx === 'buffHandRandom' || def(u).tags.some(t => d.tagsAny.includes(t)));
          if (!cand.length) { out({ targets: [], text: '対象なし' }); break; }
          const tu = pick(cand); S.cards[tu].bonus += (d.amount || 1);
          out({ targets: [tu], delta: (d.amount || 1), text: def(tu).name + ' +' + (d.amount || 1), toHand: true });
          break;
        }
        case 'debuffEnemyRandom': {
          const cand = revealedAt(li, 1 - p);
          if (!cand.length) { out({ targets: [], text: '対象なし' }); break; }
          const tu = pick(cand); S.cards[tu].bonus -= d.amount;
          out({ targets: [tu], delta: -d.amount, text: def(tu).name + ' -' + d.amount });
          break;
        }
        case 'kuni': {
          const ok = [0, 1, 2].filter(x => x !== li).every(x => S.board[x][p].length > 0);
          if (ok) { c.bonus += d.amount; out({ targets: [uid], delta: d.amount, text: 'くにがまとまった +' + d.amount }); }
          else out({ targets: [], text: '条件を満たさない' });
          break;
        }
        case 'buffOthersHere': {
          const ts = revealedAt(li, p).filter(u => u !== uid);
          ts.forEach(u => S.cards[u].bonus += d.amount);
          out({ targets: ts, delta: d.amount, text: ts.length ? 'ほかのカード +' + d.amount : '対象なし' });
          break;
        }
        case 'fetch': {
          const tu = P.deck.find(u => S.cards[u].id === d.target);
          if (tu && P.hand.length < HAND_MAX) {
            P.deck = P.deck.filter(u => u !== tu); P.hand.push(tu);
            ev.push({ t: 'fetch', p, uid: tu, from: uid });
          } else out({ targets: [], text: tu ? '手札がいっぱい' : 'もう山札にない' });
          break;
        }
        case 'debuffEnemyMax': {
          const cand = revealedAt(li, 1 - p);
          if (!cand.length) { out({ targets: [], text: '対象なし' }); break; }
          const mx = Math.max(...cand.map(power));
          const tu = pick(cand.filter(u => power(u) === mx)); S.cards[tu].bonus -= d.amount;
          out({ targets: [tu], delta: -d.amount, text: def(tu).name + ' -' + d.amount });
          break;
        }
        case 'destroyWeakest': {
          const cand = revealedAt(li, 1 - p);
          if (!cand.length) { out({ targets: [], text: '対象なし' }); break; }
          const mn = Math.min(...cand.map(power));
          const tu = pick(cand.filter(u => power(u) === mn));
          const tc = S.cards[tu];
          S.board[li][1 - p] = S.board[li][1 - p].filter(u => u !== tu);
          tc.loc = -1; tc.gone = true;
          ev.push({ t: 'destroy', uid, target: tu, li, snap: snap() });
          break;
        }
        case 'matchEnemyMax': {
          const es = revealedAt(li, 1 - p);
          const mx = es.length ? Math.max(...es.map(power)) : 0;
          const cur = power(uid);
          if (mx > cur) { c.bonus += mx - cur; out({ targets: [uid], delta: mx - cur, text: '対等なパワー ' + mx }); }
          else out({ targets: [], text: es.length ? 'すでに対等' : '相手のカードがない' });
          break;
        }
        case 'raiseWeakest': {
          const own = revealedAt(li, p);
          let lo = own[0], hi = own[0];
          own.forEach(u => { if (power(u) < power(lo)) lo = u; if (power(u) > power(hi)) hi = u; });
          const diff = power(hi) - power(lo);
          if (diff > 0) { S.cards[lo].bonus += diff; out({ targets: [lo], delta: diff, text: def(lo).name + ' を ' + power(hi) + ' に取り立て' }); }
          else out({ targets: [], text: '差がない' });
          break;
        }
        case 'himiko': {
          const n = P.hits * d.amount;
          if (n > 0) { c.bonus += n; out({ targets: [uid], delta: n, text: '予言的中 ' + P.hits + '回 +' + n }); }
          else out({ targets: [], text: '的中した予言がない' });
          break;
        }
        case 'prophecySelf': case 'prophecyEnemy':
          c.proph = { state: 'wait', turn: S.turn };
          out({ targets: [], text: '予言：相手もここに来ている…？', proph: true });
          break;
      }
    }
    function checkCombos(ev) {
      for (const uid in S.cards) {
        const c = S.cards[uid];
        if (!c.comboShown && comboOn(uid)) {
          c.comboShown = true;
          const partner = revealedAt(c.loc, c.owner).find(u => S.cards[u].id === def(uid).partner);
          ev.push({ t: 'combo', uid, partner, snap: snap() });
        }
      }
    }
    function revealOrder() {
      const a = leads(0), b = leads(1);
      if (a !== b) return a > b ? [0, 1] : [1, 0];
      const ta = [0, 1, 2].reduce((s, li) => s + total(li, 0), 0), tb = [0, 1, 2].reduce((s, li) => s + total(li, 1), 0);
      if (ta !== tb) return ta > tb ? [0, 1] : [1, 0];
      return S.turn % 2 ? [0, 1] : [1, 0];
    }
    function endTurn() {
      const ev = [];
      const first = revealOrder()[0];
      ev.push({ t: 'revealStart', first });
      const order = [];
      for (const p of [first, 1 - first]) {
        const list = S.pending[p].slice().sort((x, y) => S.cards[x].order - S.cards[y].order);
        for (const uid of list) {
          if (S.cards[uid].gone) continue;
          order.push(uid);
          S.cards[uid].revealed = true;
          ev.push({ t: 'reveal', p, uid, li: S.cards[uid].loc, snap: snap() });
          applyReveal(uid, ev);
          checkCombos(ev);
        }
      }
      // 予言の判定（このターンに置かれたもの）
      for (const uid of order) {
        const c = S.cards[uid], d = def(uid);
        if (!c.proph || c.proph.state !== 'wait' || c.gone) continue;
        const came = S.pending[1 - c.owner].filter(u => S.cards[u].loc === c.loc && !S.cards[u].gone);
        if (came.length) {
          c.proph.state = 'hit'; S.players[c.owner].hits++;
          if (d.fx === 'prophecySelf') c.bonus += d.amount;
          else came.forEach(u => S.cards[u].bonus -= d.amount);
          ev.push({ t: 'prophecy', uid, hit: true, targets: d.fx === 'prophecySelf' ? [uid] : came, delta: d.fx === 'prophecySelf' ? d.amount : -d.amount, snap: snap() });
        } else {
          c.proph.state = 'miss';
          ev.push({ t: 'prophecy', uid, hit: false, targets: [], snap: snap() });
        }
      }
      S.pending = [[], []];
      if (S.turn >= TURNS) { finish(); ev.push({ t: 'end', result: S.over }); }
      return ev;
    }
    function finish(retreatBy) {
      if (retreatBy !== undefined) { S.over = { winner: 1 - retreatBy, stakes: 1, retreat: retreatBy, wins: [0, 0] }; return; }
      const wins = [0, 0];
      for (let li = 0; li < 3; li++) { const a = total(li, 0), b = total(li, 1); if (a > b) wins[0]++; else if (b > a) wins[1]++; }
      let winner = -1;
      if (wins[0] !== wins[1]) winner = wins[0] > wins[1] ? 0 : 1;
      else {
        const ta = [0, 1, 2].reduce((s, li) => s + total(li, 0), 0), tb = [0, 1, 2].reduce((s, li) => s + total(li, 1), 0);
        if (ta !== tb) winner = ta > tb ? 0 : 1;
      }
      S.over = { winner, stakes: S.stakes, wins };
    }
    // 天下取り宣言：3ターン目まで・1試合1回。宣言した側は撤退できない
    const DECLARE_LAST = 3, RETREAT_LAST = 3;
    function canDeclare(p) { return !S.over && S.declaredBy < 0 && S.turn >= 1 && S.turn <= DECLARE_LAST; }
    function canRetreat(p) { return !S.over && S.declaredBy !== p && S.turn >= 1 && S.turn <= RETREAT_LAST; }
    function declare(p) { if (!canDeclare(p)) return false; S.declaredBy = p; S.stakes = 4; return true; }
    function retreat(p) { if (!canRetreat(p)) return false; finish(p); return true; }

    return { S, def, loc, power, total, snap, leads, cap, startTurn, endTurn, canPlay, play, unplay, energyLeft, declare, retreat, canDeclare, canRetreat, rand: R, TURNS };
  }

  // ---------- CPU ----------
  function cpuPlan(g, p) {
    const S = g.S;
    const hand = S.players[p].hand.slice();
    // エネルギー内でコスト合計が最大になる組み合わせ（同点ならパワー合計が高いほう）
    let best = [], bestScore = -1;
    const n = hand.length;
    for (let m = 1; m < (1 << n); m++) {
      let cost = 0, pw = 0; const set = [];
      for (let i = 0; i < n; i++) if (m & (1 << i)) { const d = g.def(hand[i]); cost += d.cost; pw += d.power; set.push(hand[i]); }
      if (cost > S.turn) continue;
      // 最終ターン以外は、卑弥呼・聖徳太子を少しとっておく価値をつける
      const score = cost * 10 + pw + g.rand() * 3;
      if (score > bestScore) { bestScore = score; best = set; }
    }
    best.sort((a, b) => g.def(b).cost - g.def(a).cost);
    const plays = [];
    const extra = [[0, 0], [0, 0], [0, 0]]; // 予想パワーの上乗せ
    for (const uid of best) {
      const d = g.def(uid);
      let bestLi = -1, bestV = -1e9;
      for (let li = 0; li < 3; li++) {
        if (!g.canPlay(p, uid, li)) continue;
        const L = g.loc(li);
        let v = d.power;
        if (L.tag && d.tags.includes(L.tag)) v += L.amount;
        if (d.kind === 'combo' && S.board[li][p].some(u => S.cards[u].id === d.partner)) v += d.amount;
        // パートナーがこれから置く相手を待つカード
        if (d.kind === 'combo' && plays.some(x => x[1] === li && S.cards[x[0]].id === d.partner)) v += d.amount;
        if (d.fx === 'kuni') v += [0, 1, 2].filter(x => x !== li).every(x => S.board[x][p].length) ? 3 : -2;
        const my = g.total(li, p) + extra[li][p], op = g.total(li, 1 - p) + extra[li][1 - p];
        const gap = op - my;
        // 接戦の場所を重視、大差の場所は軽く
        let w = 1;
        if (gap > 12) w = 0.3; else if (gap < -8) w = 0.25; else if (Math.abs(gap) <= 4) w = 1.4;
        // まだ自分のカードがない場所にも広げる
        if (S.board[li][p].length === 0) w *= 1.35;
        if (['debuffEnemyRandom', 'debuffEnemyMax', 'destroyWeakest', 'matchEnemyMax'].includes(d.fx)) w *= g.S.board[li][1 - p].length ? 1.3 : 0.5;
        if (d.kind === 'prophecy') v += S.board[li][1 - p].length < g.cap(li) ? 1.5 : -3;
        const score = v * w + g.rand();
        if (score > bestV) { bestV = score; bestLi = li; }
      }
      if (bestLi >= 0 && g.play(p, uid, bestLi)) { plays.push([uid, bestLi]); extra[bestLi][p] += d.power; }
    }
    return plays;
  }
  function cpuDecide(g, p) {
    const S = g.S;
    if (S.over) return null;
    const lead = g.leads(p), lose = g.leads(1 - p);
    const gap = [0, 1, 2].reduce((a, li) => a + g.total(li, 1 - p) - g.total(li, p), 0); // 相手がどれだけ上か
    if (g.canDeclare(p) && S.turn >= 2) {
      // 有利なら宣言。ときどき、はったりでも宣言する
      if (lead >= 2 && gap <= -3) return 'declare';
      if (S.turn === 3 && lead >= 1 && gap <= -2 && g.rand() < 0.5) return 'declare';
      if (S.turn === 3 && g.rand() < 0.08) return 'declare';
    }
    if (g.canRetreat(p) && S.turn === 3 && lose >= 2 && lead === 0) {
      if (S.declaredBy === 1 - p && gap >= 6) return 'retreat';
      if (gap >= 12) return 'retreat';
    }
    return null;
  }

  window.RC_ENGINE = { create, cpuPlan, cpuDecide, TURNS };
})();
