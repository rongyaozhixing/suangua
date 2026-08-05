/**
 * paipan.js — 小六壬命盘/大运/流年/流月排盘（江春义流派，六宫版）
 * 依据 docs/小六壬完整版.md「小六壬命盘、大运、流年、流月起盘法」
 */
(function (global) {
  'use strict';

  const X = global.XiaoLiuRen;

  const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const DIZHI_WX = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const SHEN_FROM_DIZHI = { 寅: '青龙', 卯: '青龙', 巳: '朱雀', 午: '朱雀', 丑: '勾陈', 辰: '勾陈', 未: '螣蛇', 戌: '螣蛇', 申: '白虎', 酉: '白虎', 亥: '玄武', 子: '玄武' };
  const WUXING = ['木', '火', '土', '金', '水', '天空']; // 五星（含天空，六宫顺排）

  /** 六亲古法取象（江春义） */
  const LIUQIN_GUFA = [
    '占父亲：五星五行生自身地支五行为父',
    '占母亲：六宫五行生自身地支五行为母',
    '占兄弟：自身地支、五星同五行为兄弟',
    '占姐妹：自身地支、六宫同五行为姐妹',
    '占妻子：自身地支克制其余地支为妻',
    '占夫君：其余六宫五行克制自身地支为夫',
    '占儿子：自身地支生五星五行为子',
    '占女儿：自身地支生六宫五行为女',
    '占财运：自身地支生五星为偏财，自身地支克六宫为正财',
    '占官职：五星五行克自身地支为偏职，六宫五行克自身地支为正职'
  ];

  /**
   * 排盘
   * @param {object} lunar Lunar.solar2lunar 结果（农历年月日）
   * @param {number} hourSeq 时辰序号 1-12
   * @returns 本命盘/大运/流年数据
   */
  function buildPan(lunar, hourSeq) {
    const shichen = X.SHICHEN[hourSeq - 1];
    const shizhi = DIZHI.indexOf(shichen.name);      // 时辰地支序号
    const selfWx = DIZHI_WX[shichen.name];           // 自身五行

    // 三宫（时间起卦，六宫版）
    const monGong = X.gongBySeq(X.numToGong(lunar.lunarMonth));
    const dayGong = X.gongBySeq(X.numToGong(monGong.seq + lunar.lunarDay - 1));
    const hourGong = X.gongBySeq(X.numToGong(dayGong.seq + hourSeq - 1));

    // 地支顺排：从时宫起，每宫 2 个连续地支
    const gongs = [];
    for (let i = 0; i < 6; i++) {
      const gong = X.gongBySeq((hourGong.seq + i - 1) % 6 + 1);
      const d1 = DIZHI[(shizhi + i * 2) % 12];
      const d2 = DIZHI[(shizhi + i * 2 + 1) % 12];
      gongs.push({ gong, d1, d2 });
    }

    // 五星：日落宫起木星顺排六星
    const wuxingStar = [];
    for (let i = 0; i < 6; i++) {
      wuxingStar.push(WUXING[(i + (dayGong.seq - 1)) % 6]);
    }

    // 六亲：以自身五行生克定
    function liuqinOf(wx) {
      if (!wx) return '—';
      if (X.WUXING_KE[selfWx] === wx) return '妻财';       // 我克者
      if (X.WUXING_SHENG[wx] === selfWx) return '父母';    // 生我者
      if (X.WUXING_SHENG[selfWx] === wx) return '子孙';    // 我生者
      if (X.WUXING_KE[wx] === selfWx) return '官鬼';       // 克我者
      return '兄弟';
    }

    // 六神：各宫首地支
    const shens = gongs.map(g => SHEN_FROM_DIZHI[g.d1] || '—');

    // 大运：0 岁本宫，每十年隔一宫（+1），五十岁后循环
    const dayun = [];
    for (let a = 0; a <= 50; a += 10) {
      const g = X.gongBySeq((hourGong.seq + a / 10 - 1) % 6 + 1);
      dayun.push({ age: a, gong: g });
    }

    // 流年：大运宫为基础，一岁一宫（+1）；流月：流年宫起顺推 12 月
    function liunian(age) {
      const dg = Math.floor(age / 10);
      const base = X.gongBySeq((hourGong.seq + dg - 1) % 6 + 1);
      const ln = X.gongBySeq((base.seq + (age % 10) - 1) % 6 + 1);
      const months = [];
      for (let m = 0; m < 12; m++) months.push(X.gongBySeq((ln.seq + m - 1) % 6 + 1));
      return { gong: ln, months };
    }

    return {
      shichenName: shichen.name, selfWx, monGong, dayGong, hourGong,
      gongs, wuxingStar, liuqinOf, shens, dayun, liunian
    };
  }

  global.PaiPan = { buildPan, LIUQIN_GUFA, DIZHI, DIZHI_WX, SHEN_FROM_DIZHI };
})(typeof window !== 'undefined' ? window : globalThis);
