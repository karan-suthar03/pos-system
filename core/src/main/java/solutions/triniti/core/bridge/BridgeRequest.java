package solutions.triniti.core.bridge;

/**
 * Shared request envelope used by platform bridges.
 */
public class BridgeRequest {

    private String requestId;
    private BridgeMessage message;

    public BridgeRequest() {
        // Required for Gson deserialization.
    }

    public BridgeRequest(String requestId, BridgeMessage message) {
        this.requestId = requestId;
        this.message = message;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public BridgeMessage getMessage() {
        return message;
    }

    public void setMessage(BridgeMessage message) {
        this.message = message;
    }
}
