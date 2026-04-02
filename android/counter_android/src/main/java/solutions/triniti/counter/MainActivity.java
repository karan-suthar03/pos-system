package solutions.triniti.counter;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

import java.io.InputStream;
import java.net.URLConnection;

public class MainActivity extends AppCompatActivity {

    private static final String COUNTER_URL = "http://10.190.196.21:3001/";

    private WebView webView;
    private NativeApiBridge nativeApiBridge;
    private Uri storageBaseUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.counterWebView);
        storageBaseUri = Uri.parse("content://" + BuildConfig.ADMIN_PROVIDER_AUTHORITY + "/storage");
        configureWebView();
        webView.loadUrl(COUNTER_URL);
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