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
 * - Search, filter, sort, or render
 * - Parse members
 * - Manage state directly
 * - Update the DOM
 */

import Registry from "./Registry.js";
import Member from "./Member.js";
import MemberCollection from "./MemberCollection.js";
import Store from "./Store.js";
import EventBus from "./EventBus.js";
import Renderer from "./Renderer.js";
import FilterGenerator from "../modules/FilterGenerator.js";
import FilterChips from "../modules/FilterChips.js";
import ResultCounter from "../modules/ResultCounter.js";
import SortGenerator from "../modules/SortGenerator.js";
import LayoutManager from "../modules/LayoutManager.js";

export default class Atlas {

    #registry = null;
    #memberCollection = null;
    #store = null;
    #events = null;
    #renderer = null;
    #modules = {};

    /**
     * Create a new Atlas instance.
     *
     * @param {Object} options - Configuration options
     * @param {string} options.root - CSS selector for the Atlas root (default: '[data-atlas]')
     * @param {boolean} options.debug - Enable debug logging (default: false)
     */
    constructor(options = {}) {

        this.options = {
            root: '[data-atlas]',
            debug: false,
            ...options
        };

        this.root = this.#findRoot();
        this.#initialise();

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

        // 1. Create the event bus
        this.#events = new EventBus({
            debug: this.options.debug
        });

        // 2. Create the Registry (discovers the DOM)
        this.#registry = new Registry(this.root);

        // 3. Create the MemberCollection
        this.#memberCollection = this.#createMemberCollection();

        // 4. Create the Store
        this.#store = new Store({
            events: this.#events,
            initialState: {
                layout: this.#loadLayout()
            }
        });

        // 5. Create the Renderer (handles all DOM updates)
        this.#renderer = new Renderer({
            registry: this.#registry,
            memberCollection: this.#memberCollection,
            store: this.#store,
            events: this.#events
        });

        // 6. Create all modules
        this.#createModules();

        // 7. Debug output (if enabled)
        this.#debug();

    }

    /**
     * Create the MemberCollection from discovered members.
     */
    #createMemberCollection() {

        const memberElements = this.#registry.members;

        const members = memberElements.map((element, index) => {
            return new Member(element, index);
        });

        return new MemberCollection(members);

    }

    /**
     * Load saved layout from localStorage.
     */
    #loadLayout() {

        try {
            const saved = localStorage.getItem('atlas-layout');
            if (saved === 'grid' || saved === 'list') {
                return saved;
            }
        } catch (error) {
            // Silently fail
        }

        return 'grid';

    }

    /**
     * Create all modules.
     */
    #createModules() {

        // Filter Generator
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

        // Filter Chips
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

        // Result Counter
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

        // Sort Generator
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

        // Layout Manager
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

        // Search input (special case — direct event binding)
        const searchInput = this.root.querySelector('[data-search]');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.#store.setSearch(event.target.value);
            });
        } else if (this.options.debug) {
            console.warn('Atlas: No [data-search] input found. Search will not be available.');
        }

    }

    /**
     * Find the sort container.
     */
    #findSortContainer() {

        // Check Registry first
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
     * Debug output.
     */
    #debug() {

        if (!this.options.debug) {
            return;
        }

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

        // Detailed member data
        console.group('Member data');
        for (const member of this.#memberCollection) {
            console.log(`[${member.id}]`, member.toObject());
        }
        console.groupEnd();

        console.groupEnd();

    }

    // ─── Public API ───────────────────────────────────

    /** The Registry instance. */
    get registry() {
        return this.#registry;
    }

    /** The MemberCollection instance. */
    get memberCollection() {
        return this.#memberCollection;
    }

    /** The Store instance. */
    get store() {
        return this.#store;
    }

    /** The EventBus instance. */
    get events() {
        return this.#events;
    }

    /** The Renderer instance. */
    get renderer() {
        return this.#renderer;
    }

    /** All modules. */
    get modules() {
        return { ...this.#modules };
    }

}