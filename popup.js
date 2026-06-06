const send = (msg) => chrome.runtime.sendMessage(msg);
const $ = (id) => document.getElementById(id);

let workspaces = [];
let editingId = null; // null = creating new

async function render() {
  workspaces = await send({ type: "list" });
  const items = $("items");
  items.innerHTML = "";

  if (workspaces.length === 0) {
    items.innerHTML = `<div class="empty">No loadouts yet. Create one below.</div>`;
  }

  workspaces.forEach(ws => {
    const row = document.createElement("div");
    row.className = "ws";
    row.innerHTML = `
      <span class="dot" style="background:${cssColor(ws.color)}"></span>
      <span class="name">${escapeHtml(ws.name)}</span>
      <button class="open">Open</button>
      <button class="close">Close</button>
      <button class="edit">✎</button>`;
    row.querySelector(".open").onclick  = () => send({ type: "open",  ws });
    row.querySelector(".close").onclick = () => send({ type: "close", ws });
    row.querySelector(".edit").onclick  = () => openEditor(ws);
    items.appendChild(row);
  });
}

function showEditor(show) {
  $("editor").classList.toggle("show", show);
  $("list").classList.toggle("hide", show);
}

function openEditor(ws) {
  editingId = ws ? ws.id : null;
  $("editorTitle").textContent = ws ? "Edit loadout" : "New loadout";
  $("fName").value  = ws ? ws.name : "";
  $("fColor").value = ws ? (ws.color || "blue") : "blue";
  $("fUrls").value  = ws ? ws.urls.join("\n") : "";
  $("delBtn").style.display = ws ? "block" : "none";
  showEditor(true);
}

$("addBtn").onclick    = () => openEditor(null);
$("cancelBtn").onclick = () => showEditor(false);
$("optionsLink").onclick = () => chrome.runtime.openOptionsPage();

$("saveBtn").onclick = async () => {
  const name  = $("fName").value.trim();
  const color = $("fColor").value;
  const urls  = $("fUrls").value.split("\n").map(s => s.trim()).filter(Boolean);
  if (!name) { $("fName").focus(); return; }

  if (editingId) {
    const ws = workspaces.find(w => w.id === editingId);
    Object.assign(ws, { name, color, urls });
  } else {
    workspaces.push({ id: crypto.randomUUID(), name, color, urls });
  }
  await send({ type: "save", list: workspaces });
  showEditor(false);
  render();
};

$("delBtn").onclick = async () => {
  workspaces = workspaces.filter(w => w.id !== editingId);
  await send({ type: "save", list: workspaces });
  showEditor(false);
  render();
};

function cssColor(c) {
  const map = { blue:"#3b82f6", red:"#ef4444", green:"#22c55e", yellow:"#eab308",
    purple:"#a855f7", cyan:"#06b6d4", orange:"#f97316", pink:"#ec4899", grey:"#9ca3af" };
  return map[c] || map.blue;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&#60;",">":"&#62;",'"':"&quot;","'":"&#39;" }[c]));
}

render();