// 歴史カードバトル：タイトル演出・メニュー・セーブ・コイン・ショップ・ランク・BGM
(function () {
  const U = window.RC_UI.x;
  const { DECKS, CARDS } = window.RC_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const IMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const stage = $('#stage');

  // ---------- セーブ ----------
  const SAVE_KEY = 'save';
  function load() {
    const s = U.store.get(SAVE_KEY, null) || {};
    {
      s.v = 1; s.owned = s.owned || []; s.coins = s.coins || 0;
      s.cpu = s.cpu != null ? s.cpu : (U.store.get('stars', 0) || 0); s.pvp = s.pvp || 0;
      s.started = !!s.started; s.tutorial = !!s.tutorial; s.shop = s.shop || { day: '', stock: [] };
      s.seed = s.seed || ((Math.random() * 1e9) | 0); s.wins = s.wins || 0; s.games = s.games || 0;
    }
    return s;
  }
  let SV = load();
  const save = () => U.store.set(SAVE_KEY, SV);
  const owned = () => SV.owned.slice();
  const isOwned = (id) => SV.owned.includes(id);

  // ---------- ランク（7段位×3段階＝21段階）----------
  const RANKS = [['足軽', 'ashigaru', 4], ['武士', 'bushi', 6], ['侍大将', 'samurai', 8], ['城主', 'joshu', 10], ['大名', 'daimyo', 12], ['将軍', 'shogun', 14], ['天下人', 'tenka', 16]];
  function rankInfo(stars) {
    let left = Math.max(0, stars), lv = 0;
    for (let r = 0; r < RANKS.length; r++) for (let k = 0; k < 3; k++) {
      const need = RANKS[r][2];
      const last = r === RANKS.length - 1 && k === 2;
      if (last || left < need) return { lv, r, k, name: RANKS[r][0] + ' ' + (k + 1), img: IMG(`img/rank/${RANKS[r][1]}${k + 1}.webp`), have: last ? need : left, need, max: last };
      left -= need; lv++;
    }
  }
  function hudHtml() {
    const c = rankInfo(SV.cpu), p = rankInfo(SV.pvp);
    const bar = (i) => `<div class="gauge"><i style="width:${Math.min(100, i.have / i.need * 100)}%"></i></div>`;
    return `<div class="rk cpu"><div class="em" style="background-image:url('${c.img}')"></div>
        <div class="rt"><div class="rl">CPUランク</div><div class="rn">${c.name}</div>${bar(c)}<div class="rs">${c.max ? '最高ランク' : '次まで ★' + (c.need - c.have)}</div></div></div>
      <div class="rk pvp"><div class="em" style="background-image:url('${p.img}')"></div>
        <div class="rt"><div class="rl">対人ランク</div><div class="rn">${p.name}</div>${bar(p)}<div class="rs">2台対戦で上がる</div></div></div>
      <div class="coin-box"><div class="ci"></div><b id="coinNum">${SV.coins}</b></div>
      <div class="name-plate"><small>なまえ</small><b>${SV.name || '－'}</b></div>
      ${SV.daily ? `<button class="daily-chip${dailyReady() ? ' ready' : ''}" data-act="daily"><b>デイリー</b><span>${SV.daily.list.filter(m => m.prog >= m.goal).length} / 3</span>${dailyReady() ? '<i>!</i>' : ''}</button>` : ''}`;
  }
  function renderHud() { $$('.hud').forEach(h => h.innerHTML = hudHtml()); }

  // ---------- BGM ----------
  const BGM = {
    src: window.RC_BGMDATA || { menu: 'bgm/menu.ogg', battle: 'bgm/battle.ogg', win: 'bgm/win.ogg', lose: 'bgm/lose.ogg', shop: 'bgm/shop.ogg' },
    on: U.store.get('bgm', true), cur: null, name: '', vol: 0.45, unlocked: false,
    play(name) {
      if (this.name === name && this.cur && !this.cur.paused) return;
      this.name = name;
      const old = this.cur;
      if (old) this.fade(old, 0, 500, () => old.pause());
      if (!this.on || !this.unlocked || !this.src[name]) { this.cur = null; return; }
      const a = new Audio(this.src[name]); a.loop = name !== 'win' && name !== 'lose'; a.volume = 0;
      a.play().catch(() => { });
      this.cur = a; this.fade(a, this.vol, 700);
    },
    fade(a, to, ms, done) {
      const from = a.volume, t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / ms); try { a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch (e) { } if (k < 1) requestAnimationFrame(step); else done && done(); };
      requestAnimationFrame(step);
    },
    set(on) { this.on = on; U.store.set('bgm', on); if (!on && this.cur) { this.cur.pause(); this.cur = null; } else if (on) { const n = this.name; this.name = ''; this.play(n); } },
  };

  // ---------- 画面ごとの処理 ----------
  function onShow(id) {
    stage.classList.toggle('on-title', id === 'title');
    if (id === 'title' || id === 'starter' || id === 'deck' || id === 'camp' || id === 'puzzle') BGM.play('menu');
    if (id === 'shop' || id === 'zukan' || id === 'zlist') BGM.play('shop');
    if (id === 'game') BGM.play('battle');
    if (id === 'title' || id === 'shop') renderHud();
  }

  // ---------- 起動とタイトル演出 ----------
  let seq = null;
  function boot() {
    U.show('boot');
    $('#boot').onclick = () => { BGM.unlocked = true; U.SE.play('decide'); startTitle(); };
  }
  function petals() {
    const P = $('#petals'); P.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const e = document.createElement('i');
      e.style.left = (Math.random() * 100) + '%'; e.style.animationDuration = (7 + Math.random() * 7) + 's';
      e.style.animationDelay = (-Math.random() * 12) + 's'; e.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
      P.appendChild(e);
    }
  }
  function startTitle() {
    const T = $('#title');
    T.className = 'screen on seq'; U.show('title'); T.classList.add('seq');
    petals();
    const img = $('.tt-img', T), white = $('.tt-white', T); img.style.backgroundImage = '';
    const steps = [];
    let cancelled = false, anims = [];
    const run = (el, kf, opt) => { const a = el.animate(kf, Object.assign({ fill: 'forwards' }, opt)); anims.push(a); return a.finished.catch(() => { }); };
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    async function play() {
      // 1 左
      img.style.transformOrigin = '18% 55%';
      run(img, [{ transform: 'scale(1.75) translateX(3%)', opacity: 0 }, { transform: 'scale(1.6) translateX(-1%)', opacity: 1, offset: .25 }, { transform: 'scale(1.55) translateX(-3%)', opacity: 1 }], { duration: 2000, easing: 'ease-out' });
      U.SE.whoosh();
      await wait(1750); if (cancelled) return;
      // 白いトランジション
      run(white, [{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 0 }], { duration: 420 });
      await wait(210); if (cancelled) return;
      // 2 右
      img.getAnimations().forEach(a => a.cancel());
      img.style.transformOrigin = '84% 50%';
      run(img, [{ transform: 'scale(1.75) translateX(-3%)', opacity: 1 }, { transform: 'scale(1.55) translateX(3%)', opacity: 1 }], { duration: 2000, easing: 'ease-out' });
      U.SE.whoosh();
      await wait(1750); if (cancelled) return;
      run(white, [{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 0 }], { duration: 420 });
      await wait(210); if (cancelled) return;
      // 3 中央から引く
      img.getAnimations().forEach(a => a.cancel());
      img.style.transformOrigin = '50% 50%';
      await run(img, [{ transform: 'scale(2.3)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1900, easing: 'cubic-bezier(.3,0,.2,1)' });
      if (cancelled) return;
      finish();
    }
    function finish() {
      if (T.classList.contains('ready')) return;
      cancelled = true; anims.forEach(a => { try { a.cancel(); } catch (e) { } });
      img.style.transformOrigin = '50% 50%'; img.style.opacity = 1; img.style.transform = 'none';
      white.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
      U.SE.play('good'); BGM.play('menu');
      T.classList.remove('seq'); T.classList.add('ready');
      seq = null;
    }
    seq = { finish };
    T.onclick = (e) => {
      if (seq) { seq.finish(); return; }
      if (T.classList.contains('ready') && !T.classList.contains('menu')) { U.SE.play('decide'); openMenu(); }
    };
    play();
  }
  function applyBg() { const im = $('#title .tt-img'); if (im) im.style.backgroundImage = SV.bg && isOwned(SV.bg) ? `url('${IMG(`img/menubg/${SV.bg}.webp`)}')` : ''; }
  function openMenu() {
    const T = $('#title'); applyBg();
    T.classList.add('ready', 'menu'); T.classList.remove('seq');
    if (SV.started) refreshDaily();
    renderHud();
    if (!SV.started) setTimeout(firstRun, 500);
    else setTimeout(() => { if (!$('#modal.on')) checkResume(); }, 400);
  }
  function toMenu() { U.closeModal(); U.setGame(null); U.show('title'); openMenu(); }

  // ---------- 最初の起動 ----------
  function firstRun() {
    if (!SV.name) return openNameInput(firstRun, true);
    U.openModal(`<div class="mtitle">ようこそ</div>
      <div class="mbody fitb" style="text-align:center">本じい「わしは歴史の教科書、本じいじゃ。<br>はじめに、遊び方を教えてやろうか？」</div>
      <div class="mbtns"><button class="btn" id="ftSkip">あとで</button><button class="btn gold" id="ftTut">教えてもらう</button></div>`);
    $('#ftSkip').onclick = () => { U.closeModal(); openStarter(); };
    $('#ftTut').onclick = () => { U.closeModal(); if (window.RC_TUTORIAL) window.RC_TUTORIAL.start(() => openStarter()); else openStarter(); };
  }
  const STARTERS = ['himiko', 'taishi', 'yoritomo', 'nobunaga', 'iemitsu'];
  function openStarter() {
    if (SV.started) return toMenu();
    U.show('starter');
    $('#starterList').innerHTML = STARTERS.map((id, i) => { const d = DECKS[id]; return `
      <div class="st-card" data-act="pickStarter" data-deck="${id}" style="--dc:${d.color};animation-delay:${i * 90}ms">
        <div class="sc-img" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div><div class="sc-shade"></div>
        <div class="sc-era">${d.era}時代</div><div class="sc-name fit">${d.name}</div><div class="sc-theme">「${d.theme}」</div><div class="sc-desc fitb">${d.desc}</div>
      </div>`; }).join('');
    U.fitAll($('#starter'));
  }
  function pickStarter(id) {
    const d = DECKS[id];
    U.openConfirm(`${d.name}デッキにする？`, `テーマ「${d.theme}」<br>${d.desc}<br><br>ほかのデッキは、あとでショップで手に入る。`, 'これにする', () => {
      SV.owned = [id]; SV.started = true; save();
      getDeckFx(id, () => toMenu());
    }, 'gold');
  }

  // ---------- デッキを手に入れた演出 ----------
  function getDeckFx(id, done) {
    const d = DECKS[id];
    U.SE.play('cheer');
    const el = document.createElement('div'); el.className = 'getfx';
    el.innerHTML = `<div class="gf-rays"></div><div class="gf-face" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div>
      <div class="gf-t1">デッキを手に入れた</div><div class="gf-t2">${d.name}</div><div class="gf-t3">${d.era}時代・「${d.theme}」　カード12枚が図鑑に登録された</div>
      <div class="gf-bg"><div class="gb-img" style="background-image:url('${IMG(`img/menubg/${id}.webp`)}')"></div><div class="gb-t">メニューの背景もプレゼント！<small>設定の「メニューの背景」で変えられる</small></div></div><div class="gf-tap">タップしてつづける</div>`;
    $('#fx').appendChild(el); el.style.pointerEvents = 'auto';
    for (let i = 0; i < 40; i++) { const c = document.createElement('i'); c.className = 'gf-p'; c.style.setProperty('--a', (Math.random() * 360) + 'deg'); c.style.setProperty('--r', (160 + Math.random() * 260) + 'px'); c.style.animationDelay = (Math.random() * .3) + 's'; el.appendChild(c); }
    setTimeout(() => { el.onclick = () => { el.classList.add('out'); setTimeout(() => { el.remove(); done && done(); }, 300); }; }, 700);
  }

  // ---------- ショップ ----------
  const PRICE = { himiko: 50, taishi: 50, yoritomo: 50, nobunaga: 50, iemitsu: 50, wakatakeru: 150, nakanooe: 150, shomu: 150, michinaga: 150, hideyoshi: 150,
    kiyomori: 160, tokimune: 160, yoshimasa: 170, genpaku: 170, saigo: 170, fukuzawa: 170, ito: 180, mutsu: 200, komura: 200 };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function refreshStock() {
    const day = today();
    if (SV.shop.day === day && SV.shop.v === 2) return;
    // 日付と端末ごとのタネで、毎日ちがう8デッキを選ぶ
    let h = SV.seed; for (const ch of day) h = (Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0);
    const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
    const pool = Object.keys(DECKS).filter(id => !isOwned(id));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    // 最初の5デッキ（50コイン）は優先して並ぶ
    const st = pool.filter(id => STARTERS.includes(id)), rest = pool.filter(id => !STARTERS.includes(id));
    SV.shop = { v: 2, day, stock: st.concat(rest).slice(0, 8) }; save();
  }
  function nextRestock() {
    const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const m = Math.round((t - n) / 60000);
    return Math.floor(m / 60) + '時間' + (m % 60) + '分';
  }
  function openShop() {
    refreshStock(); U.show('shop'); renderShop();
  }
  function renderShop() {
    $('#shopHead').innerHTML = `<div class="sp-title">ショップ</div><div class="sp-sub">次の入荷まで ${nextRestock()}　（手に入れたデッキは並ばない）</div>
      <div class="hud mini" id="shopHud"></div><button class="btn" data-act="toTitle">もどる</button>`;
    renderHud();
    const stock = SV.shop.stock;
    if (!stock.length) { $('#shopGrid').innerHTML = `<div class="sp-empty">すべてのデッキを集めた！<br>天下統一おめでとう</div>`; return; }
    $('#shopGrid').innerHTML = stock.map((id, i) => {
      const d = DECKS[id], got = isOwned(id), price = PRICE[id] || 150, can = SV.coins >= price;
      return `<div class="sp-item${got ? ' got' : ''}" style="--dc:${d.color};animation-delay:${i * 60}ms">
        <div class="si-img" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div><div class="si-shade"></div>
        <div class="si-era">${d.era}</div><div class="si-name fit">${d.name}</div><div class="si-theme fit">「${d.theme}」${U.layout === 'land' ? d.desc : ''}</div>
        <div class="si-price"><i class="ci"></i>${price}</div>
        <div class="si-btns"><button class="btn" data-act="shopView" data-deck="${id}">カード</button>
          ${got ? '<div class="si-got">入手ずみ</div>' : `<button class="btn ${can ? 'gold' : ''}" data-act="shopBuy" data-deck="${id}" ${can ? '' : 'disabled'}>${can ? '買う' : 'コイン不足'}</button>`}</div>
      </div>`; }).join('');
    U.fitAll($('#shop'));
  }
  function buy(id) {
    const d = DECKS[id], price = PRICE[id] || 150;
    if (isOwned(id) || SV.coins < price) return;
    U.openConfirm(`${d.name}デッキを買う？`, `<span class="ci-inline"></span>${price} 枚で買います。<br>（いま ${SV.coins} 枚 → のこり ${SV.coins - price} 枚）`, '買う', () => {
      const from = SV.coins; SV.coins -= price; SV.owned.push(id); save();
      U.SE.play('decide'); countCoins(from, SV.coins);
      getDeckFx(id, () => renderShop());
    }, 'gold');
  }
  function countCoins(from, to) {
    const el = $('#coinNum'); if (!el) return;
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ---------- 図鑑の一覧・デッキの一覧 ----------
  // デッキケース（四角いケースに丸い顔）
  function deckTile(d, act, extra) {
    const own = isOwned(d.id);
    return `<div class="dcase${own ? '' : ' locked'}" data-act="${own ? act : 'lockedDeck'}" data-deck="${d.id}" style="--c:${d.color}">
        <div class="dc-era">${d.era}</div><div class="dc-clasp"></div>
        <div class="dc-face" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div>
        <div class="dc-nm fit">${d.name}</div><div class="dc-th fit">「${d.theme}」</div>
        <div class="dc-ds fitb">${own ? d.desc : '未入手　ショップで ' + (PRICE[d.id] || 150) + 'コイン'}</div>
        ${own ? (extra || '') : ''}
      </div>`;
  }
  function sortedDecks() { const all = Object.values(DECKS); return all.filter(d => isOwned(d.id)).concat(all.filter(d => !isOwned(d.id))); }
  function renderDeckList() { $('#deckList').innerHTML = sortedDecks().map(d => deckTile(d, 'pickDeck')).join(''); $('#deckList').scrollTop = 0; U.fitAll($('#deck')); }
  function openZList() { U.show('zlist'); $('#zlistList').innerHTML = Object.values(DECKS).map(d => deckTile(d, 'zkOpen')).join(''); $('#zlistList').scrollTop = 0; U.fitAll($('#zlist')); }

  // ---------- 結果：コインとランク ----------
  // 段位（足軽・武士…）のはじまりの★。CPU戦では段位が下がらない
  function floorStars(stars) { const info = rankInfo(stars); let f = 0; for (let r = 0; r < info.r; r++) f += RANKS[r][2] * 3; return f; }
  function applyResult(r, ME) {
    const win = r.winner === ME, draw = r.winner < 0, retreat = r.retreat !== undefined;
    const before = SV.cpu, beforeInfo = rankInfo(before);
    // CPU戦：勝ち +2（宣言 +4・相手撤退 +1）／負け -1（宣言して負け -2・撤退 0）
    let delta = draw ? 0 : win ? r.stakes : (retreat ? 0 : r.stakes >= 4 ? -2 : -1);
    SV.cpu = Math.max(floorStars(before), SV.cpu + delta);
    delta = SV.cpu - before;
    const coins = draw ? 15 : win ? (retreat ? 20 : r.stakes >= 4 ? 50 : 30) : 10;
    const cfrom = SV.coins; SV.coins += coins; SV.games++; if (win) SV.wins++;
    save();
    const after = rankInfo(SV.cpu);
    return { delta, coins, cfrom, cto: SV.coins, before: beforeInfo, after, up: after.lv > beforeInfo.lv, down: after.lv < beforeInfo.lv, newDan: after.r > beforeInfo.r };
  }
  const pct = (i) => Math.min(100, i.have / i.need * 100);
  function resultHtml(x) {
    const b = x.done ? x.after : x.before;
    return `<div class="res-meta">
      <div class="rm-coin"><div class="ci"></div><span>コイン</span><b data-from="${x.cfrom}" data-to="${x.cto}">${x.cfrom}</b><em>+${x.coins}</em></div>
      <div class="rm-rank"><div class="em" style="background-image:url('${b.img}')"></div><div class="rt"><div class="rl">CPUランク　<b class="${x.delta < 0 ? 'minus' : 'plus'}">★${x.delta >= 0 ? '+' : ''}${x.delta}</b><span class="gnum">★ ${b.have} / ${b.need}</span></div><div class="rn">${b.name}</div>
        <div class="gauge big"><i style="width:${pct(b)}%"></i><s></s></div></div></div>
    </div>`;
  }
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  async function animateResult(x) {
    const b = $('.rm-coin b'); if (b) { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 900); b.textContent = Math.round(x.cfrom + (x.cto - x.cfrom) * k); if (k < 1) requestAnimationFrame(step); }; setTimeout(() => requestAnimationFrame(step), 400); }
    const box = $('.rm-rank'); if (!box) return;
    const g = $('.gauge i', box), num = $('.gnum', box), em = $('.em', box), rn = $('.rn', box);
    await wait(600);
    // ★が飛んでゲージに入る
    const n = Math.abs(x.delta);
    for (let i = 0; i < n; i++) { starFly(box, x.delta > 0); U.SE.play(x.delta > 0 ? 'tap' : 'ng', 0.6); await wait(170); }
    await wait(280);
    if (x.up) {
      g.style.transition = 'width .55s cubic-bezier(.3,.9,.3,1)'; g.style.width = '100%';
      num.textContent = `★ ${x.before.need} / ${x.before.need}`;
      await wait(560);
      box.classList.add('full'); U.SE.play('good');
      await wait(650);
      await rankUpFx(x.before, x.after, x.newDan);
      // ランクの表示を新しくして、0からのびる
      box.classList.remove('full'); em.style.backgroundImage = `url('${x.after.img}')`; rn.textContent = x.after.name;
      box.classList.add('pop'); g.style.transition = 'none'; g.style.width = '0%'; void g.offsetWidth;
      g.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1)'; g.style.width = pct(x.after) + '%';
      num.textContent = `★ ${x.after.have} / ${x.after.need}`;
      x.done = true;
    } else {
      g.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1)'; g.style.width = pct(x.after) + '%';
      if (x.delta < 0) box.classList.add('dn'); else if (x.delta > 0) box.classList.add('gain');
      if (x.down) { em.style.backgroundImage = `url('${x.after.img}')`; rn.textContent = x.after.name; }
      num.textContent = `★ ${x.after.have} / ${x.after.need}`;
      x.done = true;
    }
  }
  function starFly(box, plus) {
    const sr = $('#stage').getBoundingClientRect(), k = sr.width / $('#stage').offsetWidth;
    const a = $('.rl b', box).getBoundingClientRect(), gi = $('.gauge', box).getBoundingClientRect(), fill = $('.gauge i', box).getBoundingClientRect();
    const sx = (a.left + a.width / 2 - sr.left) / k, sy = (a.top + a.height / 2 - sr.top) / k;
    const ex = (Math.max(fill.right - 6, gi.left + 6) - sr.left) / k, ey = (gi.top + gi.height / 2 - sr.top) / k;
    const el = document.createElement('div'); el.className = 'starfly' + (plus ? '' : ' minus'); el.textContent = '★';
    el.style.left = sx + 'px'; el.style.top = sy + 'px'; $('#stage').appendChild(el);
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 70;
    el.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: `translate(calc(-50% + ${mx - sx}px), calc(-50% + ${my - sy}px)) scale(1.6) rotate(180deg)`, opacity: 1, offset: .5 }, { transform: `translate(calc(-50% + ${ex - sx}px), calc(-50% + ${ey - sy}px)) scale(.6) rotate(360deg)`, opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => {
      el.remove(); const r = document.createElement('div'); r.className = 'gspark'; r.style.left = ex + 'px'; r.style.top = ey + 'px'; $('#stage').appendChild(r); setTimeout(() => r.remove(), 600);
    };
  }
  function rankUpFx(b, a, newDan) {
    return new Promise(done => {
      U.SE.play('cheer'); U.SE.play('decide');
      const el = document.createElement('div'); el.className = 'getfx rankup' + (newDan ? ' dan' : '');
      const parts = Array.from({ length: 36 }, (_, i) => { const ang = i / 36 * Math.PI * 2, d = 260 + Math.random() * 260; return `<i class="ru-c" style="--x:${Math.cos(ang) * d}px;--y:${Math.sin(ang) * d}px;--r:${Math.random() * 720 - 360}deg;--d:${Math.random() * .3}s;background:${['#ffe7a3', '#fff', '#ff9fbf', '#8fd0ff', '#f0c75e'][i % 5]}"></i>`; }).join('');
      el.innerHTML = `<div class="gf-rays"></div><div class="ru-flash"></div><div class="ru-ring"></div><div class="ru-ring r2"></div>${parts}
        <div class="ru-embs"><div class="gf-emb ru-old" style="background-image:url('${b.img}')"></div><div class="gf-emb ru-new" style="background-image:url('${a.img}')"></div></div>
        <div class="gf-t1">${newDan ? '昇段' : 'ランクアップ'}</div><div class="gf-t2">${a.name}</div><div class="gf-t3">${b.name}　→　${a.name}</div><div class="gf-tap">タップしてつづける</div>`;
      $('#stage').appendChild(el); el.style.pointerEvents = 'auto';
      setTimeout(() => U.SE.play('shock', 0.7), 900);
      setTimeout(() => { el.onclick = () => { U.SE.play('tap'); el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 300); }; }, 1600);
    });
  }

  // ---------- デイリーミッション（1つ50コイン・全部で+50） ----------
  const KINDN = { reveal: '公開時', ongoing: '永続', prophecy: '予言', combo: '史実コンボ' };
  function ownedCards() { return SV.owned.flatMap(id => DECKS[id].cards.map(c => CARDS[c])); }
  function missionPool() {
    const oc = ownedCards(), pool = [];
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    pool.push({ id: 'play1', t: 'CPUと1回対戦する', goal: 1 });
    pool.push({ id: 'win1', t: 'CPU戦で1回勝つ', goal: 1 });
    ['reveal', 'ongoing'].forEach(k => { if (oc.some(c => c.kind === k)) pool.push({ id: 'kind_' + k, t: `${KINDN[k]}のカードを3枚出す`, goal: 3, k }); });
    const tags = [...new Set(oc.flatMap(c => c.tags))]; const tg = rnd(tags);
    pool.push({ id: 'tag', t: `「${tg}」のカードを4枚出す`, goal: 4, tag: tg });
    pool.push({ id: 'pow10', t: '1つの場所でパワー10以上にする', goal: 1 });
    pool.push({ id: 'combo1', t: '史実コンボを1回決める', goal: 1 });
    const dk = rnd(SV.owned); pool.push({ id: 'deck', t: `${DECKS[dk].name}デッキで1回対戦する`, goal: 1, deck: dk });
    pool.push({ id: 'puzzle1', t: '歴史パズルを1問クリアする', goal: 1 });
    return pool;
  }
  function refreshDaily() {
    const day = today(); if (SV.daily && SV.daily.day === day) return;
    const pool = missionPool().sort(() => Math.random() - 0.5);
    const list = [pool.find(m => m.id === 'play1')].concat(pool.filter(m => m.id !== 'play1').slice(0, 2));
    SV.daily = { day, list: list.map(m => Object.assign(m, { prog: 0, got: false })), bonus: false }; save();
  }
  // 試合の中のできごとを記録（ui.js から呼ぶ）
  function track(ev, d) {
    if (!SV.daily) return; let ch = false;
    SV.daily.list.forEach(m => {
      if (m.prog >= m.goal) return; let add = 0;
      if (ev === 'play') { if (m.k && d.kind === m.k) add = 1; if (m.tag && d.tags.includes(m.tag)) add = 1; }
      if (ev === 'game') { if (m.id === 'play1' && (d.mode === 'cpu' || d.mode === 'camp')) add = 1; if (m.id === 'win1' && (d.mode === 'cpu' || d.mode === 'camp') && d.win) add = 1; if (m.id === 'pow10' && d.maxPow >= 10) add = 1; if (m.id === 'combo1' && d.combos > 0) add = 1; if (m.id === 'deck' && d.deck === m.deck) add = 1; }
      if (ev === 'puzzle' && m.id === 'puzzle1') add = 1;
      if (add) { m.prog = Math.min(m.goal, m.prog + add); ch = true; }
    });
    if (ch) save();
  }
  const dailyReady = () => SV.daily ? SV.daily.list.filter(m => m.prog >= m.goal && !m.got).length + (SV.daily.list.every(m => m.got) && !SV.daily.bonus ? 1 : 0) : 0;
  function openDaily() {
    refreshDaily(); const D = SV.daily, all = D.list.every(m => m.got);
    U.openModal(`<div class="mtitle">デイリーミッション</div>
      <div class="mbody daily">${D.list.map((m, i) => `<div class="dm${m.got ? ' got' : m.prog >= m.goal ? ' ok' : ''}"><div class="dm-t">${m.t}</div>
        <div class="dm-g"><div class="gauge"><i style="width:${m.prog / m.goal * 100}%"></i></div><span>${m.prog} / ${m.goal}</span></div>
        ${m.got ? '<div class="dm-b done">受け取りずみ</div>' : m.prog >= m.goal ? `<button class="btn gold dm-b" data-dm="${i}"><span class="ci-inline"></span>50 うけとる</button>` : '<div class="dm-b"><span class="ci-inline"></span>50</div>'}</div>`).join('')}
        <div class="dm bonus${D.bonus ? ' got' : all ? ' ok' : ''}"><div class="dm-t">3つぜんぶ達成ボーナス</div>${D.bonus ? '<div class="dm-b done">受け取りずみ</div>' : all ? '<button class="btn gold dm-b" data-dm="b"><span class="ci-inline"></span>50 うけとる</button>' : '<div class="dm-b"><span class="ci-inline"></span>50</div>'}</div>
        <div class="dm-note">毎日あたらしいミッションに変わります（1日 最大200コイン）</div></div>
      <div class="mbtns"><button class="btn gold" data-act="closeModal">とじる</button></div>`, openDaily);
    document.querySelectorAll('[data-dm]').forEach(b => b.onclick = (e) => {
      e.stopPropagation(); const k = b.dataset.dm, from = SV.coins;
      if (k === 'b') D.bonus = true; else D.list[+k].got = true;
      SV.coins += 50; save(); U.SE.play('cheer', 0.8); renderHud(); countCoins(from, SV.coins); coinBurst(b); openDaily();
    });
  }
  function coinBurst(b) {
    const sr = $('#stage').getBoundingClientRect(), k = sr.width / $('#stage').offsetWidth, r = b.getBoundingClientRect();
    for (let i = 0; i < 10; i++) { const c = document.createElement('div'); c.className = 'cburst'; c.style.left = ((r.left + r.width / 2 - sr.left) / k) + 'px'; c.style.top = ((r.top - sr.top) / k) + 'px';
      c.style.setProperty('--x', (Math.random() * 200 - 100) + 'px'); c.style.setProperty('--y', (-60 - Math.random() * 120) + 'px'); c.style.animationDelay = (i * 0.03) + 's'; $('#stage').appendChild(c); setTimeout(() => c.remove(), 1000); }
  }

  // ---------- 対戦モードえらび ----------
  let deckFor = null;
  function openModes() {
    const M = (act, t, sub, cls) => `<button class="mode ${cls || ''}" data-act="${act}"><b>${t}</b><span>${sub}</span></button>`;
    U.openModal(`<div class="mtitle">対戦</div><div class="mbody modes">
      ${M('modeCpu', 'CPUと対戦', 'デッキをえらんで勝負。CPUランクが上がる', 'gold')}${M('modeCamp', '時代めぐり', '時代ごとの特別ルールで戦う')}
      ${M('modePuzzle', '歴史パズル', '決まった場面から勝ちを考える')}${M('modeFriend', '友達と対戦', '2台で音を使って対戦。対人ランクが上がる')}</div>
      <div class="mbtns"><button class="btn" data-act="closeModal">もどる</button></div>`, openModes);
  }
  function openDeckFor(purpose, head, cb) {
    deckFor = { purpose, cb }; U.closeModal(); U.show('deck'); $('#deck .deck-head').textContent = head || 'デッキをえらぶ'; renderDeckList();
  }

  // ---------- 試合のつづき ----------
  function checkResume() {
    const R = U.store.get('resume', null);
    if (!R || !R.turns || R.v !== 1) return false;
    U.openModal(`<div class="mtitle">試合のつづき</div><div class="mbody fitb" style="text-align:center">前に遊んでいた試合が残っています。<br><b>${DECKS[R.deck].name}デッキ</b>（ターン${R.turns.length + 1}から）<br>つづきから遊びますか？<br><small>やめると、その試合は放棄されます（★・コインは変わりません）</small></div>
      <div class="mbtns"><button class="btn red" id="rsNo">放棄する</button><button class="btn gold" id="rsYes">つづける</button></div>`);
    $('#rsNo').onclick = () => { U.SE.play('tap'); window.RC_UI.clearResume(); U.closeModal(); };
    $('#rsYes').onclick = () => { U.SE.play('decide'); U.closeModal(); resumeByMode(R); };
    return true;
  }
  function resumeByMode(R) {
    if (R.o.mode === 'friend' && window.RC_FRIEND) return window.RC_FRIEND.resume(R);
    window.RC_UI.resumeGame(R);
  }

  // ---------- 名前（ひらがなとー、1〜8文字） ----------
  const KANA = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'や　ゆ　よ', 'らりるれろ', 'わ　を　ん'];
  const DAKU = { 'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご', 'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ', 'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど', 'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ', 'う': 'ゔ' };
  const HAN = { 'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ' };
  const SMALL = { 'あ': 'ぁ', 'い': 'ぃ', 'う': 'ぅ', 'え': 'ぇ', 'お': 'ぉ', 'つ': 'っ', 'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ', 'わ': 'ゎ' };
  const inv = (o) => Object.fromEntries(Object.entries(o).map(([a, b]) => [b, a]));
  const UNDAKU = inv(DAKU), UNHAN = inv(HAN), BIG = inv(SMALL);
  // ローマ字入力（日本語入力がオフのPCキーボード用）
  const ROMA = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お', ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ', ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
    na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の', ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ', ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も', ya: 'や', yu: 'ゆ', yo: 'よ', ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
    wa: 'わ', wo: 'を', nn: 'ん', ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご', za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ', da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
    pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ', kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', sya: 'しゃ', sha: 'しゃ', syu: 'しゅ', shu: 'しゅ', syo: 'しょ', sho: 'しょ', tya: 'ちゃ', cha: 'ちゃ', tyu: 'ちゅ', chu: 'ちゅ', tyo: 'ちょ', cho: 'ちょ',
    nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
    bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ', xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xtu: 'っ', ltu: 'っ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ', '-': 'ー' };
  function romaToKana(str) {
    let out = '', buf = '';
    for (const ch of str.toLowerCase()) {
      if (!/[a-z\-]/.test(ch)) { out += buf.replace(/n$/, 'ん') + ch; buf = ''; continue; }
      buf += ch;
      if (buf.length >= 2 && buf[0] === buf[1] && buf[0] !== 'n' && /[bcdfghjkmpqrstvwxyz]/.test(buf[0])) { out += 'っ'; buf = buf.slice(1); }
      if (buf.length >= 2 && buf[0] === 'n' && !/[aiueoy n]/.test(buf[1])) { out += 'ん'; buf = buf.slice(1); }
      if (ROMA[buf]) { out += ROMA[buf]; buf = ''; }
      else if (buf.length >= 3) { buf = buf.slice(1); }
    }
    return { kana: out, rest: buf };
  }
  const NAME_OK = /^[ぁ-ゖー]{1,8}$/;
  function cleanName(v) { return (v || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[^ぁ-ゖー]/g, '').slice(0, 8); }
  function openNameInput(done, first) {
    let val = SV.name || '';
    const keys = KANA.map(col => `<div class="kcol">${[...col].map(k => k === '　' ? '<i></i>' : `<button class="kk" data-k="${k}">${k}</button>`).join('')}</div>`).join('');
    U.openModal(`<div class="mtitle">${first ? 'なまえを入れてね' : '名前をかえる'}</div>
      <div class="mbody namebody">
        <div class="nm-row"><input id="nmIn" class="nm-in" maxlength="16" autocomplete="off" spellcheck="false" placeholder="ひらがな 8文字まで" value="${val}"><div class="nm-cnt" id="nmCnt"></div></div>
        <div class="nm-msg" id="nmMsg">キーボード・下のボタン・スマホの入力、どれでも入れられます</div>
        <div class="kbd">${keys}<div class="kcol sp"><button class="kk" data-k="゛">゛</button><button class="kk" data-k="゜">゜</button><button class="kk" data-k="小">小</button><button class="kk" data-k="ー">ー</button><button class="kk del" data-k="del">けす</button></div></div>
      </div>
      <div class="mbtns">${first ? '' : '<button class="btn" id="nmCancel">やめる</button>'}<button class="btn gold" id="nmOk">けってい</button></div>`, null, 'big');
    const inp = $('#nmIn'), msg = $('#nmMsg'), cnt = $('#nmCnt');
    let composing = false;
    const show = () => { cnt.textContent = `${[...inp.value.replace(/[a-z]/gi, '')].length} / 8`; $('#nmOk').disabled = !NAME_OK.test(inp.value); };
    const sanitize = () => {
      const half = inp.value.replace(/[ａ-ｚＡ-Ｚ－]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
      const r = romaToKana(half), kata = r.kana.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
      const ok = cleanName(kata);
      if (kata.replace(/[^ぁ-ゖー]/g, '') !== kata) msg.textContent = 'ひらがなだけ使えます（漢字・数字・記号はけしました）';
      inp.value = ok + ([...ok].length < 8 ? r.rest : ''); show();
    };
    inp.addEventListener('compositionstart', () => composing = true);
    inp.addEventListener('compositionend', () => { composing = false; sanitize(); });
    inp.addEventListener('input', () => { if (!composing) sanitize(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !composing && NAME_OK.test(inp.value)) $('#nmOk').click(); });
    document.querySelectorAll('.kbd .kk').forEach(b => b.onclick = (e) => {
      e.stopPropagation(); U.SE.play('tap', 0.6); const k = b.dataset.k; let v = inp.value.replace(/[a-z]+$/i, ''); const last = v.slice(-1);
      if (k === 'del') v = v.slice(0, -1);
      else if (k === '゛') v = v.slice(0, -1) + (DAKU[last] || UNDAKU[last] || (HAN[UNHAN[last]] ? DAKU[UNHAN[last]] : last));
      else if (k === '゜') v = v.slice(0, -1) + (HAN[last] || UNHAN[last] || (UNDAKU[last] && HAN[UNDAKU[last]]) || last);
      else if (k === '小') v = v.slice(0, -1) + (SMALL[last] || BIG[last] || last);
      else if ([...v].length < 8) v += k;
      inp.value = v; show();
    });
    show();
    if (!('ontouchstart' in window)) setTimeout(() => inp.focus(), 100);
    if ($('#nmCancel')) $('#nmCancel').onclick = () => { U.SE.play('tap'); done && done(); };
    $('#nmOk').onclick = () => {
      const v = inp.value; if (!NAME_OK.test(v)) { msg.textContent = 'ひらがなで1〜8文字にしてね'; U.SE.play('ng'); return; }
      SV.name = v; save(); renderHud(); U.SE.play('decide'); U.closeModal(); done && done();
    };
  }

  // ---------- メニューの背景 ----------
  function openBgPicker(page) {
    page = page || 0;
    const list = ['title'].concat(Object.keys(DECKS).filter(isOwned));
    const per = U.layout === 'land' ? 6 : 4, pages = Math.max(1, Math.ceil(list.length / per));
    page = Math.min(page, pages - 1);
    const cur = SV.bg && isOwned(SV.bg) ? SV.bg : 'title';
    const items = list.slice(page * per, page * per + per).map(id => `<button class="bgp${id === cur ? ' on' : ''}" data-bg="${id}"><div class="bp-img" style="background-image:url('${id === 'title' ? IMG(`img/ui/title_bg.webp`) : IMG(`img/menubg/${id}.webp`)}')"></div><div class="bp-nm">${id === 'title' ? 'タイトル' : DECKS[id].name}</div></button>`).join('');
    U.openModal(`<div class="mtitle">メニューの背景</div>
      <div class="mbody bgpick">${items}</div>
      <div class="mbtns"><button class="btn" id="bpPrev" ${page ? '' : 'disabled'}>まえへ</button><span class="pgno">${page + 1} / ${pages}</span><button class="btn" id="bpNext" ${page < pages - 1 ? '' : 'disabled'}>つぎへ</button><button class="btn gold" id="bpBack">もどる</button></div>`, () => openBgPicker(page), 'big');
    document.querySelectorAll('.bgp').forEach(b => b.onclick = (e) => { e.stopPropagation(); U.SE.play('decide'); SV.bg = b.dataset.bg === 'title' ? '' : b.dataset.bg; save(); applyBg(); openBgPicker(page); });
    $('#bpPrev').onclick = () => { U.SE.play('tap'); openBgPicker(page - 1); };
    $('#bpNext').onclick = () => { U.SE.play('tap'); openBgPicker(page + 1); };
    $('#bpBack').onclick = () => { U.SE.play('tap'); U.closeModal(); };
  }

  // ---------- デバッグモード（設定の「設定」を20回おす） ----------
  function openDebug(msg) {
    const B = (id, t, c) => `<button class="btn ${c || ''}" data-dbg="${id}">${t}</button>`;
    U.openModal(`<div class="mtitle">デバッグモード</div>
      <div class="mbody dbg"><div class="dbg-st">コイン ${SV.coins}　CPU ★${SV.cpu}（${rankInfo(SV.cpu).name}）　デッキ ${owned().length}/19</div>
      <div class="dbg-grid">${B('coin', 'コイン +1000', 'gold')}${B('all', '全デッキ入手', 'gold')}${B('up', 'CPU ★+5')}${B('down', 'CPU ★-5')}${B('max', 'ランク最高')}${B('zero', 'ランク0')}${B('shop', 'ショップ入れかえ')}${B('fast', window.RC_UI.isFast ? '早送り オフ' : '早送り オン')}${B('trans', '引き継ぎQR')}${B('reset', 'セーブを消す', 'red')}${B('close', 'とじる')}</div>
      <div class="dbg-msg">${msg || ''}</div></div>`, () => openDebug(msg));
    document.querySelectorAll('[data-dbg]').forEach(b => b.onclick = (e) => {
      e.stopPropagation(); U.SE.play('tap'); const k = b.dataset.dbg; let m = '';
      if (k === 'coin') { SV.coins += 1000; m = 'コインを1000ふやした'; }
      if (k === 'all') { SV.owned = Object.keys(DECKS); m = 'すべてのデッキを手に入れた'; }
      if (k === 'up') { SV.cpu += 5; m = '★+5'; }
      if (k === 'down') { SV.cpu = Math.max(0, SV.cpu - 5); m = '★-5'; }
      if (k === 'max') { SV.cpu = RANKS.reduce((a, r) => a + r[2] * 3, 0); m = 'ランクを最高にした'; }
      if (k === 'zero') { SV.cpu = 0; m = 'ランクを0にした'; }
      if (k === 'shop') { SV.shop.day = ''; refreshStock(); m = 'ショップを入れかえた'; }
      if (k === 'fast') { window.RC_UI.fast(!window.RC_UI.isFast); m = window.RC_UI.isFast ? '演出を早送りにした' : '早送りをやめた'; }
      if (k === 'close') { U.closeModal(); renderHud(); return; }
      if (k === 'trans') { window.RC_FRIEND.openTransfer(); return; }
      if (k === 'reset') { U.openConfirm('セーブを消しますか？', 'コイン・デッキ・ランクがすべて最初にもどります。', '消す', () => { U.store.set(SAVE_KEY, null); SV = load(); location.reload(); }, 'red'); return; }
      save(); renderHud(); openDebug(m);
    });
  }

  // ---------- ボタン ----------
  function action(act, el) {
    switch (act) {
      case 'shop': U.SE.play('decide'); openShop(); return true;
      case 'daily': U.SE.play('decide'); openDaily(); return true;
      case 'toDeck': U.SE.play('decide'); openModes(); return true;
      case 'modeCpu': U.SE.play('decide'); deckFor = null; U.closeModal(); U.show('deck'); $('#deck .deck-head').textContent = 'デッキをえらぶ（CPUと対戦）'; renderDeckList(); return true;
      case 'modeCamp': U.SE.play('decide'); U.closeModal(); if (window.RC_CAMP) window.RC_CAMP.open(); return true;
      case 'modePuzzle': U.SE.play('decide'); U.closeModal(); if (window.RC_PUZZLE) window.RC_PUZZLE.open(); return true;
      case 'modeFriend': U.SE.play('decide'); U.closeModal(); if (window.RC_FRIEND) window.RC_FRIEND.open(); return true;
      case 'pickDeck': if (!deckFor) return false; { const f = deckFor; deckFor = null; U.SE.play('decide'); f.cb(el.dataset.deck); } return true;
      case 'shopBuy': buy(el.dataset.deck); return true;
      case 'shopView': U.SE.play('tap'); U.openZukanDeck(el.dataset.deck, 'shop'); return true;
      case 'pickStarter': U.SE.play('tap'); pickStarter(el.dataset.deck); return true;
      case 'lockedDeck': U.SE.play('ng'); U.openConfirm('まだ持っていないデッキ', `${DECKS[el.dataset.deck].name}デッキは、ショップで手に入る。<br>ショップの品は毎日かわるよ。`, 'ショップへ', () => openShop(), 'gold'); return true;
      case 'zkOpen': U.SE.play('tap'); U.openZukanDeck(el.dataset.deck, 'zlist'); return true;
    }
    return false;
  }

  window.addEventListener('resize', () => setTimeout(() => {
    if ($('#shop').classList.contains('on')) renderShop();
    if ($('#zlist').classList.contains('on')) openZList();
    if ($('#starter').classList.contains('on')) openStarter();
    renderHud(); U.fitAll();
  }, 60));
  window.RC_META = { track, refreshDaily, openDeckFor, renderHud, get SV() { return SV; }, saveNow: () => save(), countCoins, playerName: () => SV.name || '－', openNameInput, openBgPicker, applyBg, openDebug, openStarter, boot, onShow, action, toMenu, openMenu, openShop, openZList, renderDeckList, applyResult, resultHtml, animateResult, owned, isOwned, rankInfo, BGM, get save() { return SV; }, markTutorial() { SV.tutorial = true; save(); }, reset() { U.store.set(SAVE_KEY, null); SV = load(); } };
  boot();
})();
