# Atlas Specification

## Overview

**Atlas** is a dependency-free, HTML-driven directory engine designed to transform static HTML into an interactive directory.

Its initial target platform is **JCink**, but Atlas itself is platform-agnostic. Platform-specific behaviour is isolated into adapters, allowing the core engine to remain independent of any forum software.

---

# Philosophy

Atlas is built around a small number of core principles.

## HTML First

HTML is the public API.

Users configure Atlas primarily through semantic HTML attributes rather than JavaScript.

## Everything Is Data

Each member is treated as structured data.

Atlas does not understand concepts such as species, occupations, factions or face claims. Those are simply fields with semantic names.

## Discover, Don't Configure

Atlas discovers controls, fields and behaviours from HTML.

Adding new searchable or filterable fields should require little or no JavaScript.

## Read Once

Atlas reads the DOM once during initialisation.

Afterwards it operates on cached data models wherever possible.

## Presentation Belongs to CSS

Atlas never calculates layouts.

JavaScript controls behaviour.

CSS controls appearance.

## One Public Class

Atlas exposes a single public API:

```javascript
new Atlas(options);
```

All other classes are internal implementation details.

---

# Goals

* Zero external dependencies
* Responsive by default
* Accessible by default
* HTML-driven configuration
* Generic field discovery
* Fast with approximately 1,000 member cards
* Extensible without modifying the core engine

---

# Initial Target Platform

JCink.

Future adapters may support additional platforms without changing the Atlas core.