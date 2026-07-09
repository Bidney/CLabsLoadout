const openIn = document.getElementById("openIn");
const status = document.getElementById("status");
const ioStatus = document.getElementById("ioStatus");
let statusTimer = null;

async function load() {
  const settings = await chrome.runtime.sendMessage({ type: "getSettings" });
  openIn.value = (settings && settings.openIn) || "newWindow";
}

openIn.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({ type: "saveSettings", settings: { openIn: openIn.value } });
  status.style.visibility = "visible";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.style.visibility = "hidden"; }, 1200);
});

function setIoStatus(text, ok) {
  ioStatus.textContent = text;
  ioStatus.className = ok ? "ok" : "err";
}

document.getElementById("exportBtn").addEventListener("click", async () => {
  const data = await chrome.runtime.sendMessage({ type: "export" });
  if (!data || data.error) { setIoStatus(data?.error || "Export failed.", false); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `clabs-loadout-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setIoStatus(`Exported ${data.workspaces.length} loadouts.`, true);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    setIoStatus("That file is not valid JSON.", false);
    return;
  }

  const replace = document.getElementById("replaceOnImport").checked;
  if (replace && !confirm("Replace ALL existing loadouts with the file contents?")) return;

  const res = await chrome.runtime.sendMessage({ type: "import", data, replace });
  if (res?.error) setIoStatus(res.error, false);
  else setIoStatus(`Imported ${res.count} loadouts.`, true);
});

load();
