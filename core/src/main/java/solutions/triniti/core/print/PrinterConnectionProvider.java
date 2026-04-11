package solutions.triniti.core.print;

import java.util.Collections;
import java.util.List;

public interface PrinterConnectionProvider {

    PrinterStatus connect(String requestedPrinterName) throws Exception;

    default PrinterStatus connect(String requestedPrinterName, String requestedPrinterAddress) throws Exception {
        if (requestedPrinterName != null && !requestedPrinterName.trim().isEmpty()) {
            return connect(requestedPrinterName);
        }
        return connect(requestedPrinterAddress);
    }

    PrinterStatus status() throws Exception;

    PrinterStatus printOrder(long orderId, String printType, String content) throws Exception;

    default PrinterStatus printOrder(
        long orderId,
        String printType,
        String content,
        String targetPrinterName,
        String targetPrinterAddress
    ) throws Exception {
        if ((targetPrinterName != null && !targetPrinterName.trim().isEmpty())
            || (targetPrinterAddress != null && !targetPrinterAddress.trim().isEmpty())) {
            connect(targetPrinterName, targetPrinterAddress);
        }
        return printOrder(orderId, printType, content);
    }

    default List<PrinterDevice> listPrinters() throws Exception {
        return Collections.emptyList();
    }
}
