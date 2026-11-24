declare global {
  interface Window {
    geospatialFunMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

let load: Promise<typeof google.maps> | undefined;
const failureListeners = new Set<(error: Error) => void>();

/**
 * Observe authentication failures even after the script reports readiness.
 *
 * @param listener - The active view's terminal failure handler.
 * @returns An unsubscribe function for the map view's teardown.
 */
export function subscribeToMapsFailure(listener: (error: Error) => void) {
  failureListeners.add(listener);
  return () => { failureListeners.delete(listener); };
}

/**
 * Share the page's bootstrap outcome, including failures, to prevent automatic retries.
 *
 * @param apiKey - A blank browser key disables bootstrap without inserting a script.
 * @returns The shared readiness promise, which rejects on terminal failure.
 */
export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  const key = apiKey.trim();
  if (!key) return Promise.reject(new Error("The Google Maps key is missing."));
  if (load) return load;

  load = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.search = new URLSearchParams({
      key, loading: "async", callback: "geospatialFunMapsReady", v: "quarterly",
    }).toString();
    script.src = url.href;
    script.async = true;
    let ready = false;
    let failed = false;

    /**
     * Stop bootstrap-only error reporting once the script settles.
     *
     * @returns No value. Releases bootstrap-only resources.
     */
    function finishLoading() {
      window.clearTimeout(timeout);
      script.removeEventListener("error", onScriptError);
    }

    /**
     * Preserve the terminal result even if the script reports readiness late.
     *
     * @param error - The terminal bootstrap error.
     * @returns No value. Transitions to terminal failure.
     */
    function fail(error: Error) {
      if (failed) return;
      failed = true;
      finishLoading();
      // Keep the callback available for scripts that arrive after the timeout.
      window.geospatialFunMapsReady = () => {};
      delete window.gm_authFailure;
      if (ready) {
        load = Promise.reject(error);
        void load.catch(() => {});
      } else {
        reject(error);
      }
      failureListeners.forEach((listener) => listener(error));
    }

    /**
     * Treat script errors as terminal so subsequent views do not retry automatically.
     *
     * @returns No value. Routes the failure through the shared bootstrap path.
     */
    function onScriptError() {
      fail(new Error("The Google Maps script could not be loaded."));
    }

    const timeout = window.setTimeout(() => {
      fail(new Error("Google Maps took too long to load."));
    }, 15_000);

    window.gm_authFailure = () => fail(new Error("Google Maps authentication failed."));
    window.geospatialFunMapsReady = () => {
      if (failed || ready) return;
      const maps = globalThis.google?.maps;
      if (!maps?.Map || !maps.Data || !maps.LatLngBounds) {
        fail(new Error("Google Maps did not initialise."));
        return;
      }
      ready = true;
      finishLoading();
      delete window.geospatialFunMapsReady;
      resolve(maps);
    };
    script.addEventListener("error", onScriptError);
    document.head.append(script);
  });

  return load;
}
