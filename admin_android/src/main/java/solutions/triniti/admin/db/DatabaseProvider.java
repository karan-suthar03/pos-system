package solutions.triniti.admin.db;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import solutions.triniti.core.db.Database;

public class DatabaseProvider extends ContentProvider {

    public static final String PATH_QUERY = "query";
    public static final String PATH_EXECUTE = "execute";
    public static final String KEY_SQL = "sql";

    private static final int CODE_QUERY = 1;
    private static final int CODE_EXECUTE = 2;

    private UriMatcher uriMatcher;
    private Database database;

    @Override
    public boolean onCreate() {
        if (getContext() == null) {
            return false;
        }

        database = AdminDatabase.get(getContext());

        String authority = getContext().getPackageName() + ".provider";
        uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);
        uriMatcher.addURI(authority, PATH_QUERY, CODE_QUERY);
        uriMatcher.addURI(authority, PATH_EXECUTE, CODE_EXECUTE);

        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        if (uriMatcher.match(uri) != CODE_QUERY) {
            throw new IllegalArgumentException("Unsupported URI for query: " + uri);
        }

        String sql = getSql(uri, selection, null);

        try {
            List<Map<String, Object>> rows = database.query(sql);
            return toCursor(rows);
        } catch (Exception e) {
            throw new RuntimeException("Query failed", e);
        }
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        if (uriMatcher.match(uri) != CODE_EXECUTE) {
            throw new IllegalArgumentException("Unsupported URI for insert: " + uri);
        }

        String sql = getSql(uri, null, values);

        try {
            int affected = database.execute(sql);
            return Uri.withAppendedPath(uri, String.valueOf(affected));
        } catch (Exception e) {
            throw new RuntimeException("Execute failed", e);
        }
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection,
                      String[] selectionArgs) {
        if (uriMatcher.match(uri) != CODE_EXECUTE) {
            throw new IllegalArgumentException("Unsupported URI for update: " + uri);
        }

        String sql = getSql(uri, selection, values);

        try {
            return database.execute(sql);
        } catch (Exception e) {
            throw new RuntimeException("Execute failed", e);
        }
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        if (uriMatcher.match(uri) != CODE_EXECUTE) {
            throw new IllegalArgumentException("Unsupported URI for delete: " + uri);
        }

        String sql = getSql(uri, selection, null);

        try {
            return database.execute(sql);
        } catch (Exception e) {
            throw new RuntimeException("Execute failed", e);
        }
    }

    @Override
    public String getType(Uri uri) {
        int code = uriMatcher.match(uri);
        if (code == CODE_QUERY) {
            return "vnd.android.cursor.dir/vnd." + getContext().getPackageName() + ".query";
        }
        if (code == CODE_EXECUTE) {
            return "vnd.android.cursor.item/vnd." + getContext().getPackageName() + ".execute";
        }
        throw new IllegalArgumentException("Unsupported URI: " + uri);
    }

    private String getSql(Uri uri, String selection, ContentValues values) {
        String sqlFromUri = uri.getQueryParameter(KEY_SQL);
        if (sqlFromUri != null && !sqlFromUri.trim().isEmpty()) {
            return sqlFromUri;
        }

        if (values != null) {
            String sqlFromValues = values.getAsString(KEY_SQL);
            if (sqlFromValues != null && !sqlFromValues.trim().isEmpty()) {
                return sqlFromValues;
            }
        }

        if (selection != null && !selection.trim().isEmpty()) {
            return selection;
        }

        throw new IllegalArgumentException("Missing SQL. Provide via URI ?sql=, ContentValues[sql], or selection.");
    }

    private Cursor toCursor(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) {
            return new MatrixCursor(new String[0]);
        }

        Set<String> allColumns = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            allColumns.addAll(row.keySet());
        }

        String[] columns = allColumns.toArray(new String[0]);
        MatrixCursor cursor = new MatrixCursor(columns);

        for (Map<String, Object> row : rows) {
            Object[] values = new Object[columns.length];
            for (int i = 0; i < columns.length; i++) {
                values[i] = row.get(columns[i]);
            }
            cursor.addRow(values);
        }

        return cursor;
    }
}