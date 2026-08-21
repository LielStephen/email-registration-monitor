import 'dotenv/config';

const required = ['DATABASE_URL', 'REDIS_URL', 'TOKEN_ENCRYPTION_KEY', 'OAUTH_STATE_SECRET'];

export function config() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  return {
    port: Number(process.env.PORT || 4100),
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    encryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    oauthStateSecret: process.env.OAUTH_STATE_SECRET,
    appUrl: process.env.APP_URL || 'http://localhost:5173',
    enableOcr: process.env.ENABLE_OCR === 'true',
  };
}
