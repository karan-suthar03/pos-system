import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export function createCounter() {
	const counter = new BrowserWindow({
		show: false,
		title: 'Counter App',
		webPreferences: { preload: path.join(dirname, 'preload.js') },
	});

	counter.loadURL('http://localhost:3001/');
	counter.maximize();
	counter.show();
	counter.webContents.openDevTools();

	return counter;
}
