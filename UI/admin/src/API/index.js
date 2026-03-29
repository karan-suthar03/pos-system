window.__nativePromises = window.__nativePromises || {};
window.__nativeResolve = function (id, response) {
  if (window.__nativePromises[id]) {
    window.__nativePromises[id](response ? JSON.parse(response) : null);
    delete window.__nativePromises[id];
  }
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function handleMessage(messagePayload) {
  if (!window.NativeApi?.handleMessage) {
    throw new Error('Native bridge is unavailable');
  }

  const id = crypto?.randomUUID ? crypto.randomUUID() : uuid();
  const message = {
    requestId: id,
  };

  if (messagePayload !== undefined) {
    let sanitizedPayload = messagePayload;

    if (
      sanitizedPayload &&
      typeof sanitizedPayload === 'object' &&
      !Array.isArray(sanitizedPayload)
    ) {
      sanitizedPayload = { ...sanitizedPayload };
      delete sanitizedPayload.requestId;
    }

    message.message = sanitizedPayload;
  }

  const result = await new Promise((resolve) => {
    window.__nativePromises[id] = resolve;
    window.NativeApi.handleMessage(JSON.stringify(message));
  });

  return result;
}

let backPressHandler = null;

export function setBackPressHandler(handler) {
  backPressHandler = handler;
}

window.__handleBackPress = function () {
  if (backPressHandler && typeof backPressHandler === "function") {
    return backPressHandler();
  }
  return false;
};

const apiClient = {
  get: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
  post: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
  put: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
  delete: async () => {
    throw new Error("Offline dummy mode: network client is disabled");
  },
};

export default apiClient;