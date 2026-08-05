/**
 * huangli.js — 今日黄历（断网内置算法）
 * 日干支/节气月支/建除十二神/宜忌。算法已用 lunar_python 多日期验证。
 */
(function (global) {
  'use strict';

  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const XINGQI = ['日', '一', '二', '三', '四', '五', '六'];

  // 节气月支（按时间序 1-12 月，简化近似日期；取最后一个已过的节令）
  const JIEQI = [
    { m: 1, d: 6, zhi: 1 },   // 小寒 → 丑
    { m: 2, d: 4, zhi: 2 },   // 立春 → 寅
    { m: 3, d: 6, zhi: 3 },   // 惊蛰 → 卯
    { m: 4, d: 5, zhi: 4 },   // 清明 → 辰
    { m: 5, d: 6, zhi: 5 },   // 立夏 → 巳
    { m: 6, d: 6, zhi: 6 },   // 芒种 → 午
    { m: 7, d: 7, zhi: 7 },   // 小暑 → 未
    { m: 8, d: 7, zhi: 8 },   // 立秋 → 申
    { m: 9, d: 8, zhi: 9 },   // 白露 → 酉
    { m: 10, d: 8, zhi: 10 }, // 寒露 → 戌
    { m: 11, d: 7, zhi: 11 }, // 立冬 → 亥
    { m: 12, d: 7, zhi: 0 }   // 大雪 → 子
  ];

  /** 日干支：锚点 2026-08-06 = 壬子（序 48） */
  function dayGanzhi(y, m, d) {
    const anchor = Date.UTC(2026, 7, 6) / 86400000;
    const days = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    const n = (((48 + (days - anchor)) % 60) + 60) % 60;
    return { gz: GAN[n % 10] + ZHI[n % 12], n: n, zhi: n % 12 };
  }

  /** 节气月支（该日期所处节令月的地支） */
  function jieqiZhi(y, m, d) {
    let zhi = 1; // 默认丑（1月小寒前）
    for (const j of JIEQI) {
      if (m > j.m || (m === j.m && d >= j.d)) zhi = j.zhi;
    }
    return zhi;
  }

  /** 建除十二神序（0=建 1=除 2=满 3=平 4=定 5=执 6=破 7=危 8=成 9=收 10=开 11=闭） */
  const JIANCHU_NAMES = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

  const YI_JI = {
    '建': { yi: ['出行', '赴任', '祈福', '祭祀'], ji: ['开仓', '动土', '嫁娶'] },
    '除': { yi: ['扫舍', '沐浴', '除旧布新'], ji: ['嫁娶', '开市'] },
    '满': { yi: ['祭祀', '祈福', '开光', '纳财'], ji: ['栽种', '开仓'] },
    '平': { yi: ['修整', '平路', '安床', '栽种'], ji: ['开市', '破土'] },
    '定': { yi: ['安床', '交易', '纳财', '定盟'], ji: ['出行', '词讼'] },
    '执': { yi: ['捕捉', '断案', '纳畜', '修造'], ji: ['搬家', '嫁娶', '开市'] },
    '破': { yi: ['破屋', '求医', '坏垣'], ji: ['出行', '嫁娶', '开市'] },
    '危': { yi: ['安葬', '祈福', '祭祀'], ji: ['登高', '行船', '出行'] },
    '成': { yi: ['开市', '入学', '嫁娶', '纳财', '动土'], ji: ['词讼', '安葬'] },
    '收': { yi: ['收纳', '进财', '入仓', '纳财'], ji: ['出行', '移徙'] },
    '开': { yi: ['开市', '出行', '动土', '开业', '纳财'], ji: ['安葬'] },
    '闭': { yi: ['祭祀', '修墙', '筑堤', '祈福'], ji: ['开市', '出行', '安床'] }
  };

  /** 吉凶等级 */
  function level(jcName) {
    if (['成', '开', '定', '收'].includes(jcName)) return '吉';
    if (['平', '满', '建'].includes(jcName)) return '平';
    return '凶';
  }

  /** 完整黄历信息 */
  function today(y, m, d) {
    const gz = dayGanzhi(y, m, d);
    const jz = jieqiZhi(y, m, d);
    const jcIdx = (gz.zhi - jz + 12) % 12;
    const jcName = JIANCHU_NAMES[jcIdx];
    const lv = level(jcName);
    const yj = YI_JI[jcName] || { yi: [], ji: [] };
    return {
      dayGz: gz.gz,
      xingqi: XINGQI[new Date(y, m - 1, d).getDay()],
      jianchu: jcName,
      level: lv,
      yi: yj.yi,
      ji: yj.ji,
      simplified: true
    };
  }

  global.Huangli = { today: today };
})(typeof window !== 'undefined' ? window : globalThis);
