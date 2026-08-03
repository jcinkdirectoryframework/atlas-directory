/**
 * Store
 *
 * Manages application state for Atlas.
 *
 * Responsibilities:
 * - Store filter state
 * - Store search state
 * - Store sort state
 * - Store layout state
 * - Provide getters and setters
 * - Notify observers of changes (future)
 *
 * Deliberately does NOT:
 * - Know about the DOM
 * - Know about Members
 * - Generate UI
 * - Apply filters directly
 */

export default class Store {

    #state = {
        filters: {},      // { fieldName: [value1, value2], ... }
        search: '',       // current search query
        sort: null,       // { field: 'name', direction: 'asc' }
        layout: 'grid'    // 'grid' or 'list'
    };

    /**
     * Create a Store.
     *
     * @param {Object} initialState - Optional initial state
     */
    constructor(initialState = {}) {
        this.#state = { ...this.#state, ...initialState };
    }

    /**
     * Get the current filter state.
     */
    get filters() {
        return { ...this.#state.filters };
    }

    /**
     * Toggle a filter value.
     *
     * If the value is already active, remove it.
     * If the value is not active, add it.
     *
     * @param {string} fieldName - The field to filter
     * @param {string} value - The value to toggle
     * @returns {boolean} True if the value is now active
     */
    toggleFilter(fieldName, value) {

        if (!this.#state.filters[fieldName]) {
            this.#state.filters[fieldName] = [];
        }

        const values = this.#state.filters[fieldName];
        const index = values.indexOf(value);

        if (index === -1) {
            // Add the value
            values.push(value);
            return true;
        } else {
            // Remove the value
            values.splice(index, 1);
            // Clean up empty arrays
            if (values.length === 0) {
                delete this.#state.filters[fieldName];
            }
            return false;
        }

    }

    /**
     * Check if a filter value is active.
     */
    isFilterActive(fieldName, value) {

        const values = this.#state.filters[fieldName];

        if (!values) {
            return false;
        }

        return values.includes(value);

    }

    /**
     * Check if any filters are active for a field.
     */
    hasFieldFilters(fieldName) {

        const values = this.#state.filters[fieldName];

        return !!(values && values.length > 0);

    }

    /**
     * Clear all filters for a specific field.
     */
    clearFieldFilters(fieldName) {
        delete this.#state.filters[fieldName];
    }

    /**
     * Clear all filters.
     */
    clearAllFilters() {
        this.#state.filters = {};
    }

    /**
     * Get the current search query.
     */
    get search() {
        return this.#state.search;
    }

    /**
     * Set the search query.
     */
    setSearch(query) {
        this.#state.search = query.trim();
    }

    /**
     * Get the current sort configuration.
     */
    get sort() {
        return this.#state.sort ? { ...this.#state.sort } : null;
    }

    /**
     * Set the sort configuration.
     */
    setSort(field, direction = 'asc') {
        if (field && direction) {
            this.#state.sort = { field, direction };
        } else {
            this.#state.sort = null;
        }
    }

    /**
     * Get the current layout.
     */
    get layout() {
        return this.#state.layout;
    }

    /**
     * Set the layout.
     */
    setLayout(layout) {
        if (layout === 'grid' || layout === 'list') {
            this.#state.layout = layout;
        }
    }

    /**
     * Get the entire state object.
     */
    getState() {
        return { ...this.#state };
    }

}