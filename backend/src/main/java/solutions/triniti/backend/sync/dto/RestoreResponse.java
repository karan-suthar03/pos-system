package solutions.triniti.backend.sync.dto;

import java.util.List;
import java.util.Map;

public class RestoreResponse {
    public String requestId;
    public boolean success;
    public String message;
    public String detectedFormat;
    public String detectedVersion;
    public boolean wipeExistingData;
    public long restoredAt;
    public Map<String, Integer> appliedRows;
    public int skippedOrderItems;
    public List<String> warnings;

    public static RestoreResponse ok(
        String requestId,
        String detectedFormat,
        String detectedVersion,
        boolean wipeExistingData,
        Map<String, Integer> appliedRows,
        int skippedOrderItems,
        List<String> warnings
    ) {
        RestoreResponse response = new RestoreResponse();
        response.requestId = requestId;
        response.success = true;
        response.message = "Restore completed";
        response.detectedFormat = detectedFormat;
        response.detectedVersion = detectedVersion;
        response.wipeExistingData = wipeExistingData;
        response.restoredAt = System.currentTimeMillis();
        response.appliedRows = appliedRows;
        response.skippedOrderItems = skippedOrderItems;
        response.warnings = warnings;
        return response;
    }
}
