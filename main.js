delete process.env.ELECTRON_RUN_AS_NODE;
const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { captureSelectedText, replaceSelectedText } = require('./src/main/capture');
const { loadSettings, saveSettings, loadHistory, clearHistory, deleteHistoryItem } = require('./src/main/store');
const { translateText } = require('./src/engine/translator');

let mainWindow = null;
let tray = null;
let currentHotkey = 'Alt+D';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const winWidth = 620;
  const winHeight = 460;
  const x = Math.round((screenWidth - winWidth) / 2);
  const y = 16; // Pin near top of screen like Dynamic Island

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Hide when clicking outside / losing focus
  mainWindow.on('blur', () => {
    // Only hide if settings/history modals are not actively open or debugging
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showIsland(capturedText = '') {
  if (!mainWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const x = Math.round((screenWidth - mainWindow.getBounds().width) / 2);
  const y = 16;
  mainWindow.setPosition(x, y);

  mainWindow.show();
  mainWindow.focus();

  mainWindow.webContents.send('captured-text', capturedText);
}

function registerHotkey(hotkey) {
  try {
    globalShortcut.unregisterAll();
    const registered = globalShortcut.register(hotkey, async () => {
      // 1. Capture selected text from whatever application the user was in
      const selectedText = await captureSelectedText();

      // 2. Open Dynamic Island and pass captured text
      showIsland(selectedText);
    });

    if (registered) {
      currentHotkey = hotkey;
      console.log(`Global hotkey registered successfully: ${hotkey}`);
    } else {
      console.warn(`Could not register global hotkey: ${hotkey}`);
    }
  } catch (err) {
    console.error(`Error registering hotkey ${hotkey}:`, err);
  }
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'src', 'assets', 'tray.png');
    let icon;
    if (fs.existsSync(iconPath)) {
      try {
        const buf = fs.readFileSync(iconPath);
        icon = nativeImage.createFromBuffer(buf);
      } catch (err) {
        console.warn('Could not read tray icon buffer:', err);
      }
    }

    if (!icon || icon.isEmpty()) {
      // Fallback 16x16 icon bitmap
      const size = 16;
      const buffer = Buffer.alloc(size * size * 4);
      for (let i = 0; i < size * size; i++) {
        buffer[i * 4] = 99;     // R
        buffer[i * 4 + 1] = 102; // G
        buffer[i * 4 + 2] = 241; // B
        buffer[i * 4 + 3] = 255; // A
      }
      icon = nativeImage.createFromBuffer(buffer, { width: size, height: size });
    }

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `باز کردن جزیره ترجمه (${currentHotkey})`,
        click: () => showIsland('')
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

    tray.setToolTip('Aphra Translation Assistant');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => showIsland(''));
  } catch (err) {
    console.error('Tray creation failed:', err);
  }
}

// ========================================================
// IPC HANDLERS
// ========================================================
ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, newSettings) => {
  const success = saveSettings(newSettings);
  if (success && newSettings.hotkey && newSettings.hotkey !== currentHotkey) {
    registerHotkey(newSettings.hotkey);
  }
  return success;
});

ipcMain.handle('get-history', () => {
  return loadHistory();
});

ipcMain.handle('clear-history', () => {
  return clearHistory();
});

ipcMain.handle('delete-history-item', (event, id) => {
  return deleteHistoryItem(id);
});

ipcMain.handle('translate', async (event, params) => {
  const settings = loadSettings();
  return await translateText({
    text: params.text,
    engine: params.engine,
    aphraConfig: { ...settings.aphra, tone: params.tone || settings.aphra.tone },
    targetLang: params.targetLang || 'auto'
  });
});

ipcMain.handle('replace-text', async (event, newText) => {
  if (mainWindow) {
    mainWindow.hide();
  }
  // Allow window to hide and previous active window to regain focus before simulating paste
  setTimeout(async () => {
    await replaceSelectedText(newText);
  }, 120);
  return true;
});

ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('content-resized', () => {
  // If needed, adjust height dynamically
});

// ========================================================
// APP LIFECYCLE
// ========================================================
app.whenReady().then(() => {
  createWindow();
  createTray();

  const settings = loadSettings();
  registerHotkey(settings.hotkey || 'Alt+D');

  // Open the island on initial startup so the user immediately sees it ready!
  setTimeout(() => {
    showIsland('');
  }, 400);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  // Keep running in tray
  e.preventDefault();
});
