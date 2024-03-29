---
layout: post
title: Keycloak as Authorization Server in .NET
categories: [ dotnet, keycloak ]
tags: [ aspnetcore, dotnet, auth, keycloak, authz]
published: true
shortinfo: Authorization Server is a powerful abstraction that allows to control authorization concerns. Learn how to implement it for .NET applications.
fullview: false
comments: true
related: true
mermaid: true
---

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Example Overview](#example-overview)
  - [Configure Keycloak](#configure-keycloak)
  - [Authorization based on ASP.NET Core Identity roles](#authorization-based-on-aspnet-core-identity-roles)
  - [Authorization based on Keycloak realm and client roles](#authorization-based-on-keycloak-realm-and-client-roles)
  - [Authorization based on Authorization Server permissions](#authorization-based-on-authorization-server-permissions)
- [The power of Authorization Server - define policies and permissions](#the-power-of-authorization-server---define-policies-and-permissions)
  - [Evaluate permissions](#evaluate-permissions)
  - [Demo](#demo)
- [Summary](#summary)
- [References](#references)

## TL;DR

`Keycloak.AuthService.Authorization` provides a toolkit to use Keycloak as Authorization Server. An authorization Server is a powerful abstraction that allows to control authorization concerns. An authorization Server is also advantageous in microservices scenario because it serves as a centralized place for IAM and access control.

`Keycloak.AuthServices.Authorization`: <https://github.com/NikiforovAll/keycloak-authorization-services-dotnet#keycloakauthservicesauthorization>

Example source code: <https://github.com/NikiforovAll/keycloak-authorization-services-dotnet/tree/main/samples/AuthZGettingStarted>

## Introduction

Authorization refers to the process that determines what a user is able to do.ASP.NET Core authorization provides a simple, declarative role and a rich policy-based model. Authorization is expressed in requirements, and handlers evaluate a user's claims against requirements. Imperative checks can be based on simple policies or policies which evaluate both the user identity and properties of the resource that the user is attempting to access.

Resource servers (applications or services serving protected resources) usually rely on some kind of information to decide if access should be granted to a protected resource. For RESTful-based resource servers, that information is usually obtained from a security token, usually sent as a bearer token on every request to the server. For web applications that rely on a session to authenticate users, that information is usually stored in a user’s session and retrieved from there for each request.

Keycloak is based on a set of administrative UIs and a RESTful API, and provides the necessary means to create permissions for your protected resources and scopes, associate those permissions with authorization policies, and enforce authorization decisions in your applications and services.

Considering that today we need to consider heterogeneous environments where users are distributed across different regions, with different local policies, using different devices, and with a high demand for information sharing, Keycloak Authorization Services can help you improve the authorization capabilities of your applications and services by providing:

- Resource protection using fine-grained authorization policies and different access control mechanisms
- Centralized Resource, Permission, and Policy Management
- Centralized Policy Decision Point
- REST security based on a set of REST-based authorization services
- Authorization workflows and User-Managed Access
- The infrastructure to help avoid code replication across projects (and redeploys) and quickly adapt to changes in your security requirements.


## Example Overview

In this blog post I will demonstrate how to perform authorization in two ways:

- Role-based access control (RBAC) check executed by *Resource Server (API)*
  - `/endpoint` - required ASP.NET Core identity role
  - `/endpoint` - required realm role
  - `/endpoint` - required client role
- Remote authorization policy check executed by *Authorization Server (Keycloak)*
  - `/endpoint` - remotely executed policy selected for "workspace" - resource, "workspaces:read" - scope.

```csharp
var app = builder.Build();

app
    .UseHttpsRedirection()
    .UseApplicationSwagger(configuration)
    .UseAuthentication()
    .UseAuthorization();

app.MapGet("/endpoint1", (ClaimsPrincipal user) => user)
    .RequireAuthorization(RequireAspNetCoreRole);

app.MapGet("/endpoint2", (ClaimsPrincipal user) => user)
    .RequireAuthorization(RequireRealmRole);

app.MapGet("/endpoint3", (ClaimsPrincipal user) => user)
    .RequireAuthorization(RequireClientRole);

app.MapGet("/endpoint4", (ClaimsPrincipal user) => user)
    .RequireAuthorization(RequireToBeInKeycloakGroupAsReader);

await app.RunAsync();
```

Project structure:

```bash
$ tree -L 2
.
├── AuthZGettingStarted.csproj
├── Program.cs
├── Properties
│   └── launchSettings.json
├── ServiceCollectionExtensions.Auth.cs
├── ServiceCollectionExtensions.Logging.cs
├── ServiceCollectionExtensions.OpenApi.cs
├── appsettings.Development.json
├── appsettings.json
├── assets
│   ├── realm-export.json
│   └── run.http
└── docker-compose.yml
```

Entry point:

```csharp
var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
var services = builder.Services;

builder.AddSerilog();
services
    .AddApplicationSwagger(configuration)
    .AddAuth(configuration);
```

Register AuthN and AuthZ services in Dependency Injection container:

```csharp
public static IServiceCollection AddAuth(
    this IServiceCollection services, IConfiguration configuration)
{
    services.AddKeycloakAuthentication(configuration);

    services.AddAuthorization(options =>
    {
        options.AddPolicy(
            Policies.RequireAspNetCoreRole,
            builder => builder.RequireRole(Roles.AspNetCoreRole));

        options.AddPolicy(
            Policies.RequireRealmRole,
            builder => builder.RequireRealmRoles(Roles.RealmRole));

        options.AddPolicy(
            Policies.RequireClientRole,
            builder => builder.RequireResourceRoles(Roles.ClientRole));

        options.AddPolicy(
            Policies.RequireToBeInKeycloakGroupAsReader,
            builder => builder
                .RequireAuthenticatedUser()
                .RequireProtectedResource("workspace", "workspaces:read"));

    }).AddKeycloakAuthorization(configuration);

    return services;
}

public static class AuthorizationConstants
{
    public static class Roles
    {
        public const string AspNetCoreRole = "realm-role";

        public const string RealmRole = "realm-role";

        public const string ClientRole = "client-role";
    }

    public static class Policies
    {
        public const string RequireAspNetCoreRole = nameof(RequireAspNetCoreRole);

        public const string RequireRealmRole = nameof(RequireRealmRole);

        public const string RequireClientRole = nameof(RequireClientRole);

        public const string RequireToBeInKeycloakGroupAsReader = 
            nameof(RequireToBeInKeycloakGroupAsReader);
    }
}
```

### Configure Keycloak

In this post I'm going to skip basic Keycloak installation and configuration, please see my previous posts for more details <https://nikiforovall.github.io/tags.html#keycloak-ref>.

Prerequisites:

1. Create a realm named: **Test**
2. Create a user with username/password: **user/user**
3. Create a realm role: **realm-role**
4. Create a client: **test-client**
   1. Create an audience mapper: **Audience** ➡ **test-client**
   2. Enable **Client Authentication** and **Authorization**
   3. Enable **Implicit flow** and add a valid redirect URL (used by Swagger to retrieve a token)
5. Create a client role: **client-role**
6. Create a group called **workspace** and add the "user" to it

Full Keycloak configuration (including the steps below) can be found at [realm-export.json](https://gist.github.com/NikiforovAll/c5524c3f1dac9249935d2a6e84b532fd)

### Authorization based on ASP.NET Core Identity roles

`Keycloak.AuthService.Authentication` ads the `KeycloakRolesClaimsTransformation` that maps roles provided by Keycloak. The source for `role` claim could be one of the following:

- Realm - map realm roles
- ResourceAccess - map client roles
- None - don't map

<div class="mermaid">
flowchart LR
    AddKeycloakAuthentication --> AddAuthentication
    AddKeycloakAuthentication --> KeycloakRolesClaimsTransformation
</div>

Depending on your needs, you can use realm roles, client roles or skip automatic role mapping/transformation. The role claims transformation is based on the config. For example, here is how to use realms role for ASP.NET Core Identity roles. As result, you can use build-in [role-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/roles).

```json
{
  "Keycloak": {
    "realm": "Test",
    "auth-server-url": "http://localhost:8080/",
    "ssl-required": "none",
    "resource": "test-client",
    "verify-token-audience": true,
    "credentials": {
      "secret": ""
    },
    "confidential-port": 0,
    "RolesSource": "Realm"
  }
}
```

So, for a user with the next access token generated by Keycloak the roles are effectively evaluated to "realm-role", "default-roles-test", "offline_access", "uma_authorization". And if you change "RolesSource" to "ResourceAccess" it would be "client-role".

```json
{
  "exp": 1672275584,
  "iat": 1672275284,
  "jti": "1ce527e6-b852-48e9-b27b-ed8cc01cf518",
  "iss": "http://localhost:8080/realms/Test",
  "aud": [
    "test-client",
    "account"
  ],
  "sub": "8fd9060e-9e3f-4107-94f6-6c3a242fb91a",
  "typ": "Bearer",
  "azp": "test-client",
  "session_state": "c32e4165-f9bd-4d4c-93bd-3847f4ffc697",
  "acr": "1",
  "realm_access": {
    "roles": [
      "realm-role",
      "default-roles-test",
      "offline_access",
      "uma_authorization"
    ]
  },
  "resource_access": {
    "test-client": {
      "roles": [
        "client-role"
      ]
    },
    "account": {
      "roles": [
        "manage-account",
        "manage-account-links",
        "view-profile"
      ]
    }
  },
  "scope": "openid email profile",
  "sid": "c32e4165-f9bd-4d4c-93bd-3847f4ffc697",
  "email_verified": false,
  "preferred_username": "user",
  "given_name": "",
  "family_name": ""
}
```

💡 Note, you can change "RolesSource" to "None" and instead of using `KeycloakRolesClaimsTransformation`, use Keycloak role claim mapper and populate `role` claim based on configuration. Luckily, it is easy to do from Keycloak admin panel.

```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy(
        Policies.RequireAspNetCoreRole,
        builder => builder.RequireRole(Roles.AspNetCoreRole))
});
```

### Authorization based on Keycloak realm and client roles

`AuthorizationPolicyBuilder` allows to register policies and `Keycloak.AuthServices.Authorization` adds a handy method to register rules that make use of the specific structure of access tokens generated by Keycloak.

```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy(
        Policies.RequireRealmRole,
        builder => builder.RequireRealmRoles(Roles.RealmRole));

    options.AddPolicy(
        Policies.RequireClientRole,
        builder => builder.RequireResourceRoles(Roles.ClientRole));
});

// PoliciesBuilderExtensions.cs
public static AuthorizationPolicyBuilder RequireResourceRoles(
    this AuthorizationPolicyBuilder builder, params string[] roles) =>
    builder
        .RequireClaim(KeycloakConstants.ResourceAccessClaimType)
        .AddRequirements(new ResourceAccessRequirement(default, roles));

public static AuthorizationPolicyBuilder RequireRealmRoles(
    this AuthorizationPolicyBuilder builder, params string[] roles) =>
    builder
        .RequireClaim(KeycloakConstants.RealmAccessClaimType)
        .AddRequirements(new RealmAccessRequirement(roles));
```

### Authorization based on Authorization Server permissions

Policy Enforcement Point (PEP) is responsible for enforcing access decisions from the Keycloak server where these decisions are taken by evaluating the policies associated with a protected resource. It acts as a filter or interceptor in your application in order to check whether or not a particular request to a protected resource can be fulfilled based on the permissions granted by these decisions.

Keycloak supports fine-grained authorization policies and is able to combine different access control mechanisms such as:

- Attribute-based access control (ABAC)
- Role-based access control (RBAC)
- User-based access control (UBAC)
- Context-based access control (CBAC)
- Rule-based access control
- Using JavaScript
- Time-based access control
- Support for custom access control mechanisms (ACMs) through a Service Provider Interface (SPI)

Here is what happens when authenticated user tries to access a protected resource:

<div class="mermaid">
sequenceDiagram
    participant User
    participant API
    participant AuthServer as Authorization Server - PEP
    User ->>+ API: access a protected endpoint
    API->>+ AuthServer : verify if user has an access to resource + scope
    AuthServer ->>- API: authorization result (yes/no)
    API ->>- User: response (2xx/403)
</div>

```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy(
        Policies.RequireToBeInKeycloakGroupAsReader,
        builder => builder
            .RequireAuthenticatedUser()
            .RequireProtectedResource("workspace", "workspaces:read"));
});

// PoliciesBuilderExtensions.cs
/// <summary>
/// Adds protected resource requirement to builder.
/// Makes outgoing HTTP requests to Authorization Server.
/// </summary>
public static AuthorizationPolicyBuilder RequireProtectedResource(
    this AuthorizationPolicyBuilder builder, string resource, string scope) =>
    builder.AddRequirements(new DecisionRequirement(resource, scope));
```

## The power of Authorization Server - define policies and permissions

Resource management is straightforward and generic. After creating a resource server, you can start creating the resources and scopes that you want to protect. Resources and scopes can be managed by navigating to the Resource and Authorization Scopes tabs, respectively.

So, to define a protected resource we need to create it in the Keycloak and assigned scope to it. In our case, we need to create "workspace" resource with "workspaces:read" scope.

For more details, please see <https://www.keycloak.org/docs/latest/authorization_services/#_resource_overview>.




<svg aria-roledescription="mindmap" viewBox="5 5.000001907348633 627.9741821289062 270.37310791015625" style="max-width: 100%;" xmlns="http://www.w3.org/2000/svg" width="1147px" id="graph-div" height="888px" xmlns:xlink="http://www.w3.org/1999/xlink"><style>@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css");'</style><style>#graph-div{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#ccc;}#graph-div .error-icon{fill:#a44141;}#graph-div .error-text{fill:#ddd;stroke:#ddd;}#graph-div .edge-thickness-normal{stroke-width:2px;}#graph-div .edge-thickness-thick{stroke-width:3.5px;}#graph-div .edge-pattern-solid{stroke-dasharray:0;}#graph-div .edge-pattern-dashed{stroke-dasharray:3;}#graph-div .edge-pattern-dotted{stroke-dasharray:2;}#graph-div .marker{fill:lightgrey;stroke:lightgrey;}#graph-div .marker.cross{stroke:lightgrey;}#graph-div svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;}#graph-div .edge{stroke-width:3;}#graph-div .section--1 rect,#graph-div .section--1 path,#graph-div .section--1 circle,#graph-div .section--1 polygon,#graph-div .section--1 path{fill:#1f2020;}#graph-div .section--1 text{fill:lightgrey;}#graph-div .node-icon--1{font-size:40px;color:lightgrey;}#graph-div .section-edge--1{stroke:#1f2020;}#graph-div .edge-depth--1{stroke-width:17;}#graph-div .section--1 line{stroke:#e0dfdf;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-0 rect,#graph-div .section-0 path,#graph-div .section-0 circle,#graph-div .section-0 polygon,#graph-div .section-0 path{fill:#0b0000;}#graph-div .section-0 text{fill:lightgrey;}#graph-div .node-icon-0{font-size:40px;color:lightgrey;}#graph-div .section-edge-0{stroke:#0b0000;}#graph-div .edge-depth-0{stroke-width:14;}#graph-div .section-0 line{stroke:#f4ffff;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-1 rect,#graph-div .section-1 path,#graph-div .section-1 circle,#graph-div .section-1 polygon,#graph-div .section-1 path{fill:#4d1037;}#graph-div .section-1 text{fill:lightgrey;}#graph-div .node-icon-1{font-size:40px;color:lightgrey;}#graph-div .section-edge-1{stroke:#4d1037;}#graph-div .edge-depth-1{stroke-width:11;}#graph-div .section-1 line{stroke:#b2efc8;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-2 rect,#graph-div .section-2 path,#graph-div .section-2 circle,#graph-div .section-2 polygon,#graph-div .section-2 path{fill:#3f5258;}#graph-div .section-2 text{fill:lightgrey;}#graph-div .node-icon-2{font-size:40px;color:lightgrey;}#graph-div .section-edge-2{stroke:#3f5258;}#graph-div .edge-depth-2{stroke-width:8;}#graph-div .section-2 line{stroke:#c0ada7;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-3 rect,#graph-div .section-3 path,#graph-div .section-3 circle,#graph-div .section-3 polygon,#graph-div .section-3 path{fill:#4f2f1b;}#graph-div .section-3 text{fill:lightgrey;}#graph-div .node-icon-3{font-size:40px;color:lightgrey;}#graph-div .section-edge-3{stroke:#4f2f1b;}#graph-div .edge-depth-3{stroke-width:5;}#graph-div .section-3 line{stroke:#b0d0e4;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-4 rect,#graph-div .section-4 path,#graph-div .section-4 circle,#graph-div .section-4 polygon,#graph-div .section-4 path{fill:#6e0a0a;}#graph-div .section-4 text{fill:lightgrey;}#graph-div .node-icon-4{font-size:40px;color:lightgrey;}#graph-div .section-edge-4{stroke:#6e0a0a;}#graph-div .edge-depth-4{stroke-width:2;}#graph-div .section-4 line{stroke:#91f5f5;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-5 rect,#graph-div .section-5 path,#graph-div .section-5 circle,#graph-div .section-5 polygon,#graph-div .section-5 path{fill:#3b0048;}#graph-div .section-5 text{fill:lightgrey;}#graph-div .node-icon-5{font-size:40px;color:lightgrey;}#graph-div .section-edge-5{stroke:#3b0048;}#graph-div .edge-depth-5{stroke-width:-1;}#graph-div .section-5 line{stroke:#c4ffb7;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-6 rect,#graph-div .section-6 path,#graph-div .section-6 circle,#graph-div .section-6 polygon,#graph-div .section-6 path{fill:#995a01;}#graph-div .section-6 text{fill:lightgrey;}#graph-div .node-icon-6{font-size:40px;color:lightgrey;}#graph-div .section-edge-6{stroke:#995a01;}#graph-div .edge-depth-6{stroke-width:-4;}#graph-div .section-6 line{stroke:#66a5fe;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-7 rect,#graph-div .section-7 path,#graph-div .section-7 circle,#graph-div .section-7 polygon,#graph-div .section-7 path{fill:#154706;}#graph-div .section-7 text{fill:lightgrey;}#graph-div .node-icon-7{font-size:40px;color:lightgrey;}#graph-div .section-edge-7{stroke:#154706;}#graph-div .edge-depth-7{stroke-width:-7;}#graph-div .section-7 line{stroke:#eab8f9;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-8 rect,#graph-div .section-8 path,#graph-div .section-8 circle,#graph-div .section-8 polygon,#graph-div .section-8 path{fill:#161722;}#graph-div .section-8 text{fill:lightgrey;}#graph-div .node-icon-8{font-size:40px;color:lightgrey;}#graph-div .section-edge-8{stroke:#161722;}#graph-div .edge-depth-8{stroke-width:-10;}#graph-div .section-8 line{stroke:#e9e8dd;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-9 rect,#graph-div .section-9 path,#graph-div .section-9 circle,#graph-div .section-9 polygon,#graph-div .section-9 path{fill:#00296f;}#graph-div .section-9 text{fill:lightgrey;}#graph-div .node-icon-9{font-size:40px;color:lightgrey;}#graph-div .section-edge-9{stroke:#00296f;}#graph-div .edge-depth-9{stroke-width:-13;}#graph-div .section-9 line{stroke:#ffd690;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-10 rect,#graph-div .section-10 path,#graph-div .section-10 circle,#graph-div .section-10 polygon,#graph-div .section-10 path{fill:#01629c;}#graph-div .section-10 text{fill:lightgrey;}#graph-div .node-icon-10{font-size:40px;color:lightgrey;}#graph-div .section-edge-10{stroke:#01629c;}#graph-div .edge-depth-10{stroke-width:-16;}#graph-div .section-10 line{stroke:#fe9d63;stroke-width:3;}#graph-div .disabled,#graph-div .disabled circle,#graph-div .disabled text{fill:lightgray;}#graph-div .disabled text{fill:#efefef;}#graph-div .section-root rect,#graph-div .section-root path,#graph-div .section-root circle,#graph-div .section-root polygon{fill:hsl(180, 1.5873015873%, 48.3529411765%);}#graph-div .section-root text{fill:undefined;}#graph-div .icon-container{height:100%;display:flex;justify-content:center;align-items:center;}#graph-div .edge{fill:none;}#graph-div :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}</style><g></g><g></g><g class="mindmap-edges"><path class="edge section-edge--1 edge-depth-1" d="M 420.1987378993455,138.2982257261923 L 381.16823235859954,164.11487213395307 L342.1377268178536,189.93151854171384"></path><path class="edge section-edge--1 edge-depth-1" d="M 443.15925486045376,140.78418482171395 L 470.7120653681927,169.1583185007212 L498.2648758759317,197.53245217972847"></path><path class="edge section-edge--1 edge-depth-1" d="M 420.72466884606564,121.00284837154285 L 384.68833924607395,93.8809662972105 L348.65200964608226,66.75908422287816"></path><path class="edge section-edge--1 edge-depth-1" d="M 430.59101872855155,144.87262002721275 L 426.01799512602236,176.92686980355344 L421.44497152349317,208.98111957989414"></path><path class="edge section-edge--1 edge-depth-1" d="M 447.6009266766224,131.82485064018874 L 504.68562000402414,138.7321549861296 L561.7703133314259,145.63945933207043"></path><path class="edge section-edge--1 edge-depth-1" d="M 434.43546179343446,115.12260251827337 L 438.29390264513654,81.81148925116631 L442.1523434968386,48.50037598405925"></path><path class="edge section-edge--1 edge-depth-1" d="M 446.49340244359405,124.1064539179057 L 501.7217116613423,100.40048817110866 L556.9500208790905,76.69452242431163"></path><path class="edge section-edge--1 edge-depth-0" d="M 294.874867080091,126.41544196691105 L 356.2947733983499,128.0229805892894 L417.71467971660877,129.63051921166777"></path><path class="edge section-edge-0 edge-depth-1" d="M 164.23047147519674,199.77111888427953 L 113.63959458583486,220.43604313290928 L63.04871769647296,241.10096738153908"></path><path class="edge section-edge-0 edge-depth-0" d="M 267.4124840514686,134.36330583237256 L 228.99834544869623,160.06098965414768 L190.5842068459239,185.7586734759228"></path><path class="edge section-edge-1 edge-depth-0" d="M 266.74406238604894,118.78094633243364 L 217.04196048599283,91.37944887696094 L167.33985858593672,63.977951421488214"></path></g><g class="mindmap-nodes"><g transform="translate(228.73625287013192, 107.42298267624619)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h92.2874984741211 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-0"></path><line y2="37.19999961853027" x2="102.2874984741211" y1="37.19999961853027" x1="0" class="node-line--2"></line></g><g transform="translate(51.14374923706055, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">Permissions</tspan></text></g></g><g transform="translate(395.84079507097704, 111.42297888380233)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h63.73749923706055 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-1"></path><line y2="37.19999961853027" x2="73.73749923706055" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(36.86874961853027, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">Policies</tspan></text></g></g><g transform="translate(300.4620755147523, 179.60676576557353)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h48.329689025878906 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-2"></path><line y2="37.19999961853027" x2="58.329689025878906" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(29.164844512939453, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">ABAC</tspan></text></g></g><g transform="translate(480.01224115246896, 189.6936584991098)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h47.40468978881836 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-3"></path><line y2="37.19999961853027" x2="57.40468978881836" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(28.70234489440918, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">RBAC</tspan></text></g></g><g transform="translate(307.4335389082314, 39.1389540920884)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h48.46718978881836 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-4"></path><line y2="37.19999961853027" x2="58.46718978881836" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(29.23359489440918, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">UBAC</tspan></text></g></g><g transform="translate(390.4951944181282, 205.23076110477427)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h47.66250228881836 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-5"></path><line y2="37.19999961853027" x2="57.66250228881836" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(28.83125114440918, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">CBAC</tspan></text></g></g><g transform="translate(530.349195318541, 128.84133146992656)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h82.625 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-6"></path><line y2="37.19999961853027" x2="92.625" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(46.3125, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">RuleBased</tspan></text></g></g><g transform="translate(396.8852910878263, 15)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h83.9859390258789 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-7"></path><line y2="37.19999961853027" x2="93.9859390258789" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(46.99296951293945, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">JavaScript</tspan></text></g></g><g transform="translate(521.9463763443589, 52.17799783988472)" class="mindmap-node section-root"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h87.57500457763672 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-8"></path><line y2="37.19999961853027" x2="97.57500457763672" y1="37.19999961853027" x1="0" class="node-line--1"></line></g><g transform="translate(48.78750228881836, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">TimeBased</tspan></text></g></g><g transform="translate(132.84168726432108, 175.49899701351887)" class="mindmap-node section-0"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h80.55000305175781 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-9"></path><line y2="37.19999961853027" x2="90.55000305175781" y1="37.19999961853027" x1="0" class="node-line-0"></line></g><g transform="translate(45.275001525878906, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">Resources</tspan></text></g></g><g transform="translate(15, 228.17308963376945)" class="mindmap-node section-0"><g><path d="M0 32.19999961853027 v-27.19999961853027 q0,-5 5,-5 h58.32500076293945 q5,0 5,5 v32.19999961853027 H0 Z" class="node-bkg node-no-border" id="node-10"></path><line y2="37.19999961853027" x2="68.32500076293945" y1="37.19999961853027" x1="0" class="node-line-0"></line></g><g transform="translate(34.16250038146973, 5)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">Scopes</tspan></text></g></g><g transform="translate(71.81563608891429, 33.135915459145394)" class="mindmap-node section-1"><g><rect width="164.7765655517578" height="47.19999961853027" class="node-bkg node-rect" id="node-11"></rect></g><g transform="translate(82.3882827758789, 10)"><text text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" dy="1em"><tspan dy="1em" x="0">Decision   Strategy</tspan></text></g></g></g></svg>

To create a scope:

1. Navigate to "Clients" tab on the sidebar
2. Select "test-client" from the list
3. Go to "Authorization" tab (make sure you enabled "Authorization" checkbox on the "Settings" tab)
4. Select "Scopes" sub-tab
5. Click "Create authorization scope"
6. Specify **workspaces:read** as Name
7. Click "Save"

To create a resource:

1. From the "Authorization" tab
2. Select "Resources" sub-tab
3. Click "Create resource"
4. Specify **workspace** as Name
5. Specify **urn:resource:workspace** as Type
6. Specify "workspaces:read" as "Authorization scopes"
7. Click "Save"

Let's say we want to implement a rule that only users with **realm-role** role and membership in **workspace** group can read a "workspace" resource. To accomplish this, we need to create the next two policies:

1. From the "Authorization" tab
2. Select "Policies" sub-tab
3. Click "Create policy"
4. Select "Role" option
5. Specify **Is in realm-role** as Name
6. Click "Add roles"
7. Select **realm-role** role
8. Logic: **Positive**
9. Click "Save"
10. Click "Create policy"
11. Select "Group" option
12. Specify **Is in workspace group** as Name
13. Click "Add group"
14. Select "workspace" group
15. Logic: **Positive**
16. Click "Save"

Now, we can create the permission:

1. From the "Authorization" tab
2. Select "Permissions" sub-tab
3. Click "Create permission"
4. Select "Create resource-based permission"
5. Specify **Workspace Access** as Name
6. Specify **workspace** as resource
7. Add **workspaces:read** as authorization scope
8. Add two previously created policies to the "Policies"
9. Specify **Unanimous** as Decision Strategy
10. Click "Save"

The decision strategy dictates how the policies associated with a given permission are evaluated and how a final decision is obtained. 'Affirmative' means that at least one policy must evaluate to a positive decision in order for the final decision to be also positive. 'Unanimous' means that all policies must evaluate to a positive decision in order for the final decision to be also positive. 'Consensus' means that the number of positive decisions must be greater than the number of negative decisions. If the number of positive and negative is the same, the final decision will be negative.

### Evaluate permissions

1. From the "Authorization" tab
2. Select "Evaluate" sub-tab

Let's say the "user" has **realm-role**, but is not a member of **workspace** group

Here is how the permission evaluation is interpreted by Keycloak:

<center>
 <img src="/assets/keycloak-authz-server/evaluate1.png" alt="evaluate1">
</center>

And if we add the "user to **workspace** group:

<center>
 <img src="/assets/keycloak-authz-server/evaluate2.png" alt="evaluate1">
</center>

### Demo

1. Navigate at <https://localhost:7248/swagger/index.html>
2. Click "Authorize". Note, the access token is retrieved based on "Implicit Flow" that we've previously configured.
3. Enter credentials: "user/user"
4. Execute "/endpoint4"

<center>
 <img src="/assets/keycloak-authz-server/authz-demo2.png" alt="authz-demo2">
</center>

As you can see, the response is 200 OK. I suggest you to try removing "user" from the "workspace" group and see how it works.

As described above, the permission is evaluated by Keycloak therefore you can see outgoing HTTP requests in the logs:

```text
12:19:28 [INFO] Start processing HTTP request "POST" http://localhost:8080/realms/Test/protocol/openid-connect/token
"System.Net.Http.HttpClient.IKeycloakProtectionClient.ClientHandler"
12:19:28 [INFO] Sending HTTP request "POST" http://localhost:8080/realms/Test/protocol/openid-connect/token
"System.Net.Http.HttpClient.IKeycloakProtectionClient.ClientHandler"
12:19:28 [INFO] Received HTTP response headers after 8.5669ms - 200
"System.Net.Http.HttpClient.IKeycloakProtectionClient.LogicalHandler"
12:19:28 [INFO] End processing HTTP request after 25.3503ms - 200
"Keycloak.AuthServices.Authorization.Requirements.DecisionRequirementHandler"
12:19:28 [DBUG] ["DecisionRequirement: workspace#workspaces:read"] Access outcome True for user "user"
"Microsoft.AspNetCore.Authorization.DefaultAuthorizationService"
12:19:28 [DBUG] Authorization was successful.
```

<center>
 <img src="/assets/keycloak-authz-server/authz-demo1.png" alt="authz-demo1">
</center>

---

💡 Note, In this post, I've showed you how to protect a one resource known to the system, but it is actually possible to create resource programmatically and compose ASP.NET Core policies during runtime. See `Keycloak.AuthServices.Authorization.ProtectedResourcePolicyProvider` for more details.

## Summary

An authorization Server is a highly beneficial abstraction and it is quite easy to solve a wide range of well-known problems without "Reinventing the wheel". [Keycloak.AuthServices.Authorization](https://www.nuget.org/packages/Keycloak.AuthServices.Authorization) helps you to define a protected resource and does the interaction with Authorization Server for you. Let me know what you think 🙂

## References

- <https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction>
- <https://learn.microsoft.com/en-us/aspnet/core/security/authorization/roles>
- <https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies>
- <https://www.keycloak.org/docs/latest/authorization_services>
- <https://www.keycloak.org/docs/latest/authorization_services/#_resource_overview>
- <https://github.com/NikiforovAll/keycloak-authorization-services-dotnet>
