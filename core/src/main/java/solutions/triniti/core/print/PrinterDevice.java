package solutions.triniti.core.print;

public class PrinterDevice {

    private final String name;
    private final String address;
    private final boolean connected;

    public PrinterDevice(String name, String address, boolean connected) {
        this.name = name;
        this.address = address;
        this.connected = connected;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public boolean isConnected() {
        return connected;
    }
}