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
import SortGenerator from "../modules/SortGenerator.js";
import LayoutManager from "../modules/LayoutManager.js";
import Renderer from "./Renderer.js";

export default class Atlas {

    #registry = null;
    #memberCollection = null;
    #store = null;
    #filterGenerator = null;
    #filterChips = null;
    #resultCounter = null;
    #sortGenerator = null;
    #layoutManager = null;
    #renderer = null;
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

        this.#createSortGenerator();

        this.#createLayoutManager();

        this.#createRenderer();

        this.#applyFiltersAndSearch();

        this.#ready();

    }

    /**
     * Bind global event listeners.
     */
    #bindEvents() {

        // Listen for filter changes
        document.addEventListener('atlas:filtersChanged', () => {
            this.#applyFiltersAndSearch();
            this.#updateMemberVisibility();
        });

        // Listen for sort changes
        document.addEventListener('atlas:sortChanged', () => {
            this.#applyFiltersAndSearch();
            this.#updateMemberVisibility();
        });

        // Listen for search input
        const searchInput = this.root.querySelector('[data-search]');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.#store.setSearch(event.target.value);
                this.#applyFiltersAndSearch();
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
     * Create the SortGenerator.
     */
    #createSortGenerator() {

        const container = this.#findSortContainer();

        if (!container) {
            if (this.options.debug) {
                console.warn('Atlas: No [data-sort] container found. Sort controls will not be displayed.');
            }
            return;
        }

        this.#sortGenerator = new SortGenerator(
            container,
            this.#memberCollection,
            this.#store
        );

    }

    /**
     * Create the LayoutManager.
     */
    #createLayoutManager() {

        const directory = this.#registry.directory;

        if (!directory) {
            if (this.options.debug) {
                console.warn('Atlas: No directory found. Layout switching will not be available.');
            }
            return;
        }

        this.#layoutManager = new LayoutManager(
            this.root,
            directory,
            this.#store
        );

    }

    /**
     * Create the Renderer.
     */
    #createRenderer() {

        const directory = this.#registry.directory;

        if (!directory) {
            if (this.options.debug) {
                console.warn('Atlas: No directory found. Renderer will not be available.');
            }
            return;
        }

        this.#renderer = new Renderer(directory);

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
     * Find the sort container.
     */
    #findSortContainer() {

        // Check Registry first (sorts is in controls)
        const container = this.#registry.controls.sorts[0];

        if (container) {
            return container;
        }

        // Fallback: direct query
        const fallback = this.root.querySelector('[data-sort]');

        if (fallback) {
            return fallback;
        }

        return null;

    }

    /**
     * Apply filters, search, and sort to the member collection.
     */
    #applyFiltersAndSearch() {

        const filters = this.#store.filters;
        const searchQuery = this.#store.search;
        const sort = this.#store.sort;

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

        // Apply sort if active
        if (sort && sort.field) {
            filtered = this.#sortMembers(filtered, sort.field, sort.direction);
        }

        // Always wrap in MemberCollection
        this.#filteredMembers = new MemberCollection(filtered);

    }

    /**
     * Sort an array of members by a field.
     */
    #sortMembers(members, field, direction) {

        const sorted = [...members];

        sorted.sort((a, b) => {
            const valA = a.get(field) || '';
            const valB = b.get(field) || '';

            // Case-insensitive comparison
            const compareResult = valA.localeCompare(valB, undefined, { sensitivity: 'base' });

            return direction === 'asc' ? compareResult : -compareResult;
        });

        return sorted;

    }

    /**
     * Update member visibility and order based on filter state.
     */
    #updateMemberVisibility() {

        // Defensive: ensure #filteredMembers is a MemberCollection
        if (!this.#filteredMembers || !(this.#filteredMembers instanceof MemberCollection)) {
            console.warn('Atlas: #filteredMembers is not a MemberCollection, re-applying filters');
            this.#applyFiltersAndSearch();
        }

        // Get the filtered members in the correct order
        const members = this.#filteredMembers.getAll();

        if (this.options.debug) {
            const visibleIds = members.map(m => m.id);
            console.debug('Filtered member IDs:', visibleIds);
        }

        // Use the Renderer to update the DOM efficiently
        if (this.#renderer) {
            this.#renderer.render(members);
        } else {
            // Fallback: direct DOM manipulation
            this.#updateMemberVisibilityFallback();
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
     * Fallback visibility update (if Renderer is not available).
     */
    #updateMemberVisibilityFallback() {

        const memberElements = this.#registry.members;
        const visibleIds = new Set(
            this.#filteredMembers.getAll().map(member => member.id)
        );

        for (const element of memberElements) {
            const member = element._atlasMember;
            if (!member) continue;
            const isVisible = visibleIds.has(member.id);
            if (isVisible) {
                element.hidden = false;
                element.removeAttribute('data-hidden');
            } else {
                element.hidden = true;
                element.setAttribute('data-hidden', 'true');
            }
        }

        // Fallback reordering
        this.#reorderMembersFallback();

    }

    /**
     * Fallback reordering (if Renderer is not available).
     */
    #reorderMembersFallback() {

        const directory = this.#registry.directory;
        const sortedMembers = this.#filteredMembers.getAll();

        // Get all current member elements
        const currentElements = directory.querySelectorAll('[data-member]');

        // Remove all members from the directory
        for (const element of currentElements) {
            element.remove();
        }

        // Re-append in sorted order (only visible members)
        for (const member of sortedMembers) {
            if (!member.element.hidden) {
                directory.appendChild(member.element);
            }
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
            `Sortable fields: ${this.#memberCollection.getSortableFields().join(', ') || '(none)'}`
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
            `Sort containers: ${this.#registry.controls.sorts.length}`
        );

        console.info(
            `Layout controls: ${this.#registry.controls.layouts.length}`
        );

        if (this.#layoutManager) {
            console.info(
                `Current layout: ${this.#layoutManager.layout}`
            );
        }

        console.info(
            `Renderer: ${this.#renderer ? 'Available' : 'Not available'}`
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

    /**
     * Access the SortGenerator.
     */
    get sortGenerator() {
        return this.#sortGenerator;
    }

    /**
     * Access the LayoutManager.
     */
    get layoutManager() {
        return this.#layoutManager;
    }

    /**
     * Access the Renderer.
     */
    get renderer() {
        return this.#renderer;
    }

}