const KEY = "apple_device_id";

/** Stable per-browser device id for one-device session policy. */
export function getDeviceId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `web-${
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
