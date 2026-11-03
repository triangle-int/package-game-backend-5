export const DEV_TOKEN = 'dev_token';
export const DEV_TOKEN_PREFIX = `${DEV_TOKEN}:`;
export const DEV_USER_ID = 'dev_user_1';

export function getDevUserId(token: string | null | undefined): string | null {
  if (token === DEV_TOKEN) return DEV_USER_ID;
  if (!token?.startsWith(DEV_TOKEN_PREFIX)) return null;

  const userId = token.slice(DEV_TOKEN_PREFIX.length);
  return /^[a-zA-Z0-9_-]{8,80}$/.test(userId) ? userId : null;
}

export function isDevLoginAllowed(token: string | null | undefined): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_DEV_LOGIN === 'true' &&
    getDevUserId(token) != null
  );
}
