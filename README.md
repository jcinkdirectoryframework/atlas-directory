# Atlas

**A dependency-free, HTML-driven directory engine.**

Atlas transforms static HTML member lists into interactive, searchable directories with filtering, sorting, and layout switching — all configured through semantic HTML.

---

## Features

- **Zero Dependencies** — No jQuery, no React, no frameworks. Just vanilla JavaScript.
- **HTML-First** — Configure everything through HTML attributes. No JavaScript required for basic use.
- **Instant Search** — Type to filter members in real-time.
- **Faceted Filtering** — Multi-select filters for any field.
- **Smart Sorting** — Three-state toggle (asc → desc → off).
- **Layout Switching** — Grid and list views with persistent user preference.
- **Filter Chips** — Active filters displayed as removable chips with "Clear All".
- **Result Counter** — "Showing X of Y members" updates in real-time.
- **No Flicker** — Smooth loading with CSS transitions.
- **Accessible** — Keyboard navigation, screen reader support, reduced-motion compatible.
- **Responsive** — Works on all screen sizes.
- **~1,000 Members** — Optimised for directories of up to one thousand members.

---

## Quick Start

### 1. Add HTML

<div data-atlas>
    <!-- Search -->
    <input data-search placeholder="Search members...">

    <!-- Controls -->
    <div data-filters></div>
    <div data-sort></div>
    <div data-chips></div>
    <div data-results></div>

    <!-- Layout buttons -->
    <button data-layout="grid">Grid</button>
    <button data-layout="list">List</button>

    <!-- Member directory -->
    <div data-directory>
        <article data-member>
            <span data-field="name">Katniss Everdeen</span>
            <span data-field="species">Human</span>
            <span data-field="occupation">Victor</span>
        </article>
        <!-- More members... -->
    </div>
</div>

### 2. Add CSS

<link rel="stylesheet" href="atlas.css">

### 3. Add JavaScript

<script type="module">
    import Atlas from './dist/atlas.js';
    new Atlas();
</script>

That's it. Atlas discovers everything automatically.

---

## HTML API

### Root Container

| Attribute | Description |
|-----------|-------------|
| data-atlas | Marks the Atlas root container |

### Members

| Attribute | Description |
|-----------|-------------|
| data-member | Marks a member card |
| data-field | Defines a field value (e.g., data-field="name") |
| data-filterable | Opt-out of filtering (default: true) |
| data-searchable | Opt-in to search (default: false) |
| data-sortable | Opt-in to sorting (default: false) |

### Controls

| Attribute | Description |
|-----------|-------------|
| data-search | Search input field |
| data-filters | Container where Atlas generates filters |
| data-sort | Container where Atlas generates sort buttons |
| data-chips | Container where Atlas displays filter chips |
| data-results | Container where Atlas displays result counter |
| data-layout | Layout toggle button (grid or list) |

See docs/html-api.md for full documentation.

---

## Architecture

Atlas uses an event-driven architecture with clear separation of concerns:

ATLAS (Public entry point — new Atlas())
    ↓
EVENTBUS (Central communication hub)
    ↓
├── REGISTRY (Discover, validate, cache DOM)
├── STORE (State management, publish events)
├── MEMBER COLLECTION (Data layer, queries)
    ↓
RENDERER (DOM updates, batch rendering, loading state)
    ↓
MODULES (FilterGenerator, FilterChips, ResultCounter, SortGenerator, LayoutManager)

Key principles:
- Atlas coordinates initialisation only — no business logic
- EventBus enables loose coupling between modules
- Store publishes events when state changes
- Renderer listens to events and updates the DOM
- Modules are independent and pluggable

See docs/architecture.md for details.

---

## Development Status

Atlas is currently in active development.

### Completed
- Core discovery (Registry)
- Member parsing and caching
- MemberCollection with query methods
- Store with state management
- EventBus for communication
- Renderer with batch DOM updates
- Filter generation (multi-select)
- Filter chips with removal
- Result counter
- Search (starts-with matching)
- Sort (three-state toggle)
- Layout switching (grid/list)
- State persistence (layout)
- Loading state (no flicker)

### Next
- Performance optimisation
- Accessibility improvements
- Mobile responsiveness
- Documentation finalisation

---

## Browser Support

Atlas targets modern browsers that support:
- ES Modules
- JavaScript classes
- Private class fields
- requestAnimationFrame
- AbortController
- localStorage

Supported browsers:
- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

---

## Contributing

Please see CONTRIBUTING.md for development guidelines.

---

## License

MIT

---

## Acknowledgments

Atlas was originally conceived for JCink roleplay forums but is designed to be platform-agnostic.