import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwtSub, login } from '../src/auth.js';

function jwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

test('decodeJwtSub lấy sub', () => {
  assert.equal(decodeJwtSub(jwt({ sub: '1763538', foo: 1 })), '1763538');
});

test('decodeJwtSub throw khi thiếu sub', () => {
  assert.throws(() => decodeJwtSub(jwt({ foo: 1 })));
});

test('login trả access_token + sub, gửi đúng form', async () => {
  let captured;
  const fakeFetch = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: jwt({ sub: '999' }), refresh_token: 'r', expires_in: 1800 }),
    };
  };
  const cfg = {
    authBase: 'https://auth.test', urlUni: 'https://uni.test/App/',
    clientId: 'mobile_flutter', scope: 'offline_access openid',
    clientSecret: 'sec', username: 'u', password: 'p',
  };
  const r = await login(cfg, fakeFetch);
  assert.equal(r.sub, '999');
  assert.match(captured.url, /\/AUTH\/connect\/token$/);
  const body = captured.opts.body.toString();
  assert.match(body, /grant_type=password/);
  assert.match(body, /url_uni=https%3A%2F%2Funi.test%2FApp%2F/);
  assert.match(body, /scope=offline_access\+openid/);
});

test('login lỗi → throw không lộ password', async () => {
  const fakeFetch = async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) });
  const cfg = { authBase: 'https://a', clientSecret: 's', username: 'u', password: 'SECRET', urlUni: 'x' };
  await assert.rejects(() => login(cfg, fakeFetch), (e) => {
    assert.match(e.message, /invalid_grant/);
    assert.doesNotMatch(e.message, /SECRET/);
    return true;
  });
});
