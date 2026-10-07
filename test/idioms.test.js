const test = require('node:test');
const assert = require('node:assert/strict');
const { enhanceTranslation, enhanceFaToEn, enhanceEnToFa } = require('../src/engine/idioms');

test('enhances Persian sample with idioms and figurative collocations into native English', () => {
  const fa = 'دنیای فناوری با چنان سرعتی به پیش می‌تازد که گاهی همراه شدن با آن نفس‌گیر به نظر می‌رسد. با این حال، نباید فراموش کرد که نوآوری واقعی تنها زمانی معنا پیدا می‌کند که گرهی از کار انسان‌ها بگشاید و زندگی را ساده‌تر کند، نه اینکه صرفاً پیچیدگی‌های تازه‌ای بتراشد.';
  const rawEn = 'The world of technology is moving forward at such a speed that sometimes it seems breathtaking to keep up with it. However, we should not forget that real innovation only makes sense when it opens a knot of human work and makes life simpler, not just creating new complications.';

  const expected = 'The world of technology is moving at such a pace that it can sometimes feel overwhelming to keep up. However, we must not forget that true innovation only makes sense when it untangles human work and makes life simpler, not simply adds complexity.';

  const result = enhanceTranslation(rawEn, fa, 'fa', 'en');
  assert.equal(result, expected);
});

test('handles common Persian idioms in contextual translation', () => {
  const testCases = [
    {
      fa: 'ما سال‌ها با این مشکل دست و پنجه نرم کردیم',
      rawEn: 'We softened hands and paws with this problem for years',
      contains: 'grappled with'
    },
    {
      fa: 'تیم ما در این پروژه سنگ تمام گذاشت',
      rawEn: 'Our team put a full stone in this project',
      contains: 'spared no effort'
    },
    {
      fa: 'این کار مثل آب خوردن است',
      rawEn: 'This job is like drinking water',
      contains: 'a piece of cake'
    },
    {
      fa: 'مذاکرات به گره کور خورده است',
      rawEn: 'Negotiations hit a blind knot',
      contains: 'deadlock'
    }
  ];

  for (const tc of testCases) {
    const res = enhanceTranslation(tc.rawEn, tc.fa, 'fa', 'en');
    assert.ok(res.includes(tc.contains), `Expected "${res}" to contain "${tc.contains}"`);
  }
});

test('enhances English idioms into natural Persian equivalents', () => {
  const testCases = [
    {
      en: 'Solving this puzzle was a piece of cake',
      rawFa: 'حل این پازل یک تکه کیک بود',
      expectedFa: 'حل این پازل مثل آب خوردن بود'
    },
    {
      en: 'Good luck tonight, break a leg!',
      rawFa: 'امشب موفق باشی، یک پا بشکن!',
      expectedFa: 'امشب موفق باشی، موفق باشی!'
    }
  ];

  for (const tc of testCases) {
    const res = enhanceTranslation(tc.rawFa, tc.en, 'en', 'fa');
    assert.equal(res, tc.expectedFa);
  }
});
