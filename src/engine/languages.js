/**
 * Language catalogue + lightweight script based language detection.
 * Pure module (no Electron / network access) so it can be unit-tested with `node --test`.
 */

const LANGUAGES = [
  { code: 'fa', name: 'Persian (Farsi)', native: 'فارسی', rtl: true },
  { code: 'en', name: 'English', native: 'English', rtl: false },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', rtl: false },
  { code: 'de', name: 'German', native: 'Deutsch', rtl: false },
  { code: 'fr', name: 'French', native: 'Français', rtl: false },
  { code: 'es', name: 'Spanish', native: 'Español', rtl: false },
  { code: 'it', name: 'Italian', native: 'Italiano', rtl: false },
  { code: 'pt', name: 'Portuguese', native: 'Português', rtl: false },
  { code: 'ru', name: 'Russian', native: 'Русский', rtl: false },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', rtl: false },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '中文', rtl: false },
  { code: 'ja', name: 'Japanese', native: '日本語', rtl: false },
  { code: 'ko', name: 'Korean', native: '한국어', rtl: false },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'he', name: 'Hebrew', native: 'עברית', rtl: true },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', rtl: false },
  { code: 'pl', name: 'Polish', native: 'Polski', rtl: false },
  { code: 'sv', name: 'Swedish', native: 'Svenska', rtl: false }
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

function normalizeCode(code) {
  if (!code || typeof code !== 'string') return '';
  const c = code.trim().toLowerCase();
  if (c === 'zh' || c === 'zh-cn' || c === 'zh-hans') return 'zh-CN';
  if (BY_CODE.has(c)) return BY_CODE.get(c).code;
  // e.g. "en-US" -> "en"
  const base = c.split(/[-_]/)[0];
  if (BY_CODE.has(base)) return BY_CODE.get(base).code;
  return c; // unknown but passed through (Google supports many more)
}

function getLanguage(code) {
  return BY_CODE.get(normalizeCode(code).toLowerCase()) || null;
}

function languageName(code) {
  const l = getLanguage(code);
  return l ? l.name : (code || 'the source language');
}

function isRtlLang(code) {
  const l = getLanguage(code);
  return !!(l && l.rtl);
}

const RE_ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const RE_PERSIAN_ONLY = /[پچژگکی۰-۹‌]/g;
const RE_ARABIC_ONLY = /[ةيكىءأإؤئ]/g;
const RE_URDU_ONLY = /[ٹڈڑںھہےۓ]/g;
const RE_LATIN = /[A-Za-z\u00C0-\u024F]/g;
const RE_CYRILLIC = /[\u0400-\u04FF]/g;
const RE_HEBREW = /[\u0590-\u05FF]/g;
const RE_HIRAGANA_KATAKANA = /[\u3040-\u30FF]/g;
const RE_HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF]/g;
const RE_HAN = /[\u4E00-\u9FFF]/g;
const RE_DEVANAGARI = /[\u0900-\u097F]/g;

const RE_PERSIAN_WORDS = /(?:^|\s|[.,!؟،؛:\-_()\[\]{}"'])(سلام|درود|خوبی|در|به|از|که|رو|را|با|برای|این|آن|اینجا|آنجا|ها|های|کن|کنید|کرد|کردن|کردم|کردی|کردند|شد|شده|است|نیست|بود|می|نمی|یک|هم|چرا|چطور|چطوری|چگونه|کجا|چی|چیه|چیست|کی|اگر|اگه|ولی|اما|چون|تا|توی|تو|روی|داخل|زیر|بالا|داد|داده|میده|می‌ده|نده|نمیده|نمی‌ده|گرفت|بگیر|نگیر|زد|زدن|بزن|نزن|میزنه|می‌زنه|رفت|برو|نرو|اومد|آمد|بیا|نیا|هست|باشه|نباشه|میشه|می‌شه|نمیشه|نمی‌شه|لطفا|لطفاً|مرسی|ممنون|تشکر|دارد|دارم|داری|دارند|باید|نباید|شاید|بزار|بذار|چک|تست|حل|ارور|خطا|مشکل|باگ|میخوام|می‌خوام|میخواهم|می‌خواهم|میتونم|می‌تونم|میتونی|می‌تونی|میتونه|می‌تونه|بکنم|بررسی|پروژه|برنامه|کد|کامیت|مرج|پوش|پول|ریکوئست|برنچ|ریپو|کانفیگ|دیپلوی|بیلد|فیکس|اجرا|نصب|پکیج|ماژول|کامپوننت|تابع|متغیر|دیتابیس|سرور|کلاینت|لاگ|داکیومنت)(?:\s|[.,!؟،؛:\-_()\[\]{}"']|$)/i;

function count(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * Intelligent script and vocabulary based language detection.
 * Specifically optimized for mixed Persian-English technical text
 * (e.g. Persian sentences containing English words, commands, and code jargon).
 */
function detectLanguage(text) {
  if (!text || !text.trim()) return 'en';
  const clean = text.trim();

  const arabic = count(clean, RE_ARABIC_SCRIPT);
  const latin = count(clean, RE_LATIN);
  const cyr = count(clean, RE_CYRILLIC);
  const heb = count(clean, RE_HEBREW);
  const kana = count(clean, RE_HIRAGANA_KATAKANA);
  const hangul = count(clean, RE_HANGUL);
  const han = count(clean, RE_HAN);
  const deva = count(clean, RE_DEVANAGARI);

  // If there is ANY Arabic/Persian script in the text:
  if (arabic > 0) {
    // 1. Check Urdu specific letters
    if (count(clean, RE_URDU_ONLY) > 0) return 'ur';

    // 2. Check Persian indicators:
    const faLetters = count(clean, RE_PERSIAN_ONLY);
    const arLetters = count(clean, RE_ARABIC_ONLY);
    const hasFaWords = RE_PERSIAN_WORDS.test(clean);

    // If text has Persian words or Persian-only letters (پ, چ, ژ, گ, ک, ی, نیم‌فاصله):
    if (hasFaWords || faLetters > 0) {
      return 'fa';
    }

    // Mixed text with technical English: If at least 15% of alpha chars are Arabic script or >= 3 chars
    if (arabic >= 3 || (arabic + latin > 0 && arabic / (arabic + latin) >= 0.15)) {
      if (arLetters > faLetters && faLetters === 0 && !hasFaWords && arabic > latin) {
        return 'ar';
      }
      return 'fa';
    }

    // If pure Arabic without Persian markers
    if (arLetters > 0 && faLetters === 0) return 'ar';
    return 'fa';
  }

  // No Arabic/Persian characters: check other non-Latin scripts
  const dominant = Math.max(latin, cyr, heb, kana + han, hangul, deva);
  if (dominant === 0) return 'en';

  if (kana > 0 && kana + han === dominant) return 'ja';
  if (kana + han === dominant) return 'zh-CN';
  if (hangul === dominant) return 'ko';
  if (cyr === dominant) return 'ru';
  if (heb === dominant) return 'he';
  if (deva === dominant) return 'hi';
  return 'en';
}

/**
 * Resolve the effective target language.
 * `auto` means: native language text -> second language, anything else -> native language.
 */
function resolveTarget(requested, detected, prefs = {}) {
  const native = normalizeCode(prefs.nativeLang) || 'fa';
  const second = normalizeCode(prefs.secondLang) || 'en';
  if (requested && requested !== 'auto') return normalizeCode(requested);
  return detected === native ? second : native;
}

module.exports = {
  LANGUAGES,
  normalizeCode,
  getLanguage,
  languageName,
  isRtlLang,
  detectLanguage,
  resolveTarget
};
