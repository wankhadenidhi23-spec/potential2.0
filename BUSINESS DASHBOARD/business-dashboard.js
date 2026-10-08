// =========================================================
// POTential - Business Dashboard
// =========================================================

// =========================================================
// SUPABASE SETUP
// =========================================================

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// =========================================================
// HELPER
// =========================================================

function $(id) {
    return document.getElementById(id);
}

// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let currentBusiness = null;

// =========================================================
// LOAD BUSINESS
// =========================================================

async function loadBusiness() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "auth.html";
        return;
    }

    currentUser = user;

    // =====================================================
    // SUPABASE READ
    // Get business belonging to logged-in user.
    // =====================================================

    const {
        data: business,
        error
    } = await supabaseClient
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

    if (error) {
        console.error("Business load error:", error);

        if ($("message")) {
            $("message").textContent =
                "Business information load nahi ho payi.";
        }

        return;
    }

    currentBusiness = business;

    // =====================================================
    // BUSINESS INFORMATION
    // =====================================================

    if ($("businessName")) {
        $("businessName").textContent =
            business.business_name || "Not provided";
    }

    if ($("businessType")) {
        $("businessType").textContent =
            business.business_type || "Not provided";
    }

    if ($("businessCity")) {
        $("businessCity").textContent =
            business.city || "Not provided";
    }

    if ($("businessPhone")) {
        $("businessPhone").textContent =
            business.phone || "Not provided";
    }

    if ($("businessNameTop")) {
        $("businessNameTop").textContent =
            business.business_name || "Business";
    }

    if ($("welcomeText")) {
        $("welcomeText").textContent =
            `Welcome, ${business.business_name || "Business"}!`;
    }
}

// =========================================================
// BUSINESS VERIFICATION STATUS
// =========================================================

async function checkBusinessVerification() {

    if (!currentUser) return;

    try {

        const {
            data: verification,
            error
        } = await supabaseClient
            .from("verification_documents")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("status", "approved")
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error(
                "Verification status error:",
                error
            );
            return;
        }

        const popup = $("verificationPopup");

        if (!popup) return;

        if (!verification) {
            popup.style.display = "flex";
        } else {
            popup.style.display = "none";
        }

    } catch (error) {

        console.error(
            "Verification check error:",
            error
        );
    }
}

// =========================================================
// PART-TIME SCHEDULE SETUP
// =========================================================
// IMPORTANT:
// Shift/time slot is required ONLY for Part Time.
// Full Time, Internship and Freelance do NOT need it.
// =========================================================

function setupPartTimeSchedule() {

    const jobType = $("jobType");
    const scheduleGroup = $("partTimeScheduleGroup");

    const period = $("partTimePeriod");
    const start = $("partTimeStart");
    const end = $("partTimeEnd");
    const preview = $("partTimeSchedulePreview");

    if (!jobType || !scheduleGroup) {
        return;
    }

    function updateScheduleVisibility() {

        // =================================================
        // ONLY PART TIME SHOWS SHIFT SECTION
        // =================================================

        if (jobType.value === "Part Time") {

            scheduleGroup.style.display = "block";

            if (period) {
                period.required = true;
            }

            if (start) {
                start.required = true;
            }

            if (end) {
                end.required = true;
            }

        } else {

            // =================================================
            // ALL OTHER JOB TYPES HIDE SHIFT SECTION
            // =================================================

            scheduleGroup.style.display = "none";

            if (period) {
                period.required = false;
                period.value = "";
            }

            if (start) {
                start.required = false;
                start.value = "";
            }

            if (end) {
                end.required = false;
                end.value = "";
            }

            if (preview) {
                preview.style.display = "none";
                preview.textContent = "";
            }
        }

        updateSchedulePreview();
    }

    function updateSchedulePreview() {

        if (jobType.value !== "Part Time") {
            return;
        }

        if (!period || !start || !end || !preview) {
            return;
        }

        if (
            period.value &&
            start.value &&
            end.value
        ) {

            if (start.value >= end.value) {

                preview.style.display = "block";
                preview.textContent =
                    "End time must be after start time.";

                return;
            }

            const startTime =
                formatTimeForDisplay(start.value);

            const endTime =
                formatTimeForDisplay(end.value);

            preview.style.display = "block";

            preview.textContent =
                `Selected Shift: ${period.value} • ${startTime} - ${endTime}`;

        } else {

            preview.style.display = "none";
            preview.textContent = "";
        }
    }

    jobType.addEventListener(
        "change",
        updateScheduleVisibility
    );

    if (period) {
        period.addEventListener(
            "change",
            updateSchedulePreview
        );
    }

    if (start) {
        start.addEventListener(
            "change",
            updateSchedulePreview
        );
    }

    if (end) {
        end.addEventListener(
            "change",
            updateSchedulePreview
        );
    }

    updateScheduleVisibility();
}

// =========================================================
// FORMAT TIME
// =========================================================

function formatTimeForDisplay(timeValue) {

    if (!timeValue) {
        return "";
    }

    const [hours, minutes] =
        timeValue.split(":").map(Number);

    const period =
        hours >= 12 ? "PM" : "AM";

    const displayHours =
        hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

// =========================================================
// GET AVAILABILITY / SHIFT VALUE
// =========================================================

function getAvailabilityValue() {

    const jobType = $("jobType");

    if (!jobType || !jobType.value) {
        return "";
    }

    // =====================================================
    // ONLY PART TIME NEEDS SHIFT
    // =====================================================

    if (jobType.value !== "Part Time") {
        return "";
    }

    const period =
        $("partTimePeriod")?.value || "";

    const start =
        $("partTimeStart")?.value || "";

    const end =
        $("partTimeEnd")?.value || "";

    if (!period) {
        throw new Error(
            "Please select a time period for Part Time."
        );
    }

    if (!start) {
        throw new Error(
            "Please select the start time for Part Time."
        );
    }

    if (!end) {
        throw new Error(
            "Please select the end time for Part Time."
        );
    }

    if (start >= end) {
        throw new Error(
            "End time must be after start time."
        );
    }

    const startTime =
        formatTimeForDisplay(start);

    const endTime =
        formatTimeForDisplay(end);

    return `${period} • ${startTime} - ${endTime}`;
}

// =========================================================
// POST OPPORTUNITY
// =========================================================

async function postOpportunity(event) {

    event.preventDefault();

    if (!currentUser || !currentBusiness) {
        showMessage(
            "Business information load nahi hui.",
            "error"
        );
        return;
    }

    const title =
        $("title")?.value.trim() || "";

    const description =
        $("description")?.value.trim() || "";

    const location =
        $("location")?.value.trim() || "";

    const jobType =
        $("jobType")?.value || "";

    const skills =
        $("skills")?.value.trim() || "";

    const salary =
        $("salary")?.value || "";

    const deadline =
        $("deadline")?.value || "";

    if (!title) {
        showMessage(
            "Please enter opportunity title.",
            "error"
        );
        return;
    }

    if (!description) {
        showMessage(
            "Please enter description.",
            "error"
        );
        return;
    }

    if (!jobType) {
        showMessage(
            "Please select job type.",
            "error"
        );
        return;
    }

    let availabilityValue = "";

    try {

        // =================================================
        // PART-TIME SHIFT
        // =================================================

        availabilityValue =
            getAvailabilityValue();

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }

    const postButton = $("postBtn");

    if (postButton) {
        postButton.disabled = true;
        postButton.textContent = "Posting...";
    }

    try {

        // =================================================
        // SUPABASE WRITE
        // Insert opportunity into existing jobs table.
        // =================================================

        const {
            data,
            error
        } = await supabaseClient
            .from("jobs")
            .insert([
                {
                    business_id: currentBusiness.id,
                    title: title,
                    description: description,
                    required_skills: skills,
                    job_type: jobType,
                    salary: salary
                        ? Number(salary)
                        : null,
                    availability:
                        availabilityValue,
                    deadline:
                        deadline || null,
                    status: "open"
                }
            ])
            .select()
            .single();

        if (error) {
            console.error(
                "Post opportunity error:",
                error
            );

            throw error;
        }

        console.log(
            "Opportunity posted:",
            data
        );

        showMessage(
            "✓ Opportunity successfully posted!",
            "success"
        );

        // =================================================
        // RESET FORM
        // =================================================

        const form = $("opportunityForm");

        if (form) {
            form.reset();
        }

        // =================================================
        // RESET PART-TIME SHIFT SECTION
        // =================================================

        const scheduleGroup =
            $("partTimeScheduleGroup");

        if (scheduleGroup) {
            scheduleGroup.style.display = "none";
        }

        if ($("partTimePeriod")) {
            $("partTimePeriod").required = false;
            $("partTimePeriod").value = "";
        }

        if ($("partTimeStart")) {
            $("partTimeStart").required = false;
            $("partTimeStart").value = "";
        }

        if ($("partTimeEnd")) {
            $("partTimeEnd").required = false;
            $("partTimeEnd").value = "";
        }

        if ($("partTimeSchedulePreview")) {
            $("partTimeSchedulePreview").style.display =
                "none";

            $("partTimeSchedulePreview").textContent =
                "";
        }

        // =================================================
        // REFRESH MY OPPORTUNITIES
        // =================================================

        await loadMyJobs();

    } catch (error) {

        console.error(
            "Post opportunity error:",
            error
        );

        showMessage(
            error.message ||
            "Opportunity post nahi ho payi.",
            "error"
        );

    } finally {

        if (postButton) {
            postButton.disabled = false;
            postButton.textContent =
                "Post Opportunity";
        }
    }
}

// =========================================================
// LOAD MY OPPORTUNITIES
// =========================================================

async function loadMyJobs() {

    if (!currentBusiness) return;

    const container =
        $("jobsContainer");

    if (!container) return;

    container.innerHTML =
        `<p class="loading">Loading opportunities...</p>`;

    // =====================================================
    // SUPABASE READ
    // =====================================================

    const {
        data: jobs,
        error
    } = await supabaseClient
        .from("jobs")
        .select("*")
        .eq(
            "business_id",
            currentBusiness.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "Jobs load error:",
            error
        );

        container.innerHTML =
            `<p class="error-text">Unable to load opportunities.</p>`;

        return;
    }

    if (!jobs || jobs.length === 0) {

        container.innerHTML =
            `<p class="loading">No opportunities posted yet.</p>`;

        return;
    }

    container.innerHTML = "";

    jobs.forEach(job => {

        const card =
            document.createElement("div");

        card.className = "job-card";

        const availability =
            job.availability
                ? `<p><strong>Shift:</strong> ${job.availability}</p>`
                : "";

        const salary =
            job.salary !== null &&
            job.salary !== undefined &&
            job.salary !== ""
                ? `<p><strong>Salary/Stipend:</strong> ₹${job.salary}</p>`
                : "";

        const deadline =
            job.deadline
                ? `<p><strong>Deadline:</strong> ${job.deadline}</p>`
                : "";

        card.innerHTML = `
            <h3>${escapeHTML(job.title || "")}</h3>

            <p>
                ${escapeHTML(job.description || "")}
            </p>

            <p>
                <strong>Job Type:</strong>
                ${escapeHTML(job.job_type || "")}
            </p>

            ${salary}

            ${availability}

            ${deadline}

            <p>
                <strong>Status:</strong>
                ${escapeHTML(job.status || "open")}
            </p>
        `;

        container.appendChild(card);
    });
}

// =========================================================
// LOAD APPLICATIONS
// =========================================================

async function loadApplications() {

    if (!currentBusiness) return;

    const container =
        $("applicationsContainer");

    if (!container) return;

    container.innerHTML =
        `<p class="loading">Loading applications...</p>`;

    try {

        // =================================================
        // SUPABASE READ
        // =================================================

        const {
            data: applications,
            error
        } = await supabaseClient
            .from("applications")
            .select(`
                *,
                jobs (
                    id,
                    title,
                    business_id
                )
            `)
            .eq(
                "jobs.business_id",
                currentBusiness.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        if (
            !applications ||
            applications.length === 0
        ) {

            container.innerHTML =
                `<p class="loading">No applications yet.</p>`;

            return;
        }

        container.innerHTML = "";

        applications.forEach(application => {

            const card =
                document.createElement("div");

            card.className =
                "job-card";

            card.innerHTML = `
                <h3>
                    ${escapeHTML(
                        application.jobs?.title ||
                        "Opportunity"
                    )}
                </h3>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(
                        application.status ||
                        "pending"
                    )}
                </p>

                <div style="margin-top:12px;">
                    <button
                        type="button"
                        class="refresh-btn"
                        onclick="updateApplicationStatus('${application.id}', 'accepted')"
                    >
                        Accept
                    </button>

                    <button
                        type="button"
                        class="refresh-btn"
                        onclick="updateApplicationStatus('${application.id}', 'rejected')"
                    >
                        Reject
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {

        console.error(
            "Applications load error:",
            error
        );

        container.innerHTML =
            `<p class="error-text">Unable to load applications.</p>`;
    }
}

// =========================================================
// UPDATE APPLICATION STATUS
// =========================================================

async function updateApplicationStatus(
    applicationId,
    status
) {

    try {

        // =================================================
        // SUPABASE WRITE
        // =================================================

        const {
            error
        } = await supabaseClient
            .from("applications")
            .update({
                status: status
            })
            .eq(
                "id",
                applicationId
            );

        if (error) {
            throw error;
        }

        showMessage(
            `Application ${status}.`,
            "success"
        );

        await loadApplications();

    } catch (error) {

        console.error(
            "Application status error:",
            error
        );

        showMessage(
            error.message ||
            "Application status update nahi hua.",
            "error"
        );
    }
}

// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// =========================================================
// MESSAGE
// =========================================================

function showMessage(
    message,
    type = "success"
) {

    const messageBox =
        $("message");

    if (!messageBox) return;

    messageBox.textContent =
        message;

    messageBox.className =
        `message ${type}`;

    setTimeout(() => {

        messageBox.textContent =
            "";

        messageBox.className =
            "message";

    }, 4000);
}

// =========================================================
// LOGOUT
// =========================================================

async function logout() {

    try {

        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        window.location.href =
            "auth.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        showMessage(
            "Logout nahi ho paya.",
            "error"
        );
    }
}

// =========================================================
// START DASHBOARD
// =========================================================

async function startDashboard() {

    await loadBusiness();

    if (!currentBusiness) {
        return;
    }

    setupPartTimeSchedule();

    await loadMyJobs();

    await loadApplications();

    await checkBusinessVerification();
}

// =========================================================
// EVENT LISTENERS
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // Opportunity form
        const opportunityForm =
            $("opportunityForm");

        if (opportunityForm) {

            opportunityForm.addEventListener(
                "submit",
                postOpportunity
            );
        }

        // Refresh jobs
        const refreshJobs =
            $("refreshJobs");

        if (refreshJobs) {

            refreshJobs.addEventListener(
                "click",
                loadMyJobs
            );
        }

        // Refresh applications
        const refreshApplications =
            $("refreshApplications");

        if (refreshApplications) {

            refreshApplications.addEventListener(
                "click",
                loadApplications
            );
        }

        // Top logout
        const logoutBtn =
            $("logoutBtn");

        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                logout
            );
        }

        // Sidebar logout
        const sidebarLogout =
            $("sidebarLogout");

        if (sidebarLogout) {

            sidebarLogout.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logout();
                }
            );
        }

        // Close verification popup
        const closePopup =
            $("closeVerificationPopup");

        if (closePopup) {

            closePopup.addEventListener(
                "click",
                () => {

                    const popup =
                        $("verificationPopup");

                    if (popup) {
                        popup.style.display =
                            "none";
                    }
                }
            );
        }

        // Verification button
        const verifyButton =
            $("verifyBusinessBtn");

        if (verifyButton) {

            verifyButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "business-profile.html";
                }
            );
        }

        // Start dashboard
        startDashboard();
    }
);