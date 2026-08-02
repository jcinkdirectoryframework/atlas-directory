# Changelog

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