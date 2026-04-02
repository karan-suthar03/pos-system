package solutions.triniti.admin.db;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;
import java.net.URLConnection;

import com.google.gson.Gson;

import solutions.triniti.core.Core;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class DatabaseProvider extends ContentProvider {

    public static final String PATH_QUERY = "query";
    public static final String PATH_EXECUTE = "execute";
    public static final String PATH_STORAGE = "storage";
    public static final String KEY_SQL = "sql";
    public static final String METHOD_BRIDGE_HANDLE = "bridge.handle";
    public static final String KEY_REQUEST_JSON = "request_json";
    public static final String KEY_RESPONSE_JSON = "response_json";

    private static final int CODE_QUERY = 1;
    private static final int CODE_EXECUTE = 2;
    private static final int CODE_STORAGE = 3;

    private UriMatcher uriMatcher;
    private AdminSqliteDatabase database;
    private Core core;
    private final Gson gson = new Gson();

    @Override
    public boolean onCreate() {
        if (getContext() == null) {
            return false;
        }

        database = AdminDatabase.get(getContext());
        core = CoreRuntime.get(getContext());

        String authority = getContext().getPackageName() + ".provider";
        uriMatcher = new UriMatcher(UriMatcher.NO_MATCH);
        uriMatcher.addURI(authority, PATH_QUERY, CODE_QUERY);
        uriMatcher.addURI(authority, PATH_EXECUTE, CODE_EXECUTE);
        uriMatcher.addURI(authority, PATH_STORAGE, CODE_STORAGE);

        return true;
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        if (!METHOD_BRIDGE_HANDLE.equals(method)) {
            return super.call(method, arg, extras);
        }

        String requestJson = extras == null ? null : extras.getString(KEY_REQUEST_JSON);
        if (requestJson == null || requestJson.trim().isEmpty()) {
            return responseBundle(toErrorResponseJson(null, "Missing request_json"));
        }

        String requestId = null;
        try {
            BridgeRequest request = gson.fromJson(requestJson, BridgeRequest.class);
            if (request != null) {
                requestId = request.getRequestId();
            }

            BridgeResponse response = core.handleMessage(request);
            return responseBundle(gson.toJson(response));
        } catch (Exception e) {
            String message = e.getMessage() == null ? "Unknown error" : e.getMessage();
            return responseBundle(toErrorResponseJson(requestId, message));
        }
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
        if (code == CODE_STORAGE) {
            String fileName = getStorageRelativePath(uri);
            String guessed = fileName == null ? null : URLConnection.guessContentTypeFromName(fileName);
            return guessed == null ? "application/octet-stream" : guessed;
        }
        throw new IllegalArgumentException("Unsupported URI: " + uri);
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (uri == null) {
            throw new FileNotFoundException("Missing storage uri");
        }

        String relativePath = getStorageRelativePath(uri);
        if (relativePath == null || relativePath.trim().isEmpty()) {
            throw new FileNotFoundException("Missing storage path");
        }

        String normalized = relativePath.trim().replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (normalized.contains("..")) {
            throw new FileNotFoundException("Invalid storage path");
        }

        File root = new File(database.getStorageRootPath()).getAbsoluteFile();
        File target = new File(root, normalized).getAbsoluteFile();
        if (!target.getPath().startsWith(root.getPath())) {
            throw new FileNotFoundException("Invalid storage path");
        }
        if (!target.exists()) {
            throw new FileNotFoundException("File not found: " + relativePath);
        }

        return ParcelFileDescriptor.open(target, ParcelFileDescriptor.MODE_READ_ONLY);
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

    private Bundle responseBundle(String responseJson) {
        Bundle out = new Bundle();
        out.putString(KEY_RESPONSE_JSON, responseJson);
        return out;
    }

    private String toErrorResponseJson(String requestId, String message) {
        return gson.toJson(BridgeResponse.error(requestId, message));
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

    private String getStorageRelativePath(Uri uri) {
        String fromQuery = uri.getQueryParameter("path");
        if (fromQuery != null && !fromQuery.trim().isEmpty()) {
            return fromQuery;
        }

        List<String> segments = uri.getPathSegments();
        if (segments == null || segments.isEmpty()) {
            return null;
        }

        if (!PATH_STORAGE.equals(segments.get(0))) {
            return null;
        }

        if (segments.size() <= 1) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 1; i < segments.size(); i++) {
            if (builder.length() > 0) {
                builder.append('/');
            }
            builder.append(segments.get(i));
        }
        return builder.toString();
    }
}