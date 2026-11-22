# 画面サイズごとにスクリーンショットを撮り、はみ出し・かぶりを自動チェックする
# python3 tools/shot.py
import asyncio, json, sys, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + ROOT + '/' + os.environ.get('RC_PAGE', 'index.html')
OUT = '/tmp/shots'; os.makedirs(OUT, exist_ok=True)
SIZES = [('pc', 1366, 768, False), ('phone', 412, 915, True), ('fold', 884, 1032, True), ('wide', 1920, 1080, False)]
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
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2))
      bad.push('はみ出し: ' + el.className + ' 「' + el.textContent.trim().slice(0, 20) + '」 ' + el.scrollWidth + '/' + el.clientWidth + ' ' + el.scrollHeight + '/' + el.clientHeight);
  });
  // ボタンの中の文字が折り返していないか
  document.querySelectorAll('.screen.on .btn span, #modal.on .btn').forEach(el => {
    if (!vis(el)) return; const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
    if (el.tagName === 'SPAN' && el.getBoundingClientRect().height > lh * 1.6) bad.push('折り返し: ' + el.textContent);
    if (el.scrollWidth > el.clientWidth + 1) bad.push('ボタンからはみ出し: ' + el.textContent.trim());
  });
  // ボタン・カードが画面外に出ていないか
  document.querySelectorAll('.screen.on .btn, .screen.on .card, #modal.on .btn, .screen.on .tile, .screen.on .panel').forEach(el => {
    if (!vis(el)) return; const r = el.getBoundingClientRect();
    if (r.left < sr.left - 8 || r.top < sr.top - 8 || r.right > sr.right + 8 || r.bottom > sr.bottom + 8) bad.push('画面外: ' + el.className + ' ' + (el.textContent||'').trim().slice(0,10));
  });
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
            await pg.goto(URL); await pg.wait_for_timeout(900)
            await pg.screenshot(path=f'{OUT}/{name}_1title.png'); allbad[name+'_title'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('settings')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_1settings.png'); allbad[name+'_settings'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('closeModal')")
            await pg.evaluate("RC_UI.action('howto')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/{name}_1howto0.png'); allbad[name+'_howto0'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('closeModal')")
            await pg.evaluate("RC_UI.action('toDeck')"); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'{OUT}/{name}_2deck.png'); allbad[name+'_deck'] = await pg.evaluate(CHECK)
            await pg.evaluate("RC_UI.action('zukan')"); await pg.wait_for_timeout(500)
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
                await pg.evaluate("RC_UI.endTurn()")
                await pg.wait_for_timeout(100)
                if t == 4:
                    await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{OUT}/{name}_4resolve.png')
            for _ in range(120):
                if await pg.evaluate("document.querySelector('#modal').classList.contains('on')"): break
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
