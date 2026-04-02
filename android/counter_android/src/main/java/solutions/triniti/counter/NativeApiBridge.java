package solutions.triniti.counter;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import solutions.triniti.counter.bridge.AdminCoreBridgeClient;

public class NativeApiBridge {

    private static final String TAG = "NativeApiBridge";

    private final WebView webView;
    private final Gson gson = new Gson();
    private final AdminCoreBridgeClient bridgeClient;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public NativeApiBridge(WebView webView) {
        this.webView = webView;
        this.bridgeClient = new AdminCoreBridgeClient(webView.getContext());
    }

    @JavascriptInterface
    public void handleMessage(String messageJson) {
        executor.execute(() -> {
            String requestId = null;
            String responseJson;

            try {
                requestId = extractRequestId(messageJson);
                responseJson = bridgeClient.handleMessage(messageJson);
            } catch (Exception e) {
                String message = e.getMessage() == null ? "Unknown error" : e.getMessage();
                Log.e(TAG, "Bridge request failed", e);
                responseJson = buildErrorResponse(requestId, message);
            }

            resolveToWeb(requestId, responseJson);
        });
    }

    public void shutdown() {
        executor.shutdownNow();
    }

    private void resolveToWeb(String requestId, String responseString) {
        String js = "window.__nativeResolve(" +
                JSONObject.quote(requestId) + "," +
                JSONObject.quote(responseString) +
                ")";

        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private String extractRequestId(String messageJson) {
        try {
            JsonObject request = gson.fromJson(messageJson, JsonObject.class);
            if (request != null && request.has("requestId") && !request.get("requestId").isJsonNull()) {
                return request.get("requestId").getAsString();
            }
        } catch (Exception ignored) {
            // Keep null requestId so web side can still receive an error payload.
        }
        return null;
    }

    private String buildErrorResponse(String requestId, String error) {
        JsonObject payload = new JsonObject();
        if (requestId == null) {
            payload.add("requestId", null);
        } else {
            payload.addProperty("requestId", requestId);
        }
        payload.addProperty("success", false);
        payload.add("data", null);
        payload.addProperty("error", error);
        return gson.toJson(payload);
    }
}
