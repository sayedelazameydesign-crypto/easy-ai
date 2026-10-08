const test = require('node:test');
const assert = require('node:assert/strict');

const { EasyAI, FEATURE_CATALOG, resolveFeatureActivation } = require('../js/ai.js');
const i18n = require('../js/i18n.js');

function installBrowserLanguage(language) {
  i18n.setLanguage(language);
  global.window = {
    i18n: {
      t: i18n.t,
      getLanguage: i18n.getLanguage
    }
  };
}

async function responseFor(language, message) {
  installBrowserLanguage(language);
  const assistant = new EasyAI();
  assistant.simulateDelay = async () => {};
  return assistant.generateResponse(message);
}

const unavailableRequests = {
  ar: {
    translate: 'ترجم هذا النص إلى الإنجليزية',
    summarize: 'لخص هذا المقال الطويل',
    code: 'ساعدني في كتابة كود بايثون',
    image: 'صف هذه الصورة',
    voice: 'حوّل هذا الصوت إلى نص'
  },
  en: {
    translate: 'Translate this text into Arabic',
    summarize: 'Summarize this long article',
    code: 'Help me debug this Python code',
    image: 'Describe this image',
    voice: 'Transcribe this audio recording'
  }
};

for (const language of ['ar', 'en']) {
  for (const [tool, prompt] of Object.entries(unavailableRequests[language])) {
    test(`${language} ${tool} request returns the explicit unavailable response`, async () => {
      const response = await responseFor(language, prompt);
      assert.equal(FEATURE_CATALOG[tool].status, 'unavailable');
      assert.equal(response, i18n.translations[language]['feature.unavailable.notice']);
      assert.doesNotMatch(response, /completed|translated|summary is|تمت الترجمة|إليك الملخص|نجاح/i);
    });
  }
}

test('demo chat stays visibly separate from unavailable tools', async () => {
  const response = await responseFor('en', 'Hello');
  assert.equal(FEATURE_CATALOG.chat.status, 'demo');
  assert.notEqual(response, i18n.translations.en['feature.unavailable.notice']);
});

test('feature activation fails closed on missing or mismatched HTML state', () => {
  assert.deepEqual(resolveFeatureActivation('chat', 'unavailable'), {
    allowed: false,
    reason: 'status_mismatch'
  });
  assert.deepEqual(resolveFeatureActivation('unknown', 'demo'), {
    allowed: false,
    reason: 'status_mismatch'
  });
  assert.deepEqual(resolveFeatureActivation('translate', 'unavailable'), {
    allowed: false,
    reason: 'unavailable'
  });
  assert.deepEqual(resolveFeatureActivation('chat', 'demo'), {
    allowed: true,
    reason: 'demo'
  });
});

test('language switching preserves status labels and unavailable behavior', async () => {
  i18n.setLanguage('ar');
  assert.equal(i18n.t('status.unavailable'), 'غير متاح');
  assert.equal(await responseFor('ar', 'لخص هذا النص'), i18n.translations.ar['feature.unavailable.notice']);

  i18n.setLanguage('en');
  assert.equal(i18n.t('status.unavailable'), 'Unavailable');
  assert.equal(await responseFor('en', 'Summarize this text'), i18n.translations.en['feature.unavailable.notice']);
});

test('disabled alternate controls have no event handlers in application code', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
  assert.doesNotMatch(source, /getElementById\(['"](?:attachBtn|voiceBtn)['"]\)/);
});
