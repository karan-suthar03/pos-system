package solutions.triniti.core.repository;

import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import com.j256.ormlite.stmt.QueryBuilder;
import com.j256.ormlite.stmt.Where;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Dish;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.model.OrderItem;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;

public class OrderRepository {
	private final Dao<Order, Integer> orderDao;
	private final Dao<OrderItem, Integer> orderItemDao;
	private final DishRepository dishRepository;

	public OrderRepository(OrmLiteConnectionProvider ormLiteConnectionProvider) {
		if (ormLiteConnectionProvider == null) {
			throw new IllegalArgumentException("Connection provider cannot be null");
		}

		Dao<Order, Integer> resolvedOrderDao;
		Dao<OrderItem, Integer> resolvedOrderItemDao;
		try {
			resolvedOrderDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), Order.class);
			resolvedOrderItemDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), OrderItem.class);
		} catch (Exception e) {
			throw new IllegalStateException("Failed to initialize ORMLite DAOs", e);
		}

		this.orderDao = resolvedOrderDao;
		this.orderItemDao = resolvedOrderItemDao;
		this.dishRepository = new DishRepository(ormLiteConnectionProvider);
	}

	public List<Order> listAll() throws Exception {
		QueryBuilder<Order, Integer> queryBuilder = orderDao.queryBuilder();
		queryBuilder.where().isNull("deleted_at");
		queryBuilder.orderBy("order_id", false);
		return queryBuilder.query();
	}

	public List<OrderItem> listItemsByOrderId(long orderId) throws Exception {
		QueryBuilder<OrderItem, Integer> queryBuilder = orderItemDao.queryBuilder();
		queryBuilder.where()
			.eq("order_id", orderId)
			.and()
			.isNull("deleted_at");
		queryBuilder.orderBy("order_item_id", true);
		return queryBuilder.query();
	}

	public Order createOrder(String tag) throws Exception {
		Order order = new Order();
		long todaysOrderCount = countOrdersCreatedToday();
		order.display_id = String.valueOf(todaysOrderCount + 1);
		order.order_tag = normalizeTag(tag);
		order.is_payment_done = false;
		order.order_total = 0;
		order.order_status = "OPEN";
		orderDao.create(order);
		return getOrderById(order.order_id);
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

	public void addOrderItem(int orderId, int dishId, int quantity) {
		try {
			requireOrder(orderId);
			validateQuantity(quantity);

			Dish dish = dishRepository.getById(dishId);
			if (dish == null) {
				throw new IllegalArgumentException("Dish not found for id: " + dishId);
			}

			OrderItem item = new OrderItem();
			item.order_id = orderId;
			item.dish_id = dishId;
			item.quantity = quantity;
			item.dish_name_snapshot = dish.dish_name;
			item.price_snapshot = dish.price;
			item.item_status = "PENDING";
			orderItemDao.create(item);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to add order item: " + e.getMessage());
		}
	}

	public Order addItemToOrder(int orderId, int dishId, int quantity) {
		try {
			addOrderItem(orderId, dishId, quantity);
			updateOrderTotal(orderId);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to add item to order: " + e.getMessage());
		}
	}

	public void updateOrderTotal(int orderId) {
		try {
			int computedTotal = 0;
			List<OrderItem> items = listItemsByOrderId(orderId);
			for (OrderItem item : items) {
				if (!"CANCELLED".equals(item.item_status)) {
					computedTotal += item.price_snapshot * item.quantity;
				}
			}

			Order order = getOrderById(orderId);
			if (order == null) {
				throw new IllegalArgumentException("Order not found for id: " + orderId);
			}

			order.order_total = computedTotal;
			orderDao.update(order);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update order total: " + e.getMessage());
		}
	}

	public Order getOrderById(int orderId) {
		try {
			List<Order> matches = orderDao.queryBuilder()
				.where()
				.eq("order_id", orderId)
				.and()
				.isNull("deleted_at")
				.query();
			return matches.isEmpty() ? null : matches.get(0);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to get order by ID: " + e.getMessage());
		}
	}

	public Order completeOrder(int orderId) {
		try {
			Order order = requireOrder(orderId);
			List<OrderItem> items = listItemsByOrderId(orderId);
			for (OrderItem item : items) {
				if (!"CANCELLED".equals(item.item_status) && !"SERVED".equals(item.item_status)) {
					item.item_status = "SERVED";
					orderItemDao.update(item);
				}
			}
			updateOrderTotal(orderId);
			order.order_status = "CLOSED";
			orderDao.update(order);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to complete order: " + e.getMessage());
		}
	}

	public Order cancelOrder(int orderId) {
		try {
			Order order = requireOrder(orderId);
			order.order_status = "CANCELLED";
			orderDao.update(order);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to cancel order: " + e.getMessage());
		}
	}

	public Order markOrderPaid(int orderId) {
		return setOrderPaymentStatus(orderId, true);
	}

	public Order setOrderPaymentStatus(int orderId, boolean paymentDone) {
		try {
			Order order = requireOrder(orderId);
			order.is_payment_done = paymentDone;
			orderDao.update(order);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update payment status: " + e.getMessage());
		}
	}

	public Order toggleOrderPayment(int orderId) {
		try {
			Order order = requireOrder(orderId);
			order.is_payment_done = !order.is_payment_done;
			orderDao.update(order);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to toggle payment status: " + e.getMessage());
		}
	}

	public Order setOrderStatus(int orderId, String status) {
		try {
			Order order = requireOrder(orderId);
			order.order_status = normalizeOrderStatus(status);
			orderDao.update(order);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update order status: " + e.getMessage());
		}
	}

	public Order updateOrderTag(int orderId, String tag) {
		try {
			Order order = requireOrder(orderId);
			order.order_tag = normalizeTag(tag);
			orderDao.update(order);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update order tag: " + e.getMessage());
		}
	}

	public Order updateOrderItemQuantity(int orderId, int orderItemId, int quantity) {
		try {
			requireOrder(orderId);
			validateQuantity(quantity);
			OrderItem item = requireOrderItemForOrder(orderId, orderItemId);
			item.quantity = quantity;
			orderItemDao.update(item);
			updateOrderTotal(orderId);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update order item quantity: " + e.getMessage());
		}
	}

	public Order updateOrderItemStatus(int orderId, int orderItemId, String status) {
		try {
			requireOrder(orderId);
			OrderItem item = requireOrderItemForOrder(orderId, orderItemId);
			item.item_status = normalizeItemStatus(status);
			orderItemDao.update(item);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to update order item status: " + e.getMessage());
		}
	}

	public Order removeOrderItem(int orderId, int orderItemId) {
		try {
			requireOrder(orderId);
			OrderItem item = requireOrderItemForOrder(orderId, orderItemId);
			item.item_status = "CANCELLED";
			item.deleted_at = System.currentTimeMillis();
			orderItemDao.update(item);
			updateOrderTotal(orderId);
			return getOrderById(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to remove order item: " + e.getMessage());
		}
	}

	public List<Order> getTodaysOrders() {
		return getTodaysOrders(true);
	}

	public List<Order> getTodaysOrders(boolean includeCancelled) {
		try {
			long midnightTodayMillis = LocalDate.now()
				.atStartOfDay(ZoneId.systemDefault())
				.toInstant()
				.toEpochMilli();
			
			QueryBuilder<Order, Integer> queryBuilder = orderDao.queryBuilder();
			Where<Order, Integer> where = queryBuilder.where();
			where.ge("created_at", midnightTodayMillis);
			where.eq("order_status", "OPEN");
			where.or(2);
			if (!includeCancelled) {
				where.ne("order_status", "CANCELLED");
				where.and(2);
			}
			queryBuilder.orderBy("created_at", false);
			List<Order> orders = queryBuilder.query();
			orders.removeIf(order -> order != null && order.deleted_at != null && order.deleted_at > 0);
			return orders;
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to get today's orders: " + e.getMessage());
		}
	}

	private Order requireOrder(int orderId) throws Exception {
		Order order = getOrderById(orderId);
		if (order == null) {
			throw new IllegalArgumentException("Order not found for id: " + orderId);
		}

		return order;
	}

	private OrderItem requireOrderItemForOrder(int orderId, int orderItemId) throws Exception {
		OrderItem item = orderItemDao.queryBuilder()
			.where()
			.eq("order_item_id", orderItemId)
			.and()
			.isNull("deleted_at")
			.queryForFirst();
		if (item == null) {
			throw new IllegalArgumentException("Order item not found for id: " + orderItemId);
		}

		if (item.order_id != orderId) {
			throw new IllegalArgumentException("Order item does not belong to order: " + orderItemId);
		}

		return item;
	}

	private void validateQuantity(int quantity) {
		if (quantity <= 0) {
			throw new IllegalArgumentException("Quantity must be greater than zero");
		}
	}

	private String normalizeOrderStatus(String status) {
		String normalized = status == null ? "" : status.trim().toUpperCase(Locale.US);
		switch (normalized) {
			case "OPEN":
			case "CLOSED":
			case "CANCELLED":
				return normalized;
			default:
				throw new IllegalArgumentException("Invalid order status: " + status);
		}
	}

	private String normalizeItemStatus(String status) {
		String normalized = status == null ? "" : status.trim().toUpperCase(Locale.US);
		switch (normalized) {
			case "PENDING":
			case "SERVED":
			case "CANCELLED":
				return normalized;
			default:
				throw new IllegalArgumentException("Invalid order item status: " + status);
		}
	}

	private long countOrdersCreatedToday() throws Exception {
		long midnightTodayMillis = LocalDate.now()
			.atStartOfDay(ZoneId.systemDefault())
			.toInstant()
			.toEpochMilli();
		long midnightTomorrowMillis = LocalDate.now()
			.plusDays(1)
			.atStartOfDay(ZoneId.systemDefault())
			.toInstant()
			.toEpochMilli();

		QueryBuilder<Order, Integer> queryBuilder = orderDao.queryBuilder();
		queryBuilder.setCountOf(true);
		queryBuilder.where()
			.ge("created_at", midnightTodayMillis)
			.and()
			.lt("created_at", midnightTomorrowMillis)
			.and()
			.isNull("deleted_at");
		return orderDao.countOf(queryBuilder.prepare());
	}
}
