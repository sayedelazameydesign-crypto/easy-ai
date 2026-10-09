'use strict';

/**
 * A deliberately small DOM stand-in — enough of the surface js/main.js touches
 * to drive a real conversation through it in Node. It is not jsdom and does not
 * pretend to be a browser: it exists to catch wiring mistakes (stale replies,
 * XSS-shaped text, persistence, cancellation) without a browser in CI.
 */

const ELEMENT_IDS = [
    'chatInput', 'sendBtn', 'chatMessages', 'clearChat', 'chatSuggestions',
    'chatLive', 'attachBtn', 'voiceBtn', 'langToggle', 'langLabel', 'menuToggle'
];

function matches(node, selector) {
    if (!selector) return false;
    if (selector.startsWith('#')) return node.id === selector.slice(1);
    if (selector.startsWith('.')) {
        return String(node.className || '').split(/\s+/).includes(selector.slice(1));
    }
    if (selector.startsWith('[') && selector.endsWith(']')) {
        return node.attributes.has(selector.slice(1, -1));
    }
    return String(node.tagName || '').toLowerCase() === selector.toLowerCase();
}

function compoundMatches(node, selector) {
    const trimmed = String(selector || '').trim();
    if (!trimmed) return false;

    // Descendant combinator: only the right-most part is tested against the
    // node itself (good enough for the flat structures main.js queries).
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) return compoundMatches(node, parts[parts.length - 1]);

    // Compound selectors like "div.message" or ".a.b": every token must match.
    const tokens = trimmed.split('.');
    const tagName = tokens[0] === '' ? null : tokens[0];
    const classes = tokens.slice(1);

    if (tagName && !matches(node, tagName)) return false;
    const nodeClasses = String(node.className || '').split(/\s+/);
    return classes.every(cls => nodeClasses.includes(cls));
}

function walk(node, visit) {
    for (const child of node.children) {
        visit(child);
        walk(child, visit);
    }
}

function createElement(tagName, doc) {
    const node = {
        tagName: String(tagName).toUpperCase(),
        nodeType: 1,
        id: '',
        className: '',
        textContent: '',
        placeholder: '',
        value: '',
        title: '',
        disabled: false,
        scrollTop: 0,
        scrollHeight: 0,
        children: [],
        parentNode: null,
        attributes: new Map(),
        style: {},
        handlers: new Map(),
        classList: {
            add(...names) {
                const set = new Set(String(node.className).split(/\s+/).filter(Boolean));
                names.forEach(n => set.add(n));
                node.className = [...set].join(' ');
            },
            remove(...names) {
                const set = new Set(String(node.className).split(/\s+/).filter(Boolean));
                names.forEach(n => set.delete(n));
                node.className = [...set].join(' ');
            },
            toggle(name, force) {
                const set = new Set(String(node.className).split(/\s+/).filter(Boolean));
                const shouldAdd = force === undefined ? !set.has(name) : !!force;
                if (shouldAdd) set.add(name); else set.delete(name);
                node.className = [...set].join(' ');
                return shouldAdd;
            },
            contains(name) {
                return String(node.className).split(/\s+/).includes(name);
            }
        },
        setAttribute(name, value) {
            node.attributes.set(name, String(value));
            if (name === 'id') node.id = String(value);
            if (name === 'class') node.className = String(value);
        },
        getAttribute(name) {
            return node.attributes.has(name) ? node.attributes.get(name) : null;
        },
        hasAttribute(name) {
            return node.attributes.has(name);
        },
        removeAttribute(name) {
            node.attributes.delete(name);
        },
        appendChild(child) {
            child.parentNode = node;
            node.children.push(child);
            return child;
        },
        removeChild(child) {
            const index = node.children.indexOf(child);
            if (index >= 0) node.children.splice(index, 1);
            child.parentNode = null;
            return child;
        },
        remove() {
            if (node.parentNode) node.parentNode.removeChild(node);
            doc._forget(node);
        },
        addEventListener(type, fn) {
            if (!node.handlers.has(type)) node.handlers.set(type, []);
            node.handlers.get(type).push(fn);
        },
        removeEventListener(type, fn) {
            const list = node.handlers.get(type) || [];
            const index = list.indexOf(fn);
            if (index >= 0) list.splice(index, 1);
        },
        dispatchEvent(event) {
            const list = (node.handlers.get(event.type) || []).slice();
            list.forEach(fn => fn.call(node, event));
            return true;
        },
        querySelector(selector) {
            let found = null;
            walk(node, (child) => {
                if (!found && compoundMatches(child, selector)) found = child;
            });
            return found;
        },
        querySelectorAll(selector) {
            const out = [];
            walk(node, (child) => {
                if (compoundMatches(child, selector)) out.push(child);
            });
            return out;
        },
        focus() { node.focused = true; },
        blur() { node.focused = false; },
        scrollIntoView() {}
    };
    return node;
}

function createDocument() {
    const byId = new Map();
    const doc = {
        nodeType: 9,
        documentElement: createElement('html'),
        body: createElement('body'),
        handlers: new Map(),

        createElement: (tag) => createElement(tag, doc),
        createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
        getElementById(id) {
            // Registered elements first, then a live walk: nodes created at
            // runtime (like #typingIndicator) must be findable too, exactly as
            // they are in a real document.
            if (byId.has(id)) return byId.get(id);
            let found = null;
            walk(doc.body, (node) => {
                if (!found && node.id === id) found = node;
            });
            if (found) byId.set(id, found);
            return found;
        },
        querySelector(selector) {
            return doc.body.querySelector(selector);
        },
        querySelectorAll(selector) {
            return doc.body.querySelectorAll(selector);
        },
        addEventListener(type, fn) {
            if (!doc.handlers.has(type)) doc.handlers.set(type, []);
            doc.handlers.get(type).push(fn);
        },
        dispatchEvent(event) {
            const list = (doc.handlers.get(event.type) || []).slice();
            list.forEach(fn => fn(event));
            return true;
        },
        /** Test helper: fire a document-level event. */
        emit(type, props) {
            return doc.dispatchEvent(Object.assign({ type }, props));
        },
        /** Test helper: register an element so getElementById finds it. */
        register(node) {
            if (node.id) byId.set(node.id, node);
            doc.body.appendChild(node);
            return node;
        },
        /** Drop a removed node from the id cache so lookups stay truthful. */
        _forget(node) {
            if (node.id && byId.get(node.id) === node) byId.delete(node.id);
        }
    };

    // Seed the elements the chat needs, mirroring index.html.
    ELEMENT_IDS.forEach(id => {
        const tag = id === 'chatInput' ? 'textarea' : 'div';
        const node = createElement(tag, doc);
        node.id = id;
        byId.set(id, node);
        doc.body.appendChild(node);
    });

    // index.html's send button wraps its glyph in a span the UI swaps between
    // "send" and "stop"; mirror that so the pending state is observable.
    const sendBtn = byId.get('sendBtn');
    const sendIcon = createElement('span', doc);
    sendIcon.className = 'send-icon';
    sendIcon.textContent = '\u27A4';
    sendBtn.appendChild(sendIcon);

    // The log is a labelled live region in index.html.
    const chatMessages = byId.get('chatMessages');
    chatMessages.setAttribute('role', 'log');
    chatMessages.setAttribute('aria-live', 'polite');
    chatMessages.setAttribute('aria-label', 'message log');
    byId.get('chatLive').setAttribute('role', 'status');

    // The welcome message is part of the markup in index.html.
    const welcome = createElement('div', doc);
    welcome.className = 'message ai-message';
    const welcomeContent = createElement('div', doc);
    welcomeContent.className = 'message-content';
    const welcomeText = createElement('p', doc);
    welcomeText.textContent = 'welcome';
    welcomeContent.appendChild(welcomeText);
    welcome.appendChild(welcomeContent);
    doc.getElementById('chatMessages').appendChild(welcome);

    return doc;
}

module.exports = { createDocument, createElement };
