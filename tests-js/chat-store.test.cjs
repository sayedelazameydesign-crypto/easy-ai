'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const SafeStorage = require('../js/storage.js');
const ChatStore = require('../js/chat-store.js');
const { createFakeStorage } = require('./helpers.cjs');

test('safe storage degrades to memory when there is no browser storage', () => {
    // Node has no window.localStorage: the module must not throw at load time.
    assert.equal(SafeStorage.isAvailable(), false);
    assert.notEqual(SafeStorage.unavailableReason(), '');

    assert.equal(SafeStorage.set('k', 'v'), false);   // reports "not persisted"
    assert.equal(SafeStorage.get('k'), 'v');          // but still works in-session
    SafeStorage.remove('k');
    assert.equal(SafeStorage.get('k'), null);
});

test('safe storage never throws on corrupt JSON and returns the fallback', () => {
    assert.deepEqual(SafeStorage.getJSON('nope', { d: 1 }), { d: 1 });
    SafeStorage.set('broken', '{not json');
    assert.deepEqual(SafeStorage.getJSON('broken', []), []);
    SafeStorage.set('nullish', 'null');
    assert.deepEqual(SafeStorage.getJSON('nullish', 'fallback'), 'fallback');
});

test('chat store survives a reload (round trip through storage)', () => {
    const backend = createFakeStorage();
    const first = ChatStore.create({ storage: backend });
    first.append({ role: 'user', text: 'مرحبا', ts: 1000 });
    first.append({ role: 'ai', text: 'أهلا بك', key: 'ai.greeting', ts: 1001 });

    // A brand new instance reading the same backend = a page reload.
    const second = ChatStore.create({ storage: backend });
    const messages = second.all();
    assert.equal(messages.length, 2);
    assert.deepEqual(
        messages.map(m => [m.role, m.text, m.key]),
        [['user', 'مرحبا', null], ['ai', 'أهلا بك', 'ai.greeting']]
    );
    assert.equal(second.count(), 2);
    assert.equal(second.isEmpty(), false);
    assert.equal(second.persistFailed(), false);
});

test('chat store keeps only the newest 100 messages', () => {
    const backend = createFakeStorage();
    const store = ChatStore.create({ storage: backend });
    for (let i = 0; i < 150; i++) {
        store.append({ role: 'user', text: `message ${i}`, ts: i });
    }
    assert.equal(store.count(), ChatStore.MAX_MESSAGES);
    assert.equal(store.count(), 100);
    const all = store.all();
    assert.equal(all[0].text, 'message 50');        // oldest 50 dropped
    assert.equal(all[all.length - 1].text, 'message 149');
});

test('the cap is re-applied when loading an oversized payload', () => {
    const backend = createFakeStorage();
    const oversized = [];
    for (let i = 0; i < 5000; i++) oversized.push({ role: 'user', text: `m${i}`, ts: i });
    backend.setJSON(ChatStore.KEY, { schema: ChatStore.SCHEMA, messages: oversized });

    const store = ChatStore.create({ storage: backend });
    assert.equal(store.count(), 100);
    assert.equal(store.all()[99].text, 'm4999');
});

test('an over-long message is truncated and flagged, not rejected', () => {
    const backend = createFakeStorage();
    const store = ChatStore.create({ storage: backend });
    const long = 'ا'.repeat(ChatStore.MAX_MESSAGE_CHARS + 5000);
    const stored = store.append({ role: 'user', text: long, ts: 1 });

    assert.equal(stored.text.length, ChatStore.MAX_MESSAGE_CHARS);
    assert.equal(stored.text.length, 20000);
    assert.equal(stored.truncated, true);

    // The truncation survives the round trip, so the UI can keep saying so.
    const reloaded = ChatStore.create({ storage: backend }).all()[0];
    assert.equal(reloaded.text.length, 20000);
    assert.equal(reloaded.truncated, true);
});

test('corrupt storage content yields an empty conversation, never a crash', () => {
    const cases = ['{not json', '[]', '"a string"', '42', 'null', '{"schema":1}'];
    for (const raw of cases) {
        const backend = createFakeStorage();
        backend.set(ChatStore.KEY, raw);
        const store = ChatStore.create({ storage: backend });
        assert.deepEqual(store.all(), [], `raw=${raw}`);
        assert.equal(store.isEmpty(), true, `raw=${raw}`);
    }
});

test('a foreign schema version is treated as absent', () => {
    const backend = createFakeStorage();
    backend.setJSON(ChatStore.KEY, {
        schema: ChatStore.SCHEMA + 99,
        messages: [{ role: 'user', text: 'from the future', ts: 1 }]
    });
    const store = ChatStore.create({ storage: backend });
    assert.deepEqual(store.all(), []);
});

test('malformed entries are dropped while valid ones survive', () => {
    const backend = createFakeStorage();
    backend.setJSON(ChatStore.KEY, {
        schema: ChatStore.SCHEMA,
        messages: [
            null,
            42,
            'a string',
            [],
            { role: 'ghost', text: 'unknown role' },
            { role: 'user' },                       // no text and no key
            { role: 'user', text: '' },
            { role: 'user', text: 12345 },          // text must be a string
            { role: 'ai', text: 'valid one', ts: 7 },
            { role: 'user', text: 'also valid', ts: 'not-a-number' }
        ]
    });
    const messages = ChatStore.create({ storage: backend }).all();
    assert.equal(messages.length, 2);
    assert.equal(messages[0].text, 'valid one');
    assert.equal(messages[0].role, 'ai');
    // A non-numeric timestamp becomes 0 (unknown) rather than NaN or a throw.
    assert.equal(messages[1].ts, 0);
});

test('clear empties both the in-memory list and storage', () => {
    const backend = createFakeStorage();
    const store = ChatStore.create({ storage: backend });
    store.append({ role: 'user', text: 'hello', ts: 1 });
    assert.equal(backend.get(ChatStore.KEY) !== null, true);

    store.clear();
    assert.equal(store.count(), 0);
    assert.equal(store.isEmpty(), true);
    assert.deepEqual(store.all(), []);
    assert.equal(backend.get(ChatStore.KEY), null);
});

test('all() returns a copy, so callers cannot mutate the store', () => {
    const backend = createFakeStorage();
    const store = ChatStore.create({ storage: backend });
    store.append({ role: 'user', text: 'keep me', ts: 1 });
    const copy = store.all();
    copy.length = 0;
    assert.equal(store.count(), 1);
});

test('when storage is unavailable the chat still works in memory and says so', () => {
    const backend = createFakeStorage({ available: false, reason: 'private-mode' });
    const store = ChatStore.create({ storage: backend });

    assert.equal(store.isAvailable(), false);
    store.append({ role: 'user', text: 'still usable', ts: 1 });
    assert.equal(store.count(), 1);
    assert.equal(store.all()[0].text, 'still usable');
    // Nothing reached durable storage, and the store admits it.
    assert.equal(backend._data.size, 0);
    assert.equal(store.persistFailed(), true);

    // A "reload" (new instance) honestly shows an empty conversation.
    assert.equal(ChatStore.create({ storage: backend }).count(), 0);
});

test('a write failure mid-session degrades instead of throwing', () => {
    const backend = createFakeStorage({ quota: 200 });
    const store = ChatStore.create({ storage: backend });
    store.append({ role: 'user', text: 'short', ts: 1 });
    assert.equal(store.persistFailed(), false);

    store.append({ role: 'user', text: 'x'.repeat(5000), ts: 2 });  // exceeds quota
    assert.equal(store.persistFailed(), true);
    // The conversation is still on screen for this session.
    assert.equal(store.count(), 2);
});

test('normalizeMessage clamps absurd timestamps instead of storing them', () => {
    const clean = ChatStore.normalizeMessage({ role: 'user', text: 'hi', ts: -5 });
    assert.equal(clean.ts, 0);
    const huge = ChatStore.normalizeMessage({ role: 'user', text: 'hi', ts: 1e30 });
    assert.equal(huge.ts, Number.MAX_SAFE_INTEGER);
    assert.equal(ChatStore.normalizeMessage({ role: 'user', text: 'hi' }).ts, 0);
});
