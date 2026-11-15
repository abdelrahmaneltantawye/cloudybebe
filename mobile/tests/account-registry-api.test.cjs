const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadApi(fetch, platform = 'web') {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/mobile-api.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, AbortController, setTimeout, clearTimeout, Date, Number, Intl, fetch, require(name) {
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === '@/lib/store') return { STORE_URL: 'https://cloudybebe.com' };
    throw new Error(`Unexpected dependency: ${name}`);
  } };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

test('web account mutations use scoped proxy and explicit bearer, without ambient cookies', async () => {
  let call;
  const api = loadApi(async (url, options) => { call = { url, options }; return Response.json({ id: 12, email: 'parent@example.test' }); });
  const user = await api.mobileRequest('me', { method: 'PATCH', token: 'private-session', body: { first_name: 'Sam' } });
  assert.equal(user.id, 12);
  assert.equal(call.url, '/api/mobile?path=me');
  assert.equal(call.options.headers.Authorization, 'Bearer private-session');
  assert.equal(call.options.credentials, 'omit');
  assert.deepEqual(JSON.parse(call.options.body), { first_name: 'Sam' });
});

test('public registry passwords stay in POST body and never enter URL or bearer headers', async () => {
  let call;
  const api = loadApi(async (url, options) => { call = { url, options }; return Response.json({ id: 7, items: [] }); }, 'ios');
  const token = 'a'.repeat(48);
  await api.mobileRequest(`registries/public/${token}`, { method: 'POST', body: { password: 'private-registry-password' } });
  assert.equal(call.url, `https://cloudybebe.com/wp-json/cloudybebe-mobile/v1/registries/public/${token}`);
  assert.equal(call.url.includes('private-registry-password'), false);
  assert.equal(call.options.headers.Authorization, undefined);
  assert.equal(JSON.parse(call.options.body).password, 'private-registry-password');
});

test('registry authorization failures retain real code and status for password gate', async () => {
  const api = loadApi(async () => Response.json({ code: 'cbr_password', message: 'Password required.', data: { status: 401 } }, { status: 401 }));
  await assert.rejects(api.mobileRequest('registries/public/token', { method: 'POST', body: {} }), error => error.status === 401 && error.code === 'cbr_password' && error.message === 'Password required.');
});

test('unavailable adapter, unreadable success and offline responses never become successful empty state', async () => {
  const missing = loadApi(async () => new Response('<h1>Not found</h1>', { status: 404 }));
  await assert.rejects(missing.mobileRequest('registries'), /not available yet/);
  const missingRoute = loadApi(async () => Response.json({code:'rest_no_route',message:'No route was found matching the URL and request method.'},{status:404}));
  await assert.rejects(missingRoute.mobileRequest('checkout'), /not available yet/);
  const invalid = loadApi(async () => new Response('<html>Login page</html>', { status: 200 }));
  await assert.rejects(invalid.mobileRequest('orders'), /unreadable response/);
  const offline = loadApi(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.mobileRequest('me'), /Check your connection/);
});

test('checkout receipt secret travels in its distinct header', async () => {
  let call;
  const api = loadApi(async (url, options) => { call = { url, options }; return Response.json({ received: false }); });
  await api.mobileRequest('checkout/receipt/status', { checkoutToken: 'receipt-secret' });
  assert.equal(call.options.headers['X-Checkout-Token'], 'receipt-secret');
  assert.equal(call.options.headers.Authorization, undefined);
  assert.equal(call.url.includes('receipt-secret'), false);
});

test('stored sessions require future ISO expiry and reject corrupt data without inventing an account', () => {
  const api = loadApi();
  const now = Date.parse('2026-10-25T10:00:00Z');
  const valid = { token: 'secure-token', expires_at: '2026-11-24T12:00:00+00:00' };
  assert.equal(api.readStoredSession(JSON.stringify(valid), now).token, 'secure-token');
  for (const invalid of ['not-json', 'null', '{}', JSON.stringify({ ...valid, token: '' }), JSON.stringify({ ...valid, expires_at: '2026-09-01T00:00:00Z' }), JSON.stringify({ ...valid, expires_at: 1790000000 }), JSON.stringify({ ...valid, expires_at: 'invalid' })]) assert.equal(api.readStoredSession(invalid, now), null);
});

test('registry selection rejects wildcard or missing variation options while allowing fixed options', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/registry/selection.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, Number }; vm.runInNewContext(compiled, context);
  const { registrySelectionError } = context.exports;
  const product = { has_options: true, variations: [
    { id: 11, attributes: [{ name: 'Size', value: '' }, { name: 'Color', value: 'blue' }] },
    { id: 12, attributes: [{ name: 'Size', value: '6m' }, { name: 'Color', value: 'blue' }] },
    { id: 13, attributes: [] },
  ] };
  assert.match(registrySelectionError(product, 11), /fixed options/);
  assert.match(registrySelectionError(product, 13), /fixed options/);
  assert.match(registrySelectionError(product, 99), /unavailable/);
  assert.match(registrySelectionError(product, 0), /Choose the product options/);
  assert.equal(registrySelectionError(product, 12), '');
  assert.equal(registrySelectionError({ has_options: false }, 0), '');
});
