/**
 * service-worker.js — 小六壬占 离线缓存 + 新版本提示
 * 版本号修改处：BUILD_VER。改动内容后务必递增版本并更新缓存。
 */
const BUILD_VER = '1.0.5';
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
  './js/strokes-data.js',
  './js/paipan.js',
  './assets/hand-left-clean.jpg',
  './assets/jiugong-ref.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
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

  // 页面走网络优先（保证打开即最新）；静态资源缓存优先（快、省流量）
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
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const isImage = /\.(jpe?g|png|gif|webp|svg|ico)(\?|$)/i.test(url.pathname);
      if (isImage) {
        // 图片走网络优先（保证拿到最新图），失败回退缓存
        return fetch(e.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => hit);
      }
      // 其他静态资源缓存优先
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

// 新版本就绪 → 通知页面
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
