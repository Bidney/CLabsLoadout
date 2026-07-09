const send = (msg) => chrome.runtime.sendMessage(msg);
const $ = (id) => document.getElementById(id);

let workspaces = [];
let liveMap = {};
let editingId = null; // null = creating new
let dragId = null;

function faviconUrl(pageUrl) {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=16`;
}

function showError(text) {
  const box = $("errorBox");
  box.textContent = text;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 4000);
}

async function render() {
  const res = (await send({ type: "list" })) || {};
  workspaces = res.workspaces || [];
  liveMap = res.live || {};
  const items = $("items");
  items.textContent = "";

  if (workspaces.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No loadouts yet. Create one below, or save this window as one.";
    items.appendChild(empty);
  }

  workspaces.forEach(ws => {
    const isLive = Boolean(liveMap[ws.id]);
    const row = document.createElement("div");
    row.className = "ws";
    row.draggable = true;
    row.dataset.id = ws.id;

    const dot = document.createElement("span");
    dot.className = "dot" + (isLive ? " live" : "");
    dot.style.background = cssColor(ws.color);
    dot.title = isLive ? "Open now" : "";
    row.appendChild(dot);

    const firstUrl = (ws.urls || [])[0];
    if (firstUrl) {
      const fav = document.createElement("img");
      fav.className = "fav";
      fav.src = faviconUrl(firstUrl);
      fav.alt = "";
      row.appendChild(fav);
    }

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = ws.name;
    name.title = ws.name;
    row.appendChild(name);

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = (ws.urls || []).length;
    count.title = `${(ws.urls || []).length} tabs`;
    row.appendChild(count);

    const open = document.createElement("button");
    open.className = "open";
    open.textContent = isLive ? "Focus" : "Open";
    open.onclick = async () => {
      const r = await send({ type: "open", ws });
      if (r?.error) showError(r.error); else window.close();
    };
    row.appendChild(open);

    if (isLive) {
      const sync = document.createElement("button");
      sync.className = "sync";
      sync.textContent = "⟳";
      sync.title = "Update this loadout from its open tabs";
      sync.onclick = async () => {
        const r = await send({ type: "syncBack", id: ws.id });
        if (r?.error) showError(r.error);
        render();
      };
      row.appendChild(sync);

      const close = document.createElement("button");
      close.className = "close";
      close.textContent = "Close";
      close.onclick = async () => {
        const r = await send({ type: "close", ws });
        if (r?.error) showError(r.error);
        render();
      };
      row.appendChild(close);
    }

    const edit = document.createElement("button");
    edit.className = "edit";
    edit.textContent = "✎";
    edit.title = "Edit";
    edit.onclick = () => openEditor(ws);
    row.appendChild(edit);

    // drag to reorder
    row.addEventListener("dragstart", () => { dragId = ws.id; row.classList.add("dragging"); });
    row.addEventListener("dragend", () => { dragId = null; row.classList.remove("dragging"); });
    row.addEventListener("dragover", (e) => { e.preventDefault(); row.classList.add("dropTarget"); });
    row.addEventListener("dragleave", () => row.classList.remove("dropTarget"));
    row.addEventListener("drop", async (e) => {
      e.preventDefault();
      row.classList.remove("dropTarget");
      if (!dragId || dragId === ws.id) return;
      const ids = workspaces.map(w => w.id).filter(id => id !== dragId);
      ids.splice(ids.indexOf(ws.id), 0, dragId);
      await send({ type: "reorder", ids });
      render();
    });

    items.appendChild(row);
  });
}

function showEditor(show) {
  $("editor").classList.toggle("show", show);
  $("list").classList.toggle("hide", show);
  $("editorError").classList.remove("show");
}

function openEditor(ws, prefill) {
  editingId = ws ? ws.id : null;
  $("editorTitle").textContent = ws ? "Edit loadout" : "New loadout";
  $("fName").value  = ws ? ws.name : (prefill?.name || "");
  $("fColor").value = ws ? (ws.color || "blue") : "blue";
  $("fUrls").value  = (ws ? ws.urls : prefill?.urls || []).join("\n");
  $("delBtn").style.display = ws ? "block" : "none";
  showEditor(true);
  $("fName").focus();
}

$("addBtn").onclick    = () => openEditor(null);
$("cancelBtn").onclick = () => showEditor(false);
$("optionsLink").onclick = () => chrome.runtime.openOptionsPage();

$("captureBtn").onclick = async () => {
  const r = await send({ type: "capture" });
  if (r?.error) { showError(r.error); return; }
  const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
  openEditor(null, { name: `Window ${today}`, urls: r.urls });
};

$("saveBtn").onclick = async () => {
  const name  = $("fName").value.trim();
  const color = $("fColor").value;
  const urls  = $("fUrls").value.split("\n").map(s => s.trim()).filter(Boolean);
  if (!name) { $("fName").focus(); return; }

  const ws = editingId
    ? { ...workspaces.find(w => w.id === editingId), name, color, urls }
    : { id: crypto.randomUUID(), name, color, urls };

  const r = await send({ type: "upsert", ws });
  if (r?.error) {
    const box = $("editorError");
    box.textContent = r.error;
    box.classList.add("show");
    return;
  }
  showEditor(false);
  render();
};

$("delBtn").onclick = async () => {
  await send({ type: "remove", id: editingId });
  showEditor(false);
  render();
};

function cssColor(c) {
  const map = { blue:"#3b82f6", red:"#ef4444", green:"#22c55e", yellow:"#eab308",
    purple:"#a855f7", cyan:"#06b6d4", orange:"#f97316", pink:"#ec4899", grey:"#9ca3af" };
  return map[c] || map.blue;
}

render();
