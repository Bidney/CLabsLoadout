const KEY = "loadout.workspaces";
const SETTINGS_KEY = "loadout.settings";
const DEFAULT_SETTINGS = { openIn: "newWindow" }; // "newWindow" | "currentWindow"

async function getWorkspaces() {
  const d = await chrome.storage.sync.get(KEY);
  return d[KEY] ?? [];
}
async function saveWorkspaces(list) {
  await chrome.storage.sync.set({ [KEY]: list });
}
async function getSettings() {
  const d = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(d[SETTINGS_KEY] ?? {}) };
}
async function saveSettings(s) {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: s });
}

function normalizeUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (/^(javascript|data|vbscript):/i.test(url)) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return `https://${url}`;
  return url;
}

async function openWorkspace(ws) {
  const { openIn } = await getSettings();
  const urls = (ws.urls || []).map(normalizeUrl).filter(Boolean);
  if (urls.length === 0) return { error: "empty" };

  if (openIn === "newWindow") {
    const win = await chrome.windows.create({ url: urls, focused: true });
    const tabs = await chrome.tabs.query({ windowId: win.id });
    const groupId = await chrome.tabs.group({ tabIds: tabs.map(t => t.id) });
    await chrome.tabGroups.update(groupId, { title: ws.name, color: ws.color || "blue" });
    return { windowId: win.id, groupId };
  }

  const tabIds = [];
  for (const url of urls) {
    const t = await chrome.tabs.create({ url, active: false });
    tabIds.push(t.id);
  }
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { title: ws.name, color: ws.color || "blue" });
  return { groupId };
}

async function closeWorkspace(ws) {
  const groups = await chrome.tabGroups.query({ title: ws.name });
  for (const g of groups) {
    const tabs = await chrome.tabs.query({ groupId: g.id });
    if (tabs.length) await chrome.tabs.remove(tabs.map(t => t.id));
  }
}

chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "list":         sendResponse(await getWorkspaces()); break;
      case "save":         await saveWorkspaces(msg.list); sendResponse({ ok: true }); break;
      case "open":         sendResponse(await openWorkspace(msg.ws)); break;
      case "close":        await closeWorkspace(msg.ws); sendResponse({ ok: true }); break;
      case "getSettings":  sendResponse(await getSettings()); break;
      case "saveSettings": await saveSettings(msg.settings); sendResponse({ ok: true }); break;
    }
  })();
  return true;
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "open-launcher") chrome.action.openPopup();
});