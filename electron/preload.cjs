const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  save:      (data) => ipcRenderer.invoke('save-game', data),
  load:      ()     => ipcRenderer.invoke('load-game'),
  hasSave:   ()     => ipcRenderer.invoke('has-save'),
  deleteSave:()     => ipcRenderer.invoke('delete-save'),
});
