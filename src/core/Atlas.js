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

export default class Atlas {

    #registry = null;
    #memberCollection = null;

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

        this.#createMemberCollection();

        this.#ready();

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

        try {
            const memberElements = this.#registry.members;

            const members = memberElements.map((element, index) => {
                return new Member(element, index);
            });

            this.#memberCollection = new MemberCollection(members);

        } catch (error) {
            console.error('Failed to create MemberCollection:', error);
            throw error;
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

        try {
            const fieldNames = this.#memberCollection.getAllFieldNames();
            console.info(
                `Member fields: ${fieldNames.join(', ') || '(none)'}`
            );
        } catch (error) {
            console.error('Error getting field names:', error);
        }

        console.info(
            `Search controls: ${this.#registry.controls.search.length}`
        );

        console.info(
            `Filters: ${this.#registry.controls.filters.length}`
        );

        console.info(
            `Layouts: ${this.#registry.controls.layouts.length}`
        );

        // Detailed member data for debugging
        try {
            console.group("Member data");

            for (const member of this.#memberCollection) {
                console.log(
                    `[${member.id}]`,
                    member.toObject()
                );
            }

            console.groupEnd();
        } catch (error) {
            console.error('Error displaying member data:', error);
        }

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

}