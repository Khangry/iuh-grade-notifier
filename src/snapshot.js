// Điều phối một lần chạy: đăng nhập một lần, rồi thu thập từng endpoint đã đăng ký.
import { login as realLogin } from './auth.js';
import { apiPost, makeCtx } from './api.js';
import { endpoints as realEndpoints } from './endpoints/index.js';

export { rowsToCells, labelFromKey, level3FromKey } from './snapshot-utils.js';
export { parseRenLuyen } from './endpoints/training.js';

export async function buildSnapshot(cfg, deps = {}) {
  const login = deps.login || realLogin;
  // deps.api chỉ giữ để các test/mock cũ vẫn có thể mô phỏng API theo tên hàm.
  const request = deps.request || (deps.api ? async (ctx, path, body) => {
    if (path.endsWith('/KetQuaHocTap')) return deps.api.ketQuaHocTap(ctx, body.idSinhVien);
    if (path.endsWith('/KetQuaHocTapChiTiet')) return deps.api.ketQuaHocTapChiTiet(ctx, body.idSinhVien, body.idLopHocPhan);
    if (path.endsWith('/DanhGiaRenLuyen')) return deps.api.danhGiaRenLuyen(ctx, body.idSinhVien);
    if (path.endsWith('/PhieuThuTongHop')) return deps.api.phieuThuTongHop(ctx, body.maSinhVien);
    throw new Error(`Mock API chưa hỗ trợ ${path}`);
  } : apiPost);
  const endpoints = deps.endpoints || realEndpoints;
  const { access_token, sub, maMap } = await login(cfg);
  const idSV = Number(sub);
  const ctx = deps.ctx || makeCtx(cfg, access_token);
  ctx.token = access_token;
  const identity = { idSV, maMap };
  const snapshot = {};

  for (const endpoint of endpoints) {
    try {
      const entities = await endpoint.collect({ ctx, identity, request });
      for (const [key, entity] of Object.entries(entities || {})) {
        snapshot[key] = { ...entity, endpoint: endpoint.id };
      }
    } catch (e) {
      console.error(`Bỏ qua endpoint ${endpoint.id}: ${e.message}`);
    }
  }
  return { snapshot, idSV };
}
