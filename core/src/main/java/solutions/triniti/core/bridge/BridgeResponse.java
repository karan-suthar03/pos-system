package solutions.triniti.core.bridge;

import com.google.gson.JsonElement;
import com.google.gson.JsonNull;

/**
 * Shared response envelope used by platform bridges.
 */
public class BridgeResponse {

    private String requestId;
    private boolean success;
    private JsonElement data;
    private String error;

    public BridgeResponse() {
        // Required for Gson deserialization.
    }

    public BridgeResponse(String requestId, boolean success, JsonElement data, String error) {
        this.requestId = requestId;
        this.success = success;
        this.data = data;
        this.error = error;
    }

    public static BridgeResponse success(String requestId, JsonElement data) {
        return new BridgeResponse(requestId, true, data, null);
    }

    public static BridgeResponse error(String requestId, String error) {
        return new BridgeResponse(requestId, false, JsonNull.INSTANCE, error);
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public JsonElement getData() {
        return data;
    }

    public void setData(JsonElement data) {
        this.data = data;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public boolean hasData() {
        return data != null && !data.isJsonNull();
    }

    public JsonElement getDataOrJsonNull() {
        return data == null ? JsonNull.INSTANCE : data;
    }

    public boolean hasError() {
        return error != null && !error.trim().isEmpty();
    }
}
