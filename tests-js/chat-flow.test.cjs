'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const { createDocument } = require('./dom-stub.cjs');

const ROOT = path.join(__dirname, '..');
const MAIN_SRC = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');

/** Clear the require cache so each test gets fresh module singletons. */
function freshModules() {
    for (const rel of ['js/storage.js', 'js/chat-store.js', 'js/i18n.js', 'js/ai.js']) {
        delete require.cache[require.resolve(path.join(ROOT, rel))];
    }
    return {
        SafeStorage: require('../js/storage.js'),
        ChatStore: require('../js/chat-store.js'),
        i18n: require('../js/i18n.js'),
        aiModule: require('../js/ai.js')
    };
}

/**
 * Boot the chat page in a sandbox: a stub document plus the real modules.
 * Returns handles the test can drive.
 */
function boot(options) {
    const opts = options || {};
    const mods = freshModules();
    const document = createDocument();

    // The welcome message in index.html carries data-i18n so it follows the
    // language switch; mirror that here.
    const welcomeP = document.getElementById('chatMessages')
        .querySelector('.message-content').children[0];
    welcomeP.attributes.set('data-i18n', 'chat.welcome');

    const sandbox = Object.assign(Object.create(globalThis), {
        document,
        console,
        SafeStorage: mods.SafeStorage,
        ChatStore: mods.ChatStore,
        i18n: mods.i18n,
        easyAI: new mods.aiModule.EasyAI(),
        IntersectionObserver: undefined
    });
    // The sandbox stands in for `window` too, so it needs the window-level API
    // that main.js uses (scroll listener, scrollY).
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.scrollY = 0;
    sandbox.addEventListener = (type, fn) => {
        if (!sandbox._handlers[type]) sandbox._handlers[type] = [];
        sandbox._handlers[type].push(fn);
    };
    sandbox.removeEventListener = () => {};
    sandbox._handlers = {};
    vm.createContext(sandbox);

    // Seed a "previous session" before main.js loads, if the test asks for it.
    if (opts.preload && opts.preload.length) {
        const store = mods.ChatStore.create();
        opts.preload.forEach(m => store.append(m));
    }

    // i18n's DOMContentLoaded wiring is registered by requiring the module in
    // Node, not in the sandbox — drive it explicitly instead.
    mods.i18n.setLanguage(opts.language || 'ar');

    vm.runInContext(MAIN_SRC, sandbox, { filename: 'js/main.js' });
    document.emit('DOMContentLoaded');

    // No real waiting in tests: the demo delay is deterministic and instant.
    sandbox.easyAI.simulateDelay = () => Promise.resolve();

    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    return {
        sandbox,
        document,
        mods,
        chatMessages,
        chatInput,
        sendBtn,
        easyAI: sandbox.easyAI,

        messages() {
            return chatMessages.querySelectorAll('.message')
                .filter(node => !String(node.className).includes('typing-message'));
        },
        texts() {
            return this.messages().map(node => {
                const content = node.querySelector('.message-content');
                return content ? content.children[0].textContent : '';
            });
        },
        typingVisible() {
            // The indicator is a direct child of the log; query it by id so the
            // assertion cannot be fooled by stub descendant-selector semantics.
            const node = document.getElementById('typingIndicator');
            return !!node && !!node.parentNode;
        },
        /** Click a button the way a user would, without a real event system. */
        click(node) {
            (node.handlers.get('click') || []).forEach(fn => fn.call(node, {
                type: 'click', preventDefault() {}
            }));
        },
        type(text) {
            chatInput.value = text;
        },
        async send(text) {
            this.type(text);
            this.click(sendBtn);
            await settle();
        },
        live() {
            return document.getElementById('chatLive').textContent;
        }
    };
}

/** Let queued promise callbacks run. */
async function settle(times = 6) {
    for (let i = 0; i < times; i++) {
        await new Promise(resolve => setImmediate(resolve));
    }
}

test('a conversation renders and is persisted', async () => {
    const app = boot();
    assert.equal(app.messages().length, 1);          // the welcome message

    await app.send('مرحبا');

    const texts = app.texts();
    assert.equal(texts.length, 3);
    assert.equal(texts[1], 'مرحبا');
    assert.equal(texts[2], app.mods.i18n.t('ai.greeting'));
    assert.equal(app.typingVisible(), false);

    const stored = app.mods.ChatStore.create().all();
    assert.equal(stored.length, 2);
    assert.deepEqual(stored.map(m => m.role), ['user', 'ai']);
    assert.equal(stored[0].text, 'مرحبا');
    assert.equal(stored[1].key, 'ai.greeting');      // translatable later
});

test('chat text is inserted as text, never parsed as HTML', async () => {
    const app = boot();
    const payload = '<img src=x onerror="window.__pwned=1">';
    await app.send(payload);

    const texts = app.texts();
    assert.ok(texts.includes(payload), 'the payload must appear verbatim as text');
    assert.equal(app.sandbox.__pwned, undefined);
    // Nothing in the stub tree could have been built from the string.
    assert.equal(app.chatMessages.querySelectorAll('img').length, 0);
    const serialized = JSON.stringify(app.chatMessages.children.map(c => c.textContent));
    assert.ok(!serialized.includes('innerHTML'));
});

test('the send button becomes a stop button while a reply is in flight', async () => {
    const app = boot();
    // Hold the reply open so the pending state is observable.
    let release;
    app.easyAI.simulateDelay = () => new Promise(resolve => { release = resolve; });

    app.type('مرحبا');
    app.click(app.sendBtn);
    await settle(2);

    assert.equal(app.typingVisible(), true);
    assert.ok(String(app.sendBtn.className).includes('is-stop'));
    assert.equal(app.sendBtn.getAttribute('aria-label'), app.mods.i18n.t('chat.stop'));
    assert.equal(app.sendBtn.querySelector('.send-icon').textContent, '■');

    release();
    await settle();

    assert.equal(app.typingVisible(), false);
    assert.ok(!String(app.sendBtn.className).includes('is-stop'));
    assert.equal(app.sendBtn.querySelector('.send-icon').textContent, '➤');
});

test('cancelling drops the reply instead of appending it late', async () => {
    const app = boot();
    let release;
    app.easyAI.simulateDelay = () => new Promise(resolve => { release = resolve; });

    app.type('مرحبا');
    app.click(app.sendBtn);
    await settle(2);
    assert.equal(app.typingVisible(), true);

    app.click(app.sendBtn);                  // now the stop button
    await settle(2);

    assert.equal(app.typingVisible(), false);
    assert.ok(app.texts().includes(app.mods.i18n.t('chat.cancelled')));
    const afterCancel = app.messages().length;

    release();                               // the abandoned reply resolves now
    await settle();
    assert.equal(app.messages().length, afterCancel);   // nothing was appended
    assert.ok(!app.texts().includes(app.mods.i18n.t('ai.greeting')));
});

test('clearing the chat invalidates a reply that is still in flight', async () => {
    const app = boot();
    let release;
    app.easyAI.simulateDelay = () => new Promise(resolve => { release = resolve; });

    app.type('مرحبا');
    app.click(app.sendBtn);
    await settle(2);

    app.click(app.document.getElementById('clearChat'));
    await settle(2);
    assert.equal(app.messages().length, 1);            // welcome only
    assert.equal(app.mods.ChatStore.create().count(), 0);

    release();
    await settle();
    assert.equal(app.messages().length, 1, 'a stale reply landed after clearing');
    assert.equal(app.live(), app.mods.i18n.t('chat.cleared'));
});

test('a reload restores the stored conversation', async () => {
    const first = boot();
    await first.send('مرحبا');
    assert.equal(first.mods.ChatStore.create().count(), 2);

    // A fresh sandbox reading the same module-level storage = a page reload.
    const second = boot({
        preload: first.mods.ChatStore.create().all()
    });
    const texts = second.texts();
    assert.equal(texts.length, 3);                     // welcome + 2 restored
    assert.equal(texts[1], 'مرحبا');
    assert.equal(second.live(), second.mods.i18n.t('chat.restored'));
});

test('stored template replies follow a language switch; user text does not', async () => {
    const app = boot({ language: 'ar' });
    await app.send('مرحبا');
    assert.ok(app.texts().includes(app.mods.i18n.t('ai.greeting')));

    app.mods.i18n.setLanguage('en');
    app.document.emit('languageChanged', { detail: { lang: 'en' } });

    const texts = app.texts();
    assert.ok(texts.includes(app.mods.i18n.translations.en['ai.greeting']),
        'the AI reply did not follow the language switch');
    assert.ok(texts.includes('مرحبا'), 'user text must never be rewritten');
});

test('an over-long message is stored truncated and the user is told', async () => {
    const app = boot();
    const long = 'ا'.repeat(app.mods.ChatStore.MAX_MESSAGE_CHARS + 1000);
    await app.send(long);

    const stored = app.mods.ChatStore.create().all()[0];
    assert.equal(stored.text.length, 20000);
    assert.equal(stored.truncated, true);
    assert.equal(app.live(), app.mods.i18n.t('chat.truncated'));
    // The rendered bubble shows the truncated text, not the whole payload.
    assert.equal(app.texts()[1].length, 20000);
});

test('the engine failing produces an honest error line, not a blank chat', async () => {
    const app = boot();
    app.easyAI.generateResponse = () => Promise.reject(new Error('boom'));
    await app.send('مرحبا');

    assert.ok(app.texts().includes(app.mods.i18n.t('chat.error')));
    assert.equal(app.typingVisible(), false);
    assert.ok(!String(app.sendBtn.className).includes('is-stop'));
});

test('unwired tool buttons are disabled and labelled', () => {
    const app = boot();
    for (const id of ['attachBtn', 'voiceBtn']) {
        const btn = app.document.getElementById(id);
        assert.equal(btn.disabled, true, `${id} should be disabled`);
        assert.equal(btn.getAttribute('aria-disabled'), 'true');
        assert.ok(btn.getAttribute('aria-label'), `${id} has no accessible name`);
    }
});

test('the message log is a labelled live region', () => {
    const app = boot();
    const log = app.document.getElementById('chatMessages');
    assert.equal(log.getAttribute('role'), 'log');
    assert.equal(log.getAttribute('aria-live'), 'polite');
    assert.ok(log.getAttribute('aria-label'));
});

/**
 * The stub above is a stand-in, so the accessibility contract is asserted
 * against the real markup too: index.html is the file that ships.
 */
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('index.html wires the chat as an accessible, honest surface', () => {
    // The log is announced to assistive tech and has an accessible name.
    assert.match(INDEX_HTML, /id="chatMessages"[^>]*role="log"/s);
    assert.match(INDEX_HTML, /id="chatMessages"[^>]*aria-live="polite"/s);
    assert.match(INDEX_HTML, /id="chatMessages"[^>]*data-i18n-aria-label="chat\.messageLog"/s);

    // A live region for transient status lines.
    // Order-independent: attributes are matched within one tag, whatever order
    // they happen to be written in.
    const chatLiveTag = INDEX_HTML.match(/<span[^>]*id="chatLive"[^>]*>/);
    assert.ok(chatLiveTag, 'the #chatLive live region is missing from index.html');
    assert.match(chatLiveTag[0], /role="status"/);
    assert.match(chatLiveTag[0], /aria-live="polite"/);
    assert.match(chatLiveTag[0], /class="sr-only"/);

    // The header must not claim a live provider.
    assert.ok(!INDEX_HTML.includes('data-i18n="chat.online"'),
        'index.html still advertises "online now"');
    assert.match(INDEX_HTML, /data-i18n="chat\.demo"/);
    assert.match(INDEX_HTML, /chat-status--demo/);
    assert.match(INDEX_HTML, /data-i18n-title="chat\.demo\.title"/);

    // Unwired tools are disabled in the markup, not just at runtime.
    assert.match(INDEX_HTML, /id="attachBtn"[^>]*disabled/s);
    assert.match(INDEX_HTML, /id="voiceBtn"[^>]*disabled/s);

    // Controls have accessible names and a type.
    assert.match(INDEX_HTML, /id="sendBtn"[^>]*type="button"/s);
    assert.match(INDEX_HTML, /id="sendBtn"[^>]*data-i18n-aria-label="chat\.send"/s);
    assert.match(INDEX_HTML, /id="clearChat"[^>]*data-i18n-aria-label="chat\.clear"/s);
    assert.match(INDEX_HTML, /id="chatInput"[^>]*data-i18n-aria-label="chat\.placeholder"/s);
    assert.match(INDEX_HTML, /id="menuToggle"[^>]*aria-controls="navLinks"/s);
    assert.match(INDEX_HTML, /id="navLinks"/);

    // Persistence modules load before the code that uses them.
    const order = ['js/storage.js', 'js/chat-store.js', 'js/i18n.js', 'js/ai.js', 'js/main.js']
        .map(file => INDEX_HTML.indexOf(`src="${file}"`));
    assert.ok(order.every(index => index > 0), `missing script tag: ${order}`);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'scripts load out of order');
});
