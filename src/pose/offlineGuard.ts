// The app makes no runtime network calls (D2, D9). MediaPipe Tasks sends usage logs to
// odml.pa.googleapis.com with fetch(); this guard rejects any fetch to another origin, which also
// makes MediaPipe's logger give up after its first attempt.
let installed = false;

export function installOfflineGuard(): void {
  if (installed) return;
  installed = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
    if (url.origin !== location.origin && url.protocol !== 'blob:' && url.protocol !== 'data:') {
      return Promise.reject(new TypeError(`blocked network request to ${url.origin} (offline app)`));
    }
    return realFetch(input, init);
  };
}
