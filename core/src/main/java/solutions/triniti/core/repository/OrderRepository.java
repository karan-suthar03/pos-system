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
		return orderDao.queryBuilder()
			.orderBy("order_id", false)
			.query();
	}

	public List<OrderItem> listItemsByOrderId(long orderId) throws Exception {
		QueryBuilder<OrderItem, Integer> queryBuilder = orderItemDao.queryBuilder();
		queryBuilder.where().eq("order_id", orderId);
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
		return orderDao.queryForId(order.order_id);
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

	public void updateOrderTotal(int orderId) {
		try {
			int computedTotal = 0;
			List<OrderItem> items = listItemsByOrderId(orderId);
			for (OrderItem item : items) {
				computedTotal += item.price_snapshot * item.quantity;
			}

			Order order = orderDao.queryForId(orderId);
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
			return orderDao.queryForId(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to get order by ID: " + e.getMessage());
		}
	}

	public Order completeOrder(int orderId) {
		try {
			Order order = requireOrder(orderId);
			order.order_status = "CLOSED";
			orderDao.update(order);
			return orderDao.queryForId(orderId);
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
			return orderDao.queryForId(orderId);
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
			return orderDao.queryForId(orderId);
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
			return orderDao.queryForId(orderId);
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to toggle payment status: " + e.getMessage());
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
			if (!includeCancelled) {
				where.and().ne("order_status", "CANCELLED");
			}
			queryBuilder.orderBy("created_at", false);
			return queryBuilder.query();
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Failed to get today's orders: " + e.getMessage());
		}
	}

	private Order requireOrder(int orderId) throws Exception {
		Order order = orderDao.queryForId(orderId);
		if (order == null) {
			throw new IllegalArgumentException("Order not found for id: " + orderId);
		}

		return order;
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
			.lt("created_at", midnightTomorrowMillis);
		return orderDao.countOf(queryBuilder.prepare());
	}
}
