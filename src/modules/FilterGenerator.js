/**
 * FilterGenerator
 *
 * Generates filter interfaces from MemberCollection data.
 *
 * Responsibilities:
 * - Discover filterable fields from MemberCollection
 * - Generate filter UI for each field
 * - Support display options: buttons (default), dropdowns, checkboxes, radio
 * - Display order is controlled by attribute order and field listing order
 * - Insert generated UI into the [data-filters] container
 * - Handle filter selection events
 * - Update Store when filters change
 * - Accessibility: ARIA attributes, keyboard navigation
 * - Case-insensitive: Groups values by normalized (lowercase) form
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
    #events;
    #fieldFilterMap = new Map();
    #displayOptions = {
        radio: [],
        checkboxes: [],
        buttons: [],
        dropdown: []
    };
    #displayTypeOrder = [];

    /**
     * Create a FilterGenerator.
     *
     * @param {HTMLElement} container - The [data-filters] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     * @param {EventBus} events - The EventBus instance
     */
    constructor(container, memberCollection, store, events) {

        if (!container) {
            throw new Error('FilterGenerator requires a container element');
        }

        if (!memberCollection) {
            throw new Error('FilterGenerator requires a MemberCollection');
        }

        if (!store) {
            throw new Error('FilterGenerator requires a Store');
        }

        if (!events) {
            throw new Error('FilterGenerator requires an EventBus');
        }

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        // ─── Read display options from container ──────

        this.#readDisplayOptions();

        // ─── Generate filters ──────────────────────────

        this.#generate();

        // ─── Subscribe to events ────────────────────────

        this.#events.subscribe('store:filtersChanged', () => {
            this.syncWithStore();
        });

    }

    /**
     * Read display options from the container attributes.
     *
     * The order of attributes determines display order:
     * - data-filter-radio (first in order)
     * - data-filter-checkboxes (second in order)
     * - data-filter-buttons (third in order)
     * - data-filter-dropdown (fourth in order)
     *
     * Within each attribute, the order of fields determines their order.
     */
    #readDisplayOptions() {

        const parseList = (attr) => {
            if (attr && attr.trim()) {
                return attr.split(',').map(s => s.trim()).filter(s => s);
            }
            return [];
        };

        // Parse each attribute
        const radio = parseList(this.#container.dataset.filterRadio);
        const checkboxes = parseList(this.#container.dataset.filterCheckboxes);
        const buttons = parseList(this.#container.dataset.filterButtons);
        const dropdown = parseList(this.#container.dataset.filterDropdown);

        // Store display options
        this.#displayOptions = { radio, checkboxes, buttons, dropdown };

        // Build display type order based on which attributes are present
        this.#displayTypeOrder = [];

        if (radio.length > 0) {
            this.#displayTypeOrder.push('radio');
        }
        if (checkboxes.length > 0) {
            this.#displayTypeOrder.push('checkboxes');
        }
        if (buttons.length > 0) {
            this.#displayTypeOrder.push('buttons');
        }
        if (dropdown.length > 0) {
            this.#displayTypeOrder.push('dropdown');
        }

    }

    /**
     * Determine the display type for a field.
     */
    #getDisplayType(fieldName) {

        if (this.#displayOptions.radio.includes(fieldName)) {
            return 'radio';
        }

        if (this.#displayOptions.checkboxes.includes(fieldName)) {
            return 'checkboxes';
        }

        if (this.#displayOptions.buttons.includes(fieldName)) {
            return 'buttons';
        }

        if (this.#displayOptions.dropdown.includes(fieldName)) {
            return 'dropdown';
        }

        return 'buttons'; // default

    }

    /**
     * Get the display order for all filterable fields.
     * Returns an array of { fieldName, displayType } in display order.
     */
    #getDisplayOrder(filterableFields) {

        const orderedFields = [];
        const processedFields = new Set();

        // 1. Process each display type in attribute order
        for (const type of this.#displayTypeOrder) {
            const fields = this.#displayOptions[type] || [];
            for (const field of fields) {
                if (filterableFields.includes(field) && !processedFields.has(field)) {
                    orderedFields.push({ field, type });
                    processedFields.add(field);
                }
            }
        }

        // 2. Add remaining fields (not specified) as buttons in DOM order
        for (const field of filterableFields) {
            if (!processedFields.has(field)) {
                orderedFields.push({ field, type: 'buttons' });
                processedFields.add(field);
            }
        }

        return orderedFields;

    }

    /**
     * Generate filter interfaces for all filterable fields.
     */
    #generate() {

        console.debug('FilterGenerator: Generating filters...');

        // Clear the container
        this.#container.innerHTML = '';

        const filterableFields = this.#memberCollection.getFilterableFields();

        if (filterableFields.length === 0) {
            this.#container.innerHTML = '<p>No filterable fields found.</p>';
            return;
        }

        // Get the display order
        const displayOrder = this.#getDisplayOrder(filterableFields);

        // Generate filters in the correct order
        for (const { field, type } of displayOrder) {
            this.#createFilterForField(field, type);
        }

        // Apply existing filter state to the UI
        this.syncWithStore();

    }

    /**
     * Create a filter interface for a specific field with a specific display type.
     */
    #createFilterForField(fieldName, displayType) {

        // Get unique raw values (preserving original casing)
        const rawValues = this.#memberCollection.getUniqueValues(fieldName);

        // Skip fields with no values
        if (rawValues.length === 0) {
            return;
        }

        // Build a map of normalized → raw (using the first occurrence)
        const displayMap = new Map();
        const allMembers = this.#memberCollection.getAll();

        for (const member of allMembers) {
            const raw = member.get(fieldName);
            if (raw && raw.trim()) {
                const normalized = raw.toLowerCase().trim();
                if (!displayMap.has(normalized)) {
                    displayMap.set(normalized, raw);
                }
            }
        }

        // Get sorted list of normalized keys
        const sortedKeys = Array.from(displayMap.keys()).sort((a, b) => a.localeCompare(b));

        // If no values after normalisation, skip
        if (sortedKeys.length === 0) {
            return;
        }

        // Create filter group container
        const group = document.createElement('div');
        group.dataset.filter = '';
        group.dataset.field = fieldName;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', `Filter by ${fieldName}`);

        // Create label
        const label = document.createElement('label');
        label.textContent = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        group.appendChild(label);

        // Create appropriate UI based on display type
        switch (displayType) {
            case 'dropdown':
                this.#createDropdownFilter(fieldName, group, displayMap, sortedKeys);
                break;
            case 'checkboxes':
                this.#createCheckboxFilter(fieldName, group, displayMap, sortedKeys);
                break;
            case 'radio':
                this.#createRadioFilter(fieldName, group, displayMap, sortedKeys);
                break;
            default:
                this.#createButtonFilter(fieldName, group, displayMap, sortedKeys);
                break;
        }

        this.#container.appendChild(group);

    }

    /**
     * Create a button-based filter (default).
     */
    #createButtonFilter(fieldName, group, displayMap, sortedKeys) {

        const optionsContainer = document.createElement('div');
        optionsContainer.dataset.filterOptions = '';
        optionsContainer.setAttribute('role', 'toolbar');
        optionsContainer.setAttribute('aria-label', `${fieldName} filter options`);

        // Create "All" button (always first)
        const allButton = document.createElement('button');
        allButton.dataset.value = 'all';
        allButton.textContent = 'All';
        allButton.type = 'button';
        allButton.classList.add('active');
        allButton.setAttribute('role', 'button');
        allButton.setAttribute('aria-pressed', 'true');
        allButton.setAttribute('aria-label', `Show all ${fieldName} values`);
        optionsContainer.appendChild(allButton);

        // Create buttons for each unique value
        const valueButtons = [];

        for (const normalizedKey of sortedKeys) {
            const displayValue = displayMap.get(normalizedKey);
            const button = document.createElement('button');
            button.dataset.value = normalizedKey;
            button.textContent = displayValue;
            button.type = 'button';
            button.setAttribute('role', 'button');
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', `Filter by ${fieldName}: ${displayValue}`);
            valueButtons.push(button);
            optionsContainer.appendChild(button);
        }

        group.appendChild(optionsContainer);

        // Store references
        this.#fieldFilterMap.set(fieldName, {
            container: group,
            allButton: allButton,
            valueButtons: valueButtons,
            type: 'buttons',
            displayMap: displayMap
        });

        // Attach events
        this.#attachButtonEvents(fieldName, allButton, valueButtons);

    }

    /**
     * Create a dropdown filter.
     */
    #createDropdownFilter(fieldName, group, displayMap, sortedKeys) {

        const select = document.createElement('select');
        select.dataset.filterSelect = '';
        select.setAttribute('aria-label', `Filter by ${fieldName}`);

        // All option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Show All';
        select.appendChild(allOption);

        // Value options
        for (const normalizedKey of sortedKeys) {
            const displayValue = displayMap.get(normalizedKey);
            const option = document.createElement('option');
            option.value = normalizedKey;
            option.textContent = displayValue;
            select.appendChild(option);
        }

        group.appendChild(select);

        // Event listener
        select.addEventListener('change', () => {
            const value = select.value;
            if (value === 'all') {
                this.#store.clearFieldFilters(fieldName);
            } else {
                this.#store.clearFieldFilters(fieldName);
                this.#store.toggleFilter(fieldName, value);
            }
        });

        // Store reference
        this.#fieldFilterMap.set(fieldName, {
            container: group,
            element: select,
            type: 'dropdown',
            displayMap: displayMap
        });

    }

    /**
     * Create a checkbox filter (multi-select).
     */
    #createCheckboxFilter(fieldName, group, displayMap, sortedKeys) {

        const optionsContainer = document.createElement('div');
        optionsContainer.dataset.filterOptions = '';
        optionsContainer.setAttribute('role', 'group');
        optionsContainer.setAttribute('aria-label', `${fieldName} filter options`);

        // All checkbox
        const allWrapper = document.createElement('div');
        allWrapper.className = 'filter-option';
        const allCheckbox = document.createElement('input');
        allCheckbox.type = 'checkbox';
        allCheckbox.id = `${fieldName}-filter-all`;
        allCheckbox.checked = true;
        allCheckbox.value = 'all';
        allCheckbox.setAttribute('aria-label', `Show all ${fieldName} values`);
        const allLabel = document.createElement('label');
        allLabel.htmlFor = `${fieldName}-filter-all`;
        allLabel.textContent = 'Show All';
        allWrapper.appendChild(allCheckbox);
        allWrapper.appendChild(allLabel);
        optionsContainer.appendChild(allWrapper);

        // Value checkboxes
        const valueCheckboxes = [];

        for (const normalizedKey of sortedKeys) {
            const displayValue = displayMap.get(normalizedKey);
            const wrapper = document.createElement('div');
            wrapper.className = 'filter-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${fieldName}-filter-${normalizedKey.replace(/[^a-z0-9]/g, '')}`;
            checkbox.value = normalizedKey;
            checkbox.setAttribute('aria-label', `Filter by ${fieldName}: ${displayValue}`);
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = displayValue;
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            optionsContainer.appendChild(wrapper);
            valueCheckboxes.push(checkbox);

            // Event listener for individual checkboxes
            checkbox.addEventListener('change', () => {
                // Uncheck "All" if any value is checked/unchecked
                allCheckbox.checked = false;

                // Check if any values are selected
                const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked:not([value="all"])');
                if (checkedBoxes.length === 0) {
                    // If nothing is checked, check "All"
                    allCheckbox.checked = true;
                    this.#store.clearFieldFilters(fieldName);
                } else {
                    // Apply selected filters
                    this.#store.clearFieldFilters(fieldName);
                    for (const cb of checkedBoxes) {
                        this.#store.toggleFilter(fieldName, cb.value);
                    }
                }
            });
        }

        // "All" checkbox event
        allCheckbox.addEventListener('change', () => {
            if (allCheckbox.checked) {
                // Uncheck all value checkboxes
                for (const cb of valueCheckboxes) {
                    cb.checked = false;
                }
                this.#store.clearFieldFilters(fieldName);
            }
        });

        group.appendChild(optionsContainer);

        // Store reference
        this.#fieldFilterMap.set(fieldName, {
            container: group,
            element: optionsContainer,
            type: 'checkboxes',
            displayMap: displayMap,
            allCheckbox: allCheckbox,
            valueCheckboxes: valueCheckboxes
        });

    }

    /**
     * Create a radio button filter (single-select).
     */
    #createRadioFilter(fieldName, group, displayMap, sortedKeys) {

        const optionsContainer = document.createElement('div');
        optionsContainer.dataset.filterOptions = '';
        optionsContainer.setAttribute('role', 'radiogroup');
        optionsContainer.setAttribute('aria-label', `${fieldName} filter options`);

        // All radio
        const allWrapper = document.createElement('div');
        allWrapper.className = 'filter-option';
        const allRadio = document.createElement('input');
        allRadio.type = 'radio';
        allRadio.name = `${fieldName}-filter`;
        allRadio.id = `${fieldName}-filter-all`;
        allRadio.checked = true;
        allRadio.value = 'all';
        allRadio.setAttribute('aria-label', `Show all ${fieldName} values`);
        const allLabel = document.createElement('label');
        allLabel.htmlFor = `${fieldName}-filter-all`;
        allLabel.textContent = 'Show All';
        allWrapper.appendChild(allRadio);
        allWrapper.appendChild(allLabel);
        optionsContainer.appendChild(allWrapper);

        // Value radios
        for (const normalizedKey of sortedKeys) {
            const displayValue = displayMap.get(normalizedKey);
            const wrapper = document.createElement('div');
            wrapper.className = 'filter-option';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `${fieldName}-filter`;
            radio.id = `${fieldName}-filter-${normalizedKey.replace(/[^a-z0-9]/g, '')}`;
            radio.value = normalizedKey;
            radio.setAttribute('aria-label', `Filter by ${fieldName}: ${displayValue}`);
            const label = document.createElement('label');
            label.htmlFor = radio.id;
            label.textContent = displayValue;
            wrapper.appendChild(radio);
            wrapper.appendChild(label);
            optionsContainer.appendChild(wrapper);

            // Event listener
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.#store.clearFieldFilters(fieldName);
                    this.#store.toggleFilter(fieldName, radio.value);
                }
            });
        }

        group.appendChild(optionsContainer);

        // Store reference
        this.#fieldFilterMap.set(fieldName, {
            container: group,
            element: optionsContainer,
            type: 'radio',
            displayMap: displayMap
        });

    }

    /**
     * Attach events to button-based filters.
     */
    #attachButtonEvents(fieldName, allButton, valueButtons) {

        // "All" button clears all filters for this field
        allButton.addEventListener('click', () => {
            this.#handleAllClick(fieldName);
        });

        // Keyboard support for Enter/Space on "All" button
        allButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.#handleAllClick(fieldName);
            }
        });

        // Value buttons
        for (const button of valueButtons) {
            button.addEventListener('click', () => {
                const value = button.dataset.value;
                this.#handleValueSelect(fieldName, value);
            });

            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const value = button.dataset.value;
                    this.#handleValueSelect(fieldName, value);
                }
            });
        }

    }

    /**
     * Handle "All" button click.
     */
    #handleAllClick(fieldName) {

        this.#store.clearFieldFilters(fieldName);

        const fieldData = this.#fieldFilterMap.get(fieldName);
        if (fieldData && fieldData.type === 'buttons' && fieldData.valueButtons) {
            for (const button of fieldData.valueButtons) {
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            }
            fieldData.allButton.classList.add('active');
            fieldData.allButton.setAttribute('aria-pressed', 'true');
            fieldData.allButton.focus();
        }

    }

    /**
     * Handle a value button click.
     */
    #handleValueSelect(fieldName, value) {

        if (this.#store.isFilterActive(fieldName, value)) {
            return;
        }

        this.#store.toggleFilter(fieldName, value);

        // Update the "All" button state for this field
        this.#updateAllButtonState(fieldName);

    }

    /**
     * Update the "All" button state for a field.
     */
    #updateAllButtonState(fieldName) {

        const fieldData = this.#fieldFilterMap.get(fieldName);

        if (!fieldData || fieldData.type !== 'buttons') {
            return;
        }

        const hasActiveFilters = this.#store.hasFieldFilters(fieldName);

        if (hasActiveFilters) {
            fieldData.allButton.classList.remove('active');
            fieldData.allButton.setAttribute('aria-pressed', 'false');
        } else {
            fieldData.allButton.classList.add('active');
            fieldData.allButton.setAttribute('aria-pressed', 'true');
        }

    }

    /**
     * Synchronize the UI with the current Store state.
     */
    syncWithStore() {

        const filters = this.#store.filters;

        for (const [fieldName, fieldData] of this.#fieldFilterMap) {

            const activeValues = filters[fieldName] || [];

            switch (fieldData.type) {

                case 'buttons':
                    for (const button of fieldData.valueButtons) {
                        button.classList.remove('active');
                        button.setAttribute('aria-pressed', 'false');
                    }
                    for (const button of fieldData.valueButtons) {
                        if (activeValues.includes(button.dataset.value)) {
                            button.classList.add('active');
                            button.setAttribute('aria-pressed', 'true');
                        }
                    }
                    this.#updateAllButtonState(fieldName);
                    break;

                case 'dropdown':
                    if (activeValues.length > 0) {
                        fieldData.element.value = activeValues[0];
                    } else {
                        fieldData.element.value = 'all';
                    }
                    break;

                case 'checkboxes':
                    for (const cb of fieldData.valueCheckboxes) {
                        cb.checked = activeValues.includes(cb.value);
                    }
                    fieldData.allCheckbox.checked = activeValues.length === 0;
                    break;

                case 'radio':
                    const radios = fieldData.element.querySelectorAll('input[type="radio"]');
                    for (const radio of radios) {
                        if (radio.value === 'all') {
                            radio.checked = activeValues.length === 0;
                        } else {
                            radio.checked = activeValues.includes(radio.value);
                        }
                    }
                    break;

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
     * Get the field filter map.
     */
    get fieldFilterMap() {
        return this.#fieldFilterMap;
    }

    /**
     * Refresh the filter UI.
     */
    refresh() {
        this.#generate();
    }

}