package solutions.triniti.core;

import com.google.gson.JsonNull;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.handler.AnalyticsRequestHandler;
import solutions.triniti.core.handler.CategoryRequestHandler;
import solutions.triniti.core.handler.DishRequestHandler;
import solutions.triniti.core.handler.OrderRequestHandler;
import solutions.triniti.core.handler.PrintRequestHandler;
import solutions.triniti.core.handler.RequestHandler;
import solutions.triniti.core.handler.StorageRequestHandler;
import solutions.triniti.core.storage.StorageConfig;
import solutions.triniti.core.storage.StorageService;

import java.util.Arrays;
import java.util.List;

public class Core {

    private final OrmLiteConnectionProvider ormLiteConnectionProvider;
    private final List<RequestHandler> handlers;

    public Core() {
        this(null);
    }

    public Core(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.ormLiteConnectionProvider = ormLiteConnectionProvider;
        StorageConfig storageConfig = StorageConfig.fromProvider(ormLiteConnectionProvider);
        StorageService storageService = new StorageService(storageConfig);
        this.handlers = Arrays.asList(
            new AnalyticsRequestHandler(ormLiteConnectionProvider),
            new DishRequestHandler(ormLiteConnectionProvider),
            new CategoryRequestHandler(ormLiteConnectionProvider, storageService),
            new StorageRequestHandler(storageService),
            new OrderRequestHandler(ormLiteConnectionProvider),
            new PrintRequestHandler()
        );
    }

    public OrmLiteConnectionProvider getOrmLiteConnectionProvider() {
        return ormLiteConnectionProvider;
    }

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

        for (RequestHandler handler : handlers) {
            if (handler.supports(type)) {
                try {
                    return handler.handle(requestId, message);
                } catch (Exception e) {
                    String error = e.getMessage() == null ? "Unknown error" : e.getMessage();
                    return BridgeResponse.error(requestId, error);
                }
            }
        }

        data.addProperty("message", "Unhandled type: " + type);
        return BridgeResponse.success(requestId, data);
    }
}