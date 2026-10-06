const axios = require('axios');

/**
 * Detect whether text is predominantly Persian/Arabic or Latin
 */
function detectPersian(text) {
  const persianRegex = /[؀-ۿﭐ-﷿ﹰ-﻿]/g;
  const matches = text.match(persianRegex);
  return matches && matches.length > (text.length * 0.25);
}

/**
 * Google Translate using Android client headers (free, reliable, ~100ms)
 */
async function translateWithGoogle(text, targetLang = 'auto') {
  if (!text || !text.trim()) {
    return { translation: '', detectedLang: 'en', targetLang: 'fa' };
  }

  const isFa = detectPersian(text);
  const sl = 'auto';
  const tl = targetLang === 'auto' ? (isFa ? 'en' : 'fa') : targetLang;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=at&sl=${sl}&tl=${tl}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(text)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'GoogleTranslate/6.28.0.RC05.358249487 (Linux; U; Android 10; Pixel 4)'
      },
      timeout: 5000
    });

    const data = response.data;
    // Main translation parts
    let translation = '';
    if (data && data[0] && Array.isArray(data[0])) {
      translation = data[0].map((part) => part[0] || '').join('');
    }

    const detectedLang = data[2] || (isFa ? 'fa' : 'en');

    // Dictionary definitions / alternatives (if short query or single word)
    let alternatives = [];
    if (data[1] && Array.isArray(data[1])) {
      for (const item of data[1]) {
        const pos = item[0]; // e.g. "noun", "verb"
        const terms = item[1] || [];
        alternatives.push({ pos, terms: terms.slice(0, 5) });
      }
    }

    return {
      translation: translation.trim(),
      detectedLang,
      targetLang: tl,
      alternatives,
      engine: 'google'
    };
  } catch (error) {
    console.warn('Google Android client failed, falling back to MyMemory:', error.message);
    return await fallbackMyMemory(text, tl, isFa ? 'fa' : 'en');
  }
}

/**
 * Fallback to MyMemory Free Translation API
 */
async function fallbackMyMemory(text, targetLang, defaultSource = 'en') {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${defaultSource}|${targetLang}`;
    const res = await axios.get(url, { timeout: 6000 });
    if (res.data && res.data.responseData) {
      return {
        translation: res.data.responseData.translatedText.trim(),
        detectedLang: defaultSource,
        targetLang,
        alternatives: [],
        engine: 'mymemory'
      };
    }
  } catch (err) {
    console.error('MyMemory fallback failed:', err.message);
  }

  throw new Error('All instant translation services failed. Please check your network connection.');
}

module.exports = {
  translateWithGoogle,
  detectPersian
};
