/* Internationalization and Theme Manager for Arizo Translate */
(function () {
  const I18N = {
    fa: {
      appTitle: 'Arizo Translate',
      mascotTitle: 'من همراه هوشمند شمام! تکونم بده یا روم کلیک کن!',
      engineGoogleTitle: 'ترجمه آنی بدون نیاز به API (Ctrl+Tab)',
      engineAphraTitle: 'ترجمه عمیق با هوش مصنوعی (Ctrl+Tab)',
      engineGoogleLabel: 'گوگل',
      engineAphraLabel: 'آفرا هوشمند',
      toneLabel: 'لحن:',
      toneAuto: 'لحن: خودکار',
      toneFormal: 'لحن: رسمی',
      toneColloquial: 'لحن: محاوره‌ای',
      toneTechnical: 'لحن: تخصصی و علمی',
      toneLiterary: 'لحن: ادبی و فاخر',
      swapLangTitle: 'جابجایی زبان‌ها (Ctrl+S)',
      historyBtnTitle: 'تاریخچه ترجمه‌ها و نشان‌شده‌ها',
      pinBtnTitle: 'سنجاق کردن پنجره روی همه برنامه‌ها',
      compactBtnTitle: 'حالت مینی کپسول (Ctrl+M)',
      settingsBtnTitle: 'تنظیمات برنامه (Ctrl+,)',
      minimizeBtnTitle: 'کوچک کردن',
      closeBtnTitle: 'بستن پنجره (Esc)',
      inputPlaceholder: 'متن را تایپ یا جای‌گذاری کنید… (ترجمه فوری)',
      clearInputTitle: 'پاک کردن متن (Esc)',
      cleanTextTitle: 'حذف شکست‌های خطوط نامناسب PDF',
      cleanTextLabel: 'پاکسازی خطوط PDF',
      pasteBtnTitle: 'جای‌گذاری از کلیپ‌بورد',
      pasteBtnLabel: 'جای‌گذاری',
      charCountLimit: 'از ۸,۰۰۰',
      outputPlaceholder: 'ترجمه اینجا نمایش داده می‌شود…',
      copyBtnTitle: 'کپی ترجمه (Enter)',
      copyBtnLabel: 'کپی',
      copiedText: 'کپی شد!',
      copyDualTitle: 'کپی متن دوزبانه (مبدا + مقصد)',
      copyDualLabel: 'دوزبانه',
      replaceBtnTitle: 'جایگزینی در برنامه فعال قبلی (Ctrl+Enter)',
      replaceBtnLabel: 'جایگزینی',
      speakBtnTitle: 'شنیدن تلفظ صوتی (TTS)',
      speakBtnLabel: 'تلفظ',
      breakdownHeadline: 'تحلیل هوشمند اصطلاحات و کنایه‌ها (Aphra)',
      shortcutIsland: 'Alt+D جزیره',
      shortcutInline: 'Alt+Shift+D درجا',
      shortcutTranslate: 'Ctrl+Enter ترجمه',
      shortcutClose: 'Esc بستن',
      translateBtn: 'ترجمه متن',
      compactReady: 'ترجمه آماده است',
      compactExpandTitle: 'باز کردن جزیره',

      // Settings Modal
      settingsTitle: 'تنظیمات آریزو ترنسلیت',
      settingsSubtitle: 'شخصی‌سازی میانبرها، تم، زبان، کلید API و رفتار برنامه',
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
      settingBubbleLabel: 'دکمه شناور ترجمه بعد از راست‌کلیک',
      settingBubbleDesc: 'هنگام انتخاب متن با موس و زدن راست‌کلیک، آیکون شناور کنار نشانگر ظاهر شود',
      settingNativeLangLabel: 'زبان اصلی من',
      settingNativeLangDesc: 'در حالت «خودکار»، متن‌های غیر از این زبان به آن ترجمه می‌شوند',
      settingSecondLangLabel: 'زبان دوم من',
      settingSecondLangDesc: 'در حالت «خودکار»، متن‌های زبان اصلی به این زبان ترجمه می‌شوند',
      settingEngineLabel: 'موتور ترجمه پیش‌فرض',
      settingEngineGoogleTitle: 'Google Translate',
      settingEngineGoogleDesc: 'رایگان، بدون کلید، فوق‌العاده سریع و عالی برای متون عمومی',
      settingEngineAphraTitle: 'Aphra Agentic AI',
      settingEngineAphraDesc: 'ترجمه عمیق با هوش مصنوعی (Gemini, DeepSeek, OpenAI, Ollama)',
      settingPresetLabel: 'سرویس‌دهنده هوش مصنوعی',
      settingPresetDesc: 'انتخاب سریع ارائه‌دهنده یا سرور محلی',
      settingBaseUrlLabel: 'Base URL',
      settingBaseUrlDesc: 'آدرس Endpoint سازگار با OpenAI',
      settingApiKeyLabel: 'کلید API (API Key)',
      settingApiKeyHint: 'کلید به‌صورت رمزنگاری‌شده با Windows ذخیره می‌شود',
      settingModelLabel: 'نام مدل (Model Name)',
      settingModelDesc: 'مثال: gemini-3.8-flash یا deepseek/deepseek-chat یا llama-3.3-70b-versatile',
      settingTestLabel: 'آزمایش اتصال',
      settingTestBtn: 'آزمایش',
      settingBreakdownLabel: 'تحلیل اصطلاحات (Breakdown)',
      settingBreakdownDesc: 'در حالت Aphra، اصطلاحات و کنایه‌های متن با توضیح نمایش داده شوند',
      settingAutoCopyLabel: 'کپی خودکار نتیجه',
      settingAutoCopyDesc: 'پس از پایان ترجمه، متن ترجمه‌شده خودکار در کلیپ‌بورد کپی شود',
      settingRestoreLabel: 'بازیابی کلیپ‌بورد',
      settingRestoreDesc: 'پس از ترجمه درجا یا ضبط متن، محتوای قبلی کلیپ‌بورد کاربر برگردانده شود',
      settingHideBlurLabel: 'پنهان شدن خودکار (Spotlight)',
      settingHideBlurDesc: 'هنگام کلیک روی برنامه‌ای دیگر، جزیره به طور خودکار محو شود',
      settingStartupLabel: 'اجرای خودکار در شروع ویندوز',
      settingStartupDesc: 'با روشن شدن سیستم یا ورود به ویندوز، آریزو ترنسلیت فعال شود',
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
      toastHistoryCleared: 'تاریخچه پاکسازی شد',
      toastTextCopied: 'متن کپی شد',
      toastAutoCopied: 'کپی خودکار انجام شد',
      toastDualCopied: 'متن دوزبانه (مبدا + مقصد) کپی شد',
      toastPdfCleaned: 'شکست خطوط PDF با موفقیت پاکسازی شد',
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
      engineGoogleLabel: 'Google',
      engineAphraLabel: 'Aphra AI',
      toneLabel: 'Tone:',
      toneAuto: 'Tone: Auto',
      toneFormal: 'Tone: Formal',
      toneColloquial: 'Tone: Colloquial',
      toneTechnical: 'Tone: Technical',
      toneLiterary: 'Tone: Literary',
      swapLangTitle: 'Swap languages (Ctrl+S)',
      historyBtnTitle: 'Translation History & Favorites',
      pinBtnTitle: 'Pin window on top of all apps',
      compactBtnTitle: 'Mini capsule mode (Ctrl+M)',
      settingsBtnTitle: 'App Settings (Ctrl+,)',
      minimizeBtnTitle: 'Minimize',
      closeBtnTitle: 'Close window (Esc)',
      inputPlaceholder: 'Type or paste text... (Instant translate)',
      clearInputTitle: 'Clear text (Esc)',
      cleanTextTitle: 'Fix awkward PDF line breaks and hyphens',
      cleanTextLabel: 'Clean PDF lines',
      pasteBtnTitle: 'Paste from clipboard',
      pasteBtnLabel: 'Paste',
      charCountLimit: 'of 8,000',
      outputPlaceholder: 'Translation will appear here...',
      copyBtnTitle: 'Copy translation (Enter)',
      copyBtnLabel: 'Copy',
      copiedText: 'Copied!',
      copyDualTitle: 'Copy bilingual text (Source + Translation)',
      copyDualLabel: 'Dual',
      replaceBtnTitle: 'Replace in active application (Ctrl+Enter)',
      replaceBtnLabel: 'Replace',
      speakBtnTitle: 'Listen to pronunciation (TTS)',
      speakBtnLabel: 'Pronounce',
      breakdownHeadline: 'Smart Idiom & Metaphor Breakdown (Aphra)',
      shortcutIsland: 'Alt+D Island',
      shortcutInline: 'Alt+Shift+D In-Place',
      shortcutTranslate: 'Ctrl+Enter Translate',
      shortcutClose: 'Esc Close',
      translateBtn: 'Translate',
      compactReady: 'Translate ready',
      compactExpandTitle: 'Expand island',

      // Settings Modal
      settingsTitle: 'Arizo Translate Settings',
      settingsSubtitle: 'Customize shortcuts, theme, language, API keys and app behavior',
      settingThemeLabel: 'Application Theme',
      settingThemeDesc: 'Choose Dark, Light, or follow Windows system theme',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeSystem: 'System Default',
      settingAppLangLabel: 'Interface Language',
      settingAppLangDesc: 'Change language for menus and all interface components',
      langFa: 'فارسی (Persian)',
      langEn: 'English',
      settingHotkeyLabel: 'Island Shortcut',
      settingHotkeyDesc: 'Click the field and press desired combination (Esc = cancel)',
      settingInlineHotkeyLabel: 'In-Place Translation Shortcut',
      settingInlineHotkeyDesc: 'Instantly translate text in Telegram, Word, etc. without opening the window',
      settingBubbleLabel: 'Floating Quick-Translate Bubble',
      settingBubbleDesc: 'Show a floating translate icon next to cursor when text is selected and right-clicked',
      settingNativeLangLabel: 'My Primary Language',
      settingNativeLangDesc: 'In "Auto" mode, non-native text translates to this language',
      settingSecondLangLabel: 'My Secondary Language',
      settingSecondLangDesc: 'In "Auto" mode, primary language text translates to this language',
      settingEngineLabel: 'Default Translation Engine',
      settingEngineGoogleTitle: 'Google Translate',
      settingEngineGoogleDesc: 'Free, no API key required, ultra-fast and great for general text',
      settingEngineAphraTitle: 'Aphra Agentic AI',
      settingEngineAphraDesc: 'Deep AI translation with cultural nuances (Gemini, DeepSeek, OpenAI, Ollama)',
      settingPresetLabel: 'AI Provider Preset',
      settingPresetDesc: 'Quick selection of LLM cloud provider or local offline server',
      settingBaseUrlLabel: 'Base URL',
      settingBaseUrlDesc: 'OpenAI-compatible completions endpoint',
      settingApiKeyLabel: 'API Key',
      settingApiKeyHint: 'Stored encrypted via Windows Data Protection API',
      settingModelLabel: 'Model Name',
      settingModelDesc: 'e.g. gemini-3.8-flash, deepseek/deepseek-chat, llama-3.3-70b-versatile',
      settingTestLabel: 'Test Connection',
      settingTestBtn: 'Test',
      settingBreakdownLabel: 'Show Idiom Breakdown',
      settingBreakdownDesc: 'Show cultural notes, idioms and metaphors when translating with Aphra AI',
      settingAutoCopyLabel: 'Auto-copy Result',
      settingAutoCopyDesc: 'Automatically copy translation to clipboard once completed',
      settingRestoreLabel: 'Restore Clipboard',
      settingRestoreDesc: 'Restore user clipboard history after in-place translation',
      settingHideBlurLabel: 'Auto-hide (Spotlight Style)',
      settingHideBlurDesc: 'Automatically hide the island when clicking outside',
      settingStartupLabel: 'Launch on Windows Startup',
      settingStartupDesc: 'Start Arizo Translate automatically when you log into Windows',
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
      toastHistoryCleared: 'History cleared successfully',
      toastTextCopied: 'Text copied to clipboard',
      toastAutoCopied: 'Translation auto-copied',
      toastDualCopied: 'Bilingual text (source + translation) copied',
      toastPdfCleaned: 'PDF line breaks successfully cleaned',
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
      if (val) el.textContent = val;
    });

    // Update placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val) el.placeholder = val;
    });

    // Update titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val) el.title = val;
    });
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
