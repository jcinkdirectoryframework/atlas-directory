/**
 * Atlas
 * A dependency-free, HTML-driven directory engine.
 *
 * Public entry point for the Atlas framework.
 *
 * Responsibilities:
 * - Initialise Atlas
 * - Coordinate core services
 * - Expose the public API
 *
 * Deliberately does NOT:
 * - Search
 * - Filter
 * - Render
 * - Parse members
 *
 * Those responsibilities belong to specialised classes.
 */

import Registry from "./Registry.js";
import Member from "./Member.js";
import MemberCollection from "./MemberCollection.js";
import Store from "./Store.js";
import FilterGenerator from "../modules/FilterGenerator.js";
import FilterChips from "../modules/FilterChips.js";
import ResultCounter from "../modules/ResultCounter.js";

export default class Atlas {

    #registry = null;
    #memberCollection = null;
    #store = null;
    #filterGenerator = null;
    #filterChips = null;
    #resultCounter = null;
    #filteredMembers = null;

    /**
     * Create a new Atlas instance.
     */
    constructor(options = {}) {

        this.options = this.#createOptions(options);

        this.root = this.#findRoot();

        this.#initialise();

        this.#bindEvents();

    }

    /**
     * Merge user options with defaults.
     */
    #createOptions(options) {

        return {

            root: '[data-atlas]',

            debug: false,

            ...options

        };

    }

    /**
     * Locate the Atlas root element.
     */
    #findRoot() {

        const root = document.querySelector(this.options.root);

        if (!root) {

            throw new Error(
                `Atlas could not find "${this.options.root}".`
            );

        }

        return root;

    }

    /**
     * Begin the Atlas lifecycle.
     */
    #initialise() {

        this.#createRegistry();

        this.#createMemberCollection();

        this.#createStore();

        this.#createFilterGenerator();

        this.#createFilterChips();

        this.#createResultCounter();

        this.#applyFilters();

        this.#ready();

    }

    /**
     * Bind global event listeners.
     */
    #bindEvents() {

        // Listen for filter changes
        document.addEventListener('atlas:filtersChanged', () => {
            this.#applyFilters();
            this.#updateMemberVisibility();
        });

        // Listen for search input
        const searchInput = this.root.querySelector('[data-search]');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.#store.setSearch(event.target.value);
                this.#applyFilters();
                this.#updateMemberVisibility();
            });
        }

    }

    /**
     * Create the Registry.
     */
    #createRegistry() {

        this.#registry = new Registry(this.root);

    }

    /**
     * Create the MemberCollection from discovered members.
     */
    #createMemberCollection() {

        const memberElements = this.#registry.members;

        const members = memberElements.map((element, index) => {
            return new Member(element, index);
        });

        this.#memberCollection = new MemberCollection(members);

    }

    /**
     * Create the Store.
     */
    #createStore() {

        this.#store = new Store();

    }

    /**
     * Create the FilterGenerator.
     */
    #createFilterGenerator() {

        const container = this.#findFilterContainer();

        this.#filterGenerator = new FilterGenerator(
            container,
            this.#memberCollection,
            this.#store
        );

    }

    /**
     * Create the FilterChips.
     */
    #createFilterChips() {

        const container = this.#findChipsContainer();

        if (!container) {
            if (this.options.debug) {
                console.warn('Atlas: No [data-chips] container found. Filter chips will not be displayed.');
            }
            return;
        }

        this.#filterChips = new FilterChips(
            container,
            this.#store,
            this.#filterGenerator.fieldFilterMap
        );

    }

    /**
     * Create the ResultCounter.
     */
    #createResultCounter() {

        const container = this.#findResultsContainer();

        if (!container) {
            if (this.options.debug) {
                console.warn('Atlas: No [data-results] container found. Result counter will not be displayed.');
            }
            return;
        }

        this.#resultCounter = new ResultCounter(
            container,
            this.#memberCollection,
            this.#store
        );

    }

    /**
     * Find the filters container.
     */
    #findFilterContainer() {

        // Check Registry first
        const container = this.#registry.filtersContainer;

        if (container) {
            return container;
        }

        // Fallback: direct query
        const fallback = this.root.querySelector('[data-filters]');

        if (fallback) {
            return fallback;
        }

        throw new Error(
            'Atlas requires a [data-filters] container for filter placement.'
        );

    }

    /**
     * Find the chips container.
     */
    #findChipsContainer() {

        const container = this.#registry.chipsContainer;

        if (container) {
            return container;
        }

        const fallback = this.root.querySelector('[data-chips]');

        if (fallback) {
            return fallback;
        }

        return null;

    }

    /**
     * Find the results container.
     */
    #findResultsContainer() {

        const container = this.#registry.resultsContainer;

        if (container) {
            return container;
        }

        const fallback = this.root.querySelector('[data-results]');

        if (fallback) {
            return fallback;
        }

        return null;

    }

    /**
     * Apply filters and search to the member collection.
     */
    #applyFilters() {

        const filters = this.#store.filters;
        const searchQuery = this.#store.search;

        // Start with all members
        let filtered = this.#memberCollection.getAll();

        // Apply filters if any are active
        const activeFilters = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        if (activeFilters.length > 0) {
            filtered = this.#memberCollection.applyFilters(filters);
        }

        // Apply search if query exists
        if (searchQuery && searchQuery.trim()) {
            const searchResults = [];
            for (const member of filtered) {
                if (member.matches(searchQuery)) {
                    searchResults.push(member);
                }
            }
            filtered = searchResults;
        }

        // Always wrap in MemberCollection
        this.#filteredMembers = new MemberCollection(filtered);

    }

    /**
     * Update member visibility based on filter state.
     */
    #updateMemberVisibility() {

        // Defensive: ensure #filteredMembers is a MemberCollection
        if (!this.#filteredMembers || !(this.#filteredMembers instanceof MemberCollection)) {
            console.warn('Atlas: #filteredMembers is not a MemberCollection, re-applying filters');
            this.#applyFilters();
        }

        // Get all member elements from the Registry
        const memberElements = this.#registry.members;

        // Create a Set of member IDs that pass the filters
        const visibleIds = new Set(
            this.#filteredMembers.getAll().map(member => member.id)
        );

        if (this.options.debug) {
            console.debug('Filtered member IDs:', [...visibleIds]);
        }

        // Toggle visibility for each member element
        for (const element of memberElements) {

            // Get the Member instance stored on the element
            const member = element._atlasMember;

            if (!member) {
                if (this.options.debug) {
                    console.warn('Member element has no _atlasMember reference:', element);
                }
                continue;
            }

            const isVisible = visibleIds.has(member.id);

            if (this.options.debug) {
                console.debug(`[${member.id}] visible: ${isVisible}`);
            }

            if (isVisible) {
                element.hidden = false;
                element.removeAttribute('data-hidden');
            } else {
                element.hidden = true;
                element.setAttribute('data-hidden', 'true');
            }

        }

        // Update result counter if it exists
        if (this.#resultCounter) {
            this.#resultCounter.render();
        }

        // Update filter chips if they exist
        if (this.#filterChips) {
            this.#filterChips.render();
        }

    }

    /**
     * Atlas is ready.
     */
    #ready() {

        if (!this.options.debug) {
            return;
        }

        console.group("Atlas");

        console.info(
            `Members: ${this.#registry.members.length}`
        );

        console.info(
            `Member fields: ${this.#memberCollection.getAllFieldNames().join(', ') || '(none)'}`
        );

        console.info(
            `Filterable fields: ${this.#memberCollection.getFilterableFields().join(', ') || '(none)'}`
        );

        console.info(
            `Search controls: ${this.#registry.controls.search.length}`
        );

        console.info(
            `Filter containers: ${this.#registry.filtersContainer ? 1 : 0}`
        );

        console.info(
            `Chips container: ${this.#registry.chipsContainer ? 1 : 0}`
        );

        console.info(
            `Results container: ${this.#registry.resultsContainer ? 1 : 0}`
        );

        console.info(
            `Layouts: ${this.#registry.controls.layouts.length}`
        );

        // Detailed member data for debugging
        console.group("Member data");

        for (const member of this.#memberCollection) {
            console.log(
                `[${member.id}]`,
                member.toObject()
            );
        }

        console.groupEnd();

        console.groupEnd();

    }

    /**
     * Access the Registry.
     */
    get registry() {
        return this.#registry;
    }

    /**
     * Access the MemberCollection.
     */
    get memberCollection() {
        return this.#memberCollection;
    }

    /**
     * Access the Store.
     */
    get store() {
        return this.#store;
    }

    /**
     * Access the FilterGenerator.
     */
    get filterGenerator() {
        return this.#filterGenerator;
    }

}