---
name: new-blog
description: Scaffold a new post in the nikiforovall.blog Jekyll repo. Copies _posts/_template.md to the right year folder, creates the matching assets folder, and primes the user on the asset/media conventions. Use whenever the user wants to "start a new post", "draft a blog post", "new blog entry", "write up X for the blog", or mentions creating content under nikiforovall.github.io / nikiforovall.blog.
---

# New blog post scaffold

The repo groups everything by year — both `_posts/<year>/` and `assets/<year>/<slug>/`. This skill handles the mechanical setup so the author can jump straight into writing.

## Inputs to collect (ask only if missing)

- **slug** — kebab-case, lowercase, no date prefix. Example: `aspire-keycloak-uma`.
- **title** — human-readable post title. Required for frontmatter.
- **categories** — defaults to `[ dotnet ]` from the template; ask if the post is clearly about something else (e.g. `[ ai ]`, `[ productivity ]`).
- **tags** — comma-separated; defaults if user doesn't specify.

Date is **today** (use `date +%Y-%m-%d`). Don't ask.

## Steps

1. Compute paths (use today's date — fail loudly if `date` is unavailable):
   ```
   YEAR=$(date +%Y)
   DATE=$(date +%Y-%m-%d)
   POST=_posts/$YEAR/$DATE-$SLUG.md
   ASSETS=assets/$YEAR/$SLUG/
   ```

2. Refuse to overwrite. If `POST` already exists, stop and tell the user — they probably want to edit it instead.

3. Copy template and fill in title/categories/tags via a single `sed`/`perl` invocation (avoid hand-editing line by line):
   ```
   cp _posts/_template.md "$POST"
   perl -i -pe 's/^title:\s*$/title: "<TITLE>"/; s/^published:\s*false/published: false/' "$POST"
   ```
   Leave `published: false` — the user flips it when ready. Don't pre-fill `description`/`shortinfo`; those come last and depend on what's actually written.

4. Create the assets folder and a `.gitkeep` so it survives `git add` even when empty:
   ```
   mkdir -p "$ASSETS"
   touch "$ASSETS/.gitkeep"
   ```

5. Open the new post in VS Code (`code "$POST"`) so the user can start writing immediately. If `code` isn't on PATH, just print the absolute path.

6. Print a one-screen brief covering the asset rules below — the user shouldn't have to look them up.

## Asset and media rules (include in the brief)

- **Reference paths are absolute, year-prefixed**: `/assets/<year>/<slug>/<file>` — e.g. `![diagram](/assets/2026/aspire-keycloak-uma/arch.png)`. Never `assets/...` or `../assets/...`. The site uses `baseurl: ""` with absolute internal links.
- **Folder must match the post slug.** Drop all per-post images, diagrams, and clips into `assets/<year>/<slug>/`.
- **No raw GIFs.** GIFs are 5–10× larger than equivalent H.264 MP4 and tank page weight. Convert with ffmpeg and embed as `<video>`:
  ```
  ffmpeg -i in.gif -movflags +faststart -pix_fmt yuv420p \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:v libx264 -crf 23 -preset slow -an out.mp4
  ```
  ```html
  <video src="/assets/<year>/<slug>/demo.mp4" autoplay muted loop playsinline controls aria-label="<short description>"></video>
  ```
  `muted` is required for autoplay. `aria-label` should describe what the clip shows, since `<video>` doesn't take `alt`.
- **Normalize screen-recording MP4s.** OBS / ShareX / Game Bar / macOS recordings are typically 50–200 MB, often with audio, HEVC, or non-web pixel formats. Re-encode to baseline H.264 + yuv420p + faststart, drop audio, cap width at 1600 px:
  ```
  ffmpeg -i raw.mp4 -movflags +faststart -pix_fmt yuv420p \
    -vf "scale='min(1600,iw)':-2" \
    -c:v libx264 -crf 26 -preset slow -an out.mp4
  ```
  Why these knobs: `+faststart` moves the moov atom to the front so the browser can start playback before the download finishes; `yuv420p` is the only pixel format Safari plays reliably; `-an` drops audio (most demos don't need it, and audio roughly doubles size); `crf 26` is a sweet spot for screen content — raise to 28 if it's still too big, drop to 23 for high-motion. To trim: add `-ss <start> -to <end>` before `-i` (fast seek) or after (frame-accurate). Aim for ≤ 5 MB per clip; if it's still huge, the recording probably has dead time at the start/end — trim before re-encoding.
- **Recompress PNGs before commit.** `oxipng -o 4 --strip safe <file>` for lossless; `pngquant --quality=70-90 --skip-if-larger --strip --force --ext .png <file>` for screenshots/banners. Resize banners to ≤ 1600 px wide — the content column isn't wider than that.
- **Site-wide assets are off-limits to per-post work.** `assets/{js,css,ico,media,resources}/` are infrastructure. Don't drop post images there.

## Frontmatter notes

The template starts with `published: false` on purpose — flip it to `true` only when the post is ready to ship. `description` and `shortinfo` feed SEO/listings; fill those in once the body is written so they reflect the actual content.

## What this skill explicitly does *not* do

- Does not write the post body.
- Does not commit or push.
- Does not flip `published: true`.
- Does not move existing posts between years.

These are author decisions; the skill's job is to remove the setup tax, not to ghost-write.

## Example

User: "let's start a new post about aspire + keycloak UMA"

Action:
1. Slug → `aspire-keycloak-uma` (confirm with user if ambiguous).
2. Today → `2026-05-10`, year → `2026`.
3. Create `_posts/2026/2026-05-10-aspire-keycloak-uma.md` from template, set title.
4. Create `assets/2026/aspire-keycloak-uma/.gitkeep`.
5. `code _posts/2026/2026-05-10-aspire-keycloak-uma.md`.
6. Print the asset-rules brief.

Total: ~5 seconds, zero typing of paths.
