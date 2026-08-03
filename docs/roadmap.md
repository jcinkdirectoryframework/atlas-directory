# Atlas Roadmap

## Completed Milestones

### M0.1 — Project Foundation
- Documentation
- Architecture design
- Atlas class
- Development environment setup

### M0.2 — Registry & Discovery
- Registry discovers HTML
- Finds directory, members, controls
- Validates required structure

### M0.3 — Member Model
- Member parses field data
- Member stores raw and normalized values
- Member supports matches() for search

### M0.4 — MemberCollection
- Manages collections of Member objects
- getAllFieldNames()
- getFilterableFields()
- getSortableFields()
- getUniqueValues()
- applyFilters()
- search()
- sort()

### M0.5 — Store & State
- Store manages application state
- Filters, search, sort, layout
- Getters and setters
- State change events

### M0.6 — Filter Generation
- FilterGenerator generates filter UI
- Multi-select filtering
- Filter chips with removal
- "Clear All" button
- Result counter

### M0.7 — Search
- Search uses "starts with" matching
- Case-insensitive
- Searchable fields opt-in
- Combines with filters (AND logic)

### M0.8 — Sorting
- SortGenerator generates sort UI
- Three-state toggle (asc -> desc -> off)
- Only fields present in ALL members
- Combines with filters and search

### M0.9 — Layout Switching
- LayoutManager handles grid/list switching
- Layout persists to localStorage
- Grid default
- CSS handles member styling

### M0.10 — Architecture Refinement
- EventBus for communication
- Renderer for DOM updates
- Atlas simplification (god class eliminated)
- Loading state (no flicker)
- Batch DOM updates (DocumentFragment)
- All modules use EventBus

---

## Current Status

All core features are complete and working.

Atlas is stable with:
- Search, filters, sorting, layout switching
- Filter chips and result counter
- Event-driven architecture
- No flicker on load
- ~1,000 member capacity

---

## Next Milestones

### M1.0 — Performance Optimisation

Goals:
- Benchmark with ~1,000 members
- Profile and identify bottlenecks
- Optimise rendering
- Optimise filtering and searching

### M1.1 — Accessibility Improvements

Goals:
- Screen reader testing
- Keyboard navigation audit
- ARIA attributes
- Reduced-motion support
- Focus management

### M1.2 — Mobile Optimisation

Goals:
- Mobile layout improvements
- Touch interactions
- Responsive design review

### M1.3 — Documentation Finalisation

Goals:
- Complete API documentation
- Complete HTML API reference
- Examples and demos
- Quick start guide

---

## Future Milestones (Optional)

These features may be added based on user feedback:

### M2.0 — Advanced Features
- Pagination (for very large directories)
- Field-specific search UI
- Date/range filters
- Export functionality

### M2.1 — Platform Adapters
- Additional forum platforms
- Generic CMS support
- WordPress integration

### M3.0 — Release
- npm package
- CDN distribution
- Demo site
- Version 1.0 release

---

## Milestone Legend

| Status | Symbol |
|--------|--------|
| Complete | Yes |
| In Progress | In Progress |
| Planned | Not Started |
| Optional | Optional |

---

## Version History

| Version | Date | Milestone |
|---------|------|-----------|
| v0.1.0 | TBD | Project Foundation |
| v0.2.0 | TBD | Registry & Discovery |
| v0.3.0 | TBD | Member Model |
| v0.4.0 | TBD | MemberCollection |
| v0.5.0 | TBD | Store & State |
| v0.6.0 | TBD | Filter Generation |
| v0.7.0 | TBD | Search |
| v0.8.0 | TBD | Sorting |
| v0.9.0 | TBD | Layout Switching |
| v0.10.0 | TBD | Architecture Refinement |
| v1.0.0 | TBD | Stable Release |