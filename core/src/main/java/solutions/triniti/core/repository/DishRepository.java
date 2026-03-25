package solutions.triniti.core.repository;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import solutions.triniti.core.db.Database;
import solutions.triniti.core.model.Dish;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class DishRepository {

    private final Database database;

    public DishRepository(Database database) {
        if (database == null) {
            throw new IllegalArgumentException("Database cannot be null");
        }
        this.database = database;
        try {
            ensureTable();
        } catch (Exception e) {
            throw new RuntimeException("Failed to ensure dish table", e);
        }
    }

    public void ensureTable() throws Exception {
        database.execute(
            "CREATE TABLE IF NOT EXISTS dishes (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "name TEXT NOT NULL, " +
            "category TEXT NOT NULL DEFAULT '', " +
            "price INTEGER NOT NULL DEFAULT 0, " +
            "is_available INTEGER NOT NULL DEFAULT 1" +
            ")"
        );

        List<Map<String,Object>> rows = database.query("SELECT name FROM dishes LIMIT 1");

        if (rows.isEmpty()) {
            String dishSeed = "[{\"dish_name\":\"Tea\",\"category\":\"Hot Beverage\",\"price\":20},{\"dish_name\":\"Green Tea\",\"category\":\"Hot Beverage\",\"price\":30},{\"dish_name\":\"Black Tea\",\"category\":\"Hot Beverage\",\"price\":20},{\"dish_name\":\"Hot Coffee\",\"category\":\"Hot Beverage\",\"price\":30},{\"dish_name\":\"Black Coffee\",\"category\":\"Hot Beverage\",\"price\":25},{\"dish_name\":\"Plain Hot Chocolate\",\"category\":\"Hot Beverage\",\"price\":40},{\"dish_name\":\"Cold Coffee\",\"category\":\"Cold Coffee\",\"price\":50},{\"dish_name\":\"Cold Coffee with Crush\",\"category\":\"Cold Coffee\",\"price\":70},{\"dish_name\":\"Lemon Ice Tea\",\"category\":\"Refresher\",\"price\":50},{\"dish_name\":\"Peach Ice Tea\",\"category\":\"Refresher\",\"price\":50},{\"dish_name\":\"Mint Mojito\",\"category\":\"Refresher\",\"price\":80},{\"dish_name\":\"Green Apple Mojito\",\"category\":\"Refresher\",\"price\":80},{\"dish_name\":\"Blue Berry Smoothie\",\"category\":\"Smoothie\",\"price\":110},{\"dish_name\":\"Strawberry Smoothie\",\"category\":\"Smoothie\",\"price\":110},{\"dish_name\":\"Mango Smoothie\",\"category\":\"Smoothie\",\"price\":110},{\"dish_name\":\"Oreo Smoothie\",\"category\":\"Smoothie\",\"price\":120},{\"dish_name\":\"Dark Chocolate Smoothie\",\"category\":\"Smoothie\",\"price\":130},{\"dish_name\":\"Kit Kat Shake\",\"category\":\"Shake\",\"price\":110},{\"dish_name\":\"Java Choco Chip Shake\",\"category\":\"Shake\",\"price\":120},{\"dish_name\":\"Brownie Shake\",\"category\":\"Shake\",\"price\":130},{\"dish_name\":\"Nutella Shake\",\"category\":\"Shake\",\"price\":140},{\"dish_name\":\"Oreo Shake\",\"category\":\"Shake\",\"price\":100},{\"dish_name\":\"Butter Scotch Shake\",\"category\":\"Shake\",\"price\":100},{\"dish_name\":\"Rose Shake\",\"category\":\"Shake\",\"price\":90},{\"dish_name\":\"Green Chatni Sandwich\",\"category\":\"Sandwich\",\"price\":60},{\"dish_name\":\"Triple Cheese Sandwich\",\"category\":\"Sandwich\",\"price\":80},{\"dish_name\":\"Chocolate Sandwich\",\"category\":\"Sandwich\",\"price\":80},{\"dish_name\":\"Bombay Masala Sandwich\",\"category\":\"Sandwich\",\"price\":80},{\"dish_name\":\"Classic Club Sandwich\",\"category\":\"Sandwich\",\"price\":100},{\"dish_name\":\"Paneer Sandwich\",\"category\":\"Sandwich\",\"price\":120},{\"dish_name\":\"Mexican Sandwich\",\"category\":\"Sandwich\",\"price\":130},{\"dish_name\":\"Cheese Corn Sandwich\",\"category\":\"Sandwich\",\"price\":110},{\"dish_name\":\"Extra Spicy Sandwich\",\"category\":\"Sandwich\",\"price\":120},{\"dish_name\":\"Plain Maggi\",\"category\":\"Maggi\",\"price\":50},{\"dish_name\":\"Masala Maggi\",\"category\":\"Maggi\",\"price\":60},{\"dish_name\":\"Cheese Masala Maggi\",\"category\":\"Maggi\",\"price\":70},{\"dish_name\":\"Italian Maggi\",\"category\":\"Maggi\",\"price\":90},{\"dish_name\":\"Peri Peri Cheese Maggi\",\"category\":\"Maggi\",\"price\":80},{\"dish_name\":\"Cheese Corn Maggi\",\"category\":\"Maggi\",\"price\":80},{\"dish_name\":\"Alfredo Pasta (White)\",\"category\":\"Pasta\",\"price\":160},{\"dish_name\":\"Arrabiata Pasta (Red)\",\"category\":\"Pasta\",\"price\":160},{\"dish_name\":\"Pink Pasta (Red + White)\",\"category\":\"Pasta\",\"price\":180},{\"dish_name\":\"Indian Pasta (All Veggies)\",\"category\":\"Pasta\",\"price\":120},{\"dish_name\":\"Salted Fries\",\"category\":\"Fries\",\"price\":60},{\"dish_name\":\"Peri Peri Fries\",\"category\":\"Fries\",\"price\":80},{\"dish_name\":\"Cheese Peri Peri Fries\",\"category\":\"Fries\",\"price\":100},{\"dish_name\":\"Chipotle Fries\",\"category\":\"Fries\",\"price\":120},{\"dish_name\":\"Cheese Corn Balls (6 pcs)\",\"category\":\"Fries\",\"price\":120},{\"dish_name\":\"Margarita Pizza\",\"category\":\"Pizza\",\"price\":100},{\"dish_name\":\"Cheese Chilli Toast\",\"category\":\"Pizza\",\"price\":80},{\"dish_name\":\"Cheese Burst Pizza\",\"category\":\"Pizza\",\"price\":100},{\"dish_name\":\"Corn Cheese Pizza\",\"category\":\"Pizza\",\"price\":110},{\"dish_name\":\"Mexican Cheese Pizza\",\"category\":\"Pizza\",\"price\":140},{\"dish_name\":\"Tandoori Paneer Pizza\",\"category\":\"Pizza\",\"price\":150},{\"dish_name\":\"Mix Veg Cheese Pizza\",\"category\":\"Pizza\",\"price\":160},{\"dish_name\":\"Pasta Pizza\",\"category\":\"Pizza\",\"price\":180},{\"dish_name\":\"Special Pizza\",\"category\":\"Pizza\",\"price\":200},{\"dish_name\":\"Crispy Veg Burger\",\"category\":\"Burger\",\"price\":80},{\"dish_name\":\"Crispy Veg Cheese Burger\",\"category\":\"Burger\",\"price\":100},{\"dish_name\":\"Crispy Veg Schezwan Burger\",\"category\":\"Burger\",\"price\":100},{\"dish_name\":\"Crispy Paneer Burger\",\"category\":\"Burger\",\"price\":120},{\"dish_name\":\"Crispy Paneer Cheese Burger\",\"category\":\"Burger\",\"price\":130},{\"dish_name\":\"Crispy Paneer Schezwan Burger\",\"category\":\"Burger\",\"price\":140},{\"dish_name\":\"Crispy Paneer Chipotle Burger\",\"category\":\"Burger\",\"price\":150},{\"dish_name\":\"Crispy Paneer + Veg Burger\",\"category\":\"Burger\",\"price\":200},{\"dish_name\":\"Crispy Double Decker Burger\",\"category\":\"Burger\",\"price\":190},{\"dish_name\":\"Veg Steam Momo\",\"category\":\"Momo\",\"price\":80},{\"dish_name\":\"Paneer Steam Momo\",\"category\":\"Momo\",\"price\":90},{\"dish_name\":\"Veg Fried Momo\",\"category\":\"Momo\",\"price\":90},{\"dish_name\":\"Paneer Fried Momo\",\"category\":\"Momo\",\"price\":100},{\"dish_name\":\"Veg Tandoori Momo\",\"category\":\"Momo\",\"price\":120},{\"dish_name\":\"Paneer Tandoori Momo\",\"category\":\"Momo\",\"price\":130},{\"dish_name\":\"Veg Mexican Momo\",\"category\":\"Momo\",\"price\":150},{\"dish_name\":\"Paneer Mexican Momo\",\"category\":\"Momo\",\"price\":160},{\"dish_name\":\"Veg + Paneer Steam Momo\",\"category\":\"Momo\",\"price\":100},{\"dish_name\":\"Veg + Paneer Fried Momo\",\"category\":\"Momo\",\"price\":120},{\"dish_name\":\"Cheese\",\"category\":\"Extra\",\"price\":30},{\"dish_name\":\"Water Bottle\",\"category\":\"Misc\",\"price\":20},{\"dish_name\":\"Cigarettes\",\"category\":\"Misc\",\"price\":25}]";

            Gson gson = new Gson();

            Type listType = new TypeToken<List<Dish>>() {}.getType();
            List<Dish> dishes = gson.fromJson(dishSeed, listType);

            for (Dish dish : dishes) {
                dish.price*=100;
                dish.dish_id = -1;
                create(dish);
            }
        }
    }

    public List<Dish> listAll() throws Exception {
        List<Map<String, Object>> rows = database.query(
            "SELECT id, name, category, price FROM dishes ORDER BY name ASC"
        );
        List<Dish> dishes = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            dishes.add(toDish(row));
        }
        return dishes;
    }

    public Dish getById(long id) throws Exception {
        List<Map<String, Object>> rows = database.query(
            "SELECT id, name, category, price FROM dishes WHERE id = " + id + " LIMIT 1"
        );
        return rows.isEmpty() ? null : toDish(rows.get(0));
    }

    public int create(String name, String category, int price, boolean isAvailable) throws Exception {
        validateName(name);
        validateCategory(category);
        validatePrice(price);

        String sql =
            "INSERT INTO dishes(name, category, price, is_available) VALUES ('" +
            escapeSql(name.trim()) + "', '" + escapeSql(category.trim()) + "', " + price + ", " +
            (isAvailable ? 1 : 0) + ")";

        return database.execute(sql);
    }

    public int create(Dish dish) throws Exception {
        if (dish.dish_id == -1) {
            return create(dish.dish_name, dish.category, dish.price, true);
        }

        return database.execute("INSERT INTO dishes(id, name, category, price) VALUES (" + dish.dish_id + ", '" + dish.dish_name + "', '" + dish.category + "', " + dish.price + ")");
    }
    public int updatePrice(long id, int price) throws Exception {
        validatePrice(price);
        return database.execute("UPDATE dishes SET price = " + price + " WHERE id = " + id);
    }

    public int updateCategory(long id, String category) throws Exception {
        validateCategory(category);
        return database.execute(
            "UPDATE dishes SET category = '" + escapeSql(category.trim()) + "' WHERE id = " + id
        );
    }

    public int setAvailability(long id, boolean isAvailable) throws Exception {
        return database.execute(
            "UPDATE dishes SET is_available = " + (isAvailable ? 1 : 0) + " WHERE id = " + id
        );
    }

    public int delete(long id) throws Exception {
        return database.execute("DELETE FROM dishes WHERE id = " + id);
    }

    private void validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Dish name is required");
        }
    }

    private void validateCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Dish category is required");
        }
    }

    private void validatePrice(int price) {
        if (price < 0) {
            throw new IllegalArgumentException("Dish price must be a non-negative number");
        }
    }

    private String escapeSql(String value) {
        return value.replace("'", "''");
    }

    private Dish toDish(Map<String, Object> row) {
        Dish dish = new Dish();
        dish.dish_id = toInt(row.get("id"));
        dish.dish_name = row.get("name") == null ? null : String.valueOf(row.get("name"));
        dish.category = row.get("category") == null ? null : String.valueOf(row.get("category"));
        dish.price = toInt(row.get("price"));
        return dish;
    }

    private int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }
}
