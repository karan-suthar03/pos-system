package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.Database;
import solutions.triniti.core.model.Dish;
import solutions.triniti.core.repository.DishRepository;

import java.util.List;

public class DishRequestHandler implements RequestHandler {

    private final DishRepository dishRepository;

    public DishRequestHandler(Database database) {
        this.dishRepository = database == null ? null : new DishRepository(database);
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

        return BridgeResponse.error(requestId, "Unknown dish request: " + type);
    }
}
