const { splitText } = require('./google');
const { normalizeCode } = require('./languages');

const MAX_CHUNKS = 4;
const CHUNK_SIZE = 180;

/**
 * Natural sounding speech without depending on locally installed Windows voices
 * (Windows ships no Persian voice, so `speechSynthesis` is silent for Farsi).
 * Returns a base64 encoded MP3, or throws.
 */
async function synthesize(text, lang) {
  const tl = normalizeCode(lang) || 'en';
  const chunks = splitText(text.trim(), CHUNK_SIZE).slice(0, MAX_CHUNKS);
  const buffers = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }

  if (!buffers.length) throw new Error('Nothing to speak');
  return Buffer.concat(buffers).toString('base64');
}

module.exports = { synthesize };
