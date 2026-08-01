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

export default class Atlas {

    #registry = null;

    /**
     * Create a new Atlas instance.
     */
    constructor(options = {}) {

        this.options = this.#createOptions(options);

        this.root = this.#findRoot();

        this.#initialise();

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

        this.#ready();

    }

    /**
     * Create the Registry.
     */
    #createRegistry() {

        this.#registry = new Registry(this.root);

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
            `Search controls: ${this.#registry.controls.search.length}`
        );

        console.info(
            `Filters: ${this.#registry.controls.filters.length}`
        );

        console.info(
            `Layouts: ${this.#registry.controls.layouts.length}`
        );

        console.groupEnd();

    }

}