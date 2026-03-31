package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "dish_ingredients")
public class DishIngredient {

    @DatabaseField(columnName = "dish_ingredient_id", generatedId = true)
    public int dish_ingredient_id;

    @DatabaseField(columnName = "dish_id")
    public int dish_id;

    @DatabaseField(columnName = "inventory_item_id")
    public int inventory_item_id;

    @DatabaseField(columnName = "quantity")
    public double quantity;

    @DatabaseField(columnName = "created_at", readOnly = true)
    public long created_at;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

    @DatabaseField(columnName = "deleted_at")
    public Long deleted_at;

    public DishIngredient() {
    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("id", dish_ingredient_id);
        item.addProperty("dishId", dish_id);
        item.addProperty("inventoryItemId", inventory_item_id);
        item.addProperty("quantity", quantity);
        item.addProperty("createdAt", created_at);
        item.addProperty("updatedAt", updated_at);
        if (deleted_at == null || deleted_at <= 0) {
            item.add("deletedAt", null);
        } else {
            item.addProperty("deletedAt", deleted_at);
        }
        return item;
    }
}
