package solutions.triniti.admin;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String ADMIN_URL = "http://10.190.196.21:3002/";

    private WebView webView;
    private NativeApiBridge nativeApiBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.adminWebView);
        configureWebView();
        webView.loadUrl(ADMIN_URL);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient());

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
        super.onDestroy();
    }
}