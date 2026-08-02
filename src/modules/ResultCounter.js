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

    /**
     * Create a ResultCounter instance.
     *
     * @param {HTMLElement} container - The [data-results] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     */
    constructor(container, memberCollection, store) {

        if (!container) {
            throw new Error('ResultCounter requires a container element');
        }

        if (!memberCollection) {
            throw new Error('ResultCounter requires a MemberCollection');
        }

        if (!store) {
            throw new Error('ResultCounter requires a Store');
        }

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;

        // Initial render
        this.render();

        // Listen for filter changes
        document.addEventListener('atlas:filtersChanged', () => {
            this.render();
        });

    }

    /**
     * Render the result counter.
     */
    render() {

        const total = this.#memberCollection.size;
        const filters = this.#store.filters;
        const activeFields = Object.keys(filters);

        let visible = total;

        if (activeFields.length > 0) {
            const filtered = this.#memberCollection.applyFilters(filters);
            visible = filtered.length;
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