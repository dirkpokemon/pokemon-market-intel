/** Login link that brings the user back to `path` afterwards. */
export function loginHref(path?: string | null): string {
  return path && path !== '/' && safeNextPath(path) ? `/login?next=${encodeURIComponent(path)}` : '/login';
}

/** Only same-site paths ("/deals", not "//evil.com" or "https://…"). */
export function safeNextPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  if (path.startsWith('/login') || path.startsWith('/register')) return null;
  return path;
}
