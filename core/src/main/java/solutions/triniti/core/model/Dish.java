package solutions.triniti.core.model;

import com.google.gson.JsonObject;

public class Dish {

    public int dish_id;

    public String dish_name;

    public String category;

    public int price;

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
        return item;
    }
}
