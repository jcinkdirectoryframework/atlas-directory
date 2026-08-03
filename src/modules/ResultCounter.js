/**
 * ResultCounter
 *
 * Displays the number of members shown vs total.
 *
 * Responsibilities:
 * - Show "Showing X of Y members"
 * - Update when filters or search change
 *
 * Deliberately does NOT:
 * - Manage application state (delegates to Store)
 * - Apply filters (delegates to Atlas)
 * - Style the counter (CSS owns presentation)
 */

export default class ResultCounter {

    #container;
    #memberCollection;
    #store;
    #events;

    /**
     * Create a ResultCounter instance.
     *
     * @param {HTMLElement} container - The [data-results] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     * @param {EventBus} events - The EventBus instance
     */
    constructor(container, memberCollection, store, events) {

        if (!container) {
            throw new Error('ResultCounter requires a container element');
        }

        if (!memberCollection) {
            throw new Error('ResultCounter requires a MemberCollection');
        }

        if (!store) {
            throw new Error('ResultCounter requires a Store');
        }

        if (!events) {
            throw new Error('ResultCounter requires an EventBus');
        }

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        // Initial render
        this.render();

        // Listen for state changes
        this.#events.subscribe('store:filtersChanged', () => {
            this.render();
        });

        this.#events.subscribe('store:searchChanged', () => {
            this.render();
        });

        this.#events.subscribe('store:sortChanged', () => {
            this.render();
        });

    }

    /**
     * Render the result counter.
     */
    render() {

        const total = this.#memberCollection.size;
        const filters = this.#store.filters;
        const searchQuery = this.#store.search;
        const hasFilters = Object.keys(filters).length > 0;
        const hasSearch = searchQuery && searchQuery.trim();

        let visible = total;

        if (hasFilters || hasSearch) {
            // Get filtered members (filters + search combined)
            let filtered = this.#memberCollection.getAll();

            if (hasFilters) {
                filtered = this.#memberCollection.applyFilters(filters);
            }

            if (hasSearch) {
                const searchResults = [];
                for (const member of filtered) {
                    if (member.matches(searchQuery)) {
                        searchResults.push(member);
                    }
                }
                filtered = searchResults;
            }

            // If filtered is a MemberCollection, use .size; if it's an array, use .length
            visible = filtered.size !== undefined ? filtered.size : filtered.length;
        }

        // Clear the container
        this.#container.innerHTML = '';

        // Create the counter element
        const counter = document.createElement('span');
        counter.className = 'atlas-result-counter';

        if (visible === total) {
            counter.textContent = `Showing all ${total} members`;
        } else {
            counter.textContent = `Showing ${visible} of ${total} members`;
        }

        this.#container.appendChild(counter);

    }

    /**
     * Get the container element.
     */
    get container() {
        return this.#container;
    }

}