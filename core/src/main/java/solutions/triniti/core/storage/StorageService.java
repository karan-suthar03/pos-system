package solutions.triniti.core.storage;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

public class StorageService {

    private final StorageConfig config;

    public StorageService(StorageConfig config) {
        if (config == null) {
            throw new IllegalArgumentException("Storage config cannot be null");
        }
        this.config = config;
    }

    public StorageFile save(String folder, String fileName, String mimeType, byte[] data) throws Exception {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("File data is required");
        }

        String safeFolder = sanitizeSegment(folder, "files");
        String safeBaseName = sanitizeBaseName(stripExtension(fileName), "file");
        String extension = resolveExtension(fileName, mimeType);
        String unique = UUID.randomUUID().toString().replace("-", "");
        String storedName = safeBaseName + "_" + unique + extension;

        Path root = Paths.get(config.getRootPath()).toAbsolutePath().normalize();
        Path directory = root.resolve(safeFolder).normalize();
        Files.createDirectories(directory);

        Path target = directory.resolve(storedName).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage path");
        }

        Files.write(target, data, StandardOpenOption.CREATE_NEW);

        String relativePath = safeFolder + "/" + storedName;
        String publicUrl = config.resolvePublicUrl(relativePath);
        return new StorageFile(relativePath, publicUrl, fileName, mimeType, data.length);
    }

    public boolean delete(String relativePath) throws Exception {
        Path target = resolvePath(relativePath);
        if (target == null) {
            return false;
        }
        return Files.deleteIfExists(target);
    }

    public String resolvePublicUrl(String relativePath) {
        return config.resolvePublicUrl(normalizeRelativePath(relativePath));
    }

    public Path resolvePath(String relativePath) {
        String normalized = normalizeRelativePath(relativePath);
        if (normalized == null) {
            return null;
        }

        Path root = Paths.get(config.getRootPath()).toAbsolutePath().normalize();
        Path target = root.resolve(normalized).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage path");
        }

        return target;
    }

    private String sanitizeSegment(String value, String fallback) {
        if (value == null) {
            return fallback;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return fallback;
        }

        String sanitized = trimmed.replaceAll("[^a-zA-Z0-9_-]+", "-");
        sanitized = sanitized.replaceAll("^-+", "").replaceAll("-+$", "");
        return sanitized.isEmpty() ? fallback : sanitized;
    }

    private String sanitizeBaseName(String value, String fallback) {
        if (value == null) {
            return fallback;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return fallback;
        }

        String sanitized = trimmed.replaceAll("[^a-zA-Z0-9_-]+", "-");
        sanitized = sanitized.replaceAll("^-+", "").replaceAll("-+$", "");
        return sanitized.isEmpty() ? fallback : sanitized;
    }

    private String stripExtension(String fileName) {
        if (fileName == null) {
            return "";
        }

        String trimmed = fileName.trim();
        int dot = trimmed.lastIndexOf('.');
        if (dot <= 0) {
            return trimmed;
        }

        return trimmed.substring(0, dot);
    }

    private String resolveExtension(String fileName, String mimeType) {
        String extension = extractExtension(fileName);
        if (extension != null) {
            return extension;
        }

        if (mimeType == null) {
            return "";
        }

        String normalized = mimeType.toLowerCase(Locale.US);
        if (normalized.contains("jpeg") || normalized.contains("jpg")) {
            return ".jpg";
        }
        if (normalized.contains("png")) {
            return ".png";
        }
        if (normalized.contains("webp")) {
            return ".webp";
        }
        if (normalized.contains("pdf")) {
            return ".pdf";
        }

        return "";
    }

    private String extractExtension(String fileName) {
        if (fileName == null) {
            return null;
        }

        String trimmed = fileName.trim();
        int dot = trimmed.lastIndexOf('.');
        if (dot <= 0 || dot == trimmed.length() - 1) {
            return null;
        }

        String ext = trimmed.substring(dot).toLowerCase(Locale.US);
        if (ext.matches("\\.[a-z0-9]{1,10}")) {
            return ext;
        }

        return null;
    }

    private String normalizeRelativePath(String relativePath) {
        if (relativePath == null) {
            return null;
        }

        String normalized = relativePath.trim().replace('\\', '/');
        if (normalized.isEmpty()) {
            return null;
        }

        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }

        if (normalized.contains("..")) {
            throw new IllegalArgumentException("Invalid storage path");
        }

        return normalized;
    }
}
