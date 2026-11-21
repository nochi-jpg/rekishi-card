// CPUどうしで対戦させてバランスを確認する： node tools/sim.js 2000
global.window = {};
require('../src/data.js'); require('../src/engine.js');
const E = window.RC_ENGINE;
const N = +process.argv[2] || 1000;
const stat = {};
function run(d0, d1) {
  const key = d0 + ' vs ' + d1; const s = stat[key] = stat[key] || { w: [0, 0], draw: 0, tot: 0, combos: 0, hits: 0, ret: 0, err: 0 };
  for (let i = 0; i < N; i++) {
    const g = E.create({ seed: i * 7919 + 13, decks: [d0, d1] });
    try {
      while (!g.S.over) {
        g.startTurn();
        for (let p = 0; p < 2; p++) { const dc = E.cpuDecide(g, p); if (dc === 'declare') g.declare(p); if (dc === 'retreat') { g.retreat(p); break; } }
        if (g.S.over) break;
        E.cpuPlan(g, 0); E.cpuPlan(g, 1);
        const ev = g.endTurn();
        ev.forEach(e => { if (e.t === 'combo') s.combos++; if (e.t === 'prophecy' && e.hit) s.hits++; });
      }
    } catch (e) { s.err++; if (s.err < 3) console.error(e); continue; }
    const r = g.S.over; if (r.retreat !== undefined) s.ret++;
    if (r.winner < 0) s.draw++; else s.w[r.winner]++;
    s.tot += [0,1,2].reduce((a, li) => a + g.total(li, 0) + g.total(li, 1), 0);
  }
}
run('himiko', 'taishi'); run('taishi', 'himiko'); run('himiko', 'himiko'); run('taishi', 'taishi');
for (const k in stat) { const s = stat[k]; console.log(k, 'P0勝', (s.w[0]/N*100).toFixed(1)+'%', 'P1勝', (s.w[1]/N*100).toFixed(1)+'%', '引分', s.draw, '撤退', s.ret, '平均合計', (s.tot/N).toFixed(1), 'コンボ/試合', (s.combos/N).toFixed(2), '予言的中/試合', (s.hits/N).toFixed(2), 'err', s.err); }
