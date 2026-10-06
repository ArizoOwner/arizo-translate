delete process.env.ELECTRON_RUN_AS_NODE;
const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage, clipboard, session } = require('electron');
const path = require('path');
const { initCapture, shutdownCapture, captureSelectedText, captureTextOrActiveInput, replaceSelectedText } = require('./src/main/capture');
const { loadSettings, saveSettings, publicSettings, loadHistory, clearHistory, deleteHistoryItem, toggleFavoriteItem, addHistoryItem } = require('./src/main/store');
const { mouseMonitor } = require('./src/main/mouse');
const { translateText } = require('./src/engine/translator');
const { testConnection } = require('./src/engine/aphra');
const { synthesize } = require('./src/engine/tts');
const { LANGUAGES } = require('./src/engine/languages');
const { iconPng } = require('./src/main/icon');

const WIN_WIDTH = 680;
const COMPACT_WIDTH = 300;
const TOP_MARGIN = 16;
const MIN_HEIGHT = 72;
const START_HIDDEN = process.argv.includes('--hidden');
const MAX_TEXT = 8000;

let mainWindow = null;
let bubbleWindow = null;
let bubbleReady = false;
let tray = null;
let currentHotkey = '';
let currentInlineHotkey = '';
let rendererReady = false;
let isCompact = false;
let isModalOpen = false;
let userPosition = null; // where the user dragged the island to (session only)
let ignoreBlurUntil = 0;
let activeTranslation = null; // AbortController of the in-flight translation

// Prevent multiple instances: a second launch simply brings the island up.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => showIsland(''));
}

// ========================================================
// WINDOW
// ========================================================
function windowWidth() {
  return isCompact ? COMPACT_WIDTH : WIN_WIDTH;
}

function centeredPosition(display) {
  const wa = display.workArea;
  return { x: Math.round(wa.x + (wa.width - windowWidth()) / 2), y: wa.y + TOP_MARGIN };
}

function clampToWorkArea(pos, display) {
  const wa = display.workArea;
  return {
    x: Math.min(Math.max(pos.x, wa.x), wa.x + wa.width - windowWidth()),
    y: Math.min(Math.max(pos.y, wa.y), wa.y + wa.height - MIN_HEIGHT)
  };
}

/** Island opens on the monitor the user is working on (cursor), at the top centre unless dragged elsewhere. */
function placeWindow() {
  if (!mainWindow) return;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  let pos = centeredPosition(display);

  if (userPosition) {
    const remembered = screen.getDisplayNearestPoint(userPosition);
    if (remembered.id === display.id) {
      pos = clampToWorkArea(userPosition, display);
    }
  }

  const b = mainWindow.getBounds();
  mainWindow.setBounds({ x: pos.x, y: pos.y, width: windowWidth(), height: b.height });
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const pos = centeredPosition(display);

  mainWindow = new BrowserWindow({
    width: WIN_WIDTH,
    height: 320,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: nativeImage.createFromBuffer(iconPng(256)),
    webPreferences: {
      preload: path.join(__dirname, 'src', 'main', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // The renderer only ever shows our own local page.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());

  mainWindow.webContents.on('did-finish-load', () => {
    rendererReady = true;
  });

  mainWindow.on('moved', () => {
    if (!mainWindow) return;
    const { x, y } = mainWindow.getBounds();
    userPosition = { x, y };
  });

  mainWindow.on('blur', () => {
    if (!mainWindow || !loadSettings().hideOnBlur || Date.now() < ignoreBlurUntil) return;
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showIsland(capturedText = '') {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  placeWindow();

  ignoreBlurUntil = Date.now() + 400;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.webContents.send('captured-text', capturedText);
}

function toast(message) {
  if (mainWindow) mainWindow.webContents.send('toast', message);
}

// ========================================================
// HOTKEY
// ========================================================
async function onHotkey() {
  // Pressing the hotkey while the island itself is focused simply dismisses it.
  if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
    return;
  }
  const settings = loadSettings();
  const selectedText = await captureSelectedText({ restore: settings.restoreClipboard });
  showIsland(selectedText);
}

/** Registers `hotkey`; on failure the previous one is restored so the user is never left without a hotkey. */
function registerHotkey(hotkey) {
  const previous = currentHotkey;
  try {
    if (previous && globalShortcut.isRegistered(previous)) globalShortcut.unregister(previous);
    if (globalShortcut.register(hotkey, onHotkey)) {
      currentHotkey = hotkey;
      console.log(`Global hotkey registered: ${hotkey}`);
      return true;
    }
    console.warn(`Could not register global hotkey: ${hotkey}`);
  } catch (err) {
    console.error(`Error registering hotkey ${hotkey}:`, err.message);
  }

  if (previous && previous !== hotkey) {
    try {
      globalShortcut.register(previous, onHotkey);
    } catch (_) {
      /* ignore */
    }
  }
  return false;
}

/** In-place translate anywhere: captures unhighlighted chat text or selection and replaces it in-place. */
async function onInlineTranslate() {
  const settings = loadSettings();
  try {
    const { text } = await captureTextOrActiveInput({ restore: false });
    if (!text || text.trim().length === 0) return;

    const res = await translateText({
      text: text.trim(),
      engine: settings.defaultEngine === 'aphra' ? 'aphra' : 'google',
      targetLang: 'auto'
    });

    if (res && res.translatedText) {
      await replaceSelectedText(res.translatedText, { restore: settings.restoreClipboard });
      if (settings.saveHistory) {
        addHistoryItem({
          query: text.trim(),
          translation: res.translatedText,
          detectedLang: res.sourceLang || 'auto',
          targetLang: res.targetLang || 'auto',
          engine: res.engine || settings.defaultEngine || 'google'
        });
      }
    }
  } catch (err) {
    console.warn('In-place translate failed:', err.message);
  }
}

function registerInlineHotkey(hotkey) {
  const previous = currentInlineHotkey;
  try {
    if (previous && globalShortcut.isRegistered(previous)) globalShortcut.unregister(previous);
    if (!hotkey) return true;
    if (globalShortcut.register(hotkey, onInlineTranslate)) {
      currentInlineHotkey = hotkey;
      console.log(`Global in-place translate hotkey registered: ${hotkey}`);
      return true;
    }
    console.warn(`Could not register inline hotkey: ${hotkey}`);
  } catch (err) {
    console.error(`Error registering inline hotkey ${hotkey}:`, err.message);
  }

  if (previous && previous !== hotkey) {
    try {
      globalShortcut.register(previous, onInlineTranslate);
    } catch (_) {
      /* ignore */
    }
  }
  return false;
}

// ========================================================
// FLOATING QUICK-TRANSLATE BUBBLE WINDOW
// ========================================================
function createBubbleWindow() {
  if (bubbleWindow) return;
  bubbleWindow = new BrowserWindow({
    width: 54,
    height: 54,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    focusable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'main', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  bubbleWindow.setAlwaysOnTop(true, 'screen-saver');
  bubbleWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'bubble.html'));
  bubbleWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  bubbleWindow.webContents.on('will-navigate', (e) => e.preventDefault());

  bubbleWindow.webContents.on('did-finish-load', () => {
    bubbleReady = true;
  });

  bubbleWindow.on('closed', () => {
    bubbleWindow = null;
    bubbleReady = false;
  });
}

async function handleMouseSelectionEvent(eventType) {
  const settings = loadSettings();
  if (settings.showFloatingBubble === false) return;

  // Don't trigger if the island is open and focused
  if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) return;

  // Wait 70ms for the target application to process right-click release
  await new Promise((r) => setTimeout(r, 70));

  const text = await captureSelectedText({ restore: true });
  if (!text || text.trim().length < 2) {
    // If user right-clicks on empty unselected space, hide any visible bubble
    if (bubbleWindow && bubbleWindow.isVisible()) {
      bubbleWindow.hide();
    }
    return;
  }

  if (!bubbleWindow) createBubbleWindow();

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const wa = display.workArea;

  // Place floating button slightly above cursor so it doesn't collide with Windows context menu
  let x = cursor.x + 14;
  let y = cursor.y - 54;
  if (y < wa.y + 10) y = cursor.y + 24;
  x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - 64));
  y = Math.max(wa.y + 8, Math.min(y, wa.y + wa.height - 64));

  bubbleWindow.setBounds({ x, y, width: 54, height: 54 });
  bubbleWindow.showInactive(); // Show without stealing focus so target app selection is preserved
  bubbleWindow.setAlwaysOnTop(true, 'screen-saver');

  if (bubbleReady) {
    bubbleWindow.webContents.send('bubble-init', { text: text.trim() });
  } else {
    bubbleWindow.webContents.once('did-finish-load', () => {
      bubbleReady = true;
      if (bubbleWindow) bubbleWindow.webContents.send('bubble-init', { text: text.trim() });
    });
  }
}

// ========================================================
// TRAY
// ========================================================
function trayIcon() {
  const icon = nativeImage.createFromBuffer(iconPng(32), { scaleFactor: 2 });
  return icon.isEmpty() ? nativeImage.createFromBuffer(iconPng(256)).resize({ width: 16, height: 16 }) : icon;
}

function buildTrayMenu() {
  const settings = loadSettings();
  return Menu.buildFromTemplate([
    { label: `باز کردن جزیره ترجمه (${currentHotkey || settings.hotkey})`, click: () => showIsland('') },
    {
      label: 'ترجمه متن کلیپ‌بورد',
      click: () => showIsland(clipboard.readText().trim().slice(0, MAX_TEXT))
    },
    { type: 'separator' },
    {
      label: 'اجرای خودکار با ویندوز',
      type: 'checkbox',
      checked: settings.launchAtStartup,
      click: (item) => {
        const saved = saveSettings({ launchAtStartup: item.checked });
        if (saved) applyLoginItem(saved.launchAtStartup);
        refreshTray();
        notifySettingsChanged();
      }
    },
    {
      label: 'بازنشانی موقعیت پنجره',
      click: () => {
        userPosition = null;
        showIsland('');
      }
    },
    { type: 'separator' },
    {
      label: 'خروج',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function refreshTray() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  try {
    tray = new Tray(trayIcon());
    tray.setToolTip('Aphra Translation Assistant');
    refreshTray();
    tray.on('click', () => showIsland(''));
  } catch (err) {
    console.error('Tray creation failed:', err);
  }
}

function applyLoginItem(enabled) {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath,
      args: app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden']
    });
  } catch (err) {
    console.warn('Could not update login item:', err.message);
  }
}

function notifySettingsChanged() {
  if (mainWindow) mainWindow.webContents.send('settings-changed', publicSettings());
}

// ========================================================
// IPC HANDLERS
// ========================================================
ipcMain.handle('get-settings', () => publicSettings());
ipcMain.handle('get-languages', () => LANGUAGES.map(({ code, name, native, rtl }) => ({ code, name, native, rtl })));

ipcMain.handle('save-settings', (event, payload = {}) => {
  const saved = saveSettings(payload.settings || {}, { clearApiKey: !!payload.clearApiKey });
  if (!saved) return { ok: false };

  let hotkeyOk = true;
  if (saved.hotkey !== currentHotkey) {
    hotkeyOk = registerHotkey(saved.hotkey);
    if (!hotkeyOk && currentHotkey) saveSettings({ hotkey: currentHotkey });
  }

  let inlineHotkeyOk = true;
  if (saved.inlineHotkey !== currentInlineHotkey) {
    inlineHotkeyOk = registerInlineHotkey(saved.inlineHotkey);
    if (!inlineHotkeyOk && currentInlineHotkey) saveSettings({ inlineHotkey: currentInlineHotkey });
  }

  applyLoginItem(saved.launchAtStartup);
  refreshTray();
  return { ok: true, hotkeyOk, inlineHotkeyOk, settings: publicSettings() };
});

ipcMain.handle('get-history', () => loadHistory());
ipcMain.handle('clear-history', () => clearHistory());
ipcMain.handle('delete-history-item', (event, id) => deleteHistoryItem(String(id)));
ipcMain.handle('toggle-favorite-item', (event, id) => toggleFavoriteItem(String(id)));

ipcMain.handle('translate', async (event, params = {}) => {
  if (activeTranslation) activeTranslation.abort();
  const controller = new AbortController();
  activeTranslation = controller;

  const { requestId } = params;
  const text = typeof params.text === 'string' ? params.text.slice(0, MAX_TEXT) : '';

  // Stream partial output to the UI, throttled so a fast model cannot flood the IPC channel.
  let lastSent = 0;
  let timer = null;
  let pending = null;
  const sendPartial = (partial) => {
    if (event.sender.isDestroyed()) return;
    event.sender.send('translate-partial', { requestId, text: partial });
  };
  const onPartial = (partial) => {
    const now = Date.now();
    if (now - lastSent >= 50) {
      lastSent = now;
      sendPartial(partial);
    } else {
      pending = partial;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          lastSent = Date.now();
          if (pending !== null && !controller.signal.aborted) sendPartial(pending);
        }, 50);
      }
    }
  };

  try {
    const result = await translateText(
      {
        text,
        engine: params.engine === 'aphra' ? 'aphra' : 'google',
        tone: typeof params.tone === 'string' ? params.tone : undefined,
        targetLang: typeof params.targetLang === 'string' ? params.targetLang : 'auto'
      },
      { signal: controller.signal, onPartial }
    );
    return { requestId, ...result };
  } finally {
    clearTimeout(timer);
    if (activeTranslation === controller) activeTranslation = null;
  }
});

ipcMain.on('translate-cancel', () => {
  if (activeTranslation) activeTranslation.abort();
});

ipcMain.handle('replace-text', async (event, newText) => {
  if (typeof newText !== 'string' || !newText) return false;
  if (mainWindow) mainWindow.hide();
  // Give the previously active window a moment to regain focus before simulating paste.
  setTimeout(() => replaceSelectedText(newText, { restore: loadSettings().restoreClipboard }), 150);
  return true;
});

ipcMain.handle('copy-text', (event, text) => {
  if (typeof text !== 'string' || !text) return false;
  clipboard.writeText(text.slice(0, MAX_TEXT * 4));
  return true;
});

ipcMain.handle('tts', async (event, { text, lang } = {}) => {
  try {
    if (typeof text !== 'string' || !text.trim()) return { ok: false };
    return { ok: true, audio: await synthesize(text.slice(0, 700), lang) };
  } catch (err) {
    console.warn('TTS failed:', err.message);
    return { ok: false };
  }
});

ipcMain.handle('test-aphra', async (event, cfg = {}) => {
  const stored = loadSettings().aphra;
  try {
    return await testConnection({
      baseUrl: cfg.baseUrl || stored.baseUrl,
      model: cfg.model || stored.model,
      apiKey: cfg.apiKey || stored.apiKey
    });
  } catch (err) {
    return { ok: false, error: err.message === 'MISSING_API_KEY' ? 'ابتدا کلید API را وارد کنید.' : err.message };
  }
});

let isPinned = true;

ipcMain.handle('toggle-pin-window', () => {
  if (!mainWindow) return isPinned;
  isPinned = !isPinned;
  mainWindow.setAlwaysOnTop(isPinned, isPinned ? 'screen-saver' : 'normal');
  return isPinned;
});

ipcMain.handle('get-pin-status', () => isPinned);

ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('set-compact-mode', (event, compact) => {
  if (!mainWindow) return;
  const oldWidth = windowWidth();
  isCompact = !!compact;
  const b = mainWindow.getBounds();
  const display = screen.getDisplayMatching(b);
  const x = Math.round(b.x + (oldWidth - windowWidth()) / 2);
  const pos = clampToWorkArea({ x, y: b.y }, display);
  mainWindow.setBounds({ x: pos.x, y: pos.y, width: windowWidth(), height: b.height });
});

// Dynamic modal state notification (window stays firmly docked at top — no vertical jitter)
ipcMain.on('set-modal-open', (event, open) => {
  isModalOpen = !!open;
});

// The transparent window is sized to its content so it never blocks clicks on apps underneath it.
ipcMain.on('resize-window', (event, contentHeight) => {
  if (!mainWindow || typeof contentHeight !== 'number' || !Number.isFinite(contentHeight)) return;
  const b = mainWindow.getBounds();
  const display = screen.getDisplayMatching(b);
  const maxHeight = Math.max(MIN_HEIGHT, display.workArea.height - (TOP_MARGIN + 24));
  const height = Math.round(Math.min(Math.max(contentHeight, MIN_HEIGHT), maxHeight));
  if (height !== b.height) mainWindow.setBounds({ x: b.x, y: b.y, width: b.width, height });
});

// Floating bubble IPC handlers
ipcMain.on('hide-bubble', () => {
  if (bubbleWindow && bubbleWindow.isVisible()) bubbleWindow.hide();
});

ipcMain.on('set-bubble-size', (event, { width, height }) => {
  if (!bubbleWindow) return;
  const b = bubbleWindow.getBounds();
  const display = screen.getDisplayMatching(b);
  const wa = display.workArea;
  const w = Math.round(width || 48);
  const h = Math.round(height || 48);

  let x = b.x;
  let y = b.y;
  if (x + w > wa.x + wa.width) x = wa.x + wa.width - w - 8;
  if (y + h > wa.y + wa.height) y = wa.y + wa.height - h - 8;
  if (x < wa.x) x = wa.x + 8;
  if (y < wa.y) y = wa.y + 8;

  bubbleWindow.setBounds({ x, y, width: w, height: h });
  bubbleWindow.focus();
});

ipcMain.handle('replace-bubble-text', async (event, text) => {
  if (bubbleWindow) bubbleWindow.hide();
  setTimeout(() => replaceSelectedText(text, { restore: loadSettings().restoreClipboard }), 150);
  return true;
});

ipcMain.on('open-island-with-text', (event, text) => {
  if (bubbleWindow) bubbleWindow.hide();
  showIsland(text);
});

// ========================================================
// APP LIFECYCLE
// ========================================================
if (gotTheLock) {
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(false));

    initCapture();
    createWindow();
    createBubbleWindow();
    createTray();

    const settings = loadSettings();
    if (!registerHotkey(settings.hotkey || 'Alt+D')) {
      const wait = setInterval(() => {
        if (!rendererReady) return;
        clearInterval(wait);
        toast(`کلید میانبر ${settings.hotkey} در دسترس نیست؛ از تنظیمات کلید دیگری انتخاب کنید`);
      }, 300);
    }

    registerInlineHotkey(settings.inlineHotkey || 'Alt+Shift+D');
    mouseMonitor.start(handleMouseSelectionEvent);

    refreshTray();

    if (!START_HIDDEN) {
      // Open the island on startup so the user immediately sees it ready.
      const wait = setInterval(() => {
        if (!rendererReady) return;
        clearInterval(wait);
        showIsland('');
      }, 100);
    }
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  shutdownCapture();
  mouseMonitor.stop();
});

app.on('window-all-closed', (e) => {
  // Keep running in tray
  e.preventDefault();
});
