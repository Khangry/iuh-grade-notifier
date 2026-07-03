import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiPost, ketQuaHocTapChiTiet } from '../src/api.js';

const cfg = { urlUni: 'https://sv.test/App/' };

test('apiPost trả result, gửi đúng URL + headers', async () => {
  let captured;
  const f = async (url, opts) => {
    captured = { url, opts };
    return { ok: true, status: 200, json: async () => ({ result: { rows: [] }, errorMessages: [], isOk: true }) };
  };
  const ctx = { token: 'tok', cfg };
  const r = await apiPost(ctx, 'api/v1/SinhVien/KetQuaHocTap', { idSinhVien: 1 }, f);
  assert.deepEqual(r, { rows: [] });
  assert.equal(captured.url, 'https://sv.test/App/api/v1/SinhVien/KetQuaHocTap');
  assert.equal(captured.opts.headers.Authorization, 'Bearer tok');
  assert.equal(captured.opts.headers.language, 'vi');
});

test('isOk=false → throw isApiError', async () => {
  const f = async () => ({ ok: true, status: 200, json: async () => ({ result: null, errorMessages: ['x'], isOk: false }) });
  await assert.rejects(() => apiPost({ token: 't', cfg }, 'p', {}, f), (e) => e.isApiError === true);
});

test('401 → relogin 1 lần rồi retry', async () => {
  let calls = 0;
  const f = async (url, opts) => {
    calls += 1;
    if (opts.headers.Authorization === 'Bearer old') return { ok: false, status: 401, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ result: 'ok', isOk: true }) };
  };
  const ctx = { token: 'old', cfg, relogin: async () => 'new' };
  const r = await apiPost(ctx, 'p', {}, f);
  assert.equal(r, 'ok');
  assert.equal(ctx.token, 'new');
  assert.equal(calls, 2);
});

test('ketQuaHocTapChiTiet gửi idLopHocPhan', async () => {
  let body;
  const f = async (url, opts) => { body = JSON.parse(opts.body); return { ok: true, status: 200, json: async () => ({ result: {}, isOk: true }) }; };
  await ketQuaHocTapChiTiet({ token: 't', cfg }, 5, 601645, f);
  assert.deepEqual(body, { idSinhVien: 5, idLopHocPhan: 601645 });
});
