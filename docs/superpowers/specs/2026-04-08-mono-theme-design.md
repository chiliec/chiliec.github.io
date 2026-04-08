# Mono Theme — Design Spec

**Date:** 2026-04-08
**Status:** Approved, ready for implementation plan

## Goal

Replace the existing `landscape` Hexo theme with a new minimal theme called **`mono`** — a brutalist monospace aesthetic that fits a developer personal site, supports light + dark modes, and renders Russian content correctly. No JS framework, no build step beyond what Hexo already provides.

## Constraints

- **Stack:** Hexo 8 + EJS + Stylus only (already in `package.json`). No React, no bundler, no new build pipeline.
- **Language:** primary content is Russian (`language: ru` in `_config.yml`). All fonts must support Cyrillic.
- **Reversibility:** the existing `landscape` theme stays in the repo, unmodified. Switching back is one line in `_config.yml`.
- **Deploy:** must keep working with the existing GitHub Actions workflow at `.github/workflows/jekyll-gh-pages.yml`, which runs `hexo generate` then layers RenderCV output and `resources/` files into `public/`.

## Decisions (locked during brainstorming)

| Topic | Decision |
|---|---|
| Theme strategy | Replace entirely (new `themes/mono/`, leave `landscape` in repo) |
| Aesthetic | Brutalist monospace |
| Color modes | Light + dark, auto-detect via `prefers-color-scheme`, manual toggle persisted to `localStorage` |
| Navigation | `home`, `about`, `cv` (Archive dropped — only 4 posts) |
| About page | New `/about/` page rendering the structured frontmatter from current `source/index.md` (bio, interests grid, contact links). New `about.ejs` template. |
| Homepage (`/`) | Pure post list. Current `source/index.md` is moved to `source/about/index.md` so `/` defaults to the index template. |
| Homepage layout | Title-only list (date + title, no excerpts) |
| Post page typography | Mono chrome (header/nav/dates/tags/code) + serif body (Georgia) |
| Chrome font | JetBrains Mono, self-hosted woff2 (regular + bold) |
| Body font | Georgia (system, no download) |
| CV page | Untouched. RenderCV continues to produce a standalone HTML page at `/cv/`. Nav links to it. |
| Symplast page | Orphan — file kept, no nav link, URL still works |
| RSS feed | Yes — Atom via `hexo-generator-feed` |
| Tag pages | Styled but no tag cloud or sidebar; entry point is clicking a tag on a post |
| 404 page | Rendered through new `page.ejs` template |

## Architecture

### File layout

```
themes/mono/
├── _config.yml              # nav links, social, footer text
├── languages/
│   └── ru.yml               # UI strings ("читать дальше", date format, etc.)
├── layout/
│   ├── layout.ejs           # base shell: <html>, <head>, header, {{body}}, footer
│   ├── index.ejs            # homepage: title-only post list
│   ├── post.ejs             # single post page
│   ├── page.ejs             # standalone pages (Symplast, 404)
│   ├── about.ejs            # /about/ — bio, interests, contact (reads page.sections.*)
│   ├── archive.ejs          # /archives/ — same template as index
│   ├── tag.ejs              # /tags/<name>/ — filtered post list
│   └── _partial/
│       ├── head.ejs         # <head> contents, fonts, meta, RSS link, theme-init script
│       ├── header.ejs       # site name + nav + theme toggle
│       ├── footer.ejs       # minimal footer
│       └── post-meta.ejs    # date + tags line, reused
└── source/
    ├── css/
    │   ├── style.styl       # entry, imports the others
    │   ├── _vars.styl       # CSS custom properties
    │   ├── _base.styl       # reset, typography, light/dark via prefers-color-scheme
    │   ├── _layout.styl     # header, footer, content container
    │   ├── _post.styl       # post body (serif)
    │   └── _code.styl       # code block + highlight.js theming
    ├── js/
    │   └── theme-toggle.js  # ~20 lines: toggle dark/light, persist to localStorage
    └── fonts/
        ├── JetBrainsMono-Regular.woff2
        └── JetBrainsMono-Bold.woff2
```

### Component responsibilities

- **`layout.ejs`** — single base shell. Includes `head`, `header`, content slot, `footer`. Every other layout extends this. One place to change global structure.
- **`head.ejs`** — `<meta>`, `<title>`, `<link>` for stylesheet, font preloads, RSS auto-discovery, and a tiny inline `<script>` that reads `localStorage.theme` and sets `data-theme` on `<html>` *before* paint to avoid a flash.
- **`header.ejs`** — site name with `> ` accent (CSS `::before`, not in markup), nav links, theme toggle button.
- **`footer.ejs`** — minimal: copyright line, RSS link, maybe a "view source" link to the GitHub repo.
- **`post-meta.ejs`** — small partial rendering `date · tag1, tag2`. Reused on index, post, archive, tag pages so date/tag formatting lives in one place.
- **`index.ejs`** — iterates `site.posts` (latest first), uses `post-meta.ejs` per item. No pagination needed at 4 posts; will respect `_config.yml`'s `per_page: 10` if it ever matters.
- **`post.ejs`** — single post: title, meta line, body. No prev/next links (only 4 posts; not worth the visual weight).
- **`page.ejs`** — for `source/404/`, `source/SymplastFellowshipPrototype/`, and any future standalone pages. Renders title + body inside the same shell.
- **`about.ejs`** — for `/about/`. Reads structured data from `page.sections` (the existing frontmatter has `about`, `drives`, `interests`, `contact` sub-objects). Renders bio paragraphs, an interests grid (emoji + name + description), and contact links.
- **`archive.ejs`** — same markup as `index.ejs`. Hexo generates `/archives/` and the dated drilldowns; we style them so direct links don't 404 visually, but they're not in the nav.
- **`tag.ejs`** — same markup as `index.ejs`, just filtered. Page heading shows the tag name.

### Data flow

Hexo renders Markdown posts → applies the layout matching the post's `layout:` frontmatter (or default) → walks up to `layout.ejs` for the shell → writes static HTML to `public/`. No runtime data flow; everything is build-time.

### Visual system

#### CSS custom properties (defined in `_vars.styl`, applied at `:root`)

**Light (`prefers-color-scheme: light` or `[data-theme="light"]`):**
```
--bg:       #f4f1ea   /* warm paper */
--fg:       #1a1a1a   /* near-black ink */
--accent:   #c0392b   /* rust red */
--muted:    #888
--rule:     #d4cfbe   /* dashed dividers */
--code-bg:  #e8e3d3
```

**Dark (`prefers-color-scheme: dark` or `[data-theme="dark"]`):**
```
--bg:       #15161a
--fg:       #d6d6d0
--accent:   #f08c70   /* soft coral */
--muted:    #6e6e76
--rule:     #2a2b30
--code-bg:  #1f2026
```

#### Typography

- **Chrome** (header, nav, post titles, dates, tags, code, footer): JetBrains Mono. Self-hosted as woff2, two weights (400 + 700). `font-display: swap`. Approx 50KB total.
- **Body** (post paragraphs, page content): Georgia, with `'Times New Roman', serif` as fallback. No download.
- **Type scale:** body 16px / 1.65 line-height, post title ~22px, site name 14px mono, dates/tags 11px mono.

#### Layout

- Single column, `max-width: 680px`, centered with generous top/bottom padding.
- Header: site name on the left, nav + theme toggle on the right, dashed bottom border.
- Mobile: same layout, smaller padding, header items wrap if needed.

#### Theme toggle

- `theme-toggle.js` (~20 lines): on click, reads current `data-theme` (or computed default), flips it, writes to `localStorage`, updates the attribute.
- Inline script in `<head>` reads `localStorage.theme` and sets `data-theme` synchronously *before* the body paints. No flash of wrong theme.
- Toggle button is a single character: `◐` or `☀/☾`. Final glyph TBD during implementation.

### Code highlighting

- Keep Hexo's built-in `highlight.js` (already enabled in `_config.yml` with `line_number: true`, `wrap: true`). No change to the Hexo highlight config.
- Drop the default highlight.js theme. Write custom CSS in `_code.styl` that targets hljs's class names (`.hljs-keyword`, `.hljs-string`, `.hljs-comment`, etc.) and uses the same `--accent` / `--muted` palette so code looks native to the site in both modes.
- Line numbers styled as muted gutter on the left, no border between gutter and code.

## Build / deploy implications

- **`_config.yml` change:** `theme: landscape` → `theme: mono`. Only line that needs to change in the existing config.
- **`package.json` change:** add `hexo-generator-feed` as a dependency.
- **Workflow:** no changes needed. The existing GitHub Actions workflow runs `npm install && npm run build`, which will pick up the new theme and the new dependency automatically. RenderCV step still overwrites `public/cv/` after Hexo, so the CV page is unaffected.
- **Existing files preserved:** `landscape/` theme, `db.json`, `favicon.png`, `resources/virtualKeyboard.html`, all of `source/` and `.github/`.

## Open questions to resolve during implementation

These are small enough not to need brainstorming, but flagged so they don't get missed:

1. **Theme toggle glyph** — pick during CSS work, easy to change.
2. **Footer copy** — propose minimal text during implementation; user can override.
3. **Exact JetBrains Mono source** — download from the official GitHub release (Apache 2.0), commit the two woff2 files into `themes/mono/source/fonts/`. Include license file alongside.
4. **CV "back to site" link** — out of scope for this redesign. Noted as a possible follow-up: customize the RenderCV template to add a small link back to `/`. Tracked separately, not blocking.

## Out of scope

- Modifying the RenderCV template or output.
- Migrating the CV from YAML to Markdown.
- Touching the GitHub Actions workflow.
- Deleting the `landscape` theme directory.
- Adding analytics, comments, or any third-party JS.
- Adding new content (posts, pages).
- Renaming, retagging, or re-categorizing existing posts.

## Success criteria

1. `npm run server` produces a site that visually matches the brainstormed mockups in both light and dark modes.
2. All existing posts render correctly in Russian, including code blocks.
3. The site looks correct on mobile (single column, no horizontal scroll).
4. The theme toggle persists across page loads with no flash of wrong theme.
5. RSS feed is reachable at `/atom.xml` (or wherever `hexo-generator-feed` defaults) and is auto-discoverable from `<head>`.
6. Reverting `theme: mono` → `theme: landscape` in `_config.yml` restores the old site exactly.
7. The deploy workflow runs to completion on push to `master` and the live site at `https://babin.info` shows the new theme.
