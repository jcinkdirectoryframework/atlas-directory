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
     */
    #readDisplayOptions() {

        const parseList = (attr) => {
            if (attr && attr.trim()) {
                return attr.split(',').map(s => s.trim()).filter(s => s);
            }
            return [];
        };

        const radio = parseList(this.#container.dataset.filterRadio);
        const checkboxes = parseList(this.#container.dataset.filterCheckboxes);
        const buttons = parseList(this.#container.dataset.filterButtons);
        const dropdown = parseList(this.#container.dataset.filterDropdown);

        this.#displayOptions = { radio, checkboxes, buttons, dropdown };

        this.#displayTypeOrder = [];

        const datasetKeys = Object.keys(this.#container.dataset);
        const attributeMap = {
            filterRadio: 'radio',
            filterCheckboxes: 'checkboxes',
            filterButtons: 'buttons',
            filterDropdown: 'dropdown'
        };

        for (const key of datasetKeys) {
            if (attributeMap[key]) {
                const type = attributeMap[key];
                const fields = this.#displayOptions[type] || [];
                if (fields.length > 0 && !this.#displayTypeOrder.includes(type)) {
                    this.#displayTypeOrder.push(type);
                }
            }
        }

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

        return 'buttons';

    }

    /**
     * Get the display order for all filterable fields.
     */
    #getDisplayOrder(filterableFields) {

        const orderedFields = [];
        const processedFields = new Set();

        for (const type of this.#displayTypeOrder) {
            const fields = this.#displayOptions[type] || [];
            for (const field of fields) {
                if (filterableFields.includes(field) && !processedFields.has(field)) {
                    orderedFields.push({ field, type });
                    processedFields.add(field);
                }
            }
        }

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
        return this.#hiddenGroupsConfig[fieldName] || null;
    }

    /**
     * Generate filter interfaces for all filterable fields.
     */
    #generate() {

        console.debug('FilterGenerator: Generating filters...');

        this.#container.innerHTML = '';

        const filterableFields = this.#memberCollection.getFilterableFields();

        if (filterableFields.length === 0) {
            this.#container.innerHTML = '<p>No filterable fields found.</p>';
            return;
        }

        const displayOrder = this.#getDisplayOrder(filterableFields);

        for (const { field, type } of displayOrder) {
            this.#createFilterForField(field, type);
        }

        this.syncWithStore();

    }

    /**
     * Create a filter interface for a specific field with a specific display type.
     */
    #createFilterForField(fieldName, displayType) {

        const rawValues = this.#memberCollection.getUniqueValues(fieldName);

        if (rawValues.length === 0) {
            return;
        }

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

        const sortedKeys = Array.from(displayMap.keys()).sort((a, b) => a.localeCompare(b));

        if (sortedKeys.length === 0) {
            return;
        }

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

        const filteredKeys = sortedKeys.filter(key => !hiddenGroupValues.includes(key));

        console.debug(`FilterGenerator: "${fieldName}" sortedKeys:`, sortedKeys);
        console.debug(`FilterGenerator: "${fieldName}" filteredKeys:`, filteredKeys);
        console.debug(`FilterGenerator: "${fieldName}" hiddenGroups:`, hiddenGroups);

        const group = document.createElement('div');
        group.dataset.filter = '';
        group.dataset.field = fieldName;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', `Filter by ${fieldName}`);

        const label = document.createElement('label');
        label.textContent = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        group.appendChild(label);

        if (hiddenGroups && Object.keys(hiddenGroups).length > 0) {
            console.debug(`FilterGenerator: Creating hidden groups section for "${fieldName}"`);
            this.#createButtonFilter(fieldName, group, displayMap, filteredKeys);
            this.#createHiddenGroupsSection(fieldName, hiddenGroups, group);
        } else {
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

        const allButton = document.createElement('button');
        allButton.dataset.value = 'all';
        allButton.textContent = 'All';
        allButton.type = 'button';
        allButton.classList.add('active');
        allButton.setAttribute('role', 'button');
        allButton.setAttribute('aria-pressed', 'true');
        allButton.setAttribute('aria-label', `Show all ${fieldName} values`);
        optionsContainer.appendChild(allButton);

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

        this.#fieldFilterMap.set(fieldName, {
            container: group,
            allButton: allButton,
            valueButtons: valueButtons,
            type: 'buttons',
            displayMap: displayMap
        });

        this.#attachButtonEvents(fieldName, allButton, valueButtons);

    }

    /**
     * Create a dropdown filter.
     */
    #createDropdownFilter(fieldName, group, displayMap, sortedKeys) {

        const select = document.createElement('select');
        select.dataset.filterSelect = '';
        select.setAttribute('aria-label', `Filter by ${fieldName}`);

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Show All';
        select.appendChild(allOption);

        for (const normalizedKey of sortedKeys) {
            const displayValue = displayMap.get(normalizedKey);
            const option = document.createElement('option');
            option.value = normalizedKey;
            option.textContent = displayValue;
            select.appendChild(option);
        }

        group.appendChild(select);

        select.addEventListener('change', () => {
            const value = select.value;
            if (value === 'all') {
                this.#store.clearFieldFilters(fieldName);
            } else {
                this.#store.clearFieldFilters(fieldName);
                this.#store.toggleFilter(fieldName, value);
            }
        });

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

            checkbox.addEventListener('change', () => {
                allCheckbox.checked = false;
                const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked:not([value="all"])');
                if (checkedBoxes.length === 0) {
                    allCheckbox.checked = true;
                    this.#store.clearFieldFilters(fieldName);
                } else {
                    this.#store.clearFieldFilters(fieldName);
                    for (const cb of checkedBoxes) {
                        this.#store.toggleFilter(fieldName, cb.value);
                    }
                }
            });
        }

        allCheckbox.addEventListener('change', () => {
            if (allCheckbox.checked) {
                for (const cb of valueCheckboxes) {
                    cb.checked = false;
                }
                this.#store.clearFieldFilters(fieldName);
            }
        });

        group.appendChild(optionsContainer);

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

            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.#store.clearFieldFilters(fieldName);
                    this.#store.toggleFilter(fieldName, radio.value);
                }
            });
        }

        group.appendChild(optionsContainer);

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

        const separator = document.createElement('hr');
        separator.className = 'hidden-groups-separator';
        parentContainer.appendChild(separator);

        const header = document.createElement('div');
        header.className = 'hidden-groups-header';
        header.textContent = 'HIDDEN GROUPS';
        parentContainer.appendChild(header);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'hidden-groups-buttons';
        buttonContainer.dataset.filterOptions = '';
        buttonContainer.setAttribute('role', 'toolbar');
        buttonContainer.setAttribute('aria-label', `${fieldName} hidden groups`);

        if (!this.#hiddenGroupVisibility[fieldName]) {
            this.#hiddenGroupVisibility[fieldName] = {};
        }
        if (!this.#hiddenGroupButtons[fieldName]) {
            this.#hiddenGroupButtons[fieldName] = {};
        }

        for (const [groupValue, displayLabel] of Object.entries(hiddenGroups)) {

            const button = document.createElement('button');
            button.dataset.value = groupValue;
            button.dataset.hiddenGroup = 'true';
            button.textContent = `Show ${displayLabel}`;
            button.type = 'button';
            button.setAttribute('role', 'button');
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', `Toggle ${displayLabel} group`);

            this.#hiddenGroupVisibility[fieldName][groupValue] = false;
            this.#hiddenGroupButtons[fieldName][groupValue] = button;

            button.addEventListener('click', () => {
                this.#toggleHiddenGroup(fieldName, groupValue);
            });

            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.#toggleHiddenGroup(fieldName, groupValue);
                }
            });

            buttonContainer.appendChild(button);

        }

        parentContainer.appendChild(buttonContainer);

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

        if (newVisibility) {
            if (!this.#store.isFilterActive(fieldName, groupValue)) {
                this.#store.toggleFilter(fieldName, groupValue);
            }
        } else {
            if (this.#store.isFilterActive(fieldName, groupValue)) {
                this.#store.toggleFilter(fieldName, groupValue);
            }
        }

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const displayLabel = hiddenGroups[groupValue];
        const button = this.#hiddenGroupButtons[fieldName][groupValue];
        if (button) {
            button.textContent = newVisibility
                ? `Hide ${displayLabel}`
                : `Show ${displayLabel}`;
            button.setAttribute('aria-pressed', newVisibility ? 'true' : 'false');
        }

        this.#updateAllButtonState(fieldName);

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

                this.#hiddenGroupVisibility[fieldName][groupValue] = isActive;

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

        allButton.addEventListener('click', () => {
            this.#handleAllClick(fieldName);
        });

        allButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.#handleAllClick(fieldName);
            }
        });

        for (const button of valueButtons) {
            button.addEventListener('click', () => {
                const value = button.dataset.value;
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
     */
    #handleAllClick(fieldName) {

        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

        const currentFilters = this.#store.filters[fieldName] || [];
        const filteredValues = currentFilters.filter(value => hiddenGroupValues.includes(value));

        if (filteredValues.length > 0) {
            this.#store.filters[fieldName] = filteredValues;
        } else {
            delete this.#store.filters[fieldName];
        }

        const fieldData = this.#fieldFilterMap.get(fieldName);
        if (fieldData && fieldData.type === 'buttons' && fieldData.valueButtons) {
            for (const button of fieldData.valueButtons) {
                const value = button.dataset.value;
                if (!hiddenGroupValues.includes(value)) {
                    button.classList.remove('active');
                    button.setAttribute('aria-pressed', 'false');
                }
            }
            fieldData.allButton.classList.add('active');
            fieldData.allButton.setAttribute('aria-pressed', 'true');
            fieldData.allButton.focus();
        }

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

                    for (const button of fieldData.valueButtons) {
                        if (hiddenGroupValues.includes(button.dataset.value)) {
                            continue;
                        }
                        button.classList.remove('active');
                        button.setAttribute('aria-pressed', 'false');
                    }
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

                case 'radio': {
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
