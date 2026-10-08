const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { translations } = require('../js/i18n.js');

test('Arabic and English translation catalogs have identical keys', () => {
  assert.deepEqual(
    Object.keys(translations.ar).sort(),
    Object.keys(translations.en).sort()
  );
});

test('every translation key used by the page exists in both catalogs', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const usedKeys = [...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)]
    .map((match) => match[1]);

  assert.ok(usedKeys.length > 0, 'expected translated elements in index.html');
  for (const key of usedKeys) {
    assert.ok(key in translations.ar, `missing Arabic translation: ${key}`);
    assert.ok(key in translations.en, `missing English translation: ${key}`);
  }
});

test('Arabic UI copy contains no known corruption or foreign scripts', () => {
  const arabicCopy = Object.values(translations.ar).join('\n');
  const knownCorruption = /interesante|autonomy|fonction|kindness|buona|wizard|elektr|muzika|rendent|Discutez/i;
  const foreignScripts = /[\u0400-\u052f\u4e00-\u9fff]/u; // Cyrillic and CJK

  assert.doesNotMatch(arabicCopy, knownCorruption);
  assert.doesNotMatch(arabicCopy, foreignScripts);
});

const { FEATURE_CATALOG } = require('../js/ai.js');

test('every feature card status matches the runtime capability catalog', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const cards = [...html.matchAll(/class="feature-card"\s+data-tool="([^"]+)"\s+data-status="([^"]+)"/g)]
    .map((match) => ({ tool: match[1], status: match[2] }));

  assert.deepEqual(
    Object.fromEntries(cards.map(({ tool, status }) => [tool, status])),
    Object.fromEntries(Object.entries(FEATURE_CATALOG).map(([tool, value]) => [tool, value.status]))
  );
});

test('capability catalog uses only supported states and labels unavailable tools honestly', () => {
  const supportedStates = new Set(['implemented', 'demo', 'unavailable']);
  for (const [tool, feature] of Object.entries(FEATURE_CATALOG)) {
    assert.ok(supportedStates.has(feature.status), `${tool} has invalid status`);
  }

  for (const language of ['ar', 'en']) {
    assert.ok(translations[language]['status.demo']);
    assert.ok(translations[language]['status.unavailable']);
    assert.ok(translations[language]['feature.unavailable.notice']);
  }
});

test('unimplemented browser controls are disabled instead of implying success', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /id="attachBtn"[^>]*disabled[^>]*aria-disabled="true"/);
  assert.match(html, /id="voiceBtn"[^>]*disabled[^>]*aria-disabled="true"/);
});

test('landing page does not publish fabricated usage or satisfaction metrics', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(html, />10K\+</);
  assert.doesNotMatch(html, />50K\+</);
  assert.doesNotMatch(html, />99%</);
});

test('README documents every browser feature with its runtime status', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  for (const status of new Set(Object.values(FEATURE_CATALOG).map((feature) => feature.status))) {
    assert.ok(readme.includes(`| \`${status}\` |`), `README is missing ${status} status`);
  }
  assert.match(readme, /Never place provider API keys in browser/);
});
