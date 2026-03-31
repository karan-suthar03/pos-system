package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "dishes")
public class Dish {

    @DatabaseField(columnName = "id", generatedId = true, allowGeneratedIdInsert = true)
    public int dish_id;

    @DatabaseField(columnName = "name")
    public String dish_name;

    @DatabaseField(columnName = "category")
    public String category;

    @DatabaseField(columnName = "category_id")
    public int category_id;

    @DatabaseField(columnName = "price")
    public int price;

    @DatabaseField(columnName = "is_available")
    public boolean is_available = true;

    @DatabaseField(columnName = "created_at", readOnly = true)
    public long created_at;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

    @DatabaseField(columnName = "deleted_at")
    public Long deleted_at;

    public Dish(String name, String category, int price) {
        this.dish_name = name;
        this.category = category;
        this.price = price;
    }

    public Dish() {

    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("id", dish_id);
        item.addProperty("name", dish_name);
        item.addProperty("price",price);
        item.addProperty("category", category);
        item.addProperty("categoryId", category_id);
        item.addProperty("isAvailable", is_available);
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
