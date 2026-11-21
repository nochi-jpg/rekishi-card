// 歴史カードバトル：カード・場所・デッキのデータ
// effect の種類：none / reveal（公開時）/ ongoing（永続）/ prophecy（予言）/ combo（史実コンボ）
(function () {
  const C = {};
  function card(id, o) { C[id] = Object.assign({ id }, o); }

  // ===== 卑弥呼デッキ（弥生）=====
  card('ishibocho', { name: '石包丁', cost: 1, power: 2, tags: ['文化'], img: 'h_ishibocho',
    kind: 'none', text: '効果なし',
    memo: '稲の穂をかりとる石の道具。米づくりとともに広まった。' });
  card('kome', { name: '米づくり', cost: 1, power: 1, tags: ['文化'], img: 'h_kome',
    kind: 'reveal', fx: 'buffHandRandom', text: '手札のカード1枚（ランダム）のパワー+1',
    memo: '大陸から米づくりが伝わり、人々はムラをつくってくらすようになった。' });
  card('magatama', { name: '卑弥呼の勾玉', cost: 1, power: 1, tags: ['宗教'], img: 'h_magatama',
    kind: 'prophecy', fx: 'prophecySelf', amount: 3, text: '次のターン、相手がこの場所にカードを出したら、このカードのパワー+3',
    memo: '勾玉は、祭りやまじないに使われた玉。' });
  card('takayuka', { name: '高床倉庫', cost: 2, power: 2, tags: ['文化'], img: 'h_takayuka',
    kind: 'ongoing', fx: 'ongoingTagHere', tag: '文化', amount: 1, self: false, text: 'この場所の自分のほかの文化カード+1',
    memo: 'ネズミや湿気から米を守るため、床を高くした倉庫。' });
  card('arasoi', { name: 'むらどうしの争い', cost: 2, power: 3, tags: ['戦い'], img: 'h_arasoi',
    kind: 'reveal', fx: 'debuffEnemyRandom', amount: 2, text: 'この場所の相手のカード1枚（ランダム）のパワー-2',
    memo: '米や土地、水をめぐって、ムラどうしの争いが起こった。' });
  card('hori', { name: 'ほりとさく', cost: 2, power: 3, tags: ['戦い'], img: 'h_hori',
    kind: 'prophecy', fx: 'prophecyEnemy', amount: 2, text: '次のターン、相手がこの場所にカードを出したら、出てきた相手のカード全部-2',
    memo: 'ムラのまわりをほりとさくで囲み、敵から守った（吉野ヶ里遺跡など）。' });
  card('kuni', { name: 'くに', cost: 3, power: 3, tags: ['政治'], img: 'h_kuni',
    kind: 'reveal', fx: 'kuni', amount: 3, text: 'ほかの2つの場所の両方に自分のカードがあれば、パワー+3',
    memo: '争いの中で強いムラがまわりのムラを従え、小さなくにができた。' });
  card('seidoki', { name: '青銅器・鉄器', cost: 3, power: 2, tags: ['宗教', '戦い'], img: 'h_seidoki',
    kind: 'reveal', fx: 'buffOthersHere', amount: 1, text: 'この場所の自分のほかのカード全部+1',
    memo: '青銅器（銅たくなど）は祭りに、鉄器は道具や武器に使われた。' });
  card('rekishisho', { name: '中国の歴史書', cost: 4, power: 4, tags: ['外交'], img: 'h_rekishisho',
    kind: 'reveal', fx: 'fetch', target: 'himiko', text: '山札に卑弥呼がいれば、手札に加える',
    memo: '中国の歴史書に、邪馬台国と卑弥呼のことが書かれている。' });
  card('gi', { name: '魏への使い', cost: 4, power: 3, tags: ['外交'], img: 'h_rekishisho',
    kind: 'combo', partner: 'himiko', amount: 4, text: '同じ場所に卑弥呼がいればパワー+4',
    memo: '卑弥呼は中国の魏に使いを送り、王の称号と銅鏡などを授かった。' });
  card('yamatai', { name: '邪馬台国', cost: 5, power: 5, tags: ['政治'], img: 'h_yamatai',
    kind: 'combo', partner: 'himiko', amount: 5, text: '同じ場所に卑弥呼がいればパワー+5',
    memo: '卑弥呼は邪馬台国の女王として、30ほどのくにを従えた。' });
  card('himiko', { name: '卑弥呼', cost: 6, power: 7, tags: ['宗教', '政治'], img: 'face:himiko', leader: true,
    kind: 'reveal', fx: 'himiko', amount: 2, text: 'この試合で当たった予言1回につき、パワー+2',
    memo: 'うらないやまじないで人々を導いた、邪馬台国の女王。' });

  // ===== 聖徳太子デッキ（飛鳥）=====
  card('gozoku', { name: '豪族', cost: 1, power: 2, tags: ['政治'], img: 't_gozoku',
    kind: 'none', text: '効果なし',
    memo: '各地で土地と人々を支配していた、力のある一族。' });
  card('toraijin', { name: '渡来人', cost: 1, power: 1, tags: ['文化'], img: 't_toraijin',
    kind: 'reveal', fx: 'buffHandTag', tagsAny: ['文化', '宗教'], amount: 1, text: '手札の文化か宗教のカード1枚（ランダム）のパワー+1',
    memo: '大陸から移り住み、土木や焼き物などの技術を伝えた人々。' });
  card('bukkyo', { name: '仏教', cost: 1, power: 1, tags: ['宗教'], img: 't_bukkyo',
    kind: 'ongoing', fx: 'ongoingTagHere', tag: '宗教', amount: 1, self: true, text: 'この場所の自分の宗教カード+1（自分もふくむ）',
    memo: '大陸から伝わった教え。聖徳太子は深く信仰し、広めようとした。' });
  card('soga', { name: '蘇我氏', cost: 2, power: 3, tags: ['政治'], img: 't_soga',
    kind: 'combo', partner: 'taishi', amount: 2, text: '同じ場所に聖徳太子がいればパワー+2',
    memo: '力のある豪族。聖徳太子は蘇我馬子と協力して政治を進めた。' });
  card('imoko', { name: '小野妹子', cost: 2, power: 2, tags: ['外交'], img: 't_imoko',
    kind: 'reveal', fx: 'fetch', target: 'kenzuishi', text: '山札に遣隋使がいれば、手札に加える',
    memo: '遣隋使として、隋に送られた人物。' });
  card('ryugaku', { name: '留学生', cost: 2, power: 2, tags: ['外交'], img: 't_ryugaku',
    kind: 'combo', partner: 'kenzuishi', amount: 2, text: '同じ場所に遣隋使がいればパワー+2',
    memo: '遣隋使とともに隋へわたり、進んだ政治や文化を学んだ。' });
  card('kenzuishi', { name: '遣隋使', cost: 3, power: 3, tags: ['外交'], img: 't_kenzuishi',
    kind: 'combo', partner: 'imoko', amount: 3, text: '同じ場所に小野妹子がいればパワー+3',
    memo: '隋の進んだ政治や文化を学ぶため、聖徳太子が送った使い。' });
  card('kokusho', { name: '隋への国書', cost: 3, power: 1, tags: ['外交'], img: 't_kokusho',
    kind: 'reveal', fx: 'matchEnemyMax', text: 'この場所の相手のいちばん強いカードと同じパワーになる',
    memo: '「日出づる処の天子…」と書き、隋と対等な立場で国交を結ぼうとした。' });
  card('kani', { name: '冠位十二階', cost: 3, power: 2, tags: ['政治'], img: 't_kani',
    kind: 'reveal', fx: 'raiseWeakest', text: 'この場所の自分のいちばん弱いカードを、いちばん強いカードと同じパワーにする',
    memo: '家がらではなく、能力や手がらで役人を取り立てるしくみ。' });
  card('kenpo', { name: '十七条の憲法', cost: 4, power: 3, tags: ['政治'], img: 't_kenpo',
    kind: 'ongoing', fx: 'ongoingOthersHere', amount: 1, text: 'この場所の自分のほかのカード+1',
    memo: '役人の心がまえを示したきまり。「和をもって貴しとなす」。' });
  card('horyuji', { name: '法隆寺', cost: 5, power: 4, tags: ['宗教', '文化'], img: 't_horyuji',
    kind: 'ongoing', fx: 'ongoingTagAll', tag: '宗教', amount: 1, self: true, text: '全部の場所の自分の宗教カード+1（自分もふくむ）',
    memo: '聖徳太子が建てた寺。現存する世界最古の木造建築。' });
  card('taishi', { name: '聖徳太子', cost: 6, power: 6, tags: ['政治', '宗教'], img: 'face:shotoku', leader: true,
    kind: 'ongoing', fx: 'taishi', amount: 1, text: '全部の場所の自分のほかの政治カード1枚につき、パワー+1',
    memo: '天皇中心の国づくりをめざし、冠位十二階や十七条の憲法を定めた。' });

  const DECKS = {
    himiko: { id: 'himiko', name: '卑弥呼', theme: 'うらない', era: '弥生', face: 'himiko', color: '#c9415b',
      desc: '予言で相手の置き場所を読む',
      cards: ['ishibocho', 'kome', 'magatama', 'takayuka', 'arasoi', 'hori', 'kuni', 'seidoki', 'rekishisho', 'gi', 'yamatai', 'himiko'] },
    taishi: { id: 'taishi', name: '聖徳太子', theme: '改革', era: '飛鳥', face: 'shotoku', color: '#4a7fd6',
      desc: 'しくみを作って場を強くする',
      cards: ['gozoku', 'toraijin', 'bukkyo', 'soga', 'imoko', 'ryugaku', 'kenzuishi', 'kokusho', 'kani', 'kenpo', 'horyuji', 'taishi'] },
  };

  const LOCS = {
    inasaku: { id: 'inasaku', name: '稲作のムラ', era: '弥生', img: 'inasaku', tag: '文化', amount: 2, text: '文化のカード+2', short: '文化+2' },
    hori:    { id: 'hori', name: 'ほりのあるムラ', era: '弥生', img: 'hori', tag: '戦い', amount: 2, text: '戦いのカード+2', short: '戦い+2' },
    asuka:   { id: 'asuka', name: '飛鳥の都', era: '飛鳥', img: 'asuka', tag: '政治', amount: 2, text: '政治のカード+2', short: '政治+2' },
    ikaruga: { id: 'ikaruga', name: 'いかるがの寺', era: '飛鳥', img: 'ikaruga', tag: '宗教', amount: 2, text: '宗教のカード+2', short: '宗教+2' },
    minato:  { id: 'minato', name: '大陸の港', era: '共通', img: 'minato', tag: '外交', amount: 3, text: '外交のカード+3', short: '外交+3' },
    mori:    { id: 'mori', name: '深い森', era: '共通', img: 'mori', cap: 2, text: 'おたがい2枚までしか置けない', short: '2枚まで' },
  };

  window.RC_DATA = { CARDS: C, DECKS, LOCS };
})();
