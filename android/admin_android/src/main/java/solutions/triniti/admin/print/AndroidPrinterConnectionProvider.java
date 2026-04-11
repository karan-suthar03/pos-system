package solutions.triniti.admin.print;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.ParcelUuid;

import androidx.core.content.ContextCompat;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import solutions.triniti.core.print.PrinterConnectionProvider;
import solutions.triniti.core.print.PrinterDevice;
import solutions.triniti.core.print.PrinterStatus;

public class AndroidPrinterConnectionProvider implements PrinterConnectionProvider {

    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final String DEFAULT_PRINTER_NAME = "Android-Thermal";
    private static final long CONNECT_TIMEOUT_MS = 8000L;

    private final Context appContext;

    private final Map<String, BluetoothSocket> socketsByAddress = new HashMap<>();
    private final Map<String, BluetoothDevice> devicesByAddress = new HashMap<>();
    private String activePrinterAddress;
    private String activePrinterName;
    private String printerName = DEFAULT_PRINTER_NAME;

    public AndroidPrinterConnectionProvider(Context context) {
        this.appContext = context.getApplicationContext();
    }

    public Context getAppContext() {
        return appContext;
    }

    @Override
    public synchronized PrinterStatus connect(String requestedPrinterName) throws Exception {
        return connect(requestedPrinterName, null);
    }

    @Override
    public synchronized PrinterStatus connect(String requestedPrinterName, String requestedPrinterAddress) throws Exception {
        BluetoothAdapter adapter = getAdapterOrThrow();
        if (!adapter.isEnabled()) {
            throw new IllegalStateException("Bluetooth is disabled");
        }

        BluetoothDevice device = pickBondedDevice(adapter, requestedPrinterName, requestedPrinterAddress);
        if (device == null) {
            throw new IllegalStateException("No paired Bluetooth printer found");
        }

        String address = device.getAddress();
        BluetoothSocket existingSocket = socketsByAddress.get(address);
        if (!isSocketConnected(existingSocket)) {
            closeSocketQuietly(existingSocket);
            BluetoothSocket nextSocket = connectSocketWithTimeout(adapter, device);
            socketsByAddress.put(address, nextSocket);
        }

        devicesByAddress.put(address, device);
        activePrinterAddress = address;
        activePrinterName = safeName(device.getName(), requestedPrinterName);
        printerName = safeName(device.getName(), requestedPrinterName);
        return status();
    }

    @Override
    public synchronized PrinterStatus status() {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        boolean enabled = adapter != null && adapter.isEnabled();
        BluetoothSocket activeSocket = activePrinterAddress == null ? null : socketsByAddress.get(activePrinterAddress);
        boolean connected = isSocketConnected(activeSocket);
        String name = printerName;
        BluetoothDevice connectedDevice = activePrinterAddress == null ? null : devicesByAddress.get(activePrinterAddress);
        if (connectedDevice != null && connectedDevice.getName() != null && !connectedDevice.getName().trim().isEmpty()) {
            name = connectedDevice.getName();
        } else if (activePrinterName != null && !activePrinterName.trim().isEmpty()) {
            name = activePrinterName;
        }

        return new PrinterStatus(enabled, connected, name, System.currentTimeMillis());
    }

    @Override
    public synchronized PrinterStatus printOrder(long orderId, String printType, String content) throws Exception {
        return printOrder(orderId, printType, content, null, null);
    }

    @Override
    public synchronized PrinterStatus printOrder(
        long orderId,
        String printType,
        String content,
        String targetPrinterName,
        String targetPrinterAddress
    ) throws Exception {
        if ((targetPrinterName != null && !targetPrinterName.trim().isEmpty())
            || (targetPrinterAddress != null && !targetPrinterAddress.trim().isEmpty())) {
            connect(targetPrinterName, targetPrinterAddress);
        } else if (activePrinterAddress == null) {
            connect(printerName, null);
        }

        BluetoothSocket socket = activePrinterAddress == null ? null : socketsByAddress.get(activePrinterAddress);
        if (!isSocketConnected(socket)) {
            connect(activePrinterName, activePrinterAddress);
            socket = activePrinterAddress == null ? null : socketsByAddress.get(activePrinterAddress);
        }

        if (!isSocketConnected(socket)) {
            throw new IllegalStateException("Printer is not connected");
        }

        String ticket = content == null ? "" : content;
        if (ticket.trim().isEmpty()) {
            throw new IllegalStateException("No printable content generated");
        }

        try {
            writeToSocket(socket, ticket);
            return status();
        } catch (Exception writeError) {
            closeSocketQuietly(socket);
            if (activePrinterAddress != null) {
                socketsByAddress.remove(activePrinterAddress);
            }
            try {
                connect(activePrinterName, activePrinterAddress);
                BluetoothSocket retrySocket = activePrinterAddress == null ? null : socketsByAddress.get(activePrinterAddress);
                if (!isSocketConnected(retrySocket)) {
                    throw new IllegalStateException("Printer reconnect failed after write error");
                }
                writeToSocket(retrySocket, ticket);
                return status();
            } catch (Exception retryError) {
                String message = retryError.getMessage() == null ? "Printer write failed" : retryError.getMessage();
                throw new IllegalStateException("Printer write failed after retry: " + message);
            }
        }
    }

    @Override
    @SuppressLint("MissingPermission")
    public synchronized List<PrinterDevice> listPrinters() throws Exception {
        BluetoothAdapter adapter = getAdapterOrThrow();
        boolean enabled = adapter.isEnabled();
        List<PrinterDevice> printers = new ArrayList<>();

        if (!enabled) {
            return printers;
        }

        List<BluetoothDevice> bondedPrinters = getBondedPrinterCandidates(adapter);
        if (bondedPrinters.isEmpty()) {
            return printers;
        }

        for (BluetoothDevice device : bondedPrinters) {
            String address = device.getAddress();
            devicesByAddress.put(address, device);
            BluetoothSocket socket = socketsByAddress.get(address);
            boolean connected = isSocketConnected(socket);
            printers.add(new PrinterDevice(safeName(device.getName(), address), address, connected));
        }
        return printers;
    }

    @SuppressLint("MissingPermission")
    private BluetoothDevice pickBondedDevice(
        BluetoothAdapter adapter,
        String requestedPrinterName,
        String requestedPrinterAddress
    ) {
        Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
        if (bondedDevices == null || bondedDevices.isEmpty()) {
            return null;
        }

        List<BluetoothDevice> bondedPrinters = getBondedPrinterCandidates(adapter);

        String wantedAddress = requestedPrinterAddress == null ? null : requestedPrinterAddress.trim();
        if (wantedAddress != null && !wantedAddress.isEmpty()) {
            for (BluetoothDevice device : bondedDevices) {
                if (wantedAddress.equalsIgnoreCase(device.getAddress())) {
                    return device;
                }
            }
        }

        String wanted = requestedPrinterName == null ? null : requestedPrinterName.trim();
        if (wanted != null && !wanted.isEmpty()) {
            for (BluetoothDevice device : bondedDevices) {
                String name = device.getName();
                if (name != null && name.equalsIgnoreCase(wanted)) {
                    return device;
                }
            }
        }

        if (activePrinterAddress != null) {
            for (BluetoothDevice device : bondedPrinters) {
                if (device.getAddress().equals(activePrinterAddress)) {
                    return device;
                }
            }
        }

        return bondedPrinters.isEmpty() ? null : bondedPrinters.get(0);
    }

    @SuppressLint("MissingPermission")
    private List<BluetoothDevice> getBondedPrinterCandidates(BluetoothAdapter adapter) {
        Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
        List<BluetoothDevice> candidates = new ArrayList<>();
        if (bondedDevices == null || bondedDevices.isEmpty()) {
            return candidates;
        }

        for (BluetoothDevice device : bondedDevices) {
            if (isLikelyPrinter(device)) {
                candidates.add(device);
            }
        }

        return candidates;
    }

    @SuppressLint("MissingPermission")
    private boolean isLikelyPrinter(BluetoothDevice device) {
        if (device == null) {
            return false;
        }

        if (activePrinterAddress != null && activePrinterAddress.equals(device.getAddress())) {
            return true;
        }

        BluetoothClass bluetoothClass = device.getBluetoothClass();
        if (bluetoothClass != null) {
            int majorClass = bluetoothClass.getMajorDeviceClass();
            if (majorClass == BluetoothClass.Device.Major.IMAGING) {
                return true;
            }
        }

        ParcelUuid[] uuids = device.getUuids();
        if (uuids != null) {
            for (ParcelUuid uuid : uuids) {
                if (uuid != null && SPP_UUID.equals(uuid.getUuid())) {
                    return true;
                }
            }
        }

        return false;
    }

    private BluetoothAdapter getAdapterOrThrow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.BLUETOOTH_CONNECT)
            != PackageManager.PERMISSION_GRANTED) {
            throw new IllegalStateException("BLUETOOTH_CONNECT permission not granted");
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            throw new IllegalStateException("Bluetooth is not supported on this device");
        }
        return adapter;
    }

    private boolean isSocketConnected(BluetoothSocket value) {
        return value != null && value.isConnected();
    }

    private BluetoothSocket connectSocketWithTimeout(BluetoothAdapter adapter, BluetoothDevice device) throws Exception {
        BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
        adapter.cancelDiscovery();

        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<Boolean> task = executor.submit(new Callable<Boolean>() {
            @Override
            public Boolean call() throws Exception {
                socket.connect();
                return true;
            }
        });

        try {
            task.get(CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            return socket;
        } catch (TimeoutException timeout) {
            task.cancel(true);
            closeSocketQuietly(socket);
            throw new IllegalStateException("Printer connection timed out");
        } catch (InterruptedException interrupted) {
            task.cancel(true);
            closeSocketQuietly(socket);
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Printer connection interrupted");
        } catch (ExecutionException execution) {
            closeSocketQuietly(socket);
            Throwable cause = execution.getCause();
            String message = cause != null && cause.getMessage() != null
                ? cause.getMessage()
                : "Unable to connect to printer";
            throw new IllegalStateException(message);
        } finally {
            executor.shutdownNow();
        }
    }

    private void writeToSocket(BluetoothSocket socket, String ticket) throws Exception {
        OutputStream outputStream = socket.getOutputStream();
        outputStream.write(ticket.getBytes(StandardCharsets.UTF_8));
        outputStream.write(new byte[] { 0x1B, 0x64, 0x03 });
        outputStream.flush();
    }

    private String safeName(String deviceName, String fallback) {
        if (deviceName != null && !deviceName.trim().isEmpty()) {
            return deviceName;
        }
        if (fallback != null && !fallback.trim().isEmpty()) {
            return fallback.trim();
        }
        return DEFAULT_PRINTER_NAME;
    }

    private void closeSocketQuietly(BluetoothSocket socket) {
        if (socket == null) {
            return;
        }

        try {
            socket.close();
        } catch (Exception ignored) {
        }
    }
}
