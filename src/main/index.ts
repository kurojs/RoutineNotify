import { app, BrowserWindow, Notification, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Scheduler } from './scheduler'
import { generateMessage, buildAiPrompt, listGeminiModels } from './ai'
import { synthesizeSpeech } from './tts'
import { autoUpdater } from 'electron-updater'
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
  ImportResult,
  UpdaterEvent,
  AppInfo
} from '../shared/types'
import { isCustomSound, getCustomSoundName, migrateRoutine } from '../shared/types'

app.setName('Routine Notify')
app.setAppUserModelId('com.routine.notify')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Una sola instancia: evita notificaciones duplicadas cuando hay dos procesos
// corriendo con el mismo userData (ej. dev + app instalada).
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', () => {
  showMainWindow()
})

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
  geminiModel: 'gemini-2.5-flash',
  language: 'English',
  uiLanguage: 'en',
  theme: 'light',
  openAtLogin: false,
  aiPrompt: '',
  startInTray: false
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

function applyLoginItemSettings(openAtLogin: boolean): void {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return
  const options: Electron.Settings = {
    openAtLogin,
    openAsHidden: true
  }
  if (!app.isPackaged) {
    // En dev, process.execPath es electron.exe; hay que pasar el path de la app.
    options.path = process.execPath
    options.args = [app.getAppPath()]
  }
  app.setLoginItemSettings(options)
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
      sandbox: false,
      backgroundThrottling: false,
      devTools: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!currentSettings.startInTray) {
      mainWindow?.show()
    }
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

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
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

const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac'
}

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

async function fileToDataUrl(filePath: string, mime: string): Promise<string> {
  const buffer = await readFile(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

async function playAudio(filePath: string, cleanup: boolean): Promise<void> {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  const mime = AUDIO_MIME[ext] ?? 'audio/mpeg'
  try {
    const url = await fileToDataUrl(filePath, mime)
    mainWindow?.webContents.send('audio:play', { filePath, cleanup, url })
  } catch (error) {
    console.error('Failed to load audio file:', error)
  }
}

function sendTtsError(code: string, detail?: string): void {
  mainWindow?.webContents.send('tts:error', { code, detail })
}

function sendAiError(code: string, detail?: string): void {
  mainWindow?.webContents.send('ai:error', { code, detail })
}

function sendUpdaterEvent(event: UpdaterEvent): void {
  mainWindow?.webContents.send('updater:event', event)
}

function setupUpdater(): void {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterEvent({ type: 'checking' })
  })
  autoUpdater.on('update-available', (info) => {
    sendUpdaterEvent({ type: 'available', version: info.version })
  })
  autoUpdater.on('update-not-available', () => {
    sendUpdaterEvent({ type: 'not-available' })
  })
  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterEvent({ type: 'downloading', percent: progress.percent })
  })
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterEvent({ type: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    sendUpdaterEvent({ type: 'error', message: error.message })
  })
}

async function onRoutineTrigger(routine: Routine): Promise<void> {
  const { settings } = { settings: currentSettings }

  const aiReady = routine.useAI && settings.geminiApiKey && settings.elevenLabsApiKey
  let spokenMessage = routine.description?.trim() || routine.title

  if (aiReady) {
    try {
      const prompt = buildAiPrompt(routine, settings.language, settings.aiPrompt)
      const result = await generateMessage(
        settings.geminiApiKey,
        settings.geminiModel,
        prompt
      )
      spokenMessage = result.message
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      console.error('AI generation failed, using fallback message:', detail)
      const code = detail.includes('not configured') ? 'unknown' : detail
      sendAiError(code, detail)
    }
  }

  const customIconPath = routine.icon && routine.icon.includes('.')
    ? getCustomIconPath(routine.icon)
    : undefined

  const notificationBody = routine.description?.trim() || formatClock(routine.hour, routine.minute)
  showNotification(routine.title, notificationBody, customIconPath)

  if (routine.sound && isCustomSound(routine.sound)) {
    const soundPath = getCustomSoundPath(getCustomSoundName(routine.sound))
    await playAudio(soundPath, false)
  }

  if (aiReady) {
    try {
      const audio = await synthesizeSpeech(spokenMessage, settings.elevenLabsApiKey, settings.voiceId)
      await playAudio(audio.filePath, true)
    } catch (error) {
      const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'unknown'
      const detail = error instanceof Error ? error.message : String(error)
      console.error('TTS failed:', detail)
      sendTtsError(code, detail)
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
      routines = parsed.map(migrateRoutine)
      todos = await loadTodos()
    } else if (parsed && Array.isArray(parsed.routines)) {
      routines = parsed.routines.map(migrateRoutine)
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
    applyLoginItemSettings(settings.openAtLogin)
    return true
  })

  ipcMain.handle('ai:models', async () => {
    const key = currentSettings.geminiApiKey
    if (!key) return []
    try {
      return await listGeminiModels(key)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      sendAiError('unknown', detail)
      return []
    }
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

  ipcMain.handle('app:getInfo', (): AppInfo => ({
    version: app.getVersion(),
    homepage: 'https://github.com/kurojs/RoutineNotify'
  }))

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { ok: false }
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      sendUpdaterEvent({ type: 'error', message: detail })
      return { ok: false }
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) return { ok: false }
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      sendUpdaterEvent({ type: 'error', message: detail })
      return { ok: false }
    }
  })

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return { ok: false }
    setImmediate(() => {
      autoUpdater.quitAndInstall()
    })
    return { ok: true }
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
    fileBuffer: Uint8Array,
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
  ipcMain.handle('icons:url', async (_event, fileName: string) => {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    return fileToDataUrl(getCustomIconPath(fileName), IMAGE_MIME[ext] ?? 'image/png')
  })
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
  if (!hasSingleInstanceLock) return

  electronApp.setAppUserModelId('com.routine.notify')

  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  currentSettings = await loadSettings()
  currentRoutines = await loadRoutines()
  applyLoginItemSettings(currentSettings.openAtLogin)

  setupIpc()
  createMainWindow()
  createTray()
  setupUpdater()
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
