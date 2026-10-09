'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { EasyAI } = require('../js/ai.js');
const { createI18nStub, withI18n } = require('./helpers.cjs');

/**
 * The regression this suite exists for: `responses` used plural keys
 * ("greetings", "jokes", "facts") while analyzeIntent() returned singular ones,
 * so five intents silently fell through to `default`. The joke button never
 * told a joke. These tests pin the mapping shut.
 */

test('every intent the analyzer can return is answerable', () => {
    withI18n('ar', () => {
        const ai = new EasyAI();
        for (const intent of EasyAI.intents) {
            assert.equal(typeof intent, 'string');
            if (ai.contextualIntents.has(intent)) continue;   // answered from text
            const keys = ai.responseKeysFor(intent);
            assert.ok(Array.isArray(keys) && keys.length > 0, `no templates for ${intent}`);
            assert.notDeepEqual(keys, ai.responses.default,
                `intent "${intent}" silently falls through to default`);
        }
    });
});

test('every template key resolves in both languages (no raw key leaks)', () => {
    for (const lang of ['ar', 'en']) {
        withI18n(lang, (i18n) => {
            const ai = new EasyAI();
            for (const [intent, keys] of Object.entries(ai.responses)) {
                for (const key of keys) {
                    assert.notEqual(i18n.t(key), key, `${lang}: missing translation for ${key}`);
                    assert.ok(i18n.t(key).length > 3, `${lang}: empty translation for ${key}`);
                }
                assert.ok(ai.responseKeysFor(intent).length > 0, `${lang}: ${intent} unresolved`);
            }
        });
    }
});

test('analyzeIntent returns only known intents', () => {
    withI18n('ar', () => {
        const ai = new EasyAI();
        const samples = ['', '   ', 'مرحبا', 'hello', 'tell me a joke', 'أخبرني نكتة',
                         'هل تعلم', 'شكرا', 'مع السلامة', 'ساعدني', 'ترجم هذا',
                         'اكتب كود بايثون', null, undefined, 42, {}, []];
        for (const sample of samples) {
            const intent = ai.analyzeIntent(sample);
            assert.ok(EasyAI.intents.includes(intent),
                `unknown intent "${intent}" for input ${JSON.stringify(sample)}`);
        }
    });
});

test('intents are detected in Arabic', () => {
    withI18n('ar', () => {
        const ai = new EasyAI();
        const cases = [
            ['مرحبا', 'greeting'],
            ['اهلا وسهلا', 'greeting'],
            ['أخبرني نكتة', 'joke'],
            ['هل تعلم شيئاً؟', 'fact'],
            ['معلومة ممتعة', 'fact'],
            ['شكرا لك', 'thanks'],
            ['مع السلامة', 'goodbye'],
            ['ساعدني من فضلك', 'help'],
            ['ترجم هذا النص', 'translate'],
            ['اكتب كود بايثون', 'code']
        ];
        for (const [input, expected] of cases) {
            assert.equal(ai.analyzeIntent(input), expected, `input: ${input}`);
        }
    });
});

test('intents are detected in English', () => {
    withI18n('en', () => {
        const ai = new EasyAI();
        const cases = [
            ['hello there', 'greeting'],
            ['Tell me a joke', 'joke'],
            ['Did you know anything?', 'fact'],
            ['Thanks!', 'thanks'],
            ['goodbye', 'goodbye'],
            ['What can you do?', 'help'],
            ['Please translate this', 'translate'],
            ['Help me debug a function', 'help']
        ];
        for (const [input, expected] of cases) {
            assert.equal(ai.analyzeIntent(input), expected, `input: ${input}`);
        }
    });
});

test('a specific request beats a greeting that happens to lead the sentence', () => {
    withI18n('en', () => {
        const ai = new EasyAI();
        assert.equal(ai.analyzeIntent('hello, can you help me?'), 'help');
        assert.equal(ai.analyzeIntent('hi! tell me a joke'), 'joke');
    });
});

test('an empty message is the default intent, not a crash', () => {
    withI18n('ar', () => {
        const ai = new EasyAI();
        assert.equal(ai.analyzeIntent(''), 'default');
        assert.equal(ai.analyzeIntent(null), 'default');
        assert.equal(ai.analyzeIntent(undefined), 'default');
    });
});

test('a joke request actually produces a joke, and a fact produces a fact', async () => {
    withI18n('ar', async (i18n) => {
        const ai = new EasyAI();
        ai.simulateDelay = () => Promise.resolve();     // no waiting in tests

        const joke = await ai.generateResponse('أخبرني نكتة');
        assert.ok([i18n.t('ai.joke'), i18n.t('ai.joke2')].includes(joke),
            `expected a joke template, got: ${joke}`);
        assert.notEqual(joke, i18n.t('ai.default'));

        const fact = await ai.generateResponse('هل تعلم؟');
        assert.ok([i18n.t('ai.fact'), i18n.t('ai.fact2')].includes(fact),
            `expected a fact template, got: ${fact}`);
    });
});

test('generateResponse answers in the active language', async () => {
    await withI18n('en', async (i18n) => {
        const ai = new EasyAI();
        ai.simulateDelay = () => Promise.resolve();

        const en = await ai.generateResponse('thanks!');
        assert.equal(en, i18n.t('ai.thanks'));

        i18n.setLanguage('ar');
        const ar = await ai.generateResponse('شكرا');
        assert.equal(ar, i18n.translations.ar['ai.thanks']);
        assert.notEqual(ar, en);
    });
});

test('the engine works even when i18n never loaded', async () => {
    // withI18n installs the stub only for the callback, so outside it there is
    // no window.i18n at all — the engine must still answer.
    delete global.window;
    const ai = new EasyAI();
    ai.simulateDelay = () => Promise.resolve();
    assert.equal(ai.analyzeIntent('hello'), 'greeting');
    const reply = await ai.generateResponse('hello');
    assert.equal(typeof reply, 'string');
    assert.ok(reply.length > 0);
});

test('an aborted reply rejects with AbortError so the UI can drop it', async () => {
    withI18n('ar', async () => {
        const ai = new EasyAI();
        const controller = new AbortController();
        controller.abort();
        await assert.rejects(
            () => ai.generateResponse('مرحبا', { signal: controller.signal }),
            (err) => err.name === 'AbortError'
        );
    });
});

test('aborting mid-delay rejects instead of resolving later', async () => {
    withI18n('ar', async () => {
        const ai = new EasyAI();
        const controller = new AbortController();
        const pending = ai.simulateDelay(controller.signal);
        controller.abort();
        await assert.rejects(() => pending, (err) => err.name === 'AbortError');
    });
});

test('history is capped so a long session cannot grow without bound', async () => {
    withI18n('ar', async () => {
        const ai = new EasyAI();
        ai.simulateDelay = () => Promise.resolve();
        for (let i = 0; i < 300; i++) {
            await ai.generateResponse('مرحبا');       // 2 entries per call
        }
        assert.ok(ai.getHistory().length <= ai.maxHistory,
            `history grew to ${ai.getHistory().length}`);
        ai.clearHistory();
        assert.deepEqual(ai.getHistory(), []);
    });
});

test('getHistory returns a copy', async () => {
    withI18n('ar', async () => {
        const ai = new EasyAI();
        ai.simulateDelay = () => Promise.resolve();
        await ai.generateResponse('مرحبا');
        const history = ai.getHistory();
        history.length = 0;
        assert.equal(ai.getHistory().length, 2);
    });
});

test('a coding question gets the coding answer, not a canned greeting', async () => {
    withI18n('ar', async () => {
        const ai = new EasyAI();
        ai.simulateDelay = () => Promise.resolve();
        const reply = await ai.generateResponse('اكتب كود بايثون');
        assert.match(reply, /برمجي/);
        assert.ok(!reply.includes('ai.default'));      // no raw key
    });
});

test('generateCreative resolves through i18n and never returns a raw key', () => {
    withI18n('ar', (i18n) => {
        const ai = new EasyAI();
        const text = ai.generateCreative('فكرة جديدة');
        assert.notEqual(text, 'ai.creative');
        assert.equal(text, i18n.t('ai.creative'));
    });
});
