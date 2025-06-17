import { contextBridge, ipcRenderer, shell } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // IPC communication
  ipcRenderer: {
    send: (channel: string, data?: any) => {
      const validChannels = ['file-selected', 'app-ready'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['main-process-message', 'file-selected'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    invoke: (channel: string, data?: any) => {
      const validChannels = ['select-file', 'get-app-version', 'open-external'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
    }
  },

  // Shell operations (for opening external links) - using IPC for reliability
  shell: {
    openExternal: async (url: string) => {
      try {
        return await ipcRenderer.invoke('open-external', url);
      } catch (error) {
        console.error('Preload openExternal error:', error);
        return { success: false, error: error.message };
      }
    }
  },

  // App info
  getVersion: () => process.env.npm_package_version || '0.1.5',
  getPlatform: () => process.platform,
  getNodeVersion: () => process.versions.node,
  getElectronVersion: () => process.versions.electron,
  getChromeVersion: () => process.versions.chrome
});

// Remove this if your app does not use auto updater
// Uncomment the following if you plan to use auto-updater
/*
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update-downloaded', callback),
  restartAndInstall: () => ipcRenderer.send('restart-and-install')
});
*/ 