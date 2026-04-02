const { contextBridge, ipcRenderer } = require('electron');

const nativeBridge = {
	handleMessage: (message) => {
		ipcRenderer.send('native:handle-message', message);
	},
};

contextBridge.exposeInMainWorld('NativeApi', nativeBridge);
contextBridge.exposeInMainWorld('nativeAPI', nativeBridge);
