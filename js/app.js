/**
 * app.js — 小六壬起卦与渲染（六宫版 + 掐指动画）
 * 起卦方式：时间起卦 / 报数字起卦 / 汉字笔画起卦
 */
(function () {
  'use strict';

  const X = window.XiaoLiuRen;
  const L = window.Lunar;

  // ============ 常用字笔画表（查不到的字走手动兜底） ============
  const STROKE = {
    '一': 1, '二': 2, '三': 3, '四': 5, '五': 4, '六': 4, '七': 2, '八': 2, '九': 2, '十': 2,
    '人': 2, '大': 3, '小': 3, '山': 3, '川': 3, '土': 3, '女': 3, '子': 3, '马': 3, '王': 4,
    '天': 4, '心': 4, '手': 4, '月': 4, '日': 4, '水': 4, '火': 4, '木': 4, '中': 4, '今': 4,
    '生': 5, '白': 5, '石': 5, '田': 5, '目': 5, '立': 5, '业': 5, '平': 5, '龙': 5, '玉': 5,
    '世': 5, '去': 5, '失': 5, '电': 5, '皮': 5, '出': 5, '打': 5, '正': 5, '可': 5, '右': 5,
    '年': 6, '有': 6, '自': 6, '地': 6, '安': 6, '好': 6, '吉': 6, '行': 6, '成': 6, '名': 6,
    '回': 6, '百': 6, '血': 6, '早': 6, '色': 6, '衣': 6, '老': 6, '考': 6, '机': 6, '此': 6,
    '来': 7, '走': 7, '财': 7, '车': 7, '我': 7, '你': 7, '言': 7, '身': 7, '运': 7, '医': 7,
    '男': 7, '兵': 7, '坐': 7, '快': 7, '远': 7, '报': 7, '声': 7, '求': 7, '别': 7, '利': 7,
    '事': 8, '学': 8, '官': 8, '房': 8, '和': 8, '明': 8, '易': 8, '法': 8, '命': 8, '姓': 8,
    '妻': 8, '始': 8, '店': 8, '京': 8, '朋': 8, '往': 8, '放': 8, '所': 8, '夜': 8, '近': 7,
    '面': 9, '是': 9, '星': 9, '鬼': 9, '神': 9, '秋': 9, '重': 9, '香': 9, '思': 9, '美': 9,
    '风': 9, '音': 9, '看': 9, '科': 9, '信': 9, '前': 9, '食': 9, '首': 9, '待': 9, '城': 9,
    '家': 10, '时': 10, '病': 10, '高': 10, '爱': 10, '酒': 10, '海': 10, '书': 10, '桃': 10,
    '真': 10, '破': 10, '流': 10, '眠': 10, '钱': 10, '婚': 11, '情': 11, '理': 11, '晚': 11,
    '绿': 11, '望': 11, '职': 11, '雪': 11, '商': 11, '得': 11, '惊': 11, '问': 11, '假': 11,
    '喜': 12, '黑': 12, '道': 12, '温': 12, '期': 12, '街': 12, '程': 12, '然': 12, '黄': 11,
    '结': 9, '顺': 9, '新': 13, '想': 13, '意': 13, '数': 13, '蓝': 13, '路': 13, '雷': 13,
    '睡': 13, '感': 13, '满': 13, '福': 13, '梦': 13, '慢': 14, '歌': 14, '疑': 14, '精': 14,
    '豪': 14, '德': 15, '趣': 15, '影': 15, '慧': 15, '醉': 15, '醒': 16, '餐': 16, '镜': 16,
    '赞': 16, '融': 16, '霜': 17, '戴': 17, '霞': 17, '繁': 17, '赢': 17, '翻': 18, '鹰': 18,
    '瀑': 18, '蟹': 19, '爆': 19, '疆': 19, '瓣': 19, '魔': 20, '籍': 20, '耀': 20, '鳞': 20,
    '躁': 20, '露': 21, '霸': 21, '霹': 21, '霾': 22, '髓': 22, '鑫': 24
  };

  // ============ 起卦核心 ============

  /** 时间起卦：公历 y/m/d + 时辰序号(1-12) */
  /** 时间起卦：公历 y/m/d + 时辰序号(1-12)。ver: 'liugong'|'jiugong' */
  function byTime(y, m, d, hourSeq, ver) {
    const is9 = ver === 'jiugong';
    const numToGong = is9 ? X.numToGong9 : X.numToGong;
    const gongBySeq = is9 ? X.gongBySeq9 : X.gongBySeq;
    const lunar = L.solar2lunar(y, m, d);
    const monGong = gongBySeq(numToGong(lunar.lunarMonth));
    const dayGong = gongBySeq(numToGong(monGong.seq + lunar.lunarDay - 1));
    const hourGong = gongBySeq(numToGong(dayGong.seq + hourSeq - 1));
    return { lunar, hourSeq, gongs: { month: monGong, day: dayGong, hour: hourGong } };
  }

  /** 数字/笔画起卦：连续数数法。
   *  第一个数从大安数；第二个数以第一个的结果为一接着数；第三个数以第二个的结果为一接着数。
   *  1 个数定末宫自身；2 个→初+末；3 个→初+中+末 */
  /** 数字/笔画起卦：连续数数法（按版本取宫） */
  function byNumbers(nums, ver) {
    const is9 = ver === 'jiugong';
    const numToGong = is9 ? X.numToGong9 : X.numToGong;
    const gongBySeq = is9 ? X.gongBySeq9 : X.gongBySeq;
    const gongs = { month: null, day: null, hour: null };
    const list = [];
    let cur = 1; // 从大安开始
    nums.forEach(n => {
      cur = numToGong(cur + n - 1);
      list.push(cur);
    });
    if (list.length === 1) gongs.hour = gongBySeq(list[0]);
    else if (list.length === 2) { gongs.month = gongBySeq(list[0]); gongs.hour = gongBySeq(list[1]); }
    else { gongs.month = gongBySeq(list[0]); gongs.day = gongBySeq(list[1]); gongs.hour = gongBySeq(list[2]); }
    return { gongs };
  }

  function hourSeqFromDate(date) {
    const h = date.getHours();
    if (h >= 23 || h < 1) return 1;
    return Math.floor((h + 1) / 2) + 1;
  }

  // ============ 掐指动画 phases ============

  function phasesForTime(monGong, dayGong, hourSeq, lunar) {
    return [
      { label: '月', startSeq: 1, count: lunar.lunarMonth, display: n => n + '月' },
      { label: '日', startSeq: monGong.seq, count: lunar.lunarDay, display: n => n + '日' },
      { label: '时', startSeq: dayGong.seq, count: hourSeq, display: n => X.SHICHEN[n - 1].name + '时' }
    ];
  }

  function phasesForNums(nums, roleLabels, ver) {
    const numToGong = ver === 'jiugong' ? X.numToGong9 : X.numToGong;
    let cur = 1; // 第一个数从大安开始，后续以落宫为一接着数
    return nums.map((n, i) => {
      const phase = {
        label: roleLabels[i] || '数', startSeq: cur, count: n, display: m => String(m)
      };
      cur = numToGong(cur + n - 1);
      return phase;
    });
  }

  // ============ 渲染 ============

  const $ = sel => document.querySelector(sel);

  function gongCard(gong, role, roleDesc) {
    const luckCls = gong.lucky === '吉' ? 'luck-ji' : 'luck-xiong';
    return `
      <div class="gong-card ${luckCls}">
        <div class="gong-head">
          <span class="gong-name">${gong.name}</span>
          <span class="gong-role">${role} · ${roleDesc}</span>
          <span class="gong-luck">${gong.lucky}</span>
        </div>
        <p class="gong-jue">${gong.jue}</p>
        <p class="gong-detail"><b>${gong.shen || '本宫'}象义</b>：${gong.shenxiang}</p>
        <details class="gong-more">
          <summary>五行·六神·应期等细节</summary>
          <p class="gong-detail"><b>五行</b>：${gong.wuxing}　<b>六神</b>：${gong.shen || '—'}　<b>阴阳</b>：${gong.yinyang}</p>
          <p class="gong-detail"><b>地支</b>：${gong.dizhi.length ? gong.dizhi.join('、') : '居中'}</p>
          <p class="gong-detail"><b>性情</b>：${gong.xingge}</p>
          <p class="gong-detail"><b>应期</b>：${gong.yingqi}（数字取应期：${gong.num.join('、')}）</p>
        </details>
      </div>`;
  }

  function synthesis(result) {
    const h = result.gongs.hour;
    if (!h) return '';
    const shenDuan = h.shen && X.SHEN_GONG_DUAN[h.shen] && X.SHEN_GONG_DUAN[h.shen][h.name];
    const head = h.shen ? `${h.name}宫${h.shen}临之：` : `${h.name}宫：`;
    return `
      <div class="synth-card">
        <h3>综合断语（以${h.name}宫为自身）</h3>
        <p class="synth-main">${head}${shenDuan || h.shenxiang}</p>
        <p class="synth-sub">${wuxingHint(result)}</p>
        <p class="synth-sub">应期快慢：${h.yingqi}　数字取应期：${h.num.join('、')}</p>
      </div>`;
  }

  /** 五行生克提示（自身宫 vs 日宫） */
  function wuxingHint(result) {
    const h = result.gongs.hour, d = result.gongs.day;
    if (!h || !d || !h.wuxing || !d.wuxing) return '';
    if (X.WUXING_SHENG[h.wuxing] === d.wuxing) return `五行：${h.wuxing}生${d.wuxing}，日宫受生，事有助力`;
    if (X.WUXING_SHENG[d.wuxing] === h.wuxing) return `五行：${d.wuxing}生${h.wuxing}，自身受生，多得帮扶`;
    if (X.WUXING_KE[h.wuxing] === d.wuxing) return `五行：${h.wuxing}克${d.wuxing}，自身克事，主动可控`;
    if (X.WUXING_KE[d.wuxing] === h.wuxing) return `五行：${d.wuxing}克${h.wuxing}，事多压制，宜谨慎`;
    return `五行：${h.wuxing}与${d.wuxing}比和，平稳`;
  }

  /** 进阶断语：六神临六亲（当前时宫六神 × 六亲） */
  function jingjieBlock(result) {
    const h = result.gongs.hour;
    if (!h || !h.shen) return '';
    const rows = X.SHEN_LIUQIN[h.shen] || {};
    const items = Object.entries(rows)
      .map(([k, v]) => `<tr><td>${h.shen}临${k}</td><td>${v}</td></tr>`).join('');
    return `
      <details class="extra-card">
        <summary>进阶断语 · ${h.shen}临六亲（${Object.keys(rows).length} 条）</summary>
        <table class="yongshen-table"><tbody>${items}</tbody></table>
      </details>`;
  }

  function yongshenBlock() {
    const rows = X.YONGSHEN.map(y =>
      `<tr><td>${y.shi}</td><td>${y.shen}</td><td>${y.note}</td></tr>`).join('');
    return `
      <details class="extra-card">
        <summary>六亲用神取用总纲（进阶参考）</summary>
        <table class="yongshen-table">
          <thead><tr><th>所问之事</th><th>用神</th><th>注意</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </details>`;
  }

  /** 所问 · 用神解读块 */
  function askBlock(ask, result) {
    if (!ask) return '';
    const h = result.gongs.hour;
    const ys = ask.yongshen;
    let body = '';
    if (ys && ys !== '自身' && h) {
      const duan = X.SHEN_LIUQIN[h.shen] && X.SHEN_LIUQIN[h.shen][ys];
      const note = X.YONGSHEN.find(y => y.shen === ys);
      body = `<p class="ask-yongshen">用神「${ys}」${duan ? '：' + duan : ''}</p>` +
        (note ? `<p class="ask-note">${note.note}。</p>` : '');
    } else if (ys === '自身' && h) {
      const shenDuan = X.SHEN_GONG_DUAN[h.shen] && X.SHEN_GONG_DUAN[h.shen][h.name];
      body = `<p class="ask-yongshen">以自身落宫（${h.name}宫）为主：${shenDuan || h.shenxiang}</p>` +
        '<p class="ask-note">自身临凶宫、受克则事多阻碍；落吉宫则顺遂。</p>';
    }
    return `
      <div class="ask-card">
        <h3>所问 · ${ask.name}</h3>
        ${body || '<p class="ask-note">以三宫吉凶与应期参断。</p>'}
      </div>`;
  }

  /** 一句话人话总断（结果顶部，通俗易懂） */
  function plainSummary(result, ask) {
    const g = result.gongs;
    const lucks = [g.month, g.day, g.hour].filter(Boolean).map(x => x.lucky);
    const ji = lucks.filter(l => l === '吉').length;
    const xiong = lucks.filter(l => l === '凶').length;
    let overall;
    if (ji === 3) overall = '大吉';
    else if (ji === 2 && xiong === 0) overall = '吉';
    else if (ji === 2) overall = '偏吉（有小波折）';
    else if (ji === 1 && xiong === 0) overall = '平稳';
    else if (ji === 1) overall = '吉凶参半';
    else if (xiong === 3) overall = '凶';
    else if (xiong === 2) overall = '偏凶（需谨慎）';
    else overall = '平平';
    const stage = [];
    if (g.month) stage.push(`开头${g.month.lucky === '吉' ? '较顺' : g.month.lucky === '凶' ? '有阻' : '平平'}（${g.month.name}）`);
    if (g.day) stage.push(`过程${g.day.lucky === '吉' ? '有利' : g.day.lucky === '凶' ? '波折' : '平平'}（${g.day.name}）`);
    if (g.hour) stage.push(`结果${g.hour.lucky === '吉' ? '吉利' : g.hour.lucky === '凶' ? '欠佳' : '平常'}（${g.hour.name}）`);
    const adviceMap = {
      caifu: '宜稳中求进、见好就收，勿贪。', ganqing: '以诚相待、顺其自然，勿强求。',
      shiye: '踏实做事、稳字当头，防口舌小人。', xueye: '专心致志，功夫在平时。',
      jiankang: '注意休息，小病早治，莫拖延。', chuxing: '行程留足余量，注意安全。',
      shiwu: '多在常去之处仔细寻找。', guansi: '以和为贵，避免激化。',
      jiazhai: '家和万事兴，多顾念长辈。', qita: '顺势而为，平常心待之。'
    };
    const advice = adviceMap[ask && ask.key] || '顺势而为，平常心待之。';
    return `
      <div class="summary-card">
        <h3>所问${ask ? ' · ' + ask.name : ''} — 总体：<b class="ovr ${overall.indexOf('凶') >= 0 ? 'ovr-xiong' : overall.indexOf('吉') >= 0 ? 'ovr-ji' : ''}">${overall}</b></h3>
        <p class="summary-stage">${stage.join('，')}</p>
        <p class="summary-advice">💡 建议：${advice}</p>
      </div>`;
  }

  /** 动画结束后渲染结果卡片 */
  function renderCards(result, meta, ask, container) {
    const g = result.gongs;
    let cards = '';
    if (g.month) cards += gongCard(g.month, '初·月', '事情开端');
    if (g.day) cards += gongCard(g.day, '中·日', '事情过程');
    if (g.hour) cards += gongCard(g.hour, '末·时', '事情结果 / 自身');
    if (!g.month && !g.day && !g.hour) cards = '<p class="warn">请至少提供 1 个有效数字。</p>';

    const wrap = document.createElement('div');
    wrap.className = 'result-wrap';
    wrap.innerHTML = `
      ${plainSummary(result, ask)}
      ${askBlock(ask, result)}
      <div class="gong-grid">${cards}</div>
      ${synthesis(result)}
      ${jingjieBlock(result)}
      ${yongshenBlock()}
      <p class="disclaimer">※ 小六壬仅为民俗参考，不可左右现实抉择，修德积善方为根本。</p>`;
    container.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============ 起卦统一入口（手掌动画 → 结果） ============

  let palmCtl = null;
  let busy = false;
  let runId = 0;   // 起卦令牌：旧起卦的异步回调不再渲染

  function startDivination(result, meta, phases, ask, view, ver) {
    if (busy && palmCtl) palmCtl.play.cancel();
    busy = true;
    const myId = ++runId;

    const res = document.getElementById('result-' + view);
    res.innerHTML = `
      <div class="meta">${meta}</div>
      <div id="palm"></div>
      <div class="palm-actions">
        <button class="btn-skip" id="palm-skip">跳过掐指</button>
      </div>`;
    const skipBtn = $('#palm-skip');
    skipBtn.addEventListener('click', () => { if (palmCtl) palmCtl.play.cancel(); });

    palmCtl = window.Palm.create($('#palm'), ver);
    palmCtl.play(phases, { stepMs: 420, landMs: 850 }).then(() => {
      if (myId !== runId) return;   // 已被新一轮起卦取代，丢弃
      busy = false;
      skipBtn.remove();
      renderCards(result, meta, ask, res);
      saveHistory(result, ask, ver, view);
    });
  }

  // ============ 事件绑定 ============

  /** 掌诀版本（六宫/九宫） */
  let version = 'liugong';

  function initVersion() {
    document.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        version = btn.dataset.ver;
      });
    });
  }

  /** 视图切换（首页选择方式 → 对应起卦页） */
  let currentView = 'home';

  /** 进入起卦页时先展示静态掌诀图（起卦后复用同一张图播放动画） */
  function ensureStaticPalm(view) {
    const res = document.getElementById('result-' + view);
    res.innerHTML = '<div id="palm-static"></div>';
    window.Palm.create(document.getElementById('palm-static'), version);
  }

  function showView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    if (name === 'history') renderHistory();
    else if (name !== 'home') ensureStaticPalm(name);
    window.scrollTo(0, 0);
  }

  // ============ 历史记录（localStorage） ============
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem('xln_history') || '[]'); } catch (e) { return []; }
  }

  function calcOverall(result) {
    const g = result.gongs;
    const lucks = [g.month, g.day, g.hour].filter(Boolean).map(x => x.lucky);
    const ji = lucks.filter(l => l === '吉').length;
    const xiong = lucks.filter(l => l === '凶').length;
    if (ji === 3) return '大吉';
    if (ji === 2 && !xiong) return '吉';
    if (ji === 2) return '偏吉';
    if (ji === 1 && !xiong) return '平稳';
    if (ji === 1) return '吉凶参半';
    if (xiong === 3) return '凶';
    if (xiong === 2) return '偏凶';
    return '平平';
  }

  function saveHistory(result, ask, ver, method) {
    try {
      const h = loadHistory();
      const g = result.gongs;
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      h.unshift({
        ts: d.getTime(),
        timeStr: `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        ask: ask ? ask.name : '—',
        version: ver === 'jiugong' ? '九宫' : '六宫',
        method: { time: '时间', num: '数字', stroke: '写字', inspire: '灵机' }[method] || method,
        gongs: [g.month ? g.month.name + g.month.lucky : '—', g.day ? g.day.name + g.day.lucky : '—', g.hour ? g.hour.name + g.hour.lucky : '—'],
        overall: calcOverall(result),
        hour: g.hour ? g.hour.name : ''
      });
      localStorage.setItem('xln_history', JSON.stringify(h.slice(0, 100)));
    } catch (e) { /* 存储失败忽略 */ }
  }

  function renderHistory() {
    const list = loadHistory();
    const el = $('#history-list');
    if (!list.length) {
      el.innerHTML = '<p class="hint center">暂无记录，先起一卦吧。</p>';
      return;
    }
    el.innerHTML = list.map(item => `
      <div class="hist-item">
        <div class="hist-head">
          <span class="hist-time">${item.timeStr}</span>
          <span class="hist-ask">${item.ask} · ${item.version} · ${item.method}</span>
          <span class="hist-overall">${item.overall}</span>
        </div>
        <p class="hist-gongs">初${item.gongs[0]} → 中${item.gongs[1]} → 末${item.gongs[2]}　落「${item.hour}」</p>
      </div>`).join('');
  }

  function initHistory() {
    $('#clear-history').addEventListener('click', () => {
      if (confirm('确定清空全部历史记录？')) {
        localStorage.removeItem('xln_history');
        renderHistory();
      }
    });
  }

  // ============ 命盘排盘 ============
  let panGender = '男';

  function initPaipanTab() {
    const now = new Date();
    const ySel = $('#p-year'), mSel = $('#p-month'), dSel = $('#p-day');
    const curY = now.getFullYear();
    let yOpts = '';
    for (let y = curY - 80; y <= curY - 10; y++) yOpts += `<option value="${y}">${y}年</option>`;
    ySel.innerHTML = yOpts;
    ySel.value = String(curY - 30);
    mSel.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}月</option>`);
    mSel.value = '1';
    function fillDays() {
      const days = new Date(Number(ySel.value), Number(mSel.value), 0).getDate();
      let opts = '';
      for (let d = 1; d <= days; d++) opts += `<option value="${d}">${d}日</option>`;
      dSel.innerHTML = opts;
      const cur = Number(dSel.value);
      dSel.value = (cur >= 1 && cur <= days) ? String(cur) : String(days);
    }
    fillDays();
    dSel.value = '1';
    $('#p-hour').innerHTML = X.SHICHEN.map((s, i) =>
      `<option value="${i + 1}">${s.name}时（${s.range}）</option>`).join('');

    function updateLunar() {
      try {
        const lu = L.solar2lunar(Number(ySel.value), Number(mSel.value), Number(dSel.value));
        $('#p-lunar').textContent = `农历${lu.monthCn}${lu.dayCn} · ${lu.yearGz}年（${lu.zodiac}）`;
      } catch (e) { $('#p-lunar').textContent = ''; }
    }
    ySel.addEventListener('change', () => { fillDays(); updateLunar(); });
    mSel.addEventListener('change', () => { fillDays(); updateLunar(); });
    dSel.addEventListener('change', updateLunar);
    updateLunar();

    $('#p-male').addEventListener('click', () => { panGender = '男'; $('#p-male').classList.add('active'); $('#p-female').classList.remove('active'); });
    $('#p-female').addEventListener('click', () => { panGender = '女'; $('#p-female').classList.add('active'); $('#p-male').classList.remove('active'); });

    $('#paipan-submit').addEventListener('click', () => {
      try {
        const lu = L.solar2lunar(Number(ySel.value), Number(mSel.value), Number(dSel.value));
        const hourSeq = Number($('#p-hour').value);
        const age = Math.max(0, Math.min(120, Number($('#p-age').value) || 25));
        const pan = window.PaiPan.buildPan(lu, hourSeq);
        renderPan(pan, lu, hourSeq, age);
      } catch (e) { alert(e.message); }
    });
  }

  function renderPan(pan, lu, hourSeq, age) {
    const head = `${lu.solarY}年${lu.solarM}月${lu.solarD}日 · 农历${lu.monthCn}${lu.dayCn} · ${pan.shichenName}时生 · ${panGender} · 自身五行${pan.selfWx}`;
    const panRows = pan.gongs.map((g, i) => {
      const wx = window.PaiPan.DIZHI_WX[g.d1];
      return `<tr>
        <td>${g.gong.name}</td>
        <td>${g.d1}${g.d2}</td>
        <td>${wx}</td>
        <td>${pan.liuqinOf(wx)}</td>
        <td>${pan.shens[i]}</td>
        <td>${pan.wuxingStar[i]}</td>
      </tr>`;
    }).join('');
    const dayunRows = pan.dayun.map(d => `
      <tr><td>${d.age}岁</td><td>${d.gong.name}</td><td>${d.gong.lucky}</td><td>${d.gong.jue}</td></tr>`).join('');
    const ln = pan.liunian(age);
    const monthNames = ln.months.map(m => m.name).join('、');

    const el = $('#result-paipan');
    el.innerHTML = `
      <div class="meta">${head}</div>
      <div class="summary-card">
        <h3>本命盘 · 落时宫「${pan.hourGong.name}」</h3>
        <p class="summary-stage">月宫${pan.monGong.name} · 日宫${pan.dayGong.name} · 自身（时宫）${pan.hourGong.name}</p>
      </div>
      <table class="paipan-table">
        <thead><tr><th>宫位</th><th>地支</th><th>五行</th><th>六亲</th><th>六神</th><th>五星</th></tr></thead>
        <tbody>${panRows}</tbody>
      </table>
      <h4 class="pan-title">大运（每十年一宫）</h4>
      <table class="paipan-table">
        <thead><tr><th>年龄</th><th>宫位</th><th>吉凶</th><th>断语</th></tr></thead>
        <tbody>${dayunRows}</tbody>
      </table>
      <h4 class="pan-title">流年 · ${age}岁</h4>
      <p class="pan-liunian">${age}岁流年落「${ln.gong.name}」宫（${ln.gong.lucky}）</p>
      <p class="pan-liunian">流月：正月${monthNames}</p>
      <details class="extra-card">
        <summary>六亲古法取象（江春义）</summary>
        ${window.PaiPan.LIUQIN_GUFA.map(t => `<p class="gong-detail">${t}</p>`).join('')}
      </details>
      <p class="disclaimer">※ 命盘仅为民俗参考，不可左右现实抉择。</p>`;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============ 灵机起卦（物象/声音 · 即时取数） ============
  function initInspireTab() {
    $('#inspire-submit').addEventListener('click', () => {
      const d = new Date();
      const nums = [d.getSeconds() % 9 + 1, d.getMinutes() % 9 + 1, d.getHours() % 9 + 1];
      const note = $('#inspire-input').value.trim();
      const r = byNumbers(nums, version);
      const meta = `此刻${d.getHours()}时${d.getMinutes()}分${d.getSeconds()}秒 · 灵机取数 ${nums.join('、')}${note ? ' · 见闻：' + note : ''}`;
      const labels = ['第一数', '第二数', '第三数'];
      startDivination(r, meta, phasesForNums(nums, labels, version), currentAsk(), 'inspire', version);
    });
  }

  function initViews() {
    document.querySelectorAll('[data-view]').forEach(card => {
      card.addEventListener('click', () => showView(card.dataset.view));
    });
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.back));
    });
  }

  /** 所问何事选择器 */
  function initAsk() {
    $('#ask-select').innerHTML = X.ASKS.map(a =>
      `<option value="${a.key}">${a.name}</option>`).join('');
  }

  function currentAsk() {
    const key = $('#ask-select').value;
    return X.ASKS.find(a => a.key === key) || null;
  }

  function initTimeTab() {
    const now = new Date();
    const ySel = $('#year-select'), mSel = $('#month-select'), dSel = $('#day-select');
    let touched = false;   // 用户是否手动改过日期

    // 年（当前年前 60 年 ~ 后 40 年）
    const curY = now.getFullYear();
    let yOpts = '';
    for (let y = curY - 60; y <= curY + 40; y++) yOpts += `<option value="${y}">${y}年</option>`;
    ySel.innerHTML = yOpts;
    ySel.value = String(curY);

    // 月
    mSel.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}月</option>`);
    mSel.value = String(now.getMonth() + 1);

    // 日（按当月天数填充）
    function fillDays() {
      const y = Number(ySel.value), m = Number(mSel.value);
      const days = new Date(y, m, 0).getDate();
      let opts = '';
      for (let d = 1; d <= days; d++) opts += `<option value="${d}">${d}日</option>`;
      dSel.innerHTML = opts;
      const cur = Number(dSel.value);
      dSel.value = (cur >= 1 && cur <= days) ? String(cur) : String(days);
    }
    fillDays();
    dSel.value = String(now.getDate());

    // 时辰
    $('#hour-select').innerHTML = X.SHICHEN.map((s, i) =>
      `<option value="${i + 1}">${s.name}时（${s.range}）</option>`).join('');
    $('#hour-select').value = String(hourSeqFromDate(now));

    // 农历预览
    function updatePreview() {
      try {
        const lu = L.solar2lunar(Number(ySel.value), Number(mSel.value), Number(dSel.value));
        $('#lunar-preview').textContent = `${lu.yearGz}年（${lu.zodiac}）· 农历${lu.monthCn}${lu.dayCn}`;
      } catch (e) {
        $('#lunar-preview').textContent = '';
      }
    }

    ySel.addEventListener('change', () => { touched = true; fillDays(); updatePreview(); });
    mSel.addEventListener('change', () => { touched = true; fillDays(); updatePreview(); });
    dSel.addEventListener('change', () => { touched = true; updatePreview(); });

    // 未手动改过 → 每次起卦前刷新为当天
    function ensureToday() {
      if (touched) return;
      const t = new Date();
      ySel.value = String(t.getFullYear());
      mSel.value = String(t.getMonth() + 1);
      fillDays();
      dSel.value = String(t.getDate());
      updatePreview();
    }
    updatePreview();

    $('#time-submit').addEventListener('click', () => {
      ensureToday();
      const y = Number(ySel.value), m = Number(mSel.value), d = Number(dSel.value);
      const hourSeq = Number($('#hour-select').value);
      try {
        const r = byTime(y, m, d, hourSeq, version);
        const lu = r.lunar;
        const meta = `${lu.solarY}年${lu.solarM}月${lu.solarD}日 · ${lu.yearGz}年（${lu.zodiac}）· 农历${lu.monthCn}${lu.dayCn} · ${X.SHICHEN[hourSeq - 1].name}时（${X.SHICHEN[hourSeq - 1].range}）`;
        const phases = phasesForTime(r.gongs.month, r.gongs.day, hourSeq, lu);
        startDivination(r, meta, phases, currentAsk(), 'time', version);
      } catch (e) {
        alert(e.message);
      }
    });
  }

  function initNumTab() {
    $('#num-submit').addEventListener('click', () => {
      const raw = $('#num-input').value.trim();
      if (!raw) { alert('请报 1-3 个数字，用空格或逗号隔开'); return; }
      const nums = raw.split(/[\s,，、]+/).map(Number);
      if (nums.some(n => !isFinite(n) || n <= 0)) { alert('请输入正整数'); return; }
      if (nums.length > 3) { alert('最多报 3 个数字'); return; }
      const r = byNumbers(nums, version);
      const roles = nums.length === 1 ? '（定末宫·自身）' : nums.length === 2 ? '（依次对应初宫、末宫）' : '（依次对应初、中、末三宫）';
      const meta = `所报数字：${nums.join('、')}${roles}`;
      const labels = ['第一数', '第二数', '第三数'];
      startDivination(r, meta, phasesForNums(nums, labels, version), currentAsk(), 'num', version);
    });
  }

  function initStrokeTab() {
    $('#stroke-submit').addEventListener('click', () => {
      const raw = $('#stroke-input').value.trim();
      if (!raw) { alert('请输入 1-3 个汉字'); return; }
      const chars = Array.from(raw);
      if (chars.length > 3) { alert('最多 3 个字'); return; }
      const missing = [];
      const strokes = chars.map(c => {
        const s = STROKE[c];
        if (!s) missing.push(c);
        return s;
      });
      if (missing.length) {
        alert(`暂未收录以下字的笔画：${missing.join('、')}\n请改用「报数字」方式，或换常用字。`);
        return;
      }
      const r = byStrokes(strokes);
      const roles = strokes.length === 1 ? '（定末宫·自身）' : strokes.length === 2 ? '（依次对应初宫、末宫）' : '（依次对应初、中、末三宫）';
      const meta = `所写字：${chars.join('')}，笔画 ${strokes.join('、')}${roles}`;
      const labels = ['第一字', '第二字', '第三字'];
      startDivination(r, meta, phasesForNums(strokes, labels, version), currentAsk(), 'stroke', version);
    });
  }

  function byStrokes(strokes) { return byNumbers(strokes, version); }

  document.addEventListener('DOMContentLoaded', () => {
    initAsk();
    initVersion();
    initViews();
    initTimeTab();
    initNumTab();
    initStrokeTab();
    initInspireTab();
    initHistory();
    initPaipanTab();
  });
})();
