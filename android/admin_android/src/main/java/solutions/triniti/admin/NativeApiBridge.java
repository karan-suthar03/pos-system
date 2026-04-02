package solutions.triniti.admin;

import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import solutions.triniti.admin.db.CoreRuntime;
import solutions.triniti.core.Core;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;

public class NativeApiBridge {

    private static final String TAG = "NativeApiBridge";

    private final WebView webView;
    private final Gson gson = new Gson();
    private final Core core;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public NativeApiBridge(WebView webView) {
        this.webView = webView;
        this.core = CoreRuntime.get(webView.getContext());
    }

    @JavascriptInterface
    public void handleMessage(String messageJson) {
        executor.execute(() -> {
            String requestId = null;
            String responseJson;

            try {
                BridgeRequest request = gson.fromJson(messageJson, BridgeRequest.class);
                if (request != null) {
                    requestId = request.getRequestId();
                }

                BridgeResponse response = core.handleMessage(request);
                responseJson = gson.toJson(response);
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
