# 配布用の1ファイルHTML（dist/rekishi-card.html）を作る
# 使い方：python3 tools/build.py
# 画像・効果音・フォント（使う文字だけに減らしたもの）をすべて中に入れる
import base64, os, re, subprocess, sys, time
# URL版（GitHub Pages）で古いJS・CSSがブラウザに残らないように、読みこむファイル名に版番号をつける
_ver = time.strftime('%Y%m%d%H%M')
_ix = open('index.html', encoding='utf-8').read()
_ix = re.sub(r'(src="(?:src|lib)/[^"?]+\.js)(\?v=[^"]*)?"', lambda m: m.group(1) + '?v=' + _ver + '"', _ix)
_ix = re.sub(r'(href="src/style\.css)(\?v=[^"]*)?"', lambda m: m.group(1) + '?v=' + _ver + '"', _ix)
open('index.html', 'w', encoding='utf-8').write(_ix)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

css = open('src/style.css', encoding='utf-8').read()
js = ''.join(';' + open(p, encoding='utf-8').read() + '\n;\n' for p in ['lib/se.js', 'src/data.js', 'src/engine.js', 'src/ui.js', 'src/meta.js', 'src/tutorial.js', 'src/lines.js', 'src/howto.js', 'src/camp.js', 'src/puzzles.js', 'src/puzzle.js', 'lib/ggwave.js', 'lib/jsQR.min.js', 'lib/qrcode.min.js', 'src/friend.js'])
html = open('index.html', encoding='utf-8').read()

# フォントを使う文字だけにしぼる
chars = set(html + css + js)
chars |= set('0123456789０１２３４５６７８９+-×★／・。、！？「」（）ー')
os.makedirs('/tmp/rc_font', exist_ok=True)
open('/tmp/rc_font/chars.txt', 'w', encoding='utf-8').write(''.join(sorted(c for c in chars if ord(c) >= 32)))
fonts = {}
for w, name in [('700', 'Bold'), ('900', 'Black')]:
    out = f'/tmp/rc_font/{name}.woff2'
    subprocess.run([sys.executable, '-m', 'fontTools.subset', f'fonts/ZenKakuGothicNew-{name}.ttf', '--text-file=/tmp/rc_font/chars.txt',
                    '--flavor=woff2', f'--output-file={out}', '--layout-features=*'], check=True)
    fonts[name] = b64(out)
css = css.replace("url('../fonts/ZenKakuGothicNew-Bold.ttf')", f"url(data:font/woff2;base64,{fonts['Bold']}) format('woff2')")
css = css.replace("url('../fonts/ZenKakuGothicNew-Black.ttf')", f"url(data:font/woff2;base64,{fonts['Black']}) format('woff2')")

# 画像：CSSの url('../img/...') と JSの `img/...` を置きかえる
imgs = {}
for d in ['card', 'face', 'loc', 'ui', 'rank', 'tut', 'vic', 'menubg', 'howto']:
    for f in os.listdir(f'img/{d}'):
        imgs[f'img/{d}/{f}'] = 'data:image/webp;base64,' + b64(f'img/{d}/{f}')
css = re.sub(r"url\('\.\./(img/[^']+)'\)", lambda m: f"url('{imgs[m.group(1)]}')", css)
img_js = 'window.RC_IMG=' + repr(imgs).replace("'", '"') + ';\n'
import json
bgm = {n[:-4]: 'data:audio/ogg;base64,' + b64('bgm/' + n) for n in sorted(os.listdir('bgm')) if n.endswith('.ogg')}
img_js += 'window.RC_BGMDATA=' + json.dumps(bgm) + ';\n'
js = img_js + js
# JSの中の画像パスは RC_IMG から引く
js = js.replace("const imgUrl = (d) => d.img.startsWith('face:') ? `img/face/${d.img.slice(5)}.webp` : `img/card/${d.img}.webp`;",
                "const imgUrl = (d) => RC_IMG[d.img.startsWith('face:') ? `img/face/${d.img.slice(5)}.webp` : `img/card/${d.img}.webp`];")
js = js.replace("url('img/face/${od.face}.webp')", "url('${RC_IMG[`img/face/${od.face}.webp`]}')")
js = js.replace("url('img/face/${d.face}.webp')", "url('${RC_IMG[`img/face/${d.face}.webp`]}')")
js = js.replace("url('img/vic/${ln.sp}.webp')", "url('${RC_IMG[`img/vic/${ln.sp}.webp`]}')")
js = js.replace("url('img/loc/${L.img}.webp')", "url('${RC_IMG[`img/loc/${L.img}.webp`]}')")
_bad = [js[max(0,i-80):i+40] for i in [m.start() for m in re.finditer("'img/", js.replace('"img/', '"IMG/'))]]
assert not _bad, '置きかえ忘れの画像パスがある: ' + repr(_bad[:3])

html = re.sub(r'<link rel="stylesheet" href="src/style\.css[^"]*">', lambda m: '<style>\n' + css + '\n</style>', html)
assert '<style>' in html, 'CSSが入っていない'
html = re.sub(r'<script src="[^"]+"></script>\n?', '', html)
html = html.replace('</body>', '<script>\n' + js.replace('</script>', '<\\/script>') + '\n</script>\n</body>')
os.makedirs('dist', exist_ok=True)
open('dist/rekishi-card.html', 'w', encoding='utf-8').write(html)
print('dist/rekishi-card.html', round(os.path.getsize('dist/rekishi-card.html') / 1024 / 1024, 2), 'MB')
