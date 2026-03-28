package solutions.triniti.core.db.migration;

import com.j256.ormlite.support.ConnectionSource;

public interface Migration {

    int version();

    String name();

    void apply(ConnectionSource connectionSource) throws Exception;
}
