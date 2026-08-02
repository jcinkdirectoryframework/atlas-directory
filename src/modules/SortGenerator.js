/**
 * SortGenerator
 *
 * Generates sort controls from MemberCollection data.
 *
 * Responsibilities:
 * - Discover sortable fields from MemberCollection
 * - Generate sort buttons
 * - Insert generated UI into the [data-sort] container
 * - Handle sort click events
 * - Update button UI state (active, asc, desc)
 *
 * Deliberately does NOT:
 * - Manage sort state (delegates to Store)
 * - Apply sort to members (delegates to Atlas)
 * - Style the buttons (CSS owns presentation)
 */

export default class SortGenerator {

    #container;
    #memberCollection;
    #store;

    /**
     * Create a SortGenerator.
     *
     * @param {HTMLElement} container - The [data-sort] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     */
    constructor(container, memberCollection, store) {

        if (!container) {
            throw new Error('SortGenerator requires a container element');
        }

        if (!memberCollection) {
            throw new Error('SortGenerator requires a MemberCollection');
        }

        if (!store) {
            throw new Error('SortGenerator requires a Store');
        }

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;

        this.#generate();

        // Listen for sort state changes (from chips or other sources)
        document.addEventListener('atlas:filtersChanged', () => {
            this.#updateUI();
        });

    }

    /**
     * Generate sort buttons for all sortable fields.
     */
    #generate() {

        // Clear the container
        this.#container.innerHTML = '';

        const sortableFields = this.#memberCollection.getSortableFields();

        if (sortableFields.length === 0) {
            const message = document.createElement('span');
            message.className = 'atlas-sort-empty';
            message.textContent = 'No sortable fields';
            this.#container.appendChild(message);
            return;
        }

        for (const fieldName of sortableFields) {
            this.#createSortButton(fieldName);
        }

        // Apply current sort state to UI
        this.#updateUI();

    }

    /**
     * Create a sort button for a specific field.
     */
    #createSortButton(fieldName) {

        const button = document.createElement('button');
        button.dataset.sort = fieldName;
        button.type = 'button';

        // Format the label: "primary-residence" → "Primary Residence"
        const label = fieldName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        button.textContent = label;

        button.addEventListener('click', () => {
            this.#handleSortClick(fieldName);
        });

        this.#container.appendChild(button);

    }

    /**
     * Handle a sort button click.
     */
    #handleSortClick(field) {

        const currentSort = this.#store.sort;

        // If clicking the same field
        if (currentSort && currentSort.field === field) {
            // Cycle: asc → desc → off
            if (currentSort.direction === 'asc') {
                this.#store.setSort(field, 'desc');
            } else if (currentSort.direction === 'desc') {
                this.#store.setSort(null, null); // Off
            }
        } else {
            // New field: start with asc
            this.#store.setSort(field, 'asc');
        }

        // Update UI
        this.#updateUI();

        // Dispatch event to trigger Atlas update
        const event = new CustomEvent('atlas:sortChanged', {
            detail: {
                sort: this.#store.sort
            }
        });

        document.dispatchEvent(event);

    }

    /**
     * Update the UI to reflect the current sort state.
     */
    #updateUI() {

        const buttons = this.#container.querySelectorAll('[data-sort]');
        const currentSort = this.#store.sort;

        for (const button of buttons) {
            const field = button.dataset.sort;

            // Remove all sort classes
            button.classList.remove('active', 'asc', 'desc');

            // Remove any existing arrow text
            const originalText = button.textContent.replace(/[↑↓]/g, '').trim();
            button.textContent = originalText;

            // If this is the active sort field
            if (currentSort && currentSort.field === field) {
                button.classList.add('active');
                if (currentSort.direction === 'asc') {
                    button.classList.add('asc');
                    button.textContent += ' ↑';
                } else if (currentSort.direction === 'desc') {
                    button.classList.add('desc');
                    button.textContent += ' ↓';
                }
            }
        }

    }

    /**
     * Get the container element.
     */
    get container() {
        return this.#container;
    }

    /**
     * Refresh the sort UI.
     *
     * Useful after member data changes.
     */
    refresh() {
        this.#generate();
    }

}