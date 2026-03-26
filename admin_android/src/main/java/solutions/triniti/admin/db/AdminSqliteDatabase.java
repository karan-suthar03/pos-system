package solutions.triniti.admin.db;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import solutions.triniti.core.db.Database;

public class AdminSqliteDatabase implements Database {

    private static final String DB_NAME = "admin.db";
    private static final int DB_VERSION = 1;

    private final SQLiteOpenHelper helper;

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
    }

    @Override
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

    @Override
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
}
