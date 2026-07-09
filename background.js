const MENU_ADD_PAGE = "add-page-to-reading-list";
const MENU_ADD_LINK = "add-link-to-reading-list";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ADD_PAGE,
    title: "Add this page to Reading List",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: MENU_ADD_LINK,
    title: "Add this link to Reading List",
    contexts: ["link"]
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  await openSidePanel(tab);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_ADD_LINK && info.linkUrl) {
    await saveReadingListEntry({
      url: info.linkUrl,
      title: info.linkUrl,
      hasBeenRead: false
    });
    await openSidePanel(tab);
    return;
  }

  if (info.menuItemId === MENU_ADD_PAGE && tab?.url) {
    await saveReadingListEntry({
      url: tab.url,
      title: tab.title || tab.url,
      hasBeenRead: false
    });
    await openSidePanel(tab);
  }
});

async function openSidePanel(tab) {
  if (typeof tab?.windowId !== "number") return;

  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.warn("Could not open side panel.", error);
  }
}

async function saveReadingListEntry(entry) {
  if (!isReadableUrl(entry.url)) return;

  const matches = await chrome.readingList.query({ url: entry.url });
  if (matches.length > 0) {
    await chrome.readingList.updateEntry({
      url: entry.url,
      title: entry.title,
      hasBeenRead: false
    });
    return;
  }

  await chrome.readingList.addEntry(entry);
}

function isReadableUrl(value) {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}
