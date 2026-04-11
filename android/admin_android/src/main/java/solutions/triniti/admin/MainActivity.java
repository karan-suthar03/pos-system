package solutions.triniti.admin;

import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.URLConnection;

import solutions.triniti.admin.db.AdminDatabase;

public class MainActivity extends AppCompatActivity {

    private static final String ADMIN_URL = "http://10.183.182.21:3002/";

    private WebView webView;
    private NativeApiBridge nativeApiBridge;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String storageRootPath;
    private final ActivityResultLauncher<String> filePicker = registerForActivityResult(
        new ActivityResultContracts.GetContent(),
        uri -> {
            if (fileChooserCallback == null) {
                return;
            }

            if (uri == null) {
                fileChooserCallback.onReceiveValue(null);
            } else {
                fileChooserCallback.onReceiveValue(new Uri[]{uri});
            }

            fileChooserCallback = null;
        }
    );
    private final ActivityResultLauncher<String[]> bluetoothPermissionLauncher = registerForActivityResult(
        new ActivityResultContracts.RequestMultiplePermissions(),
        result -> {
            // No-op: print provider validates permission again at call time.
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.adminWebView);
        storageRootPath = AdminDatabase.get(getApplicationContext()).getStorageRootPath();
        requestBluetoothPermissionIfNeeded();
        configureWebView();
        webView.loadUrl(ADMIN_URL);
    }

    private void requestBluetoothPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return;
        }

        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_CONNECT)
            == PackageManager.PERMISSION_GRANTED) {
            return;
        }

        bluetoothPermissionLauncher.launch(new String[] { android.Manifest.permission.BLUETOOTH_CONNECT });
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
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }

                fileChooserCallback = filePathCallback;
                String mimeType = "image/*";
                if (fileChooserParams != null) {
                    String[] acceptTypes = fileChooserParams.getAcceptTypes();
                    if (acceptTypes != null && acceptTypes.length > 0 && acceptTypes[0] != null && !acceptTypes[0].isEmpty()) {
                        mimeType = acceptTypes[0];
                    }
                }

                filePicker.launch(mimeType);
                return true;
            }
        });

        nativeApiBridge = new NativeApiBridge(webView);
        webView.addJavascriptInterface(nativeApiBridge, "NativeApi");
        webView.addJavascriptInterface(nativeApiBridge, "nativeAPI");
    }

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
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
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

        File root = new File(storageRootPath).getAbsoluteFile();
        File target = new File(root, decoded).getAbsoluteFile();
        if (!target.getPath().startsWith(root.getPath())) {
            return null;
        }
        if (!target.exists()) {
            return null;
        }

        try {
            String mimeType = URLConnection.guessContentTypeFromName(target.getName());
            if (mimeType == null) {
                mimeType = "application/octet-stream";
            }

            InputStream stream = new FileInputStream(target);
            return new WebResourceResponse(mimeType, null, stream);
        } catch (Exception ignored) {
            return null;
        }
    }
}