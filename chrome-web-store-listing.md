# CLabs Loadout - Chrome Web Store submission

## Product details

**Name**

CLabs Loadout - Tab Group Workspaces

**Summary**

Save tabs as named workspaces, open them in color-coded tab groups, and restore your workflow with one click.

**Category**

Productivity

**Language**

English

**Detailed description**

Turn repeatable browser setups into one-click tab-group workspaces.

CLabs Loadout saves a collection of URLs as a named, color-coded loadout. Open the entire set as one Chrome tab group whenever you need it, then close the group just as quickly when you are done.

Great for development environments, cloud consoles, incident response, research, client projects, study sessions, and any workflow that starts with the same set of tabs.

KEY FEATURES

- Save every useful tab in the current window as a new loadout.
- Open a loadout in a new window or the current window.
- Focus an already-open loadout instead of creating duplicates.
- Update a saved loadout from the tabs currently open in its group.
- Close only the tab group opened by CLabs Loadout.
- Type "lo" and a space in Chrome's address bar to find and open a loadout.
- Add the current page or a link through the right-click menu.
- Drag loadouts into the order that suits your workflow.
- Import and export loadouts as readable JSON backups.
- Use Ctrl+Shift+L for fast access.
- Automatic light and dark themes.

PRIVATE BY DESIGN

CLabs Loadout makes no network requests, uses no analytics or advertising, and sends nothing to the developer. Saved loadouts remain in Chrome storage and can follow your signed-in Chrome profile through Chrome sync.

CLabs Loadout is free. An optional support link is available on the Settings page and does not affect any feature.

## Store URLs

**Homepage**

https://github.com/Bidney/CLabsLoadout

**Support**

https://github.com/Bidney/CLabsLoadout/issues

**Privacy policy**

https://github.com/Bidney/CLabsLoadout/blob/main/PRIVACY.md

## Single purpose

CLabs Loadout lets users save collections of browser tabs as named workspaces and reopen or manage those collections as Chrome tab groups.

## Permission justifications

**tabGroups**

Required to create color-coded tab groups for loadouts, set their names and colors, detect whether a loadout group is still open, and focus or close the group at the user's request.

**tabs**

Required to read the URLs of tabs only when the user saves a window or updates an open loadout; create tabs when opening a saved loadout; focus an existing loadout; and close only the tabs belonging to a loadout opened by the extension.

**storage**

Required to store loadout names, colors, URL lists, order, and the user's open-location preference. Saved data uses Chrome sync storage; temporary live-group identifiers use Chrome session storage.

**contextMenus**

Required to provide user-triggered right-click actions for creating a loadout from the current page or link and adding that page or link to an existing loadout.

**favicon**

Required to display Chrome-cached favicons beside saved loadouts using Chrome's built-in favicon endpoint. The extension does not fetch icons from external servers.

**Remote code**

No. All JavaScript is included in the extension package. The extension does not download or execute remote code and makes no external network requests.

## Privacy practices answers

- Personally identifiable information: not collected
- Health information: not collected
- Financial and payment information: not collected
- Authentication information: not collected
- Personal communications: not collected
- Location: not collected
- Web history: not collected or transmitted to the developer; URLs selected by the user are stored only in Chrome storage to provide the loadout feature
- User activity: not collected or transmitted to the developer
- Website content: not collected or transmitted to the developer
- Data sold to third parties: no
- Data used or transferred for purposes unrelated to the extension's single purpose: no
- Data used or transferred for creditworthiness or lending: no

## Distribution

Public. Select all regions unless a deliberate regional restriction is wanted.

## Certification checklist

- The extension's data use complies with the Chrome Web Store User Data Policy.
- The extension's use of information is limited to its disclosed single purpose.
- No remote code is used.
- No functionality requires payment. The Settings page contains a clearly optional external donation link; donating does not unlock or change any feature. No ads, analytics, or affiliate links are present.
- Test the upload ZIP in a fresh Chrome profile before submission.

## Zero-budget launch plan

### Positioning

Lead with the outcome: "Your repeatable browser setup, restored as one tab group." Avoid presenting it as a generic bookmark manager. The strongest audiences are developers, cloud and security engineers, researchers, support staff, students, and people who switch between several projects.

### Search phrases to use naturally

Chrome tab groups, save tab groups, tab workspace, restore tabs, browser workspace, project tabs, developer productivity, tab session manager.

Do not repeat keywords unnaturally or add unrelated terms; the store may treat that as metadata spam.

### Launch sequence

1. Publish the store listing and add its final URL near the top of the GitHub README.
2. Create a GitHub release named `v0.2.2 - Chrome Web Store launch` with the main benefits and privacy statement.
3. Share a short, honest demo in communities where self-promotion is permitted: relevant Chrome, productivity, browser-tab, developer-tools, cloud, and cybersecurity communities.
4. Post a 20-30 second screen recording showing: save window, open loadout, focus it, then update it from open tabs.
5. Ask early users for feature feedback, not five-star reviews. Never incentivize reviews.
6. Reply quickly to support issues and use recurring user wording to improve the listing copy.
7. After two weeks, compare store impressions, installs, and retained users; change only the weakest asset or first paragraph so results remain interpretable.

### Ready-to-post launch copy

**GitHub / LinkedIn**

I built CLabs Loadout, a free Chrome extension for people who repeatedly open the same tabs for a project or workflow. Save a set once, then reopen it as a named, color-coded tab group with one click. It can also capture a window, update a loadout from its open tabs, and launch loadouts from the address bar with `lo`. No analytics, ads, accounts, or external network calls. [Chrome Web Store URL]

**Reddit / community post**

Title: I made a private, one-click tab workspace extension for Chrome

I kept reopening the same cloud consoles, repos, dashboards, and docs whenever I changed projects, so I built CLabs Loadout. It saves those URLs as a named loadout and opens them as one Chrome tab group. You can capture a window, update the saved set from its open group, or type `lo` in the address bar to launch one. Everything stays in Chrome storage; there are no analytics or external requests. I would especially appreciate feedback on whether the open/focus/update workflow feels natural. [Chrome Web Store URL] [GitHub URL]

**Short post**

Repeatedly opening the same project tabs? CLabs Loadout saves them as a named workspace and restores them as one color-coded Chrome tab group. Free, open source, and no analytics. [Chrome Web Store URL]
