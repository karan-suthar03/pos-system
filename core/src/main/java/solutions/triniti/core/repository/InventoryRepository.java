package solutions.triniti.core.repository;

import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import com.j256.ormlite.stmt.QueryBuilder;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.model.DishIngredient;
import solutions.triniti.core.model.InventoryItem;
import solutions.triniti.core.model.InventoryMovement;

import java.util.ArrayList;
import java.util.List;

public class InventoryRepository {

    public static final String REASON_SERVED = "SERVED";
    public static final String REASON_REVERSED = "REVERSED";
    public static final String REASON_ADJUSTMENT = "ADJUSTMENT";

    private final OrmLiteConnectionProvider ormLiteConnectionProvider;
    private final Dao<InventoryItem, Integer> inventoryItemDao;
    private final Dao<DishIngredient, Integer> dishIngredientDao;
    private final Dao<InventoryMovement, Integer> inventoryMovementDao;

    public InventoryRepository(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        if (ormLiteConnectionProvider == null) {
            throw new IllegalArgumentException("Connection provider cannot be null");
        }

        this.ormLiteConnectionProvider = ormLiteConnectionProvider;

        try {
            this.inventoryItemDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), InventoryItem.class);
            this.dishIngredientDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), DishIngredient.class);
            this.inventoryMovementDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), InventoryMovement.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize ORMLite DAOs for inventory", e);
        }
    }

    public void ensureTable() throws Exception {
        CoreDatabaseBootstrap.migrate(ormLiteConnectionProvider);
    }

    public List<InventoryItem> listItems() throws Exception {
        QueryBuilder<InventoryItem, Integer> queryBuilder = inventoryItemDao.queryBuilder();
        queryBuilder.where().isNull("deleted_at");
        queryBuilder.orderBy("name", true);
        return queryBuilder.query();
    }

    public List<InventoryItem> listItemsForSync() throws Exception {
        QueryBuilder<InventoryItem, Integer> queryBuilder = inventoryItemDao.queryBuilder();
        queryBuilder.orderBy("inventory_item_id", true);
        return queryBuilder.query();
    }

    public List<InventoryItem> listItemsUpdatedSinceForSync(long updatedAfterExclusive) throws Exception {
        QueryBuilder<InventoryItem, Integer> queryBuilder = inventoryItemDao.queryBuilder();
        if (updatedAfterExclusive > 0) {
            queryBuilder.where().gt("updated_at", updatedAfterExclusive);
        }
        queryBuilder.orderBy("updated_at", true);
        queryBuilder.orderBy("inventory_item_id", true);
        return queryBuilder.query();
    }

    public InventoryItem getItemById(int itemId) throws Exception {
        if (itemId <= 0) {
            return null;
        }

        List<InventoryItem> matches = inventoryItemDao.queryBuilder()
            .where()
            .eq("inventory_item_id", itemId)
            .and()
            .isNull("deleted_at")
            .query();

        return matches.isEmpty() ? null : matches.get(0);
    }

    public InventoryItem createItem(String name, String category, String unit, double onHand, double lowStockThreshold, double maxStock, String notes) throws Exception {
        String normalizedName = normalizeName(name);
        if (normalizedName == null) {
            throw new IllegalArgumentException("Inventory item name is required");
        }

        InventoryItem item = new InventoryItem();
        item.name = normalizedName;
        item.category = normalizeCategory(category);
        item.unit = normalizeUnit(unit);
        item.on_hand = onHand;
        item.low_stock_threshold = Math.max(0, lowStockThreshold);
        item.max_stock = Math.max(0, maxStock);
        item.notes = normalizeNotes(notes, false);
        inventoryItemDao.create(item);
        return item;
    }

    public InventoryItem updateItem(int itemId, String name, String category, String unit, Double onHand, Double lowStockThreshold, Double maxStock, String notes, boolean clearNotes) throws Exception {
        InventoryItem existing = getItemById(itemId);
        if (existing == null) {
            return null;
        }

        String normalizedName = normalizeName(name);
        if (normalizedName != null) {
            existing.name = normalizedName;
        }

        if (category != null) {
            existing.category = normalizeCategory(category);
        }

        if (unit != null) {
            existing.unit = normalizeUnit(unit);
        }

        if (onHand != null) {
            existing.on_hand = onHand;
        }

        if (lowStockThreshold != null) {
            existing.low_stock_threshold = Math.max(0, lowStockThreshold);
        }

        if (maxStock != null) {
            existing.max_stock = Math.max(0, maxStock);
        }

        if (clearNotes || notes != null) {
            existing.notes = normalizeNotes(notes, clearNotes);
        }

        inventoryItemDao.update(existing);
        return existing;
    }

    public int deleteItem(int itemId) throws Exception {
        InventoryItem existing = getItemById(itemId);
        if (existing == null) {
            return 0;
        }

        existing.deleted_at = System.currentTimeMillis();
        return inventoryItemDao.update(existing);
    }

    public List<DishIngredient> listRecipeForDish(int dishId) throws Exception {
        QueryBuilder<DishIngredient, Integer> queryBuilder = dishIngredientDao.queryBuilder();
        queryBuilder.where()
            .eq("dish_id", dishId)
            .and()
            .isNull("deleted_at");
        queryBuilder.orderBy("dish_ingredient_id", true);
        return queryBuilder.query();
    }

    public List<DishIngredient> setRecipeForDish(int dishId, List<RecipeEntry> entries) throws Exception {
        List<DishIngredient> existing = listRecipeForDish(dishId);
        long deletedAt = System.currentTimeMillis();
        for (DishIngredient ingredient : existing) {
            ingredient.deleted_at = deletedAt;
            dishIngredientDao.update(ingredient);
        }

        List<DishIngredient> created = new ArrayList<>();
        if (entries == null) {
            return created;
        }

        for (RecipeEntry entry : entries) {
            if (entry == null || entry.inventoryItemId <= 0) {
                continue;
            }

            if (entry.quantity <= 0) {
                continue;
            }

            InventoryItem item = getItemById(entry.inventoryItemId);
            if (item == null) {
                throw new IllegalArgumentException("Inventory item not found for id: " + entry.inventoryItemId);
            }

            DishIngredient ingredient = new DishIngredient();
            ingredient.dish_id = dishId;
            ingredient.inventory_item_id = entry.inventoryItemId;
            ingredient.quantity = entry.quantity;
            dishIngredientDao.create(ingredient);
            created.add(ingredient);
        }

        return created;
    }

    public InventoryMovement adjustStock(int itemId, double delta, String notes) throws Exception {
        return addMovement(itemId, delta, REASON_ADJUSTMENT, null, null, notes);
    }

    public List<InventoryMovement> listMovements(Integer itemId, Integer limit) throws Exception {
        QueryBuilder<InventoryMovement, Integer> queryBuilder = inventoryMovementDao.queryBuilder();
        if (itemId != null && itemId > 0) {
            queryBuilder.where()
                .eq("inventory_item_id", itemId)
                .and()
                .isNull("deleted_at");
        } else {
            queryBuilder.where().isNull("deleted_at");
        }

        queryBuilder.orderBy("created_at", false);
        if (limit != null && limit > 0) {
            queryBuilder.limit((long) limit);
        }

        return queryBuilder.query();
    }

    public List<InventoryItem> listLowStockItems() throws Exception {
        List<InventoryItem> items = listItems();
        List<InventoryItem> lowStock = new ArrayList<>();
        for (InventoryItem item : items) {
            if (item.on_hand <= item.low_stock_threshold) {
                lowStock.add(item);
            }
        }
        return lowStock;
    }

    public void applyRecipeForOrderItem(int dishId, int orderItemId, int quantity, boolean consume) throws Exception {
        if (dishId <= 0 || orderItemId <= 0 || quantity <= 0) {
            return;
        }

        List<DishIngredient> recipe = listRecipeForDish(dishId);
        if (recipe.isEmpty()) {
            return;
        }

        String reason = consume ? REASON_SERVED : REASON_REVERSED;
        for (DishIngredient ingredient : recipe) {
            double delta = ingredient.quantity * quantity * (consume ? -1 : 1);
            if (delta == 0) {
                continue;
            }

            addMovement(
                ingredient.inventory_item_id,
                delta,
                reason,
                "order_item",
                orderItemId,
                "dishId=" + dishId
            );
        }
    }

    private InventoryMovement addMovement(int itemId, double delta, String reason, String refType, Integer refId, String notes) throws Exception {
        if (itemId <= 0) {
            throw new IllegalArgumentException("Inventory item id is required");
        }

        String normalizedReason = reason == null ? "" : reason.trim();
        if (normalizedReason.isEmpty()) {
            throw new IllegalArgumentException("Movement reason is required");
        }

        InventoryItem item = getItemById(itemId);
        if (item == null) {
            throw new IllegalArgumentException("Inventory item not found for id: " + itemId);
        }

        InventoryMovement movement = new InventoryMovement();
        movement.inventory_item_id = itemId;
        movement.delta = delta;
        movement.reason = normalizedReason;
        movement.ref_type = normalizeRef(refType);
        movement.ref_id = refId;
        movement.notes = normalizeNotes(notes, false);
        inventoryMovementDao.create(movement);

        item.on_hand = item.on_hand + delta;
        inventoryItemDao.update(item);
        return movement;
    }

    private String normalizeName(String name) {
        if (name == null) {
            return null;
        }

        String trimmed = name.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeCategory(String category) {
        if (category == null) {
            return null;
        }

        String trimmed = category.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeUnit(String unit) {
        if (unit == null) {
            return "unit";
        }

        String trimmed = unit.trim();
        return trimmed.isEmpty() ? "unit" : trimmed;
    }

    private String normalizeNotes(String notes, boolean clearNotes) {
        if (clearNotes) {
            return null;
        }

        if (notes == null) {
            return null;
        }

        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeRef(String refType) {
        if (refType == null) {
            return null;
        }

        String trimmed = refType.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static class RecipeEntry {
        public final int inventoryItemId;
        public final double quantity;

        public RecipeEntry(int inventoryItemId, double quantity) {
            this.inventoryItemId = inventoryItemId;
            this.quantity = quantity;
        }
    }
}
