# CLAUDE.md

## What this is

Personal technical blog (`nikiforovall.blog`) built with Jekyll 4.3, deployed via GitHub Pages. Focused on .NET, AI, software architecture, developer productivity.

## Common commands

```bash
bundle exec jekyll serve                  # local dev server
bundle exec jekyll serve --force_polling  # if file watching fails (Windows/WSL)
bundle exec jekyll build                  # build to _site/
rm Gemfile.lock                           # cleanup if dep issues
```

## Architecture

Standard Jekyll layout, but a few specifics matter:

- `_posts/` — all blog content. Filenames are `YYYY-MM-DD-slug.md`. Use `_posts/_template.md` as the starting frontmatter (sets `layout: post`, `published: false`, etc.). 95+ posts; pagination set to 7 (`_config.yml`).
- `_layouts/` (`default`, `page`, `post`) wrap content; `_includes/` holds reusable partials. `post.html` is where post-level UI features (e.g. copy-as-markdown button, TOC, mermaid) are wired in.
- `assets/<post-slug>/` — per-post images and demos. When adding images for a post, drop them in a folder named after the post slug under `assets/`.
- `assets/js/` — small client-side scripts: `app.js`, `copy-code.js` (code-block copy buttons), `search.js`, `toc.js`. No bundler/build step; scripts are referenced directly from layouts/includes.
- `assets/css/style.css` — single stylesheet.
- `_plans/` — design specs for in-progress features (e.g. `SPEC.md` for "copy post as markdown"). Read before implementing related features.
- `categories.html`, `tags.html`, `topics.html` — auto-generated index pages driven by post frontmatter.
- `search.json` — Jekyll-rendered search index consumed by `search.js`.

Key plugins (see `Gemfile` / `_config.yml`): `jekyll-paginate`, `jekyll-seo-tag`, `jekyll-sitemap`, `jekyll-target-blank`, `jekyll-gist`. Markdown via `kramdown` (auto IDs, TOC levels 1..3); syntax highlighting via Rouge — Rouge emits `<div class="language-xxx highlighter-rouge">`, which downstream JS (e.g. copy-as-markdown) parses to recover language identifiers.

## Conventions

- New posts: copy `_posts/_template.md`, set `published: true` when ready, keep `categories`/`tags` lowercase, fill `description` and `shortinfo` (used by SEO/listings).
- Don't commit `_site/` or `tmp/`.
- Site URL is absolute (`https://nikiforovall.blog`) with empty `baseurl` — internal links should use `/posts/...` style, not relative.
