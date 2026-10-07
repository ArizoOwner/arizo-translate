/* Settings and history panels. Uses window.App from app.js. */
(function () {
  const { api, state, el, show, showToast, openModal, closeModal, setInput, translate, langLabel } = window.App;
  const $ = (id) => document.getElementById(id);

  const PROVIDERS = {
    openrouter: { url: 'https://openrouter.ai/api/v1', model: 'deepseek/deepseek-chat', models: ['deepseek/deepseek-chat', 'openai/gpt-4o-mini', 'google/gemini-3.8-flash', 'meta-llama/llama-3.3-70b-instruct'] },
    gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash', models: ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-3.5-flash', 'gemini-3-flash'] },
    deepseek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat', models: ['deepseek-chat'] },
    groq: { url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
    openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'] },
    ollama: { url: 'http://localhost:11434/v1', model: 'qwen2.5:7b', models: ['qwen2.5:7b', 'llama3.1:8b', 'gemma2:9b'] }
  };

  const f = {
    theme: $('setting-theme'), appLang: $('setting-app-lang'),
    hotkey: $('setting-hotkey'), inlineHotkey: $('setting-inline-hotkey'),
    showFloatingBubble: $('setting-show-floating-bubble'),
    native: $('setting-native-lang'), second: $('setting-second-lang'),
    preset: $('setting-provider-preset'), baseUrl: $('setting-base-url'), apiKey: $('setting-api-key'),
    keyHint: $('api-key-hint'), eye: $('btn-toggle-apikey-visibility'),
    modelSelect: $('setting-model-select'), customModelBox: $('custom-model-container'),
    model: $('setting-model'),
    models: $('model-suggestions'), btnFetchModels: $('btn-fetch-models'), test: $('btn-test-aphra'), testResult: $('test-result'),
    clearKey: $('btn-clear-apikey'), breakdown: $('setting-show-breakdown'), autoCopy: $('setting-auto-copy'),
    restore: $('setting-restore-clipboard'), hideBlur: $('setting-hide-on-blur'),
    startup: $('setting-launch-startup'), saveHistory: $('setting-save-history'), save: $('btn-save-settings')
  };
  const TEST_HINT = 'با تنظیمات فعلی یک درخواست آزمایشی ارسال می‌شود';
  let clearKeyRequested = false;

  // ------------------------------------------------------------------ settings
  window.HotkeyField.attach(f.hotkey, { onInvalid: (m) => showToast(m) });
  if (f.inlineHotkey) window.HotkeyField.attach(f.inlineHotkey, { onInvalid: (m) => showToast(m) });

  function fillLangSelect(select, value) {
    if (!select.children.length) {
      state.languages.forEach((l) => {
        const o = document.createElement('option');
        o.value = l.code;
        o.textContent = `${l.native} (${langLabel(l.code)})`;
        select.appendChild(o);
      });
    }
    select.value = value;
  }

  function setSuggestions(models, currentVal) {
    if (f.models) f.models.textContent = '';
    if (f.modelSelect) f.modelSelect.textContent = '';

    const list = Array.isArray(models) ? models : [];
    const target = (currentVal !== undefined ? currentVal : (f.model ? f.model.value : '')).trim();
    let matched = false;

    list.forEach((m) => {
      const id = typeof m === 'string' ? m : (m && m.id ? m.id : '');
      if (!id) return;
      const label = typeof m === 'string'
        ? m
        : (m.displayName && m.displayName !== m.id ? `${m.displayName} (${m.id})` : m.id);

      if (f.models) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = label;
        f.models.appendChild(o);
      }

      if (f.modelSelect) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = label;
        if (id === target) {
          opt.selected = true;
          matched = true;
        }
        f.modelSelect.appendChild(opt);
      }
    });

    if (f.modelSelect) {
      if (target && !matched) {
        const customOpt = document.createElement('option');
        customOpt.value = target;
        customOpt.textContent = `${target} (فعلی)`;
        customOpt.selected = true;
        f.modelSelect.insertBefore(customOpt, f.modelSelect.firstChild);
        matched = true;
      }

      const manualOpt = document.createElement('option');
      manualOpt.value = '__custom__';
      manualOpt.textContent = '✏️ ورود دستی نام مدل (Custom)...';
      f.modelSelect.appendChild(manualOpt);

      if (!matched && list.length > 0) {
        f.modelSelect.selectedIndex = 0;
        if (f.model) f.model.value = f.modelSelect.value;
      } else if (matched && f.modelSelect.value && f.model) {
        f.model.value = f.modelSelect.value;
      }
    }
  }

  if (f.modelSelect) {
    f.modelSelect.addEventListener('change', () => {
      if (f.modelSelect.value === '__custom__') {
        if (f.customModelBox) f.customModelBox.classList.remove('hidden');
        if (f.model) f.model.focus();
      } else {
        if (f.customModelBox) f.customModelBox.classList.add('hidden');
        if (f.model) f.model.value = f.modelSelect.value;
      }
    });
  }

  if (f.model) {
    f.model.addEventListener('input', () => {
      if (f.modelSelect && f.modelSelect.value !== '__custom__') {
        const match = [...f.modelSelect.options].find((o) => o.value === f.model.value.trim());
        if (match) {
          f.modelSelect.value = match.value;
        }
      }
    });
  }

  async function fetchAndPopulateModels(silent = false) {
    let baseUrl = f.baseUrl.value.trim();
    const apiKey = f.apiKey.value.trim();
    if (/generativelanguage\.googleapis\.com/i.test(baseUrl)) {
      baseUrl = PROVIDERS.gemini.url;
    }
    if (!f.btnFetchModels) return;
    const originalText = f.btnFetchModels.textContent;
    f.btnFetchModels.disabled = true;
    f.btnFetchModels.textContent = window.I18n ? window.I18n.t('settingFetchingModels') : 'در حال دریافت…';

    try {
      const res = await api.fetchModels({ baseUrl, apiKey });
      if (res.ok && Array.isArray(res.models) && res.models.length > 0) {
        setSuggestions(res.models, f.model ? f.model.value : '');
        if ((!f.model || !f.model.value.trim()) && res.models[0]?.id) {
          if (f.model) f.model.value = res.models[0].id;
          if (f.modelSelect) f.modelSelect.value = res.models[0].id;
        }
        if (f.customModelBox) f.customModelBox.classList.add('hidden');
        const countMsg = `${res.models.length} ${window.I18n ? window.I18n.t('settingModelsLoadedSuccess') : 'مدل از API بارگذاری شد'}`;
        if (!silent) {
          showToast(`✓ ${countMsg}`);
          f.testResult.className = 'test-result ok';
          f.testResult.textContent = `✓ ${countMsg}: ${res.models.slice(0, 3).map((m) => m.id).join(', ')}`;
        }
      } else {
        const err = res.error || (window.I18n ? window.I18n.t('settingModelsLoadError') : 'خطا در دریافت مدل‌ها');
        if (!silent) {
          showToast(err);
          f.testResult.className = 'test-result bad';
          f.testResult.textContent = `✗ ${err}`;
        }
      }
    } catch (err) {
      if (!silent) {
        showToast(err.message || 'خطا در برقراری ارتباط');
        f.testResult.className = 'test-result bad';
        f.testResult.textContent = `✗ ${err.message}`;
      }
    } finally {
      f.btnFetchModels.disabled = false;
      f.btnFetchModels.textContent = originalText;
    }
  }

  function detectPreset(url) {
    const clean = (url || '').replace(/\/+$/, '');
    if (/generativelanguage\.googleapis\.com/i.test(clean)) return 'gemini';
    const hit = Object.keys(PROVIDERS).find((k) => PROVIDERS[k].url === clean);
    return hit || 'custom';
  }

  function populateSettings() {
    const s = state.settings;
    const a = s.aphra || {};
    if (f.theme) f.theme.value = s.theme || 'dark';
    if (f.appLang) f.appLang.value = s.appLanguage || 'fa';
    f.hotkey.value = s.hotkey || 'Alt+D';
    if (f.inlineHotkey) f.inlineHotkey.value = s.inlineHotkey || 'Alt+Shift+D';
    if (f.showFloatingBubble) f.showFloatingBubble.checked = s.showFloatingBubble !== false;
    fillLangSelect(f.native, s.nativeLang || 'fa');
    fillLangSelect(f.second, s.secondLang || 'en');
    document.getElementsByName('setting-engine').forEach((r) => {
      r.checked = r.value === (s.defaultEngine || 'google');
    });

    let initialBase = a.baseUrl || PROVIDERS.openrouter.url;
    let initialModel = a.model || PROVIDERS.openrouter.model;
    if (/generativelanguage\.googleapis\.com/i.test(initialBase)) {
      initialBase = PROVIDERS.gemini.url;
      if (!initialModel || initialModel === 'gemini') {
        initialModel = 'gemini-3.8-flash';
      }
    }

    f.baseUrl.value = initialBase;
    f.model.value = initialModel;
    f.preset.value = detectPreset(f.baseUrl.value);
    setSuggestions((PROVIDERS[f.preset.value] || { models: [] }).models, initialModel);
    if (f.customModelBox) {
      if (f.modelSelect && f.modelSelect.value === '__custom__') {
        f.customModelBox.classList.remove('hidden');
      } else {
        f.customModelBox.classList.add('hidden');
      }
    }

    clearKeyRequested = false;
    f.apiKey.value = '';
    f.apiKey.type = 'password';
    f.eye.textContent = '👁️';
    const savedLabel = window.I18n ? window.I18n.t('savedApiKey') : 'ذخیره شده';
    f.apiKey.placeholder = a.hasApiKey ? `•••••••• (${savedLabel})` : 'sk-...';
    f.keyHint.textContent = a.hasApiKey
      ? (window.I18n ? window.I18n.t('settingApiKeyStored') : 'کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید')
      : (window.I18n ? window.I18n.t('settingApiKeyHint') : 'کلید به‌صورت رمزنگاری‌شده با Windows ذخیره می‌شود');
    show(f.clearKey, !!a.hasApiKey);

    f.breakdown.checked = a.showBreakdown !== false;
    f.autoCopy.checked = !!s.autoCopy;
    f.restore.checked = s.restoreClipboard !== false;
    f.hideBlur.checked = !!s.hideOnBlur;
    f.startup.checked = !!s.launchAtStartup;
    f.saveHistory.checked = s.saveHistory !== false;
    f.testResult.textContent = window.I18n ? window.I18n.t('settingTestDesc') : TEST_HINT;
    f.testResult.className = 'test-result';
  }

  document.addEventListener('app:language-changed', () => {
    if (f.keyHint) {
      const a = state.settings?.aphra || {};
      f.keyHint.textContent = a.hasApiKey
        ? (window.I18n ? window.I18n.t('settingApiKeyStored') : 'کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید')
        : (window.I18n ? window.I18n.t('settingApiKeyHint') : 'کلید به‌صورت رمزنگاری‌شده با Windows ذخیره می‌شود');
      if (a.hasApiKey && f.apiKey.placeholder && f.apiKey.placeholder.includes('•')) {
        const savedLabel = window.I18n ? window.I18n.t('savedApiKey') : 'ذخیره شده';
        f.apiKey.placeholder = `•••••••• (${savedLabel})`;
      }
    }
    if (f.testResult && f.testResult.className === 'test-result') {
      f.testResult.textContent = window.I18n ? window.I18n.t('settingTestDesc') : TEST_HINT;
    }
  });

  function openSettings() {
    populateSettings();
    openModal(el.settingsModal);
  }

  $('btn-settings').addEventListener('click', openSettings);
  el.gotoSettings.addEventListener('click', openSettings);
  $('btn-close-settings').addEventListener('click', () => closeModal(el.settingsModal));

  if (f.theme) {
    f.theme.addEventListener('change', () => {
      if (window.I18n) window.I18n.applyTheme(f.theme.value);
    });
  }
  if (f.appLang) {
    f.appLang.addEventListener('change', () => {
      if (window.I18n) window.I18n.applyLanguage(f.appLang.value);
    });
  }

  f.preset.addEventListener('change', () => {
    const p = PROVIDERS[f.preset.value];
    if (!p) return;
    f.baseUrl.value = p.url;
    f.model.value = p.model;
    setSuggestions(p.models, p.model);
    if (f.customModelBox) f.customModelBox.classList.add('hidden');
  });
  f.baseUrl.addEventListener('input', () => {
    f.preset.value = detectPreset(f.baseUrl.value);
  });

  f.eye.addEventListener('click', () => {
    const hidden = f.apiKey.type === 'password';
    f.apiKey.type = hidden ? 'text' : 'password';
    f.eye.textContent = hidden ? '🔒' : '👁️';
  });

  f.clearKey.addEventListener('click', () => {
    clearKeyRequested = true;
    f.apiKey.value = '';
    f.apiKey.placeholder = 'sk-...';
    f.keyHint.textContent = 'کلید پس از ذخیره تنظیمات حذف می‌شود';
    show(f.clearKey, false);
  });

  f.test.addEventListener('click', async () => {
    f.test.disabled = true;
    f.testResult.className = 'test-result';
    f.testResult.textContent = window.I18n ? window.I18n.t('settingTesting') : 'در حال آزمایش…';

    let testBase = f.baseUrl.value.trim();
    let testModel = (f.modelSelect && f.modelSelect.value !== '__custom__'
      ? f.modelSelect.value
      : f.model.value).trim();
    if (/generativelanguage\.googleapis\.com/i.test(testBase)) {
      testBase = PROVIDERS.gemini.url;
      f.baseUrl.value = testBase;
      if (/gemini-(?:1\.[0-9]+|2\.[0-9]+)-(?:pro|flash)/i.test(testModel) || /gemini-1\.[0-9]+/i.test(testModel) || /gemini-2\.[0-9]+/i.test(testModel) || !testModel || testModel === 'gemini') {
        testModel = 'gemini-3.8-flash';
        f.model.value = testModel;
        if (f.modelSelect) f.modelSelect.value = testModel;
      }
    }

    const r = await api.testAphra({ baseUrl: testBase, model: testModel, apiKey: f.apiKey.value.trim() });
    f.test.disabled = false;
    f.testResult.className = `test-result ${r.ok ? 'ok' : 'bad'}`;
    const okPrefix = window.I18n ? window.I18n.t('settingTestSuccess') : '✓ اتصال موفق';
    f.testResult.textContent = r.ok ? `${okPrefix} (${r.ms}ms) – ${r.model}` : `✗ ${r.error}`;
    if (r.ok) {
      fetchAndPopulateModels(true);
    }
  });

  if (f.btnFetchModels) {
    f.btnFetchModels.addEventListener('click', () => fetchAndPopulateModels(false));
  }

  f.save.addEventListener('click', async () => {
    const engine = [...document.getElementsByName('setting-engine')].find((r) => r.checked);
    let aphraBase = f.baseUrl.value.trim();
    let aphraModel = (f.modelSelect && f.modelSelect.value !== '__custom__'
      ? f.modelSelect.value
      : f.model.value).trim();
    if (/generativelanguage\.googleapis\.com/i.test(aphraBase)) {
      aphraBase = PROVIDERS.gemini.url;
      if (!aphraModel || aphraModel === 'gemini') {
        aphraModel = 'gemini-3.8-flash';
      }
    }

    const settings = {
      theme: f.theme ? f.theme.value : 'dark',
      appLanguage: f.appLang ? f.appLang.value : 'fa',
      hotkey: f.hotkey.value.trim(),
      inlineHotkey: f.inlineHotkey ? f.inlineHotkey.value.trim() : 'Alt+Shift+D',
      showFloatingBubble: f.showFloatingBubble ? f.showFloatingBubble.checked : true,
      defaultEngine: engine ? engine.value : 'google',
      nativeLang: f.native.value,
      secondLang: f.second.value,
      autoCopy: f.autoCopy.checked,
      restoreClipboard: f.restore.checked,
      hideOnBlur: f.hideBlur.checked,
      launchAtStartup: f.startup.checked,
      saveHistory: f.saveHistory.checked,
      aphra: {
        baseUrl: aphraBase,
        model: aphraModel,
        apiKey: f.apiKey.value.trim(),
        showBreakdown: f.breakdown.checked
      }
    };

    const res = await api.saveSettings(settings, { clearApiKey: clearKeyRequested });
    if (!res || !res.ok) return showToast('خطا در ذخیره تنظیمات');

    state.settings = res.settings;
    state.engine = res.settings.defaultEngine;
    if (window.I18n) {
      window.I18n.applyTheme(res.settings.theme || 'dark');
      window.I18n.applyLanguage(res.settings.appLanguage || 'fa');
    }
    window.App.updateEngineUI();
    window.App.refreshCompactPreview();
    closeModal(el.settingsModal);
    if (!res.hotkeyOk && !res.inlineHotkeyOk) {
      showToast('کلیدهای میانبر در دسترس نبودند؛ کلیدهای قبلی حفظ شدند', 4500);
    } else if (!res.hotkeyOk) {
      showToast('کلید میانبر جزیره در دسترس نبود؛ کلید قبلی حفظ شد', 4500);
    } else if (!res.inlineHotkeyOk) {
      showToast('کلید میانبر درجا در دسترس نبود؛ کلید قبلی حفظ شد', 4500);
    } else {
      showToast('تنظیمات با موفقیت ذخیره شد', 2200);
    }
  });

  // ------------------------------------------------------------------ history
  const histEl = {
    list: $('history-list'),
    search: $('history-search'),
    clear: $('btn-clear-history'),
    tabAll: $('tab-history-all'),
    tabStarred: $('tab-history-starred')
  };
  let clearArmed = null;
  let searchTimer = null;
  let historyFilter = 'all';

  function timeAgo(iso) {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
    const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, secs] of units) {
      if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
    }
    return 'همین الان';
  }

  function iconButton(label, glyph, onClick, extra = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `history-icon-btn ${extra}`.trim();
    b.title = label;
    b.setAttribute('aria-label', label);
    b.textContent = glyph;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(b);
    });
    return b;
  }

  function restoreItem(item) {
    setInput(item.query);
    window.App.setOutputText(item.translation);
    el.srcLabel.textContent = langLabel(item.detectedLang);
    state.resultTarget = item.targetLang || state.resultTarget;
    state.resultSource = item.detectedLang || state.resultSource;
    window.App.updateAutoLabel('');
    window.App.show(el.chips, false);
    closeModal(el.historyModal);
    window.App.refreshCompactPreview();
  }

  async function renderHistory() {
    const q = histEl.search.value.trim().toLowerCase();
    const all = await api.getHistory();
    let items = all;
    if (historyFilter === 'starred') {
      items = items.filter((h) => !!h.favorite);
    }
    if (q) {
      items = items.filter((h) => h.query.toLowerCase().includes(q) || h.translation.toLowerCase().includes(q));
    }
    histEl.list.textContent = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = historyFilter === 'starred'
        ? (q ? 'موردی در نشان‌شده‌ها یافت نشد.' : 'هنوز موردی نشان نشده است (با علامت ستاره روی هر کارت می‌توانید آن را نشان کنید).')
        : (q ? 'موردی یافت نشد.' : 'هنوز ترجمه‌ای ذخیره نشده است.');
      histEl.list.appendChild(empty);
      return;
    }

    const names = { google: 'گوگل', aphra: 'Aphra', mymemory: 'MyMemory' };
    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = `history-card-item ${item.favorite ? 'is-favorite' : ''}`.trim();
      card.tabIndex = 0;

      const query = document.createElement('div');
      query.className = 'history-card-query';
      query.dir = 'auto';
      query.textContent = item.query;

      const trans = document.createElement('div');
      trans.className = 'history-card-trans';
      trans.dir = 'auto';
      trans.textContent = item.translation;

      const meta = document.createElement('div');
      meta.className = 'history-card-meta';
      const info = document.createElement('span');
      info.textContent = `${langLabel(item.detectedLang)} → ${langLabel(item.targetLang)} · ${names[item.engine] || item.engine} · ${timeAgo(item.timestamp)}`;
      const actions = document.createElement('span');
      actions.className = 'history-card-actions';
      actions.append(
        iconButton(item.favorite ? 'حذف از نشان‌شده‌ها' : 'نشان کردن', item.favorite ? '⭐' : '☆', async () => {
          await api.toggleFavoriteItem(item.id);
          renderHistory();
        }, `fav-btn ${item.favorite ? 'active' : ''}`),
        iconButton('کپی ترجمه', '⧉', async (b) => {
          await api.copyText(item.translation);
          b.textContent = '✓';
          setTimeout(() => (b.textContent = '⧉'), 900);
        }),
        iconButton('ترجمه دوباره', '↻', () => {
          restoreItem(item);
          translate(item.query);
        }),
        iconButton('حذف', '✕', async () => {
          await api.deleteHistoryItem(item.id);
          renderHistory();
        }, 'danger')
      );
      meta.append(info, actions);

      card.append(query, trans, meta);
      const open = () => restoreItem(item); // no network round trip: the result is already stored
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') open();
      });
      histEl.list.appendChild(card);
    });
  }

  $('btn-history').addEventListener('click', async () => {
    histEl.search.value = '';
    historyFilter = 'all';
    if (histEl.tabAll) histEl.tabAll.classList.add('active');
    if (histEl.tabStarred) histEl.tabStarred.classList.remove('active');
    await renderHistory();
    openModal(el.historyModal);
    histEl.search.focus();
  });
  $('btn-close-history').addEventListener('click', () => closeModal(el.historyModal));

  if (histEl.tabAll && histEl.tabStarred) {
    histEl.tabAll.addEventListener('click', () => {
      historyFilter = 'all';
      histEl.tabAll.classList.add('active');
      histEl.tabStarred.classList.remove('active');
      renderHistory();
    });
    histEl.tabStarred.addEventListener('click', () => {
      historyFilter = 'starred';
      histEl.tabStarred.classList.add('active');
      histEl.tabAll.classList.remove('active');
      renderHistory();
    });
  }
  histEl.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderHistory, 120);
  });

  histEl.clear.addEventListener('click', async () => {
    if (clearArmed) {
      clearTimeout(clearArmed);
      clearArmed = null;
    }
    await api.clearHistory();
    await renderHistory();
    showToast('تاریخچه ترجمه‌ها پاکسازی شد');
  });
})();
