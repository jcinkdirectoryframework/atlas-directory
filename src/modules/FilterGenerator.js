/**
 * FilterGenerator
 *
 * Generates filter interfaces from MemberCollection data.
 *
 * Responsibilities:
 * - Discover filterable fields from MemberCollection
 * - Generate filter UI for each field
 * - Insert generated UI into the [data-filters] container
 * - Handle filter toggle events
 * - Update Store when filters change
 *
 * Deliberately does NOT:
 * - Manage application state (delegates to Store)
 * - Apply filters to members (delegates to MemberCollection)
 * - Style the filter UI (CSS owns presentation)
 * - Know about the DOM structure of members
 */

export default class FilterGenerator {

    #container;
    #memberCollection;
    #store;
    #fieldFilterMap = new Map(); // fieldName → { container, buttons }

    /**
     * Create a FilterGenerator.
     *
     * @param {HTMLElement} container - The [data-filters] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     */
    constructor(container, memberCollection, store) {

        if (!container) {
            throw new Error('FilterGenerator requires a container element');
        }

        if (!memberCollection) {
            throw new Error('FilterGenerator requires a MemberCollection');
        }

        if (!store) {
            throw new Error('FilterGenerator requires a Store');
        }

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;

        this.#generate();

    }

    /**
     * Generate filter interfaces for all filterable fields.
     */
    #generate() {

        // Clear the container
        this.#container.innerHTML = '';

        const filterableFields = this.#memberCollection.getFilterableFields();

        if (filterableFields.length === 0) {
            this.#container.innerHTML = '<p>No filterable fields found.</p>';
            return;
        }

        for (const fieldName of filterableFields) {
            this.#createFilterForField(fieldName);
        }

        // Apply existing filter state to the UI
        this.#syncWithStore();

    }

    /**
     * Create a filter interface for a specific field.
     */
    #createFilterForField(fieldName) {

        const uniqueValues = this.#memberCollection.getUniqueValues(fieldName);

        // Skip fields with no values
        if (uniqueValues.length === 0) {
            return;
        }

        // Create filter group container
        const group = document.createElement('div');
        group.dataset.filter = '';
        group.dataset.field = fieldName;

        // Create label
        const label = document.createElement('label');
        label.textContent = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        group.appendChild(label);

        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.dataset.filterOptions = '';

        // Create buttons for each unique value
        const buttons = [];

        for (const value of uniqueValues) {
            const button = document.createElement('button');
            button.dataset.value = value;
            button.textContent = value;
            button.type = 'button';

            // Store reference to the button
            buttons.push(button);
            optionsContainer.appendChild(button);
        }

        group.appendChild(optionsContainer);
        this.#container.appendChild(group);

        // Store references
        this.#fieldFilterMap.set(fieldName, {
            container: group,
            buttons: buttons
        });

        // Add event listeners
        this.#attachEvents(fieldName, buttons);

    }

    /**
     * Attach click events to filter buttons.
     */
    #attachEvents(fieldName, buttons) {

        for (const button of buttons) {
            button.addEventListener('click', () => {
                const value = button.dataset.value;
                this.#handleFilterToggle(fieldName, value);
            });
        }

    }

    /**
     * Handle a filter toggle event.
     */
    #handleFilterToggle(fieldName, value) {

        // Toggle the filter in the Store
        const isActive = this.#store.toggleFilter(fieldName, value);

        // Update the UI
        this.#updateButtonState(fieldName, value, isActive);

        // Notify Atlas that filters have changed
        // We use a custom event for loose coupling
        const event = new CustomEvent('atlas:filtersChanged', {
            detail: {
                field: fieldName,
                value: value,
                active: isActive,
                filters: this.#store.filters
            }
        });

        document.dispatchEvent(event);

    }

    /**
     * Update the visual state of a filter button.
     */
    #updateButtonState(fieldName, value, isActive) {

        const fieldData = this.#fieldFilterMap.get(fieldName);

        if (!fieldData) {
            return;
        }

        for (const button of fieldData.buttons) {
            if (button.dataset.value === value) {
                if (isActive) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
                break;
            }
        }

    }

    /**
     * Synchronize the UI with the current Store state.
     *
     * Called after generation and after external state changes.
     */
    syncWithStore() {

        const filters = this.#store.filters;

        // Clear all button states first
        for (const [fieldName, fieldData] of this.#fieldFilterMap) {
            for (const button of fieldData.buttons) {
                button.classList.remove('active');
            }
        }

        // Apply active states from the Store
        for (const [fieldName, values] of Object.entries(filters)) {
            const fieldData = this.#fieldFilterMap.get(fieldName);
            if (fieldData) {
                for (const button of fieldData.buttons) {
                    if (values.includes(button.dataset.value)) {
                        button.classList.add('active');
                    }
                }
            }
        }

    }

    /**
     * Synchronize the UI with the current Store state.
     *
     * Public alias for syncWithStore.
     */
    #syncWithStore() {
        this.syncWithStore();
    }

    /**
     * Get the container element.
     */
    get container() {
        return this.#container;
    }

    /**
     * Refresh the filter UI.
     *
     * Useful after member data changes.
     */
    refresh() {
        this.#generate();
    }

}