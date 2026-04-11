package solutions.triniti.core.print;

public final class PrintProviderRegistry {

    private static volatile PrinterConnectionProvider provider = new InMemoryPrinterConnectionProvider();

    private PrintProviderRegistry() {
    }

    public static PrinterConnectionProvider getProvider() {
        return provider;
    }

    public static void setProvider(PrinterConnectionProvider nextProvider) {
        if (nextProvider == null) {
            throw new IllegalArgumentException("PrinterConnectionProvider cannot be null");
        }
        provider = nextProvider;
    }
}
