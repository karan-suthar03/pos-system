package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.List;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.model.OrderItem;
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
            JsonObject params = getOrderPayloadFromMessage(message);

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

            JsonArray itemRequests = params.get("items") != null && params.get("items").isJsonArray()
                ? params.get("items").getAsJsonArray()
                : new JsonArray();

            for (JsonElement itemElement : itemRequests) {
                JsonObject itemObj = itemElement.getAsJsonObject();
                int dishId = itemObj.get("id").getAsInt();
                int quantity = itemObj.get("quantity").getAsInt();
                orderRepository.addOrderItem(newOrder.order_id, dishId, quantity);
            }

            orderRepository.updateOrderTotal(newOrder.order_id);

            newOrder = orderRepository.getOrderById(newOrder.order_id);
            return buildOrderResponse(requestId, type, newOrder);
        }

        if ("order.completeOrder".equals(type)) {
            int orderId = requireOrderId(message);
            Order updatedOrder = orderRepository.completeOrder(orderId);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.cancelOrder".equals(type)) {
            int orderId = requireOrderId(message);
            Order updatedOrder = orderRepository.cancelOrder(orderId);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.markPaid".equals(type)) {
            int orderId = requireOrderId(message);
            Order updatedOrder = orderRepository.markOrderPaid(orderId);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.togglePayment".equals(type)) {
            int orderId = requireOrderId(message);
            Order updatedOrder = orderRepository.toggleOrderPayment(orderId);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.setPaymentStatus".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);
            JsonElement paymentDoneElement = params.get("paymentDone");
            if ((paymentDoneElement == null || paymentDoneElement.isJsonNull()) && params.get("isPaymentDone") != null) {
                paymentDoneElement = params.get("isPaymentDone");
            }

            if (paymentDoneElement == null || paymentDoneElement.isJsonNull()) {
                throw new IllegalArgumentException("Missing required field: paymentDone");
            }

            boolean paymentDone;
            try {
                paymentDone = paymentDoneElement.getAsBoolean();
            } catch (Exception ignored) {
                throw new IllegalArgumentException("Invalid paymentDone value");
            }

            Order updatedOrder = orderRepository.setOrderPaymentStatus(orderId, paymentDone);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.getTodaysOrders".equals(type)) {
            JsonObject params = message != null && message.getParamsOrJsonNull().isJsonObject()
                ? message.getParamsOrJsonNull().getAsJsonObject()
                : new JsonObject();

            boolean includeCancelled = true;
            JsonElement includeCancelledElement = params.get("includeCancelled");
            if (includeCancelledElement != null && !includeCancelledElement.isJsonNull()) {
                try {
                    includeCancelled = includeCancelledElement.getAsBoolean();
                } catch (Exception ignored) {
                    throw new IllegalArgumentException("Invalid includeCancelled value");
                }
            }

            List<Order> orders = orderRepository.getTodaysOrders(includeCancelled);
            JsonArray ordersArray = new JsonArray();
            for (Order order : orders){
                JsonObject orderJson = order.toJson();
                List<OrderItem> items = orderRepository.listItemsByOrderId(order.order_id);
                JsonArray itemsArray = new JsonArray();
                for (OrderItem item : items){
                    itemsArray.add(item.toJson());
                }
                orderJson.add("items", itemsArray);
                ordersArray.add(orderJson);
            }
            return BridgeResponse.success(requestId, ordersArray);
        }
        return BridgeResponse.error(requestId, "Unknown order request: " + type);
    }

    private JsonObject getOrderPayloadFromMessage(BridgeMessage message) {
        JsonObject params = message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();

        JsonElement orderElement = params.get("order");
        if (orderElement != null && orderElement.isJsonObject()) {
            return orderElement.getAsJsonObject();
        }

        return params;
    }

    private int requireOrderId(BridgeMessage message) {
        JsonObject params = getOrderPayloadFromMessage(message);
        JsonElement orderIdElement = params.get("orderId");
        if ((orderIdElement == null || orderIdElement.isJsonNull()) && params.get("id") != null) {
            orderIdElement = params.get("id");
        }

        if (orderIdElement == null || orderIdElement.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: orderId");
        }

        try {
            return orderIdElement.getAsInt();
        } catch (Exception ignored) {
            throw new IllegalArgumentException("Invalid orderId");
        }
    }

    private BridgeResponse buildOrderResponse(String requestId, String type, Order order) throws Exception {
        JsonObject orderJson = order.toJson();
        JsonArray itemsArray = new JsonArray();
        List<OrderItem> items = orderRepository.listItemsByOrderId(order.order_id);
        for (OrderItem item : items) {
            itemsArray.add(item.toJson());
        }
        orderJson.add("items", itemsArray);

        JsonObject data = new JsonObject();
        data.addProperty("type", type);
        data.add("order", orderJson);
        return BridgeResponse.success(requestId, data);
    }
}
