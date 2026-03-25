package solutions.triniti.core.handler;

import com.google.gson.JsonObject;
import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;

public class PrintRequestHandler implements RequestHandler {

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("print.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) {
        String type = message == null ? null : message.getType();

        JsonObject data = new JsonObject();
        data.addProperty("type", type);
        data.addProperty("message", "Print handler received request. Implement printer adapter here.");
        return BridgeResponse.success(requestId, data);
    }
}
