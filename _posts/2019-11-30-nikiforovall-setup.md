---
layout: post
title: Development environment based on Windows Terminal + WSL + ZSH + dotfiles
categories: [productivity]
tags: [windows-terminal, git, zsh, dotfiles, wsl, deaac]
shortinfo: I would like to share with you approach on how to set up your working environment lightning fast. This post is based on my <b>dotfiles</b> repository - <a href="https://github.com/NikiforovAll/dotfiles" target="_blank">nikiforovall/dotifles</a>
fullview: false
comments: true
hide-related: true
link-list: "https://www.theurlist.com/os-bootstrap"
---

## Introduction

I would like to share with you how to implement [dotfiles]([https://link](https://dotfiles.github.io/)) concept for your working environment lightning fast. This post is based on my **dotfiles** repository - [nikiforovall/dotifles](https://github.com/NikiforovAll/dotfiles).

It is a good time to be a .NET developer. It is not only mature and enterprise-ready ecosystem but vibrant and active community. I feel like guys from Microsoft doing a lot to support and encourage .NET community. In particular, that is why we have something like [Windows Subsystem For Linux](https://docs.microsoft.com/en-us/windows/wsl/about), [Windows Terminal](https://github.com/Microsoft/Terminal) and many more.

So I use Windows Terminal. It is a modern terminal emulator for windows. I switched from a really nice terminal emulator [cmder](https://cmder.net/) to Windows Terminal (Preview). And I don't regret it, especially after the release of [Windows Terminal Preview v0.7 Release](https://devblogs.microsoft.com/commandline/windows-terminal-preview-v0-7-release/). This release includes PowerLine fonts for Cascadia Fonts, tab reordering splitting of tab windows into panes. Sweat!

Windows Terminal is highly configurable, so you could adjust *keybindings*, *color schemes*, and *profiles*.

You can install Windows Terminal from Microsoft Store or by using [chocolatey](https://chocolatey.org/) windows package manager.

```bash
choco install microsoft-windows-terminal -y
```

Also, see my Windows Terminal *profiles.json* <https://github.com/NikiforovAll/dotfiles/tree/master/artifacts/wt_profile.json>.

I use [Visual Studio Code](https://code.visualstudio.com/) as the main editor and development environment. Although, it is possible to use dotfiles for synchronization concept for `vscode` I encourage you to use [Settings Sync](https://marketplace.visualstudio.com/items?itemName=Shan.code-settings-sync) extension. It uses GitHub as storage and makes use of API key to authorize and manage your configurations. You could install it like this:

```bash
choco install vscode -y
code --intall-extension Shan.code-settings-sync
```

And now, here where the fun begins. The end goal is to bootstrap and configure working environment with the minimum effort. Basically, we want to run bash one-liner and have everything arranged nice and clean. Something like:

```bash
bash -c "$(wget -qO - https://raw.github.com/nikiforovall/dotfiles/master/src/wsl/os/install.sh)"
```

### WSL Setup

But first, let's see how we set up brand new WSL instance. Here I list available Linux distros and unregister ubuntu-18.04

![setup-1](/assets/nikiforovall-setup/test1.gif)

Let's register new user in Ubuntu-18.04 LTS.
![setup-2](/assets/nikiforovall-setup/test2.gif)

And set default distro *"Ubuntu-18.04"*

```bash
# $wsl -h
# -setdefault, -s <DistributionName>
wsl -s "Ubuntu-18.04"
```

We can login to WSL via Windows Terminal by specifying `"source": "Windows.Terminal.Wsl"` in corresponding Windows Terminal *profile*.

## Installation

🔧 If it is a brand-new WSL instance you might want to run `apt upgrade`. In the demo below I've already had everything.

Let's see how the bash one-liner works:

`bash -c "$(wget -qO - https://raw.github.com/nikiforovall/dotfiles/master/src/wsl/os/install.sh)"`

![setup-3](/assets/nikiforovall-setup/test3.gif)

It installs a bunch of [essentials](https://github.com/NikiforovAll/dotfiles/blob/master/src/wsl/os/app_install.sh) for development environment: utils, tools, and [dotnet sdk](https://dotnet.microsoft.com/download). Also, it symlinks git and shell configs. So after reloading your shell, it is familiar and responsive working environment. The goal of dotfiles technique is to provide the way to manage various .* configuration files. The basic idea is to have git repository responsible for installing and managing configurations on a working machine so you don't need to worry about losing favorite aliases, programs, and configurations. Perfect! 🚀

## Demo

At the demonstration below I create a folder for the new *dotnet console* project. I slightly modify *Program.cs* and run the application inside WSL. There are a lot of details that make the process of development easier and promote productivity. I just mention a few of them: simplicity of setup, syntax and commands highlighting and autocompletion.

![setup-4](/assets/nikiforovall-setup/test4.gif)

## Summary

It was a brief overview of my dotfiles setup. I encourage you to investigate the internals of my dotfiles repository for mode details. Feel free to fork and work on dream setup of your own. Let me know what you think about it!
