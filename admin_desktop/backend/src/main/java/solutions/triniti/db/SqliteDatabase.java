package solutions.triniti.db;

import com.j256.ormlite.jdbc.JdbcConnectionSource;
import com.j256.ormlite.support.ConnectionSource;
import solutions.triniti.core.db.OrmLiteConnectionProvider;

public class SqliteDatabase implements OrmLiteConnectionProvider {

    private final ConnectionSource connectionSource;

    public SqliteDatabase(String path) throws Exception {
        String jdbcUrl = "jdbc:sqlite:" + path;
        connectionSource = new JdbcConnectionSource(jdbcUrl);
    }

    @Override
    public ConnectionSource getConnectionSource() {
        return connectionSource;
    }
}