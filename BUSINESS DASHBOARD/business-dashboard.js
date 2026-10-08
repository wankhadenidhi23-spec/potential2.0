/*
=========================================================
POTEntial - BUSINESS DASHBOARD
=========================================================

Features:
- Business information
- Post Opportunity
- Part-Time shift/time
- My Opportunities
- Applicants
- Accept / Reject applicants
- Business Verification
- Logout

SUPABASE:
- businesses
- jobs
- applications
- profiles
=========================================================
*/


/* =====================================================
   SUPABASE CLIENT
===================================================== */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


let currentUser = null;

let currentBusiness = null;

let businessVerificationStatus =
    "not_submitted";


const $ = (id) =>
    document.getElementById(id);



/* =====================================================
   HELPERS
===================================================== */

function showMessage(text, type = "") {

    const element = $("message");

    if (!element) {
        return;
    }

    element.textContent = text;

    element.className =
        "message " + type;
}



function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}



/* =====================================================
   LOAD BUSINESS
   SUPABASE READ
===================================================== */

async function loadBusiness() {

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if (userError || !user) {

        window.location.href =
            "auth.html";

        return false;
    }


    currentUser = user;


    /*
    -----------------------------------------------------
    SUPABASE READ
    Existing businesses table
    -----------------------------------------------------
    */

    const {
        data: business,
        error
    } =
        await supabaseClient
            .from("businesses")
            .select("*")
            .eq("owner_id", user.id)
            .single();


    if (error || !business) {

        console.error(
            "Business load error:",
            error
        );

        showMessage(
            "Business profile not found.",
            "error"
        );

        return false;
    }


    currentBusiness =
        business;


    if ($("businessNameTop")) {

        $("businessNameTop").textContent =
            business.business_name ||
            "Business";

    }


    if ($("businessName")) {

        $("businessName").textContent =
            business.business_name ||
            "Not provided";

    }


    if ($("businessType")) {

        $("businessType").textContent =
            business.business_type ||
            "Not provided";

    }


    if ($("businessCity")) {

        $("businessCity").textContent =
            business.city ||
            "Not provided";

    }


    if ($("businessPhone")) {

        $("businessPhone").textContent =
            business.phone ||
            "Not provided";

    }


    if ($("welcomeText")) {

        $("welcomeText").textContent =
            `Welcome, ${
                business.business_name ||
                "Business"
            }! Manage your opportunities here.`;

    }


    return true;
}



/* =====================================================
   BUSINESS VERIFICATION
===================================================== */

async function getBusinessVerificationStatus() {

    if (!currentUser) {
        return "not_submitted";
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("verification_documents")
            .select(
                "id, status, uploaded_at"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .eq(
                "role",
                "business"
            )
            .order(
                "uploaded_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (error) {

        console.error(
            "Verification status error:",
            error
        );

        return "not_submitted";
    }


    if (!data) {
        return "not_submitted";
    }


    return String(
        data.status || "pending"
    )
        .toLowerCase()
        .trim();
}



/* =====================================================
   POSTING ACCESS
===================================================== */

function updatePostingAccess(status) {

    const form =
        $("opportunityForm");

    if (!form) {
        return;
    }


    const controls =
        form.querySelectorAll(
            "input, textarea, select, button"
        );


    if (status === "approved") {

        controls.forEach(
            control => {
                control.disabled = false;
            }
        );

        return;
    }


    controls.forEach(
        control => {
            control.disabled = true;
        }
    );


    if (status === "not_submitted") {

        showMessage(
            "🔒 Please complete your business verification before posting an opportunity.",
            "error"
        );

    }

    else if (status === "pending") {

        showMessage(
            "⏳ Your business verification is pending admin approval.",
            "error"
        );

    }

    else if (status === "rejected") {

        showMessage(
            "❌ Your business verification was rejected. Please update your verification from Business Profile.",
            "error"
        );

    }

}



/* =====================================================
   VERIFICATION POPUP
===================================================== */

function showVerificationPopup() {

    const popup =
        $("verificationPopup");

    if (popup) {

        popup.classList.add("show");

    }

}



function hideVerificationPopup() {

    const popup =
        $("verificationPopup");

    if (popup) {

        popup.classList.remove("show");

    }

}



/* =====================================================
   CHECK VERIFICATION
===================================================== */

async function checkBusinessVerification() {

    businessVerificationStatus =
        await getBusinessVerificationStatus();


    updatePostingAccess(
        businessVerificationStatus
    );


    if (
        businessVerificationStatus ===
        "approved"
    ) {

        hideVerificationPopup();

        return;
    }


    showVerificationPopup();

}



/* =====================================================
   PART-TIME SCHEDULE
===================================================== */

function setupPartTimeSchedule() {

    const jobType =
        $("jobType");

    const scheduleGroup =
        $("partTimeScheduleGroup");

    const period =
        $("partTimePeriod");

    const startTime =
        $("partTimeStart");

    const endTime =
        $("partTimeEnd");

    const preview =
        $("partTimeSchedulePreview");


    if (
        !jobType ||
        !scheduleGroup ||
        !period ||
        !startTime ||
        !endTime
    ) {

        return;
    }


    function isPartTime() {

        return (
            jobType.value
                .toLowerCase()
                .trim() ===
            "part time"
        );

    }


    function formatTime(time) {

        if (!time) {
            return "";
        }


        const parts =
            time.split(":");


        const hours =
            Number(parts[0]);


        const minutes =
            parts[1];


        const suffix =
            hours >= 12
                ? "PM"
                : "AM";


        const displayHour =
            hours % 12 || 12;


        return (
            String(displayHour)
                .padStart(2, "0") +
            ":" +
            minutes +
            " " +
            suffix
        );

    }


    function updatePreview() {

        if (!isPartTime()) {

            preview.style.display =
                "none";

            preview.textContent =
                "";

            return;
        }


        if (
            period.value &&
            startTime.value &&
            endTime.value
        ) {

            preview.style.display =
                "block";

            preview.textContent =
                `Selected Schedule: ${
                    period.value
                } • ${
                    formatTime(
                        startTime.value
                    )
                } - ${
                    formatTime(
                        endTime.value
                    )
                }`;

        }

        else {

            preview.style.display =
                "none";

            preview.textContent =
                "";

        }

    }


    function updateVisibility() {

        if (isPartTime()) {

            scheduleGroup.style.display =
                "block";


            period.required =
                true;

            startTime.required =
                true;

            endTime.required =
                true;


            updatePreview();

        }

        else {

            scheduleGroup.style.display =
                "none";


            period.required =
                false;

            startTime.required =
                false;

            endTime.required =
                false;


            period.value =
                "";

            startTime.value =
                "";

            endTime.value =
                "";


            preview.style.display =
                "none";

            preview.textContent =
                "";

        }

    }


    jobType.addEventListener(
        "change",
        updateVisibility
    );


    period.addEventListener(
        "change",
        updatePreview
    );


    startTime.addEventListener(
        "change",
        updatePreview
    );


    endTime.addEventListener(
        "change",
        updatePreview
    );


    updateVisibility();

}



/* =====================================================
   GET AVAILABILITY
=====================================================

IMPORTANT:

Part Time:
    Morning • 09:00 AM - 01:00 PM

Full Time:
    ""

Internship:
    ""

Freelance:
    ""

===================================================== */

function getAvailabilityValue() {

    const jobType =
        $("jobType").value
            .toLowerCase()
            .trim();


    if (jobType !== "part time") {

        return "";

    }


    const period =
        $("partTimePeriod").value;

    const start =
        $("partTimeStart").value;

    const end =
        $("partTimeEnd").value;


    if (
        !period ||
        !start ||
        !end
    ) {

        showMessage(
            "Please select shift, start time and end time for the part-time opportunity.",
            "error"
        );

        return null;
    }


    if (start >= end) {

        showMessage(
            "End time must be later than start time.",
            "error"
        );

        return null;
    }


    return (
        `${period} • ` +
        `${formatTimeForDisplay(start)} - ` +
        `${formatTimeForDisplay(end)}`
    );

}



function formatTimeForDisplay(time) {

    const [
        hoursString,
        minutes
    ] =
        time.split(":");


    const hours =
        Number(hoursString);


    const suffix =
        hours >= 12
            ? "PM"
            : "AM";


    const displayHour =
        hours % 12 || 12;


    return (
        String(displayHour)
            .padStart(2, "0") +
        ":" +
        minutes +
        " " +
        suffix
    );

}



/* =====================================================
   POST OPPORTUNITY
   SUPABASE WRITE
===================================================== */

async function postOpportunity(event) {

    event.preventDefault();


    businessVerificationStatus =
        await getBusinessVerificationStatus();


    if (
        businessVerificationStatus !==
        "approved"
    ) {

        updatePostingAccess(
            businessVerificationStatus
        );

        showVerificationPopup();

        return;
    }


    if (!currentBusiness) {

        showMessage(
            "Business not found.",
            "error"
        );

        return;
    }


    const availabilityValue =
        getAvailabilityValue();


    if (availabilityValue === null) {

        return;

    }


    const jobData = {

        business_id:
            currentBusiness.id,

        title:
            $("title")
                .value
                .trim(),

        description:
            $("description")
                .value
                .trim(),

        required_skills:
            $("skills")
                .value
                .trim(),

        job_type:
            $("jobType")
                .value,

        salary:
            $("salary")
                .value
                ? Number(
                    $("salary").value
                )
                : null,

        availability:
            availabilityValue,

        deadline:
            $("deadline")
                .value ||
            null,

        status:
            "open"

    };


    if (
        !jobData.title ||
        !jobData.description ||
        !jobData.job_type
    ) {

        showMessage(
            "Please fill all required fields.",
            "error"
        );

        return;
    }


    if (!jobData.required_skills) {

        showMessage(
            "Please enter the required skills.",
            "error"
        );

        return;
    }


    if (!jobData.deadline) {

        showMessage(
            "Please select an application deadline.",
            "error"
        );

        return;
    }


    const postButton =
        $("postBtn");


    postButton.disabled =
        true;

    postButton.textContent =
        "Posting...";


    /*
    SUPABASE WRITE
    Existing jobs table
    */

    const {
        error
    } =
        await supabaseClient
            .from("jobs")
            .insert(jobData);


    postButton.disabled =
        false;

    postButton.textContent =
        "Post Opportunity";


    if (error) {

        console.error(
            "Post opportunity error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

        return;
    }


    $("opportunityForm").reset();


    if ($("partTimeScheduleGroup")) {

        $("partTimeScheduleGroup")
            .style.display =
            "none";

    }


    if ($("partTimeSchedulePreview")) {

        $("partTimeSchedulePreview")
            .style.display =
            "none";

        $("partTimeSchedulePreview")
            .textContent =
            "";

    }


    showMessage(
        "Opportunity posted successfully!",
        "success"
    );


    await loadMyJobs();

}



/* =====================================================
   LOAD MY OPPORTUNITIES
   SUPABASE READ
===================================================== */

async function loadMyJobs() {

    const container =
        $("jobsContainer");


    if (
        !container ||
        !currentBusiness
    ) {

        return;
    }


    container.innerHTML =
        "<p class='loading'>Loading opportunities...</p>";


    const {
        data: jobs,
        error
    } =
        await supabaseClient
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
            "Jobs error:",
            error
        );

        container.innerHTML =
            "<p>Unable to load opportunities.</p>";

        return;
    }


    if (!jobs || jobs.length === 0) {

        container.innerHTML =
            "<p>No opportunities posted yet.</p>";

        return;
    }


    container.innerHTML =
        "";


    jobs.forEach(
        job => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "job-card";


            const schedule =
                job.availability
                    ? `<span>🕒 ${escapeHtml(job.availability)}</span>`
                    : "";


            card.innerHTML = `

                <h3>
                    ${escapeHtml(
                        job.title
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        job.description
                    )}
                </p>

                <div class="job-details">

                    <span>
                        💼
                        ${escapeHtml(
                            job.job_type
                        )}
                    </span>

                    <span>
                        💰
                        ₹${
                            job.salary ??
                            "Not specified"
                        }
                    </span>

                    ${schedule}

                    <span>
                        📅
                        ${
                            escapeHtml(
                                job.deadline ||
                                "Not specified"
                            )
                        }
                    </span>

                    <span>
                        Status:
                        ${
                            escapeHtml(
                                job.status ||
                                "Not specified"
                            )
                        }
                    </span>

                </div>

            `;


            container.appendChild(card);

        }
    );

}



/* =====================================================
   LOAD APPLICANTS
   SUPABASE READ
===================================================== */

async function loadApplications() {

    const container =
        $("applicationsContainer");


    if (!container) {
        return;
    }


    if (!currentBusiness) {

        container.innerHTML =
            "<p>Business information not loaded.</p>";

        return;
    }


    container.innerHTML =
        "<p class='loading'>Loading applications...</p>";


    try {

        /*
        -------------------------------------------------
        STEP 1
        Get ONLY this business's jobs.
        -------------------------------------------------
        */

        const {
            data: jobs,
            error: jobsError
        } =
            await supabaseClient
                .from("jobs")
                .select(
                    "id, title"
                )
                .eq(
                    "business_id",
                    currentBusiness.id
                );


        if (jobsError) {

            console.error(
                "Business jobs error:",
                jobsError
            );

            container.innerHTML =
                `
                <p>
                    Unable to load your opportunities.
                </p>
                `;

            return;
        }


        /*
        -------------------------------------------------
        No jobs = no applicants
        -------------------------------------------------
        */

        if (
            !jobs ||
            jobs.length === 0
        ) {

            container.innerHTML =
                `
                <div class="job-card">

                    <h3>
                        No opportunities posted yet
                    </h3>

                    <p>
                        Applicants will appear here
                        after students apply to your
                        opportunities.
                    </p>

                </div>
                `;

            return;
        }


        /*
        -------------------------------------------------
        STEP 2
        Create job ID list.
        -------------------------------------------------
        */

        const jobIds =
            jobs.map(
                job => job.id
            );


        /*
        -------------------------------------------------
        STEP 3
        Get applications for ONLY these jobs.
        -------------------------------------------------

        IMPORTANT:
        We use only existing application columns:
        id
        job_id
        student_id
        status
        applied_at
        -------------------------------------------------
        */

        const {
            data: applications,
            error: applicationsError
        } =
            await supabaseClient
                .from("applications")
                .select(
                    "id, job_id, student_id, status, applied_at"
                )
                .in(
                    "job_id",
                    jobIds
                )
                .order(
                    "applied_at",
                    {
                        ascending: false
                    }
                );


        if (applicationsError) {

            console.error(
                "Applications error:",
                applicationsError
            );

            container.innerHTML =
                `
                <div class="job-card">

                    <h3>
                        Unable to load applicants
                    </h3>

                    <p>
                        ${escapeHtml(
                            applicationsError.message
                        )}
                    </p>

                </div>
                `;

            return;
        }


        /*
        -------------------------------------------------
        NO APPLICATIONS
        -------------------------------------------------
        */

        if (
            !applications ||
            applications.length === 0
        ) {

            container.innerHTML =
                `
                <div class="job-card">

                    <h3>
                        No students have applied yet
                    </h3>

                    <p>
                        Applications from students
                        will appear here.
                    </p>

                </div>
                `;

            return;
        }


        /*
        -------------------------------------------------
        STEP 4
        Get student IDs.
        -------------------------------------------------
        */

        const studentIds =
            [
                ...new Set(
                    applications
                        .map(
                            app =>
                                app.student_id
                        )
                        .filter(Boolean)
                )
            ];


        /*
        -------------------------------------------------
        STEP 5
        Try to load student profiles.

        IMPORTANT:
        If profile query fails, applicants
        will STILL be displayed.

        This prevents the Applicants section
        from becoming blank.
        -------------------------------------------------
        */

        let students = [];


        if (studentIds.length > 0) {

            const {
                data: profileData,
                error: profileError
            } =
                await supabaseClient
                    .from("profiles")
                    .select(
                        "user_id, full_name"
                    )
                    .in(
                        "user_id",
                        studentIds
                    );


            if (profileError) {

                console.warn(
                    "Student profile information unavailable:",
                    profileError
                );

            }

            else {

                students =
                    profileData || [];

            }

        }


        /*
        -------------------------------------------------
        STEP 6
        DISPLAY APPLICATIONS
        -------------------------------------------------
        */

        container.innerHTML =
            "";


        applications.forEach(
            application => {

                const job =
                    jobs.find(
                        item =>
                            item.id ===
                            application.job_id
                    );


                const student =
                    students.find(
                        item =>
                            item.user_id ===
                            application.student_id
                    );


                const studentName =
                    student?.full_name ||
                    "Student";


                const status =
                    String(
                        application.status ||
                        "pending"
                    )
                        .toLowerCase()
                        .trim();


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "job-card";


                let statusButtons =
                    "";


                /*
                PENDING
                */

                if (
                    status ===
                    "pending"
                ) {

                    statusButtons = `

                        <div
                            class="job-actions"
                            style="
                                display:flex;
                                gap:10px;
                                margin-top:15px;
                                flex-wrap:wrap;
                            "
                        >

                            <button
                                type="button"
                                class="post-btn"
                                data-application-id="${
                                    escapeHtml(
                                        application.id
                                    )
                                }"
                                data-status="accepted"
                            >
                                Accept
                            </button>


                            <button
                                type="button"
                                class="logout-btn"
                                data-application-id="${
                                    escapeHtml(
                                        application.id
                                    )
                                }"
                                data-status="rejected"
                            >
                                Reject
                            </button>

                        </div>

                    `;

                }


                /*
                ACCEPTED
                */

                else if (
                    status ===
                    "accepted"
                ) {

                    statusButtons = `

                        <div
                            class="job-actions"
                            style="margin-top:15px;"
                        >

                            <button
                                type="button"
                                class="post-btn"
                                disabled
                            >
                                ✓ Accepted
                            </button>

                        </div>

                    `;

                }


                /*
                REJECTED
                */

                else if (
                    status ===
                    "rejected"
                ) {

                    statusButtons = `

                        <div
                            class="job-actions"
                            style="margin-top:15px;"
                        >

                            <button
                                type="button"
                                class="logout-btn"
                                disabled
                            >
                                Rejected
                            </button>

                        </div>

                    `;

                }


                card.innerHTML = `

                    <h3>
                        ${
                            escapeHtml(
                                job?.title ||
                                "Opportunity"
                            )
                        }
                    </h3>


                    <p>
                        <strong>
                            Student:
                        </strong>

                        ${
                            escapeHtml(
                                studentName
                            )
                        }
                    </p>


                    <p>
                        <strong>
                            Application Status:
                        </strong>

                        ${
                            escapeHtml(
                                status
                            )
                        }
                    </p>


                    <p>
                        <strong>
                            Applied:
                        </strong>

                        ${
                            application.applied_at
                                ? new Date(
                                    application.applied_at
                                ).toLocaleDateString(
                                    "en-IN"
                                )
                                : "Date not available"
                        }
                    </p>


                    ${
                        application.student_id
                            ? `
                            <p>
                                <strong>
                                    Student ID:
                                </strong>

                                ${escapeHtml(
                                    application.student_id
                                )}
                            </p>
                            `
                            : ""
                    }


                    ${statusButtons}

                `;


                container.appendChild(
                    card
                );

            }
        );


    }

    catch (error) {

        console.error(
            "Applicants loading error:",
            error
        );


        container.innerHTML =
            `
            <div class="job-card">

                <h3>
                    Unable to load applicants
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Something went wrong."
                    )}
                </p>

            </div>
            `;

    }

}



/* =====================================================
   UPDATE APPLICATION STATUS
   SUPABASE WRITE
===================================================== */

async function updateApplicationStatus(
    applicationId,
    newStatus
) {

    const message =
        newStatus === "accepted"
            ? "Are you sure you want to accept this student?"
            : "Are you sure you want to reject this student?";


    if (!confirm(message)) {
        return;
    }


    /*
    SUPABASE WRITE
    Existing applications table
    */

    const {
        error
    } =
        await supabaseClient
            .from("applications")
            .update({
                status:
                    newStatus
            })
            .eq(
                "id",
                applicationId
            );


    if (error) {

        console.error(
            "Application status update error:",
            error
        );

        alert(
            "Unable to update application: " +
            error.message
        );

        return;
    }


    await loadApplications();

}



/* =====================================================
   LOGOUT
===================================================== */

async function logout() {

    await supabaseClient
        .auth
        .signOut();


    window.location.href =
        "auth.html";

}



/* =====================================================
   BUTTON EVENTS
===================================================== */

document.addEventListener(
    "click",
    function(event) {

        /*
        -------------------------------------------------
        ACCEPT / REJECT
        -------------------------------------------------
        */

        const applicationButton =
            event.target.closest(
                "[data-application-id]"
            );


        if (applicationButton) {

            const applicationId =
                applicationButton
                    .dataset
                    .applicationId;


            const status =
                applicationButton
                    .dataset
                    .status;


            if (
                applicationId &&
                status
            ) {

                updateApplicationStatus(
                    applicationId,
                    status
                );

            }

            return;
        }


        /*
        -------------------------------------------------
        CLOSE VERIFICATION POPUP
        -------------------------------------------------
        */

        const closeButton =
            event.target.closest(
                "#closeVerificationPopup"
            );


        if (closeButton) {

            event.preventDefault();

            hideVerificationPopup();

            return;
        }


        /*
        -------------------------------------------------
        GO TO BUSINESS PROFILE
        -------------------------------------------------
        */

        const verifyButton =
            event.target.closest(
                "#verifyBusinessBtn"
            );


        if (verifyButton) {

            event.preventDefault();

            window.location.href =
                "business-profile.html";

            return;
        }


        /*
        -------------------------------------------------
        SIDEBAR LOGOUT
        -------------------------------------------------
        */

        const sidebarLogout =
            event.target.closest(
                "#sidebarLogout"
            );


        if (sidebarLogout) {

            event.preventDefault();

            logout();

            return;
        }

    }
);



/* =====================================================
   CLOSE POPUP BY CLICKING OUTSIDE
===================================================== */

document.addEventListener(
    "click",
    function(event) {

        const popup =
            $("verificationPopup");


        if (
            popup &&
            event.target === popup
        ) {

            hideVerificationPopup();

        }

    }
);



/* =====================================================
   FORM SUBMIT
===================================================== */

const opportunityForm =
    $("opportunityForm");


if (opportunityForm) {

    opportunityForm.addEventListener(
        "submit",
        postOpportunity
    );

}



/* =====================================================
   REFRESH JOBS
===================================================== */

const refreshJobs =
    $("refreshJobs");


if (refreshJobs) {

    refreshJobs.addEventListener(
        "click",
        loadMyJobs
    );

}



/* =====================================================
   REFRESH APPLICATIONS
===================================================== */

const refreshApplications =
    $("refreshApplications");


if (refreshApplications) {

    refreshApplications.addEventListener(
        "click",
        loadApplications
    );

}



/* =====================================================
   LOGOUT BUTTON
===================================================== */

const logoutButton =
    $("logoutBtn");


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );

}



/* =====================================================
   START DASHBOARD
===================================================== */

async function startDashboard() {

    const loaded =
        await loadBusiness();


    if (!loaded) {
        return;
    }


    /*
    Part-Time UI
    */

    setupPartTimeSchedule();


    /*
    Load opportunities
    */

    await loadMyJobs();


    /*
    Load applicants
    */

    await loadApplications();


    /*
    Check verification
    */

    await checkBusinessVerification();

}


startDashboard();