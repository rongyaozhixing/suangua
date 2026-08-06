/**
 * fortune-read.js — 算我的命：生辰 → 八字四柱 → 12 类逐项命理解读（本地规则引擎，离线可用）
 * 数据基础：农历/干支（lunar.js）+ 五行十神生克。解读为传统命理框架化参考，不作现实决策依据。
 */
(function (global) {
  'use strict';

  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  // 五行相生/相克
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  // 日干 → 子时天干（五鼠遁）
  const WUSHU = { 甲: '甲', 乙: '丙', 丙: '戊', 丁: '庚', 戊: '壬', 己: '甲', 庚: '丙', 辛: '戊', 壬: '庚', 癸: '壬' };
  // 十神：日主同我/我生/生我/我克/克我
  function shishen(dayWx, otherWx) {
    if (dayWx === otherWx) return '比肩';
    if (SHENG[dayWx] === otherWx) return '食神';
    if (SHENG[otherWx] === dayWx) return '正印';
    if (KE[dayWx] === otherWx) return '正财';
    if (KE[otherWx] === dayWx) return '正官';
    return '—';
  }
  // 阴阳细分（简化：阳见阳/阴见阴为偏，否则为正）
  function shishenFull(dayGan, otherGan) {
    const dw = GAN_WX[dayGan], ow = GAN_WX[otherGan];
    const sameYinYang = (GAN.indexOf(dayGan) % 2) === (GAN.indexOf(otherGan) % 2);
    if (dw === ow) return sameYinYang ? '比肩' : '劫财';
    if (SHENG[dw] === ow) return sameYinYang ? '食神' : '伤官';
    if (SHENG[ow] === dw) return sameYinYang ? '偏印' : '正印';
    if (KE[dw] === ow) return sameYinYang ? '偏财' : '正财';
    if (KE[ow] === dw) return sameYinYang ? '七杀' : '正官';
    return '—';
  }

  /** 儒略日数（格里高利历） */
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  /** 公历 → 日柱干支（(JDN+49) mod 60，已验证 2000-01-01=戊午） */
  function dayGanzhi(y, m, d) {
    const idx = (jdn(y, m, d) + 49) % 60;
    return GAN[idx % 10] + ZHI[idx % 12];
  }
  /** 年干 → 正月干（五虎遁），加月数得月柱 */
  function monthGanzhi(yearGz, lunarMonth) {
    const yGan = yearGz.charAt(0);
    const first = { 甲: '丙', 乙: '戊', 丙: '庚', 丁: '壬', 戊: '甲', 己: '丙', 庚: '戊', 辛: '庚', 壬: '壬', 癸: '甲' };
    const fg = first[yGan] || '丙';
    const gan = GAN[(GAN.indexOf(fg) + lunarMonth - 1) % 10];
    const zhi = ZHI[(lunarMonth + 1) % 12];   // 正月寅(idx2)、二月卯(idx3)… 五月午(idx6)
    return gan + zhi;
  }

  // 六十甲子纳音（按干支序号 0-59）
  const NAYIN = [
    '海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金',
    '山头火','山头火','涧下水','涧下水','城头土','城头土','白蜡金','白蜡金','杨柳木','杨柳木',
    '泉中水','泉中水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水',
    '沙中金','沙中金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金',
    '覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木',
    '大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'
  ];
  const GANZHI_IDX = {};
  for (let i = 0; i < 60; i++) GANZHI_IDX[GAN[i % 10] + ZHI[i % 12]] = i;
  /** 干支 → 纳音 + 五行 */
  function nayin(gz) {
    const idx = GANZHI_IDX[gz];
    if (idx === undefined) return null;
    const name = NAYIN[idx];
    const wx = name.slice(-1);
    return { name, wuxing: wx };
  }

  /** 八字四柱：返回 {year, month, day, hour} 干支 + 日主五行 + 月令 */
  function bazi(lunar, hourSeq) {
    const yGz = lunar.yearGz || '';
    const mGz = monthGanzhi(yGz, lunar.lunarMonth || 1);
    const dGz = dayGanzhi(lunar.solarY, lunar.solarM, lunar.solarD);
    const dGan = dGz.charAt(0);
    // 五鼠遁定时辰天干
    let hGan = '';
    if (dGan && WUSHU[dGan]) {
      const base = GAN.indexOf(WUSHU[dGan]);
      const hourIndex = (hourSeq - 1) % 10;   // 子=0 丑=1 …
      hGan = GAN[(base + hourIndex) % 10];
    }
    const hZhi = ZHI[(hourSeq - 1) % 12];
    return {
      pillars: { 年: yGz, 月: mGz, 日: dGz, 时: hGan + hZhi },
      dayGan: dGan, dayZhi: dGz.charAt(1),
      dayWx: GAN_WX[dGan] || '',
      monthZhi: mGz.charAt(1), monthWx: ZHI_WX[mGz.charAt(1)] || '',
      hourZhi: hZhi
    };
  }

  /** 旺衰：日主五行在月令的得令程度 */
  function wangshuai(dayWx, monthWx) {
    // 得令：月令生我或同我；休囚：我生月令/我克月令/克我月令
    if (dayWx === monthWx) return { level: 2, text: '得令 · 身强' };
    if (SHENG[monthWx] === dayWx) return { level: 2, text: '得月令生 · 身强' };
    if (SHENG[dayWx] === monthWx) return { level: 0, text: '泄气于月令 · 身偏弱' };
    if (KE[dayWx] === monthWx) return { level: 0, text: '耗于月令 · 身偏弱' };
    if (KE[monthWx] === dayWx) return { level: -1, text: '受克于月令 · 身弱' };
    return { level: 1, text: '平' };
  }

  const WX_CHAR = {
    木: '仁厚温和，有主见，主生长生发，宜南方发展，喜春夏。',
    火: '热情明礼，行动力强，主光明温暖，宜东南方，喜夏季。',
    土: '敦厚诚信，沉稳包容，主承载养育，宜本地中原，喜四季之交。',
    金: '果决刚毅，重义气，主收敛肃杀，宜西方，喜秋季。',
    水: '聪慧灵动，善谋略，主流通润下，宜北方，喜冬季。'
  };

  const CATE = [
    '性格', '事业', '财运', '婚姻', '家庭', '学业', '子女', '健康', '外貌', '运势', '官非', '灾劫'
  ];

  /** 12 类逐项解读 */
  function read(lunar, hourSeq, gender) {
    const b = bazi(lunar, hourSeq);
    const ws = wangshuai(b.dayWx, b.monthWx);
    const yinYang = gender === '男';
    // 十神分布（年/月/时干）
    const gans = [b.pillars.年.charAt(0), b.pillars.月.charAt(0), b.pillars.时.charAt(0)];
    const shen = gans.map(g => shishenFull(b.dayGan, g));
    const count = {};
    shen.forEach(s => { count[s] = (count[s] || 0) + 1; });
    const strong = ws.level >= 1;

    const R = {};
    // 性格：日主五行
    R['性格'] = {
      judge: '吉',
      text: `日主${b.dayWx}。${WX_CHAR[b.dayWx] || ''}${ws.text}，性格${strong ? '刚健主动，能担事' : '温和内敛，喜助力'}。十神偏${dominantShishen(count)}，${shenText(count)}`
    };
    // 事业：官杀/印/食伤
    const guan = (count['正官'] || 0) + (count['七杀'] || 0);
    const yin = (count['正印'] || 0) + (count['偏印'] || 0);
    const shi = (count['食神'] || 0) + (count['伤官'] || 0);
    R['事业'] = {
      judge: guan >= 1 ? '吉' : (shi >= 1 ? '平' : '需注意'),
      text: `${guan >= 1 ? `官星现（${shenText({ 正官: count['正官'] || 0, 七杀: count['七杀'] || 0 })}），事业有方向，宜守正位、贵在坚持` : '官星不显，事业宜凭专长技艺立足'}。${yin >= 1 ? '印星相助，易得贵人提携。' : ''}${shi >= 1 ? '食伤泄秀，适合创意、技术、自由职业。' : ''}${strong ? '身强能任事，宜主动进取' : '身弱宜借力，稳中求进'}。`
    };
    // 财运：财星
    const cai = (count['正财'] || 0) + (count['偏财'] || 0);
    R['财运'] = {
      judge: cai >= 1 ? '吉' : '平',
      text: `${cai >= 1 ? `财星透干（${shenText({ 正财: count['正财'] || 0, 偏财: count['偏财'] || 0 })}），求财有门路，正财稳、偏财活` : '财星不显，财运靠积累，宜细水长流'}。${strong ? '身强能担财，财来可留' : '身弱财多反为累，宜先强身后求财'}。${b.dayWx === '金' ? '金命人理财宜稳健，忌冒进。' : ''}`
    };
    // 婚姻：男看财星，女看官星；日支为配偶宫
    const spouseStar = yinYang ? cai : guan;
    R['婚姻'] = {
      judge: spouseStar >= 1 ? '吉' : '平',
      text: `${yinYang ? '男命' : '女命'}${yinYang ? (cai >= 1 ? '财星为妻星，正缘可期，婚后重家' : '财星弱，姻缘宜主动经营，晚婚更稳') : (guan >= 1 ? '官星为夫星，正缘可期，择偶宜稳' : '官星弱，感情宜随缘，先立业后成家')}。日支（配偶宫）${b.dayZhi}${b.dayZhi === '子午卯酉' ? '，桃花位，感情多浪漫' : ''}。`
    };
    // 家庭：月柱/年柱
    R['家庭'] = {
      judge: '平',
      text: `年柱${b.pillars.年}（祖上根基）、月柱${b.pillars.月}（父母兄弟）。${monthFriendly(b.monthWx, b.dayWx) ? '月令与日主相合，原生家庭助力大' : '月令与日主相克，家事多靠自己操持'}。`
    };
    // 学业：印 + 食伤
    R['学业'] = {
      judge: (yin >= 1 || shi >= 1) ? '吉' : '平',
      text: `${yin >= 1 ? '印星明，学习悟性强，适合学历深造' : '印星不显，学业靠勤勉'}${shi >= 1 ? '，食伤旺，思路活，适合兴趣引导学习' : ''}。${strong ? '身强有耐力，可攻难科' : '身弱宜循序，劳逸结合'}。`
    };
    // 子女：男看官杀，女看食伤
    R['子女'] = {
      judge: '平',
      text: `${yinYang ? (guan >= 1 ? '男命官杀为子女星，子女缘佳' : '男命官杀弱，子女缘较迟，顺其自然') : (shi >= 1 ? '女命食伤为子女星，子女缘佳' : '女命食伤弱，子女缘平常')}。`
    };
    // 健康：五行失衡
    R['健康'] = health(b, ws);
    // 外貌：日主+旺衰
    R['外貌'] = {
      judge: '平',
      text: `${b.dayWx}${b.dayWx === '木' ? '身形修长' : b.dayWx === '火' ? '气色红润' : b.dayWx === '土' ? '体态敦厚' : b.dayWx === '金' ? '骨相清朗' : '肤质润泽'}，${strong ? '精神健旺' : '宜注意作息，保养精气神'}。`
    };
    // 运势：大运流年（用时辰地支推）
    R['运势'] = {
      judge: '平',
      text: `本命以时支${b.hourZhi}（${ZHI_WX[b.hourZhi]}）起运，${strong ? '行运宜顺水推舟、把握机遇' : '行运宜以守为攻、养精蓄锐'}。流年逢${SHENG[b.dayWx] || '旺'}年、比劫帮身之年易有进展。`
    };
    // 官非：七杀/伤官过旺
    R['官非'] = {
      judge: (count['七杀'] || 0) >= 2 ? '需注意' : '吉',
      text: (count['七杀'] || 0) >= 2 ? '七杀重，行事易急躁碰壁，遇事多忍让，文书契约须谨慎。' : '官星平和，守规矩即无官非之忧，遇事以和为贵。'
    };
    // 灾劫：伤官见官 / 五行受克
    R['灾劫'] = {
      judge: ws.level <= 0 && (count['伤官'] || 0) >= 1 ? '需注意' : '吉',
      text: (ws.level <= 0 && (count['伤官'] || 0) >= 1) ? '身弱伤官见官，行事宜低调，注意口舌与意外磕碰，出行留心。' : '四柱平顺，无大灾大劫之象，唯平时注意安全、积德行善。'
    };

    const yearNayin = nayin(b.pillars.年);
    return {
      pillars: b.pillars, dayWx: b.dayWx, ws: ws.text,
      nayin: yearNayin,   // 年命纳音（如 2006 丙戌 → 屋上土·土命）
      items: CATE.map(c => ({ name: c, ...R[c] }))
    };
  }

  function health(b, ws) {
    // 五行对应脏腑：木肝、火心、土脾、金肺、水肾
    const organ = { 木: '肝胆', 火: '心脏血脉', 土: '脾胃消化', 金: '肺与呼吸道', 水: '肾与泌尿' };
    const keWx = Object.keys(KE).find(k => KE[k] === b.dayWx); // 克我者
    const text = `日主${b.dayWx}，对应${organ[b.dayWx] || '脏腑'}。${ws.level <= 0 ? '身偏弱，注意劳逸结合、规律作息' : '身强体健，气血充足'}。五行中${keWx ? '「' + keWx + '」' : ''}为忌神一方，${keWx ? organ[keWx] + '宜多加养护' : ''}，饮食有节，情绪平和为要。`;
    return { judge: ws.level >= 1 ? '吉' : '平', text };
  }

  function dominantShishen(count) {
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : '平';
  }
  function shenText(count) {
    const parts = Object.entries(count).filter(([, n]) => n > 0).map(([s, n]) => `${s}${n > 1 ? '×' + n : ''}`);
    return parts.length ? parts.join('、') : '平顺';
  }
  function monthFriendly(mw, dw) {
    return mw === dw || SHENG[mw] === dw || SHENG[dw] === mw;
  }

  global.Fortune = { bazi, read, WX_CHAR, CATE };
})(typeof window !== 'undefined' ? window : globalThis);
