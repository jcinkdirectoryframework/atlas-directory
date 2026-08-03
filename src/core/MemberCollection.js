/**
 * MemberCollection
 *
 * Manages a collection of Member objects.
 *
 * Responsibilities:
 * - Store and retrieve members by ID
 * - Support iteration over members
 * - Provide query methods (filter, search, sort)
 * - Analyse field values across all members
 *
 * Deliberately does NOT:
 * - Know about the DOM
 * - Render or update the DOM
 * - Manage application state
 * - Handle events
 */

export default class MemberCollection {

    #members = new Map();
    #allFieldNames = null;

    /**
     * Create a MemberCollection.
     *
     * @param {Iterable<Member>} [members] - Initial members
     */
    constructor(members = []) {

        for (const member of members) {
            this.add(member);
        }

    }

    /**
     * Add a member to the collection.
     *
     * @param {Member} member
     * @returns {this} For chaining
     */
    add(member) {

        if (this.#members.has(member.id)) {
            console.warn(
                `Member with ID "${member.id}" already exists, overwriting`
            );
        }

        this.#members.set(member.id, member);

        // Invalidate cached field names
        this.#allFieldNames = null;

        return this;

    }

    /**
     * Get a member by ID.
     */
    get(id) {
        return this.#members.get(id) || null;
    }

    /**
     * Get all members as an array.
     */
    getAll() {
        return Array.from(this.#members.values());
    }

    /**
     * Number of members in the collection.
     */
    get size() {
        return this.#members.size;
    }

    /**
     * Check if the collection is empty.
     */
    get isEmpty() {
        return this.#members.size === 0;
    }

    /**
     * Get all field names present across all members.
     *
     * @returns {string[]} Array of unique field names
     */
    getAllFieldNames() {

        if (this.#allFieldNames !== null) {
            return this.#allFieldNames;
        }

        const fieldSet = new Set();

        for (const member of this.#members.values()) {
            for (const fieldName of member.fieldNames) {
                fieldSet.add(fieldName);
            }
        }

        this.#allFieldNames = Array.from(fieldSet);

        return this.#allFieldNames;

    }

    /**
     * Get all field names that are filterable.
     *
     * @returns {string[]} Array of filterable field names
     */
    getFilterableFields() {

        const fieldSet = new Set();

        for (const member of this.#members.values()) {
            for (const fieldName of member.fieldNames) {
                if (member.isFilterable(fieldName)) {
                    fieldSet.add(fieldName);
                }
            }
        }

        return Array.from(fieldSet).sort();

    }

    /**
     * Get all field names that are sortable AND present in ALL members.
     *
     * @returns {string[]} Array of sortable field names that exist in all members
     */
    getSortableFields() {

        const totalMembers = this.#members.size;
        const fieldCounts = new Map();

        // Count how many members have each sortable field
        for (const member of this.#members.values()) {
            for (const fieldName of member.fieldNames) {
                if (member.isSortable(fieldName)) {
                    fieldCounts.set(fieldName, (fieldCounts.get(fieldName) || 0) + 1);
                }
            }
        }

        // Only return fields that exist in ALL members
        const sortableFields = [];
        for (const [fieldName, count] of fieldCounts) {
            if (count === totalMembers) {
                sortableFields.push(fieldName);
            }
        }

        return sortableFields.sort();

    }

    /**
     * Get unique values for a specific field across all members.
     *
     * @param {string} fieldName
     * @returns {string[]} Array of unique values, sorted alphabetically
     */
    getUniqueValues(fieldName) {

        const valueSet = new Set();

        for (const member of this.#members.values()) {
            const value = member.get(fieldName);
            if (value && value.trim()) {
                valueSet.add(value);
            }
        }

        return Array.from(valueSet).sort();

    }

    /**
     * Get unique normalized values for a specific field.
     *
     * Useful for case-insensitive filtering.
     *
     * @param {string} fieldName
     * @returns {string[]} Array of unique normalized values, sorted
     */
    getUniqueNormalizedValues(fieldName) {

        const valueSet = new Set();

        for (const member of this.#members.values()) {
            const value = member.getNormalized(fieldName);
            if (value && value.trim()) {
                valueSet.add(value);
            }
        }

        return Array.from(valueSet).sort();

    }

    /**
     * Filter members using a predicate.
     *
     * @param {Function} predicate - (member) => boolean
     * @returns {MemberCollection} New collection with filtered members
     */
    filter(predicate) {

        const filtered = [];

        for (const member of this.#members.values()) {
            if (predicate(member)) {
                filtered.push(member);
            }
        }

        return new MemberCollection(filtered);

    }

    /**
     * Search members by a query string.
     *
     * @param {string} query
     * @returns {MemberCollection} New collection with matching members
     */
    search(query) {

        if (!query || !query.trim()) {
            return new MemberCollection(this.getAll());
        }

        return this.filter(member => member.matches(query));

    }

    /**
     * Sort members using a comparator.
     *
     * @param {Function} comparator - (a, b) => number
     * @returns {MemberCollection} New collection with sorted members
     */
    sort(comparator) {

        const sorted = this.getAll().sort(comparator);

        return new MemberCollection(sorted);

    }

    /**
     * Apply filters to the collection.
     *
     * @param {Object} filters - { fieldName: [value1, value2], ... }
     * @returns {Member[]} Array of members that match all active filters
     */
    applyFilters(filters) {

        // If no filters, return all members
        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        if (activeFields.length === 0) {
            return this.getAll();
        }

        const results = [];

        for (const member of this.#members.values()) {

            let matches = true;

            for (const [fieldName, values] of Object.entries(filters)) {

                // If no values for this field, skip
                if (!values || values.length === 0) {
                    continue;
                }

                const memberValue = member.get(fieldName);

                // If member doesn't have this field, they don't match
                if (!memberValue) {
                    matches = false;
                    break;
                }

                // Check if member's value matches any of the selected values
                const normalizedMemberValue = memberValue.toLowerCase();
                const matchFound = values.some(value =>
                    value.toLowerCase() === normalizedMemberValue
                );

                if (!matchFound) {
                    matches = false;
                    break;
                }

            }

            if (matches) {
                results.push(member);
            }

        }

        return results;

    }

    /**
     * Get a range of members.
     *
     * @param {number} start - Start index
     * @param {number} end - End index (exclusive)
     * @returns {MemberCollection} New collection with the sliced members
     */
    slice(start, end) {

        const sliced = this.getAll().slice(start, end);

        return new MemberCollection(sliced);

    }

    /**
     * Iterate over members.
     */
    [Symbol.iterator]() {
        return this.#members.values();
    }

    /**
     * Execute a function for each member.
     *
     * @param {Function} callback - (member, id) => void
     */
    forEach(callback) {

        for (const [id, member] of this.#members) {
            callback(member, id);
        }

    }

    /**
     * Convert the collection to an array of member objects.
     *
     * Useful for debugging.
     */
    toArray() {
        return this.getAll().map(member => member.toObject());
    }

}