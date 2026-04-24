const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  selectBaseFolder: () => ipcRenderer.invoke('desktop:select-base-folder'),

  createProjectFolder: (folderPath) =>
    ipcRenderer.invoke('desktop:create-project-folder', folderPath),

  openFolder: (folderPath) =>
    ipcRenderer.invoke('desktop:open-folder', folderPath),

  savePdf: (payload) =>
    ipcRenderer.invoke('desktop:save-pdf', payload),
});