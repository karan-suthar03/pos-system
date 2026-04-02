package solutions.triniti.counter.bridge;

import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;

import solutions.triniti.counter.BuildConfig;

public class AdminCoreBridgeClient {

    private static final String ADMIN_AUTHORITY = BuildConfig.ADMIN_PROVIDER_AUTHORITY;
    private static final Uri BRIDGE_URI = Uri.parse("content://" + ADMIN_AUTHORITY + "/bridge");
    private static final String METHOD_BRIDGE_HANDLE = "bridge.handle";
    private static final String KEY_REQUEST_JSON = "request_json";
    private static final String KEY_RESPONSE_JSON = "response_json";

    private final Context appContext;
    private final ContentResolver contentResolver;

    public AdminCoreBridgeClient(Context context) {
        this.appContext = context.getApplicationContext();
        this.contentResolver = this.appContext.getContentResolver();
    }

    public String handleMessage(String requestJson) {
        ensureProviderAvailable();

        Bundle extras = new Bundle();
        extras.putString(KEY_REQUEST_JSON, requestJson);

        Bundle response = contentResolver.call(BRIDGE_URI, METHOD_BRIDGE_HANDLE, null, extras);
        if (response == null) {
            throw new IllegalStateException("Admin provider returned null response bundle");
        }

        String responseJson = response.getString(KEY_RESPONSE_JSON);
        if (responseJson == null || responseJson.trim().isEmpty()) {
            throw new IllegalStateException("Admin provider returned empty response_json");
        }

        return responseJson;
    }

    private void ensureProviderAvailable() {
        if (appContext.getPackageManager().resolveContentProvider(ADMIN_AUTHORITY, 0) == null) {
            throw new IllegalStateException(
                "Admin provider not found for authority '" + ADMIN_AUTHORITY + "'. Install/run admin_android app first."
            );
        }
    }
}
