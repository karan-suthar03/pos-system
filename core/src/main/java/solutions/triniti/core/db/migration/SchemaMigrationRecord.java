package solutions.triniti.core.db.migration;

import com.j256.ormlite.field.DatabaseField;
import com.j256.ormlite.table.DatabaseTable;

@DatabaseTable(tableName = "schema_migrations")
class SchemaMigrationRecord {

    @DatabaseField(columnName = "version", id = true)
    int version;

    @DatabaseField(columnName = "name")
    String name;

    @DatabaseField(columnName = "applied_at")
    String appliedAt;
}
