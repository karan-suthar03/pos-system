package solutions.triniti.core.handler;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;

public interface RequestHandler {

    boolean supports(String type);

    BridgeResponse handle(String requestId, BridgeMessage message) throws Exception;
}
