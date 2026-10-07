const { clipboard } = require('electron');
const { spawn, execFile } = require('child_process');
const readline = require('readline');
const path = require('path');
const { getScriptPath } = require('./native-helper');

const helperScript = getScriptPath('native', 'keys.ps1');
const copyScriptPath = getScriptPath('vbs', 'copy.vbs');
const pasteScriptPath = getScriptPath('vbs', 'paste.vbs');
const selectAllScriptPath = getScriptPath('vbs', 'selectall.vbs');

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
      } else if (msg === 'ok' || msg === 'copied' || msg === 'no_change' || msg === 'unknown') {
        const entry = this.pending.shift();
        if (entry) entry.finish(msg === 'ok' || msg === 'copied', msg);
      } else {
        const entry = this.pending.shift();
        if (entry) entry.finish(true, msg);
      }
    });

    const reset = () => {
      this.ready = false;
      this.proc = null;
      this.pending.splice(0).forEach((e) => e.finish(false, 'reset'));
    };
    this.proc.on('exit', reset);
    this.proc.on('error', reset);
    this.proc.stdin.on('error', () => {});
  }

  send(command, timeoutMs = 1500) {
    if (!this.proc) this.start(); // lazily (re)start; the current call falls back to VBS
    if (!this.ready) return Promise.resolve({ ok: false, msg: 'not_ready' });

    return new Promise((resolve) => {
      const entry = {
        done: false,
        finish: (ok, msg) => {
          if (entry.done) return;
          entry.done = true;
          clearTimeout(timer);
          resolve({ ok, msg });
        }
      };
      const timer = setTimeout(() => entry.finish(false, 'timeout'), timeoutMs);
      this.pending.push(entry);
      try {
        this.proc.stdin.write(`${command}\n`);
      } catch (_) {
        entry.finish(false, 'write_error');
      }
    });
  }

  async smartCopy(timeoutMs = 400) {
    if (!this.proc) this.start();
    if (!this.ready) {
      for (let i = 0; i < 8 && !this.ready; i++) {
        await sleep(25);
      }
    }
    if (!this.ready) return false;
    const res = await this.send('smart_copy', timeoutMs);
    return res && res.msg === 'copied';
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
  const res = await helper.send(command);
  if (res && res.ok) return true;
  if (command === 'copy') return runVbs(copyScriptPath);
  if (command === 'paste') return runVbs(pasteScriptPath);
  if (command === 'selectall') return runVbs(selectAllScriptPath);
  return false;
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
  for (let attempt = 0; attempt < 5; attempt++) {
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
      return;
    } catch (_) {
      await sleep(25);
    }
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

let activeCapturePromise = null;

/**
 * Capture currently selected text across any application in Windows.
 * Uses Win32 GetClipboardSequenceNumber detection: zero sentinels, zero clipboard pollution.
 */
async function captureSelectedText({ restore = true } = {}) {
  if (activeCapturePromise) {
    return activeCapturePromise;
  }

  activeCapturePromise = (async () => {
    try {
      const backup = await snapshotClipboard();

      // Fast, safe path: Win32 clipboard sequence detection
      // NEVER writes any sentinel string to clipboard.
      if (helper.ready) {
        const copied = await helper.smartCopy(320);
        if (copied) {
          const text = await safeReadClipboardText();
          if (restore) {
            await restoreClipboard(backup);
          }
          return (text || '').trim();
        } else {
          // Target app didn't copy anything (no text was highlighted).
          // Clipboard was NEVER touched, so no restore needed.
          return '';
        }
      }

      // Fallback path if helper is not ready (VBS / standard copy):
      const initialText = await safeReadClipboardText();
      const sendOk = await sendKeys('copy');
      if (!sendOk) return '';

      const started = Date.now();
      let captured = '';
      while (Date.now() - started < 320) {
        const cur = await safeReadClipboardText();
        if (cur && cur !== initialText) {
          captured = cur;
          break;
        }
        await sleep(20);
      }

      if (restore && captured) {
        await restoreClipboard(backup);
      }

      return (captured || '').trim();
    } catch (_) {
      return '';
    } finally {
      activeCapturePromise = null;
    }
  })();

  return activeCapturePromise;
}

let isCapturingInput = false;

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
  if (isCapturingInput) return { text: '', wasSelected: false };
  isCapturingInput = true;
  try {
    const backup = await snapshotClipboard();

    await sendKeys('selectall');
    await sleep(75);

    let captured = '';
    if (helper.ready) {
      const copied = await helper.smartCopy(350);
      if (copied) {
        captured = await safeReadClipboardText();
      }
    } else {
      const initialText = await safeReadClipboardText();
      await sendKeys('copy');
      const started = Date.now();
      while (Date.now() - started < 350) {
        const cur = await safeReadClipboardText();
        if (cur && cur !== initialText) {
          captured = cur;
          break;
        }
        await sleep(25);
      }
    }

    if (restore || !captured) {
      await restoreClipboard(backup);
    }

    return { text: (captured || '').trim(), wasSelected: false };
  } finally {
    isCapturingInput = false;
  }
}

/**
 * Replace selected text in the active application by writing to the clipboard and sending Ctrl+V.
 */
async function replaceSelectedText(text, { restore = true } = {}) {
  if (!text) return false;
  const backup = await snapshotClipboard();
  await safeWriteClipboardText(text);
  await sleep(60);
  const ok = await sendKeys('paste');
  if (restore) {
    // Slow targets (Word, Electron apps) read the clipboard a bit after Ctrl+V.
    setTimeout(async () => {
      await restoreClipboard(backup);
    }, 800);
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
