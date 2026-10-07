const bubbleBtn = document.getElementById('bubble-btn');
const popoverCard = document.getElementById('popover-card');
const sourcePreview = document.getElementById('source-preview');
const loadingState = document.getElementById('loading-state');
const transResult = document.getElementById('trans-result');
const langDirection = document.getElementById('lang-direction');
const btnOpenIsland = document.getElementById('btn-open-island');
const btnClosePopover = document.getElementById('btn-close-popover');
const btnSpeakTrans = document.getElementById('btn-speak-trans');
const btnCopyTrans = document.getElementById('btn-copy-trans');
const btnReplaceTrans = document.getElementById('btn-replace-trans');

let currentText = '';
let currentTranslated = '';
let currentTargetLang = 'auto';
let autoDismissTimer = null;

function resetTimer(ms = 3500) {
  clearTimeout(autoDismissTimer);
  if (ms > 0) {
    autoDismissTimer = setTimeout(() => {
      window.api.hideBubble();
    }, ms);
  }
}

// When mouse enters window, pause auto-dismiss
window.addEventListener('mouseenter', () => {
  clearTimeout(autoDismissTimer);
});

// When mouse leaves window, restart auto-dismiss
window.addEventListener('mouseleave', () => {
  if (popoverCard.classList.contains('hidden')) {
    resetTimer(2500);
  } else {
    resetTimer(6000);
  }
});

// Listen for bubble initialization from main process
window.api.onBubbleInit((data) => {
  currentText = (data && data.text) ? data.text : '';
  currentTranslated = '';

  // Reset to initial compact bubble button
  document.body.classList.remove('expanded');
  popoverCard.classList.add('hidden');
  bubbleBtn.classList.remove('hidden');

  sourcePreview.textContent = currentText;
  transResult.textContent = '';
  loadingState.classList.add('hidden');

  // Resize window to compact button: 54x54
  window.api.setBubbleSize(54, 54);
  resetTimer(4500);
});

// When floating button is clicked: expand to popover card and translate
bubbleBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  clearTimeout(autoDismissTimer);

  document.body.classList.add('expanded');
  bubbleBtn.classList.add('hidden');
  popoverCard.classList.remove('hidden');

  // Expand bubble window bounds to accommodate popover card
  window.api.setBubbleSize(330, 210);
  loadingState.classList.remove('hidden');
  transResult.textContent = '';

  // If text was not captured on selection (to protect clipboard and prevent automatic copying), capture it now on user click!
  if (!currentText || currentText.trim().length === 0) {
    if (typeof window.api.captureSelectedText === 'function') {
      const captured = await window.api.captureSelectedText();
      if (captured && captured.trim().length > 0) {
        currentText = captured.trim();
        sourcePreview.textContent = currentText;
      }
    }
  }

  if (!currentText || currentText.trim().length === 0) {
    loadingState.classList.add('hidden');
    transResult.textContent = 'متنی برای ترجمه انتخاب نشده است';
    resetTimer(3500);
    return;
  }

  // Perform translation
  try {
    const settings = await window.api.getSettings();
    const result = await window.api.translate({
      text: currentText,
      engine: settings.defaultEngine || 'google',
      targetLang: 'auto'
    });

    loadingState.classList.add('hidden');
    const data = result && result.data ? result.data : result;
    currentTranslated = (data && data.translation) ? data.translation : '';
    transResult.textContent = currentTranslated;

    const targetLang = (data && data.targetLang) || 'fa';
    const dirLabel = targetLang === 'fa' ? 'AUTO → FA' : 'AUTO → EN';
    langDirection.textContent = dirLabel;

    // Adjust card height dynamically if translation is long
    setTimeout(() => {
      const h = Math.min(360, Math.max(190, popoverCard.offsetHeight + 14));
      window.api.setBubbleSize(330, h);
    }, 40);

    resetTimer(9000);
  } catch (err) {
    loadingState.classList.add('hidden');
    transResult.textContent = 'خطا در فرآیند ترجمه';
    resetTimer(4000);
  }
});

// Close popover
btnClosePopover.addEventListener('click', () => {
  window.api.hideBubble();
});

// Copy translation
btnCopyTrans.addEventListener('click', async () => {
  if (!currentTranslated) return;
  await window.api.copyText(currentTranslated);
  btnCopyTrans.textContent = '✓ کپی شد';
  setTimeout(() => {
    btnCopyTrans.textContent = '📋 کپی';
    window.api.hideBubble();
  }, 900);
});

// Replace text directly in active application
btnReplaceTrans.addEventListener('click', async () => {
  if (!currentTranslated) return;
  btnReplaceTrans.textContent = '✓ انجام شد';
  await window.api.replaceBubbleText(currentTranslated);
});

// Speak translation
let bubbleAudio = null;
btnSpeakTrans.addEventListener('click', async () => {
  if (!currentTranslated) return;
  if (bubbleAudio) {
    bubbleAudio.pause();
    bubbleAudio = null;
    btnSpeakTrans.textContent = '🔊';
    return;
  }
  btnSpeakTrans.textContent = '⏳';
  const isPersian = /[؀-ۿ]/.test(currentTranslated);
  const lang = isPersian ? 'fa' : 'en';
  try {
    const res = await window.api.speak(currentTranslated, lang);
    if (res && res.ok && res.audio) {
      bubbleAudio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
      btnSpeakTrans.textContent = '⏹️';
      bubbleAudio.onended = bubbleAudio.onerror = () => {
        bubbleAudio = null;
        btnSpeakTrans.textContent = '🔊';
      };
      await bubbleAudio.play();
    } else {
      btnSpeakTrans.textContent = '🔊';
      const u = new SpeechSynthesisUtterance(currentTranslated);
      u.lang = lang;
      window.speechSynthesis.speak(u);
    }
  } catch (_) {
    btnSpeakTrans.textContent = '🔊';
  }
});

// Open in main island
btnOpenIsland.addEventListener('click', () => {
  window.api.openIslandWithText(currentText);
  window.api.hideBubble();
});

// Press ESC to dismiss
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.api.hideBubble();
  }
});
