package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "inventory_items")
public class InventoryItem {

    @DatabaseField(columnName = "inventory_item_id", generatedId = true)
    public int inventory_item_id;

    @DatabaseField(columnName = "name")
    public String name;

    @DatabaseField(columnName = "category")
    public String category;

    @DatabaseField(columnName = "unit")
    public String unit;

    @DatabaseField(columnName = "on_hand")
    public double on_hand;

    @DatabaseField(columnName = "low_stock_threshold")
    public double low_stock_threshold;

    @DatabaseField(columnName = "max_stock")
    public double max_stock;

    @DatabaseField(columnName = "notes")
    public String notes;

    @DatabaseField(columnName = "created_at", readOnly = true)
    public long created_at;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

    @DatabaseField(columnName = "deleted_at")
    public Long deleted_at;

    public InventoryItem() {
    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("id", inventory_item_id);
        item.addProperty("name", name);
        if (category == null || category.trim().isEmpty()) {
            item.add("category", null);
        } else {
            item.addProperty("category", category);
        }
        item.addProperty("unit", unit);
        item.addProperty("onHand", on_hand);
        item.addProperty("lowStockThreshold", low_stock_threshold);
        item.addProperty("maxStock", max_stock);
        if (notes == null) {
            item.add("notes", null);
        } else {
            item.addProperty("notes", notes);
        }
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
