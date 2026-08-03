/**
 * Renderer
 *
 * Efficiently updates the DOM to reflect the current state.
 *
 * Responsibilities:
 * - Diff current vs new member state
 * - Toggle visibility (hidden/data-hidden) on changed members only
 * - Reorder members efficiently (only move what's needed)
 * - Batch DOM updates using requestAnimationFrame
 *
 * Deliberately does NOT:
 * - Know about filters, search, or sort logic
 * - Manage application state
 * - Apply styling (CSS owns presentation)
 */

export default class Renderer {

    #directory;
    #members = new Map(); // id → { element, visible }
    #pendingRender = false;
    #pendingMembers = null;

    /**
     * Create a Renderer.
     *
     * @param {HTMLElement} directory - The [data-directory] container
     */
    constructor(directory) {

        if (!directory) {
            throw new Error('Renderer requires a directory element');
        }

        this.#directory = directory;

        // Initialise member map from the DOM
        this.#syncWithDOM();

    }

    /**
     * Sync the internal state with the current DOM.
     */
    #syncWithDOM() {

        const elements = this.#directory.querySelectorAll('[data-member]');

        for (const element of elements) {
            const member = element._atlasMember;
            if (member) {
                this.#members.set(member.id, {
                    element: element,
                    visible: !element.hidden
                });
            }
        }

    }

    /**
     * Render a new set of members in the correct order.
     *
     * @param {Member[]} members - Array of members in the desired order (already filtered/sorted)
     */
    render(members) {

        // Store the pending update
        this.#pendingMembers = members;

        // Schedule a render if not already pending
        if (!this.#pendingRender) {
            this.#pendingRender = true;
            requestAnimationFrame(() => {
                this.#performRender();
            });
        }

    }

    /**
     * Perform the actual render (called via requestAnimationFrame).
     */
    #performRender() {

        this.#pendingRender = false;

        const members = this.#pendingMembers;

        if (!members) {
            return;
        }

        // 1. Get current state from DOM
        const currentState = this.#getCurrentState();

        // 2. Build new state from members
        const newState = this.#buildNewState(members);

        // 3. Diff and apply changes
        this.#applyChanges(currentState, newState);

        // 4. Update internal state
        this.#updateInternalState(newState);

        this.#pendingMembers = null;

    }

    /**
     * Get the current state from the DOM.
     */
    #getCurrentState() {

        const state = {
            order: [],           // Array of member IDs in DOM order
            visible: new Set(),  // Set of member IDs that are visible
            elements: new Map()  // id → element
        };

        const elements = this.#directory.querySelectorAll('[data-member]');

        for (const element of elements) {
            const member = element._atlasMember;
            if (member) {
                const id = member.id;
                state.order.push(id);
                state.elements.set(id, element);
                if (!element.hidden) {
                    state.visible.add(id);
                }
            }
        }

        return state;

    }

    /**
     * Build the new state from the member array.
     */
    #buildNewState(members) {

        const state = {
            order: [],           // Array of member IDs in new order
            visible: new Set(),  // Set of member IDs that should be visible
            elements: new Map()  // id → element (reused from internal map)
        };

        for (const member of members) {
            const id = member.id;
            state.order.push(id);
            state.visible.add(id);
            state.elements.set(id, member.element);
        }

        return state;

    }

    /**
     * Apply changes between current and new state.
     */
    #applyChanges(currentState, newState) {

        // 1. Handle visibility changes
        this.#applyVisibilityChanges(currentState, newState);

        // 2. Handle reordering
        this.#applyReorder(newState);

    }

    /**
     * Apply visibility changes (show/hide members).
     */
    #applyVisibilityChanges(currentState, newState) {

        const currentVisible = currentState.visible;
        const newVisible = newState.visible;

        // Find members that should be hidden (visible in current, not in new)
        for (const id of currentVisible) {
            if (!newVisible.has(id)) {
                const element = currentState.elements.get(id);
                if (element) {
                    element.hidden = true;
                    element.setAttribute('data-hidden', 'true');
                }
            }
        }

        // Find members that should be shown (not visible in current, visible in new)
        for (const id of newVisible) {
            if (!currentVisible.has(id)) {
                const element = newState.elements.get(id);
                if (element) {
                    element.hidden = false;
                    element.removeAttribute('data-hidden');
                }
            }
        }

    }

    /**
     * Apply reordering to the DOM.
     *
     * Handles both full reorders (no filters) and partial reorders (with filters).
     * For filtered views, only visible members are in the order array.
     */
    #applyReorder(newState) {

        const directory = this.#directory;
        const newOrder = newState.order;

        // Get current member elements in the directory
        const currentElements = Array.from(directory.querySelectorAll('[data-member]'));

        // If no members, nothing to do
        if (currentElements.length === 0 && newOrder.length === 0) {
            return;
        }

        // Get current IDs in DOM order (including hidden members)
        const currentIds = currentElements.map(el => {
            const member = el._atlasMember;
            return member ? member.id : null;
        });

        // Check if the order of VISIBLE members has changed
        // We need to compare only the members that are in newOrder
        let needsReorder = false;
        const visibleCurrentIds = currentIds.filter(id => newOrder.includes(id));

        if (visibleCurrentIds.length !== newOrder.length) {
            needsReorder = true;
        } else {
            for (let i = 0; i < newOrder.length; i++) {
                if (visibleCurrentIds[i] !== newOrder[i]) {
                    needsReorder = true;
                    break;
                }
            }
        }

        if (!needsReorder) {
            return;
        }

        // Get all elements that are in the new order
        const elementsToKeep = new Set(newOrder);
        const elementsToRemove = [];

        // Separate elements to keep and remove
        for (const element of currentElements) {
            const member = element._atlasMember;
            if (member && elementsToKeep.has(member.id)) {
                // Keep this element
            } else {
                elementsToRemove.push(element);
            }
        }

        // Build the new order: visible members in sorted order
        const newElements = [];

        for (const id of newOrder) {
            const element = newState.elements.get(id);
            if (element) {
                newElements.push(element);
            }
        }

        // Remove all current member elements
        for (const element of currentElements) {
            element.remove();
        }

        // Append visible members in new order
        for (const element of newElements) {
            directory.appendChild(element);
        }

        // Append hidden members at the end (preserving their order)
        for (const element of elementsToRemove) {
            if (!newElements.includes(element)) {
                directory.appendChild(element);
            }
        }

    }

    /**
     * Update the internal state.
     */
    #updateInternalState(newState) {

        // Store element references and visibility
        for (const id of newState.order) {
            const element = newState.elements.get(id);
            if (element) {
                this.#members.set(id, {
                    element: element,
                    visible: newState.visible.has(id)
                });
            }
        }

        // Remove any members that are no longer in the collection
        const validIds = new Set(newState.order);
        for (const [id] of this.#members) {
            if (!validIds.has(id)) {
                this.#members.delete(id);
            }
        }

    }

    /**
     * Force a sync with the DOM (used after external changes).
     */
    sync() {
        this.#syncWithDOM();
    }

    /**
     * Get the current member order from the DOM.
     */
    getCurrentOrder() {

        const order = [];
        const elements = this.#directory.querySelectorAll('[data-member]');

        for (const element of elements) {
            const member = element._atlasMember;
            if (member) {
                order.push(member.id);
            }
        }

        return order;

    }

    /**
     * Get the directory element.
     */
    get directory() {
        return this.#directory;
    }

}