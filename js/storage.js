/**
 * Easy AI - Safe storage wrapper.
 *
 * `localStorage` throws in several real situations instead of returning null:
 * Safari private mode, `--disable-local-storage`, cookies blocked for the site,
 * or a page served from an opaque origin. Touching it directly at module scope
 * (as i18n.js used to) turns any of those into a dead page.
 *
 * Every access goes through here, and a failure degrades to memory-only:
 * the UI keeps working, persistence is simply unavailable, and `isAvailable()`
 * says so honestly instead of the app pretending it saved something.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SafeStorage = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var memory = Object.create(null);
    var available = false;
    var reason = '';

    function backend() {
        try {
            var ls = (typeof window !== 'undefined' && window.localStorage) || null;
            if (!ls) return null;
            // Probe: some implementations allow reads but throw on writes.
            var probe = '__easy_ai_probe__';
            ls.setItem(probe, '1');
            ls.removeItem(probe);
            return ls;
        } catch (err) {
            return null;
        }
    }

    var ls = backend();
    if (ls) {
        available = true;
    } else {
        reason = typeof window === 'undefined'
            ? 'no-window'
            : 'unavailable';
    }

    function get(key) {
        if (!available) {
            return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
        }
        try {
            return ls.getItem(key);
        } catch (err) {
            available = false;
            reason = 'read-failed';
            return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
        }
    }

    function set(key, value) {
        var text = String(value);
        memory[key] = text;
        if (!available) return false;
        try {
            ls.setItem(key, text);
            return true;
        } catch (err) {
            // Quota exceeded or the backend died mid-session: fall back to
            // memory and report it, never throw at the caller.
            available = false;
            reason = 'write-failed';
            return false;
        }
    }

    function remove(key) {
        delete memory[key];
        if (!available) return;
        try {
            ls.removeItem(key);
        } catch (err) {
            available = false;
            reason = 'remove-failed';
        }
    }

    /**
     * Read and parse JSON. Corrupt or foreign data yields `fallback`, never an
     * exception — a poisoned key must not brick the chat on every reload.
     */
    function getJSON(key, fallback) {
        var raw = get(key);
        if (raw === null || raw === undefined || raw === '') return fallback;
        try {
            var parsed = JSON.parse(raw);
            return parsed === null || parsed === undefined ? fallback : parsed;
        } catch (err) {
            return fallback;
        }
    }

    function setJSON(key, value) {
        try {
            return set(key, JSON.stringify(value));
        } catch (err) {
            return false;
        }
    }

    return {
        get: get,
        set: set,
        remove: remove,
        getJSON: getJSON,
        setJSON: setJSON,
        isAvailable: function () { return available; },
        /** Why persistence is off: '' | 'unavailable' | 'read-failed' | … */
        unavailableReason: function () { return reason; },
        /** Test seam: force the memory-only path. */
        _forceUnavailable: function (why) {
            available = false;
            reason = why || 'forced';
            memory = Object.create(null);
        },
        _reset: function () {
            memory = Object.create(null);
            ls = backend();
            available = !!ls;
            reason = ls ? '' : 'unavailable';
        }
    };
}));
