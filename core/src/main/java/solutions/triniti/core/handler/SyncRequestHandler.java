package solutions.triniti.core.handler;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class SyncRequestHandler implements RequestHandler {

    private static final Gson GSON = new Gson();

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("sync.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if ("sync.getServerStatus".equals(type) || "sync.status".equals(type)) {
            JsonObject params = getParams(message);
            String backendBaseUrl = getBackendBaseUrl(params);
            JsonObject status = fetchServerStatus(backendBaseUrl);
            return BridgeResponse.success(requestId, status);
        }

        return BridgeResponse.error(requestId, "Unknown sync request: " + type);
    }

    private JsonObject fetchServerStatus(String backendBaseUrl) {
        String endpoint = normalizeBaseUrl(backendBaseUrl) + "/sync/status";

        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(5000);

            int statusCode = connection.getResponseCode();
            InputStream stream = statusCode >= 200 && statusCode < 300
                ? connection.getInputStream()
                : connection.getErrorStream();

            String responseBody = readFully(stream);
            if (statusCode < 200 || statusCode >= 300) {
                return offlineStatus("HTTP " + statusCode);
            }

            JsonObject payload = parseObject(responseBody);
            JsonObject data = new JsonObject();
            data.addProperty("type", "sync.getServerStatus");
            data.addProperty("online", true);
            data.addProperty("backupReady", getBoolean(payload, "backupReady", false));
            data.addProperty("backupCount", getInt(payload, "backupCount", 0));
            if (payload.has("latestBackupName") && !payload.get("latestBackupName").isJsonNull()) {
                data.addProperty("latestBackupName", payload.get("latestBackupName").getAsString());
            }
            data.addProperty("checkedAt", getLong(payload, "checkedAt", System.currentTimeMillis()));
            return data;
        } catch (Exception error) {
            return offlineStatus(error.getMessage() == null ? "Unknown error" : error.getMessage());
        }
    }

    private JsonObject offlineStatus(String reason) {
        JsonObject data = new JsonObject();
        data.addProperty("type", "sync.getServerStatus");
        data.addProperty("online", false);
        data.addProperty("backupReady", false);
        data.addProperty("backupCount", 0);
        data.addProperty("error", reason);
        data.addProperty("checkedAt", System.currentTimeMillis());
        return data;
    }

    private JsonObject parseObject(String json) {
        if (json == null || json.trim().isEmpty()) {
            return new JsonObject();
        }

        try {
            JsonElement element = GSON.fromJson(json, JsonElement.class);
            return element != null && element.isJsonObject() ? element.getAsJsonObject() : new JsonObject();
        } catch (Exception ignored) {
            return new JsonObject();
        }
    }

    private JsonObject getParams(BridgeMessage message) {
        return message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();
    }

    private String getBackendBaseUrl(JsonObject params) {
        String override = getStringParam(params, "backendBaseUrl");
        if (override != null && !override.trim().isEmpty()) {
            return override.trim();
        }

        String envValue = System.getenv("POS_BACKEND_URL");
        if (envValue != null && !envValue.trim().isEmpty()) {
            return envValue.trim();
        }

        return "http://localhost:8080";
    }

    private String normalizeBaseUrl(String backendBaseUrl) {
        if (backendBaseUrl == null || backendBaseUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("Backend base URL is required");
        }

        String trimmed = backendBaseUrl.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
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

    private boolean getBoolean(JsonObject object, String key, boolean fallback) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }

        try {
            return element.getAsBoolean();
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private int getInt(JsonObject object, String key, int fallback) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }

        try {
            return element.getAsInt();
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private long getLong(JsonObject object, String key, long fallback) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }

        try {
            return element.getAsLong();
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String readFully(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
            return builder.toString();
        }
    }
}
