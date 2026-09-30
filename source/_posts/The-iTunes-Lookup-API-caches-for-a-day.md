---
title: The iTunes Lookup API caches for a day, and a query param fixes it
date: 2026-09-30 18:00:00
tags: [app-store, api, hexo]
categories:
---
The [apps page](/apps/) on this site is built from Apple's public iTunes Lookup API when the site deploys. That's one request, no key, and JSON back. The catch: the response sits behind Akamai with a one-day cache, so a new release can take up to a day to show up. <!-- more -->

## The request

Every app from one developer account:

~~~
https://itunes.apple.com/lookup?id=1557125814&entity=software&limit=200
~~~

`id` is the developer (artist) ID from your App Store URL. `entity=software` returns the apps as well as the developer record, and `limit=200` raises the default page size. Each result has the name, icon, screenshots, version, genre, minimum OS and release dates. That covers a portfolio page.

## The cache

Check the headers:

~~~
$ curl -sD - -o /dev/null "https://itunes.apple.com/lookup?id=1557125814&entity=software&limit=200" | grep -iE "cache"
cache-control: max-age=86400
x-cache: TCP_MISS from a23-219-204-163.deploy.akamaitechnologies.com ...
~~~

Run the same request again a few seconds later:

~~~
cache-control: max-age=86394
x-cache: TCP_HIT from a23-219-204-163.deploy.akamaitechnologies.com ...
~~~

`max-age=86400` is 24 hours, and the second request is a `TCP_HIT`: the edge node answered and Apple's servers never saw it. That's fine for an app page that changes once a month. It's not fine when you ship an app in the morning and deploy the site right after, because the build can get the list from before the release. BaliSurf went live the same day I wrote this script, so I needed the fix straight away.

## The fix

Akamai keys the cache on the full URL, query string included, and the Lookup API ignores parameters it doesn't know. So add one that's different on every request:

~~~js
const URL_ =
  `https://itunes.apple.com/lookup?id=1557125814&entity=software&limit=200&_=${Date.now()}`;
~~~

Every deploy is now a cache miss and gets the current list from Apple.

## The rest of the script

It's about 50 lines of Node with no dependencies (built-in `fetch`), and it runs in the GitHub Actions workflow before `hexo generate`. It writes `source/_data/apps.json`, and Hexo templates read that as `site.data.apps`. Three details worth copying:

- **Never fail the build.** The JSON file is committed. If Apple is down or the response looks wrong (no apps, an app with no screenshots), the script logs the error, keeps the committed file and exits 0. The site deploys anyway with slightly older data.
- **Smaller screenshots.** Lookup returns fixed-size thumbnails like `.../392x696bb.jpg`. Apple's image CDN reads the size from the last path segment, so replacing it with `480x0w.webp` gives a 480px-wide WebP with the same aspect ratio. That change fixed the mobile LCP on the home page.
- **Clean store links.** `trackViewUrl` ends with an affiliate-style `?uo=4`. Strip it.

~~~js
const shot = (u) => u.replace(/\/[^/]+$/, '/480x0w.webp');
const url = r.trackViewUrl.replace(/\?uo=\d+$/, '');
~~~

That's all of it: one public endpoint, one cache-busting parameter, and a committed fallback file.
