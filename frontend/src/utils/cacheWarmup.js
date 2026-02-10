const SESSION_KEY = 'daycare:precache:warmed:v1';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function onIdle(task) {
  if (typeof window === 'undefined') return;
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout: 3000 });
    return;
  }
  window.setTimeout(task, 300);
}

function withBase(path) {
  return new URL(path, window.location.origin).toString();
}

function injectPreconnect(origin) {
  if (typeof document === 'undefined') return;

  const safeId = origin.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const dnsId = `dns-${safeId}`;
  const preId = `pre-${safeId}`;

  if (!document.getElementById(dnsId)) {
    const dns = document.createElement('link');
    dns.id = dnsId;
    dns.rel = 'dns-prefetch';
    dns.href = origin;
    document.head.appendChild(dns);
  }

  if (!document.getElementById(preId)) {
    const pre = document.createElement('link');
    pre.id = preId;
    pre.rel = 'preconnect';
    pre.href = origin;
    pre.crossOrigin = 'anonymous';
    document.head.appendChild(pre);
  }
}

function warmSubdomains() {
  const { hostname, protocol } = window.location;
  if (LOCAL_HOSTS.has(hostname)) return;

  const baseHost = hostname
    .replace(/^www\./, '')
    .replace(/^portal\./, '')
    .replace(/^firefly\./, '');

  const targets = [
    `${protocol}//www.${baseHost}`,
    `${protocol}//firefly.${baseHost}`,
  ].filter((origin) => origin !== window.location.origin);

  targets.forEach((origin) => {
    injectPreconnect(origin);
    // Best effort connection warmup only; cross-origin caching is browser-controlled.
    fetch(`${origin}/`, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(() => {});
  });
}

async function getBuildAssets() {
  const response = await fetch('/asset-manifest.json', { cache: 'no-cache' });
  if (!response.ok) return [];
  const manifest = await response.json();

  const fromFiles = Object.values(manifest.files || {});
  const fromEntrypoints = Array.isArray(manifest.entrypoints) ? manifest.entrypoints : [];

  return [...new Set([...fromFiles, ...fromEntrypoints])]
    .filter((value) => typeof value === 'string')
    .filter((value) => value.startsWith('/'));
}

async function getStaticAssets() {
  const response = await fetch('/precache-manifest.json', { cache: 'no-cache' });
  if (!response.ok) return [];
  const manifest = await response.json();
  if (!Array.isArray(manifest.assets)) return [];
  return manifest.assets.filter((value) => typeof value === 'string' && value.startsWith('/'));
}

async function warmAssets() {
  const [buildAssets, staticAssets] = await Promise.all([
    getBuildAssets().catch(() => []),
    getStaticAssets().catch(() => []),
  ]);

  const queue = [...new Set([...buildAssets, ...staticAssets])];
  const batchSize = 6;

  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    await Promise.all(
      batch.map((path) =>
        fetch(withBase(path), {
          method: 'GET',
          cache: 'force-cache',
          credentials: 'same-origin',
        }).catch(() => {})
      )
    );
  }
}

export function warmBrowserCache() {
  if (typeof window === 'undefined') return;
  if (window.sessionStorage.getItem(SESSION_KEY) === '1') return;

  window.sessionStorage.setItem(SESSION_KEY, '1');

  onIdle(() => {
    warmSubdomains();
    warmAssets().catch(() => {});
  });
}

