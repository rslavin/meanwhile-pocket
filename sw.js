// Keeps the phone app working offline, and through an update.
// Pages are asked for fresh every time, with the last good copy for when there is no network.
// The built files under assets/ carry their contents in their names, so one fetched once is right
// for ever: it is served from here first. That matters during an update: a page a moment out of
// date still asks for the old files, and the server has already thrown them away.
const CACHE = 'meanwhile-pocket-v3';
/** Built files kept: this build's and a few before it. */
const KEEP = 16;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
);

const built = (url) => /\/assets\//.test(new URL(url).pathname);

/** Keep a good answer. A "not found" is never kept: it would be served again long after the file exists. */
async function keep(req, res) {
  if (!res.ok) return;
  const cache = await caches.open(CACHE);
  await cache.put(req, res);
  if (!built(req.url)) return;
  const old = (await cache.keys()).filter((k) => built(k.url));
  for (const k of old.slice(0, Math.max(0, old.length - KEEP))) await cache.delete(k);
}

async function fresh(req) {
  // Always ask the server whether there is something newer, rather than trusting the browser's own copy.
  const res = await fetch(req, { cache: 'no-cache' });
  keep(req, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (built(req.url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fresh(req)));
    return;
  }
  e.respondWith(
    fresh(req).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : undefined) || Response.error())),
  );
});
