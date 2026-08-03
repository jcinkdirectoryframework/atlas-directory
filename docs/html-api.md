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

Atlas provides minimal CSS for this in src/styles/atlas.css.

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
    <span data-field="occupation">Hunter</span>
    <span data-field="district">12</span>
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

Atlas discovers controls automatically from the following attributes.

Controls can be placed anywhere within the [data-atlas] root. Atlas discovers them automatically regardless of position.

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
- Default layout is grid.
- These buttons are optional. If omitted, Atlas uses grid layout only.

Note: The layout persists to localStorage, so user preference is remembered
between visits. If you only want grid layout, simply don't include these buttons.

---

## Control Placement Examples

Atlas controls can be placed anywhere within [data-atlas]:

<!-- All controls at the top -->
<div data-atlas>
    <div data-filters></div>
    <input data-search>
    <div data-sort></div>

    <div data-directory>...</div>

    <div data-chips></div>
    <div data-results></div>
    <button data-layout="grid">Grid</button>
</div>

<!-- Controls in a sidebar -->
<div data-atlas>
    <aside>
        <div data-filters></div>
        <div data-sort></div>
    </aside>

    <main>
        <div data-chips></div>
        <div data-results></div>
        <div data-directory>...</div>
    </main>
</div>

Atlas only requires that:
- All controls are inside [data-atlas]
- The [data-directory] exists
- [data-filters] exists (Atlas generates filters here)

---

## JCink — Member List Header vs Member List Row

In JCink, member directories are built using two template sections:

### Member List Header

This section contains:
- The [data-atlas] root container
- Controls ([data-search], [data-filters], [data-sort], [data-chips], [data-results], [data-layout])
- The opening [data-directory] tag

### Member List Row

This section contains:
- Individual [data-member] cards
- [data-field] values within each member

### Example:

Member List Header:
<div data-atlas>
    <input data-search placeholder="Search members...">
    <div data-filters></div>
    <div data-sort></div>
    <div data-chips></div>
    <div data-results></div>

    <div data-directory>
        <!-- Member List Row goes here -->

Member List Row:
        <article data-member>
            <span data-field="name">[name]</span>
            <span data-field="species">[species]</span>
            <span data-field="occupation">[occupation]</span>
            <span data-field="district">[district]</span>
        </article>

Member List Header (continued):
    </div>
</div>

---

## Complete Example

<div data-atlas>
    <!-- Controls placed anywhere -->
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
                Hunter
            </span>
            <span data-field="district" data-filterable="true">
                12
            </span>
        </article>
        <!-- More members... -->
    </div>
</div>

---

## CSS Customisation

Atlas provides minimal CSS for core functionality. All visual styling is left to you.

### Atlas Provides These Classes/Selectors:

| Selector | Purpose |
|----------|---------|
| [data-atlas-loading] [data-directory] | Hides directory during loading |
| [data-directory] | Directory container |
| [data-directory].atlas-layout-grid | Grid layout mode |
| [data-directory].atlas-layout-list | List layout mode |
| [data-member][hidden] | Hidden member |
| [data-member][data-hidden] | Hidden member |

### You Should Style These:

| Element | Suggested Styling |
|---------|-------------------|
| [data-search] | Input field styling |
| [data-filters] | Container layout, spacing |
| [data-filter] | Filter group layout |
| [data-filter-options] button | Filter buttons (active/inactive states) |
| [data-sort] button | Sort buttons (active/asc/desc states) |
| [data-chips] | Chip container |
| .atlas-chip | Individual chip |
| .atlas-chip-remove | Remove button on chip |
| .atlas-clear-all | Clear All button |
| .atlas-result-counter | Result counter text |
| [data-layout] | Layout toggle buttons |
| [data-member] | Member card styling |
| [data-field] | Individual field display |

### Example CSS:

/* Your styles */
[data-search] {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

[data-filter-options] button {
    padding: 0.25rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 20px;
    background: white;
    cursor: pointer;
}

[data-filter-options] button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.atlas-chip {
    background: #e9ecef;
    border-radius: 20px;
    padding: 0.25rem 0.75rem;
}

.atlas-chip-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: #dc3545;
}

---

## Configuration Philosophy

Forum owners should spend most of their time writing HTML rather than JavaScript.

A typical installation requires only:

<link rel="stylesheet" href="path/to/atlas.css">
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
| data-layout | button | Layout toggle (grid or list) — optional |