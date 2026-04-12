package solutions.triniti.core.handler;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.restore.RestoreService;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

public class BackupRestoreRequestHandler implements RequestHandler {

    private static final Gson GSON = new Gson();

    private final OrmLiteConnectionProvider ormLiteConnectionProvider;
    private final RestoreService restoreService;

    public BackupRestoreRequestHandler(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.ormLiteConnectionProvider = ormLiteConnectionProvider;
        this.restoreService = ormLiteConnectionProvider == null ? null : new RestoreService(ormLiteConnectionProvider);
    }

    @Override
    public boolean supports(String type) {
        return "sync.restoreBackup".equals(type)
            || "sync.restoreLegacyBackup".equals(type)
            || "sync.restoreBackupLocal".equals(type)
            || "sync.restoreBackupRemote".equals(type)
            || "sync.backup".equals(type)
            || "sync.backupLocal".equals(type)
            || "sync.backupRemote".equals(type);
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();
        JsonObject params = getParams(message);

        if ("sync.restoreBackup".equals(type) || "sync.restoreLegacyBackup".equals(type) || "sync.restoreBackupLocal".equals(type)) {
            String backupBase64 = getStringParam(params, "backupBase64");
            boolean wipeExistingData = getBooleanParam(params, "wipeExistingData", true);

            if (backupBase64 == null || backupBase64.trim().isEmpty()) {
                return BridgeResponse.error(requestId, "Missing backupBase64 payload");
            }

            if (ormLiteConnectionProvider == null || restoreService == null) {
                return BridgeResponse.error(requestId, "Database is not configured");
            }

            byte[] backupZip;
            try {
                backupZip = Base64.getDecoder().decode(backupBase64);
            } catch (IllegalArgumentException ex) {
                return BridgeResponse.error(requestId, "Invalid backupBase64 payload");
            }

            JsonObject result = restoreService.restoreBackupLocal(backupZip, wipeExistingData);
            return BridgeResponse.success(requestId, result);
        }

        if ("sync.restoreBackupRemote".equals(type)) {
            String backendBaseUrl = getBackendBaseUrl(params);
            String backupBase64 = getStringParam(params, "backupBase64");
            boolean wipeExistingData = getBooleanParam(params, "wipeExistingData", true);
            String fileName = getStringParam(params, "fileName");

            if (backupBase64 == null || backupBase64.trim().isEmpty()) {
                return BridgeResponse.error(requestId, "Missing backupBase64 payload");
            }

            byte[] backupZip;
            try {
                backupZip = Base64.getDecoder().decode(backupBase64);
            } catch (IllegalArgumentException ex) {
                return BridgeResponse.error(requestId, "Invalid backupBase64 payload");
            }

            JsonObject result = restoreBackupRemote(backendBaseUrl, backupZip, wipeExistingData, fileName);
            return BridgeResponse.success(requestId, result);
        }

        if ("sync.backup".equals(type) || "sync.backupLocal".equals(type) || "sync.backupRemote".equals(type)) {
            JsonObject result = new JsonObject();
            result.addProperty("type", "sync.backup");
            result.addProperty("success", false);
            result.addProperty("message", "Backup flow is not implemented yet");
            return BridgeResponse.success(requestId, result);
        }

        return BridgeResponse.error(requestId, "Unknown backup/restore request: " + type);
    }

    private JsonObject restoreBackupRemote(String backendBaseUrl, byte[] backupZip, boolean wipeExistingData, String fileName) {
        String endpoint = normalizeBaseUrl(backendBaseUrl) + "/sync/restore";
        String boundary = "----pos-boundary-" + UUID.randomUUID();
        String safeFileName = (fileName == null || fileName.trim().isEmpty()) ? "backup.zip" : fileName.trim();

        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(120000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

            byte[] body = buildRestoreMultipartBody(boundary, safeFileName, backupZip, wipeExistingData);
            connection.setFixedLengthStreamingMode(body.length);

            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(body);
            }

            int statusCode = connection.getResponseCode();
            InputStream stream = statusCode >= 200 && statusCode < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
            String responseBody = readFully(stream);

            JsonObject data = parseObject(responseBody);
            data.addProperty("type", "sync.restoreBackup");
            data.addProperty("httpStatus", statusCode);
            data.addProperty("online", statusCode >= 200 && statusCode < 300);
            return data;
        } catch (Exception error) {
            JsonObject data = new JsonObject();
            data.addProperty("type", "sync.restoreBackup");
            data.addProperty("success", false);
            data.addProperty("online", false);
            data.addProperty("error", error.getMessage() == null ? "Unknown error" : error.getMessage());
            return data;
        }
    }

    private byte[] buildRestoreMultipartBody(String boundary, String fileName, byte[] backupZip, boolean wipeExistingData) throws Exception {
        String crlf = "\r\n";
        ByteArrayOutputStream body = new ByteArrayOutputStream();

        body.write(("--" + boundary + crlf).getBytes(StandardCharsets.UTF_8));
        body.write(("Content-Disposition: form-data; name=\"wipeExistingData\"" + crlf + crlf).getBytes(StandardCharsets.UTF_8));
        body.write((String.valueOf(wipeExistingData) + crlf).getBytes(StandardCharsets.UTF_8));

        body.write(("--" + boundary + crlf).getBytes(StandardCharsets.UTF_8));
        body.write(("Content-Disposition: form-data; name=\"backupZip\"; filename=\"" + sanitizeFileName(fileName) + "\"" + crlf).getBytes(StandardCharsets.UTF_8));
        body.write(("Content-Type: application/zip" + crlf + crlf).getBytes(StandardCharsets.UTF_8));
        body.write(backupZip);
        body.write(crlf.getBytes(StandardCharsets.UTF_8));

        body.write(("--" + boundary + "--" + crlf).getBytes(StandardCharsets.UTF_8));
        return body.toByteArray();
    }

    private String sanitizeFileName(String fileName) {
        return fileName.replace("\r", "_").replace("\n", "_").replace("\"", "_");
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

    private boolean getBooleanParam(JsonObject params, String key, boolean fallback) {
        JsonElement element = params.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }

        try {
            return element.getAsBoolean();
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
