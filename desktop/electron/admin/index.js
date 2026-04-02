import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export function createAdmin() {
	const admin = new BrowserWindow({
		show: false,
		title: 'Admin App',
		webPreferences: { preload: path.join(dirname, 'preload.js') },
	});

	admin.loadURL('http://localhost:3002/');
	admin.maximize();
	admin.show();
	admin.webContents.openDevTools();

	return admin;
}
