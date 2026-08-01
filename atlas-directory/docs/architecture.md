# Atlas Architecture

## High-Level Flow

```text
Atlas
    ↓
Registry
    ↓
MemberCollection
    ↓
Store
    ↓
Renderer
    ↓
Modules
    ↓
Ready
```

---

# Core Classes

## Atlas

The public entry point.

Responsible for coordinating the application.

---

## Registry

Discovers:

* members
* fields
* controls

Builds an internal registry describing the page.

* Receives the Atlas root from Atlas.
* Performs a single discovery pass.
* Discovers the directory, members and controls.
* Stores DOM references only.
* Exposes a read-only API.

### Public API

- `root`
- `directory`
- `members`
- `controls`

All properties are read-only.

---

## Store

Maintains application state.

Examples:

* search query
* active filters
* current sort
* layout
* visibility

---

## Renderer

Updates the DOM.

Responsibilities include:

* showing and hiding members
* reordering members after sorting
* updating counters
* updating active chips

---

## Events

Provides communication between modules.

Modules should communicate through events rather than directly referencing one another.

---

# Modules

The initial modules will include:

* Search
* Filters
* Sorting
* Alphabet
* Layout
* Active Chips
* Counters

Modules should be independent and reusable.

---

# Adapters

Platform-specific logic belongs in adapters.

The first adapter will be:

* JCinkAdapter

The adapter translates platform-specific HTML into Atlas's semantic model.

---

# Rendering Philosophy

* Avoid rebuilding HTML.
* Cache DOM references.
* Toggle visibility.
* Reorder elements only when necessary.
* Batch DOM writes where appropriate.