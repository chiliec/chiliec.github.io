#!/usr/bin/env node
// Fetches the App Store listing for developer 1557125814 and writes
// source/_data/apps.json. Never fails the build: on any error it keeps the
// committed file and exits 0.
const fs = require('node:fs');
const path = require('node:path');

// Akamai caches the lookup for a day, so a fixed URL can return a stale list
// that omits an app released since. The timestamp forces a cache miss.
const URL_ =
  process.env.APPS_LOOKUP_URL ||
  `https://itunes.apple.com/lookup?id=1557125814&entity=software&limit=200&_=${Date.now()}`;
const OUT = path.join(__dirname, '..', 'source', '_data', 'apps.json');

const day = (iso) => (iso || '').slice(0, 10);

async function main() {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { results = [] } = await res.json();
  const apps = results
    .filter((r) => r.wrapperType === 'software')
    .map((r) => ({
      id: r.trackId,
      name: r.trackName,
      url: r.trackViewUrl.replace(/\?uo=\d+$/, ''),
      icon: r.artworkUrl512 || r.artworkUrl100,
      tagline: (r.description || '').split('\n')[0].trim(),
      genre: r.primaryGenreName,
      minOS: r.minimumOsVersion,
      version: r.version,
      released: day(r.releaseDate),
      updated: day(r.currentVersionReleaseDate),
    }))
    .sort((a, b) => (a.released < b.released ? 1 : -1));
  if (apps.length === 0) throw new Error('no software records');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(apps, null, 2) + '\n');
  console.log(`fetch-apps: wrote ${apps.length} apps to ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(`fetch-apps: ${err.message}, keeping committed apps.json`);
});
