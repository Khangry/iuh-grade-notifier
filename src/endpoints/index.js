import { gradesEndpoint } from './grades.js';
import { trainingEndpoint } from './training.js';
import { tuitionReceiptsEndpoint } from './tuition-receipts.js';

// Thêm endpoint mới vào đây để bật nó; gỡ khỏi mảng để tắt.
export const endpoints = [gradesEndpoint, trainingEndpoint, tuitionReceiptsEndpoint];
export const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));

export function endpointIdForEntity(key, entity = {}) {
  if (entity.endpoint) return entity.endpoint;
  if (key.startsWith('renluyen:') || entity.isRenLuyen) return 'training';
  if (key.startsWith('phieuthu:') || entity.isPhieuThu) return 'tuition-receipts';
  return 'grades';
}
