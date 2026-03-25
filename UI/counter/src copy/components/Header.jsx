import { 
  ChefHat, 
  Bell, 
  Settings,
  Printer, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Bluetooth,
  BluetoothOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { connectPrinter, getStatus, checkConnection } from '../API/printer';
import { usePrinterState } from '../hooks/usePrinterState';

function Header() {
  const [time, setTime] = useState(new Date());
  const { isBluetoothEnabled, isPrinterConnected, printerName, bluetoothState } = usePrinterState();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Request initial status on mount
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const status = await getStatus();
        console.log('Initial status:', status);
        // Trigger the state callbacks
        if (status && typeof window.__onBluetoothStateChanged === 'function') {
          window.__onBluetoothStateChanged(status.bluetoothEnabled);
        }
        if (status && typeof window.__onPrinterStateChanged === 'function') {
          window.__onPrinterStateChanged(status.printerConnected, status.printerName || null);
        }
        
        // Auto-connect if Bluetooth is enabled and printer not connected
        if (status && status.bluetoothEnabled && !status.printerConnected) {
          console.log('Auto-connecting to printer...');
          setIsConnecting(true);
          try {
            await connectPrinter();
          } catch (error) {
            console.log('Auto-connect failed:', error);
          } finally {
            setIsConnecting(false);
          }
        }
      } catch (error) {
        console.error('Failed to get initial status:', error);
      }
    };
    
    // Wait a bit for WebView to be ready
    setTimeout(fetchInitialStatus, 500);
  }, []);

  const handleRetryConnect = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      await connectPrinter();
    } catch (error) {
      console.error('Retry connect failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Periodic health check for printer connection
  useEffect(() => {
    const checkPrinterHealth = async () => {
      try {
        const status = await checkConnection();
        if (status && !status.connected && isPrinterConnected) {
          // Printer was connected but is now disconnected
          console.log('Printer disconnected detected');
          if (typeof window.__onPrinterStateChanged === 'function') {
            window.__onPrinterStateChanged(false, null);
          }
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    // Check every 5 seconds if we think a printer is connected
    const interval = setInterval(() => {
      if (isPrinterConnected) {
        checkPrinterHealth();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPrinterConnected]);

  // Auto-connect to printer on mount if Bluetooth is enabled and no printer connected
  useEffect(() => {
    const attemptConnect = async () => {
      // Wait a bit for initial state to be received
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isBluetoothEnabled && !isPrinterConnected) {
        try {
          await connectPrinter();
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };
    
    attemptConnect();
  }, []);

  const formattedDate = time.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const formattedTime = time.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Helper to render printer UI based on real-time status
  const renderPrinterStatus = () => {
    // Show Bluetooth disabled state first
    if (bluetoothState.enabled === false) {
      return (
        <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full border border-orange-200 transition-all">
          <BluetoothOff size={16} />
          <span className="text-xs font-semibold whitespace-nowrap">Bluetooth Off</span>
          <AlertCircle size={14} />
        </div>
      );
    }

    // Show checking/connecting state
    if (bluetoothState.enabled === null || isConnecting) {
      return (
        <div className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 transition-all">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs font-semibold whitespace-nowrap">
            {isConnecting ? 'Connecting...' : 'Checking...'}
          </span>
        </div>
      );
    }

    // Bluetooth is on, check printer connection
    if (isPrinterConnected && printerName) {
      return (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200 transition-all group cursor-default">
          <Printer size={16} />
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-green-600 font-medium uppercase tracking-wider">Online</span>
            <span className="text-xs font-bold truncate max-w-[80px] sm:max-w-none">
              {printerName}
            </span>
          </div>
          <CheckCircle2 size={14} className="ml-1" />
        </div>
      );
    }

    // Bluetooth is on but no printer connected - show retry button
    return (
      <button
        onClick={handleRetryConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-200 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Printer size={16} />
        <span className="text-xs font-semibold whitespace-nowrap">Retry Connect</span>
        <AlertCircle size={14} />
      </button>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* --- LEFT: Brand Identity --- */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center shrink-0 transform transition-transform">
            <ChefHat size={24} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-gray-900 leading-none tracking-tight">
              Sunset Point
            </h1>
          </div>
        </div>

        {/* --- RIGHT: Actions & Status --- */}
        <div className="flex items-center gap-2 sm:gap-6">
          
          {/* PRINTER STATUS WIDGET */}
          <div className="hidden md:block">
             {renderPrinterStatus()}
          </div>
          {/* Mobile Icon Only */}
          <div className="md:hidden">
            {bluetoothState.enabled === false ? (
              <BluetoothOff size={20} className="text-orange-600" />
            ) : bluetoothState.enabled === null || isConnecting ? (
              <Loader2 size={20} className="animate-spin text-gray-600" />
            ) : isPrinterConnected ? (
              <Printer size={20} className="text-green-600" />
            ) : (
              <button onClick={handleRetryConnect} disabled={isConnecting}>
                <AlertCircle size={20} className="text-red-500" />
              </button>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

          {/* Time Display */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-gray-800">{formattedTime}</span>
            <span className="text-xs text-gray-500 font-medium">{formattedDate}</span>
          </div>

        </div>
      </div>
    </header>
  );
}

export default Header;