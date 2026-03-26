package solutions.triniti.counter;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String COUNTER_URL = "http://10.126.18.21:3001/";

    private WebView webView;
    private NativeApiBridge nativeApiBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.counterWebView);
        configureWebView();
        webView.loadUrl(COUNTER_URL);
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
}