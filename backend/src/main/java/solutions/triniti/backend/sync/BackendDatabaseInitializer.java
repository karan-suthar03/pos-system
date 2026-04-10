package solutions.triniti.backend.sync;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import solutions.triniti.backend.db.BackendSqliteDatabase;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;

@Component
public class BackendDatabaseInitializer {

    private final String dbPath;

    public BackendDatabaseInitializer(@Value("${pos.backend.db.path:backend/backend-data/pos-server.db}") String dbPath) {
        this.dbPath = dbPath;
    }

    @PostConstruct
    public void initialize() throws Exception {
        try (BackendSqliteDatabase database = new BackendSqliteDatabase(dbPath)) {
            CoreDatabaseBootstrap.migrate(database);
        }
    }
}
