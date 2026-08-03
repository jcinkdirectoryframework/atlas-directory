# Atlas HTML API

Atlas is configured primarily through semantic HTML attributes.

---

## Root Container

<div data-atlas>
    ...
</div>

Every Atlas instance begins with a single root element.

---

## Loading State

Atlas automatically manages loading state to prevent flicker:

<!-- Atlas adds this during initialisation -->
<div data-atlas data-atlas-loading>
    ...
</div>

<!-- Atlas removes it when ready -->
<div data-atlas>
    ...
</div>

CSS recommendation:

[data-atlas-loading] [data-directory] {
    opacity: 0;
    transition: opacity 0.2s ease;
}

[data-directory] {
    opacity: 1;
    transition: opacity 0.2s ease;
}

---

## Member Directory

<div data-directory>
    <article data-member>...</article>
    <article data-member>...</article>
</div>

- data-directory — Container for all member cards.
- data-member — Individual member card.

---

## Member Fields

<article data-member>
    <span data-field="name">Katniss Everdeen</span>
    <span data-field="species">Human</span>
    <span data-field="occupation">Victor</span>
    <span data-field="residence">District 12</span>
</article>

- data-field — Defines a field value. The value is the semantic field name.

### Field Attributes

| Attribute | Description | Default |
|-----------|-------------|---------|
| data-filterable | Whether the field appears in filters | true |
| data-searchable | Whether the field is searched | false |
| data-sortable | Whether the field appears in sort controls | false |

Examples:

<!-- Opt out of filtering -->
<span data-field="species" data-filterable="false">Human</span>

<!-- Opt in to search -->
<span data-field="name" data-searchable="true">Katniss Everdeen</span>

<!-- Opt in to sorting -->
<span data-field="name" data-sortable="true">Katniss Everdeen</span>

---

## Controls

Atlas discovers controls automatically from the following attributes:

### Search

<input data-search placeholder="Search members...">

- data-search — Marks a search input field.

### Filter Container

<div data-filters></div>

- data-filters — Container where Atlas generates filter interfaces.

### Sort Container

<div data-sort></div>

- data-sort — Container where Atlas generates sort buttons.

### Filter Chips

<div data-chips></div>

- data-chips — Container where Atlas displays active filter chips.

### Result Counter

<div data-results></div>

- data-results — Container where Atlas displays the result counter.

### Layout Controls

<button data-layout="grid">Grid</button>
<button data-layout="list">List</button>

- data-layout — Layout toggle button. Value must be grid or list.

---

## Complete Example

<div data-atlas>
    <!-- Controls -->
    <input data-search placeholder="Search members...">

    <div data-filters></div>
    <div data-sort></div>

    <div data-chips></div>
    <div data-results></div>

    <button data-layout="grid">Grid</button>
    <button data-layout="list">List</button>

    <!-- Members -->
    <div data-directory>
        <article data-member>
            <span data-field="name" data-searchable="true" data-sortable="true">
                Katniss Everdeen
            </span>
            <span data-field="species" data-filterable="true">
                Human
            </span>
            <span data-field="occupation" data-filterable="true">
                Victor
            </span>
        </article>
        <!-- More members... -->
    </div>
</div>

---

## Configuration Philosophy

Forum owners should spend most of their time writing HTML rather than JavaScript.

A typical installation requires only:

<link rel="stylesheet" href="atlas.css">
<script type="module">
    import Atlas from './dist/atlas.js';
    new Atlas();
</script>

---

## Attribute Reference

| Attribute | Element | Description |
|-----------|---------|-------------|
| data-atlas | div | Root container |
| data-directory | div | Member directory container |
| data-member | article | Individual member card |
| data-field | Any | Field value (e.g., data-field="name") |
| data-filterable | Any | Opt-out of filtering (default: true) |
| data-searchable | Any | Opt-in to search (default: false) |
| data-sortable | Any | Opt-in to sorting (default: false) |
| data-search | input | Search input field |
| data-filters | div | Filter container |
| data-sort | div | Sort container |
| data-chips | div | Filter chips container |
| data-results | div | Result counter container |
| data-layout | button | Layout toggle (grid or list) |