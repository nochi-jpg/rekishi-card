# カードリスト（dist/cardlist.html）を作る：python3 tools/cardlist.py
import json, subprocess, base64, io, os, re, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
data = json.loads(subprocess.run(['node', '-e', "global.window={};require('./src/data.js');console.log(JSON.stringify(window.RC_DATA))"], capture_output=True, text=True).stdout)
C, D = data['CARDS'], data['DECKS']
win = {}
if os.path.exists('/tmp/winrates.txt'):
    for line in open('/tmp/winrates.txt', encoding='utf-8'):
        m = re.match(r'\s*(\S+?)　*\s+([\d.]+)%', line)
        if m: win[m.group(1)] = m.group(2)
def img64(path, w):
    im = Image.open(path).convert('RGB'); im.thumbnail((w, w)); b = io.BytesIO(); im.save(b, 'WEBP', quality=72); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
cache = {}
def imgof(c):
    k = c['img']
    if k not in cache: cache[k] = img64(f"img/face/{k[5:]}.webp" if k.startswith('face:') else f"img/card/{k}.webp", 220)
    return cache[k]
KW = {'reveal': '公開時', 'ongoing': '永続', 'prophecy': '予言', 'combo': '史実コンボ', 'none': '効果なし'}
count = {}
for d in D.values():
    for cid in d['cards']: count[cid] = count.get(cid, 0) + 1
decks = []
for d in D.values():
    cards = []
    for cid in d['cards']:
        c = C[cid]
        cards.append({'n': c['name'], 'c': c['cost'], 'p': c['power'], 't': '・'.join(c['tags']), 'k': c['kind'], 'kw': KW[c['kind']], 'x': '' if c['kind'] == 'none' else c['text'],
                      'm': c['memo'], 'i': imgof(c), 'face': c['img'].startswith('face:'), 'share': count[cid] > 1})
    decks.append({'name': d['name'], 'era': d['era'], 'theme': d['theme'], 'desc': d['desc'], 'color': d['color'], 'face': img64(f"img/face/{d['face']}.webp", 120), 'win': win.get(d['name'], ''), 'cards': cards})
page = open('tools/cardlist_template.html', encoding='utf-8').read().replace('/*DATA*/', 'const DECKS=' + json.dumps(decks, ensure_ascii=False) + ';')
os.makedirs('dist', exist_ok=True); open('dist/cardlist.html', 'w', encoding='utf-8').write(page)
print('dist/cardlist.html', round(os.path.getsize('dist/cardlist.html') / 1024 / 1024, 2), 'MB', sum(len(d['cards']) for d in decks), '枚')
