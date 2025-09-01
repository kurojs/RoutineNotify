const { app, BrowserWindow, Notification, Tray, Menu, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const os = require('os');

app.setName('Routine Notify');
app.setAppUserModelId('com.routine.notify');

let tray = null;
let mainWindow = null;
let notifications = [];
let isQuitting = false;

function getIconPath() {
    if (!app.isPackaged) {
        return path.join(__dirname, '..', 'build', 'icon.png');
    }
    
    const asarIconPath = path.join(process.resourcesPath, 'app.asar', 'build', 'icon.png');
    
    const resourceIconPath = path.join(process.resourcesPath, 'icon.png');
    
    try {
        require('fs').accessSync(asarIconPath);
        return asarIconPath;
    } catch {
        try {
            require('fs').accessSync(resourceIconPath);
            return resourceIconPath;
        } catch {

            return null;
        }
    }
}

function getDataPath() {
    if (process.platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'RoutineNotify');
    } else if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'RoutineNotify');
    } else {
        return path.join(os.homedir(), '.config', 'RoutineNotify');
    }
}

const dataPath = getDataPath();
const notificationsPath = path.join(dataPath, 'notifications.json');
const todosPath = path.join(dataPath, 'todos.json');
const customIconsPath = path.join(dataPath, 'custom-icons');

async function ensureDataDirectory() {
    try {
        await fs.access(dataPath);
    } catch {
        await fs.mkdir(dataPath, { recursive: true });
    }
    
    try {
        await fs.access(customIconsPath);
    } catch {
        await fs.mkdir(customIconsPath, { recursive: true });
    }
}

async function loadNotifications() {
    try {
        const data = await fs.readFile(notificationsPath, 'utf8');
        notifications = JSON.parse(data);
    } catch (error) {
        notifications = [
            { id: 1, hour: 9, minute: 0, message: 'Morning routine', icon: '', enabled: true },
            { id: 2, hour: 18, minute: 0, message: 'Evening break', icon: '', enabled: true }
        ];
        await saveNotifications();
    }
}

async function saveNotifications() {
    try {
        await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving notifications:', error);
    }
}

async function loadTodos() {
    try {
        const data = await fs.readFile(todosPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveTodos(todos) {
    try {
        await fs.writeFile(todosPath, JSON.stringify(todos, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving todos:', error);
    }
}

function createTray() {
    const iconPath = getIconPath();
    
    if (iconPath) {
        try {
            tray = new Tray(iconPath);
        } catch (error) {
            console.error('Failed to create tray with icon:', error);
            tray = new Tray(nativeImage.createEmpty());
        }
    } else {
        tray = new Tray(nativeImage.createEmpty());
    }
    
    const contextMenu = Menu.buildFromTemplate([
        {  
            label: 'Open Settings',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createMainWindow();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('Routine Notify');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
        } else {
            createMainWindow();
        }
    });
}

function createMainWindow() {
    const iconPath = getIconPath();
    
    const windowOptions = {
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false,
        autoHideMenuBar: true
    };
    
    if (iconPath) {
        windowOptions.icon = iconPath;
    }
    
    mainWindow = new BrowserWindow(windowOptions);

    mainWindow.setMenu(null);

    mainWindow.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function showNotification(message, iconName) {
    let iconPath = null;
    
    if (iconName && iconName !== '' && iconName !== 'undefined' && iconName.includes('.')) {
        const customIconPath = path.join(customIconsPath, iconName);
        try {
            await fs.access(customIconPath);
            iconPath = customIconPath;
        } catch {
            console.log(`Custom icon ${iconName} not found, showing notification without icon`);
            iconPath = null;
        }
    }
    
    const notificationOptions = {
        title: 'Routine Notify',
        body: message,
        silent: false
    };
    

    if (iconPath) {
        notificationOptions.icon = iconPath;
        console.log(`Showing notification with icon: ${iconPath}`);
    } else {
        console.log('Showing notification without icon');
    }
    
    const notification = new Notification(notificationOptions);
    notification.show();
}

function scheduleNotifications() {
    const activeNotifications = notifications.filter(notif => notif.enabled);
    
    activeNotifications.forEach(notif => {
    const now = new Date();
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), notif.hour, notif.minute, 0);

    if (targetTime > now) {
    let delay = targetTime - now;
    setTimeout(async () => await showNotification(notif.message, notif.icon), delay);
    }
    });
}

ipcMain.handle('get-notifications', () => notifications);
ipcMain.handle('save-notifications', async (event, newNotifications) => {
    notifications = newNotifications;
    await saveNotifications();
    scheduleNotifications(); 
    return true;
});

ipcMain.handle('get-todos', () => loadTodos());
ipcMain.handle('save-todos', (event, todos) => saveTodos(todos));

ipcMain.handle('get-available-icons', async () => {
    try {
        const customIcons = await fs.readdir(customIconsPath);
        const validIcons = customIcons.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.ico', '.svg'].includes(ext);
        });
        
        return validIcons;
    } catch {
        return [];
    }
});

ipcMain.handle('save-custom-icon', async (event, fileBuffer, fileName) => {
    try {
        const fileExtension = path.extname(fileName);
        const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const customFileName = `custom_${hash}${fileExtension}`;
        const filePath = path.join(customIconsPath, customFileName);
        
        await fs.writeFile(filePath, fileBuffer);
        return customFileName;
    } catch (error) {
        console.error('Error saving custom icon:', error);
        throw error;
    }
});

app.whenReady().then(async () => {
    await ensureDataDirectory();
    await loadNotifications();
    
    try {
        createTray();
    } catch (error) {
        console.error('Error creating tray:', error);
    }
    
    scheduleNotifications();
    
}).catch(error => {
    console.error('Error during app initialization:', error);
});

app.on('window-all-closed', (event) => {
    event.preventDefault(); 
});

app.on('before-quit', () => {
    isQuitting = true;
});
