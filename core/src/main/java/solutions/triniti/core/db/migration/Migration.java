package solutions.triniti.core.db.migration;

import solutions.triniti.core.db.Database;

public interface Migration {

    int version();

    String name();

    void apply(Database database) throws Exception;
}
