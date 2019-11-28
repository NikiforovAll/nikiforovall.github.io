---
layout: post
title: Development environment based on Windows Terminal + WSL + ZSH + dotfiles
categories: [productivity]
tags: [windows-terminal, powershell, git, zsh, dotfiles]
fullview: false
comments: true
hide-related: true
link-list: "https://www.theurlist.com/os-bootstrap"
---

I would like to share with you approach on how to set up your working environment lightning fast. This post is based on my **dotfiles** and working machine scaffolding repository - [nikiforovall/dotifles](https://github.com/NikiforovAll/dotfiles).

It is a good time to be a .NET developer. It is not only mature and enterprise-ready ecosystem but vibrant and active community. I feel like guys from Microsoft doing a lot to support and encourage .NET community. In particular, that is why we have something like [Windows Subsystem For Linux](https://docs.microsoft.com/en-us/windows/wsl/about), [Windows Terminal](https://github.com/Microsoft/Terminal) and many more.

So I use Windows Terminal. It is a modern terminal emulator for windows. I switched from really nice terminal emulator [cmder](https://cmder.net/) to Windows Terminal (Preview). And I don't regret it, especially after release of [Windows Terminal Preview v0.7 Release](https://devblogs.microsoft.com/commandline/windows-terminal-preview-v0-7-release/). This release includes PowerLine fonts for Cascadia Fonts, tab reordering splitting of tab windows into panes. Sweat!

Windows Terminal is highly configurable, so you could adjust *keybindings*, *color schemes* and profiles. So Windows Terminal terminal is responsible for look and feel.

You can install Windows Terminal from Microsoft Store or by using [chocolatey](https://chocolatey.org/) windows package manager.

```bash
choco install microsoft-windows-terminal -y
```

Also, see my Windows Terminal *profiles.json* <https://github.com/NikiforovAll/dotfiles/tree/master/artifacts/wt_profile.json>.

I use [Visual Studio Code](https://code.visualstudio.com/) as main editor and development environment. Although, it is possible to use dotfiles for synchronization concept for `vscode` I encourage you to use [Settings Sync](https://marketplace.visualstudio.com/items?itemName=Shan.code-settings-sync) extension. It uses GitHub as storage and make use of API key in order to authorize and manage your configurations. You could install it like this:

```bash
choco install vscode -y
code --intall-extension Shan.code-settings-sync
```

And now, here where the fun begins. The end goal is to bootstrap and configure working environment with the minimum effort. Basically, we want to run bash one-liner and have everything arranged nice and clean. Something like,
```bash
bash -c "$(wget -qO - https://raw.github.com/nikiforovall/dotfiles/master/src/wsl/os/install.sh)"
```

But first, let's see how we set up brand new WSL instance. Here I list available linux distros and unregister ubuntu-18.04

![setup-1](/assets/nikiforovall-setup/test1.gif)

Let's register new user in Ubuntu-18.04 LTS.
![setup-2](/assets/nikiforovall-setup/test2.gif)

And set default distro *"Ubuntu-18.04"*

```bash
# $wsl -h
# -setdefault, -s <DistributionName>
wsl -s "Ubuntu-18.04"
```
### WSL Setup

### Dotfiles
So the goal of dotfiles technique is to provide the way to manage various .* configuration files. The basic idea is to have git repository responsible for installing and managing configurations on working machine.
