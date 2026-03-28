package solutions.triniti.core.db.migration;

import com.j256.ormlite.support.ConnectionSource;
import solutions.triniti.core.db.OrmLiteConnectionProvider;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

public final class MigrationRunner {

    private MigrationRunner() {
    }

    public static void migrate(OrmLiteConnectionProvider provider, List<Migration> migrations) throws Exception {
        if (provider == null) {
            throw new IllegalArgumentException("Connection provider cannot be null");
        }

        ConnectionSource connectionSource = provider.getConnectionSource();
        if (connectionSource == null) {
            throw new IllegalArgumentException("Connection source cannot be null");
        }

        if (migrations == null || migrations.isEmpty()) {
            return;
        }

        ensureMigrationTable(connectionSource);

        Set<Integer> applied = getAppliedVersions(connectionSource);
        List<Migration> orderedMigrations = new ArrayList<>(migrations);
        orderedMigrations.sort(Comparator.comparingInt(Migration::version));
        validateUniqueVersions(orderedMigrations);

        for (Migration migration : orderedMigrations) {
            if (applied.contains(migration.version())) {
                continue;
            }

            applySingleMigration(connectionSource, migration);
        }
    }

    private static void ensureMigrationTable(ConnectionSource connectionSource) throws Exception {
        SqlMigrationSupport.execute(
            connectionSource,
            "CREATE TABLE IF NOT EXISTS schema_migrations (" +
            "version INTEGER PRIMARY KEY, " +
            "name TEXT NOT NULL, " +
            "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" +
            ")"
        );
    }

    private static Set<Integer> getAppliedVersions(ConnectionSource connectionSource) throws Exception {
        List<String[]> rows = SqlMigrationSupport.queryForRows(
            connectionSource,
            "SELECT version FROM schema_migrations ORDER BY version ASC"
        );

        if (rows.isEmpty()) {
            return Collections.emptySet();
        }

        Set<Integer> versions = new HashSet<>();
        for (String[] row : rows) {
            if (row.length > 0) {
                versions.add(toInt(row[0]));
            }
        }

        return versions;
    }

    private static void applySingleMigration(ConnectionSource connectionSource, Migration migration) throws Exception {
        try {
            SqlMigrationSupport.execute(connectionSource, "BEGIN");
            migration.apply(connectionSource);
            SqlMigrationSupport.execute(
                connectionSource,
                "INSERT INTO schema_migrations(version, name) VALUES (" +
                migration.version() + ", '" + escapeSql(migration.name()) + "')"
            );
            SqlMigrationSupport.execute(connectionSource, "COMMIT");
        } catch (Exception migrationError) {
            try {
                SqlMigrationSupport.execute(connectionSource, "ROLLBACK");
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
