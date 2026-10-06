const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const monitorScript = path.join(__dirname, 'native', 'mouse-monitor.ps1');

class MouseMonitor {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.callback = null;
    this.lastTrigger = 0;
  }

  start(onEvent) {
    if (this.proc) return;
    this.callback = onEvent;

    try {
      this.proc = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', monitorScript],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
      );
    } catch (err) {
      console.warn('Mouse monitor could not start:', err.message);
      this.proc = null;
      return;
    }

    const rl = readline.createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => {
      const msg = line.trim();
      if (msg === 'ready') {
        this.ready = true;
      } else if (msg === 'selection_made') {
        if (typeof this.callback === 'function') {
          this.callback('selection_made');
        }
      } else if (msg === 'left_clicked') {
        if (typeof this.callback === 'function') {
          this.callback('left_clicked');
        }
      } else if (msg === 'right_clicked' || msg === 'selection_right_clicked') {
        const now = Date.now();
        if (now - this.lastTrigger < 200) return;
        this.lastTrigger = now;
        if (typeof this.callback === 'function') {
          this.callback('right_clicked');
        }
      }
    });

    const reset = () => {
      this.ready = false;
      this.proc = null;
    };
    this.proc.on('exit', reset);
    this.proc.on('error', reset);
  }

  stop() {
    if (!this.proc) return;
    try {
      this.proc.kill();
    } catch (_) {
      /* ignore */
    }
    this.proc = null;
    this.ready = false;
  }
}

const mouseMonitor = new MouseMonitor();

module.exports = {
  mouseMonitor
};
