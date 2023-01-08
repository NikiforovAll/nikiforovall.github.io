# Nikiforov Oleksii. Blog

## Getting Started

``` bash
bundle exec jekyll serve
# OR
jekyll serve --force_polling
bundle exec jekyll serve --force_polling

sudo su
```

Cleanup: `rm Gemfile.lock`

### Docker

```bash
export JEKYLL_VERSION=3.8
# docker in wsl2 can't handle paths properly atm
docker run --rm  -P  --volume="C:\Nikiforov\dev\nikiforovall-blog:/srv/jekyll" -it jekyll/jekyll:$JEKYLL_VERSION jekyll build
# OR
docker run -P --name jekyll-blog -it --volume="C:\Nikiforov\dev\nikiforovall-blog:/srv/jekyll" -it jekyll/:$JEKYLL_VERSION jekyll serve --force_polling
```

## Reference & Sources

* Repository is based on: <https://github.com/dbtek/dbyll>
* <https://northstack.com/create-static-blog-jekyll/>
* Related posts: <https://blog.webjeda.com/jekyll-related-posts/>
