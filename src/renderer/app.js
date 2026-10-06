const { ipcRenderer } = require('electron');

// DOM Elements
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const outputPlaceholder = document.getElementById('output-placeholder');
const btnClearInput = document.getElementById('btn-clear-input');
const btnEngineGoogle = document.getElementById('btn-engine-google');
const btnEngineAphra = document.getElementById('btn-engine-aphra');
const toneSelector = document.getElementById('tone-selector');
const selectTone = document.getElementById('select-tone');
const labelSourceLang = document.getElementById('label-source-lang');
const labelTargetLang = document.getElementById('label-target-lang');
const btnSwapLang = document.getElementById('btn-swap-lang');
const btnCopy = document.getElementById('btn-copy');
const copyLabel = document.getElementById('copy-label');
const copyIcon = document.getElementById('copy-icon');
const btnReplace = document.getElementById('btn-replace');
const btnSpeak = document.getElementById('btn-speak');
const btnClose = document.getElementById('btn-close');
const btnHistory = document.getElementById('btn-history');
const btnSettings = document.getElementById('btn-settings');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const fallbackNotice = document.getElementById('fallback-notice');
const btnGotoSettings = document.getElementById('btn-goto-settings');

// Aphra Breakdown elements
const aphraBreakdownContainer = document.getElementById('aphra-breakdown-container');
const btnToggleBreakdown = document.getElementById('btn-toggle-breakdown');
const breakdownList = document.getElementById('breakdown-list');
const breakdownArrow = document.getElementById('breakdown-arrow');

// Modals
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const btnClearHistory = document.getElementById('btn-clear-history');
const historyList = document.getElementById('history-list');
const historySearch = document.getElementById('history-search');
const toastEl = document.getElementById('toast');

// Settings Fields
const settingHotkey = document.getElementById('setting-hotkey');
const settingProviderPreset = document.getElementById('setting-provider-preset');
const settingBaseUrl = document.getElementById('setting-base-url');
const settingApiKey = document.getElementById('setting-api-key');
const settingModel = document.getElementById('setting-model');
const settingAutoCopy = document.getElementById('setting-auto-copy');
const btnToggleApiKeyVisibility = document.getElementById('btn-toggle-apikey-visibility');

// State
let currentSettings = {};
let currentEngine = 'google';
let currentTargetLang = 'auto';
let currentTranslation = '';
let debounceTimer = null;
let lastQueriedText = '';

// ========================================================
// INITIALIZATION
// ========================================================
async function init() {
  currentSettings = await ipcRenderer.invoke('get-settings');
  currentEngine = currentSettings.defaultEngine || 'google';
  updateEngineUI();

  // Populate settings form
  populateSettingsUI();

  // Focus input automatically
  inputText.focus();
}

function updateEngineUI() {
  if (currentEngine === 'aphra') {
    btnEngineAphra.classList.add('active');
    btnEngineGoogle.classList.remove('active');
    toneSelector.classList.remove('hidden');
  } else {
    btnEngineGoogle.classList.add('active');
    btnEngineAphra.classList.remove('active');
    toneSelector.classList.add('hidden');
    aphraBreakdownContainer.classList.add('hidden');
  }
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2200);
}

// ========================================================
// TRANSLATION TRIGGER & LOGIC
// ========================================================
async function triggerTranslation(text) {
  if (!text || !text.trim()) {
    outputText.textContent = '';
    outputPlaceholder.classList.remove('hidden');
    aphraBreakdownContainer.classList.add('hidden');
    fallbackNotice.classList.add('hidden');
    progressBar.classList.add('hidden');
    currentTranslation = '';
    return;
  }

  const query = text.trim();
  lastQueriedText = query;

  // Show loading state
  progressBar.classList.remove('hidden');
  progressText.textContent = currentEngine === 'aphra' ? 'در حال اجرای فرآیند ایجنتیک Aphra...' : 'در حال دریافت ترجمه...';
  outputPlaceholder.classList.add('hidden');
  fallbackNotice.classList.add('hidden');

  try {
    const res = await ipcRenderer.invoke('translate', {
      text: query,
      engine: currentEngine,
      targetLang: currentTargetLang,
      tone: selectTone.value
    });

    progressBar.classList.add('hidden');

    if (res.success && res.data) {
      const data = res.data;
      currentTranslation = data.translation || '';
      outputText.textContent = currentTranslation;

      // Adjust text direction
      const isPersian = /[؀-ۿ]/.test(currentTranslation);
      outputText.setAttribute('dir', isPersian ? 'rtl' : 'ltr');

      // Update language badges
      labelSourceLang.textContent = (data.detectedLang || 'EN').toUpperCase();
      labelTargetLang.textContent = (data.targetLang || 'FA').toUpperCase();

      // Show fallback warning if API key was missing
      if (res.warning === 'MISSING_API_KEY') {
        fallbackNotice.classList.remove('hidden');
      }

      // Render Aphra Breakdown if available
      if (data.breakdown && data.breakdown.length > 0) {
        renderBreakdown(data.breakdown, data.critiqueNotes);
        aphraBreakdownContainer.classList.remove('hidden');
      } else {
        aphraBreakdownContainer.classList.add('hidden');
      }

      // Auto-copy if configured
      if (currentSettings.autoCopy && currentTranslation) {
        navigator.clipboard.writeText(currentTranslation);
        showToast('کپی خودکار انجام شد!');
      }

      // Notify main process of height adjustment
      ipcRenderer.send('content-resized');
    } else {
      outputText.textContent = res.error || 'خطا در ارتباط با سرور ترجمه';
    }
  } catch (err) {
    progressBar.classList.add('hidden');
    outputText.textContent = 'خطا: ' + err.message;
  }
}

function renderBreakdown(breakdown, critiqueNotes) {
  breakdownList.innerHTML = '';

  breakdown.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'breakdown-item';
    el.innerHTML = `
      <div>
        <span class="breakdown-term">${escapeHtml(item.term)}:</span>
        <span class="breakdown-meaning">${escapeHtml(item.meaning)}</span>
      </div>
      ${item.explanation ? `<div class="breakdown-desc">${escapeHtml(item.explanation)}</div>` : ''}
    `;
    breakdownList.appendChild(el);
  });

  if (critiqueNotes) {
    const notesEl = document.createElement('div');
    notesEl.className = 'breakdown-item';
    notesEl.style.borderRightColor = '#58a6ff';
    notesEl.innerHTML = `
      <div style="color: #79c0ff; font-weight: 600;">نکته نگارش و لحن:</div>
      <div class="breakdown-desc">${escapeHtml(critiqueNotes)}</div>
    `;
    breakdownList.appendChild(notesEl);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ========================================================
// INPUT EVENTS
// ========================================================
inputText.addEventListener('input', () => {
  const val = inputText.value;
  btnClearInput.classList.toggle('hidden', !val);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    triggerTranslation(val);
  }, 350);
});

btnClearInput.addEventListener('click', () => {
  inputText.value = '';
  btnClearInput.classList.add('hidden');
  triggerTranslation('');
  inputText.focus();
});

// Switch Engine
btnEngineGoogle.addEventListener('click', () => {
  currentEngine = 'google';
  updateEngineUI();
  if (inputText.value.trim()) triggerTranslation(inputText.value);
});

btnEngineAphra.addEventListener('click', () => {
  currentEngine = 'aphra';
  updateEngineUI();
  if (inputText.value.trim()) triggerTranslation(inputText.value);
});

selectTone.addEventListener('change', () => {
  if (inputText.value.trim()) triggerTranslation(inputText.value);
});

// Swap Language
btnSwapLang.addEventListener('click', () => {
  if (currentTargetLang === 'fa') currentTargetLang = 'en';
  else if (currentTargetLang === 'en') currentTargetLang = 'fa';
  else currentTargetLang = 'en'; // default flip

  const temp = labelSourceLang.textContent;
  labelSourceLang.textContent = labelTargetLang.textContent;
  labelTargetLang.textContent = temp;

  if (inputText.value.trim()) triggerTranslation(inputText.value);
});

// Toggle Breakdown accordion
btnToggleBreakdown.addEventListener('click', () => {
  breakdownList.classList.toggle('hidden');
  breakdownArrow.classList.toggle('collapsed');
  ipcRenderer.send('content-resized');
});

// ========================================================
// ACTION BUTTONS (COPY, REPLACE, TTS)
// ========================================================
btnCopy.addEventListener('click', handleCopy);

function handleCopy() {
  if (!currentTranslation) return;
  navigator.clipboard.writeText(currentTranslation);
  copyLabel.textContent = 'کپی شد!';
  copyIcon.style.color = '#3fb950';
  showToast('متن کپی شد');
  setTimeout(() => {
    copyLabel.textContent = 'کپی';
    copyIcon.style.color = '';
    ipcRenderer.send('hide-window');
  }, 400);
}

btnReplace.addEventListener('click', handleReplace);

async function handleReplace() {
  if (!currentTranslation) return;
  showToast('در حال جایگزینی در برنامه...');
  await ipcRenderer.invoke('replace-text', currentTranslation);
}

btnSpeak.addEventListener('click', () => {
  if (!currentTranslation) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentTranslation);
    // Detect lang for voice
    const isFa = /[؀-ۿ]/.test(currentTranslation);
    utterance.lang = isFa ? 'fa-IR' : 'en-US';
    window.speechSynthesis.speak(utterance);
    showToast('در حال پخش صدا...');
  } catch (e) {
    showToast('خطا در پخش صوتی');
  }
});

btnClose.addEventListener('click', () => {
  ipcRenderer.send('hide-window');
});

// ========================================================
// KEYBOARD SHORTCUTS IN WINDOW
// ========================================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (!settingsModal.classList.contains('hidden')) {
      settingsModal.classList.add('hidden');
    } else if (!historyModal.classList.contains('hidden')) {
      historyModal.classList.add('hidden');
    } else {
      ipcRenderer.send('hide-window');
    }
  } else if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    handleReplace();
  } else if (e.key === 'Enter' && !e.shiftKey && document.activeElement !== inputText) {
    e.preventDefault();
    handleCopy();
  } else if (e.key === 'Tab' && e.ctrlKey) {
    e.preventDefault();
    currentEngine = currentEngine === 'google' ? 'aphra' : 'google';
    updateEngineUI();
    if (inputText.value.trim()) triggerTranslation(inputText.value);
  }
});

// ========================================================
// IPC EVENTS FROM MAIN PROCESS
// ========================================================
ipcRenderer.on('captured-text', (event, captured) => {
  if (captured && captured.trim()) {
    inputText.value = captured.trim();
    btnClearInput.classList.remove('hidden');
    triggerTranslation(captured.trim());
  } else {
    // If no text was captured, clear and focus for typing
    inputText.focus();
    inputText.select();
  }
});

// ========================================================
// SETTINGS MODAL
// ========================================================
btnSettings.addEventListener('click', () => {
  populateSettingsUI();
  settingsModal.classList.remove('hidden');
});

btnGotoSettings.addEventListener('click', () => {
  populateSettingsUI();
  settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

function populateSettingsUI() {
  settingHotkey.value = currentSettings.hotkey || 'Alt+D';
  const engineRadios = document.getElementsByName('setting-engine');
  engineRadios.forEach((r) => {
    r.checked = r.value === (currentSettings.defaultEngine || 'google');
  });

  const aphra = currentSettings.aphra || {};
  settingBaseUrl.value = aphra.baseUrl || 'https://openrouter.ai/api/v1';
  settingApiKey.value = aphra.apiKey || '';
  settingModel.value = aphra.model || 'deepseek/deepseek-chat';
  settingAutoCopy.checked = !!currentSettings.autoCopy;
}

// Preset Provider changer
settingProviderPreset.addEventListener('change', () => {
  const val = settingProviderPreset.value;
  if (val === 'openrouter') {
    settingBaseUrl.value = 'https://openrouter.ai/api/v1';
    settingModel.value = 'deepseek/deepseek-chat';
  } else if (val === 'deepseek') {
    settingBaseUrl.value = 'https://api.deepseek.com/v1';
    settingModel.value = 'deepseek-chat';
  } else if (val === 'groq') {
    settingBaseUrl.value = 'https://api.groq.com/openai/v1';
    settingModel.value = 'llama-3.3-70b-versatile';
  } else if (val === 'openai') {
    settingBaseUrl.value = 'https://api.openai.com/v1';
    settingModel.value = 'gpt-4o-mini';
  } else if (val === 'ollama') {
    settingBaseUrl.value = 'http://localhost:11434/v1';
    settingModel.value = 'qwen2.5:7b';
  }
});

btnToggleApiKeyVisibility.addEventListener('click', () => {
  if (settingApiKey.type === 'password') {
    settingApiKey.type = 'text';
    btnToggleApiKeyVisibility.textContent = '🔒';
  } else {
    settingApiKey.type = 'password';
    btnToggleApiKeyVisibility.textContent = '👁️';
  }
});

btnSaveSettings.addEventListener('click', async () => {
  let selectedEngine = 'google';
  document.getElementsByName('setting-engine').forEach((r) => {
    if (r.checked) selectedEngine = r.value;
  });

  const newSettings = {
    ...currentSettings,
    hotkey: settingHotkey.value.trim() || 'Alt+D',
    defaultEngine: selectedEngine,
    autoCopy: settingAutoCopy.checked,
    aphra: {
      ...currentSettings.aphra,
      baseUrl: settingBaseUrl.value.trim(),
      apiKey: settingApiKey.value.trim(),
      model: settingModel.value.trim()
    }
  };

  const saved = await ipcRenderer.invoke('save-settings', newSettings);
  if (saved) {
    currentSettings = newSettings;
    currentEngine = selectedEngine;
    updateEngineUI();
    settingsModal.classList.add('hidden');
    showToast('تنظیمات با موفقیت ذخیره شد');
  } else {
    showToast('خطا در ذخیره تنظیمات');
  }
});

// ========================================================
// HISTORY MODAL
// ========================================================
btnHistory.addEventListener('click', async () => {
  await loadAndRenderHistory();
  historyModal.classList.remove('hidden');
});

btnCloseHistory.addEventListener('click', () => {
  historyModal.classList.add('hidden');
});

btnClearHistory.addEventListener('click', async () => {
  if (confirm('آیا از پاک کردن کل تاریخچه اطمینان دارید؟')) {
    await ipcRenderer.invoke('clear-history');
    await loadAndRenderHistory();
    showToast('تاریخچه پاکسازی شد');
  }
});

historySearch.addEventListener('input', () => {
  loadAndRenderHistory(historySearch.value);
});

async function loadAndRenderHistory(filter = '') {
  const history = await ipcRenderer.invoke('get-history');
  historyList.innerHTML = '';

  const filtered = filter
    ? history.filter((h) => h.query.toLowerCase().includes(filter.toLowerCase()) || h.translation.toLowerCase().includes(filter.toLowerCase()))
    : history;

  if (filtered.length === 0) {
    historyList.innerHTML = '<div style="color: #6e7681; text-align: center; padding: 20px;">موردی یافت نشد.</div>';
    return;
  }

  filtered.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-query">${escapeHtml(item.query)}</div>
      <div class="history-translation">${escapeHtml(item.translation)}</div>
    `;
    el.addEventListener('click', () => {
      inputText.value = item.query;
      outputText.textContent = item.translation;
      currentTranslation = item.translation;
      historyModal.classList.add('hidden');
      triggerTranslation(item.query);
    });
    historyList.appendChild(el);
  });
}

// Start
init();
