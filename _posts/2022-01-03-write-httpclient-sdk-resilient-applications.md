---
layout: post
title: A comprehensive guide on how to develop and use HTTP Client SDKs in .NET. Part 2. Resilient and robust applications
categories: [ dotnet ]
tags: [ dotnet, openapi, http-sdk, http ]
published: false
shortinfo: 
fullview: false
comments: true
related: true
---

## TL;DR

## Introduction

## Resiliency and Robustness

Today's cloud-based, microservice-based applications often depend on communicating with other systems across an unreliable network. Robust and highly available system are designed with [Fallacies of Distributed Computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) in mind. Basically, you should design the system like it will inevitable fail at some point of time. And trust me, it will fail. No matter how good of a programmer you are there are things outside of your control. Systems can be unavailable or unreachable due to transient faults such as network problems and timeouts, or subsystems being offline, under load or otherwise non-responsive. In order to avoid instability of your system you need to use and govern resilience policies. As it usual it programming, there is no silver bullet and you need to determine what is required in a given context.

For example, transient errors might be handled proactively by using *Retry* and *Circuit Breaker* patterns. Usually, we use retry pattern when there is a hope that downstream service will self-correct eventually. Waiting between retries provides an opportunity for a downstream service to stabilize. It is common to use retry based on [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff) algorithm. On the paper it sounds great, but in real world scenarios, retry pattern may be overused. Additional retries might be the source of additional load or spikes. In the worst case, resources in the caller may then become exhausted or excessively blocked, waiting for replies which will never come causing an upstream-cascading failure.

This is when *Circuit Breaker* pattern comes into play. It detects the level of faults and prevents calls to a downstream service when a fault threshold is exceeded. Use this pattern when there is no chance of succeeding - for example, where a subsystem is completely offline, or struggling under load. The idea behind *Circuit Breaker* is pretty straightforward, although, you might build something more complex on top of it. When faults exceed the threshold, calls placed through the circuit, so instead of processing of a request we practice [fail-fast](https://en.wikipedia.org/wiki/Fail-fast) approach, throwing an exception immediately.

![http-client-sdk-polly](/assets/http-sdk/http-client-sdk-polly.png)

Designing reliable systems could be challenging task, I suggest you to investigate the subject on your own. Here is a good read - [.NET microservices - Architecture e-book: Implement resilient applications](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/).

Today, I want to tell you how to incorporate resiliency patterns into the usage of HTTP Client SDKs.

### Configure resilience policies globally (per-client)

### Configure resilience policies conditionally (per-method)

### Configure resilience policies conditionally (per-selected-method)

use fact that delegates can be registered in the DI

Registry vs decorator

Idea: you may want to pack a common set of tools required for HTTP Client SDK development and provide an opinionated way of development

opinionated resiliencyl, bundle policies into NuGet?
---

## Summary

### Reference

* <https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/>
