package solutions.triniti.core.db;

import java.util.*;

public interface Database {

    List<Map<String, Object>> query(String sql) throws Exception;

    int execute(String sql) throws Exception;
}