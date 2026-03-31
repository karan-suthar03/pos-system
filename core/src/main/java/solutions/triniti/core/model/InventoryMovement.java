package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "inventory_movements")
public class InventoryMovement {

    @DatabaseField(columnName = "inventory_movement_id", generatedId = true)
    public int inventory_movement_id;

    @DatabaseField(columnName = "inventory_item_id")
    public int inventory_item_id;

    @DatabaseField(columnName = "delta")
    public double delta;

    @DatabaseField(columnName = "reason")
    public String reason;

    @DatabaseField(columnName = "ref_type")
    public String ref_type;

    @DatabaseField(columnName = "ref_id")
    public Integer ref_id;

    @DatabaseField(columnName = "notes")
    public String notes;

    @DatabaseField(columnName = "created_at", readOnly = true)
    public long created_at;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

    @DatabaseField(columnName = "deleted_at")
    public Long deleted_at;

    public InventoryMovement() {
    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("id", inventory_movement_id);
        item.addProperty("inventoryItemId", inventory_item_id);
        item.addProperty("delta", delta);
        item.addProperty("reason", reason);
        if (ref_type == null) {
            item.add("refType", null);
        } else {
            item.addProperty("refType", ref_type);
        }
        if (ref_id == null) {
            item.add("refId", null);
        } else {
            item.addProperty("refId", ref_id);
        }
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
