const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolves the absolute path to a native helper script (.ps1, .vbs).
 * In development, points directly to the source file on disk.
 * In packaged Electron apps, uses app.asar.unpacked, or extracts to a
 * temporary directory so external processes (powershell.exe, cscript.exe)
 * can always execute them without failing on asar virtual filesystem boundaries.
 */
function getScriptPath(subDir, fileName) {
  const sourcePath = path.join(__dirname, subDir, fileName);

  // 1. If running unpacked or in development, return sourcePath directly
  if (!sourcePath.includes('app.asar') && fs.existsSync(sourcePath)) {
    return sourcePath;
  }

  // 2. If running packaged with asarUnpack, check app.asar.unpacked
  if (sourcePath.includes('app.asar')) {
    const unpacked = sourcePath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) {
      return unpacked;
    }
  }

  // 3. Fallback: extract script from asar to temp directory
  try {
    const tempDir = path.join(os.tmpdir(), 'arizo-translate-native');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const targetPath = path.join(tempDir, fileName);
    // Electron's patched fs module can read files from inside app.asar
    const content = fs.readFileSync(sourcePath);
    fs.writeFileSync(targetPath, content);
    return targetPath;
  } catch (err) {
    console.warn('Warning: Failed to extract native script to temp:', err.message);
    return sourcePath;
  }
}

module.exports = { getScriptPath };
