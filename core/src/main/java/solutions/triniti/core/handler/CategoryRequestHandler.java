package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Category;
import solutions.triniti.core.repository.CategoryRepository;
import solutions.triniti.core.storage.StorageService;

import java.util.List;

public class CategoryRequestHandler implements RequestHandler {

    private final CategoryRepository categoryRepository;
    private final StorageService storageService;

    public CategoryRequestHandler(OrmLiteConnectionProvider ormLiteConnectionProvider, StorageService storageService) {
        this.categoryRepository = ormLiteConnectionProvider == null ? null : new CategoryRepository(ormLiteConnectionProvider);
        this.storageService = storageService;
    }

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("category.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if (categoryRepository == null) {
            return BridgeResponse.error(requestId, "Database is not configured");
        }

        if ("category.list".equals(type)) {
            List<Category> categories = categoryRepository.listAll();
            JsonArray data = new JsonArray();
            for (Category category : categories) {
                JsonObject item = category.toJson();
                String imageUrl = storageService == null ? null : storageService.resolvePublicUrl(category.image_path);
                if (imageUrl == null) {
                    item.add("imageUrl", null);
                } else {
                    item.addProperty("imageUrl", imageUrl);
                }
                data.add(item);
            }
            return BridgeResponse.success(requestId, data);
        }

        if ("category.upsert".equals(type)) {
            JsonObject params = getCategoryParams(message);
            String name = requireStringParam(params, "name", "category");
            String imagePath = getStringParam(params, "imagePath", "image_path");
            boolean clearImage = getBooleanParam(params, "clearImage", "clear_image", false);

            Category category = categoryRepository.upsertByName(name, imagePath, clearImage);
            return buildCategoryResponse(requestId, type, category);
        }

        if ("category.setImage".equals(type)) {
            JsonObject params = getCategoryParams(message);
            int categoryId = getIntParam(params, "categoryId", "id", 0);
            String name = getStringParam(params, "name", "category");
            String imagePath = getStringParam(params, "imagePath", "image_path");
            boolean clearImage = getBooleanParam(params, "clearImage", "clear_image", false);

            Category category = null;
            if (categoryId > 0) {
                category = categoryRepository.updateImageById(categoryId, imagePath, clearImage);
            } else if (name != null && !name.trim().isEmpty()) {
                category = categoryRepository.upsertByName(name, imagePath, clearImage);
            }

            if (category == null) {
                return BridgeResponse.error(requestId, "Category not found");
            }

            return buildCategoryResponse(requestId, type, category);
        }

        return BridgeResponse.error(requestId, "Unknown category request: " + type);
    }

    private BridgeResponse buildCategoryResponse(String requestId, String type, Category category) {
        JsonObject data = new JsonObject();
        data.addProperty("type", type);

        JsonObject item = category == null ? new JsonObject() : category.toJson();
        if (category != null) {
            String imageUrl = storageService == null ? null : storageService.resolvePublicUrl(category.image_path);
            if (imageUrl == null) {
                item.add("imageUrl", null);
            } else {
                item.addProperty("imageUrl", imageUrl);
            }
        }

        data.add("category", item);
        return BridgeResponse.success(requestId, data);
    }

    private JsonObject getCategoryParams(BridgeMessage message) {
        JsonObject params = message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();

        JsonElement categoryElement = params.get("category");
        if (categoryElement != null && categoryElement.isJsonObject()) {
            return categoryElement.getAsJsonObject();
        }

        return params;
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
}
