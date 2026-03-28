package solutions.triniti.core.db.migration;

import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import com.j256.ormlite.dao.GenericRawResults;
import com.j256.ormlite.support.ConnectionSource;

import java.sql.SQLException;
import java.util.List;

final class SqlMigrationSupport {

    private SqlMigrationSupport() {
    }

    static void execute(ConnectionSource connectionSource, String sql) throws SQLException {
        migrationDao(connectionSource).executeRawNoArgs(sql);
    }

    static long queryForLong(ConnectionSource connectionSource, String sql) throws SQLException {
        return migrationDao(connectionSource).queryRawValue(sql);
    }

    static List<String[]> queryForRows(ConnectionSource connectionSource, String sql) throws SQLException {
        GenericRawResults<String[]> results = null;
        try {
            results = migrationDao(connectionSource).queryRaw(sql);
            return results.getResults();
        } catch (Exception e) {
            throw new SQLException("Failed to execute query: " + sql, e);
        } finally {
            if (results != null) {
                try {
                    results.close();
                } catch (Exception ignored) {
                    // Best-effort close for raw results.
                }
            }
        }
    }

    private static Dao<SchemaMigrationRecord, Integer> migrationDao(ConnectionSource connectionSource) throws SQLException {
        return DaoManager.createDao(connectionSource, SchemaMigrationRecord.class);
    }
}
