package solutions.triniti;

import java.io.*;
import com.google.gson.Gson;
import solutions.triniti.core.Core;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.print.PrintProviderRegistry;
import solutions.triniti.db.SqliteDatabase;
import solutions.triniti.print.DesktopPrinterConnectionProvider;
import solutions.triniti.sync.BackendFullSyncClient;
import java.time.LocalDate;

public class Main {

    private static final Gson GSON = new Gson();
    private static final long FULL_SYNC_RETRY_DELAY_MS = 30_000L;
    private static final long INCREMENTAL_SYNC_INTERVAL_MS = 30_000L;
    private static Core CORE;

    public static void main(String[] args) throws Exception {
        String dbPath = args.length > 0 ? args[0] : "pos.db";
        String backendBaseUrl = resolveBackendBaseUrl(args);

        PrintProviderRegistry.setProvider(new DesktopPrinterConnectionProvider());

        SqliteDatabase database = new SqliteDatabase(dbPath);
        CoreDatabaseBootstrap.migrate(database);
        CORE = new Core(database);

        RuntimeSyncState stateStore = new RuntimeSyncState();
        startDailyFullSyncWorker(database, backendBaseUrl, stateStore);
        startIncrementalSyncWorker(database, backendBaseUrl, stateStore);

        // Keep stdout as a strict JSON channel for bridge responses.
        System.err.println("JAVA READY");

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

        String line;
        while ((line = reader.readLine()) != null) {
            BridgeResponse response = handleLine(line);
            System.out.println(GSON.toJson(response));
            System.out.flush();
        }
    }

    private static String resolveBackendBaseUrl(String[] args) {
        if (args.length > 1 && args[1] != null && !args[1].trim().isEmpty()) {
            return args[1].trim();
        }

        String envValue = System.getenv("POS_BACKEND_URL");
        if (envValue != null && !envValue.trim().isEmpty()) {
            return envValue.trim();
        }

        return "http://localhost:8080";
    }

    private static void startDailyFullSyncWorker(SqliteDatabase database, String backendBaseUrl, RuntimeSyncState stateStore) {
        if (backendBaseUrl == null || backendBaseUrl.trim().isEmpty()) {
            System.err.println("FULL SYNC SKIPPED missing backend URL");
            return;
        }

        if (!stateStore.shouldRunFullSyncToday()) {
            System.err.println("FULL SYNC SKIPPED already completed for today date=" + stateStore.getLastFullSyncDate());
            return;
        }

        Thread worker = new Thread(() -> runDailyFullSyncWithRetry(database, backendBaseUrl, stateStore));
        worker.setName("daily-full-sync-worker");
        worker.setDaemon(true);
        worker.start();
    }

    private static void runDailyFullSyncWithRetry(SqliteDatabase database, String backendBaseUrl, RuntimeSyncState stateStore) {
        while (true) {
            try {
                BackendFullSyncClient.SyncResult result = BackendFullSyncClient.pushFullSync(database, backendBaseUrl);
                long syncCursor = result.maxUpdatedAt > 0 ? result.maxUpdatedAt : System.currentTimeMillis();
                stateStore.markFullSyncSuccess(syncCursor);
                System.err.println("FULL SYNC OK requestId=" + result.requestId + " rows=" + result.appliedRows);
                return;
            } catch (Exception syncError) {
                String message = syncError.getMessage() == null ? "Unknown error" : syncError.getMessage();
                System.err.println("FULL SYNC FAILED retrying_in_ms=" + FULL_SYNC_RETRY_DELAY_MS + " error=" + message);
                try {
                    Thread.sleep(FULL_SYNC_RETRY_DELAY_MS);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private static void startIncrementalSyncWorker(SqliteDatabase database, String backendBaseUrl, RuntimeSyncState stateStore) {
        if (backendBaseUrl == null || backendBaseUrl.trim().isEmpty()) {
            System.err.println("INCREMENTAL SYNC SKIPPED missing backend URL");
            return;
        }

        Thread worker = new Thread(() -> runIncrementalSyncLoop(database, backendBaseUrl, stateStore));
        worker.setName("incremental-sync-worker");
        worker.setDaemon(true);
        worker.start();
    }

    private static void runIncrementalSyncLoop(SqliteDatabase database, String backendBaseUrl, RuntimeSyncState stateStore) {
        while (true) {
            try {
                long lastSyncedAt = stateStore.getLastSyncedAt();
                BackendFullSyncClient.IncrementalSyncResult result =
                    BackendFullSyncClient.pushIncrementalSync(database, backendBaseUrl, lastSyncedAt);

                if (result.maxUpdatedAt > 0) {
                    stateStore.markIncrementalSyncSuccess(result.maxUpdatedAt);
                }

                System.err.println(
                    "INCREMENTAL SYNC OK requestId=" + result.requestId +
                    " rows=" + result.appliedRows +
                    " maxUpdatedAt=" + result.maxUpdatedAt
                );
            } catch (Exception syncError) {
                String message = syncError.getMessage() == null ? "Unknown error" : syncError.getMessage();
                System.err.println("INCREMENTAL SYNC FAILED error=" + message);
            }

            try {
                Thread.sleep(INCREMENTAL_SYNC_INTERVAL_MS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private static final class RuntimeSyncState {
        private String lastFullSyncDate;
        private long lastSyncedAt;

        synchronized boolean shouldRunFullSyncToday() {
            String today = LocalDate.now().toString();
            return !today.equals(lastFullSyncDate);
        }

        synchronized String getLastFullSyncDate() {
            return lastFullSyncDate;
        }

        synchronized long getLastSyncedAt() {
            return lastSyncedAt;
        }

        synchronized void markFullSyncSuccess(long syncedAt) {
            lastFullSyncDate = LocalDate.now().toString();
            lastSyncedAt = Math.max(lastSyncedAt, syncedAt);
        }

        synchronized void markIncrementalSyncSuccess(long syncedAt) {
            lastSyncedAt = Math.max(lastSyncedAt, syncedAt);
        }
    }

    private static BridgeResponse handleLine(String line) {
        try {
            BridgeRequest request = GSON.fromJson(line, BridgeRequest.class);
            return CORE.handleMessage(request);
        } catch (Exception e) {
            String message = e.getMessage() == null ? "Unknown error" : e.getMessage();
            return BridgeResponse.error(null, message);
        }
    }
}