(async () => {
  try {
    const m = await import(chrome.runtime.getURL('src/panel/main.js'));
    m.start();
  } catch (e) {
    console.error('[SolSim] panel failed to load', e);
  }
})();
