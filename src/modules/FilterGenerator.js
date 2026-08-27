/**
 * FilterGenerator
 *
 * Generates filter interfaces from MemberCollection data.
 *
 * Responsibilities:
 * - Discover filterable fields from MemberCollection
 * - Generate filter UI for each field
 * - Support display options: buttons (default), dropdowns, checkboxes, radio
 * - Display order is controlled by the order of attributes on the element
 * - Insert generated UI into the [data-filters] container
 * - Handle filter selection events
 * - Update Store when filters change
 * - Accessibility: ARIA attributes, keyboard navigation
 * - Case-insensitive: Groups values by normalized (lowercase) form
 * - Hidden groups: Groups hidden by default with toggle buttons
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
    #hiddenGroupsConfig = {};
    #hiddenGroupVisibility = {};
    #hiddenGroupButtons = {};

    /**
     * Create a FilterGenerator.
     *
     * @param {HTMLElement} container - The [data-filters] container
     * @param {MemberCollection} memberCollection - The member collection
     * @param {Store} store - The application store
     * @param {EventBus} events - The EventBus instance
     * @param {Object} options - Optional configuration
     * @param {Object} options.hiddenGroups - { fieldName: { groupValue: 'Display Label', ... } }
     */
    constructor(container, memberCollection, store, events, options = {}) {

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
        this.#hiddenGroupsConfig = options.hiddenGroups || {};

        console.debug('FilterGenerator: hiddenGroupsConfig received:', this.#hiddenGroupsConfig);

        // ─── Read display options from container ──────

        this.#readDisplayOptions();

        // ─── Generate filters ──────────────────────────

        this.#generate();

        // ─── Subscribe to events ────────────────────────

        this.#events.subscribe('store:filtersChanged', () => {
            this.syncWithStore();
            this.#syncHiddenGroupsWithStore();
        });

    }

    /**
     * Read display options from the container attributes.
     *
     * The order of attributes on the element controls the display order:
     * - The first attribute encountered sets the first display type
     * - The second attribute encountered sets the second display type
     * - etc.
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

        // ─── Build display type order based on attribute order ───

        this.#displayTypeOrder = [];

        // Get the dataset keys in the order they appear on the element
        const datasetKeys = Object.keys(this.#container.dataset);

        // Map dataset keys to display types
        const attributeMap = {
            filterRadio: 'radio',
            filterCheckboxes: 'checkboxes',
            filterButtons: 'buttons',
            filterDropdown: 'dropdown'
        };

        // Process attributes in the order they appear on the element
        for (const key of datasetKeys) {
            if (attributeMap[key]) {
                const type = attributeMap[key];
                const fields = this.#displayOptions[type] || [];
                if (fields.length > 0 && !this.#displayTypeOrder.includes(type)) {
                    this.#displayTypeOrder.push(type);
                }
            }
        }

        // If any type is missing from the order, add it at the end in default order
        const defaultOrder = ['radio', 'checkboxes', 'buttons', 'dropdown'];
        for (const type of defaultOrder) {
            const fields = this.#displayOptions[type] || [];
            if (fields.length > 0 && !this.#displayTypeOrder.includes(type)) {
                this.#displayTypeOrder.push(type);
            }
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
     * Get hidden groups for a specific field from configuration.
     */
    #getHiddenGroupsForField(fieldName) {
        const result = this.#hiddenGroupsConfig[fieldName] || null;
        console.debug(`FilterGenerator: getHiddenGroupsForField("${fieldName}") =`, result);
        return result;
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

        console.debug(`FilterGenerator: createFilterForField("${fieldName}")`);

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

        // ─── Hidden groups logic ──────────────────────────

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

        console.debug(`FilterGenerator: hiddenGroups =`, hiddenGroups);
        console.debug(`FilterGenerator: hiddenGroupValues =`, hiddenGroupValues);
        console.debug(`FilterGenerator: sortedKeys =`, sortedKeys);

        // Filter out hidden group values from the regular list (case-insensitive)
        const filteredKeys = sortedKeys.filter(key => {
            // Check if this key (lowercase) matches any hidden group value (lowercase)
            return !hiddenGroupValues.some(hidden => hidden.toLowerCase() === key);
        });

        console.debug(`FilterGenerator: filteredKeys =`, filteredKeys);

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

        // ─── Create UI ──────────────────────────────────────

        // If this field has hidden groups, we need to:
        // 1. Create regular buttons using filteredKeys (hidden values removed)
        // 2. Create a hidden groups section with toggle buttons
        if (hiddenGroups && Object.keys(hiddenGroups).length > 0) {

            console.debug(`FilterGenerator: Creating hidden groups section for "${fieldName}"`);

            // Regular buttons (without hidden groups) — using filteredKeys
            this.#createButtonFilter(fieldName, group, displayMap, filteredKeys);

            // Hidden groups section (with toggle buttons)
            this.#createHiddenGroupsSection(fieldName, hiddenGroups, group);

        } else {

            console.debug(`FilterGenerator: Creating regular filter for "${fieldName}" with display type "${displayType}"`);

            // No hidden groups — normal behaviour
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
     * Create the hidden groups section within a filter group.
     */
    #createHiddenGroupsSection(fieldName, hiddenGroups, parentContainer) {

        // Separator
        const separator = document.createElement('hr');
        separator.className = 'hidden-groups-separator';
        parentContainer.appendChild(separator);

        // Header
        const header = document.createElement('div');
        header.className = 'hidden-groups-header';
        header.textContent = 'HIDDEN GROUPS';
        parentContainer.appendChild(header);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'hidden-groups-buttons';
        buttonContainer.dataset.filterOptions = '';
        buttonContainer.setAttribute('role', 'toolbar');
        buttonContainer.setAttribute('aria-label', `${fieldName} hidden groups`);

        // Initialise tracking for this field
        if (!this.#hiddenGroupVisibility[fieldName]) {
            this.#hiddenGroupVisibility[fieldName] = {};
        }
        if (!this.#hiddenGroupButtons[fieldName]) {
            this.#hiddenGroupButtons[fieldName] = {};
        }

        // Create a toggle button for each hidden group
        for (const [groupValue, displayLabel] of Object.entries(hiddenGroups)) {

            const button = document.createElement('button');
            button.dataset.value = groupValue;
            button.dataset.hiddenGroup = 'true';
            button.textContent = `Show ${displayLabel}`;
            button.type = 'button';
            button.setAttribute('role', 'button');
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', `Toggle ${displayLabel} group`);

            // Store state (hidden by default)
            this.#hiddenGroupVisibility[fieldName][groupValue] = false;
            this.#hiddenGroupButtons[fieldName][groupValue] = button;

            // Click handler
            button.addEventListener('click', () => {
                this.#toggleHiddenGroup(fieldName, groupValue);
            });

            // Keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.#toggleHiddenGroup(fieldName, groupValue);
                }
            });

            buttonContainer.appendChild(button);

        }

        parentContainer.appendChild(buttonContainer);

        // Apply default hidden state (ensure hidden groups are not active in Store)
        this.#applyDefaultHiddenState(fieldName);

    }

    /**
     * Apply default hidden state to hidden groups.
     */
    #applyDefaultHiddenState(fieldName) {

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        if (!hiddenGroups) return;

        for (const groupValue of Object.keys(hiddenGroups)) {
            if (this.#store.isFilterActive(fieldName, groupValue)) {
                this.#store.toggleFilter(fieldName, groupValue);
            }
        }

        // Trigger a Store update to hide members in these groups
        this.#events.publish('store:filtersChanged', {
            filters: this.#store.filters,
            source: 'FilterGenerator:defaultHidden'
        });

    }

    /**
     * Toggle a hidden group.
     */
    #toggleHiddenGroup(fieldName, groupValue) {

        const isVisible = this.#hiddenGroupVisibility[fieldName][groupValue];
        const newVisibility = !isVisible;
        this.#hiddenGroupVisibility[fieldName][groupValue] = newVisibility;

        // Update Store
        if (newVisibility) {
            // Show: add to filters
            if (!this.#store.isFilterActive(fieldName, groupValue)) {
                this.#store.toggleFilter(fieldName, groupValue);
            }
        } else {
            // Hide: remove from filters
            if (this.#store.isFilterActive(fieldName, groupValue)) {
                this.#store.toggleFilter(fieldName, groupValue);
            }
        }

        // Update button text and ARIA state
        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const displayLabel = hiddenGroups[groupValue];
        const button = this.#hiddenGroupButtons[fieldName][groupValue];
        if (button) {
            button.textContent = newVisibility
                ? `Hide ${displayLabel}`
                : `Show ${displayLabel}`;
            button.setAttribute('aria-pressed', newVisibility ? 'true' : 'false');
        }

        // Update the "All" button state for this field
        this.#updateAllButtonState(fieldName);

        // Trigger Store update
        this.#events.publish('store:filtersChanged', {
            filters: this.#store.filters,
            source: 'FilterGenerator:toggleHiddenGroup'
        });

    }

    /**
     * Synchronize hidden group buttons with the Store state.
     */
    #syncHiddenGroupsWithStore() {

        const filters = this.#store.filters;

        for (const [fieldName, hiddenGroups] of Object.entries(this.#hiddenGroupsConfig)) {
            if (!this.#hiddenGroupVisibility[fieldName]) continue;

            for (const [groupValue, displayLabel] of Object.entries(hiddenGroups)) {
                const isActive = filters[fieldName] && filters[fieldName].includes(groupValue);

                // Update visibility state
                this.#hiddenGroupVisibility[fieldName][groupValue] = isActive;

                // Update button text
                const button = this.#hiddenGroupButtons[fieldName]?.[groupValue];
                if (button) {
                    button.textContent = isActive
                        ? `Hide ${displayLabel}`
                        : `Show ${displayLabel}`;
                    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                }
            }
        }

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
                // Skip if this is a hidden group value (shouldn't happen, but safety check)
                const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
                const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];
                if (hiddenGroupValues.includes(value)) {
                    return;
                }
                this.#handleValueSelect(fieldName, value);
            });

            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const value = button.dataset.value;
                    const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
                    const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];
                    if (hiddenGroupValues.includes(value)) {
                        return;
                    }
                    this.#handleValueSelect(fieldName, value);
                }
            });
        }

    }

    /**
     * Handle "All" button click.
     *
     * Clears regular filters but preserves hidden group filters.
     */
    #handleAllClick(fieldName) {

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

        // Get current filters for this field
        const currentFilters = this.#store.filters[fieldName] || [];

        // Keep only hidden group values
        const filteredValues = currentFilters.filter(value => hiddenGroupValues.includes(value));

        if (filteredValues.length > 0) {
            this.#store.filters[fieldName] = filteredValues;
        } else {
            delete this.#store.filters[fieldName];
        }

        // Update UI
        const fieldData = this.#fieldFilterMap.get(fieldName);
        if (fieldData && fieldData.type === 'buttons' && fieldData.valueButtons) {
            for (const button of fieldData.valueButtons) {
                const value = button.dataset.value;
                // Only reset regular buttons (not hidden groups)
                if (!hiddenGroupValues.includes(value)) {
                    button.classList.remove('active');
                    button.setAttribute('aria-pressed', 'false');
                }
            }
            fieldData.allButton.classList.add('active');
            fieldData.allButton.setAttribute('aria-pressed', 'true');
            fieldData.allButton.focus();
        }

        // Trigger Store update
        this.#events.publish('store:filtersChanged', {
            filters: this.#store.filters,
            source: 'FilterGenerator:allClicked'
        });

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
     *
     * "All" is active only when NO regular (non-hidden) filters are active.
     * Hidden groups do NOT affect the "All" button state.
     */
    #updateAllButtonState(fieldName) {

        const fieldData = this.#fieldFilterMap.get(fieldName);

        if (!fieldData || fieldData.type !== 'buttons') {
            return;
        }

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

        const filters = this.#store.filters[fieldName] || [];
        const hasRegularFilters = filters.some(value => !hiddenGroupValues.includes(value));

        if (hasRegularFilters) {
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

                case 'buttons': {
                    const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
                    const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

                    // Reset regular buttons
                    for (const button of fieldData.valueButtons) {
                        if (hiddenGroupValues.includes(button.dataset.value)) {
                            continue;
                        }
                        button.classList.remove('active');
                        button.setAttribute('aria-pressed', 'false');
                    }
                    // Activate regular buttons that are active in Store
                    for (const button of fieldData.valueButtons) {
                        if (hiddenGroupValues.includes(button.dataset.value)) {
                            continue;
                        }
                        if (activeValues.includes(button.dataset.value)) {
                            button.classList.add('active');
                            button.setAttribute('aria-pressed', 'true');
                        }
                    }
                    this.#updateAllButtonState(fieldName);
                    break;
                }

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

        // Also sync hidden group buttons
        this.#syncHiddenGroupsWithStore();

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
