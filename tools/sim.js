// CPUどうしで対戦させてバランスを確認する： node tools/sim.js 2000
global.window = {};
require('../src/data.js'); require('../src/engine.js');
const E = window.RC_ENGINE;
const N = +process.argv[2] || 1000;
function run(d0, d1) {
  const s = { w: [0, 0], draw: 0, tot: 0, combos: 0, hits: 0, proph: 0, ret: 0, decl: 0, destroy: 0, stars: [0, 0], err: 0 };
  for (let i = 0; i < N; i++) {
    const g = E.create({ seed: i * 7919 + 13, decks: [d0, d1] });
    try {
      while (!g.S.over) {
        g.startTurn();
        for (let p = 0; p < 2 && !g.S.over; p++) { const dc = E.cpuDecide(g, p); if (dc === 'declare') g.declare(p); if (dc === 'retreat') g.retreat(p); }
        if (g.S.over) break;
        E.cpuPlan(g, 0); E.cpuPlan(g, 1);
        g.endTurn().forEach(e => { if (e.t === 'combo') s.combos++; if (e.t === 'prophecy') { s.proph++; if (e.hit) s.hits++; } if (e.t === 'destroy') s.destroy++; });
      }
    } catch (e) { s.err++; if (s.err < 3) console.error(e); continue; }
    const r = g.S.over; if (r.retreat !== undefined) s.ret++; if (g.S.declaredBy >= 0) s.decl++;
    if (r.winner < 0) s.draw++; else { s.w[r.winner]++; s.stars[r.winner] += r.stakes; s.stars[1 - r.winner] -= r.stakes; }
  }
  const pc = (x) => (x / N * 100).toFixed(1) + '%';
  console.log(d0 + ' vs ' + d1, 'P0勝', pc(s.w[0]), 'P1勝', pc(s.w[1]), '引分', pc(s.draw), '宣言', pc(s.decl), '撤退', pc(s.ret),
    'コンボ/試合', (s.combos / N).toFixed(2), '予言的中', s.proph ? (s.hits / s.proph * 100).toFixed(0) + '%' : '-', '退場/試合', (s.destroy / N).toFixed(2), '★/試合 P0', (s.stars[0] / N).toFixed(2), 'err', s.err);
}
run('himiko', 'taishi'); run('taishi', 'himiko'); run('himiko', 'himiko'); run('taishi', 'taishi');
