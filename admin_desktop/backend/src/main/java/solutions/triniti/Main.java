package solutions.triniti;

import java.io.*;
import com.google.gson.Gson;
import solutions.triniti.core.Core;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;

public class Main {

    private static final Gson GSON = new Gson();
    private static final Core CORE = new Core();

    public static void main(String[] args) throws Exception {

        System.out.println("JAVA READY");
        System.out.flush();

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

        String line;
        while ((line = reader.readLine()) != null) {
            BridgeResponse response = handleLine(line);
            System.out.println(GSON.toJson(response));
            System.out.flush();
        }
    }

    private static BridgeResponse handleLine(String line) {
        try {
            BridgeRequest request = GSON.fromJson(line, BridgeRequest.class);
            return CORE.handleMessage(request);
        } catch (Exception e) {
            String message = e.getMessage() == null ? "Unknown error" : e.getMessage();
            return BridgeResponse.error(null, message);
        }
    }
}