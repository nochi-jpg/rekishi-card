# ドラッグ・クリック・タッチ操作の確認
import asyncio, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + ROOT + '/index.html'
async def wait_ready(pg):
    for _ in range(80):
        if not await pg.evaluate("RC_UI.busy"): return
        await pg.wait_for_timeout(200)
async def center(pg, sel):
    b = await pg.locator(sel).first.bounding_box(); return b['x'] + b['width']/2, b['y'] + b['height']/2
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        # PC：マウスでドラッグ
        pg = await (await br.new_context(viewport={'width':1366,'height':768})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("RC_UI.newGame('taishi')"); await wait_ready(pg)
        cheap = await pg.evaluate("() => { const G=RC_UI.G; return G.S.players[0].hand.find(u => G.def(u).cost<=1) || null }")
        print('1コストの手札', cheap)
        if cheap:
            x,y = await center(pg, f'#hand [data-uid="{cheap}"]'); tx,ty = await center(pg, '#board .loc[data-li="0"] .side.me')
            await pg.mouse.move(x,y); await pg.mouse.down(); 
            for i in range(1,11): await pg.mouse.move(x+(tx-x)*i/10, y+(ty-y)*i/10); await pg.wait_for_timeout(16)
            await pg.screenshot(path='/tmp/shots/drag_mid.png')
            await pg.mouse.up(); await pg.wait_for_timeout(500)
            print('マウスドラッグで置けた', await pg.evaluate(f"RC_UI.G.S.pending[0].includes('{cheap}')"))
            # 手札へドラッグしてもどす
            x,y = await center(pg, f'#board [data-uid="{cheap}"]'); tx,ty = await center(pg, '#hand')
            await pg.mouse.move(x,y); await pg.mouse.down()
            for i in range(1,11): await pg.mouse.move(x+(tx-x)*i/10, y+(ty-y)*i/10); await pg.wait_for_timeout(16)
            await pg.mouse.up(); await pg.wait_for_timeout(500)
            print('ドラッグで手札にもどせた', await pg.evaluate(f"RC_UI.G.S.players[0].hand.includes('{cheap}')"))
            # クリック→場所クリック
            await pg.click(f'#hand [data-uid="{cheap}"]'); await pg.wait_for_timeout(200)
            await pg.click('#board .loc[data-li="0"] .tile'); await pg.wait_for_timeout(500)
            print('クリックで置けた', await pg.evaluate(f"RC_UI.G.S.pending[0].includes('{cheap}')"))
            await pg.click(f'#board [data-uid="{cheap}"]'); await pg.wait_for_timeout(200)
            await pg.click('[data-act="unplay"]'); await pg.wait_for_timeout(400)
            print('ボタンで手札にもどせた', await pg.evaluate(f"RC_UI.G.S.players[0].hand.includes('{cheap}')"))
        print('errors', errs)
        # スマホ：タップ
        ctx = await br.new_context(viewport={'width':412,'height':915}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("RC_UI.newGame('himiko')"); await wait_ready(pg)
        cheap = await pg.evaluate("() => { const G=RC_UI.G; return G.S.players[0].hand.find(u => G.def(u).cost<=1) || null }")
        if cheap:
            x,y = await center(pg, f'#hand [data-uid="{cheap}"]'); await pg.touchscreen.tap(x,y); await pg.wait_for_timeout(250)
            x,y = await center(pg, '#board .loc[data-li="0"] .tile'); await pg.touchscreen.tap(x,y); await pg.wait_for_timeout(500)
            print('タップで置けた', await pg.evaluate(f"RC_UI.G.S.pending[0].includes('{cheap}')"))
            # タッチでドラッグ（CDPでタッチイベントを送る）
            await pg.evaluate(f"RC_UI.G.unplay(0,'{cheap}')"); await pg.evaluate("RC_UI.action('noop')")
            await pg.evaluate("() => { const u = RC_UI; }")
        await pg.screenshot(path='/tmp/shots/phone_tap.png')
        print('errors', errs)
        await br.close()
asyncio.run(main())
