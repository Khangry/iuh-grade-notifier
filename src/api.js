// Hai endpoint điểm + điểm rèn luyện. ctx = { token, cfg, relogin? }.
// Bắt 401 → relogin 1 lần. Envelope { result, errorMessages, isOk }.
import { login } from './auth.js';

export async function apiPost(ctx, path, body, fetchImpl = fetch) {
  const url = new URL(path, ctx.cfg.urlUni).toString();
  const doFetch = (tok) => fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json; charset=utf-8',
      accept: 'application/json',
      language: 'vi',
    },
    body: JSON.stringify(body),
  });

  let res = await doFetch(ctx.token);
  if (res.status === 401 && ctx.relogin) {
    ctx.token = await ctx.relogin();
    res = await doFetch(ctx.token);
  }
  if (!res.ok) throw new Error(`API ${path} HTTP ${res.status}`);

  const env = await res.json();
  if (env && env.isOk === false) {
    const e = new Error(`API ${path} isOk=false: ${JSON.stringify(env.errorMessages || [])}`);
    e.isApiError = true;
    e.errorMessages = env.errorMessages || [];
    throw e;
  }
  return env ? env.result : undefined;
}

export function makeCtx(cfg, token, fetchImpl = fetch) {
  return { token, cfg, relogin: async () => (await login(cfg, fetchImpl)).access_token };
}

export const ketQuaHocTap = (ctx, idSV, f) =>
  apiPost(ctx, 'api/v1/SinhVien/KetQuaHocTap', { idSinhVien: idSV }, f);

export const ketQuaHocTapChiTiet = (ctx, idSV, idLHP, f) =>
  apiPost(ctx, 'api/v1/SinhVien/KetQuaHocTapChiTiet', { idSinhVien: idSV, idLopHocPhan: idLHP }, f);

// Shape chính xác chưa xác nhận → thử nhiều body nếu 400. // TODO xác nhận khi chạy thật.
export async function danhGiaRenLuyen(ctx, idSV, f = fetch) {
  const bodies = [{ idSinhVien: idSV }, {}, { idSinhVien: idSV, maSinhVien: idSV }];
  let lastErr;
  for (const b of bodies) {
    try {
      return await apiPost(ctx, 'api/v1/SinhVien/DanhGiaRenLuyen', b, f);
    } catch (e) {
      lastErr = e;
      if (!/HTTP 400/.test(e.message)) throw e; // chỉ fallback khi 400
    }
  }
  throw lastErr;
}

// Phiếu thu học phí. LƯU Ý: field maSinhVien (= ma_map trong token), KHÔNG phải idSinhVien.
export const phieuThuTongHop = (ctx, maSV, f) =>
  apiPost(ctx, 'api/v1/SinhVien/PhieuThuTongHop', { maSinhVien: maSV }, f);

export const realApi = { ketQuaHocTap, ketQuaHocTapChiTiet, danhGiaRenLuyen, phieuThuTongHop };
