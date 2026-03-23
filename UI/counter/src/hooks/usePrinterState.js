import { useState, useEffect } from 'react';
import { onBluetoothStateChange, onPrinterStateChange, getBluetoothState, getPrinterState } from '../API/printer';

/**
 * Hook to monitor Bluetooth and Printer state changes
 * @returns {Object} { bluetoothState, printerState }
 */
export function usePrinterState() {
  const [bluetoothState, setBluetoothState] = useState(getBluetoothState());
  const [printerState, setPrinterState] = useState(getPrinterState());

  useEffect(() => {
    // Subscribe to Bluetooth state changes
    const unsubscribeBluetooth = onBluetoothStateChange((state) => {
      setBluetoothState(state);
    });

    // Subscribe to Printer state changes
    const unsubscribePrinter = onPrinterStateChange((state) => {
      setPrinterState(state);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeBluetooth();
      unsubscribePrinter();
    };
  }, []);

  return {
    bluetoothState,
    printerState,
    // Convenience flags
    isBluetoothEnabled: bluetoothState.enabled,
    isPrinterConnected: printerState.connected,
    printerName: printerState.printerName,
  };
}
