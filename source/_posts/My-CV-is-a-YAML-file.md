---
title: My CV is a YAML file
date: 2026-09-30 14:00:00
tags: [cv, rendercv, github-actions]
categories:
---
My CV has no `.docx`, no Figma file, and no "final_v3_really_final.pdf". It's a YAML file in the same repo as this site. Every push to `master` renders it into a PDF and publishes it at a stable URL. There are four versions of it for different roles, and each one has to fit on exactly one page. Here's how that works and why I like it. <!-- more -->

## The setup

The tool is [RenderCV](https://github.com/rendercv/rendercv): you describe the content in YAML, and it typesets the PDF through Typst. The content looks like this:

```yaml
cv:
  name: Vladimir Babin
  headline: "Senior iOS/macOS Engineer · Architecture-led, agent-driven delivery · Remote since 2015"
  sections:
    Experience:
      - company: Independent
        position: Software Engineer
        start_date: 2026-07
        end_date: present
        highlights:
          - "Took four apps from idea to the App Store in two months — ..."
```

No layout, no fonts, no margins — just facts. The design lives separately.

## Four variants, one design

I apply to different kinds of roles: native Apple, cross-platform mobile, full-stack, AI engineering. The same experience deserves different emphasis for each, so there are four files:

```
source/cv/
├── design.yaml                     # theme, fonts, colours, margins
├── Vladimir_Babin_CV.yaml          # main: Apple platforms + agent-driven delivery
├── Vladimir_Babin_CV_KMP.yaml      # cross-platform mobile
├── Vladimir_Babin_CV_FullStack.yaml
└── Vladimir_Babin_CV_AI.yaml
```

Each variant points to the shared design with one line:

```yaml
settings:
  render_command:
    design: design.yaml
```

At one point there were six variants, each carrying its own copy of the same 47-line design block. Change the link colour — edit six files. When I consolidated them into four and extracted the design into `design.yaml`, the commit deleted 610 lines and added 106 — and the split into content and design didn't change a single pixel of the PDFs.

## The pipeline

The GitHub Actions workflow that builds this Hexo site also renders the CVs:

```yaml
- name: Install RenderCV
  run: pip install "rendercv[full]==2.8"

- name: Render CV
  run: |
    cd ./source/cv/
    rendercv render Vladimir_Babin_CV.yaml
    cp -r rendercv_output/* ../../public/cv/
    rendercv render Vladimir_Babin_CV_KMP.yaml -pdf ../../public/cv-kmp/Vladimir_Babin_Cross_Platform_Mobile_Engineer.pdf
    # ...and so on for each variant
```

A few details that turned out to matter:

- **Pin the version.** RenderCV's CLI changes between releases; a flag that worked in one version fails in the next. `==2.8` means the CV renders the same way next year.
- **Stable URLs.** The main CV always lives at `/cv/Vladimir_Babin_CV.pdf`. That's the link I put in job applications and profiles. Update the YAML, push, and every link I've ever sent now points to the new version.
- **Don't break old links.** When I merged the iOS and TON variants into others, their URLs (`/cv-ios/`, `/cv-ton/`) became tiny HTML redirects to the successors. Someone who got the link a month ago still lands on a real CV.
- **Publish the source.** The YAML is copied next to each PDF. Anyone curious can see exactly what the CV is made of.

## The one-page rule

Every variant must be exactly one page. That constraint does more editing than I do.

Typst breaks pages atomically: add one bullet, and the whole Skills + Education block jumps to page two. So every change goes through the same loop: render all four variants, count pages, look at the PNG preview to see what spilled over, cut. The first time I fit the main CV onto one page, it was typography only — margins, 9.5pt body text, tighter line spacing — without removing a single bullet. Since then, every new line has had to push an old one out.

That's the point. A one-page limit forces the question "is this bullet better than the one it replaces?" on every edit.

## Git as a CV changelog

The best part is the history. `git log -- source/cv` is a record of how I've been presenting myself, with reasons:

```
CV: state English level as C1
CV: tighten bullets, add verified metrics across all variants
CV: merge to 4 variants, shared design.yaml, add Independent entry
CV: normalize job titles across all variants
CV: soften metrics that can't be backed up
Fit the CV onto a single page
```

That "soften metrics" commit is my favourite. An earlier version claimed "reduced crash rate by ~40%" and "first TestFlight build in 2–3 weeks". They sounded good, but I couldn't point to a dashboard or a document that proves them. So the diff replaced them with what I can defend:

```diff
- Reduced crash rate by ~40% through refactoring, monitoring, and defensive coding.
+ Drove crash-rate reduction through crash-report triage, refactoring, and defensive coding.
```

A CV in Word has no memory of why a line changed. A CV in git does, and a reviewer — human or AI — can check every claim against the diff that introduced it.

## Should you do this?

If you edit your CV twice a year, probably not; a template in any editor is fine. But if you keep several versions, update them often, or apply to a lot of roles, treating the CV like code pays off quickly: one source of truth, a shared design, automatic publishing, and a history that explains itself.

The files are public: [the main CV](/cv/Vladimir_Babin_CV.pdf) and [its YAML](/cv/Vladimir_Babin_CV.yaml).
