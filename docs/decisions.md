# Atlas Decisions

This document records significant architectural decisions and the reasoning behind them.

---

## ADR-001 — One Public Class

**Status:** Accepted

Atlas exposes a single public class:

```javascript
new Atlas();
```

### Reason

* Simple API
* Easy for forum administrators
* Internal implementation can change without breaking users

---

## ADR-002 — HTML Is the Public API

**Status:** Accepted

Atlas is configured through semantic HTML rather than imperative JavaScript.

### Reason

Forum skinners are already comfortable editing templates.

Semantic HTML is more approachable than configuration code.

---

## ADR-003 — Semantic Fields

**Status:** Accepted

Atlas uses semantic field names such as:

* `species`
* `faceclaim`
* `residence`

rather than implementation-specific names like `field_1`.

### Reason

* Self-documenting
* Platform-independent
* Easier to maintain
* Easier to read

---

## ADR-004 — Semantic Markup

**Status:** Accepted

Atlas discovers values using semantic attributes such as:

```html
<span data-field="species">
```

Label-based extraction and CSS selector mapping may be considered in future, but are not part of the initial implementation.

### Reason

Semantic markup is explicit, resilient and easy to understand.

---

## ADR-005 — HTML Vocabulary

**Status:** Accepted

Atlas defines a small, consistent HTML vocabulary including:

* `data-atlas`
* `data-member`
* `data-field`
* `data-search`
* `data-filter`
* `data-sort`
* `data-layout`
* `data-alphabet`
* `data-results`
* `data-chips`

### Reason

A consistent vocabulary makes Atlas easier to learn and allows the documentation to focus on HTML rather than JavaScript.

---

## ADR-006 — Constructors Coordinate, They Don't Work

**Status:** Accepted

Constructors should remain small and describe the application's lifecycle.

Complex behaviour should be delegated to clearly named private methods.

### Example

```javascript
constructor(options = {}) {
    this.options = this.#createOptions(options);
    this.root = this.#findRoot();
    this.#initialise();
}
```

### Reason

This makes the code self-documenting, easier to test, and easier to extend as Atlas grows.

---

## ADR-007 — Prefer Fewer Concepts

**Status:** Accepted

Atlas should introduce as few concepts as possible. If a responsibility can be expressed as a private method instead of a new public abstraction, prefer the simpler design.

### Reason

A smaller mental model makes Atlas easier to learn, easier to contribute to, and easier to maintain.

---

## ADR-008 — Discovery Before Interpretation

**Status:** Accepted

The Registry is responsible only for discovering Atlas elements and exposing them. It does not interpret member data or implement behaviour.

### Reason

Separating discovery from interpretation keeps the Registry focused, reusable and easy to test.

---

## ADR-009 — Group Controls by Responsibility

**Status:** Accepted

The Registry stores discovered controls in a single `controls` collection, grouped by type.

### Reason

This avoids unnecessary private fields, makes the Registry easier to extend, and provides a consistent API.

---

## ADR-010 — Core Classes Use Private Fields

**Status:** Accepted

Atlas uses JavaScript private class fields (`#`) for internal state.

Public access is provided through explicit getters where appropriate.

### Reason

This keeps the public API intentional, prevents accidental coupling between classes, and aligns with Atlas's goal of exposing as few concepts as possible.

---

## ADR-011 — Fail Fast on Invalid Structure

**Status:** Accepted

Atlas validates its required HTML structure during discovery and throws descriptive errors when the structure is invalid.

### Reason

Failing during initialisation is preferable to silently ignoring invalid markup, as it makes configuration errors easier to diagnose.

---

## ADR-012 — Event-Driven Communication

Status: Accepted

Atlas uses an EventBus for communication between modules instead of direct coupling.

### Context

Previously, Atlas coordinated everything directly:
- Atlas knew about every module
- Modules called each other's methods
- Adding new features required changing Atlas
- Testing was difficult

### Decision

Implement an EventBus with publish/subscribe pattern:

class EventBus {
    subscribe(event, callback) { ... }
    publish(event, data) { ... }
    unsubscribe(event, callback) { ... }
}

### Consequences

Positive:
- Modules are decoupled
- Atlas is simplified
- Adding new features doesn't require changing Atlas
- Testing is easier
- Events can be logged for debugging

Negative:
- Slightly more complex mental model
- Events need to be documented

### Alternatives Considered

CustomEvent on document — Used previously but was too global and uncontrolled.

Direct module references — Led to Atlas becoming a god class.

---

## ADR-013 — Renderer Responsibilities

Status: Accepted

Atlas uses a dedicated Renderer class for all DOM updates instead of having Atlas handle them directly.

### Context

Previously, Atlas handled DOM updates directly:
- Atlas#updateMemberVisibility()
- Atlas#reorderMembers()
- Atlas had 350+ lines of code

### Decision

Create a Renderer class that:
- Listens to Store events
- Updates member visibility
- Reorders members (sort)
- Batch updates using DocumentFragment
- Manages loading state

### Consequences

Positive:
- Atlas is simplified
- DOM logic is isolated
- Performance improvements (batch updates)
- Loading state prevents flicker
- Renderer can be optimised independently

Negative:
- One additional class to maintain

### Alternatives Considered

Atlas handling DOM updates — Made Atlas a god class.

Virtual DOM — Too complex, unnecessary dependencies.

Direct DOM manipulation — Inefficient, causes flicker.

---

## ADR-014 — Loading State

Status: Accepted

Atlas uses a data-atlas-loading attribute to prevent flicker during initialisation.

### Context

When Atlas loads, members are visible before filters are applied, causing a visual flash.

### Decision

1. HTML starts with data-atlas-loading attribute
2. CSS hides the directory while loading
3. Atlas renders members after initialisation
4. Atlas removes the loading attribute
5. CSS fades in the directory

### Consequences

Positive:
- No flicker on load
- Smooth user experience
- CSS handles transitions

Negative:
- CSS required for loading state

### Alternatives Considered

JavaScript flash hiding — Visible delay before hiding, still flickers.

Initial display: none — Requires JavaScript to show, fails if JS disabled.

Server-side rendering — Not applicable for client-side Atlas.