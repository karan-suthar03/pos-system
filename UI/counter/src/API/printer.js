import {
    handleMessage,
    onBluetoothStateChange,
    onPrinterStateChange,
    getBluetoothState,
    getPrinterState,
    updateBluetoothState,
    updatePrinterState,
} from ".";

function toPrinterStatus(data = {}) {
    return {
        bluetoothEnabled: Boolean(data.bluetoothEnabled),
        printerConnected: Boolean(data.printerConnected ?? data.connected),
        printerName: data.printerName || null,
        printers: Array.isArray(data.printers)
            ? data.printers.map((printer) => ({
                name: printer?.name || 'Unknown Printer',
                address: printer?.address || '',
                connected: Boolean(printer?.connected),
            }))
            : [],
    };
}

function applyPrinterStatus(data = {}) {
    const status = toPrinterStatus(data);
    updateBluetoothState(status.bluetoothEnabled);
    updatePrinterState(status.printerConnected, status.printerName);
    return status;
}

async function sendPrintRequest(type, params = {}) {
    if (!window.NativeApi?.handleMessage) {
        throw new Error('Native bridge is unavailable');
    }

    const result = await handleMessage({
        type,
        params,
    });

    if (!result?.success) {
        throw new Error(result?.error || `Print request failed: ${type}`);
    }

    return result.data || {};
}

async function connectPrinter() {
    const data = await sendPrintRequest('print.connect', {});
    const status = applyPrinterStatus(data);
    return { connected: status.printerConnected, printerName: status.printerName };
}

async function connectPrinterToTarget({ printerName = null, printerAddress = null } = {}) {
    const data = await sendPrintRequest('print.connect', {
        printerName,
        printerAddress,
    });
    const status = applyPrinterStatus(data);
    return {
        connected: status.printerConnected,
        printerName: status.printerName,
        printers: status.printers,
    };
}

function toOrderSnapshot(order) {
    if (!order || typeof order !== 'object') {
        return null;
    }

    return {
        id: Number(order.id || 0),
        displayId: order.displayId || order.orderId || null,
        tag: order.tag || null,
        orderTotal: Number(order.orderTotal || 0),
        paymentDone: Boolean(order.paymentDone),
        items: Array.isArray(order.items)
            ? order.items.map((item) => ({
                id: Number(item?.id || 0),
                name: item?.name || 'Item',
                quantity: Number(item?.quantity || 0),
                price: Number(item?.price || 0),
                status: item?.status || 'OPEN',
            }))
            : [],
    };
}

async function printOrder(orderId, printType = "KOT", order = null, options = {}) {
    await sendPrintRequest('print.order', {
        orderId,
        printType,
        order: toOrderSnapshot(order),
        targetPrinterName: options?.targetPrinterName || null,
        targetPrinterAddress: options?.targetPrinterAddress || null,
    });
    return { success: true };
}

async function listPrinters() {
    const data = await sendPrintRequest('print.list', {});
    const status = applyPrinterStatus(data);
    return status.printers;
}

async function getStatus() {
    const data = await sendPrintRequest('print.status', {});
    return applyPrinterStatus(data);
}

async function checkConnection() {
    const data = await sendPrintRequest('print.checkConnection', {});
    const status = applyPrinterStatus(data);
    return { connected: status.printerConnected };
}

export {
    connectPrinter,
    connectPrinterToTarget,
    printOrder,
    getStatus,
    listPrinters,
    checkConnection,
    onBluetoothStateChange,
    onPrinterStateChange,
    getBluetoothState,
    getPrinterState,
};