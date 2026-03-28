package solutions.triniti.core.model;

import com.google.gson.JsonObject;

public class Order {

    public int order_id;

    public String display_id;

    public String order_tag;

    public boolean is_payment_done;

    public int order_total;

    public String order_status;

    public String created_at;

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
