const { translateWithGoogle } = require('./google');
const { translateWithAphra, AphraError } = require('./aphra');
const { addHistoryItem, loadSettings } = require('../main/store');

const CACHE_LIMIT = 200;
const cache = new Map(); // insertion ordered => cheap LRU

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value); // refresh recency
  return value;
}

function cacheSet(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
}

function friendlyError(err) {
  if (err && err.message === 'NETWORK_FAILED') {
    return 'اتصال اینترنت برقرار نیست؛ ترجمه ممکن نشد.';
  }
  return (err && err.message) || 'خطا در فرآیند ترجمه';
}

function isAbort(err, signal) {
  return !!(signal && signal.aborted) || (err && err.name === 'AbortError');
}

/**
 * Universal translation orchestrator: cache -> engine -> graceful fallback -> history.
 */
async function translateText({ text, engine = 'google', tone, targetLang = 'auto' }, { signal, onPartial } = {}) {
  if (!text || !text.trim()) {
    return { success: true, data: { translation: '', detectedLang: 'en', targetLang: 'fa', engine } };
  }

  const cleanText = text.trim();
  const settings = loadSettings();
  const prefs = { nativeLang: settings.nativeLang, secondLang: settings.secondLang };
  const aphraConfig = { ...settings.aphra, tone: tone || settings.aphra.tone, targetLang, prefs };

  const cacheKey = JSON.stringify([
    engine,
    targetLang,
    prefs,
    engine === 'aphra' ? [aphraConfig.tone, aphraConfig.model, aphraConfig.showBreakdown] : '',
    cleanText
  ]);

  const hit = cacheGet(cacheKey);
  if (hit) return { success: true, cached: true, data: hit };

  try {
    let result;
    let warning = null;

    if (engine === 'aphra') {
      try {
        result = await translateWithAphra(cleanText, aphraConfig, { signal, onPartial });
      } catch (err) {
        if (isAbort(err, signal)) throw err;
        if (!(err instanceof AphraError)) throw err;

        // Never leave the user empty handed: degrade to the instant engine and explain why.
        const fallback = await translateWithGoogle(cleanText, { targetLang, prefs, signal });
        warning = {
          code: err.code === 'MISSING_API_KEY' ? 'MISSING_API_KEY' : 'AI_FAILED',
          message: err.code === 'MISSING_API_KEY' ? '' : err.message
        };
        result = { ...fallback, originalEngine: 'aphra' };
      }
    } else {
      result = await translateWithGoogle(cleanText, { targetLang, prefs, signal });
    }

    if (isAbort(null, signal)) return { success: false, aborted: true };

    addHistoryItem({
      query: cleanText,
      translation: result.translation,
      detectedLang: result.detectedLang,
      targetLang: result.targetLang,
      engine: result.engine
    });

    if (!warning) cacheSet(cacheKey, result);
    return { success: true, warning, data: result };
  } catch (error) {
    if (isAbort(error, signal)) return { success: false, aborted: true };
    return { success: false, error: friendlyError(error) };
  }
}

module.exports = { translateText };
