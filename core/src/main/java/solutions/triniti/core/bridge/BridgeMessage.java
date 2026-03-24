package solutions.triniti.core.bridge;

import com.google.gson.JsonElement;
import com.google.gson.JsonNull;

/**
 * Inner message body carried by BridgeRequest.
 */
public class BridgeMessage {

    private String type;
    private JsonElement params;

    public BridgeMessage() {
        // Required for Gson deserialization.
    }

    public BridgeMessage(String type, JsonElement params) {
        this.type = type;
        this.params = params;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public JsonElement getParams() {
        return params;
    }

    public void setParams(JsonElement params) {
        this.params = params;
    }

    public JsonElement getParamsOrJsonNull() {
        return params == null ? JsonNull.INSTANCE : params;
    }
}