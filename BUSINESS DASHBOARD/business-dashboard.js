/*
  POTential - Business Dashboard
*/

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let currentUser = null;
let currentBusiness = null;

const $ = (id) => document.getElementById(id);

function showMessage(text, type = "") {
  const el = $("message");
  if (!el) return;

  el.textContent = text;
  el.className = "message " + type;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- BUSINESS DETAILS ---------------- */

async function loadBusiness() {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    window.location.href = "auth.html";
    return false;
  }

  currentUser = user;

  const { data: business, error } = await supabaseClient
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (error || !business) {
    console.error(error);
    showMessage("Business profile not found.", "error");
    return false;
  }

  currentBusiness = business;

  $("businessNameTop").textContent =
    business.business_name || "Business";

  $("businessName").textContent =
    business.business_name || "Not provided";

  $("businessType").textContent =
    business.business_type || "Not provided";

  $("businessCity").textContent =
    business.city || "Not provided";

  $("businessPhone").textContent =
    business.phone || "Not provided";

  $("welcomeText").textContent =
    `Welcome, ${business.business_name}! Manage your opportunities here.`;

  return true;
}

/* ---------------- POST JOB ---------------- */

async function postOpportunity(e) {
  e.preventDefault();

  if (!currentBusiness) {
    showMessage("Business not found.", "error");
    return;
  }

  const jobData = {
    business_id: currentBusiness.id,
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    required_skills: $("skills").value.trim(),
    job_type: $("jobType").value,
    salary: $("salary").value
      ? Number($("salary").value)
      : null,
    availability: $("availability").value.trim(),
    deadline: $("deadline").value || null,
    status: "open",
  };

  if (
    !jobData.title ||
    !jobData.description ||
    !jobData.job_type
  ) {
    showMessage("Please fill all required fields.", "error");
    return;
  }

  $("postBtn").disabled = true;
  $("postBtn").textContent = "Posting...";

  const { error } = await supabaseClient
    .from("jobs")
    .insert(jobData);

  $("postBtn").disabled = false;
  $("postBtn").textContent = "Post Opportunity";

  if (error) {
    console.error(error);
    showMessage(error.message, "error");
    return;
  }

  $("opportunityForm").reset();
  showMessage("Opportunity posted successfully!", "success");

  await loadMyJobs();
}

/* ---------------- MY JOBS ---------------- */

async function loadMyJobs() {
  if (!currentBusiness) return;

  const container = $("jobsContainer");

  if (!container) return;

  container.innerHTML =
    "<p class='loading'>Loading opportunities...</p>";

  const { data: jobs, error } = await supabaseClient
    .from("jobs")
    .select("*")
    .eq("business_id", currentBusiness.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    container.innerHTML =
      "<p>Unable to load opportunities.</p>";

    return;
  }

  if (!jobs || !jobs.length) {
    container.innerHTML =
      "<p>No opportunities posted yet.</p>";

    return;
  }

  container.innerHTML = "";

  jobs.forEach((job) => {
    const card = document.createElement("div");

    card.className = "job-card";

    card.innerHTML = `
      <h3>${escapeHtml(job.title)}</h3>

      <p>${escapeHtml(job.description)}</p>

      <div class="job-details">
        <span>💼 ${escapeHtml(job.job_type)}</span>
        <span>💰 ₹${job.salary ?? "Not specified"}</span>
        <span>👥 ${escapeHtml(job.availability)}</span>
        <span>📅 ${escapeHtml(job.deadline)}</span>
        <span>Status: ${escapeHtml(job.status)}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

/* ---------------- APPLICATIONS ---------------- */

async function loadApplications() {
  const container = $("applicationsContainer");

  if (!container) return;

  if (!currentBusiness) return;

  container.innerHTML =
    "<p class='loading'>Loading applications...</p>";

  /* GET BUSINESS JOBS */

  const { data: jobs, error: jobsError } =
    await supabaseClient
      .from("jobs")
      .select("id,title")
      .eq("business_id", currentBusiness.id);

  if (jobsError) {
    console.error(jobsError);

    container.innerHTML =
      "<p>Unable to load opportunities.</p>";

    return;
  }

  if (!jobs || !jobs.length) {
    container.innerHTML =
      "<p>No opportunities posted yet.</p>";

    return;
  }

  const jobIds = jobs.map((job) => job.id);

  /* GET APPLICATIONS */

  const { data: applications, error: applicationsError } =
    await supabaseClient
      .from("applications")
      .select("*")
      .in("job_id", jobIds)
      .order("applied_at", { ascending: false });

  if (applicationsError) {
    console.error(applicationsError);

    container.innerHTML =
      "<p>Unable to load applications.</p>";

    return;
  }

  if (!applications || !applications.length) {
    container.innerHTML =
      "<p>No students have applied yet.</p>";

    return;
  }

  /* GET STUDENT IDS */

  const studentIds = applications.map(
    (app) => app.student_id
  );

  /* GET STUDENT NAMES FROM PROFILES */

  const { data: students, error: studentsError } =
    await supabaseClient
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", studentIds);

  if (studentsError) {
    console.error("Student profile error:", studentsError);
  }

  container.innerHTML = "";

  /* DISPLAY APPLICATIONS */

  applications.forEach((app) => {

    const job = jobs.find(
      (j) => j.id === app.job_id
    );

    /* FIND THE STUDENT PROFILE */

    const student = students?.find(
      (s) => s.user_id === app.student_id
    );

    /* GET STUDENT NAME */

    const studentName =
      student?.full_name || "Student";

    const status =
      (app.status || "pending").toLowerCase();

    const card =
      document.createElement("div");

    card.className = "job-card";

    let actionButtons = "";

    /* PENDING */

    if (status === "pending") {

      actionButtons = `
        <div class="job-actions">

          <button
            class="post-btn"
            onclick="updateApplicationStatus('${app.id}', 'accepted')">
            Accept
          </button>

          <button
            class="logout-btn"
            onclick="updateApplicationStatus('${app.id}', 'rejected')">
            Reject
          </button>

        </div>
      `;

    }

    /* ACCEPTED */

    else if (status === "accepted") {

      actionButtons = `
        <div class="job-actions">

          <button
            class="post-btn"
            disabled>
            Accepted
          </button>

        </div>
      `;

    }

    /* REJECTED */

    else if (status === "rejected") {

      actionButtons = `
        <div class="job-actions">

          <button
            class="logout-btn"
            disabled>
            Rejected
          </button>

        </div>
      `;
    }

    /* APPLICATION CARD */

    card.innerHTML = `

      <h3>
        ${escapeHtml(job?.title || "Opportunity")}
      </h3>

      <p>
        <strong>Student:</strong>
        ${escapeHtml(studentName)}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHtml(status)}
      </p>

      <p>
        <strong>Applied:</strong>
        ${
          app.applied_at
            ? new Date(app.applied_at).toLocaleDateString()
            : "-"
        }
      </p>

      ${actionButtons}

    `;

    container.appendChild(card);
  });
}

/* ---------------- UPDATE APPLICATION STATUS ---------------- */

async function updateApplicationStatus(id, status) {

  const confirmMessage =
    status === "accepted"
      ? "Are you sure you want to accept this student?"
      : "Are you sure you want to reject this student?";

  if (!confirm(confirmMessage)) {
    return;
  }

  const { error } = await supabaseClient
    .from("applications")
    .update({
      status: status
    })
    .eq("id", id);

  if (error) {
    console.error(error);

    alert(
      "Unable to update application: " +
      error.message
    );

    return;
  }

  await loadApplications();
}

/* ---------------- LOGOUT ---------------- */

async function logout() {

  await supabaseClient.auth.signOut();

  window.location.href = "auth.html";
}

/* ---------------- START DASHBOARD ---------------- */

async function startDashboard() {

  const ok = await loadBusiness();

  if (!ok) return;

  await loadMyJobs();

  await loadApplications();
}

/* ---------------- EVENTS ---------------- */

if ($("opportunityForm")) {

  $("opportunityForm").addEventListener(
    "submit",
    postOpportunity
  );

}

if ($("refreshJobs")) {

  $("refreshJobs").addEventListener(
    "click",
    loadMyJobs
  );

}

if ($("refreshApplications")) {

  $("refreshApplications").addEventListener(
    "click",
    loadApplications
  );

}

if ($("logoutBtn")) {

  $("logoutBtn").addEventListener(
    "click",
    logout
  );

}

/* ---------------- RUN ---------------- */

startDashboard();
