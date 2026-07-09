const INDEX_KEY = "loadout.index";
const WS_PREFIX = "loadout.ws.";
const SETTINGS_KEY = "loadout.settings";
const LEGACY_KEY = "loadout.workspaces";
const LIVE_KEY = "loadout.live";
const DEFAULT_SETTINGS = { openIn: "newWindow" }; // "newWindow" | "currentWindow"
const MENU_CAP = 20;

// ---------- storage ----------
// Each workspace lives under its own sync key so one big list can't hit the
// 8KB per-item sync quota. loadout.index holds display order.

async function migrateLegacy() {
  const d = await chrome.storage.sync.get(LEGACY_KEY);
  const legacy = d[LEGACY_KEY];
  if (!Array.isArray(legacy)) return;
  const index = [];
  const writes = {};
  for (const ws of legacy) {
    if (!ws || !ws.id) continue;
    index.push(ws.id);
    writes[WS_PREFIX + ws.id] = ws;
  }
  writes[INDEX_KEY] = index;
  await chrome.storage.sync.set(writes);
  await chrome.storage.sync.remove(LEGACY_KEY);
}

async function getIndex() {
  const d = await chrome.storage.sync.get([INDEX_KEY, LEGACY_KEY]);
  if (!d[INDEX_KEY] && Array.isArray(d[LEGACY_KEY])) {
    await migrateLegacy();
    return (await chrome.storage.sync.get(INDEX_KEY))[INDEX_KEY] ?? [];
  }
  return d[INDEX_KEY] ?? [];
}

async function getWorkspaces() {
  const index = await getIndex();
  if (index.length === 0) return [];
  const d = await chrome.storage.sync.get(index.map(id => WS_PREFIX + id));
  return index.map(id => d[WS_PREFIX + id]).filter(Boolean);
}

async function getWorkspace(id) {
  const d = await chrome.storage.sync.get(WS_PREFIX + id);
  return d[WS_PREFIX + id] ?? null;
}

async function upsertWorkspace(ws) {
  try {
    await chrome.storage.sync.set({ [WS_PREFIX + ws.id]: ws });
    const index = await getIndex();
    if (!index.includes(ws.id)) {
      index.push(ws.id);
      await chrome.storage.sync.set({ [INDEX_KEY]: index });
    }
    rebuildMenus();
    return { ok: true };
  } catch (e) {
    return { error: storageError(e) };
  }
}

async function removeWorkspace(id) {
  const index = (await getIndex()).filter(x => x !== id);
  await chrome.storage.sync.set({ [INDEX_KEY]: index });
  await chrome.storage.sync.remove(WS_PREFIX + id);
  await clearLive(id);
  rebuildMenus();
  return { ok: true };
}

async function reorderWorkspaces(ids) {
  const current = await getIndex();
  // Accept only a permutation of what we already have.
  const valid = ids.filter(id => current.includes(id));
  for (const id of current) if (!valid.includes(id)) valid.push(id);
  await chrome.storage.sync.set({ [INDEX_KEY]: valid });
  rebuildMenus();
  return { ok: true };
}

function storageError(e) {
  const msg = String(e?.message || e);
  if (/quota/i.test(msg)) return "This loadout is too large for Chrome sync storage. Trim some URLs.";
  return msg;
}

async function getSettings() {
  const d = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(d[SETTINGS_KEY] ?? {}) };
}
async function saveSettings(s) {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: s });
}

// ---------- live group tracking ----------
// Session storage: survives service-worker restarts, cleared with the browser.
// Maps workspace id -> { groupId, windowId } for groups this extension opened.

async function getLiveMap() {
  const d = await chrome.storage.session.get(LIVE_KEY);
  return d[LIVE_KEY] ?? {};
}
async function setLive(id, info) {
  const map = await getLiveMap();
  map[id] = info;
  await chrome.storage.session.set({ [LIVE_KEY]: map });
}
async function clearLive(id) {
  const map = await getLiveMap();
  if (id in map) {
    delete map[id];
    await chrome.storage.session.set({ [LIVE_KEY]: map });
  }
}

async function liveGroupFor(id) {
  const map = await getLiveMap();
  const info = map[id];
  if (!info) return null;
  try {
    const group = await chrome.tabGroups.get(info.groupId);
    return { ...info, group };
  } catch {
    await clearLive(id);
    return null;
  }
}

chrome.tabGroups.onRemoved.addListener(async (group) => {
  const map = await getLiveMap();
  let changed = false;
  for (const [id, info] of Object.entries(map)) {
    if (info.groupId === group.id) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) await chrome.storage.session.set({ [LIVE_KEY]: map });
});

// ---------- open / close / capture / sync ----------

function normalizeUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (/^(javascript|data|vbscript):/i.test(url)) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return `https://${url}`;
  return url;
}

function capturableUrl(url) {
  return /^(https?|file):/i.test(url || "");
}

async function openWorkspace(ws) {
  // Already open? Focus it instead of duplicating.
  const live = await liveGroupFor(ws.id);
  if (live) {
    const tabs = await chrome.tabs.query({ groupId: live.groupId });
    if (tabs.length) {
      await chrome.windows.update(tabs[0].windowId, { focused: true });
      await chrome.tabs.update(tabs[0].id, { active: true });
      return { focused: true, groupId: live.groupId };
    }
  }

  const { openIn } = await getSettings();
  const urls = (ws.urls || []).map(normalizeUrl).filter(Boolean);
  if (urls.length === 0) return { error: "This loadout has no URLs." };

  let tabIds, windowId;
  if (openIn === "newWindow") {
    const win = await chrome.windows.create({ url: urls, focused: true });
    const tabs = await chrome.tabs.query({ windowId: win.id });
    tabIds = tabs.map(t => t.id);
    windowId = win.id;
  } else {
    tabIds = [];
    for (const url of urls) {
      const t = await chrome.tabs.create({ url, active: false });
      tabIds.push(t.id);
    }
    windowId = tabIds.length ? (await chrome.tabs.get(tabIds[0])).windowId : undefined;
  }

  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { title: ws.name, color: ws.color || "blue" });
  await setLive(ws.id, { groupId, windowId });
  return { groupId, windowId };
}

async function closeWorkspace(ws) {
  // Only ever close the group this extension opened for this loadout.
  const live = await liveGroupFor(ws.id);
  if (!live) return { error: "This loadout is not open (or was not opened by CLabs Loadout)." };
  const tabs = await chrome.tabs.query({ groupId: live.groupId });
  if (tabs.length) await chrome.tabs.remove(tabs.map(t => t.id));
  await clearLive(ws.id);
  return { ok: true };
}

async function syncBackWorkspace(id) {
  const ws = await getWorkspace(id);
  if (!ws) return { error: "Loadout not found." };
  const live = await liveGroupFor(id);
  if (!live) return { error: "This loadout is not open." };
  const tabs = await chrome.tabs.query({ groupId: live.groupId });
  const urls = tabs.map(t => t.url || t.pendingUrl).filter(capturableUrl);
  if (urls.length === 0) return { error: "No captureable tabs in the group." };
  ws.urls = urls;
  const res = await upsertWorkspace(ws);
  return res.error ? res : { ok: true, count: urls.length };
}

async function captureWindow() {
  const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
  const urls = tabs.map(t => t.url || t.pendingUrl).filter(capturableUrl);
  if (urls.length === 0) return { error: "No captureable tabs in this window (chrome:// pages are skipped)." };
  return { urls };
}

// ---------- import / export ----------

async function exportData() {
  const workspaces = await getWorkspaces();
  const settings = await getSettings();
  return { format: "clabs-loadout", version: 1, exportedAt: new Date().toISOString(), settings, workspaces };
}

async function importData(data, replace) {
  const incoming = Array.isArray(data?.workspaces) ? data.workspaces : null;
  if (!incoming) return { error: "Not a CLabs Loadout export file." };

  const cleaned = [];
  for (const ws of incoming) {
    const name = String(ws?.name || "").trim().slice(0, 80);
    const urls = Array.isArray(ws?.urls) ? ws.urls.map(normalizeUrl).filter(Boolean) : [];
    if (!name || urls.length === 0) continue;
    cleaned.push({ id: crypto.randomUUID(), name, color: ws.color || "blue", urls });
  }
  if (cleaned.length === 0) return { error: "No valid loadouts in the file." };

  try {
    if (replace) {
      const oldIndex = await getIndex();
      await chrome.storage.sync.remove(oldIndex.map(id => WS_PREFIX + id));
      await chrome.storage.sync.set({ [INDEX_KEY]: [] });
    }
    for (const ws of cleaned) {
      const res = await upsertWorkspace(ws);
      if (res.error) return res;
    }
    if (data.settings?.openIn) await saveSettings({ openIn: data.settings.openIn });
    return { ok: true, count: cleaned.length };
  } catch (e) {
    return { error: storageError(e) };
  }
}

// ---------- context menu ----------

let menuBuild = Promise.resolve();

function rebuildMenus() {
  // Serialize rebuilds; storage events can fire in bursts.
  menuBuild = menuBuild.then(async () => {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: "new-from-page",
      title: "New loadout from this page",
      contexts: ["page", "link"]
    }, () => void chrome.runtime.lastError);

    const workspaces = (await getWorkspaces()).slice(0, MENU_CAP);
    if (workspaces.length === 0) return;

    chrome.contextMenus.create({
      id: "add-parent",
      title: "Add page to loadout",
      contexts: ["page", "link"]
    }, () => void chrome.runtime.lastError);

    for (const ws of workspaces) {
      chrome.contextMenus.create({
        id: "add-to:" + ws.id,
        parentId: "add-parent",
        title: ws.name,
        contexts: ["page", "link"]
      }, () => void chrome.runtime.lastError);
    }
  }).catch(() => {});
  return menuBuild;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = normalizeUrl(info.linkUrl || info.pageUrl || (tab && tab.url));
  if (!capturableUrl(url)) return;

  if (info.menuItemId === "new-from-page") {
    const title = (tab?.title || "").trim().slice(0, 60);
    await upsertWorkspace({ id: crypto.randomUUID(), name: title || "New loadout", color: "blue", urls: [url] });
    return;
  }

  const id = String(info.menuItemId).startsWith("add-to:") ? String(info.menuItemId).slice(7) : null;
  if (!id) return;
  const ws = await getWorkspace(id);
  if (!ws) return;
  ws.urls = ws.urls || [];
  if (!ws.urls.includes(url)) {
    ws.urls.push(url);
    await upsertWorkspace(ws);
  }
});

// ---------- omnibox ----------

function xmlEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  }[c]));
}

function matchWorkspaces(list, text) {
  const q = text.trim().toLowerCase();
  if (!q) return list;
  return list
    .map(ws => {
      const name = ws.name.toLowerCase();
      let score = -1;
      if (name === q) score = 3;
      else if (name.startsWith(q)) score = 2;
      else if (name.includes(q)) score = 1;
      return { ws, score };
    })
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.ws);
}

chrome.omnibox.setDefaultSuggestion({ description: "Open a loadout by name" });

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const matches = matchWorkspaces(await getWorkspaces(), text).slice(0, 6);
  suggest(matches.map(ws => ({
    content: ws.name,
    description: `Open loadout: <match>${xmlEscape(ws.name)}</match> (${(ws.urls || []).length} tabs)`
  })));
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const matches = matchWorkspaces(await getWorkspaces(), text);
  if (matches.length) await openWorkspace(matches[0]);
});

// ---------- messages ----------

chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "list": {
        const workspaces = await getWorkspaces();
        const live = {};
        for (const ws of workspaces) live[ws.id] = Boolean(await liveGroupFor(ws.id));
        sendResponse({ workspaces, live });
        break;
      }
      case "upsert":       sendResponse(await upsertWorkspace(msg.ws)); break;
      case "remove":       sendResponse(await removeWorkspace(msg.id)); break;
      case "reorder":      sendResponse(await reorderWorkspaces(msg.ids)); break;
      case "open":         sendResponse(await openWorkspace(msg.ws)); break;
      case "close":        sendResponse(await closeWorkspace(msg.ws)); break;
      case "syncBack":     sendResponse(await syncBackWorkspace(msg.id)); break;
      case "capture":      sendResponse(await captureWindow()); break;
      case "getSettings":  sendResponse(await getSettings()); break;
      case "saveSettings": await saveSettings(msg.settings); sendResponse({ ok: true }); break;
      case "export":       sendResponse(await exportData()); break;
      case "import":       sendResponse(await importData(msg.data, msg.replace)); break;
      default:             sendResponse({ error: "unknown message" });
    }
  })();
  return true;
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "open-launcher") chrome.action.openPopup();
});

chrome.runtime.onInstalled.addListener(async () => {
  await migrateLegacy().catch(() => {});
  rebuildMenus();
});
chrome.runtime.onStartup.addListener(() => rebuildMenus());
