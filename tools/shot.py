# 画面サイズごとにスクリーンショットを撮り、はみ出し・かぶりを自動チェックする
# python3 tools/shot.py
import asyncio, json, sys, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + ROOT + '/' + os.environ.get('RC_PAGE', 'index.html')
OUT = '/tmp/shots'; os.makedirs(OUT, exist_ok=True)
SIZES = [('pc', 1366, 768, False), ('phone', 412, 915, True), ('cover', 393, 873, True), ('fold', 884, 1032, True), ('wide', 1920, 1080, False)]
CHECK = r'''() => {
  const st = document.getElementById('stage'); const sr = st.getBoundingClientRect();
  const bad = [];
  const vis = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null; };
  // 文字のはみ出し
  document.querySelectorAll('.screen.on *, #modal.on *').forEach(el => {
    if (!vis(el) || !el.childNodes.length) return;
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) return;
    const cs = getComputedStyle(el);
    // 文字そのものの大きさで判定（ボタンの光の演出などは無視）
    const rg = document.createRange(); rg.selectNodeContents(el); const tr = rg.getBoundingClientRect(), er = el.getBoundingClientRect();
    const over = el.classList.contains('btn') ? (tr.width > er.width + 1 || tr.height > er.height + 2) : (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && over)
      bad.push('はみ出し: ' + el.className + ' 「' + el.textContent.trim().slice(0, 20) + '」 ' + el.scrollWidth + '/' + el.clientWidth + ' ' + el.scrollHeight + '/' + el.clientHeight);
  });
  // 枠に入りきらず見切れている文字・ボタン（overflow:hidden の箱の中）
  document.querySelectorAll('#modal.on .box *, .screen.on .hud *, .screen.on .rk, .screen.on .rk *').forEach(el => {
    if (!vis(el)) return; const cs = getComputedStyle(el); if (cs.overflow !== 'hidden' && cs.overflowY !== 'hidden') return;
    const r = el.getBoundingClientRect();
    el.querySelectorAll('.btn, span, b, div').forEach(c => { if (!vis(c) || !c.textContent.trim()) return; const q = c.getBoundingClientRect(); if (q.height && (q.bottom > r.bottom + 2 || q.top < r.top - 2)) bad.push('見切れ: ' + (el.className || el.tagName) + ' 「' + c.textContent.trim().slice(0, 14) + '」'); });
  });
  // ボタンの中の文字が折り返していないか
  document.querySelectorAll('.screen.on .btn span, #modal.on .btn').forEach(el => {
    if (!vis(el)) return; const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
    if (el.tagName === 'SPAN' && el.getBoundingClientRect().height > lh * 1.6) bad.push('折り返し: ' + el.textContent);
    { const rg = document.createRange(); rg.selectNodeContents(el); if (rg.getBoundingClientRect().width > el.getBoundingClientRect().width + 1) bad.push('ボタンからはみ出し: ' + el.textContent.trim()); }
    if (el.tagName !== 'SPAN' && !el.querySelector('span,small,b,i,div,img')) { const tn = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()); if (tn.length) { const r = document.createRange(); r.setStartBefore(tn[0]); r.setEndAfter(tn[tn.length - 1]); if (r.getClientRects().length > 1 && r.getBoundingClientRect().height > lh * 1.6) bad.push('折り返し: ' + el.textContent.trim()); } }
  });
  // ボタン・カードが画面外に出ていないか
  document.querySelectorAll('.screen.on .btn, .screen.on button, .screen.on .card, #modal.on .btn, .screen.on .tile, .screen.on .panel, #turnBox *, #oppBar *').forEach(el => {
    if (!vis(el)) return; const r = el.getBoundingClientRect(); const tol = el.classList.contains('card') ? 8 : 1;
    if (r.left < sr.left - tol || r.top < sr.top - tol || r.right > sr.right + tol || r.bottom > sr.bottom + tol) bad.push('画面外: ' + el.className + ' ' + (el.textContent||'').trim().slice(0,10));
  });
  // 上の枠からはみ出した中身
  ['#turnBox', '#oppBar'].forEach(q => { const p = document.querySelector(q); if (!p || !vis(p)) return; const pr = p.getBoundingClientRect();
    p.querySelectorAll('*').forEach(c => { if (!vis(c)) return; const r = c.getBoundingClientRect(); if (r.right > pr.right + 1 || r.left < pr.left - 1) bad.push('枠からはみ出し: ' + q + ' ' + (c.className || c.tagName)); }); });
  // 手札・盤面カードのかぶり
  const cs = Array.from(document.querySelectorAll('#hand .card'));
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const a = cs[i].getBoundingClientRect(), b = cs[j].getBoundingClientRect();
    if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) bad.push('かぶり: 手札');
  }
  // 大きな枠どうしのかぶり
  const P = ['#oppBar', '#turnBox', '#board', '#detail', '#ctrl', '#hand'].map(s => document.querySelector(s)).filter(e => e && vis(e));
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i].getBoundingClientRect(), b = P[j].getBoundingClientRect();
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('かぶり: ' + P[i].id + ' と ' + P[j].id);
  }
  return bad;
}'''
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
        allbad = {}
        for name, w, h, touch in SIZES:
            ctx = await br.new_context(viewport={'width': w, 'height': h}, has_touch=touch, device_scale_factor=1)
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await ctx.add_init_script("""try { if (!localStorage.getItem('rekishicard_save')) localStorage.setItem('rekishicard_save', JSON.stringify({v:1, owned:['himiko','taishi','yoritomo','nobunaga','iemitsu','shomu','michinaga','saigo'], coins:430, cpu:13, pvp:3, started:true, tutorial:true, shop:{day:'',stock:[]}, seed:7, wins:0, games:0})); } catch(e){}""")
            await pg.goto(URL); await pg.wait_for_timeout(500)
            await pg.click('#boot'); await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f'{OUT}/{name}_0seq.png')
            await pg.click('#title'); await pg.wait_for_timeout(1400)
            await pg.screenshot(path=f'{OUT}/{name}_0press.png'); allbad[name+'_press'] = await pg.evaluate(CHECK)
            await pg.click('#title'); await pg.wait_for_timeout(1000)
            await pg.screenshot(path=f'{OUT}/{name}_1title.png'); allbad[name+'_title'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('settings')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_1settings.png'); allbad[name+'_settings'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('closeModal')")
            await pg.evaluate("RC_UI.action('howto')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_1howto0.png'); allbad[name+'_howto0'] = await pg.evaluate(CHECK)
            for hi in range(1, 11):
                await pg.click('#hNext'); await pg.wait_for_timeout(250)
                await pg.screenshot(path=f'{OUT}/{name}_1howto{hi:02d}.png'); allbad[name+f'_howto{hi}'] = await pg.evaluate(CHECK)
            # 新しい画面
            for nm, js in [('daily', "RC_UI.x.closeModal(); RC_UI.action('daily')"), ('modes', "RC_UI.x.closeModal(); RC_UI.action('toDeck')"), ('settings', "RC_UI.x.closeModal(); RC_UI.action('settings')"),
                           ('name', "RC_UI.x.closeModal(); RC_META.openNameInput(()=>{})"), ('bgpick', "RC_UI.x.closeModal(); RC_META.openBgPicker()"), ('debug', "RC_UI.x.closeModal(); RC_META.openDebug()"),
                           ('transfer', "RC_UI.x.closeModal(); RC_FRIEND.openTransfer()"), ('puzzle', "RC_UI.x.closeModal(); RC_PUZZLE.open()"), ('camp', "RC_UI.x.closeModal(); RC_CAMP.open()"),
                           ('campch', "RC_CAMP.openChapter(0)"), ('friend', "RC_UI.x.closeModal(); RC_FRIEND.open()"), ('deck', "RC_UI.x.closeModal(); RC_UI.action('modeCpu')")]:
                await pg.evaluate(js); await pg.wait_for_timeout(450)
                await pg.screenshot(path=f'{OUT}/{name}_7{nm}.png'); allbad[name+'_'+nm] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.x.closeModal(); RC_META.toMenu()"); await pg.wait_for_timeout(300); await pg.evaluate("RC_UI.x.closeModal()")
            await pg.evaluate("RC_UI.action('closeModal')")
            await pg.evaluate("RC_UI.action('shop')"); await pg.wait_for_timeout(900)
            await pg.screenshot(path=f'{OUT}/{name}_1shop.png'); allbad[name+'_shop'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('toDeck')"); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'{OUT}/{name}_2deck.png'); allbad[name+'_deck'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('zukan')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_2zlist.png'); allbad[name+'_zlist'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('zkOpen', document.querySelector('[data-act=zkOpen]'))"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_2zukan.png'); allbad[name+'_zukan'] = await pg.evaluate(CHECK)
            for k in range(19):
                await pg.evaluate("RC_UI.action('zkNext')"); await pg.wait_for_timeout(60)
                for ci in (0, 11):
                    await pg.evaluate(f"(() => {{ const el = document.querySelector('#zkGrid [data-i=\"{ci}\"]'); RC_UI.action('zkCard', el); }})()"); await pg.wait_for_timeout(40)
                    b = await pg.evaluate(CHECK)
                    if b: allbad[f'{name}_zukan{k}_{ci}'] = b
            await pg.screenshot(path=f'{OUT}/{name}_2zukan2.png')
            await pg.evaluate("RC_UI.action('zkBack')")
            await pg.evaluate("RC_UI.fast(true)")
            await pg.evaluate("RC_UI.newGame(['michinaga','shomu','iemitsu','saigo'][%d %% 4])" % len(allbad))
            # ゲームを自動で最後まで進める（毎ターン、置けるカードを置く）
            for t in range(1, 7):
                for _ in range(80):
                    if not await pg.evaluate("RC_UI.busy") or await pg.evaluate("!!(RC_UI.G && RC_UI.G.S.over)"): break
                    await pg.wait_for_timeout(250)
                if await pg.evaluate("!!RC_UI.G.S.over"): break
                await pg.evaluate("""() => { const G = RC_UI.G; for (const u of G.S.players[0].hand.slice()) { for (const li of [2,1,0]) { if (G.canPlay(0,u,li)) { RC_UI.doPlay(u, li); break; } } } }""")
                await pg.wait_for_timeout(700)
                if t == 3:
                    # 手札のカードを選んだ状態も撮る
                    await pg.evaluate("() => { const h = document.querySelector('#hand .hc'); if (h) { h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:1,clientY:1})); h.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,clientX:1,clientY:1})); } }")
                    await pg.wait_for_timeout(400)
                    await pg.screenshot(path=f'{OUT}/{name}_3game_t{t}.png'); allbad[name+f'_game{t}'] = await pg.evaluate(CHECK)
                if t == 5:
                    await pg.screenshot(path=f'{OUT}/{name}_3game_t{t}.png'); allbad[name+f'_game{t}'] = await pg.evaluate(CHECK)
                await pg.evaluate("void RC_UI.endTurn()")
                await pg.wait_for_timeout(100)
                if t == 4:
                    await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{OUT}/{name}_4resolve.png')
            for _ in range(120):
                if await pg.evaluate("document.querySelector('#modal').classList.contains('on')"): break
                if await pg.evaluate("!!document.querySelector('.vscene')"):
                    await pg.wait_for_timeout(1200); await pg.screenshot(path=f'{OUT}/{name}_5victory.png'); allbad[name+'_victory'] = await pg.evaluate(CHECK)
                    await pg.click('.vscene'); await pg.wait_for_timeout(200)
                    if await pg.evaluate("!!document.querySelector('.vscene')"): await pg.click('.vscene')
                await pg.wait_for_timeout(250)
            await pg.wait_for_timeout(900)
            await pg.screenshot(path=f'{OUT}/{name}_5result.png'); allbad[name+'_result'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('howto')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_6howto.png'); allbad[name+'_howto'] = await pg.evaluate(CHECK)
            allbad[name+'_errors'] = errs
            await ctx.close()
        await br.close()
        for k, v in allbad.items():
            if v: print(k, json.dumps(v, ensure_ascii=False)[:1500])
        print('done')
asyncio.run(main())
