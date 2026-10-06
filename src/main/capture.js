const { clipboard } = require('electron');
const { spawn, execFile } = require('child_process');
const readline = require('readline');
const path = require('path');
const { getScriptPath } = require('./native-helper');

const helperScript = getScriptPath('native', 'keys.ps1');
const copyScriptPath = getScriptPath('vbs', 'copy.vbs');
const pasteScriptPath = getScriptPath('vbs', 'paste.vbs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Slow but dependency free fallback (spawns a script host per keystroke).
// ---------------------------------------------------------------------------
function runVbs(scriptPath) {
  return new Promise((resolve) => {
    execFile('cscript', ['//nologo', scriptPath], { windowsHide: true }, (error) => resolve(!error));
  });
}

// ---------------------------------------------------------------------------
// Fast path: one persistent PowerShell process that sends the keystrokes.
// ---------------------------------------------------------------------------
class KeyHelper {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.pending = [];
  }

  start() {
    if (this.proc) return;
    try {
      this.proc = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperScript],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] }
      );
    } catch (err) {
      console.warn('Key helper could not start:', err.message);
      this.proc = null;
      return;
    }

    const rl = readline.createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => {
      const msg = line.trim();
      if (msg === 'ready') {
        this.ready = true;
      } else if (msg === 'ok' || msg === 'unknown') {
        const entry = this.pending.shift();
        if (entry) entry.finish(msg === 'ok');
      }
    });

    const reset = () => {
      this.ready = false;
      this.proc = null;
      this.pending.splice(0).forEach((e) => e.finish(false));
    };
    this.proc.on('exit', reset);
    this.proc.on('error', reset);
    this.proc.stdin.on('error', () => {});
  }

  send(command, timeoutMs = 1500) {
    if (!this.proc) this.start(); // lazily (re)start; the current call falls back to VBS
    if (!this.ready) return Promise.resolve(false);

    return new Promise((resolve) => {
      const entry = {
        done: false,
        finish: (ok) => {
          if (entry.done) return;
          entry.done = true;
          clearTimeout(timer);
          resolve(ok);
        }
      };
      const timer = setTimeout(() => entry.finish(false), timeoutMs);
      this.pending.push(entry);
      try {
        this.proc.stdin.write(`${command}\n`);
      } catch (_) {
        entry.finish(false);
      }
    });
  }

  stop() {
    if (!this.proc) return;
    try {
      this.proc.stdin.write('exit\n');
      this.proc.stdin.end();
    } catch (_) {
      /* ignore */
    }
    try {
      this.proc.kill();
    } catch (_) {
      /* ignore */
    }
    this.proc = null;
    this.ready = false;
  }
}

const helper = new KeyHelper();

/** Warm the helper up at app start so the first hotkey press is already fast. */
function initCapture() {
  helper.start();
}

function shutdownCapture() {
  helper.stop();
}

async function sendKeys(command) {
  if (await helper.send(command)) return true;
  return runVbs(command === 'copy' ? copyScriptPath : pasteScriptPath);
}

// ---------------------------------------------------------------------------
// Clipboard snapshot / restore so capturing never destroys what the user had copied.
// In modern Electron (v44+), clipboard methods are asynchronous Promises.
// ---------------------------------------------------------------------------
async function snapshotClipboard() {
  try {
    const [text, html, rtf, image] = await Promise.all([
      Promise.resolve(clipboard.readText()).catch(() => ''),
      Promise.resolve(clipboard.readHTML()).catch(() => ''),
      Promise.resolve(clipboard.readRTF()).catch(() => ''),
      Promise.resolve(clipboard.readImage()).catch(() => null)
    ]);
    return {
      text: typeof text === 'string' ? text : '',
      html: typeof html === 'string' ? html : '',
      rtf: typeof rtf === 'string' ? rtf : '',
      image: image || null
    };
  } catch (_) {
    return null;
  }
}

async function restoreClipboard(snap) {
  if (!snap) return;
  try {
    const data = {};
    if (snap.text) data.text = snap.text;
    if (snap.html) data.html = snap.html;
    if (snap.rtf) data.rtf = snap.rtf;
    if (snap.image && typeof snap.image.isEmpty === 'function' && !snap.image.isEmpty()) {
      data.image = snap.image;
    }
    if (Object.keys(data).length) {
      await Promise.resolve(clipboard.write(data));
    } else {
      await Promise.resolve(clipboard.clear());
    }
  } catch (_) {
    /* ignore */
  }
}

async function safeReadClipboardText() {
  try {
    const res = await Promise.resolve(clipboard.readText());
    return typeof res === 'string' ? res : '';
  } catch (_) {
    return '';
  }
}

async function safeWriteClipboardText(text) {
  try {
    await Promise.resolve(clipboard.writeText(text));
    return true;
  } catch (_) {
    return false;
  }
}

async function waitForClipboardChange(sentinel, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const text = await safeReadClipboardText();
    // Only return if text is a non-empty string DIFFERENT from the sentinel
    if (text && text !== sentinel && !text.includes('__ARIZO_SENTINEL_') && !text.includes('__APHRA_SENTINEL_')) {
      return text;
    }
    await sleep(15);
  }
  return '';
}

let activeCapturePromise = null;

/**
 * Capture currently selected text across any application in Windows.
 */
async function captureSelectedText({ restore = true } = {}) {
  if (activeCapturePromise) {
    return activeCapturePromise;
  }

  activeCapturePromise = (async () => {
    try {
      const backup = await snapshotClipboard();

      // A unique sentinel allows us to verify if the target application actually copied anything.
      const sentinel = `__ARIZO_SENTINEL_${Date.now()}_${Math.random().toString(36).slice(2, 7)}__`;
      await safeWriteClipboardText(sentinel);

      // Verify sentinel was successfully written to the clipboard
      let verified = false;
      for (let i = 0; i < 6; i++) {
        const cur = await safeReadClipboardText();
        if (cur === sentinel) {
          verified = true;
          break;
        }
        await sleep(15);
      }

      if (!verified) {
        // Clipboard was locked by another process, abort safely
        await restoreClipboard(backup);
        return '';
      }

      await sendKeys('copy');
      const captured = await waitForClipboardChange(sentinel, 320);

      // If target app didn't copy anything, or if restore is requested, restore previous clipboard
      if (restore || !captured) {
        await restoreClipboard(backup);
      }

      // Safety guard: Never return the sentinel or sentinel fragments
      if (!captured || captured === sentinel || captured.includes('__ARIZO_SENTINEL_') || captured.includes('__APHRA_SENTINEL_')) {
        return '';
      }

      return captured.trim();
    } catch (_) {
      return '';
    } finally {
      activeCapturePromise = null;
    }
  })();

  return activeCapturePromise;
}

/**
 * Capture currently selected text. If nothing is selected, select all text in the active field (Ctrl+A)
 * and capture it. This allows instant in-place translation in chat boxes like Telegram, WhatsApp, Discord, etc.
 */
async function captureTextOrActiveInput({ restore = true } = {}) {
  // First attempt: capture what's already selected
  const selected = await captureSelectedText({ restore });
  if (selected && selected.trim().length > 0) {
    return { text: selected.trim(), wasSelected: true };
  }

  // Second attempt: user just typed in an input field without highlighting it
  if (busy) return { text: '', wasSelected: false };
  busy = true;
  try {
    const backup = await snapshotClipboard();
    const sentinel = `__APHRA_SENTINEL_${Date.now()}_${Math.random().toString(36).slice(2, 7)}__`;
    await safeWriteClipboardText(sentinel);

    let verified = false;
    for (let i = 0; i < 6; i++) {
      const cur = await safeReadClipboardText();
      if (cur === sentinel) {
        verified = true;
        break;
      }
      await sleep(15);
    }

    if (!verified) {
      await restoreClipboard(backup);
      return { text: '', wasSelected: false };
    }

    await sendKeys('selectall');
    await sleep(35);
    await sendKeys('copy');

    const captured = await waitForClipboardChange(sentinel, 350);
    if (restore || !captured) {
      await restoreClipboard(backup);
    }

    if (!captured || captured === sentinel || captured.includes('__APHRA_SENTINEL_')) {
      return { text: '', wasSelected: false };
    }

    return { text: (captured || '').trim(), wasSelected: false };
  } finally {
    busy = false;
  }
}

/**
 * Replace selected text in the active application by writing to the clipboard and sending Ctrl+V.
 */
async function replaceSelectedText(text, { restore = true } = {}) {
  if (!text) return false;
  const backup = await snapshotClipboard();
  await safeWriteClipboardText(text);
  await sleep(40);
  const ok = await sendKeys('paste');
  if (restore) {
    // Slow targets (Word, Electron apps) read the clipboard a bit after Ctrl+V.
    setTimeout(async () => {
      await restoreClipboard(backup);
    }, 450);
  }
  return ok;
}

module.exports = {
  initCapture,
  shutdownCapture,
  captureSelectedText,
  captureTextOrActiveInput,
  replaceSelectedText,
  sendKeys
};
