const { translateWithGoogle } = require('./google');
const { translateWithAphra } = require('./aphra');
const { addHistoryItem } = require('../main/store');

/**
 * Universal translator orchestrator
 */
async function translateText({ text, engine = 'google', aphraConfig = {}, targetLang = 'auto' }, onProgress = null) {
  if (!text || !text.trim()) {
    return {
      success: true,
      data: { translation: '', detectedLang: 'en', targetLang: 'fa', engine }
    };
  }

  const cleanText = text.trim();

  try {
    let result;

    if (engine === 'aphra') {
      try {
        result = await translateWithAphra(cleanText, { ...aphraConfig, targetLang }, onProgress);
      } catch (aphraErr) {
        if (aphraErr.message === 'MISSING_API_KEY') {
          // Fallback to Google but notify
          const googleRes = await translateWithGoogle(cleanText, targetLang);
          return {
            success: true,
            warning: 'MISSING_API_KEY',
            data: {
              ...googleRes,
              originalEngine: 'aphra',
              fallbackNotice: 'کلید API برای Aphra تنظیم نشده است. ترجمه با حالت سریع گوگل انجام شد.'
            }
          };
        }
        throw aphraErr;
      }
    } else {
      result = await translateWithGoogle(cleanText, targetLang);
    }

    // Save to history
    addHistoryItem({
      query: cleanText,
      translation: result.translation,
      detectedLang: result.detectedLang,
      targetLang: result.targetLang,
      engine: result.engine
    });

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در فرآیند ترجمه'
    };
  }
}

module.exports = {
  translateText
};
