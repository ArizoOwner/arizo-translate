/* Internationalization and Theme Manager for Arizo Translate */
(function () {
  const I18N = {
    fa: {
      appTitle: 'Arizo Translate',
      mascotTitle: 'من همراه هوشمند شمام! تکونم بده یا روم کلیک کن!',
      engineGoogleTitle: 'ترجمه آنی بدون نیاز به API (Ctrl+Tab)',
      engineAphraTitle: 'ترجمه هوشمند با هوش مصنوعی و تحلیل اصطلاحات (Ctrl+Tab)',
      engineGoogleLabel: 'سریع',
      engineAphraLabel: 'هوشمند',
      toneLabel: 'لحن ترجمه',
      toneAuto: 'لحن خودکار',
      toneColloquial: 'محاوره‌ای و خودمانی',
      toneFormal: 'رسمی و اداری',
      toneTechnical: 'فنی و تخصصی',
      toneLiterary: 'ادبی و فاخر',
      sourceLangTitle: 'زبان تشخیص داده‌شده',
      targetLangTitle: 'زبان مقصد',
      swapLangTitle: 'معکوس کردن زبان‌ها (Ctrl+S)',
      historyBtnTitle: 'تاریخچه ترجمه‌ها',
      settingsBtnTitle: 'تنظیمات برنامه (Ctrl+,)',
      compactBtnTitle: 'حالت کپسول فشرده شناور روی برنامه‌ها (Ctrl+M)',
      pinBtnTitle: 'سنجاق روی همه برنامه‌ها (Always-on-top)',
      minimizeBtnTitle: 'کمینه‌کردن',
      closeBtnTitle: 'بستن پنجره به Tray (Esc)',
      inputPlaceholder: 'متنی را انتخاب کنید یا اینجا بنویسید...',
      cleanTextTitle: 'حذف شکست خطوط PDF، اینترهای اضافی و الحاق کلمات خط تیره خورده',
      cleanTextLabel: 'الحاق خطوط PDF',
      pasteBtnTitle: 'جایگذاری مستقیم متن از کلیپ‌بورد',
      pasteBtnLabel: 'جایگذاری',
      clearInputTitle: 'پاک کردن متن (Esc)',
      progressText: 'در حال پردازش ترجمه...',
      fallbackText: 'کلید API برای هوش مصنوعی تنظیم نشده؛ ترجمه با حالت سریع انجام شد.',
      gotoSettingsBtn: 'تنظیمات',
      outputPlaceholder: 'ترجمه به محض انتخاب متن یا تایپ نمایش داده می‌شود...',
      breakdownHeadline: 'تحلیل اصطلاحات و واژگان کلیدی',
      shortcutCopy: 'کپی',
      shortcutReplace: 'جایگزینی',
      shortcutClose: 'بستن',
      speakBtnTitle: 'تلفظ صوتی ترجمه (TTS)',
      speakBtnLabel: 'تلفظ',
      speakStopLabel: 'توقف',
      copyDualTitle: 'کپی دو زبانه (متن اصلی + ترجمه)',
      copyDualLabel: 'کپی دوزبانه',
      copyBtnTitle: 'کپی ترجمه (Enter)',
      copyBtnLabel: 'کپی',
      copiedText: 'کپی شد!',
      replaceBtnTitle: 'جایگزینی در نرم‌افزار فعال (Ctrl+Enter)',
      replaceBtnLabel: 'جایگزینی در برنامه',
      compactReady: 'آماده ترجمه',
      compactExpandTitle: 'باز کردن جزیره کامل',

      // Settings Modal
      settingsTitle: 'تنظیمات Arizo Translate',
      settingsSubtitle: 'سفارشی‌سازی کلید میانبر، زبان‌ها و هوش مصنوعی',
      settingThemeLabel: 'تم ظاهری برنامه',
      settingThemeDesc: 'انتخاب حالت تیره، روشن یا هماهنگ با ویندوز',
      themeDark: 'تاریک (Dark)',
      themeLight: 'روشن (Light)',
      themeSystem: 'پیروی از سیستم (System)',
      settingAppLangLabel: 'زبان رابط کاربری',
      settingAppLangDesc: 'تغییر زبان منوها و بخش‌های مختلف برنامه',
      langFa: 'فارسی (Persian)',
      langEn: 'English (انگلیسی)',
      settingHotkeyLabel: 'کلید میانبر باز کردن جزیره',
      settingHotkeyDesc: 'روی کادر کلیک کنید و ترکیب دلخواه را بزنید (Esc = انصراف)',
      settingInlineHotkeyLabel: 'کلید میانبر ترجمه درجا (در چت‌ها و کادر تایپ)',
      settingInlineHotkeyDesc: 'ترجمه فوری متن در تلگرام، ورد و فیلدهای تایپ بدون باز شدن پنجره (Esc = انصراف)',
      settingNativeLangLabel: 'زبان اصلی من',
      settingNativeLangDesc: 'در حالت «خودکار»، متن‌های غیر از این زبان به آن ترجمه می‌شوند',
      settingSecondLangLabel: 'زبان دوم من',
      settingSecondLangDesc: 'در حالت «خودکار»، متن‌های زبان اصلی به این زبان ترجمه می‌شوند',
      settingEngineLabel: 'موتور پیش‌فرض ترجمه',
      engineChoiceGoogleTitle: '⚡ سریع',
      engineChoiceGoogleName: 'گوگل رایگان',
      engineChoiceGoogleDesc: 'بدون نیاز به API یا ثبت‌نام',
      engineChoiceAphraTitle: '✦ هوشمند',
      engineChoiceAphraName: 'هوش مصنوعی Arizo AI',
      engineChoiceAphraDesc: 'تحلیل اصطلاحات، بازنویسی طبیعی و کنترل لحن',
      settingLlmHeader: 'پیکربندی هوش مصنوعی (LLM)',
      settingPresetLabel: 'سرویس‌دهنده هوش مصنوعی',
      settingPresetDesc: 'انتخاب سریع ارائه‌دهنده یا سرور محلی',
      presetOpenrouter: 'OpenRouter (مدل‌های برتر دنیا)',
      presetGemini: 'Google Gemini (سریع و دارای سهمیه رایگان)',
      presetDeepseek: 'DeepSeek (دقت بالا و اقتصادی)',
      presetGroq: 'Groq (سرعت فوق‌العاده)',
      presetOpenai: 'OpenAI (ChatGPT)',
      presetOllama: 'Ollama (آفلاین و محلی، بدون کلید)',
      presetCustom: 'آدرس سفارشی (Custom)',
      settingBaseUrlLabel: 'Base URL',
      settingBaseUrlDesc: 'آدرس Endpoint سازگار با OpenAI',
      settingApiKeyLabel: 'کلید API (API Key)',
      settingApiKeyHint: 'کلید به‌صورت رمزنگاری‌شده با Windows ذخیره می‌شود',
      settingApiKeyStored: 'کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید',
      settingApiKeyRemovedOnSave: 'کلید پس از ذخیره تنظیمات حذف می‌شود',
      settingModelLabel: 'نام مدل (Model Name)',
      settingModelDesc: 'مثال: gemini-3.8-flash یا deepseek/deepseek-chat یا llama-3.3-70b-versatile',
      settingTestLabel: 'آزمایش اتصال',
      settingTestDesc: 'با تنظیمات فعلی یک درخواست آزمایشی ارسال می‌شود',
      settingTesting: 'در حال آزمایش…',
      settingTestSuccess: '✓ اتصال موفق',
      settingClearKeyBtn: 'حذف کلید',
      settingTestBtn: 'آزمایش',
      savedApiKey: 'ذخیره شده',
      settingBreakdownLabel: 'تحلیل اصطلاحات',
      settingBreakdownDesc: 'نمایش توضیح اصطلاحات و جمله‌بندی‌های جایگزین (کمی کندتر)',
      settingBehaviourHeader: 'رفتار برنامه',
      settingBubbleLabel: 'دکمه شناور ترجمه سریع کنار نشانگر ماوس',
      settingBubbleDesc: 'نمایش دکمه کوچک ترجمه در هنگام انتخاب متن یا راست‌کلیک در تمام برنامه‌ها و سایت‌ها',
      settingAutoCopyLabel: 'کپی خودکار پس از ترجمه',
      settingAutoCopyDesc: 'متن ترجمه‌شده بلافاصله در کلیپ‌بورد کپی شود',
      settingRestoreLabel: 'بازیابی کلیپ‌بورد',
      settingRestoreDesc: 'پس از ترجمه درجا، محتوای قبلی کلیپ‌بورد برگردانده شود',
      settingHideBlurLabel: 'پنهان شدن خودکار با کلیک بیرون',
      settingHideBlurDesc: 'با کلیک روی پنجره‌های دیگر، جزیره به طور خودکار بسته شود',
      settingStartupLabel: 'اجرا در شروع ویندوز',
      settingStartupDesc: 'با روشن شدن ویندوز، آریزو ترنسلیت به صورت خودکار اجرا شود',
      settingSaveHistoryLabel: 'ذخیره تاریخچه',
      settingSaveHistoryDesc: 'ترجمه‌ها در بخش تاریخچه ذخیره شوند تا در دسترس باشند',
      saveSettingsBtn: 'ذخیره تنظیمات',

      // History Modal
      historyTitle: 'تاریخچه ترجمه‌ها',
      historySubtitle: 'ترجمه‌های اخیر و کارت‌های نشان‌شده (⭐)',
      historyTabAll: 'همه',
      historyTabStarred: 'نشان‌شده‌ها ⭐',
      historySearchPlaceholder: 'جستجو در متن مبدا یا ترجمه…',
      historyClearBtn: 'پاکسازی همه',
      historyClearConfirm: 'مطمئنید؟ دوباره بزنید',
      historyEmptyAll: 'هنوز ترجمه‌ای ذخیره نشده است.',
      historyEmptyStarred: 'هنوز موردی نشان نشده است (با علامت ستاره روی هر کارت می‌توانید آن را نشان کنید).',
      historyEmptySearch: 'موردی یافت نشد.',
      toastSettingsSaved: 'تنظیمات با موفقیت ذخیره شد',
      toastSaveError: 'خطا در ذخیره تنظیمات',
      toastHistoryCleared: 'تاریخچه پاکسازی شد',
      toastTextCopied: 'متن کپی شد',
      toastAutoCopied: 'کپی خودکار انجام شد',
      toastDualCopied: 'متن دوزبانه (مبدا + مقصد) کپی شد',
      toastPdfCleaned: 'شکست خطوط PDF با موفقیت پاکسازی شد',
      toastPasted: 'متن از کلیپ‌بورد جایگذاری شد',
      toastSpeaking: 'پخش با صدای ویندوز',
      toastClipboardEmpty: 'کلیپ‌بورد خالی است',
      toastReplacing: 'در حال جایگزینی در برنامه…',
      toastPinned: 'پنجره روی همه برنامه‌ها سنجاق شد',
      toastUnpinned: 'حالت سنجاق پنجره برداشته شد'
    },
    en: {
      appTitle: 'Arizo Translate',
      mascotTitle: "I'm your smart companion! Move or click me!",
      engineGoogleTitle: 'Instant translation without API key (Ctrl+Tab)',
      engineAphraTitle: 'Deep contextual AI translation (Ctrl+Tab)',
      engineGoogleLabel: 'Fast',
      engineAphraLabel: 'Smart',
      toneLabel: 'Translation Tone',
      toneAuto: 'Auto Tone',
      toneColloquial: 'Colloquial & Casual',
      toneFormal: 'Formal & Business',
      toneTechnical: 'Technical & Academic',
      toneLiterary: 'Literary & Elegant',
      sourceLangTitle: 'Detected source language',
      targetLangTitle: 'Target language',
      swapLangTitle: 'Swap languages (Ctrl+S)',
      historyBtnTitle: 'Translation History',
      settingsBtnTitle: 'App Settings (Ctrl+,)',
      compactBtnTitle: 'Mini floating capsule mode (Ctrl+M)',
      pinBtnTitle: 'Pin window on top of all apps',
      minimizeBtnTitle: 'Minimize',
      closeBtnTitle: 'Close window (Esc)',
      inputPlaceholder: 'Select text or type here...',
      cleanTextTitle: 'Fix awkward PDF line breaks, extra returns, and hyphens',
      cleanTextLabel: 'Clean PDF lines',
      pasteBtnTitle: 'Paste directly from clipboard',
      pasteBtnLabel: 'Paste',
      clearInputTitle: 'Clear text (Esc)',
      progressText: 'Processing translation...',
      fallbackText: 'AI API key not configured; translated with Fast engine.',
      gotoSettingsBtn: 'Settings',
      outputPlaceholder: 'Translation appears as soon as you select text or type...',
      breakdownHeadline: 'Key idioms & vocabulary breakdown',
      shortcutCopy: 'Copy',
      shortcutReplace: 'Replace',
      shortcutClose: 'Close',
      speakBtnTitle: 'Pronounce translation (TTS)',
      speakBtnLabel: 'Speak',
      speakStopLabel: 'Stop',
      copyDualTitle: 'Copy bilingual text (source + translation)',
      copyDualLabel: 'Bilingual',
      copyBtnTitle: 'Copy translation (Enter)',
      copyBtnLabel: 'Copy',
      copiedText: 'Copied!',
      replaceBtnTitle: 'Replace in active application (Ctrl+Enter)',
      replaceBtnLabel: 'Replace in App',
      compactReady: 'Ready to translate',
      compactExpandTitle: 'Expand full island',

      // Settings Modal
      settingsTitle: 'Arizo Translate Settings',
      settingsSubtitle: 'Customize shortcuts, languages, and AI engine',
      settingThemeLabel: 'Application Theme',
      settingThemeDesc: 'Choose Dark, Light, or follow Windows system theme',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeSystem: 'System Default',
      settingAppLangLabel: 'Interface Language',
      settingAppLangDesc: 'Change language for menus and all UI components',
      langFa: 'فارسی (Persian)',
      langEn: 'English',
      settingHotkeyLabel: 'Island Shortcut',
      settingHotkeyDesc: 'Click the field and press desired shortcut (Esc = cancel)',
      settingInlineHotkeyLabel: 'In-Place Translation Shortcut',
      settingInlineHotkeyDesc: 'Instantly translate text in Telegram, Word, etc. without opening the window',
      settingNativeLangLabel: 'My Primary Language',
      settingNativeLangDesc: 'In "Auto" mode, non-native text translates to this language',
      settingSecondLangLabel: 'My Secondary Language',
      settingSecondLangDesc: 'In "Auto" mode, primary language text translates to this language',
      settingEngineLabel: 'Default Translation Engine',
      engineChoiceGoogleTitle: '⚡ Fast',
      engineChoiceGoogleName: 'Free Google',
      engineChoiceGoogleDesc: 'No API key or signup required',
      engineChoiceAphraTitle: '✦ Smart',
      engineChoiceAphraName: 'Arizo AI Engine',
      engineChoiceAphraDesc: 'Idiom breakdown, natural rewrites, and tone control',
      settingLlmHeader: 'AI Configuration (LLM)',
      settingPresetLabel: 'AI Provider Preset',
      settingPresetDesc: 'Quick selection of LLM cloud provider or local server',
      presetOpenrouter: 'OpenRouter (Top Global Models)',
      presetGemini: 'Google Gemini (Fast & Free Tier)',
      presetDeepseek: 'DeepSeek (Accurate & Affordable)',
      presetGroq: 'Groq (Ultra Fast)',
      presetOpenai: 'OpenAI (ChatGPT)',
      presetOllama: 'Ollama (Local & Offline, No Key)',
      presetCustom: 'Custom Endpoint',
      settingBaseUrlLabel: 'Base URL',
      settingBaseUrlDesc: 'OpenAI-compatible completions endpoint',
      settingApiKeyLabel: 'API Key',
      settingApiKeyHint: 'Stored encrypted via Windows Data Protection API',
      settingApiKeyStored: 'Key stored; enter new key to replace',
      settingApiKeyRemovedOnSave: 'Key will be removed upon saving settings',
      settingModelLabel: 'Model Name',
      settingModelDesc: 'e.g. gemini-3.8-flash, deepseek/deepseek-chat, llama-3.3-70b-versatile',
      settingTestLabel: 'Test Connection',
      settingTestDesc: 'Sends a lightweight test request with current settings',
      settingTesting: 'Testing connection...',
      settingTestSuccess: '✓ Connected successfully',
      settingClearKeyBtn: 'Remove Key',
      settingTestBtn: 'Test',
      savedApiKey: 'Saved',
      settingBreakdownLabel: 'Show Idiom Breakdown',
      settingBreakdownDesc: 'Show cultural notes and idiom explanations (slightly slower)',
      settingBehaviourHeader: 'App Behaviour',
      settingBubbleLabel: 'Floating Quick-Translate Bubble',
      settingBubbleDesc: 'Show floating bubble near cursor when text is selected or right-clicked',
      settingAutoCopyLabel: 'Auto-copy Result',
      settingAutoCopyDesc: 'Automatically copy translation to clipboard once completed',
      settingRestoreLabel: 'Restore Clipboard',
      settingRestoreDesc: 'Restore previous clipboard contents after in-place translation',
      settingHideBlurLabel: 'Auto-hide on Click Outside',
      settingHideBlurDesc: 'Automatically hide the island when clicking other windows',
      settingStartupLabel: 'Launch on Windows Startup',
      settingStartupDesc: 'Start Arizo Translate automatically when Windows starts',
      settingSaveHistoryLabel: 'Save History',
      settingSaveHistoryDesc: 'Store past queries and translations in searchable local history',
      saveSettingsBtn: 'Save Settings',

      // History Modal
      historyTitle: 'Translation History',
      historySubtitle: 'Recent translations and starred cards (⭐)',
      historyTabAll: 'All',
      historyTabStarred: 'Starred ⭐',
      historySearchPlaceholder: 'Search source text or translation...',
      historyClearBtn: 'Clear All',
      historyClearConfirm: 'Are you sure? Click again',
      historyEmptyAll: 'No translations saved yet.',
      historyEmptyStarred: 'No starred translations yet (click the star on any card to bookmark it).',
      historyEmptySearch: 'No matching translations found.',
      toastSettingsSaved: 'Settings saved successfully',
      toastSaveError: 'Error saving settings',
      toastHistoryCleared: 'History cleared successfully',
      toastTextCopied: 'Text copied to clipboard',
      toastAutoCopied: 'Translation auto-copied',
      toastDualCopied: 'Bilingual text (source + translation) copied',
      toastPdfCleaned: 'PDF line breaks successfully cleaned',
      toastPasted: 'Text pasted from clipboard',
      toastSpeaking: 'Playing Windows speech',
      toastClipboardEmpty: 'Clipboard is empty',
      toastReplacing: 'Replacing in active app...',
      toastPinned: 'Window pinned on top of all apps',
      toastUnpinned: 'Window unpinned'
    }
  };

  let currentLang = 'fa';
  let currentTheme = 'dark';
  let systemThemeMedia = null;

  function t(key) {
    const table = I18N[currentLang] || I18N.fa;
    return table[key] !== undefined ? table[key] : (I18N.fa[key] || key);
  }

  function applyLanguage(lang) {
    currentLang = lang === 'en' ? 'en' : 'fa';
    const root = document.documentElement;
    root.setAttribute('lang', currentLang);
    root.setAttribute('dir', currentLang === 'fa' ? 'rtl' : 'ltr');

    // Update text content for elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val !== undefined && val !== null) el.textContent = val;
    });

    // Update placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val !== undefined && val !== null) el.placeholder = val;
    });

    // Update titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val !== undefined && val !== null) el.title = val;
    });

    // Update aria-labels with data-i18n-aria-label
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      const val = t(key);
      if (val !== undefined && val !== null) el.setAttribute('aria-label', val);
    });

    try {
      document.dispatchEvent(new CustomEvent('app:language-changed', { detail: { lang: currentLang } }));
    } catch (_) {}
  }

  function onSystemThemeChange(e) {
    if (currentTheme === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', resolved);
    }
  }

  function applyTheme(theme) {
    currentTheme = (theme === 'light' || theme === 'system') ? theme : 'dark';
    if (!systemThemeMedia && window.matchMedia) {
      systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeMedia.addEventListener('change', onSystemThemeChange);
    }

    let resolved = currentTheme;
    if (currentTheme === 'system') {
      resolved = systemThemeMedia && systemThemeMedia.matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  }

  window.I18n = {
    I18N,
    t,
    get lang() { return currentLang; },
    get theme() { return currentTheme; },
    applyLanguage,
    applyTheme
  };
})();
