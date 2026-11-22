// 歴史カードバトル：タイトル演出・メニュー・セーブ・コイン・ショップ・ランク・BGM
(function () {
  const U = window.RC_UI.x;
  const { DECKS } = window.RC_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const IMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const stage = $('#stage');

  // ---------- セーブ ----------
  const SAVE_KEY = 'save';
  function load() {
    const s = U.store.get(SAVE_KEY, null) || {};
    if (s.v !== 1) {
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
      <div class="coin-box"><div class="ci"></div><b id="coinNum">${SV.coins}</b></div>`;
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
    if (id === 'title' || id === 'starter' || id === 'deck') BGM.play('menu');
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
    const img = $('.tt-img', T), white = $('.tt-white', T);
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
  function openMenu() {
    const T = $('#title');
    T.classList.add('ready', 'menu'); T.classList.remove('seq');
    renderHud();
    if (!SV.started) setTimeout(firstRun, 500);
  }
  function toMenu() { U.closeModal(); U.setGame(null); U.show('title'); openMenu(); }

  // ---------- 最初の起動 ----------
  function firstRun() {
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
      <div class="gf-t1">デッキを手に入れた</div><div class="gf-t2">${d.name}</div><div class="gf-t3">${d.era}時代・「${d.theme}」　カード12枚が図鑑に登録された</div><div class="gf-tap">タップしてつづける</div>`;
    $('#fx').appendChild(el); el.style.pointerEvents = 'auto';
    for (let i = 0; i < 40; i++) { const c = document.createElement('i'); c.className = 'gf-p'; c.style.setProperty('--a', (Math.random() * 360) + 'deg'); c.style.setProperty('--r', (160 + Math.random() * 260) + 'px'); c.style.animationDelay = (Math.random() * .3) + 's'; el.appendChild(c); }
    setTimeout(() => { el.onclick = () => { el.classList.add('out'); setTimeout(() => { el.remove(); done && done(); }, 300); }; }, 700);
  }

  // ---------- ショップ ----------
  const PRICE = { himiko: 120, taishi: 120, yoritomo: 120, nobunaga: 120, iemitsu: 120, wakatakeru: 150, nakanooe: 150, shomu: 150, michinaga: 150, hideyoshi: 150,
    kiyomori: 160, tokimune: 160, yoshimasa: 170, genpaku: 170, saigo: 170, fukuzawa: 170, ito: 180, mutsu: 200, komura: 200 };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function refreshStock() {
    const day = today();
    if (SV.shop.day === day) return;
    // 日付と端末ごとのタネで、毎日ちがう8デッキを選ぶ
    let h = SV.seed; for (const ch of day) h = (Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0);
    const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
    const pool = Object.keys(DECKS).filter(id => !isOwned(id));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    SV.shop = { day, stock: pool.slice(0, 8) }; save();
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
  function deckTile(d, act, extra) {
    const own = isOwned(d.id);
    return `<div class="dtile${own ? '' : ' locked'}" data-act="${own ? act : 'lockedDeck'}" data-deck="${d.id}" style="--dc:${d.color}">
        <div class="df" style="background-image:url('${IMG(`img/face/${d.face}.webp`)}')"></div>
        <div class="dt"><div class="dn fit">${d.name}</div><div class="de fit">${d.era}時代・テーマ「${d.theme}」</div><div class="dd fit">${own ? d.desc : 'ショップで手に入る　' + (PRICE[d.id] || 150) + '枚'}</div></div>
        ${own ? (extra || '') : '<div class="lk">未入手</div>'}
      </div>`;
  }
  function sortedDecks() { const all = Object.values(DECKS); return all.filter(d => isOwned(d.id)).concat(all.filter(d => !isOwned(d.id))); }
  function renderDeckList() { $('#deckList').innerHTML = sortedDecks().map(d => deckTile(d, 'pickDeck')).join(''); $('#deckList').scrollTop = 0; U.fitAll($('#deck')); }
  function openZList() { U.show('zlist'); $('#zlistList').innerHTML = Object.values(DECKS).map(d => deckTile(d, 'zkOpen')).join(''); $('#zlistList').scrollTop = 0; U.fitAll($('#zlist')); }

  // ---------- 結果：コインとランク ----------
  function applyResult(r, ME) {
    const win = r.winner === ME, draw = r.winner < 0, retreat = r.retreat !== undefined;
    const before = SV.cpu, beforeInfo = rankInfo(before);
    const delta = draw ? 0 : (win ? r.stakes : -r.stakes);
    SV.cpu = Math.max(0, SV.cpu + delta);
    const coins = draw ? 15 : win ? (retreat ? 20 : r.stakes >= 4 ? 50 : 30) : 10;
    const cfrom = SV.coins; SV.coins += coins; SV.games++; if (win) SV.wins++;
    save();
    const after = rankInfo(SV.cpu);
    return { delta, coins, cfrom, cto: SV.coins, before: beforeInfo, after, up: after.lv > beforeInfo.lv, down: after.lv < beforeInfo.lv };
  }
  function resultHtml(x) {
    const a = x.after;
    return `<div class="res-meta">
      <div class="rm-coin"><div class="ci"></div><span>コイン</span><b data-from="${x.cfrom}" data-to="${x.cto}">${x.cfrom}</b><em>+${x.coins}</em></div>
      <div class="rm-rank"><div class="em" style="background-image:url('${a.img}')"></div><div class="rt"><div class="rl">CPUランク　${x.delta >= 0 ? '★+' + x.delta : '★' + x.delta}</div><div class="rn">${a.name}</div>
        <div class="gauge"><i data-w="${Math.min(100, a.have / a.need * 100)}" style="width:${x.up ? 0 : Math.min(100, x.before.have / x.before.need * 100)}%"></i></div></div></div>
    </div>`;
  }
  function animateResult(x) {
    const b = $('.rm-coin b'); if (b) { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 900); b.textContent = Math.round(x.cfrom + (x.cto - x.cfrom) * k); if (k < 1) requestAnimationFrame(step); }; setTimeout(() => requestAnimationFrame(step), 400); }
    const g = $('.rm-rank .gauge i'); if (g) setTimeout(() => g.style.width = g.dataset.w + '%', 500);
    if (x.up) setTimeout(() => rankUpFx(x.after), 1100);
  }
  function rankUpFx(a) {
    U.SE.play('cheer');
    const el = document.createElement('div'); el.className = 'getfx rankup';
    el.innerHTML = `<div class="gf-rays"></div><div class="gf-emb" style="background-image:url('${a.img}')"></div><div class="gf-t1">ランクアップ</div><div class="gf-t2">${a.name}</div><div class="gf-tap">タップしてつづける</div>`;
    $('#fx').appendChild(el); el.style.pointerEvents = 'auto';
    setTimeout(() => { el.onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }; }, 700);
  }

  // ---------- ボタン ----------
  function action(act, el) {
    switch (act) {
      case 'shop': U.SE.play('decide'); openShop(); return true;
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
  window.RC_META = { boot, onShow, action, toMenu, openMenu, openShop, openZList, renderDeckList, applyResult, resultHtml, animateResult, owned, isOwned, rankInfo, BGM, get save() { return SV; }, markTutorial() { SV.tutorial = true; save(); }, reset() { U.store.set(SAVE_KEY, null); SV = load(); } };
  boot();
})();
