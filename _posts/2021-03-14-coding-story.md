---
layout: post
title: Advance the practical side of your coding skills with CodingStories
categories: [  dotnet, coding-stories ]
tags: [ dotnet, engx, coding-stories ]
published: true
shortinfo: In this blog post, I share my experience of writing a coding story and give you instructions on how to get started.
fullview: false
comments: true
related: false
link-list: 
---

## TL;DR

In this blog post, I will share with you what coding story is about and how to write your own coding story.

## Introduction

Recently, I've discovered a new and practical way to hone my programming skills. The approach is called *CodingStories*. Basically, a story is some sort of journey, a day-to-day task that you might do at your work. Usually, a coding story shows some new feature, coding techniques, or code refactoring. Generally, you want to guide a user from a bad place to a better one. After all, we all want to write robust and maintainable code.

If you think about the regular experience of learning something new and practical, you may find that it is hard to find a definitive guide. From time to time, I encounter tutorials and blog posts that resemble something like this:

![draw-owl-meme](/assets/engx-coding-story/draw-an-owl.png)

Sometimes it is frustrating to find an interesting article, but not to be able to reproduce it or learn from it. But, It is nobody's fault 😉. It is hard to describe step-by-step code changes and stick to the topic. *CodingStories* solves the problem by introducing a useful medium to consume coding stories. From a user perspective, you have a nice and handy UI to go through coding stories and experience how to solve a particular task. Every coding story is based on a git repository. It is essential for a coding story to have a meaningful and clean git history. Additionally, you can always open a coding story locally and work with a git repository on your own.

## Writing *my* first coding story

Before starting coding, I investigated [coding.stories - author guide](https://codingstories.io/become-author/guide). It gave me somewhat understanding of a coding story and the potential ways I could write one.

My first coding story was about *Dependency Inversion Principle* (D from *SOLID*). I started with not terrible but still hardly testable version and gradually improved it to a more testable and clean solution.

Basically, I copied the initial solution and used the copy as a draft version. The draft version was based on the preliminary commit history. It is not final coding story. Anyway, having this draft helped me to understand the solution and project structure better. After that, it is was easy to reproduce the solution one more time.

A coding story author should introduce coding story instructions as part of a commit. So every step is essentially code changes and instructions defined in a dedicated file called `.story.md`.

I will not go through the details of the coding story (`discount-calculation-story-csharp`). Everything you need is there (kinda). I encourage you to try the interactive version, you may find it here:

> <https://codingstories.io/story/https:%2F%2Fgitlab.com%2FNikiforovAll%2Fdiscount-calculation-story-csharp>.

Source repository: <https://gitlab.com/NikiforovAll/discount-calculation-story-csharp>.

![discount-calculation-example](/assets/engx-coding-story/discount-calculation-example.png)

More coding stories: <https://codingstories.io/stories>

### Coding story writing principles

Here is a list of principle that I quite valuable after writing my first story:

* Keep git commit history clean and write concise commits
* Every commit should compile and pass unit tests
* Do not try to be perfect, focus on the goal of a coding story
* Do not hurry to write a coding story from the first try. It is better to figure out how the end solution will look like. Consider writing a coding story at the very end.
* Try to follow common project structure and code formatting guidelines. Examples can be found at <https://gitlab.com/codingstories>.

## Writing *your* first coding story

### Study the basics

Here is how to become an author: <https://codingstories.io/become-author/guide>. 🚀

### Use a template

I've prepared project template for *C#* and *Java*. It helps you to get started and promotes consistent coding story structure among other coding stories.

You can find it here <https://github.com/NikiforovAll/codingstories-template>, here is the changelog: <https://github.com/NikiforovAll/codingstories-template/blob/main/CHANGELOG.md>.

All you need to do is to install it via *dotnet-sdk*. I've prepared a docker wrapper for those who don't want to install *dotnet-sdk*, for more details, please see (ghcr.io/nikiforovall/coding-stories-scaffolder).

```bash
dotnet new --install CodingStories.Template::1.3.0
```

Check that template is installed successfully:

```bash
$ dotnet new -l | grep story
Coding Stories Template                       story-java           java        Epam/CodingStories
Coding Stories Template                       story                [C#]        Epam/CodingStories
```

Scaffold a coding story:

```bash
dotnet new story -n MyFirstCodingStory # --no-open-todo --no-devcontainer
```

The output of the command above:

```bash
$ tree
.
├── global.json
├── MyFirstCodingStory
│   ├── Class1.cs
│   └── MyFirstCodingStory.csproj
├── MyFirstCodingStory.sln
├── MyFirstCodingStory.Tests
│   ├── MyFirstCodingStory.Tests.csproj
│   └── UnitTest1.cs
├── README.md
└── TODO.html
```

### Write a coding story

I've decided to write a coding story on how to write a coding story. Don't you think it is a reasonable thing to do? 🤔

You can find it here:

> <https://codingstories.io/story/https%3A%2F%2Fgitlab.com%2FNikiforovAll%2Fcoding-story-coding-story> ⭐

Source repository: <https://gitlab.com/NikiforovAll/coding-story-coding-story>

### Generate a coding story link

To check your coding story, you need to prepare the URL that is based on gitlab repository. Note, currently, CodingStories caches coding stories for two hours, so please make sure that you read.

Down below you may find the form to generate a valid coding story link from gitlab repository link.


<div class="jumbotron">
  <div class="form-row align-items-center">
    <div class="row">
      <div class="col-md-8">
        <input class="form-control" id="inputUrl" placeholder="E.g.: https://gitlab.com/NikiforovAll/discount-calculation-story-csharp" value="https://gitlab.com/NikiforovAll/discount-calculation-story-csharp">
      </div>
      <div class="col-md-2">
        <button type="" class="btn btn-primary" id="generate-url">Generate CodingStory URL</button>
      </div>
    </div>
  </div>
  <div class="form-row">
    <div class="row">
      <div class="col-md-8">
        <input type="text" class="form-control" id="out-url" readonly>
      </div>
    </div>
  </div>
</div>

## Summary

I hope that I've intrigued you enough to write your first coding story. Let me know what you think!

---

<script> 
    var url = document.getElementById("inputUrl");
    document.getElementById("generate-url").addEventListener("click", function() {
        document.getElementById("out-url").value =  "https://codingstories.io/story/" + encodeURIComponent(url.value.trim());
    });
</script>
