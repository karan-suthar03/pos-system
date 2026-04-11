package solutions.triniti.core.handler;

import com.google.gson.JsonElement;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.print.PrintContentFormatter;
import solutions.triniti.core.print.PrintProviderRegistry;
import solutions.triniti.core.print.PrinterConnectionProvider;
import solutions.triniti.core.print.PrinterDevice;
import solutions.triniti.core.print.PrinterStatus;

import java.util.List;

public class PrintRequestHandler implements RequestHandler {

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("print.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) {
        String type = message == null ? null : message.getType();
        JsonObject params = getParams(message);
        PrinterConnectionProvider provider = PrintProviderRegistry.getProvider();

        try {
            if ("print.connect".equals(type)) {
                String requestedName = getStringParam(params, "printerName");
                String requestedAddress = getStringParam(params, "printerAddress");
                PrinterStatus status = provider.connect(requestedName, requestedAddress);
                JsonObject data = toJson(type, status);
                appendPrinterList(data, provider);
                return BridgeResponse.success(requestId, data);
            }

            if ("print.status".equals(type) || "print.checkConnection".equals(type)) {
                PrinterStatus status = provider.status();
                JsonObject data = toJson(type, status);
                appendPrinterList(data, provider);
                return BridgeResponse.success(requestId, data);
            }

            if ("print.list".equals(type)) {
                JsonObject data = new JsonObject();
                data.addProperty("type", type);
                data.addProperty("listedAt", System.currentTimeMillis());
                appendPrinterList(data, provider);
                return BridgeResponse.success(requestId, data);
            }

            if ("print.order".equals(type)) {
                long orderId = getLongParam(params, "orderId", -1);
                String printType = getStringParam(params, "printType");
                String legacyContent = getStringParam(params, "content");
                String targetPrinterName = getStringParam(params, "targetPrinterName");
                String targetPrinterAddress = getStringParam(params, "targetPrinterAddress");
                JsonObject orderSnapshot = getObjectParam(params, "order");
                if (printType == null || printType.trim().isEmpty()) {
                    printType = "KOT";
                }

                String content = PrintContentFormatter.format(printType, orderId, orderSnapshot, legacyContent);
                PrinterStatus status = provider.printOrder(orderId, printType, content, targetPrinterName, targetPrinterAddress);
                JsonObject data = toJson(type, status);
                data.addProperty("success", true);
                data.addProperty("printedAt", System.currentTimeMillis());
                data.addProperty("orderId", orderId);
                data.addProperty("printType", printType);
                data.addProperty("targetPrinterName", targetPrinterName);
                data.addProperty("targetPrinterAddress", targetPrinterAddress);
                appendPrinterList(data, provider);
                return BridgeResponse.success(requestId, data);
            }
        } catch (Exception error) {
            String messageText = error.getMessage() == null ? "Print request failed" : error.getMessage();
            return BridgeResponse.error(requestId, messageText);
        }

        return BridgeResponse.error(requestId, "Unknown print request: " + type);
    }

    private JsonObject toJson(String type, PrinterStatus status) {
        JsonObject data = new JsonObject();
        data.addProperty("type", type);
        data.addProperty("bluetoothEnabled", status.isBluetoothEnabled());
        data.addProperty("printerConnected", status.isPrinterConnected());
        data.addProperty("connected", status.isPrinterConnected());
        data.addProperty("printerName", status.getPrinterName());
        data.addProperty("checkedAt", status.getCheckedAt());
        return data;
    }

    private JsonObject getParams(BridgeMessage message) {
        return message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();
    }

    private void appendPrinterList(JsonObject data, PrinterConnectionProvider provider) {
        JsonArray printersArray = new JsonArray();
        try {
            List<PrinterDevice> devices = provider.listPrinters();
            if (devices != null) {
                for (PrinterDevice device : devices) {
                    if (device == null) {
                        continue;
                    }
                    JsonObject item = new JsonObject();
                    item.addProperty("name", device.getName());
                    item.addProperty("address", device.getAddress());
                    item.addProperty("connected", device.isConnected());
                    printersArray.add(item);
                }
            }
        } catch (Exception ignored) {
            // Keep printers empty if discovery fails.
        }
        data.add("printers", printersArray);
    }

    private JsonObject getObjectParam(JsonObject params, String key) {
        JsonElement element = params.get(key);
        if (element == null || element.isJsonNull() || !element.isJsonObject()) {
            return null;
        }
        try {
            return element.getAsJsonObject();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getStringParam(JsonObject params, String key) {
        JsonElement element = params.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }

        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private long getLongParam(JsonObject params, String key, long fallback) {
        JsonElement element = params.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }

        try {
            return element.getAsLong();
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
