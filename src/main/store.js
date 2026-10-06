const fs = require('fs');
const path = require('path');
const os = require('os');

const configDir = path.join(os.homedir(), '.aphra-translate');
const configFile = path.join(configDir, 'config.json');
const historyFile = path.join(configDir, 'history.json');

const defaultSettings = {
  hotkey: 'Alt+D',
  defaultEngine: 'google', // 'google' | 'aphra'
  autoDetectLang: true,
  autoCopy: false,
  aphra: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat',
    tone: 'auto', // 'auto' | 'formal' | 'colloquial' | 'technical'
    showBreakdown: true
  },
  historyLimit: 100
};

function ensureDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

function loadSettings() {
  ensureDir();
  try {
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      return { ...defaultSettings, ...data, aphra: { ...defaultSettings.aphra, ...(data.aphra || {}) } };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return defaultSettings;
}

function saveSettings(settings) {
  ensureDir();
  try {
    fs.writeFileSync(configFile, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving settings:', e);
    return false;
  }
}

function loadHistory() {
  ensureDir();
  try {
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading history:', e);
  }
  return [];
}

function addHistoryItem(item) {
  ensureDir();
  try {
    const history = loadHistory();
    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ...item
    };
    // Prepend newest item, prevent duplicate consecutive queries
    if (history.length > 0 && history[0].query === newItem.query && history[0].engine === newItem.engine) {
      return history;
    }
    history.unshift(newItem);
    const settings = loadSettings();
    if (history.length > (settings.historyLimit || 100)) {
      history.length = settings.historyLimit;
    }
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
    return history;
  } catch (e) {
    console.error('Error saving history item:', e);
    return [];
  }
}

function clearHistory() {
  ensureDir();
  try {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function deleteHistoryItem(id) {
  ensureDir();
  try {
    let history = loadHistory();
    history = history.filter((h) => h.id !== id);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
    return history;
  } catch (e) {
    return [];
  }
}

module.exports = {
  loadSettings,
  saveSettings,
  loadHistory,
  addHistoryItem,
  clearHistory,
  deleteHistoryItem,
  defaultSettings
};
