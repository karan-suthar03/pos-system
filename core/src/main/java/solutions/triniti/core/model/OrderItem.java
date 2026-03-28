package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "order_items")
public class OrderItem {

    @DatabaseField(columnName = "order_item_id", generatedId = true)
    public int order_item_id;

    @DatabaseField(columnName = "order_id")
    public int order_id;

    @DatabaseField(columnName = "dish_id")
    public int dish_id;

    @DatabaseField(columnName = "quantity")
    public int quantity;

    @DatabaseField(columnName = "dish_name_snapshot")
    public String dish_name_snapshot;

    @DatabaseField(columnName = "price_snapshot")
    public int price_snapshot;

    @DatabaseField(columnName = "item_status")
    public String item_status;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

    public OrderItem() {
    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("id", order_item_id);
        item.addProperty("orderId", order_id);
        item.addProperty("dishId", dish_id);
        item.addProperty("quantity", quantity);
        item.addProperty("name", dish_name_snapshot);
        item.addProperty("price", price_snapshot);
        item.addProperty("status", item_status);
        item.addProperty("updatedAt", updated_at);
        return item;
    }
}
