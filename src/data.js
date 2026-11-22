// 歴史カードバトル：カード・場所・デッキのデータ（全19デッキ）
// kind（効果の種類）：none / reveal（公開時）/ ongoing（永続）/ prophecy（予言）/ combo（史実コンボ）
// fx（効果のしくみ）と数値は engine.js で処理する。同じ名前のカードはどのデッキでも同じ。
(function () {
  const C = {};
  // id, 名前, コスト, パワー, タグ, 種類, 効果の数値, 効果文, 歴史メモ, 画像（省略時は id。face:xxx は顔の絵）
  function card(id, name, cost, power, tags, kind, fx, text, memo, img) {
    C[id] = Object.assign({ id, name, cost, power, tags: tags.split('・'), kind, text, memo, img: img || id }, fx || {});
  }
  const N = null;

  // ===== 卑弥呼（弥生）=====
  card('ishibocho', '石包丁', 1, 2, '文化', 'none', N, '効果なし', '稲の穂をかりとる石の道具。米づくりとともに広まった。');
  card('kome', '米づくり', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 1 }, '手札のカード1枚（ランダム）のパワー+1', '大陸から米づくりが伝わり、人々はムラをつくってくらすようになった。');
  card('magatama', '卑弥呼の勾玉', 1, 1, '宗教', 'prophecy', { fx: 'prophecySelf', amount: 3 }, 'このターン、相手もこの場所にカードを出していたら、このカードのパワー+3', '勾玉は、祭りやまじないに使われた玉。');
  card('takayuka', '高床倉庫', 2, 2, '文化', 'ongoing', { fx: 'ongoingTagHere', tag: '文化', amount: 1 }, 'この場所の自分のほかの文化カード+1', 'ネズミや湿気から米を守るため、床を高くした倉庫。');
  card('arasoi', 'むらどうしの争い', 2, 3, '戦い', 'reveal', { fx: 'debuffRandom', amount: 2 }, 'この場所の相手のカード1枚（ランダム）のパワー-2', '米や土地、水をめぐって、ムラどうしの争いが起こった。');
  card('hori', 'ほりとさく', 2, 3, '戦い', 'prophecy', { fx: 'prophecyEnemy', amount: 2 }, 'このターン、相手もこの場所にカードを出していたら、そのカード全部-2', 'ムラのまわりをほりとさくで囲み、敵から守った（吉野ヶ里遺跡など）。');
  card('kuni', 'くに', 3, 3, '政治', 'reveal', { fx: 'ifSpread', amount: 3 }, 'ほかの2つの場所の両方に自分のカードがあれば、パワー+3', '争いの中で強いムラがまわりのムラを従え、小さなくにができた。');
  card('seidoki', '青銅器・鉄器', 3, 2, '宗教・戦い', 'reveal', { fx: 'destroyWeakest' }, 'この場所の相手のいちばん弱いカードを退場させる', '青銅器（銅たくなど）は祭りに、鉄器は道具や武器に使われた。鉄の武器で争いがはげしくなった。');
  card('rekishisho', '中国の歴史書', 4, 5, '外交', 'reveal', { fx: 'fetch', target: 'himiko' }, '山札に卑弥呼がいれば、手札に加える', '中国の歴史書に、邪馬台国と卑弥呼のことが書かれている。');
  card('gi', '魏への使い', 4, 4, '外交', 'combo', { partner: 'himiko', amount: 4 }, '同じ場所に卑弥呼がいればパワー+4', '卑弥呼は中国の魏に使いを送り、王の称号と銅鏡などを授かった。', 'rekishisho');
  card('yamatai', '邪馬台国', 5, 5, '政治', 'combo', { partner: 'himiko', amount: 5 }, '同じ場所に卑弥呼がいればパワー+5', '卑弥呼は邪馬台国の女王として、30ほどのくにを従えた。');
  card('himiko', '卑弥呼', 6, 7, '宗教・政治', 'reveal', { fx: 'perHits', amount: 2 }, 'この試合で当たった予言1回につき、パワー+2', 'うらないやまじないで人々を導いた、邪馬台国の女王。', 'face:himiko');

  // ===== 聖徳太子（飛鳥）=====
  card('gozoku', '豪族', 1, 2, '政治', 'reveal', { fx: 'debuffRandom', amount: 1 }, 'この場所の相手のカード1枚（ランダム）のパワー-1', '各地で土地と人々を支配していた、力のある一族。豪族どうしで勢力を争った。');
  card('bukkyo', '仏教', 1, 1, '宗教', 'ongoing', { fx: 'ongoingTagHere', tag: '宗教', amount: 1, self: true }, 'この場所の自分の宗教カード+1（自分もふくむ）', '大陸から伝わった教え。聖徳太子は深く信仰し、広めようとした。');
  card('mononobe', '物部氏との争い', 2, 2, '戦い', 'reveal', { fx: 'debuffMax', amount: 3 }, 'この場所の相手のいちばん強いカードのパワー-3', '仏教を取り入れるかをめぐり、蘇我氏と物部氏が争った。蘇我氏が勝ち、仏教が広まった。');
  card('soga', '蘇我氏', 2, 4, '政治', 'combo', { partner: 'taishi', amount: 2 }, '同じ場所に聖徳太子がいればパワー+2', '力のある豪族。聖徳太子は蘇我馬子と協力して政治を進めた。');
  card('imoko', '小野妹子', 2, 2, '外交', 'reveal', { fx: 'fetch', target: 'kenzuishi' }, '山札に遣隋使がいれば、手札に加える', '遣隋使として、隋に送られた人物。');
  card('ryugaku', '留学生', 2, 2, '外交', 'combo', { partner: 'kenzuishi', amount: 2 }, '同じ場所に遣隋使がいればパワー+2', '遣隋使とともに隋へわたり、進んだ政治や文化を学んだ。');
  card('kenzuishi', '遣隋使', 3, 3, '外交', 'combo', { partner: 'imoko', amount: 3 }, '同じ場所に小野妹子がいればパワー+3', '隋の進んだ政治や文化を学ぶため、聖徳太子が送った使い。');
  card('kokusho', '隋への国書', 3, 1, '外交', 'reveal', { fx: 'matchEnemyMax' }, 'この場所の相手のいちばん強いカードと同じパワーになる', '「日出づる処の天子…」と書き、隋と対等な立場で国交を結ぼうとした。');
  card('kani', '冠位十二階', 3, 3, '政治', 'reveal', { fx: 'raiseWeakest' }, 'この場所の自分のいちばん弱いカードを、いちばん強いカードと同じパワーにする', '家がらではなく、能力や手がらで役人を取り立てるしくみ。');
  card('kenpo', '十七条の憲法', 4, 4, '政治', 'ongoing', { fx: 'ongoingOthersHere', amount: 1 }, 'この場所の自分のほかのカード+1', '役人の心がまえを示したきまり。「和をもって貴しとなす」。');
  card('horyuji', '法隆寺', 5, 4, '宗教・文化', 'ongoing', { fx: 'ongoingTagAll', tag: '宗教', amount: 1, self: true }, '全部の場所の自分の宗教カード+1（自分もふくむ）', '聖徳太子が建てた寺。現存する世界最古の木造建築。');
  card('taishi', '聖徳太子', 6, 6, '政治・宗教', 'ongoing', { fx: 'perTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード1枚につき、パワー+1', '天皇中心の国づくりをめざし、冠位十二階や十七条の憲法を定めた。', 'face:shotoku');

  // ===== 聖武天皇（奈良）=====
  card('zei', '税のしくみ', 1, 2, '政治', 'reveal', { fx: 'ramp', amount: 1 }, '次のターン、エネルギー+1', '人々は米や布、特産物などを税として納め、都まで運んだ。');
  card('tougaku', '唐の学問', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '遣唐使や留学生が、唐の進んだ学問や制度を持ち帰った。');
  card('kaigennotsuna', '開眼の綱', 1, 1, '宗教', 'combo', { partner: 'daibutsu', amount: 3 }, '同じ場所に大仏がいればパワー+3', '大仏の目を入れる開眼の儀式で、多くの人が筆につながる綱をにぎった。');
  card('kokubunji', '国分寺', 2, 2, '宗教', 'reveal', { fx: 'spawnOther', token: 'kokubunji_t' }, 'ほかの2つの場所に、パワー1の「国分寺」を1枚ずつ置く（空きがあれば）', '聖武天皇は、国ごとに国分寺を建てるよう命じた。');
  card('kokubunji_t', '国分寺', 0, 1, '宗教', 'none', N, '（国分寺の効果で置かれたカード）', '聖武天皇は、国ごとに国分寺を建てるよう命じた。', 'kokubunji');
  card('kentoshi', '遣唐使', 2, 2, '外交', 'reveal', { fx: 'fetch', target: 'ganjin' }, '山札に鑑真がいれば、手札に加える', '唐の進んだ政治や文化を学ぶために送られた使い。');
  card('mikotonori', '大仏づくりの詔', 2, 2, '政治', 'reveal', { fx: 'fetch', target: 'daibutsu' }, '山札に大仏がいれば、手札に加える', '聖武天皇は、国じゅうの人々の力で大仏をつくろうとよびかけた。');
  card('gyoki', '行基', 3, 2, '宗教', 'ongoing', { fx: 'perOwnHere', amount: 1 }, 'この場所の自分のほかのカード1枚につき+1', '人々のために橋や池をつくった僧。大仏づくりに協力し、多くの人を集めた。');
  card('ganjin', '鑑真', 3, 3, '宗教', 'combo', { partner: 'kentoshi', amount: 3 }, '同じ場所に遣唐使がいればパワー+3', '何度も失敗しながら日本にわたり、仏教の正しい教えを伝えた唐の僧。');
  card('heijokyo', '平城京', 4, 5, '政治', 'reveal', { fx: 'buffHandAll', amount: 1 }, '手札のカード全部+1', '唐の都にならってつくられた奈良の都。');
  card('shosoin', '正倉院', 4, 4, '文化', 'ongoing', { fx: 'protectHere' }, 'この場所の自分のカードは、相手の効果でパワーが下がらず、退場もしない', '聖武天皇の宝物をおさめた倉。シルクロードを通って伝わった品もある。');
  card('daibutsu', '大仏', 5, 5, '宗教', 'ongoing', { fx: 'grow', amount: 2 }, '公開されたあと、ターンの終わりごとにパワー+2', '東大寺の大仏。のべ260万人もの人々の力で完成した。');
  card('shomu', '聖武天皇', 6, 6, '宗教・政治', 'reveal', { fx: 'buffTagHere', tag: '宗教', amount: 2 }, 'この場所の自分の宗教カード全部+2', '仏教の力で国を守ろうと、国分寺や大仏をつくった。', 'face:shoumu');

  // ===== 藤原道長（平安）=====
  card('kana', 'かな文字', 1, 1, '文化', 'reveal', { fx: 'buffHandAll', tag: '文化', amount: 1 }, '手札の文化カード全部+1', '漢字をもとに、ひらがなやかたかなが生まれた。');
  card('junihitoe', '十二単', 1, 2, '文化', 'none', N, '効果なし', '貴族の女性の正装。衣を何枚も重ねて着た。');
  card('nenchugyoji', '年中行事', 1, 1, '文化', 'ongoing', { fx: 'ongoingTagHere', tag: '文化', amount: 1 }, 'この場所の自分のほかの文化カード+1', '貴族は、季節ごとの行事やしきたりを大切にした。');
  card('genji', '源氏物語', 2, 2, '文化', 'combo', { partner: 'murasaki', amount: 3 }, '同じ場所に紫式部がいればパワー+3', '紫式部がかな文字で書いた、長い物語。');
  card('shinden', '寝殿造', 2, 2, '文化', 'reveal', { fx: 'ifCountHere', n: 3, amount: 3 }, 'この場所の自分のカードが3枚以上なら+3', '貴族のやしき。庭や池があり、建物を廊下でつないだ。');
  card('sekkan', '摂政・関白', 2, 1, '政治', 'reveal', { fx: 'stealPower', amount: 2 }, 'この場所の相手のいちばん強いカードから2うばう（相手-2、自分+2）', '天皇を助ける役職。藤原氏がこの役職について政治の実権をにぎった。');
  card('teishi', '遣唐使の停止', 3, 2, '外交', 'reveal', { fx: 'debuffAll', tag: '外交', amount: 2 }, 'この場所の相手の外交カード全部-2', '遣唐使をやめたあと、日本風の文化（国風文化）が育った。');
  card('seisho', '清少納言', 3, 3, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '随筆『枕草子』を書いた女性。');
  card('fujiwara', '藤原氏', 4, 3, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード+1', '娘を天皇のきさきにして、天皇とのつながりを強めた一族。');
  card('murasaki', '紫式部', 4, 4, '文化', 'combo', { partner: 'genji', amount: 2 }, '同じ場所に源氏物語がいればパワー+2', '『源氏物語』を書いた女性。');
  card('mochizuki', '望月の歌', 5, 3, '文化・政治', 'reveal', { fx: 'ifLeading', amount: 5 }, 'この場所でリードしていれば+5', '道長は、欠けたところのない満月にたとえて、自分の栄華を歌によんだ。');
  card('michinaga', '藤原道長', 6, 6, '政治', 'reveal', { fx: 'stealCard' }, 'この場所の相手のいちばん弱いカードを、自分の側にうばう（空きがあれば）', '4人の娘を天皇のきさきにし、大きな力をもった貴族。', 'face:michinaga');

  // ===== 源頼朝（鎌倉）=====
  card('bushi', '武士', 1, 2, '戦い', 'none', N, '効果なし', '武芸を身につけ、土地を守るために戦った人々。');
  card('ichizoku', '一族と家来', 1, 1, '戦い', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '戦い' }, '手札の戦いカード1枚（ランダム）+2', '武士は一族や家来をひきいて戦った。');
  card('gokenin', '御家人', 1, 2, '戦い', 'reveal', { fx: 'moveToLosing', amount: 1 }, 'いちばん負けている自分の場所へかけつける（移動して+1）', '将軍に仕えた武士。「いざ鎌倉」のときは、すぐにかけつけた。');
  card('yakata', '武士のやかた', 2, 2, '戦い', 'ongoing', { fx: 'ongoingTagHere', tag: '戦い', amount: 1 }, 'この場所の自分のほかの戦いカード+1', '武士のやかたは、堀や塀に囲まれ、いつでも戦えるようになっていた。');
  card('kyohei', '源氏の挙兵', 2, 2, '戦い', 'reveal', { fx: 'perTagHere', tag: '戦い', amount: 1 }, 'この場所の自分の戦いカード1枚につき+1', '平氏をたおすため、源頼朝が兵をあげた。');
  card('goon', '御恩と奉公', 3, 1, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '戦い', amount: 1 }, '全部の場所の自分の戦いカード+1', '将軍は御家人の領地を守り（御恩）、御家人は命がけで戦った（奉公）。');
  card('shugo', '守護・地頭', 3, 3, '政治', 'reveal', { fx: 'raiseWeakestEach', amount: 1 }, '自分のカードがある場所ごとに、いちばん弱い自分のカード+1', '頼朝は国ごとに守護、荘園ごとに地頭をおいた。');
  card('yoshitsune', '源義経', 3, 4, '戦い', 'reveal', { fx: 'debuffMax', amount: 3 }, 'この場所の相手のいちばん強いカードのパワー-3', '頼朝の弟。各地で平氏をやぶった。');
  card('dannoura', '壇ノ浦の戦い', 4, 3, '戦い', 'reveal', { fx: 'destroyWeakest' }, 'この場所の相手のいちばん弱いカードを退場させる', '1185年、源義経が平氏をほろぼした戦い。');
  card('masako', '北条政子', 4, 4, '政治', 'combo', { partner: 'yoritomo', amount: 4 }, '同じ場所に源頼朝がいればパワー+4', '頼朝の妻。頼朝の死後、御家人をまとめて幕府を守った。');
  card('kamakura', '鎌倉幕府', 5, 5, '政治', 'combo', { partner: 'yoritomo', amount: 5 }, '同じ場所に源頼朝がいればパワー+5', '源頼朝が鎌倉に開いた、武士の政府。');
  card('yoritomo', '源頼朝', 6, 6, '政治・戦い', 'ongoing', { fx: 'perTagAll', tag: '戦い', amount: 1 }, '全部の場所の自分のほかの戦いカード1枚につき+1', '平氏をたおし、征夷大将軍になって鎌倉幕府を開いた。', 'face:yoritomo');

  // ===== 織田信長（戦国）=====
  card('ashigaru', '足軽', 1, 2, '戦い', 'none', N, '効果なし', '身軽な装備で戦った兵。鉄砲隊としても活やくした。');
  card('tanegashima', '種子島', 1, 1, '外交', 'reveal', { fx: 'fetch', target: 'teppo' }, '山札に鉄砲がいれば、手札に加える', '1543年、種子島に流れ着いたポルトガル人が鉄砲を伝えた。');
  card('nanban', '南蛮貿易', 1, 1, '外交', 'reveal', { fx: 'ramp', amount: 1 }, '次のターン、エネルギー+1', 'ポルトガルやスペインとの貿易。鉄砲や火薬、めずらしい品が入ってきた。');
  card('teppo', '鉄砲', 2, 2, '戦い', 'reveal', { fx: 'destroyWeakest' }, 'この場所の相手のいちばん弱いカードを退場させる', '戦い方を大きく変えた新しい武器。');
  card('rakuichi', '楽市・楽座', 2, 1, '政治', 'reveal', { fx: 'costDownHand', amount: 1 }, '手札のカード全部のコスト-1', '信長は、だれでも自由に商売ができるようにして、城下町をさかえさせた。');
  card('kirisuto', 'キリスト教', 2, 3, '宗教', 'none', N, '効果なし', 'ザビエルが伝えた教え。信長はキリスト教の布教をみとめた。');
  card('nagashino', '長篠の戦い', 3, 3, '戦い', 'combo', { partner: 'teppo', amount: 4 }, '同じ場所に鉄砲がいればパワー+4', '1575年、信長は大量の鉄砲を使って武田軍をやぶった。');
  card('muromachiend', '室町幕府の終わり', 3, 2, '政治', 'reveal', { fx: 'debuffMax', amount: 3 }, 'この場所の相手のいちばん強いカードのパワー-3', '信長は将軍を京都から追い出し、室町幕府をほろぼした。');
  card('hideyoshi_c', '豊臣秀吉', 4, 4, '戦い', 'combo', { partner: 'nobunaga', amount: 3 }, '同じ場所に織田信長がいればパワー+3', '信長の家来として活やくし、のちに天下を統一した。');
  card('mitsuhide', '明智光秀', 4, 7, '戦い', 'reveal', { fx: 'killLeader', target: 'nobunaga' }, '自分の織田信長が場にいれば、信長を退場させる', '1582年、本能寺で主君の信長をおそった（本能寺の変）。');
  card('azuchi', '安土城', 5, 5, '政治', 'ongoing', { fx: 'ongoingOthersHere', amount: 1 }, 'この場所の自分のほかのカード+1', '信長が琵琶湖のほとりに築いた城。天守をもつ豪華な城だった。');
  card('nobunaga', '織田信長', 6, 7, '政治・戦い', 'reveal', { fx: 'debuffAll', amount: 1 }, 'この場所の相手のカード全部-1', '鉄砲を使って勢力を広げ、天下統一を進めた戦国大名。', 'face:nobunaga');

  // ===== ワカタケル大王（古墳）=====
  card('haniwa', 'はにわ', 1, 1, '文化', 'reveal', { fx: 'spawnHere', token: 'haniwa_t' }, 'この場所に、パワー1の「はにわ」をもう1枚置く', '古墳のまわりにならべられた、土でつくった人や家、馬などの形の焼き物。');
  card('haniwa_t', 'はにわ', 0, 1, '文化', 'none', N, '（はにわの効果で置かれたカード）', '古墳のまわりにならべられた、土でつくった人や家、馬などの形の焼き物。', 'haniwa');
  card('toraijin', '渡来人', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '文化' }, '手札の文化カード1枚（ランダム）+2', '大陸から移り住み、土木や焼き物、漢字などを伝えた人々。');
  card('fukusohin', '副葬品', 1, 2, '宗教', 'none', N, '効果なし', '古墳に、なくなった人といっしょにおさめられた鏡や玉、武器など。');
  card('kofunzukuri', '古墳づくり', 2, 2, '文化', 'ongoing', { fx: 'perOwnHere', amount: 1 }, 'この場所の自分のほかのカード1枚につき+1', '大きな古墳をつくるには、たくさんの人の力と長い年月が必要だった。');
  card('tsurugi', '名をきざんだ剣と刀', 2, 2, '戦い', 'combo', { partner: 'wakatakeru', amount: 3 }, '同じ場所にワカタケル大王がいればパワー+3', '埼玉県と熊本県の古墳から、ワカタケル大王の名をきざんだ剣と刀が見つかった。');
  card('yamato', '大和朝廷', 3, 3, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード+1', '大和（奈良県）の豪族たちが大王を中心にまとまった政府。');
  card('zenpokoen', '前方後円墳', 3, 4, '宗教', 'reveal', { fx: 'ifCountHere', n: 3, amount: 3 }, 'この場所の自分のカードが3枚以上なら+3', '前が四角、後ろが円の形をした古墳。');
  card('kogatana', '大王の小刀', 3, 3, '戦い', 'reveal', { fx: 'debuffRandom', amount: 2 }, 'この場所の相手のカード1枚（ランダム）のパワー-2', '鉄の道具や武器は、力の強さをあらわすものだった。');
  card('daisen', '大仙古墳', 4, 6, '宗教', 'none', N, '効果なし', '大阪府にある日本でいちばん大きい古墳（仁徳天皇陵古墳）。');
  card('sekishitsu', '石室', 4, 3, '宗教', 'ongoing', { fx: 'protectHere' }, 'この場所の自分のカードは、相手の効果でパワーが下がらず、退場もしない', '古墳の中の、ひつぎをおさめる石の部屋。');
  card('okimi', '大王', 5, 6, '政治', 'reveal', { fx: 'destroyWeakest' }, 'この場所の相手のいちばん弱いカードを退場させる', '大和朝廷の中心となった王。のちに天皇とよばれるようになった。');
  card('wakatakeru', 'ワカタケル大王', 6, 7, '政治・戦い', 'reveal', { fx: 'perBigCards', n: 4, amount: 2 }, '自分の場のコスト4以上のカード1枚につき+2', '九州から関東まで力を広げた大王。', 'face:wakatakeru');

  // ===== 中大兄皇子・中臣鎌足（飛鳥）=====
  card('mari', '出会いの鞠', 1, 1, '文化', 'reveal', { fx: 'fetch', target: 'kamatari' }, '山札に中臣鎌足がいれば、手札に加える', '蹴鞠の会で、中大兄皇子と中臣鎌足が出会ったと伝えられている。');
  card('kemari', '蹴鞠の会', 1, 2, '文化', 'none', N, '効果なし', '鞠をけって落とさないようにする、貴族の遊び。');
  card('naniwa', '難波の都', 1, 2, '政治', 'none', N, '効果なし', '大化の改新のあと、都は難波（大阪）にうつされた。');
  card('tasukeru', '天皇を助ける役職', 2, 2, '政治', 'ongoing', { fx: 'ongoingTagHere', tag: '政治', amount: 1 }, 'この場所の自分のほかの政治カード+1', '改新のあと、天皇を助けて政治を行う役職が整えられた。');
  card('kochi', '公地公民', 2, 1, '政治', 'reveal', { fx: 'stealPower', amount: 2 }, 'この場所の相手のいちばん強いカードから2うばう（相手-2、自分+2）', '豪族が持っていた土地と人々を、国のものにする方針。');
  card('ooku', '多くの人々', 2, 2, '政治', 'reveal', { fx: 'buffHand', n: 1, amount: 1 }, '手札のカード1枚（ランダム）+1', '国のしくみは、税を納める多くの人々にささえられていた。');
  card('gozokuarasoi', '豪族の争い', 3, 2, '戦い', 'reveal', { fx: 'destroyWeakest' }, 'この場所の相手のいちばん弱いカードを退場させる', '力をもつ豪族どうしが、勢力をめぐって争った。');
  card('tou', '唐', 3, 3, '外交', 'reveal', { fx: 'buffHandAll', tag: '政治', amount: 1 }, '手札の政治カード全部+1', '中国の王朝。日本は唐の国のしくみに学んだ。');
  card('kamatari', '中臣鎌足', 4, 4, '政治', 'combo', { partner: 'nakanooe', amount: 4 }, '同じ場所に中大兄皇子がいればパワー+4', '中大兄皇子とともに大化の改新を進めた人物。のちの藤原氏の祖先。');
  card('tenno', '天皇', 4, 5, '政治', 'ongoing', { fx: 'ongoingOthersHere', amount: 1 }, 'この場所の自分のほかのカード+1', '改新では、天皇を中心とする国づくりがめざされた。');
  card('taika', '大化の改新', 5, 3, '政治', 'reveal', { fx: 'destroyStrongest' }, 'この場所の相手のいちばん強いカードを退場させる', '645年、中大兄皇子と中臣鎌足が蘇我氏をたおし、政治の改革を始めた。');
  card('nakanooe', '中大兄皇子', 6, 7, '政治', 'reveal', { fx: 'perKills', amount: 3 }, 'この試合で相手のカードを退場させた1回につき+3', 'のちの天智天皇。大化の改新を進めた。', 'face:nakanooe');

  // ===== 平清盛（平安）=====
  card('sosen', '宋銭', 1, 1, '外交', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '宋（中国）から輸入されたお金。日本でも使われるようになった。');
  card('nokyo', '平家納経', 1, 1, '宗教', 'combo', { partner: 'itsukushima', amount: 3 }, '同じ場所に厳島神社がいればパワー+3', '平氏が厳島神社におさめた、美しくかざられたお経。');
  card('genpei', '源氏と平氏', 1, 2, '戦い', 'none', N, '効果なし', '武士の中で、とくに力をもった二つの一族。');
  card('owada', '大輪田泊', 2, 2, '外交', 'ongoing', { fx: 'ongoingTagHere', tag: '外交', amount: 1 }, 'この場所の自分のほかの外交カード+1', '清盛が整えた港（今の神戸港）。宋との貿易の拠点になった。');
  card('heiji', '平治の乱', 2, 3, '戦い', 'reveal', { fx: 'debuffRandom', amount: 2 }, 'この場所の相手のカード1枚（ランダム）のパワー-2', '1159年の戦い。清盛が源義朝をやぶり、平氏の力が強まった。');
  card('goshirakawa', '後白河法皇', 2, 2, '政治', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '天皇の位をゆずったあとも政治を動かした上皇。清盛と結んだり対立したりした。');
  card('nissou', '日宋貿易', 3, 3, '外交', 'reveal', { fx: 'draw', n: 2 }, 'カードを2枚引く', '清盛は宋との貿易に力を入れ、大きな利益を得た。');
  card('heishinoyo', '平氏の世', 3, 3, '政治', 'reveal', { fx: 'ifBoard', n: 5, amount: 4 }, '自分の場のカードが5枚以上なら+4', '平氏は高い位や多くの領地を得て、大きな力をもった。');
  card('kiyomorisosen', '清盛の宋銭', 4, 4, '外交', 'reveal', { fx: 'buffHandAll', tag: '外交', amount: 2 }, '手札の外交カード全部+2', '貿易で手に入れた宋銭は、平氏の力のもとになった。');
  card('daijo', '太政大臣', 4, 4, '政治', 'reveal', { fx: 'debuffMax', amount: 3 }, 'この場所の相手のいちばん強いカードのパワー-3', '朝廷のいちばん高い位。武士として初めて清盛がついた。');
  card('itsukushima', '厳島神社', 5, 5, '宗教', 'ongoing', { fx: 'ongoingOthersHere', amount: 1 }, 'この場所の自分のほかのカード+1', '海の上に建つ神社。平氏があつく信仰した。');
  card('kiyomori', '平清盛', 6, 6, '政治・外交', 'reveal', { fx: 'perHand', amount: 1 }, '手札1枚につき+1', '武士として初めて太政大臣になり、日宋貿易を進めた。', 'face:kiyomori');

  // ===== 北条時宗（鎌倉）=====
  card('borui', '防塁', 1, 1, '戦い', 'ongoing', { fx: 'blockSlot' }, 'この場所で相手が置けるマスを1つへらす', '元の2度目の攻撃にそなえて、博多湾ぞいに築いた石の壁。');
  card('takezaki', '竹崎季長', 1, 2, '戦い', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '戦い' }, '手札の戦いカード1枚（ランダム）+2', '元と戦った御家人。自分の戦いぶりを絵巻にえがかせた。');
  card('shikken', '執権', 2, 2, '政治', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '将軍を助ける役職。北条氏が代々つき、幕府の政治を進めた。');
  card('genkokusho', '元の国書', 2, 1, '外交', 'reveal', { fx: 'debuffAll', tag: '外交', amount: 2 }, 'この場所の相手の外交カード全部-2', '元は日本に服従をもとめる国書を送ったが、時宗はこれを退けた。');
  card('tetsuhau', 'てつはう', 2, 2, '戦い', 'reveal', { fx: 'debuffAll', amount: 1 }, 'この場所の相手のカード全部-1', '元軍が使った、火薬を使った武器。');
  card('genko', '元寇', 3, 3, '戦い', 'reveal', { fx: 'debuffMax', amount: 3 }, 'この場所の相手のいちばん強いカードのパワー-3', '1274年と1281年の2度、元の大軍がせめてきた。');
  card('onsho', '恩賞', 3, 3, '政治', 'reveal', { fx: 'buffTagAll', tag: '戦い', amount: 1 }, '自分の場の戦いカード全部+1', '戦いの手がらに対するほうび。元との戦いでは、十分な恩賞が出せなかった。');
  card('jokyu', '承久の乱', 4, 4, '戦い', 'reveal', { fx: 'ifTrailing', amount: 4 }, 'この場所でリードされていたら+4', '1221年、朝廷が幕府をたおそうとしたが、御家人が団結して幕府が勝った。');
  card('tokimunetetsuhau', '時宗のてつはう', 4, 3, '戦い', 'combo', { partner: 'tokimune', amount: 3 }, '同じ場所に北条時宗がいればパワー+3', '元軍のてつはうを手にした時宗は、次の戦いにそなえた。');
  card('seii', '征夷大将軍', 5, 5, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '戦い', amount: 1 }, '全部の場所の自分の戦いカード+1', '武士のかしら。将軍として御家人をひきいた。');
  card('tokimune', '北条時宗', 6, 6, '戦い・政治', 'reveal', { fx: 'debuffAll', amount: 2 }, 'この場所の相手のカード全部-2', '鎌倉幕府の執権。2度の元の攻撃をしりぞけた。', 'face:tokimune');

  // ===== 足利義政（室町）=====
  card('ikebana', '生け花', 1, 1, '文化', 'ongoing', { fx: 'ifFew', n: 2, amount: 3 }, 'この場所の自分のカードが2枚以下なら+3', '室町時代に広まった、花をかざる文化。');
  card('chanoyu', '茶の湯', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '文化' }, '手札の文化カード1枚（ランダム）+2', '茶を飲む作法。室町時代に広まり、のちに千利休が大成した。');
  card('noh', '能', 1, 2, '文化', 'none', N, '効果なし', '観阿弥・世阿弥が大成した、面をつけて演じる芸能。');
  card('suibokuga', '水墨画', 2, 2, '文化', 'ongoing', { fx: 'ifFew', n: 2, amount: 3 }, 'この場所の自分のカードが2枚以下なら+3', 'すみのこさで自然をえがく絵。雪舟が日本風の水墨画を完成させた。');
  card('shoin', '書院造', 2, 2, '文化', 'ongoing', { fx: 'ongoingTagHere', tag: '文化', amount: 2 }, 'この場所の自分のほかの文化カード+2', 'たたみ・ふすま・床の間などがある部屋のつくり。今の和室のもと。');
  card('muromachi', '室町幕府', 2, 3, '政治', 'none', N, '効果なし', '足利尊氏が京都に開いた幕府。');
  card('sesshu', '雪舟', 3, 3, '文化', 'combo', { partner: 'suibokuga', amount: 3 }, '同じ場所に水墨画がいればパワー+3', '中国で絵を学び、日本の自然を水墨画にえがいた僧。');
  card('onin', '応仁の乱', 3, 3, '戦い', 'reveal', { fx: 'debuffEveryone', amount: 1 }, '全部の場所の、おたがいのカード全部-1（このカードはのぞく）', '1467年から11年続いた戦乱。京都は焼け野原になった。');
  card('chawan', '義政の茶わん', 4, 4, '文化', 'ongoing', { fx: 'ifFew', n: 1, amount: 5 }, 'この場所の自分のカードが1枚だけなら+5', '義政は、東山の山荘で茶を楽しんだ。');
  card('kinkaku', '金閣', 4, 4, '文化', 'reveal', { fx: 'ifLeading', amount: 3 }, 'この場所でリードしていれば+3', '足利義満が京都の北山に建てた、金ぱくでかざった建物。');
  card('ginkaku', '銀閣', 5, 5, '文化', 'ongoing', { fx: 'ifFew', n: 2, amount: 4 }, 'この場所の自分のカードが2枚以下なら+4', '足利義政が京都の東山に建てた建物。落ち着いた美しさがある。');
  card('yoshimasa', '足利義政', 6, 6, '文化・政治', 'reveal', { fx: 'buffTagHere', tag: '文化', amount: 2 }, 'この場所の自分の文化カード全部+2', '室町幕府8代将軍。東山文化を育てた。', 'face:yoshimasa');

  // ===== 豊臣秀吉（戦国）=====
  card('kenchi', '検地', 1, 1, '政治', 'reveal', { fx: 'ramp', amount: 1 }, '次のターン、エネルギー+1', '田畑の広さや米のとれ高を調べ、年貢を確実に集められるようにした。');
  card('mibun', '身分', 1, 1, '政治', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '政治' }, '手札の政治カード1枚（ランダム）+2', '武士と百姓・町人の身分が、はっきり分けられていった。');
  card('ogon', '黄金の茶わん', 2, 2, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '秀吉は金をふんだんに使った茶室や茶道具で、力を見せつけた。');
  card('rikyu', '千利休', 2, 2, '文化', 'combo', { partner: 'ogon', amount: 3 }, '同じ場所に黄金の茶わんがいればパワー+3', '茶の湯を大成した人物。秀吉に仕えた。');
  card('daimyo', '大名', 2, 3, '政治', 'reveal', { fx: 'ifSpread', amount: 2 }, 'ほかの2つの場所の両方に自分のカードがあれば+2', '領地をおさめた武士。秀吉は全国の大名を従えた。');
  card('chosen', '朝鮮への出兵', 3, 5, '戦い', 'reveal', { fx: 'discard', n: 1 }, '手札のカード1枚（ランダム）を捨てる', '秀吉は2度にわたって朝鮮に兵を送ったが、大きな負担になり、失敗に終わった。');
  card('tenka', '天下統一', 3, 2, '政治', 'reveal', { fx: 'ifSpread', amount: 5 }, '3つの場所すべてに自分のカードがあれば+5', '1590年、秀吉は全国を統一した。');
  card('katanagari', '刀狩', 4, 3, '政治', 'reveal', { fx: 'debuffAll', tag: '戦い', amount: 2 }, 'この場所の相手の戦いカード全部-2', '百姓から刀や鉄砲を取り上げ、一揆をふせいだ。');
  card('bushihyakusho', '武士と百姓', 4, 5, '政治', 'none', N, '効果なし', '検地と刀狩で、武士と百姓の身分が分かれた。');
  card('osakajo', '大阪城', 5, 5, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード+1', '秀吉が天下統一の拠点として築いた城。');
  card('hideyoshi', '豊臣秀吉', 6, 7, '政治・戦い', 'reveal', { fx: 'ifSpread', amount: 5 }, '3つの場所すべてに自分のカードがあれば+5', '検地や刀狩を行い、天下を統一した。', 'face:hideyoshi');

  // ===== 徳川家光・家康（江戸）=====
  card('gyoretsu', '大名行列の絵', 1, 1, '政治', 'reveal', { fx: 'fetch', target: 'sankin' }, '山札に参勤交代がいれば、手札に加える', '大名は多くの家来をつれて、江戸と領地を行き来した。');
  card('chonin', '江戸の町人', 1, 2, '文化', 'none', N, '効果なし', '商人や職人など、町に住む人々。');
  card('tsushinshi', '朝鮮通信使', 1, 1, '外交', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '将軍がかわるごとに、朝鮮から送られてきた使節。');
  card('sankin', '参勤交代', 2, 2, '政治', 'reveal', { fx: 'moveEnemyStrongest' }, 'この場所の相手のいちばん強いカードを、ほかの場所へ移動させる', '大名に、1年おきに江戸と領地を行き来させた制度。');
  card('dejima', '出島', 2, 2, '外交', 'ongoing', { fx: 'ongoingTagHere', tag: '外交', amount: 2 }, 'この場所の自分のほかの外交カード+2', '長崎につくられた人工の島。オランダとの貿易はここだけで行われた。');
  card('bukeshohatto', '武家諸法度', 2, 3, '政治', 'ongoing', { fx: 'silenceHere' }, 'この場所の相手の永続効果を止める', '大名が守るきまり。やぶると領地を取り上げられた。');
  card('sakoku', '鎖国', 3, 3, '外交', 'reveal', { fx: 'debuffAll', tag: '外交', amount: 3 }, 'この場所の相手の外交カード全部-3', '外国との行き来を制限し、貿易はオランダと中国などにかぎった。');
  card('kinkyo', 'キリスト教の禁止', 3, 3, '宗教', 'reveal', { fx: 'debuffAll', tag: '宗教', amount: 3 }, 'この場所の相手の宗教カード全部-3', '幕府はキリスト教を禁止し、絵ふみなどで信者を取りしまった。');
  card('sekigahara', '関ヶ原の戦い', 4, 4, '戦い', 'reveal', { fx: 'debuffMax', amount: 4 }, 'この場所の相手のいちばん強いカードのパワー-4', '1600年、徳川家康が石田三成らをやぶった戦い。');
  card('ieyasu', '徳川家康', 4, 4, '政治', 'combo', { partner: 'edobakufu', amount: 3 }, '同じ場所に江戸幕府がいればパワー+3', '関ヶ原の戦いに勝ち、江戸幕府を開いた。');
  card('edobakufu', '江戸幕府', 5, 5, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード+1', '1603年、家康が江戸に開いた幕府。260年あまり続いた。');
  card('iemitsu', '徳川家光', 6, 6, '政治', 'reveal', { fx: 'debuffMaxEvery', amount: 2 }, '全部の場所の、相手のいちばん強いカード-2', '江戸幕府3代将軍。参勤交代を制度にし、鎖国を完成させた。', 'face:iemitsu');

  // ===== 杉田玄白（江戸）=====
  card('terakoya', '寺子屋', 1, 1, '文化', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '町や村の子どもが、読み・書き・そろばんを学んだところ。');
  card('orandago', 'オランダ語', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '文化' }, '手札の文化カード1枚（ランダム）+2', '鎖国の中でも、オランダ語の本を通して西洋の学問を学んだ。');
  card('ukiyoe', '浮世絵', 1, 2, '文化', 'none', N, '効果なし', '町人に人気のあった版画。歌川広重や葛飾北斎がえがいた。');
  card('anatomia', 'ターヘル・アナトミア', 2, 2, '文化', 'reveal', { fx: 'fetch', target: 'kaitai' }, '山札に解体新書がいれば、手札に加える', 'オランダ語の医学書。玄白たちはこれをほん訳した。');
  card('ryotaku', '前野良沢', 2, 2, '文化', 'combo', { partner: 'genpaku', amount: 3 }, '同じ場所に杉田玄白がいればパワー+3', '玄白といっしょに『解体新書』をほん訳した医者。');
  card('kabuki', '歌舞伎', 2, 2, '文化', 'combo', { partner: 'chikamatsu', amount: 3 }, '同じ場所に近松門左衛門がいればパワー+3', '町人に人気があった芝居。');
  card('chikamatsu', '近松門左衛門', 3, 3, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '人形浄瑠璃や歌舞伎の脚本を書いた人物。');
  card('rangaku', '蘭学', 3, 2, '文化', 'ongoing', { fx: 'ongoingTagHere', tag: '文化', amount: 1 }, 'この場所の自分のほかの文化カード+1', 'オランダ語を通して学んだ、西洋の学問。');
  card('motoori', '本居宣長', 4, 4, '文化', 'reveal', { fx: 'perHand', amount: 1 }, '手札1枚につき+1', '日本の古い考え方を研究する国学を広めた。');
  card('kaitai', '解体新書', 4, 4, '文化', 'reveal', { fx: 'draw', n: 2 }, 'カードを2枚引く', '1774年に出された、西洋の解剖書のほん訳。');
  card('edo', '江戸', 5, 5, '文化', 'ongoing', { fx: 'ongoingTagAll', tag: '文化', amount: 1 }, '全部の場所の自分のほかの文化カード+1', '人口100万人ほどの大都市。町人の文化がさかえた。');
  card('genpaku', '杉田玄白', 6, 6, '文化', 'reveal', { fx: 'perTagHere', tag: '文化', amount: 2 }, 'この場所の自分の文化カード1枚につき+2', '『解体新書』をほん訳した医者。蘭学の発展につくした。', 'face:genpaku');

  // ===== 西郷隆盛・勝海舟（幕末）=====
  card('kurofune', '黒船', 1, 2, '外交', 'none', N, '効果なし', '1853年、ペリーが黒船で浦賀に来て、開国をもとめた。');
  card('kaikoku', '開国', 1, 1, '外交', 'reveal', { fx: 'ramp', amount: 1 }, '次のターン、エネルギー+1', '鎖国をやめ、外国と行き来するようになった。');
  card('ryoma', '坂本竜馬', 1, 1, '政治', 'reveal', { fx: 'fetch', target: 'saccho' }, '山札に薩長同盟がいれば、手札に加える', '薩摩藩と長州藩の同盟をなかだちした人物。');
  card('saccho', '薩長同盟', 2, 3, '政治', 'combo', { partner: 'saigo', amount: 3 }, '同じ場所に西郷隆盛がいればパワー+3', '1866年、薩摩藩と長州藩が手を結び、幕府をたおす力になった。');
  card('washin', '日米和親条約', 2, 2, '外交', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '1854年に結んだ条約。下田と函館の港を開いた。');
  card('taisei', '大政奉還', 2, 1, '政治', 'reveal', { fx: 'discardWeakest', amount: 3 }, '手札のいちばん弱いカードを捨てて+3', '1867年、将軍の徳川慶喜が政権を朝廷に返した。');
  card('kaishu', '勝海舟', 3, 3, '政治', 'combo', { partner: 'akewatashi', amount: 3 }, '同じ場所に江戸城の明けわたしがいればパワー+3', '幕府の人物。西郷隆盛と話し合い、江戸を戦火から守った。');
  card('akewatashi', '江戸城の明けわたし', 3, 3, '政治', 'reveal', { fx: 'debuffAll', amount: 1 }, 'この場所の相手のカード全部-1', '1868年、戦わずに江戸城が新政府にわたされた。');
  card('gokajo', '五箇条の御誓文', 4, 3, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード+1', '1868年、新しい政治の方針を示した。');
  card('meiji', '明治維新', 4, 4, '政治', 'reveal', { fx: 'sacrifice', amount: 2 }, 'この場所の自分のいちばん弱いカードを退場させ、そのパワーの2倍を得る', '幕府がたおれ、新しい政府のもとで国のしくみが大きく変わった。');
  card('haihan', '廃藩置県', 5, 5, '政治', 'reveal', { fx: 'destroyWeakest' }, 'この場所の相手のいちばん弱いカードを退場させる', '1871年、藩をなくして県をおき、政府が全国を直接おさめた。');
  card('saigo', '西郷隆盛', 6, 7, '政治・戦い', 'reveal', { fx: 'perLoss', amount: 2 }, 'この試合で自分のカードを退場させた・捨てた1回につき+2', '薩摩藩の中心人物。明治維新に力をつくした。', 'face:saigo');

  // ===== 福沢諭吉（明治）=====
  card('gakusei', '学制', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '文化' }, '手札の文化カード1枚（ランダム）+2', '1872年、全国に小学校をつくることが決められた。');
  card('noguchi', '野口英世', 1, 1, '文化', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '黄熱病などの研究で、世界で活やくした医学者。');
  card('susume', '学問のすゝめ', 2, 1, '文化', 'reveal', { fx: 'perHand', amount: 1 }, '手札1枚につき+1', '福沢諭吉が書いた本。学ぶことの大切さを説いた。');
  card('iwakura', '岩倉使節団', 2, 2, '外交', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '1871年、欧米に送られた使節団。条約改正の交渉や欧米の視察をした。');
  card('tetsudo', '鉄道', 2, 2, '文化', 'reveal', { fx: 'ramp', amount: 1 }, '次のターン、エネルギー+1', '1872年、新橋と横浜の間に初めて鉄道が開通した。');
  card('choheirei', '徴兵令', 3, 4, '戦い', 'none', N, '効果なし', '20才になった男子に、軍隊に入ることを義務づけた。');
  card('chiso', '地租改正', 3, 3, '政治', 'reveal', { fx: 'buffHandAll', amount: 1 }, '手札のカード全部+1', '土地の値段に応じて、お金で税を納めるようにした。');
  card('okubo', '大久保利通', 4, 4, '政治', 'combo', { partner: 'iwakura', amount: 3 }, '同じ場所に岩倉使節団がいればパワー+3', '岩倉使節団に加わり、帰国後は国の産業を育てることに力を入れた。');
  card('tomioka', '富岡製糸場', 4, 5, '文化', 'none', N, '効果なし', '1872年に開かれた、政府がつくった製糸工場。');
  card('bunmei', '文明開化', 5, 5, '文化', 'ongoing', { fx: 'ongoingTagAll', tag: '文化', amount: 1 }, '全部の場所の自分のほかの文化カード+1', '西洋の文化が取り入れられ、くらしが大きく変わった。');
  card('fukuzawa', '福沢諭吉', 6, 5, '文化', 'reveal', { fx: 'perHand', amount: 2 }, '手札1枚につき+2', '『学問のすゝめ』を書き、慶應義塾を開いた。', 'face:fukuzawa');

  // ===== 伊藤博文（明治）=====
  card('senkyo', '選挙', 1, 1, '政治', 'reveal', { fx: 'buffHand', n: 1, amount: 2, tag: '政治' }, '手札の政治カード1枚（ランダム）+2', '1890年、初めての衆議院議員の選挙が行われた。');
  card('jiyuminken', '自由民権運動', 1, 2, '政治', 'none', N, '効果なし', '国民が政治に参加する権利をもとめた運動。');
  card('itagaki', '板垣退助', 1, 1, '政治', 'reveal', { fx: 'fetch', target: 'kokkai' }, '山札に国会開設の約束がいれば、手札に加える', '自由民権運動の中心人物。自由党をつくった。');
  card('kokkai', '国会開設の約束', 2, 2, '政治', 'ongoing', { fx: 'ongoingTagHere', tag: '政治', amount: 1 }, 'この場所の自分のほかの政治カード+1', '1881年、政府は10年後に国会を開くことを約束した。');
  card('okuma', '大隈重信', 2, 3, '政治', 'combo', { partner: 'kokkai', amount: 2 }, '同じ場所に国会開設の約束がいればパワー+2', '立憲改進党をつくった人物。');
  card('doitsu', 'ドイツの憲法', 2, 2, '外交', 'reveal', { fx: 'fetch', target: 'teikokukenpo' }, '山札に大日本帝国憲法がいれば、手札に加える', '伊藤博文はヨーロッパにわたり、皇帝の力が強いドイツの憲法を学んだ。');
  card('naikaku', '内閣', 3, 3, '政治', 'ongoing', { fx: 'ongoingOthersHere', amount: 1 }, 'この場所の自分のほかのカード+1', '1885年に内閣制度ができ、伊藤博文が初代の内閣総理大臣になった。');
  card('gikai', '帝国議会', 3, 1, '政治', 'ongoing', { fx: 'ongoingTagAll', tag: '政治', amount: 1 }, '全部の場所の自分のほかの政治カード+1', '1890年に開かれた国会。衆議院と貴族院があった。');
  card('tennoshuken', '天皇主権', 4, 4, '政治', 'reveal', { fx: 'ifLeading', amount: 3 }, 'この場所でリードしていれば+3', '大日本帝国憲法では、国を治める権限（主権）は天皇にあるとされた。');
  card('nishikie', '憲法発布の錦絵', 4, 4, '文化', 'reveal', { fx: 'buffHandAll', amount: 1 }, '手札のカード全部+1', '憲法の発布を祝うようすをえがいた絵。');
  card('teikokukenpo', '大日本帝国憲法', 5, 5, '政治', 'ongoing', { fx: 'ongoingOthersHere', amount: 2 }, 'この場所の自分のほかのカード+2', '1889年に発布された、アジアで初めての近代的な憲法。');
  card('ito', '伊藤博文', 6, 6, '政治', 'ongoing', { fx: 'perOngoing', amount: 2 }, '自分の場の永続カード1枚につき+2', '大日本帝国憲法をつくり、初代の内閣総理大臣になった。', 'face:ito');

  // ===== 陸奥宗光（明治）=====
  card('normanton', 'ノルマントン号事件', 1, 1, '外交', 'reveal', { fx: 'buffHand', n: 1, amount: 2 }, '手札のカード1枚（ランダム）+2', '1886年、イギリス船の事件で日本人乗客が全員なくなったが、船長は軽い罪だった。条約改正の声が高まった。');
  card('fushiga', '陸奥の風刺画', 1, 1, '文化', 'reveal', { fx: 'draw', n: 1 }, 'カードを1枚引く', '当時の日本と世界の関係を、絵で皮肉ったもの。');
  card('fubyodo', '不平等条約', 1, 2, '外交', 'none', N, '効果なし', '幕末に結んだ条約。治外法権をみとめ、関税自主権がなかった。');
  card('chigai', '治外法権', 2, 2, '外交', 'reveal', { fx: 'cancelHere' }, 'この試合のあいだ、この場所で相手の公開時の効果が発動しなくなる', '日本にいる外国人が罪をおかしても、日本の法律でさばけなかった。陸奥宗光がなくした。');
  card('joyaku', '条約改正', 2, 2, '外交', 'reveal', { fx: 'cleanseHere' }, 'この場所の自分のカードの、下げられたパワーを元にもどす', '不平等条約を改め、外国と対等な関係をめざした。');
  card('nisshin', '日清戦争', 3, 4, '戦い', 'reveal', { fx: 'debuffRandom', amount: 2 }, 'この場所の相手のカード1枚（ランダム）のパワー-2', '1894年、朝鮮をめぐって清と戦った。');
  card('baisho', '賠償金', 3, 2, '外交', 'reveal', { fx: 'ramp', amount: 2 }, '次のターン、エネルギー+2', '日清戦争で得た賠償金は、八幡製鉄所の建設などに使われた。');
  card('shimonoseki', '下関条約', 4, 4, '外交', 'combo', { partner: 'mutsu', amount: 3 }, '同じ場所に陸奥宗光がいればパワー+3', '1895年、日清戦争の講和条約。陸奥宗光が交渉した。');
  card('rokumeikan', '鹿鳴館', 4, 4, '外交', 'ongoing', { fx: 'ongoingTagHere', tag: '外交', amount: 1 }, 'この場所の自分のほかの外交カード+1', '外国人を招いて舞踏会を開いた建物。条約改正のため、欧米風のくらしを見せた。');
  card('mutsu', '陸奥宗光', 6, 6, '外交', 'reveal', { fx: 'equalizeHere' }, 'この場所の相手のカードの、上がったパワーを元にもどす（対等にする）', '外務大臣として、1894年に治外法権をなくすことに成功した。', 'face:mutsu');

  // ===== 小村寿太郎（明治）=====
  card('komurakagi', '小村の鍵', 1, 1, '外交', 'reveal', { fx: 'fetch', target: 'kanzeikaifuku' }, '山札に関税自主権の回復がいれば、手札に加える', '外務省で小村寿太郎が使っていたとされる鍵。');
  card('akiko', '与謝野晶子', 1, 1, '文化', 'reveal', { fx: 'debuffBothTag', tag: '戦い', amount: 1 }, 'この場所の、おたがいの戦いカード全部-1', '日露戦争のとき、戦場の弟を思う詩を発表した歌人。');
  card('kanzei', '関税自主権', 2, 1, '外交', 'reveal', { fx: 'costUpNext', amount: 1 }, '次のターン、相手の手札のカード全部のコスト+1', '輸入品にかける税（関税）の率を、自分の国で決める権利。');
  card('nichiro', '日露戦争', 2, 3, '戦い', 'reveal', { fx: 'debuffRandom', amount: 2 }, 'この場所の相手のカード1枚（ランダム）のパワー-2', '1904年、ロシアと戦った戦争。多くの犠牲が出た。');
  card('portsmouth', 'ポーツマス条約', 2, 2, '外交', 'reveal', { fx: 'ifLeading', amount: 2}, 'この場所でリードしていれば+2', '日露戦争の講和条約。小村寿太郎が交渉した。賠償金は得られなかった。');
  card('togo', '東郷平八郎', 3, 3, '戦い', 'reveal', { fx: 'debuffMax', amount: 3 }, 'この場所の相手のいちばん強いカードのパワー-3', '日露戦争で日本海海戦を指揮した人物。');
  card('kanzeikaifuku', '関税自主権の回復', 5, 3, '外交', 'ongoing', { fx: 'costUpOngoing', amount: 1 }, '相手の手札のカードはコスト+1', '1911年、小村寿太郎が関税自主権を取りもどし、条約改正が完成した。');
  card('yahata', '八幡製鉄所', 4, 5, '文化', 'none', N, '効果なし', '1901年に生産を始めた官営の製鉄所。');
  card('komura', '小村寿太郎', 6, 6, '外交', 'reveal', { fx: 'buffTagAll', tag: '外交', amount: 2 }, '全部の場所の自分の外交カード+2', '外務大臣として、関税自主権を回復した。', 'face:komura');

  const D = (id, name, theme, era, face, color, desc, cards) => ({ id, name, theme, era, face, color, desc, cards });
  const DECKS = {};
  [
    D('himiko', '卑弥呼', 'うらない', '弥生', 'himiko', '#c9415b', '予言で相手の置き場所を読む', ['ishibocho', 'kome', 'magatama', 'takayuka', 'arasoi', 'hori', 'kuni', 'seidoki', 'rekishisho', 'gi', 'yamatai', 'himiko']),
    D('wakatakeru', 'ワカタケル大王', '大王の力', '古墳', 'wakatakeru', '#a0642c', '重くて強いカードを並べる', ['haniwa', 'toraijin', 'fukusohin', 'kofunzukuri', 'tsurugi', 'yamato', 'zenpokoen', 'kogatana', 'daisen', 'sekishitsu', 'okimi', 'wakatakeru']),
    D('taishi', '聖徳太子', '改革', '飛鳥', 'shotoku', '#4a7fd6', 'しくみを作って場を強くする', ['gozoku', 'bukkyo', 'mononobe', 'soga', 'imoko', 'ryugaku', 'kenzuishi', 'kokusho', 'kani', 'kenpo', 'horyuji', 'taishi']),
    D('nakanooe', '中大兄皇子・中臣鎌足', '大化の改新', '飛鳥', 'nakanooe', '#6b5bd1', '相手の強いカードを倒す', ['mari', 'kemari', 'naniwa', 'tasukeru', 'kochi', 'ooku', 'gozokuarasoi', 'tou', 'kamatari', 'tenno', 'taika', 'nakanooe']),
    D('shomu', '聖武天皇', '祈り', '奈良', 'shoumu', '#c99a2e', 'ためて、大仏を育てる', ['zei', 'tougaku', 'kaigennotsuna', 'kokubunji', 'kentoshi', 'mikotonori', 'gyoki', 'ganjin', 'heijokyo', 'shosoin', 'daibutsu', 'shomu']),
    D('michinaga', '藤原道長', '栄華', '平安', 'michinaga', '#c46aa8', '相手の力をうばう', ['kana', 'junihitoe', 'nenchugyoji', 'genji', 'shinden', 'sekkan', 'teishi', 'seisho', 'fujiwara', 'murasaki', 'mochizuki', 'michinaga']),
    D('kiyomori', '平清盛', '日宋貿易', '平安', 'kiyomori', '#d1493b', 'カードを多く引いて手札で勝つ', ['sosen', 'nokyo', 'genpei', 'owada', 'heiji', 'goshirakawa', 'nissou', 'heishinoyo', 'kiyomorisosen', 'daijo', 'itsukushima', 'kiyomori']),
    D('yoritomo', '源頼朝', '御恩と奉公', '鎌倉', 'yoritomo', '#3c8f5a', 'なかまの武士で戦う', ['bushi', 'ichizoku', 'gokenin', 'yakata', 'kyohei', 'goon', 'shugo', 'yoshitsune', 'dannoura', 'masako', 'kamakura', 'yoritomo']),
    D('tokimune', '北条時宗', '元寇をふせぐ', '鎌倉', 'tokimune', '#2f7f8f', '守りをかため、相手が置ける枚数をへらす', ['borui', 'takezaki', 'gokenin', 'shikken', 'genkokusho', 'tetsuhau', 'genko', 'onsho', 'jokyu', 'tokimunetetsuhau', 'seii', 'tokimune']),
    D('yoshimasa', '足利義政', 'わび・さび', '室町', 'yoshimasa', '#8a8f9a', '少ない枚数ほど強い', ['ikebana', 'chanoyu', 'noh', 'suibokuga', 'shoin', 'muromachi', 'sesshu', 'onin', 'chawan', 'kinkaku', 'ginkaku', 'yoshimasa']),
    D('nobunaga', '織田信長', '天下布武', '戦国', 'nobunaga', '#b8322e', 'はやさと破壊', ['ashigaru', 'tanegashima', 'nanban', 'teppo', 'rakuichi', 'kirisuto', 'nagashino', 'muromachiend', 'hideyoshi_c', 'mitsuhide', 'azuchi', 'nobunaga']),
    D('hideyoshi', '豊臣秀吉', '天下統一', '戦国', 'hideyoshi', '#d4a62a', '3つの場所すべてにカードを置く', ['kenchi', 'mibun', 'ashigaru', 'ogon', 'rikyu', 'daimyo', 'chosen', 'tenka', 'katanagari', 'bushihyakusho', 'osakajo', 'hideyoshi']),
    D('iemitsu', '徳川家光・家康', '幕府のしくみ', '江戸', 'iemitsu', '#3a5a8c', '相手を動かし、相手の効果を止める', ['gyoretsu', 'chonin', 'tsushinshi', 'sankin', 'dejima', 'bukeshohatto', 'sakoku', 'kinkyo', 'sekigahara', 'ieyasu', 'edobakufu', 'iemitsu']),
    D('genpaku', '杉田玄白', '蘭学', '江戸', 'genpaku', '#5f8f3a', 'カードを引いて学問で強くなる', ['terakoya', 'orandago', 'ukiyoe', 'anatomia', 'ryotaku', 'kabuki', 'chikamatsu', 'rangaku', 'motoori', 'kaitai', 'edo', 'genpaku']),
    D('saigo', '西郷隆盛・勝海舟', '明治維新', '幕末', 'saigo', '#8f4a2f', '古いカードを手放して力に変える', ['kurofune', 'kaikoku', 'ryoma', 'saccho', 'washin', 'taisei', 'kaishu', 'akewatashi', 'gokajo', 'meiji', 'haihan', 'saigo']),
    D('fukuzawa', '福沢諭吉', '学問のすゝめ', '明治', 'fukuzawa', '#4f6f9f', '手札が多いほど強い', ['terakoya', 'gakusei', 'noguchi', 'susume', 'iwakura', 'tetsudo', 'choheirei', 'chiso', 'okubo', 'tomioka', 'bunmei', 'fukuzawa']),
    D('ito', '伊藤博文', '憲法と議会', '明治', 'ito', '#7a4f9f', '永続のきまりで場全体を強くする', ['senkyo', 'jiyuminken', 'itagaki', 'kokkai', 'okuma', 'doitsu', 'naikaku', 'gikai', 'tennoshuken', 'nishikie', 'teikokukenpo', 'ito']),
    D('mutsu', '陸奥宗光', '治外法権をなくす', '明治', 'mutsu', '#2f6f6f', '相手の効果を打ち消し、対等にもどす', ['normanton', 'fushiga', 'fubyodo', 'chigai', 'iwakura', 'joyaku', 'nisshin', 'baisho', 'shimonoseki', 'rokumeikan', 'teikokukenpo', 'mutsu']),
    D('komura', '小村寿太郎', '関税自主権の回復', '明治', 'komura', '#9f6f2f', '相手のカードのコストを上げる', ['komurakagi', 'akiko', 'noguchi', 'kanzei', 'nichiro', 'portsmouth', 'togo', 'baisho', 'kanzeikaifuku', 'yahata', 'teikokukenpo', 'komura']),
  ].forEach(d => DECKS[d.id] = d);

  // 場所：tag（タグ）／kind（効果の種類）／costEq・costGte（コスト）／drawer（引く効果）で+amount、cap（置ける枚数）
  const L = (id, name, era, img, o, text, short) => Object.assign({ id, name, era, img, text, short }, o);
  const LOCS = {};
  [
    L('inasaku', '稲作のムラ', '弥生', 'inasaku', { tag: '文化', amount: 2 }, '文化のカード+2', '文化+2'),
    L('hori', 'ほりのあるムラ', '弥生', 'hori', { tag: '戦い', amount: 2 }, '戦いのカード+2', '戦い+2'),
    L('daisenkofun', '大仙古墳', '古墳', 'kofun', { tag: '宗教', amount: 2 }, '宗教のカード+2', '宗教+2'),
    L('kyuden', '大王の宮殿', '古墳', 'kyuden', { costGte: 4, amount: 2 }, 'コスト4以上のカード+2', 'コスト4以上+2'),
    L('asuka', '飛鳥の都', '飛鳥', 'asuka', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('ikaruga', 'いかるがの寺', '飛鳥', 'ikaruga', { tag: '宗教', amount: 2 }, '宗教のカード+2', '宗教+2'),
    L('heijo', '平城京の都', '奈良', 'heijo', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('todaiji', '東大寺', '奈良', 'todaiji', { tag: '宗教', amount: 2 }, '宗教のカード+2', '宗教+2'),
    L('heian', '平安京', '平安', 'heian', { tag: '文化', amount: 2 }, '文化のカード+2', '文化+2'),
    L('utage', '寝殿の宴', '平安', 'utage', { kind: 'reveal', amount: 2 }, '公開時の効果をもつカード+2', '公開時+2'),
    L('kamakuramachi', '鎌倉の町', '鎌倉', 'kamakura', { tag: '戦い', amount: 2 }, '戦いのカード+2', '戦い+2'),
    L('gokeninyashiki', '御家人の屋敷', '鎌倉', 'gokenin', { costEq: 1, amount: 2 }, 'コスト1のカード+2', 'コスト1+2'),
    L('hananogosho', '花の御所', '室町', 'hananogosho', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('higashiyama', '東山の山荘', '室町', 'higashiyama', { tag: '文化', amount: 2 }, '文化のカード+2', '文化+2'),
    L('azuchil', '安土', '戦国', 'azuchi', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('nagashinol', '長篠の陣', '戦国', 'nagashino', { tag: '戦い', amount: 2 }, '戦いのカード+2', '戦い+2'),
    L('edomachi', '江戸の町', '江戸', 'edomachi', { tag: '文化', amount: 2 }, '文化のカード+2', '文化+2'),
    L('edojo', '江戸城', '江戸', 'edojo', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('uraga', '浦賀の海', '幕末', 'uraga', { tag: '外交', amount: 3 }, '外交のカード+3', '外交+3'),
    L('satsuma', '薩摩屋敷', '幕末', 'satsuma', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('shinbashi', '新橋の駅', '明治', 'shinbashi', { tag: '文化', amount: 2 }, '文化のカード+2', '文化+2'),
    L('enzetsu', '演説会の会場', '明治', 'enzetsu', { tag: '政治', amount: 2 }, '政治のカード+2', '政治+2'),
    L('rokumei', '鹿鳴館', '明治', 'rokumei', { tag: '外交', amount: 2 }, '外交のカード+2', '外交+2'),
    L('gaimusho', '外務省', '明治', 'gaimusho', { drawer: true, amount: 2 }, 'カードを引く効果をもつカード+2', '引く効果+2'),
    L('minato', '大陸の港', '共通', 'minato', { tag: '外交', amount: 3 }, '外交のカード+3', '外交+3'),
    L('mori', '深い森', '共通', 'mori', { cap: 2 }, 'おたがい2枚までしか置けない', '2枚まで'),
  ].forEach(l => LOCS[l.id] = l);

  window.RC_DATA = { CARDS: C, DECKS, LOCS };
})();
