const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const TAG_LABELS = { spitup: "🤮", reflux: "🤢", crying: "😢" };

// ---- Tab bar ----
const tabButtons = Array.from(document.querySelectorAll(".tab-bar-btn"));
const tabScreens = {
  log: document.getElementById("tab-log"),
  history: document.getElementById("tab-history"),
};

function switchTab(tab) {
  tabButtons.forEach((btn) => btn.classList.toggle("selected", btn.dataset.tab === tab));
  Object.entries(tabScreens).forEach(([name, el]) => el.classList.toggle("hidden", name !== tab));
  if (tab === "history") {
    showHistoryList();
    loadHistory();
  }
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

// ---- Shared helpers ----
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatClockTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Log tab (quick add) ----
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");
const startTimeInput = document.getElementById("start-time-input");
const saveBtn = document.getElementById("save-btn");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

let quickAddSide = null;

function setQuickAddSide(side) {
  quickAddSide = side;
  leftBtn.classList.toggle("selected", side === "left");
  rightBtn.classList.toggle("selected", side === "right");
}

function resetQuickAddForm() {
  setQuickAddSide(null);
  startTimeInput.value = toDatetimeLocalValue(new Date());
  formError.classList.add("hidden");
}

async function logFeed() {
  formSuccess.classList.add("hidden");

  if (!quickAddSide) {
    formError.textContent = "Pick a side before logging.";
    formError.classList.remove("hidden");
    return;
  }
  if (!startTimeInput.value) {
    formError.textContent = "Pick a start time before logging.";
    formError.classList.remove("hidden");
    return;
  }

  const payload = {
    side: quickAddSide,
    start_time: new Date(startTimeInput.value).toISOString(),
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "Logging...";

  const { error } = await supabaseClient.from("feedings").insert(payload);

  saveBtn.disabled = false;
  saveBtn.textContent = "Log Feed";

  if (error) {
    formError.textContent = "Couldn't save: " + error.message;
    formError.classList.remove("hidden");
    return;
  }

  formError.classList.add("hidden");
  const loggedTime = formatClockTime(new Date(payload.start_time));
  formSuccess.textContent = `Logged ${quickAddSide} at ${loggedTime}`;
  formSuccess.classList.remove("hidden");
  resetQuickAddForm();
}

leftBtn.addEventListener("click", () => setQuickAddSide("left"));
rightBtn.addEventListener("click", () => setQuickAddSide("right"));
saveBtn.addEventListener("click", logFeed);

// ---- History tab ----
const historyListView = document.getElementById("history-list-view");
const historyEditView = document.getElementById("history-edit-view");
const historyList = document.getElementById("history-list");
const backBtn = document.getElementById("back-btn");

const editLeftBtn = document.getElementById("edit-left-btn");
const editRightBtn = document.getElementById("edit-right-btn");
const editStartTimeInput = document.getElementById("edit-start-time-input");
const editTagButtons = Array.from(document.querySelectorAll("#history-edit-view .tag-btn"));
const editNotesInput = document.getElementById("edit-notes-input");
const editSaveBtn = document.getElementById("edit-save-btn");
const deleteBtn = document.getElementById("delete-btn");
const editFormError = document.getElementById("edit-form-error");

let editingId = null;
let editingSide = null;
let editingTags = new Set();

function setEditingSide(side) {
  editingSide = side;
  editLeftBtn.classList.toggle("selected", side === "left");
  editRightBtn.classList.toggle("selected", side === "right");
}

function toggleEditingTag(tag) {
  if (editingTags.has(tag)) {
    editingTags.delete(tag);
  } else {
    editingTags.add(tag);
  }
  renderEditingTags();
}

function renderEditingTags() {
  editTagButtons.forEach((btn) => {
    btn.classList.toggle("selected", editingTags.has(btn.dataset.tag));
  });
}

function showHistoryList() {
  historyListView.classList.remove("hidden");
  historyEditView.classList.add("hidden");
}

function showHistoryEdit(feed) {
  editingId = feed.id;
  setEditingSide(feed.side);
  editingTags = new Set(feed.tags || []);
  renderEditingTags();
  editNotesInput.value = feed.notes || "";
  editStartTimeInput.value = toDatetimeLocalValue(new Date(feed.start_time));
  editFormError.classList.add("hidden");
  historyListView.classList.add("hidden");
  historyEditView.classList.remove("hidden");
}

async function saveFeedEdits() {
  if (!editingSide) {
    editFormError.textContent = "Pick a side before saving.";
    editFormError.classList.remove("hidden");
    return;
  }
  if (!editStartTimeInput.value) {
    editFormError.textContent = "Pick a start time before saving.";
    editFormError.classList.remove("hidden");
    return;
  }

  const payload = {
    side: editingSide,
    start_time: new Date(editStartTimeInput.value).toISOString(),
    tags: Array.from(editingTags),
    notes: editNotesInput.value.trim() || null,
  };

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = "Saving...";

  const { error } = await supabaseClient.from("feedings").update(payload).eq("id", editingId);

  editSaveBtn.disabled = false;
  editSaveBtn.textContent = "Save Changes";

  if (error) {
    editFormError.textContent = "Couldn't save: " + error.message;
    editFormError.classList.remove("hidden");
    return;
  }

  showHistoryList();
  loadHistory();
}

async function deleteFeedEntry() {
  if (!editingId) return;
  if (!confirm("Delete this feed entry?")) return;

  const { error } = await supabaseClient.from("feedings").delete().eq("id", editingId);
  if (error) {
    editFormError.textContent = "Couldn't delete: " + error.message;
    editFormError.classList.remove("hidden");
    return;
  }
  showHistoryList();
  loadHistory();
}

function renderHistory(rows) {
  if (!rows || rows.length === 0) {
    historyList.innerHTML = `<p class="history-empty">No feeds logged yet.</p>`;
    return;
  }

  historyList.innerHTML = "";
  rows.forEach((row) => {
    const date = new Date(row.start_time);
    const tagsHtml = (row.tags || []).map((tag) => TAG_LABELS[tag] || "").join(" ");
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";
    item.innerHTML = `
      <span class="history-dot history-dot--${row.side}"></span>
      <div class="history-details">
        <span class="history-time">${formatClockTime(date)}</span>
        <span class="history-meta">${formatDayLabel(date)} · ${row.side}</span>
        ${tagsHtml ? `<span class="history-tags">${tagsHtml}</span>` : ""}
        ${row.notes ? `<span class="history-notes">${escapeHtml(row.notes)}</span>` : ""}
      </div>
    `;
    item.addEventListener("click", () => showHistoryEdit(row));
    historyList.appendChild(item);
  });
}

async function loadHistory() {
  const { data, error } = await supabaseClient
    .from("feedings")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(50);

  if (error) {
    historyList.innerHTML = `<p class="history-empty">Couldn't load history: ${error.message}</p>`;
    return;
  }

  renderHistory(data);
}

editLeftBtn.addEventListener("click", () => setEditingSide("left"));
editRightBtn.addEventListener("click", () => setEditingSide("right"));
editTagButtons.forEach((btn) => btn.addEventListener("click", () => toggleEditingTag(btn.dataset.tag)));
editSaveBtn.addEventListener("click", saveFeedEdits);
deleteBtn.addEventListener("click", deleteFeedEntry);
backBtn.addEventListener("click", showHistoryList);

supabaseClient
  .channel("feedings-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "feedings" }, () => {
    if (!tabScreens.history.classList.contains("hidden") && !historyListView.classList.contains("hidden")) {
      loadHistory();
    }
  })
  .subscribe();

resetQuickAddForm();
