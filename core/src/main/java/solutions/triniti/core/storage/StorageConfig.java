package solutions.triniti.core.storage;

import solutions.triniti.core.db.OrmLiteConnectionProvider;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public final class StorageConfig {

    private final String rootPath;
    private final String publicUriTemplate;

    public StorageConfig(String rootPath, String publicUriTemplate) {
        if (rootPath == null || rootPath.trim().isEmpty()) {
            throw new IllegalArgumentException("Storage root path is required");
        }
        this.rootPath = rootPath.trim();
        this.publicUriTemplate = publicUriTemplate == null || publicUriTemplate.trim().isEmpty()
            ? null
            : publicUriTemplate.trim();
    }

    public String getRootPath() {
        return rootPath;
    }

    public String getPublicUriTemplate() {
        return publicUriTemplate;
    }

    public String resolvePublicUrl(String relativePath) {
        if (relativePath == null || relativePath.trim().isEmpty()) {
            return null;
        }

        if (publicUriTemplate != null) {
            return resolveFromTemplate(relativePath);
        }

        return new File(rootPath, relativePath).toURI().toString();
    }

    private String resolveFromTemplate(String relativePath) {
        String encodedPath = URLEncoder.encode(relativePath, StandardCharsets.UTF_8)
            .replace("+", "%20");

        if (publicUriTemplate.contains("{path}")) {
            return publicUriTemplate.replace("{path}", encodedPath);
        }

        if (publicUriTemplate.endsWith("/") || publicUriTemplate.contains("?")) {
            return publicUriTemplate + encodedPath;
        }

        return publicUriTemplate + "/" + encodedPath;
    }

    public static StorageConfig fromProvider(OrmLiteConnectionProvider provider) {
        if (provider instanceof StorageRootProvider) {
            StorageRootProvider rootProvider = (StorageRootProvider) provider;
            return new StorageConfig(rootProvider.getStorageRootPath(), rootProvider.getStoragePublicUriTemplate());
        }

        String basePath = System.getProperty("user.dir");
        if (basePath == null || basePath.trim().isEmpty()) {
            basePath = ".";
        }

        return new StorageConfig(new File(basePath, "storage").getAbsolutePath(), null);
    }
}
