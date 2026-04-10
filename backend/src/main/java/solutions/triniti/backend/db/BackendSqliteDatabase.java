package solutions.triniti.backend.db;

import com.j256.ormlite.jdbc.JdbcConnectionSource;
import com.j256.ormlite.support.ConnectionSource;
import solutions.triniti.core.db.OrmLiteConnectionProvider;

public class BackendSqliteDatabase implements OrmLiteConnectionProvider, AutoCloseable {

    private final ConnectionSource connectionSource;

    public BackendSqliteDatabase(String path) throws Exception {
        this.connectionSource = new JdbcConnectionSource("jdbc:sqlite:" + path);
    }

    @Override
    public ConnectionSource getConnectionSource() {
        return connectionSource;
    }

    @Override
    public void close() throws Exception {
        connectionSource.close();
    }
}
