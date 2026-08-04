# Changelog

## [M1.0] — 2026-08-04

### Added

- **Lazy Rendering** — Automatically activates when a directory has 300+ members
  - Uses Intersection Observer with sentinel elements
  - Renders members in batches of 25 as you scroll
  - Removes off-screen members from the DOM to reduce memory usage
  - Reduces visible DOM nodes from ~22,000 to ~700 for 1,000 members

### Changed

- **MemberCollection.applyFilters()** — Optimised with Set lookups (O(1) instead of O(n))
  - Filter time reduced from 121ms to 0.4ms (300x faster)

- **Store** — Added filter caching
  - Results are cached by filter state
  - Repeated filters are instant
  - Cache is automatically cleared when filters, search, or sort change

- **Renderer.sortMembers()** — Optimised with Intl.Collator
  - Sort time reduced from 24ms to 1.2ms (20x faster)

- **Init time** — Reduced from 276ms to 151ms (45% faster)

### Fixed

- DOM memory usage for large directories is now significantly lower
- Scrolling performance with 1,000+ members is now smooth

### Performance Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Init Time | 276ms | 151ms | 45% faster |
| Filter Time (first) | 121ms | 0.4ms | 300x faster |
| Sort Time | 24ms | 1.2ms | 20x faster |
| DOM Nodes (visible) | 22,000 | ~700 | 97% reduction |

---

## [M0.10] — 2026-08-04

### Added

- **EventBus** (`src/core/EventBus.js`)
  - Central publish/subscribe communication system
  - Decouples modules from each other
  - Enables extensibility without modifying core

- **Renderer** (`src/core/Renderer.js`)
  - Dedicated DOM update manager
  - Batch updates using DocumentFragment
  - Loading state management (no flicker)

- **Documentation**
  - JCink Installation Guide (`docs/installation/jcink.html`)
  - CSS Reference section in `docs/css-customisation.html`
  - Live layout examples linked from documentation
  - Updated all examples to use Star Wars characters

### Changed

- **Atlas class** — Simplified, god class eliminated
- **Store class** — Now publishes events via EventBus
- **All modules** — Now use EventBus instead of CustomEvent
- **README.md** — Updated examples, added JCink and examples links
- **All documentation** — Updated to reflect new architecture

### Fixed

- No flicker on page load
- All features combine correctly (filters + search + sort + layout)
- Examples now work with live member data

## [M0.9] — 2026-08-03

### Added

- **LayoutManager module** (`src/modules/LayoutManager.js`)
  - Manages grid/list layout switching
  - Discovers `[data-layout]` buttons automatically
  - Persists layout preference to localStorage
  - Applies `.atlas-layout-grid` or `.atlas-layout-list` class to directory container
  - CSS handles member styling via descendant selectors

- **Layout integration in Atlas**
  - Layout combines with filters, search, and sort
  - Debug output shows current layout
  - Default layout is `grid`

### Changed

- **Store class**
  - Added `setLayout()` method
  - Layout state stored in Store

- **demo.css**
  - Added grid and list layout styles
  - Member styles use CSS descendant selectors from directory container

### Fixed

- Layout persists across page refreshes via localStorage

## [M0.8] — 2026-08-03

### Added

- **SortGenerator module** (`src/modules/SortGenerator.js`)
  - Generates sort buttons from MemberCollection data
  - Discovered via `[data-sort]` container
  - Sortable fields opt-in with `data-sortable="true"` (default: false)
  - Only fields present in ALL members are sortable
  - Three-state toggle: asc → desc → off
  - Visual indicators: `.active`, `.asc`, `.desc` classes
  - Arrow indicators: ↑ for ascending, ↓ for descending

- **Sort integration in Atlas**
  - Sort combines with filters and search (AND logic)
  - DOM reordering on sort
  - Debug output now shows sortable fields

### Changed

- **Member class**
  - Added `sortable` flag support
  - Added `isSortable()` method

- **MemberCollection class**
  - Added `getSortableFields()` method (only fields present in ALL members)

- **Atlas class**
  - Integrated SortGenerator
  - Added `#sortMembers()` method
  - Added `#reorderMembers()` method

- **demo.css**
  - Added styles for sort buttons and states

### Fixed

- Sort UI now updates correctly when filters change
- Sort buttons show correct state after filter changes

## [M0.7] — 2026-08-02

### Added

- **Search Functionality**
  - `[data-search]` input is automatically discovered and integrated
  - Search uses "starts with" matching (case-insensitive)
  - Searchable fields are opt-in with `data-searchable="true"` (default: false)
  - Search combines with filters using AND logic (members must match both)

### Changed

- **Member class**
  - Added `searchable` flag support (default: false, opt-in with `data-searchable="true"`)
  - Added `isSearchable()` method
  - Updated `matches()` to use "starts with" matching and only searchable fields

- **Atlas class**
  - Integrated search input event listener
  - Updated `#applyFilters()` to combine search with filters

- **ResultCounter**
  - Updated to handle both MemberCollection (.size) and arrays (.length)
  - Removed internal event listener (Atlas now manages updates)

- **FilterChips**
  - Fixed "Clear All" button to disappear when all chips removed
  - Chips now display `Field: Value` format (e.g., "Species: Elf")
  - Chips are now sorted alphabetically by field name
  - Removed separate chip group labels for cleaner UI

### Fixed

- Result counter no longer shows "undefined" when filters are active
- "Clear All" button now correctly disappears when all filters are removed
- Counter updates correctly on both filter and search changes

## [M0.6] — 2026-08-02

### Added

- **Store class** (`src/core/Store.js`)
  - Manages application state (filters, search, sort, layout)
  - Provides `toggleFilter()`, `isFilterActive()`, `clearFilters()`, `clearFieldFilters()`, `clearAllFilters()`

- **FilterGenerator module** (`src/modules/FilterGenerator.js`)
  - Generates filter interfaces from MemberCollection data
  - Discovers filterable fields automatically
  - Creates button-based filters with multi-select support
  - "All" button to clear individual field filters
  - Toggles `.active` class on selected buttons
  - Dispatches `atlas:filtersChanged` events

- **FilterChips module** (`src/modules/FilterChips.js`)
  - Displays active filters as removable chips
  - Individual chip removal via × button
  - "Clear All" button to remove all filters
  - Updates automatically when filters change

- **ResultCounter module** (`src/modules/ResultCounter.js`)
  - Shows "Showing X of Y members"
  - Updates automatically when filters change

### Changed

- **Member class**
  - Added `filterable` flag support (default: true)
  - Added `isFilterable()` method
  - Stores `_atlasMember` reference on DOM element for efficient lookups

- **MemberCollection class**
  - Added `getFilterableFields()` method
  - Added `applyFilters()` method with multi-select support

- **Registry class**
  - Added `[data-filters]` discovery
  - Added `filtersContainer`, `chipsContainer`, `resultsContainer` getters

- **Atlas class**
  - Integrated Store, FilterGenerator, FilterChips, ResultCounter
  - Added defensive error handling
  - Updated debug output with chips and results container status

- **index.html**
  - Added `[data-filters]`, `[data-chips]`, `[data-results]` containers
  - Added `data-filterable="false"` to name fields
  - Linked `demo.css` for styling

### Fixed

- Filter chips now correctly remove individual filters
- Result counter now shows correct numbers (using `.size` on MemberCollection)
- Member visibility updates correctly when filters change
- Proper synchronization between filters, chips, and counter
- All filters are cleared when "Clear All" is clicked

## [M0.5] — 2026-08-02

### Added

- **Member class** (`src/core/Member.js`)
  - Parses `[data-field]` attributes from member elements
  - Stores raw and normalized field values
  - Provides `get()`, `has()`, `matches()` methods
  - Supports `toObject()` for debugging

- **MemberCollection class** (`src/core/MemberCollection.js`)
  - Manages collections of Member objects
  - Provides `getAllFieldNames()` to discover available fields
  - Provides `getUniqueValues()` for filter data preparation
  - Supports filtering, searching, sorting, and slicing
  - Iterable via `for...of` and `forEach()`

- **Atlas integration**
  - Creates MemberCollection from Registry-discovered members
  - Debug output now shows field names and individual member data

### Changed

- **index.html**
  - Added `[data-filters]` container for future automatic filter generation
  - Removed manual filter controls (now discovered from member data)
  - Added proper `[data-field]` attributes to member content

### Removed

- Manual filter containers (`[data-filter]`) from demo HTML
  - Filter generation will be implemented automatically in a future milestone

## Unreleased

### Added

- Initial project structure.
- Documentation.
- Development environment.
- Demo application.
- Registry implementation.

### Changed

Nothing yet.