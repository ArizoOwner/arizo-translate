const axios = require('axios');
const { detectPersian } = require('./google');

/**
 * Aphra Agentic Translation Engine
 * Inspired by DavidLMS/aphra workflow (Analyze -> Context -> Translate -> Critique -> Refine)
 */
async function translateWithAphra(text, config = {}, onProgress = null) {
  const {
    apiKey = '',
    baseUrl = 'https://openrouter.ai/api/v1',
    model = 'deepseek/deepseek-chat',
    tone = 'auto',
    showBreakdown = true,
    targetLang = 'auto'
  } = config;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('MISSING_API_KEY');
  }

  const isFa = detectPersian(text);
  const src = isFa ? 'Persian (Farsi)' : 'English';
  const tgt = targetLang === 'auto' ? (isFa ? 'English' : 'Persian (Farsi)') : (targetLang === 'en' ? 'English' : 'Persian (Farsi)');

  // Tone instruction
  let toneInstruction = 'Natural, fluent, and idiomatic.';
  if (tone === 'formal') {
    toneInstruction = 'Formal, professional, polite, and literary (رسمی و اداری).';
  } else if (tone === 'colloquial') {
    toneInstruction = 'Conversational, colloquial, everyday street speech, modern youth idiom (محاوره‌ای، خودمانی و روان).';
  } else if (tone === 'technical') {
    toneInstruction = 'Technical, specialized terminology, accurate for software, engineering or science (تخصصی و علمی).';
  } else if (tone === 'literary') {
    toneInstruction = 'Literary, poetic, eloquent, and sophisticated (ادبی و فاخر).';
  }

  const systemPrompt = `You are "Aphra", an elite agentic translation system specializing in English <-> Persian (Farsi) nuances.
Your philosophy is to NEVER produce robotic word-for-word machine translations. Instead, follow Aphra's 5-step agentic process:
1. ANALYZE: Spot cultural metaphors, idioms, slang, phrasal verbs, technical jargon, and sarcasm.
2. CONTEXT: Understand the deepest semantic intent in the source language.
3. TRANSLATE: Formulate a culturally resonant equivalent in ${tgt}.
4. CRITIQUE: Self-critique the draft for awkward phrasing, unnatural syntax, or lost humor/tone.
5. REFINE: Polish into the final masterpiece.

Target Tone: ${toneInstruction}

IMPORTANT: You MUST respond ONLY with a valid, clean JSON object matching this exact schema:
{
  "translation": "The final natural and fluent translation in ${tgt}",
  "detectedLang": "${isFa ? 'fa' : 'en'}",
  "targetLang": "${isFa ? 'en' : 'fa'}",
  "toneUsed": "${tone}",
  "breakdown": [
    {
      "term": "Source idiom or key vocabulary",
      "meaning": "Meaning in target language",
      "explanation": "Why this specific translation was chosen / cultural context"
    }
  ],
  "critiqueNotes": "Short 1-sentence note on how the translation was refined for maximum fluency."
}

Do not wrap in markdown quotes if possible, output pure JSON.`;

  const userPrompt = `Translate the following text from ${src} to ${tgt}:

"""
${text}
"""`;

  try {
    if (onProgress) onProgress({ status: 'analyzing', message: 'در حال تحلیل واژگان و اصطلاحات (Aphra Analyze)...' });

    const client = axios.create({
      baseURL: baseUrl.replace(/\/+$/, ''),
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/DavidLMS/aphra',
        'X-Title': 'Aphra Desktop Dynamic Island'
      },
      timeout: 30000
    });

    const payload = {
      model: model || 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    };

    const response = await client.post('/chat/completions', payload);

    if (onProgress) onProgress({ status: 'refining', message: 'در حال نگارش و ارزیابی نهایی (Critique & Refine)...' });

    let rawOutput = response.data?.choices?.[0]?.message?.content || '';

    // Clean potential markdown blocks
    rawOutput = rawOutput.trim();
    if (rawOutput.startsWith('```json')) {
      rawOutput = rawOutput.slice(7);
    } else if (rawOutput.startsWith('```')) {
      rawOutput = rawOutput.slice(3);
    }
    if (rawOutput.endsWith('```')) {
      rawOutput = rawOutput.slice(0, -3);
    }
    rawOutput = rawOutput.trim();

    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (parseErr) {
      // If LLM returned raw text instead of JSON
      parsed = {
        translation: rawOutput,
        detectedLang: isFa ? 'fa' : 'en',
        targetLang: isFa ? 'en' : 'fa',
        toneUsed: tone,
        breakdown: [],
        critiqueNotes: 'ترجمه انجام شد.'
      };
    }

    return {
      translation: parsed.translation || rawOutput,
      detectedLang: parsed.detectedLang || (isFa ? 'fa' : 'en'),
      targetLang: parsed.targetLang || (isFa ? 'en' : 'fa'),
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
      critiqueNotes: parsed.critiqueNotes || '',
      toneUsed: parsed.toneUsed || tone,
      engine: 'aphra'
    };
  } catch (error) {
    if (error.response) {
      const errData = error.response.data;
      const msg = errData?.error?.message || errData?.message || `API Error ${error.response.status}`;
      throw new Error(`Aphra API Error: ${msg}`);
    }
    throw error;
  }
}

module.exports = {
  translateWithAphra
};
