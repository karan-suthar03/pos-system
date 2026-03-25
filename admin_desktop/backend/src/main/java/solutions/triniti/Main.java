package solutions.triniti;

import java.io.*;
import com.google.gson.Gson;
import solutions.triniti.core.Core;
import solutions.triniti.core.bridge.BridgeRequest;
import solutions.triniti.core.bridge.BridgeResponse;
import solutions.triniti.db.SqliteDatabase;

public class Main {

    private static final Gson GSON = new Gson();
    private static Core CORE;

    public static void main(String[] args) throws Exception {
        String dbPath = args.length > 0 ? args[0] : "pos.db";
        CORE = new Core(new SqliteDatabase(dbPath));

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