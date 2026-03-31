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

    @DatabaseField(columnName = "price")
    public int price;

    @DatabaseField(columnName = "is_available")
    public boolean is_available = true;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

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
        item.addProperty("isAvailable", is_available);
        item.addProperty("updatedAt", updated_at);
        return item;
    }
}
