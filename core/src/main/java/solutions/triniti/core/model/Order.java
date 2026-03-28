package solutions.triniti.core.model;

import com.google.gson.JsonObject;
import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "orders")
public class Order {

    @DatabaseField(columnName = "order_id", generatedId = true)
    public int order_id;

    @DatabaseField(columnName = "display_id")
    public String display_id;

    @DatabaseField(columnName = "order_tag")
    public String order_tag;

    @DatabaseField(columnName = "is_payment_done")
    public boolean is_payment_done;

    @DatabaseField(columnName = "order_total")
    public int order_total;

    @DatabaseField(columnName = "order_status")
    public String order_status;

    @DatabaseField(columnName = "created_at", readOnly = true)
    public long created_at;

    public Order() {
    }

    public JsonObject toJson() {
        JsonObject item = new JsonObject();
        item.addProperty("order_id", order_id);
        item.addProperty("display_id", display_id);
        item.addProperty("order_tag", order_tag);
        item.addProperty("is_payment_done", is_payment_done);
        item.addProperty("order_total", order_total);
        item.addProperty("order_status", order_status);
        item.addProperty("created_at", created_at);
        return item;
    }
}
