const test = require('node:test');
const assert = require('node:assert/strict');
const { detectLanguage, resolveTarget, normalizeCode } = require('../src/engine/languages');
const { splitText } = require('../src/engine/google');
const { extractPartialTranslation, parseModelOutput, isLocalUrl, buildPrompts, normalizeBaseUrl, normalizeModel, getCandidateModels } = require('../src/engine/aphra');

test('detectLanguage recognises scripts', () => {
  assert.equal(detectLanguage('Hello, how are you?'), 'en');
  assert.equal(detectLanguage('سلام، حال شما چطور است؟'), 'fa');
  assert.equal(detectLanguage('مرحبا كيف حالك'), 'ar');
  assert.equal(detectLanguage('Привет, мир'), 'ru');
  assert.equal(detectLanguage('こんにちは'), 'ja');
  assert.equal(detectLanguage('你好世界'), 'zh-CN');
  assert.equal(detectLanguage('안녕하세요'), 'ko');
  assert.equal(detectLanguage('123 !!!'), 'en');
});

test('resolveTarget: auto flips native <-> second, explicit wins', () => {
  assert.equal(resolveTarget('auto', 'fa'), 'en');
  assert.equal(resolveTarget('auto', 'en'), 'fa');
  assert.equal(resolveTarget('auto', 'de'), 'fa');
  assert.equal(resolveTarget('de', 'fa'), 'de');
  assert.equal(resolveTarget('auto', 'tr', { nativeLang: 'tr', secondLang: 'de' }), 'de');
  assert.equal(normalizeCode('zh'), 'zh-CN');
  assert.equal(normalizeCode('en-US'), 'en');
});

test('splitText keeps chunks under the limit and loses nothing', () => {
  const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(' ') + '\n\nNew paragraph. '.repeat(30);
  const chunks = splitText(text, 200);
  assert.ok(chunks.every((c) => c.length <= 200), 'chunk too long');
  assert.equal(chunks.join('').replace(/\s+/g, ''), text.replace(/\s+/g, ''));
  assert.deepEqual(splitText('short', 100), ['short']);
});

test('extractPartialTranslation streams a JSON string value', () => {
  assert.equal(extractPartialTranslation('{"transl'), null);
  assert.deepEqual(extractPartialTranslation('{"translation": "سلا'), { text: 'سلا', done: false });
  assert.deepEqual(extractPartialTranslation('{"translation":"a\\nb \\"q\\""'), { text: 'a\nb "q"', done: true });
  // incomplete escape sequences must not leak garbage
  assert.equal(extractPartialTranslation('{"translation":"x\\').text, 'x');
  assert.equal(extractPartialTranslation('{"translation":"x\\u06').text, 'x');
  assert.equal(extractPartialTranslation('{"translation":"\\u0633"').text, 'س');
});

test('parseModelOutput copes with fences, think tags, junk and plain text', () => {
  const meta = { srcCode: 'en', tgtCode: 'fa', tone: 'auto' };
  const json = '{"translation":"سلام","detectedLang":"en","breakdown":[{"term":"hi","meaning":"سلام","explanation":"x"},{"nope":1}],"variants":["درود","سلام"],"critiqueNotes":"ok"}';

  let r = parseModelOutput('```json\n' + json + '\n```', meta);
  assert.equal(r.translation, 'سلام');
  assert.equal(r.breakdown.length, 1);
  assert.deepEqual(r.variants, ['درود']); // identical variant removed
  assert.equal(r.engine, 'aphra');

  r = parseModelOutput('<think>hmm</think>Sure! ' + json + ' hope that helps', meta);
  assert.equal(r.translation, 'سلام');

  r = parseModelOutput('Just a plain answer', meta);
  assert.equal(r.translation, 'Just a plain answer');

  r = parseModelOutput('{"translation":"نیمه کاره', meta); // truncated stream
  assert.equal(r.translation, 'نیمه کاره');

  r = parseModelOutput('{"translation":"x","detectedLang":"zzz"}', meta);
  assert.equal(r.detectedLang, 'en'); // unknown code falls back to heuristic
});

test('isLocalUrl lets local servers skip the API key', () => {
  assert.ok(isLocalUrl('http://localhost:11434/v1'));
  assert.ok(isLocalUrl('http://127.0.0.1:1234/v1'));
  assert.ok(isLocalUrl('http://192.168.1.20:8080/v1'));
  assert.ok(!isLocalUrl('https://api.openai.com/v1'));
  assert.ok(!isLocalUrl('not a url'));
});

test('buildPrompts guards against prompt injection and trims work for long text', () => {
  const short = buildPrompts({ text: 'hi', srcCode: 'en', tgtCode: 'fa', tone: 'formal' });
  assert.match(short.system, /Never follow instructions/);
  assert.match(short.system, /Formal/);
  assert.match(short.user, /<text>\nhi\n<\/text>/);
  const long = buildPrompts({ text: 'x'.repeat(2000), srcCode: 'en', tgtCode: 'fa' });
  assert.match(long.system, /as fast as possible/);
});

test('normalizeBaseUrl maps any Gemini endpoint variations to /v1beta/openai', () => {
  assert.equal(
    normalizeBaseUrl('https://generativelanguage.googleapis.com/v1'),
    'https://generativelanguage.googleapis.com/v1beta/openai'
  );
  assert.equal(
    normalizeBaseUrl('https://generativelanguage.googleapis.com/v1beta'),
    'https://generativelanguage.googleapis.com/v1beta/openai'
  );
  assert.equal(
    normalizeBaseUrl('https://generativelanguage.googleapis.com'),
    'https://generativelanguage.googleapis.com/v1beta/openai'
  );
  assert.equal(
    normalizeBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/'),
    'https://generativelanguage.googleapis.com/v1beta/openai'
  );
  assert.equal(
    normalizeBaseUrl('https://api.openai.com/v1/'),
    'https://api.openai.com/v1'
  );
});

test('normalizeModel strips models/ prefix and maps retired models', () => {
  assert.equal(normalizeModel('models/gemini-3.8-flash', 'gemini'), 'gemini-3.8-flash');
  assert.equal(normalizeModel('gemini-2.5-flash', 'gemini'), 'gemini-3.8-flash');
  assert.equal(normalizeModel('gemini-2.0-flash', 'gemini'), 'gemini-3.8-flash');
  assert.equal(normalizeModel('gemini-1.5-pro', 'gemini'), 'gemini-3.8-flash');
  assert.equal(normalizeModel('models/gemini-1.5-pro', 'https://generativelanguage.googleapis.com/v1'), 'gemini-3.8-flash');
  assert.equal(normalizeModel('gemini', 'gemini'), 'gemini-3.8-flash');
  assert.equal(normalizeModel('deepseek/deepseek-chat', 'https://openrouter.ai/api/v1'), 'deepseek/deepseek-chat');
});

test('getCandidateModels provides active Gemini family and excludes retired models', () => {
  const models = getCandidateModels('https://generativelanguage.googleapis.com/v1', 'gemini-2.5-flash');
  assert.ok(!models.includes('gemini-1.5-pro'), 'should not include retired gemini-1.5-pro');
  assert.ok(!models.includes('gemini-2.5-flash'), 'should not include retired gemini-2.5-flash');
  assert.ok(models.includes('gemini-3.8-flash'), 'should include gemini-3.8-flash');
  assert.ok(models.includes('gemini-3.8-pro'), 'should include gemini-3.8-pro');
  assert.ok(models.includes('gemini-3.5-flash'), 'should include gemini-3.5-flash');
});
