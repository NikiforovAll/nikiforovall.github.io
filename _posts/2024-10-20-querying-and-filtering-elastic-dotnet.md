---
layout: post
title: "Querying and Filtering via Elastic.Clients.Elasticsearch in .NET"
categories: [ dotnet ]
tags: [ dotnet, elasticsearch, search ]
published: true
shortinfo: "Learn how to query and filter documents in Elasticsearch using the Elastic.Clients.Elasticsearch NuGet package."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

**Source code:** <https://github.com/NikiforovAll/elasticsearch-dotnet-playground/blob/main/src/elasticsearch-getting-started/01-keyword-querying-filtering.ipynb>

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Hands-on](#hands-on)
- [Querying](#querying)
  - [Full text queries](#full-text-queries)
    - [Match query](#match-query)
    - [Multi-match query](#multi-match-query)
- [Term-level Queries](#term-level-queries)
  - [Term search](#term-search)
    - [Range search](#range-search)
    - [Prefix search](#prefix-search)
    - [Fuzzy search](#fuzzy-search)
  - [Combining Query Conditions](#combining-query-conditions)
    - [bool.must (AND)](#boolmust-and)
    - [bool.should (OR)](#boolshould-or)
- [Filtering](#filtering)
  - [bool.filter](#boolfilter)
  - [bool.must\_not](#boolmust_not)
  - [Using Filters with Queries](#using-filters-with-queries)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

Querying and filtering are two fundamental operations when working with [Elasticsearch](https://www.elastic.co/docs). **Querying** involves searching for documents that match certain criteria, often using full-text search capabilities. This is useful when you need to find documents based on relevance or specific content. **Filtering**, on the other hand, is used to narrow down the search results by applying specific conditions, such as range filters or term filters. Filters are generally faster and more efficient because they do not score documents like queries do. Understanding the distinction between querying and filtering can help you optimize your search operations and improve the performance of your Elasticsearch queries.

## Hands-on

I've prepared a Jupyter notebook that demonstrates how to query and filter Elasticsearch using `Elastic.Clients.Elasticsearch`. You can find the source code [here](https://github.com/NikiforovAll/elasticsearch-dotnet-playground/blob/main/src/elasticsearch-getting-started/01-keyword-querying-filtering.ipynb).

<center>
    <video src="https://github.com/user-attachments/assets/12eaf406-537d-4013-9364-f5b5e69b90e8"
        width="90%"
        controls="controls" />
</center>

> ⚠️ Note: to run the queries that follow you need the "book_index" dataset from my previous post [Semantic Search with Elasticsearch in .NET](https://nikiforovall.github.io/dotnet/2024/10/19/semantic-search-via-elastic-dotnet.html).

## Querying

In the query context, a query clause answers the question *“How well does this document match this query clause?”*. In addition to deciding whether or not the document matches, the query clause also calculates a relevance score in the `_score` metadata field.

### Full text queries

Full text queries enable you to search analyzed text fields such as the body of an email. The query string is processed using the same analyzer that was applied to the field during indexing.

* **match**. The standard query for performing full text queries, including fuzzy matching and phrase or proximity queries.
* **multi-match**. The multi-field version of the match query.

#### Match query

Returns documents that `match` a provided text, number, date or boolean value. The provided text is analyzed before matching.

The `match` query is the standard query for performing a full-text search, including options for fuzzy matching.

💡 [Docs: Read more](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html#match-query-ex-request)

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q
        .Match(m => m
            .Field(f => f.Summary)
            .Query("guide"))
    )
    .Size(5)
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Match query</b></center>

<center>
  <img src="/assets/querying-elastic/q1.png" style="margin: 15px;" />
</center>

#### Multi-match query

The `multi_match` query builds on the match query to allow multi-field queries.

💡 [Docs: Read more](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html).

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q .MultiMatch(m => m
        .Fields(Fields.FromStrings(["summary", "title"]))
        .Query("javascript"))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Multi-match query</b></center>

<center>
  <img src="/assets/querying-elastic/q2.png" style="margin: 15px;" />
</center>

➕ Individual fields can be boosted with the **caret (^) notation**. Note in the following query how the score of the results that have "JavaScript" in their title is multiplied.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q .MultiMatch(m => m
        .Fields(Fields.FromStrings(["summary", "title^3"]))
        .Query("javascript"))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Multi-match query with boost</b></center>

<center>
  <img src="/assets/querying-elastic/q3.png" style="margin: 15px;" />
</center>

## Term-level Queries

You can use term-level queries to find documents based on precise values in structured data. Examples of structured data include date ranges, IP addresses, prices, or product IDs.

### Term search

Returns document that contain exactly the search term.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Term(t => t
        .Field(f => f.Publisher)
        .Value("addison-wesley"))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Term search</b></center>

<center>
  <img src="/assets/querying-elastic/q4.png" style="margin: 15px;" />
</center>

#### Range search

Returns documents that contain terms within a provided range.

The following example returns books that have at least 45 reviews.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Range(r => r
        .NumberRange(nr => nr.Field(f => f.num_reviews).Gte(45)))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Range search</b></center>

<center>
  <img src="/assets/querying-elastic/q5.png" style="margin: 15px;" />
</center>

#### Prefix search

Returns documents that contain a specific prefix in a provided field.

💡 [Docs: Read more](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-prefix-query.html).

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Prefix(p => p
        .Field(f => f.Title)
        .Value("java"))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Prefix search</b></center>

<center>
  <img src="/assets/querying-elastic/q6.png" style="margin: 15px;" />
</center>

#### Fuzzy search

Returns documents that contain terms similar to the search term, as measured by a *Levenshtein edit* distance.

An edit distance is the number of one-character changes needed to turn one term into another. These changes can include:

- Changing a character (box → fox)
- Removing a character (black → lack)
- Inserting a character (sic → sick)
- Transposing two adjacent characters (act → cat)

💡 [Docs: Read more](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-fuzzy-query.html).

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q
        .Fuzzy(f => f
            .Field(ff => ff.Title)
            .Value("pyvascript")
        )
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Fuzzy search</b></center>

<center>
  <img src="/assets/querying-elastic/q7.png" style="margin: 15px;" />
</center>

### Combining Query Conditions

Compound queries wrap other compound or leaf queries, either to combine their results and scores, or to change their behaviour. They also allow you to switch from query to filter context, but that will be covered later in the Filtering section.

#### bool.must (AND)

The clauses must appear in matching documents and will contribute to the score. This effectively performs an "AND" logical operation on the given sub-queries.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Bool(b => b
        .Must(m => m
            .Term(t => t
                .Field(f => f.Publisher)
                .Value("addison-wesley")
            ),
            m => m
            .Term(t => t
                .Field(f => f.Authors)
                .Value("richard helm")
            )
        ))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>bool.must (AND)</b></center>

<center>
  <img src="/assets/querying-elastic/q8.png" style="margin: 15px;" />
</center>

#### bool.should (OR)

The clause should appear in the matching document. This performs an "OR" logical operation on the given sub-queries.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Bool(b => b
        .Should(m => m
            .Term(t => t
                .Field(f => f.Publisher)
                .Value("addison-wesley")
            ),
            m => m
            .Term(t => t
                .Field(f => f.Authors)
                .Value("richard helm")
            )
        ))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>bool.should (OR)</b></center>

<center>
  <img src="/assets/querying-elastic/q9.png" style="margin: 15px;" />
</center>

## Filtering
In a filter context, a query clause answers the question “Does this document match this query clause?” The answer is a simple Yes or No — no scores are calculated. Filter context is mostly used for filtering structured data, for example:

- Does this `timestamp` fall into the range 2015 to 2016?
- Is the `status` field set to *"published"*?

Filter context is in effect whenever a query clause is passed to a `filter` parameter, such as the `filter` or `must_not` parameters in the `bool` query.

💡 [Docs: Read more](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html).

### bool.filter

The clause (query) must appear for the document to be included in the results. Unlike query context searches such as term, bool.must or bool.should, a matching score isn't calculated because filter clauses are executed in filter context.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Bool(b => b
        .Filter(m => m
            .Term(t => t
                .Field(f => f.Publisher)
                .Value("prentice hall")
            )
        ))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>bool.filter</b></center>

<center>
  <img src="/assets/querying-elastic/q10.png" style="margin: 15px;" />
</center>

### bool.must_not

The clause (query) must not appear in the matching documents. Because this query also runs in filter context, no scores are calculated; the filter just determines if a document is included in the results or not.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Bool(b => b
        .MustNot(m => m
            .Range(r => r.NumberRange(nr => nr.Field(f => f.num_reviews).Lte(45)))
        ))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>bool.must_not</b></center>

<center>
  <img src="/assets/querying-elastic/q11.png" style="margin: 15px;" />
</center>

### Using Filters with Queries

Filters are often added to search queries with the intention of limiting the search to a subset of the documents. A filter can cleanly eliminate documents from a search, without altering the relevance scores of the results.

The next example returns books that have the word "javascript" in their title, only among the books that have more than 45 reviews.

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Query(q => q.Bool(b => b
        .Must(m => m
            .Match(t => t
                .Field(f => f.Title).Query("javascript")
            )
        )
        .MustNot(m => m
            .Range(r => r.NumberRange(nr => nr.Field(f => f.num_reviews).Lte(45)))
        ))
    )
);

DumpRequest(searchResponse);
PrettyPrint(searchResponse);
```

<center>⚙️Output: <b>Filters and Queries</b></center>

<center>
  <img src="/assets/querying-elastic/q12.png" style="margin: 15px;" />
</center>

## Conclusion

That is all for now! 🎉 We've covered the basics of querying and filtering in Elasticsearch using the `Elastic.Clients.Elasticsearch` NuGet package. Understanding how to construct queries and filters can help you build powerful search capabilities in your applications.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- <https://github.com/NikiforovAll/elasticsearch-dotnet-playground/tree/main/src/elasticsearch-getting-started>
- <https://github.com/NikiforovAll/elasticsearch-dotnet-playground/blob/main/src/elasticsearch-getting-started/01-keyword-querying-filtering.ipynb>
