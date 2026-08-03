/**
 * Renderer
 *
 * Manages DOM updates for Atlas based on Store state.
 *
 * Responsibilities:
 * - Update member visibility based on filter/search state
 * - Reorder members based on sort state
 * - Batch DOM updates for performance
 * - Handle loading state (flicker prevention)
 * - No business logic — only DOM operations
 *
 * Deliberately does NOT:
 * - Know about filters, search, or sort logic
 * - Manage state
 * - Generate UI
 * - Apply business rules
 */

export default class Renderer {

    #registry = null;
    #memberCollection = null;
    #store = null;
    #events = null;
    #filteredMembers = null;

    /**
     * Create a Renderer.
     *
     * @param {Object} dependencies
     * @param {Registry} dependencies.registry - The Registry instance
     * @param {MemberCollection} dependencies.memberCollection - The MemberCollection instance
     * @param {Store} dependencies.store - The Store instance
     * @param {EventBus} dependencies.events - The EventBus instance
     */
    constructor({ registry, memberCollection, store, events }) {

        if (!registry) {
            throw new Error('Renderer requires a Registry');
        }

        if (!memberCollection) {
            throw new Error('Renderer requires a MemberCollection');
        }

        if (!store) {
            throw new Error('Renderer requires a Store');
        }

        if (!events) {
            throw new Error('Renderer requires an EventBus');
        }

        this.#registry = registry;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        // Initially, all members are visible
        this.#filteredMembers = memberCollection.getAll();

        // Set up loading state
        this.#setupLoadingState();

        // Subscribe to store events
        this.#subscribeToEvents();

    }

    /**
     * Set up the loading state to prevent flicker.
     */
    #setupLoadingState() {

        const root = this.#registry.root;

        // Add loading attribute
        root.setAttribute('data-atlas-loading', '');

        // After initial render, remove loading state
        requestAnimationFrame(() => {
            // Ensure we're using the latest filtered members
            this.#applyFiltersAndSearch();
            this.render();

            // Remove loading attribute
            root.removeAttribute('data-atlas-loading');
        });

    }

    /**
     * Subscribe to store events.
     */
    #subscribeToEvents() {

        // When filters change
        this.#events.subscribe('store:filtersChanged', () => {
            this.#onStateChange();
        });

        // When search changes
        this.#events.subscribe('store:searchChanged', () => {
            this.#onStateChange();
        });

        // When sort changes
        this.#events.subscribe('store:sortChanged', () => {
            this.#onStateChange();
        });

    }

    /**
     * Handle state changes from the Store.
     */
    #onStateChange() {

        this.#applyFiltersAndSearch();
        this.render();

    }

    /**
     * Apply filters, search, and sort to the member collection.
     *
     * This is the business logic layer — it determines which members
     * should be visible and in what order.
     */
    #applyFiltersAndSearch() {

        const filters = this.#store.filters;
        const searchQuery = this.#store.search;
        const sort = this.#store.sort;

        // Start with all members
        let filtered = this.#memberCollection.getAll();

        // Apply filters if any are active
        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        if (activeFields.length > 0) {
            filtered = this.#memberCollection.applyFilters(filters);
        }

        // Apply search if query exists
        if (searchQuery && searchQuery.trim()) {
            const searchResults = [];
            for (const member of filtered) {
                if (member.matches(searchQuery)) {
                    searchResults.push(member);
                }
            }
            filtered = searchResults;
        }

        // Apply sort if active
        if (sort && sort.field) {
            filtered = this.#sortMembers(filtered, sort.field, sort.direction);
        }

        this.#filteredMembers = filtered;

    }

    /**
     * Sort an array of members by a field.
     */
    #sortMembers(members, field, direction) {

        const sorted = [...members];

        sorted.sort((a, b) => {
            const valA = a.get(field) || '';
            const valB = b.get(field) || '';

            // Case-insensitive comparison
            const compareResult = valA.localeCompare(valB, undefined, { sensitivity: 'base' });

            return direction === 'asc' ? compareResult : -compareResult;
        });

        return sorted;

    }

    /**
     * Render the current state to the DOM.
     *
     * This is the DOM update layer — it takes the filtered members
     * and updates the DOM efficiently.
     */
    render() {

        // Defensive: ensure filteredMembers is an array
        if (!this.#filteredMembers || !Array.isArray(this.#filteredMembers)) {
            this.#filteredMembers = this.#memberCollection.getAll();
        }

        // Get the filtered members in the correct order
        const members = this.#filteredMembers;
        const visibleIds = new Set(members.map(m => m.id));

        // Get all member elements from the Registry
        const memberElements = this.#registry.members;
        const directory = this.#registry.directory;

        // ----- Step 1: Update visibility -----
        for (const element of memberElements) {
            const member = element._atlasMember;
            if (!member) continue;

            const isVisible = visibleIds.has(member.id);

            if (isVisible) {
                element.hidden = false;
                element.removeAttribute('data-hidden');
            } else {
                element.hidden = true;
                element.setAttribute('data-hidden', 'true');
            }
        }

        // ----- Step 2: Reorder visible members -----
        this.#reorderMembers();

    }

    /**
     * Reorder members in the DOM to match the sorted order.
     *
     * Uses DocumentFragment for batch DOM operations.
     * Preserves hidden members at the end.
     */
    #reorderMembers() {

        const directory = this.#registry.directory;
        const sortedMembers = this.#filteredMembers;

        if (!directory || !sortedMembers) {
            return;
        }

        // Get all current member elements (including hidden ones)
        const currentElements = directory.querySelectorAll('[data-member]');

        // Create a Map of member ID → element for quick lookup
        const elementMap = new Map();
        const visibleIds = new Set(sortedMembers.map(m => m.id));

        for (const element of currentElements) {
            const member = element._atlasMember;
            if (member) {
                elementMap.set(member.id, element);
            }
        }

        // Build the final order: visible (sorted) + hidden (preserved order)
        const finalOrder = [];

        // Add visible members in sorted order
        for (const member of sortedMembers) {
            const element = elementMap.get(member.id);
            if (element) {
                finalOrder.push(element);
            }
        }

        // Add hidden members (preserving their current order)
        for (const element of currentElements) {
            const member = element._atlasMember;
            if (member && !visibleIds.has(member.id)) {
                finalOrder.push(element);
            }
        }

        // ----- Batch DOM update using DocumentFragment -----
        const fragment = document.createDocumentFragment();

        for (const element of finalOrder) {
            fragment.appendChild(element);
        }

        // Clear the directory and append the fragment in one operation
        directory.innerHTML = '';
        directory.appendChild(fragment);

    }

    /**
     * Get the currently filtered members.
     */
    get filteredMembers() {
        return [...this.#filteredMembers];
    }

    /**
     * Get the count of visible members.
     */
    get visibleCount() {
        return this.#filteredMembers ? this.#filteredMembers.length : 0;
    }

    /**
     * Get the total number of members.
     */
    get totalCount() {
        return this.#memberCollection.size;
    }

}