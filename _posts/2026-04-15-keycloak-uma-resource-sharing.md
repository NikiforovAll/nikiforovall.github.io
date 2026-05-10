---
layout: post
title: "User-Managed Access (UMA) 2.0 Resource Sharing with Keycloak and .NET"
categories: [ dotnet, keycloak ]
tags: [ aspnetcore, dotnet, keycloak, auth ]
published: true
shortinfo: "User-managed access control with Keycloak UMA 2.0: let resource owners decide who gets access, with a Blazor Server + Minimal API sample."
fullview: false
comments: true
related: true
mermaid: true
image: /assets/keycloak-uma/banner-v2.png
---

## TL;DR

- UMA 2.0 lets resource owners control access to their stuff. Think Google Drive sharing, but wired into your authorization server.
- Keycloak.AuthServices now supports the challenge-response flow (automatic ticket-for-RPT exchange) and async approval (request, wait for owner, get in).
- A Blazor Server + Minimal API sample shows the full flow. `UmaTokenHandler` handles the UMA dance behind the scenes.
- `IKeycloakProtectionClient` covers the permission ticket lifecycle: create, list, approve, deny.

**Source code**: <https://github.com/NikiforovAll/keycloak-authorization-services-dotnet/tree/main/samples/UmaResourceSharing>

<center>
    <img src="/assets/keycloak-uma/banner-v2.png" style="margin: 15px;" width="70%">
</center>

---

## What is UMA?

Most authorization systems work the same way: the resource server decides who gets access based on roles, claims, or policies that an admin defined. But what if the *resource owner*, not the admin, should make that call?

User-Managed Access (UMA) is an OAuth 2.0 extension that flips this. Alice can grant or revoke access to her resources for bob, without an admin involved, and without needing to be online when bob asks.

You've seen this pattern before:
- Sharing a Google Doc with specific people
- Granting a colleague access to a private GitHub repo
- Approving a permission request in a cloud console

What makes UMA different from regular OAuth is the asynchronous approval step. Bob requests access, alice reviews it later, and only then does bob get in.

### Key concepts

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th>Concept</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Resource Owner</strong></td>
      <td>The user who owns the protected resource</td>
    </tr>
    <tr>
      <td><strong>Requesting Party</strong></td>
      <td>A user who wants access to someone else's resource</td>
    </tr>
    <tr>
      <td><strong>Permission Ticket</strong></td>
      <td>A one-time challenge token representing an access request</td>
    </tr>
    <tr>
      <td><strong>RPT (Requesting Party Token)</strong></td>
      <td>An access token enriched with specific resource permissions</td>
    </tr>
    <tr>
      <td><strong>Protection API</strong></td>
      <td>Keycloak API for managing resources, permissions, and tickets</td>
    </tr>
  </tbody>
</table>

---

## Demo

Here's what this looks like in the Blazor sample.

### alice (resource owner), instant access

Alice owns `shared-document`, so authorization succeeds right away:

<p align="center">
  <img src="/assets/keycloak-uma/uma-resource-sharing-login.gif" alt="Login and Resource Owner Access"/>
</p>

### bob requests access, alice approves

Bob has no permission. He submits a request, alice approves it, then bob retries and gets in:

<p align="center">
  <img src="/assets/keycloak-uma/uma-resource-sharing-approve.gif" alt="Request Access and Owner Approval"/>
</p>

### bob (no permission), access denied

Without approval, bob gets a clear "Access Denied":

<p align="center">
  <img src="/assets/keycloak-uma/uma-resource-sharing-denied.gif" alt="Access Denied"/>
</p>

---

## How the UMA flow works

Two flows, working together.

### Challenge-response (instant access)

When a user already has permission, the client handles the exchange automatically:

<div class="mermaid">
sequenceDiagram
    participant User as User (Browser)
    participant Client as Client App
    participant RS as Resource Server
    participant KC as Keycloak

    User->>Client: Access protected resource
    Client->>RS: GET /resource (Bearer token)
    RS->>KC: Evaluate permissions
    KC-->>RS: 403 (no permission yet)
    RS->>KC: Create permission ticket
    KC-->>RS: ticket="abc123..."
    RS-->>Client: 401 WWW-Authenticate: UMA ticket="abc123..."
    Client->>KC: Exchange ticket for RPT
    KC-->>Client: RPT (with permissions)
    Client->>RS: GET /resource (Bearer RPT)
    RS-->>Client: 200 OK — resource content
</div>

`UmaTokenHandler` handles steps 6-9. Your code just makes HTTP calls as usual.

### Async approval (request, approve, access)

When a user has no permission, they submit a request. The resource owner reviews it later:

<div class="mermaid">
sequenceDiagram
    participant Bob as Bob
    participant App as Application
    participant KC as Keycloak
    participant Alice as Alice (Owner)

    Bob->>App: Request access to resource
    App->>KC: Create permission ticket (granted=false)
    KC-->>App: 201 Created
    App-->>Bob: "Request submitted"

    Note over Alice: Alice logs in later

    Alice->>App: View pending requests
    App->>KC: GET permission tickets (granted=false)
    KC-->>App: Pending tickets list
    Alice->>App: Approve bob's request
    App->>KC: Update ticket (granted=true)

    Note over Bob: Bob retries

    Bob->>App: Access resource
    App->>KC: Evaluate permissions
    KC-->>App: Permitted
    App-->>Bob: Resource content
</div>

---

## Architecture

Two projects: a Blazor Server client talks to a Minimal API resource server. Keycloak sits in the middle, handling authorization decisions and permission tickets.

<div class="mermaid" style="text-align: center;">
graph LR
    subgraph Aspire AppHost
        KC[Keycloak<br/>Authorization Server]
        RS[Resource Server<br/>Minimal API]
        CA[Client App<br/>Blazor Server]
    end

    CA -->|HTTP + Bearer Token| RS
    RS -->|Authorization Check| KC
    RS -->|Permission Ticket Creation| KC
    CA -->|Ticket → RPT Exchange| KC
</div>

### Resource server

The resource server protects endpoints with `RequireProtectedResource()` and returns `WWW-Authenticate: UMA` challenges on authorization failure via `AddUmaPermissionTicketChallenge()`:

```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddKeycloakWebApi(configuration, options =>
    {
        options.Audience = "uma-resource-server";
        options.RequireHttpsMetadata = false;
    });

// Authorization + UMA challenge handler
services.AddAuthorization()
    .AddKeycloakAuthorization()
    .AddUmaPermissionTicketChallenge();

services.AddAuthorizationServer(configuration)
    .AddStandardResilienceHandler();

// Protection API for ticket management
services.AddKeycloakProtectionHttpClient(configuration)
    .AddClientCredentialsTokenHandler(tokenClientName);

// Protected endpoints
app.MapGet("/documents/{name}", (string name) =>
        new DocumentResponse(name, $"Content of {name}"))
    .RequireProtectedResource("shared-document", "read");

app.MapGet("/documents/{name}/details", (string name) =>
        new DocumentResponse(name, $"Detailed content of {name}"))
    .RequireProtectedResource("shared-document", "write");
```

It also exposes permission ticket management endpoints:

```csharp
// Bob submits an access request
app.MapPost("/permissions/request", async (...) =>
{
    // ...
    var ticket = new PermissionTicket
    {
        Resource = resourceId, Requester = userId,
        ScopeName = "read", Granted = false,
    };
    await protectionClient.CreatePermissionTicketWithResponseAsync(realm, ticket);
}).RequireAuthorization();

// Alice lists pending requests
app.MapGet("/permissions/pending", async (...) =>
{
    return await protectionClient.GetPermissionTicketsAsync(realm,
        new GetPermissionTicketsRequestParameters { Granted = false, ReturnNames = true });
}).RequireAuthorization();

// Alice approves
app.MapPut("/permissions/{id}/approve", async (...) =>
{
    await protectionClient.UpdatePermissionTicketAsync(realm,
        new PermissionTicket { Id = id, Granted = true });
}).RequireAuthorization();
```

### Client app (Blazor Server)

The Blazor client registers `UmaTokenHandler` from `Keycloak.AuthServices.Authorization.Uma`. It's a `DelegatingHandler` that intercepts 401+UMA responses and handles the ticket exchange:

```csharp
// UMA ticket exchange client
services.AddKeycloakUmaTicketExchangeHttpClient(configuration);

// HTTP client with UMA handling
services.AddHttpClient("ResourceServer", (sp, client) =>
    {
        var config = sp.GetRequiredService<IConfiguration>();
        var baseUrl = config["services:resource-server:http:0"];
        client.BaseAddress = new Uri(baseUrl);
    })
    .AddUmaTokenHandler();
```

What `UmaTokenHandler` does:
1. Attaches the user's access token to outgoing requests
2. On `401` with `WWW-Authenticate: UMA`, extracts the permission ticket
3. Exchanges the ticket for an RPT at Keycloak's token endpoint
4. Retries the original request with the RPT

From the Blazor component side, none of this is visible. You just make HTTP calls:

```csharp
var response = await Http.GetAsync($"/documents/{documentName}");
if (response.IsSuccessStatusCode)
{
    var document = await response.Content.ReadFromJsonAsync<Document>();
}
```

---

## Keycloak setup

UMA needs a few things configured in Keycloak:

1. A confidential client with Authorization Services enabled (the resource server)
2. A resource with `ownerManagedAccess: true` and scopes like `read`, `write`
3. An owner policy that grants the resource owner access
4. An OIDC client for user login, with an audience mapper pointing to the resource server

The [sample](https://github.com/NikiforovAll/keycloak-authorization-services-dotnet/tree/main/samples/UmaResourceSharing) ships with pre-configured Keycloak realm exports, so you can just run it:

```bash
dotnet run --project samples/UmaResourceSharing/AppHost
```

Aspire opens the dashboard automatically with Keycloak, the resource server, and the Blazor app.

---

## Summary

Role-based access control doesn't cover the case where users share resources with each other. UMA does.

With Keycloak.AuthServices you get `UmaTokenHandler` for the challenge-response dance, `AddUmaPermissionTicketChallenge()` for resource servers, and `IKeycloakProtectionClient` for managing permission tickets. The sample runs with a single `dotnet run` via Aspire.

---

## References

- [Documentation: UMA 2.0](https://nikiforovall.github.io/keycloak-authorization-services-dotnet/protection-api/uma)
- [Documentation: UMA Examples](https://nikiforovall.github.io/keycloak-authorization-services-dotnet/examples/uma-resource-sharing)
- [Sample source code](https://github.com/NikiforovAll/keycloak-authorization-services-dotnet/tree/main/samples/UmaResourceSharing)
- [Keycloak Authorization Services Guide](https://www.keycloak.org/docs/latest/authorization_services/index.html)
- [UMA 2.0 Specification](https://docs.kantarainitiative.org/uma/wg/rec-oauth-uma-grant-2.0.html)

> Join us on Discord: [![Discord](https://img.shields.io/discord/1236946465318768670?color=blue&label=Chat%20on%20Discord)](https://discord.gg/jdYFw2xq)
