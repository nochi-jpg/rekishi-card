# docs/victory_lines.md から src/lines.js を作る
import re, json
NAME2ID = {'卑弥呼':'himiko','ワカタケル大王':'wakatakeru','聖徳太子':'taishi','中大兄皇子・中臣鎌足':'nakanooe','聖武天皇':'shomu','藤原道長':'michinaga','平清盛':'kiyomori','源頼朝':'yoritomo','北条時宗':'tokimune','足利義政':'yoshimasa','織田信長':'nobunaga','豊臣秀吉':'hideyoshi','徳川家光・家康':'iemitsu','杉田玄白':'genpaku','西郷隆盛・勝海舟':'saigo','福沢諭吉':'fukuzawa','伊藤博文':'ito','陸奥宗光':'mutsu','小村寿太郎':'komura'}
SP = {'中大兄':'nakanooe','鎌足':'kamatari','家光':'iemitsu','家康':'ieyasu','西郷':'saigo','勝':'katsu'}
DEF = {'himiko':'himiko','wakatakeru':'wakatakeru','taishi':'shotoku','nakanooe':'nakanooe','shomu':'shoumu','michinaga':'michinaga','kiyomori':'kiyomori','yoritomo':'yoritomo','tokimune':'tokimune','yoshimasa':'yoshimasa','nobunaga':'nobunaga','hideyoshi':'hideyoshi','iemitsu':'iemitsu','genpaku':'genpaku','saigo':'saigo','fukuzawa':'fukuzawa','ito':'ito','mutsu':'mutsu','komura':'komura'}
SPNAME = {'nakanooe':'中大兄皇子','kamatari':'中臣鎌足','iemitsu':'徳川家光','ieyasu':'徳川家康','saigo':'西郷隆盛','katsu':'勝海舟'}
KIND = {'ふつう':'normal','宣言で勝ち':'decl','史実コンボ':'combo','大差':'big','ぎりぎり':'close','古い相手':'old','新しい相手':'new','因縁':'rival'}
out = {}; cur = None
for ln in open('docs/victory_lines.md', encoding='utf-8'):
    m = re.match(r'## \d+\. (.+?)（', ln)
    if m: cur = NAME2ID[m.group(1)]; out[cur] = []; continue
    m = re.match(r'- (.+?)：(.+)$', ln.strip())
    if not (m and cur): continue
    head, text = m.group(1), m.group(2).strip()
    if text.startswith('（なし'): continue
    parens = re.findall(r'（(.+?)）', head); kind = KIND[re.sub(r'（.+?）', '', head)]
    e = {'k': kind, 't': text, 'sp': DEF[cur]}
    for p in parens:
        if p in NAME2ID: e['vs'] = NAME2ID[p]
        elif p in SP: e['sp'] = SP[p]
    out[cur].append(e)
spn = {k: v for k, v in SPNAME.items()}
open('src/lines.js', 'w', encoding='utf-8').write('// 勝利セリフ（tools/lines.py で docs/victory_lines.md から作る）\nwindow.RC_LINES = ' + json.dumps(out, ensure_ascii=False) + ';\nwindow.RC_SPNAME = ' + json.dumps(spn, ensure_ascii=False) + ';\n')
print(sum(len(v) for v in out.values()), {k: len(v) for k, v in out.items()})
