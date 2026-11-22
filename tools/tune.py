# data.js のカードの数値を書きかえる： tune.py id cost power [効果の数値 key=val ...]
import re, sys
p = 'src/data.js'; s = open(p, encoding='utf-8').read()
def setcard(cid, cost=None, power=None, **fx):
    global s
    m = re.search(r"card\('" + re.escape(cid) + r"', '([^']*)', (\d+), (\d+), ", s)
    assert m, cid
    a = m.group(0)
    b = f"card('{cid}', '{m.group(1)}', {cost if cost is not None else m.group(2)}, {power if power is not None else m.group(3)}, "
    s = s.replace(a, b, 1)
    if fx:
        line_start = s.index(b); line_end = s.index('\n', line_start); line = s[line_start:line_end]
        for k, v in fx.items():
            line2 = re.sub(r"(\b" + k + r": )([^,}]+)", lambda mm: mm.group(1) + (repr(v) if isinstance(v, str) else str(v)), line, count=1)
            assert line2 != line or (k + ': ' + str(v)) in line, (cid, k)
            line = line2
        s = s[:line_start] + line + s[line_end:]
def text(cid, old, new):
    global s
    i = s.index(f"card('{cid}'"); j = s.index('\n', i); line = s[i:j]; assert old in line, (cid, old); s = s[:i] + line.replace(old, new) + s[j:]
exec(open(sys.argv[1], encoding='utf-8').read())
open(p, 'w', encoding='utf-8').write(s)
print('ok')
