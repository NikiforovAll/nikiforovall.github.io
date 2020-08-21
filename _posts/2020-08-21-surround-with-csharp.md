---
layout: post
title: Bringing "surround with" functionality to vscode. Checkout out this extension.
categories: [productivity, csharp, vscode]
tags: [vscode, productivity]
shortinfo: Quick overview of surround-with-csharp vscode extension.
fullview: false
comments: true
hide-related: true
link-list: 
---

Quite often, in my day-to-day workflow, I want to wrap some code section in well-known code snippet. I hate these moments. Usually, you want to *cut and paste* some code and after that formatting goes wrong and all of that 😱. So...

I would like to share with you extension for *vscode* that I wrote for personal use. ([marketplace.visualstudio.com/surround-with-csharp](https://marketplace.visualstudio.com/items?itemName=nikiforovall.surround-with-csharp))
The goal of this extensions is to provide capability to wrap up selected text in a C# code snippet.

This extension supports different concepts to trigger functionally to surround your code.

**Source code:** <https://github.com/NikiforovAll/surround-with-csharp>

## CompletionProvider

You can just simply hit `CTRL + SPACE` and if you have some code selected, you will get completion items that you can choose from by using arrow keys:

![demo1](/assets/surround-with-csharp/surr-w-cs-d2.gif)

## Commands

If your favorite *command-pallette*. You can invoke command **"C#: Surround With"** (or `CTRL+SHIFT+S, CTRL+SHIFT+S`) and you will be prompted for a code snippet.

![demo2](/assets/surround-with-csharp/surr-w-cs-d1.gif)

### Customize Keybindings

Here is a list of keybindings provided by extension for quicker access to commands to use particular snippet. You can assign your own keybindings, if you want to.

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Snippet</th>
      <th scope="col">Keybinding</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">surround.with.namespace</th>
      <td colspan="2">ctrl+shift+S N</td>
    </tr>
    <tr>
      <th scope="row">surround.with.for</th>
      <td colspan="2">ctrl+shift+S F</td>
    </tr>
    <tr>
      <th scope="row">surround.with.foreach</th>
      <td colspan="2">ctrl+shift+S ctrl+F</td>
    </tr>
    <tr>
      <th scope="row">surround.with.do</th>
      <td colspan="2">ctrl+shift+S D</td>
    </tr>
    <tr>
      <th scope="row">surround.with.while</th>
      <td colspan="2">ctrl+shift+S W</td>
    </tr>
    <tr>
      <th scope="row">surround.with.if</th>
      <td colspan="2">ctrl+shift+S I</td>
    </tr>
    <tr>
      <th scope="row">surround.with.else</th>
      <td colspan="2">ctrl+shift+S E</td>
    </tr>
    <tr>
      <th scope="row">surround.with.try</th>
      <td colspan="2">ctrl+shift+S T</td>
    </tr>
    <tr>
      <th scope="row">surround.with.tryf</th>
      <td colspan="2">ctrl+shift+S ctrl+T</td>
    </tr>
    <tr>
      <th scope="row">surround.with.lock</th>
      <td colspan="2">ctrl+shift+S L</td>
    </tr>
  </tbody>
</table>
Some commands are not bound at all. So if you are "I want to wrap all my code in regions" kind of guy, you can go to "Keyboard Shortcuts" and find all subcommands. Usually, the name starts with "surround.with".

---

Hope you find this useful, have fun! 🎉

---
