package solutions.triniti.backend.sync.dto;

import java.util.Map;

public class FullSyncResponse {
    public String requestId;
    public boolean success;
    public long appliedAt;
    public Map<String, Integer> appliedRows;

    public static FullSyncResponse ok(String requestId, Map<String, Integer> appliedRows) {
        FullSyncResponse response = new FullSyncResponse();
        response.requestId = requestId;
        response.success = true;
        response.appliedAt = System.currentTimeMillis();
        response.appliedRows = appliedRows;
        return response;
    }
}
