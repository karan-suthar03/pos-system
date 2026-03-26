package solutions.triniti.counter;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.util.Log;

import com.google.gson.Gson;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import solutions.triniti.core.Core;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.counter.db.ProviderDatabase;

public class NativeApiBridge {

    private static final String TAG = "NativeApiBridge";

    private final WebView webView;
    private final Gson gson = new Gson();
    private final Core core;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public NativeApiBridge(WebView webView) {
        this.webView = webView;
        Core initializedCore;
        try {
            initializedCore = new Core(new ProviderDatabase(webView.getContext()));
        } catch (RuntimeException e) {
            Log.e(TAG, "Admin provider unavailable; starting without database", e);
            initializedCore = new Core();
        }
        this.core = initializedCore;
    }

    @JavascriptInterface
    public void handleMessage(String messageJson) {
        executor.execute(() -> {
            String requestId = null;
            BridgeResponse response;

            try {
                BridgeRequest request = gson.fromJson(messageJson, BridgeRequest.class);
                if (request != null) {
                    requestId = request.getRequestId();
                }

                response = core.handleMessage(request);
            } catch (Exception e) {
                String message = e.getMessage() == null ? "Unknown error" : e.getMessage();
                response = BridgeResponse.error(requestId, message);
            }

            resolveToWeb(requestId, response);
        });
    }

    public void shutdown() {
        executor.shutdownNow();
    }

    private void resolveToWeb(String requestId, BridgeResponse response) {
        String responseString = gson.toJson(response);
        String js = "window.__nativeResolve(" +
                JSONObject.quote(requestId) + "," +
                JSONObject.quote(responseString) +
                ")";

        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}
