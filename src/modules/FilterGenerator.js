/**
 * FilterGenerator
 *
 * Generates filter interfaces from MemberCollection data.
 *
 * Responsibilities:
 * - Discover filterable fields from MemberCollection
 * - Generate filter UI for each field
 * - Insert generated UI into the [data-filters] container
 * - Handle filter selection events
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
    #fieldFilterMap = new Map(); // fieldName → { container, allButton, valueButtons }

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

        console.debug('FilterGenerator: Generating filters...');

        // Clear the container
        this.#container.innerHTML = '';

        const filterableFields = this.#memberCollection.getFilterableFields();

        console.debug('FilterGenerator: filterableFields =', filterableFields);

        if (filterableFields.length === 0) {
            console.debug('FilterGenerator: No filterable fields found');
            this.#container.innerHTML = '<p>No filterable fields found.</p>';
            return;
        }

        for (const fieldName of filterableFields) {
            console.debug(`FilterGenerator: Creating filter for "${fieldName}"`);
            this.#createFilterForField(fieldName);
        }

        console.debug('FilterGenerator: fieldFilterMap size =', this.#fieldFilterMap.size);

        // Apply existing filter state to the UI
        this.syncWithStore();

        console.debug('FilterGenerator: Generation complete');

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

        // Create "All" button (always first)
        const allButton = document.createElement('button');
        allButton.dataset.value = 'all';
        allButton.textContent = 'All';
        allButton.type = 'button';
        allButton.classList.add('active'); // Active by default
        optionsContainer.appendChild(allButton);

        // Create buttons for each unique value
        const valueButtons = [];

        for (const value of uniqueValues) {
            const button = document.createElement('button');
            button.dataset.value = value;
            button.textContent = value;
            button.type = 'button';
            valueButtons.push(button);
            optionsContainer.appendChild(button);
        }

        group.appendChild(optionsContainer);
        this.#container.appendChild(group);

        // Store references (including the "All" button)
        this.#fieldFilterMap.set(fieldName, {
            container: group,
            allButton: allButton,
            valueButtons: valueButtons
        });

        // Add event listeners
        this.#attachEvents(fieldName, allButton, valueButtons);

    }

    /**
     * Attach click events to filter buttons.
     */
    #attachEvents(fieldName, allButton, valueButtons) {

        // "All" button clears all filters for this field
        allButton.addEventListener('click', () => {
            this.#handleAllClick(fieldName);
        });

        // Value buttons select a value (no toggle)
        for (const button of valueButtons) {
            button.addEventListener('click', () => {
                const value = button.dataset.value;
                this.#handleValueSelect(fieldName, value);
            });
        }

    }

    /**
     * Handle "All" button click.
     *
     * Clears all filters for the field and updates the UI.
     */
    #handleAllClick(fieldName) {

        // Clear all filters for this field in the Store
        this.#store.clearFieldFilters(fieldName);

        // Update "All" button state
        this.#updateAllButtonState(fieldName);

        // Reset all value buttons (remove active)
        const fieldData = this.#fieldFilterMap.get(fieldName);
        if (fieldData) {
            for (const button of fieldData.valueButtons) {
                button.classList.remove('active');
            }
        }

        // Dispatch event to notify Atlas
        const event = new CustomEvent('atlas:filtersChanged', {
            detail: {
                field: fieldName,
                action: 'clear',
                filters: this.#store.filters
            }
        });

        document.dispatchEvent(event);

    }

    /**
     * Handle a value button click.
     *
     * Selects the value (adds to filters) without toggling.
     * Does nothing if the value is already active.
     */
    #handleValueSelect(fieldName, value) {

        // Check if the value is already active
        if (this.#store.isFilterActive(fieldName, value)) {
            // Do nothing — value is already selected
            return;
        }

        // Add the value to the Store
        this.#store.toggleFilter(fieldName, value); // This adds it since it's not active

        // Update the UI for this value
        this.#updateButtonState(fieldName, value, true);

        // Update the "All" button state for this field
        this.#updateAllButtonState(fieldName);

        // Dispatch event to notify Atlas
        const event = new CustomEvent('atlas:filtersChanged', {
            detail: {
                field: fieldName,
                value: value,
                action: 'select',
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

        for (const button of fieldData.valueButtons) {
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
     * Update the "All" button state for a field.
     *
     * If any value filters are active, "All" is inactive.
     * If no value filters are active, "All" is active.
     */
    #updateAllButtonState(fieldName) {

        const fieldData = this.#fieldFilterMap.get(fieldName);

        if (!fieldData) {
            return;
        }

        const hasActiveFilters = this.#store.hasFieldFilters(fieldName);

        if (hasActiveFilters) {
            fieldData.allButton.classList.remove('active');
        } else {
            fieldData.allButton.classList.add('active');
        }

    }

    /**
     * Synchronize the UI with the current Store state.
     *
     * Called after generation and after external state changes.
     */
    syncWithStore() {

        console.debug('FilterGenerator: Syncing with Store...');
        console.debug('FilterGenerator: fieldFilterMap size =', this.#fieldFilterMap.size);

        const filters = this.#store.filters;

        console.debug('FilterGenerator: Current filters =', filters);

        // Update all fields
        for (const [fieldName, fieldData] of this.#fieldFilterMap) {

            console.debug(`FilterGenerator: Updating field "${fieldName}"`);

            // Reset all value buttons
            for (const button of fieldData.valueButtons) {
                button.classList.remove('active');
            }

            // Apply active states from the Store
            const activeValues = filters[fieldName] || [];
            for (const button of fieldData.valueButtons) {
                if (activeValues.includes(button.dataset.value)) {
                    button.classList.add('active');
                }
            }

            // Update the "All" button state
            this.#updateAllButtonState(fieldName);

        }

    }

    /**
     * Get the container element.
     */
    get container() {
        return this.#container;
    }

    /**
     * Get the field filter map.
     *
     * Used by FilterChips to access filter DOM elements.
     */
    get fieldFilterMap() {
        return this.#fieldFilterMap;
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