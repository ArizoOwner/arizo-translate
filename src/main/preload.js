const { contextBridge, ipcRenderer } = require('electron');

/**
 * The renderer runs sandboxed with context isolation (no Node.js access).
 * This is the complete, explicit surface it can use to talk to the main process.
 */
function subscribe(channel, callback) {
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('api', {
  // data
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings, options = {}) =>
    ipcRenderer.invoke('save-settings', { settings, clearApiKey: !!options.clearApiKey }),
  getLanguages: () => ipcRenderer.invoke('get-languages'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
  toggleFavoriteItem: (id) => ipcRenderer.invoke('toggle-favorite-item', id),

  // actions
  translate: (params) => ipcRenderer.invoke('translate', params),
  cancelTranslate: () => ipcRenderer.send('translate-cancel'),
  replaceText: (text) => ipcRenderer.invoke('replace-text', text),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  readClipboardText: () => ipcRenderer.invoke('read-clipboard-text'),
  speak: (text, lang) => ipcRenderer.invoke('tts', { text, lang }),
  testAphra: (config) => ipcRenderer.invoke('test-aphra', config),

  // window
  hideWindow: () => ipcRenderer.send('hide-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  togglePinWindow: () => ipcRenderer.invoke('toggle-pin-window'),
  getPinStatus: () => ipcRenderer.invoke('get-pin-status'),
  setCompactMode: (compact) => ipcRenderer.send('set-compact-mode', !!compact),
  setModalOpen: (open) => ipcRenderer.send('set-modal-open', !!open),
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),

  // floating bubble
  hideBubble: () => ipcRenderer.send('hide-bubble'),
  setBubbleSize: (w, h) => ipcRenderer.send('set-bubble-size', { width: w, height: h }),
  replaceBubbleText: (text) => ipcRenderer.invoke('replace-bubble-text', text),
  openIslandWithText: (text) => ipcRenderer.send('open-island-with-text', text),
  onBubbleInit: (cb) => subscribe('bubble-init', cb),

  // events pushed by the main process
  onGlobalMousePos: (cb) => subscribe('global-mouse-pos', cb),
  onCapturedText: (cb) => subscribe('captured-text', cb),
  onPartial: (cb) => subscribe('translate-partial', cb),
  onSettingsChanged: (cb) => subscribe('settings-changed', cb),
  onToast: (cb) => subscribe('toast', cb)
});
