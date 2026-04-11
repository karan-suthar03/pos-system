package solutions.triniti.core.print;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;

public final class PrintContentFormatter {

    private static final int WIDTH_58MM = 32;
    private static final String LINE = "--------------------------------";

    private PrintContentFormatter() {
    }

    public static String format(String printType, long orderId, JsonObject orderSnapshot, String fallbackContent) {
        String normalizedType = normalizePrintType(printType);
        if ("RECEIPT".equals(normalizedType)) {
            return formatReceipt(orderId, orderSnapshot, fallbackContent);
        }
        return formatKot(orderId, orderSnapshot, fallbackContent);
    }

    private static String formatKot(long orderId, JsonObject orderSnapshot, String fallbackContent) {
        StringBuilder builder = new StringBuilder();
        builder.append(center("SUNSET POINT")).append('\n');
        builder.append(LINE).append('\n');
        builder.append("Type: KOT\n");
        builder.append("Order: ").append(resolveOrderLabel(orderId, orderSnapshot)).append('\n');
        builder.append("Time: ").append(System.currentTimeMillis()).append('\n');
        builder.append(LINE).append('\n');

        List<LineItem> items = parseItems(orderSnapshot);
        if (items.isEmpty()) {
            appendFallback(builder, fallbackContent);
        } else {
            for (LineItem item : items) {
                String label = item.quantity + " x " + item.name;
                appendWrapped(builder, label, WIDTH_58MM);
            }
        }

        builder.append('\n').append('\n');
        return builder.toString();
    }

    private static String formatReceipt(long orderId, JsonObject orderSnapshot, String fallbackContent) {
        StringBuilder builder = new StringBuilder();
        builder.append(center("SUNSET POINT")).append('\n');
        builder.append(center("RECEIPT")).append('\n');
        builder.append(LINE).append('\n');
        builder.append("Order: ").append(resolveOrderLabel(orderId, orderSnapshot)).append('\n');
        builder.append("Time: ").append(System.currentTimeMillis()).append('\n');
        builder.append(LINE).append('\n');

        List<LineItem> items = parseItems(orderSnapshot);
        int computedTotal = 0;
        if (items.isEmpty()) {
            appendFallback(builder, fallbackContent);
        } else {
            for (LineItem item : items) {
                int lineTotal = item.quantity * item.price;
                computedTotal += lineTotal;
                String left = item.quantity + " x " + item.name;
                String right = formatMoney(lineTotal);
                appendLeftRight(builder, left, right);
            }
        }

        int snapshotTotal = getInt(orderSnapshot, "orderTotal", -1);
        int total = snapshotTotal >= 0 ? snapshotTotal : computedTotal;

        builder.append(LINE).append('\n');
        appendLeftRight(builder, "TOTAL", formatMoney(total));
        builder.append(LINE).append('\n');
        builder.append(center("Thank you")).append('\n');
        builder.append('\n');
        return builder.toString();
    }

    private static void appendFallback(StringBuilder builder, String fallbackContent) {
        if (fallbackContent == null || fallbackContent.trim().isEmpty()) {
            builder.append("No order content provided\n");
            return;
        }
        appendWrapped(builder, fallbackContent.trim(), WIDTH_58MM);
    }

    private static String normalizePrintType(String printType) {
        if (printType == null || printType.trim().isEmpty()) {
            return "KOT";
        }
        String value = printType.trim().toUpperCase();
        if ("RECEIPT".equals(value)) {
            return value;
        }
        return "KOT";
    }

    private static String resolveOrderLabel(long orderId, JsonObject snapshot) {
        String tag = getString(snapshot, "tag");
        if (tag != null && !tag.isEmpty()) {
            return tag;
        }

        String displayId = getString(snapshot, "displayId");
        if (displayId != null && !displayId.isEmpty()) {
            return displayId;
        }

        if (orderId > 0) {
            return String.valueOf(orderId);
        }

        int idFromSnapshot = getInt(snapshot, "id", -1);
        return idFromSnapshot > 0 ? String.valueOf(idFromSnapshot) : "N/A";
    }

    private static List<LineItem> parseItems(JsonObject snapshot) {
        List<LineItem> items = new ArrayList<>();
        if (snapshot == null) {
            return items;
        }

        JsonElement element = snapshot.get("items");
        if (element == null || !element.isJsonArray()) {
            return items;
        }

        JsonArray array = element.getAsJsonArray();
        for (JsonElement itemElement : array) {
            if (itemElement == null || !itemElement.isJsonObject()) {
                continue;
            }

            JsonObject item = itemElement.getAsJsonObject();
            String status = getString(item, "status");
            if ("CANCELLED".equalsIgnoreCase(status)) {
                continue;
            }

            String name = getString(item, "name");
            if (name == null || name.trim().isEmpty()) {
                name = "Item";
            }
            int quantity = Math.max(1, getInt(item, "quantity", 1));
            int price = Math.max(0, getInt(item, "price", 0));
            items.add(new LineItem(name.trim(), quantity, price));
        }

        return items;
    }

    private static String formatMoney(int valueInPaise) {
        int rupees = valueInPaise / 100;
        int paise = Math.abs(valueInPaise % 100);
        return "Rs." + rupees + "." + (paise < 10 ? "0" : "") + paise;
    }

    private static void appendLeftRight(StringBuilder builder, String left, String right) {
        String normalizedLeft = left == null ? "" : left.trim();
        String normalizedRight = right == null ? "" : right.trim();

        int gap = WIDTH_58MM - normalizedLeft.length() - normalizedRight.length();
        if (gap < 1) {
            appendWrapped(builder, normalizedLeft, WIDTH_58MM - Math.min(10, normalizedRight.length()));
            builder.append(normalizedRight).append('\n');
            return;
        }

        builder.append(normalizedLeft);
        for (int i = 0; i < gap; i++) {
            builder.append(' ');
        }
        builder.append(normalizedRight).append('\n');
    }

    private static void appendWrapped(StringBuilder builder, String text, int width) {
        if (text == null || text.isEmpty()) {
            builder.append('\n');
            return;
        }

        String remaining = text;
        while (!remaining.isEmpty()) {
            if (remaining.length() <= width) {
                builder.append(remaining).append('\n');
                break;
            }

            int split = remaining.lastIndexOf(' ', width);
            if (split <= 0) {
                split = width;
            }
            builder.append(remaining, 0, split).append('\n');
            remaining = remaining.substring(split).trim();
        }
    }

    private static String center(String value) {
        if (value == null) {
            return "";
        }
        String text = value.trim();
        if (text.length() >= WIDTH_58MM) {
            return text;
        }
        int leading = (WIDTH_58MM - text.length()) / 2;
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < leading; i++) {
            builder.append(' ');
        }
        builder.append(text);
        return builder.toString();
    }

    private static String getString(JsonObject object, String key) {
        if (object == null || key == null) {
            return null;
        }
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return null;
        }
        try {
            return element.getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private static int getInt(JsonObject object, String key, int fallback) {
        if (object == null || key == null) {
            return fallback;
        }
        JsonElement element = object.get(key);
        if (element == null || element.isJsonNull()) {
            return fallback;
        }
        try {
            return element.getAsInt();
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static final class LineItem {
        private final String name;
        private final int quantity;
        private final int price;

        private LineItem(String name, int quantity, int price) {
            this.name = name;
            this.quantity = quantity;
            this.price = price;
        }
    }
}