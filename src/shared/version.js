// An unpacked install reads the panel and popup straight from disk, but Chrome keeps
// running the old background worker (which executes trades) until the user clicks
// reload in chrome://extensions. Comparing the manifest Chrome loaded with the one on
// disk tells us when that has happened.

export function isStale(loadedVersion, diskVersion) {
  return !!loadedVersion && !!diskVersion && loadedVersion !== diskVersion;
}

export async function checkStale() {
  try {
    const r = await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' });
    const disk = (await r.json()).version;
    return isStale(chrome.runtime.getManifest().version, disk);
  } catch {
    return false;
  }
}
