// import {app, BrowserWindow} from "electron";

 import { spawn } from "child_process";
// import path from "path";
// import { fileURLToPath } from "url";

// // Fix __dirname in ESM
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);

// // Java path (JBR)
 const javaPath = "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe";

// // Jar path
 const jarPath = path.resolve(__dirname, "core.jar");

// // Start Java process
 const java = spawn(javaPath, ["-jar", jarPath]);

// // Listen output

let buffer = "";

java.stdout.on("data", (chunk) => {
  buffer += chunk.toString();

  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop(); // keep incomplete part

   for (const line of lines) {
    if (!line.trim()) continue;

    console.log("Message length:", line.length);

    try {
      const parsed = JSON.parse(line);
    } catch (e) {
      console.error("Invalid JSON:", line);
    }
  }
});


//setInterval(()=>{
//
//java.stdin.write("karan\n")
//},1000)



java.stderr.on("data", (data) => {
    console.error("JAVA ERROR:", data.toString());
});

// function createWindow() {
//   const win = new BrowserWindow({
//     width: 1000,
//     height: 800,
//   });

//   // Load your local server
//   win.loadURL('http://localhost:3000/');
//   win.webContents.openDevTools();
// }

// app.whenReady().then(createWindow);


// main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLauncher } from './launcher/index.js';
import { createCounter } from './counter/index.js';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

let adminWin = null;
let counterWin = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => createLauncher());
  app.whenReady().then(createLauncher);
}

function openAdmin() {
  if (adminWin && !adminWin.isDestroyed()) {
    if (adminWin.isMinimized()) adminWin.restore();
    adminWin.focus();
    return;
  }

  adminWin = new BrowserWindow({
    title: "Admin Dashboard",
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  
  adminWin.loadFile('admin.html');
  
  adminWin.on('closed', () => { adminWin = null; });
}

function openCounter() {
  if (counterWin && !counterWin.isDestroyed()) {
    if (counterWin.isMinimized()) counterWin.restore();
    counterWin.focus();
    return;
  }

  counterWin = createCounter();
  
  counterWin.on('closed', () => { counterWin = null; });
}

ipcMain.handle('launch-app', (event, mode) => {
  const launcher = BrowserWindow.fromWebContents(event.sender);
  if (launcher) launcher.close();

  if (mode === 'admin') openAdmin();
  if (mode === 'counter') openCounter();
});
