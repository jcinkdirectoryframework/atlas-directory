/**
 * Atlas
 * A dependency-free, HTML-driven directory engine.
 *
 * @license MIT
 */

export default class Atlas {

    /**
     * Creates a new Atlas instance.
     *
     * @param {Object} options
     */
    constructor(options = {}) {

        this.options = {
            root: '[data-atlas]',
            debug: false,
            ...options
        };

        this.root = document.querySelector(this.options.root);

        if (!this.root) {
            throw new Error(
                `Atlas could not find a root element matching "${this.options.root}".`
            );
        }

        if (this.options.debug) {
            console.info('Atlas initialised.', this);
        }
    }

}