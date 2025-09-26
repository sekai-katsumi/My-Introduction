self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('webar-cache-v1').then((cache) => {
        return cache.addAll([
            '/',
            '/index.html',
            '/css/style.css',
            '/js/video/videoPlayer.js',
            '/assets/videos/video-01.mp4',
            '/assets/images/icon-192.png'
        ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
        return response || fetch(event.request);
        })
    );
});
