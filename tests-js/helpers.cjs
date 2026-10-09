'use strict';

/**
 * Shared helpers for the Node-side JS tests.
 *
 * These tests exercise the real modules — the same files the browser loads —
 * with a fake storage backend. No jsdom, no build step: `node --test tests-js`.
 */

/** In-memory stand-in for window.localStorage, with a quota and a kill switch. */
function createFakeStorage(options) {
    const opts = options || {};
    const data = new Map();
    const state = {
        available: opts.available !== false,
        quota: opts.quota || Infinity,
        used: 0,
        reads: 0,
        writes: 0,
        removals: 0,
        failNext: null
    };

    return {
        _state: state,
        _data: data,

        isAvailable() {
            return state.available;
        },
        unavailableReason() {
            return state.available ? '' : (opts.reason || 'forced');
        },
        get(key) {
            state.reads += 1;
            if (!state.available) throw new Error('storage disabled');
            return data.has(key) ? data.get(key) : null;
        },
        set(key, value) {
            state.writes += 1;
            if (!state.available) throw new Error('storage disabled');
            if (state.failNext === 'write') {
                state.failNext = null;
                throw new Error('QuotaExceededError');
            }
            const text = String(value);
            // Track current size per key: rewriting one key replaces its bytes,
            // it does not add to them (a conversation is re-serialized whole).
            const previous = data.has(key) ? data.get(key).length : 0;
            if (state.used - previous + text.length > state.quota) {
                throw new Error('QuotaExceededError');
            }
            state.used += text.length - previous;
            data.set(key, text);
            return true;
        },
        remove(key) {
            state.removals += 1;
            if (!state.available) throw new Error('storage disabled');
            const existing = data.get(key);
            if (existing) state.used -= existing.length;
            data.delete(key);
        },
        getJSON(key, fallback) {
            let raw;
            try {
                raw = this.get(key);
            } catch (err) {
                return fallback;
            }
            if (raw === null || raw === undefined || raw === '') return fallback;
            try {
                const parsed = JSON.parse(raw);
                return parsed === null || parsed === undefined ? fallback : parsed;
            } catch (err) {
                return fallback;
            }
        },
        setJSON(key, value) {
            try {
                return this.set(key, JSON.stringify(value));
            } catch (err) {
                return false;
            }
        }
    };
}

/**
 * A minimal i18n backed by the real translation tables from js/i18n.js, so
 * ai.js resolves keys exactly as it does in the browser.
 */
function createI18nStub(language) {
    const translations = require('../js/i18n.js').translations;
    let lang = language || 'ar';
    return {
        translations,
        t(key) {
            if (typeof key !== 'string') return '';
            const table = translations[lang] || translations.en;
            if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
            if (Object.prototype.hasOwnProperty.call(translations.en, key)) return translations.en[key];
            return key;
        },
        getLanguage() {
            return lang;
        },
        setLanguage(next) {
            lang = next;
        }
    };
}

/**
 * Install the stub as window.i18n for modules that read it at call time.
 * Handles async callbacks: the stub must stay installed until the returned
 * promise settles, otherwise a later `i18n.t()` resolves to a raw key.
 */
function withI18n(language, fn) {
    global.window = global.window || {};
    const hadWindowI18n = Object.prototype.hasOwnProperty.call(global.window, 'i18n');
    const previous = global.window.i18n;
    global.window.i18n = createI18nStub(language);

    const restore = () => {
        if (hadWindowI18n) global.window.i18n = previous;
        else delete global.window.i18n;
    };

    let result;
    try {
        result = fn(global.window.i18n);
    } catch (err) {
        restore();
        throw err;
    }
    if (result && typeof result.then === 'function') {
        return result.then(
            (value) => { restore(); return value; },
            (err) => { restore(); throw err; }
        );
    }
    restore();
    return result;
}

module.exports = { createFakeStorage, createI18nStub, withI18n };
