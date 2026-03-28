package solutions.triniti.core.db.migration;

import solutions.triniti.core.db.OrmLiteConnectionProvider;

public final class CoreDatabaseBootstrap {

    private CoreDatabaseBootstrap() {
    }

    public static void migrate(OrmLiteConnectionProvider provider) throws Exception {
        MigrationRunner.migrate(provider, CoreMigrations.all());
    }
}
