import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// =====================================================
// POTEntial ADMIN PANEL
// Uses the existing POTEntial Supabase tables.
// No table or column is created/renamed by this file.
// =====================================================

const SUPABASE_URL = "https://epedptuewukgferdpzjq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PpDvDuEQDqNirED5FNEZsA_p7wHVl8s";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");
const pageName = document.getElementById("pageName");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const appRoot = document.getElementById("appRoot");

const state = {
    businesses: [],
    students: [],
    jobs: [],
    applications: [],
    currentUser: null,
    activeSection: "overview"
};

function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHTML(value);
    return date.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function statusValue(row) {
    return row?.approval_status ?? row?.verification_status ?? row?.status ?? "pending";
}

function statusHTML(value) {
    const status = String(value || "pending").toLowerCase().replaceAll(" ", "-");
    return `<span class="status ${escapeHTML(status)}">${escapeHTML(value || "Pending")}</span>`;
}

function messageRow(columns, message) {
    return `<tr><td colspan="${columns}" class="loading">${escapeHTML(message)}</td></tr>`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? 0;
}

function firstValue(row, keys, fallback = "-") {
    for (const key of keys) {
        if (row && row[key] !== null && row[key] !== undefined && row[key] !== "") return row[key];
    }
    return fallback;
}

function getDate(row) {
    return firstValue(row, ["created_at", "applied_at", "uploaded_at", "updated_at"], null);
}

function normalizeStatus(value) {
    return String(value || "pending").trim().toLowerCase();
}

function findStatusColumn(row) {
    if (!row) return null;
    for (const key of ["approval_status", "verification_status", "status"]) {
        if (Object.prototype.hasOwnProperty.call(row, key)) return key;
    }
    return null;
}

async function isAdmin(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("Role")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Admin check error:", error);
        return false;
    }
    return String(data?.Role || "").toLowerCase() === "admin";
}

function showLogin(message = "") {
    appRoot.style.display = "none";
    loginScreen.style.display = "flex";
    loginError.textContent = message;
}

function showApp() {
    loginScreen.style.display = "none";
    appRoot.style.display = "flex";
    loadOverview();
}

function showToast(message, type = "success") {
    let toast = document.getElementById("adminToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "adminToast";
        document.body.appendChild(toast);
    }
    toast.className = `admin-toast ${type}`;
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function injectTools() {
    const configs = [
        ["businesses", "businessTable", "Search businesses..."],
        ["students", "studentTable", "Search students..."],
        ["opportunities", "jobTable", "Search opportunities..."]
    ];

    for (const [sectionId, tableId, placeholder] of configs) {
        const section = document.getElementById(sectionId);
        const table = document.getElementById(tableId);
        if (!section || !table || section.querySelector(".admin-tools")) continue;

        const tools = document.createElement("div");
        tools.className = "admin-tools";
        tools.innerHTML = `<input class="admin-search" id="search-${sectionId}" placeholder="${placeholder}" autocomplete="off">`;
        section.querySelector(".content-card")?.prepend(tools);

        tools.querySelector("input").addEventListener("input", e => {
            filterTable(table, e.target.value);
        });
    }
}

function filterTable(tbody, query) {
    const q = String(query || "").trim().toLowerCase();
    [...tbody.querySelectorAll("tr")].forEach(row => {
        if (row.querySelector(".loading")) return;
        row.style.display = !q || row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
}

// =====================================================
// LOGIN / SESSION
// =====================================================

loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    loginError.textContent = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;
        if (!data?.user) throw new Error("User not found.");

        const admin = await isAdmin(data.user.id);
        if (!admin) {
            await supabase.auth.signOut();
            throw new Error("This account is not an admin.");
        }

        state.currentUser = data.user;
        loginForm.reset();
        showApp();
    } catch (error) {
        console.error(error);
        loginError.textContent = error?.message || "Login failed.";
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
});

logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    state.currentUser = null;
    showLogin();
});

// =====================================================
// NAVIGATION
// =====================================================

navLinks.forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    const sectionName = link.dataset.section;
    state.activeSection = sectionName;

    navLinks.forEach(item => item.classList.remove("active"));
    link.classList.add("active");
    sections.forEach(section => section.classList.remove("active-section"));

    document.getElementById(sectionName)?.classList.add("active-section");
    if (pageName) pageName.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);

    if (sectionName === "overview") loadOverview();
    if (sectionName === "businesses") loadBusinesses();
    if (sectionName === "students") loadStudents();
    if (sectionName === "opportunities") loadJobs();
    if (sectionName === "applications") loadApplications();
    if (sectionName === "verification") loadVerification();
    if (sectionName === "analytics") loadOverview();
}));

// =====================================================
// DASHBOARD
// =====================================================

async function loadOverview() {
    try {
        const [businesses, students, jobs, applications] = await Promise.all([
            supabase.from("businesses").select("id", { count: "exact", head: true }),
            supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("Role", "student"),
            supabase.from("jobs").select("id", { count: "exact", head: true }),
            supabase.from("applications").select("id", { count: "exact", head: true })
        ]);

        const counts = {
            businesses: businesses.count || 0,
            students: students.count || 0,
            jobs: jobs.count || 0,
            applications: applications.count || 0
        };

        setText("totalBusinesses", counts.businesses);
        setText("totalStudents", counts.students);
        setText("totalJobs", counts.jobs);
        setText("totalApplications", counts.applications);
        setText("businessCount", counts.businesses);
        setText("studentCount", counts.students);
        setText("jobCount", counts.jobs);
        setText("applicationCount", counts.applications);
        setText("analyticsBusinesses", counts.businesses);
        setText("analyticsStudents", counts.students);
        setText("analyticsJobs", counts.jobs);
        setText("analyticsApplications", counts.applications);

        await loadRecentApplications();
    } catch (error) {
        console.error("Overview error:", error);
        showToast("Could not load dashboard statistics.", "error");
    }
}

async function loadRecentApplications() {
    const tbody = document.getElementById("recentApplications");
    if (!tbody) return;

    const { data, error } = await supabase.from("applications").select("*").limit(8);
    if (error) {
        console.error(error);
        tbody.innerHTML = messageRow(5, "Unable to load recent applications.");
        return;
    }

    const applications = data || [];
    if (!applications.length) {
        tbody.innerHTML = messageRow(5, "No applications found.");
        return;
    }

    const studentIds = [...new Set(applications.map(x => x.student_id).filter(Boolean))];
    const jobIds = [...new Set(applications.map(x => x.job_id).filter(Boolean))];

    const [students, jobs] = await Promise.all([
        studentIds.length ? supabase.from("profiles").select("*").in("user_id", studentIds) : { data: [] },
        jobIds.length ? supabase.from("jobs").select("*").in("id", jobIds) : { data: [] }
    ]);

    const studentMap = new Map((students.data || []).map(x => [x.user_id, x]));
    const jobMap = new Map((jobs.data || []).map(x => [x.id, x]));

    tbody.innerHTML = applications.map(app => {
        const student = studentMap.get(app.student_id);
        const job = jobMap.get(app.job_id);
        return `<tr>
            <td>${escapeHTML(student?.full_name || app.student_id || "Student")}</td>
            <td>${escapeHTML(job?.title || app.job_id || "Opportunity")}</td>
            <td>${statusHTML(app.status)}</td>
            <td>${formatDate(app.applied_at || app.created_at)}</td>
            <td>${escapeHTML(app.id || "-")}</td>
        </tr>`;
    }).join("");
}

// =====================================================
// BUSINESSES
// =====================================================

async function loadBusinesses() {
    const tbody = document.getElementById("businessTable");
    if (!tbody) return;
    tbody.innerHTML = messageRow(6, "Loading businesses...");

    const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
    if (error) {
        console.error(error);
        tbody.innerHTML = messageRow(6, error.message);
        return;
    }

    state.businesses = data || [];
    setText("businessCount", state.businesses.length);

    if (!state.businesses.length) {
        tbody.innerHTML = messageRow(6, "No businesses found.");
        return;
    }

    const ownerIds = state.businesses.map(x => x.user_id || x.owner_id).filter(Boolean);
    const { data: owners } = ownerIds.length
        ? await supabase.from("profiles").select("*").in("user_id", [...new Set(ownerIds)])
        : { data: [] };
    const ownerMap = new Map((owners || []).map(x => [x.user_id, x]));

    tbody.innerHTML = state.businesses.map(business => {
        const owner = ownerMap.get(business.user_id || business.owner_id);
        const name = firstValue(business, ["business_name", "name", "company_name"], "Business");
        const email = firstValue(business, ["email", "Email"], owner?.Email || owner?.email || "-");
        const city = firstValue(business, ["city", "location"], "-");
        const status = statusValue(business);
        const statusColumn = findStatusColumn(business);
        const id = business.id;

        return `<tr>
            <td><strong>${escapeHTML(name)}</strong></td>
            <td>${escapeHTML(email)}</td>
            <td>${escapeHTML(city)}</td>
            <td>${statusHTML(status)}</td>
            <td>${formatDate(business.created_at)}</td>
            <td class="action-cell">
                ${statusColumn ? `
                    <button class="action-btn approve" data-entity="business" data-id="${escapeHTML(id)}" data-status="approved">Approve</button>
                    <button class="action-btn reject" data-entity="business" data-id="${escapeHTML(id)}" data-status="rejected">Reject</button>
                ` : `<span class="muted">No approval field</span>`}
            </td>
        </tr>`;
    }).join("");

    attachStatusActions(tbody);
}

// =====================================================
// STUDENTS
// =====================================================

async function loadStudents() {
    const tbody = document.getElementById("studentTable");
    if (!tbody) return;
    tbody.innerHTML = messageRow(6, "Loading students...");

    const { data, error } = await supabase.from("profiles").select("*").eq("Role", "student");
    if (error) {
        console.error(error);
        tbody.innerHTML = messageRow(6, error.message);
        return;
    }

    state.students = data || [];
    setText("studentCount", state.students.length);

    if (!state.students.length) {
        tbody.innerHTML = messageRow(6, "No students found.");
        return;
    }

    tbody.innerHTML = state.students.map(student => {
        const status = statusValue(student);
        const statusColumn = findStatusColumn(student);
        return `<tr>
            <td><strong>${escapeHTML(student.full_name || "Student")}</strong></td>
            <td>${escapeHTML(student.Email || student.email || "-")}</td>
            <td>${escapeHTML(student.Role || "student")}</td>
            <td>${statusHTML(status)}</td>
            <td>${formatDate(student.created_at)}</td>
            <td class="action-cell">
                ${statusColumn ? `
                    <button class="action-btn approve" data-entity="student" data-id="${escapeHTML(student.user_id)}" data-status="approved">Approve</button>
                    <button class="action-btn reject" data-entity="student" data-id="${escapeHTML(student.user_id)}" data-status="rejected">Reject</button>
                ` : `<span class="muted">No approval field</span>`}
            </td>
        </tr>`;
    }).join("");

    attachStatusActions(tbody);
}

async function attachStatusActions(tbody) {
    tbody.querySelectorAll(".action-btn[data-status]").forEach(button => {
        button.addEventListener("click", async () => {
            const entity = button.dataset.entity;
            const id = button.dataset.id;
            const nextStatus = button.dataset.status;
            const label = nextStatus === "approved" ? "approve" : "reject";

            if (!confirm(`Are you sure you want to ${label} this ${entity}?`)) return;

            button.disabled = true;
            const result = await updateApproval(entity, id, nextStatus);
            button.disabled = false;

            if (result.ok) {
                showToast(`${entity.charAt(0).toUpperCase() + entity.slice(1)} ${nextStatus}.`);
                entity === "business" ? loadBusinesses() : loadStudents();
            } else {
                showToast(result.message, "error");
            }
        });
    });
}

async function updateApproval(entity, id, status) {
    const table = entity === "business" ? "businesses" : "profiles";
    const rows = entity === "business" ? state.businesses : state.students;
    const row = rows.find(x => (entity === "business" ? x.id : x.user_id) === id);
    const column = findStatusColumn(row);

    if (!column) {
        return {
            ok: false,
            message: `Your ${table} table has no approval/status column. The Admin UI will not invent or rename one.`
        };
    }

    const key = entity === "business" ? "id" : "user_id";
    const { error } = await supabase.from(table).update({ [column]: status }).eq(key, id);
    if (error) {
        console.error("Approval update error:", error);
        return { ok: false, message: error.message };
    }
    return { ok: true };
}

// =====================================================
// JOBS / OPPORTUNITIES
// =====================================================

async function loadJobs() {
    const tbody = document.getElementById("jobTable");
    if (!tbody) return;
    tbody.innerHTML = messageRow(5, "Loading opportunities...");

    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) {
        console.error(error);
        tbody.innerHTML = messageRow(5, error.message);
        return;
    }

    state.jobs = data || [];
    setText("jobCount", state.jobs.length);

    if (!state.jobs.length) {
        tbody.innerHTML = messageRow(5, "No opportunities found.");
        return;
    }

    tbody.innerHTML = state.jobs.map(job => `<tr>
        <td><strong>${escapeHTML(job.title || "Untitled")}</strong></td>
        <td>${escapeHTML(job.job_type || job.type || "-")}</td>
        <td>${job.salary !== null && job.salary !== undefined && job.salary !== "" ? `₹${escapeHTML(job.salary)}` : "-"}</td>
        <td>${statusHTML(job.status || "open")}</td>
        <td>${formatDate(job.created_at)}</td>
    </tr>`).join("");
}

// =====================================================
// APPLICATIONS - ADMIN ONLY MONITORS
// =====================================================

async function loadApplications() {
    const tbody = document.getElementById("applicationTable");
    if (!tbody) return;
    tbody.innerHTML = messageRow(4, "Loading applications...");

    const { data, error } = await supabase.from("applications").select("*");
    if (error) {
        console.error(error);
        tbody.innerHTML = messageRow(4, error.message);
        return;
    }

    state.applications = data || [];
    const pending = state.applications.filter(x => normalizeStatus(x.status) === "pending").length;
    const accepted = state.applications.filter(x => normalizeStatus(x.status) === "accepted").length;
    const rejected = state.applications.filter(x => normalizeStatus(x.status) === "rejected").length;
    setText("pendingApplications", pending);
    setText("acceptedApplications", accepted);
    setText("rejectedApplications", rejected);

    if (!state.applications.length) {
        tbody.innerHTML = messageRow(4, "No applications found.");
        return;
    }

    const studentIds = [...new Set(state.applications.map(x => x.student_id).filter(Boolean))];
    const jobIds = [...new Set(state.applications.map(x => x.job_id).filter(Boolean))];
    const [students, jobs] = await Promise.all([
        studentIds.length ? supabase.from("profiles").select("*").in("user_id", studentIds) : { data: [] },
        jobIds.length ? supabase.from("jobs").select("*").in("id", jobIds) : { data: [] }
    ]);

    const studentMap = new Map((students.data || []).map(x => [x.user_id, x]));
    const jobMap = new Map((jobs.data || []).map(x => [x.id, x]));

    tbody.innerHTML = state.applications.map(app => {
        const student = studentMap.get(app.student_id);
        const job = jobMap.get(app.job_id);
        return `<tr>
            <td>${escapeHTML(student?.full_name || app.student_id || "Student")}</td>
            <td>${escapeHTML(job?.title || app.job_id || "Opportunity")}</td>
            <td>${statusHTML(app.status)}</td>
            <td>${formatDate(app.applied_at || app.created_at)}</td>
        </tr>`;
    }).join("");
}

// =====================================================
// VERIFICATION
// Uses the EXISTING verification system:
//   Table  : verification_documents
//   Bucket : verification-documents
// No new table/column is required.
// =====================================================

function verificationDocumentLabel(type) {
    const labels = {
        college_id: "College ID",
        aadhaar: "Aadhaar",
        pan: "PAN",
        gst: "GST Certificate",
        business_proof: "Business Proof",
        registration_certificate: "Registration Certificate",
        identity_proof: "Identity Proof",
        address_proof: "Address Proof"
    };
    return labels[type] || String(type || "Verification Document").replaceAll("_", " ");
}

async function getVerificationViewerUrl(filePath) {
    if (!filePath) return null;

    // Prefer a signed URL because verification documents may be private.
    const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(filePath, 60 * 60);

    if (!error && data?.signedUrl) return data.signedUrl;

    console.warn("Signed URL could not be created:", error);

    // Fallback for a public bucket.
    const { data: publicData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

    return publicData?.publicUrl || null;
}

async function updateVerificationStatus(id, status, rejectionReason = null) {
    const payload = { status };

    if (status === "rejected") {
        payload.rejection_reason = rejectionReason || "Rejected by admin.";
    } else {
        payload.rejection_reason = null;
    }

    const { error } = await supabase
        .from("verification_documents")
        .update(payload)
        .eq("id", id);

    if (error) throw error;
}

async function handleVerificationAction(id, status) {
    if (status === "approved") {
        const confirmed = window.confirm(
            "Approve this verification document?"
        );
        if (!confirmed) return;

        try {
            await updateVerificationStatus(id, "approved");
            showToast("Verification approved.");
            await loadVerification();
        } catch (error) {
            console.error("Verification approval error:", error);
            showToast(error.message || "Could not approve verification.", "error");
        }
        return;
    }

    const reason = window.prompt(
        "Reason for rejection (this will be shown to the user):",
        "Document could not be verified. Please upload a valid document."
    );

    if (reason === null) return;

    try {
        await updateVerificationStatus(id, "rejected", reason.trim());
        showToast("Verification rejected.");
        await loadVerification();
    } catch (error) {
        console.error("Verification rejection error:", error);
        showToast(error.message || "Could not reject verification.", "error");
    }
}

async function viewVerificationDocument(filePath) {
    try {
        const url = await getVerificationViewerUrl(filePath);

        if (!url) {
            showToast("Document could not be opened.", "error");
            return;
        }

        window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
        console.error("Document view error:", error);
        showToast(error.message || "Could not open document.", "error");
    }
}

async function loadVerification() {
    const tbody = document.getElementById("verificationTable");
    if (!tbody) return;

    tbody.innerHTML = messageRow(6, "Loading verification requests...");

    // This is the same table used by the Student and Business profile pages.
    const { data: documents, error } = await supabase
        .from("verification_documents")
        .select("id, user_id, role, document_type, file_path, status, rejection_reason, uploaded_at")
        .order("uploaded_at", { ascending: false });

    if (error) {
        console.error("Verification documents error:", error);
        setText("verificationCount", 0);
        tbody.innerHTML = messageRow(6, error.message || "Unable to load verification requests.");
        return;
    }

    const rows = documents || [];
    setText("verificationCount", rows.filter(row => normalizeStatus(row.status) === "pending").length);

    if (!rows.length) {
        tbody.innerHTML = messageRow(6, "No verification documents have been submitted yet.");
        return;
    }

    // Fetch profile information for both students and businesses.
    const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];

    const [{ data: profiles, error: profilesError }, { data: businesses, error: businessesError }] = await Promise.all([
        userIds.length
            ? supabase.from("profiles").select("user_id, full_name, Email, Role").in("user_id", userIds)
            : Promise.resolve({ data: [], error: null }),
        userIds.length
            ? supabase.from("businesses").select("user_id, business_name, business_type, city").in("user_id", userIds)
            : Promise.resolve({ data: [], error: null })
    ]);

    if (profilesError) console.warn("Profile lookup warning:", profilesError);
    if (businessesError) console.warn("Business lookup warning:", businessesError);

    const profileMap = new Map((profiles || []).map(row => [row.user_id, row]));
    const businessMap = new Map((businesses || []).map(row => [row.user_id, row]));

    tbody.innerHTML = rows.map(row => {
        const profile = profileMap.get(row.user_id) || {};
        const business = businessMap.get(row.user_id) || {};
        const isBusiness = normalizeStatus(row.role) === "business";

        const name = isBusiness
            ? firstValue(business, ["business_name"], firstValue(profile, ["full_name"], "Business"))
            : firstValue(profile, ["full_name"], "Student");

        const type = isBusiness ? "Business" : "Student";
        const documentType = verificationDocumentLabel(row.document_type);
        const status = normalizeStatus(row.status || "pending");
        const uploaded = formatDate(row.uploaded_at);

        let action = `
            <button class="verification-btn view-verification"
                type="button"
                data-verification-view="${escapeHTML(row.file_path || "")}">
                View Document
            </button>
        `;

        if (status === "pending") {
            action += `
                <button class="verification-btn approve-verification"
                    type="button"
                    data-verification-action="approved"
                    data-verification-id="${escapeHTML(row.id)}">
                    Approve
                </button>
                <button class="verification-btn reject-verification"
                    type="button"
                    data-verification-action="rejected"
                    data-verification-id="${escapeHTML(row.id)}">
                    Reject
                </button>
            `;
        } else {
            action += `<span class="action-done">${escapeHTML(status.charAt(0).toUpperCase() + status.slice(1))}</span>`;
        }

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(name)}</strong>
                    <span class="verification-email">${escapeHTML(profile.Email || row.user_id || "")}</span>
                </td>
                <td>${escapeHTML(type)}</td>
                <td>
                    <strong>${escapeHTML(documentType)}</strong>
                    ${row.rejection_reason && status === "rejected"
                        ? `<span class="verification-email">Reason: ${escapeHTML(row.rejection_reason)}</span>`
                        : ""}
                </td>
                <td>${statusHTML(status)}</td>
                <td>${escapeHTML(uploaded)}</td>
                <td>${action}</td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-verification-view]").forEach(button => {
        button.addEventListener("click", () => {
            viewVerificationDocument(button.dataset.verificationView);
        });
    });

    tbody.querySelectorAll("[data-verification-action]").forEach(button => {
        button.addEventListener("click", async () => {
            button.disabled = true;
            await handleVerificationAction(
                button.dataset.verificationId,
                button.dataset.verificationAction
            );
        });
    });
}

// =====================================================
// REFRESH
// =====================================================

refreshBtn?.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "↻ Refreshing...";
    try {
        await loadOverview();
        if (state.activeSection === "businesses") await loadBusinesses();
        if (state.activeSection === "students") await loadStudents();
        if (state.activeSection === "opportunities") await loadJobs();
        if (state.activeSection === "applications") await loadApplications();
        if (state.activeSection === "verification") await loadVerification();
        showToast("Admin data refreshed.");
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = "↻ Refresh";
    }
});

// =====================================================
// START
// =====================================================

// =====================================================
// START
// =====================================================

async function init() {
    injectTools();

    // Clear any previous Supabase session
    // so Admin Login is always shown first.
    await supabase.auth.signOut();

    showLogin();
}

init();
