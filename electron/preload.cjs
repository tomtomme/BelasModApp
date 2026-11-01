const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modnest', {
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  chooseProfileFolder: () => ipcRenderer.invoke('profiles:choose'),
  fetchCollections: () => ipcRenderer.invoke('collections:fetch'),
  installMods: (payload) => ipcRenderer.invoke('mods:install', payload),
  onInstallProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('install-progress', listener);
    return () => ipcRenderer.removeListener('install-progress', listener);
  },
});
