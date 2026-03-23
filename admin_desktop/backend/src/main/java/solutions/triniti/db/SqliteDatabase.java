package solutions.triniti.db;

import solutions.triniti.core.db.Database;
import java.sql.*;
import java.util.*;

public class SqliteDatabase implements Database {

    private Connection connection;

    public SqliteDatabase(String path) throws Exception {
        connection = DriverManager.getConnection("jdbc:sqlite:" + path);
    }

    @Override
    public List<Map<String, Object>> query(String sql) throws Exception {
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(sql);

        List<Map<String, Object>> rows = new ArrayList<>();

        ResultSetMetaData meta = rs.getMetaData();
        int cols = meta.getColumnCount();

        while (rs.next()) {
            Map<String, Object> row = new HashMap<>();

            for (int i = 1; i <= cols; i++) {
                row.put(meta.getColumnName(i), rs.getObject(i));
            }

            rows.add(row);
        }

        return rows;
    }

    @Override
    public int execute(String sql) throws Exception {
        Statement stmt = connection.createStatement();
        return stmt.executeUpdate(sql);
    }
}