---
layout: post
title: Try out .NET 6 inside your own development environment built with devcontainers, docker, and vscode
categories: [ productivity, devcontainers ]
tags: [ dotnet, docker, dotfiles, git, wsl, vscode ]
published: true
shortinfo: See how you can set up your reproducible development environment based on devcontainers without extra hustle.
fullview: false
comments: true
hide-related: false
---

## TL;DR

In this blog post, I provide an example of how to organize/dockerize your personal development setup. Also, you may want to use one of my devcontainers to try .NET 6. Everything is baked inside the devcontainer, so you don't have to install SDK and other tooling on your host machine.

---

## Introduction

As you may know, .NET 6 Release Candidate 2 has been [announced](https://devblogs.microsoft.com/aspnet/asp-net-core-updates-in-net-6-rc-2/) and it is very close to the final build of .NET 6 that will be shipped in November this year in time for [.NET Conf 2021](https://dotnetconf.net/). It is the perfect time to start playing with .NET 5 and C# 10 and all of its goodness.

This is why I've created sandbox <https://github.com/NikiforovAll/devcontainer-for-dotnet6-demo>. This is `dotnet new webapi -minimal` packed inside devcontainer. So, all you need to do is to get the source code and compile the devcontainer. You can do it by downloading via VSCode URL launcher or clone via git. I suggest you go straight to [documentation](https://code.visualstudio.com/docs/remote/create-dev-container) for more details. My goal is to share my experience using devcontainers.

Here is how I do it:

```bash
git clone https://github.com/NikiforovAll/devcontainer-for-dotnet6-demo

devcontainer open ./devcontainer-for-dotnet6-demo
```

💡 Tip: You can open repository in VSCode `code ./devcontainer-for-dotnet6-demo` and after that, you will be prompted with a suggestion to reopen workspace in devcontainer (<https://code.visualstudio.com/docs/remote/devcontainer-cli#_opening-a-folder-directly-within-a-dev-container>).

🚀 Run `dotnet run --project ./src/App/` and enjoy your coding.

## Anatomy of devcontainers

When you generate configuration from VSCode, by default, it generates something like this:

```bash
$ tree -a 
.
└── .devcontainer
    ├── devcontainer.json
    ├── Dockerfile
    └── library-scripts
        └── azcli-debian.sh
```

```Dockerfile
# Dockerfile

ARG VARIANT="5.0"
FROM mcr.microsoft.com/vscode/devcontainers/dotnet:0-${VARIANT}
```

```jsonc
// .devcontainer/devcontainer.json

// For format details, see https://aka.ms/devcontainer.json. For config options, see the README at:
// https://github.com/microsoft/vscode-dev-containers/tree/v0.202.3/containers/dotnet
{
    "name": "",
    "build": {
        "dockerfile": "Dockerfile",
        "args": { 
            // Update 'VARIANT' to pick a .NET Core version: 2.1, 3.1, 5.0
            "VARIANT": "5.0"
        }
    },
    // Set *default* container specific settings.json values on container create.
    "settings": {},
    // Add the IDs of extensions you want installed when the container is created.
    "extensions": [
    ],
    "remoteUser": "vscode"
}
```

A *devcontainer.json* file in your project tells VS Code how to access (or create) a development container with a well-defined tool and runtime stack. This container can be used to run an application or to separate tools, libraries, or runtimes needed for working with a codebase.

Everything you need is already added in the base docker image, but it is quite easy to extend it. You may want to pre-install some dependencies and tools in a custom Dockerfile.

💡Tip: You are not limited to using devcontainers for .NET 6 project, actually, you can use them pretty much for everything. For example, I'm writing this blog post from devcontainer 🙂.

## Distribute devcontainers

Personally, I think it should be possible to easily explore the content of the devcontainer in order to change it on demand. This is why my go-to option is to create custom-tailored containers for each project based on some lightweight base images with shared tooling installed in them. For example, you might want to install something like: <https://github.com/rothgar/awesome-tuis>, <https://github.com/unixorn/git-extra-commands>, <https://github.com/junegunn/fzf>, <https://github.com/sharkdp/fd>, <https://github.com/ogham/exa>, etc. 🤓

Here you can find my devcontainer for .NET:

* Source: <https://github.com/NikiforovAll/dev-containers/tree/master/containers/dotnet>
* GitHub Container Registry <https://github.com/NikiforovAll/dev-containers/pkgs/container/devcontainers%2Fdotnet>
* Docker Hub <https://hub.docker.com/repository/docker/nikiforovall/devcontainers-dotnet>

After that, you can install it directly from docker container registry by specifying "image" field inside `devcontainer.json`.

Minimum devcontainer looks like this:

```jsonc
{
    "name": ".NET 6 devcontainer",
    "image": "nikiforovall/devcontainers-dotnet:latest",
    "settings": {},
    "extensions": []
}
```

## Dotfiles

You can also include your `dotfiles` repository to replicate your terminal experience (configurations, aliases, customizations, tools, etc.). See user settings for the "Remote - Containers" extension.

Basically, you want to configure the remote git repository as the source of `dotfiles` and tell vscode what to do upon installation. Here is my `dotfile` for devcontainers: <https://github.com/NikiforovAll/dotfiles/blob/master/src/dev-container/boot/install.sh>.

```jsonc
"settings": {
    "dotfiles.installCommand": "",
    "remote.containers.dotfiles.repository": "https://github.com/NikiforovAll/dotfiles.git",
    "remote.containers.dotfiles.installCommand": "~/dotfiles/src/dev-container/boot/install.sh",
    "remote.containers.dotfiles.targetPath": "~/dotfiles",
},
```

### Anatomy - Summary

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Description</th>
      <th scope="col">Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>.devconatiner/devcontainer.json</code></td>
      <td>Workspace definition.</td>
      <td> Specify how to assemble devcontainer. Customize IDE (vscode) behavior.</td>
    </tr>
    <tr>
      <td><code>.devconatiner/Dockerfile</code></td>
      <td>Image for docker container.</td>
      <td>Install dependencies and tools. Configure defaults.</td>
    </tr>
    <tr>
      <td><code>dotfiles</code></td>
      <td>External versioned source of configuration for developer environment.</td>
      <td>Customize the way your terminal looks and feels and developer experience in general.</td>
    </tr>
  </tbody>
</table>


## Summary

I've explained to you the main building blocks of devcontainers and shared some ideas regarding how you may want to organize your development setup. Hope you find it useful.

---

## Reference

* <https://github.com/NikiforovAll/devcontainer-for-dotnet6-demo>
* <https://nikiforovall.github.io/docker/2020/09/19/publish-package-to-ghcr.html>
* <https://nikiforovall.github.io/productivity/2019/11/30/nikiforovall-setup.html>
* <https://devblogs.microsoft.com/aspnet/asp-net-core-updates-in-net-6-rc-2/>
* <https://code.visualstudio.com/docs/remote/create-dev-container>
* <https://code.visualstudio.com/docs/remote/devcontainer-cli>
