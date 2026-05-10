# Nikiforov Oleksii. Blog

Source for [nikiforovall.blog](https://nikiforovall.blog) — a Jekyll site deployed via GitHub Actions to GitHub Pages.

## Local development

```bash
bundle install
bundle exec jekyll serve
# add --force_polling if file watching fails on Windows/WSL
```

## Deployment

Pushes to `master` trigger `.github/workflows/pages.yml`, which builds with `JEKYLL_ENV=production` and publishes via `actions/deploy-pages`.

## Repo notes

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.

Theme originally based on [dbtek/dbyll](https://github.com/dbtek/dbyll).
