package solutions.triniti.core.storage;

public final class StorageFile {

    private final String relativePath;
    private final String publicUrl;
    private final String originalName;
    private final String mimeType;
    private final long size;

    public StorageFile(String relativePath, String publicUrl, String originalName, String mimeType, long size) {
        this.relativePath = relativePath;
        this.publicUrl = publicUrl;
        this.originalName = originalName;
        this.mimeType = mimeType;
        this.size = size;
    }

    public String getRelativePath() {
        return relativePath;
    }

    public String getPublicUrl() {
        return publicUrl;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getSize() {
        return size;
    }
}
