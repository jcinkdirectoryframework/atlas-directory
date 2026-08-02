/**
 * Registry
 *
 * Discovers Atlas elements within the root container.
 *
 * Responsibilities:
 * - Discover the directory container.
 * - Discover member elements.
 * - Discover Atlas controls.
 * - Store DOM references.
 *
 * Deliberately does NOT:
 * - Parse member data.
 * - Interpret fields.
 * - Search.
 * - Filter.
 * - Sort.
 * - Render.
 */

export default class Registry {

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

    /**
     * Create a Registry.
     *
     * @param {HTMLElement} root
     */
    constructor(root) {

        this.#root = root;

        this.#discover();

    }

    /**
     * Atlas root element.
     */
    get root() {
        return this.#root;
    }

    /**
     * Directory container.
     */
    get directory() {
        return this.#directory;
    }

    /**
     * Member elements.
     */
    get members() {
        return [...this.#members];
    }

    /**
     * Filters container.
     */
    get filtersContainer() {

        const containers = this.#controls.filtersContainer;

        if (containers.length === 0) {
            return null;
        }

        return containers[0];

    }

    /**
     * Chips container.
     */
    get chipsContainer() {

        const containers = this.#controls.chips;

        if (containers.length === 0) {
            return null;
        }

        return containers[0];

    }

    /**
     * Results container.
     */
    get resultsContainer() {

        const containers = this.#controls.results;

        if (containers.length === 0) {
            return null;
        }

        return containers[0];

    }

    /**
     * Atlas controls.
     */
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

    /**
     * Perform a complete discovery pass.
     */
    #discover() {

        this.#discoverDirectory();

        this.#discoverMembers();

        this.#discoverControls();

    }

    /**
     * Locate the directory container.
     */
    #discoverDirectory() {

        const directories = this.#root.querySelectorAll("[data-directory]");

        if (directories.length === 0) {

            throw new Error(
                "Atlas requires one [data-directory] element."
            );

        }

        if (directories.length > 1) {

            throw new Error(
                "Atlas found multiple [data-directory] elements."
            );

        }

        this.#directory = directories[0];

    }

    /**
     * Locate member elements.
     */
    #discoverMembers() {

        if (!this.#directory) {
            return;
        }

        this.#members = Array.from(
            this.#directory.querySelectorAll("[data-member]")
        );

    }

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

    /**
     * Locate Atlas controls.
     */
    #discoverControls() {
    
        for (const [type, selector] of Object.entries(this.#controlSelectors)) {

            this.#controls[type] = Array.from(
                this.#root.querySelectorAll(selector)
            );

        }

    }

}