// 歴史パズルを自動で作る（詰将棋スタイル：最終ターン、決まった手札・決まった相手の手）
// node tools/genpuzzles.js  → src/puzzles.js
global.window = {};
require('../src/data.js'); require('../src/engine.js');
const E = window.RC_ENGINE, { DECKS, CARDS } = window.RC_DATA;
const ORDER = Object.keys(DECKS);

function rebuild(seed, decks, turns) {
  const g = E.create({ seed, decks, noSnap: true });
  for (const t of turns) {
    g.startTurn();
    t.q.forEach(([u, li]) => g.play(1, u, li)); t.p.forEach(([u, li]) => g.play(0, u, li));
    g.endTurn();
  }
  return g;
}
const rec = (g, p) => g.S.pending[p].map(u => [u, g.S.cards[u].loc]);

// 手札から出せる手をぜんぶ作る
function options(g) {
  const hand = g.S.players[0].hand.slice(), out = [];
  function rec2(i, plays) {
    if (i === hand.length) { out.push(plays.slice()); return; }
    rec2(i + 1, plays);
    for (let li = 0; li < 3; li++) {
      // 試しに置けるか（その時点の盤面で）
      const h = rebuildQuick(plays);
      if (h.canPlay(0, hand[i], li)) { plays.push([hand[i], li]); rec2(i + 1, plays); plays.pop(); }
    }
  }
  let base = null;
  function rebuildQuick(plays) { const h = base(); plays.forEach(([u, li]) => h.play(0, u, li)); return h; }
  return { hand, run(mk) { base = mk; rec2(0, []); return out; } };
}

function makePuzzle(deck, opp, seed) {
  const decks = [deck, opp];
  let g = E.create({ seed, decks, noSnap: true });
  const pre = [];
  for (let t = 1; t <= 5; t++) {
    g.startTurn(); E.cpuPlan(g, 1); E.cpuPlan(g, 0);
    pre.push({ p: rec(g, 0), q: rec(g, 1) });
    g.endTurn(); if (g.S.over) return null;
  }
  g.startTurn(); E.cpuPlan(g, 1); const q6 = rec(g, 1);
  const base = () => { const h = rebuild(seed, decks, pre); h.startTurn(); q6.forEach(([u, li]) => h.play(1, u, li)); return h; };
  // AI の手（ふつうに置いたら負けるか）
  const ai = base(); E.cpuPlan(ai, 0); ai.endTurn(); if (ai.S.over.winner === 0) return null;
  const nothing = base(); nothing.endTurn(); if (nothing.S.over.winner === 0) return null;
  const opts = options(base()).run(base);
  if (opts.length < 25) return null;
  const wins = [];
  for (const o of opts) { const h = base(); o.forEach(([u, li]) => h.play(0, u, li)); h.endTurn(); if (h.S.over.winner === 0) wins.push(o); }
  if (!wins.length) return null;
  const ratio = wins.length / opts.length;
  if (ratio > 0.12) return null;
  // 解のカギ：解に必ず入っているカード（なければ最初の解の1枚目）
  const sol = wins[0];
  const must = sol.map(x => x[0]).filter(u => wins.every(w => w.some(x => x[0] === u)));
  const key = (must[0] || sol[0][0]);
  const keyLi = (wins.every(w => w.some(x => x[0] === key && x[1] === sol.find(y => y[0] === key)[1]))) ? sol.find(y => y[0] === key)[1] : -1;
  return { deck, opp, seed, pre, q6, wins: wins.length, total: opts.length, ratio, sol, key, keyLi };
}

const pick = [];
for (const deck of ORDER) {
  const i = ORDER.indexOf(deck);
  const opps = ORDER.filter(o => o !== deck).sort((a, b) => Math.abs(ORDER.indexOf(a) - i) - Math.abs(ORDER.indexOf(b) - i)).slice(0, 6);
  let best = null;
  const t0 = Date.now();
  outer: for (let s = 1; s <= 400; s++) {
    for (const opp of opps) {
      const pz = makePuzzle(deck, opp, s * 7919 + i);
      if (!pz) continue;
      const score = Math.abs(pz.ratio - 0.05) - Math.min(pz.total, 200) / 4000;
      if (!best || score < best.score) best = Object.assign(pz, { score });
      if (best && best.ratio >= 0.02 && best.ratio <= 0.08 && best.total >= 60) break outer;
    }
    if (Date.now() - t0 > 90000) break;
  }
  if (!best) { console.error('NG', deck); continue; }
  console.error(deck, 'vs', best.opp, 'seed', best.seed, 'wins', best.wins + '/' + best.total, (Date.now() - t0) + 'ms');
  pick.push(best);
}
const out = pick.map((p, n) => ({ id: n + 1, deck: p.deck, opp: p.opp, seed: p.seed, pre: p.pre, q6: p.q6, key: p.key, keyLi: p.keyLi, sol: p.sol, wins: p.wins, total: p.total }));
require('fs').writeFileSync(__dirname + '/../src/puzzles.js', '// 歴史パズルのデータ（tools/genpuzzles.js で自動生成）\nwindow.RC_PUZZLES = ' + JSON.stringify(out) + ';\n');
console.error('done', out.length);
