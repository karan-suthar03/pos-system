package solutions.triniti.core.handler;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.repository.OrderRepository;

public class OrderRequestHandler implements RequestHandler {

    private final OrmLiteConnectionProvider ormLiteConnectionProvider;
    private final OrderRepository orderRepository;

    public OrderRequestHandler(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.ormLiteConnectionProvider = ormLiteConnectionProvider;
        this.orderRepository = ormLiteConnectionProvider == null ? null : new OrderRepository(ormLiteConnectionProvider);
    }

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("order.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if (orderRepository == null) {
            return BridgeResponse.error(requestId, "Database is not configured");
        }

        if ("order.ensureTable".equals(type)) {
            CoreDatabaseBootstrap.migrate(ormLiteConnectionProvider);
            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("message", "Order tables ensured");
            return BridgeResponse.success(requestId, data);
        }
        if ("order.createOrder".equals(type)){
            JsonObject params = message.getParamsOrJsonNull().isJsonObject()
                ? message.getParamsOrJsonNull().getAsJsonObject()
                : new JsonObject();

            params = params.get("order") != null && params.get("order").isJsonObject()
                ? params.get("order").getAsJsonObject()
                : new JsonObject();

            String tag = null;
            JsonElement tagElement = params.get("tag");
            if (tagElement != null && !tagElement.isJsonNull()) {
                if (tagElement.isJsonPrimitive() && tagElement.getAsJsonPrimitive().isString()) {
                    tag = tagElement.getAsString();
                } else {
                    tag = tagElement.toString();
                }
            }

            Order newOrder = orderRepository.createOrder(tag);

            for (JsonElement itemElement : params.get("items").getAsJsonArray()) {
                JsonObject itemObj = itemElement.getAsJsonObject();
                int dishId = itemObj.get("id").getAsInt();
                int quantity = itemObj.get("quantity").getAsInt();
                orderRepository.addOrderItem(newOrder.order_id, dishId, quantity);
            }

            orderRepository.updateOrderTotal(newOrder.order_id);

            newOrder = orderRepository.getOrderById(newOrder.order_id);

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.add("order", newOrder.toJson());
            return BridgeResponse.success(requestId, data);
        }

        return BridgeResponse.error(requestId, "Unknown order request: " + type);
    }
}
