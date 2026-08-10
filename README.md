# Atlas

**A dependency-free, HTML-driven directory engine.**

Atlas transforms static HTML member lists into interactive, searchable directories with filtering, sorting, and layout switching — all configured through semantic HTML.

---

## Features

- **Zero Dependencies** — No jQuery, no React, no frameworks. Just vanilla JavaScript.
- **HTML-First** — Configure everything through HTML attributes. No JavaScript required for basic use.
- **Instant Search** — Type to filter members in real-time.
- **Faceted Filtering** — Multi-select filters for any field.
- **Filter Display Options** — Choose between buttons, dropdowns, checkboxes, or radio buttons for each filter.
- **URL Persistence** — Share or bookmark filtered views with URL parameters.
- **Smart Sorting** — Three-state toggle (asc → desc → off).
- **Layout Switching** — Grid and list views with persistent preference.
- **Filter Chips** — Active filters displayed as removable chips with "Clear All".
- **Result Counter** — "Showing X of Y members" updates in real-time.
- **No Flicker** — Smooth loading with CSS transitions.
- **Accessible** — Keyboard navigation, screen reader support, reduced-motion compatible.
- **Mobile-Optimised** — Touch targets, responsive layouts, iOS zoom prevention.
- **~1,000 Members** — Optimised for directories of up to one thousand members.
- **Theme-Aware** — Adapts to your site's colour scheme automatically.

---

## CDN Installation

The quickest way to get started — no files to upload!

<link rel="stylesheet" href="https://atlas-directory.netlify.app/atlas.min.css">

<script type="module">
    import Atlas from 'https://atlas-directory.netlify.app/atlas.min.js';
    new Atlas();
</script>

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

    <!-- Layout buttons (optional — default is grid) -->
    <button data-layout="grid">Grid</button>
    <button data-layout="list">List</button>

    <!-- Member directory -->
    <div data-directory>
        <article data-member>
            <div><strong>Name:</strong> <span data-field="name" data-searchable="true" data-sortable="true" data-filterable="false">Din Djarin</span></div>
            <div><strong>Faceclaim:</strong> <span data-field="faceclaim" data-searchable="true" data-sortable="true" data-filterable="false">Pedro Pascal</span></div>
            <div><strong>Species:</strong> <span data-field="species" data-sortable="true">Human</span></div>
            <div><strong>Occupation:</strong> <span data-field="occupation" data-searchable="true" data-sortable="true">Bounty Hunter</span></div>
            <div><strong>Faction:</strong> <span data-field="faction" data-sortable="true">Mandalorian</span></div>
            <div><strong>Homeworld:</strong> <span data-field="homeworld" data-sortable="true">Aq Vetina</span></div>
            <div><strong>Status:</strong> <span data-field="status" data-sortable="true">Active</span></div>
        </article>
        <!-- More members... -->
    </div>
</div>

### 2. Add CSS

Atlas provides minimal core CSS for functionality. You can customise everything else.

Option A: CDN (Recommended)
<link rel="stylesheet" href="https://atlas-directory.netlify.app/atlas.min.css">

Option B: Self-Host
<link rel="stylesheet" href="src/styles/atlas.css">

For custom styling, see the CSS Customisation section in docs/html-api.md.

### 3. Add JavaScript

Option A: CDN (Recommended)
<script type="module">
    import Atlas from 'https://atlas-directory.netlify.app/atlas.min.js';
    new Atlas();
</script>

Option B: Self-Host
<script type="module">
    import Atlas from './dist/atlas.js';
    new Atlas();
</script>

That's it. Atlas discovers everything automatically.

---

## Filter Display Options

Atlas now supports four filter display types, configurable via HTML attributes:

| Display Type | Attribute | Description |
|--------------|-----------|-------------|
| Buttons (default) | (no attribute) | Visual, clickable buttons for each filter value |
| Dropdown | `data-filter-dropdown` | Single-select dropdown menu — saves space |
| Checkboxes | `data-filter-checkboxes` | Multi-select checkboxes — select multiple values |
| Radio Buttons | `data-filter-radio` | Single-select radio buttons — compact list |

### Example

<div data-filters 
     data-filter-radio="status" 
     data-filter-checkboxes="species,faction" 
     data-filter-dropdown="occupation">
</div>

For more details, see the HTML API documentation.

---

## Performance

Atlas is optimised for directories of up to ~1,000 members.

Key optimisations:
- Set lookups for O(1) filter matching
- Filter caching — repeated filters are instant
- Lazy rendering — automatically activates at 300+ members
- Intersection Observer — only renders visible members
- Intl.Collator — faster locale-aware sorting

Benchmarks with 1,000 members:
- Init time: ~150ms
- Filter time: ~0.4ms (first), instant (cached)
- Sort time: ~1.2ms
- Visible DOM nodes: ~700 (vs 22,000 without lazy rendering)

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
| data-filter-radio | Fields to show as radio buttons, in order |
| data-filter-checkboxes | Fields to show as checkboxes, in order |
| data-filter-buttons | Fields to show as buttons, in order |
| data-filter-dropdown | Fields to show as dropdowns, in order |
| data-sort | Container where Atlas generates sort buttons |
| data-chips | Container where Atlas displays filter chips |
| data-results | Container where Atlas displays result counter |
| data-layout | Layout toggle button (grid or list) — optional |

See docs/html-api.md for full documentation.

---

## JCink Installation

For JCink forums, Atlas is installed across two templates:

- Member List Header — Contains the Atlas wrapper, controls, and directory
- Member List Row — Contains each member card

See the JCink Installation Guide (docs/installation/jcink.html) for step-by-step instructions.

---

## Live Examples

See Atlas in action with different layouts:

- Standard Layout (examples/standard.html)
- Sidebar Layout (examples/sidebar.html)
- Centered Minimal Layout (examples/centered.html)
- Two-Column Layout (examples/two-column.html)
- Slide-out Top Bar (examples/slideout.html)

View all layout examples (docs/examples/layout-examples.html)

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
RENDERER (DOM updates, batch rendering, loading state, lazy rendering)
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
- Filter display options (buttons, dropdowns, checkboxes, radio)
- URL persistence
- Filter chips with removal
- Result counter
- Search (starts-with matching)
- Sort (three-state toggle)
- Layout switching (grid/list)
- State persistence (layout)
- Loading state (no flicker)
- Performance optimisation (Set lookups, filter caching, lazy rendering)
- Accessibility (ARIA, keyboard navigation, reduced motion)
- Mobile optimisation (touch targets, responsive layouts)
- Theme-aware CSS

### Next
- Documentation finalisation
- Release preparation

---

## Browser Support

Atlas targets modern browsers that support:
- ES Modules
- JavaScript classes
- Private class fields
- requestAnimationFrame
- AbortController
- localStorage
- Intersection Observer (for lazy rendering)

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

Built with ❤️ by Maeve for the JCink community.