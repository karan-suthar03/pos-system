package solutions.triniti.backend.sync.dto;

import java.util.ArrayList;
import java.util.List;

public class FullSyncRequest {
    public String requestId;

    public List<CategoryRow> categories = new ArrayList<>();
    public List<DishRow> dishes = new ArrayList<>();
    public List<InventoryItemRow> inventoryItems = new ArrayList<>();
    public List<OrderRow> orders = new ArrayList<>();
    public List<OrderItemRow> orderItems = new ArrayList<>();

    public static class CategoryRow {
        public int id;
        public String name;
        public String imagePath;
        public long createdAt;
        public long updatedAt;
        public Long deletedAt;
    }

    public static class DishRow {
        public int id;
        public String name;
        public String category;
        public int categoryId;
        public int price;
        public boolean isAvailable;
        public long createdAt;
        public long updatedAt;
        public Long deletedAt;
    }

    public static class InventoryItemRow {
        public int inventoryItemId;
        public String name;
        public String category;
        public String unit;
        public double onHand;
        public double lowStockThreshold;
        public double maxStock;
        public String notes;
        public long createdAt;
        public long updatedAt;
        public Long deletedAt;
    }

    public static class OrderRow {
        public int orderId;
        public String displayId;
        public String orderTag;
        public boolean isPaymentDone;
        public int orderTotal;
        public String orderStatus;
        public long createdAt;
        public long updatedAt;
        public Long deletedAt;
    }

    public static class OrderItemRow {
        public int orderItemId;
        public int orderId;
        public int dishId;
        public int quantity;
        public String dishNameSnapshot;
        public int priceSnapshot;
        public String itemStatus;
        public long createdAt;
        public long updatedAt;
        public Long deletedAt;
    }
}
