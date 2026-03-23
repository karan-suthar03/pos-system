const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  launchApp: (mode) => ipcRenderer.invoke('launch-app', mode)
});