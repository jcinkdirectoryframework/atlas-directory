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

        return {

            search: [...this.#controls.search],

            filters: [...this.#controls.filters],

            sorts: [...this.#controls.sorts],

            layouts: [...this.#controls.layouts],

            alphabet: [...this.#controls.alphabet],

            chips: [...this.#controls.chips],

            results: [...this.#controls.results]

        };

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

        this.#directory =
            this.#root.querySelector("[data-directory]");

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

    /**
     * Locate Atlas controls.
     */
    #discoverControls() {

        this.#controls.search =
            Array.from(this.#root.querySelectorAll("[data-search]"));

        this.#controls.filters =
            Array.from(this.#root.querySelectorAll("[data-filter]"));

        this.#controls.sorts =
            Array.from(this.#root.querySelectorAll("[data-sort]"));

        this.#controls.layouts =
            Array.from(this.#root.querySelectorAll("[data-layout]"));

        this.#controls.alphabet =
            Array.from(this.#root.querySelectorAll("[data-alphabet]"));

        this.#controls.chips =
            Array.from(this.#root.querySelectorAll("[data-chips]"));

        this.#controls.results =
            Array.from(this.#root.querySelectorAll("[data-results]"));

    }

}