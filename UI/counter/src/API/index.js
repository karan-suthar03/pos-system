window.__nativePromises = window.__nativePromises || {};
window.__nativeResolve = function (id, response) {
  if (window.__nativePromises[id]) {
    window.__nativePromises[id](response ? JSON.parse(response) : null);
    delete window.__nativePromises[id];
  }
};

const bluetoothStateListeners = new Set();
const printerStateListeners = new Set();

let currentBluetoothState = {
  enabled: true,
  lastChecked: Date.now(),
};

let currentPrinterState = {
  connected: false,
  printerName: null,
  lastChecked: Date.now(),
};

function notifyBluetoothListeners() {
  bluetoothStateListeners.forEach((listener) => {
    try {
      listener(currentBluetoothState);
    } catch (error) {
      console.error("Error in Bluetooth state listener:", error);
    }
  });
}

function notifyPrinterListeners() {
  printerStateListeners.forEach((listener) => {
    try {
      listener(currentPrinterState);
    } catch (error) {
      console.error("Error in printer state listener:", error);
    }
  });
}

window.__onBluetoothStateChanged = function (enabled) {
  currentBluetoothState = {
    enabled,
    lastChecked: Date.now(),
  };
  notifyBluetoothListeners();
};

window.__onPrinterStateChanged = function (connected, printerName) {
  currentPrinterState = {
    connected,
    printerName,
    lastChecked: Date.now(),
  };
  notifyPrinterListeners();
};

export function updateBluetoothState(enabled) {
  window.__onBluetoothStateChanged(enabled);
}

export function updatePrinterState(connected, printerName = null) {
  window.__onPrinterStateChanged(connected, printerName);
}

export function onBluetoothStateChange(callback) {
  bluetoothStateListeners.add(callback);
  callback(currentBluetoothState);
  return () => bluetoothStateListeners.delete(callback);
}

export function onPrinterStateChange(callback) {
  printerStateListeners.add(callback);
  callback(currentPrinterState);
  return () => printerStateListeners.delete(callback);
}

export function getBluetoothState() {
  return currentBluetoothState;
}

export function getPrinterState() {
  return currentPrinterState;
}

let backPressHandler = null;

export function setBackPressHandler(handler) {
  backPressHandler = handler;
}

window.__handleBackPress = function () {
  if (backPressHandler && typeof backPressHandler === "function") {
    return backPressHandler();
  }
  return false;
};

const apiClient = {
  get: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
  post: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
  put: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
  delete: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
};

export default apiClient;