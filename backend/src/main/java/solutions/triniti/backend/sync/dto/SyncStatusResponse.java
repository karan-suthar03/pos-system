package solutions.triniti.backend.sync.dto;

public class SyncStatusResponse {
    public boolean success;
    public boolean serverOnline;
    public boolean databaseExists;
    public boolean backupReady;
    public int backupCount;
    public String databasePath;
    public String latestBackupName;
    public long checkedAt;

    public static SyncStatusResponse ok(
        boolean databaseExists,
        boolean backupReady,
        int backupCount,
        String databasePath,
        String latestBackupName
    ) {
        SyncStatusResponse response = new SyncStatusResponse();
        response.success = true;
        response.serverOnline = true;
        response.databaseExists = databaseExists;
        response.backupReady = backupReady;
        response.backupCount = backupCount;
        response.databasePath = databasePath;
        response.latestBackupName = latestBackupName;
        response.checkedAt = System.currentTimeMillis();
        return response;
    }
}
