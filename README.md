# RoutineNotify

![GitHub License](https://img.shields.io/github/license/kurojs/RoutineNotify?style=for-the-badge&color=30363d&labelColor=21262d)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-30363d?style=for-the-badge&labelColor=21262d)
![UI Languages](https://img.shields.io/badge/ui-9%20languages-30363d?style=for-the-badge&labelColor=21262d)

Your routine shouldn't be a list you forget. RoutineNotify turns it into a voice that reminds you — on time, every time.

## Screenshots

<table align="center">
  <tr>
    <td width="33%"><img src="https://i.imgur.com/ho67x8e.png" alt="Routines overview" width="100%"></td>
    <td width="33%"><img src="https://i.imgur.com/y8NcBQ0.png" alt="Routine editor" width="100%"></td>
    <td width="33%"><img src="https://i.imgur.com/nhN14Qi.png" alt="Settings" width="100%"></td>
  </tr>
  <tr align="center">
    <td style="color: #5C6170;"><small>Routines overview</small></td>
    <td style="color: #5C6170;"><small>Routine editor</small></td>
    <td style="color: #5C6170;"><small>Settings</small></td>
  </tr>
  <tr>
    <td width="33%"><img src="https://i.imgur.com/kDWZrvk.png" alt="Tasks" width="100%"></td>
    <td width="33%"><img src="https://i.imgur.com/P0tbMJ2.png" alt="Windows notification" width="100%"></td>
    <td width="33%"></td>
  </tr>
  <tr align="center">
    <td style="color: #5C6170;"><small>Tasks</small></td>
    <td style="color: #5C6170;"><small>Windows notification</small></td>
    <td style="color: #5C6170;"><small></small></td>
  </tr>
</table>

## Features

- **Scheduled notifications** — set the exact time for each routine.
- **Custom sounds & icons** — attach your own audio and images.
- **AI messages** — Gemini writes the message, ElevenLabs reads it aloud.
- **Task list** — simple built-in to-do list.
- **System tray** — runs quietly in the background.
- **Full backup** — export/import everything in a single JSON file.
- **9 UI languages** — EN, ES, 日本語, FR, DE, IT, PT, 한국어, 中文.

## Installation

Download the installer from the [releases page](https://github.com/kurojs/RoutineNotify/releases):

- **Windows:** `RoutineNotify Setup <version>.exe`
- **macOS:** `RoutineNotify-<version>.dmg`
- **Linux:** `.AppImage` or `.deb`

## Quick start

1. Install and launch the app — it starts minimized in the system tray.
2. Double-click the tray icon to open the main window.
3. Go to **Routines → New routine**, set a time and a message, save, and keep the routine enabled.
4. You'll get a notification at the scheduled time with your sound.

## Usage

- **Routines** — create, edit, enable/disable and test your routines. Each one has a time, message, optional icon and sound, and an **AI message** toggle.
- **Tasks** — a lightweight to-do list; check items off as you finish them.
- **Settings** — API keys, voice, message language, UI language and theme.

The **AI message** toggle needs **both** API keys configured in Settings. If AI is disabled or a key is missing, the app uses the message you wrote.

## AI configuration

1. **Gemini API key** (writes messages) — free key at [aistudio.google.com](https://aistudio.google.com).
2. **ElevenLabs API key** (reads them aloud) — at [elevenlabs.io](https://elevenlabs.io).

Paste both in **Settings → AI assistant**, pick a voice and language, and enable AI on any routine.

## Import / Export

Use **Export** to save everything (routines, tasks, icons and sounds) into a single self-contained JSON file, and **Import** to restore it. API keys are never exported.

## Data storage

- **Windows:** `%APPDATA%\Routine Notify\`
- **macOS:** `~/Library/Application Support/Routine Notify/`
- **Linux:** `~/.config/Routine Notify/`

| File | Contents |
| --- | --- |
| `routines.json` | Your routines |
| `todos.json` | Your task list |
| `settings.json` | API keys, language and theme |
| `custom-icons/` | Uploaded images |
| `custom-sounds/` | Uploaded audio files |

## Development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run build:win   # Windows .exe
npm run build:mac   # macOS .dmg
npm run build:linux # Linux AppImage + .deb
```

## Tech stack

- **Electron 33** + **electron-vite**
- **React 19** + **Zustand**
- **Tailwind CSS 4** + **Radix UI**
- **Gemini API** — AI messages
- **ElevenLabs API** — text-to-speech

## License

MIT — see the [LICENSE](LICENSE) file.
