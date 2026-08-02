# Changelog

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