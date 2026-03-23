package solutions.triniti;

import java.io.*;
import solutions.triniti.core.Core;

public class Main {
    public static void main(String[] args) throws Exception {

        System.out.println("JAVA READY");
        System.out.flush();

        String test = "12345678909876543211";

        System.out.println(test.repeat(10000));

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

        String line;
        while ((line = reader.readLine()) != null) {
            System.out.println(Core.sayHello(line));
            System.out.flush();
        }


    }
}