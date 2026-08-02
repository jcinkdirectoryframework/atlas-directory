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

export default class Atlas {

    #registry = null;
    #memberCollection = null;
    #store = null;
    #filterGenerator = null;
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

        this.#applyFilters();

        this.#ready();

    }

    /**
     * Bind global event listeners.
     */
    #bindEvents() {

        document.addEventListener('atlas:filtersChanged', () => {
            this.#applyFilters();
            this.#updateMemberVisibility();
        });

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
     * Apply filters to the member collection.
     */
    #applyFilters() {

        const filters = this.#store.filters;

        this.#filteredMembers = this.#memberCollection.applyFilters(filters);

    }

     /**
     * Update member visibility based on filter state.
     */
    #updateMemberVisibility() {

        // Get all member elements from the Registry
        const memberElements = this.#registry.members;

        // Create a Set of member IDs that pass the filters
        const visibleIds = new Set(
            this.#filteredMembers.map(member => member.id)
        );

        // Toggle visibility for each member element
        for (const element of memberElements) {

            // Get the Member instance stored on the element
            const member = element._atlasMember;

            if (!member) {
                continue;
            }

            const isVisible = visibleIds.has(member.id);

            if (isVisible) {
                element.hidden = false;
                element.removeAttribute('data-hidden');
            } else {
                element.hidden = true;
                element.setAttribute('data-hidden', 'true');
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
            `Search controls: ${this.#registry.controls.search.length}`
        );

        console.info(
            `Filter containers: ${this.#registry.filtersContainer ? 1 : 0}`
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