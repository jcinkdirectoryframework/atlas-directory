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
    #fieldFilterMap = new Map(); // fieldName → label

    /**
     * Create a FilterChips instance.
     *
     * @param {HTMLElement} container - The [data-chips] container
     * @param {Store} store - The application store
     * @param {Map} fieldFilterMap - Map of fieldName → { allButton, valueButtons, container }
     */
    constructor(container, store, fieldFilterMap) {

        if (!container) {
            throw new Error('FilterChips requires a container element');
        }

        if (!store) {
            throw new Error('FilterChips requires a Store');
        }

        this.#container = container;
        this.#store = store;
        this.#fieldFilterMap = fieldFilterMap;

        // Build a lookup map for field labels
        for (const [fieldName] of fieldFilterMap) {
            this.#fieldFilterMap.set(fieldName, {
                label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
                container: fieldFilterMap.get(fieldName).container,
                valueButtons: fieldFilterMap.get(fieldName).valueButtons
            });
        }

        // Initial render
        this.render();

        // Listen for filter changes
        document.addEventListener('atlas:filtersChanged', () => {
            this.render();
        });

    }

    /**
     * Render the chips and clear all button.
     */
    render() {

        // Clear the container
        this.#container.innerHTML = '';

        const filters = this.#store.filters;
        const activeFields = Object.keys(filters);

        // If no active filters, show a message or nothing
        if (activeFields.length === 0) {
            const message = document.createElement('span');
            message.className = 'atlas-chips-empty';
            message.textContent = 'No active filters';
            this.#container.appendChild(message);
            return;
        }

        // Create chips for each active filter
        for (const [fieldName, values] of Object.entries(filters)) {

            const fieldInfo = this.#fieldFilterMap.get(fieldName);

            if (!fieldInfo) {
                continue;
            }

            // Create a chip group label
            const groupLabel = document.createElement('span');
            groupLabel.className = 'atlas-chip-group-label';
            groupLabel.textContent = `${fieldInfo.label}:`;
            this.#container.appendChild(groupLabel);

            for (const value of values) {

                const chip = document.createElement('span');
                chip.className = 'atlas-chip';
                chip.dataset.field = fieldName;
                chip.dataset.value = value;

                // Chip text
                const text = document.createElement('span');
                text.className = 'atlas-chip-text';
                text.textContent = value;
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

        // "Clear All" button
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
     */
    #removeFilter(fieldName, value) {

        // Toggle the filter off (removes it from Store)
        const isActive = this.#store.isFilterActive(fieldName, value);

        if (isActive) {
            this.#store.toggleFilter(fieldName, value);
        }

        // Update the "All" button state for this field
        // We need to update the FilterGenerator's UI
        this.#updateFilterGeneratorUI(fieldName);

        // Dispatch event to trigger Atlas update
        const event = new CustomEvent('atlas:filtersChanged', {
            detail: {
                field: fieldName,
                value: value,
                action: 'remove',
                filters: this.#store.filters
            }
        });

        document.dispatchEvent(event);

        // Re-render chips
        this.render();

    }

    /**
     * Clear all filters.
     */
    #clearAllFilters() {

        this.#store.clearAllFilters();

        // Update all filter generator UIs
        for (const [fieldName] of this.#fieldFilterMap) {
            this.#updateFilterGeneratorUI(fieldName);
        }

        // Dispatch event
        const event = new CustomEvent('atlas:filtersChanged', {
            detail: {
                action: 'clearAll',
                filters: this.#store.filters
            }
        });

        document.dispatchEvent(event);

        // Re-render chips
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
        const allButton = fieldInfo.container.querySelector('button[data-value="all"]');

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