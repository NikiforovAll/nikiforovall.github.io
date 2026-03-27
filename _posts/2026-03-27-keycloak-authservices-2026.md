---
layout: post
title: "What's new in Keycloak.AuthServices v2.9.0"
categories: [ dotnet, keycloak ]
tags: [ aspnetcore, dotnet, keycloak, auth ]
published: true
shortinfo: "Organization authorization, token introspection for lightweight tokens, RFC 8414 metadata discovery, and more."
fullview: false
comments: true
related: true
mermaid: true
---

## What's new

[Keycloak.AuthServices](https://github.com/NikiforovAll/keycloak-authorization-services-dotnet) just got a round of updates. Keycloak itself has changed a lot between versions 24 and 26 -- lightweight access tokens, organizations, RFC 8414 metadata -- and the .NET library needed to catch up.

This post walks through the three biggest additions.

---

| Package                                | Version                                                                                                                                              | Description                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Keycloak.AuthServices.Authentication` | [![Nuget](https://img.shields.io/nuget/v/Keycloak.AuthServices.Authentication.svg)](https://nuget.org/packages/Keycloak.AuthServices.Authentication) | Authentication for API and Web Apps                                  |
| `Keycloak.AuthServices.Authorization`  | [![Nuget](https://img.shields.io/nuget/v/Keycloak.AuthServices.Authorization.svg)](https://nuget.org/packages/Keycloak.AuthServices.Authorization)   | Authorization Services + Authorization Server integration            |
| `Keycloak.AuthServices.Authorization.TokenIntrospection` | [![Nuget](https://img.shields.io/nuget/v/Keycloak.AuthServices.Authorization.TokenIntrospection.svg)](https://nuget.org/packages/Keycloak.AuthServices.Authorization.TokenIntrospection) | Token introspection for lightweight access tokens |
| `Keycloak.AuthServices.Sdk`            | [![Nuget](https://img.shields.io/nuget/v/Keycloak.AuthServices.Sdk.svg)](https://nuget.org/packages/Keycloak.AuthServices.Sdk)                       | Admin API and Protection API                                         |
| `Keycloak.AuthServices.Sdk.Kiota`      | [![Nuget](https://img.shields.io/nuget/v/Keycloak.AuthServices.Sdk.Kiota.svg)](https://nuget.org/packages/Keycloak.AuthServices.Sdk.Kiota)           | Admin API based on OpenAPI (Kiota-generated)                         |

---

## Organization authorization

Keycloak 24 introduced [organizations](https://www.keycloak.org/docs/latest/server_admin/#_managing_organizations) as a first-class concept -- and for multi-tenant applications, this changes things.

Before organizations, multi-tenancy in Keycloak usually meant one realm per tenant (operational headache) or custom attributes and groups hacked together to represent "who belongs where". Organizations give you a built-in abstraction: users belong to organizations, organizations have their own identity providers, and membership shows up directly in the token.

For a SaaS app, this means you can stop reinventing tenant isolation. Keycloak manages the "which user belongs to which tenant" question, and the token carries that answer. Your API just needs to enforce it.

The library picks that up and gives you authorization policies that work with it.

Keycloak produces two claim formats depending on the Organization Membership Mapper configuration -- a simple string array or a rich JSON map with IDs and attributes. Both are handled transparently.

To include organization membership in tokens, request the `organization:*` scope. The plain `organization` scope alone does **not** include the claim.

### Require any organization membership

The simplest check -- the user must belong to at least one organization:

```csharp
app.MapGet("/orgs", () => "You belong to an org")
    .RequireOrganizationMembership();
```

### Require a specific organization

```csharp
app.MapGet("/acme/settings", () => "Acme settings")
    .RequireOrganizationMembership("acme-corp");
```

### Resolve the organization from route or header

Sometimes the organization comes from the request itself. The library ships with built-in resolvers for routes, headers, and query parameters:

```csharp
app.MapGet("/orgs/{orgId}/projects", (string orgId) => $"Projects for {orgId}")
    .RequireOrganizationMembership("{orgId}");

app.MapGet("/tenant/projects", () => "Tenant projects")
    .RequireOrganizationMembership<RouteHandlerBuilder, HeaderParameterResolver>("{X-Organization}");
```

### Policy-based approach

If you prefer named policies:

```csharp
services.AddKeycloakAuthorization()
    .AddAuthorizationBuilder()
    .AddPolicy("AcmeOnly", policy =>
        policy.RequireOrganizationMembership("acme-corp")
              .RequireRealmRoles("user"));
```

### Imperative authorization

For more dynamic scenarios:

```csharp
var result = await authorizationService.AuthorizeAsync(
    user, null, new OrganizationRequirement(orgId));
```

The `OrganizationRequirementHandler` reads the `organization` claim, parses the JSON structure Keycloak emits, and checks membership. You can configure which claim type to look at if your setup uses a non-default claim name.

---

## Token introspection for lightweight access tokens

This one bit me in production. Keycloak 24+ supports lightweight access tokens -- valid signed JWTs, but intentionally stripped of business claims like `resource_access`, `realm_access`, and `preferred_username`. The idea is to keep tokens small.

The problem: role-based authorization silently fails. `KeycloakRolesClaimsTransformation` looks for `resource_access`, finds nothing, maps no roles. Every role check returns 403. No errors, no warnings. Just 403s.

The fix is [token introspection](https://datatracker.ietf.org/doc/html/rfc7662). You send the token back to Keycloak's introspection endpoint and get the full claim set.

### Installation

Token introspection ships as a separate package:

```bash
dotnet add package Keycloak.AuthServices.Authorization.TokenIntrospection
```

### Enabling introspection

```csharp
services.AddKeycloakWebApiAuthentication(configuration);

services.AddKeycloakAuthorization(options =>
{
    options.EnableRolesMapping = RolesClaimTransformationSource.All;
});

services.AddKeycloakTokenIntrospection(configuration);
```

That's it. The `AddKeycloakTokenIntrospection` call registers a claims transformation that:

1. Checks if expected claims (`resource_access`, `realm_access`) are already present
2. If missing, calls the introspection endpoint with client credentials
3. Merges the the full claim set into the `ClaimsPrincipal`
4. Caches results per token to avoid redundant calls

The existing role mapping transformation runs after introspection, so everything works transparently.

### Configuration

Via `appsettings.json`:

```json
{
  "Keycloak": {
    "realm": "my-realm",
    "auth-server-url": "https://keycloak.example.com/",
    "resource": "my-api",
    "credentials": {
      "secret": "my-client-secret"
    }
  }
}
```

The introspection client reuses `KeycloakInstallationOptions`, so if you already have Keycloak configured, you likely don't need to add anything.

Cache duration defaults to 60 seconds and is configurable:

```csharp
services.AddKeycloakTokenIntrospection(options =>
{
    configuration.BindKeycloakOptions(options);
    options.CacheDuration = TimeSpan.FromSeconds(120);
});
```

### When to use this

You need this if:
- Your Keycloak admin enabled lightweight access tokens
- You're using KC 26+ admin clients (they use lightweight tokens by default)
- You see unexplained 403s after upgrading Keycloak

The alternative is configuring Keycloak protocol mappers with the "Add to lightweight access token" flag, which avoids the introspection round-trip entirely. Pick your trade-off.

---

## RFC 8414 metadata discovery

Since Keycloak 26.4, the [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) metadata endpoint is available at `/.well-known/oauth-authorization-server`, alongside the traditional OIDC discovery at `/.well-known/openid-configuration`.

Why does this matter? If you're building a pure OAuth 2.0 resource server -- no ID tokens, no OIDC -- then OIDC discovery is technically the wrong endpoint. More practically, Keycloak 26.4 added MCP (Model Context Protocol) authorization server support, which uses RFC 8414 discovery.

### Using RFC 8414 metadata

```csharp
services.AddKeycloakWebApiAuthentication(options =>
{
    configuration.BindKeycloakOptions(options);
    options.MetadataAddress = KeycloakConstants.OAuthAuthorizationServerMetadataPath;
});
```

The `MetadataAddress` property overrides the default OIDC discovery path. The constant `OAuthAuthorizationServerMetadataPath` resolves to `".well-known/oauth-authorization-server"`.

If you don't set it, nothing changes -- the library defaults to OIDC discovery as before.

### When to use this

- Machine-to-machine flows (client credentials, no ID tokens)
- OAuth 2.0-only clients that expect RFC 8414 metadata
- MCP authorization server scenarios with Keycloak 26.4+
- Protocol correctness for pure resource servers

---

## Also in this release

A few more things that shipped in this release:

- **Extensible policy builder** -- `IProtectedResourcePolicyBuilder` lets you customize how protected resource policies are constructed
- **Pluggable parameter resolution** -- custom `IParameterResolver` implementations for resolving resource names from routes, headers, query strings, or your own sources
- **Configurable organization claim type** -- if your Keycloak setup uses a non-standard claim name for organization data
- **Kiota SDK updated** to Keycloak 26.5.6 OpenAPI spec

Full changelog: [GitHub Releases](https://github.com/NikiforovAll/keycloak-authorization-services-dotnet/releases)

Documentation: [nikiforovall.github.io/keycloak-authorization-services-dotnet](https://nikiforovall.github.io/keycloak-authorization-services-dotnet/)

---

## AI skills for Claude Code

This release also ships a [Claude Code plugin](https://github.com/NikiforovAll/keycloak-authorization-services-dotnet/tree/main/.claude-plugin) with two AI skills that help you work with Keycloak directly from your terminal.

### keycloak-auth-services

An implementation guide that knows the library's API surface -- authentication setup, authorization patterns, resource protection, Admin SDK, Protection API, and configuration options. Ask it how to set up JWT Bearer auth or configure protected resources and it'll give you working code using the current API.

### keycloak-administration

A Keycloak server administration guide covering realm management, client configuration, authentication flows, RBAC, user federation, security hardening, and troubleshooting. Useful when you need to configure the Keycloak side of things -- setting up clients, mappers, organizations, or debugging token issues.

---

> Join us on Discord: [![Discord](https://img.shields.io/discord/1236946465318768670?color=blue&label=Chat%20on%20Discord)](https://discord.gg/jdYFw2xq)
