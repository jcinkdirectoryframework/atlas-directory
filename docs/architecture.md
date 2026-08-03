# Atlas Architecture

## Overview

Atlas is built around an event-driven architecture with clear separation of responsibilities.

The core philosophy is that Atlas coordinates, but does not control. Modules communicate through events rather than direct coupling.

---

## Architecture Flow

ATLAS (Public entry point — new Atlas())
    |
    | Responsibilities:
    | - Create core services
    | - Initialise modules
    | - Expose public API
    |
    | Does NOT:
    | - Search, filter, sort, or render
    | - Manage state directly
    | - Update the DOM
    |
    v
EVENTBUS (Central communication hub)
    |
    | Responsibilities:
    | - Publish events (pub/sub)
    | - Decouple modules from each other
    | - Enable extensibility
    |
    v
+-----------+  +-----------+  +---------------+
| REGISTRY  |  |   STORE   |  | MEMBER COLL   |
|           |  |           |  |               |
| Discover  |  | State     |  | Data          |
| Validate  |  | Persist   |  | Query         |
| Cache     |  | Publish   |  | Filter        |
+-----------+  +-----------+  +---------------+
                    |
                    v
              +-----------+
              | RENDERER  |
              |           |
              | Listen to |
              | events    |
              | Update    |
              | DOM       |
              | Batch     |
              | Loading   |
              +-----------+
                    |
                    v
              +-----------+
              |  MODULES  |
              |           |
              | FilterGen |
              | SortGen   |
              | Filter    |
              | Chips     |
              | Result    |
              | Counter   |
              | Layout    |
              | Manager   |
              +-----------+

---

## Core Classes

### Atlas

The public entry point.

- Creates all core services
- Initialises modules
- Exposes a minimal public API

Does NOT:
- Search, filter, sort, or render
- Manage state directly
- Update the DOM

### EventBus

Central communication hub.

- Publish/subscribe pattern
- Decouples modules
- Enables extensibility

Events:
- store:filtersChanged
- store:searchChanged
- store:sortChanged
- store:layoutChanged

### Registry

Discovers and validates HTML.

- Finds [data-directory]
- Finds [data-member]
- Finds controls ([data-search], [data-filters], etc.)
- Validates required structure
- Exposes read-only API

### Store

Manages application state.

- Filter state ({ field: [values] })
- Search query
- Sort configuration ({ field, direction })
- Layout preference ('grid' | 'list')

Publishes events when state changes.

### MemberCollection

Manages member data.

- Adds/removes members
- Queries fields
- Filters members
- Sorts members
- Gets unique values

### Renderer

Updates the DOM.

- Listens to Store events
- Batch updates using DocumentFragment
- Toggles member visibility
- Reorders members (sort)
- Manages loading state (no flicker)

Does NOT contain business logic.

---

## Modules

### FilterGenerator

Generates filter interfaces from member data.

- Discovers filterable fields
- Creates buttons for unique values
- Handles selection events
- Updates Store

### FilterChips

Displays active filters as removable chips.

- Renders chips for active filters
- Handles individual removal
- Provides "Clear All" button

### ResultCounter

Shows "Showing X of Y members".

- Listens to all state changes
- Updates count in real-time

### SortGenerator

Generates sort controls.

- Discovers sortable fields
- Three-state toggle (asc -> desc -> off)
- Updates Store

### LayoutManager

Manages layout switching.

- Discovers layout buttons
- Applies CSS classes
- Persists to localStorage

---

## Event Flow Example

### User clicks a filter button:

1. FilterGenerator detects click
2. FilterGenerator calls Store.toggleFilter()
3. Store publishes 'store:filtersChanged'
4. Renderer listens -> re-renders members
5. ResultCounter listens -> updates count
6. FilterChips listens -> updates chips

### User types a search query:

1. Search input fires 'input' event
2. Atlas calls Store.setSearch()
3. Store publishes 'store:searchChanged'
4. Renderer listens -> re-renders members
5. ResultCounter listens -> updates count

---

## Rendering Philosophy

Atlas uses a batch rendering approach:

1. State changes -> Store publishes event
2. Renderer receives -> computes new state
3. DocumentFragment -> builds DOM updates in memory
4. Single DOM write -> appends fragment

This minimises reflows and repaints.

### Loading State

To prevent flicker:

1. HTML starts with data-atlas-loading attribute
2. CSS hides the directory
3. Atlas initialises and renders members
4. Atlas removes data-atlas-loading
5. CSS fades in the directory

---

## Design Principles

Atlas follows these core principles:

1. HTML First — Configure through HTML, not JavaScript
2. Everything Is Data — Members are structured data
3. HTML Is The Database — Read once, cache everything
4. Semantic Names — No platform-specific identifiers in core
5. Separation of Responsibilities — One class, one job
6. CSS Owns Presentation — CSS decides appearance
7. JavaScript Owns Behaviour — Search, filter, sort, state
8. Discovery Over Configuration — Infer from markup
9. Small Public API — new Atlas() is the normal experience
10. Zero Dependencies — No third-party libraries
11. Modern JavaScript — ES modules, classes, private fields
12. Performance Is A Design Requirement — ~1,000 members
13. Accessibility Matters — Keyboard, screen reader, reduced-motion
14. Extensibility Without Modification — Add features via HTML
15. Fail Fast — Clear errors during initialisation

See DESIGN_PRINCIPLES.md for full details.

---

## Folder Structure

src/
├── index.js                 # Public API exports
├── core/                    # Core engine classes
│   ├── Atlas.js            # Public entry point
│   ├── EventBus.js         # Communication hub
│   ├── Registry.js         # DOM discovery
│   ├── Store.js            # State management
│   ├── Member.js           # Member model
│   ├── MemberCollection.js # Member collection
│   └── Renderer.js         # DOM updates
├── modules/                 # Feature modules
│   ├── FilterGenerator.js  # Filter UI generation
│   ├── FilterChips.js      # Active filter chips
│   ├── ResultCounter.js    # Result counter
│   ├── SortGenerator.js    # Sort UI generation
│   └── LayoutManager.js    # Layout switching
├── adapters/                # Platform adapters
│   └── JCinkAdapter.js     # JCink-specific mapping (currently empty)
├── models/                  # Data models (currently empty)
├── utils/                   # Utility functions (currently empty)
└── styles/                  # CSS files
    └── atlas.css           # Minimal core styles

docs/                       # Documentation
├── architecture.md
├── atlas-specification.md
├── decisions.md
├── html-api.md
└── roadmap.md

dist/                       # Production builds (currently empty)
examples/                   # Example implementations
tests/                      # Test files (currently empty)

### Folder Descriptions

| Folder | Purpose |
|--------|---------|
| src/core/ | Core engine classes — Atlas, EventBus, Registry, Store, Member, MemberCollection, Renderer |
| src/modules/ | Feature modules — FilterGenerator, FilterChips, ResultCounter, SortGenerator, LayoutManager |
| src/adapters/ | Platform adapters — JCinkAdapter (currently empty, for future platform-specific mapping) |
| src/models/ | Data models — Currently empty (Member and MemberCollection handle data) |
| src/utils/ | Utility functions — Currently empty (will contain debounce, throttle, normalize, etc.) |
| src/styles/ | CSS — atlas.css (minimal core styles for functionality) |
| dist/ | Production builds — Generated when preparing for deployment |
| tests/ | Test files — Unit and integration tests (currently empty) |
| examples/ | Example implementations — Demo and usage examples |
| docs/ | Documentation — All project documentation |