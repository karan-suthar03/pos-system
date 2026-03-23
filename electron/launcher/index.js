import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export function createLauncher() {
  const launcher = new BrowserWindow({
    show: false,
    title: "Select App Mode",
    webPreferences: { preload: path.join(dirname, 'preload.js') },
  });
  launcher.webContents.openDevTools();
  launcher.loadURL('http://localhost:3000');
  launcher.maximize();
  launcher.show();
}