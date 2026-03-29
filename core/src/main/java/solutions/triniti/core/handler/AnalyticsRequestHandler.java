package solutions.triniti.core.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import solutions.triniti.core.bridge.BridgeMessage;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Dish;
import solutions.triniti.core.model.Order;
import solutions.triniti.core.model.OrderItem;
import solutions.triniti.core.repository.DishRepository;
import solutions.triniti.core.repository.OrderRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class AnalyticsRequestHandler implements RequestHandler {

    private static final String CATEGORY_OTHER = "Other";

    private final DishRepository dishRepository;
    private final OrderRepository orderRepository;

    public AnalyticsRequestHandler(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        this.dishRepository = ormLiteConnectionProvider == null ? null : new DishRepository(ormLiteConnectionProvider);
        this.orderRepository = ormLiteConnectionProvider == null ? null : new OrderRepository(ormLiteConnectionProvider);
    }

    @Override
    public boolean supports(String type) {
        return type != null && type.startsWith("analytics.");
    }

    @Override
    public BridgeResponse handle(String requestId, BridgeMessage message) throws Exception {
        String type = message == null ? null : message.getType();

        if (dishRepository == null || orderRepository == null) {
            return BridgeResponse.error(requestId, "Database is not configured");
        }

        if ("analytics.getAnalytics".equals(type)) {
            TimeWindow timeWindow = resolveTimeWindow(message);
            JsonObject data = buildAnalyticsPayload(timeWindow);
            return BridgeResponse.success(requestId, data);
        }

        if ("analytics.getDishPerformance".equals(type)) {
            TimeWindow timeWindow = resolveTimeWindow(message);
            JsonObject params = getParamsObject(message);
            String sortType = resolveDishSortType(params);
            int limit = resolveLimit(params);
            JsonArray data = buildDishPerformancePayload(timeWindow, sortType, limit);
            return BridgeResponse.success(requestId, data);
        }

        if ("analytics.getCategoryPerformance".equals(type)) {
            TimeWindow timeWindow = resolveTimeWindow(message);
            JsonArray data = buildCategoryPerformancePayload(timeWindow);
            return BridgeResponse.success(requestId, data);
        }

        return BridgeResponse.error(requestId, "Unknown Analytics request: " + type);
    }

    private JsonObject getParamsObject(BridgeMessage message) {
        if (message == null || !message.getParamsOrJsonNull().isJsonObject()) {
            return new JsonObject();
        }
        return message.getParamsOrJsonNull().getAsJsonObject();
    }

    private TimeWindow resolveTimeWindow(BridgeMessage message) {
        JsonObject params = message != null && message.getParamsOrJsonNull().isJsonObject()
            ? message.getParamsOrJsonNull().getAsJsonObject()
            : new JsonObject();

        JsonElement rangeElement = params.get("range");
        if (rangeElement == null || rangeElement.isJsonNull()) {
            JsonElement start = params.get("start");
            JsonElement end = params.get("end");
            if (start != null && end != null) {
                return parseCustomRange(start, end);
            }
            throw new IllegalArgumentException("Missing range parameter");
        }

        if (rangeElement.isJsonObject()) {
            JsonObject customRange = rangeElement.getAsJsonObject();
            return parseCustomRange(customRange.get("start"), customRange.get("end"));
        }

        if (!rangeElement.isJsonPrimitive() || !rangeElement.getAsJsonPrimitive().isString()) {
            throw new IllegalArgumentException("Invalid range parameter");
        }

        return parseNamedRange(rangeElement.getAsString());
    }

    private TimeWindow parseNamedRange(String range) {
        if (range == null || range.trim().isEmpty()) {
            throw new IllegalArgumentException("Range value cannot be empty");
        }

        String normalizedRange = range.trim();
        LocalDate today = LocalDate.now();
        long now = System.currentTimeMillis();

        switch (normalizedRange) {
            case "Today": {
                long startTime = toStartOfDayMillis(today);
                return new TimeWindow(startTime, now, today, today);
            }
            case "Yesterday": {
                LocalDate yesterday = today.minusDays(1);
                long startTime = toStartOfDayMillis(yesterday);
                long endTime = toStartOfDayMillis(today) - 1;
                return new TimeWindow(startTime, endTime, yesterday, yesterday);
            }
            case "Last 7 Days":
            case "last7Days": {
                LocalDate startDate = today.minusDays(6);
                long startTime = toStartOfDayMillis(startDate);
                return new TimeWindow(startTime, now, startDate, today);
            }
            case "Last 30 Days":
            case "last30Days": {
                LocalDate startDate = today.minusDays(29);
                long startTime = toStartOfDayMillis(startDate);
                return new TimeWindow(startTime, now, startDate, today);
            }
            case "last24Hours": {
                long startTime = now - (24L * 60L * 60L * 1000L);
                LocalDate startDate = Instant.ofEpochMilli(startTime)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate();
                LocalDate endDate = Instant.ofEpochMilli(now)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate();
                return new TimeWindow(startTime, now, startDate, endDate);
            }
            default:
                throw new IllegalArgumentException("Invalid range: " + range);
        }
    }

    private TimeWindow parseCustomRange(JsonElement startElement, JsonElement endElement) {
        if (startElement == null || startElement.isJsonNull() || endElement == null || endElement.isJsonNull()) {
            throw new IllegalArgumentException("Custom range requires start and end values");
        }

        if (!startElement.isJsonPrimitive() || !endElement.isJsonPrimitive()) {
            throw new IllegalArgumentException("Custom range start and end must be date strings");
        }

        String startRaw = startElement.getAsString();
        String endRaw = endElement.getAsString();

        if (startRaw == null || startRaw.trim().isEmpty() || endRaw == null || endRaw.trim().isEmpty()) {
            throw new IllegalArgumentException("Custom range requires start and end values");
        }

        LocalDate startDate = parseLocalDate(startRaw.trim(), "start");
        LocalDate endDate = parseLocalDate(endRaw.trim(), "end");
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("Custom range end date must be on or after start date");
        }

        long startTime = toStartOfDayMillis(startDate);
        long endTimeExclusive = toStartOfDayMillis(endDate.plusDays(1));
        return new TimeWindow(startTime, endTimeExclusive - 1, startDate, endDate);
    }

    private String resolveDishSortType(JsonObject params) {
        JsonElement sortTypeElement = params.get("type");
        if (sortTypeElement == null || sortTypeElement.isJsonNull()) {
            return "revenue";
        }

        if (!sortTypeElement.isJsonPrimitive() || !sortTypeElement.getAsJsonPrimitive().isString()) {
            throw new IllegalArgumentException("Invalid type parameter. Expected 'revenue' or 'quantity'");
        }

        String sortType = sortTypeElement.getAsString().trim().toLowerCase(Locale.ROOT);
        if (!"revenue".equals(sortType) && !"quantity".equals(sortType)) {
            throw new IllegalArgumentException("Invalid type parameter: " + sortType + ". Expected 'revenue' or 'quantity'");
        }
        return sortType;
    }

    private int resolveLimit(JsonObject params) {
        JsonElement limitElement = params.get("limit");
        if (limitElement == null || limitElement.isJsonNull()) {
            return 5;
        }

        int limit;
        try {
            limit = limitElement.getAsInt();
        } catch (Exception ignored) {
            throw new IllegalArgumentException("Invalid limit parameter");
        }

        if (limit <= 0) {
            return 1;
        }

        return Math.min(limit, 200);
    }

    private JsonArray buildDishPerformancePayload(TimeWindow timeWindow, String sortType, int limit) throws Exception {
        Map<Integer, DishPerformanceAggregate> aggregateByDish = buildDishPerformanceAggregates(timeWindow);
        List<DishPerformanceAggregate> rows = new ArrayList<>();
        for (DishPerformanceAggregate aggregate : aggregateByDish.values()) {
            if (aggregate.sales <= 0 && aggregate.revenue <= 0) {
                continue;
            }
            rows.add(aggregate);
        }

        rows.sort((left, right) -> {
            if ("quantity".equals(sortType)) {
                int quantityCompare = Long.compare(right.sales, left.sales);
                if (quantityCompare != 0) {
                    return quantityCompare;
                }
                return left.name.compareToIgnoreCase(right.name);
            }

            int revenueCompare = Long.compare(right.revenue, left.revenue);
            if (revenueCompare != 0) {
                return revenueCompare;
            }
            return left.name.compareToIgnoreCase(right.name);
        });

        JsonArray dishData = new JsonArray();
        int maxRows = Math.min(limit, rows.size());
        for (int index = 0; index < maxRows; index++) {
            DishPerformanceAggregate aggregate = rows.get(index);
            JsonObject row = new JsonObject();
            row.addProperty("id", aggregate.id);
            row.addProperty("name", aggregate.name);
            row.addProperty("category", aggregate.category);
            row.addProperty("sales", aggregate.sales);
            row.addProperty("revenue", aggregate.revenue);
            dishData.add(row);
        }

        return dishData;
    }

    private JsonArray buildCategoryPerformancePayload(TimeWindow timeWindow) throws Exception {
        Map<Integer, DishPerformanceAggregate> aggregateByDish = buildDishPerformanceAggregates(timeWindow);
        Map<String, CategoryAggregate> categories = new HashMap<>();
        for (DishPerformanceAggregate aggregate : aggregateByDish.values()) {
            if (aggregate.sales <= 0 && aggregate.revenue <= 0) {
                continue;
            }

            String categoryName = normalizeCategory(aggregate.category);
            CategoryAggregate category = categories.computeIfAbsent(categoryName, CategoryAggregate::new);
            category.quantity += aggregate.sales;
            category.sales += aggregate.revenue;
        }

        return buildCategoryPerformanceData(categories);
    }

    private Map<Integer, DishPerformanceAggregate> buildDishPerformanceAggregates(TimeWindow timeWindow) throws Exception {
        Map<Integer, DishPerformanceAggregate> aggregateByDish = new HashMap<>();

        List<Dish> dishes = dishRepository.listAll();
        for (Dish dish : dishes) {
            if (dish == null) {
                continue;
            }

            DishPerformanceAggregate aggregate = new DishPerformanceAggregate(
                dish.dish_id,
                dish.dish_name == null || dish.dish_name.trim().isEmpty() ? "Dish #" + dish.dish_id : dish.dish_name,
                normalizeCategory(dish.category)
            );
            aggregateByDish.put(dish.dish_id, aggregate);
        }

        List<Order> allOrders = orderRepository.listAll();
        for (Order order : allOrders) {
            if (order == null) {
                continue;
            }

            if (order.created_at < timeWindow.startTimeMillis || order.created_at > timeWindow.endTimeMillis) {
                continue;
            }

            if ("CANCELLED".equalsIgnoreCase(order.order_status)) {
                continue;
            }

            List<OrderItem> items = orderRepository.listItemsByOrderId(order.order_id);
            for (OrderItem item : items) {
                if (item == null) {
                    continue;
                }

                int dishId = item.dish_id;
                int quantity = Math.max(0, item.quantity);
                long revenue = (long) Math.max(0, item.price_snapshot) * quantity;

                DishPerformanceAggregate aggregate = aggregateByDish.get(dishId);
                if (aggregate == null) {
                    String name = item.dish_name_snapshot == null || item.dish_name_snapshot.trim().isEmpty()
                        ? "Dish #" + dishId
                        : item.dish_name_snapshot;
                    aggregate = new DishPerformanceAggregate(dishId, name, CATEGORY_OTHER);
                    aggregateByDish.put(dishId, aggregate);
                }

                aggregate.sales += quantity;
                aggregate.revenue += revenue;
            }
        }

        return aggregateByDish;
    }

    private JsonObject buildAnalyticsPayload(TimeWindow timeWindow) throws Exception {
        Map<Integer, String> dishCategoriesById = new HashMap<>();
        List<Dish> dishes = dishRepository.listAll();
        for (Dish dish : dishes) {
            if (dish == null) {
                continue;
            }
            dishCategoriesById.put(dish.dish_id, normalizeCategory(dish.category));
        }

        Map<LocalDate, DailySalesAggregate> salesByDate = new HashMap<>();
        Map<String, CategoryAggregate> categoryAggregates = new HashMap<>();
        int[] hourlyOrders = new int[24];

        long totalRevenue = 0;
        long totalItems = 0;
        int totalOrders = 0;
        int oneItemOrders = 0;
        int twoItemOrders = 0;
        int threeItemOrders = 0;
        int fourPlusItemOrders = 0;

        List<Order> allOrders = orderRepository.listAll();
        for (Order order : allOrders) {
            if (order == null) {
                continue;
            }

            if (order.created_at < timeWindow.startTimeMillis || order.created_at > timeWindow.endTimeMillis) {
                continue;
            }

            if ("CANCELLED".equalsIgnoreCase(order.order_status)) {
                continue;
            }

            totalOrders += 1;
            long safeOrderTotal = Math.max(0, (long) order.order_total);
            totalRevenue += safeOrderTotal;

            Instant createdAtInstant = Instant.ofEpochMilli(order.created_at);
            LocalDate orderDate = createdAtInstant.atZone(ZoneId.systemDefault()).toLocalDate();
            int orderHour = createdAtInstant.atZone(ZoneId.systemDefault()).getHour();
            if (orderHour >= 0 && orderHour < hourlyOrders.length) {
                hourlyOrders[orderHour] += 1;
            }

            DailySalesAggregate dayAggregate = salesByDate.computeIfAbsent(orderDate, ignored -> new DailySalesAggregate());
            dayAggregate.orders += 1;
            dayAggregate.sales += safeOrderTotal;

            List<OrderItem> orderItems = orderRepository.listItemsByOrderId(order.order_id);
            int itemCountForOrder = 0;
            for (OrderItem orderItem : orderItems) {
                if (orderItem == null) {
                    continue;
                }

                int quantity = Math.max(0, orderItem.quantity);
                itemCountForOrder += quantity;

                String category = dishCategoriesById.get(orderItem.dish_id);
                if (category == null || category.trim().isEmpty()) {
                    category = CATEGORY_OTHER;
                }

                CategoryAggregate categoryAggregate = categoryAggregates.computeIfAbsent(
                    category,
                    CategoryAggregate::new
                );
                categoryAggregate.quantity += quantity;
                categoryAggregate.sales += (long) Math.max(0, orderItem.price_snapshot) * quantity;
            }

            totalItems += itemCountForOrder;
            if (itemCountForOrder <= 1) {
                oneItemOrders += 1;
            } else if (itemCountForOrder == 2) {
                twoItemOrders += 1;
            } else if (itemCountForOrder == 3) {
                threeItemOrders += 1;
            } else {
                fourPlusItemOrders += 1;
            }
        }

        int daySpan = (int) (ChronoUnit.DAYS.between(timeWindow.startDate, timeWindow.endDate) + 1);
        if (daySpan < 1) {
            daySpan = 1;
        }

        long avgOrderValue = totalOrders == 0 ? 0 : Math.round((double) totalRevenue / totalOrders);
        double avgOrdersPerDay = totalOrders == 0 ? 0.0 : roundTo((double) totalOrders / daySpan, 2);
        double avgItemsPerOrder = totalOrders == 0 ? 0.0 : roundTo((double) totalItems / totalOrders, 1);

        JsonObject data = new JsonObject();
        data.addProperty("totalRevenue", totalRevenue);
        data.addProperty("totalOrders", totalOrders);
        data.addProperty("avgOrderValue", avgOrderValue);
        data.addProperty("avgOrdersPerDay", avgOrdersPerDay);
        data.addProperty("avgNumberOfItemsPerOrder", avgItemsPerOrder);
        data.add("salesTrendData", buildSalesTrendData(salesByDate, timeWindow.startDate, timeWindow.endDate));
        data.add("hourlyRushData", buildHourlyRushData(hourlyOrders));
        data.add("categoryPerformanceData", buildCategoryPerformanceData(categoryAggregates));
        data.add("orderSizeData", buildOrderSizeData(oneItemOrders, twoItemOrders, threeItemOrders, fourPlusItemOrders));
        return data;
    }

    private JsonArray buildSalesTrendData(
        Map<LocalDate, DailySalesAggregate> salesByDate,
        LocalDate startDate,
        LocalDate endDate
    ) {
        JsonArray trend = new JsonArray();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            DailySalesAggregate aggregate = salesByDate.get(cursor);
            JsonObject row = new JsonObject();
            row.addProperty("date", cursor.toString());
            row.addProperty("orders", aggregate == null ? 0 : aggregate.orders);
            row.addProperty("sales", aggregate == null ? 0 : aggregate.sales);
            trend.add(row);
            cursor = cursor.plusDays(1);
        }
        return trend;
    }

    private JsonArray buildHourlyRushData(int[] hourlyOrders) {
        JsonArray hourlyData = new JsonArray();
        for (int hour = 0; hour < hourlyOrders.length; hour++) {
            JsonObject row = new JsonObject();
            row.addProperty("time", String.format(Locale.US, "%02d:00", hour));
            row.addProperty("orders", hourlyOrders[hour]);
            hourlyData.add(row);
        }
        return hourlyData;
    }

    private JsonArray buildCategoryPerformanceData(Map<String, CategoryAggregate> categoryAggregates) {
        List<CategoryAggregate> categories = new ArrayList<>(categoryAggregates.values());
        categories.sort((left, right) -> {
            int salesCompare = Long.compare(right.sales, left.sales);
            if (salesCompare != 0) {
                return salesCompare;
            }
            return left.name.compareToIgnoreCase(right.name);
        });

        JsonArray categoryData = new JsonArray();
        for (CategoryAggregate aggregate : categories) {
            if (aggregate.quantity <= 0 && aggregate.sales <= 0) {
                continue;
            }
            JsonObject row = new JsonObject();
            row.addProperty("name", aggregate.name);
            row.addProperty("sales", aggregate.sales);
            row.addProperty("quantity", aggregate.quantity);
            categoryData.add(row);
        }
        return categoryData;
    }

    private JsonArray buildOrderSizeData(
        int oneItemOrders,
        int twoItemOrders,
        int threeItemOrders,
        int fourPlusItemOrders
    ) {
        JsonArray orderSizeData = new JsonArray();
        orderSizeData.add(createOrderSizeRow("1 item", oneItemOrders));
        orderSizeData.add(createOrderSizeRow("2 items", twoItemOrders));
        orderSizeData.add(createOrderSizeRow("3 items", threeItemOrders));
        orderSizeData.add(createOrderSizeRow("4+ items", fourPlusItemOrders));
        return orderSizeData;
    }

    private JsonObject createOrderSizeRow(String label, int count) {
        JsonObject row = new JsonObject();
        row.addProperty("size", label);
        row.addProperty("count", count);
        return row;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return CATEGORY_OTHER;
        }
        return category.trim();
    }

    private LocalDate parseLocalDate(String value, String fieldName) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(
                "Invalid " + fieldName + " date: " + value + ". Expected format: yyyy-MM-dd"
            );
        }
    }

    private long toStartOfDayMillis(LocalDate date) {
        return date
            .atStartOfDay(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli();
    }

    private double roundTo(double value, int precision) {
        if (precision < 0) {
            return value;
        }
        double factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
    }

    private static final class TimeWindow {
        private final long startTimeMillis;
        private final long endTimeMillis;
        private final LocalDate startDate;
        private final LocalDate endDate;

        private TimeWindow(long startTimeMillis, long endTimeMillis, LocalDate startDate, LocalDate endDate) {
            this.startTimeMillis = startTimeMillis;
            this.endTimeMillis = endTimeMillis;
            this.startDate = startDate;
            this.endDate = endDate;
        }
    }

    private static final class DailySalesAggregate {
        private int orders;
        private long sales;
    }

    private static final class CategoryAggregate {
        private final String name;
        private long sales;
        private long quantity;

        private CategoryAggregate(String name) {
            this.name = name;
        }
    }

    private static final class DishPerformanceAggregate {
        private final int id;
        private final String name;
        private final String category;
        private long sales;
        private long revenue;

        private DishPerformanceAggregate(int id, String name, String category) {
            this.id = id;
            this.name = name;
            this.category = category;
        }
    }
}
