import { handleMessage } from '.';

export async function getServerStatus() {
  if (!window.NativeApi?.handleMessage) {
    return {
      online: false,
      backupReady: false,
      backupCount: 0,
      error: 'Native bridge is unavailable',
      checkedAt: Date.now(),
    };
  }

  try {
    const result = await handleMessage({
      type: 'sync.getServerStatus',
      params: {},
    });

    if (!result?.success) {
      return {
        online: false,
        backupReady: false,
        backupCount: 0,
        error: result?.error || 'Failed to fetch server status',
        checkedAt: Date.now(),
      };
    }

    return {
      online: Boolean(result?.data?.online),
      backupReady: Boolean(result?.data?.backupReady),
      backupCount: Number(result?.data?.backupCount || 0),
      latestBackupName: result?.data?.latestBackupName || null,
      checkedAt: Number(result?.data?.checkedAt || Date.now()),
      error: result?.data?.error || null,
    };
  } catch (error) {
    return {
      online: false,
      backupReady: false,
      backupCount: 0,
      error: error?.message || 'Failed to fetch server status',
      checkedAt: Date.now(),
    };
  }
}
