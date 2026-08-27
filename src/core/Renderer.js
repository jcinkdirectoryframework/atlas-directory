/**
 * Renderer
 *
 * Manages DOM updates for Atlas based on Store state.
 *
 * Responsibilities:
 * - Update member visibility based on filter/search state
 * - Reorder members based on sort state
 * - Batch DOM updates for performance
 * - Handle loading state (flicker prevention)
 * - Lazy rendering for large directories (>300 members)
 * - Accessibility: ARIA roles for member lists
 * - No business logic — only DOM operations
 *
 * Deliberately does NOT:
 * - Know about filters, search, or sort logic
 * - Manage state
 * - Generate UI
 * - Apply business rules
 */

export default class Renderer {

    #registry = null;
    #memberCollection = null;
    #store = null;
    #events = null;
    #filteredMembers = [];
    #visibleMembers = [];
    #observer = null;
    #lazyRenderThreshold = 300; // Only enable lazy rendering above 300 members
    #batchSize = 25;
    #sentinelTop = null;
    #sentinelBottom = null;
    #isLazyRendering = false;
    #pendingRender = null;
    #isRendering = false;
    #scrollTimeout = null;
    #containerScrollHandler = null;

    /**
     * Create a Renderer.
     *
     * @param {Object} dependencies
     * @param {Registry} dependencies.registry - The Registry instance
     * @param {MemberCollection} dependencies.memberCollection - The MemberCollection instance
     * @param {Store} dependencies.store - The Store instance
     * @param {EventBus} dependencies.events - The EventBus instance
     */
    constructor({ registry, memberCollection, store, events }) {

        if (!registry) {
            throw new Error('Renderer requires a Registry');
        }

        if (!memberCollection) {
            throw new Error('Renderer requires a MemberCollection');
        }

        if (!store) {
            throw new Error('Renderer requires a Store');
        }

        if (!events) {
            throw new Error('Renderer requires an EventBus');
        }

        this.#registry = registry;
        this.#memberCollection = memberCollection;
        this.#store = store;
        this.#events = events;

        // Initially, all members are visible
        this.#filteredMembers = memberCollection.getAll();
        this.#visibleMembers = [...this.#filteredMembers];

        // Set up loading state
        this.#setupLoadingState();

        // Subscribe to store events
        this.#subscribeToEvents();

    }

    /**
     * Set up the loading state to prevent flicker.
     */
    #setupLoadingState() {

        const root = this.#registry.root;

        // Add loading attribute
        root.setAttribute('data-atlas-loading', '');

        // After initial render, remove loading state
        requestAnimationFrame(() => {
            // Ensure we're using the latest filtered members
            this.#applyFiltersAndSearch();
            this.render();

            // Remove loading attribute
            root.removeAttribute('data-atlas-loading');
        });

    }

    /**
     * Subscribe to store events.
     */
    #subscribeToEvents() {

        // When filters change
        this.#events.subscribe('store:filtersChanged', () => {
            console.debug('Renderer: Received store:filtersChanged event');
            this.#onStateChange();
        });

        // When search changes
        this.#events.subscribe('store:searchChanged', () => {
            console.debug('Renderer: Received store:searchChanged event');
            this.#onStateChange();
        });

        // When sort changes
        this.#events.subscribe('store:sortChanged', () => {
            console.debug('Renderer: Received store:sortChanged event');
            this.#onStateChange();
        });

    }

    /**
     * Handle state changes from the Store.
     */
    #onStateChange() {

        // Use requestAnimationFrame to batch updates
        if (this.#pendingRender) {
            cancelAnimationFrame(this.#pendingRender);
        }

        this.#pendingRender = requestAnimationFrame(() => {
            console.debug('Renderer: Performing update...');
            this.#applyFiltersAndSearch();
            this.render();
            this.#pendingRender = null;
        });

    }

    /**
     * Apply filters, search, and sort to the member collection.
     *
     * This is the business logic layer — it determines which members
     * should be visible and in what order.
     */
    #applyFiltersAndSearch() {

        const filters = this.#store.filters;
        const searchQuery = this.#store.search;
        const sort = this.#store.sort;

        // Start with all members
        let filtered = this.#memberCollection.getAll();

        // ─── Apply filters ────────────────────────────────
        const activeFields = Object.keys(filters).filter(
            fieldName => filters[fieldName] && filters[fieldName].length > 0
        );

        console.debug('Renderer: Applying filters:', filters);
        console.debug('Renderer: Active fields:', activeFields);

        if (activeFields.length > 0) {
            // Use cached results if available
            const cached = this.#store.getCachedFilterResults(this.#memberCollection);
            if (cached !== null) {
                filtered = cached;
                console.debug('Renderer: Using cached filter results:', filtered.length);
            } else {
                filtered = this.#memberCollection.applyFilters(filters);
                console.debug('Renderer: Applied filters, result:', filtered.length);
                // Cache the results
                this.#store.setCachedFilterResults(this.#memberCollection, filtered);
            }
        }

        // ─── Apply search ────────────────────────────────
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            const searchResults = [];
            for (const member of filtered) {
                if (member.matches(query)) {
                    searchResults.push(member);
                }
            }
            filtered = searchResults;
            console.debug('Renderer: After search:', filtered.length);
        }

        // ─── Apply sort ──────────────────────────────────
        if (sort && sort.field) {
            filtered = this.#sortMembers(filtered, sort.field, sort.direction);
            console.debug('Renderer: After sort:', filtered.length);
        }

        console.debug('Renderer: Final filtered members:', filtered.map(m => m.id));

        this.#filteredMembers = filtered;

    }

    /**
     * Sort an array of members by a field.
     *
     * Optimised with Intl.Collator for better performance with 1,000+ members.
     */
    #sortMembers(members, field, direction) {

        const sorted = [...members];

        // Create a collator once for consistent, faster comparisons
        const collator = new Intl.Collator(undefined, {
            sensitivity: 'base',
            caseFirst: 'upper'
        });

        sorted.sort((a, b) => {
            const valA = a.get(field) || '';
            const valB = b.get(field) || '';
            const compareResult = collator.compare(valA, valB);
            return direction === 'asc' ? compareResult : -compareResult;
        });

        return sorted;

    }

    /**
     * Check if lazy rendering should be used.
     * Threshold is 300 members — not configurable, by design.
     */
    #shouldUseLazyRendering() {
        return this.#memberCollection.size > this.#lazyRenderThreshold;
    }

    /**
     * Render the current state to the DOM.
     *
     * This is the DOM update layer — it takes the filtered members
     * and updates the DOM efficiently.
     */
    render() {

        // Defensive: ensure filteredMembers is an array
        if (!this.#filteredMembers || !Array.isArray(this.#filteredMembers)) {
            this.#filteredMembers = this.#memberCollection.getAll();
        }

        const totalMembers = this.#filteredMembers.length;

        console.debug('Renderer: Rendering', totalMembers, 'members');

        // ─── Determine rendering strategy ──────────────
        const useLazy = this.#shouldUseLazyRendering();

        if (useLazy) {
            this.#renderLazy(totalMembers);
        } else {
            this.#renderAll();
        }

        // Update result counter (if it exists)
        this.#updateResultCounter();

        // Update filter chips (if they exist)
        this.#updateFilterChips();

    }

    /**
     * Render all members (for small directories).
     */
    #renderAll() {

        if (this.#isLazyRendering) {
            this.#teardownLazyRendering();
        }

        const directory = this.#registry.directory;
        const members = this.#filteredMembers;

        console.debug('Renderer: renderAll() called');

        // Ensure directory has list role (accessibility)
        directory.setAttribute('role', 'list');

        // Clear the directory
        directory.innerHTML = '';

        // Render all members using DocumentFragment
        const fragment = document.createDocumentFragment();
        for (const member of members) {
            const element = member.element.cloneNode(true);
            // Remove any hidden state
            element.hidden = false;
            element.removeAttribute('data-hidden');
            // Add ARIA role for accessibility
            element.setAttribute('role', 'listitem');
            fragment.appendChild(element);
        }

        directory.appendChild(fragment);

        // Store visible members for reference
        this.#visibleMembers = [...members];
        console.debug('Renderer: Visible members:', this.#visibleMembers.map(m => m.id));

    }

    /**
     * Render only visible members (for large directories).
     */
    #renderLazy(totalMembers) {

        const directory = this.#registry.directory;

        // Ensure directory has list role (accessibility)
        directory.setAttribute('role', 'list');

        // ─── Set up lazy rendering if not already active ──
        if (!this.#isLazyRendering) {
            this.#setupLazyRendering();
        }

        // If lazy rendering is set up, ensure the first batch is rendered
        // The sentinels will handle loading more as the user scrolls
        const renderedElements = directory.querySelectorAll('[data-member]');

        // If nothing is rendered yet, render the first batch
        if (renderedElements.length === 0 && totalMembers > 0) {
            this.#renderMemberBatch(0, Math.min(this.#batchSize, totalMembers));
        }

    }

    /**
     * Render a specific batch of members.
     */
    #renderMemberBatch(startIndex, endIndex) {

        if (this.#isRendering) {
            return;
        }

        this.#isRendering = true;

        try {
            const directory = this.#registry.directory;
            const members = this.#filteredMembers;

            // Guard against invalid indices
            if (startIndex < 0) startIndex = 0;
            if (endIndex > members.length) endIndex = members.length;
            if (startIndex >= endIndex) {
                this.#isRendering = false;
                return;
            }

            // Get current rendered member IDs
            const renderedElements = directory.querySelectorAll('[data-member]');
            const renderedIds = new Set();
            for (const el of renderedElements) {
                const member = el._atlasMember;
                if (member) {
                    renderedIds.add(member.id);
                }
            }

            // Determine which members should be rendered
            const shouldRenderIds = new Set();
            for (let i = startIndex; i < endIndex; i++) {
                shouldRenderIds.add(members[i].id);
            }

            // ─── Remove members that shouldn't be rendered ──
            for (const el of renderedElements) {
                const member = el._atlasMember;
                if (member && !shouldRenderIds.has(member.id)) {
                    el.remove();
                    renderedIds.delete(member.id);
                }
            }

            // ─── Add members that should be rendered ────────
            // Use DocumentFragment for batch insertion
            const fragment = document.createDocumentFragment();
            let inserted = 0;

            for (let i = startIndex; i < endIndex; i++) {
                const member = members[i];
                if (!renderedIds.has(member.id)) {
                    const element = member.element.cloneNode(true);
                    element.hidden = false;
                    element.removeAttribute('data-hidden');
                    // Store reference to the member on the element
                    element._atlasMember = member;
                    // Add ARIA role for accessibility
                    element.setAttribute('role', 'listitem');
                    fragment.appendChild(element);
                    inserted++;
                }
            }

            if (inserted > 0) {
                // Find the right insertion point
                // We want to insert in the correct order
                // Find the last rendered member before the insertion point
                const allRendered = directory.querySelectorAll('[data-member]');

                if (allRendered.length === 0) {
                    // If nothing is rendered, append to the directory
                    // But we need to keep the sentinels in place
                    // The sentinels are at the top and bottom
                    const sentinelBottom = directory.querySelector('.atlas-sentinel-bottom');
                    if (sentinelBottom) {
                        directory.insertBefore(fragment, sentinelBottom);
                    } else {
                        directory.appendChild(fragment);
                    }
                } else {
                    // Find where to insert: after the last rendered member that's before our start index
                    let insertBefore = null;

                    // Find the first rendered member that's after our range
                    for (const el of allRendered) {
                        const member = el._atlasMember;
                        if (member) {
                            const memberIndex = members.findIndex(m => m.id === member.id);
                            if (memberIndex >= endIndex) {
                                insertBefore = el;
                                break;
                            }
                        }
                    }

                    if (insertBefore) {
                        directory.insertBefore(fragment, insertBefore);
                    } else {
                        // Append at the end (before the bottom sentinel)
                        const sentinelBottom = directory.querySelector('.atlas-sentinel-bottom');
                        if (sentinelBottom) {
                            directory.insertBefore(fragment, sentinelBottom);
                        } else {
                            directory.appendChild(fragment);
                        }
                    }
                }
            }

            // Store visible members for reference
            this.#visibleMembers = [];
            const finalRendered = directory.querySelectorAll('[data-member]');
            for (const el of finalRendered) {
                const member = el._atlasMember;
                if (member) {
                    this.#visibleMembers.push(member);
                }
            }

        } finally {
            this.#isRendering = false;
        }

    }

    /**
     * Set up lazy rendering with IntersectionObserver.
     */
    #setupLazyRendering() {

        if (this.#observer) {
            this.#teardownLazyRendering();
        }

        this.#isLazyRendering = true;

        const directory = this.#registry.directory;

        // ─── Create sentinel elements ────────────────────
        // Top sentinel — triggers loading more members when scrolling up
        this.#sentinelTop = document.createElement('div');
        this.#sentinelTop.className = 'atlas-sentinel atlas-sentinel-top';
        this.#sentinelTop.style.height = '1px';
        this.#sentinelTop.style.width = '100%';
        this.#sentinelTop.style.visibility = 'hidden';
        this.#sentinelTop.style.pointerEvents = 'none';

        // Bottom sentinel — triggers loading more members when scrolling down
        this.#sentinelBottom = document.createElement('div');
        this.#sentinelBottom.className = 'atlas-sentinel atlas-sentinel-bottom';
        this.#sentinelBottom.style.height = '1px';
        this.#sentinelBottom.style.width = '100%';
        this.#sentinelBottom.style.visibility = 'hidden';
        this.#sentinelBottom.style.pointerEvents = 'none';

        // Add sentinels to the directory
        directory.prepend(this.#sentinelTop);
        directory.appendChild(this.#sentinelBottom);

        // ─── Create IntersectionObserver ────────────────
        this.#observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.#handleSentinelIntersection(entry.target);
                }
            }
        }, {
            root: directory,
            rootMargin: '300px 0px 300px 0px', // Load 300px before/after viewport
            threshold: 0.01
        });

        // Observe sentinels
        this.#observer.observe(this.#sentinelTop);
        this.#observer.observe(this.#sentinelBottom);

        // ─── Also observe scroll on the container ──────
        this.#containerScrollHandler = this.#handleScroll.bind(this);
        directory.addEventListener('scroll', this.#containerScrollHandler);

        // ─── Initial load ──────────────────────────────
        // Render the first batch
        const totalMembers = this.#filteredMembers.length;
        if (totalMembers > 0) {
            this.#renderMemberBatch(0, Math.min(this.#batchSize, totalMembers));
        }

    }

    /**
     * Handle sentinel intersection.
     */
    #handleSentinelIntersection(sentinel) {

        if (this.#isRendering) {
            return;
        }

        const members = this.#filteredMembers;
        const directory = this.#registry.directory;

        // Count currently rendered members
        const rendered = directory.querySelectorAll('[data-member]');
        const currentCount = rendered.length;

        // Determine if we're at the top or bottom
        if (sentinel === this.#sentinelTop) {
            // Load previous batch
            // Find the first rendered member
            let firstRendered = null;
            for (const el of rendered) {
                if (el._atlasMember) {
                    firstRendered = el._atlasMember;
                    break;
                }
            }

            if (firstRendered) {
                const firstIndex = members.findIndex(m => m.id === firstRendered.id);
                if (firstIndex > 0) {
                    const startIndex = Math.max(0, firstIndex - this.#batchSize);
                    const endIndex = firstIndex;
                    this.#renderMemberBatch(startIndex, endIndex);
                }
            }
        } else if (sentinel === this.#sentinelBottom) {
            // Load next batch
            // Find the last rendered member
            let lastRendered = null;
            const renderedList = directory.querySelectorAll('[data-member]');
            for (let i = renderedList.length - 1; i >= 0; i--) {
                if (renderedList[i]._atlasMember) {
                    lastRendered = renderedList[i]._atlasMember;
                    break;
                }
            }

            if (lastRendered) {
                const lastIndex = members.findIndex(m => m.id === lastRendered.id);
                if (lastIndex < members.length - 1 && lastIndex >= 0) {
                    const startIndex = lastIndex + 1;
                    const endIndex = Math.min(startIndex + this.#batchSize, members.length);
                    if (startIndex < members.length) {
                        this.#renderMemberBatch(startIndex, endIndex);
                    }
                }
            }
        }

    }

    /**
     * Handle scroll events on the directory container.
     */
    #handleScroll() {

        // Throttle scroll events
        if (this.#scrollTimeout) {
            clearTimeout(this.#scrollTimeout);
        }

        this.#scrollTimeout = setTimeout(() => {
            // Check if we need to load more members
            const directory = this.#registry.directory;
            const scrollTop = directory.scrollTop;
            const scrollHeight = directory.scrollHeight;
            const clientHeight = directory.clientHeight;

            // If near the bottom (within 500px), load more
            if (scrollTop + clientHeight >= scrollHeight - 500) {
                const members = this.#filteredMembers;
                const rendered = directory.querySelectorAll('[data-member]');
                const currentCount = rendered.length;

                if (currentCount < members.length && currentCount > 0) {
                    // Find the last rendered member
                    let lastRendered = null;
                    for (let i = rendered.length - 1; i >= 0; i--) {
                        if (rendered[i]._atlasMember) {
                            lastRendered = rendered[i]._atlasMember;
                            break;
                        }
                    }

                    if (lastRendered) {
                        const lastIndex = members.findIndex(m => m.id === lastRendered.id);
                        if (lastIndex < members.length - 1 && lastIndex >= 0) {
                            const startIndex = lastIndex + 1;
                            const endIndex = Math.min(startIndex + this.#batchSize, members.length);
                            if (startIndex < members.length) {
                                this.#renderMemberBatch(startIndex, endIndex);
                            }
                        }
                    }
                }
            }

            // If near the top (within 500px), load previous
            if (scrollTop < 500) {
                const members = this.#filteredMembers;
                const rendered = directory.querySelectorAll('[data-member]');

                if (rendered.length > 0) {
                    // Find the first rendered member
                    let firstRendered = null;
                    for (const el of rendered) {
                        if (el._atlasMember) {
                            firstRendered = el._atlasMember;
                            break;
                        }
                    }

                    if (firstRendered) {
                        const firstIndex = members.findIndex(m => m.id === firstRendered.id);
                        if (firstIndex > 0) {
                            const startIndex = Math.max(0, firstIndex - this.#batchSize);
                            const endIndex = firstIndex;
                            this.#renderMemberBatch(startIndex, endIndex);
                        }
                    }
                }
            }

            this.#scrollTimeout = null;
        }, 100);

    }

    /**
     * Tear down lazy rendering.
     */
    #teardownLazyRendering() {

        this.#isLazyRendering = false;

        if (this.#observer) {
            this.#observer.disconnect();
            this.#observer = null;
        }

        if (this.#sentinelTop) {
            this.#sentinelTop.remove();
            this.#sentinelTop = null;
        }

        if (this.#sentinelBottom) {
            this.#sentinelBottom.remove();
            this.#sentinelBottom = null;
        }

        if (this.#containerScrollHandler) {
            const directory = this.#registry.directory;
            directory.removeEventListener('scroll', this.#containerScrollHandler);
            this.#containerScrollHandler = null;
        }

        if (this.#scrollTimeout) {
            clearTimeout(this.#scrollTimeout);
            this.#scrollTimeout = null;
        }

    }

    /**
     * Get the currently filtered members.
     */
    get filteredMembers() {
        return [...this.#filteredMembers];
    }

    /**
     * Get the count of visible members.
     */
    get visibleCount() {
        return this.#visibleMembers ? this.#visibleMembers.length : 0;
    }

    /**
     * Get the total number of members.
     */
    get totalCount() {
        return this.#memberCollection.size;
    }

    /**
     * Check if lazy rendering is active.
     */
    get isLazyRendering() {
        return this.#isLazyRendering;
    }

    // ─── Helpers ──────────────────────────────────────

    /**
     * Update the result counter if it exists.
     */
    #updateResultCounter() {

        // Get the results container from the registry
        const container = this.#registry.resultsContainer;
        if (!container) {
            return;
        }

        const total = this.#memberCollection.size;
        const visible = this.#visibleMembers.length;

        console.debug('Renderer: Updating result counter — total:', total, 'visible:', visible);

        // Clear the container
        container.innerHTML = '';

        // Create the counter element
        const counter = document.createElement('span');
        counter.className = 'atlas-result-counter';

        if (visible === total) {
            counter.textContent = `Showing all ${total} members`;
        } else {
            counter.textContent = `Showing ${visible} of ${total} members`;
        }

        container.appendChild(counter);

    }

    /**
     * Update filter chips if they exist.
     */
    #updateFilterChips() {
        // Filter chips are updated via events
        // This is a no-op — chips listen to the same events
    }

    /**
     * Clean up any resources.
     * Called when Atlas is destroyed.
     */
    destroy() {
        if (this.#isLazyRendering) {
            this.#teardownLazyRendering();
        }
        this.#pendingRender = null;
    }

}
