# 「あそびかた」用のスクショを撮って、番号の位置といっしょに src/howto.js に書き出す
# python3 tools/howtoshots.py   （ゲームの見た目を直したら撮り直す）
import asyncio, json, os, io
from PIL import Image
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'img', 'howto'); os.makedirs(OUT, exist_ok=True)
SAVE = {"v": 1, "name": "れきし", "owned": ["himiko", "taishi", "yoritomo", "nobunaga", "iemitsu", "michinaga"], "coins": 320, "cpu": 9, "pvp": 4, "started": True, "tutorial": True, "shop": {"day": "", "stock": []}, "seed": 7, "wins": 3, "games": 5}
FIX = "{locs:['inasaku','asuka','mori'],order:[['ishibocho','kome','takayuka','magatama','arasoi','kuni','gi','hori','himiko'],['gozoku','bukkyo','soga','imoko','kokusho','kenpo','horyuji','taishi','mononobe']]}"

# ページ：(キー, 画面を作るJS, [(番号, セレクタ)])
SHOTS = [
    ('screen', 'game', [(1, '#oppBar'), (2, '#board .loc[data-li="1"] .tile'), (3, '#board .loc[data-li="0"] .side.me'), (4, '#hand'), (5, '#ctrl .orb'), (6, '#ctrl .b-end'), (7, '#turnBox')]),
    ('win', 'game', [(1, '#board .loc[data-li="0"] .tot.m'), (2, '#board .loc[data-li="0"] .tot.o'), (3, '#board .loc[data-li="2"] .tile')]),
    ('play', 'select', [(1, '#hand .hc.sel'), (2, '#board .loc[data-li="2"] .tile'), (3, '#ctrl .orb'), (4, '#detail')]),
    ('loc', 'locdetail', [(1, '#board .loc[data-li="0"] .tile'), (2, '#detail .dt-text')]),
    ('kinds', 'game', [(1, '#hand .hc .kw'), (2, '#hand .hc .tags'), (3, '#board .loc[data-li="0"] .side.me .bc')]),
    ('combo', 'combo', [(1, '#zkGrid .zkhc.on'), (2, '#zkInfo')]),
    ('decl', 'game', [(1, '#ctrl .b-decl'), (2, '#ctrl .b-ret'), (3, '#turnBox')]),
    ('rank', 'menu', [(1, '.tt-menu .rk.cpu'), (2, '.tt-menu .rk.pvp'), (3, '.tt-menu .coin-box'), (4, '.tt-menu .daily-chip')]),
    ('shop', 'shop', [(1, '#shopGrid .sp-item'), (2, '#shopGrid .sp-item .si-price, #shopGrid .sp-item'), (3, '#shopHead .coin-box, #shopHead')]),
    ('modes', 'modes', [(1, '.mode[data-act="modeCpu"]'), (2, '.mode[data-act="modeCamp"]'), (3, '.mode[data-act="modePuzzle"]'), (4, '.mode[data-act="modeFriend"]')]),
]

async def setup(pg, state):
    await pg.evaluate("RC_UI.clearResume(); RC_UI.x.closeModal()")
    if state in ('game', 'select', 'locdetail'):
        await pg.evaluate(f"RC_UI.fast(true); RC_UI.newGame('himiko', {{cpu:'taishi', seed:7, fixed:{FIX}, mode:'cpu'}})")
        plays = {1: [('ishibocho', 0)], 2: [('takayuka', 0)]}
        for t in (1, 2):
            await pg.wait_for_function("RC_UI.G && !RC_UI.busy", timeout=20000)
            for cid, li in plays[t]:
                await pg.evaluate(f"(()=>{{const G=RC_UI.G;const u=G.S.players[0].hand.find(x=>G.S.cards[x].id==='{cid}');RC_UI.doPlay(u,{li});}})()")
            await pg.evaluate("void RC_UI.endTurn()")
        await pg.wait_for_function("RC_UI.G && !RC_UI.busy && RC_UI.G.S.turn===3", timeout=20000)
        await pg.evaluate("RC_UI.fast(false)"); await pg.wait_for_timeout(900)
        if state == 'select': await pg.click('#hand [data-uid$="_magatama"]'); await pg.wait_for_timeout(400)
        if state == 'locdetail': await pg.click('#board .loc[data-li="0"] .tile'); await pg.wait_for_timeout(400)
    elif state == 'combo':
        await pg.evaluate("RC_META.toMenu()"); await pg.wait_for_timeout(700); await pg.evaluate("RC_UI.x.closeModal(); RC_UI.x.openZukanDeck('himiko', 'zlist')"); await pg.wait_for_timeout(500)
        await pg.click('#zkGrid [data-i="9"]'); await pg.wait_for_timeout(400)
    elif state == 'menu':
        await pg.evaluate("RC_META.toMenu()"); await pg.wait_for_timeout(1500); await pg.evaluate("RC_UI.x.closeModal()"); await pg.wait_for_timeout(300)
    elif state == 'shop':
        await pg.evaluate("RC_META.openShop()"); await pg.wait_for_timeout(700)
    elif state == 'modes':
        await pg.evaluate("RC_META.toMenu()"); await pg.wait_for_timeout(1200); await pg.evaluate("RC_UI.x.closeModal(); RC_UI.action('toDeck')"); await pg.wait_for_timeout(500)

async def run(br, lay, w, h, data):
    pg = await br.new_page(viewport={'width': w, 'height': h})
    await pg.add_init_script("localStorage.setItem('rekishicard_save', %s); localStorage.setItem('rekishicard_resume', 'null')" % json.dumps(json.dumps(SAVE)))
    await pg.goto('file://' + ROOT + '/index.html'); await pg.wait_for_timeout(500)
    await pg.evaluate("RC_META.toMenu()"); await pg.wait_for_timeout(600)
    for key, state, marks in SHOTS:
        await setup(pg, state)
        sr = await pg.evaluate("(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        pts = []
        for n, sel in marks:
            r = await pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}", sel)
            if r: pts.append([n, round((r[0] - sr[0]) / sr[2] * 100, 1), round((r[1] - sr[1]) / sr[3] * 100, 1)])
            else: print('mark missing', lay, key, sel)
        png = await pg.screenshot(clip={'x': sr[0], 'y': sr[1], 'width': sr[2], 'height': sr[3]})
        im = Image.open(io.BytesIO(png)).convert('RGB'); size = (640, 360) if lay == 'land' else (240, 480)
        im.resize(size, Image.LANCZOS).save(os.path.join(OUT, f'{key}_{lay}.webp'), quality=72, method=6)
        data.setdefault(key, {})[lay] = pts
    await pg.close()

async def main():
    data = {}
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        await run(br, 'land', 1280, 720, data); await run(br, 'port', 480, 960, data)
        await br.close()
    open(os.path.join(ROOT, 'src', 'howto.js'), 'w', encoding='utf-8').write('// あそびかたの番号の位置（tools/howtoshots.py で自動生成）\nwindow.RC_HOWTO_MARKS = ' + json.dumps(data) + ';\n')
    print('ok', {k: {l: len(v) for l, v in d.items()} for k, d in data.items()})
asyncio.run(main())
