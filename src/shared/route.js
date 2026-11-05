const MINT_RE = /^\/sol\/token\/(?:[A-Za-z0-9]+_)?([1-9A-HJ-NP-Za-km-z]{32,44})(?:[/?#]|$)/;

export function mintFromPath(pathname) {
  const m = MINT_RE.exec(pathname || '');
  return m ? m[1] : null;
}

export function symbolFromTitle(title) {
  const m = /^\s*([^\s|]+)\s/.exec(title || '');
  return m ? m[1] : null;
}
