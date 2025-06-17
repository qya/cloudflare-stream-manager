export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
  };
  shell: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };
  getVersion: () => string;
  getPlatform: () => string;
  getNodeVersion: () => string;
  getElectronVersion: () => string;
  getChromeVersion: () => string;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 