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

// ---------- Security: HTML Escape Utility ----------
// Prevents XSS when inserting user-sourced data into innerHTML.
function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- Skeleton loader helpers ----------
function skeletonRows(cols, count = 4) {
  return Array.from({ length: count }, () =>
    `<tr class="skeleton-row"><td colspan="${cols}"><div class="skeleton" style="height:14px;width:${40 + Math.random() * 40 | 0}%;border-radius:6px"></div></td></tr>`
  ).join("");
}

function skeletonCards(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="skeleton-card">
        <div class="skeleton skeleton-card-img"></div>
        <div class="card-body p-3">
          <div class="skeleton skeleton-line full"></div>
          <div class="skeleton skeleton-line med"></div>
          <div class="skeleton skeleton-line sm"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    </div>`).join("");
}

// ---------- Toast Notification System ----------
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const iconMap = {
    success: "bi-check-lg",
    error:   "bi-x-lg",
    info:    "bi-info-lg",
  };

  // Build toast DOM safely — message is set via textContent to prevent XSS.
  const el = document.createElement("div");
  el.className = `toast toast-custom toast-${type}`;
  el.setAttribute("role", "alert");
  el.setAttribute("aria-live", "assertive");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("data-bs-delay", "3500");

  const body = document.createElement("div");
  body.className = "toast-body";

  const iconEl = document.createElement("div");
  iconEl.className = "toast-icon";
  iconEl.innerHTML = `<i class="bi ${iconMap[type] || iconMap.info}"></i>`;

  const msgEl = document.createElement("span");
  msgEl.textContent = message; // textContent prevents HTML injection

  body.appendChild(iconEl);
  body.appendChild(msgEl);
  el.appendChild(body);
  container.appendChild(el);

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
  const forgotForm         = document.getElementById("forgotForm");
  const forgotError        = document.getElementById("forgotError");
  const forgotBtn          = document.getElementById("forgotBtn");
  const resetForm          = document.getElementById("resetForm");
  const resetError         = document.getElementById("resetError");
  const resetSuccess       = document.getElementById("resetSuccess");
  const resetBtn           = document.getElementById("resetBtn");

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
    forgotForm?.classList.add("d-none");
    forgotError?.classList.add("d-none");
    document.getElementById("forgotToggleWrap")?.classList.add("d-none");
    resetForm?.classList.add("d-none");
    resetError?.classList.add("d-none");
    resetSuccess?.classList.add("d-none");
    loginForm.classList.remove("d-none");
    loginError.classList.add("d-none");
    loginToggleWrap?.classList.add("d-none");
    if (selectedRole === "student") registerToggleWrap?.classList.remove("d-none");
  }

  function showForgotView() {
    loginForm.classList.add("d-none");
    loginError.classList.add("d-none");
    registerForm.classList.add("d-none");
    registerToggleWrap?.classList.add("d-none");
    loginToggleWrap?.classList.add("d-none");
    resetForm?.classList.add("d-none");
    resetError?.classList.add("d-none");
    resetSuccess?.classList.add("d-none");
    forgotForm?.classList.remove("d-none");
    document.getElementById("forgotToggleWrap")?.classList.remove("d-none");
  }

  function showResetView() {
    loginForm.classList.add("d-none");
    loginError.classList.add("d-none");
    registerForm.classList.add("d-none");
    registerToggleWrap?.classList.add("d-none");
    loginToggleWrap?.classList.add("d-none");
    forgotForm?.classList.add("d-none");
    document.getElementById("forgotToggleWrap")?.classList.add("d-none");
    resetError?.classList.add("d-none");
    resetSuccess?.classList.add("d-none");
    resetForm?.classList.remove("d-none");
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

  // When the verify modal closes ("Back to Login"), ensure the register form is hidden
  document.getElementById("verifyEmailModal")?.addEventListener("hidden.bs.modal", () => {
    showLoginView();
  });

  document.getElementById("forgotPasswordLink")?.addEventListener("click", (e) => { e.preventDefault(); showForgotView(); });
  document.getElementById("showLoginFromForgot")?.addEventListener("click", (e) => { e.preventDefault(); showLoginView(); });

  // When the reset-sent modal closes, return to login view
  document.getElementById("resetSentModal")?.addEventListener("hidden.bs.modal", () => {
    showLoginView();
  });

  // ---------- Password strength meter ----------
  const regPassword = document.getElementById("regPassword");
  const pwStrengthWrap  = document.getElementById("pwStrengthWrap");
  const pwStrengthLabel = document.getElementById("pwStrengthLabel");
  const pwSegs = [1, 2, 3, 4].map(n => document.getElementById(`pwSeg${n}`));

  function evalPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    // Condense to 0-4
    return Math.min(4, score);
  }

  const strengthConfig = [
    { label: "",        color: "#e5e7eb" },
    { label: "Weak",    color: "#ef4444" },
    { label: "Fair",    color: "#f59e0b" },
    { label: "Good",    color: "#3b82f6" },
    { label: "Strong",  color: "#10b981" },
  ];

  regPassword?.addEventListener("input", () => {
    const pw    = regPassword.value;
    const level = pw.length === 0 ? 0 : Math.max(1, evalPasswordStrength(pw));
    if (pwStrengthWrap) pwStrengthWrap.style.display = pw.length ? "block" : "none";
    pwSegs.forEach((seg, i) => {
      seg.style.background = i < level ? strengthConfig[level].color : "#e5e7eb";
    });
    if (pwStrengthLabel) {
      pwStrengthLabel.textContent  = strengthConfig[level].label;
      pwStrengthLabel.style.color  = strengthConfig[level].color;
    }
  });

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
    if (password.length < 8) {
      showRegError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      showRegError("Passwords do not match.");
      return;
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      showRegError(error.message);
      return;
    }

    // Email confirmation required (Supabase returns session=null when confirm email is on)
    if (!signUpData.session) {
      registerBtn.disabled = false;
      registerBtn.innerHTML = `<i class="bi bi-person-plus me-2"></i>Create Account`;
      registerForm.reset();
      const addrEl = document.getElementById("verifyEmailAddress");
      if (addrEl) addrEl.textContent = email;
      new bootstrap.Modal(document.getElementById("verifyEmailModal")).show();
      return;
    }

    // Auto-confirm is on (dev / testing environment)
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

  // Detect PASSWORD_RECOVERY event — fires when user clicks the reset link in their email.
  // Must be registered before getSession() to prevent the auto-redirect race condition.
  let _recoveryMode = false;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      _recoveryMode = true;
      showResetView();
    }
  });

  // If already logged in (and not mid-recovery), redirect to dashboard
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session && !_recoveryMode) await redirectByRole(session.user);
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
      if (error.message.toLowerCase().includes("email not confirmed")) {
        await supabase.auth.signOut();
        showError("Please verify your email address before logging in. Check your inbox for the confirmation link.");
      } else {
        showError(error.message || "Invalid email or password.");
      }
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
      // Generic message prevents revealing whether the account exists under a different role (OWASP A07)
      showError("Invalid credentials or you do not have access to this portal.");
      return;
    }

    window.location.href = profile.role === "admin" ? "admin.html" : "student.html";
  });

  forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    forgotError?.classList.add("d-none");
    forgotBtn.disabled = true;
    forgotBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Sending\u2026`;

    const email = document.getElementById("forgotEmail").value.trim();
    if (!email) {
      forgotError.textContent = "Please enter your email address.";
      forgotError.classList.remove("d-none");
      forgotBtn.disabled = false;
      forgotBtn.innerHTML = `<i class="bi bi-send me-2"></i>Send Reset Link`;
      return;
    }

    // redirectTo tells Supabase where to send the user after clicking the link.
    // Add this URL to Supabase Auth > URL Configuration > Redirect URLs.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });

    forgotBtn.disabled = false;
    forgotBtn.innerHTML = `<i class="bi bi-send me-2"></i>Send Reset Link`;

    if (error) {
      forgotError.textContent = error.message || "Failed to send reset link. Please try again.";
      forgotError.classList.remove("d-none");
      return;
    }

    // Always show the modal (prevents email enumeration — don't reveal if the address exists)
    document.getElementById("resetSentEmailAddress").textContent = email;
    new bootstrap.Modal(document.getElementById("resetSentModal")).show();
    forgotForm.reset();
  });

  resetForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    resetError?.classList.add("d-none");
    resetSuccess?.classList.add("d-none");
    resetBtn.disabled = true;
    resetBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Updating\u2026`;

    const newPass     = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("newPasswordConfirm").value;

    if (newPass.length < 8) {
      resetError.textContent = "Password must be at least 8 characters.";
      resetError.classList.remove("d-none");
      resetBtn.disabled = false;
      resetBtn.innerHTML = `<i class="bi bi-shield-check me-2"></i>Update Password`;
      return;
    }
    if (newPass !== confirmPass) {
      resetError.textContent = "Passwords do not match.";
      resetError.classList.remove("d-none");
      resetBtn.disabled = false;
      resetBtn.innerHTML = `<i class="bi bi-shield-check me-2"></i>Update Password`;
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });

    resetBtn.disabled = false;
    resetBtn.innerHTML = `<i class="bi bi-shield-check me-2"></i>Update Password`;

    if (error) {
      resetError.textContent = error.message || "Failed to update password. Please try again.";
      resetError.classList.remove("d-none");
      return;
    }

    resetSuccess.textContent = "Password updated successfully! Redirecting to login\u2026";
    resetSuccess.classList.remove("d-none");
    resetForm.reset();
    await supabase.auth.signOut();
    setTimeout(() => { _recoveryMode = false; showLoginView(); }, 2200);
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
  if (greeting) {
    greeting.innerHTML = `<i class="bi bi-person-circle me-1"></i>`;
    greeting.appendChild(document.createTextNode(user.email));
  }

  // ---- Equipment ----
  async function loadEquipment() {
    const grid = document.getElementById("equipmentGrid");
    if (grid && !grid.querySelector(".card")) grid.innerHTML = skeletonCards(3);
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
      const avail     = item.available > 0;
      const pct       = item.total_stock > 0 ? Math.round((item.available / item.total_stock) * 100) : 0;
      const level     = pct > 50 ? "high" : pct > 0 ? "med" : "low";
      // Sanitise all DB-sourced strings before inserting into innerHTML (XSS prevention)
      const safeName  = escapeHTML(item.name);
      const safeIcon  = escapeHTML(item.icon);
      const safeDesc  = escapeHTML(item.description);
      const safeId    = escapeHTML(item.id);
      return `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border-0">
            <div class="equipment-img-placeholder rounded-top">
              <i class="bi ${safeIcon}"></i>
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title fw-bold">${safeName}</h5>
              <p class="card-text text-muted small flex-grow-1">${safeDesc}</p>
              <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="avail-text ${level}">${escapeHTML(String(item.available))} / ${escapeHTML(String(item.total_stock))} available</span>
                </div>
                <div class="avail-bar-wrap">
                  <div class="avail-bar ${level}" style="width: ${pct}%"></div>
                </div>
              </div>
              <button
                class="btn btn-sm ${avail ? 'btn-primary' : 'btn-outline-secondary'} reserve-btn w-100"
                data-item-id="${safeId}"
                data-item-name="${safeName}"
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
        // Enforce today as the earliest bookable date (prevents past reservations)
        document.getElementById("reserveDate").min           = new Date().toISOString().split("T")[0];
        document.getElementById("pickupTime").value          = "08:00";
        document.getElementById("returnTime").value          = "17:00";
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
    const tbody = document.getElementById("requestsTableBody");
    if (tbody && !tbody.querySelector("td[data-loaded]")) tbody.innerHTML = skeletonRows(3);
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
    const now      = new Date();
    const today    = now.toISOString().split("T")[0];
    const nowTime  = now.toTimeString().slice(0, 5);
    tbody.innerHTML = data.map(r => {
      const isOverdue = r.status === "approved" && (
        r.reservation_date < today ||
        (r.reservation_date === today && r.return_time && r.return_time.slice(0, 5) <= nowTime)
      );
      const displayStatus = isOverdue ? "overdue" : r.status;
      const icon = isOverdue              ? "bi-exclamation-circle-fill"
                 : r.status === "approved"  ? "bi-check-circle-fill"
                 : r.status === "returned"  ? "bi-arrow-return-left"
                 : r.status === "denied"    ? "bi-x-circle-fill"
                 : "bi-clock-fill";
      const statusText = isOverdue            ? "Overdue"
                       : r.status === "returned" ? "Returned"
                       : r.status.charAt(0).toUpperCase() + r.status.slice(1);
      const pickupFmt = r.pickup_time ? escapeHTML(r.pickup_time.slice(0, 5)) : "";
      const returnFmt = r.return_time ? escapeHTML(r.return_time.slice(0, 5)) : "";
      const safeDate  = escapeHTML(r.reservation_date ?? "");
      const safeName  = escapeHTML(r.equipment?.name ?? "\u2014");
      const scheduleHtml = pickupFmt && returnFmt
        ? `${safeDate}<br><small class="text-muted">${pickupFmt} \u2013 ${returnFmt}</small>`
        : safeDate;
      return `
        <tr>
          <td class="fw-medium">${safeName}</td>
          <td>${scheduleHtml}</td>
          <td><span class="status-badge status-${escapeHTML(displayStatus)}"><i class="bi ${icon}"></i>${escapeHTML(statusText)}</span></td>
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
    const dateVal      = document.getElementById("reserveDate").value;
    const pickupVal    = document.getElementById("pickupTime").value;
    const returnVal    = document.getElementById("returnTime").value;
    const itemId       = document.getElementById("modalItemId").value;
    const btn          = document.getElementById("confirmReserveBtn");

    if (!dateVal) { showToast("Please select a reservation date.", "error"); return; }
    if (!pickupVal || !returnVal) { showToast("Please select pickup and return times.", "error"); return; }
    if (pickupVal >= returnVal) { showToast("Return time must be after pickup time.", "error"); return; }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Reserving\u2026`;

    const { error } = await supabase.from("reservations").insert({
      student_id:       user.id,
      student_email:    user.email,
      equipment_id:     itemId,
      reservation_date: dateVal,
      pickup_time:      pickupVal,
      return_time:      returnVal,
      status:           "pending"
    });

    if (error) {
      showToast("Failed to submit reservation. Please try again.", "error");
    } else {
      bootstrap.Modal.getInstance(document.getElementById("reserveModal")).hide();
      document.getElementById("reserveDate").value  = "";
      document.getElementById("pickupTime").value   = "08:00";
      document.getElementById("returnTime").value   = "17:00";
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

  // ---------- Shared confirm modal helper ----------
  function showConfirmModal({ title, body, okLabel, okColor, onConfirm }) {
    document.getElementById("confirmModalLabel").textContent    = title;
    document.getElementById("confirmModalBody").textContent     = body;
    const okBtn = document.getElementById("confirmModalOkBtn");
    okBtn.textContent       = okLabel;
    okBtn.style.background  = okColor;
    const modal = new bootstrap.Modal(document.getElementById("confirmModal"));
    const handler = () => { modal.hide(); onConfirm(); };
    okBtn.addEventListener("click", handler, { once: true });
    modal.show();
  }

  // ---- Inventory ----
  async function loadInventory() {
    const tbody = document.getElementById("inventoryTableBody");
    if (tbody && !tbody.querySelector("td[data-loaded]")) tbody.innerHTML = skeletonRows(5);
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
      const safeId    = escapeHTML(item.id);
      const safeName  = escapeHTML(item.name);
      const safeIcon  = escapeHTML(item.icon);
      const safeTotal = escapeHTML(String(item.total_stock));
      const safeAvail = escapeHTML(String(item.available));
      let badge;
      if (item.available === 0)     badge = `<span class="badge-out"><i class="bi bi-x-circle-fill"></i> Out of Stock</span>`;
      else if (item.available <= 2) badge = `<span class="badge-low"><i class="bi bi-exclamation-circle-fill"></i> Low Stock</span>`;
      else                          badge = `<span class="badge-instock"><i class="bi bi-check-circle-fill"></i> In Stock</span>`;
      return `
        <tr>
          <td><i class="bi ${safeIcon} me-2 item-icon"></i><span class="fw-medium">${safeName}</span></td>
          <td class="text-center">${safeTotal}</td>
          <td class="text-center fw-semibold">${safeAvail}</td>
          <td class="text-center">${badge}</td>
          <td class="text-center">
            <button class="btn-restock restock-btn"
              data-item-id="${safeId}"
              data-item-name="${safeName}"
              data-total="${safeTotal}"
              data-avail="${safeAvail}">
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
    const tbody = document.getElementById("pendingTableBody");
    if (tbody && !tbody.querySelector("td[data-loaded]")) tbody.innerHTML = skeletonRows(4);
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

    tbody.innerHTML = data.map(r => {
      const pickupFmt   = r.pickup_time ? escapeHTML(r.pickup_time.slice(0, 5)) : "";
      const returnFmt   = r.return_time ? escapeHTML(r.return_time.slice(0, 5)) : "";
      const safeDate    = escapeHTML(r.reservation_date ?? "");
      const safeEmail   = escapeHTML(r.student_email ?? "");
      const safeEqName  = escapeHTML(r.equipment?.name ?? "\u2014");
      const safeResId   = escapeHTML(r.id);
      const safeEqId    = escapeHTML(r.equipment_id);
      const scheduleHtml = pickupFmt && returnFmt
        ? `${safeDate}<br><small class="text-muted">${pickupFmt} \u2013 ${returnFmt}</small>`
        : safeDate;
      return `
      <tr data-reservation-id="${safeResId}" data-equipment-id="${safeEqId}">
        <td>${safeEmail}</td>
        <td class="fw-medium">${safeEqName}</td>
        <td>${scheduleHtml}</td>
        <td class="text-end">
          <button class="btn-approve me-1 approve-btn"><i class="bi bi-check-lg"></i> Approve</button>
          <button class="btn-deny deny-btn"><i class="bi bi-x-lg"></i> Deny</button>
        </td>
      </tr>`;
    }).join("");

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
      btn.addEventListener("click", () => {
        const row      = btn.closest("tr");
        const reservId = row.dataset.reservationId;
        showConfirmModal({
          title:     "Deny Request",
          body:      "Are you sure you want to deny this reservation? The student will be notified.",
          okLabel:   "Deny",
          okColor:   "#b91c1c",
          onConfirm: async () => {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
            const { error } = await supabase
              .from("reservations").update({ status: "denied" }).eq("id", reservId);
            if (error) {
              showToast("Failed to deny request.", "error");
              btn.disabled = false;
              btn.innerHTML = `<i class="bi bi-x-lg"></i> Deny`;
            } else {
              showToast("Request denied.", "info");
            }
          },
        });
      });
    });
  }

  async function loadOverdueReservations() {
    const tbody = document.getElementById("overdueTableBody");
    if (tbody && !tbody.querySelector("td[data-loaded]")) tbody.innerHTML = skeletonRows(4);
    const now         = new Date();
    const today       = now.toISOString().split("T")[0];
    const nowTime     = now.toTimeString().slice(0, 5);

    // Fetch approved reservations up to and including today
    const { data, error } = await supabase
      .from("reservations")
      .select("*, equipment(name)")
      .eq("status", "approved")
      .lte("reservation_date", today)
      .order("reservation_date");

    const tbody = document.getElementById("overdueTableBody");
    if (!tbody || error) return;

    // An item is overdue if:
    //  - reservation_date is before today, OR
    //  - reservation_date is today AND return_time has already passed
    const overdueData = (data ?? []).filter(r => {
      if (r.reservation_date < today) return true;
      if (r.reservation_date === today && r.return_time && r.return_time.slice(0, 5) <= nowTime) return true;
      return false;
    });

    updateOverdueStat(overdueData.length);

    if (!overdueData.length) {
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

    tbody.innerHTML = overdueData.map(r => {
      const returnFmt  = r.return_time ? escapeHTML(r.return_time.slice(0, 5)) : "";
      const safeDate   = escapeHTML(r.reservation_date ?? "");
      const dueLabel   = returnFmt ? `${safeDate} ${returnFmt}` : safeDate;
      const safeEmail  = escapeHTML(r.student_email ?? "");
      const safeEqName = escapeHTML(r.equipment?.name ?? "\u2014");
      const safeResId  = escapeHTML(r.id);
      const safeEqId   = escapeHTML(r.equipment_id);
      return `
      <tr data-reservation-id="${safeResId}" data-equipment-id="${safeEqId}">
        <td>${safeEmail}</td>
        <td class="fw-medium">${safeEqName}</td>
        <td><span class="badge-overdue"><i class="bi bi-exclamation-circle-fill"></i>${dueLabel}</span></td>
        <td class="text-end">
          <button class="btn-return return-btn"><i class="bi bi-box-arrow-in-left"></i> Mark Returned</button>
        </td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll(".return-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const row      = btn.closest("tr");
        const reservId = row.dataset.reservationId;
        const equipId  = row.dataset.equipmentId;
        showConfirmModal({
          title:     "Mark as Returned",
          body:      "Confirm that this equipment has been physically returned? Stock will be restored.",
          okLabel:   "Confirm Return",
          okColor:   "#059669",
          onConfirm: async () => {
            btn.disabled  = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
            const { error: rpcErr } = await supabase
              .rpc("return_equipment", { reservation_id: reservId, equipment_id: equipId });
            if (rpcErr) {
              showToast("Failed to mark as returned.", "error");
              btn.disabled  = false;
              btn.innerHTML = `<i class="bi bi-box-arrow-in-left"></i> Mark Returned`;
            } else {
              showToast("Equipment marked as returned.", "success");
            }
          },
        });
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
    if (amount > 999) {
      showToast("Restock amount cannot exceed 999 units at once.", "error");
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

