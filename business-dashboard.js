

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentUser = null;
let currentBusiness = null;


// ===============================
// LOAD BUSINESS
// ===============================

async function loadBusiness() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "auth.html";
        return false;
    }

    currentUser = user;

    const { data: business, error: businessError } =
        await supabaseClient
            .from("businesses")
            .select("*")
            .eq("owner_id", user.id)
            .single();

    if (businessError) {

        console.error("Business error:", businessError);

        document.getElementById("message").textContent =
            "Business profile not found.";

        return false;
    }

    currentBusiness = business;

    document.getElementById("businessNameTop").textContent =
        business.business_name || "Business";

    document.getElementById("businessName").textContent =
        business.business_name || "Not provided";

    document.getElementById("businessType").textContent =
        business.business_type || "Not provided";

    document.getElementById("businessCity").textContent =
        business.city || "Not provided";

    document.getElementById("businessPhone").textContent =
        business.phone || "Not provided";

    document.getElementById("welcomeText").textContent =
        `Welcome, ${business.business_name || "Business"}! Manage your opportunities here.`;

    return true;
}


// ===============================
// POST OPPORTUNITY
// ===============================

const opportunityForm =
    document.getElementById("opportunityForm");

const postBtn =
    document.getElementById("postBtn");

const message =
    document.getElementById("message");


postBtn.addEventListener("click", async function () {

    

    console.log("POST BUTTON CLICKED");

    if (!currentBusiness) {

        message.textContent =
            "Business information not found.";

        return;
    }

    const title =
        document.getElementById("title").value.trim();

    const description =
        document.getElementById("description").value.trim();

    const jobType =
        document.getElementById("jobType").value;

    const skills =
        document.getElementById("skills").value.trim();

    const salary =
        document.getElementById("salary").value;

    const availability =
        document.getElementById("availability").value.trim();

    const deadline =
        document.getElementById("deadline").value;


    postBtn.disabled = true;

    postBtn.textContent = "Posting...";

    message.textContent = "Posting opportunity...";
    message.style.color = "";


    const { error } =
        await supabaseClient
            .from("jobs")
            .insert({

                business_id: currentBusiness.id,

                title: title,

                description: description,

                required_skills: skills,

                job_type: jobType,

                salary: salary
                    ? Number(salary)
                    : null,

                availability: availability,

                status: "open",

                deadline: deadline || null

            });


    if (error) {

        console.error(
            "Job posting error:",
            error
        );

        message.textContent =
            "Could not post opportunity: " +
            error.message;

        message.style.color = "red";

        postBtn.disabled = false;

        postBtn.textContent =
            "Post Opportunity";

        return;
    }


    // ===============================
    // SUCCESS
    // ===============================

   console.log("JOB POSTED SUCCESSFULLY");

message.textContent = "Opportunity posted successfully!";
message.style.display = "block";
message.style.color = "green";
message.style.fontWeight = "600";

opportunityForm.reset();

postBtn.disabled = false;
postBtn.textContent = "Post Opportunity";

await loadMyJobs();

    postBtn.disabled = false;

    postBtn.textContent =
        "Post Opportunity";


    // LOAD NEW JOB

    await loadMyJobs();

});


// ===============================
// LOAD MY JOBS
// ===============================

async function loadMyJobs() {

    if (!currentBusiness) {
        return;
    }

    const jobsContainer =
        document.getElementById("jobsContainer");

    jobsContainer.innerHTML =
        '<p class="loading">Loading opportunities...</p>';


    const { data: jobs, error } =
        await supabaseClient
            .from("jobs")
            .select("*")
            .eq(
                "business_id",
                currentBusiness.id
            )
            .order(
                "created_at",
                { ascending: false }
            );


    if (error) {

        console.error(
            "Jobs error:",
            error
        );

        jobsContainer.innerHTML =
            "<p>Unable to load opportunities.</p>";

        return;
    }


    if (!jobs || jobs.length === 0) {

        jobsContainer.innerHTML =
            "<p>No opportunities posted yet.</p>";

        return;
    }


    jobsContainer.innerHTML = "";


    jobs.forEach(job => {

        const jobCard =
            document.createElement("div");

        jobCard.className =
            "job-card";


        jobCard.innerHTML = `

            <h3>
                ${job.title || "Untitled Opportunity"}
            </h3>

            <p>
                ${job.description || "No description"}
            </p>

            <div class="job-details">

                <span>
                    💼 ${job.job_type || "Not specified"}
                </span>

                <span>
                    💰 ${
                        job.salary
                            ? "₹" + job.salary
                            : "Not specified"
                    }
                </span>

                <span>
                    👥 ${
                        job.availability ||
                        "Not specified"
                    }
                </span>

                <span>
                    📅 Deadline:
                    ${
                        job.deadline ||
                        "Not specified"
                    }
                </span>

                <span>
                    Status:
                    ${job.status || "open"}
                </span>

            </div>
        `;


        jobsContainer.appendChild(jobCard);

    });

}


// ===============================
// REFRESH BUTTON
// ===============================

document
    .getElementById("refreshJobs")
    .addEventListener(
        "click",
        loadMyJobs
    );


// ===============================
// LOGOUT
// ===============================

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        async function () {

            const { error } =
                await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                return;
            }


            window.location.href =
                "auth.html";

        }
    );


// ===============================
// START DASHBOARD
// ===============================

async function startDashboard() {

    const businessLoaded =
        await loadBusiness();


    if (!businessLoaded) {
        return;
    }


    await loadMyJobs();

}


startDashboard();
async function loadApplications() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
        .from("applications")
        .select(`
            id,
            status,
            student_id,
            jobs!inner(
                title,
                business_id
            )
        `)
        .eq("jobs.business_id", user.id);

    const container = document.getElementById("applicationsContainer");

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Unable to load applications.</p>";
        return;
    }

    if (!data.length) {
        container.innerHTML = "<p>No applications received yet.</p>";
        return;
    }

    container.innerHTML = "";

    data.forEach(app => {
        container.innerHTML += `
            <div class="job-card">
                <h3>${app.jobs.title}</h3>
                <p><strong>Student ID:</strong> ${app.student_id}</p>
                <p><strong>Status:</strong> ${app.status}</p>

                <div class="job-actions">
                    <button onclick="updateApplicationStatus(${app.id}, 'Accepted')" class="post-btn">
                        Accept
                    </button>

                    <button onclick="updateApplicationStatus(${app.id}, 'Rejected')" class="logout-btn">
                        Reject
                    </button>
                </div>
            </div>
        `;
    });
}
async function updateApplicationStatus(id, status) {

    const { error } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    loadApplications();
}

loadApplications();

document
    .getElementById("refreshApplications")
    .addEventListener("click", loadApplications);
