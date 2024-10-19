---
layout: post
title: "Semantic Search with Elasticsearch in .NET"
categories: [ dotnet ]
tags: [ dotnet, elasticsearch, ai, rag ]
published: true
shortinfo: "This post demonstrates how to perform Semantic Search using Elasticsearch and Polyglot Notebooks"
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

In this post, we will explore how to perform Semantic Search in .NET.

**Source code:** <https://github.com/NikiforovAll/elasticsearch-dotnet-playground/blob/main/src/elasticsearch-getting-started/00-quick-start.ipynb>

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Initialize the Elasticsearch Client](#initialize-the-elasticsearch-client)
- [Generate Embeddings](#generate-embeddings)
- [Index Data](#index-data)
- [Making queries](#making-queries)
  - [Semantic Search](#semantic-search)
  - [Semantic Search and Filtering](#semantic-search-and-filtering)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

Semantic search is a technique used to improve search accuracy by understanding the contextual meaning of terms within a search query. Unlike traditional keyword-based search, which matches exact words, semantic search aims to understand the intent and contextual meaning behind the words. This approach improves search results and provides more relevant information to the user.

## Getting Started

I've prepared a Jupyter notebook that demonstrates how to perform a semantic search using the `Elastic.Clients.Elasticsearch`. You can find the source code [here](https://github.com/NikiforovAll/elasticsearch-dotnet-playground/blob/main/src/elasticsearch-getting-started/00-quick-start.ipynb).

<center>
    <video src="https://github.com/user-attachments/assets/25bdd7d9-d845-4c2c-9222-867129137b2b" width="90%" controls="controls" />
</center>

---

📝 Down below, I will guide you through the main steps of the notebook:

1. Initialize the Elasticsearch Client
2. Generate Embeddings
3. Index Data
4. Making queries

## Initialize the Elasticsearch Client

We can use `Testcontainers` to run Elasticsearch from the notebook. Here is how you can do it:

```csharp
var elasticsearchContainer =  new ElasticsearchBuilder()
    .WithPortBinding(9200, 9200)
    .WithPortBinding(9300, 9300)
    .WithReuse(true)
    .Build();
await elasticsearchContainer.StartAsync();
var connectionString = elasticsearchContainer.GetConnectionString(); // https://elastic:elastic@127.0.0.1:9200/
```

Now, we can initialize the Elasticsearch client:

```csharp
var elasticSettings = new ElasticsearchClientSettings(connectionString)
    .DisableDirectStreaming()
    .ServerCertificateValidationCallback(CertificateValidations.AllowAll);

var client = new ElasticsearchClient(elasticSettings);
```

Let's see if it works:

```csharp
var info = await client.InfoAsync();

DumpResponse(info);
```

And here is the output:

```json
{
  "name": "35937efa7867",
  "cluster_name": "docker-cluster",
  "cluster_uuid": "IZOZjoDyRpKHFN1sNGjs1g",
  "version": {
    "number": "8.6.1",
    "build_flavor": "default",
    "build_type": "docker",
    "build_hash": "180c9830da956993e59e2cd70eb32b5e383ea42c",
    "build_date": "2023-01-24T21:35:11.506992272Z",
    "build_snapshot": false,
    "lucene_version": "9.4.2",
    "minimum_wire_compatibility_version": "7.17.0",
    "minimum_index_compatibility_version": "7.0.0"
  },
  "tagline": "You Know, for Search"
}
```

🙌 Everything looks good so far, let's continue and see how to generate and embeddings.

## Generate Embeddings

Embeddings are a type of representation for text where words, phrases, or even entire documents are mapped to vectors of real numbers. These vectors capture the semantic meaning of the text, allowing for more nuanced and context-aware comparisons between different pieces of text.

Traditional keyword-based search might not recognize "car" and "automobile" as related, but embeddings will map these words to similar vectors, understanding that they are synonyms and thus improving search relevance.

We can use `Microsoft.Extensions.AI.OpenAI` and `Azure.AI.OpenAI` NuGet packages to create an instance of `IEmbeddingGenerator`:
```csharp
var client = new AzureOpenAIClient(new Uri(envs["AZURE_OPENAI_ENDPOINT"]), new ApiKeyCredential(envs["AZURE_OPENAI_APIKEY"]));

IEmbeddingGenerator<string,Embedding<float>> generator = client.AsEmbeddingGenerator(modelId: "text-embedding-3-small");
```

We can implement `ToEmbedding` method to convert a string to an embedding:

```csharp
async Task<float[]> ToEmbedding(string text) {
    var dimension = 384;
    GeneratedEmbeddings<Embedding<float>> embeddings = await generator
        .GenerateAsync(text, new EmbeddingGenerationOptions{
            AdditionalProperties = new AdditionalPropertiesDictionary{
                {"dimensions", dimension}
            }
        });

    return embeddings.First().Vector.ToArray();
}
```

```csharp
float[] embedding = await ToEmbedding("The quick brown fox jumps over the lazy dog");
display($"Dimensions length = {embedding.Length}");
```

## Index Data

Assume we have a dataset with information about popular programming books. The data model can be defined as following:

```csharp
public class Book
{
    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("summary")]
    public string Summary { get; set; }

    [JsonPropertyName("authors")]
    public List<string> Authors { get; set; }

    [JsonPropertyName("publish_date")]
    public DateTime publish_date { get; set; }

    [JsonPropertyName("num_reviews")]
    public int num_reviews { get; set; }

    [JsonPropertyName("publisher")]
    public string Publisher { get; set; }

    public float[] TitleVector { get; set; }
}
```

Now, we can create an index with the following mapping:

```csharp
var indexDescriptor = new CreateIndexRequestDescriptor<Book>("book_index")
    .Mappings(m => m
        .Properties(pp => pp
            .Text(p => p.Title)
            .DenseVector(
                Infer.Property<Book>(p => p.TitleVector),
                d => d.Dims(dimension).Index(true).Similarity(DenseVectorSimilarity.Cosine))
            .Text(p => p.Summary)
            .Date(p => p.publish_date)
            .IntegerNumber(p => p.num_reviews)
            .Keyword(p => p.Publisher)
        )
    );

await client.Indices.CreateAsync<Book>(indexDescriptor);
```

Note that we are using the `DenseVector` type to store the embeddings. We also specify the `Cosine` similarity function to compare the vectors.

Let's download the test data and calculate "Title" field embeddings:

```csharp
var http = new HttpClient();
var url = "https://raw.githubusercontent.com/elastic/elasticsearch-labs/main/notebooks/search/data.json";
var books =  await http.GetFromJsonAsync<Book[]>(url);

foreach (var book in books)
{
    book.TitleVector = await ToEmbedding(book.Title);
}
```

Now we can use Bulk API to upload data to Elasticsearch.

```csharp
await client.BulkAsync("book_index", d => d.IndexMany<Book>(books, (bd, b) => bd.Index("book_index")));
```

## Making queries

Let's use the keyword search to see if we have relevant data indexed. For example, we can search for books that contain **"JavaScript"** in the title:

```csharp
var searchResponse = await client.SearchAsync<Book>(s => s
    .Index("book_index")
    .Query(q => q.Match(m => m.Field(f => f.Title).Query("JavaScript")))
);

DumpRequest(searchResponse);
searchResponse.Documents.Select(x => x.Title).DisplayTable();
```

⚙️Output:

<center>
  <img src="/assets/semantic-search-elastic/q1.png" style="margin: 15px;" width="80%">
</center>

### Semantic Search

🎯 We want to perform a semantic search for books that are similar to a given query. We embed the query and perform a search.

Let's say we want to find **"javascript books"**. We can use the KNN search to find the top 5 books that are similar to the `searchQuery`.

```csharp
var searchQuery = "javascript books";
var queryEmbedding = await ToEmbedding(searchQuery);
var searchResponse = await client.SearchAsync<Book>(s => s
    .Index("book_index")
    .Knn(d => d
        .Field(f => f.TitleVector)
        .QueryVector(queryEmbedding)
        .k(5)
        .NumCandidates(100))
);

var threshold = 0.7;
searchResponse.Hits
    .Where(x => x.Score > threshold)
    .Select(x => new { x.Source.Title, x.Score })
    .DisplayTable();
```

⚙️Output:

<center>
  <img src="/assets/semantic-search-elastic/q2.png" style="margin: 15px;" width="80%">
</center>

### Semantic Search and Filtering

Filter context is mostly used for filtering structured data. For example, use filter context to answer questions like:

* Does this timestamp fall into the range 2015 to 2016?
* Is the status field set to "published"?

Filter context is in effect whenever a query clause is passed to a filter parameter, such as the filter or must_not parameters in a bool query.

[Learn more](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html#filter-context) about filter context in the Elasticsearch docs.

The example below retrieves the top books that are similar to "javascript books" based on their title vectors, and also Addison-Wesley as publisher.

```csharp
var searchQuery = "javascript books";
var queryEmbedding = await ToEmbedding(searchQuery);
var searchResponse = await client.SearchAsync<Book>(s => s
    .Index("book_index")
    .Knn(d => d
        .Field(f => f.TitleVector)
        .QueryVector(queryEmbedding)
        .k(5)
        .NumCandidates(100)
        .Filter(f => f.Term(t => t.Field(p => p.Publisher).Value("addison-wesley"))) 
    )
);

searchResponse.Hits
    .Select(x => new { x.Source.Title, x.Score })
    .DisplayTable(); 
```

⚙️Output:

<center>
  <img src="/assets/semantic-search-elastic/q3.png" style="margin: 15px;" width="80%">
</center>

## Conclusion


> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- <https://github.com/elastic/elasticsearch-labs>
- <https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html>
- <https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource>
- <https://www.galileo.ai/blog/mastering-rag-how-to-select-an-embedding-model>
