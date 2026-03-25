import React from 'react';
import { usePrinterState } from '../hooks/usePrinterState';
import { connectPrinter } from '../API/printer';

/**
 * PrinterStatusIndicator - Shows real-time Bluetooth and Printer connection status
 * Automatically updates when states change
 */
export function PrinterStatusIndicator() {
  const { 
    isBluetoothEnabled, 
    isPrinterConnected, 
    printerName,
    bluetoothState,
    printerState 
  } = usePrinterState();

  const handleConnect = async () => {
    try {
      const result = await connectPrinter();
      console.log('Printer connected:', result);
    } catch (error) {
      console.error('Failed to connect printer:', error);
    }
  };

  // Determine Bluetooth status color and text
  const getBluetoothStatus = () => {
    if (bluetoothState.enabled === null) {
      return { color: '#9e9e9e', text: 'Checking...' };
    }
    return bluetoothState.enabled 
      ? { color: '#4caf50', text: 'Enabled' }
      : { color: '#f44336', text: 'Disabled' };
  };

  const bluetoothStatus = getBluetoothStatus();

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Printer Status</h3>
      
      {/* Bluetooth Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: bluetoothStatus.color,
          marginRight: '8px'
        }} />
        <span style={{ fontSize: '14px' }}>
          Bluetooth: {bluetoothStatus.text}
        </span>
      </div>

      {/* Printer Connection Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isPrinterConnected ? '#4caf50' : '#f44336',
          marginRight: '8px'
        }} />
        <span style={{ fontSize: '14px' }}>
          Printer: {isPrinterConnected ? `Connected (${printerName})` : 'Not Connected'}
        </span>
      </div>

      {/* Error/Warning Messages */}
      {bluetoothState.enabled === false && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '13px',
          color: '#856404'
        }}>
          ⚠️ Please enable Bluetooth to use printing functionality
        </div>
      )}

      {isBluetoothEnabled && !isPrinterConnected && (
        <div style={{
          padding: '12px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '13px',
          color: '#0d47a1'
        }}>
          ℹ️ No printer connected. Click "Connect Printer" to pair a device.
        </div>
      )}

      {/* Connect Button */}
      {isBluetoothEnabled && !isPrinterConnected && (
        <button
          onClick={handleConnect}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Connect Printer
        </button>
      )}

      {/* Debug Info (remove in production) */}
      <details style={{ marginTop: '12px', fontSize: '12px' }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>Debug Info</summary>
        <pre style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: '#fff', 
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {JSON.stringify({ bluetoothState, printerState }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default PrinterStatusIndicator;
