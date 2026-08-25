/**
 * Member
 *
 * Represents a single member card in the directory.
 *
 * Responsibilities:
 * - Parse field data from the DOM element
 * - Store field values (raw and normalized)
 * - Provide access to field data
 * - Support simple text search across all fields
 *
 * Deliberately does NOT:
 * - Know about filtering or sorting logic
 * - Understand roleplay concepts
 * - Manage collections of members
 * - Render or update the DOM
 */

export default class Member {

    #id;
    #element;
    #fields = new Map();
    #fieldElements = new Map();

    /**
     * Create a Member.
     *
     * @param {HTMLElement} element - The DOM element containing the member data
     * @param {number} index - The member's position in the discovery order
     */
    constructor(element, index) {

        if (!element || !(element instanceof HTMLElement)) {
            throw new Error('Member requires a valid HTMLElement');
        }

        this.#element = element;
        this.#id = this.#generateId(element, index);
        this.#parseFields();

        // Store reference to this Member on the DOM element
        element._atlasMember = this;

    }

    /**
     * Generate a unique identifier for the member.
     */
    #generateId(element, index) {

        const explicitId = element.dataset.memberId;

        if (explicitId) {
            return explicitId;
        }

        return `member-${index}`;

    }

    /**
     * Parse all fields from the member element.
     *
     * Finds all descendants with [data-field] and stores:
     * - The raw text content
     * - A normalized version (lowercase, trimmed)
     * - Whether the field is filterable (default: true, opt-out with data-filterable="false")
     * - Whether the field is searchable (default: false, opt-in with data-searchable="true")
     * - Whether the field is sortable (default: false, opt-in with data-sortable="true")
     */
    #parseFields() {

        const fieldElements = this.#element.querySelectorAll('[data-field]');

        for (const el of fieldElements) {

            const fieldName = el.dataset.field;
            const rawValue = el.textContent.trim();
            const filterable = el.dataset.filterable !== 'false'; // Default: true
            const searchable = el.dataset.searchable === 'true'; // Default: false
            const sortable = el.dataset.sortable === 'true'; // Default: false

            // Skip empty field names
            if (!fieldName) {
                console.warn(
                    `Member ${this.#id} has a [data-field] attribute with no value, ignoring`
                );
                continue;
            }

            // Skip if field already exists (take first occurrence)
            if (this.#fields.has(fieldName)) {
                console.warn(
                    `Duplicate field "${fieldName}" found for member ${this.#id}, ignoring`
                );
                continue;
            }

            this.#fields.set(fieldName, {
                raw: rawValue,
                normalized: this.#normalize(rawValue),
                filterable: filterable,
                searchable: searchable,
                sortable: sortable
            });

            this.#fieldElements.set(fieldName, el);

        }

    }

    /**
     * Normalize a string for case-insensitive comparison.
     */
    #normalize(value) {
        return value.toLowerCase().trim();
    }

    /**
     * Unique identifier for this member.
     */
    get id() {
        return this.#id;
    }

    /**
     * The DOM element this member represents.
     */
    get element() {
        return this.#element;
    }

    /**
     * Get all field names for this member.
     */
    get fieldNames() {
        return Array.from(this.#fields.keys());
    }

    /**
     * Get the raw value of a field.
     *
     * @param {string} fieldName
     * @returns {string|null} The raw value, or null if not found
     */
    get(fieldName) {

        const field = this.#fields.get(fieldName);

        return field ? field.raw : null;

    }

    /**
     * Get the normalized value of a field.
     *
     * @param {string} fieldName
     * @returns {string} The normalized value, or empty string if not found
     */
    getNormalized(fieldName) {

        const field = this.#fields.get(fieldName);

        return field ? field.normalized : '';

    }

    /**
     * Check if the member has a specific field.
     */
    has(fieldName) {
        return this.#fields.has(fieldName);
    }

    /**
     * Check if a field is filterable.
     *
     * @param {string} fieldName
     * @returns {boolean}
     */
    isFilterable(fieldName) {

        const field = this.#fields.get(fieldName);

        return field ? field.filterable : false;

    }

    /**
     * Check if a field is searchable.
     *
     * @param {string} fieldName
     * @returns {boolean}
     */
    isSearchable(fieldName) {

        const field = this.#fields.get(fieldName);

        return field ? field.searchable : false;

    }

    /**
     * Check if a field is sortable.
     *
     * @param {string} fieldName
     * @returns {boolean}
     */
    isSortable(fieldName) {

        const field = this.#fields.get(fieldName);

        return field ? field.sortable : false;

    }

    /**
     * Check if the member matches a search query.
     *
     * Searches only searchable fields (opt-in with data-searchable="true").
     * Uses "includes" matching (case-insensitive).
     *
     * @param {string} query - The search query
     * @returns {boolean} True if the query matches any searchable field
     */
    matches(query) {

        const normalizedQuery = this.#normalize(query);

        if (!normalizedQuery) {
            return true;
        }

        for (const [fieldName, field] of this.#fields) {
            if (!field.searchable) {
                continue;
            }
            if (field.normalized.includes(normalizedQuery)) {
                return true;
            }
        }

        return false;

    }

    /**
     * Get all field data as a plain object.
     *
     * Useful for debugging and serialization.
     */
    toObject() {

        const result = {};

        for (const [fieldName, field] of this.#fields) {
            result[fieldName] = field.raw;
        }

        return result;

    }

}
