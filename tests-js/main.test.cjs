'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { isAppShortcut, formatTime } = require('../js/main.js');

function keyEvent(props) {
    return Object.assign({ key: '', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false },
        props);
}

test('Ctrl/Cmd+L is never claimed — it belongs to the browser', () => {
    // The previous revision called preventDefault() on Ctrl+L, stealing the
    // address-bar shortcut (and the AI-sidebar shortcut in some browsers).
    assert.equal(isAppShortcut(keyEvent({ key: 'l', ctrlKey: true })), null);
    assert.equal(isAppShortcut(keyEvent({ key: 'l', metaKey: true })), null);
    assert.equal(isAppShortcut(keyEvent({ key: 'L', ctrlKey: true })), null);
    // Ctrl+Alt+L / Ctrl+Shift+Alt+L are not ours either.
    assert.equal(isAppShortcut(keyEvent({ key: 'l', ctrlKey: true, altKey: true })), null);
    assert.equal(isAppShortcut(keyEvent({ key: 'l', ctrlKey: true, shiftKey: true, altKey: true })),
        null);
});

test('language toggle moved to Ctrl/Cmd+Shift+L', () => {
    assert.equal(isAppShortcut(keyEvent({ key: 'l', ctrlKey: true, shiftKey: true })),
        'toggle-language');
    assert.equal(isAppShortcut(keyEvent({ key: 'L', metaKey: true, shiftKey: true })),
        'toggle-language');
});

test('Ctrl/Cmd+K focuses the chat', () => {
    assert.equal(isAppShortcut(keyEvent({ key: 'k', ctrlKey: true })), 'focus-chat');
    assert.equal(isAppShortcut(keyEvent({ key: 'k', metaKey: true })), 'focus-chat');
    // Ctrl+Shift+K (devtools) and Ctrl+Alt+K are left to the browser.
    assert.equal(isAppShortcut(keyEvent({ key: 'k', ctrlKey: true, shiftKey: true })), null);
    assert.equal(isAppShortcut(keyEvent({ key: 'k', ctrlKey: true, altKey: true })), null);
});

test('Escape cancels, and only Escape', () => {
    assert.equal(isAppShortcut(keyEvent({ key: 'Escape' })), 'cancel');
    assert.equal(isAppShortcut(keyEvent({ key: 'Esc' })), null);
});

test('ordinary typing is never intercepted', () => {
    for (const key of ['a', 'Z', '1', ' ', 'Enter', 'Tab', 'Backspace', 'ArrowUp',
                       'مرحبا', '?', 'F5', 'PageDown']) {
        assert.equal(isAppShortcut(keyEvent({ key })), null, `key: ${key}`);
    }
    // Plain Shift/Ctrl/Alt presses with no letter are not shortcuts.
    assert.equal(isAppShortcut(keyEvent({ key: 'Shift', shiftKey: true })), null);
    assert.equal(isAppShortcut(keyEvent({ key: 'Control', ctrlKey: true })), null);
});

test('malformed events are ignored instead of throwing', () => {
    assert.equal(isAppShortcut(null), null);
    assert.equal(isAppShortcut(undefined), null);
    assert.equal(isAppShortcut({}), null);
    assert.equal(isAppShortcut({ key: 42 }), null);
    assert.equal(isAppShortcut({ key: null, ctrlKey: true }), null);
});

test('formatTime renders both locales and survives junk input', () => {
    global.window = { i18n: { getLanguage: () => 'en' } };
    const fixed = Date.UTC(2026, 9, 9, 13, 45, 0);
    const en = formatTime(fixed);
    assert.match(en, /1[34]:45|01:45/);          // 12h or 24h depending on the ICU build
    assert.equal(typeof en, 'string');

    global.window.i18n.getLanguage = () => 'ar';
    const ar = formatTime(fixed);
    assert.equal(typeof ar, 'string');
    assert.ok(ar.length > 0);

    // No timestamp, no i18n, no Intl: still a string, never a throw.
    assert.equal(typeof formatTime(0), 'string');
    assert.equal(typeof formatTime(-1), 'string');
    assert.equal(typeof formatTime('not a number'), 'string');
    delete global.window;
    assert.equal(typeof formatTime(fixed), 'string');
});
