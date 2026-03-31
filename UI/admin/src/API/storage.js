import { handleMessage } from '.';

const TYPE_PREFIX = 'storage.';

async function saveFile({ dataUrl, dataBase64, fileName, mimeType, folder }) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const payload = {
    dataUrl: dataUrl ?? undefined,
    dataBase64: dataBase64 ?? undefined,
    fileName: fileName ?? undefined,
    mimeType: mimeType ?? undefined,
    folder: folder ?? undefined,
  };

  const result = await handleMessage({
    type: `${TYPE_PREFIX}save`,
    params: payload,
  });

  if (!result || !result.success || !result.data) {
    throw new Error(result?.error || 'Failed to store file');
  }

  return {
    path: result.data.path,
    url: result.data.url,
    fileName: result.data.fileName,
    mimeType: result.data.mimeType,
    size: result.data.size,
  };
}

async function deleteFile(path) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const result = await handleMessage({
    type: `${TYPE_PREFIX}delete`,
    params: { path },
  });

  if (!result || !result.success) {
    throw new Error(result?.error || 'Failed to delete file');
  }

  return Boolean(result.data?.deleted);
}

export { saveFile, deleteFile };
