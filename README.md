# RoutineNotify

![GitHub License](https://img.shields.io/github/license/kurojs/RoutineNotify?style=for-the-badge&color=30363d&labelColor=21262d)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-30363d?style=for-the-badge&labelColor=21262d)
![UI Languages](https://img.shields.io/badge/ui-9%20languages-30363d?style=for-the-badge&labelColor=21262d)

A cross-platform desktop application that keeps you on track with your daily routine through **scheduled notifications**, **custom sounds**, **custom icons**, **AI-generated messages** and **text-to-speech voice**.

## Features

- **Scheduled notifications** — set the exact time for each routine.
- **Custom icons** — attach any image to a routine.
- **Custom sounds** — pick a built-in sound or upload your own audio file.
- **AI messages** — Gemini generates a fresh, motivational message for each routine.
- **Text-to-speech** — ElevenLabs reads the message aloud (only when AI is enabled).
- **Task list** — a simple built-in to-do list.
- **System tray** — runs quietly in the background and restores on double-click.
- **Full backup** — export/import everything (routines, tasks, images and sounds) in a single JSON file.
- **Cross-platform** — Windows, macOS and Linux.
- **9 UI languages** — English, Español, 日本語, Français, Deutsch, Italiano, Português, 한국어, 中文.

## Installation

Download the installer for your OS from the [releases page](https://github.com/kurojs/RoutineNotify/releases):

- **Windows:** `.exe` (NSIS installer)
- **macOS:** `.dmg`
- **Linux:** `.AppImage` or `.deb`

## Usage

1. Launch the app. It starts minimized in the system tray.
2. Open the main window (double-click the tray icon or right-click → *Open Settings*).
3. Go to **Routines** and create your first routine: pick a time, a message, an icon and a sound.
4. You'll get a notification at the scheduled time with the sound you chose.

### Creating a routine

Each routine has:

| Field | Description |
| --- | --- |
| **Hour / Minutes** | When the reminder fires (24h). |
| **Message** | The text shown in the notification. |
| **Icon** | Optional custom image (PNG, JPG, ICO, SVG, up to 2 MB). |
| **Sound** | `None`, one of the built-in sounds, or your own audio file (MP3, WAV, OGG, M4A, FLAC). |
| **AI message** | When enabled, Gemini writes the message and ElevenLabs reads it aloud. |

The **AI message** toggle needs **both** API keys configured in Settings. If AI is disabled (or a key is missing), the app uses the message you wrote — like a plain vanilla notification.

## AI configuration

Go to **Settings → AI assistant**:

1. **Gemini API key** — get a free key at [aistudio.google.com](https://aistudio.google.com).
2. **ElevenLabs API key** — get one at [elevenlabs.io](https://elevenlabs.io).

Both keys are required for AI messages. The **message language** selector controls the language Gemini writes in.

## Import / Export

Routines are stored locally as JSON files. You can export everything with the **Export** button and restore it with **Import**.

The exported file is a single JSON document (`.json`) with this shape:

```jsonc
{
  "version": 2,
  "exportedAt": "2026-08-07T12:00:00.000Z",
  "routines": [
    {
      "id": 1,
      "hour": 9,
      "minute": 0,
      "message": "Morning routine",
      "icon": "custom_ab12cd34ef56.png",
      "sound": "chime",                 // preset name, "file:custom_....wav", or ""
      "enabled": true,
      "useAI": false
    }
  ],
  "todos": [
    {
      "id": 1,
      "text": "Drink water",
      "completed": false,
      "createdAt": "2026-08-07T11:00:00.000Z",
      "completedAt": null
    }
  ],
  "icons": [
    { "name": "custom_ab12cd34ef56.png", "data": "<base64>" }
  ],
  "sounds": [
    { "name": "custom_7890xyz.wav", "data": "<base64>" }
  ]
}
```

What is included:

- **Every field of every routine** — time, message, icon, sound, enabled state and the AI toggle.
- **Every task** with its completion state (`completed` / `completedAt`).
- **Custom images and sounds** are embedded as base64 inside the same file, so the backup is **self-contained**: importing it on another machine restores the files too.

The export captures only the assets actually referenced by your routines. On import, custom files are written back into the app's `user-data` directory and referenced again. API keys are **never** exported.

> Old v1 backups (a plain array of routines, without `version`) are still importable.

## Data storage

Data is stored in the Electron `userData` directory for your platform:

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
# install dependencies
npm install

# run in development (also regenerates preset sounds)
npm run dev

# typecheck
npm run typecheck

# build (non-packaged)
npm run build

# package installers
npm run build:win   # Windows .exe
npm run build:mac   # macOS .dmg
npm run build:linux # Linux AppImage + .deb
```

The built-in sounds are synthesized at build time by `scripts/generate-sounds.cjs` (`npm run sounds`). No external audio assets are committed.

## Tech stack

- **Electron 33** + **electron-vite**
- **React 19** + **Zustand**
- **Tailwind CSS 4** + **shadcn/ui**-style components (Radix UI)
- **Gemini API** (`gemini-2.5-flash`) for AI messages
- **ElevenLabs API** (`eleven_flash_v2_5`) for text-to-speech

## License

MIT — see the [LICENSE](LICENSE) file.
