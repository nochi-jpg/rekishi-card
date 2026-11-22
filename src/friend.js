// 歴史カードバトル：友達と対戦（QRでプロフィール交換 → 音でデッキと手を同期）
// 音の部分は manabi-monster と同じ仕組み（ggwave）。人がボタンを押したときだけ鳴る
(function () {
  const U = window.RC_UI.x, M = window.RC_META, $ = (s, r) => (r || document).querySelector(s);
  const { DECKS } = window.RC_DATA;
  const IMG = (p) => (window.RC_IMG && window.RC_IMG[p]) || p;
  const ORDER = Object.keys(DECKS);

  // ---------- 文字列 ⇔ base64url ----------
  const b64 = { enc(bytes) { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    dec(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return Uint8Array.from(s, c => c.charCodeAt(0)); } };
  const utf8 = { enc: (s) => new TextEncoder().encode(s), dec: (b) => new TextDecoder().decode(b) };
  function hash16(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ((h >>> 16) ^ h) & 0xffff; }

  // ---------- QR ----------
  const QR = {
    make(text, cell) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(cell || 6, 2); },
    cam: null, timer: null,
    startCamera(video, onText, onMsg) {
      QR.stop();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { onMsg('このブラウザではカメラが使えません。「画像から読む」を使ってね'); return; }
      onMsg('カメラをじゅんびしています');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }).then(s => {
        QR.cam = s; video.srcObject = s; video.play(); onMsg('QRをカメラに見せてね');
        const cv = document.createElement('canvas');
        QR.timer = setInterval(() => {
          if (!video.videoWidth) return;
          const w = 400, h = Math.round(video.videoHeight * w / video.videoWidth); cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(video, 0, 0, w, h);
          const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
          if (r && r.data) onText(r.data);
        }, 250);
      }).catch(() => onMsg('カメラが使えませんでした。「画像から読む」を使ってね'));
    },
    stop() { if (QR.timer) clearInterval(QR.timer); QR.timer = null; if (QR.cam) QR.cam.getTracks().forEach(t => t.stop()); QR.cam = null; },
    fromFile(file) {
      return new Promise((res, rej) => {
        const img = new Image(); img.onload = () => {
          const k = Math.min(1, 1200 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
          const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' }); URL.revokeObjectURL(img.src);
          r && r.data ? res(r.data) : rej(new Error('QRが見つかりませんでした'));
        }; img.onerror = () => rej(new Error('画像が読めませんでした')); img.src = URL.createObjectURL(file);
      });
    }
  };
  // 画像ファイルをえらぶ
  function pickImage() { return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => res(i.files[0] || null); i.click(); }); }

  // ---------- 音（ggwave） ----------
  const audio = { ctx: null, gg: null, inst: null, ready: null, level: 0, onText: null };
  function getCtx() { if (audio.ctx) return audio.ctx; const AC = window.AudioContext || window.webkitAudioContext; try { audio.ctx = new AC({ sampleRate: 48000 }); } catch (e) { audio.ctx = new AC(); } return audio.ctx; }
  function ensureAudio() {
    if (audio.ready) return audio.ready;
    audio.ready = new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { reject(new Error('マイクが使えない環境です（https で開いてね）')); return; }
      getCtx().resume();
      const ggP = ggwave_factory().then(gg => { audio.gg = gg; try { gg.disableLog(); } catch (e) {} const p = gg.getDefaultParameters(); p.sampleRateInp = audio.ctx.sampleRate; p.sampleRateOut = audio.ctx.sampleRate; audio.inst = gg.init(p); });
      const micP = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      Promise.all([ggP, micP]).then(([, stream]) => {
        const src = audio.ctx.createMediaStreamSource(stream), proc = audio.ctx.createScriptProcessor(1024, 1, 1), mute = audio.ctx.createGain(); mute.gain.value = 0;
        proc.onaudioprocess = (e) => {
          const d = e.inputBuffer.getChannelData(0); let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] * d[i]; audio.level = Math.sqrt(sum / (d.length / 4));
          const res = audio.gg.decode(audio.inst, new Int8Array(new Float32Array(d).buffer));
          if (res && res.length > 0) { const u = new Uint8Array(res.buffer, res.byteOffset, res.length); let s = ''; for (let k = 0; k < u.length; k++) s += String.fromCharCode(u[k]); onPacket(s); }
        };
        src.connect(proc); proc.connect(mute); mute.connect(audio.ctx.destination); audio.keep = [src, proc, mute, stream]; resolve();
      }).catch(e => { audio.ready = null; reject(e); });
    });
    return audio.ready;
  }
  function sendText(text) {
    if (window.__rcf) window.__rcf.sent.push(text);
    return ensureAudio().then(() => {
      const gg = audio.gg, w = gg.encode(audio.inst, text, gg.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST, 25);
      const f = new Float32Array(w.buffer.slice(w.byteOffset, w.byteOffset + w.byteLength));
      const buf = audio.ctx.createBuffer(1, f.length, audio.ctx.sampleRate); buf.getChannelData(0).set(f);
      const node = audio.ctx.createBufferSource(); node.buffer = buf; node.connect(audio.ctx.destination);
      return new Promise(r => { node.onended = r; node.start(); });
    });
  }

  // ---------- パケット（ビットで詰める） ----------
  const VER = 1;
  function bw() { const bits = []; return { put(v, n) { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); }, bytes() { while (bits.length % 8) bits.push(0); const out = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; out.push(b); } return out; } }; }
  function br(bytes) { let pos = 0; return { get(n) { let v = 0; for (let i = 0; i < n; i++) { const B = bytes[pos >> 3] || 0; v = (v << 1) | ((B >> (7 - (pos & 7))) & 1); pos++; } return v; } }; }
  // type 1：デッキ同期 / type 2：ターンの手
  function encPkt(p) {
    const w = bw(); w.put(VER, 4); w.put(p.type, 4); w.put(p.from, 16); w.put(p.to, 16); w.put(p.turn, 4); w.put(p.rcv ? 1 : 0, 1);
    if (p.type === 1) { w.put(p.deck, 5); w.put(p.seed, 16); }
    else { w.put(p.decl ? 1 : 0, 1); w.put(p.retreat ? 1 : 0, 1); w.put(p.plays.length, 3); p.plays.forEach(([i, li]) => { w.put(i, 3); w.put(li, 2); }); w.put(p.check, 8); }
    return b64.enc(w.bytes());
  }
  function decPkt(s) {
    try {
      const r = br(b64.dec(s)); const p = { ver: r.get(4), type: r.get(4), from: r.get(16), to: r.get(16), turn: r.get(4), rcv: !!r.get(1) };
      if (p.ver !== VER) return null;
      if (p.type === 1) { p.deck = r.get(5); p.seed = r.get(16); }
      else if (p.type === 2) { p.decl = !!r.get(1); p.retreat = !!r.get(1); const n = r.get(3); p.plays = []; for (let i = 0; i < n; i++) p.plays.push([r.get(3), r.get(2)]); p.check = r.get(8); }
      else return null;
      return p;
    } catch (e) { return null; }
  }

  // ---------- プロフィール ----------
  function myProfile() {
    const S = M.SV; S.fid = S.fid || ((Math.random() * 0xffffff) | 0).toString(16);
    return { n: S.name || 'なし', s: S.pvp || 0, w: S.pvpW || 0, g: S.pvpG || 0, id: S.fid, b: S.bg && M.isOwned(S.bg) ? S.bg : '' };
  }
  const profCode = (p) => 'RC1.' + b64.enc(utf8.enc(JSON.stringify(p)));
  function parseProf(t) { if (!t || !t.startsWith('RC1.')) return null; try { const p = JSON.parse(utf8.dec(b64.dec(t.slice(4)))); return p && p.id ? p : null; } catch (e) { return null; } }
  function profCard(p, cls, qr) {
    const r = M.rankInfo(p.s), rate = p.g ? Math.round(p.w / p.g * 100) + '%' : '－';
    const bg = p.b && DECKS[p.b] ? IMG(`img/menubg/${p.b}.webp`) : IMG(`img/ui/title_bg.webp`);
    return `<div class="pcard ${cls || ''}"><div class="pc-bg" style="background-image:url('${bg}')"></div><div class="pc-head">${cls === 'opp' ? 'あいて' : 'あなた'}のプロフィール</div>
      <div class="pc-main"><div class="pc-em" style="background-image:url('${r.img}')"></div><div class="pc-t"><b>${p.n}</b><span>対人ランク ${r.name}</span><span>勝率 ${rate}（${p.w}勝 / ${p.g}戦）</span></div></div>
      ${qr ? `<img class="pc-qr qr-zoom" src="${qr}" alt="QR"><div class="qr-tip">QRをタップで大きく</div>` : ''}</div>`;
  }

  // ---------- 状態 ----------
  let F = null; // { me, opp, fpMe, fpOpp, role, deck, ... }
  const inbox = {}; const sentLog = {};
  function onPacket(s) {
    const p = decPkt(s); if (!p || !F) return;
    if (p.from !== F.fpOpp) return; // ほかのペア・じぶんの音は無視
    if (p.to !== F.fpMe) { warn('あいてが読んだQRが、あなたの今のQRとちがいます。QRを読みなおしてね'); return; }
    const key = p.type + ':' + p.turn;
    const fresh = !inbox[key]; inbox[key] = p;
    flash();
    // あいてが前の手をもう一度送ってきた（じぶんは先に進んでいる）→ 前の返事を1回だけ返す
    if (!fresh && sentLog[key] && p.rcv === false && F.waitKey !== key) sendText(sentLog[key]);
    if (F.onRecv) F.onRecv(key, p);
  }
  function flash() { const el = $('#syncBar .sb-rx'); if (el) { el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); } }
  function warn(t) { const el = $('#syncBar .sb-warn'); if (el) el.textContent = t; }

  // ---------- 画面：プロフィールとQR ----------
  function open() {
    F = { me: myProfile(), opp: null };
    F.code = profCode(F.me); F.fpMe = hash16(F.code);
    U.show('friend'); renderProfile();
  }
  function renderProfile(msg) {
    const B = $('#frBody');
    B.innerHTML = `<div class="fr-cards">${profCard(F.me, 'me', QR.make(F.code, 6))}
        <div class="fr-opp">${F.opp ? profCard(F.opp, 'opp') : `<div class="fr-cam"><video id="frVideo" playsinline muted></video><div class="fr-cam-msg" id="frCamMsg">「カメラで読む」か「画像から読む」で、あいてのQRを読みこんでね</div></div>`}</div></div>
      <div class="fr-msg" id="frMsg">${msg || (F.opp ? 'おたがいにQRを読んだら「すすむ」を押してね' : 'あいてにも、あなたのQRを読んでもらってね')}</div>
      <div class="fr-btns"><button class="btn" id="frCam" data-ico="camera">カメラで読む</button><button class="btn" id="frImg" data-ico="image">画像から読む</button><button class="btn gold" id="frGo" data-ico="next" ${F.opp ? '' : 'disabled'}>すすむ</button></div>`;
    $('#frCam').onclick = () => { U.SE.play('tap'); if (F.opp) { F.opp = null; renderProfile(); } const v = $('#frVideo'); if (v) QR.startCamera(v, accept, (t) => { const m = $('#frCamMsg'); if (m) { m.textContent = t; m.style.display = t.includes('見せて') ? 'none' : 'flex'; } }); };
    $('#frImg').onclick = async () => { U.SE.play('tap'); const f = await pickImage(); if (!f) return; try { accept(await QR.fromFile(f)); } catch (e) { $('#frMsg').textContent = e.message; U.SE.play('ng'); } };
    $('#frGo').onclick = () => { U.SE.play('decide'); QR.stop(); pickDeck(); };
    U.fitAll($('#friend'));
  }
  function accept(text) {
    const p = parseProf(text);
    if (!p) { const m = $('#frMsg'); if (m) m.textContent = 'このゲームのプロフィールQRではありません'; return; }
    if (p.id === F.me.id) { const m = $('#frMsg'); if (m) m.textContent = 'じぶんのQRです。あいてのQRを読んでね'; return; }
    QR.stop(); F.opp = p; F.oppCode = text; F.fpOpp = hash16(text);
    F.role = F.fpMe < F.fpOpp || (F.fpMe === F.fpOpp && F.me.id < p.id) ? 'A' : 'B';
    U.SE.play('good'); renderProfile();
  }

  // ---------- デッキをえらんで同期 ----------
  function pickDeck() {
    M.openDeckFor('friend', '友達とバトル：デッキをえらぶ', (deck) => {
      F.deck = deck; F.seed = (Math.random() * 0x10000) | 0; F.round = (F.round || 0) + 1;
      ensureAudio().then(() => deckSync()).catch(e => { U.openConfirm('マイクが使えません', e.message + '<br>マイクを許可してから、もう一度ためしてね。', 'もどる', () => open(), 'gold'); });
    });
  }
  // 同期の流れ（A→B→A）。key の手を交換する
  function exchangeFlow(key, mkPacket, title, sub) {
    return new Promise(done => {
      const isA = F.role === 'A'; let sentOnce = false, cancelled = false;
      const bar = syncBar(title, sub);
      const st = () => {
        const got = !!inbox[key];
        bar.querySelector('.sb-st').innerHTML = `<span class="${sentOnce ? 'ok' : ''}">じぶん：${sentOnce ? '送信ずみ' : 'まだ'}</span><span class="${got ? 'ok' : ''}">あいて：${got ? '受信完了' : 'まだ'}</span>`;
        const sendB = bar.querySelector('#sbSend'), okB = bar.querySelector('#sbOk');
        sendB.disabled = !isA && !got; // B は A の音を受け取るまで送れない
        sendB.textContent = sentOnce ? 'もう一度送る' : '送信する';
        okB.disabled = !(got && sentOnce);
        bar.querySelector('.sb-big').classList.toggle('on', got);
        bar.querySelector('.sb-hint').textContent = !sentOnce ? (isA ? '「送るね！」と言って「送信する」を押そう' : (got ? '受信完了！ 次は「送信する」を押そう' : 'あいて（A）の音を待っています')) : (got ? 'あいての画面も「受信完了」になったら OK' : 'あいての返事を待っています');
      };
      F.waitKey = key;
      F.onRecv = (k) => { if (k === key) { U.SE.play('good'); st(); } };
      bar.querySelector('#sbSend').onclick = async () => {
        const txt = encPkt(Object.assign(mkPacket(), { rcv: !!inbox[key] })); sentLog[key] = txt;
        bar.querySelector('#sbSend').disabled = true; bar.querySelector('.sb-hint').textContent = '送信中…（音が鳴り終わるまで待ってね）';
        await sendText(txt).catch(() => {}); sentOnce = true; st();
      };
      bar.querySelector('#sbOk').onclick = () => { U.SE.play('decide'); F.onRecv = null; F.waitKey = null; bar.remove(); M.BGM.mute(false); done(inbox[key]); };
      bar.querySelector('#sbQuit').onclick = () => { U.openConfirm('通信をやめますか？', '試合は放棄され、メニューにもどります。', 'やめる', () => { cancelled = true; F.onRecv = null; bar.remove(); M.BGM.mute(false); window.RC_UI.clearResume(); U.setGame(null); M.toMenu(); done(null); }); };
      st();
    });
  }
  function syncBar(title, sub) {
    const old = $('#syncBar'); if (old) old.remove();
    M.BGM.mute(true); // 通信中はBGMを止める
    const el = document.createElement('div'); el.id = 'syncBar';
    el.innerHTML = `<div class="sb-box"><div class="sb-title">${title}</div><div class="sb-sub">${sub || ''}</div>
      <div class="sb-role">あなたは <b>${F.role}</b>（${F.role === 'A' ? '先に送る' : 'あとから送る'}）　あいて：${F.opp.n}</div>
      <div class="sb-big">受信完了</div><div class="sb-st"></div><div class="sb-hint"></div><div class="sb-warn"></div>
      <div class="sb-btns"><button class="btn red" id="sbQuit">やめる</button><button class="btn blue" id="sbSend">送信する</button><button class="btn gold" id="sbOk">OK</button></div>
      <div class="sb-meter"><i></i></div><div class="sb-rx"></div></div>`;
    $('#stage').appendChild(el);
    const meter = el.querySelector('.sb-meter i'); (function loop() { if (!el.isConnected) return; meter.style.width = Math.min(100, audio.level * 400) + '%'; requestAnimationFrame(loop); })();
    return el;
  }
  async function deckSync() {
    const key = '1:' + (F.round & 15);
    U.show('friend'); $('#frBody').innerHTML = `<div class="fr-wait">${profCard(F.me, 'me')}<div class="fr-vs">VS</div>${profCard(F.opp, 'opp')}</div>`;
    const p = await exchangeFlow(key, () => ({ type: 1, from: F.fpMe, to: F.fpOpp, turn: F.round & 15, deck: ORDER.indexOf(F.deck), seed: F.seed }), 'デッキと乱数の同期', 'おたがいのデッキと、場所・引く順番を決める数をそろえます');
    if (!p) return;
    const oppDeck = ORDER[p.deck], isA = F.role === 'A';
    const seed = (((isA ? F.seed : p.seed) << 16) | (isA ? p.seed : F.seed)) >>> 0 || 1;
    startGame(F.deck, oppDeck, seed);
  }
  function startGame(deck, oppDeck, seed) {
    const extra = { opp: F.opp, oppCode: F.oppCode, fpMe: F.fpMe, fpOpp: F.fpOpp, role: F.role, round: F.round, code: F.code };
    window.RC_UI.newGame(deck, { cpu: oppDeck, seed, me: F.role === 'A' ? 0 : 1, mode: 'friend', extra });
  }
  // 盤面のずれ確認の値
  function check(G) { let h = G.S.turn * 31; for (let li = 0; li < 3; li++) h += G.total(li, 0) * 3 + G.total(li, 1) * 7; h += G.S.players[0].hand.length * 11 + G.S.players[1].hand.length * 13 + G.S.players[0].deck.length * 5 + G.S.players[1].deck.length * 17; return h & 255; }

  const MODE = {
    noDecide: true,
    cpu(g) { if (F) F.turnCheck = check(g); }, // 相手の手は音で受け取る。ずれ確認の値はターン開始の盤面で作る
    async exchange(G, ME, rec, handStart) {
      const key = '2:' + G.S.turn;
      const plays = rec.p.map(([u, li]) => [handStart.indexOf(u), li]).filter(x => x[0] >= 0);
      const myCheck = F.turnCheck !== undefined ? F.turnCheck : check(G);
      const p = await exchangeFlow(key, () => ({ type: 2, from: F.fpMe, to: F.fpOpp, turn: G.S.turn, decl: rec.d0, retreat: rec.r0, plays, check: myCheck }), `ターン${G.S.turn}の手を交換`, '出したカードと置き場所を音で送ります');
      if (!p) return null;
      if (p.check !== myCheck) { window.__rcfWarn = (window.__rcfWarn || 0) + 1; } if (p.check !== myCheck) U.banner('同期ずれ？', '2台の盤面がちがうかもしれません。おかしいときは設定から「タイトル画面にもどる」', '', 2600);
      // あいての手札（ターン開始時）から、出したカードをさがす
      const oppHand = G.S.players[1 - ME].hand.slice();
      return { plays: p.plays.map(([i, li]) => [oppHand[i], li]).filter(x => x[0]), decl: p.decl, retreat: p.retreat };
    },
    onEnd(G, ME) {
      const S = M.SV, o = G.S.over, win = o.winner === ME, draw = o.winner < 0, retreated = o.retreat === ME;
      const myR = M.rankInfo(S.pvp || 0), opR = M.rankInfo(G.S.extra.opp.s || 0), decl = G.S.declaredBy >= 0;
      let d = draw ? 0 : win ? (decl ? 4 : 2) + (opR.r >= myR.r + 2 ? 1 : 0) : retreated ? 0 : decl ? -2 : -1;
      const before = S.pvp || 0; let floor = 0; for (let r = 0; r < myR.r; r++) floor += [4, 6, 8, 10, 12, 14, 16][r] * 3;
      S.pvp = Math.max(floor, before + d); d = S.pvp - before; S.pvpG = (S.pvpG || 0) + 1; if (win) S.pvpW = (S.pvpW || 0) + 1;
      const coins = draw ? 15 : win ? 30 : 10, cfrom = S.coins; S.coins += coins; M.saveNow();
      const aft = M.rankInfo(S.pvp);
      const X = { label: '対人ランク', delta: d, coins, cfrom, cto: S.coins, before: myR, after: aft, up: aft.lv > myR.lv, down: aft.lv < myR.lv, newDan: aft.r > myR.r };
      M.BGM.play(win ? 'win' : 'lose'); U.SE.play(win ? 'cheer' : draw ? 'tap' : 'shock');
      const title = draw ? '引き分け' : win ? '勝利！' : '敗北…';
      U.openModal(`<div class="res-head ${win ? 'win' : draw ? 'draw' : 'lose'}"><div class="mtitle">${title}</div></div>
        <div class="mbody fr-res2">${retreated ? '<div class="fr-note">撤退したので★は減りません</div>' : ''}<div class="fr-vsline">あいて：${G.S.extra.opp.n}（${opR.name}）</div>${M.resultHtml(X)}</div>
        <div class="mbtns"><button class="btn" id="frEnd" data-ico="home">やめる</button><button class="btn gold" id="frRe" data-ico="retry">デッキを変えて再戦</button></div>`, null, 'big');
      M.animateResult(X);
      F = F || {}; Object.assign(F, { opp: G.S.extra.opp, oppCode: G.S.extra.oppCode, fpMe: G.S.extra.fpMe, fpOpp: G.S.extra.fpOpp, role: G.S.extra.role, round: G.S.extra.round, code: G.S.extra.code, me: myProfile() });
      $('#frEnd').onclick = () => { U.SE.play('tap'); U.closeModal(); U.setGame(null); M.toMenu(); };
      $('#frRe').onclick = () => { U.SE.play('decide'); U.closeModal(); U.setGame(null); pickDeck(); };
    }
  };
  // ブラウザを閉じたあとの再開
  function resume(R) {
    const x = R.o.extra; F = { me: myProfile(), opp: x.opp, oppCode: x.oppCode, fpMe: x.fpMe, fpOpp: x.fpOpp, role: x.role, round: x.round, code: x.code };
    ensureAudio().catch(() => {}).then(() => window.RC_UI.resumeGame(R, '友達対戦のつづき', 'あいても同じターンから再開してね'));
  }

  // ---------- セーブの引き継ぎQR（デバッグモードから） ----------
  function saveCode() {
    const S = M.SV, mask = ORDER.reduce((m, id, i) => m | (S.owned.includes(id) ? 1 << i : 0), 0);
    const o = { n: S.name || '', o: mask, c: S.coins, r: S.cpu, p: S.pvp || 0, w: S.wins || 0, g: S.games || 0, pw: S.pvpW || 0, pg: S.pvpG || 0, t: S.tutorial ? 1 : 0, z: (S.puzzle && S.puzzle.done) || [], k: (S.camp && S.camp.done) || [], b: S.bg || '', q: S.beg || null, d: S.begDaily ? 1 : 0 };
    const body = b64.enc(utf8.enc(JSON.stringify(o)));
    return 'RCS1.' + body + '.' + hash16(body).toString(36);
  }
  function loadCode(t) {
    if (!t || !t.startsWith('RCS1.')) return null;
    const [, body, h] = t.split('.'); if (hash16(body).toString(36) !== h) return null;
    try { return JSON.parse(utf8.dec(b64.dec(body))); } catch (e) { return null; }
  }
  function openTransfer() {
    U.openModal(`<div class="mtitle">セーブの引き継ぎ</div>
      <div class="mbody tr-body"><img class="tr-qr qr-zoom" src="${QR.make(saveCode(), 5)}" alt="QR"><div class="tr-t">このQRを新しい端末で読むと、名前・デッキ・コイン・ランク・勝率・進み具合を引き継げます。<br>（新しい端末でもデバッグモードの「引き継ぎQRを読む」から）</div></div>
      <div class="mbtns"><button class="btn" id="trCam" data-ico="camera">カメラで読む</button><button class="btn" id="trImg" data-ico="image">画像から読む</button><button class="btn gold" data-act="closeModal">とじる</button></div>`, openTransfer, 'big');
    $('#trImg').onclick = async () => { const f = await pickImage(); if (!f) return; try { importSave(await QR.fromFile(f)); } catch (e) { U.openConfirm('読めませんでした', e.message, 'もどる', () => openTransfer(), 'gold'); } };
    $('#trCam').onclick = () => {
      U.openModal(`<div class="mtitle">引き継ぎQRを読む</div><div class="mbody"><div class="fr-cam"><video id="trVideo" playsinline muted></video><div class="fr-cam-msg" id="trMsg"></div></div></div>
        <div class="mbtns"><button class="btn" id="trStop">やめる</button></div>`);
      QR.startCamera($('#trVideo'), (t) => { QR.stop(); importSave(t); }, (m) => { const e = $('#trMsg'); if (e) { e.textContent = m; e.style.display = m.includes('見せて') ? 'none' : 'flex'; } });
      $('#trStop').onclick = () => { QR.stop(); openTransfer(); };
    };
  }
  function importSave(t) {
    const o = loadCode(t); if (!o) { U.SE.play('ng'); return U.openConfirm('読めませんでした', 'このゲームの引き継ぎQRではないか、こわれています。', 'もどる', () => openTransfer(), 'gold'); }
    const owned = ORDER.filter((id, i) => o.o & (1 << i));
    U.openConfirm('このデータで上書きしますか？', `名前：${o.n || '－'}　デッキ ${owned.length}個　コイン ${o.c}<br>今のデータは消えます。`, '上書きする', () => {
      const S = M.SV; Object.assign(S, { name: o.n, owned, coins: o.c, cpu: o.r, pvp: o.p, wins: o.w, games: o.g, pvpW: o.pw, pvpG: o.pg, tutorial: !!o.t, started: true, puzzle: { done: o.z }, camp: { done: o.k }, bg: o.b, beg: o.q || { got: [], bonus: false }, begDaily: !!o.d });
      M.saveNow(); U.SE.play('cheer'); M.toMenu();
    }, 'gold');
  }

  // QRを押すと画面いっぱいに大きく表示（とじるボタンでもどる）
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.qr-zoom'); if (!img) return;
    e.stopPropagation(); U.SE.play('tap');
    const ov = document.createElement('div'); ov.className = 'qr-big';
    ov.innerHTML = `<div class="qb-box"><img src="${img.src}" alt="QR"><button class="btn gold" data-ico="close">とじる</button></div>`;
    $('#stage').appendChild(ov);
    ov.querySelector('.btn').onclick = (ev) => { ev.stopPropagation(); U.SE.play('tap'); ov.remove(); };
  }, true);
  window.RC_MODES = window.RC_MODES || {};
  window.RC_MODES.friend = MODE;
  window.RC_FRIEND = { stopCam: () => QR.stop(), open, resume, openTransfer, _test: { accept, encPkt, decPkt, onPacket, get F() { return F; }, set F(v) { F = v; }, inbox, profCode, parseProf, hash16, saveCode, loadCode, startGame } };
})();
