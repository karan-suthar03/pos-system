package solutions.triniti.core;

import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;

public class Core {

    public BridgeResponse handleMessage(BridgeRequest request) {
        if (request == null) {
            return BridgeResponse.error(null, "Request is null");
        }

        String requestId = request.getRequestId();
        BridgeMessage message = request.getMessage();

        JsonObject data = new JsonObject();
        String type = message == null ? null : message.getType();
        data.addProperty("type", type);
        data.add("params", message == null ? JsonNull.INSTANCE : message.getParamsOrJsonNull());

        if (type == null) {
            data.addProperty("message", "Core handler received request");
            return BridgeResponse.success(requestId, data);
        }

        switch (type) {
            default:
                data.addProperty("message", "Unhandled type: " + type);
                return BridgeResponse.success(requestId, data);
        }
    }
}