package solutions.triniti.core.handler;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.storage.StorageFile;
import solutions.triniti.core.storage.StorageService;

import java.util.Base64;

public class StorageRequestHandler implements RequestHandler {

    private final StorageService storageService;

    public StorageRequestHandler(StorageService storageService) {
        this.storageService = storageService;
    }

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("storage.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if (storageService == null) {
            return BridgeResponse.error(requestId, "Storage is not configured");
        }

        if ("storage.save".equals(type)) {
            JsonObject params = getParams(message);
            ParsedPayload payload = parsePayload(params);
            String folder = getStringParam(params, "folder", "scope");
            String fileName = getStringParam(params, "fileName", "name");
            String mimeType = payload.mimeType;

            if (payload.dataBase64 == null || payload.dataBase64.trim().isEmpty()) {
                return BridgeResponse.error(requestId, "Missing required field: dataBase64");
            }

            byte[] bytes;
            try {
                bytes = Base64.getDecoder().decode(payload.dataBase64);
            } catch (IllegalArgumentException decodeError) {
                return BridgeResponse.error(requestId, "Invalid base64 payload");
            }

            StorageFile stored = storageService.save(folder, fileName, mimeType, bytes);

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("path", stored.getRelativePath());
            data.addProperty("url", stored.getPublicUrl());
            data.addProperty("fileName", stored.getOriginalName());
            data.addProperty("mimeType", stored.getMimeType());
            data.addProperty("size", stored.getSize());
            return BridgeResponse.success(requestId, data);
        }

        if ("storage.delete".equals(type)) {
            JsonObject params = getParams(message);
            String path = requireStringParam(params, "path", "storagePath");
            boolean deleted = storageService.delete(path);

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("path", path);
            data.addProperty("deleted", deleted);
            return BridgeResponse.success(requestId, data);
        }

        if ("storage.getUrl".equals(type)) {
            JsonObject params = getParams(message);
            String path = requireStringParam(params, "path", "storagePath");
            String url = storageService.resolvePublicUrl(path);

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("path", path);
            if (url == null) {
                data.add("url", null);
            } else {
                data.addProperty("url", url);
            }
            return BridgeResponse.success(requestId, data);
        }

        return BridgeResponse.error(requestId, "Unknown storage request: " + type);
    }

    private JsonObject getParams(BridgeMessage message) {
        return message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();
    }

    private ParsedPayload parsePayload(JsonObject params) {
        String dataUrl = getStringParam(params, "dataUrl", null);
        String dataBase64 = getStringParam(params, "dataBase64", "data");
        String mimeType = getStringParam(params, "mimeType", "type");

        if (dataUrl == null && dataBase64 != null && dataBase64.startsWith("data:")) {
            dataUrl = dataBase64;
            dataBase64 = null;
        }

        if (dataUrl != null) {
            int comma = dataUrl.indexOf(',');
            if (comma > 0) {
                String meta = dataUrl.substring(5, comma);
                String payload = dataUrl.substring(comma + 1);
                if (meta.contains(";base64")) {
                    dataBase64 = payload;
                    String metaType = meta.split(";")[0];
                    if (!metaType.trim().isEmpty()) {
                        mimeType = metaType;
                    }
                }
            }
        }

        return new ParsedPayload(dataBase64, mimeType);
    }

    private String getStringParam(JsonObject params, String key, String fallbackKey) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            return null;
        }

        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String requireStringParam(JsonObject params, String key, String fallbackKey) {
        String value = getStringParam(params, key, fallbackKey);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }

        return value;
    }

    private static final class ParsedPayload {

        private final String dataBase64;
        private final String mimeType;

        private ParsedPayload(String dataBase64, String mimeType) {
            this.dataBase64 = dataBase64;
            this.mimeType = mimeType;
        }
    }
}
