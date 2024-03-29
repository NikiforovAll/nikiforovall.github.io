---
layout: post
title: Rapid Microservices Development in .NET. An introduction.
categories: [ dotnet, microservices, csharp ]
tags: [ dotnet, csharp, microservices ]
published: true
shortinfo: Learn how to speed up microservices development process by using set of predefined templates and practices.
fullview: false
comments: true
related: true
---

## TL;DR

Learn how to speed up microservices development process by using set of predefined templates and practices. See <https://www.nuget.org/packages/NikiforovAll.CleanArchitecture.Templates/>

---

## Problem Statement

The way we develop software is built around the idea of high velocity and readiness to change and adapt to the market's requirements. This approach brings up the next questions:

1. How to successfully contribute to the existing code base?
2. How to not break something in meantime?
3. How do we reduce the learning curve of an existing solution?

**(1)** Actually, all you need to do is to write clean, understandable, and open for modification code. The actual craft of writing code is honed through years of learning and making mistakes. Component-level design is important and you can benefit from good predefined solution templates, something like Clean Architecture gives you a good starting point. Also, if you feel like your project has some complex domain you might want to incorporate DDD in the mix. Personally, I find it really useful because it facilitates communication between developers and domain experts. It is easier to map code snippets to domain and project requirements.

**(2)** Frequent changes increase the possibility of bugs, as software engineers, we deal with it by extensively testing a codebase. At first glance, you might think writing tests is an additional effort that prevents you from shipping some valuable and urgent features. But, in practice, it is actually another way around, you want to invest in a testing toolkit to save future self from some nasty bugs. Also, tests serve as live documentation and enable refactoring. My suggestion is to be practical about it, don't try to get 100% coverage by writing tons of useless unit tests, determine what is the best in a given context. Simply, write tests, my dude.

**(3)** Clean code reduces the cognitive load and overall complexity of a codebase. In my opinion, for rapid development, you need somewhat consistency for technical decisions. It is a good idea to use common frameworks, libraries, tools, and even cross-cutting concerns code, just make sure it doesn't introduce additional coupling and unnecessary complexity.

### Proposal

Luckily, there is the remedy! Rapid Microservices Development `RMD === "remedy"`, got it? 😏

As an organization responsible for developing microservices solutions you want to build reusable components so it will be easy to create a new microservice from the scratch. Creating project templates is a well-known approach and it is quite simple. Rapid microservice development is a goal and templates might be a viable solution, just be mindful about the goal.

### Templates Family

I've created a set of project templates that provides you information of how you might organize microservices solutions yourself. **Note**, each template might be used individually outside of microservices development context.

Feedback is highly appreciated. 🙏

> <https://www.nuget.org/packages/NikiforovAll.CleanArchitecture.Templates/>

All you need to do is to install it via running the command:

`dotnet new --install NikiforovAll.CleanArchitecture.Templates::1.1.1`

Once installed, you can see a list of templates by running:

```bash
$ dotnet new -l na-
# These templates matched your input: 'na-'

# Template Name                Short Name  Language  Tags
# ---------------------------  ----------  --------  --------------------------------------------
# Build Project Template       na-bu       bash      build-project/Template
# Clean Architecture Template  na-ca       [C#]      CleanArchitecture/DDD/Template
# Event Sourcing Template      na-es       [C#]      EventSourcing/CleanArchitecture/DDD/Template
# Gateway Template             na-ga       [C#]      gateway/Template
```

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Alias</th>
      <th scope="col">Repository</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Build Project</td>
      <td>na-bu</td>
      <td><a href="https://github.com/NikiforovAll/na-bu" target="_blank" rel="noopener">https://github.com/NikiforovAll/na-bu</a></td>
      <td>N/A</td>
    </tr>
    <tr>
      <td>Clean Architecture Template</td>
      <td>na-ca</td>
      <td><a href="https://github.com/NikiforovAll/na-ca" target="_blank" rel="noopener">https://github.com/NikiforovAll/na-ca</a></td>
      <td>
        <a href="https://github.com/NikiforovAll/na-ca/actions/workflows/dotnet.yml" target="_blank" rel="noopener">
            <img src="https://github.com/NikiforovAll/na-ca/actions/workflows/dotnet.yml/badge.svg"/>
        </a>
      </td>
    </tr>
    <tr>
      <td>Event Sourcing Template</td>
      <td>na-bu</td>
      <td><a href="https://github.com/NikiforovAll/na-es" target="_blank" rel="noopener">https://github.com/NikiforovAll/na-es</a></td>
      <td>
        <a href="https://github.com/NikiforovAll/na-es/actions/workflows/dotnet.yml" target="_blank" rel="noopener">
            <img src="https://github.com/NikiforovAll/na-es/actions/workflows/dotnet.yml/badge.svg"/>
        </a>
      </td>
    </tr>
    <tr>
      <td>Gateway</td>
      <td>na-ga</td>
      <td><a href="https://github.com/NikiforovAll/na-ga" target="_blank" rel="noopener">https://github.com/NikiforovAll/na-ga</a></td>
      <td>
        <a href="https://github.com/NikiforovAll/na-ga/actions/workflows/dotnet.yml" target="_blank" rel="noopener">
            <img src="https://github.com/NikiforovAll/na-ga/actions/workflows/dotnet.yml/badge.svg"/>
        </a>
      </td>
    </tr>
  </tbody>
</table>

### Build project

In this blog post I will show you how to create a one of the components yourself.

The responsibility of build project is a starting project of any developer. The main goal is to have **zero-configuration** required to get the project up and running, this is really important and people will say thank you for that.

Build project consists of something like:

1. Scripts to pull code base and latest changes from the remotes.
2. Scripts to manage infrastructure used during development. All you need to do is to run `docker compose service1, service2, ...` to run the system locally. This is really useful.
3. Projects assets, something like architecture documentation, postman collection to speed up manual developer testing, guidelines, etc.

I will explain the anatomy of the build project from the template in a moment. But first, we need to generate one:

```bash
$ dotnet new na-bu -n MyFirstBuildProject --dry-run
File actions would have been taken:
  Create: ./.env
  Create: ./.gitignore
  Create: ./.vscode/settings.json
  Create: ./assets/http/gateway/projects.http
  Create: ./assets/http/naca/projects.http
  Create: ./assets/http/naes/projects.http
  Create: ./build/docker_postgres_init.sql
  Create: ./build/execute-tests.sh
  Create: ./build/generate-report.sh
  Create: ./build/run-services.sh
  Create: ./build/setup-infrastructure.sh
  Create: ./docker-compose-local-infrastructure.yml
  Create: ./docker-compose-tests.override.yml
  Create: ./docker-compose-tests.yml
  Create: ./docker-compose.override.yml
  Create: ./docker-compose.yml
  Create: ./docker-images.txt
  Create: ./README.md
  Create: ./routes.conf.json
  Create: ./scripts/generate-report.sh
  Create: ./scripts/git-clone-all.sh
  Create: ./scripts/git-pull-all.sh
  Create: ./scripts/git-summary/.gitignore
  Create: ./scripts/git-summary/git-summary.sh
  Create: ./scripts/git-summary/README.md
  Create: ./scripts/git-summary/screenshot.png
  Create: ./scripts/open-in-browser.sh

$ dotnet new na-bu -n MyFirstBuildProject
The template "Build Project Template" was created successfully.
```

As you can see we have:

* 📂 *./scripts* - some tools and scripts to manage build project.
* 📂 *./build* - commands to build, start and test the solution.
* 📂 *./assets* - project artifacts
* 📂 docker-compose.yml, docker-compose-local-infrastructure.yml, docker-compose.override.yml - run system locally
* 📂 docker-compose-tests.yml, docker-compose-tests.override.yml - run tests locally

The template pulls three other predefined templates `na-ca`, `na-es`, `na-ga`. You can change that.

Let's clone microservices from the `na-bu` template:

```bash
$ ./scripts/git-clone-all.sh
========================================================
Cloning repository: na-ca
========================================================
Cloning into 'na-ca'...
remote: Enumerating objects: 1146, done.
remote: Counting objects: 100% (1146/1146), done.
remote: Compressing objects: 100% (568/568), done.
remote: Total 1146 (delta 673), reused 968 (delta 506), pack-reused 0Receiving objects:  96% (1101/1146)
Receiving objects: 100% (1146/1146), 172.02 KiB | 978.00 KiB/s, done.
Resolving deltas: 100% (673/673), done.
========================================================
Cloning repository: na-es
========================================================
Cloning into 'na-es'...
remote: Enumerating objects: 1019, done.
remote: Counting objects: 100% (1019/1019), done.
remote: Compressing objects: 100% (523/523), done.
remote: Total 1019 (delta 571), reused 870 (delta 430), pack-reused 0R
Receiving objects: 100% (1019/1019), 173.87 KiB | 1.26 MiB/s, done.
Resolving deltas: 100% (571/571), done.
Updating files: 100% (183/183), done.
========================================================
Cloning repository: na-ga
========================================================
Cloning into 'na-ga'...
remote: Enumerating objects: 53, done.
remote: Counting objects: 100% (53/53), done.
remote: Compressing objects: 100% (35/35), done.
remote: Total 53 (delta 15), reused 46 (delta 8), pack-reused 0
Receiving objects: 100% (53/53), 18.59 KiB | 2.66 MiB/s, done.
Resolving deltas: 100% (15/15), done.
```

Check the current state of the solution:

```bash
$ ./scripts/git-summary/git-summary.sh
Repository                       Branch Remote State
================================ ==== ====== =====
/d/dev/MyFirstBuildProject       main ?  --
/d/dev/MyFirstBuildProject/na-ca main origin
/d/dev/MyFirstBuildProject/na-es main origin
/d/dev/MyFirstBuildProject/na-ga main origin
```

Now we can build and run the solution:

```bash
$ ./build/run-services.sh start
Creating network "myfirstbuildproject_default" with the default driver
Creating volume "myfirstbuildproject_rabbitmqdata-nikiforovall" with local driver
Creating volume "myfirstbuildproject_postgresdata-nikiforovall" with local driver
Creating volume "myfirstbuildproject_seq-nikiforovall" with local driver
# ...
Use 'docker scan' to run Snyk tests against images to find vulnerabilities and learn how to fix them
Creating seq                                ... done
Creating myfirstbuildproject_postgres_1     ... done
Creating myfirstbuildproject_rabbitmq_1     ... done
Creating myfirstbuildproject_naga.gateway_1 ... done
Creating myfirstbuildproject_naes.api_1     ... done
Creating myfirstbuildproject_naes.worker_1  ... done
Creating myfirstbuildproject_naca.worker_1  ... done
Creating myfirstbuildproject_naca.api_1     ... done

Containers starting in background
For log info: run-services.sh info
```

The system is up and running (screenshot from awesome <https://github.com/jesseduffield/lazydocker>)

![rmd-dashboard](/assets/rmd/na-bu-up-and-running.png)

Now we can use code from *assets* folder to test things out:

```text
# Create a project in "Clean Architecture" service created from na-ca template

POST http://localhost:3000/ca/projects
Content-Type: application/json

{
    "name": "Clean Architecture Tasks",
    "colourCode": "#FFFFFF"
}

# Get projects

GET http://localhost:3000/ca/projects/

# Create a project in "Event Sourcing" service created from na-es template

POST http://localhost:3000/es/projects
Content-Type: application/json

{
    "name": "Event Sourcing Tasks",
    "colourCode": "#FF5733"
}

# Get projects

GET http://localhost:3000/es/projects/
```

![rmd-dashboard](/assets/rmd/na-bu-running-demo.png)

## Summary

I encourage you to continue the investigation of the codebase on your own. You may find some inspiration or good practices, there are hidden gems 🙂. Let me know if you want to see a review of one of the components in the comments.

### Reference

* <https://www.nuget.org/packages/NikiforovAll.CleanArchitecture.Templates/>
* <https://martinfowler.com/articles/practical-test-pyramid.html>
