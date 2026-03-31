package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.DishIngredient;
import solutions.triniti.core.model.InventoryItem;
import solutions.triniti.core.model.InventoryMovement;
import solutions.triniti.core.repository.InventoryRepository;

import java.util.ArrayList;
import java.util.List;

public class InventoryRequestHandler implements RequestHandler {

    private final InventoryRepository inventoryRepository;

    public InventoryRequestHandler(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.inventoryRepository = ormLiteConnectionProvider == null ? null : new InventoryRepository(ormLiteConnectionProvider);
    }

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("inventory.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if (inventoryRepository == null) {
            return BridgeResponse.error(requestId, "Database is not configured");
        }

        if ("inventory.ensureTable".equals(type)) {
            inventoryRepository.ensureTable();
            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("message", "Inventory tables ensured");
            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.listItems".equals(type)) {
            List<InventoryItem> items = inventoryRepository.listItems();
            JsonArray data = new JsonArray();
            for (InventoryItem item : items) {
                data.add(item.toJson());
            }
            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.getItem".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int itemId = requireItemId(params);

            InventoryItem item = inventoryRepository.getItemById(itemId);
            if (item == null) {
                return BridgeResponse.error(requestId, "Inventory item not found for id: " + itemId);
            }

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.add("item", item.toJson());
            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.upsertItem".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int itemId = getIntParam(params, "inventoryItemId", "itemId", 0);
            String name = getStringParam(params, "name", null);
            String category = getStringParam(params, "category", null);
            String unit = getStringParam(params, "unit", null);
            Double onHand = getDoubleParam(params, "onHand", "on_hand", null);
            Double lowStock = getDoubleParam(params, "lowStockThreshold", "low_stock_threshold", null);
            Double maxStock = getDoubleParam(params, "maxStock", "max_stock", null);
            String notes = getStringParam(params, "notes", null);
            boolean clearNotes = getBooleanParam(params, "clearNotes", "clear_notes", false);

            InventoryItem item;
            if (itemId > 0) {
                item = inventoryRepository.updateItem(itemId, name, category, unit, onHand, lowStock, maxStock, notes, clearNotes);
                if (item == null) {
                    return BridgeResponse.error(requestId, "Inventory item not found for id: " + itemId);
                }
            } else {
                String requiredName = requireStringParam(params, "name", null);
                double resolvedOnHand = onHand == null ? 0 : onHand;
                double resolvedLowStock = lowStock == null ? 0 : lowStock;
                double resolvedMaxStock = maxStock == null ? 0 : maxStock;
                item = inventoryRepository.createItem(requiredName, category, unit, resolvedOnHand, resolvedLowStock, resolvedMaxStock, notes);
            }

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.add("item", item.toJson());
            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.deleteItem".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int itemId = requireItemId(params);

            int deleted = inventoryRepository.deleteItem(itemId);
            if (deleted <= 0) {
                return BridgeResponse.error(requestId, "Inventory item not found for id: " + itemId);
            }

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("deletedId", itemId);
            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.listRecipe".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int dishId = requireDishId(params);

            List<DishIngredient> recipe = inventoryRepository.listRecipeForDish(dishId);
            JsonArray data = new JsonArray();
            for (DishIngredient ingredient : recipe) {
                data.add(ingredient.toJson());
            }

            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.setRecipe".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int dishId = requireDishId(params);

            List<InventoryRepository.RecipeEntry> entries = new ArrayList<>();
            JsonElement itemsElement = params.get("items");
            if (itemsElement != null && itemsElement.isJsonArray()) {
                for (JsonElement element : itemsElement.getAsJsonArray()) {
                    if (!element.isJsonObject()) {
                        continue;
                    }
                    JsonObject itemObj = element.getAsJsonObject();
                    int inventoryItemId = getIntParam(itemObj, "inventoryItemId", "itemId", 0);
                    double quantity = getDoubleParam(itemObj, "quantity", null, 0);
                    entries.add(new InventoryRepository.RecipeEntry(inventoryItemId, quantity));
                }
            }

            List<DishIngredient> recipe = inventoryRepository.setRecipeForDish(dishId, entries);
            JsonArray data = new JsonArray();
            for (DishIngredient ingredient : recipe) {
                data.add(ingredient.toJson());
            }

            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.adjustStock".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int itemId = requireItemId(params);
            double delta = getDoubleParam(params, "delta", null, 0);
            String notes = getStringParam(params, "notes", null);

            InventoryMovement movement = inventoryRepository.adjustStock(itemId, delta, notes);
            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.add("movement", movement.toJson());
            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.listMovements".equals(type)) {
            JsonObject params = getInventoryParams(message);
            int itemId = getIntParam(params, "inventoryItemId", "itemId", 0);
            int limit = getIntParam(params, "limit", null, 0);

            List<InventoryMovement> movements = inventoryRepository.listMovements(itemId > 0 ? itemId : null, limit > 0 ? limit : null);
            JsonArray data = new JsonArray();
            for (InventoryMovement movement : movements) {
                data.add(movement.toJson());
            }

            return BridgeResponse.success(requestId, data);
        }

        if ("inventory.lowStock".equals(type)) {
            List<InventoryItem> items = inventoryRepository.listLowStockItems();
            JsonArray data = new JsonArray();
            for (InventoryItem item : items) {
                data.add(item.toJson());
            }
            return BridgeResponse.success(requestId, data);
        }

        return BridgeResponse.error(requestId, "Unknown inventory request: " + type);
    }

    private JsonObject getInventoryParams(BridgeMessage message) {
        JsonObject params = message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();

        JsonElement inventoryElement = params.get("inventory");
        if (inventoryElement != null && inventoryElement.isJsonObject()) {
            return inventoryElement.getAsJsonObject();
        }

        return params;
    }

    private int requireItemId(JsonObject params) {
        int itemId = getIntParam(params, "inventoryItemId", "itemId", 0);
        if (itemId <= 0) {
            itemId = getIntParam(params, "id", null, 0);
        }
        if (itemId <= 0) {
            throw new IllegalArgumentException("Missing required field: inventoryItemId");
        }
        return itemId;
    }

    private int requireDishId(JsonObject params) {
        int dishId = getIntParam(params, "dishId", "id", 0);
        if (dishId <= 0) {
            throw new IllegalArgumentException("Missing required field: dishId");
        }
        return dishId;
    }

    private String getStringParam(JsonObject params, String key, String fallbackKey) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            return null;
        }

        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String requireStringParam(JsonObject params, String key, String fallbackKey) {
        String value = getStringParam(params, key, fallbackKey);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }

        return value;
    }

    private boolean getBooleanParam(JsonObject params, String key, String fallbackKey, boolean fallbackValue) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            return fallbackValue;
        }

        try {
            return element.getAsBoolean();
        } catch (Exception ignored) {
            return fallbackValue;
        }
    }

    private int getIntParam(JsonObject params, String key, String fallbackKey, int fallbackValue) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            return fallbackValue;
        }

        try {
            return element.getAsInt();
        } catch (Exception ignored) {
            return fallbackValue;
        }
    }

    private double getDoubleParam(JsonObject params, String key, String fallbackKey, double fallbackValue) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            return fallbackValue;
        }

        try {
            return element.getAsDouble();
        } catch (Exception ignored) {
            return fallbackValue;
        }
    }

    private Double getDoubleParam(JsonObject params, String key, String fallbackKey, Double fallbackValue) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            return fallbackValue;
        }

        try {
            return element.getAsDouble();
        } catch (Exception ignored) {
            return fallbackValue;
        }
    }
}
