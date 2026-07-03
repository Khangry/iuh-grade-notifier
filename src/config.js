// Cấu hình chung. Hằng số mặc định + đọc từ env. URL_UNI + username format để env-config
// được để trường khác dùng OneUni cũng chạy.

export const DEFAULTS = {
  AUTH_BASE: 'https://mobile.oneuni.com.vn',
  URL_UNI: 'https://sv.iuh.edu.vn/AppSVGV/',
  CLIENT_ID: 'mobile_flutter',
  SCOPE: 'offline_access openid',
};

export function buildConfig(env = process.env) {
  return {
    authBase: env.AUTH_BASE || DEFAULTS.AUTH_BASE,
    urlUni: env.URL_UNI || DEFAULTS.URL_UNI,
    clientId: env.CLIENT_ID || DEFAULTS.CLIENT_ID,
    scope: env.SCOPE || DEFAULTS.SCOPE,
    clientSecret: env.ONEUNI_CLIENT_SECRET,
    username: env.ONEUNI_USERNAME,
    password: env.ONEUNI_PASSWORD,
    stateKey: env.STATE_ENCRYPTION_KEY,
    webhook: env.DISCORD_WEBHOOK_URL,
    alertWebhook: env.DISCORD_ALERT_WEBHOOK || '',
    testMode: env.TEST_MODE === '1',
    testSubjectCount: Number(env.TEST_SUBJECT_COUNT || 3),
    notifyOnFirstRun: env.NOTIFY_ON_FIRST_RUN === '1',
  };
}

// Kiểm env bắt buộc cho từng luồng. Không log giá trị.
export function assertConfig(cfg, { needState } = {}) {
  const missing = [];
  for (const k of ['username', 'password', 'clientSecret', 'webhook']) {
    if (!cfg[k]) missing.push(k);
  }
  if (needState && !cfg.stateKey) missing.push('stateKey');
  if (missing.length) throw new Error(`Thiếu config bắt buộc: ${missing.join(', ')}`);
}
