package solutions.triniti.core.restore;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import com.j256.ormlite.misc.TransactionManager;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Category;
import solutions.triniti.core.model.Dish;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.model.OrderItem;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
public class RestoreService {

    private static final int MAX_WARNING_COUNT = 25;
    private static final DateTimeFormatter LEGACY_BACKUP_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
    private static final DateTimeFormatter LEGACY_ROW_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final OrmLiteConnectionProvider ormLiteConnectionProvider;
    private final BackupArchiveLoader backupArchiveLoader;

    public RestoreService(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.ormLiteConnectionProvider = ormLiteConnectionProvider;
        this.backupArchiveLoader = new BackupArchiveLoader();
    }

    public JsonObject restoreBackupLocal(byte[] backupZip, boolean wipeExistingData) {
        try {
            BackupArchiveLoader.ArchiveInspection inspection = backupArchiveLoader.inspect(backupZip);
            JsonObject response = new JsonObject();
            response.addProperty("type", "sync.restoreBackup");
            response.addProperty("detectedFormat", inspection.detectedFormat);
            response.addProperty("detectedVersion", inspection.detectedVersion);

            if ("modern".equals(inspection.detectedFormat)) {
                response.addProperty("success", false);
                response.addProperty("message", "Modern backup detected but parser is not implemented yet");
                return response;
            }

            if (!"legacy".equals(inspection.detectedFormat)) {
                response.addProperty("success", false);
                response.addProperty("message", "Unsupported backup format");
                return response;
            }

            LegacyRestorePayload payload = mapLegacyPayload(inspection.backupJson);
            LocalRestoreResult restoreResult = applyLegacyRestore(payload, wipeExistingData);

            response.addProperty("success", true);
            response.addProperty("message", "Restore completed");
            response.addProperty("wipeExistingData", wipeExistingData);
            response.addProperty("restoredAt", System.currentTimeMillis());
            response.add("appliedRows", restoreResult.appliedRows);
            response.addProperty("skippedOrderItems", restoreResult.skippedOrderItems);

            JsonArray warnings = new JsonArray();
            for (String warning : restoreResult.warnings) {
                warnings.add(warning);
            }
            response.add("warnings", warnings);
            return response;
        } catch (Exception e) {
            JsonObject response = new JsonObject();
            response.addProperty("type", "sync.restoreBackup");
            response.addProperty("success", false);
            response.addProperty("message", e.getMessage() == null ? "Restore failed" : e.getMessage());
            return response;
        }
    }

    private LegacyRestorePayload mapLegacyPayload(JsonObject backupJson) {
        if (!backupArchiveLoader.isLegacyBackup(backupJson)) {
            throw new IllegalStateException("Legacy backup.json is missing required keys");
        }

        long defaultTime = resolveBackupTimestamp(backupJson, System.currentTimeMillis());
        List<String> warnings = new ArrayList<>();

        List<RestoreCategoryRow> categories = new ArrayList<>();
        List<RestoreDishRow> dishes = new ArrayList<>();
        List<RestoreOrderRow> orders = new ArrayList<>();
        List<RestoreOrderItemRow> orderItems = new ArrayList<>();

        Map<String, Integer> categoryIds = new LinkedHashMap<>();
        Set<Integer> dishIds = new HashSet<>();
        Set<Integer> orderIds = new HashSet<>();
        Map<Integer, Long> orderCreatedAtById = new LinkedHashMap<>();
        int skippedOrderItems = 0;

        JsonArray dishesArray = getArray(backupJson, "dishes");
        for (JsonElement element : dishesArray) {
            if (!element.isJsonObject()) {
                addWarning(warnings, "Skipped dish row: invalid object");
                continue;
            }

            JsonObject row = element.getAsJsonObject();
            int dishId = getInt(row, "dish_id", -1);
            String dishName = getString(row, "dish_name");
            if (dishId <= 0 || dishName == null || dishName.trim().isEmpty()) {
                addWarning(warnings, "Skipped dish row: missing dish_id or dish_name");
                continue;
            }

            String categoryName = getString(row, "category");
            if (categoryName == null || categoryName.trim().isEmpty()) {
                categoryName = "Uncategorized";
            }

            long createdAt = resolveRowTime(row, "created_at", "createdAt", defaultTime);
            long updatedAt = resolveRowTime(row, "updated_at", "updatedAt", createdAt);

            int categoryId = categoryIds.computeIfAbsent(categoryName, key -> categoryIds.size() + 1);
            dishes.add(new RestoreDishRow(
                dishId,
                dishName,
                categoryName,
                categoryId,
                getInt(row, "price", 0),
                createdAt,
                updatedAt
            ));
            dishIds.add(dishId);
        }

        for (Map.Entry<String, Integer> entry : categoryIds.entrySet()) {
            categories.add(new RestoreCategoryRow(entry.getValue(), entry.getKey(), defaultTime, defaultTime));
        }

        JsonArray ordersArray = getArray(backupJson, "orders");
        for (JsonElement element : ordersArray) {
            if (!element.isJsonObject()) {
                addWarning(warnings, "Skipped order row: invalid object");
                continue;
            }

            JsonObject row = element.getAsJsonObject();
            int orderId = getInt(row, "order_id", -1);
            if (orderId <= 0) {
                addWarning(warnings, "Skipped order row: missing order_id");
                continue;
            }

            String displayId = null;
            if (row.has("display_id") && !row.get("display_id").isJsonNull()) {
                displayId = row.get("display_id").getAsString();
            }

            long createdAt = resolveRowTime(row, "created_at", "createdAt", defaultTime);
            long updatedAt = resolveRowTime(row, "updated_at", "updatedAt", createdAt);
            orders.add(new RestoreOrderRow(
                orderId,
                displayId,
                getString(row, "order_tag"),
                getBoolean(row, "is_payment_done", false),
                getInt(row, "order_total", 0),
                normalizeOrderStatus(getString(row, "order_status")),
                createdAt,
                updatedAt
            ));
            orderIds.add(orderId);
            orderCreatedAtById.put(orderId, createdAt);
        }

        JsonArray orderItemsArray = getArray(backupJson, "order_items");
        for (JsonElement element : orderItemsArray) {
            if (!element.isJsonObject()) {
                skippedOrderItems++;
                addWarning(warnings, "Skipped order item row: invalid object");
                continue;
            }

            JsonObject row = element.getAsJsonObject();
            int orderItemId = getInt(row, "order_item_id", -1);
            int orderId = getInt(row, "order_id", -1);
            int dishId = getInt(row, "dish_id", -1);
            if (orderItemId <= 0 || orderId <= 0 || dishId <= 0) {
                skippedOrderItems++;
                addWarning(warnings, "Skipped order item row: missing identifiers");
                continue;
            }

            if (!orderIds.contains(orderId) || !dishIds.contains(dishId)) {
                skippedOrderItems++;
                addWarning(warnings, "Skipped order item row: missing order or dish reference");
                continue;
            }

            long orderFallbackTime = orderCreatedAtById.getOrDefault(orderId, defaultTime);
            long createdAt = resolveRowTime(row, "created_at", "createdAt", orderFallbackTime);
            long updatedAt = resolveRowTime(row, "updated_at", "updatedAt", createdAt);
            orderItems.add(new RestoreOrderItemRow(
                orderItemId,
                orderId,
                dishId,
                getInt(row, "quantity", 1),
                getString(row, "dish_name_snapshot"),
                getInt(row, "price_snapshot", 0),
                normalizeItemStatus(getString(row, "item_status")),
                createdAt,
                updatedAt
            ));
        }

        return new LegacyRestorePayload(categories, dishes, orders, orderItems, skippedOrderItems, warnings);
    }

    private LocalRestoreResult applyLegacyRestore(LegacyRestorePayload payload, boolean wipeExistingData) throws Exception {
        Dao<Category, Integer> categoryDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), Category.class);
        Dao<Dish, Integer> dishDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), Dish.class);
        Dao<Order, Integer> orderDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), Order.class);
        Dao<OrderItem, Integer> orderItemDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), OrderItem.class);

        TransactionManager.callInTransaction(ormLiteConnectionProvider.getConnectionSource(), () -> {
            if (wipeExistingData) {
                orderItemDao.executeRawNoArgs("DELETE FROM order_items");
                orderDao.executeRawNoArgs("DELETE FROM orders");
                dishDao.executeRawNoArgs("DELETE FROM dishes");
                categoryDao.executeRawNoArgs("DELETE FROM categories");
                dishDao.executeRawNoArgs("DELETE FROM inventory_movements");
                dishDao.executeRawNoArgs("DELETE FROM dish_ingredients");
                dishDao.executeRawNoArgs("DELETE FROM inventory_items");
            }

            for (RestoreCategoryRow row : payload.categories) {
                categoryDao.executeRawNoArgs("INSERT INTO categories(id, name, image_path, created_at, updated_at, deleted_at) VALUES ("
                    + row.id + ", " + sqlString(row.name) + ", NULL, " + row.createdAt + ", " + row.updatedAt + ", NULL)");
            }

            for (RestoreDishRow row : payload.dishes) {
                dishDao.executeRawNoArgs("INSERT INTO dishes(id, name, category, category_id, price, is_available, created_at, updated_at, deleted_at) VALUES ("
                    + row.id + ", " + sqlString(row.name) + ", " + sqlString(row.category) + ", " + row.categoryId + ", " + row.price + ", 1, " + row.createdAt + ", " + row.updatedAt + ", NULL)");
            }

            for (RestoreOrderRow row : payload.orders) {
                orderDao.executeRawNoArgs("INSERT INTO orders(order_id, display_id, order_tag, is_payment_done, order_total, order_status, created_at, updated_at, deleted_at) VALUES ("
                    + row.orderId + ", " + sqlString(row.displayId) + ", " + sqlString(row.orderTag) + ", " + (row.isPaymentDone ? 1 : 0) + ", " + row.orderTotal + ", " + sqlString(row.orderStatus) + ", " + row.createdAt + ", " + row.updatedAt + ", NULL)");
            }

            for (RestoreOrderItemRow row : payload.orderItems) {
                orderItemDao.executeRawNoArgs("INSERT INTO order_items(order_item_id, order_id, dish_id, quantity, dish_name_snapshot, price_snapshot, item_status, created_at, updated_at, deleted_at) VALUES ("
                    + row.orderItemId + ", " + row.orderId + ", " + row.dishId + ", " + row.quantity + ", " + sqlString(row.dishNameSnapshot) + ", " + row.priceSnapshot + ", " + sqlString(row.itemStatus) + ", " + row.createdAt + ", " + row.updatedAt + ", NULL)");
            }
            return null;
        });

        JsonObject appliedRows = new JsonObject();
        appliedRows.addProperty("categories", payload.categories.size());
        appliedRows.addProperty("dishes", payload.dishes.size());
        appliedRows.addProperty("orders", payload.orders.size());
        appliedRows.addProperty("orderItems", payload.orderItems.size());

        return new LocalRestoreResult(appliedRows, payload.skippedOrderItems, payload.warnings);
    }

    private String sqlString(String value) {
        if (value == null) {
            return "NULL";
        }
        return "'" + value.replace("'", "''") + "'";
    }

    private void addWarning(List<String> warnings, String warning) {
        if (warnings.size() < MAX_WARNING_COUNT) {
            warnings.add(warning);
        }
    }

    private JsonArray getArray(JsonObject object, String key) {
        JsonElement element = object.get(key);
        return element != null && element.isJsonArray() ? element.getAsJsonArray() : new JsonArray();
    }

    private String getString(JsonObject object, String key) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }
        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private int getInt(JsonObject object, String key, int fallback) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }
        try {
            return element.getAsInt();
        } catch (Exception ignored) {
            try {
                return Integer.parseInt(element.getAsString());
            } catch (Exception ignoredAgain) {
                return fallback;
            }
        }
    }

    private boolean getBoolean(JsonObject object, String key, boolean fallback) {
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }
        try {
            return element.getAsBoolean();
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private long resolveBackupTimestamp(JsonObject backupJson, long fallback) {
        return parseLegacyTime(getString(backupJson, "backup_timestamp"), fallback);
    }

    private long resolveRowTime(JsonObject row, String snakeKey, String camelKey, long fallback) {
        JsonElement value = row.get(snakeKey);
        if ((value == null || value.isJsonNull()) && camelKey != null) {
            value = row.get(camelKey);
        }
        if (value == null || value.isJsonNull()) {
            return fallback;
        }

        try {
            if (value.isJsonPrimitive() && value.getAsJsonPrimitive().isNumber()) {
                long epoch = value.getAsLong();
                return epoch > 0 ? epoch : fallback;
            }
        } catch (Exception ignored) {
        }

        try {
            String raw = value.getAsString();
            return parseLegacyTime(raw, fallback);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private long parseLegacyTime(String raw, long fallback) {
        if (raw == null || raw.trim().isEmpty()) {
            return fallback;
        }

        try {
            return Instant.parse(raw.trim()).toEpochMilli();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(raw.trim(), LEGACY_BACKUP_TIME_FORMAT)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(raw.trim(), LEGACY_ROW_TIME_FORMAT)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
        } catch (DateTimeParseException ignored) {
        }

        return fallback;
    }

    private String normalizeOrderStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "OPEN";
        }
        return raw.trim().toUpperCase();
    }

    private String normalizeItemStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "PENDING";
        }
        return raw.trim().toUpperCase();
    }

    private static class LegacyRestorePayload {
        private final List<RestoreCategoryRow> categories;
        private final List<RestoreDishRow> dishes;
        private final List<RestoreOrderRow> orders;
        private final List<RestoreOrderItemRow> orderItems;
        private final int skippedOrderItems;
        private final List<String> warnings;

        private LegacyRestorePayload(
            List<RestoreCategoryRow> categories,
            List<RestoreDishRow> dishes,
            List<RestoreOrderRow> orders,
            List<RestoreOrderItemRow> orderItems,
            int skippedOrderItems,
            List<String> warnings
        ) {
            this.categories = categories;
            this.dishes = dishes;
            this.orders = orders;
            this.orderItems = orderItems;
            this.skippedOrderItems = skippedOrderItems;
            this.warnings = warnings;
        }
    }

    private static class LocalRestoreResult {
        private final JsonObject appliedRows;
        private final int skippedOrderItems;
        private final List<String> warnings;

        private LocalRestoreResult(JsonObject appliedRows, int skippedOrderItems, List<String> warnings) {
            this.appliedRows = appliedRows;
            this.skippedOrderItems = skippedOrderItems;
            this.warnings = warnings;
        }
    }

    private static class RestoreCategoryRow {
        private final int id;
        private final String name;
        private final long createdAt;
        private final long updatedAt;

        private RestoreCategoryRow(int id, String name, long createdAt, long updatedAt) {
            this.id = id;
            this.name = name;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }
    }

    private static class RestoreDishRow {
        private final int id;
        private final String name;
        private final String category;
        private final int categoryId;
        private final int price;
        private final long createdAt;
        private final long updatedAt;

        private RestoreDishRow(int id, String name, String category, int categoryId, int price, long createdAt, long updatedAt) {
            this.id = id;
            this.name = name;
            this.category = category;
            this.categoryId = categoryId;
            this.price = price;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }
    }

    private static class RestoreOrderRow {
        private final int orderId;
        private final String displayId;
        private final String orderTag;
        private final boolean isPaymentDone;
        private final int orderTotal;
        private final String orderStatus;
        private final long createdAt;
        private final long updatedAt;

        private RestoreOrderRow(
            int orderId,
            String displayId,
            String orderTag,
            boolean isPaymentDone,
            int orderTotal,
            String orderStatus,
            long createdAt,
            long updatedAt
        ) {
            this.orderId = orderId;
            this.displayId = displayId;
            this.orderTag = orderTag;
            this.isPaymentDone = isPaymentDone;
            this.orderTotal = orderTotal;
            this.orderStatus = orderStatus;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }
    }

    private static class RestoreOrderItemRow {
        private final int orderItemId;
        private final int orderId;
        private final int dishId;
        private final int quantity;
        private final String dishNameSnapshot;
        private final int priceSnapshot;
        private final String itemStatus;
        private final long createdAt;
        private final long updatedAt;

        private RestoreOrderItemRow(
            int orderItemId,
            int orderId,
            int dishId,
            int quantity,
            String dishNameSnapshot,
            int priceSnapshot,
            String itemStatus,
            long createdAt,
            long updatedAt
        ) {
            this.orderItemId = orderItemId;
            this.orderId = orderId;
            this.dishId = dishId;
            this.quantity = quantity;
            this.dishNameSnapshot = dishNameSnapshot;
            this.priceSnapshot = priceSnapshot;
            this.itemStatus = itemStatus;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }
    }
}
