package solutions.triniti.counter.db;

import android.content.ContentValues;
import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import solutions.triniti.counter.BuildConfig;
import solutions.triniti.core.db.Database;

public class ProviderDatabase implements Database {

    private static final String ADMIN_AUTHORITY = BuildConfig.ADMIN_PROVIDER_AUTHORITY;
    private static final String KEY_SQL = "sql";
    private static final Uri QUERY_URI = Uri.parse("content://" + ADMIN_AUTHORITY + "/query");
    private static final Uri EXECUTE_URI = Uri.parse("content://" + ADMIN_AUTHORITY + "/execute");

    private final ContentResolver contentResolver;
    private final Context appContext;

    public ProviderDatabase(Context context) {
        this.appContext = context.getApplicationContext();
        this.contentResolver = appContext.getContentResolver();
    }

    @Override
    public List<Map<String, Object>> query(String sql) throws Exception {
        ensureProviderAvailable();
        try (Cursor cursor = contentResolver.query(QUERY_URI, null, sql, null, null)) {
            if (cursor == null) {
                throw new IllegalStateException("Provider query returned null cursor");
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            String[] columns = cursor.getColumnNames();

            while (cursor.moveToNext()) {
                Map<String, Object> row = new HashMap<>();
                for (String column : columns) {
                    int index = cursor.getColumnIndex(column);
                    if (index >= 0) {
                        row.put(column, cursor.getString(index));
                    }
                }
                rows.add(row);
            }

            return rows;
        } catch (Exception e) {
            throw new Exception("Provider query failed: " + e.getMessage(), e);
        }
    }

    @Override
    public int execute(String sql) throws Exception {
        ensureProviderAvailable();
        try {
            ContentValues values = new ContentValues();
            values.put(KEY_SQL, sql);
            return contentResolver.update(EXECUTE_URI, values, null, null);
        } catch (Exception e) {
            throw new Exception("Provider execute failed: " + e.getMessage(), e);
        }
    }

    private void ensureProviderAvailable() {
        if (appContext.getPackageManager().resolveContentProvider(ADMIN_AUTHORITY, 0) == null) {
            throw new IllegalStateException(
                    "Admin provider not found for authority '" + ADMIN_AUTHORITY + "'. Install/run admin_android app first."
            );
        }
    }
}
