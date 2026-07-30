# Atlas HTML API

Atlas is configured primarily through semantic HTML attributes.

## Root

```html
<div data-atlas>
    ...
</div>
```

Every Atlas instance begins with a single root element.

---

## Members

```html
<article data-member>
    ...
</article>
```

Each member represents one searchable record.

---

## Semantic Fields

Atlas discovers data through `data-field`.

Example:

```html
<div data-field="name">Harry Potter</div>

<span data-field="species">Wizard</span>

<span data-field="faceclaim">Daniel Radcliffe</span>

<span data-field="residence">Godric's Hollow</span>
```

Atlas understands the semantic field names.

It does not know or care whether those values originally came from JCink's `field_1`, `field_2`, etc. Mapping those implementation details is the responsibility of the JCink adapter or the template author.

---

## Controls

The planned HTML vocabulary includes:

* `data-search`
* `data-filter`
* `data-sort`
* `data-layout`
* `data-alphabet`
* `data-results`
* `data-chips`

These elements declare behaviour.

Atlas discovers them automatically.

---

# Configuration Philosophy

Forum owners should spend most of their time writing HTML rather than JavaScript.

A typical installation should require little more than:

```javascript
new Atlas();
```