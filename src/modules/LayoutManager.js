/**
 * LayoutManager
 *
 * Manages layout switching (grid/list) for the directory.
 *
 * Responsibilities:
 * - Discover [data-layout] buttons
 * - Track current layout state
 * - Persist layout state to localStorage
 * - Apply layout classes to directory container
 * - Update button UI states
 *
 * Deliberately does NOT:
 * - Manage application state (delegates to Store)
 * - Style the layouts (CSS owns presentation)
 * - Apply per-member classes (CSS descendant selectors handle this)
 */

export default class LayoutManager {

    #container;
    #directory;
    #store;
    #buttons = [];
    #currentLayout = 'grid';
    #storageKey = 'atlas-layout';

    /**
     * Create a LayoutManager.
     *
     * @param {HTMLElement} container - The Atlas root element
     * @param {HTMLElement} directory - The [data-directory] container
     * @param {Store} store - The application store
     */
    constructor(container, directory, store) {

        if (!container) {
            throw new Error('LayoutManager requires a container element');
        }

        if (!directory) {
            throw new Error('LayoutManager requires a directory element');
        }

        if (!store) {
            throw new Error('LayoutManager requires a Store');
        }

        this.#container = container;
        this.#directory = directory;
        this.#store = store;

        this.#discoverButtons();

        // Load persisted layout or use default
        const savedLayout = this.#loadState();
        this.#currentLayout = savedLayout || 'grid';

        // Update store with initial layout
        this.#store.setLayout(this.#currentLayout);

        // Apply the layout
        this.#applyLayout();

        // Update button UI
        this.#updateUI();

        // Listen for layout changes from other sources
        document.addEventListener('atlas:layoutChanged', () => {
            this.#applyLayout();
            this.#updateUI();
        });

    }

    /**
     * Discover [data-layout] buttons in the container.
     */
    #discoverButtons() {

        const buttons = this.#container.querySelectorAll('[data-layout]');

        for (const button of buttons) {
            const layout = button.dataset.layout;

            if (layout !== 'grid' && layout !== 'list') {
                console.warn(
                    `LayoutManager: Invalid layout value "${layout}" on button, skipping`
                );
                continue;
            }

            this.#buttons.push(button);

            button.addEventListener('click', () => {
                this.#handleLayoutClick(layout);
            });
        }

        if (this.#buttons.length === 0) {
            if (this.#container.closest('[data-atlas]')) {
                // Only warn if we're inside an Atlas instance (not during testing)
                console.warn('LayoutManager: No [data-layout] buttons found');
            }
        }

    }

    /**
     * Handle a layout button click.
     */
    #handleLayoutClick(layout) {

        if (this.#currentLayout === layout) {
            // Layout already active, do nothing
            return;
        }

        this.#currentLayout = layout;

        // Update store
        this.#store.setLayout(layout);

        // Save to localStorage
        this.#saveState();

        // Apply layout to DOM
        this.#applyLayout();

        // Update button UI
        this.#updateUI();

        // Dispatch event for other components
        const event = new CustomEvent('atlas:layoutChanged', {
            detail: {
                layout: layout
            }
        });

        document.dispatchEvent(event);

    }

    /**
     * Apply layout classes to directory container only.
     *
     * CSS descendant selectors handle member styling:
     * [data-directory].atlas-layout-grid [data-member] { ... }
     * [data-directory].atlas-layout-list [data-member] { ... }
     */
    #applyLayout() {

        // Remove all layout classes from directory
        this.#directory.classList.remove('atlas-layout-grid', 'atlas-layout-list');

        // Add the current layout class
        this.#directory.classList.add(`atlas-layout-${this.#currentLayout}`);

    }

    /**
     * Update button UI states.
     */
    #updateUI() {

        for (const button of this.#buttons) {
            const layout = button.dataset.layout;

            if (layout === this.#currentLayout) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }

    }

    /**
     * Save layout state to localStorage.
     */
    #saveState() {

        try {
            localStorage.setItem(this.#storageKey, this.#currentLayout);
        } catch (error) {
            console.warn('LayoutManager: Failed to save layout to localStorage:', error);
        }

    }

    /**
     * Load layout state from localStorage.
     */
    #loadState() {

        try {
            const saved = localStorage.getItem(this.#storageKey);
            if (saved === 'grid' || saved === 'list') {
                return saved;
            }
        } catch (error) {
            console.warn('LayoutManager: Failed to load layout from localStorage:', error);
        }

        return null;

    }

    /**
     * Get the current layout.
     */
    get layout() {
        return this.#currentLayout;
    }

    /**
     * Get the directory element.
     */
    get directory() {
        return this.#directory;
    }

}