(() => {
  if (window.__solsimHook) return;
  window.__solsimHook = true;
  const TAG = 'solsim-feed';
  const WS_RE = /"channel"\s*:\s*"(token_stat|major_coin_price)"/;
  const INFO_RE = /\/(mutil_window_token_info|multi_token_info)\b/;
  const infoCache = [];

  const post = (kind, data) => {
    try { window.postMessage({ source: TAG, kind, data }, location.origin); } catch {}
  };
  const postInfo = (text) => {
    infoCache.push(text);
    if (infoCache.length > 20) infoCache.shift();
    post('http', text);
  };

  const NativeWS = window.WebSocket;
  function SolSimWS(url, protocols) {
    const ws = protocols === undefined ? new NativeWS(url) : new NativeWS(url, protocols);
    try {
      if (/gmgn\.ai/.test(String(url))) {
        ws.addEventListener('message', (ev) => {
          try {
            if (typeof ev.data === 'string' && WS_RE.test(ev.data.slice(0, 64))) post('ws', ev.data);
          } catch {}
        });
      }
    } catch {}
    return ws;
  }
  SolSimWS.prototype = NativeWS.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Object.defineProperty(SolSimWS, k, { value: NativeWS[k] });
  window.WebSocket = SolSimWS;

  const nativeFetch = window.fetch;
  window.fetch = function (...args) {
    const p = nativeFetch.apply(this, args);
    try {
      const a = args[0];
      const u = typeof a === 'string' ? a : (a && a.url) || String(a);
      if (INFO_RE.test(u)) p.then((r) => r.clone().text()).then(postInfo).catch(() => {});
    } catch {}
    return p;
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      if (INFO_RE.test(String(url))) {
        this.addEventListener('load', () => {
          try { if (typeof this.responseText === 'string') postInfo(this.responseText); } catch {}
        });
      }
    } catch {}
    return nativeOpen.apply(this, arguments);
  };

  window.addEventListener('message', (ev) => {
    if (ev.source === window && ev.data && ev.data.source === 'solsim-panel' && ev.data.kind === 'hello') {
      infoCache.forEach((t) => post('http', t));
    }
  });
})();
