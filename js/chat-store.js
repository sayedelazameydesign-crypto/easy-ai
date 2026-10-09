/**
 * Easy AI - Chat persistence.
 *
 * Stores the visible conversation so a reload does not wipe it, with hard caps
 * so a long session cannot grow without bound (and cannot be used to fill the
 * visitor's quota):
 *
 *   MAX_MESSAGES        100   oldest are dropped first
 *   MAX_MESSAGE_CHARS   20000 a longer message is truncated and marked
 *
 * Everything stored here is *user-visible chat text*. Nothing from the sync
 * channel and no credential ever passes through it.
 *
 * UMD: loaded as a plain <script> in the browser, required directly by the
 * Node test suite. No browser globals are touched at load time except through
 * SafeStorage.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./storage.js'));
    } else {
        root.ChatStore = factory(root.SafeStorage);
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (storage) {
    'use strict';

    var KEY = 'easy-ai-chat-v1';
    var MAX_MESSAGES = 100;
    var MAX_MESSAGE_CHARS = 20000;
    var SCHEMA = 1;

    function clampInt(value, fallback, min, max) {
        var n = typeof value === 'number' && isFinite(value) ? Math.floor(value) : fallback;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    /**
     * Normalise one record. Returns null for anything that is not a usable
     * message, so corrupt entries are dropped instead of rendered.
     */
    function normalizeMessage(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

        var role = raw.role === 'user' ? 'user' : (raw.role === 'ai' ? 'ai' : null);
        if (!role) return null;

        var text = typeof raw.text === 'string' ? raw.text : '';
        var truncated = false;
        if (text.length > MAX_MESSAGE_CHARS) {
            text = text.slice(0, MAX_MESSAGE_CHARS);
            truncated = true;
        }

        var key = typeof raw.key === 'string' && raw.key ? raw.key : null;
        if (!text && !key) return null;   // nothing to show

        return {
            role: role,
            text: text,
            key: key,                     // i18n key, when the message is translatable
            ts: clampInt(raw.ts, 0, 0, Number.MAX_SAFE_INTEGER),
            truncated: truncated || raw.truncated === true
        };
    }

    function normalizeList(raw) {
        if (!Array.isArray(raw)) return [];
        var out = [];
        for (var i = 0; i < raw.length; i++) {
            var msg = normalizeMessage(raw[i]);
            if (msg) out.push(msg);
        }
        // Enforce the cap on the way in too: a hand-edited or legacy payload
        // must not load 10k messages into the DOM.
        return out.length > MAX_MESSAGES ? out.slice(out.length - MAX_MESSAGES) : out;
    }

    function create(options) {
        options = options || {};
        var store = options.storage || storage;
        var key = options.key || KEY;
        var messages = [];
        var loaded = false;
        var persistFailed = false;

        function persist() {
            var ok = store.setJSON(key, { schema: SCHEMA, messages: messages });
            persistFailed = !ok;
            return ok;
        }

        function load() {
            if (loaded) return messages;
            loaded = true;
            var data = store.getJSON(key, null);
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                messages = [];
                return messages;
            }
            // A different schema is treated as absent, not as garbage to render.
            if (data.schema !== SCHEMA) {
                messages = [];
                return messages;
            }
            messages = normalizeList(data.messages);
            return messages;
        }

        return {
            MAX_MESSAGES: MAX_MESSAGES,
            MAX_MESSAGE_CHARS: MAX_MESSAGE_CHARS,

            load: load,

            /** All stored messages, oldest first. Never returns a live array. */
            all: function () {
                return load().slice();
            },

            count: function () {
                return load().length;
            },

            /**
             * Append one message. Returns the normalised record, or null when it
             * carried nothing renderable.
             */
            append: function (msg) {
                load();
                var clean = normalizeMessage(msg);
                if (!clean) return null;
                if (!clean.ts) clean.ts = Date.now();
                messages.push(clean);
                if (messages.length > MAX_MESSAGES) {
                    messages = messages.slice(messages.length - MAX_MESSAGES);
                }
                persist();
                return clean;
            },

            clear: function () {
                messages = [];
                loaded = true;
                store.remove(key);
                persistFailed = false;
            },

            isEmpty: function () {
                return load().length === 0;
            },

            /** True when the last write did not reach durable storage. */
            persistFailed: function () {
                return persistFailed;
            },

            isAvailable: function () {
                return store.isAvailable();
            }
        };
    }

    return {
        create: create,
        normalizeMessage: normalizeMessage,
        normalizeList: normalizeList,
        KEY: KEY,
        SCHEMA: SCHEMA,
        MAX_MESSAGES: MAX_MESSAGES,
        MAX_MESSAGE_CHARS: MAX_MESSAGE_CHARS
    };
}));
