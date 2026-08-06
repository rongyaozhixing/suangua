// 本地预览服务器：node server.js  →  http://localhost:8080
// 含「算我的命 · AI 深度解读」代理端点（真题 few-shot + agnes 大模型）
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ---- AI 深度解读（真题知识 + agnes） ----
const AGNES = loadJson(path.join(os.homedir(), '.agnes.json'));
let BENCH = [];
try {
  // 命理真题（MingLi-Bench），作为专业命理判断的参考范例
  const benchPath = path.join('E:/reasonix/computer use/MingLi-Bench', 'data', 'data.json');
  BENCH = JSON.parse(fs.readFileSync(benchPath, 'utf-8')).questions || [];
} catch (e) { BENCH = []; }

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch (e) { return null; }
}

// 精选 few-shot 范例：每类取 1-2 题（覆盖 12 类）
function fewShotSamples(limit) {
  if (!BENCH.length) return [];
  const byCat = {};
  BENCH.forEach(q => { (byCat[q.category] = byCat[q.category] || []).push(q); });
  const out = [];
  Object.keys(byCat).forEach(cat => {
    byCat[cat].slice(0, 1).forEach(q => out.push(q));
  });
  return out.slice(0, limit || 12);
}

async function aiFortune(birth) {
  const { year, month, day, hour, gender } = birth;
  // 本地引擎排准确四柱（避免 AI 自排盘出错）
  let pillars = null, dayWx = '';
  try {
    const L = require('./js/lunar.js');
    const lu = L.solar2lunar(year, month, day);
    require('./js/fortune-read.js');
    const b = global.Fortune.bazi(lu, hour);
    pillars = b.pillars;
    dayWx = b.dayWx;
  } catch (e) { /* AI 自排盘兜底 */ }
  const samples = fewShotSamples(12);
  const fewshot = samples.map(q => {
    const opts = q.options.map(o => `${o.letter}. ${o.text}`).join('　');
    return `【命例】${q.birth_info.raw}\n问：${q.question}\n选项：${opts}\n命师断：${q.answer}`;
  }).join('\n\n');

  const system = `你是精通子平八字与传统命理的名师。下面是一些全球命理师大赛真题案例（命例+问题+正确答案），请学习其中的命理判断逻辑（五行生克、十神喜忌、旺衰用神、岁运作用）。\n\n${fewshot}\n\n现在请为求测者排盘并逐项解读。只输出 JSON 数组，格式：[{"name":"性格","judge":"吉/平/需注意","text":"解读"}...]，共 12 项：性格、事业、财运、婚姻、家庭、学业、子女、健康、外貌、运势、官非、灾劫。解读要具体结合其四柱五行十神，参考上述真题案例的断法，避免空泛套话。不要输出除 JSON 之外的任何文字。`;
  const user = `求测者：${gender}命，公历 ${year}年${month}月${day}日 时辰序号${hour}（1子2丑3寅4卯5辰6巳7午8未9申10酉11戌12亥）。${pillars ? `其四柱八字为：${pillars.年} ${pillars.月} ${pillars.日} ${pillars.时}（日主${dayWx}）。请严格以此四柱为准解读，不要重新排盘。` : '请自行排盘。'}解读。`;
  if (!AGNES || !AGNES.api_key) return { error: '未配置 agnes key' };
  const body = {
    model: 'agnes-2.5-pro',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.3,
    max_tokens: 8192
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const resp = await fetch(AGNES.base_url + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AGNES.api_key },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return { error: 'AI 服务返回 ' + resp.status };
    const data = await resp.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    const content = (msg && msg.content) || '';
    const reasoning = (msg && msg.reasoning_content) || '';
    const text = content || reasoning || '';
    // 提取 JSON 数组：找最后一个完整 [ { ... } ] 段（思考过程中可能也出现方括号）
    const m = text.match(/\[\s*\{\s*"name"[\s\S]*?\}\s*\]/g);
    if (m) {
      const last = m[m.length - 1];
      try {
        const items = JSON.parse(last);
        if (Array.isArray(items) && items.length) return { items };
      } catch (e) { /* 继续尝试原样返回 */ }
    }
    return { text: (content || text).slice(0, 6000) };
  } catch (e) {
    clearTimeout(timer);
    return { error: 'AI 请求失败：' + e.message };
  }
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // AI 深度解读端点
  if (urlPath === '/api/fortune-ai' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', async () => {
      try {
        const birth = JSON.parse(raw || '{}');
        const result = await aiFortune(birth);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('小六壬占 预览: http://localhost:' + PORT);
  console.log('AI 深度解读端点: POST /api/fortune-ai' + (AGNES ? '（agnes 已配置）' : '（未配置 agnes）'));
});
