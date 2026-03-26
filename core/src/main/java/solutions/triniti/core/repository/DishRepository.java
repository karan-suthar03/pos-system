package solutions.triniti.core.repository;

import solutions.triniti.core.db.Database;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.model.Dish;

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
    }

    public void ensureTable() throws Exception {
        CoreDatabaseBootstrap.migrate(database);
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
