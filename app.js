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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = "index.html"; }

  const user    = session.user;
  const greeting = document.getElementById("userGreeting");
  if (greeting) greeting.innerHTML = `<i class="bi bi-person-circle me-1"></i>${user.email}`;

  // ---- Equipment ----
  async function loadEquipment() {
    const { data, error } = await supabase
      .from("equipment").select("*").order("name");
    if (!error && data) renderEquipmentCards(data);
  }

  function renderEquipmentCards(items) {
    const grid = document.getElementById("equipmentGrid");
    if (!grid) return;
    grid.innerHTML = items.map(item => {
      const avail = item.available > 0;
      return `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border-0">
            <div class="equipment-img-placeholder rounded-top">
              <i class="bi ${item.icon}"></i>
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title fw-bold">${item.name}</h5>
              <p class="card-text text-muted small flex-grow-1">${item.description}</p>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="badge ${avail ? 'bg-success' : 'bg-secondary'}">
                  ${item.available} / ${item.total_stock} available
                </span>
                <button
                  class="btn btn-sm ${avail ? 'btn-primary' : 'btn-outline-secondary'} reserve-btn"
                  data-item-id="${item.id}"
                  data-item-name="${item.name}"
                  ${!avail ? 'disabled' : ''}>
                  <i class="bi bi-calendar-plus me-1"></i>${avail ? 'Reserve' : 'Unavailable'}
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join("");

    grid.querySelectorAll(".reserve-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("modalItemName").textContent = btn.dataset.itemName;
        document.getElementById("modalItemId").value         = btn.dataset.itemId;
        new bootstrap.Modal(document.getElementById("reserveModal")).show();
      });
    });
  }

  // ---- My Requests ----
  async function loadMyRequests() {
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment(name)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    const tbody = document.getElementById("requestsTableBody");
    if (!tbody) return;
    if (error || !data?.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No requests yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(r => {
      const badgeClass = r.status === "approved" ? "bg-success"
                       : r.status === "denied"   ? "bg-danger"
                       : "bg-warning text-dark";
      const statusText = r.status.charAt(0).toUpperCase() + r.status.slice(1);
      return `
        <tr>
          <td>${r.equipment?.name ?? "\u2014"}</td>
          <td>${r.reservation_date}</td>
          <td><span class="badge ${badgeClass}">${statusText}</span></td>
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
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations",
      filter: `student_id=eq.${user.id}` }, loadMyRequests)
    .subscribe();

  // ---- Reserve ----
  document.getElementById("confirmReserveBtn")?.addEventListener("click", async () => {
    const dateVal  = document.getElementById("reserveDate").value;
    const itemId   = document.getElementById("modalItemId").value;
    const btn      = document.getElementById("confirmReserveBtn");

    if (!dateVal) { alert("Please select a date."); return; }
    btn.disabled = true;

    const { error } = await supabase.from("reservations").insert({
      student_id:       user.id,
      student_email:    user.email,
      equipment_id:     itemId,
      reservation_date: dateVal,
      status:           "pending"
    });

    if (error) {
      alert("Failed to submit reservation. Please try again.");
    } else {
      bootstrap.Modal.getInstance(document.getElementById("reserveModal")).hide();
      document.getElementById("reserveDate").value = "";
    }
    btn.disabled = false;
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

  // ---- Inventory ----
  async function loadInventory() {
    const { data, error } = await supabase
      .from("equipment").select("*").order("name");
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody || error) return;
    tbody.innerHTML = (data ?? []).map(item => {
      let badge;
      if (item.available === 0)     badge = `<span class="badge-out">Out of Stock</span>`;
      else if (item.available <= 2) badge = `<span class="badge-low">Low Stock</span>`;
      else                          badge = `<span class="badge-instock">In Stock</span>`;
      return `
        <tr>
          <td><i class="bi ${item.icon} me-2 item-icon"></i>${item.name}</td>
          <td class="text-center">${item.total_stock}</td>
          <td class="text-center">${item.available}</td>
          <td class="text-center">${badge}</td>
        </tr>`;
    }).join("");
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

    if (!data?.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No pending requests.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr data-reservation-id="${r.id}" data-equipment-id="${r.equipment_id}">
        <td>${r.student_email}</td>
        <td>${r.equipment?.name ?? "\u2014"}</td>
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
        const { error: e1 } = await supabase
          .from("reservations").update({ status: "approved" }).eq("id", reservId);
        const { error: e2 } = await supabase
          .rpc("decrement_available", { equipment_id: equipId });
        if (e1 || e2) { alert("Failed to approve request."); btn.disabled = false; }
      });
    });

    tbody.querySelectorAll(".deny-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row      = btn.closest("tr");
        const reservId = row.dataset.reservationId;
        btn.disabled   = true;
        const { error } = await supabase
          .from("reservations").update({ status: "denied" }).eq("id", reservId);
        if (error) { alert("Failed to deny request."); btn.disabled = false; }
      });
    });
  }

  await loadInventory();
  await loadPendingRequests();

  inventoryChannel = supabase.channel("admin-equipment")
    .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, loadInventory)
    .subscribe();

  pendingChannel = supabase.channel("admin-reservations")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, loadPendingRequests)
    .subscribe();

  // ---- Logout ----
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    inventoryChannel && supabase.removeChannel(inventoryChannel);
    pendingChannel   && supabase.removeChannel(pendingChannel);
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

