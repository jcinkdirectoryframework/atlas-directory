# Atlas Specification

## Overview

Atlas is a dependency-free, HTML-driven directory engine designed to transform static HTML into an interactive directory.

Its initial target platform is JCink, but Atlas itself is platform-agnostic. Platform-specific behaviour is isolated into adapters, allowing the core engine to remain independent of any forum software.

---

## Philosophy

Atlas is built around a small number of core principles.

### HTML First

HTML is the public API.

Users configure Atlas primarily through semantic HTML attributes rather than JavaScript.

### Everything Is Data

Each member is treated as structured data.

Atlas does not understand concepts such as species, occupations, factions or face claims. Those are simply fields with semantic names.

### Discover, Don't Configure

Atlas discovers controls, fields and behaviours from HTML.

Adding new searchable or filterable fields should require little or no JavaScript.

### Read Once

Atlas reads the DOM once during initialisation.

Afterwards it operates on cached data models wherever possible.

### Presentation Belongs to CSS

Atlas never calculates layouts.

JavaScript controls behaviour.

CSS controls appearance.

### Event-Driven Communication

Modules communicate through events, not direct references.

This enables loose coupling and extensibility.

### One Public Class

Atlas exposes a single public API:

new Atlas(options);

All other classes are internal implementation details.

---

## Goals

- Zero external dependencies
- Responsive by default
- Accessible by default
- HTML-driven configuration
- Generic field discovery
- Fast with approximately 1,000 member cards
- Extensible without modifying the core engine
- No flicker on load
- Smooth transitions

---

## Architecture

Atlas uses an event-driven architecture:

1. Atlas coordinates initialisation
2. EventBus enables communication
3. Registry discovers HTML
4. Store manages state
5. Renderer updates the DOM
6. Modules provide UI features

See architecture.md for full details.

---

## Core Components

### Atlas

Public entry point.

Coordinates initialisation and exposes the API.

### EventBus

Communication hub.

Publish/subscribe pattern for loose coupling.

### Registry

Discovers and validates HTML.

Caches DOM references.

### Store

Manages application state.

Publishes events when state changes.

### Member

Represents a single member.

Parses and caches field data.

### MemberCollection

Manages collections of members.

Provides query methods (filter, search, sort).

### Renderer

Updates the DOM.

Batch updates using DocumentFragment.

Manages loading state.

### Modules

Provide independent functionality.

- FilterGenerator — Filter UI
- FilterChips — Active filter chips
- ResultCounter — Result counter
- SortGenerator — Sort controls
- LayoutManager — Layout switching
- Search — Search input (directly bound)

---

## HTML Vocabulary

| Attribute | Purpose |
|-----------|---------|
| data-atlas | Root container |
| data-directory | Member directory |
| data-member | Individual member |
| data-field | Field value |
| data-filterable | Opt-out of filtering |
| data-searchable | Opt-in to search |
| data-sortable | Opt-in to sorting |
| data-search | Search input |
| data-filters | Filter container |
| data-sort | Sort container |
| data-chips | Filter chips container |
| data-results | Result counter container |
| data-layout | Layout toggle |

See html-api.md for full documentation.

---

## Behaviours

### Filtering

- Multi-select within fields (OR logic)
- AND logic across fields
- All fields filterable by default
- Opt-out with data-filterable="false"

### Searching

- "Starts with" matching
- Case-insensitive
- Searchable fields opt-in with data-searchable="true"

### Sorting

- Three-state toggle: asc -> desc -> off
- Only fields present in ALL members are sortable
- Opt-in with data-sortable="true"

### Layout

- Grid default
- List alternative
- Persists to localStorage

---

## Performance

Atlas is designed for directories of approximately 1,000 members.

### Optimisations

- **Set lookups:** Filter values use `Set` for O(1) lookups
- **Filter caching:** Results are cached by filter state
- **Lazy rendering:** Activates automatically at 300+ members
- **Intersection Observer:** Only visible members are rendered in the DOM
- **Batch rendering:** Members load in batches of 25 as you scroll
- **Intl.Collator:** Native browser collation for sorting

### Benchmarks

Tests with 1,000 members:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Init Time | 276ms | 151ms | 45% faster |
| Filter Time (first) | 121ms | 0.4ms | 300x faster |
| Sort Time | 24ms | 1.2ms | 20x faster |
| DOM Nodes (visible) | 22,000 | ~700 | 97% reduction |

**Note:** Lazy rendering only activates when a directory has more than 300 members.

---

## Initial Target Platform

JCink.

Future adapters may support additional platforms without changing the Atlas core.

---

## Development Status

Atlas is currently in active development.

All core features are implemented and working.

See roadmap.md for future plans.