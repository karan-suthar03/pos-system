package solutions.triniti.backend.sync;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import solutions.triniti.backend.db.BackendSqliteDatabase;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.backend.sync.dto.FullSyncRequest;
import solutions.triniti.backend.sync.dto.FullSyncResponse;
import solutions.triniti.backend.sync.dto.IncrementalSyncRequest;
import solutions.triniti.backend.sync.dto.IncrementalSyncResponse;
import solutions.triniti.backend.sync.dto.SyncStatusResponse;

import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SyncService {

    private static final DateTimeFormatter BACKUP_SUFFIX = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final int MAX_BACKUP_FILES = 10;

    private final String dbPath;

    public SyncService(@Value("${pos.backend.db.path:backend/backend-data/pos-server.db}") String dbPath) {
        this.dbPath = dbPath;
    }

    public synchronized FullSyncResponse applyFullSync(FullSyncRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }

        Map<String, Integer> counts = new LinkedHashMap<>();
        Path currentDb = Paths.get(dbPath).toAbsolutePath();
        Path parentDir = currentDb.getParent() == null
            ? Paths.get(".").toAbsolutePath()
            : currentDb.getParent();
        String fileName = currentDb.getFileName().toString();
        String backupName = withBackupSuffix(fileName);
        Path backupDb = parentDir.resolve(backupName);
        Path newDb = parentDir.resolve(fileName + ".new");

        try {
            Files.createDirectories(parentDir);
            Files.deleteIfExists(newDb);
            createFreshDatabase(newDb, request, counts);
            rotateDatabaseFiles(currentDb, backupDb, newDb);
            pruneOldBackups(parentDir, fileName);
        } catch (Exception e) {
            try {
                Files.deleteIfExists(newDb);
            } catch (Exception ignored) {
            }
            throw new RuntimeException("Full sync failed", e);
        }

        return FullSyncResponse.ok(request.requestId, counts);
    }

    public synchronized IncrementalSyncResponse applyIncrementalSync(IncrementalSyncRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }

        Map<String, Integer> counts = new LinkedHashMap<>();
        long maxUpdatedAt = computeMaxUpdatedAt(request);

        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + dbPath)) {
            connection.setAutoCommit(false);
            try {
                upsertCategories(connection, request, counts);
                upsertDishes(connection, request, counts);
                upsertInventoryItems(connection, request, counts);
                upsertOrders(connection, request, counts);
                upsertOrderItems(connection, request, counts);
                connection.commit();
            } catch (Exception e) {
                connection.rollback();
                throw e;
            }
        } catch (Exception e) {
            throw new RuntimeException("Incremental sync failed", e);
        }

        return IncrementalSyncResponse.ok(request.requestId, counts, maxUpdatedAt);
    }

    public synchronized SyncStatusResponse getSyncStatus() {
        Path currentDb = Paths.get(dbPath).toAbsolutePath();
        Path parentDir = currentDb.getParent() == null
            ? Paths.get(".").toAbsolutePath()
            : currentDb.getParent();
        String fileName = currentDb.getFileName().toString();

        boolean databaseExists = Files.exists(currentDb);
        List<Path> backups = listBackupFiles(parentDir, fileName);
        int backupCount = backups.size();
        String latestBackupName = backupCount == 0
            ? null
            : backups.get(backupCount - 1).getFileName().toString();
        boolean backupReady = databaseExists && backupCount > 0;

        return SyncStatusResponse.ok(
            databaseExists,
            backupReady,
            backupCount,
            currentDb.toString(),
            latestBackupName
        );
    }

    private void createFreshDatabase(Path targetDbPath, FullSyncRequest request, Map<String, Integer> counts) throws Exception {
        try (BackendSqliteDatabase database = new BackendSqliteDatabase(targetDbPath.toString())) {
            CoreDatabaseBootstrap.migrate(database);
        }

        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + targetDbPath)) {
            connection.setAutoCommit(false);
            try {
                // Remove migration seed/default rows before applying source-of-truth payload.
                clearMirrorData(connection);
                insertCategories(connection, request, counts);
                insertDishes(connection, request, counts);
                insertInventoryItems(connection, request, counts);
                insertOrders(connection, request, counts);
                insertOrderItems(connection, request, counts);
                connection.commit();
            } catch (Exception e) {
                connection.rollback();
                throw e;
            }
        }
    }

    private void rotateDatabaseFiles(Path currentDb, Path backupDb, Path newDb) throws Exception {
        boolean currentMoved = false;

        try {
            if (Files.exists(currentDb)) {
                moveReplace(currentDb, backupDb);
                currentMoved = true;
            }

            moveReplace(newDb, currentDb);
        } catch (Exception e) {
            if (!Files.exists(currentDb) && currentMoved && Files.exists(backupDb)) {
                try {
                    moveReplace(backupDb, currentDb);
                } catch (Exception ignored) {
                }
            }
            throw e;
        }
    }

    private void moveReplace(Path source, Path target) throws Exception {
        try {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private String withBackupSuffix(String fileName) {
        String timestamp = LocalDateTime.now().format(BACKUP_SUFFIX);
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex <= 0) {
            return fileName + ".backup-" + timestamp;
        }

        String base = fileName.substring(0, dotIndex);
        String ext = fileName.substring(dotIndex);
        return base + ".backup-" + timestamp + ext;
    }

    private void pruneOldBackups(Path parentDir, String fileName) throws Exception {
        List<Path> backups = listBackupFiles(parentDir, fileName);
        if (backups.size() <= MAX_BACKUP_FILES) {
            return;
        }

        int deleteCount = backups.size() - MAX_BACKUP_FILES;
        for (int i = 0; i < deleteCount; i++) {
            Files.deleteIfExists(backups.get(i));
        }
    }

    private List<Path> listBackupFiles(Path parentDir, String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        String base = dotIndex <= 0 ? fileName : fileName.substring(0, dotIndex);
        String ext = dotIndex <= 0 ? "" : fileName.substring(dotIndex);
        String glob = base + ".backup-*" + ext;

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(parentDir, glob)) {
            return toSortedList(stream);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<Path> toSortedList(DirectoryStream<Path> stream) {
        return java.util.stream.StreamSupport.stream(stream.spliterator(), false)
            .sorted(Comparator.comparing(path -> path.getFileName().toString()))
            .collect(Collectors.toList());
    }

    private void clearMirrorData(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.executeUpdate("DELETE FROM order_items");
            statement.executeUpdate("DELETE FROM orders");
            statement.executeUpdate("DELETE FROM dish_ingredients");
            statement.executeUpdate("DELETE FROM inventory_movements");
            statement.executeUpdate("DELETE FROM dishes");
            statement.executeUpdate("DELETE FROM categories");
            statement.executeUpdate("DELETE FROM inventory_items");
        }
    }

    private void insertCategories(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO categories(id, name, image_path, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)";
        int inserted = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.CategoryRow row : safeList(request.categories)) {
                ps.setInt(1, row.id);
                ps.setString(2, row.name);
                ps.setString(3, row.imagePath);
                ps.setLong(4, row.createdAt);
                ps.setLong(5, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(6, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(6, row.deletedAt);
                }
                ps.addBatch();
                inserted++;
            }
            ps.executeBatch();
        }
        counts.put("categories", inserted);
    }

    private void insertDishes(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO dishes(id, name, category, category_id, price, is_available, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        int inserted = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.DishRow row : safeList(request.dishes)) {
                ps.setInt(1, row.id);
                ps.setString(2, row.name);
                ps.setString(3, row.category);
                ps.setInt(4, row.categoryId);
                ps.setInt(5, row.price);
                ps.setInt(6, row.isAvailable ? 1 : 0);
                ps.setLong(7, row.createdAt);
                ps.setLong(8, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(9, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(9, row.deletedAt);
                }
                ps.addBatch();
                inserted++;
            }
            ps.executeBatch();
        }
        counts.put("dishes", inserted);
    }

    private void insertInventoryItems(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO inventory_items(inventory_item_id, name, category, unit, on_hand, low_stock_threshold, max_stock, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        int inserted = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.InventoryItemRow row : safeList(request.inventoryItems)) {
                ps.setInt(1, row.inventoryItemId);
                ps.setString(2, row.name);
                ps.setString(3, row.category);
                ps.setString(4, row.unit);
                ps.setDouble(5, row.onHand);
                ps.setDouble(6, row.lowStockThreshold);
                ps.setDouble(7, row.maxStock);
                ps.setString(8, row.notes);
                ps.setLong(9, row.createdAt);
                ps.setLong(10, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(11, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(11, row.deletedAt);
                }
                ps.addBatch();
                inserted++;
            }
            ps.executeBatch();
        }
        counts.put("inventoryItems", inserted);
    }

    private void insertOrders(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO orders(order_id, display_id, order_tag, is_payment_done, order_total, order_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        int inserted = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.OrderRow row : safeList(request.orders)) {
                ps.setInt(1, row.orderId);
                ps.setString(2, row.displayId);
                ps.setString(3, row.orderTag);
                ps.setInt(4, row.isPaymentDone ? 1 : 0);
                ps.setInt(5, row.orderTotal);
                ps.setString(6, row.orderStatus);
                ps.setLong(7, row.createdAt);
                ps.setLong(8, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(9, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(9, row.deletedAt);
                }
                ps.addBatch();
                inserted++;
            }
            ps.executeBatch();
        }
        counts.put("orders", inserted);
    }

    private void insertOrderItems(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO order_items(order_item_id, order_id, dish_id, quantity, dish_name_snapshot, price_snapshot, item_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        int inserted = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.OrderItemRow row : safeList(request.orderItems)) {
                ps.setInt(1, row.orderItemId);
                ps.setInt(2, row.orderId);
                ps.setInt(3, row.dishId);
                ps.setInt(4, row.quantity);
                ps.setString(5, row.dishNameSnapshot);
                ps.setInt(6, row.priceSnapshot);
                ps.setString(7, row.itemStatus);
                ps.setLong(8, row.createdAt);
                ps.setLong(9, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(10, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(10, row.deletedAt);
                }
                ps.addBatch();
                inserted++;
            }
            ps.executeBatch();
        }
        counts.put("orderItems", inserted);
    }

    private void upsertCategories(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO categories(id, name, image_path, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, image_path=excluded.image_path, created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at";
        int applied = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.CategoryRow row : safeList(request.categories)) {
                ps.setInt(1, row.id);
                ps.setString(2, row.name);
                ps.setString(3, row.imagePath);
                ps.setLong(4, row.createdAt);
                ps.setLong(5, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(6, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(6, row.deletedAt);
                }
                ps.addBatch();
                applied++;
            }
            ps.executeBatch();
        }
        counts.put("categories", applied);
    }

    private void upsertDishes(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO dishes(id, name, category, category_id, price, is_available, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, category_id=excluded.category_id, price=excluded.price, is_available=excluded.is_available, created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at";
        int applied = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.DishRow row : safeList(request.dishes)) {
                ps.setInt(1, row.id);
                ps.setString(2, row.name);
                ps.setString(3, row.category);
                ps.setInt(4, row.categoryId);
                ps.setInt(5, row.price);
                ps.setInt(6, row.isAvailable ? 1 : 0);
                ps.setLong(7, row.createdAt);
                ps.setLong(8, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(9, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(9, row.deletedAt);
                }
                ps.addBatch();
                applied++;
            }
            ps.executeBatch();
        }
        counts.put("dishes", applied);
    }

    private void upsertInventoryItems(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO inventory_items(inventory_item_id, name, category, unit, on_hand, low_stock_threshold, max_stock, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(inventory_item_id) DO UPDATE SET name=excluded.name, category=excluded.category, unit=excluded.unit, on_hand=excluded.on_hand, low_stock_threshold=excluded.low_stock_threshold, max_stock=excluded.max_stock, notes=excluded.notes, created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at";
        int applied = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.InventoryItemRow row : safeList(request.inventoryItems)) {
                ps.setInt(1, row.inventoryItemId);
                ps.setString(2, row.name);
                ps.setString(3, row.category);
                ps.setString(4, row.unit);
                ps.setDouble(5, row.onHand);
                ps.setDouble(6, row.lowStockThreshold);
                ps.setDouble(7, row.maxStock);
                ps.setString(8, row.notes);
                ps.setLong(9, row.createdAt);
                ps.setLong(10, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(11, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(11, row.deletedAt);
                }
                ps.addBatch();
                applied++;
            }
            ps.executeBatch();
        }
        counts.put("inventoryItems", applied);
    }

    private void upsertOrders(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO orders(order_id, display_id, order_tag, is_payment_done, order_total, order_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(order_id) DO UPDATE SET display_id=excluded.display_id, order_tag=excluded.order_tag, is_payment_done=excluded.is_payment_done, order_total=excluded.order_total, order_status=excluded.order_status, created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at";
        int applied = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.OrderRow row : safeList(request.orders)) {
                ps.setInt(1, row.orderId);
                ps.setString(2, row.displayId);
                ps.setString(3, row.orderTag);
                ps.setInt(4, row.isPaymentDone ? 1 : 0);
                ps.setInt(5, row.orderTotal);
                ps.setString(6, row.orderStatus);
                ps.setLong(7, row.createdAt);
                ps.setLong(8, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(9, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(9, row.deletedAt);
                }
                ps.addBatch();
                applied++;
            }
            ps.executeBatch();
        }
        counts.put("orders", applied);
    }

    private void upsertOrderItems(Connection connection, FullSyncRequest request, Map<String, Integer> counts) throws SQLException {
        String sql = "INSERT INTO order_items(order_item_id, order_id, dish_id, quantity, dish_name_snapshot, price_snapshot, item_status, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(order_item_id) DO UPDATE SET order_id=excluded.order_id, dish_id=excluded.dish_id, quantity=excluded.quantity, dish_name_snapshot=excluded.dish_name_snapshot, price_snapshot=excluded.price_snapshot, item_status=excluded.item_status, created_at=excluded.created_at, updated_at=excluded.updated_at, deleted_at=excluded.deleted_at";
        int applied = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            for (FullSyncRequest.OrderItemRow row : safeList(request.orderItems)) {
                ps.setInt(1, row.orderItemId);
                ps.setInt(2, row.orderId);
                ps.setInt(3, row.dishId);
                ps.setInt(4, row.quantity);
                ps.setString(5, row.dishNameSnapshot);
                ps.setInt(6, row.priceSnapshot);
                ps.setString(7, row.itemStatus);
                ps.setLong(8, row.createdAt);
                ps.setLong(9, row.updatedAt);
                if (row.deletedAt == null) {
                    ps.setNull(10, java.sql.Types.BIGINT);
                } else {
                    ps.setLong(10, row.deletedAt);
                }
                ps.addBatch();
                applied++;
            }
            ps.executeBatch();
        }
        counts.put("orderItems", applied);
    }

    private long computeMaxUpdatedAt(FullSyncRequest request) {
        long max = 0;
        for (FullSyncRequest.CategoryRow row : safeList(request.categories)) {
            max = Math.max(max, row.updatedAt);
        }
        for (FullSyncRequest.DishRow row : safeList(request.dishes)) {
            max = Math.max(max, row.updatedAt);
        }
        for (FullSyncRequest.InventoryItemRow row : safeList(request.inventoryItems)) {
            max = Math.max(max, row.updatedAt);
        }
        for (FullSyncRequest.OrderRow row : safeList(request.orders)) {
            max = Math.max(max, row.updatedAt);
        }
        for (FullSyncRequest.OrderItemRow row : safeList(request.orderItems)) {
            max = Math.max(max, row.updatedAt);
        }
        return max;
    }

    private static <T> List<T> safeList(List<T> rows) {
        return rows == null ? Collections.emptyList() : rows;
    }
}
