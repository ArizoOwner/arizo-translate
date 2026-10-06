/* Hotkey recorder: click the field, press a combination. Exposes window.HotkeyField. */
(function () {
  const NAMED = {
    Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/'
  };

  function keyName(code) {
    let m;
    if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
    if ((m = /^Digit(\d)$/.exec(code))) return m[1];
    if ((m = /^Numpad(\d)$/.exec(code))) return `num${m[1]}`;
    if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
    return NAMED[code] || null;
  }

  function modifiers(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');
    return parts;
  }

  function attach(input, { onInvalid, onChange } = {}) {
    let recording = false;
    let previous = input.value;

    function stop(value) {
      recording = false;
      input.classList.remove('recording');
      input.value = value;
      input.blur();
    }

    input.addEventListener('click', () => {
      if (recording) return;
      recording = true;
      previous = input.value;
      input.classList.add('recording');
      input.value = 'کلید ترکیبی را بزنید…';
    });

    // Capture phase: we must run before the window-level shortcuts of the app.
    window.addEventListener(
      'keydown',
      (e) => {
        if (!recording) return;
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') return stop(previous);
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; // modifiers alone

        const key = keyName(e.code);
        const mods = modifiers(e);
        if (!key) return onInvalid && onInvalid('این کلید پشتیبانی نمی‌شود');
        if (!mods.length && !/^F\d/.test(key)) return onInvalid && onInvalid('حداقل یکی از کلیدهای Ctrl / Alt / Shift لازم است');

        const accelerator = [...mods, key].join('+');
        stop(accelerator);
        if (onChange) onChange(accelerator);
      },
      true
    );

    input.addEventListener('blur', () => {
      if (recording) stop(previous);
    });

    return {
      get recording() {
        return recording;
      }
    };
  }

  window.HotkeyField = { attach };
})();
