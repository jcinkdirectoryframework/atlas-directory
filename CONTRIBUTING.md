# Contributing to Atlas

Atlas is developed with a documentation-first workflow.

---

## Development Principles

Every significant change should:

- Be discussed before implementation
- Be reflected in the documentation
- Include an Architecture Decision Record (ADR) if it changes the design
- Leave the project in a working state

Classes should have a single responsibility and expose the smallest public API possible.

---

## Architecture Guidelines

### Class Responsibilities

- Atlas — Public entry point only. No business logic.
- EventBus — Communication between modules.
- Registry — DOM discovery and validation only.
- Store — State management and event publishing.
- Renderer — DOM updates only. No business logic.
- Modules — Independent UI components.

### Module Communication

Modules should communicate through EventBus, not direct references:

Good:
this.events.publish('filters:changed', { filters });

Bad:
this.otherModule.updateFilters();

### HTML API

Atlas is configured through HTML attributes. Avoid adding JavaScript configuration options.

---

## Development Environment

Atlas is developed using:
- vscode.dev
- GitHub
- GitHub Pages

No local Node.js environment is assumed.

---

## Code Style

Prefer:

- Modern ECMAScript
- ES modules
- Private class fields
- Descriptive naming
- Composition
- Immutable public APIs where appropriate
- Small focused classes
- Fail-fast validation

Avoid:

- jQuery
- Unnecessary dependencies
- Overly clever abstractions
- Large multi-purpose classes

---

## Testing

Atlas is tested manually in the browser during development.

Before committing:

1. Open the demo page
2. Test all features (search, filter, sort, layout)
3. Test combinations
4. Check for console errors
5. Verify no flicker on load

---

## Documentation Requirements

Every feature must be documented:

- README.md — Overview and quick start
- docs/architecture.md — Architecture overview
- docs/html-api.md — HTML API reference
- docs/atlas-specification.md — Technical specification
- docs/decisions.md — ADRs for significant decisions
- docs/roadmap.md — Project roadmap

---

## Commit Messages

Follow conventional commit format:

type(scope): description

[optional body]

[optional footer]

Types:
- feat — New feature
- fix — Bug fix
- docs — Documentation
- refactor — Code improvement
- perf — Performance improvement
- test — Testing
- chore — Maintenance

---

## Pull Request Process

1. Open an issue or discussion first
2. Fork the repository
3. Create a feature branch
4. Make changes
5. Update documentation
6. Submit PR

Pull requests should include:
- Description of changes
- Testing instructions
- Documentation updates
- ADR if applicable

---

## Milestone Workflow

Every milestone follows this sequence:

1. Discuss requirements
2. Design the architecture
3. Agree on responsibilities
4. Update design documentation if required
5. Implement code
6. Review the implementation
7. Test the implementation
8. Update documentation
9. Update the Atlas Development Kit where required
10. Commit
11. Push

No milestone is complete until every applicable step has been completed.

---

## Questions?

Open an issue or discussion on GitHub.