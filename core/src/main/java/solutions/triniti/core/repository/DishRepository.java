package solutions.triniti.core.repository;

import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.model.Dish;

import java.util.List;

public class DishRepository {

    private final OrmLiteConnectionProvider ormLiteConnectionProvider;
    private final Dao<Dish, Integer> dishDao;

    public DishRepository(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        if (ormLiteConnectionProvider == null) {
            throw new IllegalArgumentException("Connection provider cannot be null");
        }
        this.ormLiteConnectionProvider = ormLiteConnectionProvider;

        Dao<Dish, Integer> resolvedDishDao;
        try {
            resolvedDishDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), Dish.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize ORMLite DAO for dishes", e);
        }

        this.dishDao = resolvedDishDao;
    }

    public void ensureTable() throws Exception {
        CoreDatabaseBootstrap.migrate(ormLiteConnectionProvider);
    }

    public List<Dish> listAll() throws Exception {
        return dishDao.queryBuilder()
            .orderBy("name", true)
            .query();
    }

    public Dish getById(long id) throws Exception {
        return dishDao.queryForId((int) id);
    }

    public int create(String name, String category, int price, boolean isAvailable) throws Exception {
        validateName(name);
        validateCategory(category);
        validatePrice(price);

        Dish dish = new Dish();
        dish.dish_name = name.trim();
        dish.category = category.trim();
        dish.price = price;
        dish.is_available = isAvailable;
        return dishDao.create(dish);
    }

    public int create(Dish dish) throws Exception {
        if (dish == null) {
            throw new IllegalArgumentException("Dish cannot be null");
        }

        validateName(dish.dish_name);
        validateCategory(dish.category);
        validatePrice(dish.price);

        dish.dish_name = dish.dish_name.trim();
        dish.category = dish.category.trim();
        return dishDao.create(dish);
    }

    public int updatePrice(long id, int price) throws Exception {
        validatePrice(price);

        Dish dish = dishDao.queryForId((int) id);
        if (dish == null) {
            return 0;
        }
        dish.price = price;
        return dishDao.update(dish);
    }

    public int updateCategory(long id, String category) throws Exception {
        validateCategory(category);

        Dish dish = dishDao.queryForId((int) id);
        if (dish == null) {
            return 0;
        }
        dish.category = category.trim();
        return dishDao.update(dish);
    }

    public int setAvailability(long id, boolean isAvailable) throws Exception {
        Dish dish = dishDao.queryForId((int) id);
        if (dish == null) {
            return 0;
        }
        dish.is_available = isAvailable;
        return dishDao.update(dish);
    }

    public int delete(long id) throws Exception {
        return dishDao.deleteById((int) id);
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
}
