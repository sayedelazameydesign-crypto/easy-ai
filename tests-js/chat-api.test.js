const test = require('node:test');
const assert = require('node:assert/strict');
const { ChatApiClient, ChatApiError } = require('../js/chat-api.js');
const { EasyAI, FEATURE_CATALOG } = require('../js/ai.js');
const i18n = require('../js/i18n.js');

test('configured backend switches chat to implemented and uses its real reply', async () => {
  global.window = { i18n: { t: i18n.t, getLanguage: () => 'en' } };
  const calls = [];
  const api = {
    status: async () => ({ status: 'ok', chat: 'implemented' }),
    complete: async (messages) => { calls.push(messages); return 'provider reply'; }
  };
  const assistant = new EasyAI(api);
  assert.equal(await assistant.initializeBackend(), 'implemented');
  assert.equal(FEATURE_CATALOG.chat.status, 'implemented');
  assert.equal(await assistant.generateResponse('hello model'), 'provider reply');
  assert.deepEqual(calls[0], [{ role: 'user', content: 'hello model' }]);
});

test('backend failure in implemented mode never falls back to demo output', async () => {
  global.window = { i18n: { t: i18n.t, getLanguage: () => 'en' } };
  const failure = new ChatApiError('provider_error');
  const assistant = new EasyAI({
    status: async () => ({ status: 'ok', chat: 'implemented' }),
    complete: async () => { throw failure; }
  });
  await assistant.initializeBackend();
  await assert.rejects(() => assistant.generateResponse('hello'), (error) => error === failure);
});

test('missing backend remains in explicitly labeled demo mode', async () => {
  i18n.setLanguage('en');
  global.window = { i18n: { t: i18n.t, getLanguage: i18n.getLanguage } };
  const assistant = new EasyAI({
    status: async () => ({ status: 'not_configured', chat: 'unavailable' })
  });
  assistant.simulateDelay = async () => {};
  assert.equal(await assistant.initializeBackend(), 'demo');
  assert.equal(FEATURE_CATALOG.chat.status, 'demo');
  const response = await assistant.generateResponse('Hello');
  assert.ok(Object.values(i18n.translations.en).includes(response));
  assert.notEqual(response, 'provider reply');
});

test('API client maps non-success responses to explicit errors', async () => {
  global.fetch = async () => ({
    ok: false,
    json: async () => ({ status: 'rate_limited' })
  });
  const client = new ChatApiClient();
  await assert.rejects(() => client.complete([{ role: 'user', content: 'x' }]),
    (error) => error instanceof ChatApiError && error.status === 'rate_limited');
});
