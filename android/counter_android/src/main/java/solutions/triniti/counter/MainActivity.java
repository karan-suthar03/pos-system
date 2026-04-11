package solutions.triniti.counter;

import android.bluetooth.BluetoothAdapter;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import java.io.InputStream;
import java.net.URLConnection;

public class MainActivity extends AppCompatActivity {

    private static final String COUNTER_URL = "http://10.183.182.21:3001/";

    private WebView webView;
    private NativeApiBridge nativeApiBridge;
    private Uri storageBaseUri;
    private final ActivityResultLauncher<String[]> bluetoothPermissionLauncher = registerForActivityResult(
        new ActivityResultContracts.RequestMultiplePermissions(),
        result -> requestBluetoothEnableIfNeeded()
    );
    private final ActivityResultLauncher<Intent> bluetoothEnableLauncher = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            // No-op: bridge and print status polling will observe final state.
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.counterWebView);
        storageBaseUri = Uri.parse("content://" + BuildConfig.ADMIN_PROVIDER_AUTHORITY + "/storage");
        requestBluetoothPermissionIfNeeded();
        configureWebView();
        webView.loadUrl(COUNTER_URL);
    }

    private void requestBluetoothPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            requestBluetoothEnableIfNeeded();
            return;
        }

        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_CONNECT)
            == PackageManager.PERMISSION_GRANTED) {
            requestBluetoothEnableIfNeeded();
            return;
        }

        bluetoothPermissionLauncher.launch(new String[] { android.Manifest.permission.BLUETOOTH_CONNECT });
    }

    private void requestBluetoothEnableIfNeeded() {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || adapter.isEnabled()) {
            return;
        }

        Intent intent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
        bluetoothEnableLauncher.launch(intent);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request == null ? null : request.getUrl();
                WebResourceResponse response = handleStorageRequest(uri);
                if (response != null) {
                    return response;
                }
                return super.shouldInterceptRequest(view, request);
            }
        });

        nativeApiBridge = new NativeApiBridge(webView);
        webView.addJavascriptInterface(nativeApiBridge, "NativeApi");
        webView.addJavascriptInterface(nativeApiBridge, "nativeAPI");
    }

//    @Override
//    public void onBackPressed() {
//        if (webView != null && webView.canGoBack()) {
//            webView.goBack();
//            return;
//        }
//        super.onBackPressed();
//    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("NativeApi");
            webView.removeJavascriptInterface("nativeAPI");
            webView.destroy();
        }
        if (nativeApiBridge != null) {
            nativeApiBridge.shutdown();
        }
        super.onDestroy();
    }

    private WebResourceResponse handleStorageRequest(Uri uri) {
        if (uri == null || !"storage".equals(uri.getScheme())) {
            return null;
        }

        String rawPath = uri.getPath();
        if (rawPath == null) {
            return null;
        }

        String decoded = Uri.decode(rawPath).replace('\\', '/');
        while (decoded.startsWith("/")) {
            decoded = decoded.substring(1);
        }
        if (decoded.isEmpty() || decoded.contains("..")) {
            return null;
        }

        Uri storageUri = storageBaseUri.buildUpon()
            .appendQueryParameter("path", decoded)
            .build();

        try {
            InputStream stream = getContentResolver().openInputStream(storageUri);
            if (stream == null) {
                return null;
            }

            String mimeType = getContentResolver().getType(storageUri);
            if (mimeType == null) {
                mimeType = URLConnection.guessContentTypeFromName(decoded);
            }
            if (mimeType == null) {
                mimeType = "application/octet-stream";
            }

            return new WebResourceResponse(mimeType, null, stream);
        } catch (Exception ignored) {
            return null;
        }
    }
}