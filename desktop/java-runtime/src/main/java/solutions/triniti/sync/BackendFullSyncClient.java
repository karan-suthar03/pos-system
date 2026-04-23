package solutions.triniti.sync;

import com.google.gson.Gson;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Category;
import solutions.triniti.core.model.Dish;
import solutions.triniti.core.model.InventoryItem;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.model.OrderItem;
import solutions.triniti.core.repository.CategoryRepository;
import solutions.triniti.core.repository.DishRepository;
import solutions.triniti.core.repository.InventoryRepository;
import solutions.triniti.core.repository.OrderRepository;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class BackendFullSyncClient {

    private static final Gson GSON = new Gson();

    private BackendFullSyncClient() {
    }

    public static SyncResult pushFullSync(OrmLiteConnectionProvider provider, String backendBaseUrl) throws Exception {
        FullSyncPayload payload = buildPayload(provider);
        payload.requestId = "desktop-full-" + System.currentTimeMillis();

        String endpoint = normalizeBaseUrl(backendBaseUrl) + "/sync/full";
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");

        String requestJson = GSON.toJson(payload);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(requestJson.getBytes(StandardCharsets.UTF_8));
        }

        int statusCode = connection.getResponseCode();
        InputStream stream = statusCode >= 200 && statusCode < 300
            ? connection.getInputStream()
            : connection.getErrorStream();

        String responseBody = readFully(stream);
        if (statusCode < 200 || statusCode >= 300) {
            throw new RuntimeException("Full sync failed (" + statusCode + "): " + responseBody);
        }

        SyncResult result = GSON.fromJson(responseBody, SyncResult.class);
        if (result == null || !result.success) {
            throw new RuntimeException("Full sync failed: invalid response");
        }

        result.maxUpdatedAt = payload.maxUpdatedAt;

        return result;
    }

    public static IncrementalSyncResult pushIncrementalSync(OrmLiteConnectionProvider provider, String backendBaseUrl, long lastSyncedAt) throws Exception {
        IncrementalSyncPayload payload = buildIncrementalPayload(provider, lastSyncedAt);
        payload.requestId = "desktop-incremental-" + System.currentTimeMillis();
        payload.lastSyncedAt = lastSyncedAt;

        String endpoint = normalizeBaseUrl(backendBaseUrl) + "/sync/incremental";
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");

        String requestJson = GSON.toJson(payload);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(requestJson.getBytes(StandardCharsets.UTF_8));
        }

        int statusCode = connection.getResponseCode();
        InputStream stream = statusCode >= 200 && statusCode < 300
            ? connection.getInputStream()
            : connection.getErrorStream();

        String responseBody = readFully(stream);
        if (statusCode < 200 || statusCode >= 300) {
            throw new RuntimeException("Incremental sync failed (" + statusCode + "): " + responseBody);
        }

        IncrementalSyncResult result = GSON.fromJson(responseBody, IncrementalSyncResult.class);
        if (result == null || !result.success) {
            throw new RuntimeException("Incremental sync failed: invalid response");
        }

        // If server does not return maxUpdatedAt for any reason, fallback to local payload max.
        if (result.maxUpdatedAt <= 0) {
            result.maxUpdatedAt = payload.maxUpdatedAt;
        }

        return result;
    }

    private static FullSyncPayload buildPayload(OrmLiteConnectionProvider provider) throws Exception {
        FullSyncPayload payload = new FullSyncPayload();

        CategoryRepository categoryRepository = new CategoryRepository(provider);
        DishRepository dishRepository = new DishRepository(provider);
        InventoryRepository inventoryRepository = new InventoryRepository(provider);
        OrderRepository orderRepository = new OrderRepository(provider);

        List<Category> categories = categoryRepository.listAllForSync();
        for (Category item : categories) {
            FullSyncPayload.CategoryRow row = new FullSyncPayload.CategoryRow();
            row.id = item.category_id;
            row.name = item.name;
            row.imagePath = item.image_path;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.categories.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<Dish> dishes = dishRepository.listAllForSync();
        for (Dish item : dishes) {
            FullSyncPayload.DishRow row = new FullSyncPayload.DishRow();
            row.id = item.dish_id;
            row.name = item.dish_name;
            row.category = item.category;
            row.categoryId = item.category_id;
            row.price = item.price;
            row.isAvailable = item.is_available;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.dishes.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<InventoryItem> inventoryItems = inventoryRepository.listItemsForSync();
        for (InventoryItem item : inventoryItems) {
            FullSyncPayload.InventoryItemRow row = new FullSyncPayload.InventoryItemRow();
            row.inventoryItemId = item.inventory_item_id;
            row.name = item.name;
            row.category = item.category;
            row.unit = item.unit;
            row.onHand = item.on_hand;
            row.lowStockThreshold = item.low_stock_threshold;
            row.maxStock = item.max_stock;
            row.notes = item.notes;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.inventoryItems.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<Order> orders = orderRepository.listAllForSync();
        for (Order item : orders) {
            FullSyncPayload.OrderRow row = new FullSyncPayload.OrderRow();
            row.orderId = item.order_id;
            row.displayId = item.display_id;
            row.orderTag = item.order_tag;
            row.isPaymentDone = item.is_payment_done;
            row.orderTotal = item.order_total;
            row.orderStatus = item.order_status;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.orders.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);

        }

        List<OrderItem> orderItems = orderRepository.listAllItemsForSync();
        for (OrderItem orderItem : orderItems) {
            FullSyncPayload.OrderItemRow itemRow = new FullSyncPayload.OrderItemRow();
            itemRow.orderItemId = orderItem.order_item_id;
            itemRow.orderId = orderItem.order_id;
            itemRow.dishId = orderItem.dish_id;
            itemRow.quantity = orderItem.quantity;
            itemRow.dishNameSnapshot = orderItem.dish_name_snapshot;
            itemRow.priceSnapshot = orderItem.price_snapshot;
            itemRow.itemStatus = orderItem.item_status;
            itemRow.createdAt = orderItem.created_at;
            itemRow.updatedAt = orderItem.updated_at;
            itemRow.deletedAt = orderItem.deleted_at;
            payload.orderItems.add(itemRow);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, itemRow.updatedAt);
        }

        return payload;
    }

    private static IncrementalSyncPayload buildIncrementalPayload(OrmLiteConnectionProvider provider, long lastSyncedAt) throws Exception {
        IncrementalSyncPayload payload = new IncrementalSyncPayload();

        CategoryRepository categoryRepository = new CategoryRepository(provider);
        DishRepository dishRepository = new DishRepository(provider);
        InventoryRepository inventoryRepository = new InventoryRepository(provider);
        OrderRepository orderRepository = new OrderRepository(provider);

        List<Category> categories = categoryRepository.listUpdatedSinceForSync(lastSyncedAt);
        for (Category item : categories) {
            FullSyncPayload.CategoryRow row = new FullSyncPayload.CategoryRow();
            row.id = item.category_id;
            row.name = item.name;
            row.imagePath = item.image_path;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.categories.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<Dish> dishes = dishRepository.listUpdatedSinceForSync(lastSyncedAt);
        for (Dish item : dishes) {
            FullSyncPayload.DishRow row = new FullSyncPayload.DishRow();
            row.id = item.dish_id;
            row.name = item.dish_name;
            row.category = item.category;
            row.categoryId = item.category_id;
            row.price = item.price;
            row.isAvailable = item.is_available;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.dishes.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<InventoryItem> inventoryItems = inventoryRepository.listItemsUpdatedSinceForSync(lastSyncedAt);
        for (InventoryItem item : inventoryItems) {
            FullSyncPayload.InventoryItemRow row = new FullSyncPayload.InventoryItemRow();
            row.inventoryItemId = item.inventory_item_id;
            row.name = item.name;
            row.category = item.category;
            row.unit = item.unit;
            row.onHand = item.on_hand;
            row.lowStockThreshold = item.low_stock_threshold;
            row.maxStock = item.max_stock;
            row.notes = item.notes;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.inventoryItems.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<Order> orders = orderRepository.listUpdatedSinceForSync(lastSyncedAt);
        for (Order item : orders) {
            FullSyncPayload.OrderRow row = new FullSyncPayload.OrderRow();
            row.orderId = item.order_id;
            row.displayId = item.display_id;
            row.orderTag = item.order_tag;
            row.isPaymentDone = item.is_payment_done;
            row.orderTotal = item.order_total;
            row.orderStatus = item.order_status;
            row.createdAt = item.created_at;
            row.updatedAt = item.updated_at;
            row.deletedAt = item.deleted_at;
            payload.orders.add(row);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, row.updatedAt);
        }

        List<OrderItem> orderItems = orderRepository.listItemsUpdatedSinceForSync(lastSyncedAt);
        for (OrderItem orderItem : orderItems) {
            FullSyncPayload.OrderItemRow itemRow = new FullSyncPayload.OrderItemRow();
            itemRow.orderItemId = orderItem.order_item_id;
            itemRow.orderId = orderItem.order_id;
            itemRow.dishId = orderItem.dish_id;
            itemRow.quantity = orderItem.quantity;
            itemRow.dishNameSnapshot = orderItem.dish_name_snapshot;
            itemRow.priceSnapshot = orderItem.price_snapshot;
            itemRow.itemStatus = orderItem.item_status;
            itemRow.createdAt = orderItem.created_at;
            itemRow.updatedAt = orderItem.updated_at;
            itemRow.deletedAt = orderItem.deleted_at;
            payload.orderItems.add(itemRow);
            payload.maxUpdatedAt = Math.max(payload.maxUpdatedAt, itemRow.updatedAt);
        }

        return payload;
    }

    private static String normalizeBaseUrl(String backendBaseUrl) {
        if (backendBaseUrl == null || backendBaseUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("Backend base URL is required");
        }

        String trimmed = backendBaseUrl.trim();
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }

        return trimmed;
    }

    private static String readFully(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
            return builder.toString();
        }
    }

    public static class FullSyncPayload {
        public String requestId;
        public List<CategoryRow> categories = new ArrayList<>();
        public List<DishRow> dishes = new ArrayList<>();
        public List<InventoryItemRow> inventoryItems = new ArrayList<>();
        public List<OrderRow> orders = new ArrayList<>();
        public List<OrderItemRow> orderItems = new ArrayList<>();
        public transient long maxUpdatedAt;

        public static class CategoryRow {
            public int id;
            public String name;
            public String imagePath;
            public long createdAt;
            public long updatedAt;
            public Long deletedAt;
        }

        public static class DishRow {
            public int id;
            public String name;
            public String category;
            public int categoryId;
            public int price;
            public boolean isAvailable;
            public long createdAt;
            public long updatedAt;
            public Long deletedAt;
        }

        public static class InventoryItemRow {
            public int inventoryItemId;
            public String name;
            public String category;
            public String unit;
            public double onHand;
            public double lowStockThreshold;
            public double maxStock;
            public String notes;
            public long createdAt;
            public long updatedAt;
            public Long deletedAt;
        }

        public static class OrderRow {
            public int orderId;
            public String displayId;
            public String orderTag;
            public boolean isPaymentDone;
            public int orderTotal;
            public String orderStatus;
            public long createdAt;
            public long updatedAt;
            public Long deletedAt;
        }

        public static class OrderItemRow {
            public int orderItemId;
            public int orderId;
            public int dishId;
            public int quantity;
            public String dishNameSnapshot;
            public int priceSnapshot;
            public String itemStatus;
            public long createdAt;
            public long updatedAt;
            public Long deletedAt;
        }
    }

    public static class SyncResult {
        public String requestId;
        public boolean success;
        public long appliedAt;
        public long maxUpdatedAt;
        public Map<String, Integer> appliedRows = new HashMap<>();
    }

    public static class IncrementalSyncPayload extends FullSyncPayload {
        public long lastSyncedAt;
    }

    public static class IncrementalSyncResult {
        public String requestId;
        public boolean success;
        public long appliedAt;
        public long maxUpdatedAt;
        public Map<String, Integer> appliedRows = new HashMap<>();
    }
}
