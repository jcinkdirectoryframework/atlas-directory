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

        // 2. Handle reordering (only if order changed)
        const currentOrder = currentState.order;
        const newOrder = newState.order;

        // Check if order actually changed
        if (currentOrder.length !== newOrder.length) {
            // Length changed, reorder
            this.#applyReorder(newState);
            return;
        }

        // Check if order is the same
        let orderChanged = false;
        for (let i = 0; i < currentOrder.length; i++) {
            if (currentOrder[i] !== newOrder[i]) {
                orderChanged = true;
                break;
            }
        }

        if (orderChanged) {
            this.#applyReorder(newState);
        }

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
     * Uses insertion-based reordering to minimize DOM operations.
     * Only moves elements that are out of place.
     */
    #applyReorder(newState) {

        const directory = this.#directory;
        const newOrder = newState.order;

        // Get all current child elements
        const children = Array.from(directory.children);

        // For each position in the new order
        for (let i = 0; i < newOrder.length; i++) {
            const id = newOrder[i];
            const element = newState.elements.get(id);

            if (!element) {
                continue;
            }

            // Check if this element is already at the correct position
            const currentIndex = children.indexOf(element);

            if (currentIndex === -1) {
                // Element not found in current children (shouldn't happen, but handle it)
                directory.appendChild(element);
            } else if (currentIndex !== i) {
                // Element is in the wrong position — move it
                // Find the reference element at position i
                const refId = newOrder[i];
                const refElement = newState.elements.get(refId);

                if (refElement && refElement !== element) {
                    // Insert before the reference element
                    directory.insertBefore(element, refElement);
                } else {
                    // Fallback: append to end
                    directory.appendChild(element);
                }
            }

            // Update children array to reflect the new order
            // (remove from current position, insert at correct position)
            const idx = children.indexOf(element);
            if (idx !== -1) {
                children.splice(idx, 1);
            }
            children.splice(i, 0, element);
        }

        // Remove any remaining elements that shouldn't be in the directory
        // (Shouldn't happen in normal operation, but handles edge cases)
        const currentElements = directory.querySelectorAll('[data-member]');
        const validIds = new Set(newOrder);
        for (const element of currentElements) {
            const member = element._atlasMember;
            if (member && !validIds.has(member.id)) {
                element.remove();
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