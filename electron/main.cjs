const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({ name: 'my-valley-save' });

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    title: 'Moon Island',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.setMenu(null);
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  // ─── IPC handlers ──────────────────────────────────────────────────────────
  ipcMain.handle('save-game',    (_e, data) => { store.set('saveData', data); });
  ipcMain.handle('load-game',    ()         => store.get('saveData', null));
  ipcMain.handle('has-save',     ()         => store.has('saveData'));
  ipcMain.handle('delete-save',  ()         => { store.delete('saveData'); });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
