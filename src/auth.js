// Đăng nhập OAuth2 password grant (OpenIddict). Decode JWT lấy sub = idSinhVien.
import { DEFAULTS } from './config.js';

export function decodeJwt(accessToken) {
  const parts = String(accessToken).split('.');
  if (parts.length < 2) throw new Error('access_token không phải JWT');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

export function decodeJwtSub(accessToken) {
  const payload = decodeJwt(accessToken);
  if (!payload.sub) throw new Error('JWT thiếu sub');
  return payload.sub;
}

export async function login(cfg, fetchImpl = fetch) {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: cfg.clientId || DEFAULTS.CLIENT_ID,
    client_secret: cfg.clientSecret,
    scope: cfg.scope || DEFAULTS.SCOPE,
    username: cfg.username,
    password: cfg.password,
    url_uni: cfg.urlUni || DEFAULTS.URL_UNI,
  });
  const res = await fetchImpl(`${cfg.authBase || DEFAULTS.AUTH_BASE}/AUTH/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    // Không log body có thể chứa hint nhạy cảm; chỉ status + error code ngắn.
    let code = '';
    try {
      const j = await res.json();
      code = j.error || '';
    } catch { /* ignore */ }
    throw new Error(`Đăng nhập thất bại: HTTP ${res.status}${code ? ' ' + code : ''}`);
  }
  const data = await res.json();
  const payload = decodeJwt(data.access_token);
  if (!payload.sub) throw new Error('JWT thiếu sub');
  // ma_map = mã sinh viên (chuỗi) dùng cho PhieuThuTongHop — KHÁC sub/idSinhVien.
  return { access_token: data.access_token, sub: payload.sub, maMap: payload.ma_map };
}
