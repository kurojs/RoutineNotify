# RoutineNotify

![GitHub License](https://img.shields.io/github/license/kurojs/RoutineNotify?style=for-the-badge&color=30363d&labelColor=21262d)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-30363d?style=for-the-badge&labelColor=21262d)
![UI Languages](https://img.shields.io/badge/ui-9%20languages-30363d?style=for-the-badge&labelColor=21262d)

**RoutineNotify** is a cross-platform desktop app that keeps you on track with your daily routine. You schedule a time, and it reminds you with a **notification**, a **custom sound**, and optionally an **AI-written message** read aloud with **text-to-speech**.

---

## Screenshots

<table>
  <tr>
    <td width="33%">
      <img src="https://i.imgur.com/ho67x8e.png" width="100%" alt="Routines view">
      <p align="center"><strong>Routines</strong><br>Your schedule at a glance. Each routine shows its time, icon, sound and AI status, with one-click enable/disable.</p>
    </td>
    <td width="33%">
      <img src="https://i.imgur.com/y8NcBQ0.png" width="100%" alt="Edit routine dialog">
      <p align="center"><strong>Edit routine</strong><br>Create or edit a routine: pick the time, message, icon, sound and whether an AI message should be generated.</p>
    </td>
    <td width="33%">
      <img src="https://i.imgur.com/nhN14Qi.png" width="100%" alt="Settings view">
      <p align="center"><strong>Settings</strong><br>Configure your Gemini and ElevenLabs API keys, pick the UI language and switch between light and dark theme.</p>
    </td>
  </tr>
  <tr>
    <td width="33%">
      <img src="https://i.imgur.com/kDWZrvk.png" width="100%" alt="Tasks view">
      <p align="center"><strong>Tasks</strong><br>A simple built-in to-do list to keep track of what's left for the day.</p>
    </td>
    <td width="33%">
      <img src="https://i.imgur.com/P0tbMJ2.png" width="100%" alt="Windows notification">
      <p align="center"><strong>Notification</strong><br>What you see when a routine fires: the message, your custom icon, and your chosen sound.</p>
    </td>
    <td width="33%"></td>
  </tr>
</table>

---

## Features

- **Scheduled notifications** — set the exact time for each routine (24h).
- **Custom sounds** — attach your own audio file (MP3, WAV, OGG, M4A, FLAC) to any routine.
- **Custom icons** — attach any image (PNG, JPG, ICO, SVG) to a routine.
- **AI messages** — Gemini generates a fresh, motivational message for each routine.
- **Text-to-speech** — ElevenLabs reads the message aloud.
- **Task list** — a simple built-in to-do list.
- **System tray** — runs quietly in the background and restores on double-click.
- **Full backup** — export and import everything (routines, tasks, images and sounds) in a single JSON file.
- **Cross-platform** — Windows, macOS and Linux.
- **9 UI languages** — English, Español, 日本語, Français, Deutsch, Italiano, Português, 한국어, 中文.

---

## Installation

Download the installer for your OS from the [releases page](https://github.com/kurojs/RoutineNotify/releases):

| OS | File |
| --- | --- |
| **Windows** | `RoutineNotify Setup <version>.exe` (NSIS installer) |
| **macOS** | `RoutineNotify-<version>.dmg` |
| **Linux** | `.AppImage` or `.deb` |

> On Windows, if you see a SmartScreen warning, click **More info → Run anyway**. The app is not code-signed yet.

---

## Quick start

1. **Install** the app and launch it. It starts minimized in the system tray.
2. **Open the main window** — double-click the tray icon, or right-click it → *Open*.
3. Go to **Routines → New routine**, pick a time and a message, save, and make sure the routine is **enabled**.
4. When the time comes, you'll get a notification with your sound.

---

## How to use

### Routines

The **Routines** tab is the heart of the app. It lists every routine with its time, icon, sound and AI state.

- **New routine** / **edit** (pencil icon) — opens the *Edit routine* dialog.
- **Enable / disable** — toggle a routine on or off without deleting it. Disabled routines never fire.
- **Delete** (trash icon) — removes the routine permanently.
- **Test** — fires the routine immediately, so you can preview the notification, sound and AI message.

Each routine has the following fields:

| Field | Description |
| --- | --- |
| **Hour / Minutes** | When the reminder fires (24h format). |
| **Message** | The text shown in the notification. |
| **Icon** | Optional custom image (PNG, JPG, ICO, SVG, up to 2 MB). |
| **Sound** | `None` or one of the built-in sounds, or your own audio file (MP3, WAV, OGG, M4A, FLAC). |
| **AI message** | When enabled, Gemini writes the message and ElevenLabs reads it aloud. |

### Tasks

The **Tasks** tab is a lightweight to-do list:

- **Add** a task with the input at the top and press **Enter**.
- **Check** a task to mark it done — it moves to the bottom with a strikethrough.
- **Delete** a task with the trash icon.

Tasks are saved automatically. There is no scheduling attached to them — they are a plain checklist.

### Settings

| Section | What it does |
| --- | --- |
| **AI assistant** | Your Gemini and ElevenLabs API keys, the Gemini model, the voice used for speech, and the message language. |
| **General** | UI language and light/dark theme. |

### System tray

- The app keeps running in the tray even when you close the window.
- **Double-click** the tray icon to open the main window.
- **Right-click** for *Open*, *Open Settings* and *Quit*.
- **Close** the window (✕) hides it to the tray; use **Quit** from the tray to fully exit.

---

## AI configuration

The AI features need **two API keys**:

1. **Gemini API key** (writes the messages) — get a free key at [aistudio.google.com](https://aistudio.google.com).
2. **ElevenLabs API key** (reads the messages aloud) — get one at [elevenlabs.io](https://elevenlabs.io).

Setup checklist:

- [ ] Open **Settings → AI assistant**.
- [ ] Paste the **Gemini API key**.
- [ ] Paste the **ElevenLabs API key**.
- [ ] Pick the **voice** you want the app to speak with.
- [ ] Pick the **message language** Gemini should write in.
- [ ] Enable the **AI message** toggle on any routine.

> **Both keys are required** for AI messages. If AI is disabled on a routine — or a key is missing — the app just shows the message you wrote, like a plain vanilla notification. That's the expected fallback.

---

## Custom sounds and icons

You can upload your own **audio files** and **images** while creating or editing a routine:

- **Sounds**: MP3, WAV, OGG, OGA, M4A, FLAC.
- **Icons**: PNG, JPG, JPEG, ICO, SVG (up to 2 MB).

Uploaded files are stored inside the app's `user-data` directory and referenced by name. That means the app works across devices **without hard-coded paths** — and because they travel with your backup (see below), you can move to another machine and everything still works.

---

## Import / Export

Use the **Export** and **Import** buttons to move your data between machines or keep a backup.

- **Export** saves a single self-contained JSON file with your routines, tasks, custom icons and custom sounds.
- **Import** restores everything from that file. Old v1 backups (a plain array of routines, without `version`) are still importable.
- **API keys are never exported.**

The exported file has this shape:

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
      "sound": "file:custom_....wav",     // "" or "file:<custom-file>"
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

Only the assets actually referenced by your routines are embedded. On import, custom files are written back into the app's `user-data` directory.

---

## Data storage

RoutineNotify stores data in the Electron `userData` directory for your platform:

- **Windows:** `%APPDATA%\Routine Notify\`
- **macOS:** `~/Library/Application Support/Routine Notify/`
- **Linux:** `~/.config/Routine Notify/`

| File / folder | Contents |
| --- | --- |
| `routines.json` | Your routines |
| `todos.json` | Your task list |
| `settings.json` | API keys, language and theme |
| `custom-icons/` | Uploaded images |
| `custom-sounds/` | Uploaded audio files |

> Deleting this folder resets the app completely. Make an export first if you care about the data.

---

## Development

Requirements: Node.js 18+ and npm.

```bash
# install dependencies
npm install

# run in development
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

## Tech stack

- **Electron 33** + **electron-vite**
- **React 19** + **Zustand**
- **Tailwind CSS 4** + **shadcn/ui**-style components (Radix UI)
- **Gemini API** (`gemini-2.5-flash`) for AI messages
- **ElevenLabs API** (`eleven_flash_v2_5`) for text-to-speech

---

## License

MIT — see the [LICENSE](LICENSE) file.
