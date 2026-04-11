package solutions.triniti.core.print;

import java.util.Collections;
import java.util.List;

public class InMemoryPrinterConnectionProvider implements PrinterConnectionProvider {

    private static final String DEFAULT_PRINTER_NAME = "Android-Thermal";

    private boolean bluetoothEnabled = true;
    private boolean printerConnected = false;
    private String printerName = DEFAULT_PRINTER_NAME;
    private String printerAddress = "INMEMORY-PRINTER-01";

    @Override
    public synchronized PrinterStatus connect(String requestedPrinterName) {
        if (requestedPrinterName != null && !requestedPrinterName.trim().isEmpty()) {
            printerName = requestedPrinterName.trim();
        }

        bluetoothEnabled = true;
        printerConnected = true;
        return status();
    }

    @Override
    public synchronized PrinterStatus connect(String requestedPrinterName, String requestedPrinterAddress) {
        if (requestedPrinterAddress != null && !requestedPrinterAddress.trim().isEmpty()) {
            printerAddress = requestedPrinterAddress.trim();
        }
        return connect(requestedPrinterName);
    }

    @Override
    public synchronized PrinterStatus status() {
        return new PrinterStatus(
            bluetoothEnabled,
            printerConnected,
            printerName,
            System.currentTimeMillis()
        );
    }

    @Override
    public synchronized PrinterStatus printOrder(long orderId, String printType, String content) {
        if (!printerConnected) {
            throw new IllegalStateException("Printer is not connected");
        }
        return status();
    }

    @Override
    public synchronized List<PrinterDevice> listPrinters() {
        return Collections.singletonList(new PrinterDevice(printerName, printerAddress, printerConnected));
    }
}
