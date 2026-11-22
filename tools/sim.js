// CPUどうしで全デッキ総当たりの対戦をして、バランスを確認する
// 使い方：node tools/sim.js [1組あたりの試合数=100] [--cards]
global.window = {};
require('../src/data.js'); require('../src/engine.js');
const { DECKS, CARDS } = window.RC_DATA; const E = window.RC_ENGINE;
const N = +process.argv[2] || 100, showCards = process.argv.includes('--cards');
const ids = Object.keys(DECKS);
const deck = {}; ids.forEach(d => deck[d] = { w: 0, l: 0, dr: 0, pts: 0 });
const mat = {}; const card = {}; let games = 0, errs = 0, seed = 1;
const ev = { combo: 0, destroy: 0, prophecy: 0, hit: 0, steal: 0, move: 0, spawn: 0, canceled: 0, draw: 0 };
for (const a of ids) for (const b of ids) {
  if (a === b) continue;
  for (let i = 0; i < N; i++) {
    const g = E.create({ seed: seed++ * 2654435761 % 4294967296, decks: [a, b], noSnap: true });
    const played = [new Set(), new Set()];
    try {
      while (!g.S.over) {
        g.startTurn();
        for (let p = 0; p < 2 && !g.S.over; p++) { const dc = E.cpuDecide(g, p); if (dc === 'declare') g.declare(p); if (dc === 'retreat') g.retreat(p); }
        if (g.S.over) break;
        E.cpuPlan(g, 0); E.cpuPlan(g, 1);
        g.S.pending.forEach((l, p) => l.forEach(u => played[p].add(g.S.cards[u].id)));
        g.endTurn().forEach(e => { if (e.t in ev) ev[e.t]++; if (e.t === 'prophecy' && e.hit) ev.hit++; if (e.t === 'draw' && e.reason) ev.draw++; });
      }
    } catch (e) { errs++; if (errs < 4) console.error(a, b, e); continue; }
    games++;
    const r = g.S.over;
    const k = a + '>' + b; mat[k] = mat[k] || [0, 0]; mat[k][1]++;
    if (r.winner < 0) { deck[a].dr++; deck[b].dr++; }
    else {
      const W = r.winner === 0 ? a : b, L = r.winner === 0 ? b : a;
      deck[W].w++; deck[L].l++; deck[W].pts += r.stakes; deck[L].pts -= r.stakes;
      if (W === a) mat[k][0]++;
      played.forEach((set, p) => set.forEach(cid => { const c = card[cid] = card[cid] || { w: 0, n: 0 }; c.n++; if (r.winner === p) c.w++; }));
    }
  }
}
const rate = (d) => d.w / (d.w + d.l + d.dr) * 100;
console.log(`試合数 ${games}（エラー ${errs}）  1組 ${N}試合`);
console.log('デッキ別の勝率（高い順）');
ids.slice().sort((x, y) => rate(deck[y]) - rate(deck[x])).forEach(d => {
  const r = rate(deck[d]); const mark = r > 60 ? ' ← 強すぎ' : r < 40 ? ' ← 弱すぎ' : '';
  console.log(`  ${DECKS[d].name.padEnd(12, '　')} ${r.toFixed(1).padStart(5)}%  ★/試合 ${(deck[d].pts / (deck[d].w + deck[d].l + deck[d].dr)).toFixed(2)}${mark}`);
});
// 相性（片寄りが大きい組み合わせ）
const pair = [];
for (let x = 0; x < ids.length; x++) for (let y = x + 1; y < ids.length; y++) {
  const a = ids[x], b = ids[y]; const m1 = mat[a + '>' + b] || [0, 1], m2 = mat[b + '>' + a] || [0, 1];
  const wa = (m1[0] + (m2[1] - m2[0])) / (m1[1] + m2[1]) * 100; pair.push([a, b, wa]);
}
pair.sort((p, q) => Math.abs(q[2] - 50) - Math.abs(p[2] - 50));
console.log('相性の片寄りが大きい組み合わせ（上位8）');
pair.slice(0, 8).forEach(([a, b, w]) => console.log(`  ${DECKS[a].name} 対 ${DECKS[b].name}：${w.toFixed(0)}% - ${(100 - w).toFixed(0)}%`));
console.log('できごと/試合', Object.entries(ev).map(([k, v]) => k + ' ' + (v / games).toFixed(2)).join('  '), ' 予言的中率', (ev.hit / ev.prophecy * 100).toFixed(0) + '%');
if (showCards) {
  console.log('カード別：出した試合の勝率（高い・低い10枚）');
  const cs = Object.entries(card).filter(([, c]) => c.n > 200).map(([id, c]) => [CARDS[id].name, c.w / c.n * 100, c.n]).sort((p, q) => q[1] - p[1]);
  cs.slice(0, 10).forEach(c => console.log('  ↑', c[0], c[1].toFixed(0) + '%'));
  cs.slice(-10).forEach(c => console.log('  ↓', c[0], c[1].toFixed(0) + '%'));
}
