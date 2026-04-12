import { handleMessage } from '.';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      if (commaIndex < 0) {
        reject(new Error('Failed to encode backup file'));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsDataURL(file);
  });
}

export async function restoreFromBackupFile(file, { wipeExistingData = true } = {}) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  if (!(file instanceof File)) {
    throw new Error('Backup file is required');
  }

  const backupBase64 = await fileToBase64(file);

  const result = await handleMessage({
    type: 'sync.restoreBackup',
    params: {
      backupBase64,
      wipeExistingData: Boolean(wipeExistingData),
      fileName: file.name,
    },
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Restore failed');
  }

  if (!result.data.success) {
    throw new Error(result.data.message || 'Restore failed');
  }

  return result.data;
}
