/**
 * FilterChips
 *
 * Displays active filters as removable chips.
 *
 * Responsibilities:
 * - Generate chips for active filters
 * - Remove individual filters when chip is clicked
 * - Provide "Clear All" button
 * - Update Store when chips are removed
 *
 * Deliberately does NOT:
 * - Manage application state (delegates to Store)
 * - Apply filters (delegates to Atlas)
 * - Style the chips (CSS owns presentation)
 */

export default class FilterChips {

    #container;
    #store;
    #fieldFilterMap;
    #events;

    /**
     * Create a FilterChips instance.
     *
     * @param {HTMLElement} container - The [data-chips] container
     * @param {Store} store - The application store
     * @param {Map} fieldFilterMap - Map of fieldName → { allButton, valueButtons, container }
     * @param {EventBus} events - The EventBus instance
     */
    constructor(container, store, fieldFilterMap, events) {

        if (!container) {
            throw new Error('FilterChips requires a container element');
        }

        if (!store) {
            throw new Error('FilterChips requires a Store');
        }

        if (!fieldFilterMap) {
            throw new Error('FilterChips requires a fieldFilterMap');
        }

        if (!events) {
            throw new Error('FilterChips requires an EventBus');
        }

        this.#container = container;
        this.#store = store;
        this.#fieldFilterMap = fieldFilterMap;
        this.#events = events;

        // Initial render
        this.render();

        // Listen for filter changes
        this.#events.subscribe('store:filtersChanged', () => {
            this.render();
        });

    }

    /**
     * Get the display label for a field.
     */
    #getFieldLabel(fieldName) {
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }

    /**
     * Render the chips and clear all button.
     */
    render() {

        // Clear the container
        this.#container.innerHTML = '';

        const filters = this.#store.filters;

        // Filter out any fields with empty arrays
        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        // If no active filters, show a message and return (no Clear All button)
        if (activeFields.length === 0) {
            const message = document.createElement('span');
            message.className = 'atlas-chips-empty';
            message.textContent = 'No active filters';
            this.#container.appendChild(message);
            return;
        }

        // Create chips for each active filter (sorted alphabetically by field name)
        const sortedFieldNames = activeFields.sort();
        for (const fieldName of sortedFieldNames) {

            const values = filters[fieldName];
            const fieldInfo = this.#fieldFilterMap.get(fieldName);

            if (!fieldInfo) {
                continue;
            }

            for (const value of values) {

                const chip = document.createElement('span');
                chip.className = 'atlas-chip';
                chip.dataset.field = fieldName;
                chip.dataset.value = value;

                // Chip text: show field name + value
                const text = document.createElement('span');
                text.className = 'atlas-chip-text';
                const displayLabel = this.#getFieldLabel(fieldName);
                text.textContent = `${displayLabel}: ${value}`;
                chip.appendChild(text);

                // Remove button (×)
                const removeBtn = document.createElement('button');
                removeBtn.className = 'atlas-chip-remove';
                removeBtn.textContent = '×';
                removeBtn.type = 'button';
                removeBtn.setAttribute('aria-label', `Remove ${value} filter`);

                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.#removeFilter(fieldName, value);
                });

                chip.appendChild(removeBtn);
                this.#container.appendChild(chip);

            }

        }

        // "Clear All" button (only when there are active filters)
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'atlas-clear-all';
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.type = 'button';

        clearAllBtn.addEventListener('click', () => {
            this.#clearAllFilters();
        });

        this.#container.appendChild(clearAllBtn);

    }

    /**
     * Remove a single filter value.
     * 
     * Uses Store.toggleFilter() which properly publishes events.
     */
    #removeFilter(fieldName, value) {

        // Check if the value is active
        const isActive = this.#store.isFilterActive(fieldName, value);
        
        if (isActive) {
            // This will remove the value and publish a 'store:filtersChanged' event
            this.#store.toggleFilter(fieldName, value);
            
            // Update the "All" button state for this field
            this.#updateFilterGeneratorUI(fieldName);
            
            // Re-render chips (the event listener will also trigger this,
            // but we do it explicitly to ensure immediate UI update)
            this.render();
        }

    }

    /**
     * Clear all filters.
     */
    #clearAllFilters() {

        // Store publishes the event automatically
        this.#store.clearAllFilters();

        // Update all filter generator UIs
        for (const [fieldName] of this.#fieldFilterMap) {
            this.#updateFilterGeneratorUI(fieldName);
        }

        // Re-render chips (this will show "No active filters")
        this.render();

    }

    /**
     * Update the FilterGenerator UI for a field.
     *
     * This ensures the "All" button and value buttons stay in sync
     * when filters are removed via chips.
     */
    #updateFilterGeneratorUI(fieldName) {

        const fieldInfo = this.#fieldFilterMap.get(fieldName);

        if (!fieldInfo) {
            return;
        }

        // Find the all button in the FilterGenerator's DOM
        const allButton = fieldInfo.allButton;

        if (allButton) {
            const hasActiveFilters = this.#store.hasFieldFilters(fieldName);
            if (hasActiveFilters) {
                allButton.classList.remove('active');
            } else {
                allButton.classList.add('active');
            }
        }

        // Update value buttons
        const activeValues = this.#store.filters[fieldName] || [];
        for (const button of fieldInfo.valueButtons) {
            if (activeValues.includes(button.dataset.value)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }

    }

    /**
     * Get the container element.
     */
    get container() {
        return this.#container;
    }

}