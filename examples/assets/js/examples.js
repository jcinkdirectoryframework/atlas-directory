/**
 * Shared example data and utilities.
 * Used by all example pages.
 */

// ─── Member Data ─────────────────────────────────────

export const memberData = [
    { name: 'Commander Shepard', species: 'Human', occupation: 'Commander', faction: 'Alliance', faceclaim: 'Mark Meer', homeworld: 'Earth', status: 'Active' },
    { name: 'Garrus Vakarian', species: 'Turian', occupation: 'Sniper', faction: 'Alliance', faceclaim: 'Brandon Keener', homeworld: 'Palaven', status: 'Active' },
    { name: "Tali'Zorah nar Rayya", species: 'Quarian', occupation: 'Engineer', faction: 'Alliance', faceclaim: 'Ash Sroka', homeworld: 'Rannoch', status: 'Active' },
    { name: "Liara T'Soni", species: 'Asari', occupation: 'Scientist', faction: 'Alliance', faceclaim: 'Ali Hillis', homeworld: 'Thessia', status: 'Active' },
    { name: 'Urdnot Wrex', species: 'Krogan', occupation: 'Mercenary', faction: 'Alliance', faceclaim: 'Steve Blum', homeworld: 'Tuchanka', status: 'Active' },
    { name: 'Mordin Solus', species: 'Salarian', occupation: 'Scientist', faction: 'Alliance', faceclaim: 'Michael Beattie', homeworld: "Sur'Kesh", status: 'Active' },
    { name: 'Miranda Lawson', species: 'Human', occupation: 'Biotic', faction: 'Alliance', faceclaim: 'Yvonne Strahovski', homeworld: 'Earth', status: 'Active' },
    { name: 'Jacob Taylor', species: 'Human', occupation: 'Soldier', faction: 'Alliance', faceclaim: 'Adam Lazarre-White', homeworld: 'Earth', status: 'Active' },
    { name: 'Jack', species: 'Human', occupation: 'Biotic', faction: 'Alliance', faceclaim: 'Courtenay Taylor', homeworld: 'Earth', status: 'Active' },
    { name: 'Grunt', species: 'Krogan', occupation: 'Soldier', faction: 'Alliance', faceclaim: 'Steve Blum', homeworld: 'Tuchanka', status: 'Active' },
    { name: 'Thane Krios', species: 'Drell', occupation: 'Assassin', faction: 'Alliance', faceclaim: 'Keythe Farley', homeworld: 'Kahje', status: 'Deceased' },
    { name: 'Samara', species: 'Asari', occupation: 'Justicar', faction: 'Alliance', faceclaim: 'Maggie Baird', homeworld: 'Thessia', status: 'Active' },
    { name: 'Legion', species: 'Geth', occupation: 'Infiltrator', faction: 'Alliance', faceclaim: 'D.C. Douglas', homeworld: 'Rannoch', status: 'Deceased' },
    { name: 'Javik', species: 'Prothean', occupation: 'Soldier', faction: 'Alliance', faceclaim: 'Ike Amadi', homeworld: 'Eden Prime', status: 'Active' },
    { name: "Aria T'Loak", species: 'Asari', occupation: 'Pirate', faction: 'Omega', faceclaim: 'Carrie-Anne Moss', homeworld: 'Omega', status: 'Active' },
    { name: 'Nyreen Kandros', species: 'Turian', occupation: 'Mercenary', faction: 'Omega', faceclaim: 'Sumalee Montano', homeworld: 'Palaven', status: 'Deceased' },
    { name: 'Saren Arterius', species: 'Turian', occupation: 'Spectre', faction: 'Reapers', faceclaim: 'Fred Tatasciore', homeworld: 'Palaven', status: 'Deceased' },
    { name: 'Illusive Man', species: 'Human', occupation: 'Leader', faction: 'Cerberus', faceclaim: 'Martin Sheen', homeworld: 'Earth', status: 'Deceased' },
    { name: 'Kai Leng', species: 'Human', occupation: 'Assassin', faction: 'Cerberus', faceclaim: 'Troy Baker', homeworld: 'Earth', status: 'Deceased' },
    { name: 'Niftu Cal', species: 'Volus', occupation: 'Biotic', faction: 'None', faceclaim: 'Mark Meer', homeworld: 'Irune', status: 'Active' },
    { name: 'Blasto', species: 'Hanar', occupation: 'Spectre', faction: 'None', faceclaim: 'Mark Meer', homeworld: 'Kahje', status: 'Active' },
    { name: 'Avina', species: 'VI', occupation: 'AI', faction: 'None', faceclaim: 'Tricia Helfer', homeworld: 'Thessia', status: 'Active' },
    { name: 'EDI', species: 'AI', occupation: 'AI', faction: 'Alliance', faceclaim: 'Tricia Helfer', homeworld: 'Earth', status: 'Active' },
    { name: 'Joker', species: 'Human', occupation: 'Pilot', faction: 'Alliance', faceclaim: 'Seth Green', homeworld: 'Earth', status: 'Active' },
    { name: 'James Vega', species: 'Human', occupation: 'Soldier', faction: 'Alliance', faceclaim: 'Freddie Prinze Jr.', homeworld: 'Earth', status: 'Active' },
];

// ─── Build Member HTML ──────────────────────────────

export function buildMemberHTML(member) {
    return `
        <article data-member>
            <span data-field="name" data-searchable="true" data-sortable="true">
                ${member.name}
            </span>
            <span data-field="faceclaim" data-searchable="true" data-sortable="true">
                ${member.faceclaim}
            </span>
            <span data-field="species" data-filterable="true" data-sortable="true">
                ${member.species}
            </span>
            <span data-field="occupation" data-filterable="true" data-sortable="true">
                ${member.occupation}
            </span>
            <span data-field="faction" data-filterable="true" data-sortable="true">
                ${member.faction}
            </span>
            <span data-field="homeworld" data-filterable="true" data-sortable="true">
                ${member.homeworld}
            </span>
            <span data-field="status" data-filterable="true" data-sortable="true">
                ${member.status}
            </span>
        </article>
    `;
}

export function renderMembers(container) {
    const html = memberData.map(buildMemberHTML).join('');
    container.innerHTML = html;
}

// ─── Initialise Atlas ────────────────────────────────

export function initExample(containerId = 'directory') {
    const directory = document.getElementById(containerId);
    if (!directory) {
        console.error(`Directory container "#${containerId}" not found.`);
        return;
    }

    // Render members into the DOM
    renderMembers(directory);

    // Wait for the next frame to ensure DOM is fully updated
    // This prevents Atlas from trying to discover members before they're rendered
    requestAnimationFrame(() => {
        import('../../src/core/Atlas.js')
            .then(module => {
                const Atlas = module.default;
                new Atlas({ debug: false });
            })
            .catch(err => {
                console.error('Failed to load Atlas:', err);
            });
    });
}

// ─── Code Display Helper ─────────────────────────────

export function displayCode(htmlSelector, cssSelector) {
    const htmlEl = document.querySelector(htmlSelector);
    const cssEl = document.querySelector(cssSelector);

    if (htmlEl) {
        const atlasContainer = document.querySelector('[data-atlas]');
        if (atlasContainer) {
            const clone = atlasContainer.cloneNode(true);
            const codeSections = clone.querySelectorAll('.code-section');
            codeSections.forEach(el => el.remove());
            htmlEl.textContent = clone.outerHTML;
        }
    }

    if (cssEl) {
        const styles = [];
        document.querySelectorAll('style').forEach(el => {
            // Skip if it's the code section styles (they're not part of the example)
            if (el.id !== 'code-section-styles') {
                styles.push(el.textContent);
            }
        });
        cssEl.textContent = styles.join('\n\n');
    }
}