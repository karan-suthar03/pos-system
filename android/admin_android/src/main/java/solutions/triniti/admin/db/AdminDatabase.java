package solutions.triniti.admin.db;

import android.content.Context;

public final class AdminDatabase {

    private static volatile AdminSqliteDatabase instance;

    private AdminDatabase() {
    }

    public static AdminSqliteDatabase get(Context context) {
        if (instance == null) {
            synchronized (AdminDatabase.class) {
                if (instance == null) {
                    instance = new AdminSqliteDatabase(context);
                }
            }
        }

        return instance;
    }
}
