/**
 * JCinkAdapter
 *
 * Platform-specific adapter for JCink forum software.
 *
 * Responsibilities:
 * - Detect JCink member list page
 * - Ensure &max_results=1000 is always present
 * - Handle JCink-specific URL patterns
 *
 * Deliberately does NOT:
 * - Change Atlas core behaviour
 * - Add JCink-specific features to Atlas
 * - Know about the DOM
 */

export default class JCinkAdapter {

    /**
     * Check if the current page is a JCink member list.
     */
    static isMemberList() {

        const url = window.location.href;

        // Check for act=Members (JCink member list)
        return url.includes('act=Members');

    }

    /**
     * Ensure &max_results=1000 is present in the URL.
     *
     * If not present, redirects with &max_results=1000.
     * If present with a different value, updates to 1000.
     */
    static ensureMaxResults() {

        if (!this.isMemberList()) {
            return;
        }

        const url = new URL(window.location.href);
        const params = url.searchParams;

        // Check if max_results is already present
        if (params.has('max_results')) {
            const currentValue = params.get('max_results');

            // If it's already 1000, no action needed
            if (currentValue === '1000') {
                return;
            }

            // Otherwise, update to 1000
            params.set('max_results', '1000');

        } else {
            // Add max_results=1000
            params.set('max_results', '1000');
        }

        // Redirect to the updated URL
        window.location.replace(url.toString());

    }

    /**
     * Apply all JCink-specific behaviours.
     */
    static apply() {

        // Always Show Max
        this.ensureMaxResults();

    }

}