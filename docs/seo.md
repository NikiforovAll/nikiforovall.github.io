# SEO Guidelines

This document describes the SEO optimization setup for the blog and provides guidelines for content creators.

## Overview

The blog is optimized for search engines using:
- **Meta tags** for descriptions, Open Graph, and Twitter Cards
- **Structured data** (JSON-LD) for rich search results
- **Canonical URLs** to prevent duplicate content issues
- **robots.txt** for crawler guidance

## Implementation Details

### 1. Meta Tags (`_includes/default.html`)

Each page includes:

- **Title**: `<page title> | N+1 Blog`
- **Description**: Automatically uses `description` → `shortinfo` → `excerpt` → site description
- **Canonical URL**: Prevents duplicate content issues
- **Open Graph**: For Facebook, LinkedIn sharing
- **Twitter Cards**: For Twitter sharing with `summary_large_image` card type

### 2. Structured Data (`_includes/schema.html`)

BlogPosting schema includes:
- Headline and description
- Publication and modification dates
- Author information with social profiles
- Publisher details
- Article section (category)
- Keywords (tags)
- Featured image

### 3. Default Post Image

Location: `/assets/media/default-post-image.png`

Used when posts don't specify a custom image. Appears in:
- Social media shares (Twitter, Facebook, LinkedIn)
- Google Rich Results
- JSON-LD structured data

### 4. Robots.txt

Located at root: `/robots.txt`

```
User-agent: *
Allow: /
Disallow: /assets/

User-agent: GPTBot
Disallow: /
```

## Content Creator Guidelines

### Front Matter Fields

When creating or editing posts, use these SEO-related fields:

```yaml
---
layout: post
title: "Your Post Title"
description: "A concise, compelling description (150-160 characters recommended)"
shortinfo: "Alternative shorter description"
image: /assets/media/your-post-image.png  # Optional
categories: [ category1, category2 ]
tags: [ tag1, tag2, tag3 ]
published: true
---
```

### Field Descriptions

| Field | Required | Purpose | Best Practice |
|-------|----------|---------|---------------|
| `title` | Yes | Page title, shown in search results | Keep under 60 characters |
| `description` | Recommended | Meta description for SEO | 150-160 characters, compelling summary |
| `shortinfo` | Optional | Fallback if no description | Shorter than description |
| `image` | Optional | Social sharing image | Min 1200x630px for best results |
| `categories` | Recommended | Article section in schema | Use 1-2 relevant categories |
| `tags` | Recommended | Keywords for SEO | 3-7 relevant tags |

### Description Guidelines

**Good descriptions:**
- Accurately summarize the post content
- Include relevant keywords naturally
- Are action-oriented or provide value
- Stay within 150-160 characters

**Examples:**

✅ Good:
```yaml
description: "Learn how to build specialized AI agents that transform CLI tools into conversational interfaces using Claude Agent SDK and dotnet format as a practical example."
```

❌ Avoid:
```yaml
description: "TL;DR"  # Too short, not descriptive
description: "In this post I'm going to talk about..." # Unnecessary filler
```

### Image Guidelines

**When to add custom images:**
- Tutorial posts with visual steps
- Posts about specific tools/products
- Announcement posts
- Posts you want to promote on social media

**Image specifications:**
- **Minimum size**: 1200x630 pixels (Facebook/Twitter recommended)
- **Format**: PNG or JPEG
- **File size**: Keep under 1MB for performance
- **Content**: Include post title or key visual

**How to add:**
1. Save image to `/assets/media/`
2. Add to front matter: `image: /assets/media/your-image.png`

## Validation & Testing

### After Publishing

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Test your post URL
   - Should show 1 valid BlogPosting item
   - Check for warnings (usually non-critical)

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Verify image and description appear correctly
   - Card type should be "Summary Card with Large Image"

3. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Check Open Graph tags
   - Verify image loads correctly

4. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Test how posts appear when shared

### Checking Local Build

View generated HTML:

```bash
bundle exec jekyll build
grep -A 50 "application/ld+json" _site/your-post-path/index.html
```

Verify:
- Only 1 JSON-LD schema block
- Description is not "TL;DR" or excerpt
- Image URL is valid
- All required fields present

## SEO Checklist

Before publishing a new post:

- [ ] Title is descriptive and under 60 characters
- [ ] `description` field is set (150-160 chars)
- [ ] Categories are relevant and accurate
- [ ] Tags include key topics (3-7 tags)
- [ ] Image is added (optional but recommended for important posts)
- [ ] Post builds without errors
- [ ] Test with Google Rich Results Test after publishing

## Troubleshooting

### Issue: Description shows as "TL;DR"

**Cause**: Post doesn't have `description` or `shortinfo`, and excerpt starts with "TL;DR"

**Fix**: Add explicit description to front matter:
```yaml
description: "Your actual description here"
```

### Issue: Image not showing in social shares

**Causes:**
1. Image path is incorrect
2. Image file doesn't exist
3. Image is too small (< 200x200)

**Fix:**
1. Verify image path: `/assets/media/your-image.png`
2. Check file exists in repository
3. Ensure image is at least 1200x630px

### Issue: Multiple schema detected

**Cause**: Duplicate JSON-LD blocks in HTML

**Fix**: Should only have one `<script type="application/ld+json">` block per post. Check `_includes/schema.html` is included only once.

### Issue: Canonical URL incorrect

**Cause**: `url` in `_config.yml` is wrong

**Fix**: Verify `url: "https://nikiforovall.github.io"` in `_config.yml`

## Configuration Files

### Key Files

- `_config.yml`: Site-wide SEO settings
- `_includes/default.html`: Meta tags and Open Graph
- `_includes/schema.html`: JSON-LD structured data
- `robots.txt`: Crawler instructions
- `Gemfile`: Jekyll SEO plugin (kept for future use)

### _config.yml SEO Settings

```yaml
title: N+1 Blog
description: Technical blog about .NET, AI, software architecture, and developer productivity.
url: "https://nikiforovall.github.io"
baseurl: ""

author:
  name: Oleksii Nikiforov
  email: alexey.nikiforovall@gmail.com
  github: nikiforovAll
  twitter: nikiforovall
  telegram: nikiforovallblog
  linkedin: nikiforov-oleksii

twitter:
  username: nikiforovall
  card: summary

social:
  name: Oleksii Nikiforov
  links:
    - https://twitter.com/nikiforovall
    - https://github.com/nikiforovAll
    - https://www.linkedin.com/in/nikiforov-oleksii
```

## Advanced Topics

### Custom Schema for Specific Posts

If you need post-specific structured data modifications, edit `_includes/schema.html`. The current implementation covers most use cases.

### Adding Additional Schema Types

To add other schema types (e.g., HowTo, FAQPage):
1. Create new include file: `_includes/schema-howto.html`
2. Include conditionally based on front matter flag
3. Reference: https://schema.org/HowTo

### Monitoring SEO Performance

Tools to track SEO success:
- **Google Search Console**: Track impressions, clicks, rankings
- **Google Analytics**: Monitor organic traffic
- **Ahrefs/SEMrush**: Track keyword rankings (paid tools)

## References

- [Google Search Central](https://developers.google.com/search/docs)
- [Schema.org BlogPosting](https://schema.org/BlogPosting)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Jekyll SEO Tag Plugin](https://github.com/jekyll/jekyll-seo-tag)

## Change Log

- **2025-11-13**: Initial SEO implementation
  - Added comprehensive meta tags
  - Implemented JSON-LD structured data
  - Created robots.txt
  - Set up default post image handling
  - Removed duplicate schema generation
