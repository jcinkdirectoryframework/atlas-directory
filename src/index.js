/**
 * Atlas — A dependency-free, HTML-driven directory engine
 *
 * Public API exports
 *
 * Version 1.0.0
 * Copyright (c) 2026 Maeve
 * License: MIT
 * https://github.com/jcinkdirectoryframework/atlas-directory
 */

// ─── Core Classes ─────────────────────────────────────

import Atlas from './core/Atlas.js';
import EventBus from './core/EventBus.js';
import Store from './core/Store.js';
import Registry from './core/Registry.js';
import Member from './core/Member.js';
import MemberCollection from './core/MemberCollection.js';
import Renderer from './core/Renderer.js';
import URLManager from './core/URLManager.js';

// ─── Adapters ─────────────────────────────────────────

import JCinkAdapter from './adapters/JCinkAdapter.js';

// ─── Modules ──────────────────────────────────────────

import FilterGenerator from './modules/FilterGenerator.js';
import FilterChips from './modules/FilterChips.js';
import ResultCounter from './modules/ResultCounter.js';
import SortGenerator from './modules/SortGenerator.js';
import LayoutManager from './modules/LayoutManager.js';

// ─── Main Export ──────────────────────────────────────

// Default export — the main Atlas class
export default Atlas;

// ─── Named Exports ────────────────────────────────────

// Core classes
export {
    EventBus,
    Store,
    Registry,
    Member,
    MemberCollection,
    Renderer,
    URLManager
};

// Adapters
export {
    JCinkAdapter
};

// Modules (for advanced users who want to use them directly)
export {
    FilterGenerator,
    FilterChips,
    ResultCounter,
    SortGenerator,
    LayoutManager
};