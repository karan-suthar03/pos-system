package solutions.triniti.admin.db;

import android.content.Context;

import solutions.triniti.core.Core;

public final class CoreRuntime {

    private static volatile Core core;

    private CoreRuntime() {
    }

    public static Core get(Context context) {
        if (context == null) {
            throw new IllegalArgumentException("Context cannot be null");
        }

        if (core == null) {
            synchronized (CoreRuntime.class) {
                if (core == null) {
                    AdminSqliteDatabase database = AdminDatabase.get(context.getApplicationContext());
                    core = new Core(database);
                }
            }
        }

        return core;
    }
}
