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
 * - Accessibility: ARIA attributes, keyboard navigation
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
    #events;

    /**
     * Create a SortGenerator.
     *
     * @param {HTMLElement} container - The [data-sort] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     * @param {EventBus} events - The EventBus instance
     */
    constructor(container, memberCollection, store, events) {

        if (!container) {
            throw new Error('SortGenerator requires a container element');
        }

        if (!memberCollection) {
            throw new Error('SortGenerator requires a MemberCollection');
        }

        if (!store) {
            throw new Error('SortGenerator requires a Store');
        }

        if (!events) {
            throw new Error('SortGenerator requires an EventBus');
        }

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        // Set ARIA role for the container
        this.#container.setAttribute('role', 'toolbar');
        this.#container.setAttribute('aria-label', 'Sort controls');

        this.#generate();

        // Listen for sort state changes
        this.#events.subscribe('store:sortChanged', () => {
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
        button.setAttribute('role', 'button');
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `Sort by ${fieldName}`);

        // Format the label: "primary-residence" → "Primary Residence"
        const label = fieldName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        button.textContent = label;

        button.addEventListener('click', () => {
            this.#handleSortClick(fieldName);
        });

        // Keyboard support for Enter/Space
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.#handleSortClick(fieldName);
            }
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

        // Store publishes the event automatically via setSort

        // Update UI
        this.#updateUI();

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
            button.setAttribute('aria-pressed', 'false');

            // Remove any existing arrow text
            const originalText = button.textContent.replace(/[↑↓]/g, '').trim();
            button.textContent = originalText;

            // Reset aria-label
            button.setAttribute('aria-label', `Sort by ${field}`);

            // If this is the active sort field
            if (currentSort && currentSort.field === field) {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');

                if (currentSort.direction === 'asc') {
                    button.classList.add('asc');
                    button.textContent += ' ↑';
                    button.setAttribute('aria-label', `Sort by ${field} (ascending)`);
                } else if (currentSort.direction === 'desc') {
                    button.classList.add('desc');
                    button.textContent += ' ↓';
                    button.setAttribute('aria-label', `Sort by ${field} (descending)`);
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