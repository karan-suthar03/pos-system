package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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

        if ("order.setStatus".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);
            String status = requireStringParam(params, "status");

            Order updatedOrder = orderRepository.setOrderStatus(orderId, status);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.updateTag".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);
            String tag = getStringParam(params, "tag");

            Order updatedOrder = orderRepository.updateOrderTag(orderId, tag);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.addItem".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);

            int dishId = getIntParam(params, "dishId", -1);
            if (dishId <= 0 && params.get("id") != null && !params.get("id").isJsonNull()) {
                dishId = getIntParam(params, "id", -1);
            }
            if (dishId <= 0) {
                throw new IllegalArgumentException("Missing required field: dishId");
            }

            int quantity = getIntParam(params, "quantity", 1);
            if (quantity <= 0) {
                throw new IllegalArgumentException("Invalid quantity");
            }

            Order updatedOrder = orderRepository.addItemToOrder(orderId, dishId, quantity);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.updateItemQuantity".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);
            int orderItemId = requireOrderItemId(params);
            int quantity = getIntParam(params, "quantity", -1);
            if (quantity <= 0) {
                throw new IllegalArgumentException("Invalid quantity");
            }

            Order updatedOrder = orderRepository.updateOrderItemQuantity(orderId, orderItemId, quantity);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.updateItemStatus".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);
            int orderItemId = requireOrderItemId(params);
            String status = requireStringParam(params, "status");

            Order updatedOrder = orderRepository.updateOrderItemStatus(orderId, orderItemId, status);
            return buildOrderResponse(requestId, type, updatedOrder);
        }

        if ("order.removeItem".equals(type)) {
            JsonObject params = getOrderPayloadFromMessage(message);
            int orderId = requireOrderId(message);
            int orderItemId = requireOrderItemId(params);

            Order updatedOrder = orderRepository.removeOrderItem(orderId, orderItemId);
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

        if ("order.getOrdersHistory".equals(type)) {
            return handleGetOrdersHistory(requestId, message, type);
        }

        if ("order.getOrderById".equals(type)) {
            return handleGetOrderById(requestId, message, type);
        }

        return BridgeResponse.error(requestId, "Unknown order request: " + type);
    }

    private BridgeResponse handleGetOrdersHistory(String requestId, BridgeMessage message, String type) throws Exception {
        JsonObject params = getOrderPayloadFromMessage(message);

        String searchQuery = getStringParam(params, "searchQuery");
        String startDate = getStringParam(params, "startDate");
        String endDate = getStringParam(params, "endDate");
        String sortKey = getStringParam(params, "sortKey");
        String sortDirection = getStringParam(params, "sortDirection");
        int page = getIntParam(params, "page", 1);
        int pageSize = getIntParam(params, "pageSize", 10);

        long startMillis = resolveStartMillis(startDate);
        long endMillis = resolveEndMillis(endDate);

        List<Order> orders = orderRepository.listAll();
        List<Order> filteredOrders = new ArrayList<>();
        String normalizedSearch = searchQuery == null ? "" : searchQuery.trim().toLowerCase(Locale.US);

        for (Order order : orders) {
            if (order == null) {
                continue;
            }

            if (order.created_at < startMillis || order.created_at > endMillis) {
                continue;
            }

            if (!normalizedSearch.isEmpty()) {
                String searchableText = (
                    (order.display_id == null ? "" : order.display_id)
                        + " "
                        + (order.order_tag == null ? "" : order.order_tag)
                        + " "
                        + order.order_id
                ).toLowerCase(Locale.US);

                if (!searchableText.contains(normalizedSearch)) {
                    continue;
                }
            }

            filteredOrders.add(order);
        }

        Comparator<Order> comparator = buildOrderComparator(sortKey);
        if (!"asc".equalsIgnoreCase(sortDirection)) {
            comparator = comparator.reversed();
        }
        filteredOrders.sort(comparator);

        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, Math.min(pageSize, 100));
        int totalCount = filteredOrders.size();

        long computedStartIndex = (long) (safePage - 1) * safePageSize;
        int fromIndex = (int) Math.min(computedStartIndex, totalCount);
        int toIndex = Math.min(fromIndex + safePageSize, totalCount);

        JsonArray ordersArray = new JsonArray();
        for (int i = fromIndex; i < toIndex; i++) {
            ordersArray.add(filteredOrders.get(i).toJson());
        }

        JsonObject data = new JsonObject();
        data.addProperty("type", type);
        data.add("orders", ordersArray);
        data.addProperty("totalCount", totalCount);
        data.addProperty("page", safePage);
        data.addProperty("pageSize", safePageSize);

        return BridgeResponse.success(requestId, data);
    }

    private BridgeResponse handleGetOrderById(String requestId, BridgeMessage message, String type) throws Exception {
        int orderId = requireOrderId(message);
        Order order = orderRepository.getOrderById(orderId);

        if (order == null) {
            return BridgeResponse.error(requestId, "Order not found for id: " + orderId);
        }

        JsonObject orderJson = order.toJson();
        JsonArray itemsArray = new JsonArray();
        List<OrderItem> items = orderRepository.listItemsByOrderId(orderId);
        for (OrderItem item : items) {
            itemsArray.add(item.toJson());
        }
        orderJson.add("items", itemsArray);

        JsonObject data = new JsonObject();
        data.addProperty("type", type);
        data.add("order", orderJson);
        return BridgeResponse.success(requestId, data);
    }

    private Comparator<Order> buildOrderComparator(String sortKey) {
        if ("orderTotal".equals(sortKey) || "total".equals(sortKey)) {
            return Comparator.comparingInt(order -> order.order_total);
        }

        if ("tag".equals(sortKey) || "orderTag".equals(sortKey)) {
            return Comparator.comparing(order -> {
                String tagOrDisplayId = order.order_tag;
                if (tagOrDisplayId == null || tagOrDisplayId.trim().isEmpty()) {
                    tagOrDisplayId = order.display_id;
                }

                return tagOrDisplayId == null ? "" : tagOrDisplayId.toLowerCase(Locale.US);
            });
        }

        return Comparator.comparingLong(order -> order.created_at);
    }

    private long resolveStartMillis(String isoDate) {
        if (isoDate == null || isoDate.trim().isEmpty()) {
            return Long.MIN_VALUE;
        }

        try {
            return LocalDate.parse(isoDate.trim())
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
        } catch (DateTimeParseException ignored) {
            throw new IllegalArgumentException("Invalid startDate format. Expected YYYY-MM-DD");
        }
    }

    private long resolveEndMillis(String isoDate) {
        if (isoDate == null || isoDate.trim().isEmpty()) {
            return Long.MAX_VALUE;
        }

        try {
            long nextDayMidnight = LocalDate.parse(isoDate.trim())
                .plusDays(1)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
            return nextDayMidnight - 1;
        } catch (DateTimeParseException ignored) {
            throw new IllegalArgumentException("Invalid endDate format. Expected YYYY-MM-DD");
        }
    }

    private String getStringParam(JsonObject params, String key) {
        JsonElement element = params.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }

        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private int getIntParam(JsonObject params, String key, int fallback) {
        JsonElement element = params.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }

        try {
            return element.getAsInt();
        } catch (Exception ignored) {
            return fallback;
        }
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

    private int requireOrderItemId(JsonObject params) {
        JsonElement orderItemIdElement = params.get("orderItemId");
        if ((orderItemIdElement == null || orderItemIdElement.isJsonNull()) && params.get("itemId") != null) {
            orderItemIdElement = params.get("itemId");
        }

        if (orderItemIdElement == null || orderItemIdElement.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: orderItemId");
        }

        try {
            int orderItemId = orderItemIdElement.getAsInt();
            if (orderItemId <= 0) {
                throw new IllegalArgumentException("Invalid orderItemId");
            }
            return orderItemId;
        } catch (Exception ignored) {
            throw new IllegalArgumentException("Invalid orderItemId");
        }
    }

    private String requireStringParam(JsonObject params, String key) {
        String value = getStringParam(params, key);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }

        return value;
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
