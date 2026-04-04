// ============================================================
// UniLend — Main Application Logic (Supabase)
// ============================================================

import { supabase } from "./supabase-config.js";

// ---------- Utility: Detect Current Page ----------
const currentPage = (() => {
  const path = window.location.pathname;
  if (path.includes("student.html")) return "student";
  if (path.includes("admin.html"))   return "admin";
  return "login";
})();

// ---------- Toast Notification System ----------
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const iconMap = {
    success: "bi-check-lg",
    error:   "bi-x-lg",
    info:    "bi-info-lg",
  };

  const id = "toast-" + Date.now();
  const html = `
    <div id="${id}" class="toast toast-custom toast-${type}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="3500">
      <div class="toast-body">
        <div class="toast-icon"><i class="bi ${iconMap[type] || iconMap.info}"></i></div>
        <span>${message}</span>
      </div>
    </div>`;
  container.insertAdjacentHTML("beforeend", html);
  const el = document.getElementById(id);
  const toast = new bootstrap.Toast(el);
  el.addEventListener("hidden.bs.toast", () => el.remove());
  toast.show();
}

// ============================================================
// LOGIN PAGE
// ============================================================
if (currentPage === "login") {
  const loginForm  = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passInput  = document.getElementById("password");
  const loginError = document.getElementById("loginError");
  const loginBtn   = document.getElementById("loginBtn");
  const studentTab = document.getElementById("student-tab");
  const adminTab   = document.getElementById("admin-tab");

  let selectedRole = "student";

  // Password visibility toggle
  const togglePass = document.getElementById("togglePass");
  if (togglePass) {
    togglePass.addEventListener("click", () => {
      const isPassword = passInput.type === "password";
      passInput.type = isPassword ? "text" : "password";
      togglePass.querySelector("i").className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
    });
  }

  // Register / Login view toggle
  const registerToggleWrap = document.getElementById("registerToggleWrap");
  const loginToggleWrap    = document.getElementById("loginToggleWrap");
  const showRegisterLink   = document.getElementById("showRegisterLink");
  const showLoginLink      = document.getElementById("showLoginLink");
  const registerForm       = document.getElementById("registerForm");
  const registerError      = document.getElementById("registerError");
  const registerSuccess    = document.getElementById("registerSuccess");
  const registerBtn        = document.getElementById("registerBtn");

  function showRegisterView() {
    loginForm.classList.add("d-none");
    loginError.classList.add("d-none");
    registerForm.classList.remove("d-none");
    registerToggleWrap?.classList.add("d-none");
    loginToggleWrap?.classList.remove("d-none");
  }

  function showLoginView() {
    registerForm.classList.add("d-none");
    registerError?.classList.add("d-none");
    registerSuccess?.classList.add("d-none");
    loginForm.classList.remove("d-none");
    loginToggleWrap?.classList.add("d-none");
    if (selectedRole === "student") registerToggleWrap?.classList.remove("d-none");
  }

  studentTab?.addEventListener("click", () => {
    selectedRole = "student";
    if (!loginForm.classList.contains("d-none")) {
      registerToggleWrap?.classList.remove("d-none");
    }
  });
  adminTab?.addEventListener("click", () => {
    selectedRole = "admin";
    registerToggleWrap?.classList.add("d-none");
    if (loginForm.classList.contains("d-none")) showLoginView();
  });

  showRegisterLink?.addEventListener("click", (e) => { e.preventDefault(); showRegisterView(); });
  showLoginLink?.addEventListener("click",    (e) => { e.preventDefault(); showLoginView(); });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerError.classList.add("d-none");
    registerSuccess.classList.add("d-none");
    registerBtn.disabled = true;
    registerBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating account\u2026`;

    const name     = document.getElementById("regName").value.trim();
    const email    = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm  = document.getElementById("regConfirm").value;

    if (!email || !password) {
      showRegError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      showRegError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showRegError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      showRegError(error.message);
      return;
    }

    registerSuccess.textContent = "Account created! You can now log in.";
    registerSuccess.classList.remove("d-none");
    registerBtn.disabled = false;
    registerBtn.innerHTML = `<i class="bi bi-person-plus me-2"></i>Create Account`;
    registerForm.reset();
  });

  function showRegError(msg) {
    registerError.textContent = msg;
    registerError.classList.remove("d-none");
    registerBtn.disabled = false;
    registerBtn.innerHTML = `<i class="bi bi-person-plus me-2"></i>Create Account`;
  }

  // If already logged in, redirect immediately
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) await redirectByRole(session.user);
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("d-none");
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Logging in\u2026`;

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      showError("Please enter both email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showError(error.message || "Invalid email or password.");
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileErr || !profile) {
      await supabase.auth.signOut();
      showError("Account not found. Contact your administrator.");
      return;
    }

    if (profile.role !== selectedRole) {
      await supabase.auth.signOut();
      showError(`This account is not registered as a ${selectedRole}.`);
      return;
    }

    window.location.href = profile.role === "admin" ? "admin.html" : "student.html";
  });

  function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove("d-none");
    loginBtn.disabled = false;
    loginBtn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>Log In`;
  }

  async function redirectByRole(user) {
    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    window.location.href = profile?.role === "admin" ? "admin.html" : "student.html";
  }
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================
if (currentPage === "student") {
  let equipmentChannel = null;
  let requestsChannel  = null;
  let allEquipment     = [];

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = "index.html"; }

  const user    = session.user;
  const greeting = document.getElementById("userGreeting");
  if (greeting) greeting.innerHTML = `<i class="bi bi-person-circle me-1"></i>${user.email}`;

  // ---- Equipment ----
  async function loadEquipment() {
    const { data, error } = await supabase
      .from("equipment").select("*").order("name");
    if (!error && data) {
      allEquipment = data;
      renderEquipmentCards(data);
    }
  }

  function renderEquipmentCards(items) {
    const grid  = document.getElementById("equipmentGrid");
    const empty = document.getElementById("equipmentEmpty");
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = "";
      empty?.classList.remove("d-none");
      return;
    }
    empty?.classList.add("d-none");

    grid.innerHTML = items.map(item => {
      const avail = item.available > 0;
      const pct   = item.total_stock > 0 ? Math.round((item.available / item.total_stock) * 100) : 0;
      const level = pct > 50 ? "high" : pct > 0 ? "med" : "low";
      return `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border-0">
            <div class="equipment-img-placeholder rounded-top">
              <i class="bi ${item.icon}"></i>
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title fw-bold">${item.name}</h5>
              <p class="card-text text-muted small flex-grow-1">${item.description}</p>
              <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="avail-text ${level}">${item.available} / ${item.total_stock} available</span>
                </div>
                <div class="avail-bar-wrap">
                  <div class="avail-bar ${level}" style="width: ${pct}%"></div>
                </div>
              </div>
              <button
                class="btn btn-sm ${avail ? 'btn-primary' : 'btn-outline-secondary'} reserve-btn w-100"
                data-item-id="${item.id}"
                data-item-name="${item.name}"
                ${!avail ? 'disabled' : ''}>
                <i class="bi ${avail ? 'bi-calendar-plus' : 'bi-x-circle'} me-1"></i>${avail ? 'Reserve' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>`;
    }).join("");

    grid.querySelectorAll(".reserve-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("modalItemName").textContent = btn.dataset.itemName;
        document.getElementById("modalItemId").value         = btn.dataset.itemId;
        document.getElementById("reserveDate").value         = "";
        new bootstrap.Modal(document.getElementById("reserveModal")).show();
      });
    });
  }

  // ---- Search / Filter ----
  let filterAvail = "all"; // 'all' | 'available' | 'unavailable'

  function applyFilters() {
    const q = searchInput?.value.trim().toLowerCase() ?? "";
    let filtered = allEquipment;
    if (q) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    if (filterAvail === "available")   filtered = filtered.filter(item => item.available > 0);
    if (filterAvail === "unavailable") filtered = filtered.filter(item => item.available === 0);
    renderEquipmentCards(filtered);
  }

  const searchInput = document.getElementById("equipmentSearch");
  searchInput?.addEventListener("input", applyFilters);

  const filterSelect = document.getElementById("availabilityFilter");
  filterSelect?.addEventListener("change", () => {
    filterAvail = filterSelect.value;
    applyFilters();
  });

  // ---- My Requests ----
  async function loadMyRequests() {
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment(name)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    const tbody = document.getElementById("requestsTableBody");
    if (!tbody) return;
    if (error) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Failed to load requests.</td></tr>`;
      return;
    }
    if (!data?.length) {
      tbody.innerHTML = `
        <tr><td colspan="3" class="text-center py-4">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <div class="empty-title">No requests yet</div>
            <div class="empty-desc">Reserve equipment above to get started.</div>
          </div>
        </td></tr>`;
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    tbody.innerHTML = data.map(r => {
      const isOverdue    = r.status === "approved" && r.reservation_date < today;
      const displayStatus = isOverdue ? "overdue" : r.status;
      const icon = isOverdue              ? "bi-exclamation-circle-fill"
                 : r.status === "approved"  ? "bi-check-circle-fill"
                 : r.status === "returned"  ? "bi-arrow-return-left"
                 : r.status === "denied"    ? "bi-x-circle-fill"
                 : "bi-clock-fill";
      const statusText = isOverdue            ? "Overdue"
                       : r.status === "returned" ? "Returned"
                       : r.status.charAt(0).toUpperCase() + r.status.slice(1);
      return `
        <tr>
          <td class="fw-medium">${r.equipment?.name ?? "\u2014"}</td>
          <td>${r.reservation_date}</td>
          <td><span class="status-badge status-${displayStatus}"><i class="bi ${icon}"></i>${statusText}</span></td>
        </tr>`;
    }).join("");
  }

  await loadEquipment();
  await loadMyRequests();

  // Real-time subscriptions
  equipmentChannel = supabase.channel("equipment-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, loadEquipment)
    .subscribe();

  requestsChannel = supabase.channel("my-requests")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, loadMyRequests)
    .subscribe();

  // ---- Reserve ----
  document.getElementById("confirmReserveBtn")?.addEventListener("click", async () => {
    const dateVal  = document.getElementById("reserveDate").value;
    const itemId   = document.getElementById("modalItemId").value;
    const btn      = document.getElementById("confirmReserveBtn");

    if (!dateVal) { showToast("Please select a date.", "error"); return; }
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Reserving\u2026`;

    const { error } = await supabase.from("reservations").insert({
      student_id:       user.id,
      student_email:    user.email,
      equipment_id:     itemId,
      reservation_date: dateVal,
      status:           "pending"
    });

    if (error) {
      showToast("Failed to submit reservation. Please try again.", "error");
    } else {
      bootstrap.Modal.getInstance(document.getElementById("reserveModal")).hide();
      document.getElementById("reserveDate").value = "";
      showToast("Reservation submitted successfully!", "success");
      await loadMyRequests();
    }
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-check-circle me-1"></i>Confirm`;
  });

  // ---- Logout ----
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    equipmentChannel && supabase.removeChannel(equipmentChannel);
    requestsChannel  && supabase.removeChannel(requestsChannel);
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
if (currentPage === "admin") {
  let inventoryChannel = null;
  let pendingChannel   = null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = "index.html"; }

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  }

  // ---- Stats ----
  function updateStats(equipment, pendingCount) {
    const statPending   = document.getElementById("statPending");
    const statItems     = document.getElementById("statItems");
    const statAvailable = document.getElementById("statAvailable");
    const statLow       = document.getElementById("statLow");

    if (statPending)   statPending.textContent   = pendingCount ?? "--";
    if (equipment) {
      if (statItems)     statItems.textContent     = equipment.length;
      if (statAvailable) statAvailable.textContent = equipment.filter(e => e.available > 0).length;
      if (statLow)       statLow.textContent       = equipment.filter(e => e.available <= 2).length;
    }
  }

  function updateOverdueStat(count) {
    const el = document.getElementById("statOverdue");
    if (el) el.textContent = count;
    const card = document.getElementById("statOverdue")?.closest(".stat-card");
    if (card) card.classList.toggle("overdue-alert", count > 0);
  }

  // ---- Inventory ----
  async function loadInventory() {
    const { data, error } = await supabase
      .from("equipment").select("*").order("name");
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody || error) return;

    if (!data?.length) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="text-center py-4">
          <div class="empty-state">
            <i class="bi bi-archive"></i>
            <div class="empty-title">No inventory</div>
            <div class="empty-desc">Equipment will appear here once added.</div>
          </div>
        </td></tr>`;
      updateStats([], null);
      return;
    }

    updateStats(data, null);

    tbody.innerHTML = data.map(item => {
      let badge;
      if (item.available === 0)     badge = `<span class="badge-out"><i class="bi bi-x-circle-fill"></i> Out of Stock</span>`;
      else if (item.available <= 2) badge = `<span class="badge-low"><i class="bi bi-exclamation-circle-fill"></i> Low Stock</span>`;
      else                          badge = `<span class="badge-instock"><i class="bi bi-check-circle-fill"></i> In Stock</span>`;
      return `
        <tr>
          <td><i class="bi ${item.icon} me-2 item-icon"></i><span class="fw-medium">${item.name}</span></td>
          <td class="text-center">${item.total_stock}</td>
          <td class="text-center fw-semibold">${item.available}</td>
          <td class="text-center">${badge}</td>
          <td class="text-center">
            <button class="btn-restock restock-btn"
              data-item-id="${item.id}"
              data-item-name="${item.name}"
              data-total="${item.total_stock}"
              data-avail="${item.available}">
              <i class="bi bi-plus-circle"></i> Restock
            </button>
          </td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll(".restock-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const total = parseInt(btn.dataset.total, 10);
        const avail = parseInt(btn.dataset.avail, 10);
        document.getElementById("restockItemName").textContent    = btn.dataset.itemName;
        document.getElementById("restockItemId").value            = btn.dataset.itemId;
        document.getElementById("restockCurrentTotal").value      = total;
        document.getElementById("restockCurrentAvail").value      = avail;
        document.getElementById("restockTotalDisplay").textContent = total;
        document.getElementById("restockAvailDisplay").textContent = avail;
        document.getElementById("restockAmount").value            = "";
        document.getElementById("restockPreview").textContent     = "";
        new bootstrap.Modal(document.getElementById("restockModal")).show();
      });
    });
  }

  // ---- Pending Requests ----
  async function loadPendingRequests() {
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment(name)")
      .eq("status", "pending")
      .order("created_at");

    const tbody = document.getElementById("pendingTableBody");
    if (!tbody || error) return;

    updateStats(null, data?.length ?? 0);

    if (!data?.length) {
      tbody.innerHTML = `
        <tr><td colspan="4" class="text-center py-4">
          <div class="empty-state">
            <i class="bi bi-check-circle"></i>
            <div class="empty-title">All caught up!</div>
            <div class="empty-desc">No pending reservation requests.</div>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr data-reservation-id="${r.id}" data-equipment-id="${r.equipment_id}">
        <td>${r.student_email}</td>
        <td class="fw-medium">${r.equipment?.name ?? "\u2014"}</td>
        <td>${r.reservation_date}</td>
        <td class="text-end">
          <button class="btn-approve me-1 approve-btn"><i class="bi bi-check-lg"></i> Approve</button>
          <button class="btn-deny deny-btn"><i class="bi bi-x-lg"></i> Deny</button>
        </td>
      </tr>`).join("");

    tbody.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row      = btn.closest("tr");
        const reservId = row.dataset.reservationId;
        const equipId  = row.dataset.equipmentId;
        btn.disabled   = true;
        btn.innerHTML  = `<span class="spinner-border spinner-border-sm"></span>`;
        const { error: e1 } = await supabase
          .from("reservations").update({ status: "approved" }).eq("id", reservId);
        const { error: e2 } = await supabase
          .rpc("decrement_available", { equipment_id: equipId });
        if (e1 || e2) {
          showToast("Failed to approve request.", "error");
          btn.disabled = false;
          btn.innerHTML = `<i class="bi bi-check-lg"></i> Approve`;
        } else {
          showToast("Request approved.", "success");
        }
      });
    });

    tbody.querySelectorAll(".deny-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row      = btn.closest("tr");
        const reservId = row.dataset.reservationId;
        btn.disabled   = true;
        btn.innerHTML  = `<span class="spinner-border spinner-border-sm"></span>`;
        const { error } = await supabase
          .from("reservations").update({ status: "denied" }).eq("id", reservId);
        if (error) {
          showToast("Failed to deny request.", "error");
          btn.disabled = false;
          btn.innerHTML = `<i class="bi bi-x-lg"></i> Deny`;
        } else {
          showToast("Request denied.", "info");
        }
      });
    });
  }

  // ---- Overdue Reservations ----
  async function loadOverdueReservations() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment(name)")
      .eq("status", "approved")
      .lt("reservation_date", today)
      .order("reservation_date");

    const tbody = document.getElementById("overdueTableBody");
    if (!tbody || error) return;

    updateOverdueStat(data?.length ?? 0);

    if (!data?.length) {
      tbody.innerHTML = `
        <tr><td colspan="4" class="text-center py-4">
          <div class="empty-state">
            <i class="bi bi-check-circle"></i>
            <div class="empty-title">No overdue reservations</div>
            <div class="empty-desc">All approved equipment has been returned on time.</div>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr data-reservation-id="${r.id}" data-equipment-id="${r.equipment_id}">
        <td>${r.student_email}</td>
        <td class="fw-medium">${r.equipment?.name ?? "\u2014"}</td>
        <td><span class="badge-overdue"><i class="bi bi-exclamation-circle-fill"></i>${r.reservation_date}</span></td>
        <td class="text-end">
          <button class="btn-return return-btn"><i class="bi bi-box-arrow-in-left"></i> Mark Returned</button>
        </td>
      </tr>`).join("");

    tbody.querySelectorAll(".return-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row      = btn.closest("tr");
        const reservId = row.dataset.reservationId;
        const equipId  = row.dataset.equipmentId;
        btn.disabled   = true;
        btn.innerHTML  = `<span class="spinner-border spinner-border-sm"></span>`;
        const { error: rpcErr } = await supabase
          .rpc("return_equipment", { reservation_id: reservId, equipment_id: equipId });
        if (rpcErr) {
          showToast("Failed to mark as returned.", "error");
          btn.disabled = false;
          btn.innerHTML = `<i class="bi bi-box-arrow-in-left"></i> Mark Returned`;
        } else {
          showToast("Equipment marked as returned.", "success");
        }
      });
    });
  }

  await loadInventory();
  await loadPendingRequests();
  await loadOverdueReservations();

  inventoryChannel = supabase.channel("admin-equipment")
    .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, loadInventory)
    .subscribe();

  pendingChannel = supabase.channel("admin-reservations")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, async () => {
      await loadPendingRequests();
      await loadOverdueReservations();
    })
    .subscribe();

  // ---- Restock modal: live preview ----
  document.getElementById("restockAmount")?.addEventListener("input", () => {
    const amount  = parseInt(document.getElementById("restockAmount").value, 10);
    const total   = parseInt(document.getElementById("restockCurrentTotal").value, 10);
    const avail   = parseInt(document.getElementById("restockCurrentAvail").value, 10);
    const preview = document.getElementById("restockPreview");
    if (!isNaN(amount) && amount > 0) {
      preview.textContent = `After restock → Total: ${total + amount}, Available: ${avail + amount}`;
    } else {
      preview.textContent = "";
    }
  });

  // ---- Restock confirm ----
  document.getElementById("confirmRestockBtn")?.addEventListener("click", async () => {
    const amount  = parseInt(document.getElementById("restockAmount").value, 10);
    const itemId  = document.getElementById("restockItemId").value;
    const total   = parseInt(document.getElementById("restockCurrentTotal").value, 10);
    const avail   = parseInt(document.getElementById("restockCurrentAvail").value, 10);
    const btn     = document.getElementById("confirmRestockBtn");

    if (!amount || amount < 1) {
      showToast("Enter a valid number of units to add.", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Restocking\u2026`;

    const { error } = await supabase
      .from("equipment")
      .update({ total_stock: total + amount, available: avail + amount })
      .eq("id", itemId);

    if (error) {
      showToast("Failed to restock. Please try again.", "error");
    } else {
      bootstrap.Modal.getInstance(document.getElementById("restockModal")).hide();
      showToast(`Restocked successfully — ${amount} unit${amount !== 1 ? "s" : ""} added.`, "success");
    }

    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-plus-circle me-1"></i>Restock`;
  });

  // ---- Logout ----
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    inventoryChannel && supabase.removeChannel(inventoryChannel);
    pendingChannel   && supabase.removeChannel(pendingChannel);
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

