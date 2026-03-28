package solutions.triniti.core.model;

import com.google.gson.JsonObject;

public class OrderItem {

    public int order_item_id;

    public int order_id;

    public int dish_id;

    public int quantity;

    public String dish_name_snapshot;

    public int price_snapshot;

    public String item_status;

    public OrderItem() {
    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("order_item_id", order_item_id);
        item.addProperty("order_id", order_id);
        item.addProperty("dish_id", dish_id);
        item.addProperty("quantity", quantity);
        item.addProperty("dish_name_snapshot", dish_name_snapshot);
        item.addProperty("price_snapshot", price_snapshot);
        item.addProperty("item_status", item_status);
        return item;
    }
}
