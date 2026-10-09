'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const i18n = require('../js/i18n.js');
const { createFakeStorage } = require('./helpers.cjs');

const { translations, t, getLanguage, isRTL, setLanguage, toggleLanguage, isPersistent } = i18n;

test('both language tables carry exactly the same keys', () => {
    const ar = Object.keys(translations.ar).sort();
    const en = Object.keys(translations.en).sort();
    assert.deepEqual(ar, en);
});

test('no key resolves to itself in either language', () => {
    for (const lang of ['ar', 'en']) {
        for (const key of Object.keys(translations[lang])) {
            const value = translations[lang][key];
            assert.equal(typeof value, 'string', `${lang}.${key} is not a string`);
            assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
            assert.notEqual(value, key, `${lang}.${key} resolves to its own key`);
        }
    }
});

test('the honest demo-state keys exist in both languages', () => {
    const required = ['chat.demo', 'chat.demo.title', 'chat.stop', 'chat.send',
                      'chat.truncated', 'chat.storageUnavailable', 'chat.cancelled',
                      'chat.restored', 'chat.messageLog', 'chat.notImplemented',
                      'chat.clear', 'chat.attach', 'chat.voice'];
    for (const key of required) {
        for (const lang of ['ar', 'en']) {
            assert.ok(Object.prototype.hasOwnProperty.call(translations[lang], key),
                `${lang} is missing ${key}`);
        }
    }
    // The demo label must not claim a connection.
    assert.ok(!/online|متصل/i.test(translations.en['chat.demo']));
    assert.ok(!/متصل الآن/.test(translations.ar['chat.demo']));
});

/**
 * The Arabic table used to carry fragments of French, Spanish, Italian,
 * Russian, Chinese and Japanese spliced mid-sentence, which rendered verbatim
 * in the public UI. Only Latin brand/product names are legitimate.
 */
const ALLOWED_LATIN = /Easy AI|GitHub|EN|English|AI/g;
const ARABIC_SCRIPT = '\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF';
const FOREIGN_SCRIPT = /[\u0400-\u04FF\u0590-\u05FF\u3000-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
const LEFTOVER_LATIN = /[A-Za-z]/;

test('Arabic strings contain Arabic plus brand names only', () => {
    for (const [key, value] of Object.entries(translations.ar)) {
        assert.ok(!FOREIGN_SCRIPT.test(value),
            `${key}: foreign script in an Arabic string -> ${value}`);
        const withoutBrands = value.replace(ALLOWED_LATIN, '');
        assert.ok(!LEFTOVER_LATIN.test(withoutBrands),
            `${key}: untranslated Latin fragment in an Arabic string -> ${value}`);
        // An Arabic value should actually contain Arabic letters — except the
        // brand name, which is a proper noun in Latin script by design.
        if (key !== 'brand') {
            assert.ok(new RegExp(`[${ARABIC_SCRIPT}]`).test(value),
                `${key}: Arabic entry has no Arabic script -> ${value}`);
        }
    }
});

test('English strings contain no Arabic script', () => {
    for (const [key, value] of Object.entries(translations.en)) {
        assert.ok(!new RegExp(`[${ARABIC_SCRIPT}]`).test(value),
            `${key}: Arabic script inside an English string -> ${value}`);
    }
});

test('t() falls back to English, then to the key, and survives junk input', () => {
    assert.equal(t('nav.home'), translations[getLanguage()]['nav.home']);
    assert.equal(t('no.such.key'), 'no.such.key');
    assert.equal(t(''), '');
    assert.equal(t(null), '');
    assert.equal(t(undefined), '');
    assert.equal(t(42), '');
    assert.equal(t({}), '');
    // Prototype members must not be reachable as translation keys.
    assert.equal(t('constructor'), 'constructor');
    assert.equal(t('__proto__'), '__proto__');
    assert.equal(t('toString'), 'toString');
});

test('language state API behaves and never throws without a DOM', () => {
    assert.ok(['ar', 'en'].includes(getLanguage()));
    const before = getLanguage();
    toggleLanguage();
    assert.notEqual(getLanguage(), before);
    assert.equal(isRTL(), getLanguage() === 'ar');
    toggleLanguage();
    assert.equal(getLanguage(), before);

    setLanguage('en');
    assert.equal(getLanguage(), 'en');
    setLanguage('nonsense');            // unknown language is coerced, not stored
    assert.equal(getLanguage(), 'ar');
    assert.equal(typeof isPersistent(), 'boolean');
});

/**
 * Repo-wide corruption scan: every non-ASCII character in the chat source must
 * belong to a known inventory (Arabic script, emoji, arrows, typographic marks).
 * This is the guard that would have caught `après thinking … here's ما trouvéته`.
 */
const JS_SOURCES = ['js/i18n.js', 'js/ai.js', 'js/main.js', 'js/storage.js', 'js/chat-store.js'];

/**
 * Scripts that must never appear in a bilingual Arabic/English codebase. This
 * is the explicit deny list; the allow list below covers typography and emoji.
 */
const FORBIDDEN_RANGES = [
    [0x0400, 0x04FF],   // Cyrillic
    [0x0590, 0x05FF],   // Hebrew
    [0x0900, 0x097F],   // Devanagari
    [0x3040, 0x30FF],   // Hiragana / Katakana
    [0x4E00, 0x9FFF],   // CJK ideographs
    [0xAC00, 0xD7AF],   // Hangul
    [0x0E00, 0x0E7F]    // Thai
];

/** Typographic marks and symbol blocks this codebase legitimately uses. */
const ALLOWED_NON_ASCII = new Set([
    '\u200F', '\u200E',                       // RLM / LRM (bidi control)
    '\u060C', '\u061B', '\u061F', '\u066C'          // Arabic ، ؛ ؟ ٬
]);
const ALLOWED_RANGES = [
    [0x00A0, 0x00FF],   // Latin-1 punctuation (· etc.)
    [0x0600, 0x08FF],   // Arabic and its extensions
    [0x2000, 0x2BFF],   // dashes, bullets, ellipsis, arrows, ℹ, ■, ➤, ♥, ⭐
    [0xFB50, 0xFDFF],   // Arabic presentation forms A
    [0xFE00, 0xFE0F],   // variation selectors
    [0xFE70, 0xFEFF],   // Arabic presentation forms B
    [0x1F000, 0x1FAFF]  // emoji
];

function isAllowed(ch) {
    const code = ch.codePointAt(0);
    if (ALLOWED_NON_ASCII.has(ch)) return true;
    for (const [low, high] of FORBIDDEN_RANGES) {
        if (code >= low && code <= high) return false;
    }
    for (const [low, high] of ALLOWED_RANGES) {
        if (code >= low && code <= high) return true;
    }
    return false;
}

test('chat sources contain no unexpected non-ASCII characters', () => {
    const root = path.join(__dirname, '..');
    for (const rel of JS_SOURCES) {
        const file = path.join(root, rel);
        const source = fs.readFileSync(file, 'utf8');
        const offenders = new Set();
        for (const ch of source) {
            if (ch.codePointAt(0) > 0x7F && !isAllowed(ch)) offenders.add(ch);
        }
        assert.deepEqual([...offenders], [], `${rel} contains: ${[...offenders].join(' ')}`);
    }
});

test('the intent matcher no longer carries CJK patterns it could never serve', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'ai.js'), 'utf8');
    for (const fragment of ['功能', 'できます', '笑话', '助けて', 'dumpf']) {
        assert.ok(!source.includes(fragment), `ai.js still contains "${fragment}"`);
    }
});
