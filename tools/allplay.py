# 全19デッキを画面つきで早送り対戦させ、エラーが出ないか確かめる：python3 tools/allplay.py
import asyncio, os, json
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + ROOT + '/' + os.environ.get('RC_PAGE', 'index.html')
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await (await br.new_context(viewport={'width': 1366, 'height': 768})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("RC_UI.fast(true)")
        decks = await pg.evaluate("Object.keys(RC_DATA.DECKS)")
        stats = {}
        for rnd in range(2):
            for d in decks:
                await pg.evaluate(f"RC_UI.newGame('{d}')")
                for t in range(7):
                    for _ in range(400):
                        if not await pg.evaluate("RC_UI.busy") or await pg.evaluate("!!RC_UI.G.S.over"): break
                        await pg.wait_for_timeout(30)
                    if await pg.evaluate("!!RC_UI.G.S.over"): break
                    # CPUと同じ考え方でこちらも置く
                    await pg.evaluate("() => { RC_ENGINE.cpuPlan(RC_UI.G, 0); }")
                    await pg.evaluate("RC_UI.endTurn()"); await pg.wait_for_timeout(40)
                for _ in range(400):
                    if await pg.evaluate("document.querySelector('#modal').classList.contains('on')"): break
                    await pg.wait_for_timeout(30)
                r = await pg.evaluate("JSON.stringify([RC_UI.G.S.over && RC_UI.G.S.over.winner, RC_UI.G.S.players[1].deckId])")
                stats.setdefault(d, []).append(r)
                await pg.evaluate("RC_UI.action('closeModal')")
        print('errors', len(errs), errs[:5])
        print(json.dumps(stats, ensure_ascii=False)[:1500])
        await br.close()
asyncio.run(main())
