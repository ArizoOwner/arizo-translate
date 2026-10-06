const test = require('node:test');
const assert = require('node:assert/strict');
const { detectLanguage, resolveTarget, normalizeCode } = require('../src/engine/languages');

test('detects pure Persian sentences', () => {
  assert.equal(detectLanguage('سلام، چطوری؟ خوبی؟'), 'fa');
  assert.equal(detectLanguage('این یک متن کاملا فارسی برای تست است'), 'fa');
  assert.equal(detectLanguage('می‌خواهم این برنامه را تست کنم'), 'fa');
});

test('detects mixed Persian technical sentences with English words', () => {
  assert.equal(detectLanguage('سلام checkout کن'), 'fa');
  assert.equal(detectLanguage('با docker compose اجرا کن'), 'fa');
  assert.equal(detectLanguage('این کامپوننت React رو ریفکتور کن'), 'fa');
  assert.equal(detectLanguage('پروژه بیلد نمیشه ارور ۵۰۰ میده'), 'fa');
  assert.equal(detectLanguage('دستور git push origin main رو بزن'), 'fa');
  assert.equal(detectLanguage('کانفیگ nginx رو بررسی کن'), 'fa');
  assert.equal(detectLanguage('ریکوئست تایم‌اوت خورد'), 'fa');
  assert.equal(detectLanguage('کد رو دیپلوی کن روی سرور'), 'fa');
  assert.equal(detectLanguage('پکیج tailwindcss رو نصب کن'), 'fa');
  assert.equal(detectLanguage('چرا لاگ کنسول پرینت نمیشه؟'), 'fa');
  assert.equal(detectLanguage('برنچ feature-auth رو مرج کن'), 'fa');
});

test('detects English developer sentences', () => {
  assert.equal(detectLanguage('How do I fix this React component?'), 'en');
  assert.equal(detectLanguage('TypeError: Cannot read properties of undefined'), 'en');
  assert.equal(detectLanguage('git commit -m "fix bug"'), 'en');
  assert.equal(detectLanguage('npm install express cors'), 'en');
});

test('resolves target language bidirectionally', () => {
  const prefs = { nativeLang: 'fa', secondLang: 'en' };
  // Persian input -> English target
  assert.equal(resolveTarget('auto', 'fa', prefs), 'en');
  // English input -> Persian target
  assert.equal(resolveTarget('auto', 'en', prefs), 'fa');
  // Explicit target overrides auto
  assert.equal(resolveTarget('de', 'fa', prefs), 'de');
});
