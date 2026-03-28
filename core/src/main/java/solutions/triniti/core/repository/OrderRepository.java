package solutions.triniti.core.repository;

import solutions.triniti.core.db.Database;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.model.OrderItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class OrderRepository {

	private final Database database;

	public OrderRepository(Database database) {
		if (database == null) {
			throw new IllegalArgumentException("Database cannot be null");
		}
		this.database = database;
	}

	public List<Order> listAll() throws Exception {
		List<Map<String, Object>> rows = database.query(
			"SELECT order_id, display_id, order_tag, is_payment_done, order_total, order_status, created_at " +
			"FROM orders ORDER BY order_id DESC"
		);

		List<Order> orders = new ArrayList<>();
		for (Map<String, Object> row : rows) {
			orders.add(toOrder(row));
		}

		return orders;
	}

	public List<OrderItem> listItemsByOrderId(long orderId) throws Exception {
		List<Map<String, Object>> rows = database.query(
			"SELECT order_item_id, order_id, dish_id, quantity, dish_name_snapshot, price_snapshot, item_status " +
			"FROM order_items WHERE order_id = " + orderId + " ORDER BY order_item_id ASC"
		);

		List<OrderItem> items = new ArrayList<>();
		for (Map<String, Object> row : rows) {
			OrderItem item = new OrderItem();
			item.order_item_id = toInt(row.get("order_item_id"));
			item.order_id = toInt(row.get("order_id"));
			item.dish_id = toInt(row.get("dish_id"));
			item.quantity = toInt(row.get("quantity"));
			item.dish_name_snapshot = row.get("dish_name_snapshot") == null ? null : String.valueOf(row.get("dish_name_snapshot"));
			item.price_snapshot = toInt(row.get("price_snapshot"));
			item.item_status = row.get("item_status") == null ? null : String.valueOf(row.get("item_status"));
			items.add(item);
		}

		return items;
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

	public Order createOrder(String tag) throws Exception {
		String normalizedTag = normalizeTag(tag);
		String displayId = "0";

		String insertSql =
			"INSERT INTO orders(display_id, order_tag, is_payment_done, order_total, order_status) VALUES ('" +
			escapeSql(displayId) + "', " +
			(normalizedTag == null ? "NULL" : "'" + escapeSql(normalizedTag) + "'") + ", 0, 0, 'OPEN')";

		database.execute(insertSql);

		List<Map<String, Object>> rows = database.query(
			"SELECT order_id, display_id, order_tag, is_payment_done, order_total, order_status, created_at " +
			"FROM orders ORDER BY order_id DESC LIMIT 1"
		);


		if (rows.isEmpty()) {
			throw new IllegalStateException("Order created but could not be loaded");
		}

		return toOrder(rows.get(0));
	}

	private Order toOrder(Map<String, Object> row) {
		Order order = new Order();
		order.order_id = toInt(row.get("order_id"));
		order.display_id = row.get("display_id") == null ? null : String.valueOf(row.get("display_id"));
		order.order_tag = row.get("order_tag") == null ? null : String.valueOf(row.get("order_tag"));
		order.is_payment_done = toInt(row.get("is_payment_done")) == 1;
		order.order_total = toInt(row.get("order_total"));
		order.order_status = row.get("order_status") == null ? null : String.valueOf(row.get("order_status"));
		order.created_at = row.get("created_at") == null ? null : String.valueOf(row.get("created_at"));
		return order;
	}

	private String normalizeTag(String tag) {
		if (tag == null) {
			return null;
		}

		String trimmed = tag.trim();
		if (trimmed.isEmpty() || "null".equalsIgnoreCase(trimmed)) {
			return null;
		}

		return trimmed;
	}

	private String escapeSql(String value) {
		return value == null ? "" : value.replace("'", "''");
	}

	public void addOrderItem(int orderId, int dishId, int quantity) {
		String insertSql =
			"INSERT INTO order_items(order_id, dish_id, quantity, dish_name_snapshot, price_snapshot, item_status) " +
			"VALUES (" + orderId + ", " + dishId + ", " + quantity + ", " +
			"(SELECT name FROM dishes WHERE id = " + dishId + "), " +
			"(SELECT price FROM dishes WHERE id = " + dishId + "), 'PENDING')";

		try {
			database.execute(insertSql);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to add order item: " + e.getMessage());
		}
	}

	public void updateOrderTotal(int orderId) {
		String updateSql =
			"UPDATE orders SET order_total = " +
			"(SELECT COALESCE(SUM(price_snapshot * quantity), 0) FROM order_items WHERE order_id = " + orderId + ") " +
			"WHERE order_id = " + orderId;

		try {
			database.execute(updateSql);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update order total: " + e.getMessage());
		}
	}

	public Order getOrderById(int orderId) {
		try {
			List<Map<String, Object>> rows = database.query(
				"SELECT order_id, display_id, order_tag, is_payment_done, order_total, order_status, created_at " +
				"FROM orders WHERE order_id = " + orderId + " LIMIT 1"
			);

			if (rows.isEmpty()) {
				return null;
			}

			return toOrder(rows.get(0));
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to get order by ID: " + e.getMessage());
		}
	}
}
