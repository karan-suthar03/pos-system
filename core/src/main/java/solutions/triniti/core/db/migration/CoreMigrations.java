package solutions.triniti.core.db.migration;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import solutions.triniti.core.db.Database;

import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public final class CoreMigrations {

    private static final String DISH_SEED_JSON = "[{\"dish_name\":\"Tea\",\"category\":\"Hot Beverage\",\"price\":20},{\"dish_name\":\"Green Tea\",\"category\":\"Hot Beverage\",\"price\":30},{\"dish_name\":\"Black Tea\",\"category\":\"Hot Beverage\",\"price\":20},{\"dish_name\":\"Hot Coffee\",\"category\":\"Hot Beverage\",\"price\":30},{\"dish_name\":\"Black Coffee\",\"category\":\"Hot Beverage\",\"price\":25},{\"dish_name\":\"Plain Hot Chocolate\",\"category\":\"Hot Beverage\",\"price\":40},{\"dish_name\":\"Cold Coffee\",\"category\":\"Cold Coffee\",\"price\":50},{\"dish_name\":\"Cold Coffee with Crush\",\"category\":\"Cold Coffee\",\"price\":70},{\"dish_name\":\"Lemon Ice Tea\",\"category\":\"Refresher\",\"price\":50},{\"dish_name\":\"Peach Ice Tea\",\"category\":\"Refresher\",\"price\":50},{\"dish_name\":\"Mint Mojito\",\"category\":\"Refresher\",\"price\":80},{\"dish_name\":\"Green Apple Mojito\",\"category\":\"Refresher\",\"price\":80},{\"dish_name\":\"Blue Berry Smoothie\",\"category\":\"Smoothie\",\"price\":110},{\"dish_name\":\"Strawberry Smoothie\",\"category\":\"Smoothie\",\"price\":110},{\"dish_name\":\"Mango Smoothie\",\"category\":\"Smoothie\",\"price\":110},{\"dish_name\":\"Oreo Smoothie\",\"category\":\"Smoothie\",\"price\":120},{\"dish_name\":\"Dark Chocolate Smoothie\",\"category\":\"Smoothie\",\"price\":130},{\"dish_name\":\"Kit Kat Shake\",\"category\":\"Shake\",\"price\":110},{\"dish_name\":\"Java Choco Chip Shake\",\"category\":\"Shake\",\"price\":120},{\"dish_name\":\"Brownie Shake\",\"category\":\"Shake\",\"price\":130},{\"dish_name\":\"Nutella Shake\",\"category\":\"Shake\",\"price\":140},{\"dish_name\":\"Oreo Shake\",\"category\":\"Shake\",\"price\":100},{\"dish_name\":\"Butter Scotch Shake\",\"category\":\"Shake\",\"price\":100},{\"dish_name\":\"Rose Shake\",\"category\":\"Shake\",\"price\":90},{\"dish_name\":\"Green Chatni Sandwich\",\"category\":\"Sandwich\",\"price\":60},{\"dish_name\":\"Triple Cheese Sandwich\",\"category\":\"Sandwich\",\"price\":80},{\"dish_name\":\"Chocolate Sandwich\",\"category\":\"Sandwich\",\"price\":80},{\"dish_name\":\"Bombay Masala Sandwich\",\"category\":\"Sandwich\",\"price\":80},{\"dish_name\":\"Classic Club Sandwich\",\"category\":\"Sandwich\",\"price\":100},{\"dish_name\":\"Paneer Sandwich\",\"category\":\"Sandwich\",\"price\":120},{\"dish_name\":\"Mexican Sandwich\",\"category\":\"Sandwich\",\"price\":130},{\"dish_name\":\"Cheese Corn Sandwich\",\"category\":\"Sandwich\",\"price\":110},{\"dish_name\":\"Extra Spicy Sandwich\",\"category\":\"Sandwich\",\"price\":120},{\"dish_name\":\"Plain Maggi\",\"category\":\"Maggi\",\"price\":50},{\"dish_name\":\"Masala Maggi\",\"category\":\"Maggi\",\"price\":60},{\"dish_name\":\"Cheese Masala Maggi\",\"category\":\"Maggi\",\"price\":70},{\"dish_name\":\"Italian Maggi\",\"category\":\"Maggi\",\"price\":90},{\"dish_name\":\"Peri Peri Cheese Maggi\",\"category\":\"Maggi\",\"price\":80},{\"dish_name\":\"Cheese Corn Maggi\",\"category\":\"Maggi\",\"price\":80},{\"dish_name\":\"Alfredo Pasta (White)\",\"category\":\"Pasta\",\"price\":160},{\"dish_name\":\"Arrabiata Pasta (Red)\",\"category\":\"Pasta\",\"price\":160},{\"dish_name\":\"Pink Pasta (Red + White)\",\"category\":\"Pasta\",\"price\":180},{\"dish_name\":\"Indian Pasta (All Veggies)\",\"category\":\"Pasta\",\"price\":120},{\"dish_name\":\"Salted Fries\",\"category\":\"Fries\",\"price\":60},{\"dish_name\":\"Peri Peri Fries\",\"category\":\"Fries\",\"price\":80},{\"dish_name\":\"Cheese Peri Peri Fries\",\"category\":\"Fries\",\"price\":100},{\"dish_name\":\"Chipotle Fries\",\"category\":\"Fries\",\"price\":120},{\"dish_name\":\"Cheese Corn Balls (6 pcs)\",\"category\":\"Fries\",\"price\":120},{\"dish_name\":\"Margarita Pizza\",\"category\":\"Pizza\",\"price\":100},{\"dish_name\":\"Cheese Chilli Toast\",\"category\":\"Pizza\",\"price\":80},{\"dish_name\":\"Cheese Burst Pizza\",\"category\":\"Pizza\",\"price\":100},{\"dish_name\":\"Corn Cheese Pizza\",\"category\":\"Pizza\",\"price\":110},{\"dish_name\":\"Mexican Cheese Pizza\",\"category\":\"Pizza\",\"price\":140},{\"dish_name\":\"Tandoori Paneer Pizza\",\"category\":\"Pizza\",\"price\":150},{\"dish_name\":\"Mix Veg Cheese Pizza\",\"category\":\"Pizza\",\"price\":160},{\"dish_name\":\"Pasta Pizza\",\"category\":\"Pizza\",\"price\":180},{\"dish_name\":\"Special Pizza\",\"category\":\"Pizza\",\"price\":200},{\"dish_name\":\"Crispy Veg Burger\",\"category\":\"Burger\",\"price\":80},{\"dish_name\":\"Crispy Veg Cheese Burger\",\"category\":\"Burger\",\"price\":100},{\"dish_name\":\"Crispy Veg Schezwan Burger\",\"category\":\"Burger\",\"price\":100},{\"dish_name\":\"Crispy Paneer Burger\",\"category\":\"Burger\",\"price\":120},{\"dish_name\":\"Crispy Paneer Cheese Burger\",\"category\":\"Burger\",\"price\":130},{\"dish_name\":\"Crispy Paneer Schezwan Burger\",\"category\":\"Burger\",\"price\":140},{\"dish_name\":\"Crispy Paneer Chipotle Burger\",\"category\":\"Burger\",\"price\":150},{\"dish_name\":\"Crispy Paneer + Veg Burger\",\"category\":\"Burger\",\"price\":200},{\"dish_name\":\"Crispy Double Decker Burger\",\"category\":\"Burger\",\"price\":190},{\"dish_name\":\"Veg Steam Momo\",\"category\":\"Momo\",\"price\":80},{\"dish_name\":\"Paneer Steam Momo\",\"category\":\"Momo\",\"price\":90},{\"dish_name\":\"Veg Fried Momo\",\"category\":\"Momo\",\"price\":90},{\"dish_name\":\"Paneer Fried Momo\",\"category\":\"Momo\",\"price\":100},{\"dish_name\":\"Veg Tandoori Momo\",\"category\":\"Momo\",\"price\":120},{\"dish_name\":\"Paneer Tandoori Momo\",\"category\":\"Momo\",\"price\":130},{\"dish_name\":\"Veg Mexican Momo\",\"category\":\"Momo\",\"price\":150},{\"dish_name\":\"Paneer Mexican Momo\",\"category\":\"Momo\",\"price\":160},{\"dish_name\":\"Veg + Paneer Steam Momo\",\"category\":\"Momo\",\"price\":100},{\"dish_name\":\"Veg + Paneer Fried Momo\",\"category\":\"Momo\",\"price\":120},{\"dish_name\":\"Cheese\",\"category\":\"Extra\",\"price\":30},{\"dish_name\":\"Water Bottle\",\"category\":\"Misc\",\"price\":20},{\"dish_name\":\"Cigarettes\",\"category\":\"Misc\",\"price\":25}]";

    private CoreMigrations() {
    }

    public static List<Migration> all() {
        return Arrays.asList(
            new Migration() {
                @Override
                public int version() {
                    return 1;
                }

                @Override
                public String name() {
                    return "init_dishes";
                }

                @Override
                public void apply(Database database) throws Exception {
                    database.execute(
                        "CREATE TABLE IF NOT EXISTS dishes (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "name TEXT NOT NULL, " +
                        "category TEXT NOT NULL DEFAULT '', " +
                        "price INTEGER NOT NULL DEFAULT 0, " +
                        "is_available INTEGER NOT NULL DEFAULT 1" +
                        ")"
                    );
                }
            },
            new Migration() {
                @Override
                public int version() {
                    return 2;
                }

                @Override
                public String name() {
                    return "seed_dishes";
                }

                @Override
                public void apply(Database database) throws Exception {
                    List<Map<String, Object>> rows = database.query("SELECT COUNT(1) AS count FROM dishes");
                    if (toInt(rows.get(0).get("count")) > 0) {
                        return;
                    }

                    Gson gson = new Gson();
                    Type listType = new TypeToken<List<Map<String, Object>>>() {}.getType();
                    List<Map<String, Object>> dishes = gson.fromJson(DISH_SEED_JSON, listType);

                    for (Map<String, Object> dish : dishes) {
                        String name = escapeSql(String.valueOf(dish.get("dish_name")));
                        String category = escapeSql(String.valueOf(dish.get("category")));
                        int price = toInt(dish.get("price")) * 100;

                        database.execute(
                            "INSERT INTO dishes(name, category, price, is_available) VALUES ('" +
                            name + "', '" + category + "', " + price + ", 1)"
                        );
                    }
                }
            },
            new Migration() {
                @Override
                public int version() {
                    return 3;
                }

                @Override
                public String name() {
                    return "init_orders";
                }

                @Override
                public void apply(Database database) throws Exception {
                    database.execute(
                        "CREATE TABLE IF NOT EXISTS orders (" +
                        "order_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "display_id TEXT, " +
                        "order_tag TEXT, " +
                        "is_payment_done INTEGER NOT NULL DEFAULT 0 CHECK (is_payment_done IN (0, 1)), " +
                        "order_total INTEGER NOT NULL DEFAULT 0 CHECK (order_total >= 0), " +
                        "order_status TEXT NOT NULL CHECK (" +
                        "order_status IN ('OPEN', 'CLOSED', 'CANCELLED')), " +
                        "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" +
                        ")"
                    );

                    database.execute(
                        "CREATE TABLE IF NOT EXISTS order_items (" +
                        "order_item_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                        "order_id INTEGER NOT NULL, " +
                        "dish_id INTEGER NOT NULL, " +
                        "quantity INTEGER NOT NULL CHECK (quantity > 0), " +
                        "dish_name_snapshot TEXT NOT NULL, " +
                        "price_snapshot INTEGER NOT NULL CHECK (price_snapshot > 0), " +
                        "item_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (" +
                        "item_status IN ('PENDING', 'SERVED', 'CANCELLED')" +
                        "), " +
                        "FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE, " +
                        "FOREIGN KEY (dish_id) REFERENCES dishes(id)" +
                        ")"
                    );
                }
            },
            new Migration() {
                @Override
                public int version() {
                    return 4;
                }

                @Override
                public String name() {
                    return "add_orders_display_id";
                }

                @Override
                public void apply(Database database) throws Exception {
                    if (!hasColumn(database, "orders", "display_id")) {
                        database.execute("ALTER TABLE orders ADD COLUMN display_id TEXT");
                    }
                }
            }
        );
    }

    private static boolean hasColumn(Database database, String table, String column) throws Exception {
        List<Map<String, Object>> rows = database.query("PRAGMA table_info(" + table + ")");
        for (Map<String, Object> row : rows) {
            Object name = row.get("name");
            if (name != null && column.equalsIgnoreCase(String.valueOf(name))) {
                return true;
            }
        }
        return false;
    }

    private static int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }

        return Integer.parseInt(String.valueOf(value));
    }

    private static String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }
}
