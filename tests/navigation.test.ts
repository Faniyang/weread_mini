import assert from 'node:assert/strict';
import test from 'node:test';
import { decideNavigation, isAuthPopupUrl } from '../src/main/navigation';

test('only exact official HTTPS hosts load inside the reader', () => {
  assert.equal(decideNavigation('https://weread.qq.com/web/reader', 'reader'), 'allow');
  assert.equal(decideNavigation('https://weread.qq.com.evil.example/', 'reader'), 'external');
  assert.equal(decideNavigation('http://weread.qq.com/', 'reader'), 'deny');
  assert.equal(decideNavigation('file:///etc/passwd', 'reader'), 'deny');
  assert.equal(decideNavigation('https://attacker@weread.qq.com/', 'reader'), 'deny');
  assert.equal(isAuthPopupUrl('https://open.weixin.qq.com/connect/qrconnect'), true);
  assert.equal(isAuthPopupUrl('https://evil.example/'), false);
});
