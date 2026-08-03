/**
 * EventBus
 *
 * A lightweight publish/subscribe event system for Atlas.
 *
 * Responsibilities:
 * - Provide publish/subscribe communication between modules
 * - Allow modules to communicate without direct coupling
 * - Support event namespacing (e.g., 'filters:changed')
 * - Provide optional debug logging
 *
 * Deliberately does NOT:
 * - Know about the DOM
 * - Know about Atlas modules
 * - Manage state
 * - Handle asynchronous events
 *
 * Usage:
 *   const events = new EventBus({ debug: true });
 *   events.subscribe('filters:changed', (data) => { ... });
 *   events.publish('filters:changed', { filters: { species: ['Human'] } });
 *   events.unsubscribe('filters:changed', callback);
 *   events.clear(); // Remove all listeners
 */

export default class EventBus {

    #subscribers = new Map();
    #debug = false;

    /**
     * Create an EventBus.
     *
     * @param {Object} options - Configuration options
     * @param {boolean} options.debug - Enable debug logging (default: false)
     */
    constructor(options = {}) {

        this.#debug = options.debug || false;

    }

    /**
     * Subscribe to an event.
     *
     * @param {string} event - The event name to subscribe to
     * @param {Function} callback - The function to call when the event is published
     * @returns {Function} An unsubscribe function for this subscription
     *
     * @example
     * const unsubscribe = events.subscribe('filters:changed', (data) => {
     *     console.log('Filters changed:', data);
     * });
     */
    subscribe(event, callback) {

        if (typeof event !== 'string' || !event) {
            throw new Error('EventBus.subscribe: Event name must be a non-empty string');
        }

        if (typeof callback !== 'function') {
            throw new Error('EventBus.subscribe: Callback must be a function');
        }

        if (!this.#subscribers.has(event)) {
            this.#subscribers.set(event, []);
        }

        const callbacks = this.#subscribers.get(event);

        // Avoid duplicate subscriptions
        if (callbacks.includes(callback)) {
            if (this.#debug) {
                console.warn(`EventBus: Duplicate subscription to "${event}" ignored`);
            }
            return () => this.unsubscribe(event, callback);
        }

        callbacks.push(callback);

        if (this.#debug) {
            console.debug(`EventBus: Subscribed to "${event}" (${callbacks.length} listeners)`);
        }

        // Return an unsubscribe function for convenience
        return () => this.unsubscribe(event, callback);

    }

    /**
     * Publish an event.
     *
     * @param {string} event - The event name to publish
     * @param {*} data - The data to pass to subscribers
     * @returns {boolean} True if the event had subscribers, false otherwise
     *
     * @example
     * events.publish('filters:changed', { filters: { species: ['Human'] } });
     */
    publish(event, data) {

        if (typeof event !== 'string' || !event) {
            throw new Error('EventBus.publish: Event name must be a non-empty string');
        }

        if (!this.#subscribers.has(event)) {
            if (this.#debug) {
                console.debug(`EventBus: Published "${event}" (no subscribers)`);
            }
            return false;
        }

        const callbacks = this.#subscribers.get(event);

        if (this.#debug) {
            console.debug(`EventBus: Published "${event}" to ${callbacks.length} subscribers`, data);
        }

        // Copy the array to prevent issues if callbacks unsubscribe during iteration
        const callbacksToRun = [...callbacks];

        for (const callback of callbacksToRun) {
            try {
                callback(data);
            } catch (error) {
                console.error(
                    `EventBus: Error in subscriber to "${event}":`,
                    error
                );
            }
        }

        return true;

    }

    /**
     * Unsubscribe from an event.
     *
     * @param {string} event - The event name to unsubscribe from
     * @param {Function} callback - The callback to remove
     * @returns {boolean} True if the callback was removed, false if not found
     */
    unsubscribe(event, callback) {

        if (typeof event !== 'string' || !event) {
            throw new Error('EventBus.unsubscribe: Event name must be a non-empty string');
        }

        if (typeof callback !== 'function') {
            throw new Error('EventBus.unsubscribe: Callback must be a function');
        }

        if (!this.#subscribers.has(event)) {
            if (this.#debug) {
                console.debug(`EventBus: Unsubscribe from "${event}" (no subscribers)`);
            }
            return false;
        }

        const callbacks = this.#subscribers.get(event);
        const index = callbacks.indexOf(callback);

        if (index === -1) {
            if (this.#debug) {
                console.debug(`EventBus: Unsubscribe from "${event}" (callback not found)`);
            }
            return false;
        }

        callbacks.splice(index, 1);

        // Clean up empty event entries
        if (callbacks.length === 0) {
            this.#subscribers.delete(event);
        }

        if (this.#debug) {
            console.debug(`EventBus: Unsubscribed from "${event}" (${callbacks.length} listeners remain)`);
        }

        return true;

    }

    /**
     * Clear all subscriptions.
     *
     * @param {string} [event] - Optional specific event to clear. If omitted, clears all.
     * @returns {number} The number of subscriptions removed
     */
    clear(event) {

        if (event) {
            if (typeof event !== 'string' || !event) {
                throw new Error('EventBus.clear: Event name must be a non-empty string');
            }

            if (!this.#subscribers.has(event)) {
                return 0;
            }

            const count = this.#subscribers.get(event).length;
            this.#subscribers.delete(event);

            if (this.#debug) {
                console.debug(`EventBus: Cleared "${event}" (${count} subscriptions)`);
            }

            return count;
        }

        const totalCount = this.#subscriberCount;

        this.#subscribers.clear();

        if (this.#debug) {
            console.debug(`EventBus: Cleared all (${totalCount} subscriptions)`);
        }

        return totalCount;

    }

    /**
     * Check if an event has subscribers.
     *
     * @param {string} event - The event name to check
     * @returns {boolean} True if the event has subscribers
     */
    hasSubscribers(event) {

        if (typeof event !== 'string' || !event) {
            return false;
        }

        return this.#subscribers.has(event) && this.#subscribers.get(event).length > 0;

    }

    /**
     * Get the number of subscribers for an event.
     *
     * @param {string} [event] - Optional specific event. If omitted, returns total.
     * @returns {number} The number of subscribers
     */
    subscriberCount(event) {

        if (event) {
            if (typeof event !== 'string' || !event) {
                return 0;
            }

            if (!this.#subscribers.has(event)) {
                return 0;
            }

            return this.#subscribers.get(event).length;
        }

        return this.#subscriberCount;

    }

    /**
     * Get the total number of subscribers across all events.
     */
    get #subscriberCount() {

        let total = 0;

        for (const [, callbacks] of this.#subscribers) {
            total += callbacks.length;
        }

        return total;

    }

    /**
     * Get all event names with subscribers.
     *
     * @returns {string[]} Array of event names
     */
    get eventNames() {
        return Array.from(this.#subscribers.keys());
    }

}