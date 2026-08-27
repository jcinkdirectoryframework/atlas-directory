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

        // Check if this field has hidden groups
        const hiddenGroups = this.#getHiddenGroupsForField(fieldName);
        const hiddenGroupValues = hiddenGroups ? Object.keys(hiddenGroups) : [];

        console.debug(`FilterGenerator: Field "${fieldName}" hidden groups:`, hiddenGroups);
        console.debug(`FilterGenerator: Field "${fieldName}" hidden group values:`, hiddenGroupValues);
        console.debug(`FilterGenerator: Field "${fieldName}" has hidden groups?`, hiddenGroups && Object.keys(hiddenGroups).length > 0);

        // Filter out hidden group values from the regular list
        const filteredKeys = sortedKeys.filter(key => !hiddenGroupValues.includes(key));

        console.debug(`FilterGenerator: "${fieldName}" sortedKeys:`, sortedKeys);
        console.debug(`FilterGenerator: "${fieldName}" filteredKeys:`, filteredKeys);

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
        if (hiddenGroups && Object.keys(hiddenGroups).length > 0) {
            console.debug(`FilterGenerator: Creating hidden groups section for "${fieldName}"`);
            // Force buttons for the regular section (using filteredKeys)
            this.#createButtonFilter(fieldName, group, displayMap, filteredKeys);
            // Add hidden groups section
            this.#createHiddenGroupsSection(fieldName, hiddenGroups, group);
        } else {
            // Regular display type (using sortedKeys — all values visible)
            console.debug(`FilterGenerator: Creating regular filter for "${fieldName}" with display type "${displayType}"`);
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
