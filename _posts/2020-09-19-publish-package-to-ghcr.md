---
layout: post
title: Publish images to GitHub Container Registry (ghcr)
categories: [ docker ]
tags: [ docker, docker-registry, tiny-post ]
shortinfo: Succinct post on how to get things going in ghcr.
fullview: false
comments: true
hide-related: true
link-list: https://www.theurlist.com/start-with-ghcr
---

In this blog post, I would like to show you how easy is to publish your docker images to GitHub Container Registry. This topic is relevant because *Docker Hub* has changed [retention limits](https://www.docker.com/pricing/resource-consumption-updates), so might want to consider other players on the market.

#### TL;DR

To publish an image to ghcr:

1. Create a Personal Access Token
2. Log-in to the container registry
3. Push an image to `ghcr.io/GITHUB_USERNAME/IMAGE_NAME:VERSION`

---

To access GitHub container registry you need to create Personal Access Token (PAT) on GitHub:

<small>"**Settings > Developer Settings > Personal access tokens**" and create token with permissions related to "packages" (or <https://github.com/settings/tokens/new>).</small>

After that, you can login `export CR_PAT=YOUR_TOKEN ; echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin`.

Now, you want to tag your local images:

`docker tag SOURCE_IMAGE_NAME:VERSION ghcr.io/TARGET_OWNER/TARGET_IMAGE_NAME:VERSION`

Push re-tagged imaged to the container registry (ghcr.io):

`docker push ghcr.io/OWNER/IMAGE_NAME:VERSION`

### Example

I've pushed a containerized image of [dotnet-script](https://github.com/filipw/dotnet-script) to GitHub Registry, it allows you to run REPL-style prompt for C#.

For now, GitHub doesn't provide search and discovery capabilities for images, but you already can find some UI to see image details from UI, if you know the name.

You can find packaged [dotnet-script](https://github.com/filipw/dotnet-script) here: <https://github.com/users/NikiforovAll/packages/container/package/dotnet-script>

🚀  Let's download and run it:

```bash
docker image pull ghcr.io/nikiforovall/dotnet-script:latest
docker container run --it --rm ghcr.io/nikiforovall/dotnet-script
```
