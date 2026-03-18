package solutions.triniti;

import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

//        System.out.println("something something");
        String line;
        while ((line = reader.readLine()) != null) {
            System.out.println("{\"id\":1,\"response\":\"pong\"}");
            System.out.flush();
        }
    }
}