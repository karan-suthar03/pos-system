package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "categories")
public class Category {

    @DatabaseField(columnName = "id", generatedId = true, allowGeneratedIdInsert = true)
    public int category_id;

    @DatabaseField(columnName = "name", unique = true)
    public String name;

    @DatabaseField(columnName = "image_path")
    public String image_path;

    @DatabaseField(columnName = "created_at", readOnly = true)
    public long created_at;

    @DatabaseField(columnName = "updated_at", readOnly = true)
    public long updated_at;

    @DatabaseField(columnName = "deleted_at")
    public Long deleted_at;

    public Category() {
    }

    public JsonObject toJson() {
        JsonObject payload = new JsonObject();
        payload.addProperty("id", category_id);
        payload.addProperty("name", name);
        if (image_path == null) {
            payload.add("imagePath", null);
        } else {
            payload.addProperty("imagePath", image_path);
        }
        payload.addProperty("createdAt", created_at);
        payload.addProperty("updatedAt", updated_at);
        if (deleted_at == null || deleted_at <= 0) {
            payload.add("deletedAt", null);
        } else {
            payload.addProperty("deletedAt", deleted_at);
        }
        return payload;
    }
}
