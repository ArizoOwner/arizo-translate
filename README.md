<div align="center">

# 🏝️ Arizo Translate
### Dynamic Island AI Translation Assistant for Windows 10 & 11

[![Language: English](https://img.shields.io/badge/Language-English-blue.svg)](#)
[![زبان: فارسی](https://img.shields.io/badge/زبان-فارسی-emerald.svg)](README.fa.md)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white)](https://github.com/ArizoOwner/arizo-translate/releases)
[![Electron](https://img.shields.io/badge/Electron-44.5.1-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.0.0-8b5cf6?logo=github)](https://github.com/ArizoOwner/arizo-translate/releases)

<p align="center">
  <b>Ultra-fast, distraction-free, and intelligent bidirectional translation right on top of any Windows application.</b><br/>
  <i>Featuring floating Dynamic Island UI, animated cartoon mascot Mochi, in-place text replacement, and dual AI engines.</i>
</p>

<!-- Language Switcher Bar -->
<p align="center">
  <b>🌐 Language:</b> 
  <a href="README.md"><b>English</b></a> • 
  <a href="README.fa.md"><b>فارسی (Persian)</b></a>
</p>

<!-- HERO SHOWCASE BANNER -->
<p align="center">
  <img src="docs/assets/arizo-island-hero.svg" alt="Arizo Translate Dynamic Island Showcase" width="100%" style="border-radius: 16px; max-width: 960px;" />
</p>

[✨ Key Features](#-key-features) • [🤖 Interactive Mascot](#-meet-mochi--interactive-mascot) • [🌓 Dark & Light Themes](#-high-contrast-day--night-themes) • [📥 Downloads](#-download-ready-to-run-releases) • [⌨️ Shortcuts](#️-global-keyboard-shortcuts) • [🛠️ Build Guide](#️-development--build)

---

</div>

<br/>

<!-- 3 MODES SHOWCASE -->
<p align="center">
  <img src="docs/assets/arizo-features-showcase.svg" alt="Arizo Translate Interaction Modes" width="100%" style="border-radius: 16px; max-width: 960px;" />
</p>

---

## 💡 Why Arizo Translate?

Switching back and forth between browser tabs, translation portals, and workspace windows creates cognitive friction, slows down typing speed, and breaks deep work focus.

**Arizo Translate** solves this natively on Windows. Inspired by the sleek **Dynamic Island** concept, it hovers gently at the top of your screen, never steals focus involuntarily, and is ready on a single keystroke or mouse right-click to translate and replace text right inside the field you are working in.

---

## ✨ Key Features

### 🏝️ 1. Floating Dynamic Island (Solid Matte Finish)
- **Zero Shadow Clipping:** Configured with native DWM frameless optimization (`thickFrame: false` & `hasShadow: false`) to completely eliminate rectangular shadow artifacts and border cutoffs on Windows.
- **Solid Non-Transparent Backdrop:** High-opacity matte dark and light cards so underlying background windows and open apps never leak through.
- **Fluid Elastic Animations:** Expanding and collapsing smoothly between compact pill capsule mode (`Ctrl + M`) and full island mode.

### ⚡ 2. Instant In-Place Translation (`Alt + Shift + D`)
- Translate directly inside any input box in **Telegram, Discord, Microsoft Word, WhatsApp, Web Forms, Notepad, or IDEs**.
- Simply type your text, press **`Alt + Shift + D`**, and watch it automatically transform into natural, fluent English or Persian without opening any auxiliary window!

### 🎯 3. Smart Contextual Floating Bubble
- Highlight text anywhere on your screen and right-click; a compact floating quick-translate button appears gently next to your cursor.
- **Zero False Triggers:** The bubble **only appears when actual text is highlighted**. Standard right-clicks on empty desktop areas or app menus remain completely untouched.
- **Zero Clipboard Leak:** Built with an asynchronous sentinel isolation buffer that guarantees your original clipboard contents are never polluted or overwritten.

### 🤖 4. Meet Mochi – Animated Interactive Mascot
<div align="center">
  <a href="docs/assets/mascot-interactive.html" target="_blank">
    <img src="docs/assets/mochi-mascot.svg" alt="Mochi Interactive Mascot" width="220" height="220" style="margin: 12px 0;" />
  </a>
  <p><i>Mochi breathes, blinks realistically, and looks around smoothly! <a href="docs/assets/mascot-interactive.html">👉 Open Interactive Mouse-Tracking Web Demo</a></i></p>
</div>

- Vector-animated cartoon companion rendered in the top corner of the Dynamic Island.
- Dynamically moves eyes and body kinematics based on your cursor location.
- Winks, blushes, smiles, and celebrates when you copy or clean text.

---

## 🌓 High-Contrast Day & Night Themes

Choose between **Dark Mode**, **Light Mode**, or **Follow Windows System Theme** with zero color clash or readability defects:

<p align="center">
  <img src="docs/assets/theme-showcase.svg" alt="Arizo Translate Day & Night Themes" width="100%" style="border-radius: 16px; max-width: 960px;" />
</p>

- **🌙 Dark Theme (Default):** Deep midnight slate (`#0c0e17`) with violet/indigo accents and crisp white typography.
- **☀️ Light Theme:** Clean matte alpine (`#ffffff` / `#f8fafc`) with deep navy text (`#0f172a`) and high contrast ratio conforming to WCAG standards.
- **💻 Follow System:** Automatically detects Windows 10/11 system dark/light mode switches in real time.

---

## 🌍 In-App Interface Language Switcher

Arizo Translate supports full bilingual UI localization:
- **فارسی (Persian):** Full RTL layout with native Vazirmatn typography.
- **English:** Full LTR layout with modern Plus Jakarta Sans typography.
- Switch instantly inside **Settings (`Ctrl + ,`)** with live immediate re-rendering.

---

## 🧠 Dual Translation Engines

| Engine | Characteristics | Best For |
| :--- | :--- | :--- |
| **⚡ Google Instant** | Under 150ms latency, zero API key required, 100% free, unlimited queries. | Daily web browsing, quick chats, short phrases. |
| **✦ Arizo AI (Aphra)** | Agentic multi-step reasoning (Analyze → Context → Translate → Critique → Refine), cultural nuance breakdown, tone adjustment. | Literary texts, slang, idioms, software code, formal emails. |

### Supported AI Providers
- **Google Gemini** (`gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-3.8-pro`)
- **DeepSeek** (`deepseek-chat`)
- **OpenRouter** (All top models)
- **Groq** (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`)
- **OpenAI** (`gpt-4o-mini`, `gpt-4o`)
- **Ollama / Local LLMs** (Offline, completely private, no API key required)

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Alt + D`** | **Toggle Island** | Opens or hides the top Dynamic Island anywhere in Windows |
| **`Alt + Shift + D`** | **In-Place Translate** | Translates text directly in Telegram, Word, browser inputs |
| **`Ctrl + Tab`** | **Switch Engine** | Toggles between Instant Google and Smart Aphra AI |
| **`Ctrl + S`** | **Swap Languages** | Reverses language direction (e.g., EN ⇄ FA) |
| **`Ctrl + M`** | **Capsule Mode** | Collapses the island into a discreet floating mini capsule |
| **`Enter`** | **Copy & Hide** | Copies the translated text and smoothly hides the island |
| **`Ctrl + Enter`** | **Replace in App** | Pastes the translation directly back into your previous active app |
| **`Esc`** | **Close / Dismiss** | Closes modals or hides the island to the notification tray |

---

## 📥 Download Ready-to-Run Releases

You can download prebuilt production binaries directly from [GitHub Releases](https://github.com/ArizoOwner/arizo-translate/releases):

| Package | Format | File Name | Description |
| :--- | :--- | :--- | :--- |
| **Windows Installer** | NSIS `.exe` | `Arizo-Translate-Setup-2.0.0.exe` | Standard Windows setup with desktop and start menu shortcuts |
| **Windows Portable** | Portable `.exe` | `Arizo-Translate-2.0.0-Portable.exe` | Standalone portable executable requiring zero installation |

---

## 🛠️ Development & Build

### Prerequisites
- Node.js 20.0 or higher
- Windows 10 / 11 64-bit

### 1. Clone the repository
```bash
git clone https://github.com/ArizoOwner/arizo-translate.git
cd arizo-translate
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development mode
```bash
npm start
```

### 4. Run automated test suite
```bash
npm test
```

### 5. Build production Windows executables
```bash
npm run dist
```
The output installers and portable binaries will be generated inside the `dist/` directory.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Built with ❤️ by ArizoOwner.
