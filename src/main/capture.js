const { clipboard } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

const copyScriptPath = path.join(__dirname, 'vbs', 'copy.vbs');
const pasteScriptPath = path.join(__dirname, 'vbs', 'paste.vbs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runVbs(scriptPath) {
  return new Promise((resolve) => {
    execFile('cscript', ['//nologo', scriptPath], { windowsHide: true }, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Capture currently selected text across any application in Windows.
 */
async function captureSelectedText() {
  const previousClipboard = clipboard.readText();

  // Put a temporary sentinel in clipboard to reliably detect if a copy happened
  const sentinel = `__APHRA_SENTINEL_${Date.now()}__`;
  clipboard.writeText(sentinel);

  // Trigger Ctrl+C in the active app
  await runVbs(copyScriptPath);

  // Wait briefly for target app to process keystroke and populate clipboard
  await sleep(75);

  let currentClipboard = clipboard.readText();

  // If clipboard still holds sentinel, target app didn't copy anything
  if (currentClipboard === sentinel) {
    // Restore previous clipboard text
    clipboard.writeText(previousClipboard);
    return '';
  }

  return currentClipboard.trim();
}

/**
 * Replace selected text in active application by writing to clipboard and sending Ctrl+V.
 */
async function replaceSelectedText(text) {
  if (!text) return false;
  clipboard.writeText(text);
  await sleep(50);
  await runVbs(pasteScriptPath);
  return true;
}

module.exports = {
  captureSelectedText,
  replaceSelectedText
};
