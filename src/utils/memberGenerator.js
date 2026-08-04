/**
 * Member Generator — Creates test data for performance testing
 *
 * This generates realistic Star Wars-themed member data with:
 * - 1,000 members (or customisable count)
 * - Names, species, occupations, factions, homeworlds, statuses
 * - Face claims (actors) for each member
 */

// ─── Data Pools ─────────────────────────────────────

const FIRST_NAMES = [
    // Human
    'Luke', 'Leia', 'Han', 'Rey', 'Finn', 'Poe', 'Jyn', 'Cassian', 'K-2SO', 'Bodhi',
    'Chirrut', 'Baze', 'Lando', 'Qi\'ra', 'Enfys', 'Jyn', 'Galactic', 'Imperial',
    'Din', 'Cara', 'Bo-Katan', 'Fennec', 'Moff', 'Gideon', 'Ahsoka', 'Boba',
    'Sabine', 'Ezra', 'Kanan', 'Hera', 'Zeb', 'Thrawn', 'Tarkin', 'Krennic',
    'Imperial', 'Rebel', 'Mandalorian', 'Wookiee', 'Togruta', 'Zabrak',
    'Aayla', 'Kit', 'Plo', 'Shaak', 'Luminara', 'Quinlan', 'Mace', 'Yoda',
    'Anakin', 'Obi-Wan', 'Qui-Gon', 'Padme', 'Jar Jar', 'Bossk', 'Dengar',
    'Kylo', 'Snoke', 'Phasma', 'Hux', 'Solo', 'Cal', 'Cere', 'Merrin',
    'Greez', 'Cal', 'Trilla', 'Malicos', 'Taron', 'Saw', 'Jaro', 'Enfys',
    'Baze', 'Chirrut', 'Bodhi', 'Cassian', 'K-2SO', 'Galen', 'Lyra', 'Orson'
];

const LAST_NAMES = [
    // Human surnames
    'Skywalker', 'Solo', 'Organa', 'Dameron', 'Erso', 'Andor', 'Rook',
    'Calrissian', 'Malbus', 'Imwe', 'Casterfo', 'Kay', 'Garra', 'Djarin',
    'Dune', 'Kryze', 'Shand', 'Fett', 'Tano', 'Wren', 'Bridger', 'Jarrus',
    'Sindulla', 'Orrelios', 'Azmorgan', 'Tarkin', 'Krennic', 'Motti', 'Tagge',
    'Piett', 'Veers', 'Yularen', 'Crix', 'Halcyon', 'Casterfo', 'Varro',
    'Tak', 'Rey', 'Finn', 'Poe', 'Jyn', 'Cassian', 'Bodhi', 'Lando',
    'Qi\'ra', 'Enfys', 'Nebula', 'Storm', 'Rogue', 'Ghost', 'Phantom'
];

const SPECIES = [
    'Human', 'Togruta', 'Twilek', 'Zabrak', 'Mandalorian', 'Wookiee',
    'Rodian', 'Chiss', 'Duros', 'Ithorian', 'Mon Calamari', 'Quarren',
    'Gran', 'Jawa', 'Tusken Raider', 'Dathomirian', 'Mirialan',
    'Nautolan', 'Kel Dor', 'Droid', 'Cyborg', 'Genetically Enhanced',
    'Cloned', 'Trandoshan', 'Bothan', 'Cerean', 'Chagrian', 'Devaronian'
];

const OCCUPATIONS = [
    'Jedi', 'Sith', 'Bounty Hunter', 'Smuggler', 'Pilot', 'Soldier',
    'Commander', 'General', 'Admiral', 'Captain', 'Mercenary', 'Assassin',
    'Engineer', 'Technician', 'Scientist', 'Diplomat', 'Senator', 'Guard',
    'Scout', 'Infiltrator', 'Demolitions', 'Medic', 'Healer', 'Martial Artist',
    'Sniper', 'Demolitions', 'Tactician', 'Strategist', 'Intelligence',
    'Spy', 'Courier', 'Gunner', 'Berserker', 'Gladiator', 'Warlord',
    'Chieftain', 'Shaman', 'Priest', 'Monk', 'Pirate', 'Fleet Commander'
];

const FACTIONS = [
    'Rebellion', 'Empire', 'Mandalorian', 'Independent', 'Jedi Order',
    'Sith Order', 'Crimson Dawn', 'Hutt Cartel', 'Trade Federation',
    'Separatists', 'Clone Army', 'Resistance', 'First Order',
    'Galactic Republic', 'Rogue One', 'Ghost Crew', 'Spectres',
    'Nightsisters', 'Dathomiri', 'Mandalorian Clan', 'Mandalorian Neo'
];

const HOMEWORLDS = [
    'Tatooine', 'Alderaan', 'Coruscant', 'Naboo', 'Kashyyyk', 'Ryloth',
    'Mandalore', 'Kalevala', 'Shili', 'Dathomir', 'Utapau', 'Kamino',
    'Geonosis', 'Felucia', 'Cato Neimoidia', 'Mygeeto', 'Saleucami',
    'Christophsis', 'Lothal', 'Concord Dawn', 'Krownest', 'Canto Bight',
    'Crait', 'Starkiller Base', 'D\'Qar', 'Rogue One', 'Jedha', 'Eadu',
    'Ring of Kafrene', 'Coruscant', 'Corellia', 'Tython', 'Ossus',
    'Ilum', 'Mimban', 'Kessel', 'Nal Hutta', 'Trandosha', 'Bothawui',
    'Druckenwell', 'Er\'kit', 'Fondor', 'Kuat', 'Mon Cala', 'Ord Mantell',
    'Pzob', 'Sullust', 'Taris', 'Yavin 4', 'Endor', 'Hoth', 'Bespin',
    'Aq Vetina', 'Kamino', 'Vardos', 'Pillio', 'Jakku', 'Takodana',
    'Ahch-To', 'Cantonica', 'Castilon', 'D\'Qar', 'Lothal', 'Ryloth'
];

const FACE_CLAIMS = [
    // Star Wars Actors
    'Mark Hamill', 'Carrie Fisher', 'Harrison Ford', 'Daisy Ridley', 'John Boyega',
    'Oscar Isaac', 'Felicity Jones', 'Diego Luna', 'Alan Tudyk', 'Riz Ahmed',
    'Donnie Yen', 'Jiang Wen', 'Donald Glover', 'Emilia Clarke', 'Erin Kellyman',
    'Pedro Pascal', 'Gina Carano', 'Katee Sackhoff', 'Ming-Na Wen', 'Giancarlo Esposito',
    'Rosario Dawson', 'Temuera Morrison', 'Sasha Banks', 'Ariana Greenblatt',
    'Jude Law', 'Bill Burr', 'Amandla Stenberg', 'Lee Jung-jae', 'Lars Mikkelsen',
    'Hayden Christensen', 'Ewan McGregor', 'Natalie Portman', 'Liam Neeson',
    'Ahmed Best', 'Dee Bradley Baker', 'Clancy Brown', 'Ashley Eckstein',
    'Sam Witwer', 'David Oyelowo', 'Taylor Gray', 'Vanessa Marshall',
    'Freddie Prinze Jr.', 'Steve Blum', 'Lars Mikkelsen', 'Seth Green',
    'Anthony Daniels', 'Kenny Baker', 'Peter Mayhew', 'Ian McDiarmid',
    'Andy Serkis', 'Gwendoline Christie', 'Domhnall Gleeson', 'Adam Driver'
];

const STATUSES = ['Active', 'Inactive', 'Deceased', 'Unknown', 'Missing', 'Captured'];

// ─── Generator Functions ────────────────────────────

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName() {
    return randomItem(FIRST_NAMES) + ' ' + randomItem(LAST_NAMES);
}

function generateStatus() {
    // Weighted random — more Active, fewer Deceased
    const weights = [70, 15, 5, 5, 3, 2]; // Active, Inactive, Deceased, Unknown, Missing, Captured
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return STATUSES[i];
        }
    }
    return STATUSES[0];
}

function generateMember(index) {
    const name = generateName();
    const species = randomItem(SPECIES);
    const occupation = randomItem(OCCUPATIONS);
    const faction = randomItem(FACTIONS);
    const homeworld = randomItem(HOMEWORLDS);
    const faceclaim = randomItem(FACE_CLAIMS);
    const status = generateStatus();

    return {
        name,
        species,
        occupation,
        faction,
        homeworld,
        faceclaim,
        status,
        id: `member-${index}`
    };
}

// ─── Main Generator ──────────────────────────────────

export function generateMembers(count = 1000) {
    const members = [];
    for (let i = 0; i < count; i++) {
        members.push(generateMember(i));
    }
    return members;
}

export function generateMemberHTML(member) {
    return `
        <article data-member>
            <div><strong>Name:</strong> <span data-field="name" data-searchable="true" data-sortable="true" data-filterable="false">${member.name}</span></div>
            <div><strong>Faceclaim:</strong> <span data-field="faceclaim" data-searchable="true" data-sortable="true" data-filterable="false">${member.faceclaim}</span></div>
            <div><strong>Species:</strong> <span data-field="species" data-sortable="true">${member.species}</span></div>
            <div><strong>Occupation:</strong> <span data-field="occupation" data-searchable="true" data-sortable="true">${member.occupation}</span></div>
            <div><strong>Faction:</strong> <span data-field="faction" data-sortable="true">${member.faction}</span></div>
            <div><strong>Homeworld:</strong> <span data-field="homeworld" data-searchable="true" data-sortable="true">${member.homeworld}</span></div>
            <div><strong>Status:</strong> <span data-field="status" data-sortable="true">${member.status}</span></div>
        </article>
    `;
}

export function renderMembers(container, count = 1000) {
    const members = generateMembers(count);
    const html = members.map(m => generateMemberHTML(m)).join('');
    container.innerHTML = html;
    return members;
}