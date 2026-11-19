export type NavigationScope = 'reader' | 'auth';
export type NavigationDecision = 'allow' | 'external' | 'deny';

const readerHost = 'weread.qq.com';
const authHosts = new Set(['open.weixin.qq.com', 'login.weixin.qq.com', 'wx.qq.com']);

export function decideNavigation(rawUrl: string, scope: NavigationScope): NavigationDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'deny';
  }
  if (url.protocol !== 'https:' || url.username || url.password) return 'deny';
  if (url.port && (url.hostname === readerHost || authHosts.has(url.hostname))) return 'deny';
  if (url.hostname === readerHost) return 'allow';
  if (scope === 'auth' && authHosts.has(url.hostname)) return 'allow';
  return 'external';
}

export function isAuthPopupUrl(rawUrl: string): boolean {
  return decideNavigation(rawUrl, 'auth') === 'allow';
}
