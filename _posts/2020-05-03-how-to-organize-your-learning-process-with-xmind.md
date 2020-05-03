---
layout: post
title: How to organize learning process with mindmaps, spreadsheets and .NET Core
categories: [productivity]
tags: [.NET, mindmaps]
shortinfo: Visualization of current learning progress as mindmap. Solution is based on <a href="https://nikiforovall.github.io/xmindcsharp/">XMindCsharp</a>.
fullview: false
comments: true
hide-related: true
link-list: https://www.theurlist.com/edu-scope-to-mindmap
---

I prefer reading books from cover to cover and taking notes quite frequently. At the same, I tend to have multiple items on my reading list. It feels frustrating to get back to an awesome book and realize I need to revision it all over again. So I decided to organize it a little bit. I think the best way to organize the learning process is to envision the end goal and have sensible timelines.

For the sake of simplicity, I use google spreadsheets as storage and [XMind](https://www.xmind.net/) as a visualization tool. *XMind* is a great tool to visualize and [brainstorm](https://babokpage.wordpress.com/techniques/brainstorming/) some ideas.

### 💡 My take on it

* Determine the list of books and materials to learn for the next sprint (e.g. quarter, half of a year)
* Set priority and categorize
* Add corresponding notes to [Evernote](https://evernote.com/) for each book, course, etc. It is quite easy to generate internal link in *Evernote* and access it from spreadsheet directly.
* Generate mindmap and play with it so it is possible to estimate and create a plan to take further actions.
* Manage progress and perform retrospective when you feel you need it. 🔁

### Books for .NET Developer

Here is the the list of really good books to consider:

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Book</th>
      <th scope="col">Author</th>
    </tr>
  </thead>
  <tbody>
        <tr>
      <th scope="row"><a href="https://www.mazon.com/C-Depth-Jon-Skeet/dp/1617294535">C# in Depth (4th) - 2019</a></th>
      <td colspan="2">Jon Skeet</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/8-0-NET-Core-3-0-Cross-Platform/dp/1788478126">C# 8.0 and .NET Core 3.0</a></th>
      <td colspan="2">Mark J. Price</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/Programming-8-0-Windows-Desktop-Applications/dp/1492056812">Programming C# 8.0 - Build Cloud, Web, and Desktop Applications</a></th>
      <td colspan="2">Ian Griffiths</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/NET-Core-Action-Dustin-Metzgar/dp/1617294276">.NET Core in Action</a></th>
      <td colspan="2">Dustin Metzgar</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/Unit-Testing-Principles-Practices-Patterns/dp/1617296279">Unit Testing Principles, Practices, and Patterns</a></th>
      <td colspan="2">Vladimir Khorikov</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/Concurrency-Cookbook-Asynchronous-Multithreaded-Programming-ebook/dp/B07WRN3SSK">Concurrency in C# Cookbook: Asynchronous, Parallel, and Multithreaded Programming</a></th>
      <td colspan="2">Stephen Cleary</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/Under-Hood-NET-Memory-Management/dp/1906434751">Under the Hood of .NET Memory Management</a></th>
      <td colspan="2">Chris Farrell</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/Designing-Data-Intensive-Applications-Reliable-Maintainable/dp/1449373321">Designing Data-Intensive Applications</a></th>
      <td colspan="2">Martin Kleppmann</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://docs.icrosoft.com/en-us/dotnet/architecture/microservices/">.NET Microservices: Architecture for Containerized .NET Applications</a></th>
      <td colspan="2">Cesar de la Torre</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://zure.microsoft.com/en-us/resources/designing-distributed-systems/">Designing Distributed Systems</a></th>
      <td colspan="2">Brendan Burns</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.mazon.com/Agile-Principles-Patterns-Practices-C/dp/0131857258">Agile Principles, Patterns, and Practices in C#</a></th>
      <td colspan="2">Robert C. Martin</td>
    </tr>
    <tr>
      <th scope="row"><a href="https://www.amazon.com/Pragmatic-Programmer-Journeyman-Master-ebook/dp/B003GCTQAE">The Pragmatic Programmer, From Journeyman To Master</a></th>
      <td colspan="2">Andrew Hunt</td>
    </tr>
  </tbody>
</table>


![input_1](/assets/edu-scope/input_1.png)

### Build mindmaps programmatically

I've created library [XMindCSharp](https://nikiforovall.github.io/xmindcsharp/) for .NET to build mindmaps that you can open with ([XMind](https://www.xmind.net/)).
You can work with it like this:

```csharp
var book = new XMindConfiguration()
                .WithFileWriter("./output", zip: true)
                .CreateWorkBook(workbookName: "test.xmind");
var rootTopic = book.GetPrimarySheet()
    .GetRootTopic();
rootTopic.SetTitle("Scope");
rootTopic.Add(epicTopic);
//...
```

Also, I've developed simple CLI application [edu-scope-to-mindmap](https://github.com/NikiforovAll/edu-scope-to-mindmap) to create mindmaps from excel spreadsheet I've mentioned above.

To use it, run next command from project directory:

```bash
$ dotnet run --path ./ouput --name test.xmind --source-path input/input.xlsx
```

![output_1](/assets/edu-scope/example_output1.png)

Sometimes it is hard to pick a bite that I can chew on 😆.

![output_2](/assets/edu-scope/output_2.png)

### Summary

I've introduced lightweight approach to organize your learning process. Personally, I find it useful because learning is essential part of my craft and you better do it well 😉.

If you want to organize you learning process the way I do, please feel free to use: [template.xlsx](https://github.com/NikiforovAll/nikiforovall.github.io/blob/master/assets/edu-scope/Template.xlsx) + [edu-scope-to-mindmap](https://github.com/NikiforovAll/edu-scope-to-mindmap)

---
