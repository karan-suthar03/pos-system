package solutions.triniti.core.db.migration;

import solutions.triniti.core.db.Database;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class MigrationRunner {

    private MigrationRunner() {
    }

    public static void migrate(Database database, List<Migration> migrations) throws Exception {
        if (database == null) {
            throw new IllegalArgumentException("Database cannot be null");
        }

        if (migrations == null || migrations.isEmpty()) {
            return;
        }

        ensureMigrationTable(database);

        Set<Integer> applied = getAppliedVersions(database);
        List<Migration> orderedMigrations = new ArrayList<>(migrations);
        orderedMigrations.sort(Comparator.comparingInt(Migration::version));
        validateUniqueVersions(orderedMigrations);

        for (Migration migration : orderedMigrations) {
            if (applied.contains(migration.version())) {
                continue;
            }

            applySingleMigration(database, migration);
        }
    }

    private static void ensureMigrationTable(Database database) throws Exception {
        database.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (" +
            "version INTEGER PRIMARY KEY, " +
            "name TEXT NOT NULL, " +
            "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" +
            ")"
        );
    }

    private static Set<Integer> getAppliedVersions(Database database) throws Exception {
        List<Map<String, Object>> rows = database.query(
            "SELECT version FROM schema_migrations ORDER BY version ASC"
        );

        if (rows == null || rows.isEmpty()) {
            return Collections.emptySet();
        }

        Set<Integer> versions = new HashSet<>();
        for (Map<String, Object> row : rows) {
            versions.add(toInt(row.get("version")));
        }

        return versions;
    }

    private static void applySingleMigration(Database database, Migration migration) throws Exception {
        try {
            database.execute("BEGIN");
            migration.apply(database);
            database.execute(
                "INSERT INTO schema_migrations(version, name) VALUES (" +
                migration.version() + ", '" + escapeSql(migration.name()) + "')"
            );
            database.execute("COMMIT");
        } catch (Exception migrationError) {
            try {
                database.execute("ROLLBACK");
            } catch (Exception rollbackError) {
                migrationError.addSuppressed(rollbackError);
            }

            throw new Exception(
                "Migration failed at version " + migration.version() + " (" + migration.name() + ")",
                migrationError
            );
        }
    }

    private static void validateUniqueVersions(List<Migration> migrations) {
        Set<Integer> seen = new HashSet<>();
        for (Migration migration : migrations) {
            if (!seen.add(migration.version())) {
                throw new IllegalArgumentException("Duplicate migration version: " + migration.version());
            }
        }
    }

    private static int toInt(Object value) {
        if (value == null) {
            return 0;
        }

        if (value instanceof Number) {
            return ((Number) value).intValue();
        }

        return Integer.parseInt(String.valueOf(value));
    }

    private static String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }
}
