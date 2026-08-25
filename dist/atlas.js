/**
 * Atlas
 * A dependency-free, HTML-driven directory engine
 *
 * Version 1.0.0
 *
 * Copyright (c) 2026 Maeve aka MaeveCodes
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * https://github.com/jcinkdirectoryframework/atlas-directory
 *
 * This is a bundled, self-contained version of Atlas.
 * All code is included in this single file — no external imports.
 */

// Member Class
class Member {
    #id;
    #element;
    #fields = new Map();
    #fieldElements = new Map();

    constructor(element, index) {
        if (!element || !(element instanceof HTMLElement)) {
            throw new Error('Member requires a valid HTMLElement');
        }
        this.#element = element;
        this.#id = this.#generateId(element, index);
        this.#parseFields();
        element._atlasMember = this;
    }

    #generateId(element, index) {
        const explicitId = element.dataset.memberId;
        if (explicitId) return explicitId;
        return `member-${index}`;
    }

    #parseFields() {
        const fieldElements = this.#element.querySelectorAll('[data-field]');
        for (const el of fieldElements) {
            const fieldName = el.dataset.field;
            const rawValue = el.textContent.trim();
            const filterable = el.dataset.filterable !== 'false';
            const searchable = el.dataset.searchable === 'true';
            const sortable = el.dataset.sortable === 'true';
            if (!fieldName) {
                console.warn(`Member ${this.#id} has a [data-field] attribute with no value, ignoring`);
                continue;
            }
            if (this.#fields.has(fieldName)) {
                console.warn(`Duplicate field "${fieldName}" found for member ${this.#id}, ignoring`);
                continue;
            }
            this.#fields.set(fieldName, {
                raw: rawValue,
                normalized: this.#normalize(rawValue),
                filterable: filterable,
                searchable: searchable,
                sortable: sortable
            });
            this.#fieldElements.set(fieldName, el);
        }
    }

    #normalize(value) {
        return value.toLowerCase().trim();
    }

    get id() { return this.#id; }
    get element() { return this.#element; }
    get fieldNames() { return Array.from(this.#fields.keys()); }

    get(fieldName) {
        const field = this.#fields.get(fieldName);
        return field ? field.raw : null;
    }

    getNormalized(fieldName) {
        const field = this.#fields.get(fieldName);
        return field ? field.normalized : '';
    }

    has(fieldName) { return this.#fields.has(fieldName); }

    isFilterable(fieldName) {
        const field = this.#fields.get(fieldName);
        return field ? field.filterable : false;
    }

    isSearchable(fieldName) {
        const field = this.#fields.get(fieldName);
        return field ? field.searchable : false;
    }

    isSortable(fieldName) {
        const field = this.#fields.get(fieldName);
        return field ? field.sortable : false;
    }

    matches(query) {
        const normalizedQuery = this.#normalize(query);
        if (!normalizedQuery) return true;
        for (const [fieldName, field] of this.#fields) {
            if (!field.searchable) continue;
            if (field.normalized.includes(normalizedQuery)) return true;
        }
        return false;
    }

    toObject() {
        const result = {};
        for (const [fieldName, field] of this.#fields) {
            result[fieldName] = field.raw;
        }
        return result;
    }
}

// MemberCollection Class
class MemberCollection {
    #members = new Map();
    #allFieldNames = null;

    constructor(members = []) {
        for (const member of members) {
            this.add(member);
        }
    }

    add(member) {
        if (this.#members.has(member.id)) {
            console.warn(`Member with ID "${member.id}" already exists, overwriting`);
        }
        this.#members.set(member.id, member);
        this.#allFieldNames = null;
        return this;
    }

    get(id) { return this.#members.get(id) || null; }
    getAll() { return Array.from(this.#members.values()); }
    get size() { return this.#members.size; }
    get isEmpty() { return this.#members.size === 0; }

    getAllFieldNames() {
        if (this.#allFieldNames !== null) return this.#allFieldNames;
        const fieldSet = new Set();
        for (const member of this.#members.values()) {
            for (const fieldName of member.fieldNames) {
                fieldSet.add(fieldName);
            }
        }
        this.#allFieldNames = Array.from(fieldSet);
        return this.#allFieldNames;
    }

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

    getSortableFields() {
        const totalMembers = this.#members.size;
        const fieldCounts = new Map();
        for (const member of this.#members.values()) {
            for (const fieldName of member.fieldNames) {
                if (member.isSortable(fieldName)) {
                    fieldCounts.set(fieldName, (fieldCounts.get(fieldName) || 0) + 1);
                }
            }
        }
        const sortableFields = [];
        for (const [fieldName, count] of fieldCounts) {
            if (count === totalMembers) {
                sortableFields.push(fieldName);
            }
        }
        return sortableFields.sort();
    }

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

    filter(predicate) {
        const filtered = [];
        for (const member of this.#members.values()) {
            if (predicate(member)) filtered.push(member);
        }
        return new MemberCollection(filtered);
    }

    search(query) {
        if (!query || !query.trim()) {
            return new MemberCollection(this.getAll());
        }
        return this.filter(member => member.matches(query));
    }

    sort(comparator) {
        const sorted = this.getAll().sort(comparator);
        return new MemberCollection(sorted);
    }

    applyFilters(filters) {
        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );
        if (activeFields.length === 0) return this.getAll();

        const filterSets = {};
        for (const fieldName of activeFields) {
            filterSets[fieldName] = new Set(
                filters[fieldName].map(v => v.toLowerCase())
            );
        }
        for (const fieldName of activeFields) {
            if (filterSets[fieldName].size === 0) return [];
        }

        const results = [];
        for (const member of this.#members.values()) {
            let matches = true;
            for (const fieldName of activeFields) {
                const memberValue = member.get(fieldName);
                if (!memberValue) {
                    matches = false;
                    break;
                }
                if (!filterSets[fieldName].has(memberValue.toLowerCase())) {
                    matches = false;
                    break;
                }
            }
            if (matches) results.push(member);
        }
        return results;
    }

    slice(start, end) {
        const sliced = this.getAll().slice(start, end);
        return new MemberCollection(sliced);
    }

    [Symbol.iterator]() {
        return this.#members.values();
    }

    forEach(callback) {
        for (const [id, member] of this.#members) {
            callback(member, id);
        }
    }

    toArray() {
        return this.getAll().map(member => member.toObject());
    }
}

// Registry Class
class Registry {
    #root;
    #directory = null;
    #members = [];
    #controls = {
        search: [],
        filters: [],
        sorts: [],
        layouts: [],
        alphabet: [],
        chips: [],
        results: [],
        filtersContainer: []
    };
    #controlSelectors = {
        search: "[data-search]",
        filters: "[data-filter]",
        sorts: "[data-sort]",
        layouts: "[data-layout]",
        alphabet: "[data-alphabet]",
        chips: "[data-chips]",
        results: "[data-results]",
        filtersContainer: "[data-filters]"
    };

    constructor(root) {
        this.#root = root;
        this.#discover();
    }

    get root() { return this.#root; }
    get directory() { return this.#directory; }
    get members() { return [...this.#members]; }

    get filtersContainer() {
        const containers = this.#controls.filtersContainer;
        if (containers.length === 0) return null;
        return containers[0];
    }

    get chipsContainer() {
        const containers = this.#controls.chips;
        if (containers.length === 0) return null;
        return containers[0];
    }

    get resultsContainer() {
        const containers = this.#controls.results;
        if (containers.length === 0) return null;
        return containers[0];
    }

    get controls() {
        return Object.freeze({
            search: [...this.#controls.search],
            filters: [...this.#controls.filters],
            sorts: [...this.#controls.sorts],
            layouts: [...this.#controls.layouts],
            alphabet: [...this.#controls.alphabet],
            chips: [...this.#controls.chips],
            results: [...this.#controls.results]
        });
    }

    #discover() {
        this.#discoverDirectory();
        this.#discoverMembers();
        this.#discoverControls();
    }

    #discoverDirectory() {
        const directories = this.#root.querySelectorAll("[data-directory]");
        if (directories.length === 0) {
            throw new Error("Atlas requires one [data-directory] element.");
        }
        if (directories.length > 1) {
            throw new Error("Atlas found multiple [data-directory] elements.");
        }
        this.#directory = directories[0];
    }

    #discoverMembers() {
        if (!this.#directory) return;
        this.#members = Array.from(this.#directory.querySelectorAll("[data-member]"));
    }

    #discoverControls() {
        for (const [type, selector] of Object.entries(this.#controlSelectors)) {
            this.#controls[type] = Array.from(this.#root.querySelectorAll(selector));
        }
    }
}

// EventBus Class
class EventBus {
    #subscribers = new Map();
    #debug = false;

    constructor(options = {}) {
        this.#debug = options.debug || false;
    }

    subscribe(event, callback) {
        if (typeof event !== 'string' || !event) {
            throw new Error('EventBus.subscribe: Event name must be a non-empty string');
        }
        if (typeof callback !== 'function') {
            throw new Error('EventBus.subscribe: Callback must be a function');
        }
        if (!this.#subscribers.has(event)) {
            this.#subscribers.set(event, []);
        }
        const callbacks = this.#subscribers.get(event);
        if (callbacks.includes(callback)) {
            if (this.#debug) {
                console.warn(`EventBus: Duplicate subscription to "${event}" ignored`);
            }
            return () => this.unsubscribe(event, callback);
        }
        callbacks.push(callback);
        if (this.#debug) {
            console.debug(`EventBus: Subscribed to "${event}" (${callbacks.length} listeners)`);
        }
        return () => this.unsubscribe(event, callback);
    }

    publish(event, data) {
        if (typeof event !== 'string' || !event) {
            throw new Error('EventBus.publish: Event name must be a non-empty string');
        }
        if (!this.#subscribers.has(event)) {
            if (this.#debug) {
                console.debug(`EventBus: Published "${event}" (no subscribers)`);
            }
            return false;
        }
        const callbacks = this.#subscribers.get(event);
        if (this.#debug) {
            console.debug(`EventBus: Published "${event}" to ${callbacks.length} subscribers`, data);
        }
        const callbacksToRun = [...callbacks];
        for (const callback of callbacksToRun) {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventBus: Error in subscriber to "${event}":`, error);
            }
        }
        return true;
    }

    unsubscribe(event, callback) {
        if (typeof event !== 'string' || !event) {
            throw new Error('EventBus.unsubscribe: Event name must be a non-empty string');
        }
        if (typeof callback !== 'function') {
            throw new Error('EventBus.unsubscribe: Callback must be a function');
        }
        if (!this.#subscribers.has(event)) {
            if (this.#debug) {
                console.debug(`EventBus: Unsubscribe from "${event}" (no subscribers)`);
            }
            return false;
        }
        const callbacks = this.#subscribers.get(event);
        const index = callbacks.indexOf(callback);
        if (index === -1) {
            if (this.#debug) {
                console.debug(`EventBus: Unsubscribe from "${event}" (callback not found)`);
            }
            return false;
        }
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
            this.#subscribers.delete(event);
        }
        if (this.#debug) {
            console.debug(`EventBus: Unsubscribed from "${event}" (${callbacks.length} listeners remain)`);
        }
        return true;
    }

    clear(event) {
        if (event) {
            if (typeof event !== 'string' || !event) {
                throw new Error('EventBus.clear: Event name must be a non-empty string');
            }
            if (!this.#subscribers.has(event)) return 0;
            const count = this.#subscribers.get(event).length;
            this.#subscribers.delete(event);
            if (this.#debug) {
                console.debug(`EventBus: Cleared "${event}" (${count} subscriptions)`);
            }
            return count;
        }
        const totalCount = this.#subscriberCount;
        this.#subscribers.clear();
        if (this.#debug) {
            console.debug(`EventBus: Cleared all (${totalCount} subscriptions)`);
        }
        return totalCount;
    }

    hasSubscribers(event) {
        if (typeof event !== 'string' || !event) return false;
        return this.#subscribers.has(event) && this.#subscribers.get(event).length > 0;
    }

    subscriberCount(event) {
        if (event) {
            if (typeof event !== 'string' || !event) return 0;
            if (!this.#subscribers.has(event)) return 0;
            return this.#subscribers.get(event).length;
        }
        return this.#subscriberCount;
    }

    get #subscriberCount() {
        let total = 0;
        for (const [, callbacks] of this.#subscribers) {
            total += callbacks.length;
        }
        return total;
    }

    get eventNames() {
        return Array.from(this.#subscribers.keys());
    }
}

// Store Class
class Store {
    #state = {
        filters: {},
        search: '',
        sort: null,
        layout: 'grid'
    };
    #events = null;
    #filterCache = new Map();

    constructor(options = {}) {
        this.#events = options.events || null;
        if (options.initialState) {
            this.#state = { ...this.#state, ...options.initialState };
        }
    }

    #publish(event, data) {
        if (this.#events) {
            this.#events.publish(event, data);
        }
    }

    get filters() {
        return { ...this.#state.filters };
    }

    toggleFilter(fieldName, value) {
        if (!this.#state.filters[fieldName]) {
            this.#state.filters[fieldName] = [];
        }
        const values = this.#state.filters[fieldName];
        const index = values.indexOf(value);
        let isActive;
        if (index === -1) {
            values.push(value);
            isActive = true;
        } else {
            values.splice(index, 1);
            if (values.length === 0) {
                delete this.#state.filters[fieldName];
            }
            isActive = false;
        }
        this.#filterCache.clear();
        this.#publish('store:filtersChanged', {
            filters: this.filters,
            field: fieldName,
            value: value,
            active: isActive
        });
        return isActive;
    }

    isFilterActive(fieldName, value) {
        const values = this.#state.filters[fieldName];
        if (!values) return false;
        return values.includes(value);
    }

    hasFieldFilters(fieldName) {
        const values = this.#state.filters[fieldName];
        return !!(values && values.length > 0);
    }

    clearFieldFilters(fieldName) {
        delete this.#state.filters[fieldName];
        this.#filterCache.clear();
        this.#publish('store:filtersChanged', {
            filters: this.filters,
            field: fieldName,
            action: 'clearField'
        });
    }

    clearAllFilters() {
        this.#state.filters = {};
        this.#filterCache.clear();
        this.#publish('store:filtersChanged', {
            filters: this.filters,
            action: 'clearAll'
        });
    }

    get search() {
        return this.#state.search;
    }

    setSearch(query) {
        const trimmed = query.trim();
        if (this.#state.search === trimmed) return;
        this.#state.search = trimmed;
        this.#filterCache.clear();
        this.#publish('store:searchChanged', {
            search: this.#state.search
        });
    }

    get sort() {
        return this.#state.sort ? { ...this.#state.sort } : null;
    }

    setSort(field, direction = 'asc') {
        let newSort = null;
        if (field && direction) {
            newSort = { field, direction };
        }
        const currentSort = this.#state.sort;
        const hasChanged = JSON.stringify(currentSort) !== JSON.stringify(newSort);
        if (!hasChanged) return;
        this.#state.sort = newSort;
        this.#filterCache.clear();
        this.#publish('store:sortChanged', {
            sort: this.sort
        });
    }

    get layout() {
        return this.#state.layout;
    }

    setLayout(layout) {
        if (layout !== 'grid' && layout !== 'list') return;
        if (this.#state.layout === layout) return;
        this.#state.layout = layout;
        this.#publish('store:layoutChanged', {
            layout: this.#state.layout
        });
    }

    getState() {
        return { ...this.#state };
    }

    #getFilterCacheKey() {
        const filters = this.#state.filters;
        const sortedFields = Object.keys(filters).sort();
        let key = '';
        for (const field of sortedFields) {
            const values = filters[field];
            if (values && values.length > 0) {
                key += field + ':' + [...values].sort().join(',') + '|';
            }
        }
        return key || 'none';
    }

    getCachedFilterResults(memberCollection) {
        const key = this.#getFilterCacheKey();
        if (key === 'none') return null;
        const cached = this.#filterCache.get(key);
        if (cached) {
            const members = memberCollection.getAll();
            const memberIds = members.map(m => m.id).join(',');
            if (cached.memberIds === memberIds) {
                return cached.results;
            }
            this.#filterCache.delete(key);
        }
        return null;
    }

    setCachedFilterResults(memberCollection, results) {
        const key = this.#getFilterCacheKey();
        if (key === 'none' || results.length === 0) return;
        const members = memberCollection.getAll();
        const memberIds = members.map(m => m.id).join(',');
        this.#filterCache.set(key, {
            results: results,
            memberIds: memberIds,
            timestamp: Date.now()
        });
        if (this.#filterCache.size > 20) {
            let oldest = null;
            let oldestTime = Infinity;
            for (const [k, v] of this.#filterCache) {
                if (v.timestamp < oldestTime) {
                    oldestTime = v.timestamp;
                    oldest = k;
                }
            }
            if (oldest) {
                this.#filterCache.delete(oldest);
            }
        }
    }

    clearFilterCache() {
        this.#filterCache.clear();
    }
}

// URLManager Class
class URLManager {
    #store = null;
    #events = null;
    #updateTimeout = null;
    #isRestoring = false;

    constructor({ store, events }) {
        if (!store) throw new Error('URLManager requires a Store');
        if (!events) throw new Error('URLManager requires an EventBus');

        this.#store = store;
        this.#events = events;
        this.#restoreFromURL();
        this.#subscribeToEvents();
    }

    #subscribeToEvents() {
        this.#events.subscribe('store:filtersChanged', () => {
            this.#updateURL();
        });
        this.#events.subscribe('store:searchChanged', () => {
            this.#updateURL();
        });
        this.#events.subscribe('store:sortChanged', () => {
            this.#updateURL();
        });
    }

    #restoreFromURL() {
        this.#isRestoring = true;
        const params = new URLSearchParams(window.location.search);
        const reserved = ['act', 'max_results', 'sort_key', 'sort_order', 'page'];
        const filterParams = {};

        for (const [key, value] of params) {
            if (!reserved.includes(key) && value && value.trim()) {
                if (filterParams[key]) {
                    if (Array.isArray(filterParams[key])) {
                        filterParams[key].push(value);
                    } else {
                        filterParams[key] = [filterParams[key], value];
                    }
                } else {
                    filterParams[key] = value;
                }
            }
        }

        const filters = {};
        for (const [field, value] of Object.entries(filterParams)) {
            if (Array.isArray(value)) {
                filters[field] = value;
            } else {
                filters[field] = [value];
            }
        }

        if (Object.keys(filters).length > 0) {
            for (const [field, values] of Object.entries(filters)) {
                for (const value of values) {
                    this.#store.toggleFilter(field, value);
                }
            }
        }

        const sortKey = params.get('sort_key');
        const sortOrder = params.get('sort_order');
        if (sortKey && sortKey !== 'name') {
            const direction = sortOrder === 'asc' ? 'asc' : 'desc';
            this.#store.setSort(sortKey, direction);
        }

        this.#isRestoring = false;
    }

    #updateURL() {
        if (this.#isRestoring) return;
        if (this.#updateTimeout) {
            clearTimeout(this.#updateTimeout);
        }
        this.#updateTimeout = setTimeout(() => {
            this.#updateTimeout = null;
            this.#doUpdateURL();
        }, 100);
    }

    #doUpdateURL() {
        const params = new URLSearchParams();
        const filters = this.#store.filters;

        for (const [field, values] of Object.entries(filters)) {
            if (values && values.length > 0) {
                for (const value of values) {
                    params.append(field, value);
                }
            }
        }

        const sort = this.#store.sort;
        if (sort && sort.field) {
            params.set('sort_key', sort.field);
            params.set('sort_order', sort.direction);
        }

        const currentParams = new URLSearchParams(window.location.search);
        const preserve = ['act', 'max_results'];
        for (const key of preserve) {
            if (currentParams.has(key)) {
                params.set(key, currentParams.get(key));
            }
        }

        const queryString = params.toString();
        const newURL = queryString
            ? window.location.pathname + '?' + queryString + window.location.hash
            : window.location.pathname + window.location.hash;

        window.history.pushState({}, '', newURL);
    }

    getParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    }

    hasParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.has(key);
    }
}

// JCinkAdapter Class
class JCinkAdapter {
    static isMemberList() {
        const url = window.location.href;
        return url.includes('act=Members');
    }

    static ensureMaxResults() {
        if (!this.isMemberList()) return;
        const url = new URL(window.location.href);
        const params = url.searchParams;

        if (params.has('max_results')) {
            const currentValue = params.get('max_results');
            if (currentValue === '1000') return;
            params.set('max_results', '1000');
        } else {
            params.set('max_results', '1000');
        }

        window.location.replace(url.toString());
    }

    static apply() {
        this.ensureMaxResults();
    }
}

// Renderer Class
class Renderer {
    #registry = null;
    #memberCollection = null;
    #store = null;
    #events = null;
    #filteredMembers = [];
    #visibleMembers = [];
    #observer = null;
    #lazyRenderThreshold = 300;
    #batchSize = 25;
    #sentinelTop = null;
    #sentinelBottom = null;
    #isLazyRendering = false;
    #pendingRender = null;
    #isRendering = false;
    #scrollTimeout = null;
    #containerScrollHandler = null;

    constructor({ registry, memberCollection, store, events }) {
        if (!registry) throw new Error('Renderer requires a Registry');
        if (!memberCollection) throw new Error('Renderer requires a MemberCollection');
        if (!store) throw new Error('Renderer requires a Store');
        if (!events) throw new Error('Renderer requires an EventBus');

        this.#registry = registry;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        this.#filteredMembers = memberCollection.getAll();
        this.#visibleMembers = [...this.#filteredMembers];

        this.#setupLoadingState();
        this.#subscribeToEvents();
    }

    #setupLoadingState() {
        const root = this.#registry.root;
        root.setAttribute('data-atlas-loading', '');
        requestAnimationFrame(() => {
            this.#applyFiltersAndSearch();
            this.render();
            root.removeAttribute('data-atlas-loading');
        });
    }

    #subscribeToEvents() {
        this.#events.subscribe('store:filtersChanged', () => {
            this.#onStateChange();
        });
        this.#events.subscribe('store:searchChanged', () => {
            this.#onStateChange();
        });
        this.#events.subscribe('store:sortChanged', () => {
            this.#onStateChange();
        });
    }

    #onStateChange() {
        if (this.#pendingRender) {
            cancelAnimationFrame(this.#pendingRender);
        }
        this.#pendingRender = requestAnimationFrame(() => {
            this.#applyFiltersAndSearch();
            this.render();
            this.#pendingRender = null;
        });
    }

    #applyFiltersAndSearch() {
        const filters = this.#store.filters;
        const searchQuery = this.#store.search;
        const sort = this.#store.sort;

        let filtered = this.#memberCollection.getAll();

        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        if (activeFields.length > 0) {
            const cached = this.#store.getCachedFilterResults(this.#memberCollection);
            if (cached !== null) {
                filtered = cached;
            } else {
                filtered = this.#memberCollection.applyFilters(filters);
                this.#store.setCachedFilterResults(this.#memberCollection, filtered);
            }
        }

        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            const searchResults = [];
            for (const member of filtered) {
                if (member.matches(query)) {
                    searchResults.push(member);
                }
            }
            filtered = searchResults;
        }

        if (sort && sort.field) {
            filtered = this.#sortMembers(filtered, sort.field, sort.direction);
        }

        this.#filteredMembers = filtered;
    }

    #sortMembers(members, field, direction) {
        const sorted = [...members];
        const collator = new Intl.Collator(undefined, {
            sensitivity: 'base',
            caseFirst: 'upper'
        });
        sorted.sort((a, b) => {
            const valA = a.get(field) || '';
            const valB = b.get(field) || '';
            const compareResult = collator.compare(valA, valB);
            return direction === 'asc' ? compareResult : -compareResult;
        });
        return sorted;
    }

    #shouldUseLazyRendering() {
        return this.#memberCollection.size > this.#lazyRenderThreshold;
    }

    render() {
        if (!this.#filteredMembers || !Array.isArray(this.#filteredMembers)) {
            this.#filteredMembers = this.#memberCollection.getAll();
        }
        const totalMembers = this.#filteredMembers.length;
        const useLazy = this.#shouldUseLazyRendering();

        if (useLazy) {
            this.#renderLazy(totalMembers);
        } else {
            this.#renderAll();
        }

        this.#updateResultCounter();
        this.#updateFilterChips();
    }

    #renderAll() {
        if (this.#isLazyRendering) {
            this.#teardownLazyRendering();
        }
        const directory = this.#registry.directory;
        const members = this.#filteredMembers;
        directory.setAttribute('role', 'list');
        directory.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (const member of members) {
            const element = member.element.cloneNode(true);
            element.hidden = false;
            element.removeAttribute('data-hidden');
            element.setAttribute('role', 'listitem');
            fragment.appendChild(element);
        }
        directory.appendChild(fragment);
        this.#visibleMembers = [...members];
    }

    #renderLazy(totalMembers) {
        const directory = this.#registry.directory;
        directory.setAttribute('role', 'list');
        if (!this.#isLazyRendering) {
            this.#setupLazyRendering();
        }
        const renderedElements = directory.querySelectorAll('[data-member]');
        if (renderedElements.length === 0 && totalMembers > 0) {
            this.#renderMemberBatch(0, Math.min(this.#batchSize, totalMembers));
        }
    }

    #renderMemberBatch(startIndex, endIndex) {
        if (this.#isRendering) return;
        this.#isRendering = true;
        try {
            const directory = this.#registry.directory;
            const members = this.#filteredMembers;

            if (startIndex < 0) startIndex = 0;
            if (endIndex > members.length) endIndex = members.length;
            if (startIndex >= endIndex) {
                this.#isRendering = false;
                return;
            }

            const renderedElements = directory.querySelectorAll('[data-member]');
            const renderedIds = new Set();
            for (const el of renderedElements) {
                const member = el._atlasMember;
                if (member) {
                    renderedIds.add(member.id);
                }
            }

            const shouldRenderIds = new Set();
            for (let i = startIndex; i < endIndex; i++) {
                shouldRenderIds.add(members[i].id);
            }

            for (const el of renderedElements) {
                const member = el._atlasMember;
                if (member && !shouldRenderIds.has(member.id)) {
                    el.remove();
                    renderedIds.delete(member.id);
                }
            }

            const fragment = document.createDocumentFragment();
            let inserted = 0;

            for (let i = startIndex; i < endIndex; i++) {
                const member = members[i];
                if (!renderedIds.has(member.id)) {
                    const element = member.element.cloneNode(true);
                    element.hidden = false;
                    element.removeAttribute('data-hidden');
                    element._atlasMember = member;
                    element.setAttribute('role', 'listitem');
                    fragment.appendChild(element);
                    inserted++;
                }
            }

            if (inserted > 0) {
                const allRendered = directory.querySelectorAll('[data-member]');
                if (allRendered.length === 0) {
                    const sentinelBottom = directory.querySelector('.atlas-sentinel-bottom');
                    if (sentinelBottom) {
                        directory.insertBefore(fragment, sentinelBottom);
                    } else {
                        directory.appendChild(fragment);
                    }
                } else {
                    let insertBefore = null;
                    for (const el of allRendered) {
                        const member = el._atlasMember;
                        if (member) {
                            const memberIndex = members.findIndex(m => m.id === member.id);
                            if (memberIndex >= endIndex) {
                                insertBefore = el;
                                break;
                            }
                        }
                    }
                    if (insertBefore) {
                        directory.insertBefore(fragment, insertBefore);
                    } else {
                        const sentinelBottom = directory.querySelector('.atlas-sentinel-bottom');
                        if (sentinelBottom) {
                            directory.insertBefore(fragment, sentinelBottom);
                        } else {
                            directory.appendChild(fragment);
                        }
                    }
                }
            }

            this.#visibleMembers = [];
            const finalRendered = directory.querySelectorAll('[data-member]');
            for (const el of finalRendered) {
                const member = el._atlasMember;
                if (member) {
                    this.#visibleMembers.push(member);
                }
            }
        } finally {
            this.#isRendering = false;
        }
    }

    #setupLazyRendering() {
        if (this.#observer) {
            this.#teardownLazyRendering();
        }
        this.#isLazyRendering = true;
        const directory = this.#registry.directory;

        this.#sentinelTop = document.createElement('div');
        this.#sentinelTop.className = 'atlas-sentinel atlas-sentinel-top';
        this.#sentinelTop.style.height = '1px';
        this.#sentinelTop.style.width = '100%';
        this.#sentinelTop.style.visibility = 'hidden';
        this.#sentinelTop.style.pointerEvents = 'none';

        this.#sentinelBottom = document.createElement('div');
        this.#sentinelBottom.className = 'atlas-sentinel atlas-sentinel-bottom';
        this.#sentinelBottom.style.height = '1px';
        this.#sentinelBottom.style.width = '100%';
        this.#sentinelBottom.style.visibility = 'hidden';
        this.#sentinelBottom.style.pointerEvents = 'none';

        directory.prepend(this.#sentinelTop);
        directory.appendChild(this.#sentinelBottom);

        this.#observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.#handleSentinelIntersection(entry.target);
                }
            }
        }, {
            root: directory,
            rootMargin: '300px 0px 300px 0px',
            threshold: 0.01
        });

        this.#observer.observe(this.#sentinelTop);
        this.#observer.observe(this.#sentinelBottom);

        this.#containerScrollHandler = this.#handleScroll.bind(this);
        directory.addEventListener('scroll', this.#containerScrollHandler);

        const totalMembers = this.#filteredMembers.length;
        if (totalMembers > 0) {
            this.#renderMemberBatch(0, Math.min(this.#batchSize, totalMembers));
        }
    }

    #handleSentinelIntersection(sentinel) {
        if (this.#isRendering) return;
        const members = this.#filteredMembers;
        const directory = this.#registry.directory;
        const rendered = directory.querySelectorAll('[data-member]');

        if (sentinel === this.#sentinelTop) {
            let firstRendered = null;
            for (const el of rendered) {
                if (el._atlasMember) {
                    firstRendered = el._atlasMember;
                    break;
                }
            }
            if (firstRendered) {
                const firstIndex = members.findIndex(m => m.id === firstRendered.id);
                if (firstIndex > 0) {
                    const startIndex = Math.max(0, firstIndex - this.#batchSize);
                    const endIndex = firstIndex;
                    this.#renderMemberBatch(startIndex, endIndex);
                }
            }
        } else if (sentinel === this.#sentinelBottom) {
            let lastRendered = null;
            const renderedList = directory.querySelectorAll('[data-member]');
            for (let i = renderedList.length - 1; i >= 0; i--) {
                if (renderedList[i]._atlasMember) {
                    lastRendered = renderedList[i]._atlasMember;
                    break;
                }
            }
            if (lastRendered) {
                const lastIndex = members.findIndex(m => m.id === lastRendered.id);
                if (lastIndex < members.length - 1 && lastIndex >= 0) {
                    const startIndex = lastIndex + 1;
                    const endIndex = Math.min(startIndex + this.#batchSize, members.length);
                    if (startIndex < members.length) {
                        this.#renderMemberBatch(startIndex, endIndex);
                    }
                }
            }
        }
    }

    #handleScroll() {
        if (this.#scrollTimeout) {
            clearTimeout(this.#scrollTimeout);
        }
        this.#scrollTimeout = setTimeout(() => {
            const directory = this.#registry.directory;
            const scrollTop = directory.scrollTop;
            const scrollHeight = directory.scrollHeight;
            const clientHeight = directory.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 500) {
                const members = this.#filteredMembers;
                const rendered = directory.querySelectorAll('[data-member]');
                const currentCount = rendered.length;
                if (currentCount < members.length && currentCount > 0) {
                    let lastRendered = null;
                    for (let i = rendered.length - 1; i >= 0; i--) {
                        if (rendered[i]._atlasMember) {
                            lastRendered = rendered[i]._atlasMember;
                            break;
                        }
                    }
                    if (lastRendered) {
                        const lastIndex = members.findIndex(m => m.id === lastRendered.id);
                        if (lastIndex < members.length - 1 && lastIndex >= 0) {
                            const startIndex = lastIndex + 1;
                            const endIndex = Math.min(startIndex + this.#batchSize, members.length);
                            if (startIndex < members.length) {
                                this.#renderMemberBatch(startIndex, endIndex);
                            }
                        }
                    }
                }
            }

            if (scrollTop < 500) {
                const members = this.#filteredMembers;
                const rendered = directory.querySelectorAll('[data-member]');
                if (rendered.length > 0) {
                    let firstRendered = null;
                    for (const el of rendered) {
                        if (el._atlasMember) {
                            firstRendered = el._atlasMember;
                            break;
                        }
                    }
                    if (firstRendered) {
                        const firstIndex = members.findIndex(m => m.id === firstRendered.id);
                        if (firstIndex > 0) {
                            const startIndex = Math.max(0, firstIndex - this.#batchSize);
                            const endIndex = firstIndex;
                            this.#renderMemberBatch(startIndex, endIndex);
                        }
                    }
                }
            }
            this.#scrollTimeout = null;
        }, 100);
    }

    #teardownLazyRendering() {
        this.#isLazyRendering = false;
        if (this.#observer) {
            this.#observer.disconnect();
            this.#observer = null;
        }
        if (this.#sentinelTop) {
            this.#sentinelTop.remove();
            this.#sentinelTop = null;
        }
        if (this.#sentinelBottom) {
            this.#sentinelBottom.remove();
            this.#sentinelBottom = null;
        }
        if (this.#containerScrollHandler) {
            const directory = this.#registry.directory;
            directory.removeEventListener('scroll', this.#containerScrollHandler);
            this.#containerScrollHandler = null;
        }
        if (this.#scrollTimeout) {
            clearTimeout(this.#scrollTimeout);
            this.#scrollTimeout = null;
        }
    }

    get filteredMembers() {
        return [...this.#filteredMembers];
    }
    get visibleCount() {
        return this.#visibleMembers ? this.#visibleMembers.length : 0;
    }
    get totalCount() {
        return this.#memberCollection.size;
    }
    get isLazyRendering() {
        return this.#isLazyRendering;
    }

    #updateResultCounter() {
        const container = this.#registry.resultsContainer;
        if (!container) return;
        const total = this.#memberCollection.size;
        const visible = this.#visibleMembers.length;
        container.innerHTML = '';
        const counter = document.createElement('span');
        counter.className = 'atlas-result-counter';
        if (visible === total) {
            counter.textContent = `Showing all ${total} members`;
        } else {
            counter.textContent = `Showing ${visible} of ${total} members`;
        }
        container.appendChild(counter);
    }

    #updateFilterChips() {}

    destroy() {
        if (this.#isLazyRendering) {
            this.#teardownLazyRendering();
        }
        this.#pendingRender = null;
    }
}

// FilterGenerator Module
class FilterGenerator {
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

    constructor(container, memberCollection, store, events) {
        if (!container) throw new Error('FilterGenerator requires a container element');
        if (!memberCollection) throw new Error('FilterGenerator requires a MemberCollection');
        if (!store) throw new Error('FilterGenerator requires a Store');
        if (!events) throw new Error('FilterGenerator requires an EventBus');

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        this.#readDisplayOptions();
        this.#generate();
        this.#events.subscribe('store:filtersChanged', () => {
            this.syncWithStore();
        });
    }

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

    #getDisplayType(fieldName) {
        if (this.#displayOptions.radio.includes(fieldName)) return 'radio';
        if (this.#displayOptions.checkboxes.includes(fieldName)) return 'checkboxes';
        if (this.#displayOptions.buttons.includes(fieldName)) return 'buttons';
        if (this.#displayOptions.dropdown.includes(fieldName)) return 'dropdown';
        return 'buttons';
    }

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

    #generate() {
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

    #createFilterForField(fieldName, displayType) {
        const rawValues = this.#memberCollection.getUniqueValues(fieldName);
        if (rawValues.length === 0) return;

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
        if (sortedKeys.length === 0) return;

        const group = document.createElement('div');
        group.dataset.filter = '';
        group.dataset.field = fieldName;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', `Filter by ${fieldName}`);

        const label = document.createElement('label');
        label.textContent = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        group.appendChild(label);

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

    #handleValueSelect(fieldName, value) {
        if (this.#store.isFilterActive(fieldName, value)) return;
        this.#store.toggleFilter(fieldName, value);
        this.#updateAllButtonState(fieldName);
    }

    #updateAllButtonState(fieldName) {
        const fieldData = this.#fieldFilterMap.get(fieldName);
        if (!fieldData || fieldData.type !== 'buttons') return;
        const hasActiveFilters = this.#store.hasFieldFilters(fieldName);
        if (hasActiveFilters) {
            fieldData.allButton.classList.remove('active');
            fieldData.allButton.setAttribute('aria-pressed', 'false');
        } else {
            fieldData.allButton.classList.add('active');
            fieldData.allButton.setAttribute('aria-pressed', 'true');
        }
    }

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

    get container() { return this.#container; }
    get fieldFilterMap() { return this.#fieldFilterMap; }
    refresh() { this.#generate(); }
}

// FilterChips Module
class FilterChips {
    #container;
    #store;
    #fieldFilterMap;
    #events;

    constructor(container, store, fieldFilterMap, events) {
        if (!container) throw new Error('FilterChips requires a container element');
        if (!store) throw new Error('FilterChips requires a Store');
        if (!fieldFilterMap) throw new Error('FilterChips requires a fieldFilterMap');
        if (!events) throw new Error('FilterChips requires an EventBus');

        this.#container = container;
        this.#store = store;
        this.#fieldFilterMap = fieldFilterMap;
        this.#events = events;

        this.#container.setAttribute('role', 'toolbar');
        this.#container.setAttribute('aria-label', 'Active filters');

        this.render();
        this.#events.subscribe('store:filtersChanged', () => {
            this.render();
        });
    }

    #getFieldLabel(fieldName) {
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }

    render() {
        this.#container.innerHTML = '';
        const filters = this.#store.filters;
        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        if (activeFields.length === 0) {
            const message = document.createElement('span');
            message.className = 'atlas-chips-empty';
            message.textContent = 'No active filters';
            message.setAttribute('aria-live', 'polite');
            this.#container.appendChild(message);
            return;
        }

        const sortedFieldNames = activeFields.sort();
        for (const fieldName of sortedFieldNames) {
            const values = filters[fieldName];
            const fieldInfo = this.#fieldFilterMap.get(fieldName);
            if (!fieldInfo) continue;

            const displayMap = fieldInfo.displayMap || new Map();

            for (const value of values) {
                const displayValue = displayMap.get(value) || value;

                const chip = document.createElement('span');
                chip.className = 'atlas-chip';
                chip.dataset.field = fieldName;
                chip.dataset.value = value;
                chip.setAttribute('role', 'button');
                chip.setAttribute('tabindex', '0');
                chip.setAttribute('aria-label', `Remove ${fieldName} filter: ${displayValue}`);

                const text = document.createElement('span');
                text.className = 'atlas-chip-text';
                const displayLabel = this.#getFieldLabel(fieldName);
                text.textContent = `${displayLabel}: ${displayValue}`;
                chip.appendChild(text);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'atlas-chip-remove';
                removeBtn.textContent = '×';
                removeBtn.type = 'button';
                removeBtn.setAttribute('aria-label', `Remove ${displayValue} filter`);
                removeBtn.setAttribute('tabindex', '-1');

                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.#removeFilter(fieldName, value);
                });

                chip.appendChild(removeBtn);

                chip.addEventListener('click', () => {
                    this.#removeFilter(fieldName, value);
                });

                chip.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.#removeFilter(fieldName, value);
                    }
                });

                this.#container.appendChild(chip);
            }
        }

        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'atlas-clear-all';
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.type = 'button';
        clearAllBtn.setAttribute('aria-label', 'Clear all active filters');

        clearAllBtn.addEventListener('click', () => {
            this.#clearAllFilters();
        });

        clearAllBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.#clearAllFilters();
            }
        });

        this.#container.appendChild(clearAllBtn);

        const chipCount = this.#container.querySelectorAll('.atlas-chip').length;
        this.#container.setAttribute('aria-label', `${chipCount} active filters`);
    }

    #removeFilter(fieldName, value) {
        const isActive = this.#store.isFilterActive(fieldName, value);
        if (isActive) {
            this.#store.toggleFilter(fieldName, value);
            this.#updateFilterGeneratorUI(fieldName);
            this.render();
            this.#container.focus();
        }
    }

    #clearAllFilters() {
        this.#store.clearAllFilters();
        for (const [fieldName] of this.#fieldFilterMap) {
            this.#updateFilterGeneratorUI(fieldName);
        }
        this.render();
    }

    #updateFilterGeneratorUI(fieldName) {
        const fieldInfo = this.#fieldFilterMap.get(fieldName);
        if (!fieldInfo) return;

        const activeValues = this.#store.filters[fieldName] || [];

        switch (fieldInfo.type) {
            case 'buttons':
                const allButton = fieldInfo.allButton;
                if (allButton) {
                    const hasActiveFilters = this.#store.hasFieldFilters(fieldName);
                    if (hasActiveFilters) {
                        allButton.classList.remove('active');
                        allButton.setAttribute('aria-pressed', 'false');
                    } else {
                        allButton.classList.add('active');
                        allButton.setAttribute('aria-pressed', 'true');
                    }
                }
                for (const button of fieldInfo.valueButtons || []) {
                    if (activeValues.includes(button.dataset.value)) {
                        button.classList.add('active');
                        button.setAttribute('aria-pressed', 'true');
                    } else {
                        button.classList.remove('active');
                        button.setAttribute('aria-pressed', 'false');
                    }
                }
                break;

            case 'dropdown':
                if (fieldInfo.element && fieldInfo.element.tagName === 'SELECT') {
                    if (activeValues.length > 0) {
                        fieldInfo.element.value = activeValues[0];
                    } else {
                        fieldInfo.element.value = 'all';
                    }
                }
                break;

            case 'checkboxes':
                for (const cb of fieldInfo.valueCheckboxes || []) {
                    cb.checked = activeValues.includes(cb.value);
                }
                if (fieldInfo.allCheckbox) {
                    fieldInfo.allCheckbox.checked = activeValues.length === 0;
                }
                break;

            case 'radio':
                const radios = fieldInfo.element ? fieldInfo.element.querySelectorAll('input[type="radio"]') : [];
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

    get container() { return this.#container; }
}

// ResultCounter Module
class ResultCounter {
    #container;
    #memberCollection;
    #store;
    #events;

    constructor(container, memberCollection, store, events) {
        if (!container) throw new Error('ResultCounter requires a container element');
        if (!memberCollection) throw new Error('ResultCounter requires a MemberCollection');
        if (!store) throw new Error('ResultCounter requires a Store');
        if (!events) throw new Error('ResultCounter requires an EventBus');

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        this.#container.setAttribute('role', 'status');
        this.#container.setAttribute('aria-live', 'polite');
        this.#container.setAttribute('aria-atomic', 'true');

        this.render();
        this.#events.subscribe('store:filtersChanged', () => {
            this.render();
        });
        this.#events.subscribe('store:searchChanged', () => {
            this.render();
        });
        this.#events.subscribe('store:sortChanged', () => {
            this.render();
        });
    }

    render() {
        const total = this.#memberCollection.size;
        const filters = this.#store.filters;
        const searchQuery = this.#store.search;
        const hasFilters = Object.keys(filters).length > 0;
        const hasSearch = searchQuery && searchQuery.trim();

        let visible = total;

        if (hasFilters || hasSearch) {
            let filtered = this.#memberCollection.getAll();
            if (hasFilters) {
                filtered = this.#memberCollection.applyFilters(filters);
            }
            if (hasSearch) {
                const searchResults = [];
                const query = searchQuery.trim().toLowerCase();
                for (const member of filtered) {
                    if (member.matches(query)) {
                        searchResults.push(member);
                    }
                }
                filtered = searchResults;
            }
            visible = filtered.size !== undefined ? filtered.size : filtered.length;
        }

        this.#container.innerHTML = '';
        const counter = document.createElement('span');
        counter.className = 'atlas-result-counter';

        if (visible === total) {
            counter.textContent = `Showing all ${total} members`;
        } else {
            counter.textContent = `Showing ${visible} of ${total} members`;
        }

        this.#container.appendChild(counter);
    }

    get container() { return this.#container; }
}

// SortGenerator Module
class SortGenerator {
    #container;
    #memberCollection;
    #store;
    #events;

    constructor(container, memberCollection, store, events) {
        if (!container) throw new Error('SortGenerator requires a container element');
        if (!memberCollection) throw new Error('SortGenerator requires a MemberCollection');
        if (!store) throw new Error('SortGenerator requires a Store');
        if (!events) throw new Error('SortGenerator requires an EventBus');

        this.#container = container;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        this.#container.setAttribute('role', 'toolbar');
        this.#container.setAttribute('aria-label', 'Sort controls');

        this.#generate();
        this.#events.subscribe('store:sortChanged', () => {
            this.#updateUI();
        });
    }

    #generate() {
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
        this.#updateUI();
    }

    #createSortButton(fieldName) {
        const button = document.createElement('button');
        button.dataset.sort = fieldName;
        button.type = 'button';
        button.setAttribute('role', 'button');
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `Sort by ${fieldName}`);

        const label = fieldName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        button.textContent = label;

        button.addEventListener('click', () => {
            this.#handleSortClick(fieldName);
        });

        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.#handleSortClick(fieldName);
            }
        });

        this.#container.appendChild(button);
    }

    #handleSortClick(field) {
        const currentSort = this.#store.sort;
        if (currentSort && currentSort.field === field) {
            if (currentSort.direction === 'asc') {
                this.#store.setSort(field, 'desc');
            } else if (currentSort.direction === 'desc') {
                this.#store.setSort(null, null);
            }
        } else {
            this.#store.setSort(field, 'asc');
        }
        this.#updateUI();
    }

    #updateUI() {
        const buttons = this.#container.querySelectorAll('[data-sort]');
        const currentSort = this.#store.sort;

        for (const button of buttons) {
            const field = button.dataset.sort;
            button.classList.remove('active', 'asc', 'desc');
            button.setAttribute('aria-pressed', 'false');

            const originalText = button.textContent.replace(/[↑↓]/g, '').trim();
            button.textContent = originalText;
            button.setAttribute('aria-label', `Sort by ${field}`);

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

    get container() { return this.#container; }

    refresh() { this.#generate(); }
}

// LayoutManager Module
class LayoutManager {
    #container;
    #directory;
    #store;
    #events;
    #buttons = [];
    #currentLayout = 'grid';
    #storageKey = 'atlas-layout';

    constructor(container, directory, store, events) {
        if (!container) throw new Error('LayoutManager requires a container element');
        if (!directory) throw new Error('LayoutManager requires a directory element');
        if (!store) throw new Error('LayoutManager requires a Store');
        if (!events) throw new Error('LayoutManager requires an EventBus');

        this.#container = container;
        this.#directory = directory;
        this.#store = store;
        this.#events = events;

        this.#discoverButtons();

        const savedLayout = this.#loadState();
        this.#currentLayout = savedLayout || 'grid';

        this.#store.setLayout(this.#currentLayout);
        this.#applyLayout();
        this.#updateUI();

        this.#events.subscribe('store:layoutChanged', (data) => {
            if (data && data.layout) {
                this.#currentLayout = data.layout;
                this.#applyLayout();
                this.#updateUI();
            }
        });
    }

    #discoverButtons() {
        const buttons = this.#container.querySelectorAll('[data-layout]');
        for (const button of buttons) {
            const layout = button.dataset.layout;
            if (layout !== 'grid' && layout !== 'list') {
                console.warn(`LayoutManager: Invalid layout value "${layout}" on button, skipping`);
                continue;
            }
            this.#buttons.push(button);
            button.addEventListener('click', () => {
                this.#handleLayoutClick(layout);
            });
        }

        if (this.#buttons.length === 0) {
            if (this.#container.closest('[data-atlas]')) {
                console.warn('LayoutManager: No [data-layout] buttons found');
            }
        }
    }

    #handleLayoutClick(layout) {
        if (this.#currentLayout === layout) return;
        this.#currentLayout = layout;
        this.#store.setLayout(layout);
        this.#saveState();
        this.#applyLayout();
        this.#updateUI();
    }

    #applyLayout() {
        this.#directory.classList.remove('atlas-layout-grid', 'atlas-layout-list');
        this.#directory.classList.add(`atlas-layout-${this.#currentLayout}`);
    }

    #updateUI() {
        for (const button of this.#buttons) {
            const layout = button.dataset.layout;
            if (layout === this.#currentLayout) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }

    #saveState() {
        try {
            localStorage.setItem(this.#storageKey, this.#currentLayout);
        } catch (error) {
            console.warn('LayoutManager: Failed to save layout to localStorage:', error);
        }
    }

    #loadState() {
        try {
            const saved = localStorage.getItem(this.#storageKey);
            if (saved === 'grid' || saved === 'list') {
                return saved;
            }
        } catch (error) {
            console.warn('LayoutManager: Failed to load layout from localStorage:', error);
        }
        return null;
    }

    get layout() { return this.#currentLayout; }
    get directory() { return this.#directory; }
}

// Main Atlas Class
class Atlas {
    #registry = null;
    #memberCollection = null;
    #store = null;
    #events = null;
    #renderer = null;
    #urlManager = null;
    #modules = {};

    constructor(options = {}) {
        this.options = {
            root: '[data-atlas]',
            debug: false,
            showCredit: true,
            ...options
        };
        this.root = this.#findRoot();

        JCinkAdapter.apply();
        this.#initialise();
    }

    #findRoot() {
        const root = document.querySelector(this.options.root);
        if (!root) {
            throw new Error(`Atlas could not find "${this.options.root}".`);
        }
        return root;
    }

    #initialise() {
        this.#events = new EventBus({
            debug: this.options.debug
        });
        this.#registry = new Registry(this.root);
        this.#memberCollection = this.#createMemberCollection();
        this.#store = new Store({
            events: this.#events,
            initialState: {
                layout: this.#loadLayout()
            }
        });
        this.#renderer = new Renderer({
            registry: this.#registry,
            memberCollection: this.#memberCollection,
            store: this.#store,
            events: this.#events
        });
        this.#urlManager = new URLManager({
            store: this.#store,
            events: this.#events
        });
        this.#createModules();
        if (this.options.showCredit) {
            this.#addCreditLine();
        }
        this.#debug();
        this.#consoleCredit();
    }

    #createMemberCollection() {
        const memberElements = this.#registry.members;
        const members = memberElements.map((element, index) => {
            return new Member(element, index);
        });
        return new MemberCollection(members);
    }

    #loadLayout() {
        try {
            const saved = localStorage.getItem('atlas-layout');
            if (saved === 'grid' || saved === 'list') {
                return saved;
            }
        } catch (error) {}
        return 'grid';
    }

    #createModules() {
        const filtersContainer = this.#registry.filtersContainer;
        if (filtersContainer) {
            this.#modules.filterGenerator = new FilterGenerator(
                filtersContainer,
                this.#memberCollection,
                this.#store,
                this.#events
            );
        } else if (this.options.debug) {
            console.warn('Atlas: No [data-filters] container found. Filters will not be displayed.');
        }

        const chipsContainer = this.#registry.chipsContainer;
        if (chipsContainer) {
            const fieldFilterMap = this.#modules.filterGenerator
                ? this.#modules.filterGenerator.fieldFilterMap
                : new Map();
            this.#modules.filterChips = new FilterChips(
                chipsContainer,
                this.#store,
                fieldFilterMap,
                this.#events
            );
        } else if (this.options.debug) {
            console.warn('Atlas: No [data-chips] container found. Filter chips will not be displayed.');
        }

        const resultsContainer = this.#registry.resultsContainer;
        if (resultsContainer) {
            this.#modules.resultCounter = new ResultCounter(
                resultsContainer,
                this.#memberCollection,
                this.#store,
                this.#events
            );
        } else if (this.options.debug) {
            console.warn('Atlas: No [data-results] container found. Result counter will not be displayed.');
        }

        const sortContainer = this.#findSortContainer();
        if (sortContainer) {
            this.#modules.sortGenerator = new SortGenerator(
                sortContainer,
                this.#memberCollection,
                this.#store,
                this.#events
            );
        } else if (this.options.debug) {
            console.warn('Atlas: No [data-sort] container found. Sort controls will not be displayed.');
        }

        const directory = this.#registry.directory;
        if (directory) {
            this.#modules.layoutManager = new LayoutManager(
                this.root,
                directory,
                this.#store,
                this.#events
            );
        } else if (this.options.debug) {
            console.warn('Atlas: No directory found. Layout switching will not be available.');
        }

        const searchInput = this.root.querySelector('[data-search]');
        if (searchInput) {
            if (!searchInput.hasAttribute('aria-label') && !searchInput.hasAttribute('aria-labelledby')) {
                searchInput.setAttribute('aria-label', 'Search members');
            }
            searchInput.addEventListener('input', (event) => {
                this.#store.setSearch(event.target.value);
            });
        } else if (this.options.debug) {
            console.warn('Atlas: No [data-search] input found. Search will not be available.');
        }
    }

    #findSortContainer() {
        const container = this.#registry.controls.sorts[0];
        if (container) return container;
        const fallback = this.root.querySelector('[data-sort]');
        return fallback || null;
    }

    #addCreditLine() {
        if (document.querySelector('.atlas-credit')) return;

        const style = document.createElement('style');
        style.textContent = `
            .atlas-credit {
                text-align: center;
                font-size: 0.8rem;
                color: currentColor;
                opacity: 0.7;
                padding: 1rem 0;
                margin-top: 2rem;
                border-top: 1px solid currentColor;
                border-top-color: rgba(128,128,128,0.2);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .atlas-credit a {
                color: currentColor;
                text-decoration: underline;
                text-underline-offset: 2px;
                text-decoration-thickness: 1px;
                text-decoration-color: rgba(128,128,128,0.3);
            }
            .atlas-credit a:hover {
                opacity: 0.7;
                text-decoration-color: currentColor;
            }
            .atlas-credit strong {
                color: currentColor;
                font-weight: 700;
            }
            .atlas-credit .divider {
                margin: 0 0.5rem;
                opacity: 0.3;
            }
            @media (prefers-color-scheme: dark) {
                .atlas-credit {
                    border-top-color: rgba(255,255,255,0.12);
                }
                .atlas-credit a {
                    text-decoration-color: rgba(255,255,255,0.2);
                }
            }
        `;
        document.head.appendChild(style);

        requestAnimationFrame(() => {
            const credit = document.createElement('div');
            credit.className = 'atlas-credit';
            credit.innerHTML = `
                <span>⚡ Powered by <a href="https://jcinkdirectoryframework.github.io/atlas-directory/" target="_blank">Atlas</a></span>
                <span class="divider">·</span>
                <span>Built by <strong>Maeve</strong> ❤️ for the JCink community</span>
            `;

            const atlasRoot = document.querySelector('[data-atlas]');
            if (atlasRoot) {
                atlasRoot.appendChild(credit);
            } else {
                document.body.appendChild(credit);
            }
        });
    }

    #consoleCredit() {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.log(
            '%c⚡ Atlas %c A dependency-free, HTML-driven directory engine',
            'background:#dc2626; color:white; padding:4px 8px; border-radius:4px 0 0 4px; font-weight:bold;',
            isDark ? 'background:#2d3748; color:#e2e8f0; padding:4px 8px; border-radius:0 4px 4px 0;' : 'background:#1a1a2e; color:#e2e8f0; padding:4px 8px; border-radius:0 4px 4px 0;'
        );
        console.log('  🔗 https://jcinkdirectoryframework.github.io/atlas-directory/');
        console.log('  ❤️ Built by Maeve for the JCink community');
    }

    #debug() {
        if (!this.options.debug) return;
        console.group('Atlas');
        console.info(`Members: ${this.#registry.members.length}`);
        console.info(`Member fields: ${this.#memberCollection.getAllFieldNames().join(', ') || '(none)'}`);
        console.info(`Filterable fields: ${this.#memberCollection.getFilterableFields().join(', ') || '(none)'}`);
        console.info(`Sortable fields: ${this.#memberCollection.getSortableFields().join(', ') || '(none)'}`);
        console.info(`Search controls: ${this.#registry.controls.search.length}`);
        console.info(`Filter containers: ${this.#registry.filtersContainer ? 1 : 0}`);
        console.info(`Chips container: ${this.#registry.chipsContainer ? 1 : 0}`);
        console.info(`Results container: ${this.#registry.resultsContainer ? 1 : 0}`);
        console.info(`Sort containers: ${this.#registry.controls.sorts.length}`);
        console.info(`Layout controls: ${this.#registry.controls.layouts.length}`);
        const layoutManager = this.#modules.layoutManager;
        if (layoutManager) {
            console.info(`Current layout: ${layoutManager.layout}`);
        }
        console.group('Member data');
        for (const member of this.#memberCollection) {
            console.log(`[${member.id}]`, member.toObject());
        }
        console.groupEnd();
        console.groupEnd();
    }

    get registry() { return this.#registry; }
    get memberCollection() { return this.#memberCollection; }
    get store() { return this.#store; }
    get events() { return this.#events; }
    get renderer() { return this.#renderer; }
    get urlManager() { return this.#urlManager; }
    get modules() { return { ...this.#modules }; }
}

// ─── Exports ──────────────────────────────────────────

// Default export — the main Atlas class
export default Atlas;

// Named exports for advanced use
export {
    Member,
    MemberCollection,
    Registry,
    EventBus,
    Store,
    Renderer,
    URLManager,
    JCinkAdapter,
    FilterGenerator,
    FilterChips,
    ResultCounter,
    SortGenerator,
    LayoutManager
};
