package solutions.triniti.db;

import com.j256.ormlite.jdbc.JdbcConnectionSource;
import com.j256.ormlite.support.ConnectionSource;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.storage.StorageRootProvider;

import java.io.File;

public class SqliteDatabase implements OrmLiteConnectionProvider, StorageRootProvider {

    private final ConnectionSource connectionSource;
    private final String dbPath;

    public SqliteDatabase(String path) throws Exception {
        this.dbPath = path;
        String jdbcUrl = "jdbc:sqlite:" + path;
        connectionSource = new JdbcConnectionSource(jdbcUrl);
    }

    @Override
    public ConnectionSource getConnectionSource() {
        return connectionSource;
    }

    @Override
    public String getStorageRootPath() {
        File dbFile = new File(dbPath).getAbsoluteFile();
        File parent = dbFile.getParentFile();
        if (parent == null) {
            parent = new File(".");
        }
        return new File(parent, "storage").getAbsolutePath();
    }

    @Override
    public String getStoragePublicUriTemplate() {
        return "storage://local/{path}";
    }
}