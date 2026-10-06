const fs = require('fs');
const path = require('path');
const os = require('os');

let safeStorage = null;
try {
  // `require('electron')` only yields the API inside the Electron main process.
  const electron = require('electron');
  safeStorage = electron && electron.safeStorage ? electron.safeStorage : null;
} catch (_) {
  safeStorage = null;
}

const configDir = path.join(os.homedir(), '.aphra-translate');
const configFile = path.join(configDir, 'config.json');
const historyFile = path.join(configDir, 'history.json');

const defaultSettings = {
  theme: 'dark', // 'dark' | 'light' | 'system'
  appLanguage: 'fa', // 'fa' | 'en'
  hotkey: 'Alt+D',
  inlineHotkey: 'Alt+Shift+D', // In-place translate shortcut anywhere (Telegram, Notepad, etc.)
  showFloatingBubble: true, // Floating quick-translate button near mouse cursor
  defaultEngine: 'google', // 'google' | 'aphra'
  autoCopy: false,
  restoreClipboard: true, // give the user's previous clipboard back after capture / replace
  hideOnBlur: false, // hide the island when it loses focus (Spotlight style)
  launchAtStartup: false,
  saveHistory: true,
  historyLimit: 100,
  nativeLang: 'fa', // "auto" target: native text -> second language, everything else -> native
  secondLang: 'en',
  aphra: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat',
    tone: 'auto', // 'auto' | 'formal' | 'colloquial' | 'technical' | 'literary'
    showBreakdown: true
  }
};

const ENGINES = new Set(['google', 'aphra']);
const TONE_IDS = new Set(['auto', 'formal', 'colloquial', 'technical', 'literary']);
const THEMES = new Set(['dark', 'light', 'system']);
const APP_LANGS = new Set(['fa', 'en']);

let settingsCache = null;
let historyCache = null;

function ensureDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/** Write via temp file + rename so a crash can never leave a half written JSON file behind. */
function writeJsonAtomic(file, data) {
  ensureDir();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Could not parse ${file}:`, e.message);
    try {
      fs.renameSync(file, `${file}.corrupt`);
    } catch (_) {
      /* ignore */
    }
    return fallback;
  }
}

// ---------------------------------------------------------------- API key protection
function encryptSecret(plain) {
  if (!plain) return '';
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    return `enc:${safeStorage.encryptString(plain).toString('base64')}`;
  }
  return plain;
}

function decryptSecret(stored) {
  if (!stored) return '';
  if (stored.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    } catch (e) {
      console.error('Could not decrypt API key:', e.message);
      return '';
    }
  }
  return stored; // legacy plaintext, re-encrypted on the next save
}

// ---------------------------------------------------------------- settings
function pickString(v, fallback, max = 300) {
  return typeof v === 'string' ? v.trim().slice(0, max) : fallback;
}

function pickBool(v, fallback) {
  return typeof v === 'boolean' ? v : fallback;
}

/** Merge `incoming` into `base`, accepting only known keys of the right type. */
function mergeSettings(base, incoming = {}) {
  const a = incoming.aphra || {};
  const limit = Number(incoming.historyLimit);
  return {
    theme: THEMES.has(incoming.theme) ? incoming.theme : (base.theme || 'dark'),
    appLanguage: APP_LANGS.has(incoming.appLanguage) ? incoming.appLanguage : (base.appLanguage || 'fa'),
    hotkey: pickString(incoming.hotkey, base.hotkey, 60) || base.hotkey,
    inlineHotkey: pickString(incoming.inlineHotkey, base.inlineHotkey || 'Alt+Shift+D', 60) || (base.inlineHotkey || 'Alt+Shift+D'),
    showFloatingBubble: pickBool(incoming.showFloatingBubble, base.showFloatingBubble !== false),
    defaultEngine: ENGINES.has(incoming.defaultEngine) ? incoming.defaultEngine : base.defaultEngine,
    autoCopy: pickBool(incoming.autoCopy, base.autoCopy),
    restoreClipboard: pickBool(incoming.restoreClipboard, base.restoreClipboard),
    hideOnBlur: pickBool(incoming.hideOnBlur, base.hideOnBlur),
    launchAtStartup: pickBool(incoming.launchAtStartup, base.launchAtStartup),
    saveHistory: pickBool(incoming.saveHistory, base.saveHistory),
    historyLimit: Number.isFinite(limit) && limit >= 10 && limit <= 1000 ? Math.round(limit) : base.historyLimit,
    nativeLang: pickString(incoming.nativeLang, base.nativeLang, 12) || base.nativeLang,
    secondLang: pickString(incoming.secondLang, base.secondLang, 12) || base.secondLang,
    aphra: {
      // Empty / missing key means "keep the stored one" (the renderer never receives the real key).
      apiKey: typeof a.apiKey === 'string' && a.apiKey.trim() ? a.apiKey.trim() : base.aphra.apiKey,
      baseUrl: pickString(a.baseUrl, base.aphra.baseUrl, 300) || defaultSettings.aphra.baseUrl,
      model: pickString(a.model, base.aphra.model, 200) || defaultSettings.aphra.model,
      tone: TONE_IDS.has(a.tone) ? a.tone : base.aphra.tone,
      showBreakdown: pickBool(a.showBreakdown, base.aphra.showBreakdown)
    }
  };
}

function loadSettings() {
  if (settingsCache) return settingsCache;

  const data = readJson(configFile, {});
  const aphra = data.aphra || {};
  const stored = {
    ...data,
    aphra: { ...aphra, apiKey: decryptSecret(aphra.apiKeyEnc || aphra.apiKey || '') }
  };

  settingsCache = mergeSettings(defaultSettings, stored);
  // mergeSettings keeps `base` for a blank key; make sure a stored key survives a fresh load.
  settingsCache.aphra.apiKey = stored.aphra.apiKey || '';

  // One-off migration of a legacy plaintext key to encrypted storage.
  if (aphra.apiKey && !aphra.apiKeyEnc && safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      persistSettings(settingsCache);
    } catch (_) {
      /* non fatal */
    }
  }
  return settingsCache;
}

function persistSettings(settings) {
  const { apiKey, ...rest } = settings.aphra;
  const payload = { ...settings, aphra: { ...rest } };
  const enc = encryptSecret(apiKey);
  if (enc.startsWith('enc:')) payload.aphra.apiKeyEnc = enc;
  else payload.aphra.apiKey = apiKey; // encryption unavailable -> plain fallback
  writeJsonAtomic(configFile, payload);
}

/**
 * Persist a (partial) settings object. Returns the merged settings or null on failure.
 * `options.clearApiKey` removes the stored key.
 */
function saveSettings(incoming, options = {}) {
  try {
    const current = loadSettings();
    const merged = mergeSettings(current, incoming);
    if (options.clearApiKey) merged.aphra.apiKey = '';
    persistSettings(merged);
    settingsCache = merged;
    return merged;
  } catch (e) {
    console.error('Error saving settings:', e);
    return null;
  }
}

/** Settings as seen by the renderer: the API key itself never leaves the main process. */
function publicSettings(settings = loadSettings()) {
  const { apiKey, ...aphra } = settings.aphra;
  return { ...settings, aphra: { ...aphra, apiKey: '', hasApiKey: !!apiKey } };
}

// ---------------------------------------------------------------- history
function loadHistory() {
  if (!historyCache) {
    const data = readJson(historyFile, []);
    historyCache = Array.isArray(data) ? data : [];
  }
  return historyCache;
}

function saveHistory() {
  try {
    writeJsonAtomic(historyFile, historyCache || []);
    return true;
  } catch (e) {
    console.error('Error saving history:', e);
    return false;
  }
}

function addHistoryItem(item) {
  const settings = loadSettings();
  if (!settings.saveHistory) return loadHistory();

  const history = loadHistory();
  const next = history[0];
  // Collapse identical consecutive lookups, but keep the newest (e.g. a tone change) fresh.
  if (next && next.query === item.query && next.engine === item.engine && next.targetLang === item.targetLang) {
    Object.assign(next, item, { timestamp: new Date().toISOString() });
  } else {
    history.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      ...item
    });
  }
  if (history.length > settings.historyLimit) history.length = settings.historyLimit;
  saveHistory();
  return history;
}

function clearHistory() {
  historyCache = [];
  return saveHistory();
}

function deleteHistoryItem(id) {
  historyCache = loadHistory().filter((h) => h.id !== id);
  saveHistory();
  return historyCache;
}

function toggleFavoriteItem(id) {
  const history = loadHistory();
  const item = history.find((h) => h.id === id);
  if (item) {
    item.favorite = !item.favorite;
    saveHistory();
  }
  return history;
}

module.exports = {
  loadSettings,
  saveSettings,
  publicSettings,
  loadHistory,
  addHistoryItem,
  clearHistory,
  deleteHistoryItem,
  toggleFavoriteItem,
  defaultSettings,
  mergeSettings
};
