/*
=========================================================
POTEntial - BUSINESS DASHBOARD
=========================================================
Existing:
- Business information
- Post Opportunity
- My Opportunities
- Applicants
- Business Verification
- Verification popup
- Time Slot for all Job Types
=========================================================
*/


/* =====================================================
   SUPABASE
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
   GENERAL HELPERS
===================================================== */

function showMessage(
    text,
    type = ""
) {

    const element =
        $("message");

    if (!element) {
        return;
    }

    element.textContent =
        text;

    element.className =
        "message " + type;
}



function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
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


    if (
        userError ||
        !user
    ) {

        window.location.href =
            "auth.html";

        return false;
    }


    currentUser =
        user;


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
            .eq(
                "owner_id",
                user.id
            )
            .single();


    if (
        error ||
        !business
    ) {

        console.error(error);

        showMessage(
            "Business profile not found.",
            "error"
        );

        return false;
    }


    currentBusiness =
        business;


    if ($("businessNameTop")) {

        $("businessNameTop")
            .textContent =
            business.business_name ||
            "Business";

    }


    if ($("businessName")) {

        $("businessName")
            .textContent =
            business.business_name ||
            "Not provided";

    }


    if ($("businessType")) {

        $("businessType")
            .textContent =
            business.business_type ||
            "Not provided";

    }


    if ($("businessCity")) {

        $("businessCity")
            .textContent =
            business.city ||
            "Not provided";

    }


    if ($("businessPhone")) {

        $("businessPhone")
            .textContent =
            business.phone ||
            "Not provided";

    }


    if ($("welcomeText")) {

        $("welcomeText")
            .textContent =
            `Welcome, ${
                business.business_name ||
                "Business"
            }! Manage your opportunities here.`;

    }


    return true;
}



/* =====================================================
   BUSINESS VERIFICATION STATUS
   SUPABASE READ
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
            .from(
                "verification_documents"
            )
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


    return (
        data.status ||
        "pending"
    )
        .toLowerCase()
        .trim();
}



/* =====================================================
   UPDATE POSTING ACCESS
===================================================== */

function updatePostingAccess(
    status
) {

    const form =
        $("opportunityForm");

    if (!form) {
        return;
    }


    const controls =
        form.querySelectorAll(
            "input, textarea, select, button"
        );


    const postButton =
        $("postBtn");


    if (
        status ===
        "approved"
    ) {

        controls.forEach(
            (control) => {

                control.disabled =
                    false;

            }
        );


        if (postButton) {

            postButton.disabled =
                false;

        }


        return;
    }


    controls.forEach(
        (control) => {

            control.disabled =
                true;

        }
    );


    if (postButton) {

        postButton.disabled =
            true;

    }


    if (
        status ===
        "not_submitted"
    ) {

        showMessage(
            "🔒 Please complete your business verification before posting an opportunity.",
            "error"
        );

    }


    else if (
        status ===
        "pending"
    ) {

        showMessage(
            "⏳ Your business verification is pending admin approval. You can post opportunities after approval.",
            "error"
        );

    }


    else if (
        status ===
        "rejected"
    ) {

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

    if (!popup) {
        return;
    }

    popup.classList.add(
        "show"
    );
}



function hideVerificationPopup() {

    const popup =
        $("verificationPopup");

    if (!popup) {
        return;
    }

    popup.classList.remove(
        "show"
    );
}



/* =====================================================
   CHECK BUSINESS VERIFICATION
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
   TIME SLOT
   TIME SLOT APPEARS FOR ALL JOB TYPES
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



    function formatTime(
        time
    ) {

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

        if (
            !jobType.value
        ) {

            if (preview) {

                preview.style.display =
                    "none";

                preview.textContent =
                    "";

            }

            return;
        }


        if (
            period.value &&
            startTime.value &&
            endTime.value
        ) {

            if (preview) {

                preview.style.display =
                    "block";

                preview.textContent =
                    `Selected Time Slot: ${
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

        }

        else {

            if (preview) {

                preview.style.display =
                    "none";

                preview.textContent =
                    "";

            }

        }

    }



    function updateVisibility() {

        const hasJobType =
            Boolean(
                jobType.value
            );


        if (hasJobType) {

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


            if (preview) {

                preview.style.display =
                    "none";

                preview.textContent =
                    "";

            }

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
   CREATE TIME SLOT
   Saved in existing jobs.availability column
===================================================== */

function getAvailabilityValue() {

    const jobType =
        $("jobType");

    const period =
        $("partTimePeriod");

    const start =
        $("partTimeStart");

    const end =
        $("partTimeEnd");


    if (
        !jobType ||
        !jobType.value
    ) {

        return "";
    }


    const periodValue =
        period
            ? period.value
            : "";


    const startValue =
        start
            ? start.value
            : "";


    const endValue =
        end
            ? end.value
            : "";



    /*
    -----------------------------------------------------
    TIME SLOT VALIDATION
    -----------------------------------------------------
    */

    if (!periodValue) {

        showMessage(
            "Please select the time period.",
            "error"
        );

        return null;
    }


    if (!startValue) {

        showMessage(
            "Please select the start time.",
            "error"
        );

        return null;
    }


    if (!endValue) {

        showMessage(
            "Please select the end time.",
            "error"
        );

        return null;
    }


    if (
        startValue >= endValue
    ) {

        showMessage(
            "End time must be later than start time.",
            "error"
        );

        return null;
    }



    const startFormatted =
        formatTimeForDisplay(
            startValue
        );


    const endFormatted =
        formatTimeForDisplay(
            endValue
        );


    return (
        `${periodValue} • ` +
        `${startFormatted} - ` +
        `${endFormatted}`
    );

}



/* =====================================================
   FORMAT TIME FOR DISPLAY
===================================================== */

function formatTimeForDisplay(
    time
) {

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

async function postOpportunity(
    event
) {

    event.preventDefault();


    /*
    -----------------------------------------------------
    Re-check verification before posting
    -----------------------------------------------------
    */

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



    /*
    -----------------------------------------------------
    Time Slot
    -----------------------------------------------------
    */

    const availabilityValue =
        getAvailabilityValue();


    if (
        availabilityValue ===
        null
    ) {

        return;
    }



    /*
    -----------------------------------------------------
    JOB DATA
    Existing jobs table
    -----------------------------------------------------
    */

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
                ?
                Number(
                    $("salary")
                        .value
                )
                :
                null,

        /*
        Time Slot is saved inside
        existing availability field.
        */

        availability:
            availabilityValue,

        deadline:
            $("deadline")
                .value ||
            null,

        status:
            "open"

    };



    /*
    -----------------------------------------------------
    VALIDATION
    -----------------------------------------------------
    */

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



    if (
        !jobData.required_skills
    ) {

        showMessage(
            "Please enter the required skills.",
            "error"
        );

        return;
    }



    if (
        !jobData.deadline
    ) {

        showMessage(
            "Please select an application deadline.",
            "error"
        );

        return;
    }



    /*
    -----------------------------------------------------
    BUTTON
    -----------------------------------------------------
    */

    const postButton =
        $("postBtn");


    postButton.disabled =
        true;


    postButton.textContent =
        "Posting...";



    /*
    -----------------------------------------------------
    SUPABASE WRITE
    jobs table
    -----------------------------------------------------
    */

    const {
        error
    } =
        await supabaseClient
            .from("jobs")
            .insert(
                jobData
            );



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



    /*
    -----------------------------------------------------
    SUCCESS
    -----------------------------------------------------
    */

    $("opportunityForm")
        .reset();


    /*
    Reset Time Slot UI
    */

    const scheduleGroup =
        $("partTimeScheduleGroup");

    const preview =
        $("partTimeSchedulePreview");

    const period =
        $("partTimePeriod");

    const startTime =
        $("partTimeStart");

    const endTime =
        $("partTimeEnd");


    if (scheduleGroup) {

        scheduleGroup.style.display =
            "none";

    }


    if (preview) {

        preview.style.display =
            "none";

        preview.textContent =
            "";

    }


    if (period) {

        period.required =
            false;

    }


    if (startTime) {

        startTime.required =
            false;

    }


    if (endTime) {

        endTime.required =
            false;

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

    if (!currentBusiness) {
        return;
    }


    const container =
        $("jobsContainer");


    if (!container) {
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



    if (
        !jobs ||
        !jobs.length
    ) {

        container.innerHTML =
            "<p>No opportunities posted yet.</p>";

        return;
    }



    container.innerHTML =
        "";



    jobs.forEach(
        (job) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "job-card";



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
                        ₹${job.salary ?? "Not specified"}
                    </span>


                    <span>
                        👥
                        ${escapeHtml(
                            job.availability ||
                            "Not specified"
                        )}
                    </span>


                    <span>
                        📅
                        ${escapeHtml(
                            job.deadline ||
                            "Not specified"
                        )}
                    </span>


                    <span>
                        Status:
                        ${escapeHtml(
                            job.status
                        )}
                    </span>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}



/* =====================================================
   LOAD APPLICATIONS
   SUPABASE READ
===================================================== */

async function loadApplications() {

    const container =
        $("applicationsContainer");


    if (!container) {
        return;
    }


    if (!currentBusiness) {
        return;
    }


    container.innerHTML =
        "<p class='loading'>Loading applications...</p>";



    /*
    -----------------------------------------------------
    GET BUSINESS JOBS
    -----------------------------------------------------
    */

    const {
        data: jobs,
        error: jobsError
    } =
        await supabaseClient
            .from("jobs")
            .select(
                "id,title"
            )
            .eq(
                "business_id",
                currentBusiness.id
            );



    if (jobsError) {

        console.error(
            jobsError
        );

        container.innerHTML =
            "<p>Unable to load opportunities.</p>";

        return;
    }



    if (
        !jobs ||
        !jobs.length
    ) {

        container.innerHTML =
            "<p>No opportunities posted yet.</p>";

        return;
    }



    const jobIds =
        jobs.map(
            (job) =>
                job.id
        );



    /*
    -----------------------------------------------------
    GET APPLICATIONS
    -----------------------------------------------------
    */

    const {
        data: applications,
        error: applicationsError
    } =
        await supabaseClient
            .from("applications")
            .select("*")
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
            applicationsError
        );

        container.innerHTML =
            "<p>Unable to load applications.</p>";

        return;
    }



    if (
        !applications ||
        !applications.length
    ) {

        container.innerHTML =
            "<p>No students have applied yet.</p>";

        return;
    }



    /*
    -----------------------------------------------------
    GET STUDENT IDS
    -----------------------------------------------------
    */

    const studentIds =
        applications.map(
            (app) =>
                app.student_id
        );



    /*
    -----------------------------------------------------
    GET STUDENT PROFILES
    -----------------------------------------------------
    */

    const {
        data: students,
        error: studentsError
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



    if (studentsError) {

        console.error(
            "Student profile error:",
            studentsError
        );
    }



    container.innerHTML =
        "";



    /*
    -----------------------------------------------------
    DISPLAY APPLICATIONS
    -----------------------------------------------------
    */

    applications.forEach(
        (app) => {

            const job =
                jobs.find(
                    (j) =>
                        j.id ===
                        app.job_id
                );


            const student =
                students?.find(
                    (s) =>
                        s.user_id ===
                        app.student_id
                );


            const studentName =
                student?.full_name ||
                "Student";


            const status =
                (
                    app.status ||
                    "pending"
                )
                    .toLowerCase();


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "job-card";


            let actionButtons =
                "";



            if (
                status ===
                "pending"
            ) {

                actionButtons = `

                    <div class="job-actions">

                        <button
                            class="post-btn"
                            onclick="
                                updateApplicationStatus(
                                    '${app.id}',
                                    'accepted'
                                )
                            ">

                            Accept

                        </button>


                        <button
                            class="logout-btn"
                            onclick="
                                updateApplicationStatus(
                                    '${app.id}',
                                    'rejected'
                                )
                            ">

                            Reject

                        </button>

                    </div>

                `;

            }



            else if (
                status ===
                "accepted"
            ) {

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



            else if (
                status ===
                "rejected"
            ) {

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



            card.innerHTML = `

                <h3>
                    ${escapeHtml(
                        job?.title ||
                        "Opportunity"
                    )}
                </h3>


                <p>

                    <strong>
                        Student:
                    </strong>

                    ${escapeHtml(
                        studentName
                    )}

                </p>


                <p>

                    <strong>
                        Status:
                    </strong>

                    ${escapeHtml(
                        status
                    )}

                </p>


                <p>

                    <strong>
                        Applied:
                    </strong>

                    ${
                        app.applied_at
                            ? new Date(
                                app.applied_at
                            ).toLocaleDateString()
                            : "-"
                    }

                </p>


                ${actionButtons}

            `;


            container.appendChild(
                card
            );

        }
    );

}



/* =====================================================
   UPDATE APPLICATION STATUS
   SUPABASE WRITE
===================================================== */

async function updateApplicationStatus(
    id,
    status
) {

    const confirmMessage =
        status === "accepted"
            ? "Are you sure you want to accept this student?"
            : "Are you sure you want to reject this student?";


    if (
        !confirm(
            confirmMessage
        )
    ) {

        return;
    }



    const {
        error
    } =
        await supabaseClient
            .from("applications")
            .update({
                status:
                    status
            })
            .eq(
                "id",
                id
            );



    if (error) {

        console.error(
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
   POPUP BUTTON EVENTS
===================================================== */

document.addEventListener(
    "click",
    function (event) {


        /*
        -------------------------------------------------
        CLOSE POPUP
        -------------------------------------------------
        */

        const closeButton =
            event.target.closest(
                "#closeVerificationPopup"
            );


        if (closeButton) {

            event.preventDefault();

            event.stopPropagation();

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

            event.stopPropagation();

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
   POPUP OVERLAY CLICK
===================================================== */

document.addEventListener(
    "click",
    function (event) {

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
   START DASHBOARD
===================================================== */

async function startDashboard() {

    const loaded =
        await loadBusiness();


    if (!loaded) {
        return;
    }


    /*
    -----------------------------------------------------
    Time Slot UI
    -----------------------------------------------------
    */

    setupPartTimeSchedule();


    /*
    -----------------------------------------------------
    Load existing opportunities
    -----------------------------------------------------
    */

    await loadMyJobs();


    /*
    -----------------------------------------------------
    Load applications
    -----------------------------------------------------
    */

    await loadApplications();


    /*
    -----------------------------------------------------
    Check verification
    -----------------------------------------------------
    */

    await checkBusinessVerification();

}



/* =====================================================
   EVENT LISTENERS
===================================================== */


/*
---------------------------------------------------------
Opportunity Form
---------------------------------------------------------
*/

if (
    $("opportunityForm")
) {

    $("opportunityForm")
        .addEventListener(
            "submit",
            postOpportunity
        );

}



/*
---------------------------------------------------------
Refresh Jobs
---------------------------------------------------------
*/

if (
    $("refreshJobs")
) {

    $("refreshJobs")
        .addEventListener(
            "click",
            loadMyJobs
        );

}



/*
---------------------------------------------------------
Refresh Applications
---------------------------------------------------------
*/

if (
    $("refreshApplications")
) {

    $("refreshApplications")
        .addEventListener(
            "click",
            loadApplications
        );

}



/*
---------------------------------------------------------
Navbar Logout
---------------------------------------------------------
*/

if (
    $("logoutBtn")
) {

    $("logoutBtn")
        .addEventListener(
            "click",
            logout
        );

}



/* =====================================================
   RUN
===================================================== */

startDashboard();