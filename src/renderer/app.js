/* Aphra Dynamic Island – core: input, translation, output, window behaviour. */
(function () {
  const api = window.api;
  const $ = (id) => document.getElementById(id);

  const el = {
    input: $('input-text'), output: $('output-text'), placeholder: $('output-placeholder'),
    translit: $('output-translit'), meta: $('output-meta'), outputCard: $('output-card'),
    clearInput: $('btn-clear-input'), charCount: $('char-count'),
    cleanText: $('btn-clean-text'), pasteBtn: $('btn-paste-input'),
    engineGoogle: $('btn-engine-google'), engineAphra: $('btn-engine-aphra'),
    toneBox: $('tone-selector'), tone: $('select-tone'),
    srcLabel: $('label-source-lang'), target: $('select-target-lang'), swap: $('btn-swap-lang'),
    copy: $('btn-copy'), copyLabel: $('copy-label'), copyIcon: $('copy-icon'), copyDual: $('btn-copy-dual'),
    replace: $('btn-replace'), speak: $('btn-speak'), speakLabel: $('speak-label'),
    close: $('btn-close'), minimize: $('btn-minimize'), compactBtn: $('btn-toggle-compact'),
    pinBtn: $('btn-pin'),
    expand: $('btn-expand-island'), island: $('island-container'), compactPreview: $('compact-preview'),
    capsule: $('compact-capsule'), header: $('island-header'),
    activity: $('activity-indicator'), progress: $('progress-bar'), progressText: $('progress-text'),
    notice: $('fallback-notice'), noticeText: $('fallback-text'), gotoSettings: $('btn-goto-settings'),
    chips: $('alt-chips'),
    breakdown: $('aphra-breakdown-container'), breakdownToggle: $('btn-toggle-breakdown'),
    breakdownList: $('breakdown-list'), breakdownArrow: $('breakdown-arrow'),
    toast: $('toast'), settingsModal: $('settings-modal'), historyModal: $('history-modal')
  };

  const state = {
    settings: {},
    languages: [],
    engine: 'google',
    targetLang: 'auto',
    translation: '',
    resultTarget: 'fa',
    resultSource: 'en',
    seq: 0,
    compact: false
  };
  const copyIconHtml = el.copyIcon.innerHTML;
  let debounceTimer = null;
  let toastTimer = null;
  let audio = null;
  let mounted = false;

  const show = (node, on) => node.classList.toggle('hidden', !on);

  // ------------------------------------------------------------------ helpers
  function showToast(message, ms = 2200) {
    el.toast.textContent = message;
    show(el.toast, true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => show(el.toast, false), ms);
  }

  const langLabel = (code) => (code || '').split('-')[0].toUpperCase();

  function langByCode(code) {
    return state.languages.find((l) => l.code.toLowerCase() === String(code).toLowerCase());
  }

  function anyModalOpen() {
    return !el.settingsModal.classList.contains('hidden') || !el.historyModal.classList.contains('hidden');
  }

  function syncModalState() {
    const open = anyModalOpen();
    el.island.classList.toggle('modal-open', open);
    if (api && api.setModalOpen) api.setModalOpen(open);
    if (typeof fitWindow === 'function') fitWindow();
  }

  function autoGrowInput() {
    el.input.style.height = 'auto';
    el.input.style.height = `${Math.min(el.input.scrollHeight, 132)}px`;
  }

  function updateCharCount() {
    const n = el.input.value.length;
    show(el.charCount, n > 0);
    el.charCount.textContent = n > 200 ? `${n.toLocaleString('en')} / 8,000` : String(n);
  }

  function updateEngineUI() {
    const aphra = state.engine === 'aphra';
    el.engineAphra.classList.toggle('active', aphra);
    el.engineGoogle.classList.toggle('active', !aphra);
    show(el.toneBox, aphra);
    if (!aphra) show(el.breakdown, false);
  }

  function updateAutoLabel(resolvedTarget) {
    const opt = el.target.querySelector('option[value="auto"]');
    if (opt) opt.textContent = resolvedTarget ? `Auto → ${langLabel(resolvedTarget)}` : 'Auto';
  }

  // ------------------------------------------------------------------ live language detection & cleaner
  const RE_ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
  const RE_PERSIAN_ONLY = /[پچژگکی۰-۹‌]/g;
  const RE_ARABIC_ONLY = /[ةيكىءأإؤئ]/g;
  const RE_URDU_ONLY = /[ٹڈڑںھہےۓ]/g;
  const RE_LATIN = /[A-Za-zÀ-ɏ]/g;
  const RE_PERSIAN_WORDS = /(?:^|\s|[.,!؟،؛:\-_()[\]{}"'])(سلام|درود|خوبی|در|به|از|که|رو|را|با|برای|این|آن|اینجا|آنجا|ها|های|کن|کنید|کرد|کردن|کردم|کردی|کردند|شد|شده|است|نیست|بود|می|نمی|یک|هم|چرا|چطور|چطوری|چگونه|کجا|چی|چیه|چیست|کی|اگر|اگه|ولی|اما|چون|تا|توی|تو|روی|داخل|زیر|بالا|داد|داده|میده|می‌ده|نده|نمیده|نمی‌ده|گرفت|بگیر|نگیر|زد|زدن|بزن|نزن|میزنه|می‌زنه|رفت|برو|نرو|اومد|آمد|بیا|نیا|هست|باشه|نباشه|میشه|می‌شه|نمیشه|نمی‌شه|لطفا|لطفاً|مرسی|ممنون|تشکر|دارد|دارم|داری|دارند|باید|نباید|شاید|بزار|بذار|چک|تست|حل|ارور|خطا|مشکل|باگ|میخوام|می‌خوام|میخواهم|می‌خواهم|میتونم|می‌تونم|میتونی|می‌تونی|میتونه|می‌تونه|بکنم|بررسی|پروژه|برنامه|کد|کامیت|مرج|پوش|پول|ریکوئست|برنچ|ریپو|کانفیگ|دیپلوی|بیلد|فیکس|اجرا|نصب|پکیج|ماژول|کامپوننت|تابع|متغیر|دیتابیس|سرور|کلاینت|لاگ|داکیومنت)(?:\s|[.,!؟،؛:\-_()[\]{}"']|$)/i;

  function countMatches(str, re) {
    const m = str.match(re);
    return m ? m.length : 0;
  }

  function detectLanguageClient(text) {
    if (!text || !text.trim()) return 'en';
    const clean = text.trim();
    const arabic = countMatches(clean, RE_ARABIC_SCRIPT);
    const latin = countMatches(clean, RE_LATIN);
    if (arabic > 0) {
      if (countMatches(clean, RE_URDU_ONLY) > 0) return 'ur';
      const faLetters = countMatches(clean, RE_PERSIAN_ONLY);
      const arLetters = countMatches(clean, RE_ARABIC_ONLY);
      const hasFaWords = RE_PERSIAN_WORDS.test(clean);
      if (hasFaWords || faLetters > 0) return 'fa';
      if (arabic >= 3 || (arabic + latin > 0 && arabic / (arabic + latin) >= 0.15)) {
        if (arLetters > faLetters && faLetters === 0 && !hasFaWords && arabic > latin) return 'ar';
        return 'fa';
      }
      if (arLetters > 0 && faLetters === 0) return 'ar';
      return 'fa';
    }
    return 'en';
  }

  function updateLiveLanguageDirection() {
    const text = el.input.value.trim();
    if (!text) {
      el.srcLabel.textContent = 'EN';
      updateAutoLabel('');
      show(el.cleanText, false);
      return;
    }
    const detected = detectLanguageClient(text);
    const native = (state.settings && state.settings.nativeLang) || 'fa';
    const second = (state.settings && state.settings.secondLang) || 'en';
    const resolvedTarget = detected === native ? second : native;

    el.srcLabel.textContent = langLabel(detected);
    el.input.dir = (detected === 'fa' || detected === 'ar' || detected === 'ur') ? 'rtl' : 'ltr';
    if (state.targetLang === 'auto') {
      updateAutoLabel(resolvedTarget);
    }
    checkPdfLineBreaks(el.input.value);
  }

  function checkPdfLineBreaks(text) {
    const hasBreaks = text.length > 25 && (/(\w+)-\s*[\r\n]+\s*(\w+)/.test(text) || (text.includes('\n') && !text.includes('\n\n\n')));
    show(el.cleanText, hasBreaks);
  }

  function cleanPdfText(text) {
    if (!text) return '';
    return text
      .replace(/(\w+)-\s*[\r\n]+\s*(\w+)/g, '$1$2')
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n+/g, '<<<PARAGRAPH>>>')
      .replace(/\n+/g, ' ')
      .replace(/<<<PARAGRAPH>>>/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ ([.,!?;:،؛؟])/g, '$1')
      .trim();
  }

  function posToPersian(pos) {
    const map = {
      noun: 'اسم',
      verb: 'فعل',
      adjective: 'صفت',
      adverb: 'قید',
      pronoun: 'ضمیر',
      preposition: 'حرف اضافه',
      conjunction: 'حرف ربط',
      interjection: 'شبه‌جمله'
    };
    return map[(pos || '').toLowerCase()] || pos;
  }

  // ------------------------------------------------------------------ output rendering
  function setOutputText(text) {
    state.translation = text;
    el.output.textContent = text;
    show(el.placeholder, !text);
  }

  function resetOutput() {
    setOutputText('');
    show(el.translit, false);
    show(el.meta, false);
    show(el.chips, false);
    show(el.breakdown, false);
    show(el.notice, false);
    show(el.progress, false);
    show(el.activity, false);
    updateAutoLabel('');
    refreshCompactPreview();
  }

  function renderChips(data) {
    el.chips.textContent = '';
    const hasDict = Array.isArray(data.alternatives) && data.alternatives.length > 0;

    if (hasDict) {
      const dictSection = document.createElement('div');
      dictSection.className = 'dict-section';

      data.alternatives.forEach((alt) => {
        const row = document.createElement('div');
        row.className = 'dict-pos-group';

        if (alt.pos) {
          const badge = document.createElement('span');
          badge.className = 'dict-pos-badge';
          badge.textContent = posToPersian(alt.pos);
          row.appendChild(badge);
        }

        (alt.terms || []).slice(0, 7).forEach((term) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'dict-term-pill';
          pill.textContent = term;
          pill.dir = 'auto';
          pill.title = 'انتخاب این واژه به عنوان ترجمه';
          pill.addEventListener('click', () => {
            setOutputText(term);
            refreshCompactPreview();
          });
          row.appendChild(pill);
        });

        dictSection.appendChild(row);
      });

      el.chips.appendChild(dictSection);
      show(el.chips, true);
      return;
    }

    const seen = new Set([data.translation]);
    const items = [];
    (data.variants || []).forEach((v) => items.push({ text: v, title: 'جمله‌بندی جایگزین' }));
    (data.alternatives || []).forEach((alt) =>
      (alt.terms || []).forEach((t) => items.push({ text: t, title: alt.pos || '' }))
    );

    items.forEach((it) => {
      if (!it.text || seen.has(it.text) || seen.size > 9) return;
      seen.add(it.text);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'alt-chip';
      chip.textContent = it.text;
      chip.dir = 'auto';
      if (it.title) chip.title = it.title;
      chip.addEventListener('click', () => {
        setOutputText(it.text);
        el.chips.querySelectorAll('.alt-chip').forEach((c) => c.classList.toggle('active', c === chip));
        refreshCompactPreview();
      });
      el.chips.appendChild(chip);
    });
    show(el.chips, el.chips.children.length > 0);
  }

  function renderBreakdown(breakdown, notes) {
    el.breakdownList.textContent = '';
    breakdown.forEach((b) => {
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      const head = document.createElement('div');
      head.dir = 'auto';
      const term = document.createElement('span');
      term.className = 'breakdown-term';
      term.textContent = `${b.term}:`;
      const meaning = document.createElement('span');
      meaning.className = 'breakdown-meaning';
      meaning.textContent = b.meaning;
      head.append(term, meaning);
      item.appendChild(head);
      if (b.explanation) {
        const d = document.createElement('div');
        d.className = 'breakdown-desc';
        d.dir = 'auto';
        d.textContent = b.explanation;
        item.appendChild(d);
      }
      el.breakdownList.appendChild(item);
    });
    if (notes) {
      const item = document.createElement('div');
      item.className = 'breakdown-item note';
      const t = document.createElement('div');
      t.className = 'breakdown-note-title';
      t.textContent = 'نکته نگارش و لحن:';
      const d = document.createElement('div');
      d.className = 'breakdown-desc';
      d.dir = 'auto';
      d.textContent = notes;
      item.append(t, d);
      el.breakdownList.appendChild(item);
    }
    show(el.breakdown, true);
  }

  function showNotice(warning) {
    if (!warning) return show(el.notice, false);
    el.noticeText.textContent =
      warning.code === 'MISSING_API_KEY'
        ? 'کلید API برای هوش مصنوعی تنظیم نشده؛ ترجمه با حالت سریع انجام شد.'
        : `هوش مصنوعی پاسخ نداد؛ ترجمه با حالت سریع انجام شد. (${warning.message})`;
    show(el.notice, true);
  }

  function engineMeta(data, ms, cached) {
    const names = { google: '⚡ گوگل', aphra: '✦ Aphra', mymemory: 'MyMemory' };
    const time = cached ? 'کش' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
    return `${names[data.engine] || data.engine} · ${time}`;
  }

  function renderResult(res, ms) {
    const data = res.data;
    setOutputText(data.translation || '');
    state.resultSource = data.detectedLang || state.resultSource;
    state.resultTarget = data.targetLang || state.resultTarget;

    el.srcLabel.textContent = langLabel(state.resultSource);
    updateAutoLabel(state.targetLang === 'auto' ? state.resultTarget : '');

    const t = (data.translit || '').trim();
    const showTranslit = t && t.length < 220 && t.toLowerCase() !== (data.translation || '').toLowerCase();
    el.translit.textContent = showTranslit ? t : '';
    show(el.translit, !!showTranslit);

    el.meta.textContent = engineMeta(data, ms, res.cached);
    show(el.meta, true);

    showNotice(res.warning);
    renderChips(data);

    if (data.breakdown && data.breakdown.length) renderBreakdown(data.breakdown, data.critiqueNotes);
    else show(el.breakdown, false);

    refreshCompactPreview();
    if (state.settings.autoCopy && state.translation) {
      api.copyText(state.translation);
      showToast('کپی خودکار انجام شد');
    }
  }

  // ------------------------------------------------------------------ translation
  function setLoading(on) {
    show(el.activity, on);
    show(el.progress, on);
    if (window.Mascot) window.Mascot.setMood(on ? 'thinking' : '');
    if (on) {
      el.progressText.textContent =
        state.engine === 'aphra' ? 'در حال اتصال به مدل هوشمند Aphra…' : 'در حال دریافت ترجمه…';
    }
  }

  async function translate(text) {
    clearTimeout(debounceTimer);
    const query = (text || '').trim();
    const id = ++state.seq;

    if (!query) {
      api.cancelTranslate();
      return resetOutput();
    }

    setLoading(true);
    show(el.placeholder, false);
    show(el.notice, false);
    const started = performance.now();

    try {
      const res = await api.translate({
        requestId: id,
        text: query,
        engine: state.engine,
        targetLang: state.targetLang,
        tone: el.tone.value
      });
      if (id !== state.seq || res.aborted) return; // a newer request owns the UI now

      setLoading(false);
      if (res.success && res.data) renderResult(res, Math.round(performance.now() - started));
      else {
        setOutputText('');
        el.output.textContent = res.error || 'خطا در ارتباط با سرور ترجمه';
        show(el.chips, false);
      }
    } catch (err) {
      if (id !== state.seq) return;
      setLoading(false);
      el.output.textContent = `خطا: ${err.message}`;
    }
  }

  function scheduleTranslate() {
    clearTimeout(debounceTimer);
    // The AI engine costs money per call, so it waits for the user to really stop typing.
    debounceTimer = setTimeout(() => translate(el.input.value), state.engine === 'aphra' ? 800 : 300);
  }

  api.onPartial((p) => {
    if (p.requestId !== state.seq || !p.text) return;
    const nearBottom = el.outputCard.scrollHeight - el.outputCard.scrollTop - el.outputCard.clientHeight < 40;
    el.output.textContent = p.text;
    state.translation = p.text;
    show(el.placeholder, false);
    el.progressText.textContent = 'در حال نگارش ترجمه…';
    if (nearBottom) el.outputCard.scrollTop = el.outputCard.scrollHeight;
  });

  // ------------------------------------------------------------------ actions
  function flashCopied() {
    window.Mascot && window.Mascot.celebrate();
    el.copy.classList.add('copied');
    el.copyLabel.textContent = 'کپی شد!';
    el.copyIcon.innerHTML = '<polyline points="20 6 9 17 4 12" stroke="#6ee7b7" stroke-width="2.5" fill="none"/>';
  }

  async function copyAndClose() {
    if (!state.translation) return;
    await api.copyText(state.translation);
    flashCopied();
    showToast('متن کپی شد');
    setTimeout(() => {
      el.copy.classList.remove('copied');
      el.copyLabel.textContent = 'کپی';
      el.copyIcon.innerHTML = copyIconHtml;
      api.hideWindow();
    }, 450);
  }

  async function replaceInApp() {
    if (!state.translation) return;
    showToast('در حال جایگزینی در برنامه…');
    await api.replaceText(state.translation);
  }

  function stopAudio() {
    if (audio) {
      audio.pause();
      audio = null;
    }
    window.speechSynthesis.cancel();
    el.speakLabel.textContent = 'تلفظ';
  }

  async function speak() {
    if (audio) return stopAudio();
    if (!state.translation) return;
    el.speakLabel.textContent = 'در حال بارگذاری…';
    const res = await api.speak(state.translation, state.resultTarget);
    if (res && res.ok) {
      audio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
      audio.onended = audio.onerror = stopAudio;
      el.speakLabel.textContent = 'توقف';
      audio.play().catch(stopAudio);
    } else {
      // Offline fallback to whatever voices Windows has installed.
      el.speakLabel.textContent = 'تلفظ';
      const u = new SpeechSynthesisUtterance(state.translation);
      u.lang = state.resultTarget;
      window.speechSynthesis.speak(u);
      showToast('پخش با صدای ویندوز');
    }
  }

  // ------------------------------------------------------------------ compact mode
  function refreshCompactPreview() {
    const t = state.translation;
    el.compactPreview.textContent = t ? (t.length > 26 ? `${t.slice(0, 26)}…` : t) : `آماده ترجمه (${state.settings.hotkey || 'Alt+D'})`;
  }

  function setCompact(on) {
    state.compact = on;
    el.island.classList.toggle('compact-mode', on);
    refreshCompactPreview();
    api.setCompactMode(on);
  }

  // ------------------------------------------------------------------ window fitting
  // The transparent window is resized to the island so it never blocks clicks on apps underneath.
  let fitFrame = 0;
  function fitWindow() {
    if (fitFrame) return;
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0;
      api.resizeWindow(el.island.offsetHeight + 24);
    });
  }
  new ResizeObserver(fitWindow).observe(el.island);

  // ------------------------------------------------------------------ input events
  function setInput(text) {
    el.input.value = text;
    show(el.clearInput, !!text);
    autoGrowInput();
    updateCharCount();
    updateLiveLanguageDirection();
  }

  el.input.addEventListener('input', () => {
    show(el.clearInput, !!el.input.value);
    autoGrowInput();
    updateCharCount();
    updateLiveLanguageDirection();
    scheduleTranslate();
  });

  if (el.cleanText) {
    el.cleanText.addEventListener('click', () => {
      const cleaned = cleanPdfText(el.input.value);
      if (cleaned) {
        setInput(cleaned);
        show(el.cleanText, false);
        showToast('شکست خطوط PDF با موفقیت پاکسازی شد');
        window.Mascot && window.Mascot.celebrate();
        translate(cleaned);
      }
    });
  }

  if (el.pasteBtn) {
    el.pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setInput(text.trim());
          translate(text.trim());
          showToast('متن از کلیپ‌بورد جایگذاری شد');
        } else {
          showToast('کلیپ‌بورد خالی است');
        }
      } catch (_) {
        el.input.focus();
      }
    });
  }

  if (el.copyDual) {
    el.copyDual.addEventListener('click', async () => {
      if (!state.translation || !el.input.value.trim()) return;
      const dual = `${el.input.value.trim()}\n\n${state.translation}`;
      await api.copyText(dual);
      flashCopied();
      showToast('متن دوزبانه (مبدا + مقصد) کپی شد');
    });
  }

  if (el.pinBtn) {
    api.getPinStatus().then((pinned) => {
      el.pinBtn.classList.toggle('active-pin', !!pinned);
    });
    el.pinBtn.addEventListener('click', async () => {
      const isPinned = await api.togglePinWindow();
      el.pinBtn.classList.toggle('active-pin', isPinned);
      showToast(isPinned ? 'پنجره روی همه برنامه‌ها سنجاق شد' : 'حالت سنجاق پنجره برداشته شد');
    });
  }

  window.onMascotClick = null;

  el.clearInput.addEventListener('click', () => {
    setInput('');
    translate('');
    el.input.focus();
  });

  function setEngine(engine) {
    state.engine = engine;
    updateEngineUI();
    if (el.input.value.trim()) translate(el.input.value);
  }
  el.engineGoogle.addEventListener('click', () => setEngine('google'));
  el.engineAphra.addEventListener('click', () => setEngine('aphra'));

  el.tone.addEventListener('change', () => {
    api.saveSettings({ aphra: { tone: el.tone.value } });
    if (el.input.value.trim() && state.engine === 'aphra') translate(el.input.value);
  });

  el.target.addEventListener('change', () => {
    state.targetLang = el.target.value;
    if (el.input.value.trim()) translate(el.input.value);
  });

  el.swap.addEventListener('click', () => {
    // Translate back into the language the text was detected in.
    const back = langByCode(state.resultSource) ? langByCode(state.resultSource).code : 'auto';
    state.targetLang = back === state.targetLang ? 'auto' : back;
    el.target.value = state.targetLang;
    if (el.input.value.trim()) translate(el.input.value);
  });

  el.breakdownToggle.addEventListener('click', toggleBreakdown);
  el.breakdownToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleBreakdown();
    }
  });
  function toggleBreakdown() {
    const hidden = el.breakdownList.classList.toggle('hidden');
    el.breakdownArrow.classList.toggle('collapsed', hidden);
    el.breakdownToggle.setAttribute('aria-expanded', String(!hidden));
  }

  el.copy.addEventListener('click', copyAndClose);
  el.replace.addEventListener('click', replaceInApp);
  el.speak.addEventListener('click', speak);
  el.close.addEventListener('click', () => api.hideWindow());
  el.minimize.addEventListener('click', () => api.minimizeWindow());
  el.compactBtn.addEventListener('click', () => setCompact(!state.compact));
  el.expand.addEventListener('click', () => setCompact(false));
  el.header.addEventListener('dblclick', (e) => {
    if (!e.target.closest('button, select')) setCompact(!state.compact);
  });

  // ------------------------------------------------------------------ keyboard
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const typing = ['TEXTAREA', 'INPUT', 'SELECT'].includes(tag);

    if (e.key === 'Escape') {
      e.preventDefault();
      if (!el.settingsModal.classList.contains('hidden')) closeModal(el.settingsModal);
      else if (!el.historyModal.classList.contains('hidden')) closeModal(el.historyModal);
      else api.hideWindow();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (!anyModalOpen()) replaceInApp();
    } else if (e.key === 'Tab' && e.ctrlKey) {
      e.preventDefault();
      setEngine(state.engine === 'google' ? 'aphra' : 'google');
    } else if (e.key === 'Enter' && !e.shiftKey && !typing && tag !== 'BUTTON' && !anyModalOpen()) {
      e.preventDefault();
      copyAndClose();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !typing && !anyModalOpen()) {
      el.input.focus(); // just start typing, wherever the focus is
    }
  });

  function closeModal(modal) {
    show(modal, false);
    syncModalState();
  }

  function openModal(modal) {
    show(modal, true);
    syncModalState();
  }

  // ------------------------------------------------------------------ events from main
  api.onCapturedText((captured) => {
    closeModal(el.settingsModal);
    closeModal(el.historyModal);
    if (state.compact) setCompact(false);

    const text = (captured || '').trim();
    if (text) {
      setInput(text);
      translate(text);
      // Focus leaves the textarea so Enter = copy and Ctrl+Enter = replace work immediately.
      el.input.blur();
    } else {
      el.input.focus();
      el.input.select();
    }
  });

  api.onToast((m) => showToast(m, 4500));
  api.onSettingsChanged((s) => {
    state.settings = s;
    refreshCompactPreview();
  });

  // ------------------------------------------------------------------ boot
  function fillTargetSelect() {
    el.target.textContent = '';
    const auto = document.createElement('option');
    auto.value = 'auto';
    auto.textContent = 'Auto';
    el.target.appendChild(auto);
    state.languages.forEach((l) => {
      const o = document.createElement('option');
      o.value = l.code;
      o.textContent = `${l.native} (${langLabel(l.code)})`;
      el.target.appendChild(o);
    });
  }

  async function init() {
    [state.settings, state.languages] = await Promise.all([api.getSettings(), api.getLanguages()]);
    state.engine = state.settings.defaultEngine || 'google';
    el.tone.value = state.settings.aphra.tone || 'auto';
    fillTargetSelect();
    updateEngineUI();
    refreshCompactPreview();
    el.input.focus();
    mounted = true;
    document.dispatchEvent(new CustomEvent('app:ready'));
  }

  // Shared with panels.js (settings + history).
  window.App = {
    api, state, el, show, showToast, openModal, closeModal, setInput, translate,
    langLabel, langByCode, updateEngineUI, refreshCompactPreview, get mounted() { return mounted; },
    setOutputText, renderChips, updateAutoLabel
  };

  init();
})();
