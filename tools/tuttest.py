# チュートリアルを最初から最後まで実際のクリックで通す（PCとスマホ）
import asyncio, sys
from playwright.async_api import async_playwright
URL = 'file:///home/claude/rekishi-card/' + (sys.argv[1] if len(sys.argv) > 1 else 'index.html')
SIZES = {'pc': (1366, 768), 'phone': (412, 915)}
async def run(br, name, vw, vh):
    ctx = await br.new_context(viewport={'width': vw, 'height': vh}, has_touch=(name == 'phone'))
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(500)
    await pg.click('#boot'); await pg.wait_for_timeout(300)
    for _ in range(6): await pg.mouse.click(vw/2, vh/2); await pg.wait_for_timeout(120)
    await pg.wait_for_timeout(900); await pg.mouse.click(vw/2, vh/2); await pg.wait_for_timeout(1400)
    await pg.click('#ftTut'); await pg.wait_for_timeout(300)
    await pg.evaluate('RC_UI.fast(true)')
    n = 0; blocked_ok = None
    for it in range(400):
        await pg.wait_for_timeout(250)
        if await pg.evaluate("document.querySelector('#starter.on, #title.on') !== null"): break
        st = await pg.evaluate("""() => { const t = document.querySelector('#tut.on'); if (!t) return null;
            const nx = t.querySelector('.tut-next'), h = t.querySelector('.tut-hint');
            return { next: !!nx, hint: h ? h.textContent : '', txt: t.querySelector('.tut-txt').textContent }; }""")
        if not st: continue
        n += 1
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'/tmp/tut/{name}_{n:02d}.png')
        if st['next']:
            try:
                await pg.click('.tut-next', timeout=2000); await pg.wait_for_timeout(80)
                if await pg.evaluate("!!document.querySelector('.tut-txt.typing')"): await pg.click('.tut-next', timeout=2000)
            except Exception as e: print('next fail', st['txt'][:30])
        elif 'ターン終了' in st['hint']:
            try: await pg.click('#ctrl .b-end', timeout=3000)
            except Exception as e: print('end fail', st['txt'][:30])
        else:
            # まず、ちがう場所をおしてもブロックされるか（1回だけ）
            if blocked_ok is None:
                before = await pg.evaluate("RC_UI.G.S.pending[0].length")
                await pg.click('#ctrl .b-end', force=True); await pg.wait_for_timeout(300)
                blocked_ok = (await pg.evaluate("RC_UI.busy")) is False and before == await pg.evaluate("RC_UI.G.S.pending[0].length")
            cid, li = await pg.evaluate("() => { const s = RC_TUTORIAL; return null }") or (None, None)
            # ねらいのカードと場所を照らされた位置からさがす
            tgt = await pg.evaluate("""() => { const hs = document.querySelectorAll('#hand [data-uid]'); for (const h of hs) { const id = h.dataset.uid.split('_').slice(2).join('_'); for (let li = 0; li < 3; li++) if (RC_TUTORIAL.allowPlay(id, li)) return [h.dataset.uid, li]; } return null; }""")
            if not tgt: print('no target', st); continue
            await pg.click(f'#hand [data-uid="{tgt[0]}"]'); await pg.wait_for_timeout(200)
            await pg.click(f'#board .loc[data-li="{tgt[1]}"] .tile'); await pg.wait_for_timeout(200)
    await pg.screenshot(path=f'/tmp/tut/{name}_zz.png')
    sv = await pg.evaluate("JSON.stringify(RC_META.save)")
    print(name, 'steps', n, 'blocked', blocked_ok, 'errors', errs, sv[:120])
    await ctx.close()
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for k, (w, h) in SIZES.items(): await run(br, k, w, h)
        await br.close()
asyncio.run(main())
