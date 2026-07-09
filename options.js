const openIn = document.getElementById("openIn");
const status = document.getElementById("status");
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

load();
