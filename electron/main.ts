import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;
let isConfigured = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    icon: path.join(process.env.APP_ROOT!, 'build', 'icon', process.platform === 'darwin' ? 'icon.icns' : process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  win.once('ready-to-show', () => {
    win?.show();
  });
}

function createMenu() {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Video File',
          accelerator: 'CmdOrCtrl+O',
          enabled: isConfigured,
          click: async () => {
            if (!isConfigured) {
              dialog.showMessageBox(win!, {
                type: 'warning',
                title: 'Configuration Required',
                message: 'Please configure your Cloudflare API credentials first',
                detail: 'Go to Settings to enter your Account ID and API Token.',
                buttons: ['Open Settings', 'Cancel']
              }).then(result => {
                if (result.response === 0) {
                  win?.webContents.send('navigate-to', 'settings');
                }
              });
              return;
            }

            const result = await dialog.showOpenDialog(win!, {
              properties: ['openFile'],
              filters: [
                { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', '3gp', 'wmv'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              win?.webContents.send('file-selected', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Go to Dashboard',
          accelerator: 'CmdOrCtrl+D',
          enabled: isConfigured,
          click: () => {
            if (isConfigured) {
              win?.webContents.send('navigate-to', 'dashboard');
            }
          }
        },
        {
          label: 'Go to Video Library',
          accelerator: 'CmdOrCtrl+L',
          enabled: isConfigured,
          click: () => {
            if (isConfigured) {
              win?.webContents.send('navigate-to', 'videos');
            }
          }
        },
        {
          label: 'Go to Upload',
          accelerator: 'CmdOrCtrl+U',
          enabled: isConfigured,
          click: () => {
            if (isConfigured) {
              win?.webContents.send('navigate-to', 'upload');
            }
          }
        },
        {
          label: 'Go to Watermarks',
          accelerator: 'CmdOrCtrl+W',
          enabled: isConfigured,
          click: () => {
            if (isConfigured) {
              win?.webContents.send('navigate-to', 'watermarks');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            win?.webContents.send('navigate-to', 'settings');
          }
        },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'Stream',
      submenu: [
        {
          label: 'Refresh Data',
          accelerator: 'CmdOrCtrl+R',
          enabled: isConfigured,
          click: () => {
            if (isConfigured) {
              win?.webContents.send('refresh-data');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open Cloudflare Dashboard',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://dash.cloudflare.com/');
          }
        },
        {
          label: 'Open Stream Dashboard',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://dash.cloudflare.com/?to=/:account/stream');
          }
        },
        {
          label: 'API Documentation',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://developers.cloudflare.com/stream/');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Stream Manager',
          click: () => {
            win?.webContents.send('navigate-to', 'about');
          }
        },
        { type: 'separator' },
        {
          label: 'Get API Token',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://dash.cloudflare.com/profile/api-tokens');
          }
        },
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/qya/cloudflare-stream-manager');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  createMenu();
});

// Handle configuration state updates from renderer
ipcMain.handle('update-config-state', async (event, configured: boolean) => {
  isConfigured = configured;
  createMenu(); // Rebuild menu with new state
  return { success: true };
});

// Handle navigation requests from menu
ipcMain.handle('get-config-state', async () => {
  return { isConfigured };
});

// Handle file selection from menu
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', '3gp', 'wmv'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result.canceled ? null : result.filePaths[0];
});

// Handle opening external URLs
ipcMain.handle('open-external', async (event, url: string) => {
  const { shell } = await import('electron');
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});