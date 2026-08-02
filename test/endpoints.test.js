import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot } from '../src/snapshot.js';
import { diff } from '../src/diff.js';
import { endpoints, endpointById, endpointIdForEntity } from '../src/endpoints/index.js';

test('registry có đủ endpoint đang bật và định tuyến entity legacy theo key', () => {
  assert.deepEqual(endpoints.map((endpoint) => endpoint.id), ['grades', 'training', 'tuition-receipts']);
  assert.equal(endpointById.get('grades').id, 'grades');
  assert.equal(endpointIdForEntity('renluyen:62'), 'training');
  assert.equal(endpointIdForEntity('phieuthu:9001'), 'tuition-receipts');
});

test('state legacy không metadata vẫn diff được với snapshot endpoint mới', () => {
  const old = { 'phieuthu:1': { cells: { 'Số tiền': '1000' } } };
  const neu = { 'phieuthu:1': { endpoint: 'tuition-receipts', cells: { 'Số tiền': '2000' } } };
  const [change] = diff(old, neu);
  assert.equal(change.endpoint, 'tuition-receipts');
  assert.equal(change.changes[0].old, '1000');
  assert.equal(change.changes[0].new, '2000');
});

test('một endpoint lỗi không chặn endpoint khác và đăng nhập chỉ một lần', async () => {
  let logins = 0;
  const active = {
    id: 'active',
    collect: async () => ({ 'active:1': { cells: { 'Giá trị': 'ok' } } }),
    render: () => null,
    selectForTest: () => [],
  };
  const broken = { ...active, id: 'broken', collect: async () => { throw new Error('timeout'); } };
  const { snapshot } = await buildSnapshot({}, {
    login: async () => { logins += 1; return { access_token: 't', sub: '1' }; },
    endpoints: [broken, active],
  });
  assert.equal(logins, 1);
  assert.deepEqual(snapshot['active:1'].cells, { 'Giá trị': 'ok' });
  assert.equal(snapshot['active:1'].endpoint, 'active');
});
