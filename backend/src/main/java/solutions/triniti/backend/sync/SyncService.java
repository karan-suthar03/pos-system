package solutions.triniti.backend.sync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import solutions.triniti.backend.db.BackendSqliteDatabase;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.backend.sync.dto.FullSyncRequest;
import solutions.triniti.backend.sync.dto.FullSyncResponse;
import solutions.triniti.backend.sync.dto.IncrementalSyncRequest;
import solutions.triniti.backend.sync.dto.IncrementalSyncResponse;
import solutions.triniti.backend.sync.dto.RestoreResponse;
import solutions.triniti.backend.sync.dto.SyncStatusResponse;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
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
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class SyncService {

    private static final DateTimeFormatter BACKUP_SUFFIX = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final int MAX_BACKUP_FILES = 10;
    private static final int MAX_ZIP_ENTRIES = 64;
    private static final int MAX_JSON_ENTRY_BYTES = 8 * 1024 * 1024;
    private static final int MAX_WARNING_COUNT = 25;
    private static final DateTimeFormatter LEGACY_BACKUP_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private final String dbPath;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Long lastRestoreAt;
    private String lastRestoreFormat;
    private String lastRestoreVersion;
    private Boolean lastRestoreSuccess;
    private String lastRestoreMessage;

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
            latestBackupName,
            lastRestoreAt,
            lastRestoreFormat,
            lastRestoreVersion,
            lastRestoreSuccess,
            lastRestoreMessage
        );
    }

    public synchronized RestoreResponse restoreFromBackupArchive(MultipartFile backupZip, boolean wipeExistingData) {
        String requestId = "restore-" + System.currentTimeMillis();
        try {
            if (backupZip == null || backupZip.isEmpty()) {
                throw new IllegalArgumentException("backupZip file is required");
            }

            ArchiveInspection inspection;
            try {
                inspection = inspectArchive(backupZip);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to inspect restore archive", e);
            }

            if ("modern".equals(inspection.detectedFormat)) {
                throw new IllegalStateException(
                    "Modern backup detected (schemaVersion=" + inspection.detectedVersion + ") but modern restore parser is not implemented yet"
                );
            }

            if (!"legacy".equals(inspection.detectedFormat)) {
                throw new IllegalStateException("Unsupported backup archive format");
            }

            requestId = "restore-legacy-" + System.currentTimeMillis();
            LegacyMappingResult mappingResult = mapLegacyBackupToFullSync(inspection.backupJson);
            mappingResult.request.requestId = requestId;

            FullSyncResponse response = applyFullSync(mappingResult.request);

            RestoreResponse restoreResponse = RestoreResponse.ok(
                requestId,
                inspection.detectedFormat,
                inspection.detectedVersion,
                wipeExistingData,
                response.appliedRows,
                mappingResult.skippedOrderItems,
                mappingResult.warnings
            );

            lastRestoreAt = restoreResponse.restoredAt;
            lastRestoreFormat = restoreResponse.detectedFormat;
            lastRestoreVersion = restoreResponse.detectedVersion;
            lastRestoreSuccess = true;
            lastRestoreMessage = restoreResponse.message;

            return restoreResponse;
        } catch (RuntimeException e) {
            lastRestoreAt = System.currentTimeMillis();
            lastRestoreFormat = null;
            lastRestoreVersion = null;
            lastRestoreSuccess = false;
            lastRestoreMessage = e.getMessage();
            throw e;
        }
    }

    private ArchiveInspection inspectArchive(MultipartFile backupZip) throws Exception {
        JsonNode manifest = null;
        JsonNode backupJson = null;
        int entryCount = 0;

        try (InputStream inputStream = backupZip.getInputStream(); ZipInputStream zipInputStream = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    zipInputStream.closeEntry();
                    continue;
                }

                entryCount++;
                if (entryCount > MAX_ZIP_ENTRIES) {
                    throw new IllegalStateException("Restore archive has too many files");
                }

                String name = entry.getName();
                if (name == null || name.contains("..") || name.startsWith("/") || name.startsWith("\\")) {
                    throw new IllegalStateException("Invalid archive entry path");
                }

                if ("backup-manifest.json".equals(name)) {
                    manifest = readJsonEntry(zipInputStream, MAX_JSON_ENTRY_BYTES);
                } else if ("backup.json".equals(name)) {
                    backupJson = readJsonEntry(zipInputStream, MAX_JSON_ENTRY_BYTES);
                }

                zipInputStream.closeEntry();
            }
        }

        if (manifest != null) {
            String formatFamily = textOrNull(manifest.get("formatFamily"));
            Integer schemaVersion = intOrNull(manifest.get("schemaVersion"));
            if ("pos-modern".equals(formatFamily) && schemaVersion != null && schemaVersion >= 1) {
                return ArchiveInspection.modern(String.valueOf(schemaVersion), backupJson);
            }
            throw new IllegalStateException("backup-manifest.json is present but invalid");
        }

        if (backupJson != null && isLegacyBackupJson(backupJson)) {
            return ArchiveInspection.legacy("legacy-v1", backupJson);
        }

        throw new IllegalStateException("Archive is not a supported backup format");
    }

    private JsonNode readJsonEntry(InputStream inputStream, int maxBytes) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = inputStream.read(buffer)) != -1) {
            total += read;
            if (total > maxBytes) {
                throw new IllegalStateException("Archive entry exceeds allowed size");
            }
            output.write(buffer, 0, read);
        }
        return objectMapper.readTree(output.toByteArray());
    }

    private boolean isLegacyBackupJson(JsonNode root) {
        return root != null
            && root.isObject()
            && root.has("dishes")
            && root.has("orders")
            && root.has("order_items");
    }

    private LegacyMappingResult mapLegacyBackupToFullSync(JsonNode backupJson) {
        if (!isLegacyBackupJson(backupJson)) {
            throw new IllegalStateException("Legacy backup.json is missing required arrays");
        }

        FullSyncRequest request = new FullSyncRequest();
        List<String> warnings = new ArrayList<>();
        long now = System.currentTimeMillis();
        long defaultTime = resolveLegacyBackupTime(backupJson, now);
        Map<String, Integer> categoryIds = new LinkedHashMap<>();

        JsonNode dishesNode = backupJson.get("dishes");
        if (dishesNode != null && dishesNode.isArray()) {
            for (JsonNode dishNode : dishesNode) {
                Integer dishId = intOrNull(dishNode.get("dish_id"));
                String dishName = textOrNull(dishNode.get("dish_name"));
                String categoryName = textOrNull(dishNode.get("category"));
                Integer price = intOrNull(dishNode.get("price"));

                if (dishId == null || dishName == null) {
                    addWarning(warnings, "Skipped dish row with missing dish_id or dish_name");
                    continue;
                }

                if (categoryName == null || categoryName.trim().isEmpty()) {
                    categoryName = "Uncategorized";
                }

                int categoryId = categoryIds.computeIfAbsent(categoryName, key -> categoryIds.size() + 1);

                FullSyncRequest.DishRow row = new FullSyncRequest.DishRow();
                row.id = dishId;
                row.name = dishName;
                row.category = categoryName;
                row.categoryId = categoryId;
                row.price = price == null ? 0 : price;
                row.isAvailable = true;
                row.createdAt = defaultTime;
                row.updatedAt = defaultTime;
                row.deletedAt = null;
                request.dishes.add(row);
            }
        }

        for (Map.Entry<String, Integer> entry : categoryIds.entrySet()) {
            FullSyncRequest.CategoryRow row = new FullSyncRequest.CategoryRow();
            row.id = entry.getValue();
            row.name = entry.getKey();
            row.imagePath = null;
            row.createdAt = defaultTime;
            row.updatedAt = defaultTime;
            row.deletedAt = null;
            request.categories.add(row);
        }

        Set<Integer> orderIds = new HashSet<>();
        Set<Integer> dishIds = request.dishes.stream().map(row -> row.id).collect(Collectors.toSet());

        JsonNode ordersNode = backupJson.get("orders");
        if (ordersNode != null && ordersNode.isArray()) {
            for (JsonNode orderNode : ordersNode) {
                Integer orderId = intOrNull(orderNode.get("order_id"));
                if (orderId == null) {
                    addWarning(warnings, "Skipped order row with missing order_id");
                    continue;
                }

                FullSyncRequest.OrderRow row = new FullSyncRequest.OrderRow();
                row.orderId = orderId;
                row.displayId = textOrNull(orderNode.get("display_id"));
                if (row.displayId == null) {
                    Integer displayIdNumeric = intOrNull(orderNode.get("display_id"));
                    row.displayId = displayIdNumeric == null ? null : String.valueOf(displayIdNumeric);
                }
                row.orderTag = textOrNull(orderNode.get("order_tag"));
                row.isPaymentDone = boolOrDefault(orderNode.get("is_payment_done"), false);
                row.orderTotal = intOrDefault(orderNode.get("order_total"), 0);
                row.orderStatus = normalizeOrderStatus(textOrNull(orderNode.get("order_status")));
                row.createdAt = parseLegacyTime(textOrNull(orderNode.get("created_at")), defaultTime);
                row.updatedAt = row.createdAt;
                row.deletedAt = null;
                request.orders.add(row);
                orderIds.add(orderId);
            }
        }

        int skippedOrderItems = 0;
        JsonNode orderItemsNode = backupJson.get("order_items");
        if (orderItemsNode != null && orderItemsNode.isArray()) {
            for (JsonNode itemNode : orderItemsNode) {
                Integer orderItemId = intOrNull(itemNode.get("order_item_id"));
                Integer orderId = intOrNull(itemNode.get("order_id"));
                Integer dishId = intOrNull(itemNode.get("dish_id"));

                if (orderItemId == null || orderId == null || dishId == null) {
                    skippedOrderItems++;
                    addWarning(warnings, "Skipped order item row with missing identifiers");
                    continue;
                }

                if (!orderIds.contains(orderId) || !dishIds.contains(dishId)) {
                    skippedOrderItems++;
                    addWarning(warnings, "Skipped order item due to missing order/dish reference");
                    continue;
                }

                FullSyncRequest.OrderItemRow row = new FullSyncRequest.OrderItemRow();
                row.orderItemId = orderItemId;
                row.orderId = orderId;
                row.dishId = dishId;
                row.quantity = intOrDefault(itemNode.get("quantity"), 1);
                row.dishNameSnapshot = textOrNull(itemNode.get("dish_name_snapshot"));
                row.priceSnapshot = intOrDefault(itemNode.get("price_snapshot"), 0);
                row.itemStatus = normalizeItemStatus(textOrNull(itemNode.get("item_status")));
                row.createdAt = defaultTime;
                row.updatedAt = defaultTime;
                row.deletedAt = null;
                request.orderItems.add(row);
            }
        }

        return new LegacyMappingResult(request, skippedOrderItems, warnings);
    }

    private long resolveLegacyBackupTime(JsonNode backupJson, long fallback) {
        String timestamp = textOrNull(backupJson.get("backup_timestamp"));
        return parseLegacyTime(timestamp, fallback);
    }

    private long parseLegacyTime(String raw, long fallback) {
        if (raw == null || raw.trim().isEmpty()) {
            return fallback;
        }

        String value = raw.trim();
        try {
            return Instant.parse(value).toEpochMilli();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(value, LEGACY_BACKUP_TIME_FORMAT)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
        } catch (DateTimeParseException ignored) {
        }

        return fallback;
    }

    private String normalizeOrderStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "OPEN";
        }
        return raw.trim().toUpperCase();
    }

    private String normalizeItemStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "PENDING";
        }
        return raw.trim().toUpperCase();
    }

    private void addWarning(List<String> warnings, String warning) {
        if (warnings.size() < MAX_WARNING_COUNT) {
            warnings.add(warning);
        }
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText();
        return value == null || value.trim().isEmpty() ? null : value;
    }

    private Integer intOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isInt() || node.isLong()) {
            return node.asInt();
        }
        try {
            return Integer.parseInt(node.asText().trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private int intOrDefault(JsonNode node, int fallback) {
        Integer value = intOrNull(node);
        return value == null ? fallback : value;
    }

    private boolean boolOrDefault(JsonNode node, boolean fallback) {
        if (node == null || node.isNull()) {
            return fallback;
        }
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        String value = node.asText();
        if (value == null) {
            return fallback;
        }
        if ("true".equalsIgnoreCase(value) || "1".equals(value)) {
            return true;
        }
        if ("false".equalsIgnoreCase(value) || "0".equals(value)) {
            return false;
        }
        return fallback;
    }

    private static class ArchiveInspection {
        private final String detectedFormat;
        private final String detectedVersion;
        private final JsonNode backupJson;

        private ArchiveInspection(String detectedFormat, String detectedVersion, JsonNode backupJson) {
            this.detectedFormat = detectedFormat;
            this.detectedVersion = detectedVersion;
            this.backupJson = backupJson;
        }

        private static ArchiveInspection modern(String version, JsonNode backupJson) {
            return new ArchiveInspection("modern", version, backupJson);
        }

        private static ArchiveInspection legacy(String version, JsonNode backupJson) {
            return new ArchiveInspection("legacy", version, backupJson);
        }
    }

    private static class LegacyMappingResult {
        private final FullSyncRequest request;
        private final int skippedOrderItems;
        private final List<String> warnings;

        private LegacyMappingResult(FullSyncRequest request, int skippedOrderItems, List<String> warnings) {
            this.request = request;
            this.skippedOrderItems = skippedOrderItems;
            this.warnings = warnings;
        }
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
