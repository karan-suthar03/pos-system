package solutions.triniti.core.db.migration;

import solutions.triniti.core.db.Database;

public final class CoreDatabaseBootstrap {

    private CoreDatabaseBootstrap() {
    }

    public static void migrate(Database database) throws Exception {
        MigrationRunner.migrate(database, CoreMigrations.all());
    }
}
