/* ═══════════════════════════════════════════════════════════════════════════
   CampusFind — app.js
   Frontend logic: tab navigation, API calls, rendering, filtering
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// In production, point this to your deployed Vercel backend URL
// e.g. const API_BASE = "https://campusfind-api.vercel.app";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : ""; // Same origin in production (frontend + backend on Vercel)

// ─── Campus Location Data ────────────────────────────────────────────────────
const CAMPUS_LOCATIONS = {
  "Library": ["Ground Floor", "First Floor", "Study Rooms", "Near Entrance", "Reference Section"],
  "Cafeteria": ["Main Hall", "Food Court", "Seating Area", "Near Vending Machines"],
  "Admin Block": ["Reception", "Ground Floor Corridor", "First Floor", "Offices"],
  "Engineering Block": ["Lab 1 (CS)", "Lab 2 (Electronics)", "Classrooms", "Workshop", "Common Room"],
  "Science Block": ["Physics Lab", "Chemistry Lab", "Biology Lab", "Classrooms", "Corridor"],
  "Sports Complex": ["Ground", "Gymnasium", "Changing Rooms", "Swimming Pool Area"],
  "Hostel Block A": ["Common Room", "Ground Floor Corridor", "First Floor", "Reception"],
  "Hostel Block B": ["Common Room", "Ground Floor Corridor", "First Floor", "Reception"],
  "Parking Lot": ["Main Lot", "Bike Parking", "Near Entry Gate"],
  "Main Gate": ["Entrance", "Security Booth", "Waiting Area"],
};

const CATEGORY_ICONS = {
  "ID Card": "🪪", "Wallet": "👛", "Keys": "🔑", "Electronics": "📱",
  "Books": "📚", "Clothing": "👕", "Bag": "🎒", "Stationery": "✏️",
  "Water Bottle": "🍶", "Other": "📦",
};

// ─── State ───────────────────────────────────────────────────────────────────
let currentItemId = null; // For status modal
let debounceTimer = null;

// ─── Utility Helpers ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str || ""));
  return div.innerHTML;
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show toast-${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

// ─── API Calls ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const { data } = await apiFetch("/api/items/stats");
    document.getElementById("stat-lost").textContent = data.activeLost;
    document.getElementById("stat-found").textContent = data.activeFound;
    document.getElementById("stat-resolved").textContent = data.resolved;
  } catch {
    // Non-critical: silently fail
  }
}

// ─── Render Items ─────────────────────────────────────────────────────────────
function renderItems(items) {
  const grid = document.getElementById("items-grid");
  const meta = document.getElementById("results-meta");

  if (!items || items.length === 0) {
    meta.textContent = "No results";
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No items found</h3>
        <p>Try different filters, or be the first to report!</p>
      </div>`;
    return;
  }

  meta.textContent = `Showing ${items.length} report${items.length !== 1 ? "s" : ""}`;

  grid.innerHTML = items
    .map((item) => {
      const catIcon = CATEGORY_ICONS[item.category] || "📦";
      const typeBadge = item.type === "lost"
        ? `<span class="badge badge-lost"> Lost</span>`
        : `<span class="badge badge-found"> Found</span>`;

      let statusBadge = "";
      if (item.status === "resolved") statusBadge = `<span class="badge badge-resolved"> Resolved</span>`;
      if (item.status === "claimed") statusBadge = `<span class="badge badge-claimed"> Claimed</span>`;

      const reporter = item.reportedBy && item.reportedBy !== "Anonymous"
        ? `by ${escapeHtml(item.reportedBy)}`
        : "Anonymous";

      const contactHtml = item.contactInfo
        ? `<span class="item-meta-chip">📬 ${escapeHtml(item.contactInfo)}</span>`
        : "";

      return `
        <article class="item-card type-${item.type}" data-id="${item._id}">
          <div class="item-card-header">
            <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
            <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
              ${typeBadge}
              ${statusBadge}
            </div>
          </div>
          <div class="item-meta">
            <span class="item-meta-chip">${catIcon} ${escapeHtml(item.category)}</span>
            <span class="item-meta-chip">📍 ${escapeHtml(item.location.building)}</span>
            <span class="item-meta-chip">🗺️ ${escapeHtml(item.location.area)}</span>
            ${contactHtml}
          </div>
          <p class="item-description">${escapeHtml(item.description)}</p>
          <div class="item-footer">
            <span>${reporter} · ${timeAgo(item.createdAt)}</span>
            <div class="item-actions">
              <button
                class="btn btn-outline btn-sm"
                onclick="openStatusModal('${item._id}', '${escapeHtml(item.title)}')"
                title="Update status"
              >✏️ Status</button>
              <button
                class="btn-icon-only"
                onclick="deleteItem('${item._id}', '${escapeHtml(item.title)}')"
                title="Delete report"
              >🗑️</button>
            </div>
          </div>
        </article>`;
    })
    .join("");
}

// ─── Load & Filter Items ──────────────────────────────────────────────────────
async function loadItems() {
  const grid = document.getElementById("items-grid");
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading items…</p></div>`;
  document.getElementById("results-meta").textContent = "Loading…";

  try {
    const search = document.getElementById("search-input").value.trim();
    const type = document.getElementById("filter-type").value;
    const category = document.getElementById("filter-category").value;
    const building = document.getElementById("filter-building").value;

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (building) params.set("building", building);

    const qs = params.toString();
    const { data } = await apiFetch(`/api/items${qs ? "?" + qs : ""}`);
    renderItems(data);
  } catch (err) {
    document.getElementById("results-meta").textContent = "Error loading items";
    document.getElementById("items-grid").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load items</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
    console.error("loadItems error:", err);
  }
}

// ─── Form Submission ──────────────────────────────────────────────────────────
async function submitReport(formEl, feedbackEl, type) {
  const data = Object.fromEntries(new FormData(formEl));

  // Build location object from form fields
  const building = formEl.querySelector('[name="building"]').value;
  const area = formEl.querySelector('[name="area"]').value;

  if (!data.title?.trim() || !data.category || !building || !area || !data.description?.trim()) {
    feedbackEl.className = "form-feedback error";
    feedbackEl.textContent = "⚠️ Please fill in all required fields.";
    return;
  }

  const payload = {
    title: data.title.trim(),
    type,
    category: data.category,
    description: data.description.trim(),
    location: { building, area },
    contactInfo: data.contactInfo?.trim() || "",
    reportedBy: data.reportedBy?.trim() || "Anonymous",
  };

  const submitBtn = formEl.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";
  feedbackEl.className = "form-feedback";
  feedbackEl.textContent = "";

  try {
    await apiFetch("/api/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    feedbackEl.className = "form-feedback success";
    feedbackEl.textContent = `✅ ${capitalize(type)} report submitted! Check the Browse tab to see it.`;
    formEl.reset();

    // Reset area dropdowns
    formEl.querySelectorAll('[name="area"]').forEach((el) => {
      el.innerHTML = '<option value="">Select building first…</option>';
      el.disabled = true;
    });
    // Reset char counts
    formEl.querySelectorAll(".char-count").forEach((el) => (el.textContent = el.textContent.replace(/^\d+/, "0")));

    // Refresh stats
    loadStats();
    showToast(`${capitalize(type)} report submitted! 🎉`, "success");

    // If user switches to browse, auto-refresh
    setTimeout(() => {
      if (document.getElementById("tab-browse").classList.contains("active")) {
        loadItems();
      }
    }, 500);
  } catch (err) {
    feedbackEl.className = "form-feedback error";
    feedbackEl.textContent = `❌ ${err.message}`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = type === "lost"
      ? `<span class="btn-icon">😟</span> Submit Lost Report`
      : `<span class="btn-icon">🙌</span> Submit Found Report`;
  }
}

// ─── Status Modal ─────────────────────────────────────────────────────────────
function openStatusModal(itemId, itemTitle) {
  currentItemId = itemId;
  document.getElementById("modal-item-name").textContent = itemTitle;
  document.getElementById("modal-feedback").className = "form-feedback";
  document.getElementById("modal-feedback").textContent = "";
  document.getElementById("status-modal").removeAttribute("hidden");
}

function closeStatusModal() {
  document.getElementById("status-modal").setAttribute("hidden", "");
  currentItemId = null;
}

async function updateStatus(newStatus) {
  if (!currentItemId) return;

  const feedback = document.getElementById("modal-feedback");
  try {
    await apiFetch(`/api/items/${currentItemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    showToast(`Status updated to "${newStatus}" ✅`, "success");
    closeStatusModal();
    loadItems();
    loadStats();
  } catch (err) {
    feedback.className = "form-feedback error";
    feedback.textContent = `❌ ${err.message}`;
  }
}

// ─── Delete Item ──────────────────────────────────────────────────────────────
async function deleteItem(itemId, itemTitle) {
  if (!confirm(`Delete report "${itemTitle}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/items/${itemId}`, { method: "DELETE" });
    showToast("Report deleted", "info");
    loadItems();
    loadStats();
  } catch (err) {
    showToast(`Failed to delete: ${err.message}`, "error");
  }
}

// ─── Location Dropdowns ───────────────────────────────────────────────────────
function populateAreaDropdown(buildingSelect, areaSelect) {
  const building = buildingSelect.value;
  if (!building) {
    areaSelect.innerHTML = '<option value="">Select building first…</option>';
    areaSelect.disabled = true;
    return;
  }
  const areas = CAMPUS_LOCATIONS[building] || [];
  areaSelect.innerHTML =
    '<option value="">Select area…</option>' +
    areas.map((a) => `<option value="${a}">${a}</option>`).join("");
  areaSelect.disabled = false;
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────
function activateTab(tabName) {
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  if (tabName === "browse") loadItems();
}

// ─── Char Counter ─────────────────────────────────────────────────────────────
function setupCharCounter(inputId, counterId, max) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (!input || !counter) return;
  input.addEventListener("input", () => {
    counter.textContent = `${input.value.length}/${max}`;
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Tab navigation
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // Filter controls
  document.getElementById("search-input").addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadItems, 400);
  });
  ["filter-type", "filter-category", "filter-building"].forEach((id) => {
    document.getElementById(id).addEventListener("change", loadItems);
  });
  document.getElementById("btn-clear-filters").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    document.getElementById("filter-type").value = "";
    document.getElementById("filter-category").value = "";
    document.getElementById("filter-building").value = "";
    loadItems();
  });

  // Lost form — building → area chain
  const lostBuilding = document.getElementById("lost-building");
  const lostArea = document.getElementById("lost-area");
  lostBuilding.addEventListener("change", () => populateAreaDropdown(lostBuilding, lostArea));

  // Found form — building → area chain
  const foundBuilding = document.getElementById("found-building");
  const foundArea = document.getElementById("found-area");
  foundBuilding.addEventListener("change", () => populateAreaDropdown(foundBuilding, foundArea));

  // Form submissions
  document.getElementById("form-lost").addEventListener("submit", (e) => {
    e.preventDefault();
    submitReport(e.target, document.getElementById("lost-feedback"), "lost");
  });
  document.getElementById("form-found").addEventListener("submit", (e) => {
    e.preventDefault();
    submitReport(e.target, document.getElementById("found-feedback"), "found");
  });

  // Status modal
  document.getElementById("modal-close").addEventListener("click", closeStatusModal);
  document.getElementById("status-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeStatusModal();
  });
  document.querySelectorAll(".status-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateStatus(btn.dataset.status));
  });

  // Char counters
  setupCharCounter("lost-title", "lost-title-count", 100);
  setupCharCounter("lost-description", "lost-desc-count", 500);
  setupCharCounter("found-title", "found-title-count", 100);
  setupCharCounter("found-description", "found-desc-count", 500);

  // Initial load
  loadStats();
  loadItems();
});
