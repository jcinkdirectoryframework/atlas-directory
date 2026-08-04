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
 * - Publish events when state changes
 * - Cache filter results for performance
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

    #events = null;

    // ─── Filter Cache ──────────────────────────────────

    #filterCache = new Map();

    /**
     * Create a Store.
     *
     * @param {Object} options
     * @param {EventBus} options.events - The EventBus instance for publishing events
     * @param {Object} options.initialState - Optional initial state
     */
    constructor(options = {}) {

        this.#events = options.events || null;

        if (options.initialState) {
            this.#state = { ...this.#state, ...options.initialState };
        }

    }

    /**
     * Publish an event if EventBus is available.
     */
    #publish(event, data) {

        if (this.#events) {
            this.#events.publish(event, data);
        }

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

        let isActive;

        if (index === -1) {
            // Add the value
            values.push(value);
            isActive = true;
        } else {
            // Remove the value
            values.splice(index, 1);
            // Clean up empty arrays
            if (values.length === 0) {
                delete this.#state.filters[fieldName];
            }
            isActive = false;
        }

        // Clear filter cache when filters change
        this.#filterCache.clear();

        // Publish event
        this.#publish('store:filtersChanged', {
            filters: this.filters,
            field: fieldName,
            value: value,
            active: isActive
        });

        return isActive;

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

        // Clear filter cache when filters change
        this.#filterCache.clear();

        this.#publish('store:filtersChanged', {
            filters: this.filters,
            field: fieldName,
            action: 'clearField'
        });
    }

    /**
     * Clear all filters.
     */
    clearAllFilters() {
        this.#state.filters = {};

        // Clear filter cache when filters change
        this.#filterCache.clear();

        this.#publish('store:filtersChanged', {
            filters: this.filters,
            action: 'clearAll'
        });
    }

    /**
     * Get the current search query.
     */
    get search() {
        return this.#state.search;
    }

    /**
     * Set the search query.
     *
     * @param {string} query - The search query
     */
    setSearch(query) {
        const trimmed = query.trim();
        if (this.#state.search === trimmed) {
            return; // No change
        }
        this.#state.search = trimmed;

        // Clear filter cache when search changes (results will be different)
        this.#filterCache.clear();

        this.#publish('store:searchChanged', {
            search: this.#state.search
        });
    }

    /**
     * Get the current sort configuration.
     */
    get sort() {
        return this.#state.sort ? { ...this.#state.sort } : null;
    }

    /**
     * Set the sort configuration.
     *
     * @param {string|null} field - The field to sort by, or null to clear
     * @param {string|null} direction - 'asc' or 'desc', or null to clear
     */
    setSort(field, direction = 'asc') {
        let newSort = null;

        if (field && direction) {
            newSort = { field, direction };
        }

        // Check if anything changed
        const currentSort = this.#state.sort;
        const hasChanged = JSON.stringify(currentSort) !== JSON.stringify(newSort);

        if (!hasChanged) {
            return; // No change
        }

        this.#state.sort = newSort;

        // Clear filter cache when sort changes (results will be in different order)
        this.#filterCache.clear();

        this.#publish('store:sortChanged', {
            sort: this.sort
        });
    }

    /**
     * Get the current layout.
     */
    get layout() {
        return this.#state.layout;
    }

    /**
     * Set the layout.
     *
     * @param {string} layout - 'grid' or 'list'
     */
    setLayout(layout) {
        if (layout !== 'grid' && layout !== 'list') {
            return;
        }

        if (this.#state.layout === layout) {
            return; // No change
        }

        this.#state.layout = layout;

        this.#publish('store:layoutChanged', {
            layout: this.#state.layout
        });
    }

    /**
     * Get the entire state object.
     */
    getState() {
        return { ...this.#state };
    }

    // ─── Filter Cache Methods ──────────────────────────

    /**
     * Generate a cache key from current filters.
     * Used to detect if filters have changed.
     */
    #getFilterCacheKey() {
        const filters = this.#state.filters;
        // Sort fields for consistent keys
        const sortedFields = Object.keys(filters).sort();
        let key = '';
        for (const field of sortedFields) {
            const values = filters[field];
            if (values && values.length > 0) {
                key += field + ':' + [...values].sort().join(',') + '|';
            }
        }
        return key || 'none';
    }

    /**
     * Get cached filter results for a MemberCollection.
     * Returns null if no cache hit.
     */
    getCachedFilterResults(memberCollection) {
        const key = this.#getFilterCacheKey();

        // If no filters are active, return null (don't cache "all members")
        if (key === 'none') {
            return null;
        }

        const cached = this.#filterCache.get(key);
        if (cached) {
            // Verify the cache is still valid (MemberCollection hasn't changed)
            // We store a simple hash of the member count and first/last IDs
            const members = memberCollection.getAll();
            const memberIds = members.map(m => m.id).join(',');
            if (cached.memberIds === memberIds) {
                return cached.results;
            }
            // Invalid cache, clear it
            this.#filterCache.delete(key);
        }
        return null;
    }

    /**
     * Cache filter results for a MemberCollection.
     */
    setCachedFilterResults(memberCollection, results) {
        const key = this.#getFilterCacheKey();

        // Don't cache empty results
        if (key === 'none' || results.length === 0) {
            return;
        }

        const members = memberCollection.getAll();
        const memberIds = members.map(m => m.id).join(',');

        this.#filterCache.set(key, {
            results: results,
            memberIds: memberIds,
            timestamp: Date.now()
        });

        // Limit cache size to prevent memory leaks (max 20 entries)
        if (this.#filterCache.size > 20) {
            // Remove oldest entry
            let oldest = null;
            let oldestTime = Infinity;
            for (const [k, v] of this.#filterCache) {
                if (v.timestamp < oldestTime) {
                    oldestTime = v.timestamp;
                    oldest = k;
                }
            }
            if (oldest) {
                this.#filterCache.delete(oldest);
            }
        }
    }

    /**
     * Clear the filter cache.
     */
    clearFilterCache() {
        this.#filterCache.clear();
    }

}