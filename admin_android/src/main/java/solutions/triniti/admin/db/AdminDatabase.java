package solutions.triniti.admin.db;

import android.content.Context;
import solutions.triniti.core.db.Database;

public final class AdminDatabase {

    private static volatile Database instance;

    private AdminDatabase() {
    }

    public static Database get(Context context) {
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
