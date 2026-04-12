package solutions.triniti.backend.sync;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import solutions.triniti.backend.sync.dto.FullSyncRequest;
import solutions.triniti.backend.sync.dto.FullSyncResponse;
import solutions.triniti.backend.sync.dto.IncrementalSyncRequest;
import solutions.triniti.backend.sync.dto.IncrementalSyncResponse;
import solutions.triniti.backend.sync.dto.RestoreResponse;
import solutions.triniti.backend.sync.dto.SyncStatusResponse;

@RestController
@RequestMapping("/sync")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/full")
    public FullSyncResponse fullSync(@RequestBody FullSyncRequest request) {
        return syncService.applyFullSync(request);
    }

    @PostMapping("/incremental")
    public IncrementalSyncResponse incrementalSync(@RequestBody IncrementalSyncRequest request) {
        return syncService.applyIncrementalSync(request);
    }

    @PostMapping(value = "/restore", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RestoreResponse restore(
        @RequestPart("backupZip") MultipartFile backupZip,
        @RequestParam(name = "wipeExistingData", defaultValue = "true") boolean wipeExistingData
    ) {
        return syncService.restoreFromBackupArchive(backupZip, wipeExistingData);
    }

    @GetMapping("/status")
    public SyncStatusResponse status() {
        return syncService.getSyncStatus();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleInvalidArchive(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}
