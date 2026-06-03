# chiliec.github.io
Personal site on GitHub Pages (served at `chiliec.github.io`). Built with **Hexo 8** — NOT Jekyll (workflow name is misleading).

## Commands
```bash
npm run server  # hexo server → localhost:4000
npm run build   # hexo generate → ./public
npm run clean   # wipe ./public + db.json (run after layout/config changes)
npm run update  # bump deps via npm-check-updates
```
No tests, linter, or formatter.

## Deployment (`.github/workflows/jekyll-gh-pages.yml`)
On push to `master`:
1. `npm install && npm run build` → Hexo writes site to `./public`
2. `rendercv render Vladimir_Babin_CV.yaml` (inside `source/cv/`) → copies output to `public/cv/`. **CV rendered at deploy time, not by Hexo.** Edit `source/cv/Vladimir_Babin_CV.yaml` to update the published CV.
3. `./resources/` copied directly into `./public/` — bypasses Hexo rendering. Put static assets here.
4. Deploys via `actions/deploy-pages` → served at `chiliec.github.io` (no custom domain / CNAME).

When adding a top-level static asset: choose `source/` (Hexo page), `resources/` (passthrough), or `source/cv/` (CV-related).

## Content layout
- `source/_posts/` — blog posts in Markdown. Cyrillic filenames OK. Permalink: `post/:title/`.
- `source/` non-posts → standalone pages
- `scaffolds/` — templates for `hexo new <layout> <title>`
- `public/` — gitignored build output; `db.json` — gitignored Hexo cache
- `_config.yml` — `language: ru`, `permalink: post/:title/`, theme `landscape`, sitemap generator
