/**
 * Persian-English Contextual Idiom & Fluency Enhancer
 * Translates figurative expressions, metaphors, and cultural collocations
 * into fluent, native equivalents instead of literal word-by-word mappings.
 */

// ---------------------------------------------------------------------------
// Persian to English Idiom & Collocation Rules
// ---------------------------------------------------------------------------
const FA_TO_EN_RULES = [
  // 1. «گره از کار ... گشودن / باز کردن» (Untangle / solve human difficulties)
  {
    faRegex: /گره[‌\s‌]*(ی|ای)?[‌\s‌]*از[‌\s‌]*کار/u,
    enReplacements: [
      { pattern: /\b(opens?|untying|unties?|unravelling|loosening)\s+a\s+knot\s+of\b/gi, replacement: 'untangles' },
      { pattern: /\bopens?\s+the\s+knot\s+of\b/gi, replacement: 'untangles' },
      { pattern: /\bopen\s+a\s+knot\s+from\b/gi, replacement: 'solve' },
      { pattern: /\bopens?\s+knots?\s+in\b/gi, replacement: 'untangles' },
      { pattern: /\bopens?\s+knots?\b/gi, replacement: 'resolves problems' }
    ]
  },

  // 2. «نفس‌گیر» در بافت سرعت، فشار، چالش یا شتاب (Overwhelming / grueling)
  {
    faRegex: /نفس[‌\s‌]*گیر/u,
    enReplacements: [
      { pattern: /\bsometimes\s+it\s+seems\s+breathtaking\s+to\s+keep\s+up\s+with\s+it\b/gi, replacement: 'it can sometimes feel overwhelming to keep up' },
      { pattern: /\bseems?\s+breathtaking\s+to\s+keep\s+up\s+with\s+it\b/gi, replacement: 'can feel overwhelming to keep up' },
      { pattern: /\bit\s+seems\s+breathtaking\s+to\s+keep\s+up\b/gi, replacement: 'it feels overwhelming to keep up' },
      { pattern: /\bbreathtaking\s+to\s+keep\s+up\b/gi, replacement: 'overwhelming to keep up' },
      { pattern: /\bseems\s+breathtaking\b/gi, replacement: 'feels overwhelming' },
      { pattern: /\bbreathtaking\s+pace\b/gi, replacement: 'overwhelming pace' }
    ]
  },

  // 3. «سرعت پیش‌تاختن / با چنان سرعتی پیش تاختن»
  {
    faRegex: /سرعت.*(پیش[‌\s‌]*می[‌\s‌]*تازد|پیشرفت|شتاب)/u,
    enReplacements: [
      { pattern: /\bmoving\s+forward\s+at\s+such\s+a\s+speed\b/gi, replacement: 'moving at such a pace' },
      { pattern: /\brunning\s+forward\s+at\s+such\s+a\s+speed\b/gi, replacement: 'advancing at such a pace' },
      { pattern: /\bgalloping\s+forward\b/gi, replacement: 'surging ahead' }
    ]
  },

  // 4. «پیچیدگی تراشیدن / پیچیدگی‌های تازه تراشیدن»
  {
    faRegex: /پیچیدگی.*(تراش|بتراش)/u,
    enReplacements: [
      { pattern: /\bnot\s+just\s+creating\s+new\s+complications\b/gi, replacement: 'not simply adds complexity' },
      { pattern: /\bjust\s+shaving\s+new\s+complexities\b/gi, replacement: 'simply adding complexity' },
      { pattern: /\bcarv(ing|e|es)\s+new\s+complexities\b/gi, replacement: 'add fresh complexity' },
      { pattern: /\bcarv(ing|e|es)\s+new\s+complications\b/gi, replacement: 'create fresh complications' }
    ]
  },

  // 5. «نوآوری واقعی» & «نباید فراموش کرد»
  {
    faRegex: /نوآوری[‌\s‌]+واقعی/u,
    enReplacements: [
      { pattern: /\breal\s+innovation\b/gi, replacement: 'true innovation' }
    ]
  },
  {
    faRegex: /نباید\s+فراموش\s+کرد/u,
    enReplacements: [
      { pattern: /\bwe\s+should\s+not\s+forget\b/gi, replacement: 'we must not forget' },
      { pattern: /\bone\s+should\s+not\s+forget\b/gi, replacement: 'we must not forget' }
    ]
  },

  // 6. «دست و پنجه نرم کردن با» (Struggle / grapple with)
  {
    faRegex: /دست\s+و\s+پنجه\s+نرم/u,
    enReplacements: [
      { pattern: /\bsoften(ed|ing)?\s+hands?\s+and\s+paws?\s+(with\b)?/gi, replacement: 'grappled with' },
      { pattern: /\bsoften(ed|ing)?\s+hands?\s+and\s+claws?\b/gi, replacement: 'tackled' },
      { pattern: /\bplaying\s+soft\s+hands\b/gi, replacement: 'grappling with' }
    ]
  },

  // 7. «سنگ تمام گذاشتن» (Go all out / spare no effort)
  {
    faRegex: /سنگ\s+تمام\s+گذاشت/u,
    enReplacements: [
      { pattern: /\bput\s+a\s+full\s+stone\b/gi, replacement: 'spared no effort' },
      { pattern: /\bputting\s+a\s+full\s+stone\b/gi, replacement: 'going all out' },
      { pattern: /\bset\s+a\s+full\s+stone\b/gi, replacement: 'left no stone unturned' }
    ]
  },

  // 8. «از کوره در رفتن» (Lose temper / fly off the handle)
  {
    faRegex: /از\s+کوره\s+در\s+رفتن|از\s+کوره\s+در\s+رفت/u,
    enReplacements: [
      { pattern: /\bget\s+out\s+of\s+the\s+furnace\b/gi, replacement: 'lose one\'s temper' },
      { pattern: /\bwent\s+out\s+of\s+the\s+furnace\b/gi, replacement: 'lost his temper' },
      { pattern: /\bjump(ed)?\s+out\s+of\s+the\s+kiln\b/gi, replacement: 'flew off the handle' }
    ]
  },

  // 9. «پشت گوش انداختن» (Procrastinate / brush aside)
  {
    faRegex: /پشت\s+گوش\s+انداخت/u,
    enReplacements: [
      { pattern: /\bthrow(ing)?\s+behind\s+(the\s+)?ear\b/gi, replacement: 'procrastinating on' },
      { pattern: /\bput(ting)?\s+behind\s+(the\s+)?ear\b/gi, replacement: 'brushing aside' }
    ]
  },

  // 10. «روی پا ایستادن» (Stand on one's own two feet)
  {
    faRegex: /روی\s+پای\s+خود\s+ایستادن|روی\s+پای\s+خودش/u,
    enReplacements: [
      { pattern: /\bstand(ing)?\s+on\s+one's\s+own\s+foot\b/gi, replacement: 'standing on one\'s own two feet' },
      { pattern: /\bstand\s+on\s+his\s+own\s+foot\b/gi, replacement: 'stand on his own two feet' }
    ]
  },

  // 11. «چشم پوشی کردن» (Overlook / turn a blind eye)
  {
    faRegex: /چشم[‌\s‌]*پوشی/u,
    enReplacements: [
      { pattern: /\beye\s+covering\b/gi, replacement: 'turning a blind eye' },
      { pattern: /\bcovering\s+the\s+eyes\b/gi, replacement: 'overlooking' }
    ]
  },

  // 12. «زیر بار رفتن / نرفتن» (Submit to / give in / refuse)
  {
    faRegex: /زیر\s+بار\s+(نمی[‌\s‌]*رود|نرفت|رفتن)/u,
    enReplacements: [
      { pattern: /\bgo(ing)?\s+under\s+the\s+load\b/gi, replacement: 'accepting the burden' },
      { pattern: /\bdoes\s+not\s+go\s+under\s+the\s+load\b/gi, replacement: 'refuses to submit' },
      { pattern: /\bdid\s+not\s+go\s+under\s+the\s+load\b/gi, replacement: 'refused to give in' }
    ]
  },

  // 13. «مثل آب خوردن» (A piece of cake / like a breeze)
  {
    faRegex: /مثل\s+آب\s+خوردن/u,
    enReplacements: [
      { pattern: /\blike\s+drinking\s+water\b/gi, replacement: 'a piece of cake' }
    ]
  },

  // 14. «دندان روی جگر گذاشتن» (Bite the bullet / bear with patience)
  {
    faRegex: /دندان\s+روی\s+جگر/u,
    enReplacements: [
      { pattern: /\bput(ting)?\s+teeth\s+on\s+(the\s+)?liver\b/gi, replacement: 'biting the bullet' }
    ]
  },

  // 15. «دل به دریا زدن» (Take the plunge)
  {
    faRegex: /دل\s+به\s+دریا\s+زد/u,
    enReplacements: [
      { pattern: /\bhit\s+the\s+heart\s+to\s+the\s+sea\b/gi, replacement: 'took the plunge' },
      { pattern: /\bput\s+the\s+heart\s+into\s+the\s+sea\b/gi, replacement: 'took the leap' }
    ]
  },

  // 16. «آستین بالا زدن» (Roll up sleeves)
  {
    faRegex: /آستین\s+بالا\s+زد/u,
    enReplacements: [
      { pattern: /\bhit\s+the\s+sleeves?\s+up\b/gi, replacement: 'rolled up the sleeves' },
      { pattern: /\bput\s+the\s+sleeves?\s+up\b/gi, replacement: 'rolled up the sleeves' }
    ]
  },

  // 17. «گره کور» (Deadlock / impasse)
  {
    faRegex: /گره[‌\s‌]+کور/u,
    enReplacements: [
      { pattern: /\bblind\s+knot\b/gi, replacement: 'deadlock' },
      { pattern: /\ba\s+blind\s+knot\b/gi, replacement: 'an impasse' }
    ]
  },

  // 18. «راه به جایی نبردن» (Lead nowhere)
  {
    faRegex: /راه\s+به\s+جایی\s+نمی[‌\s‌]*برد|راه\s+به\s+جایی\s+نبرد/u,
    enReplacements: [
      { pattern: /\bdoes\s+not\s+take\s+a\s+way\s+anywhere\b/gi, replacement: 'leads nowhere' },
      { pattern: /\bdid\s+not\s+take\s+a\s+way\s+anywhere\b/gi, replacement: 'led nowhere' }
    ]
  },

  // 19. «به بار نشستن» (Bear fruit / pay off)
  {
    faRegex: /به\s+بار\s+نشست/u,
    enReplacements: [
      { pattern: /\bsat\s+to\s+bear\b/gi, replacement: 'bore fruit' },
      { pattern: /\bsat\s+on\s+the\s+load\b/gi, replacement: 'paid off' }
    ]
  }
];

// ---------------------------------------------------------------------------
// English to Persian Idiom & Collocation Rules
// ---------------------------------------------------------------------------
const EN_TO_FA_RULES = [
  { pattern: /\bpiece\s+of\s+cake\b/gi, faEquivalent: 'مثل آب خوردن' },
  { pattern: /\bbreak\s+a\s+leg\b/gi, faEquivalent: 'موفق باشی' },
  { pattern: /\bbite\s+the\s+bullet\b/gi, faEquivalent: 'دندان روی جگر گذاشتن' },
  { pattern: /\bspill\s+the\s+beans\b/gi, faEquivalent: 'بند را به آب دادن' },
  { pattern: /\bunder\s+the\s+weather\b/gi, faEquivalent: 'کسل و ناخوش‌احوال' },
  { pattern: /\bonce\s+in\s+a\s+blue\s+moon\b/gi, faEquivalent: 'به ندرت' },
  { pattern: /\bcost(s)?\s+an\s+arm\s+and\s+a\s+leg\b/gi, faEquivalent: 'بسیار گران بودن' },
  { pattern: /\bhit\s+the\s+nail\s+on\s+the\s+head\b/gi, faEquivalent: 'دقیقاً به هدف زدن' },
  { pattern: /\bcut(ting)?\s+corners\b/gi, faEquivalent: 'سمبل کردن' },
  { pattern: /\bburn(ing)?\s+the\s+midnight\s+oil\b/gi, faEquivalent: 'تا دیروقت کار کردن' },
  { pattern: /\bcall\s+it\s+a\s+day\b/gi, faEquivalent: 'کار را تمام کردن' },
  { pattern: /\btake\s+it\s+with\s+a\s+grain\s+of\s+salt\b/gi, faEquivalent: 'با دیده تردید نگریستن' },
  { pattern: /\bactions\s+speak\s+louder\s+than\s+words\b/gi, faEquivalent: 'دو صد گفته چون نیم کردار نیست' },
  { pattern: /\bbetter\s+late\s+than\s+never\b/gi, faEquivalent: 'دیر رسیدن بهتر از هرگز نرسیدن است' }
];

/**
 * Clean and polish an English translation when translating from Persian.
 */
function enhanceFaToEn(englishText, originalFaText) {
  if (!englishText || typeof englishText !== 'string') return englishText;
  let result = englishText;

  for (const rule of FA_TO_EN_RULES) {
    if (rule.faRegex.test(originalFaText)) {
      for (const rep of rule.enReplacements) {
        result = result.replace(rep.pattern, rep.replacement);
      }
    }
  }

  // General fluency touches
  result = result
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return result;
}

/**
 * Clean and polish a Persian translation when translating from English.
 */
function enhanceEnToFa(persianText, originalEnText) {
  if (!persianText || typeof persianText !== 'string') return persianText;
  let result = persianText;

  for (const rule of EN_TO_FA_RULES) {
    if (rule.pattern.test(originalEnText)) {
      result = result
        .replace(/یک\s+تکه\s+کیک|تکه\s+ای\s+از\s+کیک/g, 'مثل آب خوردن')
        .replace(/یک\s+پا\s+بشکن/g, 'موفق باشی')
        .replace(/لوبیا\s+ها\s+را\s+بریزید/g, 'راز را فاش کردن')
        .replace(/زیر\s+آب\s+و\s+هوا/g, 'ناخوش‌احوال');
    }
  }

  // Persian typography normalizing
  result = result
    .replace(/\s+([،؛.؟!])/g, '$1')
    .replace(/([،؛.؟!])([^\s،؛.؟!])/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return result;
}

/**
 * Universal enhancement router.
 */
function enhanceTranslation(translation, sourceText, sourceLang, targetLang) {
  if (!translation) return translation;

  const isSourceFa = sourceLang === 'fa' || /[؀-ۿ]/.test(sourceText);
  const isTargetEn = targetLang === 'en';

  const isSourceEn = sourceLang === 'en';
  const isTargetFa = targetLang === 'fa';

  if (isSourceFa && isTargetEn) {
    return enhanceFaToEn(translation, sourceText);
  }

  if (isSourceEn && isTargetFa) {
    return enhanceEnToFa(translation, sourceText);
  }

  return translation;
}

module.exports = {
  enhanceTranslation,
  enhanceFaToEn,
  enhanceEnToFa
};
