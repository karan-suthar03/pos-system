package solutions.triniti.core.print;

public class PrinterStatus {

    private final boolean bluetoothEnabled;
    private final boolean printerConnected;
    private final String printerName;
    private final long checkedAt;

    public PrinterStatus(boolean bluetoothEnabled, boolean printerConnected, String printerName, long checkedAt) {
        this.bluetoothEnabled = bluetoothEnabled;
        this.printerConnected = printerConnected;
        this.printerName = printerName;
        this.checkedAt = checkedAt;
    }

    public boolean isBluetoothEnabled() {
        return bluetoothEnabled;
    }

    public boolean isPrinterConnected() {
        return printerConnected;
    }

    public String getPrinterName() {
        return printerName;
    }

    public long getCheckedAt() {
        return checkedAt;
    }
}
