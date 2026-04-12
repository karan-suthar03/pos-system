package solutions.triniti.core.restore;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

class BackupArchiveLoader {

    private static final int MAX_ZIP_ENTRIES = 64;
    private static final int MAX_JSON_ENTRY_BYTES = 8 * 1024 * 1024;

    ArchiveInspection inspect(byte[] zipBytes) throws Exception {
        JsonObject manifest = null;
        JsonObject backupJson = null;
        int entryCount = 0;

        try (ZipInputStream zipInputStream = new ZipInputStream(new java.io.ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    zipInputStream.closeEntry();
                    continue;
                }

                entryCount++;
                if (entryCount > MAX_ZIP_ENTRIES) {
                    throw new IllegalStateException("Backup ZIP has too many entries");
                }

                String name = entry.getName();
                if (name == null || name.contains("..") || name.startsWith("/") || name.startsWith("\\")) {
                    throw new IllegalStateException("Invalid ZIP entry path");
                }

                if ("backup-manifest.json".equals(name)) {
                    manifest = readJsonEntry(zipInputStream);
                } else if ("backup.json".equals(name)) {
                    backupJson = readJsonEntry(zipInputStream);
                }

                zipInputStream.closeEntry();
            }
        }

        if (manifest != null) {
            String formatFamily = getString(manifest, "formatFamily");
            int schemaVersion = getInt(manifest, "schemaVersion", 0);
            if ("pos-modern".equals(formatFamily) && schemaVersion >= 1) {
                return ArchiveInspection.modern(String.valueOf(schemaVersion), backupJson);
            }
            throw new IllegalStateException("backup-manifest.json is invalid");
        }

        if (backupJson != null && isLegacyBackup(backupJson)) {
            return ArchiveInspection.legacy("legacy-v1", backupJson);
        }

        throw new IllegalStateException("ZIP is not a supported backup archive");
    }

    boolean isLegacyBackup(JsonObject backupJson) {
        return backupJson.has("dishes") && backupJson.has("orders") && backupJson.has("order_items");
    }

    private JsonObject readJsonEntry(InputStream stream) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = stream.read(buffer)) != -1) {
            total += read;
            if (total > MAX_JSON_ENTRY_BYTES) {
                throw new IllegalStateException("Backup JSON entry exceeds allowed size");
            }
            output.write(buffer, 0, read);
        }

        JsonElement element = JsonParser.parseString(output.toString(StandardCharsets.UTF_8));
        if (!element.isJsonObject()) {
            throw new IllegalStateException("Backup JSON entry is not an object");
        }
        return element.getAsJsonObject();
    }

    private String getString(JsonObject object, String key) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }
        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
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
            try {
                return Integer.parseInt(element.getAsString());
            } catch (Exception ignoredAgain) {
                return fallback;
            }
        }
    }

    static class ArchiveInspection {
        final String detectedFormat;
        final String detectedVersion;
        final JsonObject backupJson;

        private ArchiveInspection(String detectedFormat, String detectedVersion, JsonObject backupJson) {
            this.detectedFormat = detectedFormat;
            this.detectedVersion = detectedVersion;
            this.backupJson = backupJson;
        }

        static ArchiveInspection modern(String version, JsonObject backupJson) {
            return new ArchiveInspection("modern", version, backupJson);
        }

        static ArchiveInspection legacy(String version, JsonObject backupJson) {
            return new ArchiveInspection("legacy", version, backupJson);
        }
    }
}
