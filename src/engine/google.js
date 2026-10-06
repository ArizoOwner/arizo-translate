const { detectLanguage, resolveTarget, normalizeCode } = require('./languages');

const GOOGLE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const GOOGLE_UA = 'GoogleTranslate/6.28.0.RC05.358249487 (Linux; U; Android 10; Pixel 4)';
const GOOGLE_CHUNK = 4500;
const MYMEMORY_CHUNK = 450;

function withTimeout(signal, ms) {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function isAbort(err) {
  return err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
}

/**
 * Split long text on paragraph / sentence boundaries so each piece stays below `max`.
 * Separators are kept so that the original layout survives the round trip.
 */
function splitText(text, max) {
  if (text.length <= max) return [text];

  const pieces = [];
  const paragraphs = text.split(/(\n+)/);
  let current = '';

  const push = () => {
    if (current) {
      pieces.push(current);
      current = '';
    }
  };

  for (const part of paragraphs) {
    if (!part) continue;
    if (part.length > max) {
      push();
      const sentences = part.split(/(?<=[.!?؟۔。！？])\s+/);
      for (const s of sentences) {
        if (s.length > max) {
          for (let i = 0; i < s.length; i += max) pieces.push(s.slice(i, i + max));
        } else if ((current + s).length + 1 > max) {
          push();
          current = s;
        } else {
          current = current ? `${current} ${s}` : s;
        }
      }
      push();
    } else if ((current + part).length > max) {
      push();
      current = part;
    } else {
      current += part;
    }
  }
  push();
  return pieces;
}

async function googleRequest(chunk, sl, tl, signal) {
  const sourceParam = sl && sl !== 'auto' ? sl : 'auto';
  const url = `${GOOGLE_ENDPOINT}?client=at&sl=${encodeURIComponent(sourceParam)}&tl=${encodeURIComponent(tl)}&dt=t&dt=bd&dt=rm`;
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': GOOGLE_UA,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({ q: chunk }),
        signal: withTimeout(signal, 8000)
      });
      if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (isAbort(err) && signal && signal.aborted) throw err;
      lastErr = err;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastErr;
}

function parseGoogle(data) {
  let translation = '';
  let translit = '';
  if (data && Array.isArray(data[0])) {
    for (const part of data[0]) {
      if (!Array.isArray(part)) continue;
      if (typeof part[0] === 'string') translation += part[0];
      else if (typeof part[2] === 'string') translit += part[2];
    }
  }

  const alternatives = [];
  if (data && Array.isArray(data[1])) {
    for (const item of data[1]) {
      const pos = item[0];
      const terms = Array.isArray(item[1]) ? item[1].slice(0, 6) : [];
      if (terms.length) alternatives.push({ pos, terms });
    }
  }

  return {
    translation,
    translit: translit.trim(),
    alternatives,
    detectedLang: normalizeCode(typeof data?.[2] === 'string' ? data[2] : '')
  };
}

/**
 * Google Translate (free "android" endpoint). Long input is chunked automatically.
 */
async function translateWithGoogle(text, opts = {}) {
  const { targetLang = 'auto', prefs = {}, signal } = opts;

  if (!text || !text.trim()) {
    return { translation: '', detectedLang: 'en', targetLang: 'fa', alternatives: [], engine: 'google' };
  }

  const guess = detectLanguage(text);
  const tl = resolveTarget(targetLang, guess, prefs);
  const sl = guess || 'auto';

  try {
    const chunks = splitText(text, GOOGLE_CHUNK);
    const results = await Promise.all(chunks.map((c) => googleRequest(c, sl, tl, signal)));
    const parsed = results.map(parseGoogle);

    const translation = parsed.map((p) => p.translation).join('').trim();
    if (!translation) throw new Error('Empty translation');

    return {
      translation,
      translit: chunks.length === 1 ? parsed[0].translit : '',
      detectedLang: parsed[0].detectedLang || guess,
      targetLang: tl,
      alternatives: chunks.length === 1 ? parsed[0].alternatives : [],
      engine: 'google'
    };
  } catch (error) {
    if (isAbort(error) && signal && signal.aborted) throw error;
    console.warn('Google translate failed, falling back to MyMemory:', error.message);
    return fallbackMyMemory(text, tl, guess, signal);
  }
}

/**
 * Fallback to the MyMemory free API (500 char limit per request, so we chunk).
 */
async function fallbackMyMemory(text, targetLang, sourceLang, signal) {
  try {
    const chunks = splitText(text, MYMEMORY_CHUNK);
    const out = [];
    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(sourceLang)}|${encodeURIComponent(targetLang)}`;
      const res = await fetch(url, { signal: withTimeout(signal, 8000) });
      if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
      const json = await res.json();
      const t = json?.responseData?.translatedText;
      if (typeof t !== 'string' || !t.trim()) throw new Error('Empty MyMemory response');
      out.push(t);
    }
    return {
      translation: out.join('').trim(),
      detectedLang: sourceLang,
      targetLang,
      alternatives: [],
      engine: 'mymemory'
    };
  } catch (err) {
    if (isAbort(err) && signal && signal.aborted) throw err;
    console.error('MyMemory fallback failed:', err.message);
  }

  throw new Error('NETWORK_FAILED');
}

module.exports = {
  translateWithGoogle,
  splitText
};
