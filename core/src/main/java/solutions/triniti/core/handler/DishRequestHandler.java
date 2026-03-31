package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Dish;
import solutions.triniti.core.repository.DishRepository;

import java.util.List;

public class DishRequestHandler implements RequestHandler {

    private final DishRepository dishRepository;

    public DishRequestHandler(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.dishRepository = ormLiteConnectionProvider == null ? null : new DishRepository(ormLiteConnectionProvider);
    }

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("dish.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if (dishRepository == null) {
            return BridgeResponse.error(requestId, "Database is not configured");
        }

        if ("dish.ensureTable".equals(type)) {
            dishRepository.ensureTable();
            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("message", "Dish table ensured");
            return BridgeResponse.success(requestId, data);
        }

        if ("dish.getDishes".equals(type)) {
            List<Dish> dishes = dishRepository.listAll();

            JsonObject data = new JsonObject();
            for (Dish dish : dishes) {
                if(data.has(dish.category)){
                    JsonArray items = data.getAsJsonArray(dish.category);
                    items.add(dish.toJson());
                    data.add(dish.category, items);
                } else{
                    JsonArray items = new JsonArray();
                    items.add(dish.toJson());
                    data.add(dish.category, items);
                }
            }
            return BridgeResponse.success(requestId, data);
        }

        if ("dish.getDishById".equals(type)) {
            JsonObject params = getDishPayloadFromMessage(message);
            int dishId = requireDishId(params);

            Dish dish = dishRepository.getById(dishId);
            if (dish == null) {
                return BridgeResponse.error(requestId, "Dish not found for id: " + dishId);
            }

            return buildDishResponse(requestId, type, dish);
        }

        if ("dish.create".equals(type)) {
            JsonObject params = getDishPayloadFromMessage(message);
            String name = requireStringParam(params, "name", "dish_name");
            String category = requireStringParam(params, "category", null);
            int price = requireIntParam(params, "price", "dish_price");
            boolean isAvailable = getBooleanParam(params, "isAvailable", "is_available", true);

            Dish dish = dishRepository.createAndFetch(name, category, price, isAvailable);
            return buildDishResponse(requestId, type, dish);
        }

        if ("dish.update".equals(type)) {
            JsonObject params = getDishPayloadFromMessage(message);
            int dishId = requireDishId(params);

            Dish existing = dishRepository.getById(dishId);
            if (existing == null) {
                return BridgeResponse.error(requestId, "Dish not found for id: " + dishId);
            }

            String name = getStringParam(params, "name", "dish_name");
            if (name == null || name.trim().isEmpty()) {
                name = existing.dish_name;
            }

            String category = getStringParam(params, "category", null);
            if (category == null || category.trim().isEmpty()) {
                category = existing.category;
            }

            int price = getIntParam(params, "price", "dish_price", existing.price);
            boolean isAvailable = getBooleanParam(params, "isAvailable", "is_available", existing.is_available);

            Dish updated = dishRepository.updateDish(dishId, name, category, price, isAvailable);
            return buildDishResponse(requestId, type, updated);
        }

        if ("dish.setAvailability".equals(type)) {
            JsonObject params = getDishPayloadFromMessage(message);
            int dishId = requireDishId(params);
            boolean isAvailable = getBooleanParam(params, "isAvailable", "is_available", true);

            int updated = dishRepository.setAvailability(dishId, isAvailable);
            if (updated <= 0) {
                return BridgeResponse.error(requestId, "Dish not found for id: " + dishId);
            }

            Dish dish = dishRepository.getById(dishId);
            return buildDishResponse(requestId, type, dish);
        }

        if ("dish.delete".equals(type)) {
            JsonObject params = getDishPayloadFromMessage(message);
            int dishId = requireDishId(params);

            int deleted = dishRepository.delete(dishId);
            if (deleted <= 0) {
                return BridgeResponse.error(requestId, "Dish not found for id: " + dishId);
            }

            JsonObject data = new JsonObject();
            data.addProperty("type", type);
            data.addProperty("deletedId", dishId);
            return BridgeResponse.success(requestId, data);
        }

        return BridgeResponse.error(requestId, "Unknown dish request: " + type);
    }

    private JsonObject getDishPayloadFromMessage(BridgeMessage message) {
        JsonObject params = message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();

        JsonElement dishElement = params.get("dish");
        if (dishElement != null && dishElement.isJsonObject()) {
            return dishElement.getAsJsonObject();
        }

        return params;
    }

    private int requireDishId(JsonObject params) {
        JsonElement idElement = params.get("dishId");
        if ((idElement == null || idElement.isJsonNull()) && params.get("id") != null) {
            idElement = params.get("id");
        }

        if (idElement == null || idElement.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: dishId");
        }

        try {
            int dishId = idElement.getAsInt();
            if (dishId <= 0) {
                throw new IllegalArgumentException("Invalid dishId");
            }
            return dishId;
        } catch (Exception ignored) {
            throw new IllegalArgumentException("Invalid dishId");
        }
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

    private int requireIntParam(JsonObject params, String key, String fallbackKey) {
        JsonElement element = params.get(key);
        if ((element == null || element.isJsonNull()) && fallbackKey != null) {
            element = params.get(fallbackKey);
        }

        if (element == null || element.isJsonNull()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }

        try {
            return element.getAsInt();
        } catch (Exception ignored) {
            throw new IllegalArgumentException("Invalid " + key);
        }
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
            throw new IllegalArgumentException("Invalid " + key + " value");
        }
    }

    private BridgeResponse buildDishResponse(String requestId, String type, Dish dish) {
        if (dish == null) {
            return BridgeResponse.error(requestId, "Dish not found");
        }

        JsonObject data = new JsonObject();
        data.addProperty("type", type);
        data.add("dish", dish.toJson());
        return BridgeResponse.success(requestId, data);
    }
}
