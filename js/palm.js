/**
 * palm.js — 左手掌掐指动画（小六壬 六宫/九宫 掌诀 · 照片版）
 * 手底：干净左手掌黑白水墨照片（Pixabay 掌纹素材，无文字），穴位由代码动态标注。
 * 六宫：食指根大安 / 食指尖留连 / 中指尖速喜 / 无名指尖赤口 / 无名指根小吉 / 中指根空亡
 * 九宫：六宫 + 桃花(食中缝) / 病符(中无名缝) / 天德(无名小指缝)
 * 掐指：墨点游走点穴（五行流转），外圈八卦环运转；穴位文字只在掐到/落宫时显示
 */
(function (global) {
  'use strict';

  const NAMES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡']; // seq 1-6
  // 六宫穴位（palm-base.png 百分比：左手掌心朝上，拇指在右 → 食指在最右、无名指在左）
  // 顺序数数：大安(食指根)→留连(食指尖)→速喜(中指尖)→赤口(无名指尖)→小吉(无名指根)→空亡(中指根)
  const POS6 = {
    '大安': [62, 35], '留连': [65, 12], '速喜': [50, 10],
    '赤口': [35, 12], '小吉': [38, 35], '空亡': [50, 33]
  };
  // 九宫穴位（每指 尖/中/根 三档：食指=留连/大安/桃花，中指=速喜/空亡/小吉，无名指=病符/赤口/天德）
  const POS9 = {
    '留连': [65, 12], '大安': [62, 24], '桃花': [62, 36],
    '速喜': [50, 10], '空亡': [50, 22], '小吉': [50, 34],
    '病符': [35, 12], '赤口': [38, 24], '天德': [38, 36]
  };
  const nextSeq6 = s => (s % 6) + 1;
  const nextSeq9 = s => (s % 9) + 1;

  // 八卦环（8 卦名，半径 46）
  const BAGUA = [['乾', 50, 4], ['兑', 82.5, 17.5], ['离', 96, 50], ['震', 82.5, 82.5],
    ['巽', 50, 96], ['坎', 17.5, 82.5], ['艮', 4, 50], ['坤', 17.5, 17.5]];

  function spotsHTML(pos, names) {
    return names.map((n, i) => {
      const [x, y] = pos[n];
      return `<div class="spot" data-seq="${i + 1}" style="left:${x}%;top:${y}%">
        <span class="spot-halo"></span>
        <span class="spot-core"></span>
        <span class="spot-text">${n}</span>
      </div>`;
    }).join('');
  }

  function ringsSVG() {
    const bg = BAGUA.map(([n, x, y]) =>
      `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${n}</text>`).join('');
    return `
    <svg class="bagua-overlay" viewBox="0 0 100 100" aria-hidden="true">
      <g class="bagua-ring">${bg}</g>
    </svg>`;
  }

  /**
   * 创建手掌动画控制器
   * @param {HTMLElement} container
   * @param {string} version 'liugong' | 'jiugong'
   */
  function create(container, version) {
    const is9 = version === 'jiugong';
    const pos = is9 ? POS9 : POS6;
    const names = is9 ? NAMES.concat(['病符', '桃花', '天德']) : NAMES;
    const nextSeq = is9 ? nextSeq9 : nextSeq6;
    const photoSrc = 'assets/palm-base.png';   // 六宫/九宫共用干净底图（无文字）

    container.innerHTML = `
      <div class="palm-wrap">
        <div class="palm-steps"></div>
        <div class="palm-photo-box">
          <img class="palm-photo" src="${photoSrc}" alt="左手掌诀">
          <div class="spots-layer">${spotsHTML(pos, names)}</div>
          <div class="cursor-dot"></div>
          ${ringsSVG()}
        </div>
        <p class="palm-counter">心存一念 · 从大安起</p>
        <div class="palm-progress"><i></i></div>
      </div>`;
    const box = container.querySelector('.palm-photo-box');
    const img = container.querySelector('.palm-photo');
    const counter = container.querySelector('.palm-counter');
    const stepsEl = container.querySelector('.palm-steps');
    const progEl = container.querySelector('.palm-progress');
    const spots = [...container.querySelectorAll('.spot')];
    const cursor = container.querySelector('.cursor-dot');

    // 图片加载失败 → 降级为文字版掌诀，保证功能可用
    img.onerror = function () {
      this.style.display = 'none';
      const layer = container.querySelector('.spots-layer');
      const ring = container.querySelector('.rings-layer');
      if (layer) layer.style.display = 'none';
      if (ring) ring.style.display = 'none';
      if (box && !box.querySelector('.palm-fallback')) {
        const fb = document.createElement('div');
        fb.className = 'palm-fallback';
        fb.textContent = is9
          ? '九宫掌诀：食指 留连·大安·桃花 ／ 中指 速喜·空亡·小吉 ／ 无名指 病符·赤口·天德'
          : '六宫掌诀：食指根大安 · 食指尖留连 · 中指尖速喜 · 无名指尖赤口 · 无名指根小吉 · 中指根空亡';
        box.insertBefore(fb, box.firstChild);
      }
    };

    let timers = [];
    let currentSeq = 1;
    let cursorShown = false;

    function clearTimers() {
      timers.forEach(t => clearTimeout(t));
      timers = [];
    }

    /** 墨点移到穴位（百分比） */
    function moveCursor(x, y) {
      cursor.style.left = x + '%';
      cursor.style.top = y + '%';
      if (!cursorShown) {
        cursorShown = true;
        cursor.classList.add('show');
      }
    }

    function setActive(seq, land) {
      currentSeq = seq;
      spots.forEach((s, i) => {
        s.classList.toggle('active', i === seq - 1);
        if (land) s.classList.toggle('land', i === seq - 1);
      });
      const [x, y] = pos[names[seq - 1]];
      moveCursor(x, y);
    }

    function setPhaseText(t) {
      if (t !== null && t !== undefined) counter.textContent = t;
    }

    /** 播放掐指动画。phases: [{label, startSeq, count, display}] */
    function play(phases, opts) {
      const o = Object.assign({ stepMs: 420, landMs: 850 }, opts);
      clearTimers();
      spots.forEach(s => s.classList.remove('active', 'land'));
      cursorShown = false;
      cursor.classList.remove('show');
      counter.classList.remove('land');
      // 阶段引导条（月宫 → 日宫 → 时宫）
      stepsEl.innerHTML = phases.map((p, i) =>
        `<span class="pstep">${p.label}</span>`).join('');
      const psteps = [...stepsEl.children];
      function markStep(i) {
        psteps.forEach((s, j) => s.classList.toggle('active', j === i));
      }
      function setProgress(i) {
        progEl.querySelector('i').style.width = (phases.length === 1 ? 100 : (i / (phases.length - 1)) * 100) + '%';
      }
      setProgress(0);
      setPhaseText('心存一念 · 从大安起');
      // 掐指开始：八卦环加速运转
      const wrap = container.querySelector('.palm-wrap');
      wrap.classList.add('run');

      return new Promise(resolve => {
        let timer = null;

        function runPhase(idx) {
          const ph = phases[idx];
          if (!ph) { finish(); return; }
          setActive(ph.startSeq, false);
          markStep(idx);
          setProgress(idx);
          const steps = (ph.count - 1) % (is9 ? 9 : 6);
          const full = ph.count;
          setPhaseText(`${ph.label} · ${ph.display ? ph.display(1) : '1'}`);
          let remaining = steps;

          const stepFn = () => {
            if (remaining <= 0) {
              timer = setTimeout(() => { runPhase(idx + 1); }, o.stepMs + 130);
              return;
            }
            remaining--;
            setActive(nextSeq(currentSeq), false);
            if (globalThis.Sound) Sound.tap();          // 掐指落宫音
            const shown = Math.round(1 + (full - 1) * (steps - remaining) / steps);
            setPhaseText(`${ph.label} · ${ph.display ? ph.display(shown) : shown}`);
            timer = setTimeout(stepFn, o.stepMs);
          };
          timer = setTimeout(stepFn, o.stepMs);
        }

        function finish() {
          const last = phases[phases.length - 1];
          const finalSeq = ((last.startSeq + last.count - 2) % (is9 ? 9 : 6)) + 1;
          setActive(finalSeq, true);
          markStep(phases.length - 1);
          setProgress(phases.length - 1);
          counter.classList.add('land');
          setPhaseText(`落于「${names[finalSeq - 1]}」`);
          if (globalThis.Sound) Sound.chime();          // 起卦完成音
          timer = setTimeout(() => {
            wrap.classList.remove('run');
            resolve();
          }, o.landMs);
        }

        runPhase(0);

        const cancelFn = () => {
          clearTimers();
          const last = phases[phases.length - 1];
          const finalSeq = ((last.startSeq + last.count - 2) % (is9 ? 9 : 6)) + 1;
          setActive(finalSeq, true);
          markStep(phases.length - 1);
          setProgress(phases.length - 1);
          counter.classList.add('land');
          setPhaseText(`落于「${names[finalSeq - 1]}」`);
          wrap.classList.remove('run');
          resolve();
        };
        play._cancel = cancelFn;
      });
    }

    play.cancel = () => { if (play._cancel) play._cancel(); };
    return { el: container, play, setPhaseText };
  }

  global.Palm = { create, NAMES, POS6, POS9 };
})(typeof window !== 'undefined' ? window : globalThis);
