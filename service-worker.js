/**
 * service-worker.js — 小六壬占 离线缓存（自动跟随版本）
 * 说明：每次发版后此文件内容变化（含 BUILD_VER 指纹），浏览器检测到字节变化即更新 SW。
 */
const BUILD_VER = '1.2.3';
const CACHE_NAME = 'xln-cache-' + BUILD_VER;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/palm.js',
  './js/lunar.js',
  './js/xiaoliuren.js',
  './js/zhouyi.js',
  './js/huangli.js',
  './js/sound.js',
  './js/strokes-data.js',
  './js/paipan.js',
  './assets/palm-base.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(PRECACHE))
      // addAll 单个失败不阻塞安装（缺图仍可运行，激活时清理旧缓存）
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // 页面走网络优先（保证打开即最新）
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match('./')))
    );
    return;
  }
  // 静态资源：网络优先（保证最新），失败回退缓存（离线可用）
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((m) => m))
  );
});

// 新版本就绪 → 通知页面
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
