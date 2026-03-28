package solutions.triniti.core.db;

import com.j256.ormlite.support.ConnectionSource;

public interface OrmLiteConnectionProvider {

    ConnectionSource getConnectionSource();
}
