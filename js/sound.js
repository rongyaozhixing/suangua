/**
 * sound.js — 占卜音效（Web Audio 合成，无外部音频文件，断网可用）
 * tap()  掐指落宫：短促木鱼声
 * chime() 起卦完成：清亮叮声
 */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;

  function init() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* 不支持则静默 */ }
    }
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) { /* 忽略 */ }
    }
  }

  /** 落宫木鱼声 */
  function tap() {
    if (!enabled || !ctx) return;
    try {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(230, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.07);
      g.gain.setValueAtTime(0.85, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.12);
    } catch (e) { /* 忽略 */ }
  }

  /** 起卦完成叮声（双音） */
  function chime() {
    if (!enabled || !ctx) return;
    try {
      const t = ctx.currentTime;
      [660, 990, 1320].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const s = t + i * 0.06;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.22, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.8);
        o.connect(g); g.connect(ctx.destination);
        o.start(s); o.stop(s + 0.85);
      });
    } catch (e) { /* 忽略 */ }
  }

  function setEnabled(v) { enabled = !!v; if (enabled) init(); }
  function isEnabled() { return enabled; }
  function unlock() { init(); }

  global.Sound = { tap: tap, chime: chime, setEnabled: setEnabled, isEnabled: isEnabled, unlock: unlock };
})(typeof window !== 'undefined' ? window : globalThis);
