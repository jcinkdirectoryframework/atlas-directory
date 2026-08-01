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
        results: []
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
        results: "[data-results]"
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