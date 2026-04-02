package solutions.triniti.admin.db;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.j256.ormlite.android.AndroidConnectionSource;
import com.j256.ormlite.support.ConnectionSource;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.db.migration.CoreDatabaseBootstrap;
import solutions.triniti.core.storage.StorageRootProvider;

public class AdminSqliteDatabase implements OrmLiteConnectionProvider, StorageRootProvider {

    private static final String DB_NAME = "admin.db";
    private static final int DB_VERSION = 1;

    private final SQLiteOpenHelper helper;
    private final ConnectionSource connectionSource;
    private final String storageRootPath;
    private final String storagePublicUriTemplate;

    public AdminSqliteDatabase(Context context) {
        this.helper = new SQLiteOpenHelper(context.getApplicationContext(), DB_NAME, null, DB_VERSION) {
            @Override
            public void onCreate(SQLiteDatabase db) {
                // Schema is managed through execute(...) calls by app/integrators.
            }

            @Override
            public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
                // No-op for now.
            }
        };

        this.connectionSource = new AndroidConnectionSource(helper.getWritableDatabase());

        File storageRoot = new File(context.getFilesDir(), "storage");
        this.storageRootPath = storageRoot.getAbsolutePath();
        this.storagePublicUriTemplate = "storage://local/{path}";

        try {
            CoreDatabaseBootstrap.migrate(this);
        } catch (Exception e) {
            throw new RuntimeException("Failed to run database migrations", e);
        }
    }

    public List<Map<String, Object>> query(String sql) throws Exception {
        SQLiteDatabase db = helper.getReadableDatabase();

        try (Cursor cursor = db.rawQuery(sql, null)) {
            List<Map<String, Object>> rows = new ArrayList<>();
            String[] columns = cursor.getColumnNames();

            while (cursor.moveToNext()) {
                Map<String, Object> row = new HashMap<>();
                for (String column : columns) {
                    row.put(column, cursor.getString(cursor.getColumnIndexOrThrow(column)));
                }
                rows.add(row);
            }

            return rows;
        }
    }

    public int execute(String sql) throws Exception {
        SQLiteDatabase db = helper.getWritableDatabase();
        String normalized = sql.trim().toUpperCase();

        if (normalized.startsWith("UPDATE") || normalized.startsWith("DELETE")) {
            return db.compileStatement(sql).executeUpdateDelete();
        }

        if (normalized.startsWith("INSERT")) {
            long id = db.compileStatement(sql).executeInsert();
            return id >= 0 ? 1 : 0;
        }

        db.execSQL(sql);
        return 0;
    }

    @Override
    public ConnectionSource getConnectionSource() {
        return connectionSource;
    }

    @Override
    public String getStorageRootPath() {
        return storageRootPath;
    }

    @Override
    public String getStoragePublicUriTemplate() {
        return storagePublicUriTemplate;
    }
}
