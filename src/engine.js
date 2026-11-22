// 歴史カードバトル：ルールエンジン（画面とは切りはなし。2台対戦でも同じ処理を使う）
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

    const S = { turn: 0, stakes: 2, declaredBy: -1, over: null, seq: 0, tok: 0,
      players: [], cards: {}, locs: [], board: [[[], []], [[], []], [[], []]], pending: [[], []], cancel: [[false, false], [false, false], [false, false]] };

    function newCard(cid, p, uid) {
      S.cards[uid] = { uid, id: cid, owner: p, bonus: 0, costMod: 0, revealed: false, turn: 0, loc: -1, order: 0, proph: null, comboShown: false, gone: false, paid: 0 };
      return uid;
    }
    opt.decks.forEach((deckId, p) => {
      const deck = DECKS[deckId].cards.map((cid, i) => newCard(cid, p, 'p' + p + '_' + i + '_' + cid));
      shuffle(deck);
      // チュートリアル用：山札の上から決まった順に並べる
      const fo = opt.fixed && opt.fixed.order && opt.fixed.order[p];
      if (fo) { const top = []; fo.forEach(cid => { const i = deck.findIndex(u => S.cards[u].id === cid); if (i >= 0) top.push(deck.splice(i, 1)[0]); }); deck.unshift(...top); }
      S.players.push({ deckId, deck, hand: [], hits: 0, kills: 0, losses: 0, rampNext: 0, energyBonus: 0, costUpNext: 0, costUp: 0 });
    });

    // 場所：自分の時代・相手の時代・共通から1つずつ。開く順はランダム
    const eraOf = (p) => DECKS[opt.decks[p]].era;
    const byEra = (era) => Object.values(LOCS).filter(l => l.era === era).map(l => l.id);
    let chosen;
    if (eraOf(0) === eraOf(1)) chosen = shuffle(byEra(eraOf(0))).slice(0, 2);
    else chosen = [pick(byEra(eraOf(0))), pick(byEra(eraOf(1)))];
    chosen.push(pick(byEra('共通')));
    shuffle(chosen);
    if (opt.fixed && opt.fixed.locs) chosen = opt.fixed.locs.slice();
    S.locs = chosen.map(id => ({ id, revealed: false }));

    // ---------- 計算 ----------
    const def = (uid) => CARDS[S.cards[uid].id];
    const loc = (li) => LOCS[S.locs[li].id];
    const revealedAt = (li, p) => S.board[li][p].filter(u => S.cards[u].revealed);
    const allRevealed = (p) => S.board.flatMap(l => l[p]).filter(u => S.cards[u].revealed);
    const silenced = (uid) => { const c = S.cards[uid]; return c.loc >= 0 && revealedAt(c.loc, 1 - c.owner).some(u => def(u).fx === 'silenceHere'); };
    const activeOngoing = (p, fx) => allRevealed(p).filter(u => def(u).kind === 'ongoing' && def(u).fx === fx && !silenced(u));
    function cap(li, p) {
      let n = (S.locs[li].revealed && loc(li).cap) || SIDE_MAX;
      if (p !== undefined) n -= activeOngoing(1 - p, 'blockSlot').filter(u => S.cards[u].loc === li).length;
      return Math.max(1, n);
    }
    // 時代めぐりの特殊ルール（opt.rules = { id, boss:{p, card} }）
    const RULE = (opt.rules && opt.rules.id) || '';
    const isProtected = (uid) => { const c = S.cards[uid]; if (RULE === 'sakoku' && c.loc === 1) return true; return c.loc >= 0 && activeOngoing(c.owner, 'protectHere').some(u => S.cards[u].loc === c.loc); };
    const targetsAt = (li, p) => revealedAt(li, p).filter(u => !isProtected(u)); // 相手の効果の対象にできるカード

    function costOf(uid) {
      const c = S.cards[uid], d = def(uid), P = S.players[c.owner];
      let v = d.cost + c.costMod + P.costUp;
      activeOngoing(1 - c.owner, 'costUpOngoing').forEach(u => v += def(u).amount);
      return Math.max(0, v);
    }
    function comboOn(uid) {
      const c = S.cards[uid], d = def(uid);
      if (d.kind !== 'combo' || !c.revealed || c.loc < 0) return false;
      return revealedAt(c.loc, c.owner).some(u => S.cards[u].id === d.partner);
    }
    function locBonus(uid) {
      const c = S.cards[uid], d = def(uid), L = loc(c.loc);
      if (!L.amount) return 0;
      const a = L.amount * (RULE === 'ritsuryo' ? 2 : 1);
      if (L.tag && d.tags.includes(L.tag)) return a;
      if (L.kind && d.kind === L.kind) return a;
      if (L.costEq && d.cost === L.costEq) return a;
      if (L.costGte && d.cost >= L.costGte) return a;
      if (L.drawer && d.fx === 'draw') return a;
      return 0;
    }
    function power(uid) {
      const c = S.cards[uid], d = def(uid);
      let v = d.power + c.bonus;
      if (c.loc < 0 || !c.revealed) return Math.max(0, v);
      const p = c.owner;
      v += locBonus(uid);
      const mine = allRevealed(p);
      for (const su of mine) {
        const s = S.cards[su], sd = def(su);
        if (sd.kind !== 'ongoing' || silenced(su)) continue;
        if (sd.fx === 'ongoingTagHere' && s.loc === c.loc && d.tags.includes(sd.tag) && (sd.self || su !== uid)) v += sd.amount;
        if (sd.fx === 'ongoingOthersHere' && s.loc === c.loc && su !== uid) v += sd.amount;
        if (sd.fx === 'ongoingTagAll' && d.tags.includes(sd.tag) && (sd.self || su !== uid)) v += sd.amount;
      }
      if (d.kind === 'ongoing' && !silenced(uid)) {
        const here = revealedAt(c.loc, p);
        if (d.fx === 'perTagAll') v += mine.filter(u => u !== uid && def(u).tags.includes(d.tag)).length * d.amount;
        if (d.fx === 'perOwnHere') v += here.filter(u => u !== uid).length * d.amount;
        if (d.fx === 'ifFew' && S.board[c.loc][p].length <= d.n) v += d.amount;
        if (d.fx === 'perOngoing') v += mine.filter(u => u !== uid && def(u).kind === 'ongoing').length * d.amount;
      }
      if (comboOn(uid)) v += d.amount;
      if (RULE === 'kokufu') { if (d.tags.includes('文化')) v += 1; if (d.tags.includes('戦い')) v -= 1; }
      if (RULE === 'goon' && revealedAt(c.loc, p).length >= 3) v += 1;
      if (RULE === 'gekokujo' && d.cost <= 2) v += 2;
      if (opt.rules && opt.rules.boss && opt.rules.boss.p === p && c.id === opt.rules.boss.card) v += 3;
      return Math.max(0, v);
    }
    function total(li, p) { return revealedAt(li, p).reduce((a, u) => a + power(u), 0); }
    function snap() {
      if (opt.noSnap) return null;
      const powers = {}, costs = {};
      for (const uid in S.cards) { powers[uid] = power(uid); costs[uid] = costOf(uid); }
      return { powers, costs, totals: [0, 1, 2].map(li => [total(li, 0), total(li, 1)]) };
    }
    function leads(p) { let n = 0; for (let li = 0; li < 3; li++) if (total(li, p) > total(li, 1 - p)) n++; return n; }

    // ---------- ターン ----------
    function drawCards(p, n, ev, reason) {
      const P = S.players[p]; const got = [];
      for (let i = 0; i < n; i++) {
        if (!P.deck.length || P.hand.length >= HAND_MAX) break;
        const uid = P.deck.shift(); P.hand.push(uid); got.push(uid);
        ev.push({ t: 'draw', p, uid, reason });
      }
      return got;
    }
    function startTurn() {
      const ev = [];
      S.turn++;
      ev.push({ t: 'turn', turn: S.turn });
      if (S.turn <= 3) { S.locs[S.turn - 1].revealed = true; ev.push({ t: 'locReveal', li: S.turn - 1 }); }
      for (let p = 0; p < 2; p++) {
        const P = S.players[p];
        P.energyBonus = P.rampNext; P.rampNext = 0;
        P.costUp = P.costUpNext; P.costUpNext = 0;
        if (P.energyBonus) ev.push({ t: 'ramp', p, amount: P.energyBonus });
        if (P.costUp) ev.push({ t: 'costUp', p, amount: P.costUp });
        drawCards(p, (S.turn === 1 ? 4 : 1) + (RULE === 'bunmei' && S.turn > 1 ? 1 : 0), ev);
      }
      // 豊作：毎ターン、場のいちばん弱いカードに+1
      if (RULE === 'hosaku' && S.turn > 1) for (let p = 0; p < 2; p++) { const all = allRevealed(p); if (all.length) { const w = all.reduce((a, u) => power(u) < power(a) ? u : a); S.cards[w].bonus += 1; ev.push({ t: 'effect', uid: w, p, targets: [w], delta: 1, text: '豊作 +1', rule: true }); } }
      S.pending = [[], []];
      return ev;
    }
    function energy(p) { return S.turn + S.players[p].energyBonus; }
    function energyLeft(p) { return energy(p) - S.pending[p].reduce((a, u) => a + S.cards[u].paid, 0); }
    function canPlay(p, uid, li) {
      if (S.over || !S.locs[li].revealed) return false;
      const c = S.cards[uid];
      const inHand = S.players[p].hand.includes(uid);
      const moving = !inHand && S.pending[p].includes(uid);
      if (!inHand && !moving) return false;
      if (moving && c.loc === li) return false;
      if (inHand && costOf(uid) > energyLeft(p)) return false;
      return S.board[li][p].length < cap(li, p);
    }
    function play(p, uid, li) {
      if (!canPlay(p, uid, li)) return false;
      const c = S.cards[uid];
      if (S.pending[p].includes(uid)) S.board[c.loc][p] = S.board[c.loc][p].filter(u => u !== uid);
      else { S.players[p].hand = S.players[p].hand.filter(u => u !== uid); S.pending[p].push(uid); c.order = ++S.seq; c.paid = costOf(uid); }
      c.loc = li; c.turn = S.turn; S.board[li][p].push(uid);
      return true;
    }
    function unplay(p, uid) {
      if (!S.pending[p].includes(uid)) return false;
      const c = S.cards[uid];
      S.board[c.loc][p] = S.board[c.loc][p].filter(u => u !== uid);
      S.pending[p] = S.pending[p].filter(u => u !== uid);
      c.loc = -1; c.turn = 0; c.paid = 0; S.players[p].hand.push(uid);
      return true;
    }

    // ---------- 効果の部品 ----------
    function removeFromBoard(uid) {
      const c = S.cards[uid];
      if (c.loc >= 0) S.board[c.loc][c.owner] = S.board[c.loc][c.owner].filter(u => u !== uid);
      S.pending[c.owner] = S.pending[c.owner].filter(u => u !== uid);
      c.loc = -1; c.gone = true;
    }
    const weakest = (list) => { if (!list.length) return null; const mn = Math.min(...list.map(power)); return pick(list.filter(u => power(u) === mn)); };
    const strongest = (list) => { if (!list.length) return null; const mx = Math.max(...list.map(power)); return pick(list.filter(u => power(u) === mx)); };
    function spawn(p, li, tokenId) {
      if (!S.locs[li].revealed || S.board[li][p].length >= cap(li, p)) return null;
      const uid = newCard(tokenId, p, 'p' + p + '_t' + (++S.tok) + '_' + tokenId);
      const c = S.cards[uid]; c.revealed = true; c.loc = li; c.turn = S.turn; c.order = ++S.seq; c.token = true;
      S.board[li][p].push(uid);
      return uid;
    }
    function moveCard(uid, to) {
      const c = S.cards[uid];
      S.board[c.loc][c.owner] = S.board[c.loc][c.owner].filter(u => u !== uid);
      c.loc = to; S.board[to][c.owner].push(uid);
    }

    // ---------- 公開 ----------
    function applyReveal(uid, ev) {
      const c = S.cards[uid], d = def(uid), p = c.owner, li = c.loc, q = 1 - p;
      const P = S.players[p];
      const out = (o) => ev.push(Object.assign({ t: 'effect', uid }, o, { snap: snap() }));
      const none = (text) => out({ targets: [], text });
      if ((d.kind === 'reveal') && S.cancel[li][p]) { ev.push({ t: 'canceled', uid, snap: snap() }); return; }
      const handOf = (tag) => P.hand.filter(u => !tag || def(u).tags.includes(tag));
      switch (d.fx) {
        case 'buffHand': {
          const cand = handOf(d.tag); if (!cand.length) return none('対象なし');
          const ts = shuffle(cand.slice()).slice(0, d.n || 1); ts.forEach(u => S.cards[u].bonus += d.amount);
          return out({ targets: ts, delta: d.amount, text: ts.map(u => def(u).name).join('・') + ' +' + d.amount, toHand: true });
        }
        case 'buffHandAll': {
          const ts = handOf(d.tag); if (!ts.length) return none('対象なし');
          ts.forEach(u => S.cards[u].bonus += d.amount);
          return out({ targets: ts, delta: d.amount, text: '手札' + (d.tag ? 'の' + d.tag + 'カード' : '') + ' +' + d.amount, toHand: true });
        }
        case 'debuffRandom': {
          const tu = pick(targetsAt(li, q)); if (!tu) return none('対象なし');
          S.cards[tu].bonus -= d.amount; return out({ targets: [tu], delta: -d.amount, text: def(tu).name + ' -' + d.amount });
        }
        case 'debuffMax': {
          const tu = strongest(targetsAt(li, q)); if (!tu) return none('対象なし');
          S.cards[tu].bonus -= d.amount; return out({ targets: [tu], delta: -d.amount, text: def(tu).name + ' -' + d.amount });
        }
        case 'debuffAll': {
          const ts = targetsAt(li, q).filter(u => !d.tag || def(u).tags.includes(d.tag)); if (!ts.length) return none('対象なし');
          ts.forEach(u => S.cards[u].bonus -= d.amount); return out({ targets: ts, delta: -d.amount, text: '相手' + (d.tag ? 'の' + d.tag + 'カード' : '') + ' -' + d.amount });
        }
        case 'debuffBothTag': {
          const ts = targetsAt(li, q).concat(revealedAt(li, p).filter(u => u !== uid)).filter(u => def(u).tags.includes(d.tag)); if (!ts.length) return none('対象なし');
          ts.forEach(u => S.cards[u].bonus -= d.amount); return out({ targets: ts, delta: -d.amount, text: d.tag + 'カード -' + d.amount });
        }
        case 'debuffEveryone': {
          const ts = []; for (let x = 0; x < 3; x++) { ts.push(...targetsAt(x, q)); ts.push(...revealedAt(x, p).filter(u => u !== uid)); }
          if (!ts.length) return none('対象なし');
          ts.forEach(u => S.cards[u].bonus -= d.amount); return out({ targets: ts, delta: -d.amount, text: 'すべてのカード -' + d.amount });
        }
        case 'debuffMaxEvery': {
          const ts = [0, 1, 2].map(x => strongest(targetsAt(x, q))).filter(Boolean); if (!ts.length) return none('対象なし');
          ts.forEach(u => S.cards[u].bonus -= d.amount); return out({ targets: ts, delta: -d.amount, text: '各場所のいちばん強いカード -' + d.amount });
        }
        case 'destroyWeakest': case 'destroyStrongest': {
          const tu = (d.fx === 'destroyWeakest' ? weakest : strongest)(targetsAt(li, q)); if (!tu) return none('対象なし');
          removeFromBoard(tu); P.kills++;
          return ev.push({ t: 'destroy', uid, target: tu, li, snap: snap() });
        }
        case 'killLeader': {
          const tu = allRevealed(p).find(u => S.cards[u].id === d.target); if (!tu) return none('信長がいない');
          const tli = S.cards[tu].loc; removeFromBoard(tu); P.losses++;
          return ev.push({ t: 'destroy', uid, target: tu, li: tli, self: true, snap: snap() });
        }
        case 'stealPower': {
          const tu = strongest(targetsAt(li, q)); if (!tu) return none('対象なし');
          const n = Math.min(d.amount, power(tu)); S.cards[tu].bonus -= n; c.bonus += n;
          return out({ targets: [tu], delta: -n, gain: n, text: def(tu).name + 'から' + n + 'うばった' });
        }
        case 'stealCard': {
          const tu = weakest(targetsAt(li, q)); if (!tu) return none('対象なし');
          if (S.board[li][p].length >= cap(li, p)) return none('置く場所がない');
          const tc = S.cards[tu];
          S.board[li][q] = S.board[li][q].filter(u => u !== tu); tc.owner = p; S.board[li][p].push(tu);
          return ev.push({ t: 'steal', uid, target: tu, li, snap: snap() });
        }
        case 'fetch': {
          const tu = P.deck.find(u => S.cards[u].id === d.target);
          if (tu && P.hand.length < HAND_MAX) { P.deck = P.deck.filter(u => u !== tu); P.hand.push(tu); return ev.push({ t: 'fetch', p, uid: tu, from: uid }); }
          return none(tu ? '手札がいっぱい' : 'もう山札にない');
        }
        case 'matchEnemyMax': {
          const es = revealedAt(li, q); const mx = es.length ? Math.max(...es.map(power)) : 0; const cur = power(uid);
          if (mx > cur) { c.bonus += mx - cur; return out({ targets: [uid], delta: mx - cur, text: '対等なパワー ' + mx }); }
          return none(es.length ? 'すでに対等' : '相手のカードがない');
        }
        case 'raiseWeakest': {
          const own = revealedAt(li, p); const lo = weakest(own), hi = strongest(own); const diff = power(hi) - power(lo);
          if (diff > 0) { S.cards[lo].bonus += diff; return out({ targets: [lo], delta: diff, text: def(lo).name + ' を ' + power(hi) + ' に取り立て' }); }
          return none('差がない');
        }
        case 'raiseWeakestEach': {
          const ts = [0, 1, 2].map(x => weakest(revealedAt(x, p))).filter(Boolean);
          ts.forEach(u => S.cards[u].bonus += d.amount); return out({ targets: ts, delta: d.amount, text: '各場所のいちばん弱いカード +' + d.amount });
        }
        case 'buffTagHere': case 'buffTagAll': {
          const pool = d.fx === 'buffTagHere' ? revealedAt(li, p) : allRevealed(p);
          const ts = pool.filter(u => def(u).tags.includes(d.tag)); if (!ts.length) return none('対象なし');
          ts.forEach(u => S.cards[u].bonus += d.amount); return out({ targets: ts, delta: d.amount, text: d.tag + 'カード +' + d.amount });
        }
        case 'ifSpread': {
          const ok = [0, 1, 2].filter(x => x !== li).every(x => S.board[x][p].length > 0);
          if (ok) { c.bonus += d.amount; return out({ targets: [uid], delta: d.amount, text: '3つの場所に広がった +' + d.amount }); }
          return none('条件を満たさない');
        }
        case 'ifCountHere': case 'ifBoard': {
          const n = d.fx === 'ifCountHere' ? S.board[li][p].length : S.board.reduce((a, l) => a + l[p].length, 0);
          if (n >= d.n) { c.bonus += d.amount; return out({ targets: [uid], delta: d.amount, text: n + '枚そろった +' + d.amount }); }
          return none('枚数が足りない');
        }
        case 'ifLeading': case 'ifTrailing': {
          const a = total(li, p), b = total(li, q);
          if (d.fx === 'ifLeading' ? a > b : a < b) { c.bonus += d.amount; return out({ targets: [uid], delta: d.amount, text: (d.fx === 'ifLeading' ? 'リード中' : '逆転をねらう') + ' +' + d.amount }); }
          return none('条件を満たさない');
        }
        case 'ramp': P.rampNext += d.amount; return ev.push({ t: 'rampSet', uid, p, amount: d.amount });
        case 'draw': { const got = drawCards(p, d.n, ev, uid); if (!got.length) none('引けなかった'); return; }
        case 'discard': {
          const ts = shuffle(P.hand.slice()).slice(0, d.n); if (!ts.length) return none('捨てるカードがない');
          ts.forEach(u => { P.hand = P.hand.filter(x => x !== u); S.cards[u].gone = true; P.losses++; });
          return ev.push({ t: 'discard', uid, p, targets: ts, snap: snap() });
        }
        case 'discardWeakest': {
          if (!P.hand.length) return none('捨てるカードがない');
          const mn = Math.min(...P.hand.map(u => def(u).power + S.cards[u].bonus));
          const tu = pick(P.hand.filter(u => def(u).power + S.cards[u].bonus === mn));
          P.hand = P.hand.filter(x => x !== tu); S.cards[tu].gone = true; P.losses++; c.bonus += d.amount;
          ev.push({ t: 'discard', uid, p, targets: [tu], snap: snap() });
          return out({ targets: [uid], delta: d.amount, text: '古いしくみを手放した +' + d.amount });
        }
        case 'sacrifice': {
          const tu = weakest(revealedAt(li, p).filter(u => u !== uid)); if (!tu) return none('対象なし');
          const gain = power(tu) * d.amount; removeFromBoard(tu); P.losses++; c.bonus += gain;
          ev.push({ t: 'destroy', uid, target: tu, li, self: true, snap: snap() });
          return out({ targets: [uid], delta: gain, text: '新しい力に変えた +' + gain });
        }
        case 'perHand': case 'perKills': case 'perLoss': case 'perHits': case 'perBigCards': case 'perTagHere': {
          const n = d.fx === 'perHand' ? P.hand.length : d.fx === 'perKills' ? P.kills : d.fx === 'perLoss' ? P.losses : d.fx === 'perHits' ? P.hits
            : d.fx === 'perBigCards' ? allRevealed(p).filter(u => u !== uid && def(u).cost >= d.n).length
            : revealedAt(li, p).filter(u => def(u).tags.includes(d.tag)).length;
          if (n > 0) { c.bonus += n * d.amount; return out({ targets: [uid], delta: n * d.amount, text: n + ' × ' + d.amount }); }
          return none('対象なし');
        }
        case 'spawnHere': case 'spawnOther': {
          const where = d.fx === 'spawnHere' ? [li] : [0, 1, 2].filter(x => x !== li);
          const ts = where.map(x => spawn(p, x, d.token)).filter(Boolean); if (!ts.length) return none('置く場所がない');
          return ev.push({ t: 'spawn', uid, p, targets: ts, snap: snap() });
        }
        case 'moveToLosing': {
          let best = -1, worst = 0;
          for (let x = 0; x < 3; x++) { if (x === li || !S.locs[x].revealed || S.board[x][p].length >= cap(x, p)) continue; const gap = total(x, q) - total(x, p); if (gap > worst) { worst = gap; best = x; } }
          if (best < 0) return none('負けている場所がない');
          moveCard(uid, best); c.bonus += d.amount;
          return ev.push({ t: 'move', uid, from: li, to: best, snap: snap() });
        }
        case 'moveEnemyStrongest': {
          const tu = strongest(targetsAt(li, q)); if (!tu) return none('対象なし');
          const dest = [0, 1, 2].filter(x => x !== li && S.locs[x].revealed && S.board[x][q].length < cap(x, q));
          if (!dest.length) return none('動かす場所がない');
          const to = pick(dest); moveCard(tu, to);
          return ev.push({ t: 'move', uid, target: tu, from: li, to, snap: snap() });
        }
        case 'costDownHand': P.hand.forEach(u => S.cards[u].costMod -= d.amount); return out({ targets: P.hand.slice(), text: '手札のコスト -' + d.amount, toHand: true, cost: true });
        case 'costUpNext': S.players[q].costUpNext += d.amount; return none('次のターン、相手のコスト +' + d.amount);
        case 'cancelHere': S.cancel[li][q] = true; return none('この場所では、相手の公開時の効果が出ない');
        case 'cleanseHere': {
          const ts = revealedAt(li, p).filter(u => S.cards[u].bonus < 0); if (!ts.length) return none('下げられたカードがない');
          const amt = ts.map(u => -S.cards[u].bonus); ts.forEach(u => S.cards[u].bonus = 0);
          return out({ targets: ts, delta: Math.max(...amt), text: '下げられたパワーを元にもどした' });
        }
        case 'equalizeHere': {
          const ts = targetsAt(li, q).filter(u => S.cards[u].bonus > 0); if (!ts.length) return none('上がったカードがない');
          ts.forEach(u => S.cards[u].bonus = 0); return out({ targets: ts, delta: -1, text: '対等にもどした' });
        }
        case 'prophecySelf': case 'prophecyEnemy':
          c.proph = { state: 'wait', turn: S.turn };
          return none('予言：相手もここに来ている…？');
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
          const c = S.cards[uid];
          if (c.gone || c.loc < 0) continue;
          order.push(uid);
          c.revealed = true;
          ev.push({ t: 'reveal', p: c.owner, uid, li: c.loc, snap: snap() });
          applyReveal(uid, ev);
          checkCombos(ev);
        }
      }
      // 予言（このターンに置かれたもの）
      for (const uid of order) {
        const c = S.cards[uid], d = def(uid);
        if (!c.proph || c.proph.state !== 'wait' || c.gone) continue;
        const came = S.pending[1 - c.owner].filter(u => S.cards[u].loc === c.loc && !S.cards[u].gone && S.cards[u].owner !== c.owner);
        if (came.length) {
          c.proph.state = 'hit'; S.players[c.owner].hits++;
          const ts = d.fx === 'prophecySelf' ? [uid] : came.filter(u => !isProtected(u));
          ts.forEach(u => S.cards[u].bonus += d.fx === 'prophecySelf' ? d.amount : -d.amount);
          ev.push({ t: 'prophecy', uid, hit: true, targets: ts, delta: d.fx === 'prophecySelf' ? d.amount : -d.amount, snap: snap() });
        } else { c.proph.state = 'miss'; ev.push({ t: 'prophecy', uid, hit: false, targets: [], snap: snap() }); }
      }
      // 成長（大仏）
      for (let p = 0; p < 2; p++) activeOngoing(p, 'grow').forEach(u => { S.cards[u].bonus += def(u).amount; ev.push({ t: 'effect', uid: u, targets: [u], delta: def(u).amount, text: '成長 +' + def(u).amount, snap: snap() }); });
      checkCombos(ev);
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
    // 天下取り宣言：3ターン目まで・1試合1回。宣言した側は撤退できない。撤退も3ターン目まで
    const DECLARE_LAST = 3, RETREAT_LAST = 3;
    function canDeclare(p) { return !S.over && S.declaredBy < 0 && S.turn >= 1 && S.turn <= DECLARE_LAST; }
    function canRetreat(p) { return !S.over && S.declaredBy !== p && S.turn >= 1 && S.turn <= RETREAT_LAST; }
    function declare(p) { if (!canDeclare(p)) return false; S.declaredBy = p; S.stakes = 4; return true; }
    function retreat(p) { if (!canRetreat(p)) return false; finish(p); return true; }

    return { S, def, loc, power, total, snap, leads, cap, costOf, locBonus, isProtected, silenced, startTurn, endTurn, canPlay, play, unplay, energy, energyLeft, declare, retreat, canDeclare, canRetreat, rand: R, TURNS };
  }

  // ---------- CPU ----------
  function cpuPlan(g, p) {
    const S = g.S, q = 1 - p;
    const hand = S.players[p].hand.slice();
    const budget = g.energyLeft(p);
    // エネルギー内でコスト合計が最大になる組み合わせ（同点ならパワー合計が高いほう）
    let best = [], bestScore = -1;
    const n = hand.length;
    for (let m = 1; m < (1 << n); m++) {
      let cost = 0, pw = 0; const set = [];
      for (let i = 0; i < n; i++) if (m & (1 << i)) { cost += g.costOf(hand[i]); pw += g.def(hand[i]).power + S.cards[hand[i]].bonus; set.push(hand[i]); }
      if (cost > budget) continue;
      const score = cost * 10 + pw + g.rand() * 3;
      if (score > bestScore) { bestScore = score; best = set; }
    }
    best.sort((a, b) => g.def(b).cost - g.def(a).cost);
    const extra = [[0, 0], [0, 0], [0, 0]];
    const placed = [];
    for (const uid of best) {
      const d = g.def(uid);
      let bestLi = -1, bestV = -1e9;
      for (let li = 0; li < 3; li++) {
        if (!g.canPlay(p, uid, li)) continue;
        const L = g.loc(li);
        let v = d.power + S.cards[uid].bonus;
        if (L.amount && ((L.tag && d.tags.includes(L.tag)) || (L.kind && d.kind === L.kind) || (L.costEq && d.cost === L.costEq) || (L.costGte && d.cost >= L.costGte) || (L.drawer && d.fx === 'draw'))) v += L.amount;
        const mine = S.board[li][p].length;
        if (d.kind === 'combo' && (S.board[li][p].some(u => S.cards[u].id === d.partner) || placed.some(x => x[1] === li && S.cards[x[0]].id === d.partner))) v += d.amount;
        if (best.some(u => u !== uid && g.def(u).kind === 'combo' && g.def(u).partner === d.id) && placed.some(x => x[1] === li)) v += 2;
        if (d.fx === 'ifSpread') v += [0, 1, 2].filter(x => x !== li).every(x => S.board[x][p].length) ? d.amount : -2;
        if (d.fx === 'ifFew') v += mine + 1 <= d.n ? d.amount : -3;
        if (d.fx === 'ifCountHere') v += mine + 1 >= d.n ? d.amount : 0;
        if (['perOwnHere', 'ongoingOthersHere', 'ongoingTagHere', 'buffTagHere', 'perTagHere'].includes(d.fx)) v += mine * 1;
        if (S.board[li][p].some(u => g.def(u).fx === 'ifFew')) v -= 3;
        const my = g.total(li, p) + extra[li][p], op = g.total(li, q) + extra[li][q];
        const gap = op - my;
        let w = 1;
        if (gap > 12) w = 0.3; else if (gap < -8) w = 0.25; else if (Math.abs(gap) <= 4) w = 1.4;
        if (mine === 0) w *= 1.35;
        if (['debuffRandom', 'debuffMax', 'debuffAll', 'destroyWeakest', 'destroyStrongest', 'matchEnemyMax', 'stealPower', 'stealCard', 'moveEnemyStrongest', 'equalizeHere'].includes(d.fx)) w *= S.board[li][q].length ? 1.3 : 0.4;
        if (d.kind === 'prophecy') v += S.board[li][q].length < g.cap(li, q) ? 1.5 : -3;
        const score = v * w + g.rand();
        if (score > bestV) { bestV = score; bestLi = li; }
      }
      if (bestLi >= 0 && g.play(p, uid, bestLi)) { placed.push([uid, bestLi]); extra[bestLi][p] += d.power; }
    }
    return placed;
  }
  function cpuDecide(g, p) {
    const S = g.S;
    if (S.over) return null;
    const lead = g.leads(p), lose = g.leads(1 - p);
    const gap = [0, 1, 2].reduce((a, li) => a + g.total(li, 1 - p) - g.total(li, p), 0);
    if (g.canDeclare(p) && S.turn >= 2) {
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
