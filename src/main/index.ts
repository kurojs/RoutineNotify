import { app, BrowserWindow, Notification, Tray, Menu, ipcMain, nativeImage, shell } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Scheduler } from './scheduler'
import { generateMessage, buildAiPrompt } from './ai'
import { synthesizeSpeech } from './tts'
import {
  loadRoutines,
  saveRoutines,
  loadTodos,
  saveTodos,
  loadSettings,
  saveSettings
} from './storage'
import type {
  Routine,
  Todo,
  Settings,
  BackupFile,
  BackupData,
  ImportResult
} from '../shared/types'
import { isSoundPreset, isCustomSound, getCustomSoundName } from '../shared/types'

app.setName('Routine Notify')
app.setAppUserModelId('com.routine.notify')

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false
const activeNotifications = new Set<Notification>()

const scheduler = new Scheduler(onRoutineTrigger)
let currentRoutines: Routine[] = []
let currentSettings: Settings = {
  geminiApiKey: '',
  elevenLabsApiKey: '',
  voiceId: 'h3KZVBOooxHZiKRxnsdE',
  language: 'English',
  uiLanguage: 'en',
  theme: 'light'
}

function getIconPath(): string | null {
  const isWindows = process.platform === 'win32'
  const fileName = isWindows ? 'icon.ico' : 'icon.png'
  if (!app.isPackaged) {
    return join(__dirname, '../../build', fileName)
  }
  return join(process.resourcesPath, fileName)
}

function createTray(): void {
  const iconPath = getIconPath()
  let trayIcon: Electron.Tray | null = null

  try {
    if (iconPath) {
      trayIcon = new Tray(iconPath)
    } else {
      trayIcon = new Tray(nativeImage.createEmpty())
    }
  } catch {
    trayIcon = new Tray(nativeImage.createEmpty())
  }

  tray = trayIcon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => {
        showMainWindow()
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('Routine Notify')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', showMainWindow)
}

function showMainWindow(): void {
  if (mainWindow) {
    mainWindow.show()
  } else {
    createMainWindow()
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: getIconPath() ?? undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showNotification(title: string, message: string, iconPath?: string): void {
  if (!Notification.isSupported()) return

  const options: Electron.NotificationConstructorOptions = {
    title,
    body: message,
    silent: true
  }
  if (iconPath && iconPath.includes('.')) {
    options.icon = iconPath
  }
  const notification = new Notification(options)
  activeNotifications.add(notification)
  notification.on('close', () => {
    activeNotifications.delete(notification)
  })
  notification.show()
}

function getCustomIconPath(iconName: string): string {
  return join(app.getPath('userData'), 'custom-icons', iconName)
}

function getCustomSoundPath(soundName: string): string {
  return join(app.getPath('userData'), 'custom-sounds', soundName)
}

function getCustomIconDir(): string {
  return join(app.getPath('userData'), 'custom-icons')
}

function getCustomSoundDir(): string {
  return join(app.getPath('userData'), 'custom-sounds')
}

function getPresetSoundPath(preset: string): string {
  if (!app.isPackaged) {
    return join(__dirname, '../../build/sounds', `${preset}.wav`)
  }
  return join(process.resourcesPath, 'sounds', `${preset}.wav`)
}

async function playAudio(filePath: string, cleanup: boolean): Promise<void> {
  mainWindow?.webContents.send('audio:play', { filePath, cleanup, url: pathToFileURL(filePath).href })
}

async function onRoutineTrigger(routine: Routine): Promise<void> {
  const { settings } = { settings: currentSettings }
  let message = routine.message

  const aiReady = routine.useAI && settings.geminiApiKey && settings.elevenLabsApiKey
  if (aiReady) {
    try {
      const prompt = buildAiPrompt(routine, settings.language, routine.message)
      const result = await generateMessage(settings.geminiApiKey, prompt)
      message = result.message
    } catch (error) {
      console.error('AI generation failed, using fallback message:', error)
      message = routine.message
    }
  }

  const customIconPath = routine.icon && routine.icon.includes('.')
    ? getCustomIconPath(routine.icon)
    : undefined

  showNotification(routine.message, message, customIconPath)

  if (routine.sound) {
    const soundPath = isSoundPreset(routine.sound)
      ? getPresetSoundPath(routine.sound)
      : isCustomSound(routine.sound)
        ? getCustomSoundPath(getCustomSoundName(routine.sound))
        : null
    if (soundPath) {
      await playAudio(soundPath, false)
    }
  }

  if (aiReady) {
    try {
      const audio = await synthesizeSpeech(message, settings.elevenLabsApiKey, settings.voiceId)
      await playAudio(audio.filePath, true)
    } catch (error) {
      console.error('TTS failed:', error)
    }
  }
}

function setupIpc(): void {
  ipcMain.handle('routines:get', async () => currentRoutines)
  ipcMain.handle('routines:save', async (_event, routines: Routine[]) => {
    currentRoutines = routines
    await saveRoutines(routines)
    scheduler.setRoutines(routines)
    return true
  })

  ipcMain.handle('routines:test', async (_event, routine: Routine) => {
    await onRoutineTrigger(routine)
    return true
  })

  ipcMain.handle('routines:export', async () => {
    const { readFile, readdir, writeFile } = await import('fs/promises')
    const { dialog } = await import('electron')
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export routines',
      defaultPath: join(app.getPath('documents'), 'routine-notify-backup.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false

    const iconsDir = getCustomIconDir()
    const soundsDir = getCustomSoundDir()

    async function collectAssets(
      dir: string,
      referenced: string[]
    ): Promise<BackupFile[]> {
      try {
        const files = await readdir(dir)
        const wanted = new Set(referenced.filter(Boolean))
        const assets: BackupFile[] = []
        for (const file of files) {
          if (wanted.has(file)) {
            const buffer = await readFile(join(dir, file))
            assets.push({ name: file, data: buffer.toString('base64') })
          }
        }
        return assets
      } catch {
        return []
      }
    }

    const iconRefs = currentRoutines.map((r) => r.icon)
    const soundRefs = currentRoutines
      .map((r) => (isCustomSound(r.sound) ? getCustomSoundName(r.sound) : ''))
      .filter(Boolean)

    const backup: BackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      routines: currentRoutines,
      todos: await loadTodos(),
      icons: await collectAssets(iconsDir, iconRefs),
      sounds: await collectAssets(soundsDir, soundRefs)
    }

    await writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf8')
    return true
  })

  ipcMain.handle('routines:import', async () => {
    const { readFile, mkdir, writeFile } = await import('fs/promises')
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import routines',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const raw = await readFile(result.filePaths[0], 'utf8')
    const parsed = JSON.parse(raw) as BackupData | Routine[]

    async function restoreAssets(assets: BackupFile[] | undefined, dir: string): Promise<void> {
      if (!Array.isArray(assets)) return
      await mkdir(dir, { recursive: true })
      for (const asset of assets) {
        await writeFile(join(dir, asset.name), Buffer.from(asset.data, 'base64'))
      }
    }

    let routines: Routine[]
    let todos: Todo[]

    if (Array.isArray(parsed)) {
      routines = parsed
      todos = await loadTodos()
    } else if (parsed && Array.isArray(parsed.routines)) {
      routines = parsed.routines
      todos = Array.isArray(parsed.todos) ? parsed.todos : await loadTodos()
      await restoreAssets(parsed.icons, getCustomIconDir())
      await restoreAssets(parsed.sounds, getCustomSoundDir())
    } else {
      throw new Error('Invalid file format')
    }

    currentRoutines = routines.map((r) => ({
      ...r,
      sound: r.sound ?? '',
      useAI: r.useAI ?? false,
      enabled: true
    }))
    await saveRoutines(currentRoutines)
    await saveTodos(todos)
    scheduler.setRoutines(currentRoutines)
    return { routines: currentRoutines, todos } satisfies ImportResult
  })

  ipcMain.handle('todos:get', () => loadTodos())
  ipcMain.handle('todos:save', (_event, todos: Todo[]) => saveTodos(todos))

  ipcMain.handle('settings:get', () => currentSettings)
  ipcMain.handle('settings:save', async (_event, settings: Settings) => {
    currentSettings = settings
    await saveSettings(settings)
    return true
  })

  ipcMain.handle('tts:cleanup', async (_event, filePath: string) => {
    try {
      const { unlink } = await import('fs/promises')
      await unlink(filePath)
    } catch {
      // already gone
    }
    return true
  })

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    const { shell } = await import('electron')
    await shell.openExternal(url)
    return true
  })

  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac']

  const listCustomAssets = async (
    dir: string,
    extensions: string[]
  ): Promise<string[]> => {
    try {
      const { readdir } = await import('fs/promises')
      const files = await readdir(dir)
      return files.filter((file) =>
        extensions.includes(file.slice(file.lastIndexOf('.')).toLowerCase())
      )
    } catch {
      return []
    }
  }

  const saveCustomAsset = async (
    fileBuffer: Buffer,
    fileName: string,
    dir: string
  ): Promise<string> => {
    const { createHash } = await import('crypto')
    const { writeFile, mkdir } = await import('fs/promises')
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    const hash = createHash('md5').update(fileBuffer).digest('hex')
    const customFileName = `custom_${hash}${ext}`
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, customFileName), fileBuffer)
    return customFileName
  }

  ipcMain.handle('icons:list', () => listCustomAssets(getCustomIconDir(), ['.png', '.jpg', '.jpeg', '.ico', '.svg']))
  ipcMain.handle('icons:url', (_event, fileName: string) =>
    pathToFileURL(getCustomIconPath(fileName)).href
  )
  ipcMain.handle('icons:save', (_event, buffer: Buffer, fileName: string) =>
    saveCustomAsset(buffer, fileName, getCustomIconDir())
  )

  ipcMain.handle('sounds:list', () => listCustomAssets(getCustomSoundDir(), AUDIO_EXTENSIONS))
  ipcMain.handle('sounds:path', (_event, fileName: string) => getCustomSoundPath(fileName))
  ipcMain.handle('sounds:save', (_event, buffer: Buffer, fileName: string) =>
    saveCustomAsset(buffer, fileName, getCustomSoundDir())
  )
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.routine.notify')

  if (is.dev && process.platform === 'win32') {
    try {
      const { existsSync } = await import('fs')
      const aumid = process.execPath
      const shortcutPath = join(
        app.getPath('appData'),
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Routine Notify.lnk'
      )
      if (!existsSync(shortcutPath)) {
        const ok = shell.writeShortcutLink(shortcutPath, 'create', {
          target: process.execPath,
          args: `"${app.getAppPath()}"`,
          appUserModelId: aumid,
          description: 'Routine Notify',
          icon: getIconPath() ?? process.execPath
        })
        console.log('[notify] dev shortcut created:', ok)
      }
    } catch (error) {
      console.error('[notify] failed to create dev shortcut:', error)
    }
  }
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  currentSettings = await loadSettings()
  currentRoutines = await loadRoutines()

  setupIpc()
  createMainWindow()
  createTray()
  scheduler.setRoutines(currentRoutines)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  const { rm } = require('fs') as typeof import('fs')
  rm(join(app.getPath('temp'), 'routine-notify'), { recursive: true, force: true }, () => {
    // best-effort cleanup
  })
})
