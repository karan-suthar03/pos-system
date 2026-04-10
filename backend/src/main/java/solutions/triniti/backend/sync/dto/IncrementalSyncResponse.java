package solutions.triniti.backend.sync.dto;

import java.util.Map;

public class IncrementalSyncResponse {
    public String requestId;
    public boolean success;
    public long appliedAt;
    public long maxUpdatedAt;
    public Map<String, Integer> appliedRows;

    public static IncrementalSyncResponse ok(String requestId, Map<String, Integer> appliedRows, long maxUpdatedAt) {
        IncrementalSyncResponse response = new IncrementalSyncResponse();
        response.requestId = requestId;
        response.success = true;
        response.appliedAt = System.currentTimeMillis();
        response.maxUpdatedAt = maxUpdatedAt;
        response.appliedRows = appliedRows;
        return response;
    }
}
