/**
 * lunar.js — 公历转农历（1900-2100）
 * 数据表为通用公开农历编码（每项 20 bit：高 13 位管闰月/月大小，低 4 位为闰月月份）
 */
(function (global) {
  'use strict';

  // 农历数据表：index 0 对应 1900 年，共 201 项（1900-2100）
  const lunarInfo = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
    0x0d520
  ];

  const Gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const Zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const Animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const nStr1 = ['日', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const nStr2 = ['初', '十', '廿', '卅'];

  /** 农历 y 年总天数 */
  function lYearDays(y) {
    let i, sum = 348;
    for (i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }

  /** 农历 y 年闰月天数（无闰月返回 0） */
  function leapDays(y) {
    if (leapMonth(y)) return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
    return 0;
  }

  /** 农历 y 年闰哪个月（1-12），无闰月返回 0 */
  function leapMonth(y) {
    return lunarInfo[y - 1900] & 0xf;
  }

  /** 农历 y 年 m 月（1-12，非闰月）天数 */
  function monthDays(y, m) {
    return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  }

  /** 干支（年份用） */
  function cyclical(num) {
    return Gan[num % 10] + Zhi[num % 12];
  }

  function dayCn(d) {
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    return nStr2[Math.floor(d / 10)] + nStr1[d % 10];
  }

  function monthCn(m, leap) {
    const base = (leap ? '闰' : '') + nStr1[m];
    return m <= 10 ? base + '月' : (m === 11 ? '冬月' : '腊月');
  }

  /**
   * 公历转农历
   * @param {number} y 公历年
   * @param {number} m 公历月 1-12
   * @param {number} d 公历日 1-31
   * @returns {{lunarYear:number, lunarMonth:number, lunarDay:number, isLeap:boolean,
   *   yearGz:string, zodiac:string, monthCn:string, dayCn:string,
   *   solarY:number, solarM:number, solarD:number}}
   */
  function solar2lunar(y, m, d) {
    if (y < 1900 || y > 2100) throw new Error('支持范围 1900-2100 年');
    const baseDate = new Date(1900, 0, 31);
    const objDate = new Date(y, m - 1, d);
    let offset = Math.floor((objDate - baseDate) / 86400000);
    let temp = 0, i;

    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = lYearDays(i);
      offset -= temp;
    }
    if (offset < 0) { offset += temp; i--; }

    const year = i;
    const leap = leapMonth(year);
    let isLeap = false;

    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === (leap + 1) && !isLeap) {
        --i; isLeap = true; temp = leapDays(year);
      } else {
        temp = monthDays(year, i);
      }
      if (isLeap && i === (leap + 1)) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --i; }
    }
    if (offset < 0) { offset += temp; --i; }

    const month = i;
    const day = offset + 1;

    return {
      lunarYear: year,
      lunarMonth: month,
      lunarDay: day,
      isLeap: isLeap,
      yearGz: cyclical(year - 4),
      zodiac: Animals[(year - 4) % 12],
      monthCn: monthCn(month, isLeap),
      dayCn: dayCn(day),
      solarY: y, solarM: m, solarD: d
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { solar2lunar, lunarInfo };
  } else {
    global.Lunar = { solar2lunar, lunarInfo };
  }
})(typeof window !== 'undefined' ? window : globalThis);
