import {
    onBluetoothStateChange,
    onPrinterStateChange,
    getBluetoothState,
    getPrinterState,
    updateBluetoothState,
    updatePrinterState,
} from ".";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectPrinter() {
    await sleep(350);
    updateBluetoothState(true);
    updatePrinterState(true, "SunsetPoint-Thermal");
    return { connected: true, printerName: "SunsetPoint-Thermal" };
}

async function printOrder(orderId, printType = "KOT") {
    await sleep(120);
    console.log("[Printer:Dummy]", printType, "for order", orderId);
    return { success: true };
}

async function getStatus() {
    await sleep(80);
    const bluetooth = getBluetoothState();
    const printer = getPrinterState();
    return {
        bluetoothEnabled: bluetooth.enabled,
        printerConnected: printer.connected,
        printerName: printer.printerName,
    };
}

async function checkConnection() {
    await sleep(80);
    const printer = getPrinterState();
    return { connected: printer.connected };
}

export {
    connectPrinter,
    printOrder,
    getStatus,
    checkConnection,
    onBluetoothStateChange,
    onPrinterStateChange,
    getBluetoothState,
    getPrinterState,
};