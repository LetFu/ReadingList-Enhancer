const METADATA_KEY = "readingListEnhancerMetadataV1";
const data = globalThis.ReadingListData;

const state = {
  entries: [],
  editingEntry: null,
  filter: "all",
  query: "",
  sortField: "creationTime",
  sortOrder: "desc",
  tagFilter: "",
  tagsByUrl: {}
};

const elements = {
  addCurrent: document.getElementById("add-current"),
  currentActions: document.getElementById("current-actions"),
  exportButton: document.getElementById("export"),
  exportCancel: document.getElementById("export-cancel"),
  exportDialog: document.getElementById("export-dialog"),
  exportForm: document.getElementById("export-form"),
  exportScopeAllLabel: document.getElementById("export-scope-all-label"),
  exportScopeFiltered: document.getElementById("export-scope-filtered"),
  exportScopeFilteredLabel: document.getElementById("export-scope-filtered-label"),
  exportSubmit: document.getElementById("export-submit"),
  exportSummary: document.getElementById("export-summary"),
  importButton: document.getElementById("import"),
  importFile: document.getElementById("import-file"),
  list: document.getElementById("list"),
  markCurrent: document.getElementById("mark-current"),
  progressBar: document.getElementById("progress-bar"),
  progressText: document.getElementById("progress-text"),
  quickTags: document.getElementById("quick-tags"),
  refresh: document.getElementById("refresh"),
  removeCurrent: document.getElementById("remove-current"),
  search: document.getElementById("search"),
  segments: document.querySelectorAll(".segment"),
  sort: document.getElementById("sort"),
  stats: document.getElementById("stats"),
  status: document.getElementById("status"),
  tagCancel: document.getElementById("tag-cancel"),
  tagDialog: document.getElementById("tag-dialog"),
  tagDialogTitle: document.getElementById("tag-dialog-title"),
  tagFilter: document.getElementById("tag-filter"),
  tagForm: document.getElementById("tag-form"),
  tagInput: document.getElementById("tag-input"),
  tagOptions: document.getElementById("tag-options"),
  template: document.getElementById("entry-template"),
  visibleCount: document.getElementById("visible-count")
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await refreshAll();
});

function bindEvents() {
  elements.addCurrent.addEventListener("click", addCurrentPage);
  elements.markCurrent.addEventListener("click", markCurrentPage);
  elements.removeCurrent.addEventListener("click", removeCurrentPage);
  elements.exportButton.addEventListener("click", openExportDialog);
  elements.exportCancel.addEventListener("click", () => elements.exportDialog.close());
  elements.exportForm.addEventListener("submit", exportSelected);
  elements.importButton.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", importJson);
  elements.refresh.addEventListener("click", refreshAll);

  elements.search.addEventListener("input", () => {
    state.query = elements.search.value.trim().toLowerCase();
    render();
  });

  elements.sort.addEventListener("change", () => {
    const [field, order] = elements.sort.value.split(":");
    state.sortField = field;
    state.sortOrder = order;
    render();
  });

  elements.tagFilter.addEventListener("change", () => {
    state.tagFilter = elements.tagFilter.value;
    render();
  });

  elements.tagCancel.addEventListener("click", () => {
    elements.tagDialog.close();
  });

  elements.tagForm.addEventListener("submit", saveCurrentTags);

  for (const segment of elements.segments) {
    segment.addEventListener("click", () => {
      state.filter = segment.dataset.filter;
      updateSegments();
      render();
    });
  }

  chrome.readingList.onEntryAdded.addListener(refreshAll);
  chrome.readingList.onEntryRemoved.addListener(refreshAll);
  chrome.readingList.onEntryUpdated.addListener(refreshAll);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[METADATA_KEY]) {
      state.tagsByUrl = data.normalizeTagsByUrl(changes[METADATA_KEY].newValue?.tagsByUrl);
      render();
    }
  });
  chrome.tabs?.onActivated?.addListener(updateAddCurrentState);
  chrome.tabs?.onUpdated?.addListener((_tabId, changeInfo) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
      updateAddCurrentState();
    }
  });
}

async function refreshAll() {
  setStatus("");
  const [entries, tagsByUrl] = await Promise.all([
    chrome.readingList.query({}),
    loadTagsByUrl()
  ]);
  state.entries = entries;
  state.tagsByUrl = tagsByUrl;
  render();
  await updateAddCurrentState();
}

function render() {
  const visibleEntries = getVisibleEntries();

  updateStats(visibleEntries.length);
  updateTagFilterOptions();
  updateQuickTags();

  elements.list.replaceChildren();

  if (visibleEntries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = state.entries.length === 0
      ? "No saved pages yet."
      : "No matching pages.";
    elements.list.append(empty);
    return;
  }

  for (const entry of visibleEntries) {
    elements.list.append(renderEntry(entry));
  }
}

function renderEntry(entry) {
  const fragment = elements.template.content.cloneNode(true);
  const article = fragment.querySelector(".entry");
  const stateDot = fragment.querySelector(".entry-state");
  const title = fragment.querySelector(".entry-title");
  const url = fragment.querySelector(".entry-url");
  const time = fragment.querySelector(".entry-time");
  const tags = fragment.querySelector(".entry-tags");
  const mark = fragment.querySelector(".mark");
  const editTags = fragment.querySelector(".edit-tags");
  const deleteButton = fragment.querySelector(".delete");

  article.classList.toggle("read", entry.hasBeenRead);
  stateDot.title = entry.hasBeenRead ? "Read" : "Unread";
  title.href = entry.url;
  title.textContent = entry.title || entry.url;
  url.textContent = entry.url;
  time.textContent = formatTime(entry);
  renderTags(tags, state.tagsByUrl[entry.url] || []);

  mark.textContent = entry.hasBeenRead ? "Mark unread" : "Mark read";
  mark.addEventListener("click", async () => {
    await chrome.readingList.updateEntry({
      url: entry.url,
      hasBeenRead: !entry.hasBeenRead
    });
  });

  editTags.addEventListener("click", () => {
    openTagDialog(entry);
  });

  deleteButton.addEventListener("click", async () => {
    await chrome.readingList.removeEntry({ url: entry.url });
    await removeTags(entry.url);
  });

  return fragment;
}

function getVisibleEntries() {
  return state.entries
    .filter(matchesFilter)
    .filter(matchesTagFilter)
    .filter(matchesQuery)
    .toSorted(compareEntries);
}

function matchesFilter(entry) {
  if (state.filter === "read") return entry.hasBeenRead;
  if (state.filter === "unread") return !entry.hasBeenRead;
  return true;
}

function matchesQuery(entry) {
  if (!state.query) return true;

  const title = (entry.title || "").toLowerCase();
  const url = entry.url.toLowerCase();
  const tags = state.tagsByUrl[entry.url] || [];
  return title.includes(state.query)
    || url.includes(state.query)
    || tags.some((tag) => tag.includes(state.query));
}

function matchesTagFilter(entry) {
  if (!state.tagFilter) return true;
  return (state.tagsByUrl[entry.url] || []).includes(state.tagFilter);
}

function compareEntries(left, right) {
  const leftValue = left[state.sortField] || 0;
  const rightValue = right[state.sortField] || 0;
  return state.sortOrder === "desc"
    ? rightValue - leftValue
    : leftValue - rightValue;
}

function updateStats(visibleCount) {
  const read = state.entries.filter((entry) => entry.hasBeenRead).length;
  const unread = state.entries.length - read;
  const readPercent = state.entries.length === 0
    ? 0
    : Math.round((read / state.entries.length) * 100);

  elements.stats.textContent = `${state.entries.length} total · ${unread} unread · ${read} read`;
  elements.progressBar.style.width = `${readPercent}%`;
  elements.progressText.textContent = `${readPercent}% read`;
  elements.visibleCount.textContent = state.entries.length === 0
    ? "No pages"
    : `Showing ${visibleCount} of ${state.entries.length}`;
}

function updateTagFilterOptions() {
  const availableTags = getAvailableTags();
  if (state.tagFilter && !availableTags.includes(state.tagFilter)) {
    state.tagFilter = "";
  }

  const options = [new Option("All tags", "")];
  for (const tag of availableTags) {
    options.push(new Option(`#${tag}`, tag));
  }

  elements.tagFilter.replaceChildren(...options);
  elements.tagFilter.value = state.tagFilter;
}

function getAvailableTags() {
  const tags = new Set();
  for (const entry of state.entries) {
    for (const tag of state.tagsByUrl[entry.url] || []) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort((left, right) => left.localeCompare(right));
}

function updateQuickTags() {
  elements.quickTags.replaceChildren();

  for (const tag of getAvailableTags().slice(0, 4)) {
    const button = document.createElement("button");
    button.className = "quick-tag";
    button.type = "button";
    button.textContent = `#${tag}`;
    button.classList.toggle("active", state.tagFilter === tag);
    button.addEventListener("click", () => {
      state.tagFilter = state.tagFilter === tag ? "" : tag;
      render();
    });
    elements.quickTags.append(button);
  }
}

function updateSegments() {
  for (const segment of elements.segments) {
    segment.classList.toggle("active", segment.dataset.filter === state.filter);
  }
}

function renderTags(container, tags) {
  container.replaceChildren();

  for (const tag of tags) {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = `#${tag}`;
    container.append(chip);
  }
}

function openTagDialog(entry) {
  state.editingEntry = entry;
  elements.tagDialogTitle.textContent = entry.title || entry.url;
  elements.tagInput.value = "";
  renderTagOptions(entry);
  elements.tagDialog.showModal();
  elements.tagInput.focus();
}

function renderTagOptions(entry) {
  const selectedTags = new Set(state.tagsByUrl[entry.url] || []);
  const availableTags = getAvailableTags();

  elements.tagOptions.replaceChildren();
  if (availableTags.length === 0) {
    const empty = document.createElement("p");
    empty.className = "tag-options-empty";
    empty.textContent = "No existing tags.";
    elements.tagOptions.append(empty);
    return;
  }

  for (const tag of availableTags) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");

    label.className = "tag-option";
    checkbox.type = "checkbox";
    checkbox.value = tag;
    checkbox.checked = selectedTags.has(tag);
    label.classList.toggle("selected", checkbox.checked);
    checkbox.addEventListener("change", () => {
      label.classList.toggle("selected", checkbox.checked);
    });
    text.textContent = `#${tag}`;

    label.append(checkbox, text);
    elements.tagOptions.append(label);
  }
}

async function saveCurrentTags(event) {
  event.preventDefault();
  if (!state.editingEntry) return;

  const url = state.editingEntry.url;
  const selectedTags = Array.from(
    elements.tagOptions.querySelectorAll("input:checked"),
    (checkbox) => checkbox.value
  );
  const newTags = elements.tagInput.value.split(",");
  const tags = data.normalizeTags([...selectedTags, ...newTags]);
  const tagsByUrl = { ...state.tagsByUrl };

  if (tags.length > 0) {
    tagsByUrl[url] = tags;
  } else {
    delete tagsByUrl[url];
  }

  await saveTagsByUrl(tagsByUrl);
  elements.tagDialog.close();
  setStatus("Tags saved.");
}

async function loadTagsByUrl() {
  const result = await chrome.storage.local.get(METADATA_KEY);
  return data.normalizeTagsByUrl(result[METADATA_KEY]?.tagsByUrl);
}

async function saveTagsByUrl(tagsByUrl) {
  state.tagsByUrl = data.normalizeTagsByUrl(tagsByUrl);
  await chrome.storage.local.set({
    [METADATA_KEY]: {
      tagsByUrl: state.tagsByUrl
    }
  });
  render();
}

async function removeTags(url) {
  if (!state.tagsByUrl[url]) return;

  const tagsByUrl = { ...state.tagsByUrl };
  delete tagsByUrl[url];
  await saveTagsByUrl(tagsByUrl);
}

async function addCurrentPage() {
  const tab = await getCurrentTab();
  if (!isUsableTab(tab)) {
    setStatus("Current page cannot be added.", "error");
    return;
  }

  await saveEntry({
    url: tab.url,
    title: tab.title || tab.url,
    hasBeenRead: false
  });
}

async function saveEntry(entry) {
  const existing = await chrome.readingList.query({ url: entry.url });
  if (existing.length > 0) {
    setStatus("Page is already saved.");
    await updateAddCurrentState();
    return;
  }

  await chrome.readingList.addEntry(entry);
  setStatus("Page added.");
  await updateAddCurrentState();
}

async function markCurrentPage() {
  const entry = await getCurrentReadingListEntry();
  if (!entry) return;

  await chrome.readingList.updateEntry({
    url: entry.url,
    hasBeenRead: !entry.hasBeenRead
  });
  setStatus(entry.hasBeenRead ? "Page marked unread." : "Page marked read.");
}

async function removeCurrentPage() {
  const entry = await getCurrentReadingListEntry();
  if (!entry) return;

  await chrome.readingList.removeEntry({ url: entry.url });
  await removeTags(entry.url);
  setStatus("Page removed.");
  await updateAddCurrentState();
}

function openExportDialog() {
  const visibleCount = getVisibleEntries().length;
  elements.exportScopeAllLabel.textContent = `All entries (${state.entries.length})`;
  elements.exportScopeFilteredLabel.textContent = `Current results (${visibleCount})`;
  elements.exportScopeFiltered.disabled = visibleCount === 0;
  elements.exportSummary.textContent = visibleCount === state.entries.length
    ? "Export the full reading list or choose URL-only format."
    : "Current results follow search, read status, tag filter, and sort order.";
  elements.exportSubmit.disabled = state.entries.length === 0;
  elements.exportSubmit.textContent = state.entries.length === 0
    ? "No entries"
    : "Export";
  elements.exportDialog.showModal();
}

function exportSelected(event) {
  event.preventDefault();
  const form = new FormData(elements.exportForm);
  const scope = form.get("export-scope");
  const format = form.get("export-format");
  const entries = scope === "filtered" ? getVisibleEntries() : state.entries;

  if (entries.length === 0) {
    setStatus("No matching pages to export.", "error");
    return;
  }

  if (format === "urls") {
    exportUrls(entries, scope === "filtered");
  } else {
    exportJson(entries, scope === "filtered");
  }
}

function exportJson(entries, filtered) {
  const payload = data.buildExportPayload(entries, state.tagsByUrl);
  const date = new Date().toISOString().slice(0, 10);
  const name = filtered
    ? `readinglist-enhancer-filtered-${date}.json`
    : `readinglist-enhancer-${date}.json`;

  downloadText(
    name,
    "application/json",
    `${JSON.stringify(payload, null, 2)}\n`
  );
  elements.exportDialog.close();
  setStatus(`Exported ${entries.length} ${filtered ? "filtered " : ""}entries.`);
}

function exportUrls(entries, filtered) {
  const date = new Date().toISOString().slice(0, 10);
  const text = data.buildUrlListExport(entries);
  const name = filtered
    ? `readinglist-enhancer-filtered-urls-${date}.txt`
    : `readinglist-enhancer-urls-${date}.txt`;

  downloadText(
    name,
    "text/plain",
    text ? `${text}\n` : ""
  );
  elements.exportDialog.close();
  setStatus(`Exported ${entries.length} ${filtered ? "filtered " : ""}URLs.`);
}

function downloadText(filename, type, text) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function importJson(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;

  try {
    const payload = data.normalizeImportPayload(await file.text());
    if (payload.entries.length === 0) {
      setStatus("No valid entries found.", "error");
      return;
    }

    const currentEntries = await chrome.readingList.query({});
    const plan = data.buildImportPlan(payload, currentEntries, await loadTagsByUrl());

    for (const entry of plan.entriesToAdd) {
      await chrome.readingList.addEntry(entry);
    }

    await saveTagsByUrl(plan.tagsByUrl);
    state.entries = await chrome.readingList.query({});
    render();
    setStatus(`Imported ${plan.entriesToAdd.length} new pages and merged tags.`);
  } catch (error) {
    setStatus(error.message || "Import failed.", "error");
  }
}

async function updateAddCurrentState() {
  const tab = await getCurrentTab();
  const entry = isUsableTab(tab) ? await getCurrentReadingListEntry(tab) : null;
  const actions = data.getCurrentPageActions(entry, isUsableTab(tab));

  elements.addCurrent.hidden = !actions.add.visible;
  elements.addCurrent.disabled = Boolean(actions.add.disabled);
  elements.addCurrent.textContent = actions.add.label || "";
  elements.currentActions.hidden = !actions.saved.visible;
  elements.markCurrent.textContent = actions.saved.markLabel || "";
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getCurrentReadingListEntry(tab) {
  const currentTab = tab || await getCurrentTab();
  if (!isUsableTab(currentTab)) return null;
  return (await chrome.readingList.query({ url: currentTab.url }))[0] || null;
}

function isUsableTab(tab) {
  if (!tab?.url) return false;

  try {
    return ["http:", "https:"].includes(new URL(tab.url).protocol);
  } catch {
    return false;
  }
}

function formatTime(entry) {
  const created = new Date(entry.creationTime).toLocaleString();
  const updated = new Date(entry.lastUpdateTime).toLocaleString();
  return `Added ${created} · Updated ${updated}`;
}

function setStatus(message, type = "") {
  elements.status.textContent = message;
  elements.status.dataset.type = type;
}
