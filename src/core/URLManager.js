/**
 * URLManager
 *
 * Manages URL persistence for Atlas.
 *
 * Responsibilities:
 * - Read filter/search/sort state from URL
 * - Write filter/search/sort state to URL
 * - Use history.pushState() for seamless URL updates
 * - Restore state on page load
 *
 * Deliberately does NOT:
 * - Manage application state (delegates to Store)
 * - Apply filters directly
 * - Know about the DOM
 */

export default class URLManager {

    #store = null;
    #events = null;
    #updateTimeout = null;
    #isRestoring = false;

    /**
     * Create a URLManager.
     *
     * @param {Object} dependencies
     * @param {Store} dependencies.store - The Store instance
     * @param {EventBus} dependencies.events - The EventBus instance
     */
    constructor({ store, events }) {

        if (!store) {
            throw new Error('URLManager requires a Store');
        }

        if (!events) {
            throw new Error('URLManager requires an EventBus');
        }

        this.#store = store;
        this.#events = events;

        // Restore state from URL on initialisation
        this.#restoreFromURL();

        // Subscribe to store events
        this.#subscribeToEvents();

    }

    /**
     * Subscribe to store events.
     */
    #subscribeToEvents() {

        // When filters change, update URL
        this.#events.subscribe('store:filtersChanged', () => {
            this.#updateURL();
        });

        // When search changes, update URL
        this.#events.subscribe('store:searchChanged', () => {
            this.#updateURL();
        });

        // When sort changes, update URL
        this.#events.subscribe('store:sortChanged', () => {
            this.#updateURL();
        });

    }

    /**
     * Read state from URL and apply to Store.
     */
    #restoreFromURL() {

        this.#isRestoring = true;

        const params = new URLSearchParams(window.location.search);

        // ─── Restore filters ────────────────────────────

        // Get all filter params (fields that aren't reserved words)
        const reserved = ['act', 'max_results', 'sort_key', 'sort_order', 'page'];
        const filterParams = {};

        for (const [key, value] of params) {
            if (!reserved.includes(key) && value && value.trim()) {
                // Multiple values for the same field (e.g., species=Human&species=Elf)
                if (filterParams[key]) {
                    if (Array.isArray(filterParams[key])) {
                        filterParams[key].push(value);
                    } else {
                        filterParams[key] = [filterParams[key], value];
                    }
                } else {
                    filterParams[key] = value;
                }
            }
        }

        // Convert single values to arrays for the Store
        const filters = {};
        for (const [field, value] of Object.entries(filterParams)) {
            if (Array.isArray(value)) {
                filters[field] = value;
            } else {
                filters[field] = [value];
            }
        }

        // Apply filters to Store
        if (Object.keys(filters).length > 0) {
            for (const [field, values] of Object.entries(filters)) {
                for (const value of values) {
                    this.#store.toggleFilter(field, value);
                }
            }
        }

        // ─── Restore sort ───────────────────────────────

        const sortKey = params.get('sort_key');
        const sortOrder = params.get('sort_order');

        if (sortKey && sortKey !== 'name') {
            const direction = sortOrder === 'asc' ? 'asc' : 'desc';
            this.#store.setSort(sortKey, direction);
        }

        this.#isRestoring = false;

    }

    /**
     * Update the URL with current state.
     */
    #updateURL() {

        if (this.#isRestoring) {
            return;
        }

        // Debounce URL updates
        if (this.#updateTimeout) {
            clearTimeout(this.#updateTimeout);
        }

        this.#updateTimeout = setTimeout(() => {
            this.#updateTimeout = null;
            this.#doUpdateURL();
        }, 100);

    }

    /**
     * Actually update the URL.
     */
    #doUpdateURL() {

        const params = new URLSearchParams();

        // ─── Add filters ─────────────────────────────────

        const filters = this.#store.filters;

        for (const [field, values] of Object.entries(filters)) {
            if (values && values.length > 0) {
                for (const value of values) {
                    params.append(field, value);
                }
            }
        }

        // ─── Add sort ────────────────────────────────────

        const sort = this.#store.sort;

        if (sort && sort.field) {
            params.set('sort_key', sort.field);
            params.set('sort_order', sort.direction);
        }

        // ─── Preserve existing URL params ───────────────

        // Preserve act=Members and max_results
        const currentParams = new URLSearchParams(window.location.search);
        const preserve = ['act', 'max_results'];

        for (const key of preserve) {
            if (currentParams.has(key)) {
                params.set(key, currentParams.get(key));
            }
        }

        // ─── Build new URL ──────────────────────────────

        const queryString = params.toString();
        const newURL = queryString
            ? window.location.pathname + '?' + queryString + window.location.hash
            : window.location.pathname + window.location.hash;

        // Update URL without reloading
        window.history.pushState({}, '', newURL);

    }

    /**
     * Get a URL parameter value.
     */
    getParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    }

    /**
     * Check if a URL parameter exists.
     */
    hasParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.has(key);
    }

}