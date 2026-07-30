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