// main.js
import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLauncher } from './launcher/index.js';
import { createAdmin } from './admin/index.js';
import { createCounter } from './counter/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'storage',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let adminWin = null;
let counterWin = null;
let javaProcess = null;
let javaStdoutBuffer = '';
const pendingNativeRequests = new Map();
const storageRoot = path.resolve(__dirname, 'storage');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => createLauncher());
  app.whenReady().then(() => {
    registerStorageProtocol();
    startJavaBridge();
    createLauncher();
  });
}

function startJavaBridge() {
  if (javaProcess && !javaProcess.killed) {
    return;
  }

  const javaPath = "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe";
  const jarPath = path.resolve(__dirname, 'core.jar');
  const dbPath = path.resolve(__dirname, 'pos.db');

  javaProcess = spawn(javaPath, ['-jar', jarPath, dbPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  javaProcess.stdout.on('data', (chunk) => {
    javaStdoutBuffer += chunk.toString();
    const lines = javaStdoutBuffer.split(/\r?\n/);
    javaStdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      handleJavaResponseLine(line);
    }
  });

  javaProcess.stderr.on('data', (data) => {
    console.error('JAVA ERROR:', data.toString());
  });

  javaProcess.on('exit', (code, signal) => {
    console.error('Java bridge exited', { code, signal });
    javaProcess = null;
    failAllPendingRequests('JAVA_BRIDGE_EXITED', `Java bridge exited (code=${code}, signal=${signal})`);
  });

  javaProcess.on('error', (error) => {
    console.error('Failed to start Java bridge:', error);
    javaProcess = null;
    failAllPendingRequests('JAVA_BRIDGE_START_FAILED', error.message || 'Failed to start Java bridge');
  });
}

function registerStorageProtocol() {
  protocol.registerFileProtocol('storage', (request, callback) => {
    const target = resolveStoragePath(request.url);
    if (!target) {
      callback({ error: -6 });
      return;
    }

    callback({ path: target });
  });
}

function resolveStoragePath(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    let pathName = parsed.pathname || '';
    if (!pathName && parsed.hostname) {
      pathName = parsed.hostname;
    }

    let decoded = pathName.replace(/^\/+/, '');
    decoded = decoded.replace(/\+/g, '%20');
    decoded = decodeURIComponent(decoded);
    decoded = decoded.replace(/\\/g, '/');
    if (!decoded) {
      return null;
    }

    const root = path.resolve(storageRoot);
    const target = path.resolve(root, decoded);
    if (target !== root && !target.startsWith(root + path.sep)) {
      return null;
    }

    return target;
  } catch (_error) {
    return null;
  }
}

function failAllPendingRequests(code, message) {
  const requests = Array.from(pendingNativeRequests.values());
  pendingNativeRequests.clear();

  for (const pending of requests) {
    resolveNative(pending.webContents, pending.requestId, {
      success: false,
      error: message,
      code,
    });
  }
}

function handleJavaResponseLine(line) {
  let response;
  try {
    response = JSON.parse(line);
  } catch (_error) {
    console.error('Invalid JSON line from Java:', line);
    return;
  }

  const requestId = response?.requestId;
  if (!requestId) {
    console.error('Java response missing requestId:', response);
    return;
  }

  const pending = pendingNativeRequests.get(requestId);
  if (!pending) {
    console.error('No pending request for Java response requestId:', requestId);
    return;
  }

  pendingNativeRequests.delete(requestId);
  resolveNative(pending.webContents, requestId, response);
}

function openAdmin() {
  if (adminWin && !adminWin.isDestroyed()) {
    if (adminWin.isMinimized()) adminWin.restore();
    adminWin.focus();
    return;
  }

  adminWin = createAdmin();
  
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

function resolveNative(webContents, requestId, responseObject) {
  const responseString =
    typeof responseObject === 'string' ? responseObject : JSON.stringify(responseObject);

  const js = `window.__nativeResolve(${JSON.stringify(requestId)}, ${JSON.stringify(responseString)})`;
  webContents.executeJavaScript(js).catch((error) => {
    console.error('Failed to execute __nativeResolve in renderer:', error);
  });
}

ipcMain.on('native:handle-message', async (event, message) => {
  let requestEnvelope = message;

  if (typeof requestEnvelope === 'string') {
    try {
      requestEnvelope = JSON.parse(requestEnvelope);
    } catch (_error) {
      resolveNative(event.sender, null, {
        success: false,
        error: 'Invalid request envelope JSON',
      });
      return;
    }
  }

  const requestId = requestEnvelope?.requestId || null;
  const rawMessage = requestEnvelope?.message;

  if (!requestId) {
    resolveNative(event.sender, requestId, {
      success: false,
      error: 'Missing requestId',
    });
    return;
  }

  let messageBody;
  try {
    messageBody = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
  } catch (_error) {
    resolveNative(event.sender, requestId, {
      requestId,
      success: false,
      error: 'Invalid message JSON',
    });
    return;
  }

  startJavaBridge();

  if (!javaProcess || javaProcess.killed || !javaProcess.stdin.writable) {
    resolveNative(event.sender, requestId, {
      requestId,
      success: false,
      error: 'Java bridge is not available',
    });
    return;
  }

  const requestObject = {
    requestId,
    message: messageBody,
  };

  pendingNativeRequests.set(requestId, {
    requestId,
    webContents: event.sender,
  });

  try {
    // One object, one line JSON protocol to Java.
    javaProcess.stdin.write(`${JSON.stringify(requestObject)}\n`);
  } catch (error) {
    pendingNativeRequests.delete(requestId);
    resolveNative(event.sender, requestId, {
      requestId,
      success: false,
      error: error.message || 'Failed to write request to Java bridge',
    });
  }
});

app.on('before-quit', () => {
  if (javaProcess && !javaProcess.killed) {
    javaProcess.kill();
  }
});
