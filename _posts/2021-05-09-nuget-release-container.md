---
layout: post
title: Publish NuGet packages via Docker Release Container
categories: [ dotnet, nuget, docker ]
tags: [ dotnet, nuget, docker, ci-cd]
published: true
shortinfo: Release container is a docker image that is used to distribute and release components.
fullview: false
comments: true
hide-related: true
link-list: 
---

## TL;DR

You can use Docker to push packages to a NuGet feed. This blog post shows how to release a NuGet package to Amazon CodeArtifact via Docker. Source code can be found at <https://github.com/NikiforovAll/docker-release-container-sample>.

---

## General

The idea behind having a release container is pretty straightforward - you can bundle artifacts and tools so the release mechanism is portable and unified because of Docker. Also, another advantage of building NuGet packages in Docker is that you don't need any dependencies installed on the build-server itself. I invite you to read Andrew's Lock post to get more details about the use case (<https://andrewlock.net/pushing-nuget-packages-built-in-docker-by-running-the-container/>). This blog post is focused on the practical side, let's dive into it by reviewing the Dockerfile:

1. Base layer is used for publishing. It contains `aws-cli` and credential provider (`AWS.CodeArtifact.NuGet.CredentialProvider`) so we can deploy to private NuGet feed as described in [here](https://docs.aws.amazon.com/codeartifact/latest/ug/nuget-cli.html). Please see the excellent guide on how to work with Docker and NuGet feeds <https://github.com/dotnet/dotnet-docker/blob/main/documentation/scenarios/nuget-credentials.md>.
2. Build layer is used for building and packing.
3. Entrypoint defines custom publishing script, essentially, `dotnet nuget push` is called. Note that, you can specify additional arguments. (e.g: override `--source` or provide `--api-key`).

```Dockerfile
FROM mcr.microsoft.com/dotnet/core/sdk:3.1-buster AS base
RUN apt-get update && apt install unzip && apt-get install -y curl
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip && ./aws/install

WORKDIR /artifacts
RUN dotnet new tool-manifest --name manifest
RUN dotnet tool install --ignore-failed-sources AWS.CodeArtifact.NuGet.CredentialProvider
RUN dotnet codeartifact-creds install

FROM mcr.microsoft.com/dotnet/sdk:5.0-buster-slim AS build
ARG Configuration="Release"

ENV DOTNET_CLI_TELEMETRY_OPTOUT=true \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=true

WORKDIR /src

COPY ["src/ReleaseContainerSample/ReleaseContainerSample.csproj", "src/ReleaseContainerSample/"]
COPY ["tests/ReleaseContainerSample.Tests/ReleaseContainerSample.Tests.csproj", "tests/ReleaseContainerSample.Tests/"]

RUN dotnet restore "src/ReleaseContainerSample/ReleaseContainerSample.csproj"

COPY . .

RUN dotnet build "src/ReleaseContainerSample" \
    --configuration $Configuration
    # --no-restore

RUN dotnet test "tests/ReleaseContainerSample.Tests" \
    --configuration $Configuration \
    --no-build

FROM build AS publish

ARG Configuration="Release"
ARG Version=1.0.0

RUN dotnet pack "src/ReleaseContainerSample"\
    -p:Version=$Version \
    --configuration $Configuration \
    --output /artifacts \
    --include-symbols

FROM base AS final

WORKDIR /artifacts
COPY --from=publish /artifacts .

COPY ./build/publish-nuget.sh ./publish-nuget.sh

LABEL org.opencontainers.image.title="ReleaseContainerSample" \
    org.opencontainers.image.description="" \
    org.opencontainers.image.documentation="https://github.com/NikiforovAll/docker-release-container-sample" \
    org.opencontainers.image.source="https://github.com/NikiforovAll/docker-release-container-sample.git" \
    org.opencontainers.image.url="https://github.com/NikiforovAll/docker-release-container-sample" \
    org.opencontainers.image.vendor=""

ENTRYPOINT ["./publish-nuget.sh"]
CMD ["--source", "https://api.nuget.org/v3/index.json"]
```

Before we produce artifact, we need to specify version. Let's use `GitVersion` to get the build version. 

```bash
$ Version=`docker run --rm -v "$(pwd):/repo" gittools/gitversion:5.6.6 /repo \
    | tr { '\n' | tr , '\n' | tr } '\n' \
    | grep "NuGetVersion" \
    | awk -F'"' '{print $4}' | head -n1` && echo $Version
# out
1.0.1
```

After that, we are ready to build the release container (image)

```bash
$ docker build -f ./src/ReleaseContainerSample/Dockerfile \
    --build-arg Version="$Version" \
    -t release-container-example .
# check the result
$ docker image list 
REPOSITORY                                                          TAG              IMAGE ID       CREATED          SIZE
release-container-example                                           latest           7ca4acd3845b   43 seconds ago   1.12GB
```

You can peek inside release container by running:

```bash
$ docker run --rm --entrypoint '/bin/ls' --name release-container-sample release-container-example
# out
ReleaseContainerSample.1.0.1.nupkg
ReleaseContainerSample.1.0.1.symbols.nupkg
publish-nuget.sh
```

🚀 Publish.

```bash
docker run --rm \
    -e AWS_ACCESS_KEY_ID="" \
    -e AWS_SECRET_ACCESS_KEY="" \
    -e AWS_DEFAULT_REGION="eu-central-1" \
    --name release-container-sample release-container-example \
    --source "https://codeartifact.eu-central-1.amazonaws.com/nuget/codeartifact-repository/v3/index.json"
# Alternatively, you can use public  NuGet repository.
docker run --rm \
    --name release-container-sample release-container-example \
    --source "https://api.nuget.org/v3/index.json" --api-key "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## Summary

In this blog post, I showed how you can build NuGet packages via Docker, and push them to your NuGet feed when you run the container.

**Pros**:

* Easy to release. The solution is portable. It's our goal after all.
* Extendable approach. You are in charge of how to build NuGet package and can install all required tools and dependencies when you need it.

**Cons**:

* Images can be quite sizable. Additional space is required to release containers, so a retention policy should be applied.
* Adds unnecessary complexity if you already use dotnet toolchain and you have all dependencies installed on build server.

## Reference

* <https://docs.aws.amazon.com/codeartifact/latest/ug/nuget-cli.html>
* <https://github.com/dotnet/dotnet-docker/blob/main/documentation/scenarios/nuget-credentials.md>
* <https://andrewlock.net/pushing-nuget-packages-built-in-docker-by-running-the-container>
